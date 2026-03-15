import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTEXT_FILE_NAMES } from './types.js';

export function discoverContextFiles(cwd: string): string[] {
  const found: string[] = [];
  for (const name of CONTEXT_FILE_NAMES) {
    const fullPath = resolve(cwd, name);
    if (existsSync(fullPath)) {
      found.push(fullPath);
    }
  }
  return found;
}
