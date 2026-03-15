import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseFile } from '../src/parser.js';
import {
  checkPaths,
  checkScripts,
  checkTokenBudget,
  checkVague,
  checkRequiredSections,
  checkStaleDates,
  checkContradictions,
  checkCommands,
  checkImports,
} from '../src/checkers.js';
import { DEFAULT_CONFIG } from '../src/types.js';

const TMP = join(tmpdir(), 'acl-test-checkers');

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

describe('checkPaths', () => {
  it('flags non-existent paths', () => {
    const dir = setup({ 'CLAUDE.md': 'See `./src/missing.ts` for details.' });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkPaths(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('check:paths');
      expect(findings[0].severity).toBe('error');
    } finally {
      cleanup();
    }
  });

  it('passes for existing paths', () => {
    const dir = setup({
      'CLAUDE.md': 'See `./src/index.ts` for details.',
      'src/index.ts': 'export {}',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkPaths(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkScripts', () => {
  it('flags missing scripts', () => {
    const dir = setup({
      'CLAUDE.md': 'Run `npm run lint` to check.',
      'package.json': JSON.stringify({ scripts: { test: 'vitest' } }),
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkScripts(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('lint');
    } finally {
      cleanup();
    }
  });

  it('passes for present scripts', () => {
    const dir = setup({
      'CLAUDE.md': 'Run `npm run test` to verify.',
      'package.json': JSON.stringify({ scripts: { test: 'vitest' } }),
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkScripts(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkTokenBudget', () => {
  it('warns on large files', () => {
    const content = 'x'.repeat(9000); // ~2250 tokens
    const dir = setup({ 'CLAUDE.md': content });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkTokenBudget(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warning');
    } finally {
      cleanup();
    }
  });

  it('errors on very large files', () => {
    const content = 'x'.repeat(25000); // ~6250 tokens
    const dir = setup({ 'CLAUDE.md': content });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkTokenBudget(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('error');
    } finally {
      cleanup();
    }
  });

  it('passes for small files', () => {
    const dir = setup({ 'CLAUDE.md': '# Small file\n\nNot much here.' });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkTokenBudget(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkVague', () => {
  it('flags vague instructions', () => {
    const dir = setup({
      'CLAUDE.md': '# Rules\n\nAlways follow best practices when writing code.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkVague(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('follow best practices');
    } finally {
      cleanup();
    }
  });

  it('passes for specific instructions', () => {
    const dir = setup({
      'CLAUDE.md': '# Rules\n\nUse vitest for all unit tests. Run npm test before committing.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkVague(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkRequiredSections', () => {
  it('flags missing sections', () => {
    const dir = setup({ 'CLAUDE.md': '# Overview\n\nThis project does stuff.' });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkRequiredSections(parsed, filePath, DEFAULT_CONFIG);
      expect(findings.length).toBeGreaterThanOrEqual(3);
    } finally {
      cleanup();
    }
  });

  it('passes when sections are present', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n## Testing\n\n## Build\n\nDone.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkRequiredSections(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkStaleDates', () => {
  it('flags old years', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\nLast updated 2020. Uses Node 14.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkStaleDates(parsed, filePath, DEFAULT_CONFIG);
      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].message).toContain('2020');
    } finally {
      cleanup();
    }
  });

  it('passes for recent years', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\nUpdated 2026. Uses Node 22.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkStaleDates(parsed, filePath, DEFAULT_CONFIG);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkContradictions', () => {
  it('flags contradictory always/never directives', () => {
    const dir = setup({
      'CLAUDE.md':
        '# Rules\n\nAlways use TypeScript.\n\nNever use TypeScript for scripts.',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkContradictions(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('check:contradictions');
    } finally {
      cleanup();
    }
  });
});

describe('checkCommands', () => {
  it('flags unknown commands in bash blocks', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n```bash\nthis_command_does_not_exist_xyz --flag\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkCommands(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('check:commands');
      expect(findings[0].severity).toBe('warning');
      expect(findings[0].message).toContain('this_command_does_not_exist_xyz');
    } finally {
      cleanup();
    }
  });

  it('passes for known commands', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n```bash\nnode --version\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkCommands(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('skips shell builtins', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n```bash\ncd src\nexport FOO=bar\necho hello\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkCommands(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('skips comments, empty lines, and prompt prefixes', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n```bash\n# a comment\n\n$ node --version\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkCommands(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('ignores non-shell code blocks', () => {
    const dir = setup({
      'CLAUDE.md': '# Setup\n\n```typescript\nthis_command_does_not_exist_xyz()\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkCommands(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});

describe('checkImports', () => {
  it('flags broken relative imports', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```ts\nimport { foo } from \'./missing-module\';\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('check:imports');
      expect(findings[0].severity).toBe('error');
      expect(findings[0].message).toContain('./missing-module');
    } finally {
      cleanup();
    }
  });

  it('passes for existing relative imports', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```ts\nimport { foo } from \'./helper\';\n```\n',
      'helper.ts': 'export const foo = 1;',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('resolves index files', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```ts\nimport { foo } from \'./utils\';\n```\n',
      'utils/index.ts': 'export const foo = 1;',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('skips bare specifiers (npm packages)', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```ts\nimport express from \'express\';\nimport { join } from \'node:path\';\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it('handles require() calls', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```js\nconst mod = require(\'./nonexistent\');\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('./nonexistent');
    } finally {
      cleanup();
    }
  });

  it('ignores non-JS code blocks', () => {
    const dir = setup({
      'CLAUDE.md': '# Code\n\n```python\nimport os\n```\n',
    });
    try {
      const filePath = join(dir, 'CLAUDE.md');
      const parsed = parseFile(filePath);
      const findings = checkImports(parsed, filePath);
      expect(findings).toHaveLength(0);
    } finally {
      cleanup();
    }
  });
});
