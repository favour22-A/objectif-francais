const STORAGE_KEY = 'objectif-francais-v1';

const DEFAULT_STATE = {
  words: [],
  settings: {
    passesToMaster: 3,
    dailyGoal: 30,
    goal: 'NCLC 7',
    currentLevel: 'A2',
  },
  lastImport: null,
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState() {
  return JSON.stringify(loadState(), null, 2);
}

export function importState(json) {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.words)) throw new Error('Invalid backup: missing words array');
  saveState({ ...DEFAULT_STATE, ...parsed });
  return loadState();
}

export function uid(prefix = 'w') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getWordById(state, id) {
  return state.words.find((w) => w.id === id);
}

export function upsertWords(state, incoming) {
  const byKey = new Map(state.words.map((w) => [normalizeKey(w.french), w]));

  for (const word of incoming) {
    const key = normalizeKey(word.french);
    const existing = byKey.get(key);
    if (existing) {
      Object.assign(existing, word, { id: existing.id });
    } else {
      const entry = { ...createDefaultWord(word), id: word.id || uid() };
      state.words.push(entry);
      byKey.set(key, entry);
    }
  }

  return state;
}

export function normalizeKey(french) {
  return french.trim().toLowerCase();
}

export function createDefaultWord(partial) {
  const now = Date.now();
  return {
    french: '',
    english: '',
    pos: '',
    cefr: '',
    root: null,
    familyId: null,
    example: '',
    region: '',
    tags: [],
    confidence: 'unknown',
    confidenceScore: 0,
    interval: 0,
    ease: 2.5,
    due: now,
    reviews: 0,
    passes: 0,
    lastReview: null,
    ...partial,
  };
}

export function getStats(state) {
  const total = state.words.length;
  const known = state.words.filter((w) => w.confidence === 'known').length;
  const probable = state.words.filter((w) => w.confidence === 'probable').length;
  const learning = state.words.filter((w) => w.confidence === 'learning').length;
  const unknown = state.words.filter((w) => w.confidence === 'unknown').length;
  const dueNow = state.words.filter((w) => w.due <= Date.now() && w.confidence !== 'known').length;

  return { total, known, probable, learning, unknown, dueNow };
}

export function filterWords(state, { cefr = '', search = '', confidence = '' } = {}) {
  return state.words.filter((w) => {
    if (cefr && w.cefr !== cefr) return false;
    if (confidence && w.confidence !== confidence) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        w.french.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q) ||
        (w.root && w.root.toLowerCase().includes(q))
      );
    }
    return true;
  });
}
