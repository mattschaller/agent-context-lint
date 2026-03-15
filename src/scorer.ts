import type { LintFinding } from './types.js';

/**
 * Computes a 0–100 quality score for a file based on its findings.
 *
 * Starts at 100 and deducts:
 * - 15 points per error
 * - 5 points per warning
 *
 * Minimum score is 0.
 */
export function computeScore(findings: LintFinding[]): number {
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === 'error') {
      score -= 15;
    } else {
      score -= 5;
    }
  }
  return Math.max(0, score);
}
