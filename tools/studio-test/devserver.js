// Local test rig for the studio: serves the site, runs api/studio.js, and
// fakes the GitHub API, the bot, Vercel previews and the site check.
// node tools/studio-test/devserver.js <site-root> <port>  (studio-test.js starts it)
//
// What a message says decides what the fake bot does:
//   ends in "?" / starts with what|when|is   → answers, no change
//   "fail"      → the bot errors
//   "breaks"    → makes a change that fails the site check (until autofixed)
//   "silent"    → never answers (and the message is backdated so it's stuck)
//   "tools"     → the change also edits tools/check-site.js (needs review)
//   "over the limit" → the weekly limit answers instead of the bot
//   anything else → makes a change that passes
// CLASH=behind   → first merge 405s; update-branch fixes it
// CLASH=conflict → merge 405s and update-branch reports a conflict (redo)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2]);
const PORT = Number(process.argv[3] || 8790);
const SPEED = Number(process.env.BOT_SPEED || 1);
process.env.STUDIO_PASSCODE = 'test-passcode-123';
process.env.STUDIO_GITHUB_TOKEN = 'fake-token';
process.env.STUDIO_PASSCODE_JOSH = 'josh-passcode-123';
const MARK = '<!-- studio -->';
const NOTE = '<!-- studio-note -->';
const REPO = 'yelseifi/dialed-records-website';

/* ─── fake GitHub ─── */
let seq = 0, cid = 1000, did = 1, gid = 0;
const now = () => new Date().toISOString();
const issues = {};      // number -> issue (PRs too, with pull_request)
const comments = {};    // number -> [comment]
const refs = { 'refs/heads/main': 'sha-main' };
const pulls = {};       // number -> pr
const deployments = []; // {id, sha, statuses: []}
const checks = {};      // sha -> {status, conclusion}
const bad = new Set();  // shas that fail the site check
const filesOf = {};     // sha -> files the change touches
const botRuns = [];     // site-edits runs, for diagnose
const treeOf = { 'sha-main': 'tree-main' };
const parentOf = {};
const trees = { 'tree-main': { 'main.js': { sha: 'blob-0', mode: '100644' }, 'index.html': { sha: 'blob-index', mode: '100644' } } };
const log = [];
const user = { login: 'yelseifi', type: 'User' };
const bot = { login: 'claude[bot]', type: 'Bot' };
const vercel = { login: 'vercel[bot]', type: 'Bot' };
const actionsBot = { login: 'github-actions[bot]', type: 'Bot' };

