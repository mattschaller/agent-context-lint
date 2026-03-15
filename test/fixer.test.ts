import { describe, expect, it } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixFile } from '../src/fixer.js';

const TMP = join(tmpdir(), 'acl-test-fixer');

function setup(content: string): string {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  const filePath = join(TMP, 'CLAUDE.md');
  writeFileSync(filePath, content);
  return filePath;
}

function cleanup(): void {
  rmSync(TMP, { recursive: true, force: true });
}

describe('fixFile', () => {
  it('removes trailing whitespace', () => {
    const filePath = setup('# Title  \n\nSome text   \n');
    try {
      const result = fixFile(filePath);
      expect(result.fixed).toBe(true);
      expect(result.changes.some((c) => c.description === 'Removed trailing whitespace')).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('# Title\n\nSome text\n');
    } finally {
      cleanup();
    }
  });

  it('collapses multiple blank lines', () => {
    const filePath = setup('# Title\n\n\n\nSome text\n');
    try {
      const result = fixFile(filePath);
      expect(result.fixed).toBe(true);
      expect(result.changes.some((c) => c.description === 'Collapsed multiple blank lines')).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('# Title\n\nSome text\n');
    } finally {
      cleanup();
    }
  });

  it('adds missing trailing newline', () => {
    const filePath = setup('# Title\n\nSome text');
    try {
      const result = fixFile(filePath);
      expect(result.fixed).toBe(true);
      expect(result.changes.some((c) => c.description === 'Added trailing newline')).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('# Title\n\nSome text\n');
    } finally {
      cleanup();
    }
  });

  it('applies all fixes at once', () => {
    const filePath = setup('# Title  \n\n\n\nSome text   ');
    try {
      const result = fixFile(filePath);
      expect(result.fixed).toBe(true);
      expect(result.changes.length).toBeGreaterThanOrEqual(3);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toBe('# Title\n\nSome text\n');
    } finally {
      cleanup();
    }
  });

  it('returns fixed=false when no changes needed', () => {
    const filePath = setup('# Title\n\nAll good.\n');
    try {
      const result = fixFile(filePath);
      expect(result.fixed).toBe(false);
      expect(result.changes).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('returns the file path in result', () => {
    const filePath = setup('# Title\n');
    try {
      const result = fixFile(filePath);
      expect(result.file).toBe(filePath);
    } finally {
      cleanup();
    }
  });
});
