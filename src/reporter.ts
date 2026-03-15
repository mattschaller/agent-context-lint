import { relative } from 'node:path';
import type { LintResult } from './types.js';

export function formatText(result: LintResult, cwd: string): string {
  const lines: string[] = [];

  for (const file of result.files) {
    const relPath = relative(cwd, file.file);
    lines.push(`\n  ${relPath}  (score: ${file.score}/100)`);

    if (file.findings.length === 0) {
      lines.push('    No issues found.');
      continue;
    }

    for (const f of file.findings) {
      const icon = f.severity === 'error' ? 'x' : '!';
      lines.push(
        `    ${f.line}:${f.column}  ${icon} ${f.message}  [${f.rule}]`,
      );
    }
  }

  lines.push('');
  lines.push(
    `  ${result.totalFindings} problems (${result.errors} errors, ${result.warnings} warnings)`,
  );
  lines.push('');

  return lines.join('\n');
}

export function formatJson(result: LintResult, cwd: string): string {
  const output = {
    ...result,
    files: result.files.map((f) => ({
      ...f,
      file: relative(cwd, f.file),
    })),
  };
  return JSON.stringify(output, null, 2);
}