const issueView = n => (issues[n].pull_request ? { ...issues[n], pull_request: { url: 'x' } } : issues[n]);
const respond = (status, data) => new Response(data === undefined ? null : JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
function addComment(n, who, body, ago = 0) {
  const at = new Date(Date.now() - ago).toISOString();
  const c = { id: ++cid, user: who, body, created_at: at, updated_at: at };
  (comments[n] ||= []).push(c);
  return c;
}
const wait = s => new Promise(r => setTimeout(r, s * 1000 * SPEED));

function runCheck(sha) {
  checks[sha] = { status: 'in_progress', conclusion: null };
  setTimeout(() => { checks[sha] = { status: 'completed', conclusion: bad.has(sha) ? 'failure' : 'success' }; }, 3000 * SPEED);
}
function setHead(pr, sha) {
  pr.head.sha = sha;
  pr.updated_at = now();
  refs[`refs/heads/${pr.head.ref}`] = sha;
  addDeployment(sha);
  runCheck(sha);
}

const triggers = body => body && !body.includes(NOTE) && (body.includes(MARK) || /<!-- (autofix:|redo -->)/.test(body));

async function simulateBot(target, text, title) {
  if (/silent/i.test(text)) {
    botRuns.unshift({ display_title: title, status: 'completed', conclusion: 'failure', created_at: new Date(Date.now() - 11 * 60e3).toISOString() });
    return;
  }
  botRuns.unshift({ display_title: title, status: 'completed', conclusion: 'success', created_at: now() });
  if (/over the limit/i.test(text)) {
    await wait(1);
    addComment(target, actionsBot, "That's this week's limit for site changes (20 in 7 days), to keep Claude free for other work. The next one frees up Sat, Nov 14, 12:41 PM. Youssef can raise the limit.\n\n<!-- studio-note --><!-- limit -->");
    return;
  }
  const isPR = !!issues[target].pull_request;
  await wait(2);
  const c = addComment(target, bot, `Claude Code is working… <img src="x" />\n\nI'll analyze this and get back to you.\n\n[View job run](https://github.com/x/actions/runs/1)`);
  await wait(2);
  c.body = `Claude Code is working… <img src="x" />\n\n### Todo List\n- [x] Read the request\n- [ ] Looking up the event on NotAPromoter\n- [ ] Update main.js\n\n[View job run](https://github.com/x/actions/runs/1)`;
  c.updated_at = now();
  await wait(3);
  const head = `**Claude finished @yelseifi's task in 58s** —— [View job](https://github.com/x/actions/runs/1)`;
  if (/\?\s*$/.test(text) || /^what|^when|^is /i.test(text)) {
    c.body = `${head}\n\n---\n### Todo List\n- [x] Read the request\n\nThe next event on the site is **Dec 3**: Alci · Anthea · Priku at Sable, Miami.`;
  } else if (/fail/i.test(text) && !/site check/i.test(text)) {
    c.body = `**Claude encountered an error after 12s** —— [View job](https://github.com/x/actions/runs/1)\n\n---\nI'll analyze this and get back to you.\n`; // as the real action leaves it
  } else {
    const sha = `sha-${++did}`;
    const fixing = /autofix:|site check/i.test(text);
    if (/breaks/i.test(text) || (fixing && process.env.NEVER_FIX)) bad.add(sha);
    filesOf[sha] = [{ filename: 'main.js', status: 'modified' }];
    if (/tools/i.test(text) && !/Put those back/.test(text)) filesOf[sha].push({ filename: 'tools/check-site.js', status: 'modified' });
    let branch;
    if (isPR) {
      branch = issues[target].head.ref;
      setHead(issues[target], sha);
    } else {
      branch = `claude/issue-${target}-20261112-${String(++gid).padStart(4, '0')}`;
      refs[`refs/heads/${branch}`] = sha;
    }
    const said = fixing ? 'Fixed it: the date was in the wrong format. The check passes now.' : 'Done. Dec 3 now shows **Alci · Anthea · Priku** at Sable, Miami.';
    c.body = `${head} • [\`${branch}\`](https://github.com/x/tree/${branch}) • [Create PR ➔](https://github.com/x/compare/main...${branch}?quick_pull=1)\n\n---\n### Todo List\n- [x] Read the request\n\n${said}\n\nCheck the preview, then tap Put it live.`;
  }
  c.updated_at = now();
}

function addDeployment(sha) {
  const d = { id: ++did, sha, statuses: [{ state: 'pending', created_at: now() }] };
  deployments.unshift(d);
  setTimeout(() => d.statuses.unshift({ state: 'success', environment_url: `http://localhost:${PORT}/?preview=${sha}`, created_at: now() }), 4000 * SPEED);
}

function newCommit(parent, treeSha, sha) {
  treeOf[sha] = treeSha;
  parentOf[sha] = parent;
  return sha;
}

async function fakeGitHub(method, p, body) {
  const url = new URL(p || '/', 'https://x');
  const parts = url.pathname.split('/').filter(Boolean);
  const q = url.searchParams;
  log.push(`${method} ${p}`);
  if (!parts.length && method === 'GET') return respond(200, { full_name: REPO });

  if (parts[0] === 'issues') {
    if (parts.length === 1 && method === 'GET') return respond(200, Object.keys(issues).map(Number).sort((a, b) => b - a).map(issueView));
    if (parts.length === 1 && method === 'POST') {
      const n = ++seq;
      const ago = /silent/i.test(body.body) ? 11 * 60e3 : 0;
      issues[n] = { number: n, title: body.title, body: body.body, state: 'open', state_reason: null, labels: [], created_at: new Date(Date.now() - ago).toISOString(), user };
      if (triggers(body.body)) simulateBot(n, body.body.replace(MARK, '').trim(), body.title);
      return respond(201, issues[n]);
    }
    const n = Number(parts[1]);
    if (!issues[n]) return respond(404, { message: 'Not Found' });
    if (parts.length === 2 && method === 'GET') return respond(200, issueView(n));
    if (parts.length === 2 && method === 'PATCH') { Object.assign(issues[n], body); return respond(200, issueView(n)); }
    if (parts[2] === 'comments' && method === 'GET') return respond(200, comments[n] || []);
    if (parts[2] === 'comments' && method === 'POST') {
      const c = addComment(n, user, body.body, /silent/i.test(body.body) ? 11 * 60e3 : 0);
      if (triggers(body.body)) simulateBot(n, body.body.replace(MARK, '').trim(), issues[n].title);
      return respond(201, c);
    }
    if (parts[2] === 'labels' && method === 'POST') {
      issues[n].labels.push(...body.labels.map(name => ({ name })));
      return respond(200, issues[n].labels);
    }
  }

  if (parts[0] === 'git') {
    const rest = parts.slice(1).join('/');
    if (rest.startsWith('matching-refs/')) {
      const prefix = 'refs/' + decodeURIComponent(rest.slice('matching-refs/'.length));
      return respond(200, Object.keys(refs).filter(r => r.startsWith(prefix)).map(ref => ({ ref, object: { sha: refs[ref] } })));
    }
    if (rest.startsWith('ref/') && method === 'GET') {
      const ref = 'refs/' + decodeURIComponent(rest.slice(4));
      return refs[ref] ? respond(200, { ref, object: { sha: refs[ref] } }) : respond(404, { message: 'Not Found' });
    }
    if (rest.startsWith('commits/') && method === 'GET') {
      const sha = parts[2];
      return treeOf[sha] ? respond(200, { sha, tree: { sha: treeOf[sha] } }) : respond(404, { message: 'Not Found' });
    }
    if (rest.startsWith('trees/') && method === 'GET') {
      const t = trees[parts[2]];
      if (!t) return respond(404, { message: 'Not Found' });
      return respond(200, { truncated: false, tree: Object.entries(t).map(([path, v]) => ({ path, type: 'blob', ...v })) });
    }
    if (rest === 'trees' && method === 'POST') {
      if (!body.base_tree) return respond(201, { sha: 'tree-uploads' });
      const t = { ...trees[body.base_tree] };
      for (const e of body.tree) { if (e.sha === null) delete t[e.path]; else t[e.path] = { sha: e.sha, mode: e.mode }; }
      const sha = `tree-${++did}`;
      trees[sha] = t;
      return respond(201, { sha });
    }
    if (rest === 'commits' && method === 'POST') {
      if (!body.parents.length) return respond(201, { sha: 'commit-uploads' });
      const sha = newCommit(body.parents[0], body.tree, `sha-undo-${++did}`);
      log.push(`COMMIT ${sha}: ${body.message.split('\n')[0]}`);
      return respond(201, { sha });
    }
    if (rest === 'refs' && method === 'POST') { refs[body.ref] = body.sha; return respond(201, { ref: body.ref }); }
    if (rest.startsWith('refs/') && method === 'PATCH') {
      const ref = 'refs/' + decodeURIComponent(rest.slice(5));
      if (!body.force && parentOf[body.sha] !== refs[ref]) return respond(422, { message: 'Update is not a fast forward' });
      refs[ref] = body.sha;
      log.push(`MAIN → ${body.sha}`);
      return respond(200, { ref, object: { sha: body.sha } });
    }
    if (rest.startsWith('refs/') && method === 'DELETE') {
      const ref = 'refs/' + decodeURIComponent(rest.slice(5));
      if (!refs[ref]) return respond(422, { message: 'Reference does not exist' });
      delete refs[ref];
      return respond(204);
    }
  }
  if (parts[0] === 'contents' && method === 'PUT') {
    if (!refs[`refs/heads/${body.branch}`]) return respond(404, { message: 'branch' });
    return respond(201, { content: { path: parts.slice(1).join('/') } });
  }

  if (parts[0] === 'pulls') {
    if (parts.length === 1 && method === 'GET') return respond(200, Object.values(pulls).sort((a, b) => b.number - a.number));
    if (parts.length === 1 && method === 'POST') {
      if (Object.values(pulls).some(x => x.state === 'open' && x.head.ref === body.head)) return respond(422, { message: 'A pull request already exists' });
      if (!refs[`refs/heads/${body.head}`]) return respond(422, { message: 'head invalid' });
      const n = ++seq;
      const pr = { number: n, title: body.title, body: body.body, state: 'open', merged_at: null, labels: [], head: { ref: body.head, sha: refs[`refs/heads/${body.head}`], repo: { full_name: REPO } }, user, created_at: now(), updated_at: now() };
      pulls[n] = pr;
      pr.pull_request = true; // the same object is the PR and its issue view
      issues[n] = pr;
      addDeployment(pr.head.sha);
      runCheck(pr.head.sha);
      setTimeout(() => addComment(n, vercel, '[vc]: #preview\n**The latest updates on your projects.**'), 1500 * SPEED);
      return respond(201, pr);
    }
    const n = Number(parts[1]);
    const pr = pulls[n];
    if (!pr) return respond(404, { message: 'Not Found' });
    const clash = process.env.CLASH && !pr.caughtUp;
    if (parts.length === 2 && method === 'GET') return respond(200, { ...pr, mergeable: !clash });
    if (parts.length === 2 && method === 'PATCH') { Object.assign(pr, body); return respond(200, pr); }
    if (parts[2] === 'files' && method === 'GET') return respond(200, filesOf[pr.head.sha] || [{ filename: 'main.js', status: 'modified' }]);
    if (parts[2] === 'update-branch' && method === 'PUT') {
      if (process.env.CLASH === 'conflict') return respond(422, { message: 'merge conflict between base and head' });
      pr.caughtUp = true;
      setHead(pr, `sha-${++did}`);
      return respond(202, { message: 'Updating pull request branch.' });
    }
    if (parts[2] === 'merge' && method === 'PUT') {
      if (clash) return respond(405, { message: 'Pull Request is not mergeable' });
      if (body.sha !== pr.head.sha) return respond(409, { message: 'Head branch was modified' });
      const main = refs['refs/heads/main'];
      const t = `tree-merged-${n}`;
      trees[t] = { ...trees[treeOf[main]], 'main.js': { sha: `blob-${n}`, mode: '100644' } };
      const sha = newCommit(main, t, `sha-merged-${n}`);
      refs['refs/heads/main'] = sha;
      pr.state = 'closed'; pr.merged_at = now(); pr.merge_commit_sha = sha;
      log.push(`MERGED #${n} title="${body.commit_title}" message="${body.commit_message}"`);
      return respond(200, { merged: true });
    }
  }
  if (parts[0] === 'commits' && method === 'GET') {
    const sha = parts[1];
    if (sha.startsWith('sha-merged-')) {
      const n = sha.slice('sha-merged-'.length);
      return respond(200, { sha, commit: { message: `Dec 3: Alci · Anthea · Priku at Sable for Art Basel\n\nFrom the studio chat.` }, parents: [{ sha: parentOf[sha] }], files: [{ filename: 'main.js', status: 'modified', sha: `blob-${n}` }] });
    }
    return respond(200, { sha, commit: { message: 'Dec 3: Alci · Anthea · Priku at Sable for Art Basel\n\nCo-authored-by: x' } });
  }
  if (parts[0] === 'deployments') {
    if (parts.length === 1) return respond(200, deployments.filter(d => !q.get('sha') || d.sha === q.get('sha')).map(d => ({ id: d.id, sha: d.sha })));
    const d = deployments.find(x => x.id === Number(parts[1]));
    return respond(200, d ? d.statuses : []);
  }
  if (parts[0] === 'actions' && parts[1] === 'workflows') {
    if (parts.length === 2) return respond(200, { workflows: [
      { path: '.github/workflows/site-edits.yml', state: 'active' },
      { path: '.github/workflows/site-check.yml', state: process.env.CHECK_OFF ? 'disabled_manually' : 'active' },
    ] });
    if (parts[2] === 'site-check.yml' && parts[3] === 'runs') {
      const sha = q.get('head_sha');
      if (sha) return respond(200, { workflow_runs: checks[sha] ? [{ event: 'pull_request', head_sha: sha, ...checks[sha] }] : [] });
      return respond(200, { workflow_runs: [{ event: 'push', status: 'completed', conclusion: 'success' }] });
    }
    if (parts[2] === 'site-edits.yml' && parts[3] === 'runs') {
      const created = (q.get('created') || '').replace('>=', '');
      return respond(200, { workflow_runs: botRuns.filter(r => !created || r.created_at >= created) });
    }
  }
  return respond(500, { message: `fake GitHub has no route for ${method} ${p}` });
}

const realFetch = global.fetch;
global.fetch = async (input, init = {}) => {
  const u = String(input);
  const prefix = `https://api.github.com/repos/${REPO}`;
  if (!u.startsWith(prefix)) return realFetch(input, init);
  if (init.headers.authorization !== 'Bearer fake-token') throw new Error('token not sent');
  return fakeGitHub(init.method || 'GET', u.slice(prefix.length), init.body ? JSON.parse(init.body) : undefined);
};

/* ─── server ─── */
const handler = require(path.join(ROOT, 'api/studio.js'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__merge') { // Youssef merges a pull request on GitHub himself
    const pr = pulls[Number(u.searchParams.get('n'))];
    pr.state = 'closed'; pr.merged_at = now(); pr.merge_commit_sha = `sha-merged-${pr.number}`;
    return res.end('{}');
  }
  if (u.pathname === '/__log') {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ log: log.slice(-40), main: refs['refs/heads/main'], mainFiles: trees[treeOf[refs['refs/heads/main']]], pulls: Object.values(pulls).map(x => ({ n: x.number, state: x.state, merged: !!x.merged_at, head: x.head.ref })), issues: Object.values(issues).filter(i => !i.pull_request).map(i => ({ n: i.number, state: i.state, reason: i.state_reason, labels: i.labels.map(l => l.name) })) }, null, 1));
  }
  if (u.pathname === '/api/studio') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const vreq = { method: req.method, headers: req.headers, query: Object.fromEntries(u.searchParams), body: raw ? JSON.parse(raw) : undefined };
    const vres = {
      statusCode: 200,
      setHeader: (k, v) => res.setHeader(k, v),
      status(c) { this.statusCode = c; return this; },
      json(d) { res.statusCode = this.statusCode; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(d)); return this; },
    };
    try { await handler(vreq, vres); } catch (e) { res.statusCode = 500; res.end(String(e.stack)); }
    return;
  }
  let file = path.join(ROOT, decodeURIComponent(u.pathname));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`studio rig on http://localhost:${PORT}/studio/`));
