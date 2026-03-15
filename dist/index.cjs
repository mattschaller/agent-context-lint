"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  computeScore: () => computeScore,
  discoverContextFiles: () => discoverContextFiles,
  fixFile: () => fixFile,
  formatJson: () => formatJson,
  formatText: () => formatText,
  lint: () => lint,
  lintFile: () => lintFile,
  loadConfig: () => loadConfig,
  parseFile: () => parseFile
});
module.exports = __toCommonJS(index_exports);
var import_node_path5 = require("path");

// src/checkers.ts
var import_node_child_process = require("child_process");
var import_node_fs = require("fs");
var import_node_path = require("path");
function checkPaths(parsed, filePath) {
  const findings = [];
  const baseDir = (0, import_node_path.dirname)(filePath);
  for (const ref of parsed.paths) {
    const resolved = (0, import_node_path.resolve)(baseDir, ref.value);
    if (!(0, import_node_fs.existsSync)(resolved)) {
      findings.push({
        file: filePath,
        rule: "check:paths",
        line: ref.line,
        column: ref.column,
        severity: "error",
        message: `Path does not exist: ${ref.value}`
      });
    }
  }
  return findings;
}
function checkScripts(parsed, filePath) {
  const findings = [];
  const baseDir = (0, import_node_path.dirname)(filePath);
  const pkgPath = (0, import_node_path.resolve)(baseDir, "package.json");
  let scripts = {};
  if ((0, import_node_fs.existsSync)(pkgPath)) {
    try {
      const pkg = JSON.parse((0, import_node_fs.readFileSync)(pkgPath, "utf-8"));
      scripts = pkg.scripts || {};
    } catch {
      return findings;
    }
  } else {
    return findings;
  }
  for (const cmd of parsed.commands) {
    const match = /(?:npm|pnpm|yarn|bun)\s+run\s+([\w:@./-]+)/.exec(cmd.value);
    const directMatch = /(?:npm|pnpm|yarn|bun)\s+(test|start|build|lint)\b/.exec(
      cmd.value
    );
    const scriptName = match?.[1] || directMatch?.[1];
    if (scriptName && !(scriptName in scripts)) {
      findings.push({
        file: filePath,
        rule: "check:scripts",
        line: cmd.line,
        column: cmd.column,
        severity: "error",
        message: `Script not found in package.json: "${scriptName}"`
      });
    }
  }
  return findings;
}
function checkTokenBudget(parsed, filePath, config) {
  const findings = [];
  const estimatedTokens = Math.ceil(parsed.content.length / 4);
  if (estimatedTokens > config.tokenBudget.error) {
    findings.push({
      file: filePath,
      rule: "check:token-budget",
      line: 1,
      column: 1,
      severity: "error",
      message: `File is ~${estimatedTokens} tokens (limit: ${config.tokenBudget.error}). Consider splitting or condensing.`
    });
  } else if (estimatedTokens > config.tokenBudget.warn) {
    findings.push({
      file: filePath,
      rule: "check:token-budget",
      line: 1,
      column: 1,
      severity: "warning",
      message: `File is ~${estimatedTokens} tokens (warn threshold: ${config.tokenBudget.warn}). Consider condensing.`
    });
  }
  return findings;
}
function checkVague(parsed, filePath, config) {
  const findings = [];
  for (let i = 0; i < parsed.lines.length; i++) {
    const line = parsed.lines[i].toLowerCase();
    for (const pattern of config.vaguePatterns) {
      if (line.includes(pattern.toLowerCase())) {
        findings.push({
          file: filePath,
          rule: "check:vague",
          line: i + 1,
          column: line.indexOf(pattern.toLowerCase()) + 1,
          severity: "warning",
          message: `Vague instruction: "${pattern}". Replace with specific, actionable guidance.`
        });
      }
    }
  }
  return findings;
}
function checkRequiredSections(parsed, filePath, config) {
  const findings = [];
  const normalizedSections = parsed.sections.map((s) => s.toLowerCase());
  for (const required of config.requiredSections) {
    const found = normalizedSections.some(
      (s) => s.includes(required.toLowerCase())
    );
    if (!found) {
      findings.push({
        file: filePath,
        rule: "check:required-sections",
        line: 1,
        column: 1,
        severity: "warning",
        message: `Missing recommended section: "${required}"`
      });
    }
  }
  return findings;
}
function checkStaleDates(parsed, filePath, config) {
  const findings = [];
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const threshold = currentYear - config.staleDateYears;
  const yearPattern = /\b(20[0-9]{2})\b/g;
  for (let i = 0; i < parsed.lines.length; i++) {
    let match;
    yearPattern.lastIndex = 0;
    while ((match = yearPattern.exec(parsed.lines[i])) !== null) {
      const year = parseInt(match[1], 10);
      if (year < threshold) {
        findings.push({
          file: filePath,
          rule: "check:stale-dates",
          line: i + 1,
          column: match.index + 1,
          severity: "warning",
          message: `Possibly stale year reference: ${year} (older than ${config.staleDateYears} years)`
        });
      }
    }
  }
  return findings;
}
function checkContradictions(parsed, filePath) {
  const findings = [];
  const contradictionPairs = [
    [
      /\balways use (\w+)/i,
      /\bnever use (\w+)/i,
      'Contradictory "always use" and "never use" directives'
    ],
    [
      /\bdo not (?:use|add|include) (comments|docstrings|type annotations)/i,
      /\b(?:always|must) (?:add|include|write) \1/i,
      "Contradictory directives about adding/not adding"
    ],
    [
      /\bprefer (\w+) over (\w+)/i,
      /\bprefer \2 over \1/i,
      "Contradictory preference directives"
    ]
  ];
  const lineTexts = parsed.lines;
  for (const [patternA, patternB, message] of contradictionPairs) {
    const matchesA = [];
    const matchesB = [];
    for (let i = 0; i < lineTexts.length; i++) {
      const lineText = lineTexts[i];
      const a = patternA.exec(lineText);
      if (a) matchesA.push({ line: i + 1, match: a });
      const b = patternB.exec(lineText);
      if (b) matchesB.push({ line: i + 1, match: b });
    }
    if (matchesA.length > 0 && matchesB.length > 0) {
      for (const a of matchesA) {
        for (const b of matchesB) {
          if (a.match[1] && b.match[1] && a.match[1].toLowerCase() === b.match[1].toLowerCase()) {
            findings.push({
              file: filePath,
              rule: "check:contradictions",
              line: b.line,
              column: 1,
              severity: "warning",
              message: `${message} (conflicts with line ${a.line})`
            });
          }
        }
      }
    }
  }
  return findings;
}
var SHELL_BUILTINS = /* @__PURE__ */ new Set([
  "cd",
  "export",
  "echo",
  "source",
  "set",
  "unset",
  "alias",
  "unalias",
  "type",
  "readonly",
  "declare",
  "local",
  "eval",
  "exec",
  "trap",
  "return",
  "exit",
  "shift",
  "wait",
  "read",
  "pushd",
  "popd",
  "dirs",
  "ulimit",
  "umask",
  "getopts",
  "hash",
  "pwd",
  "test",
  "true",
  "false",
  "printf",
  "let",
  "if",
  "then",
  "else",
  "fi",
  "for",
  "do",
  "done",
  "while",
  "until",
  "case",
  "esac",
  "in",
  "function"
]);
var SHELL_LANGS = /* @__PURE__ */ new Set(["bash", "sh", "shell"]);
function checkCommands(parsed, filePath) {
  const findings = [];
  const cache = /* @__PURE__ */ new Map();
  for (const block of parsed.codeBlocks) {
    if (!SHELL_LANGS.has(block.lang)) continue;
    const lines = block.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("$ ") || line.startsWith("> ")) {
        line = line.slice(2).trim();
      }
      if (!line) continue;
      const cmd = line.split(/\s/)[0];
      if (!cmd || SHELL_BUILTINS.has(cmd)) continue;
      if (/^[A-Z_]+=/.test(cmd)) continue;
      if (!cache.has(cmd)) {
        try {
          (0, import_node_child_process.execFileSync)("which", [cmd], { stdio: "pipe" });
          cache.set(cmd, true);
        } catch {
          cache.set(cmd, false);
        }
      }
      if (!cache.get(cmd)) {
        findings.push({
          file: filePath,
          rule: "check:commands",
          line: block.line + 1 + i,
          column: 1,
          severity: "warning",
          message: `Command not found on system: "${cmd}"`
        });
      }
    }
  }
  return findings;
}
var JS_LANGS = /* @__PURE__ */ new Set(["ts", "js", "typescript", "javascript", "tsx", "jsx"]);
var IMPORT_FROM_RE = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
var EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".cjs"];
function resolveModule(base, importPath) {
  const resolved = (0, import_node_path.resolve)(base, importPath);
  if ((0, import_node_fs.existsSync)(resolved) && !resolved.endsWith("/")) return true;
  for (const ext of EXTENSIONS) {
    if ((0, import_node_fs.existsSync)(resolved + ext)) return true;
  }
  for (const ext of EXTENSIONS) {
    if ((0, import_node_fs.existsSync)((0, import_node_path.resolve)(resolved, "index" + ext))) return true;
  }
  return false;
}
function checkImports(parsed, filePath) {
  const findings = [];
  const baseDir = (0, import_node_path.dirname)(filePath);
  for (const block of parsed.codeBlocks) {
    if (!JS_LANGS.has(block.lang)) continue;
    const lines = block.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let match;
      IMPORT_FROM_RE.lastIndex = 0;
      while ((match = IMPORT_FROM_RE.exec(lines[i])) !== null) {
        const importPath = match[1] || match[2];
        if (!importPath.startsWith("./") && !importPath.startsWith("../")) continue;
        if (!resolveModule(baseDir, importPath)) {
          findings.push({
            file: filePath,
            rule: "check:imports",
            line: block.line + 1 + i,
            column: match.index + 1,
            severity: "error",
            message: `Import path does not resolve: "${importPath}"`
          });
        }
      }
    }
  }
  return findings;
}

