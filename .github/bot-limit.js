// The bot's weekly limit (site-edits.yml, gate job). Counts the bot's runs in
// the last 7 days, one "Claude Code is working" comment per run, and says
// ok=true while there's room. Over the limit, it tells the chat when the next
// run frees up instead, and Claude doesn't start.
//   env: LIMIT, ISSUE, GH_TOKEN, GITHUB_REPOSITORY, GITHUB_OUTPUT
//   DRY_RUN=1 counts and prints without commenting.
const fs = require('fs');

const WEEK = 7 * 24 * 3600e3;
const parsed = parseInt(process.env.LIMIT, 10);
const limit = Number.isInteger(parsed) && parsed >= 0 ? parsed : 20; // 0 pauses the bot
const repo = process.env.GITHUB_REPOSITORY;
const api = (path, init = {}) => fetch(`https://api.github.com/repos/${repo}${path}`, {
  ...init,
  headers: { authorization: `Bearer ${process.env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
});
const output = (key, value) => {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
};

async function botRunsSince(since) {
  const runs = [];
  for (let page = 1; page <= 10; page++) {
    const res = await api(`/issues/comments?since=${since.toISOString()}&per_page=100&page=${page}`);
    if (!res.ok) throw new Error(`GitHub said ${res.status} listing comments`);
    const batch = await res.json();
    runs.push(...batch.filter(c => c.user && c.user.login === 'claude[bot]' && Date.parse(c.created_at) >= since.getTime()));
    if (batch.length < 100) break;
  }
  return runs.map(c => Date.parse(c.created_at)).sort((a, b) => a - b);
}

(async () => {
  const now = Date.now();
  let runs;
  try {
    runs = await botRunsSince(new Date(now - WEEK));
  } catch (e) {
    // Can't count: let the run go rather than block every edit.
    console.log(`Couldn't check the weekly limit (${e.message}), so letting this run go.`);
    return output('ok', 'true');
  }
  console.log(`Bot runs in the last 7 days: ${runs.length} of ${limit}.`);
  if (runs.length < limit) return output('ok', 'true');

  output('ok', 'false');
  let text;
  if (limit === 0) {
    text = "Site changes are paused for now. Youssef can turn them back on.";
  } else {
    const frees = new Date(runs[runs.length - limit] + WEEK);
    const when = frees.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    text = `That's this week's limit for site changes (${limit} in 7 days), to keep Claude free for other work. The next one frees up ${when}. Youssef can raise the limit.`;
  }
  console.log(text);
  if (process.env.DRY_RUN || !process.env.ISSUE) return;
  const res = await api(`/issues/${process.env.ISSUE}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: `${text}\n\n<!-- studio-note --><!-- limit -->` }),
  });
  if (!res.ok) console.log(`Couldn't post the limit note (GitHub said ${res.status}).`);
})();
