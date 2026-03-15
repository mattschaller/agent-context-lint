import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_CONFIG, type Config } from './types.js';

export function loadConfig(cwd: string): Config {
  // Try .agent-context-lint.json
  const configPath = resolve(cwd, '.agent-context-lint.json');
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
      return mergeConfig(raw);
    } catch {
      // Invalid config file — use defaults
    }
  }

  // Try package.json agentContextLint key
  const pkgPath = resolve(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.agentContextLint) {
        return mergeConfig(pkg.agentContextLint);
      }
    } catch {
      // Invalid package.json — use defaults
    }
  }

  return { ...DEFAULT_CONFIG };
}

function mergeConfig(overrides: Partial<Config>): Config {
  return {
    tokenBudget: {
      ...DEFAULT_CONFIG.tokenBudget,
      ...overrides.tokenBudget,
    },
    requiredSections:
      overrides.requiredSections ?? DEFAULT_CONFIG.requiredSections,
    staleDateYears: overrides.staleDateYears ?? DEFAULT_CONFIG.staleDateYears,
    vaguePatterns: overrides.vaguePatterns ?? DEFAULT_CONFIG.vaguePatterns,
    ignore: overrides.ignore ?? DEFAULT_CONFIG.ignore,
  };
}
