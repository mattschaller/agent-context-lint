import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { lint } from '../src/index.js';

const TMP = join(tmpdir(), 'acl-test-integration');

function setup(files: Record<string, string>): string {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const dir = join(TMP, name.includes('/') ? name.split('/').slice(0, -1).join('/') : '');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(TMP, name), content);
  }
  return TMP;
}

function cleanup(): void {
  rmSync(TMP, { recursive: true, force: true });
}

describe('lint (integration)', () => {
  it('discovers and lints CLAUDE.md', () => {
    const dir = setup({
      'CLAUDE.md': [
        '# Setup',
        '',
        'Run `npm run build` to compile.',
        '',
        '## Testing',
        '',
        'Run `npm test`.',
        '',
        '## Build',
        '',
        'Uses tsup.',
      ].join('\n'),
      'package.json': JSON.stringify({
        scripts: { build: 'tsup', test: 'vitest' },
      }),
    });
    try {
      const result = lint(dir);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].score).toBeGreaterThanOrEqual(80);
    } finally {
      cleanup();
    }
  });

  it('returns empty result when no context files found', () => {
    const dir = setup({ 'README.md': '# Hello' });
    try {
      const result = lint(dir);
      expect(result.files).toHaveLength(0);
      expect(result.totalFindings).toBe(0);
    } finally {
      cleanup();
    }
  });

  it('lints specific files when provided', () => {
    const dir = setup({
      'CLAUDE.md': '# Project\n\nFollow best practices.',
      'AGENTS.md': '# Agent\n\n## Setup\n## Testing\n## Build',
    });
    try {
      const result = lint(dir, ['AGENTS.md']);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].file).toContain('AGENTS.md');
    } finally {
      cleanup();
    }
  });

  it('aggregates errors and warnings correctly', () => {
    const dir = setup({
      'CLAUDE.md': [
        '# Overview',
        '',
        'See `./nonexistent/path.ts` for details.',
        'Always follow best practices.',
        'Use good judgment when needed.',
      ].join('\n'),
    });
    try {
      const result = lint(dir);
      expect(result.errors).toBeGreaterThanOrEqual(1); // broken path
      expect(result.warnings).toBeGreaterThanOrEqual(2); // vague + missing sections
      expect(result.totalFindings).toBe(result.errors + result.warnings);
    } finally {
      cleanup();
    }
  });
});
