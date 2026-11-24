import { writeFileSync } from 'node:fs';
import type { PartialDataFile } from '../src/data/schema';
import { errorMessage, readJsonOrEmpty, warn } from './io';
import { mergeData } from './mergeData';

try {
  const { data, warnings } = mergeData(
    readJsonOrEmpty<PartialDataFile>('data/auto.json'),
    readJsonOrEmpty<PartialDataFile>('data/overrides.json'),
  );
  for (const w of warnings) warn(w);
  writeFileSync('src/data/defaults.json', JSON.stringify(data, null, 2) + '\n');
  console.log(`Merged ${Object.keys(data.values).length} values and ${Object.keys(data.cities).length} cities.`);
} catch (e) {
  console.error(errorMessage(e));
  process.exit(1);
}
