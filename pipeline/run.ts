import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FETCHERS } from './fetchers';
import { formatReport, PROBLEM_OUTCOMES, runFetchers } from './runFetchers';

const path = 'data/auto.json';
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const { data, report, changed } = await runFetchers(FETCHERS, previous);
// Rewriting an unchanged file would only churn formatting and could open an empty update.
if (changed) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');

const summary = formatReport(report, changed);
writeFileSync('pipeline-summary.md', summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);

// Exit 0 even when a source fails: other fetchers' updates and age-based stale marks must still
// reach the pull request. Problems are surfaced as annotations instead, and the workflow fails a
// separate job once a value is actually stale.
const inActions = Boolean(process.env.GITHUB_ACTIONS);
for (const r of report) {
  if (!PROBLEM_OUTCOMES.includes(r.outcome) && !r.stale) continue;
  const msg = `${r.path}: ${r.outcome}${r.stale ? ', value is stale' : ''}${r.reason ? ` (${r.reason})` : ''}`;
  console.warn(inActions ? `::warning title=Data fetch::${msg}` : `Warning: ${msg}`);
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nstale=${report.some((r) => r.stale)}\n`);
}
