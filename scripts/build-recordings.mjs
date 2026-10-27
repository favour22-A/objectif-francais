// Builds public/recordings-fr.json: { word: "speaker" | "speaker|ext" } for every
// dictionary word that has a Lingua Libre recording, and prints coverage stats.
// Run from the project folder:  node scripts/build-recordings.mjs
// Needs Node 18+ and internet access to commons.wikimedia.org. Takes a few minutes.
import fs from "node:fs";

const API = "https://commons.wikimedia.org/w/api.php";
const CAT = "Category:Lingua Libre pronunciation-fra";
const UA = "ObjectifFrancais/0.4 (https://objectif-francais.vercel.app; cibitoru@gmail.com)";
const RE = /^File:LL-Q150 \(fra\)-(.+)-(.+)\.(wav|ogg|flac|mp3)$/i;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 1. Every French Lingua Libre file → word: first speaker found
const found = new Map();
let cont, pages = 0, files = 0;
do {
  const url = `${API}?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=500` +
    `&cmtitle=${encodeURIComponent(CAT)}` + (cont ? `&cmcontinue=${encodeURIComponent(cont)}` : "");
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) { console.error("HTTP", r.status, "- retrying in 5s"); await sleep(5000); continue; }
  const d = await r.json();
  for (const m of d.query?.categorymembers || []) {
    const x = m.title.match(RE);
    if (!x) continue;
    files++;
    const word = x[2].toLowerCase();
    if (!found.has(word)) found.set(word, x[3].toLowerCase() === "wav" ? x[1] : `${x[1]}|${x[3].toLowerCase()}`);
  }
  cont = d.continue?.cmcontinue;
  if (++pages % 20 === 0) console.log(`…${files} recordings, ${found.size} distinct words`);
  await sleep(150); // be polite to Wikimedia
} while (cont);
console.log(`Lingua Libre French: ${files} recordings, ${found.size} distinct words`);

// 2. Keep only words our dictionary knows (forms + base forms)
const dict = JSON.parse(fs.readFileSync("data/lexique383_full.json", "utf8"));
const out = {};
let hit = 0;
for (const e of dict) {
  for (const k of [e.w, e.l]) {
    const key = (k || "").toLowerCase();
    if (key && found.has(key)) out[key] = found.get(key);
  }
  if (found.has((e.w || "").toLowerCase())) hit++;
}
fs.writeFileSync("public/recordings-fr.json", JSON.stringify(out));

// 3. Coverage report
const byFreq = [...dict].sort((a, b) => (b.fs || 0) - (a.fs || 0));
const cov = (n) => {
  const top = byFreq.slice(0, n);
  const c = top.filter(e => found.has((e.w || "").toLowerCase())).length;
  return `${c}/${top.length} (${Math.round(c / top.length * 100)}%)`;
};
console.log(`Dictionary entries with a real recording: ${hit}/${dict.length} (${Math.round(hit / dict.length * 100)}%)`);
console.log(`Top 1,000 most spoken words: ${cov(1000)}`);
console.log(`Top 5,000 most spoken words: ${cov(5000)}`);
console.log(`Top 10,000 most spoken words: ${cov(10000)}`);
const missing = byFreq.slice(0, 500).filter(e => !found.has((e.w || "").toLowerCase())).map(e => e.w);
fs.writeFileSync("scripts/missing-recordings-top500.txt", missing.join("\n"));
console.log(`Top-500 words with no recording: ${missing.length} (list in scripts/missing-recordings-top500.txt)`);
console.log(`Wrote public/recordings-fr.json (${Object.keys(out).length} words)`);
