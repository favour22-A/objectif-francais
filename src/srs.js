/** Simple SM-2 inspired scheduler */

export function getDueWords(words, limit = 50) {
  const now = Date.now();
  return words
    .filter((w) => w.confidence !== 'known' && w.due <= now)
    .sort((a, b) => a.due - b.due || a.reviews - b.reviews)
    .slice(0, limit);
}

export function getNewWords(words, limit = 20) {
  return words
    .filter((w) => w.reviews === 0)
    .slice(0, limit);
}

export function buildStudyQueue(words, { dueLimit = 30, newLimit = 10 } = {}) {
  const due = getDueWords(words, dueLimit);
  const dueIds = new Set(due.map((w) => w.id));
  const fresh = getNewWords(
    words.filter((w) => !dueIds.has(w.id)),
    newLimit,
  );
  return [...due, ...fresh];
}

/**
 * Grade: 0 = again, 1 = hard, 2 = good, 3 = easy
 */
export function reviewWord(word, grade, passesToMaster = 3) {
  const updated = { ...word };
  updated.reviews += 1;
  updated.lastReview = Date.now();

  if (grade === 0) {
    updated.interval = 0;
    updated.passes = Math.max(0, updated.passes - 1);
    updated.ease = Math.max(1.3, updated.ease - 0.2);
    updated.due = Date.now() + 10 * 60 * 1000; // 10 min
    updated.confidence = 'learning';
    updated.confidenceScore = Math.max(10, updated.confidenceScore - 15);
  } else {
    updated.passes += 1;

    if (updated.reviews === 1) {
      updated.interval = grade === 3 ? 2 : 1;
    } else if (updated.reviews === 2) {
      updated.interval = grade === 3 ? 4 : 2;
    } else {
      updated.interval = Math.round(updated.interval * updated.ease);
    }

    if (grade === 1) updated.ease = Math.max(1.3, updated.ease - 0.15);
    if (grade === 3) updated.ease = Math.min(3.0, updated.ease + 0.1);

    const dayMs = 24 * 60 * 60 * 1000;
    updated.due = Date.now() + updated.interval * dayMs;

    if (updated.passes >= passesToMaster) {
      updated.confidence = 'known';
      updated.confidenceScore = 100;
    } else {
      updated.confidence = 'learning';
      updated.confidenceScore = Math.min(95, 25 + updated.passes * 25);
    }
  }

  return updated;
}

export function formatDue(due) {
  const diff = due - Date.now();
  if (diff <= 0) return 'Due now';
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (hours < 24) return `Due in ${hours}h`;
  const days = Math.round(hours / 24);
  return `Due in ${days}d`;
}
