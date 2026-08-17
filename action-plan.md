# Action Plan — Objectif Français

_Last updated: Aug 16, 2026 · Exam: Aug 20, 2026_
_This file records next changes and operations. Update as you go._

---

## 🔴 BEFORE EXAM (Aug 16–20) — do ONLY these

- [ ] **Import 243 WordBit words** into the app (browser console — see IMPORT-INSTRUCTIONS.md)
- [ ] **Run Rapid Review** on all levels to find real vocabulary gaps
- [ ] **Buy TCF practice questions** from reussir-tcfcanada.com
- [ ] **Study** — focus on weakest sections (writing, then listening)
- [ ] **Reply to testers**: "Accounts coming after Aug 20, hold off till then"
- [ ] DO NOT touch app code. DO NOT set up Supabase. DO NOT migrate files.

---

## 🟡 IMMEDIATELY AFTER EXAM (Aug 20–22)

### Supabase (cross-device accounts) — the #1 real fix
- [ ] Create Supabase project (supabase.com, free tier)
- [ ] Run the SQL schema (profiles + progress tables, RLS policies) — in COMMIT-PLAN.md
- [ ] Disable email confirmation OR set up email verification (reviewer wants verification)
- [ ] Build on a separate branch: `git checkout -b supabase`
- [ ] Get URL + anon key → `.env.local`
- [ ] Add `src/lib/supabase.js`
- [ ] Replace `handleAuth` with Supabase auth (email/username/password)
- [ ] Add debounced cloud sync (upsert progress every 2s)
- [ ] Test locally, THEN deploy to prod
- [ ] Add Vercel env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Auth scope (agreed with Doorgesh)
1. Email + username + password + email verification (FIRST)
2. Google (later)
3. Facebook (later, maybe)
4. LinkedIn (consider — fits immigration/work-permit audience)
- Principle: one login at a time, each is separate work

---

## 🟢 WEEK 1 AFTER EXAM — replace WordBit 80% → 100%

### Data expansion
- [ ] Expand `relations.js` (currently ~100 words → grow to 500+)
- [ ] Expand `TR` translations (currently ~150 → grow to top 3,000)
- [ ] Expand `concepts.js` emoji map (currently ~90 → grow)
- [ ] Handle the 63 unmatched WordBit phrases (full sentences — separate "phrases" mode?)

### Features WordBit had / should have
- [ ] Paste-your-list import (textbox → match to dictionary → mark known)
- [ ] Study mode: show word with meaning covered, tap to reveal (WordBit "cover" mode)
- [ ] Timed rapid review (listening speed training)
- [ ] Domain vocab modules: tech/phone, workplace, immigration, housing, healthcare
- [ ] False friends database (vrais/faux/semi-faux/faux-faux amis)

### Quiz improvements
- [ ] Picture quiz (concept → pick image) — PRD vision
- [ ] More relation types beyond syn/ant

---

## 🔵 INFRASTRUCTURE / DEVOPS

- [ ] Rename domain: `objectif-francais.vercel.app` → memorable (racines.app? frenchbit.vercel.app?)
- [ ] See names-and-branding.md — leading choice: **Racines**
- [ ] Set up auto-weekly Git push (GitHub Action or cron)
- [ ] Rule: push on every major change + at least once/week
- [ ] Decide WSL vs native Windows 11 dev env (NOTE: no server needed — Vercel+Supabase are cloud)

### Folder structure (correct — maintain)
```
~/Developer/
├── french-learning-business/   personal, non-techy, private
├── troubleshoot/               bugs, fixes, updates, screenshots
└── objectif-francais/          the app — user-facing, GitHub/Vercel
```

---

## 🟣 AI TOOLING (decide post-exam)

- Current: Claude Pro ($20) for architecture/data + Cursor for building
- Considered: Cline + Ollama (qwen2.5-coder:14b) local — but tool-calling was buggy
- Decision: keep what works during crunch; optimize cost later
- If dropping to one paid service: Claude Pro + local model, test quality first

---

## 📌 KEY FACTS / DECISIONS (reference)

- **Backend choice: Supabase** (SQL fits progress data; free tier covers <500 users). Reevaluate at 500+.
- **No server to keep running** — Vercel (app) + Supabase (data) are both cloud-hosted 24/7.
- **WordBit progress recovered**: 243 words matched (148 known, 46 familiar, 49 learning) from unencrypted user.db.
- **Dictionary**: Lexique 3.83, 46,792 lemmas, CC-BY-SA.
- **Data model**: one row per user×word (ps/fl/fam/iv/t), NOT a JSON blob.
- **Sync design** (when built): local cache + Supabase canonical + per-word timestamp merge (newer wins at word level).

---

## ✅ DONE

- [x] Decompiled + analyzed 3 WordBit APK versions (identical dict, ad bloat)
- [x] Built React app: auth, rapid review, quiz, chain learning, family quiz
- [x] Loaded full Lexique 3.83 dictionary (46,792 words)
- [x] Three-tier rating (know/familiar/don't know)
- [x] TTS audio with speed control
- [x] Quiz overhaul: relations, meaning, audio modes (quality-filtered pool)
- [x] Emoji concepts (Racines PRD v0)
- [x] Deployed to Vercel (live)
- [x] localStorage persistence
- [x] Recovered WordBit progress from Google Drive backups
- [x] Repo hygiene (moved PNGs/docs out of public repo)
