interface LintFinding {
    file: string;
    rule: string;
    line: number;
    column: number;
    severity: 'error' | 'warning';
    message: string;
}
interface FileResult {
    file: string;
    findings: LintFinding[];
    score: number;
}
interface LintResult {
    files: FileResult[];
    totalFindings: number;
    errors: number;
    warnings: number;
}
interface CLIOptions {
    files: string[];
    format: 'text' | 'json';
    fix: boolean;
    cwd: string;
}
interface Config {
    tokenBudget: {
        warn: number;
        error: number;
    };
    requiredSections: string[];
    staleDateYears: number;
    vaguePatterns: string[];
    ignore: string[];
}

declare function discoverContextFiles(cwd: string): string[];

interface ParsedFile {
    content: string;
    lines: string[];
    paths: PathReference[];
    commands: CommandReference[];
    sections: string[];
    codeBlocks: CodeBlock[];
    inlineCode: InlineCode[];
}
interface PathReference {
    value: string;
    line: number;
    column: number;
}
interface CommandReference {
    value: string;
    line: number;
    column: number;
}
interface CodeBlock {
    content: string;
    lang: string;
    line: number;
}
interface InlineCode {
    content: string;
    line: number;
    column: number;
}
declare function parseFile(filePath: string): ParsedFile;

/**
 * Computes a 0–100 quality score for a file based on its findings.
 *
 * Starts at 100 and deducts:
 * - 15 points per error
 * - 5 points per warning
 *
 * Minimum score is 0.
 */
declare function computeScore(findings: LintFinding[]): number;

declare function loadConfig(cwd: string): Config;

declare function formatText(result: LintResult, cwd: string): string;
declare function formatJson(result: LintResult, cwd: string): string;

interface FixChange {
    line: number;
    description: string;
}
interface FixResult {
    file: string;
    fixed: boolean;
    changes: FixChange[];
}
declare function fixFile(filePath: string): FixResult;

declare function lintFile(filePath: string, cwd: string): FileResult;
declare function lint(cwd: string, files?: string[]): LintResult;

export { type CLIOptions, type Config, type FileResult, type FixChange, type FixResult, type LintFinding, type LintResult, computeScore, discoverContextFiles, fixFile, formatJson, formatText, lint, lintFile, loadConfig, parseFile };
