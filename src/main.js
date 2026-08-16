import {
  loadState,
  saveState,
  exportState,
  importState,
  upsertWords,
  getStats,
  filterWords,
  getWordById,
} from './store.js';
import { buildStudyQueue, reviewWord, formatDue } from './srs.js';
import {
  applyFamilyBoost,
  findDerivatives,
  getMorphHint,
  confidenceLabel,
  assignFamilies,
} from './roots.js';
import { importText, wordsToCSV, dedupeWords } from './import.js';

let state = loadState();
let view = 'dashboard';
let studyQueue = [];
let studyIndex = 0;
let cardRevealed = false;

const main = document.getElementById('main');
const nav = document.getElementById('nav');

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'study', label: 'Study' },
  { id: 'words', label: 'Words' },
  { id: 'import', label: 'Import' },
];

init();

function init() {
  if (state.words.length === 0) {
    seedStarterWords();
  }
  assignFamilies(state);
  renderNav();
  render();
}

function seedStarterWords() {
  const starter = importText(`french,english,pos,cefr,root
lent,slow,adjective,A2,lent
lentement,slowly,adverb,A2,lent
lenteur,slowness,noun,B1,lent
ralentir,to slow down,verb,B1,lent
vite,fast,adjective,A2,vite
vitement,quickly,adverb,A2,vite
absolu,absolute,adjective,B1,absolu
absolument,absolutely,adverb,B1,absolu
franchement,frankly; honestly,adverb,B1,
choqué,shocked,adjective,B1,
genre,like; kind of (spoken),particle,B1,
du coup,so; therefore (spoken),phrase,B1,
en fait,actually,phrase,A2,
quand même,still; anyway,phrase,A2,
pastèque,watermelon,noun,A1,
melon d'eau,watermelon (Quebec),noun,A1,`, 'csv');
  state.words = starter;
  saveState(state);
}

function renderNav() {
  nav.innerHTML = VIEWS.map(
    (v) =>
      `<button class="${view === v.id ? 'active' : ''}" data-view="${v.id}">${v.label}</button>`,
  ).join('');

  nav.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      view = btn.dataset.view;
      if (view === 'study') startStudy();
      renderNav();
      render();
    });
  });
}

function render() {
  switch (view) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'study':
      renderStudy();
      break;
    case 'words':
      renderWords();
      break;
    case 'import':
      renderImport();
      break;
    default:
      renderDashboard();
  }
}

function renderDashboard() {
  const stats = getStats(state);
  const progress = stats.total ? Math.round((stats.known / stats.total) * 100) : 0;

  main.innerHTML = `
    <div class="panel">
      <h2>Your goal</h2>
      <p class="hint">Target: <strong>${state.settings.goal}</strong> · Current: <strong>${state.settings.currentLevel}</strong></p>
      <div class="stats-grid">
        <div class="stat"><div class="stat-value">${stats.total}</div><div class="stat-label">Total words</div></div>
        <div class="stat"><div class="stat-value">${stats.known}</div><div class="stat-label">Known</div></div>
        <div class="stat"><div class="stat-value">${stats.probable}</div><div class="stat-label">Probably known</div></div>
        <div class="stat"><div class="stat-value">${stats.dueNow}</div><div class="stat-label">Due now</div></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <p class="hint">${progress}% mastered · Daily goal: ${state.settings.dailyGoal} reviews</p>
      <div class="actions">
        <button class="btn btn-primary" id="start-study">Study now (${stats.dueNow} due)</button>
        <button class="btn btn-ghost" id="go-import">Import your 2k list</button>
      </div>
    </div>

    <div class="panel">
      <h2>How this differs from WordBit</h2>
      <ul class="hint" style="padding-left:1.2rem;line-height:1.8">
        <li><strong>Root families</strong> — learn <em>lent</em>, get credit toward <em>lentement</em>, <em>lenteur</em>, <em>ralentir</em></li>
        <li><strong>Confidence model</strong> — unknown → learning → probably known (70–82%) → known</li>
        <li><strong>Pass-through reviews</strong> — no over-quizzing; probable words appear less often</li>
        <li><strong>Exam-ready import</strong> — CSV/JSON with CEFR, roots, regions</li>
      </ul>
    </div>
  `;

  document.getElementById('start-study').addEventListener('click', () => {
    view = 'study';
    startStudy();
    renderNav();
    render();
  });

  document.getElementById('go-import').addEventListener('click', () => {
    view = 'import';
    renderNav();
    render();
  });
}

