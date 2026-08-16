// src/data/relations.js
// COMMIT 1 — Semantic relations database
// Three relation types (kept separate, never conflated):
//   syn: synonyms/near-synonyms (semantic)
//   ant: antonyms (semantic)
//   rel: conceptually related (same domain/topic)
// Morphological family lives in the Lexique data (fm) — NOT here.
// Grow this file over time. Keys are lemmas.

export const RELATIONS = {
  // === ADJECTIVES ===
  "petit":   { syn: ["minuscule", "menu"], ant: ["grand", "gros"], rel: ["taille", "enfant"] },
  "grand":   { syn: ["immense", "vaste", "énorme"], ant: ["petit"], rel: ["taille", "hauteur"] },
  "beau":    { syn: ["joli", "magnifique", "splendide"], ant: ["laid", "moche"], rel: ["beauté", "apparence"] },
  "vrai":    { syn: ["exact", "réel", "véritable"], ant: ["faux"], rel: ["vérité", "réalité"] },
  "nouveau": { syn: ["récent", "neuf", "moderne"], ant: ["ancien", "vieux"], rel: ["nouveauté"] },
  "ancien":  { syn: ["vieux", "âgé"], ant: ["nouveau", "récent"], rel: ["passé", "histoire"] },
  "haut":    { syn: ["élevé", "grand"], ant: ["bas"], rel: ["hauteur", "sommet"] },
  "long":    { syn: ["étendu", "allongé"], ant: ["court", "bref"], rel: ["longueur", "durée"] },
  "seul":    { syn: ["unique", "isolé", "solitaire"], ant: ["accompagné", "ensemble"], rel: ["solitude"] },
  "bon":     { syn: ["excellent", "agréable"], ant: ["mauvais"], rel: ["qualité", "goût"] },
  "fort":    { syn: ["puissant", "robuste", "costaud"], ant: ["faible"], rel: ["force", "muscle"] },
  "faible":  { syn: ["fragile", "frêle"], ant: ["fort", "puissant"], rel: ["faiblesse"] },
  "lent":    { syn: ["tranquille"], ant: ["rapide", "vite"], rel: ["lenteur", "vitesse"] },
  "rapide":  { syn: ["vite", "prompt"], ant: ["lent"], rel: ["vitesse"] },
  "étroit":  { syn: ["serré", "resserré"], ant: ["large"], rel: ["largeur", "passage"] },
  "large":   { syn: ["vaste", "ample"], ant: ["étroit"], rel: ["largeur"] },
  "doux":    { syn: ["tendre", "moelleux", "suave"], ant: ["dur", "rude"], rel: ["douceur", "toucher"] },
  "dur":     { syn: ["solide", "rigide", "difficile"], ant: ["doux", "mou", "facile"], rel: ["dureté"] },
  "joli":    { syn: ["beau", "mignon", "charmant"], ant: ["laid"], rel: ["beauté"] },
  "blanc":   { syn: [], ant: ["noir"], rel: ["couleur", "neige", "lait"] },
  "noir":    { syn: ["sombre", "obscur"], ant: ["blanc", "clair"], rel: ["couleur", "nuit"] },
  "rouge":   { syn: ["écarlate", "vermeil"], ant: [], rel: ["couleur", "sang", "feu"] },
  "premier": { syn: ["initial"], ant: ["dernier"], rel: ["ordre", "début"] },
  "dernier": { syn: ["final", "ultime"], ant: ["premier"], rel: ["ordre", "fin"] },
  "tard":    { syn: ["tardivement"], ant: ["tôt"], rel: ["heure", "retard"] },

  // === VERBS ===
  "faire":      { syn: ["réaliser", "effectuer", "fabriquer"], ant: ["défaire"], rel: ["action", "travail"] },
  "dire":       { syn: ["déclarer", "affirmer", "raconter"], ant: ["taire"], rel: ["parole", "parler"] },
  "parler":     { syn: ["discuter", "bavarder", "causer"], ant: ["se taire"], rel: ["parole", "conversation"] },
  "voir":       { syn: ["regarder", "apercevoir", "observer"], ant: [], rel: ["vue", "œil", "vision"] },
  "regarder":   { syn: ["voir", "observer", "contempler"], ant: ["ignorer"], rel: ["vue", "attention"] },
  "aimer":      { syn: ["adorer", "apprécier", "chérir"], ant: ["détester", "haïr"], rel: ["amour", "cœur"] },
  "vouloir":    { syn: ["désirer", "souhaiter"], ant: ["refuser"], rel: ["volonté", "envie"] },
  "savoir":     { syn: ["connaître"], ant: ["ignorer"], rel: ["connaissance", "science"] },
  "comprendre": { syn: ["saisir", "piger"], ant: [], rel: ["compréhension", "intelligence"] },
  "prendre":    { syn: ["saisir", "attraper"], ant: ["donner", "laisser"], rel: ["main"] },
  "donner":     { syn: ["offrir", "fournir"], ant: ["prendre", "recevoir"], rel: ["cadeau", "générosité"] },
  "recevoir":   { syn: ["accueillir", "obtenir"], ant: ["donner", "envoyer"], rel: ["cadeau", "accueil"] },
  "accueillir": { syn: ["recevoir", "héberger"], ant: ["rejeter", "expulser"], rel: ["accueil", "hôte", "bienvenue"] },
  "trouver":    { syn: ["découvrir", "dénicher"], ant: ["perdre", "chercher"], rel: ["découverte"] },
  "chercher":   { syn: ["rechercher", "fouiller"], ant: ["trouver"], rel: ["recherche"] },
  "perdre":     { syn: ["égarer"], ant: ["trouver", "gagner"], rel: ["perte"] },
  "arriver":    { syn: ["parvenir", "atteindre"], ant: ["partir"], rel: ["arrivée", "voyage"] },
  "partir":     { syn: ["s'en aller", "quitter"], ant: ["arriver", "rester"], rel: ["départ", "voyage"] },
  "rester":     { syn: ["demeurer"], ant: ["partir", "bouger"], rel: ["immobilité"] },
  "commencer":  { syn: ["débuter", "entamer"], ant: ["finir", "terminer"], rel: ["début"] },
  "finir":      { syn: ["terminer", "achever"], ant: ["commencer"], rel: ["fin"] },
  "ouvrir":     { syn: ["déverrouiller"], ant: ["fermer"], rel: ["porte", "ouverture"] },
  "manger":     { syn: ["dévorer", "bouffer"], ant: ["jeûner"], rel: ["nourriture", "repas", "faim"] },
  "dormir":     { syn: ["sommeiller", "roupiller"], ant: ["veiller", "se réveiller"], rel: ["sommeil", "nuit", "lit"] },
  "courir":     { syn: ["sprinter", "galoper"], ant: ["marcher"], rel: ["course", "vitesse", "sport"] },
  "vivre":      { syn: ["exister", "habiter"], ant: ["mourir"], rel: ["vie"] },
  "mourir":     { syn: ["décéder", "périr"], ant: ["vivre", "naître"], rel: ["mort"] },
  "tomber":     { syn: ["chuter", "s'effondrer"], ant: ["se lever", "monter"], rel: ["chute"] },
  "monter":     { syn: ["grimper", "gravir"], ant: ["descendre", "tomber"], rel: ["montée", "escalier"] },
  "entendre":   { syn: ["écouter", "ouïr"], ant: [], rel: ["ouïe", "oreille", "son"] },
  "écrire":     { syn: ["rédiger", "noter"], ant: [], rel: ["écriture", "lettre", "stylo"] },
  "lire":       { syn: ["parcourir", "consulter"], ant: [], rel: ["lecture", "livre"] },
  "attendre":   { syn: ["patienter"], ant: [], rel: ["attente", "patience"] },
  "arrêter":    { syn: ["stopper", "cesser"], ant: ["continuer", "commencer"], rel: ["arrêt", "police"] },
  "demander":   { syn: ["questionner", "interroger", "solliciter"], ant: ["répondre"], rel: ["question"] },
  "répondre":   { syn: ["répliquer"], ant: ["demander"], rel: ["réponse", "question"] },

  // === NOUNS ===
  "maison":   { syn: ["demeure", "domicile", "logement"], ant: [], rel: ["habiter", "foyer", "toit"] },
  "travail":  { syn: ["boulot", "emploi", "métier"], ant: ["repos", "chômage"], rel: ["bosser", "bureau"] },
  "argent":   { syn: ["fric", "monnaie", "sous"], ant: [], rel: ["banque", "payer", "riche"] },
  "ami":      { syn: ["copain", "pote", "camarade"], ant: ["ennemi"], rel: ["amitié"] },
  "femme":    { syn: ["dame", "épouse"], ant: ["homme", "mari"], rel: ["mariage", "famille"] },
  "homme":    { syn: ["monsieur", "mari"], ant: ["femme"], rel: ["humanité", "famille"] },
  "enfant":   { syn: ["gamin", "gosse", "petit"], ant: ["adulte"], rel: ["famille", "école", "jeunesse"] },
  "père":     { syn: ["papa", "paternel"], ant: ["mère"], rel: ["famille", "parent"] },
  "mère":     { syn: ["maman", "maternelle"], ant: ["père"], rel: ["famille", "parent"] },
  "jour":     { syn: ["journée"], ant: ["nuit"], rel: ["matin", "soleil", "temps"] },
  "nuit":     { syn: ["soirée", "obscurité"], ant: ["jour"], rel: ["dormir", "lune", "sombre"] },
  "matin":    { syn: ["matinée", "aube"], ant: ["soir"], rel: ["réveil", "petit-déjeuner"] },
  "eau":      { syn: ["flotte"], ant: [], rel: ["boire", "mer", "rivière", "pluie"] },
  "guerre":   { syn: ["conflit", "combat"], ant: ["paix"], rel: ["armée", "soldat", "bataille"] },
  "mort":     { syn: ["décès", "trépas"], ant: ["vie", "naissance"], rel: ["mourir", "deuil"] },
  "vie":      { syn: ["existence"], ant: ["mort"], rel: ["vivre", "naître"] },
  "tête":     { syn: ["crâne", "caboche"], ant: [], rel: ["cerveau", "visage", "penser"] },
  "cœur":     { syn: [], ant: [], rel: ["amour", "sang", "battre", "émotion"] },
  "main":     { syn: [], ant: ["pied"], rel: ["doigt", "toucher", "tenir"] },
  "œil":      { syn: [], ant: [], rel: ["voir", "regard", "vue", "vision"] },
  "ville":    { syn: ["cité", "agglomération"], ant: ["campagne", "village"], rel: ["urbain", "rue"] },
  "pays":     { syn: ["nation", "état"], ant: [], rel: ["frontière", "patrie", "monde"] },
  "monde":    { syn: ["terre", "univers", "planète"], ant: [], rel: ["mondial", "gens"] },
  "temps":    { syn: ["durée", "époque", "météo"], ant: [], rel: ["heure", "horloge", "climat"] },
  "voiture":  { syn: ["auto", "bagnole", "véhicule"], ant: [], rel: ["conduire", "route", "garage"] },
  "route":    { syn: ["chemin", "voie"], ant: [], rel: ["voyage", "voiture", "conduire"] },
  "porte":    { syn: ["entrée", "portail"], ant: [], rel: ["ouvrir", "fermer", "clé", "maison"] },
  "chambre":  { syn: ["pièce"], ant: [], rel: ["lit", "dormir", "maison"] },
  "table":    { syn: [], ant: [], rel: ["chaise", "manger", "repas", "meuble"] },
  "question": { syn: ["interrogation", "demande"], ant: ["réponse"], rel: ["demander", "examen"] },
  "raison":   { syn: ["motif", "cause", "logique"], ant: ["tort", "folie"], rel: ["raisonner", "pourquoi"] },
  "idée":     { syn: ["pensée", "concept", "notion"], ant: [], rel: ["penser", "imagination"] },
  "moment":   { syn: ["instant", "période"], ant: [], rel: ["temps", "heure"] },
  "place":    { syn: ["endroit", "lieu", "siège"], ant: [], rel: ["espace", "position"] },
  "coup":     { syn: ["choc", "frappe"], ant: [], rel: ["frapper", "soudain"] },
  "besoin":   { syn: ["nécessité"], ant: [], rel: ["falloir", "manquer", "vouloir"] },
  "lettre":   { syn: ["courrier", "missive"], ant: [], rel: ["écrire", "poste", "alphabet"] },
  "sang":     { syn: [], ant: [], rel: ["cœur", "rouge", "veine", "blessure"] },
  "docteur":  { syn: ["médecin", "toubib"], ant: ["patient"], rel: ["hôpital", "santé", "soigner"] },
  "police":   { syn: ["flics", "forces de l'ordre"], ant: [], rel: ["arrêter", "crime", "loi"] },
  "roi":      { syn: ["monarque", "souverain"], ant: ["reine", "sujet"], rel: ["royaume", "couronne"] },
  "dieu":     { syn: ["divinité", "créateur"], ant: [], rel: ["religion", "prière", "ciel"] },
  "terre":    { syn: ["sol", "monde", "planète"], ant: ["ciel", "mer"], rel: ["terrain", "agriculture"] },
  "gens":     { syn: ["personnes", "monde", "individus"], ant: [], rel: ["population", "foule"] },
};

// Get all relation words for a lemma (flat list)
export function getRelated(lemma) {
  const r = RELATIONS[lemma];
  if (!r) return [];
  return [...(r.syn || []), ...(r.ant || []), ...(r.rel || [])];
}

// Get relations by type
export function getRelations(lemma) {
  return RELATIONS[lemma] || { syn: [], ant: [], rel: [] };
}

// Check if a lemma has relations data
export function hasRelations(lemma) {
  return lemma in RELATIONS;
}
