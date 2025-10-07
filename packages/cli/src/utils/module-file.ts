export const insertImportIfMissing = (content: string, importStatement: string): { content: string; added: boolean } => {
  if (content.includes(importStatement)) {
    return { content, added: false };
  }

  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  const insertIndex = lastImportIndex === -1 ? 0 : lastImportIndex + 1;
  lines.splice(insertIndex, 0, importStatement);

  const moduleIndex = lines.findIndex((line) => line.trim().startsWith('@Module'));
  if (moduleIndex !== -1) {
    let blankCount = 0;
    for (let i = moduleIndex - 1; i >= 0; i--) {
      if (lines[i]?.trim() === '') {
        blankCount += 1;
        if (blankCount > 1) {
          lines.splice(i, 1);
        }
        continue;
      }
      break;
    }

    if (blankCount === 0 && moduleIndex > 0) {
      lines.splice(moduleIndex, 0, '');
    }
  }

  return { content: lines.join('\n'), added: true };
};

const sanitizeEntries = (entries: string[]): string[] => entries.map((entry) => entry.trim()).filter((entry) => Boolean(entry));

export const addSymbolToModuleArray = (
  content: string,
  propertyName: string,
  symbol: string,
): { content: string; changed: boolean } => {
  const lines = content.split('\n');
  const propertyIndex = lines.findIndex((line) => line.trim().startsWith(`${propertyName}:`));

  if (propertyIndex === -1) {
    return { content, changed: false };
  }

  const line = lines[propertyIndex];
  if (line === undefined) {
    return { content, changed: false };
  }
  const openBracketIndex = line.indexOf('[');
  const closeBracketIndex = line.indexOf(']');

  if (openBracketIndex === -1 || closeBracketIndex === -1) {
    return { content, changed: false };
  }

  const before = line.slice(0, openBracketIndex + 1);
  const suffix = line.slice(closeBracketIndex + 1);
  const rawEntries = line.slice(openBracketIndex + 1, closeBracketIndex).split(',');
  const entries = sanitizeEntries(rawEntries);

  if (entries.includes(symbol)) {
    return { content, changed: false };
  }

  entries.push(symbol);
  const joined = entries.join(', ');
  const newLine = `${before}${joined}]${suffix}`;
  lines[propertyIndex] = newLine;

  return { content: lines.join('\n'), changed: true };
};

export const appendExportLine = async (
  filePath: string,
  exportLine: string,
): Promise<'created' | 'updated' | 'unchanged'> => {
  const file = Bun.file(filePath);
  if (await file.exists()) {
    const current = await file.text();
    const lines = current.split(/\r?\n/).map((line) => line.trim());
    if (lines.includes(exportLine)) {
      return 'unchanged';
    }

    const nextContent = current.endsWith('\n') ? `${current}${exportLine}\n` : `${current}\n${exportLine}\n`;
    await Bun.write(filePath, nextContent);
    return 'updated';
  }

  await Bun.write(filePath, `${exportLine}\n`);
  return 'created';
};