// src/config.ts
var import_node_fs2 = require("fs");
var import_node_path2 = require("path");

// src/types.ts
var DEFAULT_CONFIG = {
  tokenBudget: { warn: 2e3, error: 5e3 },
  requiredSections: ["Setup", "Testing", "Build"],
  staleDateYears: 2,
  vaguePatterns: [
    "follow best practices",
    "be careful",
    "use good judgment",
    "use common sense",
    "as appropriate",
    "when necessary",
    "if needed",
    "as needed",
    "handle edge cases",
    "write clean code",
    "keep it simple",
    "use proper",
    "ensure quality"
  ],
  ignore: []
};
var CONTEXT_FILE_NAMES = [
  "CLAUDE.md",
  "AGENTS.md",
  ".cursorrules",
  "copilot-instructions.md",
  ".github/copilot-instructions.md"
];

// src/config.ts
function loadConfig(cwd) {
  const configPath = (0, import_node_path2.resolve)(cwd, ".agent-context-lint.json");
  if ((0, import_node_fs2.existsSync)(configPath)) {
    try {
      const raw = JSON.parse((0, import_node_fs2.readFileSync)(configPath, "utf-8"));
      return mergeConfig(raw);
    } catch {
    }
  }
  const pkgPath = (0, import_node_path2.resolve)(cwd, "package.json");
  if ((0, import_node_fs2.existsSync)(pkgPath)) {
    try {
      const pkg = JSON.parse((0, import_node_fs2.readFileSync)(pkgPath, "utf-8"));
      if (pkg.agentContextLint) {
        return mergeConfig(pkg.agentContextLint);
      }
    } catch {
    }
  }
  return { ...DEFAULT_CONFIG };
}
function mergeConfig(overrides) {
  return {
    tokenBudget: {
      ...DEFAULT_CONFIG.tokenBudget,
      ...overrides.tokenBudget
    },
    requiredSections: overrides.requiredSections ?? DEFAULT_CONFIG.requiredSections,
    staleDateYears: overrides.staleDateYears ?? DEFAULT_CONFIG.staleDateYears,
    vaguePatterns: overrides.vaguePatterns ?? DEFAULT_CONFIG.vaguePatterns,
    ignore: overrides.ignore ?? DEFAULT_CONFIG.ignore
  };
}

