export interface LintFinding {
  file: string;
  rule: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
}

export interface FileResult {
  file: string;
  findings: LintFinding[];
  score: number;
}

export interface LintResult {
  files: FileResult[];
  totalFindings: number;
  errors: number;
  warnings: number;
}

export interface CLIOptions {
  files: string[];
  format: 'text' | 'json';
  fix: boolean;
  cwd: string;
}

export interface Config {
  tokenBudget: { warn: number; error: number };
  requiredSections: string[];
  staleDateYears: number;
  vaguePatterns: string[];
  ignore: string[];
}

export const DEFAULT_CONFIG: Config = {
  tokenBudget: { warn: 2000, error: 5000 },
  requiredSections: ['Setup', 'Testing', 'Build'],
  staleDateYears: 2,
  vaguePatterns: [
    'follow best practices',
    'be careful',
    'use good judgment',
    'use common sense',
    'as appropriate',
    'when necessary',
    'if needed',
    'as needed',
    'handle edge cases',
    'write clean code',
    'keep it simple',
    'use proper',
    'ensure quality',
  ],
  ignore: [],
};

export const CONTEXT_FILE_NAMES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  'copilot-instructions.md',
  '.github/copilot-instructions.md',
];
