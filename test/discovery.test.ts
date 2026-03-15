import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverContextFiles } from '../src/discovery.js';

const TMP = join(tmpdir(), 'acl-test-discovery');

function setup(files: string[]): string {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const name of files) {
    const dir = join(TMP, name.includes('/') ? name.split('/').slice(0, -1).join('/') : '');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(TMP, name), '# placeholder');
  }
  return TMP;
}

function cleanup(): void {
  rmSync(TMP, { recursive: true, force: true });
}

describe('discoverContextFiles', () => {
  it('finds CLAUDE.md', () => {
    const dir = setup(['CLAUDE.md']);
    try {
      const files = discoverContextFiles(dir);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('CLAUDE.md');
    } finally {
      cleanup();
    }
  });

  it('finds multiple context files', () => {
    const dir = setup(['CLAUDE.md', 'AGENTS.md', '.cursorrules']);
    try {
      const files = discoverContextFiles(dir);
      expect(files).toHaveLength(3);
    } finally {
      cleanup();
    }
  });

  it('finds .github/copilot-instructions.md', () => {
    const dir = setup(['.github/copilot-instructions.md']);
    try {
      const files = discoverContextFiles(dir);
      expect(files).toHaveLength(1);
      expect(files[0]).toContain('copilot-instructions.md');
    } finally {
      cleanup();
    }
  });

  it('returns empty for repos with no context files', () => {
    const dir = setup(['README.md']);
    try {
      const files = discoverContextFiles(dir);
      expect(files).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
