# COMMIT PLAN — objectif-francais
# Three commits, in order. Each is self-contained and deployable.

═══════════════════════════════════════════════════════════
COMMIT 1: "fix: quiz word pipeline + semantic relations + audio quiz"
═══════════════════════════════════════════════════════════

FILES:
- NEW: src/data/relations.js  (provided — drop it in)
- EDIT: src/App.jsx  (3 changes below)

── Change 1.1: Add import at top of App.jsx (after the React import) ──

import { RELATIONS, getRelations, hasRelations } from "./data/relations.js";

── Change 1.2: Add quiz pool filter (paste after the `findWord` useCallback) ──

  // Quality-filtered pool for quizzes: common words only, no garbage
  const quizPool = useMemo(() => L.filter(w =>
    ["A1","A2","B1","B2"].includes(w.lv) &&
    w.fs >= 20 &&                    // at least 20/million spoken
    w.w.length >= 2 &&
    !w.w.includes(" ") &&            // no multi-word entries
    (tr(w) || hasRelations(w.lm))    // has translation OR relations data
  ), [L]);

── Change 1.3: REPLACE the entire startQuiz function with this ──

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
      // AUDIO QUIZ: hear the word, pick what you heard
      const tgt=pool[Math.floor(Math.random()*pool.length)];
      // distractors: same grammar, similar length (sound-alike-ish)
      const distractors=quizPool
        .filter(w=>w.id!==tgt.id&&w.g===tgt.g&&Math.abs(w.w.length-tgt.w.length)<=2)
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>w.w);
      if(distractors.length<2) return;
      setQuiz({tgt,opts:[...distractors,tgt.w].sort(()=>Math.random()-.5),ans:tgt.w,mode:"audio",a:null,ok:null});
      setTimeout(()=>speakFrench(tgt.w,audioRate),400);
    }
    else if(mode==="meaning"){
      // MEANING QUIZ: see French word, pick English meaning
      const trPool = pool.filter(w=>tr(w));
      if(trPool.length<4) return;
      const tgt=trPool[Math.floor(Math.random()*trPool.length)];
      const distractors=trPool.filter(w=>w.id!==tgt.id&&tr(w)!==tr(tgt))
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>tr(w));
      setQuiz({tgt,opts:[...distractors,tr(tgt)].sort(()=>Math.random()-.5),ans:tr(tgt),mode:"meaning",a:null,ok:null});
    }
    else {
      // RELATION QUIZ (replaces broken identify): pick the related word
      const relPool = pool.filter(w=>hasRelations(w.lm));
      if(relPool.length<1){ startQuiz("meaning"); return; }
      const tgt=relPool[Math.floor(Math.random()*relPool.length)];
      const rels=getRelations(tgt.lm);
      const allRel=[...rels.syn,...rels.ant];
      if(allRel.length===0){ startQuiz("meaning"); return; }
      const ans=allRel[Math.floor(Math.random()*allRel.length)];
      const isAnt=rels.ant.includes(ans);
      // distractors: unrelated words of same grammar
      const distractors=quizPool
        .filter(w=>w.id!==tgt.id&&w.lm!==tgt.lm&&!allRel.includes(w.w)&&!allRel.includes(w.lm))
        .sort(()=>Math.random()-.5).slice(0,3).map(w=>w.w);
      setQuiz({tgt,opts:[...distractors,ans].sort(()=>Math.random()-.5),ans,
        mode:"relation",relType:isAnt?"opposite":"similar",a:null,ok:null});
    }
    setScr("quiz");
  };

── Change 1.4: Update the quiz screen header to show mode-specific prompts ──
Find the quiz screen's prompt line:
  <div style={{...}}>{quiz.mode==="family"?"Which belongs to:":"Identify"}</div>

Replace with:
  <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>
    {quiz.mode==="family"?"Which belongs to the family of:"
     :quiz.mode==="audio"?"What did you hear? 🔊"
     :quiz.mode==="meaning"?"What does this mean?"
     :quiz.mode==="relation"?(quiz.relType==="opposite"?"Pick the OPPOSITE of:":"Pick a word SIMILAR to:")
     :"Identify"}
  </div>

── Change 1.5: For audio mode, HIDE the word (they must identify by ear) ──
Find: <h2 style={{fontSize:32,fontWeight:700,margin:"0 0 4px"}}>{quiz.tgt.w}</h2>
Replace with:
  <h2 style={{fontSize:32,fontWeight:700,margin:"0 0 4px"}}>
    {quiz.mode==="audio"&&!quiz.a?"🔊 ???":quiz.tgt.w}
  </h2>
  {quiz.mode==="audio"&&!quiz.a&&<AudioBtn text={quiz.tgt.w} rate={audioRate} label="🔊 Replay" s={{marginBottom:8}}/>}

── Change 1.6: Add quiz mode buttons on home screen ──
Find the Actions row (▶ Quiz button etc). Replace the Quiz button with:
  <Btn onClick={()=>startQuiz("relation")} pri s={{flex:1,padding:"10px 0"}}>▶ Relations</Btn>
  <Btn onClick={()=>startQuiz("meaning")} s={{flex:1,padding:"10px 0",background:"var(--s2)",color:"var(--ac2)"}}>🇬🇧 Meaning</Btn>
  <Btn onClick={()=>startQuiz("audio")} s={{padding:"10px 12px",background:"var(--s2)",color:"var(--ac)"}}>👂</Btn>

