import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mergeData } from './mergeData';

const read = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {});

try {
  const { data, warnings } = mergeData(read('data/auto.json'), read('data/overrides.json'));
  // In GitHub Actions the ::warning:: prefix turns each line into an annotation on the run page.
  const prefix = process.env.GITHUB_ACTIONS ? '::warning::' : 'Warning: ';
  for (const w of warnings) console.warn(prefix + w);
  writeFileSync('src/data/defaults.json', JSON.stringify(data, null, 2) + '\n');
  console.log(`Merged ${Object.keys(data.values).length} values and ${Object.keys(data.cities).length} cities.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
