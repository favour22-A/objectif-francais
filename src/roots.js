/**
 * Root-family inference for French morphology.
 * When you master a root, derivatives get "probable" confidence.
 */

const SUFFIX_RULES = [
  {
    suffix: 'ment',
    strip: /ment$/,
    pos: 'adverb',
    confidence: 82,
    hint: 'Adverb: typically "in a … manner"',
  },
  {
    suffix: 'tion',
    strip: /tion$/,
    pos: 'noun',
    confidence: 75,
    hint: 'Noun form (-tion)',
  },
  {
    suffix: 'eur',
    strip: /eur$/,
    pos: 'noun',
    confidence: 72,
    hint: 'Agent/device noun (-eur)',
  },
  {
    suffix: 'euse',
    strip: /euse$/,
    pos: 'noun',
    confidence: 72,
    hint: 'Feminine agent noun (-euse)',
  },
  {
    suffix: 'ir',
    strip: /ir$/,
    prefix: 'r',
    pos: 'verb',
    confidence: 68,
    hint: 'Verb (often r + adjective stem)',
  },
  {
    suffix: 'ité',
    strip: /ité$/,
    pos: 'noun',
    confidence: 74,
    hint: 'Abstract noun (-ité)',
  },
];

export function inferRoot(word) {
  const fr = word.french.toLowerCase().trim();
  if (word.root) return word.root.toLowerCase();

  for (const rule of SUFFIX_RULES) {
    if (rule.strip.test(fr)) {
      let stem = fr.replace(rule.strip, '');
      if (rule.prefix) stem = rule.prefix + stem;
      if (stem.length >= 3) return stem;
    }
  }

  return null;
}

export function getFamilyId(word) {
  const root = inferRoot(word) || normalizeKey(word.french);
  return `fam_${root}`;
}

function normalizeKey(french) {
  return french.trim().toLowerCase();
}

export function findDerivatives(allWords, sourceWord) {
  const root = inferRoot(sourceWord) || sourceWord.root;
  if (!root) return [];

  return allWords.filter((w) => {
    if (w.id === sourceWord.id) return false;
    const wRoot = inferRoot(w) || w.root;
    return wRoot && wRoot === root;
  });
}

export function applyFamilyBoost(state, masteredWord) {
  const root = inferRoot(masteredWord) || masteredWord.root;
  if (!root) return state;

  const familyId = getFamilyId(masteredWord);

  for (const word of state.words) {
    if (word.id === masteredWord.id) continue;

    const wRoot = inferRoot(word) || word.root;
    const sameFamily =
      word.familyId === familyId ||
      (wRoot && wRoot === root) ||
      word.french.toLowerCase().startsWith(root);

    if (!sameFamily || word.confidence === 'known') continue;

    const rule = matchSuffixRule(word.french);
    const boost = rule ? rule.confidence : 70;

    if (word.confidence === 'unknown' || word.confidenceScore < boost) {
      word.confidence = 'probable';
      word.confidenceScore = boost;
      word.familyId = familyId;
      word.root = word.root || root;
      // Probable words get a longer initial interval — you likely know them
      if (word.reviews === 0) {
        word.due = Date.now() + 3 * 24 * 60 * 60 * 1000;
      }
    }
  }

  return state;
}

function matchSuffixRule(french) {
  const fr = french.toLowerCase();
  return SUFFIX_RULES.find((r) => r.strip.test(fr));
}

export function getMorphHint(word) {
  const rule = matchSuffixRule(word.french);
  if (rule) return rule.hint;
  if (word.root) return `Root: ${word.root}`;
  return '';
}

export function assignFamilies(state) {
  for (const word of state.words) {
    word.root = word.root || inferRoot(word);
    word.familyId = getFamilyId(word);
  }
  return state;
}

export function confidenceLabel(word) {
  const labels = {
    unknown: 'Unknown',
    learning: 'Learning',
    probable: `Probably known (${word.confidenceScore}%)`,
    known: 'Known',
  };
  return labels[word.confidence] || word.confidence;
}
