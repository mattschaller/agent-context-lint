import { readFileSync, writeFileSync } from 'node:fs';

export interface FixChange {
  line: number;
  description: string;
}

export interface FixResult {
  file: string;
  fixed: boolean;
  changes: FixChange[];
}

export function fixFile(filePath: string): FixResult {
  const original = readFileSync(filePath, 'utf-8');
  const changes: FixChange[] = [];
  let content = original;

  // Fix trailing whitespace on each line
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== lines[i].trimEnd()) {
      changes.push({ line: i + 1, description: 'Removed trailing whitespace' });
      lines[i] = lines[i].trimEnd();
    }
  }
  content = lines.join('\n');

  // Fix multiple consecutive blank lines → single blank line
  const collapsed = content.replace(/\n{3,}/g, (match, offset) => {
    const before = content.slice(0, offset);
    const lineNum = before.split('\n').length + 1;
    changes.push({ line: lineNum, description: 'Collapsed multiple blank lines' });
    return '\n\n';
  });
  content = collapsed;

  // Fix missing trailing newline
  if (content.length > 0 && !content.endsWith('\n')) {
    changes.push({
      line: content.split('\n').length,
      description: 'Added trailing newline',
    });
    content += '\n';
  }

  const fixed = content !== original;
  if (fixed) {
    writeFileSync(filePath, content);
  }

  return { file: filePath, fixed, changes };
}
