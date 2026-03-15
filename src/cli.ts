import { resolve } from 'node:path';
import { fixFile } from './fixer.js';
import { lint } from './index.js';
import { formatJson, formatText } from './reporter.js';
import type { CLIOptions } from './types.js';

function getGitHubActionInputs(): CLIOptions | null {
  if (process.env.GITHUB_ACTIONS !== 'true') return null;

  const files = (process.env.INPUT_FILES || '').split(/\s+/).filter(Boolean);
  const format = process.env.INPUT_FORMAT === 'json' ? 'json' as const : 'text' as const;

  return {
    files,
    format,
    fix: false,
    cwd: process.cwd(),
  };
}

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);
  const options: CLIOptions = {
    files: [],
    format: 'text',
    fix: false,
    cwd: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' && args[i + 1]) {
      const fmt = args[++i];
      if (fmt === 'json' || fmt === 'text') {
        options.format = fmt;
      }
    } else if (arg === '--json') {
      options.format = 'json';
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-V') {
      console.log('0.1.1');
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
  agent-context-lint — Lint AI coding agent context files

  Usage:
    npx agent-context-lint              Auto-discover and lint all context files
    npx agent-context-lint CLAUDE.md    Lint a specific file
    npx agent-context-lint --format json  Machine-readable output for CI
    npx agent-context-lint --fix CLAUDE.md  Auto-fix safe issues then lint

  Options:
    --format <text|json>  Output format (default: text)
    --json                Shorthand for --format json
    --fix                 Auto-fix safe issues (trailing whitespace, blank lines, trailing newline)
    -V, --version         Show version
    -h, --help            Show this help

  Context files detected:
    CLAUDE.md, AGENTS.md, .cursorrules, copilot-instructions.md,
    .github/copilot-instructions.md

  Configuration:
    .agent-context-lint.json or "agentContextLint" key in package.json

  GitHub Action:
    uses: mattschaller/agent-context-lint@v0
    with:
      files: 'CLAUDE.md AGENTS.md'
      format: text
`);
}

function main(): void {
  const options = getGitHubActionInputs() || parseArgs(process.argv);

  // Run fix before lint if requested
  if (options.fix) {
    const filesToFix = options.files.length > 0
      ? options.files.map((f) => resolve(options.cwd, f))
      : [];

    for (const file of filesToFix) {
      const fixResult = fixFile(file);
      if (fixResult.fixed) {
        console.log(`Fixed ${file}:`);
        for (const change of fixResult.changes) {
          console.log(`  line ${change.line}: ${change.description}`);
        }
        console.log();
      }
    }
  }

  const result = lint(
    options.cwd,
    options.files.length > 0 ? options.files : undefined,
  );

  if (result.files.length === 0) {
    console.log('No context files found.');
    process.exit(0);
  }

  const output =
    options.format === 'json'
      ? formatJson(result, options.cwd)
      : formatText(result, options.cwd);

  console.log(output);
  process.exit(result.errors > 0 ? 1 : 0);
}

main();
