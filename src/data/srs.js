// src/data/concepts.js
// COMMIT 3 — Concept associations (Racines PRD: bind words to meaning, not translation)
// v1 uses emoji as imagery: free, instant, zero licensing.
// Later: replace with real images per PRD open question #3.
export const CONCEPTS = {
  "maison":"🏠","eau":"💧","manger":"🍽️","dormir":"😴","voiture":"🚗",
  "cœur":"❤️","œil":"👁️","main":"✋","tête":"🙂","nuit":"🌙",
  "jour":"☀️","matin":"🌅","route":"🛣️","porte":"🚪","table":"🪑",
  "argent":"💰","travail":"💼","docteur":"🩺","police":"👮","guerre":"⚔️",
  "ami":"🤝","femme":"👩","homme":"👨","enfant":"🧒","père":"👨‍👧","mère":"👩‍👧",
  "roi":"👑","dieu":"⛪","terre":"🌍","monde":"🌐","ville":"🏙️","pays":"🗺️",
  "lettre":"✉️","sang":"🩸","chambre":"🛏️","question":"❓","idée":"💡",
  "courir":"🏃","écrire":"✍️","lire":"📖","parler":"💬","voir":"👀",
  "entendre":"👂","aimer":"💕","mourir":"⚰️","vivre":"🌱","tomber":"📉",
  "ouvrir":"🔓","arrêter":"🛑","attendre":"⏳","chercher":"🔍","trouver":"🎯",
  "beau":"🌸","grand":"🦒","petit":"🐁","rouge":"🔴","blanc":"⚪","noir":"⚫",
  "fort":"💪","lent":"🐢","rapide":"⚡","doux":"🧸","dur":"🪨",
  "boire":"🥤","froid":"🥶","chaud":"🔥","soleil":"☀️","pluie":"🌧️",
  "neige":"❄️","arbre":"🌳","fleur":"🌸","chien":"🐕","chat":"🐈",
  "oiseau":"🐦","poisson":"🐟","pain":"🍞","fromage":"🧀","vin":"🍷",
  "café":"☕","lait":"🥛","pomme":"🍎","livre":"📚","école":"🏫",
  "musique":"🎵","téléphone":"📱","ordinateur":"💻","clé":"🔑","montre":"⌚",
  "main":"✋","pied":"🦶","bouche":"👄","nez":"👃","oreille":"👂",
  "content":"😊","triste":"😢","peur":"😨","colère":"😠","rire":"😂"
};
export const conceptFor = (w) => CONCEPTS[w.lm] || CONCEPTS[w.w] || null;
