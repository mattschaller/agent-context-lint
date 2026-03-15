# agent-context-lint

Lint AI coding agent context files for staleness, broken paths, and semantic quality issues.

Supports **CLAUDE.md**, **AGENTS.md**, **.cursorrules**, and **copilot-instructions.md**.

## Quickstart

```bash
npx agent-context-lint
```

Auto-discovers context files in the current directory and runs both structural and semantic checks.

## The problem

Every engineering team using Claude Code, Cursor, Copilot, or Codex has context files that drift silently away from reality as the codebase changes. Broken paths, missing scripts, stale dates, and vague instructions degrade agent performance and inflate token costs.

[Research shows](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) most AGENTS.md files lack the sections that most improve agent task performance. [Studies confirm](https://devcenter.upsun.com/posts/agents-md-less-is-more/) poor context files inflate token costs by 20%+.

No existing tool does both structural validation (do referenced paths and scripts actually exist?) and semantic quality scoring (are instructions specific and actionable?).

## What it checks

### Layer 1 — Repo-state validation

| Rule | Severity | What it catches |
|------|----------|----------------|
| `check:paths` | error | File/directory paths mentioned in context file that don't exist on disk |
| `check:scripts` | error | npm/pnpm/yarn/bun scripts referenced that aren't in package.json |

### Layer 2 — Semantic quality

| Rule | Severity | What it catches |
|------|----------|----------------|
| `check:token-budget` | warn/error | Files exceeding token thresholds (warn: 2,000, error: 5,000) |
| `check:vague` | warning | Vague instructions like "follow best practices" or "use good judgment" |
| `check:required-sections` | warning | Missing recommended sections (Setup, Testing, Build) |
| `check:stale-dates` | warning | Year references older than 2 years |
| `check:contradictions` | warning | Contradictory directives ("always use X" + "never use X") |

Each file gets a **0–100 quality score** based on findings.

### Example output

```
  CLAUDE.md  (score: 70/100)
    3:5  x Path does not exist: ./src/old-module.ts  [check:paths]
    7:1  ! Vague instruction: "follow best practices"  [check:vague]
    1:1  ! Missing recommended section: "Testing"  [check:required-sections]

  1 problems (1 errors, 2 warnings)
```

## CLI options

```
npx agent-context-lint                  # auto-discover and lint all context files
npx agent-context-lint CLAUDE.md        # lint a specific file
npx agent-context-lint --format json    # machine-readable output for CI
npx agent-context-lint --json           # shorthand for --format json
npx agent-context-lint -V               # show version
```

Exit code 1 on any error (CI-compatible).

## Configuration

Create `.agent-context-lint.json` in your project root, or add an `agentContextLint` key to `package.json`:

```json
{
  "tokenBudget": { "warn": 2000, "error": 5000 },
  "requiredSections": ["Setup", "Testing", "Build"],
  "staleDateYears": 2,
  "vaguePatterns": ["follow best practices", "be careful", "use good judgment"],
  "ignore": []
}
```

## Programmatic API

```typescript
import { lint, lintFile } from 'agent-context-lint';

const result = lint(process.cwd());
// result.files[0].score → 85
// result.files[0].findings → [{ rule: 'check:paths', ... }]

const fileResult = lintFile('./CLAUDE.md', process.cwd());
```

## Prior art

- [agents-lint](https://github.com/giacomo/agents-lint) — structural checks only (paths, scripts, freshness score). No semantic quality scoring.
- [ai-context-kit](https://github.com/ofershap/ai-context-kit) — semantic checks only (token budget, vague instructions, contradictions). No repo-state validation.
- [@carlrannaberg/cclint](https://github.com/carlrannaberg/cclint) — Claude Code-specific. Not useful for AGENTS.md or .cursorrules.

agent-context-lint combines both structural and semantic checks in a single tool.

## Contributing

Contributions welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/mattschaller/agent-context-lint
cd agent-context-lint
npm install
npm test
```

## License

MIT
