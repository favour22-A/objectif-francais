import { useState, useCallback, useMemo, useEffect } from "react";

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
const normalizeLexique = (raw) => raw.map(({ id, w, l, p, g, gn, lv, fs, fw, sy, fm }) => ({ id, w, lm: l, p, g: normG(g), gn, lv, fs, fw, sy, fm: fm || [] }));
const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LIST_LIMIT = 200;

const EXAMS={fm:{name:"Francophone Mobility (C16)",exam:"TCF Canada",sk:["speaking","listening"],desc:"NCLC 5+ speaking & listening",nclc:{listening:5,speaking:5},cefr:"B1"},pr:{name:"PR — Express Entry / PNP",exam:"TCF Canada",sk:["listening","speaking","reading","writing"],desc:"NCLC 7+ all skills",nclc:{listening:7,speaking:7,reading:7,writing:7},cefr:"B2"},cit:{name:"Citizenship",exam:"TCF Canada",sk:["listening","speaking"],desc:"NCLC 4+ speaking & listening",nclc:{listening:4,speaking:4},cefr:"A2–B1"},per:{name:"Personal",exam:null,sk:["listening","speaking","reading","writing"],desc:"Learn at your pace",nclc:null,cefr:null}};
const REGIONS={FR:"France",CA:"Canada",BE:"Belgique",AF:"Afrique francophone"};
const RF={FR:"🇫🇷",CA:"🇨🇦",BE:"🇧🇪",AF:"🌍"};
const SUFFIXES=[{s:"-ment",from:"adj(fem)",to:"adverb",ex:"lente→lentement",r:"Add -ment to feminine adj"},{s:"-tion/-sion",from:"verb",to:"noun",ex:"informer→information",r:"Action/result"},{s:"-eur/-euse",from:"verb",to:"person",ex:"travailler→travailleur",r:"Doer"},{s:"-able/-ible",from:"verb",to:"adj",ex:"comprendre→compréhensible",r:"Can be done"},{s:"re-/ré-",from:"verb",to:"again",ex:"faire→refaire",r:"Do again"},{s:"dé-/des-",from:"verb",to:"opposite",ex:"faire→défaire",r:"Undo"}];
// ============ ENGLISH TRANSLATIONS ============
const TR = {
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
const tr = (w) => TR[w.lm] || TR[w.w] || null;
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

// ============ AUDIO (French TTS via Web Speech API) ============
const speakFrench = (text, rate = 0.92) => {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  window.speechSynthesis.speak(u);
};

// ============ COMPONENTS ============
const V={"--bg":"#0A0D12","--s1":"#12161E","--s2":"#1A2030","--s3":"#242D3E","--ac":"#4B85E0","--ac2":"#34BF82","--acw":"#E09348","--t1":"#E2E6EE","--t2":"#8892A6","--t3":"#4A5366","--dng":"#E05454","--card":"#14181F"};
const sh={...V,background:"var(--bg)",color:"var(--t1)",minHeight:"100vh",fontFamily:"'Inter','SF Pro Text',system-ui,sans-serif"};
const Tag=({children,c})=><span style={{padding:"2px 7px",borderRadius:10,background:c||"var(--s2)",fontSize:10,color:"var(--t2)"}}>{children}</span>;
const Btn=({children,onClick,pri,dis,s:st})=><button onClick={onClick} disabled={dis} style={{padding:"11px 18px",borderRadius:9,border:"none",fontSize:13,fontWeight:600,cursor:dis?"default":"pointer",background:pri?"var(--ac)":"var(--s1)",color:pri?"#fff":"var(--t1)",opacity:dis?.4:1,transition:"all .15s",...st}}>{children}</button>;
const Input=({...props})=><input {...props} style={{width:"100%",padding:"11px 14px",borderRadius:9,border:"1.5px solid var(--s2)",background:"var(--s1)",color:"var(--t1)",fontSize:14,outline:"none",boxSizing:"border-box",...props.style}} />;
const AudioBtn=({text,rate,label="🔊",s:st})=>(
  <button type="button" onClick={()=>speakFrench(text,rate)} title="Play pronunciation" aria-label="Play pronunciation"
    style={{background:"var(--s2)",border:"1px solid var(--s3)",borderRadius:8,padding:"6px 10px",fontSize:14,cursor:"pointer",color:"var(--t1)",lineHeight:1,...st}}>
    {label}
  </button>
);

export default function App(){
  // Dictionary state
  const [L, setL] = useState([]);
  const [dictLoading, setDictLoading] = useState(true);
  const [dictError, setDictError] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [authScr, setAuthScr] = useState("login"); // login | signup | forgot
  const [authForm, setAuthForm] = useState({email:"",password:"",error:null,loading:false});
  const [authChecked, setAuthChecked] = useState(false);

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
  const [bulkSrch, setBulkSrch] = useState("");
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

  const findWord = useCallback((form) => wordIndex.get(form.toLowerCase()), [wordIndex]);

  // Load dictionary + session on mount
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        const mod = await import("../data/lexique383_full.json");
        if (!cancelled) setL(normalizeLexique(mod.default));
      } catch (e) {
        if (!cancelled) setDictError(e.message || "Failed to load dictionary");
      } finally {
        if (!cancelled) setDictLoading(false);
      }
    })();
    (async()=>{
      const session = await DB.get("user-session");
      const lastEmail = localStorage.getItem(STORAGE_PREFIX + "last-email");
      if (lastEmail) setAuthForm(f => ({ ...f, email: lastEmail }));
      if (cancelled) return;
      if(session){
        setUser(session);
        const progress = await DB.get(`progress-${session.email}`);
        if(progress) setLrn(progress);
        const profile = await DB.get(`profile-${session.email}`);
        if(profile) setProf(profile);
        setScr("home");
      }
      setAuthChecked(true);
    })();
    return () => { cancelled = true; };
  },[]);

  // Save progress whenever it changes
  useEffect(()=>{
    if(user && Object.keys(lrn).length > 0){
      DB.set(`progress-${user.email}`, lrn);
    }
  },[lrn, user]);

  // Save profile
  useEffect(()=>{
    if(user && prof.goal){
      DB.set(`profile-${user.email}`, prof);
    }
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
    const pool = rapidLevel ? L.filter(w => w.lv === rapidLevel) : L;
    const w = pool[rapidIdx];
    if (w) speakFrench(w.w, audioRate);
  }, [scr, rapidIdx, rapidLevel, audioOn, audioRate, L]);

  // ============ AUTH ============
  const handleAuth = async (mode) => {
    setAuthForm(f=>({...f,loading:true,error:null}));
    const {email, password} = authForm;
    if(!email || !password){ setAuthForm(f=>({...f,error:"Email and password required",loading:false})); return; }
    if(password.length < 6){ setAuthForm(f=>({...f,error:"Password must be 6+ characters",loading:false})); return; }

    // Simple email/password auth via persistent storage
    // In production: replace with Supabase/Firebase auth calls
    if(mode === "signup"){
      const existing = await DB.get(`account-${email}`);
      if(existing){ setAuthForm(f=>({...f,error:"Account already exists. Log in instead.",loading:false})); return; }
      await DB.set(`account-${email}`, {email, passwordHash: btoa(password), created: Date.now()});
    } else {
      const account = await DB.get(`account-${email}`);
      if(!account){ setAuthForm(f=>({...f,error:"No account found. Sign up first.",loading:false})); return; }
      if(atob(account.passwordHash) !== password){ setAuthForm(f=>({...f,error:"Incorrect password.",loading:false})); return; }
    }

    const session = {email, loggedIn: Date.now()};
    await DB.set("user-session", session);
    localStorage.setItem(STORAGE_PREFIX + "last-email", email);
    setUser(session);

    // Load existing progress
    const progress = await DB.get(`progress-${email}`);
    if(progress) setLrn(progress);
    const profile = await DB.get(`profile-${email}`);
    if(profile){ setProf(profile); setScr("home"); }
    else setScr("onb");

    setAuthForm({email:"",password:"",error:null,loading:false});
  };

  const logout = async () => {
    await DB.del("user-session");
    setUser(null);
    setLrn({});
    setProf({goal:null,region:"CA"});
    setScr("onb");
    setAuthScr("login");
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
    if(e.ps>=1)return"learning";
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
    if(mode==="family"){
      const pool=L.filter(w=>w.fm.length>=2);const tgt=pool[Math.floor(Math.random()*pool.length)];
      const ans=tgt.fm[Math.floor(Math.random()*Math.min(tgt.fm.length,3))];
      const fakes=L.filter(w=>w.id!==tgt.id).sort(()=>Math.random()-.5).slice(0,2).map(w=>w.fm[0]||w.w);
      setQuiz({tgt,opts:[...fakes,ans].sort(()=>Math.random()-.5),ans,mode:"family",a:null,ok:null});
    } else {
      const pool=vocab.filter(w=>st(w.id)!=="known");if(pool.length<2)return;
      const tgt=pool[Math.floor(Math.random()*Math.min(pool.length,10))];
      const others=L.filter(w=>w.id!==tgt.id&&w.g===tgt.g).sort(()=>Math.random()-.5).slice(0,3);
      if(others.length<2)return;
      setQuiz({tgt,opts:[...others.map(o=>o.w),tgt.w].sort(()=>Math.random()-.5),ans:tgt.w,mode:"word",a:null,ok:null});
    }
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

  // ---- AUTH SCREEN ----
  if(!user) return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:380,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:4}}>🇫🇷</div>
          <h1 style={{fontSize:22,fontWeight:700,margin:"0 0 4px",letterSpacing:"-.5px"}}>Learn French. Actually.</h1>
          <p style={{color:"var(--t3)",fontSize:12,margin:0}}>Sign in to save your progress across devices</p>
        </div>

        <div style={{background:"var(--card)",borderRadius:12,padding:20,border:"1px solid var(--s2)"}}>
          <div style={{display:"flex",marginBottom:16,borderRadius:8,overflow:"hidden",border:"1px solid var(--s2)"}}>
            <button onClick={()=>setAuthScr("login")} style={{flex:1,padding:"9px 0",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:authScr==="login"?"var(--ac)":"var(--s1)",color:authScr==="login"?"#fff":"var(--t2)"}}>Log in</button>
            <button onClick={()=>setAuthScr("signup")} style={{flex:1,padding:"9px 0",border:"none",fontSize:13,fontWeight:600,cursor:"pointer",background:authScr==="signup"?"var(--ac)":"var(--s1)",color:authScr==="signup"?"#fff":"var(--t2)"}}>Sign up</button>
          </div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,color:"var(--t3)",display:"block",marginBottom:4}}>Email</label>
            <Input type="email" placeholder="you@example.com" value={authForm.email} onChange={e=>setAuthForm(f=>({...f,email:e.target.value,error:null}))} />
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"var(--t3)",display:"block",marginBottom:4}}>Password</label>
            <Input type="password" placeholder="6+ characters" value={authForm.password} onChange={e=>setAuthForm(f=>({...f,password:e.target.value,error:null}))}
              onKeyDown={e=>{if(e.key==="Enter")handleAuth(authScr);}} />
          </div>

          {authForm.error && <p style={{fontSize:12,color:"var(--dng)",margin:"0 0 10px",padding:"8px 10px",background:"rgba(224,84,84,0.08)",borderRadius:8}}>{authForm.error}</p>}

          <Btn onClick={()=>handleAuth(authScr)} pri dis={authForm.loading} s={{width:"100%",marginBottom:10}}>
            {authForm.loading ? "..." : authScr==="login" ? "Log in" : "Create account"}
          </Btn>

          <div style={{textAlign:"center",padding:"10px 0 4px",borderTop:"1px solid var(--s2)"}}>
            <p style={{fontSize:11,color:"var(--t3)",margin:0}}>
              🔒 Google login coming soon
            </p>
          </div>
        </div>

        <p style={{textAlign:"center",fontSize:10,color:"var(--t3)",marginTop:16}}>
          Your progress is saved and synced to your account
        </p>
      </div>
    </div>
  );

  // ---- ONBOARDING ----
  if(scr==="onb") return (
    <div style={{...sh,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:420,width:"100%"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <h1 style={{fontSize:22,fontWeight:700,margin:"0 0 4px"}}>Welcome, {user.email.split("@")[0]}</h1>
          <p style={{color:"var(--t3)",fontSize:12,margin:0}}>Set up your learning goal</p>
        </div>
        <label style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",display:"block",marginBottom:6}}>Why are you learning?</label>
        {Object.entries(EXAMS).map(([k,ex])=>(
          <button key={k} onClick={()=>setProf(p=>({...p,goal:k}))} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",marginBottom:4,background:prof.goal===k?"var(--s3)":"var(--s1)",border:prof.goal===k?"1.5px solid var(--ac)":"1.5px solid var(--s2)",borderRadius:9,color:"var(--t1)",cursor:"pointer",fontSize:13}}>
            <strong>{ex.name}</strong>
            <span style={{display:"block",fontSize:11,color:"var(--t3)",marginTop:1}}>{ex.desc}</span>
            {ex.nclc&&<span style={{fontSize:10,color:"var(--ac)",fontWeight:600}}>NCLC {Math.max(...Object.values(ex.nclc))}+ ≈ {ex.cefr}</span>}
          </button>
        ))}
        <label style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",display:"block",margin:"12px 0 6px"}}>Region</label>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:16}}>
          {Object.entries(REGIONS).map(([c,n])=>(
            <button key={c} onClick={()=>setProf(p=>({...p,region:c}))} style={{padding:"6px 12px",borderRadius:16,fontSize:11,border:"none",cursor:"pointer",background:prof.region===c?"var(--ac)":"var(--s2)",color:prof.region===c?"#fff":"var(--t2)"}}>{RF[c]} {n}</button>
          ))}
        </div>
        <Btn onClick={()=>prof.goal&&setScr("home")} pri dis={!prof.goal} s={{width:"100%"}}>Continue</Btn>
      </div>
    </div>
  );

  // ---- BULK IMPORT ----
  if(scr==="bulk") return (
    <div style={sh}>
      <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{setBulkMode(false);setBulkSelected(new Set());setScr("home");}} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
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
              <span style={{fontSize:11,color:"var(--t3)"}}>/{w.p}/</span>
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
    const pool = rapidLevel ? L.filter(w=>w.lv===rapidLevel) : L;
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
            <button key={lv||"all"} onClick={()=>{setRapidLevel(lv);setRapidIdx(0);setRapidStats({known:0,familiar:0,learning:0,total:0});setScr("rapid");}} style={{
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
          <button onClick={()=>setScr("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
          <span style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px"}}>Word Detail</span>
        </div>
        <div style={{padding:16,maxWidth:440,margin:"0 auto"}}>
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
              <h2 style={{fontSize:28,fontWeight:700,margin:0}}>{cur.w}</h2>
              <span style={{fontSize:12,color:"var(--t3)"}}>/{cur.p}/</span>
              <AudioBtn text={cur.w} rate={audioRate} s={{padding:"5px 8px",fontSize:13}} />
            </div>
            {tr(cur)&&<p style={{margin:"4px 0 0",fontSize:16,color:"var(--ac2)",fontWeight:500}}>{tr(cur)}</p>}
            <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
              <Tag>{cur.lv}</Tag><Tag>{cur.g}</Tag>
              {cur.gn&&<Tag c={cur.gn==="m"?"rgba(79,138,232,0.12)":"rgba(232,79,155,0.12)"}>{cur.gn==="m"?"masc.":"fém."}</Tag>}
            </div>
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
            <Btn onClick={()=>{mark(cur.id,"know");setScr("home");}} s={{background:"rgba(52,191,130,0.06)",color:"var(--ac2)",border:"1.5px solid rgba(52,191,130,0.15)"}}>Know it ✓</Btn>
            <Btn onClick={()=>{mark(cur.id,"familiar");setScr("home");}} s={{background:"rgba(224,147,72,0.06)",color:"var(--acw)",border:"1.5px solid rgba(224,147,72,0.15)"}}>Familiar / close ≈</Btn>
            <Btn onClick={()=>{mark(cur.id,"unknown");setScr("home");}} s={{background:"rgba(224,84,84,0.06)",color:"var(--dng)",border:"1.5px solid rgba(224,84,84,0.15)"}}>Don't know</Btn>
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
        <div style={{fontSize:10,color:"var(--t3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:12}}>{quiz.mode==="family"?"Which belongs to:":"Identify"}</div>
        <h2 style={{fontSize:32,fontWeight:700,margin:"0 0 4px"}}>{quiz.tgt.w}</h2>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24}}>
          <p style={{fontSize:12,color:"var(--t3)",margin:0}}>/{quiz.tgt.p}/ · {quiz.tgt.lm}</p>
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
          <div style={{display:"flex",gap:6}}><Btn onClick={()=>startQuiz("word")}>Next →</Btn><Btn onClick={()=>startQuiz("family")} s={{background:"var(--s2)",color:"var(--acw)"}}>🔗 Family →</Btn></div>
        </div>}
      </div>
    </div>
  );

  // ---- ROOTS ----
  if(scr==="roots") return (
    <div style={sh}>
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid var(--s2)"}}>
        <button onClick={()=>setScr("home")} style={{background:"none",border:"none",color:"var(--t2)",fontSize:16,cursor:"pointer"}}>←</button>
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

  // ---- HOME ----
  const ex=prof.goal?EXAMS[prof.goal]:null;
  return (
    <div style={sh}>
      <div style={{padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--s2)"}}>
        <div>
          <h1 style={{fontSize:17,fontWeight:700,margin:0}}>🇫🇷 French</h1>
          <span style={{fontSize:9,color:"var(--t3)"}}>
            {user.email.split("@")[0]} · {ex?.name||"Personal"}
            {ex?.nclc&&<span style={{color:"var(--ac)",fontWeight:600}}> · NCLC {Math.max(...Object.values(ex.nclc))}+</span>}
          </span>
        </div>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setAudioOn(v=>!v)} title={audioOn?"Auto-play on":"Auto-play off"}
            style={{background:audioOn?"rgba(75,133,224,0.15)":"var(--s1)",border:`1px solid ${audioOn?"var(--ac)":"var(--s2)"}`,borderRadius:7,padding:"4px 8px",color:audioOn?"var(--ac)":"var(--t3)",fontSize:10,cursor:"pointer"}}>
            {audioOn?"🔊":"🔇"}
          </button>
          <button onClick={()=>setScr("onb")} style={{background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:7,padding:"4px 8px",color:"var(--t2)",fontSize:10,cursor:"pointer"}}>⚙</button>
          <button onClick={logout} style={{background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:7,padding:"4px 8px",color:"var(--t3)",fontSize:10,cursor:"pointer"}}>↪ out</button>
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

        {/* Audio speed */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:11,color:"var(--t3)"}}>
          <span>Speech speed</span>
          <input type="range" min="0.6" max="1.2" step="0.05" value={audioRate}
            onChange={e=>setAudioRate(parseFloat(e.target.value))}
            style={{flex:1,accentColor:"var(--ac)"}} />
          <span>{audioRate.toFixed(2)}×</span>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
          <Btn onClick={()=>startQuiz("word")} pri s={{flex:1,padding:"10px 0"}}>▶ Quiz</Btn>
          <Btn onClick={()=>setScr("rapid-setup")} s={{flex:1,padding:"10px 0",background:"rgba(224,147,72,0.1)",color:"var(--acw)",border:"1.5px solid rgba(224,147,72,0.15)"}}>⚡ Rapid</Btn>
          <Btn onClick={()=>startQuiz("family")} s={{padding:"10px 12px",background:"var(--s2)",color:"var(--acw)"}}>🔗</Btn>
          <Btn onClick={()=>setScr("roots")} s={{padding:"10px 12px",background:"var(--s2)",color:"var(--acw)"}}>🌳</Btn>
          <Btn onClick={()=>setScr("bulk")} s={{padding:"10px 12px",background:"var(--s2)",color:"var(--ac2)"}}>📥</Btn>
        </div>

        {/* Search + filters */}
        <Input type="text" placeholder="Search..." value={srch} onChange={e=>setSrch(e.target.value)} style={{marginBottom:8}} />
        <div style={{display:"flex",gap:3,marginBottom:5,flexWrap:"wrap"}}>
          {CEFR_LEVELS.map(l=><button key={l} onClick={()=>setFLv(fLv===l?null:l)} style={{padding:"3px 8px",borderRadius:12,fontSize:10,border:"none",cursor:"pointer",background:fLv===l?"var(--ac)":"var(--s2)",color:fLv===l?"#fff":"var(--t2)"}}>{l}</button>)}
          <span style={{width:1,background:"var(--s2)",margin:"0 1px"}}/>
          {[...new Set(L.map(w=>w.g))].sort().map(g=><button key={g} onClick={()=>setFGr(fGr===g?null:g)} style={{padding:"3px 8px",borderRadius:12,fontSize:10,border:"none",cursor:"pointer",background:fGr===g?"var(--ac)":"var(--s2)",color:fGr===g?"#fff":"var(--t2)"}}>{g}</button>)}
        </div>

        <div style={{fontSize:10,color:"var(--t3)",marginBottom:6}}>
          {vocab.length} words · spoken frequency ↓
          {vocab.length > LIST_LIMIT && ` · showing top ${LIST_LIMIT} — search or filter for more`}
        </div>

        {/* Word list */}
        {displayVocab.map(w=>{
          const s=st(w.id),ch=chain(w);
          return (
            <button key={w.id} onClick={()=>{setCur(w);setScr("word");}} style={{display:"block",width:"100%",textAlign:"left",background:"var(--s1)",border:"1px solid var(--s2)",borderRadius:9,padding:"10px 12px",marginBottom:5,cursor:"pointer",color:"var(--t1)",borderLeftWidth:3,borderLeftColor:statusColor(s)}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14,fontWeight:600}}>{w.w}</span>
                  <span style={{fontSize:10,color:"var(--t3)"}}>/{w.p}/</span>
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