// src/discovery.ts
var import_node_fs3 = require("fs");
var import_node_path3 = require("path");
function discoverContextFiles(cwd) {
  const found = [];
  for (const name of CONTEXT_FILE_NAMES) {
    const fullPath = (0, import_node_path3.resolve)(cwd, name);
    if ((0, import_node_fs3.existsSync)(fullPath)) {
      found.push(fullPath);
    }
  }
  return found;
}

// src/parser.ts
var import_node_fs4 = require("fs");
var PATH_PATTERN = /(?:^|\s|`)(\.?\.?\/[\w./@-]+[\w/@-])/g;
var COMMAND_PATTERN = /(?:npm|npx|pnpm|yarn|bun|bunx)\s+(?:run\s+)?[\w:@./-]+/g;
var HEADING_PATTERN = /^#{1,6}\s+(.+)$/;
var FENCED_BLOCK_START = /^```(\w*)/;
var FENCED_BLOCK_END = /^```\s*$/;
var INLINE_CODE_PATTERN = /`([^`]+)`/g;
function parseFile(filePath) {
  const content = (0, import_node_fs4.readFileSync)(filePath, "utf-8");
  const lines = content.split("\n");
  const paths = [];
  const commands = [];
  const sections = [];
  const codeBlocks = [];
  const inlineCode = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent = "";
  let codeBlockStart = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    if (!inCodeBlock) {
      const blockStart = FENCED_BLOCK_START.exec(line);
      if (blockStart && line.trimStart().startsWith("```")) {
        inCodeBlock = true;
        codeBlockLang = blockStart[1] || "";
        codeBlockContent = "";
        codeBlockStart = lineNum;
        continue;
      }
    } else {
      if (FENCED_BLOCK_END.test(line) && line.trimStart() === "```") {
        codeBlocks.push({
          content: codeBlockContent,
          lang: codeBlockLang,
          line: codeBlockStart
        });
        inCodeBlock = false;
        continue;
      }
      codeBlockContent += (codeBlockContent ? "\n" : "") + line;
    }
    const headingMatch = HEADING_PATTERN.exec(line);
    if (headingMatch) {
      sections.push(headingMatch[1].trim());
    }
    let pathMatch;
    PATH_PATTERN.lastIndex = 0;
    while ((pathMatch = PATH_PATTERN.exec(line)) !== null) {
      const value = pathMatch[1];
      if (value.includes("://")) continue;
      paths.push({
        value,
        line: lineNum,
        column: pathMatch.index + (pathMatch[0].length - value.length) + 1
      });
    }
    let cmdMatch;
    COMMAND_PATTERN.lastIndex = 0;
    while ((cmdMatch = COMMAND_PATTERN.exec(line)) !== null) {
      commands.push({
        value: cmdMatch[0],
        line: lineNum,
        column: cmdMatch.index + 1
      });
    }
    if (!inCodeBlock) {
      let inlineMatch;
      INLINE_CODE_PATTERN.lastIndex = 0;
      while ((inlineMatch = INLINE_CODE_PATTERN.exec(line)) !== null) {
        inlineCode.push({
          content: inlineMatch[1],
          line: lineNum,
          column: inlineMatch.index + 2
        });
      }
    }
  }
  return { content, lines, paths, commands, sections, codeBlocks, inlineCode };
}

// src/scorer.ts
function computeScore(findings) {
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === "error") {
      score -= 15;
    } else {
      score -= 5;
    }
  }
  return Math.max(0, score);
}

