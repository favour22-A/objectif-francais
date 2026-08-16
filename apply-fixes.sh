#!/bin/bash
# Run this from ~/Developer/objectif-francais/
# It patches src/App.jsx with quiz fix + rapid shuffle

FILE="src/App.jsx"
cp "$FILE" "$FILE.bak"
echo "Backed up to $FILE.bak"

# Fix 1: Replace the broken quiz startQuiz else branch
# Old code shows the target word as one of its own options (useless)
# New code shows family members as options instead

python3 << 'PYEOF'
import re

with open("src/App.jsx", "r") as f:
    code = f.read()

# 1. Fix quiz: replace the else branch of startQuiz
old_quiz = '''} else {
      const pool=vocab.filter(w=>st(w.id)!=="known");if(pool.length<2)return;
      const tgt=pool[Math.floor(Math.random()*Math.min(pool.length,10))];
      const others=L.filter(w=>w.id!==tgt.id&&w.g===tgt.g).sort(()=>Math.random()-.5).slice(0,3);
      if(others.length<2)return;
      setQuiz({tgt,opts:[...others.map(o=>o.w),tgt.w].sort(()=>Math.random()-.5),ans:tgt.w,mode:"word",a:null,ok:null});
    }'''

new_quiz = '''} else {
      const pool=vocab.filter(w=>st(w.id)!=="known");if(pool.length<2)return;
      const tgt=pool[Math.floor(Math.random()*Math.min(pool.length,10))];
      // Show family members + similar words as options (not random garbage)
      const familyOpts = (tgt.fm||[]).map(f => findWord(f)).filter(Boolean).filter(w => w.id !== tgt.id).slice(0,3).map(w => w.w);
      // Fill remaining slots with same-grammar words
      const used = new Set([tgt.w, ...familyOpts]);
      const fillers = L.filter(w => !used.has(w.w) && w.g === tgt.g).sort(() => Math.random() - 0.5);
      while (familyOpts.length < 3 && fillers.length > 0) { familyOpts.push(fillers.pop().w); }
      if(familyOpts.length<2)return;
      setQuiz({tgt,opts:[...familyOpts.slice(0,3),tgt.w].sort(()=>Math.random()-.5),ans:tgt.w,mode:"word",a:null,ok:null});
    }'''

code = code.replace(old_quiz, new_quiz)

# 2. Add shuffledPool state variable after rapidStats
old_state = 'const [rapidStats, setRapidStats] = useState({known:0,familiar:0,learning:0,total:0});'
new_state = old_state + '\n  const [shuffledPool, setShuffledPool] = useState([]);'
code = code.replace(old_state, new_state)

# 3. Fix rapid review to use shuffled pool
old_rapid_pool = "const pool = rapidLevel ? L.filter(w=>w.lv===rapidLevel) : L;\n    const w = pool[rapidIdx];"
new_rapid_pool = "const pool = shuffledPool.length > 0 ? shuffledPool : L;\n    const w = pool[rapidIdx];"
code = code.replace(old_rapid_pool, new_rapid_pool)

# 4. Fix rapid setup to shuffle when starting
old_rapid_start = "setRapidLevel(lv);setRapidIdx(0);setRapidStats({known:0,familiar:0,learning:0,total:0});setScr(\"rapid\");"
new_rapid_start = "const base=lv?L.filter(w=>w.lv===lv):L;setShuffledPool([...base].sort(()=>Math.random()-0.5));setRapidLevel(lv);setRapidIdx(0);setRapidStats({known:0,familiar:0,learning:0,total:0});setScr(\"rapid\");"
code = code.replace(old_rapid_start, new_rapid_start)

# 5. Fix the auto-play audio to use shuffled pool too
old_audio = "const pool = rapidLevel ? L.filter(w => w.lv === rapidLevel) : L;\n    const w = pool[rapidIdx];"
new_audio = "const pool2 = shuffledPool.length > 0 ? shuffledPool : L;\n    const w = pool2[rapidIdx];"
code = code.replace(old_audio, new_audio)

with open("src/App.jsx", "w") as f:
    f.write(code)

print("✓ Quiz fix applied (family members as options)")
print("✓ Rapid review shuffle applied")
print("✓ Audio auto-play updated for shuffle")

PYEOF

echo ""
echo "Done. Now run:"
echo "  npx vercel --prod"
