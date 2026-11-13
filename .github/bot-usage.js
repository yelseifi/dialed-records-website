// Prints what one bot run used, from claude-code-action's execution file:
// tokens per model, turns and time. Used by the Usage step in site-edits.yml.
// node .github/bot-usage.js <execution-file>
const fs = require('fs');

const messages = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const result = messages.filter(m => m && m.type === 'result').pop();
if (!result) {
  console.log('No result in the execution file, so no usage to show.');
  process.exit(0);
}

const k = n => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n || 0));
const perModel = Object.entries(result.modelUsage || {}).map(([model, u]) => ({
  model,
  fresh: (u.inputTokens || 0) + (u.cacheCreationInputTokens || 0),
  cached: u.cacheReadInputTokens || 0,
  out: u.outputTokens || 0,
}));
if (!perModel.length && result.usage) {
  const u = result.usage;
  perModel.push({ model: 'all models', fresh: (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0), cached: u.cache_read_input_tokens || 0, out: u.output_tokens || 0 });
}

const parts = perModel.map(m => `${m.model}: ${k(m.fresh)} in + ${k(m.cached)} cached, ${k(m.out)} out`);
const line = `${parts.join('; ')} · ${result.num_turns} turns · ${Math.round((result.duration_ms || 0) / 1000)}s`;
console.log(`::notice title=Bot usage::${line}`);

// When Claude couldn't run (a bad login, a model it can't use), the action
// hides why in a public repo. The result text is only the error then, never
// the conversation, so show it.
if (result.is_error && typeof result.result === 'string') {
  const why = result.result.replace(/\s+/g, ' ').slice(0, 400);
  console.log(`::error title=Why Claude stopped::${why}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Why Claude stopped:** ${why}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `**Bot usage:** ${line}\n`);
