import { appendFileSync, writeFileSync } from 'node:fs';
import { FETCHERS } from './fetchers';
import { readJsonOrEmpty, warn } from './io';
import { formatReport, PROBLEM_OUTCOMES, runFetchers } from './runFetchers';
import type { AutoDataFile } from './types';

const path = 'data/auto.json';
const previous = readJsonOrEmpty<AutoDataFile>(path);
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
for (const r of report) {
  if (!PROBLEM_OUTCOMES.includes(r.outcome) && !r.stale) continue;
  warn(`${r.path}: ${r.outcome}${r.stale ? ', value is stale' : ''}${r.reason ? ` (${r.reason})` : ''}`, 'Data fetch');
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\nstale=${report.some((r) => r.stale)}\n`);
}
