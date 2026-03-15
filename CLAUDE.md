# agent-context-lint

Lint AI coding agent context files (AGENTS.md, CLAUDE.md, .cursorrules, copilot-instructions.md) for staleness, broken paths, and semantic quality issues.

## Setup

```bash
npm install
npm run build
```

## Testing

```bash
npm test              # run all tests
npm run test:watch    # watch mode
```

Tests use vitest. Test files live in `test/`. Each source module has a corresponding test file.

## Build

```bash
npm run build
```

Uses tsup. Outputs ESM + CJS to `dist/`. CLI entry is `src/cli.ts`, library entry is `src/index.ts`.

## Architecture

- `src/types.ts` — shared types and default config
- `src/discovery.ts` — auto-discovers context files in a directory
- `src/parser.ts` — parses markdown files, extracts paths, commands, sections, code blocks
- `src/checkers.ts` — all lint rules (check:paths, check:scripts, check:token-budget, check:vague, check:required-sections, check:stale-dates, check:contradictions)
- `src/scorer.ts` — computes 0-100 quality score from findings
- `src/reporter.ts` — formats output as text or JSON
- `src/config.ts` — loads config from .agent-context-lint.json or package.json
- `src/index.ts` — library entry point (lint, lintFile)
- `src/cli.ts` — CLI entry point

## Conventions

- Zero runtime dependencies — only Node.js built-ins
- TypeScript strict mode
- vitest for testing
- tsup for bundling
- Node >= 20
