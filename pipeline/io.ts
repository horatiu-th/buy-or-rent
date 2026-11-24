import { existsSync, readFileSync } from 'node:fs';

/** A JSON file's contents, or an empty object when the file doesn't exist yet. */
export function readJsonOrEmpty<T extends object>(path: string): T {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : ({} as T);
}

/** Prints a warning; in GitHub Actions the ::warning:: prefix turns it into an annotation on the run page. */
export function warn(message: string, title?: string) {
  const prefix = process.env.GITHUB_ACTIONS ? `::warning${title ? ` title=${title}` : ''}::` : 'Warning: ';
  console.warn(prefix + message);
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
