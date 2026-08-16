import { createDefaultWord, normalizeKey, uid } from './store.js';
import { assignFamilies } from './roots.js';

/**
 * CSV columns (header row required):
 * french, english, pos, cefr, root, example, region, tags
 *
 * Minimal: french, english
 * Tags pipe-separated: "exam|spoken|A2"
 */
export function parseCSV(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  const hasHeader = header.includes('french') || header.includes('français');

  const start = hasHeader ? 1 : 0;
  const col = buildColumnMap(hasHeader ? header : ['french', 'english']);

  const words = [];

  for (let i = start; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i]);
    if (cells.every((c) => !c.trim())) continue;

    const french = getCell(cells, col, 'french') || getCell(cells, col, 'français') || cells[0];
    const english = getCell(cells, col, 'english') || getCell(cells, col, 'translation') || cells[1];

    if (!french?.trim()) continue;

    const tagsRaw = getCell(cells, col, 'tags') || '';
    const tags = tagsRaw ? tagsRaw.split(/[|;]/).map((t) => t.trim()).filter(Boolean) : [];

    words.push(
      createDefaultWord({
        id: uid(),
        french: french.trim(),
        english: (english || '').trim(),
        pos: getCell(cells, col, 'pos') || getCell(cells, col, 'part_of_speech') || '',
        cefr: (getCell(cells, col, 'cefr') || getCell(cells, col, 'level') || '').toUpperCase(),
        root: getCell(cells, col, 'root') || null,
        example: getCell(cells, col, 'example') || getCell(cells, col, 'sentence') || '',
        region: getCell(cells, col, 'region') || '',
        tags,
      }),
    );
  }

  return words;
}

function buildColumnMap(header) {
  const map = {};
  header.forEach((h, i) => {
    map[h] = i;
  });
  return map;
}

function getCell(cells, col, name) {
  const idx = col[name];
  if (idx === undefined) return '';
  return cells[idx] ?? '';
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** WordBit / generic export: one word per line, tab or comma separated */
export function parsePlainList(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(/,\s*/);
    return createDefaultWord({
      id: uid(),
      french: (parts[0] || '').trim(),
      english: (parts[1] || '').trim(),
      cefr: (parts[2] || '').trim().toUpperCase(),
    });
  }).filter((w) => w.french);
}

export function parseJSON(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.words;
  if (!Array.isArray(list)) throw new Error('JSON must be an array or { words: [] }');

  return list.map((item) =>
    createDefaultWord({
      id: item.id || uid(),
      french: item.french || item.word || item.front || '',
      english: item.english || item.translation || item.back || '',
      pos: item.pos || item.partOfSpeech || '',
      cefr: (item.cefr || item.level || '').toUpperCase(),
      root: item.root || null,
      example: item.example || item.sentence || '',
      region: item.region || '',
      tags: item.tags || [],
      confidence: item.confidence || 'unknown',
      confidenceScore: item.confidenceScore ?? 0,
      passes: item.passes ?? 0,
      reviews: item.reviews ?? 0,
      due: item.due ?? Date.now(),
      interval: item.interval ?? 0,
      ease: item.ease ?? 2.5,
    }),
  ).filter((w) => w.french);
}

export function importText(text, format = 'auto') {
  const trimmed = text.trim();
  let words = [];

  if (format === 'json' || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    words = parseJSON(trimmed);
  } else if (format === 'plain') {
    words = parsePlainList(trimmed);
  } else {
    words = parseCSV(trimmed);
    if (words.length === 0) words = parsePlainList(trimmed);
  }

  return assignFamilies(words);
}

export function wordsToCSV(words) {
  const header = 'french,english,pos,cefr,root,example,region,tags';
  const rows = words.map((w) =>
    [
      csvEscape(w.french),
      csvEscape(w.english),
      csvEscape(w.pos),
      csvEscape(w.cefr),
      csvEscape(w.root || ''),
      csvEscape(w.example),
      csvEscape(w.region),
      csvEscape((w.tags || []).join('|')),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function dedupeWords(words) {
  const seen = new Map();
  for (const w of words) {
    seen.set(normalizeKey(w.french), w);
  }
  return [...seen.values()];
}
