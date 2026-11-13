/* Studio: the chat page at /studio talks to this.
 *
 * Each chat is a GitHub issue in this repo, and the bot in
 * .github/workflows/site-edits.yml answers it. Whoever uses the chat never
 * sees GitHub: this file turns the issue, its comments and the bot's branch
 * into a chat thread, opens the pull request once the bot has made a change
 * (so Vercel builds a preview), and merges it on "Put it live".
 *
 * First aid, built in:
 *   - A change can't go live until the site check (.github/workflows/
 *     site-check.yml) passes on it. When it fails, the bot is asked to fix it,
 *     up to MAX_AUTOFIX times.
 *   - If another change went live first, "Put it live" brings this one up to
 *     date, or has the bot redo it on the latest site when the two clash.
 *   - "Try again" when the bot errors or never answers, with a hint at why.
 *   - "Undo" on a live change puts back the files it touched.
 *   - GET ?health=1 checks the setup and says what to fix.
 *   - A studio change that breaks the live site is undone by site-check.yml.
 *
 * Guard rails:
 *   - Only the site's content (SITE_FILE) can go live from the chat. A change
 *     that touches anything else waits for Youssef to merge it on GitHub.
 *   - At most MAX_NEW_CHATS new chats an hour.
 *   - Each person can have their own passcode. Their name goes on what they
 *     send, put live and undo, so GitHub keeps a record of who did what.
 *
 * Vercel env vars (Project → Settings → Environment Variables):
 *   STUDIO_PASSCODE_<NAME>  one per person, e.g. STUDIO_PASSCODE_JOSH; 12+
 *                        characters. Delete one to lock that person out.
 *   STUDIO_PASSCODE      a shared passcode with no name on it (optional)
 *   STUDIO_GITHUB_TOKEN  fine-grained token for this repo only: read and write
 *                        on Contents, Issues and Pull requests; read on Actions
 *                        and Deployments
 */

const crypto = require('crypto');

const REPO = 'yelseifi/dialed-records-website';
const BASE = 'main';
const MARK = '<!-- studio -->';        // sent from the chat
const NOTE = '<!-- studio-note -->';   // a status line in the chat, never a request
const UNDONE = '<!-- undone -->';
const REDO = '<!-- redo -->';
const LIMIT = '<!-- limit -->';        // the bot's weekly limit was reached (site-edits.yml)
const AUTOFIX = /<!-- autofix:([0-9A-Za-z-]{3,64}) -->/;
const UPLOADS = 'studio-uploads';      // images sent in the chat; never deployed
const BOT = 'claude[bot]';
const ACTIONS_BOT = 'github-actions[bot]';
const MAX_TEXT = 4000;
const MAX_IMAGES = 3;
const MAX_IMAGE_B64 = 1_800_000;       // the page resizes photos well under this
const MAX_TOTAL_B64 = 3_600_000;       // Vercel takes 4.5 MB per request
const MAX_AUTOFIX = 2;
const WORKING_TIMEOUT = 40 * 60e3;     // the workflow times out at 30 min
const WAITING_TIMEOUT = 10 * 60e3;     // no reply by then: something's off
const CHECK_GRACE = 5 * 60e3;          // no site check by then: don't hold the change up
const MAX_NEW_CHATS = 12;              // per hour
// The only files a chat can put live. No .svg or .html under images/: they
// could run script on this domain, where the page keeps the passcode.
const SITE_FILE = /^(index\.html|main\.js|style\.css|images\/[\w./-]+\.(jpe?g|png|webp|gif|avif))$/i;
const SIGNED = /\n*_— ([^_\n]{1,40})_\s*$/;  // the sender's name, last line of a message
const sign = who => (who ? `_— ${who}_` : '');

class Refusal extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ─── GitHub ─────────────────────────────────── */

