# Roadmap: Objectif Français

_Last verified against the code: Oct 23, 2026 (commit 0fb1046)._
_Replaces `action-plan.md`, `COMMIT-PLAN.md` and `cursor-instructions.md` (older versions remain in git history)._

Legend: ✅ done · 🟡 partly done · ⬜ not started

---

## 1. Accounts & sync (Supabase)

| Item | Status | Notes |
|---|---|---|
| Supabase project + `.env.local` + Vercel env vars | ✅ | Project `zztmouxtbspsngbnliyt`, US East |
| `profiles` + `progress` tables with RLS | 🟡 | SQL written; tables were missing on Oct 23. Re-run the create-tables SQL, then reload the app |
| Email + password login, email confirmation | ✅ | |
| Email-me-a-link login (also serves as password reset) | ✅ | Needs Supabase **Site URL** = Vercel address, or links go to `localhost:3000` |
| Change password (Settings) | ✅ | |
| Guest mode ("Try without an account") + upgrade to a real account | ✅ | Needs Anonymous sign-ins + manual linking enabled in Supabase |
| Google login | 🟡 | Code done; Google Cloud OAuth client + Supabase provider not configured yet |
| Facebook / LinkedIn login | ⬜ | Later; one login method at a time |
| Username (not just email) | ⬜ | Was in the original auth scope; not built |
| Session restore on refresh | ✅ | |
| Cloud sync: changed words only, 3 s after last change + on tab close; per-word newest-wins merge | ✅ | |
| Old local progress carried into account | ✅ | Automatic when the old key was the exact email; console snippet otherwise |
| Returning users skip onboarding | ✅ | |

## 2. Study features

| Item | Status | Notes |
|---|---|---|
| Three-tier rating (know / familiar / don't know) | ✅ | Word detail, Rapid Review, text analyzer |
| Rapid Review | ✅ | Auto-play audio, per-level |
| Relations quiz (synonym / opposite) | ✅ | Replaced the broken "identify" quiz |
| Meaning quiz, Listen (audio) quiz | ✅ | |
| Family quiz | ✅ | In 🧪 In development |
| Family quiz: show all members with meanings after answering, "Learn this family" mode | ⬜ | |
| **Roulette / cover mode** (meaning hidden, tap to reveal, then rate) | ⬜ | Core WordBit loop; Rapid Review currently shows the meaning straight away |
| Concept-first cards (emoji) | 🟡 | ~98 concepts; "meaning-first" toggle not built |
| English-syllable pronunciation ("ah-KUH-yeer") | ⬜ | |
| Example sentence on word detail | ⬜ | |
| Timed rapid review (listening speed) | ⬜ | |
| Picture quiz, more relation types | ⬜ | |
| Domain vocab modules (work, immigration, housing, health, tech) | ⬜ | |
| False-friends database | ⬜ | |
| Phrases mode (the 63 unmatched WordBit phrases) | ⬜ | |

## 3. Text & import (🧪 In development)

| Item | Status | Notes |
|---|---|---|
| Analyze a text: words matched to dictionary + your progress, unknown list, sentence-by-sentence view | ✅ | |
| Paste a word list → mark all known | ✅ | Via the text analyzer |
| Bulk import (search + select) | ✅ | |
| Import 243 recovered WordBit words | ⬜ | Never imported (only 4 words found in the old local data) |
| Text pipeline v2: phrases, CEFR estimate per text, splitting long texts, songs mode | ⬜ | See `rants_ideas.md` (private notes) |

## 4. Dictionary & content

| Item | Status | Notes |
|---|---|---|
| Lexique 3.83 loaded (46,792 entries) | ✅ | |
| **Rebuild dictionary from Lexique's full forms table** | ⬜ | Current file has ~1 form per word and no grammar words (le, de, et, à, nous, sont…). The analyzer works around this with rules |
| Community dictionary: contributors add / correct words, password-gated | ✅ | Tables `dict_entries`, `editors`, `app_secrets` |
| English translations: built-in table | 🟡 | ~146 words; target top 3,000 |
| Live translation (MyMemory) + cache | ✅ | Stopgap |
| Multi-sense translations (trop = too / so) | ⬜ | Critical: single meanings mislead |
| `relations.js` | 🟡 | ~105 words; target 500+ |
| `concepts.js` | 🟡 | ~98; grow |
| `roots.js` engine | ⬜ | Orphaned (not imported). Wire in or delete |

## 5. Audio

| Item | Status | Notes |
|---|---|---|
| TTS on every word, speed slider, auto-play toggle | ✅ | Default 0.92× |
| fr-CA voice when region = Canada | ⬜ | Always `fr-FR` today |
| Better voices / cloud TTS for common words | ⬜ | Some words sound bad |
| Human pronunciations (Forvo / Common Voice; video clips only after licensing check) | ⬜ | |

## 6. Interface

| Item | Status | Notes |
|---|---|---|
| Home: one Start button, Rapid / Meaning / Listen, Browse words, In development | ✅ | |
| Word list moved to Browse words; bigger filter chips | ✅ | |
| Settings page (goal, French variety, audio, account, password) | ✅ | |
| Onboarding reduced to 3 goals (Immigration / Personal / Work or school) | ✅ | Detailed exam questions later |
| Beginner / Intermediate / Advanced instead of CEFR codes | ⬜ | |
| Exam mode (study only what your exam tests) | ⬜ | |
| Regional variant notes (pastèque / melon d'eau) | 🟡 | Possible via contributor notes; no dedicated feature |

## 7. Infrastructure & repo

| Item | Status | Notes |
|---|---|---|
| Deployed on Vercel | ✅ | |
| Vercel ↔ GitHub auto-deploy | 🟡 | `vercel git connect` failed; fix Vercel GitHub app access |
| Dev setup scripts (Mint / WSL / Windows) + `change_os` | ✅ | In `Developer/loose_scripts` |
| Dev environment decision | ✅ | Native Windows + Linux, synced through git |
| Clean `src/`: duplicate `concepts.js` / `relations.js` / `srs.js`, unused `main.js`, `import.js`, `store.js`, `roots.js`, `app.jsx.archive/`, `oldcode/`, `apply-fixes.sh` | ⬜ | |
| Split `App.jsx` (~1,600 lines) into screens / engine / components | ⬜ | |
| Line endings on Windows (`git config core.autocrlf true`) | ⬜ | Stops ~30 files showing as modified |
| Rename / custom domain (leading choice: Racines) | ⬜ | |
| Shrink the 7 MB dictionary download | ⬜ | ~1.2 MB gzipped; slow on mobile |
| README (still the Vite template) | ⬜ | |

---

## Key decisions (reference)

- **Backend:** Supabase for accounts and data; Firebase Cloud Messaging only if push reminders are built. Review cost at ~1,000 users.
- **No server to run:** Vercel (app) + Supabase (data) are both hosted.
- **Data model:** one row per user × word (`ps`, `fl`, `fam`, `iv`, `t`), not a JSON blob.
- **Sync:** local cache + Supabase canonical, per-word newest-wins.
- **Dictionary:** Lexique 3.83 (CC-BY-SA) + community entries (`dict_entries`, ids ≥ 1,000,000 for new words).
- **WordBit data recovered:** 243 words (148 known, 46 familiar, 49 learning) from `user.db`.
- **Folders:** `objectif-francais/` = app (public); `troubleshoot/` + `french learning business/` = private notes, not in the repo.
