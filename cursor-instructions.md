# IMMEDIATE FIXES — Give this entire file to Cursor

## 1. ROULETTE MODE (replaces current broken quiz)

The current quiz shows random unrelated words as choices. That's useless.

Replace with Roulette Mode (how WordBit used to work):
- Show a French word BIG on screen (e.g., "accueillir")
- The English meaning is HIDDEN behind a card/blur
- User thinks of the meaning in their head
- User taps to REVEAL the English meaning (e.g., "to welcome, to receive")
- After reveal, user picks from THREE options:
  - ✓ Know it (green) — knew the exact meaning
  - ~ Familiar (amber) — close but not exact (e.g., thought "home" for accueillir)  
  - ✗ Don't know (red) — no idea

Scoring:
- "Know it" = full pass (same as before)
- "Familiar" = half pass (counts as 0.5, doesn't reset interval but doesn't advance it either)
- "Don't know" = fail (resets interval to 1)

A word needs 3 full passes to be "known". Familiar responses keep it in "learning" but track that you're close.

## 2. FIX THE IDENTIFY QUIZ

If keeping a multiple-choice quiz, the options MUST be related words, not random:
- Show forms of the SAME lemma (être → fut, serait, étant, suis)
- OR show words from the same root family (lent → lentement, ralentir, lenteur)
- OR show words that sound similar (tel → tellement, hôtel, autel)
- NEVER show completely unrelated words as options (no "gris-perle" next to "passé")

## 3. ENGLISH TRANSLATIONS

Every word MUST show an English translation. This is the #1 missing feature.

Since Lexique 3.83 has no English translations, add them:
- For now, use the browser's built-in fetch to call a free translation API
- OR hardcode translations for the top 500 most frequent words
- OR use this approach: when showing a word, call the Anthropic API to translate it (the app already has API access configured)

Display format on word cards:
```
accueillir
/akœjiʁ/
to welcome, to receive
```

## 4. PRONUNCIATION IN ENGLISH SYLLABLES

The IPA notation (like /akœjiʁ/) is not helpful for most learners.
Add an English-approximation pronunciation guide ALONGSIDE the IPA:

Examples:
- cirque → "SEHRK"
- accueillir → "ah-KUH-yeer"  
- tellement → "tel-MAWN"
- château → "sha-TOH"
- feuille → "FUH-yuh"

Generate these using a simple rule-based French-to-English-pronunciation mapper,
or call the API to generate them for each word on first view and cache the result.

## 5. THREE-TIER RATING EVERYWHERE

Replace ALL binary "Know it / Don't know" buttons with three options:

```
[Don't know]  [Familiar/Close]  [Know it ✓]
   red            amber            green
```

This applies to:
- Roulette mode
- Rapid Review
- Word detail screen
- Any review flow

The "Familiar" state is important because it represents partial knowledge —
the user recognizes the word but can't produce or precisely define it.

## 6. WORD DETAIL — CLICK TO SEE MEANING

When any word is tapped/clicked anywhere in the app, show:
- The French word (big)
- English translation
- IPA pronunciation
- English-syllable pronunciation guide
- Part of speech + gender
- Spoken/written frequency
- Word family members (clickable)
- Example sentence in French with English translation
- Status (known/familiar/learning/new)

## 7. AUTH PERSISTENCE  

Login state must survive page refresh and browser restart.
Use localStorage to store the session. On app load, check localStorage
for existing session before showing login screen.

## 8. AUDIO/TTS

Add a speaker icon next to every word. When tapped:
- Use the Web Speech API: `speechSynthesis.speak()`
- Set lang to 'fr-FR' (or 'fr-CA' if user's region is Canada)
- Set rate to 0.8 (slightly slower than default — this is for learners)
- Add a speed toggle: slow (0.6) / normal (0.8) / fast (1.0)

## 9. FAMILY QUIZ IS GOOD — EXPAND IT

The family quiz works well. Expand it:
- Show more family members (currently limited to a few)
- After answering, show ALL family members with their meanings
- Add a "Learn this family" mode where you go through all members sequentially
- When a family member is clicked, navigate to that word's detail view

## 10. KEEP RAPID REVIEW

The rapid review (scroll through words, tap know/don't know) stays.
Update it to use the three-tier rating (know/familiar/don't know).

## PRIORITY ORDER

1. English translations (without this, the app is unusable for learning)
2. Roulette mode (the core study loop)
3. Three-tier rating
4. Audio/TTS
5. Auth persistence
6. English-syllable pronunciation
7. Fix identify quiz options
8. Expand family quiz