async function gh(path, { method = 'GET', body, okStatuses = [] } = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${process.env.STUDIO_GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'dialed-studio',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (okStatuses.includes(res.status)) return null;
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    const err = new Error(`GitHub ${res.status} on ${method} ${path}: ${text}`);
    err.githubStatus = res.status;
    err.githubText = text;
    err.rateLimited = res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0');
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const refPath = branch => branch.split('/').map(encodeURIComponent).join('/');
const comment = (number, body) => gh(`/issues/${number}/comments`, { method: 'POST', body: { body } });

/* The bot works on issue N in branches named claude/issue-N-<timestamp>.
   Branches it made no commits on are deleted, so any match has a change. */
async function findBranch(chat) {
  const refs = await gh(`/git/matching-refs/heads/claude/issue-${chat}-`);
  const names = (refs || []).map(r => r.ref.replace('refs/heads/', '')).sort();
  return names.length ? names[names.length - 1] : null;
}

async function findPR(chat) {
  const pulls = await gh(`/pulls?state=all&sort=created&direction=desc&per_page=100`);
  const mine = pulls.filter(p =>
    p.head.ref.startsWith(`claude/issue-${chat}-`) && p.head.repo && p.head.repo.full_name === REPO);
  return mine.find(p => p.state === 'open') || mine[0] || null;
}

async function getChatIssue(chat) {
  const issue = await gh(`/issues/${chat}`, { okStatuses: [404, 410] });
  if (!issue || issue.pull_request || !(issue.body || '').includes(MARK)) {
    throw new Refusal(404, 'not-found', "That chat doesn't exist.");
  }
  return issue;
}

/* Vercel reports each preview as a GitHub deployment on the commit. */
async function preview(sha) {
  const deployments = await gh(`/deployments?sha=${sha}&per_page=5`, { okStatuses: [403, 404] }) || [];
  let building = false;
  for (const d of deployments) {
    const statuses = await gh(`/deployments/${d.id}/statuses?per_page=5`);
    const latest = statuses[0];
    if (!latest) { building = true; continue; }
    if (latest.state === 'success' && (latest.environment_url || latest.target_url)) {
      return { url: latest.environment_url || latest.target_url, building: false };
    }
    if (['pending', 'queued', 'in_progress'].includes(latest.state)) building = true;
  }
  return { url: null, building };
}

/* The site check on a pull request's latest commit. Anything we can't see
   (no Actions access, a cancelled run) doesn't hold the change up. */
async function siteCheck(pr) {
  let runs;
  try {
    ({ workflow_runs: runs } = await gh(`/actions/workflows/site-check.yml/runs?head_sha=${pr.head.sha}&per_page=5`));
  } catch (e) {
    if ([403, 404].includes(e.githubStatus)) return 'unknown';
    throw e;
  }
  const run = runs.find(r => r.event === 'pull_request') || runs[0];
  if (!run) return Date.now() - Date.parse(pr.updated_at) < CHECK_GRACE ? 'checking' : 'unknown';
  if (run.status !== 'completed') return 'checking';
  if (run.conclusion === 'success') return 'passed';
  if (run.conclusion === 'failure') return 'failed';
  return 'unknown';
}

/* Why hasn't the bot answered? Looks at the bot's workflow runs since the
   message. The hint is for whoever looks after the studio. */
async function diagnose(title, since) {
  try {
    const after = new Date(Date.parse(since) - 60e3).toISOString().slice(0, 19) + 'Z';
    const { workflow_runs: runs } = await gh(
      `/actions/workflows/site-edits.yml/runs?per_page=20&created=${encodeURIComponent(`>=${after}`)}`);
    const mine = runs.filter(r => r.display_title === title);
    const run = mine.find(r => r.conclusion !== 'skipped') || mine[mine.length - 1];
    if (!run) return "The helper never started. Tell Youssef: check that GitHub Actions is on for the site's repo (the Checkup button lists what's wrong).";
    if (run.status !== 'completed') return "It's still queued on GitHub's side. Give it a few more minutes.";
    if (run.conclusion === 'skipped') return 'The message was skipped: the account the studio posts as must own the repo or be added to it.';
    if (run.conclusion === 'failure') return 'The helper crashed before replying. Most often its Claude login expired. Tell Youssef: run claude setup-token and update the CLAUDE_CODE_OAUTH_TOKEN secret.';
    if (run.conclusion === 'cancelled') return 'That run got cancelled. Try again.';
    return null;
  } catch (e) {
    return null;
  }
}

/* ─── Turning GitHub into a chat ─────────────── */

const stripComments = s => (s || '').replace(/<!--[\s\S]*?-->/g, '').trim();

/* The bot's progress comment keeps a checklist while it works; show the step
   it's on, like a typing indicator. */
function currentStep(body) {
  const open = body.match(/^\s*[-*] \[ \] (.+)$/m);
  return open ? open[1].replace(/\*\*/g, '').trim() : '';
}

/* Its finished comment is a header line of GitHub links, a ---, then the
   reply. Keep the reply; drop the checklist and anything about GitHub. */
function replyText(body) {
  const cut = body.indexOf('\n---\n');
  let text = cut === -1 ? body : body.slice(cut + 5);
  text = text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/^\s*[-*] \[[ xX]\] .*$/gm, '')
    .replace(/^#{1,6}\s*(todo|to-do|tasks?|progress)( list)?:?\s*$/gim, '')
    .replace(/^\s*(todo|to-do|tasks?)( list)?:\s*$/gim, '')
    .replace(/\[(View job( run)?|View branch|Create (a )?PR[^\]]*)\]\([^)]*\)/gi, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

/* One comment → one chat message, or null for comments the chat doesn't show
   (Vercel's, and anything not posted from the studio). `request` marks the
   ones the bot will answer. */
function toMessage(c) {
  const body = c.body || '';
  const login = c.user && c.user.login;
  const isBot = c.user && c.user.type === 'Bot';
  const base = { id: c.id, at: c.created_at };

  // The weekly limit answers in the bot's place.
  if (body.includes(NOTE) && body.includes(LIMIT) && login === ACTIONS_BOT) {
    return { ...base, from: 'bot', limit: true, text: stripComments(body) };
  }
  if (body.includes(NOTE) && (!isBot || login === ACTIONS_BOT)) {
    return { ...base, from: 'note', text: stripComments(body), undone: body.includes(UNDONE) };
  }
  if (isBot) {
    if (login !== BOT) return null;
    if (/Claude Code is working/i.test(body)) {
      const stale = Date.now() - Date.parse(c.updated_at || c.created_at) > WORKING_TIMEOUT;
      if (!stale) return { ...base, from: 'bot', working: true, step: currentStep(body) };
      return { ...base, from: 'bot', error: true, text: 'That one timed out on my end.' };
    }
    const error = /^\*\*Claude encountered an error/m.test(body);
    return { ...base, from: 'bot', error, text: replyText(body) || (error ? 'Something went wrong on my end.' : 'Done.') };
  }
  const fix = body.match(AUTOFIX);
  if (fix) return { ...base, from: 'note', request: true, fixFor: fix[1], text: 'Found a problem with that change. Fixing it…' };
  if (body.includes(REDO)) return { ...base, from: 'note', request: true, text: 'This clashed with another change that went live first. Redoing it on the latest site…' };
  if (!body.includes(MARK)) return null;
  return { ...base, ...fromPerson(body) };
}

/* A message someone sent, without the name line under it. */
function fromPerson(body) {
  const text = stripComments(body);
  const signed = text.match(SIGNED);
  return { from: 'you', text: signed ? text.slice(0, signed.index).trim() : text, by: signed ? signed[1] : undefined };
}

const publicMessage = ({ id, from, text, error, working, step, at, by }) => ({ id, from, text, error, working, step, at, by });

/* Files a change touches outside the site's content. */
async function outsideSite(number) {
  const files = await gh(`/pulls/${number}/files?per_page=100`);
  if (files.length >= 100) return ['more than 100 files'];
  return files.flatMap(f => [f.filename, f.previous_filename]).filter(p => p && !SITE_FILE.test(p));
}

/* Reads a chat and works out where it stands. With `openPR`, opens the pull
   request once the bot has made a change; with `autofix`, asks the bot to fix
   a change that failed the site check. */
async function readChat(chat, { openPR = false, autofix = false } = {}) {
  const issue = await getChatIssue(chat);
  const [issueComments, branch, found] = await Promise.all([
    gh(`/issues/${chat}/comments?per_page=100`),
    findBranch(chat),
    findPR(chat),
  ]);
  let pr = found;
  const prComments = pr ? await gh(`/issues/${pr.number}/comments?per_page=100`) : [];

  const messages = [{ id: `issue-${chat}`, ...fromPerson(issue.body), at: issue.created_at }];
  for (const c of [...issueComments, ...prComments]) {
    const m = toMessage(c);
    if (m) messages.push(m);
  }
  messages.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const working = messages.some(m => m.working);
  const requests = messages.filter(m => m.from === 'you' || m.request);
  const replies = messages.filter(m => m.from === 'bot' && !m.working);
  const lastRequest = requests[requests.length - 1];
  const lastReply = replies[replies.length - 1];
  const awaiting = !working && (!lastReply || Date.parse(lastRequest.at) > Date.parse(lastReply.at));

  // The bot made a change and nobody has opened it for review yet: open the
  // pull request so Vercel builds a preview of the whole site with it.
  if (openPR && issue.state === 'open' && !working && branch && !(pr && (pr.state === 'open' || pr.merged_at))) {
    const original = stripComments(issue.body).split('\n').map(l => `> ${l}`).join('\n');
    try {
      await gh('/pulls', {
        method: 'POST',
        body: { title: issue.title, head: branch, base: BASE, body: `From the studio chat #${chat}:\n\n${original}\n\n${MARK}` },
      });
    } catch (e) {
      if (e.githubStatus !== 422) throw e; // 422: already open, or nothing to merge
    }
    pr = await findPR(chat);
  }
  const prOpen = !!(pr && pr.state === 'open');

  const undone = issue.labels.some(l => (l.name || l) === 'undone') || messages.some(m => m.undone);
  let status;
  let check = null;
  let outside = [];
  if (issue.state === 'closed') {
    status = undone ? 'undone' : issue.state_reason === 'completed' || (pr && pr.merged_at) ? 'live' : 'closed';
  } else if (!working && !awaiting && !prOpen && pr && pr.merged_at) {
    // Put live on GitHub (a change Youssef had to look at): close the chat.
    status = 'live';
    if (openPR) await gh(`/issues/${chat}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
  } else if (working) {
    status = 'working';
  } else if (awaiting) {
    status = Date.now() - Date.parse(lastRequest.at) < WAITING_TIMEOUT ? 'waiting' : 'stuck';
  } else if (prOpen) {
    check = await siteCheck(pr);
    if (check === 'checking') status = 'checking';
    else if (check !== 'failed') {
      outside = await outsideSite(pr.number);
      status = outside.length ? 'review' : 'ready';
    } else {
      // Ask the bot to fix it, once per version of the change, at most MAX_AUTOFIX times.
      const asked = messages.filter(m => m.fixFor);
      const already = asked.some(m => pr.head.sha.startsWith(m.fixFor));
      if (autofix && !already && asked.length < MAX_AUTOFIX) {
        await comment(pr.number,
          `The site check failed on this change. Read what failed, fix it, and run the check again before you reply.\n\n<!-- autofix:${pr.head.sha} -->`);
        messages.push({ id: `fix-${pr.head.sha}`, from: 'note', text: 'Found a problem with that change. Fixing it…', at: new Date().toISOString() });
        status = 'waiting';
      } else {
        status = 'failed';
      }
    }
  } else if (lastReply && lastReply.limit) {
    status = 'limited';
  } else {
    status = 'idle';
  }

  const result = { id: chat, title: issue.title, status, messages: messages.map(publicMessage) };
  result.canRetry = status === 'stuck' || status === 'failed' || status === 'review' ||
    (!working && !awaiting && !!lastReply && lastReply.error && status !== 'live' && status !== 'closed' && status !== 'undone');
  result.canUndo = status === 'live' && !!(pr && pr.merged_at);
  if (status === 'stuck') result.hint = await diagnose(issue.title, lastRequest.at);
  if (['ready', 'checking', 'failed', 'review'].includes(status)) result.preview = await preview(pr.head.sha);
  return { issue, pr, result, outside };
}

async function listChats() {
  const issues = await gh(`/issues?state=all&sort=created&direction=desc&per_page=30`);
  return issues
    .filter(i => !i.pull_request && (i.body || '').includes(MARK))
    .map(i => {
      const undone = i.labels.some(l => (l.name || l) === 'undone');
      return {
        id: i.number,
        title: i.title,
        open: i.state === 'open',
        live: i.state === 'closed' && i.state_reason === 'completed' && !undone,
        undone,
        at: i.created_at,
      };
    });
}

/* ─── Actions ────────────────────────────────── */

/* Images go on their own branch (no site files, never deployed) and into the
   message as links the bot can download. */
async function uploadImages(images) {
  if (!images.length) return [];
  const exists = await gh(`/git/ref/heads/${UPLOADS}`, { okStatuses: [404] });
  if (!exists) {
    const tree = await gh('/git/trees', {
      method: 'POST',
      body: { tree: [{ path: 'README.md', mode: '100644', type: 'blob', content: 'Images sent from the studio chat at /studio. Not part of the site.\n' }] },
    });
    const commit = await gh('/git/commits', { method: 'POST', body: { message: 'Studio uploads', tree: tree.sha, parents: [] } });
    await gh('/git/refs', { method: 'POST', body: { ref: `refs/heads/${UPLOADS}`, sha: commit.sha }, okStatuses: [422] }); // 422: made meanwhile
  }
  const lines = [];
  for (const [i, data] of images.entries()) {
    const path = `uploads/${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${i + 1}.jpg`;
    await gh(`/contents/${path}`, { method: 'PUT', body: { message: 'Studio upload', content: data, branch: UPLOADS } });
    lines.push(`![image](https://raw.githubusercontent.com/${REPO}/${UPLOADS}/${path})`);
  }
  return lines;
}

function cleanImages(images) {
  if (!Array.isArray(images)) return [];
  if (images.length > MAX_IMAGES) throw new Refusal(400, 'too-many', `Up to ${MAX_IMAGES} photos at a time.`);
  const clean = images.map(img => {
    const data = String(img || '').replace(/^data:image\/jpeg;base64,/, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(data) || data.length > MAX_IMAGE_B64) {
      throw new Refusal(400, 'bad-image', "That photo didn't come through. Try another.");
    }
    return data;
  });
  if (clean.reduce((n, d) => n + d.length, 0) > MAX_TOTAL_B64) {
    throw new Refusal(400, 'too-big', 'Those photos are too big together. Send them one at a time.');
  }
  return clean;
}

async function send({ chat, text, images, who }) {
  text = String(text || '').trim().slice(0, MAX_TEXT);
  const imgs = cleanImages(images);
  if (!text && !imgs.length) throw new Refusal(400, 'empty', 'Type a message first.');

  let target = chat;
  if (chat) {
    // Opens the pull request first if the bot already made a change, so this
    // follow-up builds on that change instead of starting over.
    const { result, pr } = await readChat(chat, { openPR: true });
    if (['live', 'closed', 'undone'].includes(result.status)) {
      throw new Refusal(409, 'closed', 'This chat is finished. Start a new one.');
    }
    if (result.status === 'working' || result.status === 'waiting') {
      throw new Refusal(409, 'busy', "Hang on, I'm still on your last message.");
    }
    if (pr && pr.state === 'open') target = pr.number;
  } else {
    const hourAgo = Date.now() - 3600e3;
    if ((await listChats()).filter(c => Date.parse(c.at) > hourAgo).length >= MAX_NEW_CHATS) {
      throw new Refusal(429, 'slow-down', "That's a lot of new chats for one hour. Keep going in an open one, or wait a bit.");
    }
  }

  const body = [text, ...(await uploadImages(imgs)), sign(who), MARK].filter(Boolean).join('\n\n');
  if (!chat) {
    const firstLine = (text.split('\n')[0] || 'Photo').trim();
    const title = firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine;
    const issue = await gh('/issues', { method: 'POST', body: { title, body } });
    return { chat: issue.number };
  }
  await comment(target, body);
  return { chat };
}

async function retry({ chat, who }) {
  const { result, pr, outside } = await readChat(chat);
  if (!result.canRetry) throw new Refusal(409, 'nothing', "There's nothing to try again right now.");
  const text = result.status === 'failed' ? 'The site check still fails on this change. Try fixing it again.'
    : result.status === 'review' ? `This change also touches ${outside.join(', ')}. Put those back the way they were, and keep the change to main.js, index.html, style.css and photos in images/.`
    : 'Try that again, please.';
  await comment(pr && pr.state === 'open' ? pr.number : chat, [text, sign(who), MARK].filter(Boolean).join('\n\n'));
  return { chat };
}

/* Two changes touched the same lines: start this one over from the current
   site, with everything that was asked in the chat. */
async function redo(chat, pr, result) {
  const asks = result.messages.filter(m => m.from === 'you').map(m => `- ${m.text.replace(/\s*\n+\s*/g, ' ')}`).join('\n');
  await gh(`/pulls/${pr.number}`, { method: 'PATCH', body: { state: 'closed' } });
  await gh(`/git/refs/heads/${refPath(pr.head.ref)}`, { method: 'DELETE', okStatuses: [404, 422] });
  await comment(chat,
    `Another change went live while this one waited, and the two clash. Start over from the current site and make this chat's change again. Everything that was asked:\n\n${asks}\n\n${REDO}`);
  return { chat, status: 'waiting' };
}

/* GitHub works out whether a pull request can merge in the background; ask
   until it knows (a few seconds at most). */
async function mergeability(number) {
  let pull;
  for (let i = 0; i < 5; i++) {
    pull = await gh(`/pulls/${number}`);
    if (pull.mergeable !== null) return pull;
    await new Promise(r => setTimeout(r, 1500));
  }
  return pull;
}

async function publish({ chat, who }) {
  const { result, pr } = await readChat(chat);
  if (['live', 'closed', 'undone'].includes(result.status)) throw new Refusal(409, 'closed', 'This chat is finished.');
  if (result.status === 'working' || result.status === 'waiting') throw new Refusal(409, 'busy', "Hang on, I'm still working on it.");
  if (result.status === 'checking') throw new Refusal(409, 'checking', "Still checking the change. Try again in a moment.");
  if (result.status === 'failed') throw new Refusal(409, 'failed', "This change didn't pass the site check, so it can't go live.");
  if (result.status === 'review') throw new Refusal(409, 'review', 'This change touches more than the site\'s content, so Youssef needs to look at it before it goes live.');
  if (!pr || pr.state !== 'open') throw new Refusal(409, 'nothing', "There's no change to put live yet.");

  const head = await gh(`/commits/${pr.head.sha}`);
  const subject = head.commit.message.split('\n')[0].slice(0, 120);
  const merge = () => gh(`/pulls/${pr.number}/merge`, {
    method: 'PUT',
    body: { merge_method: 'squash', sha: pr.head.sha, commit_title: subject, commit_message: `From the studio chat #${chat}.${who ? `\n\nPut live by ${who}.` : ''}` },
  });
  try {
    await merge();
  } catch (e) {
    if (e.githubStatus === 409) throw new Refusal(409, 'moved', 'The change was just updated. Check the new preview, then put it live.');
    if (e.githubStatus !== 405) throw e;
    // Not mergeable as it stands. GitHub may still be working that out, or
    // another change went live first and the two need putting together.
    const fresh = await mergeability(pr.number);
    if (fresh.head.sha !== pr.head.sha) throw new Refusal(409, 'moved', 'The change was just updated. Check the new preview, then put it live.');
    if (fresh.mergeable) {
      try { await merge(); } catch (again) {
        throw new Refusal(409, 'blocked', `Couldn't put it live. Tell Youssef GitHub said: ${(again.githubText || '').slice(0, 160)}`);
      }
    } else {
      try {
        await gh(`/pulls/${pr.number}/update-branch`, { method: 'PUT', body: { expected_head_sha: pr.head.sha } });
      } catch (u) {
        if (u.githubStatus === 422 && /conflict/i.test(u.githubText || '')) return redo(chat, pr, result);
        throw new Refusal(409, 'blocked', `Couldn't put it live. Tell Youssef GitHub said: ${(u.githubText || e.githubText || '').slice(0, 160)}`);
      }
      throw new Refusal(409, 'updating', "Another change went live first, so I'm bringing this one up to date. Check the new preview in a minute, then put it live.");
    }
  }
  await gh(`/git/refs/heads/${refPath(pr.head.ref)}`, { method: 'DELETE', okStatuses: [404, 422] });
  await gh(`/issues/${chat}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed' } });
  return { chat, status: 'live' };
}

async function discard({ chat }) {
  const issue = await getChatIssue(chat);
  const pr = await findPR(chat);
  if (pr && pr.state === 'open') {
    await gh(`/pulls/${pr.number}`, { method: 'PATCH', body: { state: 'closed' } });
  }
  const branch = await findBranch(chat);
  if (branch) await gh(`/git/refs/heads/${refPath(branch)}`, { method: 'DELETE', okStatuses: [404, 422] });
  if (issue.state === 'open') {
    await gh(`/issues/${chat}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'not_planned' } });
  }
  return { chat, status: 'closed' };
}

/* path → {sha, mode} for every file in a commit. */
async function filesAt(commitSha) {
  const commit = await gh(`/git/commits/${commitSha}`);
  const tree = await gh(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new Refusal(409, 'too-big', "The site is too big to undo from here. Start a new chat and say what to change back.");
  return { commit, files: new Map(tree.tree.filter(t => t.type === 'blob').map(t => [t.path, { sha: t.sha, mode: t.mode }])) };
}

/* Undo a live change: put every file it touched back the way it was, as a new
   commit on main. Refuses if anything touched those files since. */
async function undo({ chat, who }) {
  const { result, pr } = await readChat(chat);
  if (!result.canUndo) throw new Refusal(409, 'nothing', 'Only a change that went live can be undone.');
  const change = await gh(`/commits/${pr.merge_commit_sha}`);
  const before = await filesAt(change.parents[0].sha);
  const moved = new Refusal(409, 'moved',
    "Something else changed the same part of the site since, so I can't undo this on its own. Start a new chat and say what to change back.");

  for (let attempt = 0; attempt < 2; attempt++) {
    const ref = await gh(`/git/ref/heads/${BASE}`);
    const now = await filesAt(ref.object.sha);
    const entries = [];
    for (const f of change.files) {
      const current = now.files.get(f.filename);
      if (f.status === 'removed') { if (current) throw moved; }
      else if (!current || current.sha !== f.sha) throw moved;
      const oldPath = f.status === 'renamed' ? f.previous_filename : f.filename;
      if (f.status === 'renamed') {
        if (now.files.has(oldPath)) throw moved;
        entries.push({ path: f.filename, mode: current.mode, type: 'blob', sha: null });
      }
      const old = before.files.get(oldPath);
      entries.push(old
        ? { path: oldPath, mode: old.mode, type: 'blob', sha: old.sha }
        : { path: f.filename, mode: (current && current.mode) || '100644', type: 'blob', sha: null });
    }
    if (!entries.length) throw new Refusal(409, 'nothing', 'That change has nothing to undo.');

    const tree = await gh('/git/trees', { method: 'POST', body: { base_tree: now.commit.tree.sha, tree: entries } });
    const subject = change.commit.message.split('\n')[0];
    const commit = await gh('/git/commits', {
      method: 'POST',
      body: { message: `Undo "${subject}"\n\nUndone from studio chat #${chat}${who ? ` by ${who}` : ''}.`, tree: tree.sha, parents: [ref.object.sha] },
    });
    try {
      await gh(`/git/refs/heads/${BASE}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
      break;
    } catch (e) {
      if (e.githubStatus === 422 && attempt === 0) continue; // main moved meanwhile: look again
      throw e;
    }
  }
  await gh(`/issues/${chat}/labels`, { method: 'POST', body: { labels: ['undone'] } }).catch(() => {});
  await comment(chat, `Undone${who ? ` by ${who}` : ''}. The site is back to how it was before this change. It can take a minute to show.\n\n${NOTE}${UNDONE}`);
  return { chat, status: 'undone' };
}

/* Checkup: everything the studio depends on, with what to do about each. */
async function health() {
  const checks = [];
  const add = (name, ok, fix) => checks.push({ name, ok, fix: ok ? '' : fix });
  const short = Object.keys(process.env).filter(k => /^STUDIO_PASSCODE/.test(k) && process.env[k].length < 12);
  add('Passcodes', !short.length, `${short.join(', ')} ${short.length > 1 ? 'are' : 'is'} under 12 characters, so ${short.length > 1 ? 'they don\'t' : 'it doesn\'t'} work. Make ${short.length > 1 ? 'them' : 'it'} longer in Vercel.`);
  try {
    await gh('');
    add('GitHub key', true);
  } catch (e) {
    add('GitHub key', false, e.githubStatus === 401
      ? 'STUDIO_GITHUB_TOKEN expired or was revoked. Make a new one (see api/studio.js) and update it in Vercel.'
      : `STUDIO_GITHUB_TOKEN can't open the site's repo (GitHub said ${e.githubStatus}).`);
    return { checks };
  }
  try {
    await gh('/deployments?per_page=1');
    add('Previews', true);
  } catch (e) {
    add('Previews', false, 'Give STUDIO_GITHUB_TOKEN read access to Deployments, so the studio can show previews.');
  }
  let workflows = null;
  try {
    ({ workflows } = await gh('/actions/workflows?per_page=50'));
    add('Bot status', true);
  } catch (e) {
    add('Bot status', false, 'Give STUDIO_GITHUB_TOKEN read access to Actions, so the studio can see the site check and tell when the bot is stuck.');
  }
  if (workflows) {
    for (const [file, label] of [['site-edits.yml', 'Bot'], ['site-check.yml', 'Site check']]) {
      const w = workflows.find(x => x.path === `.github/workflows/${file}`);
      add(label, !!w && w.state === 'active', w
        ? `It's turned off (${w.state.replace(/_/g, ' ')}). Turn it back on in the repo's Actions tab.`
        : `.github/workflows/${file} is missing from main.`);
    }
    try {
      const { workflow_runs: runs } = await gh('/actions/workflows/site-edits.yml/runs?per_page=30');
      const last = runs.find(r => r.status === 'completed' && r.conclusion !== 'skipped');
      if (last) {
        add('Last bot run', last.conclusion === 'success',
          `It ended in "${last.conclusion}". If runs keep failing, the Claude login probably expired: run claude setup-token, then update the CLAUDE_CODE_OAUTH_TOKEN secret. Also check the Claude app is still installed on the repo.`);
      }
    } catch (e) { /* covered by Bot status */ }
    try {
      const { workflow_runs: runs } = await gh('/actions/workflows/site-check.yml/runs?branch=main&per_page=10');
      const last = runs.find(r => r.status === 'completed' && r.event !== 'pull_request');
      if (last) add('Live site', last.conclusion === 'success', 'The last check of the live site failed. Open the latest Site check run in the Actions tab to see what broke.');
    } catch (e) { /* covered by Bot status */ }
  }
  return { checks };
}

/* ─── HTTP ───────────────────────────────────── */

/* Everyone who can get in: STUDIO_PASSCODE_<NAME> per person, plus an
   optional shared STUDIO_PASSCODE with no name on it. */
function people() {
  const list = [];
  for (const [key, code] of Object.entries(process.env)) {
    const m = key.match(/^STUDIO_PASSCODE(?:_([A-Z][A-Z0-9_]{0,30}))?$/);
    if (!m || !code || code.length < 12) continue;
    const name = m[1] ? m[1].toLowerCase().replace(/_+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()) : null;
    list.push({ name, code });
  }
  return list;
}

/* Who this passcode belongs to, or null. Compares against every passcode in
   constant time. */
function whoIs(req) {
  const got = crypto.createHash('sha256').update(String(req.headers['x-studio-key'] || '')).digest();
  let match = null;
  for (const person of people()) {
    const want = crypto.createHash('sha256').update(person.code).digest();
    if (crypto.timingSafeEqual(got, want) && !match) match = person;
  }
  return match;
}

function chatNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Refusal(400, 'bad-chat', "That chat doesn't exist.");
  return n;
}

const ACTIONS = { publish, discard, retry, undo };

module.exports = async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (!process.env.STUDIO_GITHUB_TOKEN || !people().length) {
    return res.status(503).json({ error: 'setup', message: "The studio isn't switched on yet. Tell Youssef: set STUDIO_GITHUB_TOKEN and a passcode (STUDIO_PASSCODE_<NAME>) in Vercel." });
  }
  const person = whoIs(req);
  if (!person) {
    await new Promise(r => setTimeout(r, 1000)); // slows down guessing
    return res.status(401).json({ error: 'passcode', message: "That passcode isn't right." });
  }
  try {
    if (req.method === 'GET') {
      if (req.query.health) return res.status(200).json(await health());
      const chat = chatNumber(req.query.chat);
      if (!chat) return res.status(200).json({ chats: await listChats() });
      const { result } = await readChat(chat, { openPR: true, autofix: true });
      return res.status(200).json(result);
    }
    if (req.method === 'POST') {
      let body = req.body || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body || '{}'); } catch (e) { throw new Refusal(400, 'bad-request', "That didn't come through. Try again."); }
      }
      const input = { ...body, chat: chatNumber(body.chat), who: person.name };
      if (body.action === 'send') return res.status(200).json(await send(input));
      const act = Object.prototype.hasOwnProperty.call(ACTIONS, body.action) ? ACTIONS[body.action] : null;
      if (!act) throw new Refusal(400, 'bad-action', 'Unknown action.');
      if (!input.chat) throw new Refusal(400, 'bad-chat', "That chat doesn't exist.");
      return res.status(200).json(await act(input));
    }
    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'method', message: 'Use GET or POST.' });
  } catch (e) {
    if (e instanceof Refusal) return res.status(e.status).json({ error: e.code, message: e.message });
    console.error(e);
    if (e.githubStatus === 401) {
      return res.status(502).json({ error: 'github-key', message: "The studio's GitHub key stopped working. Tell Youssef: STUDIO_GITHUB_TOKEN needs replacing." });
    }
    if (e.rateLimited) return res.status(503).json({ error: 'busy', message: 'Too many requests right now. Wait a minute and try again.' });
    return res.status(502).json({ error: 'github', message: "Couldn't reach the site's backend. Try again in a minute." });
  }
};