── Change 1.7: After-answer, show relation context (learning moment) ──
In the quiz answered section, after the "Correct!"/"Not quite" line, add:
  {quiz.mode==="relation"&&hasRelations(quiz.tgt.lm)&&(
    <div style={{fontSize:11,color:"var(--t2)",marginBottom:10,maxWidth:300}}>
      {getRelations(quiz.tgt.lm).syn.length>0&&<div>Similar: {getRelations(quiz.tgt.lm).syn.join(", ")}</div>}
      {getRelations(quiz.tgt.lm).ant.length>0&&<div>Opposite: {getRelations(quiz.tgt.lm).ant.join(", ")}</div>}
    </div>
  )}

GIT:
  git add src/data/relations.js src/App.jsx
  git commit -m "fix: quiz word pipeline with quality filter, semantic relations, audio+meaning quiz modes"

═══════════════════════════════════════════════════════════
COMMIT 2: "feat: Supabase auth + cross-device progress sync"
═══════════════════════════════════════════════════════════

PREREQS (do once, outside code):
1. Go to supabase.com → New project (free tier) → name: objectif-francais
2. Copy the Project URL and anon key from Settings → API
3. In Supabase SQL editor, run:

  create table profiles (
    id uuid references auth.users primary key,
    goal text, region text default 'CA',
    updated_at timestamptz default now()
  );
  create table progress (
    user_id uuid references auth.users,
    word_id int,
    ps int default 0, fl int default 0, fam int default 0,
    iv int default 1, t bigint,
    primary key (user_id, word_id)
  );
  alter table profiles enable row level security;
  alter table progress enable row level security;
  create policy "own profile" on profiles for all using (auth.uid() = id);
  create policy "own progress" on progress for all using (auth.uid() = user_id);

FILES:
- NEW: src/lib/supabase.js
- NEW: .env.local  (never commit this — add to .gitignore)
- EDIT: src/App.jsx (replace handleAuth, add sync)

── .env.local ──
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

── Install ──
npm install @supabase/supabase-js

── src/lib/supabase.js ──
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

── App.jsx: replace handleAuth ──
  const handleAuth = async (mode) => {
    setAuthForm(f=>({...f,loading:true,error:null}));
    const {email, password} = authForm;
    if(!email||!password){setAuthForm(f=>({...f,error:"Email and password required",loading:false}));return;}
    const fn = mode==="signup" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const {data, error} = await fn.call(supabase.auth, {email, password});
    if(error){setAuthForm(f=>({...f,error:error.message,loading:false}));return;}
    setUser({email: data.user.email, id: data.user.id});
    // load progress from cloud
    const {data: rows} = await supabase.from('progress').select('*').eq('user_id', data.user.id);
    if(rows?.length){
      const p={}; rows.forEach(r=>{p[r.word_id]={ps:r.ps,fl:r.fl,fam:r.fam,iv:r.iv,t:r.t};});
      setLrn(p);
    }
    const {data: prof} = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    if(prof?.goal){setProf({goal:prof.goal,region:prof.region});setScr("home");}
    else setScr("onb");
    setAuthForm({email:"",password:"",error:null,loading:false});
  };

── App.jsx: replace the progress-save useEffect ──
  useEffect(()=>{
    if(!user?.id||Object.keys(lrn).length===0) return;
    const t = setTimeout(async()=>{
      const rows = Object.entries(lrn).map(([wid,e])=>({
        user_id:user.id, word_id:parseInt(wid),
        ps:e.ps||0, fl:e.fl||0, fam:e.fam||0, iv:e.iv||1, t:e.t||Date.now()
      }));
      await supabase.from('progress').upsert(rows);
    }, 2000); // debounce 2s
    return ()=>clearTimeout(t);
  },[lrn, user]);

── Vercel env vars ──
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
npx vercel --prod

GIT:
  echo ".env.local" >> .gitignore
  git add .
  git commit -m "feat: Supabase auth + cross-device progress sync"

═══════════════════════════════════════════════════════════
COMMIT 3: "feat: concept-first word cards (Racines PRD alignment)"
═══════════════════════════════════════════════════════════

This starts the PRD vision: words bound to meaning via image + audio + context.

FILES:
- NEW: src/data/concepts.js — concept mappings for top words
- EDIT: word detail screen to show concept imagery

── src/data/concepts.js (starter — grow over time) ──
// Concept associations: emoji as v1 imagery (free, instant, no licensing)
// Later: replace emoji with real images per PRD open question #3
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
  "fort":"💪","lent":"🐢","rapide":"⚡","doux":"🧸","dur":"🪨"
};
export const conceptFor = (w) => CONCEPTS[w.lm] || CONCEPTS[w.w] || null;

── Word detail + rapid review: show concept above the word ──
  {conceptFor(w)&&<div style={{fontSize:64,marginBottom:8}}>{conceptFor(w)}</div>}

── Rapid review "meaning-first" toggle ──
Add a toggle: show concept FIRST, word hidden, then reveal.
This is the PRD's FR-2 (tap to reveal meaning via image+audio+context)
in its simplest possible form.

GIT:
  git add src/data/concepts.js src/App.jsx
  git commit -m "feat: concept-first word cards with emoji imagery (Racines v0)"

═══════════════════════════════════════════════════════════
REPO HYGIENE (do before commit 1)
═══════════════════════════════════════════════════════════

# Remove PNGs from Git history going forward:
git rm --cached *.png 2>/dev/null
echo "*.png" >> .gitignore
echo "*.jpg" >> .gitignore
echo ".env.local" >> .gitignore
echo "troubleshoot/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore images, env files, troubleshoot dir"

# Move business files OUT of the repo:
mv *.png ~/Developer/french-learning-business/ 2>/dev/null
mkdir -p ~/Developer/french-learning-business/troubleshoot
