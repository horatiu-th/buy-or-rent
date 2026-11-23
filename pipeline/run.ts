import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { FETCHERS } from './fetchers';
import { formatReport, runFetchers } from './runFetchers';

const path = 'data/auto.json';
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
const { data, report } = await runFetchers(FETCHERS, previous);
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');

const summary = formatReport(report);
writeFileSync('pipeline-summary.md', summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