function startStudy() {
  studyQueue = buildStudyQueue(state.words);
  studyIndex = 0;
  cardRevealed = false;
}

function currentStudyWord() {
  return studyQueue[studyIndex];
}

function renderStudy() {
  if (studyQueue.length === 0) {
    studyQueue = buildStudyQueue(state.words);
    studyIndex = 0;
  }

  const word = currentStudyWord();

  if (!word) {
    main.innerHTML = `
      <div class="panel empty">
        <h2>Nothing due right now</h2>
        <p class="hint">Import more words or check back later.</p>
        <button class="btn btn-primary" id="back-dash">Back to dashboard</button>
      </div>
    `;
    document.getElementById('back-dash').addEventListener('click', () => {
      view = 'dashboard';
      renderNav();
      render();
    });
    return;
  }

  const derivatives = findDerivatives(state.words, word);
  const morphHint = getMorphHint(word);
  const progress = Math.round(((studyIndex + 1) / studyQueue.length) * 100);

  main.innerHTML = `
    <div class="panel">
      <div class="hint">Card ${studyIndex + 1} of ${studyQueue.length} · ${formatDue(word.due)}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>

      <div class="card ${cardRevealed ? 'revealed' : ''}" id="flashcard">
        <div class="word-fr">${escapeHtml(word.french)}</div>
        <div class="word-meta">${[word.pos, word.cefr].filter(Boolean).join(' · ')}</div>
        ${cardRevealed ? `
          <div class="word-en">${escapeHtml(word.english)}</div>
          ${word.example ? `<div class="word-extra">${escapeHtml(word.example)}</div>` : ''}
          ${morphHint ? `<div class="word-extra">${escapeHtml(morphHint)}</div>` : ''}
          ${derivatives.length ? `<div class="word-extra family-tag">Family: ${derivatives.map((d) => d.french).join(', ')}</div>` : ''}
        ` : `<div class="hint">Tap to reveal</div>`}
        <span class="confidence-badge confidence-${word.confidence}">${confidenceLabel(word)}</span>
      </div>

      <div class="actions" id="grade-actions" style="${cardRevealed ? '' : 'display:none'}">
        <button class="btn btn-danger" data-grade="0">Again</button>
        <button class="btn btn-warning" data-grade="1">Hard</button>
        <button class="btn btn-success" data-grade="2">Good</button>
        <button class="btn btn-primary" data-grade="3">Easy</button>
      </div>
    </div>
  `;

  document.getElementById('flashcard').addEventListener('click', () => {
    if (!cardRevealed) {
      cardRevealed = true;
      renderStudy();
    }
  });

  document.querySelectorAll('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      gradeCurrent(parseInt(btn.dataset.grade, 10));
    });
  });
}

function gradeCurrent(grade) {
  const word = currentStudyWord();
  if (!word) return;

  const updated = reviewWord(word, grade, state.settings.passesToMaster);
  const idx = state.words.findIndex((w) => w.id === word.id);
  state.words[idx] = updated;

  if (updated.confidence === 'known') {
    applyFamilyBoost(state, updated);
  }

  saveState(state);
  cardRevealed = false;
  studyIndex += 1;

  if (studyIndex >= studyQueue.length) {
    view = 'dashboard';
    renderNav();
  }

  render();
}

function renderWords() {
  const cefrLevels = [...new Set(state.words.map((w) => w.cefr).filter(Boolean))].sort();
  const stats = getStats(state);

  main.innerHTML = `
    <div class="panel">
      <h2>Word bank (${stats.total})</h2>
      <div class="filters">
        <input type="search" id="word-search" placeholder="Search French or English…" />
        <select id="cefr-filter">
          <option value="">All CEFR</option>
          ${cefrLevels.map((l) => `<option value="${l}">${l}</option>`).join('')}
        </select>
        <select id="conf-filter">
          <option value="">All confidence</option>
          <option value="unknown">Unknown</option>
          <option value="learning">Learning</option>
          <option value="probable">Probably known</option>
          <option value="known">Known</option>
        </select>
      </div>
      <div class="word-list" id="word-list"></div>
    </div>
  `;

  const searchEl = document.getElementById('word-search');
  const cefrEl = document.getElementById('cefr-filter');
  const confEl = document.getElementById('conf-filter');

  function refreshList() {
    const list = filterWords(state, {
      search: searchEl.value,
      cefr: cefrEl.value,
      confidence: confEl.value,
    }).slice(0, 200);

    document.getElementById('word-list').innerHTML = list.length
      ? list
          .map(
            (w) => `
        <div class="word-row">
          <div>
            <strong>${escapeHtml(w.french)}</strong>
            <span class="hint"> — ${escapeHtml(w.english)}</span>
            ${w.root ? `<div class="family-tag">root: ${escapeHtml(w.root)}</div>` : ''}
          </div>
          <span class="confidence-badge confidence-${w.confidence}">${w.confidence}</span>
          <span class="hint">${w.cefr || '—'}</span>
        </div>`,
          )
          .join('')
      : '<div class="empty">No words match</div>';
  }

  searchEl.addEventListener('input', refreshList);
  cefrEl.addEventListener('change', refreshList);
  confEl.addEventListener('change', refreshList);
  refreshList();
}