// src/reporter.ts
var import_node_path4 = require("path");
function formatText(result, cwd) {
  const lines = [];
  for (const file of result.files) {
    const relPath = (0, import_node_path4.relative)(cwd, file.file);
    lines.push(`
  ${relPath}  (score: ${file.score}/100)`);
    if (file.findings.length === 0) {
      lines.push("    No issues found.");
      continue;
    }
    for (const f of file.findings) {
      const icon = f.severity === "error" ? "x" : "!";
      lines.push(
        `    ${f.line}:${f.column}  ${icon} ${f.message}  [${f.rule}]`
      );
    }
  }
  lines.push("");
  lines.push(
    `  ${result.totalFindings} problems (${result.errors} errors, ${result.warnings} warnings)`
  );
  lines.push("");
  return lines.join("\n");
}
function formatJson(result, cwd) {
  const output = {
    ...result,
    files: result.files.map((f) => ({
      ...f,
      file: (0, import_node_path4.relative)(cwd, f.file)
    }))
  };
  return JSON.stringify(output, null, 2);
}

// src/fixer.ts
var import_node_fs5 = require("fs");
function fixFile(filePath) {
  const original = (0, import_node_fs5.readFileSync)(filePath, "utf-8");
  const changes = [];
  let content = original;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== lines[i].trimEnd()) {
      changes.push({ line: i + 1, description: "Removed trailing whitespace" });
      lines[i] = lines[i].trimEnd();
    }
  }
  content = lines.join("\n");
  const collapsed = content.replace(/\n{3,}/g, (match, offset) => {
    const before = content.slice(0, offset);
    const lineNum = before.split("\n").length + 1;
    changes.push({ line: lineNum, description: "Collapsed multiple blank lines" });
    return "\n\n";
  });
  content = collapsed;
  if (content.length > 0 && !content.endsWith("\n")) {
    changes.push({
      line: content.split("\n").length,
      description: "Added trailing newline"
    });
    content += "\n";
  }
  const fixed = content !== original;
  if (fixed) {
    (0, import_node_fs5.writeFileSync)(filePath, content);
  }
  return { file: filePath, fixed, changes };
}

