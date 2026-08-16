// ============================================================
// PASTE THIS AT THE TOP OF YOUR App.jsx, AFTER the imports
// ============================================================

// English translations for all 80 words (keyed by lemma)
const TRANSLATIONS = {
  "être":"to be","faire":"to do / to make","dire":"to say / to tell",
  "savoir":"to know (a fact)","vouloir":"to want","alors":"then / so",
  "pouvoir":"to be able to / can","aller":"to go","voir":"to see",
  "temps":"time / weather","homme":"man","croire":"to believe",
  "vie":"life","falloir":"to be necessary (il faut)","monde":"world",
  "jour":"day","penser":"to think","vrai":"true / real",
  "avant":"before","parler":"to speak / to talk","donner":"to give",
  "prendre":"to take","femme":"woman / wife","an":"year",
  "gens":"people","tête":"head","petit":"small / little",
  "aimer":"to love / to like","dieu":"god","père":"father",
  "maison":"house / home","après":"after","trouver":"to find",
  "mettre":"to put / to place","main":"hand","mort":"death / dead",
  "œil":"eye","comprendre":"to understand","besoin":"need",
  "nuit":"night","cœur":"heart","mère":"mother",
  "arriver":"to arrive / to happen","coup":"hit / blow / time",
  "ami":"friend","pays":"country","demander":"to ask",
  "côté":"side","appeler":"to call","laisser":"to leave / to let",
  "raison":"reason","attendre":"to wait","voiture":"car",
  "eau":"water","place":"place / square / seat","arrêter":"to stop",
  "passer":"to pass / to spend (time)","moment":"moment",
  "travail":"work / job","manger":"to eat","argent":"money / silver",
  "question":"question","terre":"earth / ground / land",
  "entendre":"to hear","bouger":"to move","idée":"idea",
  "chambre":"room / bedroom","beau":"beautiful / handsome",
  "chercher":"to look for / to search","guerre":"war",
  "route":"road / route","docteur":"doctor",
  "partie":"part / game","table":"table",
  "tellement":"so much / so","compte":"account / count",
  "police":"police","nombre":"number","matin":"morning",
  "grand":"big / tall / great"
};

// Helper: get translation for any word
function getTranslation(word) {
  // Try by lemma first, then by word form
  if (TRANSLATIONS[word.lm]) return TRANSLATIONS[word.lm];
  if (TRANSLATIONS[word.w]) return TRANSLATIONS[word.w];
  return null; // no translation available
}
