import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { ParsedFile } from './parser.js';
import type { Config, LintFinding } from './types.js';

export function checkPaths(
  parsed: ParsedFile,
  filePath: string,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const baseDir = dirname(filePath);

  for (const ref of parsed.paths) {
    const resolved = resolve(baseDir, ref.value);
    if (!existsSync(resolved)) {
      findings.push({
        file: filePath,
        rule: 'check:paths',
        line: ref.line,
        column: ref.column,
        severity: 'error',
        message: `Path does not exist: ${ref.value}`,
      });
    }
  }

  return findings;
}

export function checkScripts(
  parsed: ParsedFile,
  filePath: string,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const baseDir = dirname(filePath);
  const pkgPath = resolve(baseDir, 'package.json');

  let scripts: Record<string, string> = {};
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      scripts = pkg.scripts || {};
    } catch {
      // Invalid package.json — skip script checks
      return findings;
    }
  } else {
    // No package.json — skip script checks
    return findings;
  }

  for (const cmd of parsed.commands) {
    // Extract the script name from commands like "npm run test", "pnpm build"
    const match = /(?:npm|pnpm|yarn|bun)\s+run\s+([\w:@./-]+)/.exec(cmd.value);
    const directMatch = /(?:npm|pnpm|yarn|bun)\s+(test|start|build|lint)\b/.exec(
      cmd.value,
    );

    const scriptName = match?.[1] || directMatch?.[1];
    if (scriptName && !(scriptName in scripts)) {
      findings.push({
        file: filePath,
        rule: 'check:scripts',
        line: cmd.line,
        column: cmd.column,
        severity: 'error',
        message: `Script not found in package.json: "${scriptName}"`,
      });
    }
  }

  return findings;
}

export function checkTokenBudget(
  parsed: ParsedFile,
  filePath: string,
  config: Config,
): LintFinding[] {
  const findings: LintFinding[] = [];

  // Rough token estimate: ~4 chars per token for English text
  const estimatedTokens = Math.ceil(parsed.content.length / 4);

  if (estimatedTokens > config.tokenBudget.error) {
    findings.push({
      file: filePath,
      rule: 'check:token-budget',
      line: 1,
      column: 1,
      severity: 'error',
      message: `File is ~${estimatedTokens} tokens (limit: ${config.tokenBudget.error}). Consider splitting or condensing.`,
    });
  } else if (estimatedTokens > config.tokenBudget.warn) {
    findings.push({
      file: filePath,
      rule: 'check:token-budget',
      line: 1,
      column: 1,
      severity: 'warning',
      message: `File is ~${estimatedTokens} tokens (warn threshold: ${config.tokenBudget.warn}). Consider condensing.`,
    });
  }

  return findings;
}

export function checkVague(
  parsed: ParsedFile,
  filePath: string,
  config: Config,
): LintFinding[] {
  const findings: LintFinding[] = [];

  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i].toLowerCase();
    for (const pattern of config.vaguePatterns) {
      if (line.includes(pattern.toLowerCase())) {
        findings.push({
          file: filePath,
          rule: 'check:vague',
          line: i + 1,
          column: line.indexOf(pattern.toLowerCase()) + 1,
          severity: 'warning',
          message: `Vague instruction: "${pattern}". Replace with specific, actionable guidance.`,
        });
      }
    }
  }

  return findings;
}

export function checkRequiredSections(
  parsed: ParsedFile,
  filePath: string,
  config: Config,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const normalizedSections = parsed.sections.map((s) => s.toLowerCase());

  for (const required of config.requiredSections) {
    const found = normalizedSections.some(
      (s) => s.includes(required.toLowerCase()),
    );
    if (!found) {
      findings.push({
        file: filePath,
        rule: 'check:required-sections',
        line: 1,
        column: 1,
        severity: 'warning',
        message: `Missing recommended section: "${required}"`,
      });
    }
  }

  return findings;
}

export function checkStaleDates(
  parsed: ParsedFile,
  filePath: string,
  config: Config,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const currentYear = new Date().getFullYear();
  const threshold = currentYear - config.staleDateYears;

  const yearPattern = /\b(20[0-9]{2})\b/g;

  for (let i = 0; i < parsed.lines.length; i++) {
    let match: RegExpExecArray | null;
    yearPattern.lastIndex = 0;
    while ((match = yearPattern.exec(parsed.lines[i])) !== null) {
      const year = parseInt(match[1], 10);
      if (year < threshold) {
        findings.push({
          file: filePath,
          rule: 'check:stale-dates',
          line: i + 1,
          column: match.index + 1,
          severity: 'warning',
          message: `Possibly stale year reference: ${year} (older than ${config.staleDateYears} years)`,
        });
      }
    }
  }

  return findings;
}

export function checkContradictions(
  parsed: ParsedFile,
  filePath: string,
): LintFinding[] {
  const findings: LintFinding[] = [];

  // Contradiction pairs: if both patterns appear, flag them
  const contradictionPairs: [RegExp, RegExp, string][] = [
    [
      /\balways use (\w+)/i,
      /\bnever use (\w+)/i,
      'Contradictory "always use" and "never use" directives',
    ],
    [
      /\bdo not (?:use|add|include) (comments|docstrings|type annotations)/i,
      /\b(?:always|must) (?:add|include|write) \1/i,
      'Contradictory directives about adding/not adding',
    ],
    [
      /\bprefer (\w+) over (\w+)/i,
      /\bprefer \2 over \1/i,
      'Contradictory preference directives',
    ],
  ];

  const lineTexts = parsed.lines;

  for (const [patternA, patternB, message] of contradictionPairs) {
    const matchesA: { line: number; match: RegExpExecArray }[] = [];
    const matchesB: { line: number; match: RegExpExecArray }[] = [];

    for (let i = 0; i < lineTexts.length; i++) {
      const lineText = lineTexts[i];
      const a = patternA.exec(lineText);
      if (a) matchesA.push({ line: i + 1, match: a });
      const b = patternB.exec(lineText);
      if (b) matchesB.push({ line: i + 1, match: b });
    }

    if (matchesA.length > 0 && matchesB.length > 0) {
      // Check if contradictions reference the same term
      for (const a of matchesA) {
        for (const b of matchesB) {
          if (
            a.match[1] &&
            b.match[1] &&
            a.match[1].toLowerCase() === b.match[1].toLowerCase()
          ) {
            findings.push({
              file: filePath,
              rule: 'check:contradictions',
              line: b.line,
              column: 1,
              severity: 'warning',
              message: `${message} (conflicts with line ${a.line})`,
            });
          }
        }
      }
    }
  }

  return findings;
}
