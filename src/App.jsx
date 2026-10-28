import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { RELATIONS, getRelations, hasRelations } from "./data/relations.js";
import { conceptFor } from "./data/concepts.js";

/*
  FRENCH LEARNING APP — V3
  - Auth: email/password (Supabase-ready, currently uses persistent storage)
  - Bulk import: quickly mark known words from WordBit transition
  - Progress saves across sessions
  - Full Lexique 3.83 dictionary (46,792 words), chain learning, family quiz
  
  TO CONNECT TO REAL BACKEND:
  1. Create Supabase project at supabase.com
  2. Replace storage calls with supabase client
  3. Enable Google OAuth in Supabase dashboard
*/

// ============ LEXIQUE DATA (loaded from JSON) ============
const G_MAP = { VER: "verb", NOM: "noun", ADJ: "adj", ADV: "adv", ONO: "pron", "PRO:int": "pron", "ADJ:num": "adj", "ADJ:ind": "adj", "ADJ:pos": "adj", "ADJ:dem": "adj", "ADJ:int": "adj", LIA: "lia", "": "other" };
const normG = (g) => G_MAP[g] || (g.startsWith("ADJ") ? "adj" : g.toLowerCase());
const LEX_IPA = {"§":"ɔ̃","@":"ɑ̃","5":"ɛ̃","1":"œ̃","°":"ə","2":"ø","9":"œ","E":"ɛ","O":"ɔ","R":"ʁ","Z":"ʒ","S":"ʃ","N":"ɲ","G":"ŋ","8":"ɥ","A":"ɑ"};
const toIPA = (p) => p ? [...p].map(c => LEX_IPA[c] || c).join("") : "";
const normalizeLexique = (raw) => raw.map(({ id, w, l, p, g, gn, lv, fs, fw, sy, fm }) => ({ id, w, lm: l, p, g: normG(g), gn, lv, fs, fw, sy, fm: fm || [] }));
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LIST_LIMIT = 200;

