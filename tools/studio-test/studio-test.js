// Scenario tests for api/studio.js against the fake GitHub in devserver.js.
// node tools/studio-test/studio-test.js <site-root>   (from the repo: `.`)
const { spawn } = require('child_process');
const path = require('path');

const ROOT = process.argv[2];
const KEY = 'test-passcode-123';
let port = 8800;
let failures = 0;

function rig(env = {}) {
  const p = ++port;
  const child = spawn(process.execPath, [path.join(__dirname, 'devserver.js'), ROOT, String(p)], {
    env: { ...process.env, BOT_SPEED: '0.3', ...env }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  const ready = new Promise(r => child.stdout.once('data', r));
  const base = `http://localhost:${p}`;
  const call = async (method, params, key = KEY) => {
    const url = method === 'GET' && params ? `${base}/api/studio?${new URLSearchParams(params)}` : `${base}/api/studio`;
    const res = await fetch(url, { method, headers: { 'x-studio-key': key, 'content-type': 'application/json' }, body: method === 'POST' ? JSON.stringify(params) : undefined });
    return { status: res.status, body: await res.json() };
  };
  const debug = async () => (await fetch(`${base}/__log`)).json();
  const mergeOnGitHub = n => fetch(`${base}/__merge?n=${n}`);
  return { ready, call, debug, mergeOnGitHub, stop: () => child.kill() };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(r, chat, want, timeout = 20000) {
  const wants = [].concat(want);
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = (await r.call('GET', { chat })).body;
    if (wants.includes(last.status) && (!['ready', 'review'].includes(last.status) || (last.preview && last.preview.url))) return last;
    await sleep(500);
  }
  throw new Error(`chat ${chat} never got to ${wants} (last: ${last && last.status} ${JSON.stringify(last && last.messages.slice(-2))})`);
}
function expect(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
}

async function scenario(name, env, fn) {
  const r = rig(env);
  await r.ready;
  try { await fn(r); } catch (e) { expect(name, false, e.message); }
  r.stop();
}

(async () => {
  await scenario('happy path, then undo', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA' });
    const ready = await until(r, chat, 'ready');
    expect('change gets a preview', !!ready.preview.url);
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('put it live', pub.status === 200 && pub.body.status === 'live', JSON.stringify(pub.body));
    const live = (await r.call('GET', { chat })).body;
    expect('live chat offers undo', live.status === 'live' && live.canUndo);
    const und = await r.call('POST', { action: 'undo', chat });
    expect('undo works', und.status === 200 && und.body.status === 'undone', JSON.stringify(und.body));
    const d = await r.debug();
    expect('undo restores main.js', d.mainFiles['main.js'].sha === 'blob-0', JSON.stringify(d.mainFiles));
    const after = (await r.call('GET', { chat })).body;
    expect('chat shows undone', after.status === 'undone' && after.messages.some(m => m.from === 'note' && /Undone/.test(m.text)), after.status);
    const again = await r.call('POST', { action: 'undo', chat });
    expect('undo twice refused', again.status === 409);
    const list = (await r.call('GET')).body.chats;
    expect('list marks it undone', list[0].undone && !list[0].live);
  });

  await scenario('follow-up before the preview opens builds on the change', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA' });
    await sleep(3500); // the bot finishes; nobody has polled, so there's no pull request yet
    const sent = await r.call('POST', { action: 'send', chat, text: 'make the subtitle Dialed Records' });
    expect('follow-up accepted', sent.status === 200, JSON.stringify(sent.body));
    const d = await r.debug();
    const prCreate = d.log.findIndex(l => l.startsWith('POST /pulls'));
    const followUp = d.log.findIndex((l, i) => i > prCreate && /^POST \/issues\/\d+\/comments/.test(l));
    const pr = d.pulls[0];
    expect('pull request opened first, follow-up went on it', prCreate !== -1 && followUp !== -1 && d.log[followUp].includes(`/issues/${pr.n}/`), d.log.join(' | '));
    await until(r, chat, 'ready');
  });

  await scenario('a change that breaks the site gets fixed on its own', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'breaks the events list' });
    let saw = new Set();
    const start = Date.now();
    let last;
    while (Date.now() - start < 30000) {
      last = (await r.call('GET', { chat })).body;
      saw.add(last.status);
      if (last.status === 'ready' && saw.has('waiting') && last.preview.url && last.messages.some(m => /Fixed it/.test(m.text || ''))) break;
      if (last.status === 'checking') {
        const early = await r.call('POST', { action: 'publish', chat });
        saw.add(`publish-while-checking:${early.status}`);
      }
      await sleep(400);
    }
    expect('blocked while checking', saw.has('publish-while-checking:409'), [...saw].join(','));
    expect('autofix note shown', last.messages.some(m => m.from === 'note' && /Fixing it/.test(m.text)));
    expect('ends ready after the fix', last.status === 'ready', `${last.status} ${[...saw]}`);
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('fixed change goes live', pub.body.status === 'live', JSON.stringify(pub.body));
  });

  await scenario('a change the bot cannot fix stops at failed', { NEVER_FIX: '1' }, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'breaks the events list' });
    const failed = await until(r, chat, 'failed', 40000);
    const fixes = failed.messages.filter(m => m.from === 'note' && /Fixing it/.test(m.text)).length;
    expect('asked to fix exactly twice', fixes === 2, `fixes=${fixes}`);
    expect('failed offers try again', failed.canRetry);
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('failed change refused', pub.status === 409 && pub.body.error === 'failed', JSON.stringify(pub.body));
    const rt = await r.call('POST', { action: 'retry', chat });
    expect('try again accepted', rt.status === 200, JSON.stringify(rt.body));
  });

  await scenario('bot error, then try again', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'this one will fail' });
    const idle = await until(r, chat, 'idle');
    expect('error bubble + try again', idle.canRetry && idle.messages.some(m => m.error), JSON.stringify(idle));
    const rt = await r.call('POST', { action: 'retry', chat });
    expect('retry posted', rt.status === 200);
    await until(r, chat, 'ready');
    expect('retry led to a change', true);
  });

  await scenario('bot never answers: stuck with a reason', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'silent please' });
    const s = (await r.call('GET', { chat })).body;
    expect('stuck', s.status === 'stuck', s.status);
    expect('hint names the likely cause', /Claude login/.test(s.hint || ''), s.hint);
    expect('stuck offers try again', s.canRetry);
  });

  await scenario('another change went live first: brought up to date', { CLASH: 'behind' }, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA' });
    await until(r, chat, 'ready');
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('first try says it is updating', pub.status === 409 && pub.body.error === 'updating', JSON.stringify(pub.body));
    await until(r, chat, 'ready');
    const pub2 = await r.call('POST', { action: 'publish', chat });
    expect('second try goes live', pub2.body.status === 'live', JSON.stringify(pub2.body));
  });

  await scenario('two changes clash: redone on the latest site', { CLASH: 'conflict' }, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA' });
    await until(r, chat, 'ready');
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('clash starts a redo', pub.status === 200 && pub.body.status === 'waiting', JSON.stringify(pub.body));
    const d = await r.debug();
    expect('old change closed', d.pulls.every(x => x.state === 'closed'));
    const ready = await until(r, chat, 'ready');
    const d2 = await r.debug();
    expect('redo made a fresh change', d2.pulls.length === 2 && d2.pulls.some(x => x.state === 'open'), JSON.stringify(d2.pulls));
    expect('redo note shown', ready.messages.some(m => m.from === 'note' && /Redoing/.test(m.text)));
  });

  await scenario('undo refused when something else changed the same file', {}, async r => {
    const a = (await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA' })).body.chat;
    await until(r, a, 'ready');
    await r.call('POST', { action: 'publish', chat: a });
    const b = (await r.call('POST', { action: 'send', text: 'add a TBA date Feb 6 in LA' })).body.chat;
    await until(r, b, 'ready');
    await r.call('POST', { action: 'publish', chat: b });
    const und = await r.call('POST', { action: 'undo', chat: a });
    expect('refused with a plain reason', und.status === 409 && und.body.error === 'moved', JSON.stringify(und.body));
    const undB = await r.call('POST', { action: 'undo', chat: b });
    expect('latest change can still be undone', undB.body.status === 'undone', JSON.stringify(undB.body));
  });

  await scenario('a change outside the site content waits for Youssef', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date and loosen the tools check' });
    const review = await until(r, chat, 'review');
    expect('held for review, with a preview', !!(review.preview && review.preview.url));
    const pub = await r.call('POST', { action: 'publish', chat });
    expect('studio refuses to put it live', pub.status === 409 && pub.body.error === 'review', JSON.stringify(pub.body));
    expect('review offers try again', review.canRetry);
    await r.call('POST', { action: 'retry', chat });
    const ready = await until(r, chat, 'ready');
    expect('try again keeps it to content, then it can go live', ready.status === 'ready');
  });

  await scenario('Youssef puts a reviewed change live on GitHub', {}, async r => {
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'change the tools script thresholds' });
    await until(r, chat, 'review');
    const d = await r.debug();
    await r.mergeOnGitHub(d.pulls[0].n);
    const live = (await r.call('GET', { chat })).body;
    expect('chat shows live', live.status === 'live' && live.canUndo, live.status);
    const d2 = await r.debug();
    expect('chat closed as done', d2.issues[0].state === 'closed' && d2.issues[0].reason === 'completed', JSON.stringify(d2.issues));
  });

  await scenario('passcodes: each person signs what they do', {}, async r => {
    const JOSH = 'josh-passcode-123';
    const wrong = await r.call('GET', undefined, 'nope-nope-nope');
    expect('wrong passcode refused', wrong.status === 401);
    const { body: { chat } } = await r.call('POST', { action: 'send', text: 'add a TBA date Jan 9 in LA', who: 'Mallory' }, JOSH);
    await until(r, chat, 'ready');
    const ready = (await r.call('GET', { chat }, JOSH)).body;
    const first = ready.messages[0];
    expect('message shows who sent it, name line hidden', first.by === 'Josh' && !/Josh|—/.test(first.text), JSON.stringify(first));
    await r.call('POST', { action: 'publish', chat }, JOSH);
    const d = await r.debug();
    expect('commit says who put it live', d.log.some(l => l.includes('Put live by Josh.') && l.includes('From the studio chat #')), d.log.filter(l => l.startsWith('MERGED')).join(' | '));
    await r.call('POST', { action: 'undo', chat }, JOSH);
    const after = (await r.call('GET', { chat })).body;
    expect('undo note says who', after.messages.some(m => m.from === 'note' && /Undone by Josh/.test(m.text)));
    const shared = (await r.call('POST', { action: 'send', text: 'add a TBA date Feb 6 in LA', who: 'Mallory' })).body.chat;
    const s = (await r.call('GET', { chat: shared })).body;
    expect('shared passcode: no name, and a name in the request is ignored', !s.messages[0].by, JSON.stringify(s.messages[0]));
  });

  await scenario('too many new chats in an hour', {}, async r => {
    for (let i = 0; i < 12; i++) await r.call('POST', { action: 'send', text: `what is on the site ${i}?` });
    const over = await r.call('POST', { action: 'send', text: 'what is next?' });
    expect('13th new chat in an hour refused', over.status === 429 && over.body.error === 'slow-down', JSON.stringify(over));
  });

  await scenario('checkup flags a passcode that is too short', { STUDIO_PASSCODE_TINY: 'short' }, async r => {
    const { body } = await r.call('GET', { health: 1 });
    const pc = body.checks.find(c => c.name === 'Passcodes');
    expect('names the short one', pc && !pc.ok && /STUDIO_PASSCODE_TINY/.test(pc.fix), JSON.stringify(pc));
  });

  await scenario('checkup', { CHECK_OFF: '1' }, async r => {
    const { body } = await r.call('GET', { health: 1 });
    const off = body.checks.find(c => c.name === 'Site check');
    expect('checkup flags a disabled workflow', off && !off.ok && /turned off/.test(off.fix), JSON.stringify(body));
    expect('checkup passes the rest', body.checks.filter(c => c.name !== 'Site check').every(c => c.ok), JSON.stringify(body));
  });

  console.log(failures ? `\n${failures} failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
})();