// src/index.ts
function lintFile(filePath, cwd) {
  const config = loadConfig(cwd);
  const parsed = parseFile(filePath);
  const findings = [
    ...checkPaths(parsed, filePath),
    ...checkScripts(parsed, filePath),
    ...checkTokenBudget(parsed, filePath, config),
    ...checkVague(parsed, filePath, config),
    ...checkRequiredSections(parsed, filePath, config),
    ...checkStaleDates(parsed, filePath, config),
    ...checkContradictions(parsed, filePath),
    ...checkCommands(parsed, filePath),
    ...checkImports(parsed, filePath)
  ];
  return {
    file: filePath,
    findings,
    score: computeScore(findings)
  };
}
function lint(cwd, files) {
  const targetFiles = files && files.length > 0 ? files.map((f) => (0, import_node_path5.resolve)(cwd, f)) : discoverContextFiles(cwd);
  if (targetFiles.length === 0) {
    return { files: [], totalFindings: 0, errors: 0, warnings: 0 };
  }
  const results = targetFiles.map((f) => lintFile(f, cwd));
  const totalFindings = results.reduce(
    (sum, r) => sum + r.findings.length,
    0
  );
  const errors = results.reduce(
    (sum, r) => sum + r.findings.filter((f) => f.severity === "error").length,
    0
  );
  const warnings = results.reduce(
    (sum, r) => sum + r.findings.filter((f) => f.severity === "warning").length,
    0
  );
  return { files: results, totalFindings, errors, warnings };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  computeScore,
  discoverContextFiles,
  fixFile,
  formatJson,
  formatText,
  lint,
  lintFile,
  loadConfig,
  parseFile
});
//# sourceMappingURL=index.cjs.map