// Learning goals (detailed exam/program questions come later, after the learner has used the app a while)
const GOALS={
  imm:{name:"French for Canadian immigration",short:"Immigration",desc:"TCF / TEF Canada: work permits, PR, citizenship"},
  per:{name:"Personal",short:"Personal",desc:"Travel, culture, at your own pace"},
  pro:{name:"Work or school",short:"Work / school",desc:"French for your job or your studies"},
};
const COMMUNITY_ID0 = 1000000; // community words get ids above every Lexique id
const goalKey=(g)=>["fm","pr","cit"].includes(g)?"imm":g; // old goal keys → immigration
const G_LABEL={adj:"adjective",adv:"adverb",noun:"noun",verb:"verb",pron:"pronoun",other:"other"};
const REGIONS={FR:"France",CA:"Canada",BE:"Belgique",AF:"Afrique francophone"};
const RF={FR:"🇫🇷",CA:"🇨🇦",BE:"🇧🇪",AF:"🌍"};
const SUFFIXES=[{s:"-ment",from:"adj(fem)",to:"adverb",ex:"lente→lentement",r:"Add -ment to feminine adj"},{s:"-tion/-sion",from:"verb",to:"noun",ex:"informer→information",r:"Action/result"},{s:"-eur/-euse",from:"verb",to:"person",ex:"travailler→travailleur",r:"Doer"},{s:"-able/-ible",from:"verb",to:"adj",ex:"comprendre→compréhensible",r:"Can be done"},{s:"re-/ré-",from:"verb",to:"again",ex:"faire→refaire",r:"Do again"},{s:"dé-/des-",from:"verb",to:"opposite",ex:"faire→défaire",r:"Undo"}];
// ============ ENGLISH TRANSLATIONS ============
const TR = {
"visage":"face","sourire":"smile / to smile","bouche":"mouth","nez":"nose","oreille":"ear","joue":"cheek",
"deux":"two","quatre":"four","cinq":"five","sept":"seven","huit":"eight","neuf":"nine / new","dix":"ten","onze":"eleven",
"être":"to be","faire":"to do / make","dire":"to say / tell","savoir":"to know (fact)",
"vouloir":"to want","alors":"then / so","pouvoir":"can / to be able","aller":"to go",
"voir":"to see","temps":"time / weather","homme":"man","croire":"to believe",
"vie":"life","falloir":"to be necessary","monde":"world","jour":"day",
"penser":"to think","vrai":"true / real","avant":"before","parler":"to speak",
"donner":"to give","prendre":"to take","femme":"woman / wife","an":"year",
"gens":"people","tête":"head","petit":"small / little","aimer":"to love / like",
"dieu":"god","père":"father","maison":"house / home","après":"after",
"trouver":"to find","mettre":"to put / place","main":"hand","mort":"death / dead",
"œil":"eye","comprendre":"to understand","besoin":"need","nuit":"night",
"cœur":"heart","mère":"mother","arriver":"to arrive / happen","coup":"blow / time",
"ami":"friend","pays":"country","demander":"to ask","côté":"side",
"appeler":"to call","laisser":"to leave / let","raison":"reason","attendre":"to wait",
"voiture":"car","eau":"water","place":"place / seat","arrêter":"to stop",
"passer":"to pass / spend","moment":"moment","travail":"work / job","manger":"to eat",
"argent":"money / silver","question":"question","terre":"earth / land",
"entendre":"to hear","bouger":"to move","idée":"idea","chambre":"room / bedroom",
"beau":"beautiful","chercher":"to look for","guerre":"war","route":"road",
"docteur":"doctor","partie":"part / game","table":"table","tellement":"so much",
"compte":"account / count","police":"police","nombre":"number","matin":"morning",
"grand":"big / tall / great","chose":"thing","tout":"all / everything",
"encore":"still / again","peu":"little / few","bien":"well / good","même":"same / even",
"aussi":"also / too","autre":"other","toujours":"always","rien":"nothing",
"bon":"good","nouveau":"new","seul":"alone / only","heure":"hour / time",
"nom":"name","monsieur":"sir / Mr","trois":"three","reste":"rest / remains",
"droit":"right / law","enfant":"child","ville":"city / town","long":"long",
"premier":"first","dernier":"last","haut":"high / tall","porte":"door",
"tard":"late","blanc":"white","noir":"black","rouge":"red",
"ancien":"old / former","lettre":"letter","sang":"blood","frère":"brother",
"fils":"son","corps":"body","roi":"king","lire":"to read","écrire":"to write",
"ouvrir":"to open","sortir":"to go out","dormir":"to sleep","courir":"to run",
"tenir":"to hold","perdre":"to lose","sentir":"to feel / smell",
"vivre":"to live","mourir":"to die","tomber":"to fall","porter":"to carry / wear",
"suivre":"to follow","devenir":"to become","revenir":"to come back",
"rappeler":"to remind / call back","répondre":"to answer","servir":"to serve",
"sembler":"to seem","rester":"to stay","commencer":"to begin","finir":"to finish",
"permettre":"to allow","recevoir":"to receive","essayer":"to try",
"expliquer":"to explain","jouer":"to play","monter":"to go up / climb"
};
const tr = (w) => w.tr || TR[w.lm] || TR[w.w] || null; // w.tr = community translation
// Live translation fetch for words not in TR table (free MyMemory API)
const TR_CACHE_KEY = "objectif-francais:tr-cache";
const loadTrCache = () => { try { return JSON.parse(localStorage.getItem(TR_CACHE_KEY)||"{}"); } catch { return {}; } };
const saveTrCache = (c) => { try { localStorage.setItem(TR_CACHE_KEY, JSON.stringify(c)); } catch {} };
async function fetchTranslation(word) {
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=fr|en`);
    const d = await r.json();
    const t = d?.responseData?.translatedText;
    if(!t || t.length > 40 || t.toLowerCase()===word.toLowerCase()) return null;
    const m = d?.responseData?.match;
    if(typeof m==="number" && m < 0.4) return null;
    return t;
  } catch { return null; }
}
// ============ STORAGE (localStorage — persists across reloads & dev sessions) ============
const STORAGE_PREFIX = "objectif-francais:";
const DB = {
  async get(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async set(key, val) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    } catch (e) {
      console.error("storage set:", e);
    }
  },
  async del(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {}
  },
};

// ============ SUPABASE (accounts + cloud progress) ============
// localStorage stays as the instant/offline cache; Supabase is the canonical copy.
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

// Per-word merge: the entry with the newer timestamp wins
const mergeProgress = (a = {}, b = {}) => {
  const out = { ...a };
  for (const [id, e] of Object.entries(b || {})) {
    if (!out[id] || (e?.t || 0) > (out[id].t || 0)) out[id] = e;
  }
  return out;
};

const toRow = (uid, id, e) => ({
  user_id: uid, word_id: Number(id),
  ps: e.ps || 0, fl: e.fl || 0, fam: e.fam || 0, iv: e.iv || 1, t: e.t || 0,
});

// Supabase returns max 1000 rows per request, so page through
async function fetchCloudProgress(uid) {
  const out = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("progress")
      .select("word_id,ps,fl,fam,iv,t").eq("user_id", uid)
      .order("word_id").range(from, from + PAGE - 1);
    if (error) throw error;
    data.forEach(r => { out[r.word_id] = { ps: r.ps, fl: r.fl, fam: r.fam, iv: r.iv, t: r.t }; });
    if (data.length < PAGE) break;
  }
  return out;
}

// ============ AUDIO (French TTS via Web Speech API) ============
const speakFrench = (text, rate = 0.92) => {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

// ============ REAL RECORDINGS (Lingua Libre, via Wikimedia Commons) ============
// Native-speaker recordings, CC BY-SA. Files are named "LL-Q150 (fra)-<speaker>-<word>.wav".
// Looked up on demand, cached per browser; falls back to the TTS voice when none exists.
const LL_KEY = "objectif-francais:ll-cache";
const llCache = (() => { try { return JSON.parse(localStorage.getItem(LL_KEY) || "{}"); } catch { return {}; } })();
const llSave = () => { try { localStorage.setItem(LL_KEY, JSON.stringify(llCache)); } catch { /* storage full or blocked */ } };
const llPending = {};
// Prebuilt word → speaker map (public/recordings-fr.json, made by scripts/build-recordings.mjs).
// Loaded once; if it's missing, lookups fall back to a live Commons search per word.
let llMap; // undefined = not loaded yet, null = unavailable
const llMapReady = fetch("/recordings-fr.json").then(r => r.ok ? r.json() : null).catch(() => null).then(m => { llMap = m; return m; });
async function findRecording(word) {
  const w = (word || "").trim().toLowerCase();
  if (!w || /\s/.test(w)) return null;          // single words only
  const map = llMap === undefined ? await llMapReady : llMap;
  if (map) {
    const v = map[w];
    if (!v) return null;
    const [speaker, rest] = v.split("|");
    // New format stores the exact original name ("Word.ext"); old format stored only an extension
    const file = rest && rest.includes(".") ? `LL-Q150 (fra)-${speaker}-${rest}` : `LL-Q150 (fra)-${speaker}-${w}.${rest || "wav"}`;
    return { file, speaker };
  }
  if (w in llCache) return llCache[w];
  if (llPending[w]) return llPending[w];
  llPending[w] = (async () => {
    try {
      const q = `intitle:"LL-Q150 (fra)" intitle:"${w.replace(/"/g, "")}"`;
      const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&list=search&srnamespace=6&srlimit=50&srsearch=${encodeURIComponent(q)}`);
      const d = await r.json();
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`^File:LL-Q150 \\(fra\\)-([^-]+?)-(${esc})\\.(wav|ogg|flac|mp3)$`, "i");
      const hits = (d?.query?.search || []).map(x => x.title.match(re)).filter(Boolean);
      const hit = hits.find(m => m[2] === w) || hits[0]; // prefer the plain lowercase recording
      const rec = hit ? { file: hit[0].slice(5), speaker: hit[1] } : null;
      llCache[w] = rec; llSave();                 // remember "no recording" too
      return rec;
    } catch { return null; }                      // network error: don't cache, retry next time
    finally { delete llPending[w]; }
  })();
  return llPending[w];
}
const recUrl = (f) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(f)}`;
const recPage = (f) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f)}`;
let curAudio = null;
let playToken = 0; // only the newest play request may make sound
// Play a word: real recording if one exists, otherwise the browser voice. Never both.
async function speakWord(text, rate = 0.92) {
  if (!text) return;
  const my = ++playToken;
  window.speechSynthesis?.cancel();
  if (curAudio) { curAudio.pause(); curAudio = null; }
  const rec = await findRecording(text);
  if (my !== playToken) return;                   // a newer request took over
  if (rec) {
    const a = new Audio(recUrl(rec.file));
    a.playbackRate = Math.max(0.5, Math.min(2, rate / 0.92)); // 0.92 on the slider = natural speed
    a.onplaying = () => window.speechSynthesis?.cancel();     // real voice wins
    curAudio = a;
    const ok = await a.play().then(() => true, () => false);
    if (my !== playToken) { a.pause(); return; }
    if (ok) return;
    curAudio = null;                              // blocked or failed: use the voice instead
  }
  speakFrench(text, rate);
}

// ============ COMPONENTS ============
const V={"--bg":"#0A0D12","--s1":"#12161E","--s2":"#1A2030","--s3":"#242D3E","--ac":"#4B85E0","--ac2":"#34BF82","--acw":"#E09348","--t1":"#E2E6EE","--t2":"#8892A6","--t3":"#4A5366","--dng":"#E05454","--card":"#14181F"};
const sh={...V,background:"var(--bg)",color:"var(--t1)",minHeight:"100vh",fontFamily:"'Inter','SF Pro Text',system-ui,sans-serif"};
const Tag=({children,c})=><span style={{padding:"2px 7px",borderRadius:10,background:c||"var(--s2)",fontSize:10,color:"var(--t2)"}}>{children}</span>;
const Btn=({children,onClick,pri,dis,s:st})=><button onClick={onClick} disabled={dis} style={{padding:"11px 18px",borderRadius:9,border:"none",fontSize:13,fontWeight:600,cursor:dis?"default":"pointer",background:pri?"var(--ac)":"var(--s1)",color:pri?"#fff":"var(--t1)",opacity:dis?.4:1,transition:"all .15s",...st}}>{children}</button>;
const Input=({...props})=><input {...props} style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1.5px solid var(--s2)",background:"var(--s1)",color:"var(--t1)",fontSize:14,outline:"none",boxSizing:"border-box",...props.style}} />;
const AudioBtn=({text,rate,label="🔊",s:st})=>(
  <button type="button" onClick={()=>speakWord(text,rate)} title="Play pronunciation" aria-label="Play pronunciation"
    style={{background:"var(--s2)",border:"1px solid var(--s3)",borderRadius:8,padding:"6px 10px",fontSize:14,cursor:"pointer",color:"var(--t1)",lineHeight:1,...st}}>
    {label}
  </button>
);

// ============ TEXT ANALYSIS (paste a text → words, sentences, what you don't know yet) ============
// NOTE: lexique383_full.json has ~1 form per word and no function words, so we add:
// a grammar-word list, common irregular verb forms, and a light rule-based lemmatizer.
const WORD_RE = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*['’]?/gu;
const ELISION = /^(jusqu|lorsqu|puisqu|quoiqu|qu|l|d|j|m|n|s|t|c)'/;

const GRAMMAR = new Set(("le la les l un une des du de d au aux ce c cet cette ces son sa ses mon ma mes ton ta tes notre nos votre vos leur leurs " +
  "je j tu il elle on nous vous ils elles me m te t se s lui y en moi toi soi eux que qu qui quoi dont où et ou mais donc or ni car ne n pas " +
  "à dans par pour sur avec sans sous chez vers entre comme si ceci cela ça celui celle ceux celles lequel laquelle lesquels lesquelles " +
  "duquel auquel jusque jusqu lorsque lorsqu puisque puisqu quoique quoiqu").split(" "));

const IRREG = {};
[["être","suis es est sommes êtes sont étais était étions étiez étaient été serai seras sera serons serez seront serais serait serions seriez seraient sois soit soyons soyez soient fus fut furent étant"],
 ["avoir","ai as a avons avez ont avais avait avions aviez avaient eu eue eus eut eurent aurai auras aura aurons aurez auront aurais aurait aurions auriez auraient aie aies ait ayons ayez aient ayant"],
 ["aller","vais vas va allons allez vont irai iras ira irons irez iront irais irait iraient aille ailles aillent allé allée allés"],
 ["faire","fais fait faisons faites font ferai feras fera ferons ferez feront ferais ferait feraient fasse fasses fassent faisais faisait faisaient fit firent faisant"],
 ["pouvoir","peux peut pouvons pouvez peuvent pourrai pourras pourra pourrons pourrez pourront pourrais pourrait pourraient pu puisse puissent pouvais pouvait pouvaient"],
 ["vouloir","veux veut voulons voulez veulent voudrai voudra voudrais voudrait voudraient voulu voulais voulait voulaient veuille"],
 ["savoir","sais sait savons savez savent saurai saura saurais saurait su sache sachent savais savait savaient"],
 ["venir","viens vient venons venez viennent viendrai viendra viendrais viendrait venu venue venus venais venait venaient vint"],
 ["dire","dis dit disons dites disent dirai dira dirais dirait disais disait disaient dite"],
 ["voir","vois voit voyons voyez voient verrai verra verrais verrait vu vue vus voyais voyait voyaient"],
 ["prendre","prends prend prenons prenez prennent prendrai prendra prendrait pris prise prenais prenait prenaient"],
 ["devoir","dois doit devons devez doivent devrai devra devrais devrait devraient dû due devais devait devaient"],
 ["mettre","mets met mettons mettez mettent mis mise mettais mettait"],
 ["falloir","faut faudra faudrait fallait fallu"],
 ["beau","belle belles beaux bel"],["nouveau","nouvelle nouvelles nouveaux nouvel"],["vieux","vieille vieilles vieil"],["fou","folle folles fous"],["mou","molle molles"],
].forEach(([inf, forms]) => forms.split(" ").forEach(f => { IRREG[f] = inf; }));

// [suffix, replacement, expected grammar] — tried longest-first, first hit in the dictionary wins
const LEMMA_RULES = [
  ["aux","al","noun"],["euses","eux",null],["euse","eux",null],["ives","if",null],["ive","if",null],["ères","er",null],["ère","er",null],
  ["nnes","n",null],["nne","n",null],["lles","l",null],["lle","l",null],["ttes","t",null],["tte","t",null],
  ["es","",null],["s","",null],["x","",null],["e","",null],
  ["eraient","er","verb"],["erions","er","verb"],["eriez","er","verb"],["erais","er","verb"],["erait","er","verb"],["erons","er","verb"],["erez","er","verb"],["eront","er","verb"],["erai","er","verb"],["eras","er","verb"],["era","er","verb"],
  ["issaient","ir","verb"],["issions","ir","verb"],["issiez","ir","verb"],["issais","ir","verb"],["issait","ir","verb"],["issons","ir","verb"],["issez","ir","verb"],["issent","ir","verb"],["issant","ir","verb"],
  ["eaient","er","verb"],["eais","er","verb"],["eait","er","verb"],["eons","er","verb"],["eant","er","verb"],
  ["çaient","cer","verb"],["çais","cer","verb"],["çait","cer","verb"],["çons","cer","verb"],["çant","cer","verb"],
  ["aient","er","verb"],["èrent","er","verb"],["ions","er","verb"],["iez","er","verb"],["ais","er","verb"],["ait","er","verb"],["ant","er","verb"],
  ["ons","er","verb"],["ez","er","verb"],["ent","er","verb"],["ées","er","verb"],["és","er","verb"],["ée","er","verb"],["é","er","verb"],["es","er","verb"],["e","er","verb"],["a","er","verb"],["ai","er","verb"],["as","er","verb"],
  ["ies","ir","verb"],["ie","ir","verb"],["is","ir","verb"],["it","ir","verb"],["i","ir","verb"],
  ["ons","re","verb"],["ez","re","verb"],["ent","re","verb"],["ais","re","verb"],["ait","re","verb"],["ues","re","verb"],["ue","re","verb"],["us","re","verb"],["u","re","verb"],["s","re","verb"],["t","re","verb"],["","re","verb"],
].sort((a,b) => b[0].length - a[0].length);

function lemmatize(key, idx) {
  for (const [suf, rep, g] of LEMMA_RULES) {
    if (!key.endsWith(suf) || key.length - suf.length < 2) continue;
    const c = key.slice(0, key.length - suf.length) + rep;
    if (c === key) continue;
    const w = idx.get(c);
    if (w && (!g || w.g === g)) return w;
  }
  return null;
}

// Common English words, used to spot English text (ambiguous ones like "a", "on", "me" left out)
const EN_WORDS = new Set(("the of and to in is it that was for with he she they we you i this be are have has had not at by from his her their our your " +
  "what which who when where why how there here would could should will can do does did been being were an but if so no yes my him them " +
  "all any some more most other than then very just also only about into over after before because while through out up down off again new " +
  "one two get got make made know think see look want going come take give use find tell ask work seem feel try leave call good well way even " +
  "back still something nothing everything people time year day thing man woman life world hand part place case week point same").split(" "));

const splitSentences = (text) =>
  (text.replace(/\s+/g, " ").trim().match(/[^.!?…]+(?:[.!?…]+["»”’)\]]*|$)/g) || [])
    .map(s => s.trim()).filter(s => /[\p{L}]/u.test(s));

// One raw token → pieces (handles l'homme, qu'il, est-ce, dit-il, hommes, mangeons)
function expandToken(raw, idx, noGuess) {
  const key = raw.toLowerCase().replace(/’/g, "'").replace(/'$/, "");
  if (!key) return [];
  if (GRAMMAR.has(key)) return [{ raw, key, w: null, grammar: true }];
  if (IRREG[key]) { const w = idx.get(IRREG[key]); if (w) return [{ raw, key, w }]; }
  const w = idx.get(key);
  if (w) return [{ raw, key, w }];
  const el = key.match(ELISION);
  if (el && key.length > el[0].length) {
    return [{ raw: el[1] + "'", key: el[1] + "'", w: null, grammar: true }, ...expandToken(key.slice(el[0].length), idx)];
  }
  if (key.includes("-")) return key.split("-").filter(k => k.length > 1).flatMap(k => expandToken(k, idx, noGuess));
  // Capitalized words mid-sentence are likely names: don't guess a lemma for them
  const lw = noGuess ? null : lemmatize(key, idx);
  if (lw) return [{ raw, key, w: lw, guess: true }];
  return [{ raw, key, w: null }];
}

const classifyToken = (t, lang, isFirst) =>
  t.grammar ? "grammar"
  : lang === "en" ? "en"
  : t.w ? "fr"
  : EN_WORDS.has(t.key) ? "en"
  : (!isFirst && /^\p{Lu}/u.test(t.raw)) ? "name" : "unmatched";

function analyzeText(text, idx) {
  const sentences = splitSentences(text).map(s => {
    const toks = (s.match(WORD_RE) || []).flatMap((raw, i) => expandToken(raw, idx, i > 0 && /^\p{Lu}/u.test(raw)).map(t => ({ ...t, first: i === 0 })));
    const en = toks.filter(t => EN_WORDS.has(t.key)).length;
    const fr = toks.filter(t => (t.w || t.grammar) && !EN_WORDS.has(t.key)).length;
    const lang = en > fr ? "en" : "fr";
    toks.forEach(t => { t.cls = classifyToken(t, lang, t.first); });
    return { text: s, toks, lang };
  });
  // Unique words: French grouped by dictionary entry, the rest by surface form
  const fr = new Map(), other = { en: new Map(), name: new Map(), unmatched: new Map() };
  let total = 0;
  for (const s of sentences) for (const t of s.toks) {
    total++;
    if (t.cls === "grammar") continue;
    if (t.cls === "fr") {
      const e = fr.get(t.w.id) || { w: t.w, forms: new Set(), count: 0 };
      e.forms.add(t.key); e.count++; fr.set(t.w.id, e);
    } else {
      const m = other[t.cls]; m.set(t.key, (m.get(t.key) || 0) + 1);
    }
  }
  return { sentences, fr: [...fr.values()], other, total };
}

export default function App(){
  // Dictionary state
  const [baseL, setBaseL] = useState([]);
  const [community, setCommunity] = useState([]); // rows from Supabase dict_entries
  const [isEditor, setIsEditor] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [pwForm, setPwForm] = useState({});
  // Dictionary = Lexique + community corrections + community-added words
  const L = useMemo(() => {
    if (!community.length) return baseL;
    const over = new Map(), add = [];
    community.forEach(r => r.base_id != null ? over.set(r.base_id, r) : add.push(r));
    const pick = (r) => Object.fromEntries(["lm","g","gn","lv","p","tr","note"].filter(k => r[k] != null && r[k] !== "").map(k => [k, r[k]]));
    const out = baseL.map(w => { const r = over.get(w.id); return r ? { ...w, ...pick(r), cid: r.id } : w; });
    add.forEach(r => out.push({ id: COMMUNITY_ID0 + r.id, w: r.w, lm: r.lm || r.w, p: r.p || "", g: r.g || "other", gn: r.gn || null,
      lv: r.lv || "", fs: 0, fw: 0, sy: 0, fm: [], tr: r.tr || null, note: r.note || null, cid: r.id, community: true }));
    return out;
  }, [baseL, community]);
  const [dictLoading, setDictLoading] = useState(true);
  const [dictError, setDictError] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [authScr, setAuthScr] = useState("login"); // login | signup | link
  const [authForm, setAuthForm] = useState({email:"",password:"",error:null,info:null,loading:false});
  const [authChecked, setAuthChecked] = useState(false);
  const [sync, setSync] = useState("idle"); // idle | saving | saved | offline

  // Sync bookkeeping (refs so timers/listeners always see current values)
  const userRef = useRef(null);
  const lrnRef = useRef({});
  const syncedRef = useRef({});   // word_id -> t last confirmed in the cloud
  const pushingRef = useRef(false);
  const pendingRef = useRef(false);
  const loadedUidRef = useRef(null);

  // App state
  const [scr, setScr] = useState("onb");
  const [prof, setProf] = useState({goal:null,region:"CA"});
  const [lrn, setLrn] = useState({});
  const [cur, setCur] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [fLv, setFLv] = useState(null);
  const [fGr, setFGr] = useState(null);
  const [srch, setSrch] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [rapidIdx, setRapidIdx] = useState(0);
  const [rapidLevel, setRapidLevel] = useState(null);
  const [rapidStats, setRapidStats] = useState({known:0,familiar:0,learning:0,total:0});
  const [shuffledPool, setShuffledPool] = useState([]);
  const [liveTr, setLiveTr] = useState({});
  const [rec, setRec] = useState(null); // Lingua Libre recording for the open word
  const [bulkSrch, setBulkSrch] = useState("");
  const [txtDraft, setTxtDraft] = useState("");
  const [txt, setTxt] = useState("");
  const [wordBack, setWordBack] = useState("home");
  const [audioOn, setAudioOn] = useState(() => localStorage.getItem(STORAGE_PREFIX + "audio-on") !== "0");
  const [audioRate, setAudioRate] = useState(() => {
    const r = parseFloat(localStorage.getItem(STORAGE_PREFIX + "audio-rate"));
    return Number.isFinite(r) ? r : 0.92;
  });

  const wordIndex = useMemo(() => {
    const idx = new Map();
    for (const w of L) {
      idx.set(w.w.toLowerCase(), w);
      if (w.lm) idx.set(w.lm.toLowerCase(), w);
    }
    return idx;
  }, [L]);

  // Lookup for text analysis: exact form first, then lemma; most frequent entry wins ties
  const formIndex = useMemo(() => {
    const ex = new Map(), lm = new Map();
    for (const w of L) {
      const a = w.w.toLowerCase(), b = (w.lm || "").toLowerCase();
      if (!ex.has(a) || (w.fs || 0) > (ex.get(a).fs || 0)) ex.set(a, w);
      if (b && (!lm.has(b) || (w.fs || 0) > (lm.get(b).fs || 0))) lm.set(b, w);
    }
    return { get: k => ex.get(k) || lm.get(k) };
  }, [L]);
  const txtAnalysis = useMemo(() => txt.trim() ? analyzeText(txt, formIndex) : null, [txt, formIndex]);

  const findWord = useCallback((form) => wordIndex.get(form.toLowerCase()), [wordIndex]);

  // Quality-filtered pool for quizzes: common words only, no garbage
  const quizPool = useMemo(() => L.filter(w =>
    ["A1","A2","B1","B2"].includes(w.lv) &&
    w.fs >= 20 &&
    w.w.length >= 2 &&
    !w.w.includes(" ") &&
    (tr(w) || hasRelations(w.lm))
  ), [L]);

  // Load dictionary on mount
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        const mod = await import("../data/lexique383_full.json");
        if (!cancelled) setBaseL(normalizeLexique(mod.default));
      } catch (e) {
        if (!cancelled) setDictError(e.message || "Failed to load dictionary");
      } finally {
        if (!cancelled) setDictLoading(false);
      }
    })();
    return () => { cancelled = true; };
  },[]);

  useEffect(()=>{ userRef.current = user; },[user]);
  useEffect(()=>{ lrnRef.current = lrn; },[lrn]);

  // Load everything for a signed-in Supabase user: local cache + cloud + old pre-Supabase data
  const loadUser = useCallback(async (sbUser) => {
    const uid = sbUser.id;
    const email = sbUser.email || null;
    const local = (await DB.get(`progress-${uid}`)) || {};
    // Carry over progress from the old localStorage-only accounts (keyed by email)
    const legacy = email ? (await DB.get(`progress-${email}`)) || {} : {};
    let cloud = {};
    try { cloud = await fetchCloudProgress(uid); }
    catch (e) { console.error("load progress:", e); setSync("offline"); }
    syncedRef.current = Object.fromEntries(Object.entries(cloud).map(([id, e]) => [id, e.t || 0]));
    // Anything local that's newer than the cloud gets pushed by the sync effect
    setLrn(mergeProgress(mergeProgress(cloud, local), legacy));

    let p = (await DB.get(`profile-${uid}`)) || (email ? await DB.get(`profile-${email}`) : null);
    const { data: cp } = await supabase.from("profiles").select("goal,region").eq("id", uid).maybeSingle();
    if (cp?.goal) p = { goal: cp.goal, region: cp.region || "CA" };
    // Only brand-new users see the welcome screen; anyone with saved progress goes straight home
    const returning = Object.keys(cloud).length || Object.keys(local).length || Object.keys(legacy).length;
    if (p?.goal) { setProf(p); setScr("home"); }
    else if (returning) { if (p) setProf(p); setScr("home"); }
    else setScr("onb");

    loadedUidRef.current = uid;
    setUser({ id: uid, email, anon: !!sbUser.is_anonymous });
  }, []);

  // Restore session on load + react to sign-in / sign-out / account upgrade
  useEffect(()=>{
    const lastEmail = localStorage.getItem(STORAGE_PREFIX + "last-email");
    if (lastEmail) setAuthForm(f => ({ ...f, email: lastEmail }));
    if (!supabase) { setAuthChecked(true); return; }
    let cancelled = false;
    const apply = async (session) => {
      if (cancelled) return;
      const sbUser = session?.user;
      if (!sbUser) {
        loadedUidRef.current = null;
        setUser(null);
      } else if (loadedUidRef.current === sbUser.id) {
        // Same user (token refresh, or guest just linked an account): update details only
        setUser(u => ({ ...u, email: sbUser.email || null, anon: !!sbUser.is_anonymous }));
      } else {
        await loadUser(sbUser);
      }
      setAuthChecked(true);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    // Don't await Supabase calls inside this callback (can deadlock) — defer instead
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => { setTimeout(() => apply(session), 0); });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  },[loadUser]);

  // Push only words whose timestamp changed since the last confirmed sync
  const pushProgress = useCallback(async () => {
    const u = userRef.current;
    if (!u || !supabase) return;
    if (pushingRef.current) { pendingRef.current = true; return; }
    const synced = syncedRef.current;
    const rows = Object.entries(lrnRef.current)
      .filter(([id, e]) => Number.isInteger(Number(id)) && synced[id] !== (e.t || 0))
      .map(([id, e]) => toRow(u.id, id, e));
    if (!rows.length) return;
    pushingRef.current = true;
    setSync("saving");
    try {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("progress").upsert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      rows.forEach(r => { synced[r.word_id] = r.t; });
      setSync("saved");
    } catch (e) {
      console.error("sync:", e);
      setSync("offline");
    } finally {
      pushingRef.current = false;
      if (pendingRef.current) { pendingRef.current = false; pushProgress(); }
    }
  }, []);

  // Save progress: local cache immediately, cloud 3s after the last change
  useEffect(()=>{
    if(!user || Object.keys(lrn).length === 0) return;
    DB.set(`progress-${user.id}`, lrn);
    const t = setTimeout(pushProgress, 3000);
    return () => clearTimeout(t);
  },[lrn, user, pushProgress]);

  // Flush pending changes when the tab is hidden/closed
  useEffect(()=>{
    const onHide = () => { if (document.visibilityState === "hidden") pushProgress(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  },[pushProgress]);

  // Save profile (local + cloud)
  useEffect(()=>{
    if(!user || !prof.goal) return;
    DB.set(`profile-${user.id}`, prof);
    supabase?.from("profiles")
      .upsert({ id: user.id, goal: prof.goal, region: prof.region, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("profile:", error); });
  },[prof, user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "audio-on", audioOn ? "1" : "0");
  }, [audioOn]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + "audio-rate", String(audioRate));
  }, [audioRate]);

  // Auto-play audio during rapid review
  useEffect(() => {
    if (scr !== "rapid" || !audioOn) return;
    const pool2 = shuffledPool.length > 0 ? shuffledPool : L;
    const w = pool2[rapidIdx];
    if (w) speakWord(w.w, audioRate);
    for (let k = 1; k <= 3; k++) if (pool2[rapidIdx + k]) findRecording(pool2[rapidIdx + k].w); // warm up next words
  }, [scr, rapidIdx, rapidLevel, audioOn, audioRate, L]);
  // Look up a real recording for the open word (for the attribution line)
  useEffect(() => {
    if (scr !== "word" || !cur) return;
    let live = true;
    setRec(null);
    findRecording(cur.w).then(r => { if (live) setRec(r); });
    return () => { live = false; };
  }, [scr, cur]);
  // Fetch translation when viewing a word that has none locally
  useEffect(() => {
    if (scr !== "word" || !cur) return;
    if (tr(cur)) return;
    const cache = loadTrCache();
    if (cache[cur.lm]) { setLiveTr(p=>({...p,[cur.lm]:cache[cur.lm]})); return; }
    if (liveTr[cur.lm]) return;
    fetchTranslation(cur.lm || cur.w).then(t => {
      if (t) {
        setLiveTr(p=>({...p,[cur.lm]:t}));
        const c = loadTrCache(); c[cur.lm]=t; saveTrCache(c);
      }
    });
  }, [scr, cur]);

  // ============ AUTH ============
  // mode: login | signup | magic (email link, no password) | link (guest → real account by email)
  const handleAuth = async (mode) => {
    if(!supabase) return;
    const fail = (msg) => setAuthForm(f=>({...f,error:msg,loading:false}));
    const done = (info) => setAuthForm(f=>({...f,password:"",error:null,info,loading:false}));
    setAuthForm(f=>({...f,loading:true,error:null,info:null}));
    const {email, password} = authForm;
    if(!email) return fail("Email required");
    localStorage.setItem(STORAGE_PREFIX + "last-email", email);
    const redirect = { emailRedirectTo: window.location.origin };

    if(mode === "magic"){
      const { error } = await supabase.auth.signInWithOtp({ email, options: redirect });
      return error ? fail(error.message) : done("Check your email for a sign-in link.");
    }
    if(mode === "link"){
      // Same account id is kept, so all guest progress stays
      const { error } = await supabase.auth.updateUser({ email }, redirect);
      return error ? fail(error.message) : done("Check your email to confirm. Your progress is kept.");
    }
    if(!password) return fail("Password required (or use “Email me a link”)");
    if(password.length < 6) return fail("Password must be 6+ characters");
    if(mode === "signup"){
      const { data, error } = await supabase.auth.signUp({ email, password, options: redirect });
      if(error) return fail(error.message);
      if(!data.session) return done("Check your email to confirm your account, then log in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if(error) return fail(error.message);
    }
    done(null); // onAuthStateChange loads the user
  };

  const signInGoogle = async () => {
    if(!supabase) return;
    // Guests link Google to their existing account (needs "manual linking" enabled in Supabase)
    const opts = { provider: "google", options: { redirectTo: window.location.origin } };
    const { error } = user?.anon
      ? await supabase.auth.linkIdentity(opts)
      : await supabase.auth.signInWithOAuth(opts);
    if(error) setAuthForm(f=>({...f,error:error.message}));
  };

  const tryAsGuest = async () => {
    if(!supabase) return;
    setAuthForm(f=>({...f,loading:true,error:null,info:null}));
    const { error } = await supabase.auth.signInAnonymously();
    setAuthForm(f=>({...f,loading:false,error:error?.message||null}));
  };

  const logout = async () => {
    if(user?.anon && !window.confirm("You're using a guest account. Logging out loses this progress unless you save it to an account first. Log out anyway?")) return;
    await pushProgress();
    await supabase?.auth.signOut();
    loadedUidRef.current = null;
    syncedRef.current = {};
    setUser(null);
    setLrn({});
    setProf({goal:null,region:"CA"});
    setScr("onb");
    setAuthScr("login");
    setSync("idle");
  };

  // ============ LEARNING ENGINE ============
  // outcome: "know" | "familiar" | "unknown"
  const mark = useCallback((id, outcome)=>{
    setLrn(p=>{
      const e=p[id]||{ps:0,fl:0,fam:0,iv:1};
      if(outcome==="know"){
        return{...p,[id]:{...e,ps:e.ps+1,fam:0,fl:e.fl,iv:Math.min(e.iv*2,30),t:Date.now()}};
      }
      if(outcome==="familiar"){
        return{...p,[id]:{...e,ps:Math.max(e.ps,1),fam:1,fl:e.fl,iv:Math.min(Math.max(e.iv,2),30),t:Date.now()}};
      }
      return{...p,[id]:{...e,ps:0,fam:0,fl:e.fl+1,iv:1,t:Date.now()}};
    });
  },[]);

  const st = useCallback(id=>{
    const e=lrn[id];
    if(!e)return"new";
    if(e.ps>=3)return"known";
    if(e.fam)return"familiar";
    if(e.ps>=1||e.fl>=1)return"learning";
    return"new";
  },[lrn]);

  const chain = useCallback(w=>{
    const known=(w.fm||[]).some(f=>{const m=findWord(f);return m&&st(m.id)==="known";});
    if(known)return 70;
    const partial=(w.fm||[]).some(f=>{const m=findWord(f);const s=m&&st(m.id);return s==="learning"||s==="familiar";});
    return partial?30:0;
  },[st, findWord]);

  const vocab = useMemo(()=>L.filter(w=>{
    if(fLv&&w.lv!==fLv)return false;if(fGr&&w.g!==fGr)return false;
    if(srch&&!w.w.includes(srch.toLowerCase())&&!w.lm.includes(srch.toLowerCase()))return false;
    return true;
  }),[L, fLv, fGr, srch]);

  const displayVocab = useMemo(() => vocab.slice(0, LIST_LIMIT), [vocab]);

  const bulkVocab = useMemo(() => {
    let list = L;
    if (bulkSrch) {
      const q = bulkSrch.toLowerCase();
      list = list.filter(w => w.w.includes(q) || w.lm.includes(q));
    }
    return list.slice(0, 300);
  }, [L, bulkSrch]);

  const stats = useMemo(()=>{
    const k=L.filter(w=>st(w.id)==="known").length;
    const f=L.filter(w=>st(w.id)==="familiar").length;
    const l=L.filter(w=>st(w.id)==="learning").length;
    return{k,f,l,n:L.length-k-f-l,t:L.length};
  },[L, st]);

  const statusColor = (s)=> s==="known"?"var(--ac2)":s==="familiar"?"var(--acw)":s==="learning"?"var(--ac)":"var(--s2)";
  const statusLabel = (s)=> s==="known"?"✓ Known":s==="familiar"?"≈ Familiar":s==="learning"?"◐ Learning":"○ New";

  const startQuiz=(mode="word")=>{
    const pool = quizPool.filter(w=>st(w.id)!=="known");
    if(pool.length<4) return;

    if(mode==="family"){
      const famPool = pool.filter(w=>w.fm.length>=2);
      if(famPool.length<1) return;
      const tgt=famPool[Math.floor(Math.random()*famPool.length)];
      const ans=tgt.fm[Math.floor(Math.random()*Math.min(tgt.fm.length,3))];
      const fakes=quizPool.filter(w=>w.id!==tgt.id&&w.lm!==tgt.lm)
        .sort(()=>Math.random()-.5).slice(0,2).map(w=>w.fm[0]||w.w);
      setQuiz({tgt,opts:[...fakes,ans].sort(()=>Math.random()-.5),ans,mode:"family",a:null,ok:null});
    }
    else if(mode==="audio"){
      const tgt=pool[Math.floor(Math.random()*pool.length)];
      const distractors=quizPool
        .filter(w=>w.id!==tgt.id&&w.g===tgt.g&&Math.abs(w.w.length-tgt.w.length)<=2)
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>w.w);
      if(distractors.length<2) return;
      setQuiz({tgt,opts:[...distractors,tgt.w].sort(()=>Math.random()-.5),ans:tgt.w,mode:"audio",a:null,ok:null});
      findRecording(tgt.w); setTimeout(()=>speakWord(tgt.w,audioRate),400);
    }
    else if(mode==="meaning"){
      const trPool = pool.filter(w=>tr(w));
      if(trPool.length<4) return;
      const tgt=trPool[Math.floor(Math.random()*trPool.length)];
      const ansW=new Set(tr(tgt).toLowerCase().split(/[\s/,]+/).filter(x=>x.length>2));const ovl=t=>t.toLowerCase().split(/[\s/,]+/).some(x=>x.length>2&&ansW.has(x));
      const distractors=trPool.filter(w=>w.id!==tgt.id&&tr(w)!==tr(tgt)&&!ovl(tr(w)))
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>tr(w));
      setQuiz({tgt,opts:[...distractors,tr(tgt)].sort(()=>Math.random()-.5),ans:tr(tgt),mode:"meaning",a:null,ok:null});
    }
    else {
      // RELATION QUIZ: pick the related word (synonym or opposite)
      const relPool = pool.filter(w=>hasRelations(w.lm));
      if(relPool.length<1){ startQuizMeaningFallback(); return; }
      const tgt=relPool[Math.floor(Math.random()*relPool.length)];
      const rels=getRelations(tgt.lm);
      const allRel=[...rels.syn,...rels.ant];
      if(allRel.length===0){ startQuizMeaningFallback(); return; }
      const ans=allRel[Math.floor(Math.random()*allRel.length)];
      const isAnt=rels.ant.includes(ans);
      const distractors=quizPool
        .filter(w=>w.id!==tgt.id&&w.lm!==tgt.lm&&!allRel.includes(w.w)&&!allRel.includes(w.lm))
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>w.w);
      setQuiz({tgt,opts:[...distractors,ans].sort(()=>Math.random()-.5),ans,
        mode:"relation",relType:isAnt?"opposite":"similar",a:null,ok:null});
    }
    setScr("quiz");
  };

  const startQuizMeaningFallback = () => {
    const pool = quizPool.filter(w=>st(w.id)!=="known"&&tr(w));
    if(pool.length<4) return;
    const tgt=pool[Math.floor(Math.random()*pool.length)];
    const ansW=new Set(tr(tgt).toLowerCase().split(/[\s/,]+/).filter(x=>x.length>2));const ovl=t=>t.toLowerCase().split(/[\s/,]+/).some(x=>x.length>2&&ansW.has(x));
    const distractors=pool.filter(w=>w.id!==tgt.id&&tr(w)!==tr(tgt)&&!ovl(tr(w)))
      .sort(()=>Math.random()-.5).slice(0,3).map(w=>tr(w));
    setQuiz({tgt,opts:[...distractors,tr(tgt)].sort(()=>Math.random()-.5),ans:tr(tgt),mode:"meaning",a:null,ok:null});
    setScr("quiz");
  };

  // Bulk mark known
  const bulkMarkKnown = () => {
    setSaving(true);
    const updates = {};
    bulkSelected.forEach(id => { updates[id] = {ps:3,fl:0,iv:16,t:Date.now()}; });
    setLrn(prev => ({...prev, ...updates}));
    setBulkMode(false);
    setBulkSelected(new Set());
    setSaving(false);
  };

  // Ticking ✓ in the text analyzer means "I know this": straight to known (3 passes)
  const setKnown = (ids) => setLrn(p => {
    const u = { ...p }, now = Date.now();
    ids.forEach(id => { const e = p[id] || {}; u[id] = { ...e, ps: Math.max(e.ps || 0, 3), fam: 0, fl: e.fl || 0, iv: Math.max(e.iv || 1, 16), t: now }; });
    return u;
  });

  const goalButtons = Object.entries(GOALS).map(([k,g])=>(
    <button key={k} onClick={()=>setProf(p=>({...p,goal:k}))} style={{display:"block",width:"100%",textAlign:"left",padding:"12px 14px",marginBottom:6,background:goalKey(prof.goal)===k?"var(--s3)":"var(--s1)",border:goalKey(prof.goal)===k?"1.5px solid var(--ac)":"1.5px solid var(--s2)",borderRadius:9,color:"var(--t1)",cursor:"pointer",fontSize:14}}>
      <strong>{g.name}</strong>
      <span style={{display:"block",fontSize:11,color:"var(--t3)",marginTop:2}}>{g.desc}</span>
    </button>
  ));

  // ---- Community dictionary ----
  const loadCommunity = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("dict_entries").select("*").limit(10000);
    if (error) console.error("dictionary:", error); else setCommunity(data || []);
  }, []);
  useEffect(() => { loadCommunity(); }, [loadCommunity]);
  useEffect(() => {
    if (!supabase || !user || user.anon) { setIsEditor(false); return; }
    supabase.rpc("is_editor").then(({ data }) => setIsEditor(!!data));
  }, [user]);

  const redeemCode = async () => {
    const { data, error } = await supabase.rpc("redeem_editor_code", { code: editForm.code || "" });
    if (error || !data) return setEditForm(f => ({ ...f, ok: false, msg: error?.message || "Wrong password." }));
    setIsEditor(true); setEditForm({ ok: true, msg: "Welcome! You can now add and fix words." });
  };
  const openContrib = (word) => {
    const w = typeof word === "string" ? null : word;
    setEditForm(w
      ? { cid: w.cid, w: w.w, lm: w.lm && w.lm !== w.w ? w.lm : "", g: w.g || "", gn: w.gn || "", lv: w.lv || "", p: w.p || "", tr: tr(w) || "", note: w.note || "" }
      : { w: word || "" });
    setScr("contrib");
  };
  const saveEntry = async (baseId) => {
    const f = editForm;
    const row = Object.fromEntries(["w","lm","g","gn","lv","p","tr","note"].map(k => [k, (f[k] || "").trim() || null]));
    if (!row.w) return;
    setEditForm(x => ({ ...x, saving: true, msg: null }));
    const q = f.cid
      ? supabase.from("dict_entries").update({ ...row, updated_at: new Date().toISOString() }).eq("id", f.cid)
      : supabase.from("dict_entries").insert({ ...row, base_id: baseId ?? null });
    const { error } = await q;
    if (error) return setEditForm(x => ({ ...x, saving: false, ok: false, msg: error.message }));
    await loadCommunity();
    setEditForm({ ok: true, msg: `Saved “${row.w}”. Everyone sees it on their next load.` });
  };
  const changePassword = async () => {
    const { pw1 = "", pw2 = "" } = pwForm;
    if (pw1.length < 6) return setPwForm(f => ({ ...f, ok: false, msg: "Password must be 6+ characters" }));
    if (pw1 !== pw2) return setPwForm(f => ({ ...f, ok: false, msg: "Passwords don't match" }));
    setPwForm(f => ({ ...f, busy: true, msg: null }));
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setPwForm(error ? { ok: false, msg: error.message } : { ok: true, msg: "Password updated." });
  };

  const deleteEntry = async (r) => {
    if (!window.confirm(`Delete the community entry for “${r.w}”?`)) return;
    const { error } = await supabase.from("dict_entries").delete().eq("id", r.id);
    if (error) return setEditForm(x => ({ ...x, ok: false, msg: error.message }));
    loadCommunity();
  };

  // ============ RENDER ============

  // Dictionary loading
  if (dictLoading || !authChecked) return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
      <div style={{fontSize:40}}>🇫🇷</div>
      <p style={{color:"var(--t2)",fontSize:14,margin:0}}>Loading dictionary…</p>
      <p style={{color:"var(--t3)",fontSize:11,margin:0}}>46,792 French words · Lexique 3.83</p>
      <div style={{width:140,height:3,borderRadius:2,background:"var(--s2)",overflow:"hidden",marginTop:4}}>
        <div style={{width:"40%",height:"100%",background:"var(--ac)",animation:"lexLoad 1.2s ease-in-out infinite alternate"}}/>
      </div>
      <style>{`@keyframes lexLoad{from{transform:translateX(-100%)}to{transform:translateX(250%)}}`}</style>
    </div>
  );

  if (dictError) return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <p style={{color:"var(--dng)",fontSize:14,margin:"0 0 8px"}}>Failed to load dictionary</p>
      <p style={{color:"var(--t3)",fontSize:12,margin:0}}>{dictError}</p>
    </div>
  );

  // ---- AUTH SCREEN (sign in, or a guest saving progress to an account) ----
  const authCard = (guestLink) => {
    const tab = (k, label) => (
      <button onClick={()=>{setAuthScr(k);setAuthForm(f=>({...f,error:null,info:null}));}} style={{flex:1,padding:"9px 0",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:authScr===k?"var(--ac)":"var(--s1)",color:authScr===k?"#fff":"var(--t2)"}}>{label}</button>
    );
    const mode = guestLink ? "link" : authScr;
    return (
      <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{maxWidth:380,width:"100%"}}>
          {guestLink && <button onClick={()=>setScr("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer",marginBottom:12}}>← Back</button>}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{fontSize:40,marginBottom:4}}>🇫🇷</div>
            <h1 style={{fontSize:22,fontWeight:700,margin:"0 0 4px",letterSpacing:"-.5px"}}>{guestLink ? "Save your progress" : "Learn French. Actually."}</h1>
            <p style={{color:"var(--t3)",fontSize:12,margin:0}}>{guestLink ? "Add Google or an email to keep everything you've studied" : "Sign in to save your progress across devices"}</p>
          </div>

          <div style={{background:"var(--card)",borderRadius:12,padding:20,border:"1px solid var(--s2)"}}>
            {!supabase ? (
              <p style={{fontSize:12,color:"var(--dng)",margin:0}}>Accounts aren't configured: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.</p>
            ) : (<>
              <Btn onClick={signInGoogle} s={{width:"100%",marginBottom:14,background:"#fff",color:"#1f1f1f"}}>Continue with Google</Btn>

              {!guestLink && (
                <div style={{display:"flex",marginBottom:16,borderRadius:8,overflow:"hidden",border:"1px solid var(--s2)"}}>
                  {tab("login","Log in")}{tab("signup","Sign up")}
                </div>
              )}

              <div style={{marginBottom:10}}>
                <label style={{fontSize:11,color:"var(--t3)",display:"block",marginBottom:4}}>Email</label>
                <Input type="email" placeholder="you@example.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value,error:null}))}
                  onKeyDown={e=>{if(e.key==="Enter"&&guestLink)handleAuth("link");}} />
              </div>
              {!guestLink && (
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:11,color:"var(--t3)",display:"block",marginBottom:4}}>Password</label>
                  <Input type="password" placeholder="6+ characters" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value,error:null}))}
                    onKeyDown={e=>{if(e.key==="Enter")handleAuth(mode);}} />
                </div>
              )}

              {authForm.error && <p style={{fontSize:12,color:"var(--dng)",margin:"0 0 10px",padding:"8px 10px",background:"rgba(224,84,84,0.08)",borderRadius:8}}>{authForm.error}</p>}
              {authForm.info && <p style={{fontSize:12,color:"var(--ac2)",margin:"0 0 10px",padding:"8px 10px",background:"rgba(52,191,130,0.08)",borderRadius:8}}>{authForm.info}</p>}

              <Btn onClick={()=>handleAuth(mode)} pri dis={authForm.loading} s={{width:"100%",marginBottom:10}}>
                {authForm.loading ? "..." : guestLink ? "Save with this email" : authScr==="login" ? "Log in" : "Create account"}
              </Btn>

              {!guestLink && (
                <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--s2)"}}>
                  <button onClick={()=>handleAuth("magic")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:11,cursor:"pointer",padding:0}}>Email me a link instead</button>
                  <button onClick={tryAsGuest} style={{background:"none",border:"none",color:"var(--ac)",fontSize:11,cursor:"pointer",padding:0}}>Try without an account →</button>
                </div>
              )}
            </>)}
          </div>
        </div>
      </div>
    );
  };

  if(!user) return authCard(false);
  if(scr==="link" && user.anon) return authCard(true);

  // ---- ONBOARDING ----
  if(scr==="onb") return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <h1 style={{fontSize:22,fontWeight:700,margin:"0 0 4px"}}>Welcome{user.email ? `, ${user.email.split("@")[0]}` : ""}</h1>
          <p style={{color:"var(--t3)",fontSize:12,margin:0}}>Set up your learning goal</p>
        </div>
        <label style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Why are you learning French?</label>
        {goalButtons}
        <div style={{height:12}}/>
        <Btn onClick={()=>prof.goal&&setScr("home")} pri dis={!prof.goal} s={{width:"100%"}}>Continue</Btn>
      </div>
    </div>
  );

  // ---- TEXT ANALYSIS ----
  if(scr==="text"){
    const A = txtAnalysis;
    const frTok = A ? A.fr.reduce((n,e)=>n+e.count,0) : 0;
    const knownTok = A ? A.fr.filter(e=>st(e.w.id)==="known").reduce((n,e)=>n+e.count,0) : 0;
    const toLearn = A ? A.fr.filter(e=>st(e.w.id)!=="known").sort((a,b)=>b.count-a.count||(b.w.fs||0)-(a.w.fs||0)) : [];
    const pct = frTok ? Math.round(knownTok/frTok*100) : 0;
    const knownUnique = A ? A.fr.length - toLearn.length : 0;
    const chip = (k,n,c,add)=><span key={k} onClick={add&&isEditor?()=>openContrib(k):undefined} title={add&&isEditor?"Add to dictionary":undefined} style={{display:"inline-block",padding:"2px 8px",margin:"0 4px 4px 0",borderRadius:10,background:"var(--s2)",fontSize:11,color:c||"var(--t2)",cursor:add&&isEditor?"pointer":"default"}}>{k}{n>1?` ×${n}`:""}{add&&isEditor?" ＋":""}</span>;
    const clsColor = (t)=> t.cls==="grammar" ? "var(--t1)" : t.cls==="fr" ? statusColor(st(t.w.id)) : t.cls==="en" ? "var(--t3)" : t.cls==="name" ? "var(--t2)" : "var(--dng)";
    const renderSentence = (s)=> s.text.split(/([\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*['’]?)/u).map((part,i)=>{
      if(i%2===0) return <span key={i}>{part}</span>;
      const pieces = expandToken(part, formIndex, i>1 && /^\p{Lu}/u.test(part)).map(p=>({...p,cls:classifyToken(p,s.lang,i===1)}));
      const tt = pieces.find(p=>p.cls==="fr" && st(p.w.id)!=="known") || pieces.find(p=>p.cls!=="grammar") || pieces[0];
      if(!tt) return <span key={i}>{part}</span>;
      const unknown = tt.cls==="fr" && st(tt.w.id)!=="known";
      return <span key={i} onClick={tt.w&&tt.cls==="fr"?()=>{setCur(tt.w);setWordBack("text");setScr("word");}:undefined}
        style={{color:tt.cls==="fr"&&!unknown?"var(--t1)":clsColor(tt),borderBottom:unknown?`2px solid ${clsColor(tt)}`:"none",cursor:tt.cls==="fr"?"pointer":"default",fontStyle:tt.cls==="en"?"italic":"normal"}}>{part}</span>;
    });
    return (
      <div style={sh}>
        <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
          <button onClick={()=>setScr("labs")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
          <span style={{fontSize:14,fontWeight:600}}>📄 Analyze a text</span>
          <span style={{width:20}}/>
        </div>
        <div style={{padding:"12px 16px",maxWidth:640,margin:"0 auto"}}>
          <textarea value={txtDraft} onChange={e=>setTxtDraft(e.target.value)} placeholder="Paste a French text: an article, a chapter, song lyrics, an exam passage…"
            style={{width:"100%",minHeight:140,padding:"11px 14px",borderRadius:9,border:"1.5px solid var(--s2)",background:"var(--s1)",color:"var(--t1)",fontSize:13,lineHeight:1.5,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
          <div style={{display:"flex",gap:6,margin:"8px 0 14px"}}>
            <Btn onClick={()=>setTxt(txtDraft)} pri dis={!txtDraft.trim()} s={{flex:1}}>Analyze</Btn>
            <Btn onClick={()=>{setTxtDraft("");setTxt("");}} s={{background:"var(--s2)"}}>Clear</Btn>
          </div>

          {A && (<>
            {/* Summary */}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
              {[{l:"Words",c:A.total},{l:"French (unique)",c:A.fr.length},{l:"To learn",c:toLearn.length,cl:"var(--acw)"},{l:"Sentences",c:A.sentences.length}].map(s=>(
                <div key={s.l} style={{flex:"1 1 22%",minWidth:80,background:"var(--s1)",borderRadius:9,padding:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.cl||"var(--t1)"}}>{s.c}</div>
                  <div style={{fontSize:9,color:"var(--t3)"}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:4}}>You know <strong style={{color:"var(--ac2)"}}>{knownUnique} of {A.fr.length}</strong> different words here. Counting repeats, that covers <strong style={{color:"var(--ac2)"}}>{pct}%</strong> of the text (grammar words like le, de, et not counted).</div>
            <div style={{height:5,borderRadius:3,background:"var(--s2)",marginBottom:16,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:"var(--ac2)"}}/></div>

            {/* Words to learn */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px"}}>Words you don't know yet ({toLearn.length})</span>
              {toLearn.length>0&&<button onClick={()=>{if(window.confirm(`Mark all ${toLearn.length} as known?`))setKnown(toLearn.map(e=>e.w.id));}}
                style={{background:"none",border:"none",color:"var(--ac2)",fontSize:11,cursor:"pointer"}}>Mark all known</button>}
            </div>
            {toLearn.slice(0,300).map(e=>{
              const s=st(e.w.id);
              const forms=[...e.forms].filter(f=>f!==(e.w.g==="verb"&&e.w.lm?e.w.lm:e.w.w));
              return (
                <div key={e.w.id} style={{display:"flex",alignItems:"center",gap:6,background:"var(--s1)",border:"1px solid var(--s2)",borderLeft:`3px solid ${statusColor(s)}`,borderRadius:9,padding:"8px 10px",marginBottom:5}}>
                  <div onClick={()=>{setCur(e.w);setWordBack("text");setScr("word");}} style={{flex:1,cursor:"pointer",minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600}}>{e.w.g==="verb"&&e.w.lm?e.w.lm:e.w.w}{forms.length>0&&<span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}> ({forms.slice(0,3).join(", ")})</span>} <span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}>×{e.count}</span></div>
                    <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tr(e.w)||liveTr[e.w.lm]||""} <span style={{color:"var(--t3)"}}>{e.w.lv} · {statusLabel(s)}</span></div>
                  </div>
                  <AudioBtn text={e.w.w} rate={audioRate} s={{padding:"4px 7px",fontSize:12}}/>
                  <button title="I know it" onClick={()=>setKnown([e.w.id])} style={{background:"rgba(52,191,130,0.1)",border:"none",borderRadius:7,padding:"5px 8px",color:"var(--ac2)",cursor:"pointer"}}>✓</button>
                  <button title="Familiar" onClick={()=>mark(e.w.id,"familiar")} style={{background:"rgba(224,147,72,0.1)",border:"none",borderRadius:7,padding:"5px 8px",color:"var(--acw)",cursor:"pointer"}}>≈</button>
                  <button title="Don't know" onClick={()=>mark(e.w.id,"unknown")} style={{background:"rgba(224,84,84,0.1)",border:"none",borderRadius:7,padding:"5px 8px",color:"var(--dng)",cursor:"pointer"}}>✗</button>
                </div>
              );
            })}
            {toLearn.length>300&&<p style={{fontSize:10,color:"var(--t3)"}}>Showing the 300 most frequent.</p>}

            {/* Not in dictionary / English / names */}
            {[["unmatched","Not in the dictionary (conjugations, typos, slang)","var(--dng)"],["name","Names",null],["en","English",null]].map(([k,label,c])=>A.other[k].size>0&&(
              <div key={k} style={{marginTop:14}}>
                <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>{label} ({A.other[k].size})</div>
                <div>{[...A.other[k]].sort((a,b)=>b[1]-a[1]).slice(0,150).map(([w,n])=>chip(w,n,c,k==="unmatched"))}</div>
              </div>
            ))}

            {/* Sentences */}
            <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",margin:"18px 0 6px"}}>Sentences ({A.sentences.length})</div>
            {A.sentences.slice(0,400).map((s,i)=>{
              const frT=s.toks.filter(t=>t.cls==="fr"&&!t.particle);
              const unk=frT.filter(t=>st(t.w.id)!=="known").length;
              return (
                <div key={i} style={{background:"var(--s1)",borderRadius:9,padding:"9px 11px",marginBottom:5,fontSize:13,lineHeight:1.6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--t3)",marginBottom:2}}>
                    <span>#{i+1}{s.lang==="en"?" · English":""}</span>
                    {s.lang==="fr"&&<span style={{color:unk?"var(--acw)":"var(--ac2)"}}>{unk?`${unk} new`:"✓ all known"}</span>}
                  </div>
                  {renderSentence(s)}
                </div>
              );
            })}
            {A.sentences.length>400&&<p style={{fontSize:10,color:"var(--t3)"}}>Showing the first 400 sentences.</p>}
            <p style={{fontSize:10,color:"var(--t3)",padding:"10px 0 28px"}}>Underlined = not known yet (tap for details) · grey italic = English · red = not in the dictionary</p>
          </>)}
        </div>
      </div>
    );
  }

  // ---- BULK IMPORT ----
  if(scr==="bulk") return (
    <div style={sh}>
      <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{setBulkMode(false);setBulkSelected(new Set());setScr("labs");}} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
          <span style={{fontSize:13,fontWeight:600}}>Import from WordBit</span>
        </div>
        {bulkSelected.size>0&&<Btn onClick={bulkMarkKnown} pri s={{padding:"8px 14px",fontSize:12}}>Mark {bulkSelected.size} known ✓</Btn>}
      </div>
      <div style={{padding:"12px 16px",maxWidth:440,margin:"0 auto"}}>
        <div style={{background:"rgba(75,133,224,0.06)",border:"1px solid rgba(75,133,224,0.12)",borderRadius:9,padding:12,marginBottom:12}}>
          <p style={{margin:0,fontSize:12,color:"var(--t2)",lineHeight:1.5}}>
            Tap every word you already know from WordBit. They'll be marked as "known" (3 passes) so you don't have to relearn them. You can always undo from the word detail screen.
          </p>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setBulkSelected(new Set(L.filter(w=>w.lv==="A1").map(w=>w.id)));}} s={{padding:"6px 10px",fontSize:11,background:"var(--s2)"}}>Select all A1</Btn>
          <Btn onClick={()=>{setBulkSelected(new Set(L.filter(w=>w.lv==="A1"||w.lv==="A2").map(w=>w.id)));}} s={{padding:"6px 10px",fontSize:11,background:"var(--s2)"}}>Select A1+A2</Btn>
          <Btn onClick={()=>setBulkSelected(new Set())} s={{padding:"6px 10px",fontSize:11,background:"var(--s2)",color:"var(--dng)"}}>Clear</Btn>
        </div>
        <Input type="text" placeholder="Search words to import…" value={bulkSrch} onChange={e=>setBulkSrch(e.target.value)} style={{marginBottom:8}} />
        <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>{bulkSelected.size} of {L.length} selected · showing {bulkVocab.length}{bulkSrch?" matches":""}</div>
        {bulkVocab.map(w=>{
          const sel = bulkSelected.has(w.id);
          const already = st(w.id)==="known";
          return (
            <button key={w.id} onClick={()=>{
              if(already) return;
              setBulkSelected(prev=>{const n=new Set(prev);if(n.has(w.id))n.delete(w.id);else n.add(w.id);return n;});
            }} style={{display:"flex",width:"100%",alignItems:"center",gap:10,padding:"9px 12px",marginBottom:3,borderRadius:8,border:"none",cursor:already?"default":"pointer",background:sel?"rgba(52,191,130,0.08)":already?"rgba(52,191,130,0.04)":"var(--s1)",color:"var(--t1)",textAlign:"left",opacity:already?.5:1}}>
              <span style={{width:22,height:22,borderRadius:6,border:sel||already?"none":"1.5px solid var(--s3)",background:sel?"var(--ac2)":already?"var(--ac2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",flexShrink:0}}>
                {(sel||already)&&"✓"}
              </span>
              <span style={{fontSize:14,fontWeight:500,flex:1}}>{w.w}</span>
              <span style={{fontSize:11,color:"var(--t3)"}}>/{toIPA(w.p)}/</span>
              <Tag>{w.lv}</Tag>
              {already&&<span style={{fontSize:9,color:"var(--ac2)"}}>already known</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---- RAPID REVIEW (the feature WordBit killed) ----
  if(scr==="rapid"){
    const pool = shuffledPool.length > 0 ? shuffledPool : L;
    const w = pool[rapidIdx];
    const progress = `${rapidIdx+1}/${pool.length}`;
    const pct = ((rapidIdx+1)/pool.length)*100;
    
    if(!w || rapidIdx >= pool.length) {
      // Done - show summary
      return (
        <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{maxWidth:380,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>✅</div>
            <h2 style={{fontSize:22,fontWeight:700,margin:"0 0 8px"}}>Review complete</h2>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20,flexWrap:"wrap"}}>
              <div style={{background:"var(--s1)",borderRadius:9,padding:"12px 20px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:700,color:"var(--ac2)"}}>{rapidStats.known}</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>Known</div>
              </div>
              <div style={{background:"var(--s1)",borderRadius:9,padding:"12px 20px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:700,color:"var(--acw)"}}>{rapidStats.familiar}</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>Familiar</div>
              </div>
              <div style={{background:"var(--s1)",borderRadius:9,padding:"12px 20px",textAlign:"center"}}>
                <div style={{fontSize:24,fontWeight:700,color:"var(--ac)"}}>{rapidStats.learning}</div>
                <div style={{fontSize:10,color:"var(--t3)"}}>Don't know</div>
              </div>
            </div>
            <p style={{fontSize:13,color:"var(--t2)",marginBottom:16}}>Reviewed {rapidStats.total} words in {rapidLevel||"all levels"}</p>
            <div style={{display:"flex",gap:6,justifyContent:"center"}}>
              <Btn onClick={()=>{setRapidIdx(0);setRapidStats({known:0,familiar:0,learning:0,total:0});}} s={{background:"var(--s2)"}}>Again</Btn>
              <Btn onClick={()=>setScr("home")} pri>Done</Btn>
            </div>
          </div>
        </div>
      );
    }
    
    const wSt = st(w.id);
    return (
      <div style={{...sh,display:"flex",flexDirection:"column"}}>
        {/* Header with progress */}
        <div style={{padding:"10px 16px",borderBottom:"1px solid var(--s2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <button onClick={()=>setScr("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>← Exit</button>
            <span style={{fontSize:12,color:"var(--t2)",fontWeight:600}}>{progress}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={()=>setAudioOn(v=>!v)} style={{background:"none",border:"none",fontSize:14,cursor:"pointer",opacity:audioOn?1:.4}} title="Toggle auto-play">{audioOn?"🔊":"🔇"}</button>
              <div style={{fontSize:11,color:"var(--t3)"}}>
              <span style={{color:"var(--ac2)"}}>{rapidStats.known}✓</span>
              {" · "}
              <span style={{color:"var(--acw)"}}>{rapidStats.familiar}≈</span>
              {" · "}
              <span style={{color:"var(--ac)"}}>{rapidStats.learning}✗</span>
              </div>
            </div>
          </div>
          <div style={{height:3,borderRadius:2,background:"var(--s2)",overflow:"hidden"}}>
            <div style={{width:`${pct}%`,height:"100%",background:"var(--ac)",transition:"width 0.3s"}}/>
          </div>
        </div>
        
        {/* Word card */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,maxWidth:400,margin:"0 auto",width:"100%"}}>
          {wSt!=="new"&&<div style={{fontSize:10,color:statusColor(wSt),background:wSt==="known"?"rgba(52,191,130,0.08)":wSt==="familiar"?"rgba(224,147,72,0.08)":"rgba(75,133,224,0.08)",padding:"3px 10px",borderRadius:10,marginBottom:8}}>{statusLabel(wSt)}</div>}
          
          {conceptFor(w)&&<div style={{fontSize:56,marginBottom:4}}>{conceptFor(w)}</div>}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <h1 style={{fontSize:42,fontWeight:700,margin:0,letterSpacing:"-0.5px"}}>{w.w}</h1>
            <AudioBtn text={w.w} rate={audioRate} />
          </div>
          {tr(w)&&<p style={{fontSize:18,color:"var(--ac2)",fontWeight:500,margin:"8px 0 0"}}>{tr(w)}</p>}
          {w.lm!==w.w&&<p style={{fontSize:13,color:"var(--t3)",margin:"0 0 12px"}}>lemma: {w.lm}</p>}
          
          <div style={{display:"flex",gap:5,marginBottom:20}}>
            <Tag>{w.lv}</Tag><Tag>{w.g}</Tag>
            {w.gn&&<Tag c={w.gn==="m"?"rgba(79,138,232,0.12)":"rgba(232,79,155,0.12)"}>{w.gn==="m"?"masc.":"fém."}</Tag>}
          </div>
          
          {w.fm.length>0&&(
            <div style={{marginBottom:20,textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--t3)",marginBottom:4}}>Family</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
                {w.fm.slice(0,4).map(f=><span key={f} style={{padding:"3px 8px",borderRadius:10,background:"var(--s2)",fontSize:11,color:"var(--t2)"}}>{f}</span>)}
              </div>
            </div>
          )}
          
          <div style={{fontSize:11,color:"var(--t3)",marginBottom:16}}>🗣️ {w.fs.toLocaleString()}/M · 📖 {w.fw.toLocaleString()}/M</div>
        </div>
        
        {/* Action buttons - three-way rating */}
        <div style={{padding:"16px 20px 12px",display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={()=>{
            mark(w.id, "know");
            setRapidStats(p=>({...p,known:p.known+1,total:p.total+1}));
            setRapidIdx(i=>i+1);
          }} style={{
            padding:"16px 0",borderRadius:12,fontSize:15,fontWeight:700,
            cursor:"pointer",background:"rgba(52,191,130,0.08)",color:"var(--ac2)",
            border:"2px solid rgba(52,191,130,0.2)"
          }}>
            Know it ✓
          </button>
          <button onClick={()=>{
            mark(w.id, "familiar");
            setRapidStats(p=>({...p,familiar:p.familiar+1,total:p.total+1}));
            setRapidIdx(i=>i+1);
          }} style={{
            padding:"16px 0",borderRadius:12,fontSize:15,fontWeight:700,
            cursor:"pointer",background:"rgba(224,147,72,0.08)",color:"var(--acw)",
            border:"2px solid rgba(224,147,72,0.2)"
          }}>
            Familiar / close ≈
          </button>
          <button onClick={()=>{
            mark(w.id, "unknown");
            setRapidStats(p=>({...p,learning:p.learning+1,total:p.total+1}));
            setRapidIdx(i=>i+1);
          }} style={{
            padding:"16px 0",borderRadius:12,fontSize:15,fontWeight:700,
            cursor:"pointer",background:"rgba(224,84,84,0.08)",color:"var(--dng)",
            border:"2px solid rgba(224,84,84,0.2)"
          }}>
            Don't know
          </button>
        </div>
        
        {/* Skip */}
        <div style={{textAlign:"center",paddingBottom:16}}>
          <button onClick={()=>{setRapidStats(p=>({...p,total:p.total+1}));setRapidIdx(i=>i+1);}} style={{background:"none",border:"none",color:"var(--t3)",fontSize:12,cursor:"pointer"}}>
            Skip →
          </button>
        </div>
      </div>
    );
  }

  // ---- RAPID REVIEW SETUP ----
  if(scr==="rapid-setup") return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:380,width:"100%"}}>
        <button onClick={()=>setScr("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer",marginBottom:12}}>← Back</button>
        <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 4px"}}>⚡ Rapid Review</h2>
        <p style={{fontSize:12,color:"var(--t2)",margin:"0 0 16px",lineHeight:1.5}}>
          Scroll through words one by one. Rate each word: Know it, Familiar/close, or Don't know. Grind through hundreds of words in one session.
        </p>
        
        <label style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Which level to review?</label>
        {[null,...CEFR_LEVELS].map(lv=>{
          const count = lv ? L.filter(w=>w.lv===lv).length : L.length;
          const knownCount = lv ? L.filter(w=>w.lv===lv&&st(w.id)==="known").length : L.filter(w=>st(w.id)==="known").length;
          return (
            <button key={lv||"all"} onClick={()=>{const base=lv?L.filter(w=>w.lv===lv):L;setShuffledPool([...base].sort(()=>Math.random()-0.5));setRapidLevel(lv);setRapidIdx(0);setRapidStats({known:0,familiar:0,learning:0,total:0});setScr("rapid");}} style={{
              display:"block",width:"100%",textAlign:"left",padding:"12px 14px",marginBottom:5,
              background:"var(--s1)",border:"1.5px solid var(--s2)",borderRadius:9,
              color:"var(--t1)",cursor:"pointer",fontSize:14
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong>{lv||"All levels"}</strong>
                <span style={{fontSize:12,color:"var(--t3)"}}>{count} words</span>
              </div>
              <div style={{marginTop:4,height:4,borderRadius:2,background:"var(--s2)",overflow:"hidden"}}>
                <div style={{width:`${count>0?(knownCount/count)*100:0}%`,height:"100%",background:"var(--ac2)"}}/>
              </div>
              <span style={{fontSize:10,color:"var(--ac2)"}}>{knownCount}/{count} known</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---- WORD DETAIL ----
  if(scr==="word"&&cur){
    const s=st(cur.id),ch=chain(cur),e=lrn[cur.id];
    return (
      <div style={sh}>
        <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--s2)"}}>
          <button onClick={()=>setScr(wordBack)} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
          <span style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px"}}>Word Detail</span>
        </div>
        <div style={{padding:16,maxWidth:440,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            {conceptFor(cur)&&<div style={{fontSize:44,marginBottom:4}}>{conceptFor(cur)}</div>}
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
              <h2 style={{fontSize:28,fontWeight:700,margin:0}}>{cur.w}</h2>
              <span style={{fontSize:12,color:"var(--t3)"}}>/{toIPA(cur.p)}/</span>
              <AudioBtn text={cur.w} rate={audioRate} s={{padding:"5px 8px",fontSize:13}} />
            </div>
            {rec&&<p style={{margin:"2px 0 0",fontSize:10,color:"var(--t3)"}}>🎙 Real recording by <a href={recPage(rec.file)} target="_blank" rel="noreferrer" style={{color:"var(--t2)"}}>{rec.speaker}</a> · Lingua Libre (CC BY-SA)</p>}
            {(()=>{const m=tr(cur)||liveTr[cur.lm];return m
              ?<p style={{margin:"4px 0 0",fontSize:16,color:"var(--ac2)",fontWeight:500}}>{m}</p>
              :<p style={{margin:"4px 0 0",fontSize:13,color:"var(--t3)",fontStyle:"italic"}}>translating…</p>;})()}
            <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
              <Tag>{cur.lv}</Tag><Tag>{cur.g}</Tag>
              {cur.gn&&<Tag c={cur.gn==="m"?"rgba(79,138,232,0.12)":"rgba(232,79,155,0.12)"}>{cur.gn==="m"?"masc.":"fém."}</Tag>}
              {cur.community&&<Tag c="rgba(75,133,224,0.12)">community</Tag>}
              {isEditor&&<button onClick={()=>openContrib(cur)} style={{marginLeft:"auto",background:"var(--s2)",border:"none",borderRadius:7,padding:"3px 8px",fontSize:11,color:"var(--t2)",cursor:"pointer"}}>✏️ Edit</button>}
            </div>
            {cur.note&&<p style={{margin:"8px 0 0",fontSize:12,color:"var(--t2)",background:"var(--s1)",borderRadius:8,padding:"8px 10px"}}>💡 {cur.note}</p>}
          </div>
          <div style={{background:"var(--s1)",borderRadius:9,padding:12,marginBottom:10}}>
            <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Frequency</div>
            <div style={{display:"flex",gap:12,fontSize:12,color:"var(--t2)"}}>
              <span>🗣️ {cur.fs.toLocaleString()}/M</span>
              <span>📖 {cur.fw.toLocaleString()}/M</span>
            </div>
          </div>
          <div style={{background:"var(--s1)",borderRadius:9,padding:12,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:11,color:"var(--t3)"}}>Status</span>
              <span style={{fontSize:11,fontWeight:600,color:statusColor(s)}}>{statusLabel(s)}</span>
            </div>
            {e&&<div style={{fontSize:11,color:"var(--t2)"}}>{e.ps}✓ / {e.fl}✗ · interval: {e.iv}d</div>}
            {ch>0&&<div style={{fontSize:11,color:"var(--acw)",fontWeight:600,marginTop:2}}>🔗 Chain: {ch}%</div>}
          </div>
          {cur.fm.length>0&&(
            <div style={{background:"var(--s1)",borderRadius:9,padding:12,marginBottom:10}}>
              <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Word Family</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {cur.fm.map(f=>{const m=findWord(f),fs=m?st(m.id):"new";
                  return <button key={f} onClick={()=>{if(m)setCur(m);}} style={{padding:"4px 10px",borderRadius:14,fontSize:12,cursor:m?"pointer":"default",background:fs==="known"?"rgba(52,191,130,0.1)":"var(--s2)",color:fs==="known"?"var(--ac2)":"var(--t2)",border:"none"}}>{f}{fs==="known"&&" ✓"}</button>;
                })}
              </div>
            </div>
          )}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <Btn onClick={()=>{mark(cur.id,"know");setScr(wordBack);}} s={{background:"rgba(52,191,130,0.06)",color:"var(--ac2)",border:"1.5px solid rgba(52,191,130,0.15)"}}>Know it ✓</Btn>
            <Btn onClick={()=>{mark(cur.id,"familiar");setScr(wordBack);}} s={{background:"rgba(224,147,72,0.06)",color:"var(--acw)",border:"1.5px solid rgba(224,147,72,0.15)"}}>Familiar / close ≈</Btn>
            <Btn onClick={()=>{mark(cur.id,"unknown");setScr(wordBack);}} s={{background:"rgba(224,84,84,0.06)",color:"var(--dng)",border:"1.5px solid rgba(224,84,84,0.15)"}}>Don't know</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ---- QUIZ ----
  if(scr==="quiz"&&quiz) return (
    <div style={{...sh,display:"flex",flexDirection:"column"}}>
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--s2)"}}>
        <button onClick={()=>{setQuiz(null);setScr("home");}} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
        <span style={{fontSize:13,fontWeight:600}}>{quiz.mode==="family"?"Family Quiz":"Quiz"}</span>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,maxWidth:400,margin:"0 auto",width:"100%"}}>
        <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
          {quiz.mode==="family"?"Which belongs to the family of:"
           :quiz.mode==="audio"?"What did you hear? 🔊"
           :quiz.mode==="meaning"?"What does this mean?"
           :quiz.mode==="relation"?(quiz.relType==="opposite"?"Pick the OPPOSITE of:":"Pick a word SIMILAR to:")
           :"Identify"}
        </div>
        <h2 style={{fontSize:32,fontWeight:700,margin:"0 0 4px"}}>
          {quiz.mode==="audio"&&!quiz.a?"🔊 ???":quiz.tgt.w}
        </h2>
        {quiz.mode==="audio"&&!quiz.a&&<AudioBtn text={quiz.tgt.w} rate={audioRate} label="🔊 Replay" s={{marginBottom:8}}/>}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}>
          <p style={{fontSize:12,color:"var(--t3)",margin:0}}>/{toIPA(quiz.tgt.p)}/ · {quiz.tgt.lm}</p>
          <AudioBtn text={quiz.tgt.w} rate={audioRate} s={{padding:"4px 8px",fontSize:12}} />
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,width:"100%"}}>
          {quiz.opts.map((o,i)=>{
            let bg="var(--s1)",bd="1.5px solid var(--s2)";
            if(quiz.a){if(o===quiz.ans){bg="rgba(52,191,130,0.06)";bd="1.5px solid var(--ac2)";}else if(o===quiz.a){bg="rgba(224,84,84,0.06)";bd="1.5px solid var(--dng)";}}
            return <button key={i} onClick={()=>{if(!quiz.a){const ok=o===quiz.ans;if(quiz.mode!=="family")mark(quiz.tgt.id,ok?"know":"unknown");setQuiz(p=>({...p,a:o,ok}));}}} disabled={!!quiz.a} style={{padding:"12px 14px",borderRadius:9,background:bg,border:bd,color:"var(--t1)",fontSize:14,textAlign:"left",cursor:quiz.a?"default":"pointer"}}>{o}</button>;
          })}
        </div>
        {quiz.a&&<div style={{marginTop:16,textAlign:"center"}}>
          <p style={{fontSize:15,fontWeight:600,color:quiz.ok?"var(--ac2)":"var(--dng)",marginBottom:12}}>{quiz.ok?"Correct!":"Not quite"}</p>
          {quiz.mode==="relation"&&hasRelations(quiz.tgt.lm)&&(
            <div style={{fontSize:11,color:"var(--t2)",marginBottom:10,maxWidth:300,margin:"0 auto 10px"}}>
              {getRelations(quiz.tgt.lm).syn.length>0&&<div>Similar: {getRelations(quiz.tgt.lm).syn.join(", ")}</div>}
              {getRelations(quiz.tgt.lm).ant.length>0&&<div>Opposite: {getRelations(quiz.tgt.lm).ant.join(", ")}</div>}
            </div>
          )}
          {quiz.mode==="meaning"&&tr(quiz.tgt)&&(
            <p style={{fontSize:12,color:"var(--t2)",marginBottom:10}}>{quiz.tgt.w} = {tr(quiz.tgt)}</p>
          )}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}><Btn onClick={()=>startQuiz(quiz.mode)}>Next →</Btn><Btn onClick={()=>startQuiz("relation")} s={{background:"var(--s2)",color:"var(--acw)"}}>↔ Relations</Btn><Btn onClick={()=>startQuiz("audio")} s={{background:"var(--s2)",color:"var(--ac)"}}>👂 Audio</Btn></div>
        </div>}
      </div>
    </div>
  );

  // ---- ROOTS ----
  if(scr==="roots") return (
    <div style={sh}>
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--s2)"}}>
        <button onClick={()=>setScr("labs")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
        <span style={{fontSize:13,fontWeight:600}}>Roots & Patterns</span>
      </div>
      <div style={{padding:16,maxWidth:440,margin:"0 auto"}}>
        {SUFFIXES.map((r,i)=>(
          <div key={i} style={{background:"var(--s1)",borderRadius:9,padding:12,marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
              <span style={{fontSize:15,fontWeight:700,color:"var(--acw)"}}>{r.s}</span>
              <span style={{fontSize:9,color:"var(--t3)",background:"var(--s2)",padding:"2px 6px",borderRadius:6}}>{r.from}→{r.to}</span>
            </div>
            <p style={{margin:"0 0 2px",fontSize:12,color:"var(--t1)"}}>{r.r}</p>
            <p style={{margin:0,fontSize:11,color:"var(--ac2)"}}>{r.ex}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const backBar=(title,to="home")=>(
    <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
      <button onClick={()=>setScr(to)} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
      <span style={{fontSize:14,fontWeight:600}}>{title}</span>
      <span style={{width:20}}/>
    </div>
  );
  const secLabel=(t)=><div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",margin:"18px 0 8px"}}>{t}</div>;

  // ---- CONTRIBUTORS (add / fix dictionary words) ----
  if(scr==="contrib"){
    const ef=editForm;
    const setF=(k,v)=>setEditForm(f=>({...f,[k]:v,msg:null}));
    const field=(k,label,ph)=>(
      <div style={{marginBottom:8}}>
        <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3}}>{label}</label>
        <Input value={ef[k]||""} placeholder={ph} onChange={e=>setF(k,e.target.value)} />
      </div>
    );
    const select=(k,label,opts)=>(
      <div style={{flex:1}}>
        <label style={{fontSize:10,color:"var(--t3)",display:"block",marginBottom:3}}>{label}</label>
        <select value={ef[k]||""} onChange={e=>setF(k,e.target.value)} style={{width:"100%",padding:"10px",borderRadius:9,border:"1.5px solid var(--s2)",background:"var(--s1)",color:"var(--t1)",fontSize:13}}>
          {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    );
    const base = ef.w && !ef.cid ? formIndex.get(ef.w.trim().toLowerCase()) : null;
    const baseIsExact = base && base.w.toLowerCase()===ef.w.trim().toLowerCase() && !base.community;
    return (
      <div style={sh}>
        {backBar("🛠 Contributors","labs")}
        <div style={{padding:"12px 16px 28px",maxWidth:440,margin:"0 auto"}}>
          {(!user || user.anon) ? (
            <p style={{fontSize:12,color:"var(--t2)"}}>Contributors need a real account (email or Google), not a guest account.</p>
          ) : !isEditor ? (<>
            <p style={{fontSize:12,color:"var(--t2)",margin:"0 0 10px"}}>Contributors can add missing words and correct translations, pronunciations and levels for everyone. Enter the contributor password to join.</p>
            <Input type="password" placeholder="Contributor password" value={ef.code||""} onChange={e=>setF("code",e.target.value)} onKeyDown={e=>{if(e.key==="Enter")redeemCode();}} style={{marginBottom:8}}/>
            <Btn onClick={redeemCode} pri s={{width:"100%"}}>Join as contributor</Btn>
            {ef.msg&&<p style={{fontSize:12,color:ef.ok?"var(--ac2)":"var(--dng)",marginTop:8}}>{ef.msg}</p>}
          </>) : (<>
            <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",margin:"6px 0 8px"}}>{ef.cid?"Edit entry":"Add or correct a word"}</div>
            {field("w","Word *","e.g. franchement")}
            {baseIsExact&&<p style={{fontSize:11,color:"var(--acw)",margin:"-4px 0 8px"}}>Already in the dictionary. Saving creates a correction to it (blank fields keep the original).</p>}
            {field("lm","Base form (infinitive / masculine singular)","leave blank if same as word")}
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              {select("g","Type",[["","—"],["noun","noun"],["verb","verb"],["adj","adjective"],["adv","adverb"],["pron","pronoun"],["other","other / expression"]])}
              {select("gn","Gender",[["","—"],["m","masc."],["f","fém."]])}
              {select("lv","Level",[["","—"],...CEFR_LEVELS.map(l=>[l,l])])}
            </div>
            {field("tr","English meaning(s)","frankly / honestly, (informal) seriously")}
            {field("p","Pronunciation (IPA)","fʁɑ̃ʃmɑ̃")}
            {field("note","Usage / regional note","Very common in speech. Québec: …")}
            <div style={{display:"flex",gap:6,marginTop:4}}>
              <Btn onClick={()=>saveEntry(baseIsExact?base.id:null)} pri dis={!ef.w?.trim()||ef.saving} s={{flex:1}}>{ef.saving?"Saving…":"Save for everyone"}</Btn>
              <Btn onClick={()=>setEditForm({})} s={{background:"var(--s2)"}}>Clear</Btn>
            </div>
            {ef.msg&&<p style={{fontSize:12,color:ef.ok?"var(--ac2)":"var(--dng)",marginTop:8}}>{ef.msg}</p>}

            <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",margin:"20px 0 8px"}}>Community entries ({community.length})</div>
            {[...community].sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||"")).slice(0,100).map(r=>(
              <div key={r.id} style={{display:"flex",alignItems:"center",gap:6,background:"var(--s1)",borderRadius:9,padding:"8px 10px",marginBottom:4}}>
                <div onClick={()=>setEditForm({cid:r.id,base_id:r.base_id,w:r.w,lm:r.lm||"",g:r.g||"",gn:r.gn||"",lv:r.lv||"",p:r.p||"",tr:r.tr||"",note:r.note||""})} style={{flex:1,cursor:"pointer",minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{r.w} <span style={{fontSize:10,color:"var(--t3)",fontWeight:400}}>{r.base_id!=null?"correction":"new word"}</span></div>
                  <div style={{fontSize:11,color:"var(--t2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.tr||""}</div>
                </div>
                <button title="Delete" onClick={()=>deleteEntry(r)} style={{background:"rgba(224,84,84,0.1)",border:"none",borderRadius:7,padding:"5px 8px",color:"var(--dng)",cursor:"pointer"}}>🗑</button>
              </div>
            ))}
          </>)}
        </div>
      </div>
    );
  }

  // ---- SETTINGS ----
  const goal=GOALS[goalKey(prof.goal)];
  if(scr==="settings") return (
    <div style={sh}>
      {backBar("⚙ Settings")}
      <div style={{padding:"4px 16px 28px",maxWidth:440,margin:"0 auto"}}>
        {secLabel("Learning goal")}
        {goalButtons}

        {secLabel("French variety")}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {Object.entries(REGIONS).map(([c,n])=>(
            <button key={c} onClick={()=>setProf(p=>({...p,region:c}))} style={{padding:"8px 14px",borderRadius:16,fontSize:12,border:"none",cursor:"pointer",background:prof.region===c?"var(--ac)":"var(--s2)",color:prof.region===c?"#fff":"var(--t2)"}}>{RF[c]} {n}</button>
          ))}
        </div>

        {secLabel("Audio")}
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--t2)",marginBottom:10}}>
          <span>Speech speed</span>
          <input type="range" min="0.6" max="1.2" step="0.05" value={audioRate} onChange={e=>setAudioRate(parseFloat(e.target.value))} style={{flex:1,accentColor:"var(--ac)"}}/>
          <span>{audioRate.toFixed(2)}×</span>
          <AudioBtn text="Bonjour, comment ça va ?" rate={audioRate} label="▶"/>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"var(--t2)",cursor:"pointer"}}>
          <input type="checkbox" checked={audioOn} onChange={e=>setAudioOn(e.target.checked)} style={{accentColor:"var(--ac)"}}/>
          Auto-play words in Rapid Review
        </label>

        {secLabel("Account")}
        <div style={{background:"var(--s1)",borderRadius:9,padding:"12px 14px",fontSize:12,color:"var(--t2)"}}>
          <div style={{marginBottom:10}}>{user.anon ? "Guest account: progress is only saved on this device until you add an email or Google." : <>Signed in as <strong style={{color:"var(--t1)"}}>{user.email}</strong></>}</div>
          <div style={{display:"flex",gap:6}}>
            {user.anon&&<Btn onClick={()=>{setAuthForm(f=>({...f,error:null,info:null}));setScr("link");}} pri s={{flex:1}}>Save progress</Btn>}
            <Btn onClick={logout} s={{flex:1,background:"var(--s2)",color:"var(--dng)"}}>Log out</Btn>
          </div>
        </div>

        {!user.anon&&(<>
          {secLabel("Change password")}
          <div style={{background:"var(--s1)",borderRadius:9,padding:"12px 14px"}}>
            <p style={{fontSize:11,color:"var(--t3)",margin:"0 0 8px"}}>Forgot your password? Log in with “Email me a link instead”, then set a new one here. Signed in with Google? This adds a password too.</p>
            <Input type="password" placeholder="New password (6+ characters)" value={pwForm.pw1||""} onChange={e=>setPwForm(f=>({...f,pw1:e.target.value,msg:null}))} style={{marginBottom:6}}/>
            <Input type="password" placeholder="Repeat new password" value={pwForm.pw2||""} onChange={e=>setPwForm(f=>({...f,pw2:e.target.value,msg:null}))}
              onKeyDown={e=>{if(e.key==="Enter")changePassword();}} style={{marginBottom:8}}/>
            <Btn onClick={changePassword} pri dis={pwForm.busy} s={{width:"100%"}}>{pwForm.busy?"Saving…":"Update password"}</Btn>
            {pwForm.msg&&<p style={{fontSize:12,color:pwForm.ok?"var(--ac2)":"var(--dng)",margin:"8px 0 0"}}>{pwForm.msg}</p>}
          </div>
        </>)}
      </div>
    </div>
  );

  // ---- IN DEVELOPMENT (labs) ----
  if(scr==="labs") return (
    <div style={sh}>
      {backBar("🧪 In development")}
      <div style={{padding:"12px 16px 28px",maxWidth:440,margin:"0 auto"}}>
        <p style={{fontSize:11,color:"var(--t3)",margin:"0 0 12px"}}>Features that work but are still being built. Expect rough edges.</p>
        {[
          {i:"📄",t:"Analyze a text",d:"Paste any French text: see which words you don't know yet, sentence by sentence",go:()=>setScr("text")},
          {i:"🔗",t:"Family quiz",d:"Pick the word that belongs to the same word family",go:()=>startQuiz("family")},
          {i:"🌳",t:"Roots & patterns",d:"Suffixes and prefixes that build new words",go:()=>setScr("roots")},
          {i:"📋",t:"Mark a word list as known",d:"Paste any list of words (one per line or comma-separated), then tap “Mark all known”",go:()=>{setTxt("");setScr("text");}},
          {i:"📥",t:"Import known words",d:"Search and bulk-select words you already know (e.g. from WordBit)",go:()=>setScr("bulk")},
          {i:"🛠",t:"Contributors: add & fix words",d:"For the small contributor group: add missing words, fix translations, pronunciations and levels",go:()=>openContrib("")},
        ].map(x=>(
          <button key={x.t} onClick={x.go} style={{display:"flex",gap:12,alignItems:"center",width:"100%",textAlign:"left",background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:10,padding:"12px 14px",marginBottom:6,cursor:"pointer",color:"var(--t1)"}}>
            <span style={{fontSize:22}}>{x.i}</span>
            <span><strong style={{fontSize:13}}>{x.t}</strong><span style={{display:"block",fontSize:11,color:"var(--t3)",marginTop:2}}>{x.d}</span></span>
          </button>
        ))}
      </div>
    </div>
  );

  // ---- WORD LIST (browse / search / filter) ----
  const chipStyle=(on)=>({padding:"6px 12px",borderRadius:14,fontSize:12,border:"none",cursor:"pointer",background:on?"var(--ac)":"var(--s2)",color:on?"#fff":"var(--t2)"});
  if(scr==="words") return (
    <div style={sh}>
      {backBar("📚 Words")}
      <div style={{padding:"12px 16px 28px",maxWidth:440,margin:"0 auto"}}>
        <Input type="text" placeholder="Search..." value={srch} onChange={e=>setSrch(e.target.value)} style={{marginBottom:10}} />
        <div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}>
          {CEFR_LEVELS.map(l=><button key={l} onClick={()=>setFLv(fLv===l?null:l)} style={chipStyle(fLv===l)}>{l}</button>)}
        </div>
        <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
          {[...new Set(L.map(w=>w.g))].filter(g=>G_LABEL[g]).sort().map(g=><button key={g} onClick={()=>setFGr(fGr===g?null:g)} style={chipStyle(fGr===g)}>{G_LABEL[g]}</button>)}
        </div>

        <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>
          {vocab.length} words · spoken frequency ↓
          {vocab.length > LIST_LIMIT && ` · showing top ${LIST_LIMIT}, search or filter for more`}
        </div>
        {/* Word list */}
        {displayVocab.map(w=>{
          const s=st(w.id),ch=chain(w);
          return (
            <button key={w.id} onClick={()=>{setCur(w);setWordBack("words");setScr("word");}} style={{display:"block",width:"100%",textAlign:"left",background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:9,padding:"10px 12px",marginBottom:5,cursor:"pointer",color:"var(--t1)",borderLeftWidth:3,borderLeftColor:statusColor(s)}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14,fontWeight:600}}>{w.w}</span>
                  <span style={{fontSize:10,color:"var(--t3)"}}>/{toIPA(w.p)}/</span>
                  {ch>0&&<span style={{fontSize:8,color:"var(--acw)",background:"rgba(224,147,72,0.08)",padding:"1px 4px",borderRadius:5}}>🔗{ch}%</span>}
                </div>
                <div style={{display:"flex",gap:3}}><Tag>{w.lv}</Tag><Tag>{w.g}</Tag>{w.gn&&<Tag c={w.gn==="m"?"rgba(79,138,232,0.12)":"rgba(232,79,155,0.12)"}>{w.gn}</Tag>}</div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
		<span style={{fontSize:11,color:"var(--t2)"}}>{tr(w) || (w.lm!==w.w?`→ ${w.lm}`:"")}{w.fm.length>0?` · ${w.fm.length} forms`:""}</span>
                <span style={{fontSize:9,color:"var(--t3)"}}>{Math.round(w.fs)}/M</span>
              </div>
            </button>
          );
        })}

      </div>
    </div>
  );

  // ---- HOME ----
  return (
    <div style={sh}>
      <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
        <div>
          <button onClick={()=>{setScr("home");window.scrollTo({top:0,behavior:"smooth"});}} title="Home" style={{background:"none",border:"none",padding:0,cursor:"pointer",color:"var(--t1)"}}>
            <h1 style={{fontSize:17,fontWeight:700,margin:0}}>🇫🇷 Objectif Français</h1>
          </button>
          <span style={{display:"block",fontSize:9,color:"var(--t3)"}}>
            {user.email ? user.email.split("@")[0] : "Guest"} · {goal?.short||"Personal"}
            {sync!=="idle"&&<span style={{color:sync==="offline"?"var(--dng)":"var(--t3)"}}> · {sync==="saving"?"☁ saving…":sync==="saved"?"☁ saved":"☁ offline"}</span>}
          </span>
        </div>
        <div style={{display:"flex",gap:4}}>
          {user.anon&&<button onClick={()=>{setAuthForm(f=>({...f,error:null,info:null}));setScr("link");}} style={{background:"rgba(52,191,130,0.12)",border:"1px solid var(--ac2)",borderRadius:7,padding:"5px 9px",color:"var(--ac2)",fontSize:11,cursor:"pointer"}}>Save progress</button>}
          <button onClick={()=>setAudioOn(v=>!v)} title={audioOn?"Auto-play on":"Auto-play off"}
            style={{background:audioOn?"rgba(75,133,224,0.15)":"var(--s1)",border:`1px solid ${audioOn?"var(--ac)":"var(--s2)"}`,borderRadius:7,padding:"5px 9px",color:audioOn?"var(--ac)":"var(--t3)",fontSize:11,cursor:"pointer"}}>
            {audioOn?"🔊":"🔇"}
          </button>
          <button onClick={()=>setScr("settings")} title="Settings" style={{background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:7,padding:"5px 9px",color:"var(--t2)",fontSize:11,cursor:"pointer"}}>⚙</button>
        </div>
      </div>

      <div style={{padding:"12px 16px",maxWidth:440,margin:"0 auto"}}>
        {/* Stats */}
        <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
          {[{l:"Known",c:stats.k,cl:"var(--ac2)"},{l:"Familiar",c:stats.f,cl:"var(--acw)"},{l:"Learning",c:stats.l,cl:"var(--ac)"},{l:"New",c:stats.n,cl:"var(--t3)"}].map(s=>(
            <div key={s.l} style={{flex:"1 1 22%",minWidth:70,background:"var(--s1)",borderRadius:9,padding:"8px 0",textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:s.cl}}>{s.c}</div>
              <div style={{fontSize:9,color:"var(--t3)"}}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{height:5,borderRadius:3,background:"var(--s2)",marginBottom:12,overflow:"hidden",display:"flex"}}>
          <div style={{width:`${(stats.k/stats.t)*100}%`,background:"var(--ac2)"}}/>
          <div style={{width:`${(stats.f/stats.t)*100}%`,background:"var(--acw)"}}/>
          <div style={{width:`${(stats.l/stats.t)*100}%`,background:"var(--ac)"}}/>
        </div>

        {/* Actions */}
        <Btn onClick={()=>startQuiz("relation")} pri s={{width:"100%",padding:"14px 0",fontSize:15,marginBottom:6}}>▶ Start studying</Btn>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <Btn onClick={()=>setScr("rapid-setup")} s={{flex:1,background:"rgba(224,147,72,0.1)",color:"var(--acw)",border:"1.5px solid rgba(224,147,72,0.15)"}}>⚡ Rapid review</Btn>
          <Btn onClick={()=>startQuiz("meaning")} s={{flex:1,background:"var(--s2)",color:"var(--ac2)"}}>🇬🇧 Meaning</Btn>
          <Btn onClick={()=>startQuiz("audio")} s={{flex:1,background:"var(--s2)",color:"var(--ac)"}}>👂 Listen</Btn>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <Btn onClick={()=>setScr("words")} s={{flex:1,background:"var(--s2)"}}>📚 Browse words</Btn>
          <Btn onClick={()=>setScr("labs")} s={{flex:1,background:"var(--s2)",color:"var(--t2)"}}>🧪 In development</Btn>
        </div>

        {/* CTA */}
        <div style={{marginTop:16,padding:16,borderRadius:9,background:"linear-gradient(135deg,rgba(75,133,224,0.05),rgba(52,191,130,0.05))",border:"1px solid rgba(75,133,224,0.08)",textAlign:"center"}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:3}}>Need structured coaching?</div>
          <p style={{fontSize:11,color:"var(--t2)",margin:"0 0 8px"}}>1-on-1 TCF Canada prep · speaking · exam strategy</p>
          <Btn pri s={{padding:"8px 18px",fontSize:12}}>Book a session →</Btn>
        </div>
        <p style={{textAlign:"center",fontSize:9,color:"var(--t3)",padding:"14px 0 28px"}}>V3 · {L.length} words · Lexique 3.83 · Progress saved to account</p>
      </div>
    </div>
  );
}
