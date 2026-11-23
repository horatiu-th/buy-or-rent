import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { mergeData } from './mergeData';

const read = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {});
const out = mergeData(read('data/auto.json'), read('data/overrides.json'));
writeFileSync('src/data/defaults.json', JSON.stringify(out, null, 2) + '\n');
console.log(`Merged ${Object.keys(out.values).length} values and ${Object.keys(out.cities).length} cities.`);
