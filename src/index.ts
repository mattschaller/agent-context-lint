import { resolve } from 'node:path';
import {
  checkCommands,
  checkContradictions,
  checkImports,
  checkPaths,
  checkRequiredSections,
  checkScripts,
  checkStaleDates,
  checkTokenBudget,
  checkVague,
} from './checkers.js';
import { loadConfig } from './config.js';
import { discoverContextFiles } from './discovery.js';
import { parseFile } from './parser.js';
import { computeScore } from './scorer.js';
import type { FileResult, LintFinding, LintResult } from './types.js';

export type { CLIOptions, Config, FileResult, LintFinding, LintResult } from './types.js';
export { discoverContextFiles } from './discovery.js';
export { parseFile } from './parser.js';
export { computeScore } from './scorer.js';
export { loadConfig } from './config.js';
export { formatJson, formatText } from './reporter.js';
export { fixFile } from './fixer.js';
export type { FixResult, FixChange } from './fixer.js';

export function lintFile(filePath: string, cwd: string): FileResult {
  const config = loadConfig(cwd);
  const parsed = parseFile(filePath);

  const findings: LintFinding[] = [
    ...checkPaths(parsed, filePath),
    ...checkScripts(parsed, filePath),
    ...checkTokenBudget(parsed, filePath, config),
    ...checkVague(parsed, filePath, config),
    ...checkRequiredSections(parsed, filePath, config),
    ...checkStaleDates(parsed, filePath, config),
    ...checkContradictions(parsed, filePath),
    ...checkCommands(parsed, filePath),
    ...checkImports(parsed, filePath),
  ];

  return {
    file: filePath,
    findings,
    score: computeScore(findings),
  };
}

export function lint(cwd: string, files?: string[]): LintResult {
  const targetFiles =
    files && files.length > 0
      ? files.map((f) => resolve(cwd, f))
      : discoverContextFiles(cwd);

  if (targetFiles.length === 0) {
    return { files: [], totalFindings: 0, errors: 0, warnings: 0 };
  }

  const results = targetFiles.map((f) => lintFile(f, cwd));

  const totalFindings = results.reduce(
    (sum, r) => sum + r.findings.length,
    0,
  );
  const errors = results.reduce(
    (sum, r) => sum + r.findings.filter((f) => f.severity === 'error').length,
    0,
  );
  const warnings = results.reduce(
    (sum, r) =>
      sum + r.findings.filter((f) => f.severity === 'warning').length,
    0,
  );

  return { files: results, totalFindings, errors, warnings };
}
