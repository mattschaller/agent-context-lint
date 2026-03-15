import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseFile } from '../src/parser.js';

const TMP = join(tmpdir(), 'acl-test-parser');

function setup(content: string): string {
  mkdirSync(TMP, { recursive: true });
  const filePath = join(TMP, 'test.md');
  writeFileSync(filePath, content);
  return filePath;
}

function cleanup(): void {
  rmSync(TMP, { recursive: true, force: true });
}

describe('parseFile', () => {
  it('extracts headings as sections', () => {
    const f = setup('# Setup\n## Testing\n### Build Commands');
    try {
      const result = parseFile(f);
      expect(result.sections).toEqual(['Setup', 'Testing', 'Build Commands']);
    } finally {
      cleanup();
    }
  });

  it('extracts file paths', () => {
    const f = setup('Edit `./src/index.ts` and check `../config/base.json`');
    try {
      const result = parseFile(f);
      const values = result.paths.map((p) => p.value);
      expect(values).toContain('./src/index.ts');
      expect(values).toContain('../config/base.json');
    } finally {
      cleanup();
    }
  });

  it('extracts npm commands', () => {
    const f = setup('Run `npm run build` and `pnpm test` to verify.');
    try {
      const result = parseFile(f);
      expect(result.commands).toHaveLength(2);
      expect(result.commands[0].value).toBe('npm run build');
      expect(result.commands[1].value).toBe('pnpm test');
    } finally {
      cleanup();
    }
  });

  it('extracts fenced code blocks', () => {
    const f = setup('```bash\nnpm install\n```\n\n```ts\nconst x = 1;\n```');
    try {
      const result = parseFile(f);
      expect(result.codeBlocks).toHaveLength(2);
      expect(result.codeBlocks[0].lang).toBe('bash');
      expect(result.codeBlocks[0].content).toBe('npm install');
      expect(result.codeBlocks[1].lang).toBe('ts');
    } finally {
      cleanup();
    }
  });

  it('extracts inline code spans', () => {
    const f = setup('Use `vitest` for testing and `tsup` for building.');
    try {
      const result = parseFile(f);
      const contents = result.inlineCode.map((c) => c.content);
      expect(contents).toContain('vitest');
      expect(contents).toContain('tsup');
    } finally {
      cleanup();
    }
  });

  it('ignores URLs in path extraction', () => {
    const f = setup('See https://example.com/path/to/resource for more.');
    try {
      const result = parseFile(f);
      const pathValues = result.paths.map((p) => p.value);
      expect(pathValues).not.toContain('/path/to/resource');
    } finally {
      cleanup();
    }
  });
});