function renderImport() {
  main.innerHTML = `
    <div class="panel">
      <h2>Import your word list</h2>
      <p class="hint">Supports CSV, JSON, or plain <code>french, english</code> lines. Merge with existing words (no duplicates).</p>

      <div class="import-area">
        <textarea id="import-text" placeholder="french,english,pos,cefr,root
franchement,frankly,adverb,B1,
choqué,shocked,adjective,B1,"></textarea>
        <input type="file" id="import-file" accept=".csv,.json,.txt,.tsv" />
        <div class="actions">
          <button class="btn btn-primary" id="do-import">Import & merge</button>
          <button class="btn btn-ghost" id="replace-import">Replace all words</button>
          <button class="btn btn-ghost" id="export-backup">Export backup</button>
        </div>
      </div>
      <div id="import-result"></div>
    </div>

    <div class="panel">
      <h2>CSV format for your 2k WordBit list</h2>
      <pre class="hint" style="white-space:pre-wrap;background:var(--surface-2);padding:1rem;border-radius:8px">french,english,pos,cefr,root,example,region,tags
franchement,frankly,adverb,B1,,,France,spoken
pastèque,watermelon,noun,A1,,,France,
melon d'eau,watermelon,noun,A1,,,Quebec,regional</pre>
      <p class="hint">Tip: export from WordBit, or paste two columns. On Linux, copy this folder and open index.html — same localStorage per browser profile.</p>
    </div>

    <div class="panel">
      <h2>Cross-device sync (Linux ↔ Windows)</h2>
      <p class="hint">Use <strong>Export backup</strong> on one machine, copy the JSON file, then paste into import on the other. Git-sync this folder for code; JSON for progress.</p>
      <textarea id="restore-json" placeholder="Paste backup JSON here…" style="width:100%;min-height:80px;margin-top:0.5rem"></textarea>
      <button class="btn btn-ghost" id="restore-backup" style="margin-top:0.5rem">Restore from backup</button>
    </div>
  `;

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('import-text').value = await file.text();
  });

  document.getElementById('do-import').addEventListener('click', () => {
    try {
      const text = document.getElementById('import-text').value;
      const incoming = dedupeWords(importText(text));
      upsertWords(state, incoming);
      assignFamilies(state);
      state.lastImport = new Date().toISOString();
      saveState(state);
      showImportResult(`Merged ${incoming.length} words. Total: ${state.words.length}.`, 'success');
    } catch (err) {
      showImportResult(err.message, 'error');
    }
  });

  document.getElementById('replace-import').addEventListener('click', () => {
    if (!confirm('Replace ALL words? Progress will be reset for removed words.')) return;
    try {
      const text = document.getElementById('import-text').value;
      state.words = dedupeWords(importText(text));
      assignFamilies(state);
      state.lastImport = new Date().toISOString();
      saveState(state);
      showImportResult(`Loaded ${state.words.length} words (replaced).`, 'success');
    } catch (err) {
      showImportResult(err.message, 'error');
    }
  });

  document.getElementById('export-backup').addEventListener('click', () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `objectif-francais-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  });

  document.getElementById('restore-backup').addEventListener('click', () => {
    try {
      const text = document.getElementById('restore-json').value;
      state = importState(text);
      showImportResult(`Restored ${state.words.length} words.`, 'success');
    } catch (err) {
      showImportResult(err.message, 'error');
    }
  });
}

function showImportResult(msg, type) {
  const el = document.getElementById('import-result');
  el.innerHTML = `<div class="alert alert-${type === 'success' ? 'success' : 'info'}">${escapeHtml(msg)}</div>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
