// 놀이 진행(문제 내기, 힌트, 칭찬)과 영어 놀이 8단계
// 원칙: 듣기 먼저, 말하기는 강요하지 않기 / 그림과 함께 듣기 / 틀린 단어는 다음에 다시
const GOAL = 5; // 한 단계에서 맞혀야 하는 수 (단계마다 바꿀 수 있음)
const G = { stage: 0, score: 0, goal: GOAL, qIndex: 0, current: null, busy: false, lastAnswer: null };

const STAGES = [
  { ico: "🃏", name: "단어 카드",   sub: "보고 듣기",         color: "var(--pink)",  tip: "아이가 누른 단어를 같이 말해 주세요.", play: () => qCards() },
  { ico: "👂", name: "듣고 고르기", sub: "Where is the dog?", color: "var(--sky)",   tip: "맞히면 \"Dog!\" 하고 같이 말해 주세요.", play: () => qListen(), resumable: true },
  { ico: "🎈", name: "색깔 풍선",   sub: "Pop the red balloon!", color: "var(--peach)", tip: "색깔 이름을 같이 말하며 터뜨려요.", play: () => qBalloon(), mission: "mission_red", resumable: true },
  { ico: "🤸", name: "따라 해요",   sub: "Jump! Clap!",       color: "var(--mint)",  tip: "부모님도 같이 몸으로 따라 해 주세요.", play: () => qAction(), mission: "mission_jump", resumable: true },
  { ico: "🤝", name: "친구 돕기",   sub: "Apple, please!",    color: "var(--sun)",   tip: "친구가 부탁한 걸 골라 건네줘요. \"Apple, please!\"를 같이 말해 보세요.", play: () => qHelp(), resumable: true },
  { ico: "👋", name: "인사 놀이",   sub: "Hello! Thank you!", color: "var(--lilac)", tip: "집에서도 상황마다 영어로 인사해 보세요.", play: () => qGreet(), mission: "mission_hello", resumable: true },
  { ico: "🔤", name: "알파벳 소리", sub: "A is for apple",    color: "var(--pink)",  tip: "글자를 못 읽어도 괜찮아요. 소리와 그림을 즐겨요.", play: () => qAbc(),
    onFinish: () => { settings.abcGroup = (settings.abcGroup + 1) % L.ABC_GROUPS.length; } },
  { ico: "📖", name: "영어 그림책", sub: "같이 읽어요",       color: "var(--sky)",   tip: "한 장씩 같이 따라 말해 보세요. 안 따라 해도 괜찮아요.", play: () => qBook() },
];

const noun = key => L.NOUNS.find(n => n.key === key);
const colorOf = key => L.COLORS.find(c => c.key === key);
const swatch = hex => `<span class="swatch-big" style="background:${hex}"></span>`;

// 이 단계를 처음 하는지 (처음이면 쉬운 범위 + 손가락 시범)
const firstTime = () => !settings.stars[G.stage];
const showDemo = target => { if (firstTime() && G.score === 0) setTimeout(() => demoHand(target), 400); };
// 단계의 첫 문제에서만 놀이 설명을 들려줘요
const intro = key => (G.qIndex === 1 ? key : null);
// 바로 앞과 다른 것 고르기
function pickAvoid(list, keyOf = x => x) {
  const pool = list.length > 1 ? list.filter(x => keyOf(x) !== G.lastAnswer) : list;
  const p = pick(pool);
  G.lastAnswer = keyOf(p);
  return p;
}

// ---------- 공통 진행 ----------
function renderDots() {
  const d = $("dots");
  d.innerHTML = "";
  for (let i = 0; i < G.goal; i++) d.appendChild(el("i", i < G.score ? "done" : ""));
}
// 말풍선 글 + 소리. 🔊 버튼은 keys만 다시 들려줘요 (놀이 설명은 처음 한 번만)
function ask(text, keys, introKey) {
  $("bubble").textContent = text;
  G.current.keys = keys;
  return say([introKey, ...keys]).then(armIdle);
}

// 8초 동안 아무것도 안 누르면 "스피커를 누르면 다시 들을 수 있어!" (문제마다 한 번만)
let idleT = null;
function armIdle() {
  clearTimeout(idleT);
  const q = G.current;
  if (!q || q.idleDone) return;
  idleT = setTimeout(() => {
    if (G.current !== q || G.busy || !$("game").classList.contains("on")) return;
    q.idleDone = true;
    $("sayBtn").classList.add("glow");
    setTimeout(() => $("sayBtn").classList.remove("glow"), 3000);
    say(["btn_speaker"]);
  }, 8000);
}
$("game").addEventListener("pointerdown", () => { if (idleT) armIdle(); });

function nextQuestion() {
  if (tired()) { goRest(); return; }
  G.busy = false;
  G.qIndex++;
  if (G.score === 0) G.goal = GOAL;
  paintDoll($("askDoll"));
  $("tip").textContent = "👩 " + STAGES[G.stage].tip;
  $("play").innerHTML = "";
  $("choices").innerHTML = "";
  $("choices").style.display = "";
  G.current = { misses: 0 };
  STAGES[G.stage].play();
  renderDots();
}

// 틀렸을 때: 응원 + 문제 다시 → (2번째) 반짝 힌트 → (3번째) 정답 알려 주기
function missed() {
  const q = G.current;
  q.misses++;
  sfx.wrong();
  if (q.word) { settings.review = L.addReview(settings.review, q.word); saveSettings(); }
  if (q.misses >= 3 && q.together) { q.together(); return; }
  if (q.misses >= 2 && q.glow) {
    const g = q.glow();
    if (g) g.classList.add("glow");
    say([cheerKey(), "hint"]);
    return;
  }
  // 응원은 한국어("괜찮아, 다시 해 보자!")와 영어("Let's try again!")를 번갈아
  say([Math.random() < 0.5 ? "e_again" : cheerKey(), ...(q.keys || [])]);
}
const glowAnswer = () => { const g = G.current.glow && G.current.glow(); if (g) g.classList.add("glow"); };

// 큰 그림 보기 (2~3개). onPick을 주면 직접 처리, 없으면 정답 비교
function pictureChoices(opts, onPick, box = $("choices")) {
  box.style.setProperty("--n", opts.length);
  opts.forEach(o => {
    const b = el("button", "choice emoji", o.html);
    b.dataset.v = o.v;
    b.setAttribute("aria-label", o.label || o.v);
    b.onclick = () => {
      if (G.busy || b.classList.contains("wrong")) return;
      if (onPick) { onPick(o.v, b); return; }
      if (o.v === G.current.answer) { b.classList.add("right"); correct(); }
      else { b.classList.add("wrong"); missed(); }
    };
    box.appendChild(b);
  });
  G.current.glow = G.current.glow || (() => [...box.children].find(b => b.dataset.v === String(G.current.answer)));
}

// 칭찬 화면: Good job! → 정답 단어 한 번 더
async function celebrate(showHtml, answerKey) {
  G.busy = true;
  stopSay();
  sfx.right();
  const [text, key] = pick(L.PRAISE);
  $("cheerSay").textContent = text;
  $("cheerBig").innerHTML = showHtml || "⭐";
  paintDoll($("cheerDoll"));
  $("overlay").classList.add("on");
  confetti();
  const started = Date.now();
  await sleep(350);
  await say([key, answerKey]);
  await sleep(Math.max(300, 2200 - (Date.now() - started)));
  $("overlay").classList.remove("on");
  if (G.score >= G.goal) finishStage(); else nextQuestion();
}
// 이어 하기: 맞힐 때마다 오늘 진도 저장 (짧은 놀이는 처음부터 다시 해서 저장 안 함)
function saveProgress() {
  if (!STAGES[G.stage].resumable) return;
  settings.progress = G.score < G.goal ? { stage: G.stage, score: G.score, date: today() } : null;
  saveSettings();
}
function correct() {
  const q = G.current;
  G.score++;
  saveProgress();
  renderDots();
  // 한 번에 맞힌 복습 단어는 복습 목록에서 빼요
  if (q.word && q.misses === 0) { settings.review = L.removeReview(settings.review, q.word); saveSettings(); }
  celebrate(q.show, q.answerKey);
}

// ---------- 둘러보기 (1단계 단어 카드, 7단계 알파벳): 틀림 없이 눌러서 듣기 ----------
function explore(items, introKey, bubble, cls) {
  G.goal = items.length;
  $("choices").style.display = "none";
  const grid = el("div", "cards " + cls);
  const heard = new Set();
  const btns = items.map((it, i) => {
    const b = el("button", "card", it.html);
    b.setAttribute("aria-label", it.label);
    b.onclick = () => {
      if (G.busy) return;
      sfx.tap();
      b.classList.remove("bounce"); void b.offsetWidth; b.classList.add("bounce", "open");
      const done = !heard.has(i) && heard.size + 1 === items.length;
      if (!heard.has(i)) { heard.add(i); G.score++; renderDots(); }
      if (done) G.busy = true;
      say([it.key]).then(() => { if (done) sleep(500).then(() => celebrate(it.show, null)); });
    };
    return b;
  });
  grid.append(...btns);
  $("play").appendChild(grid);
  ask(bubble, [], introKey);
  G.current.keys = [introKey];
  showDemo(btns[0]);
  G.current.glow = () => btns.find((_, i) => !heard.has(i));
}

// ---------- 1단계: 단어 카드 (동물 → 음식 → 몸 → 탈것 → 동물2 돌아가며) ----------
function qCards() {
  const theme = L.THEMES[(settings.stars[0] || 0) % L.THEMES.length];
  const words = L.NOUNS.filter(n => n.theme === theme);
  explore(words.map(w => ({
    html: `<span class="face">${w.emoji}</span><small class="pic">${w.key}</small>`,
    key: "w_" + w.key, label: w.key, show: w.emoji,
  })), "card_intro", "그림을 누르면 영어로 말해 줄게!", "words");
}

// ---------- 2단계: 듣고 고르기 (Where is the dog?) ----------
// 그림 보기를 아래가 아니라 가운데에 크게 (다시 듣기는 위의 🔊 버튼)
function qListen() {
  const pool = L.NOUNS.map(n => n.key);
  const key = L.pickWithReview(pool, settings.review, G.lastAnswer);
  G.lastAnswer = key;
  const n = noun(key);
  Object.assign(G.current, { answer: key, word: key, show: n.emoji, answerKey: "w_" + key });
  $("choices").style.display = "none";
  const big = el("div", "choices big-choices");
  $("play").appendChild(big);
  pictureChoices(L.choicesFor(key, pool, firstTime() ? 2 : 3).map(k => ({ v: k, html: noun(k).emoji })), null, big);
  ask(`Where is the ${key}?`, ["wh_" + key], intro("listen_intro"));
  showDemo(G.current.glow());
  G.current.together = () => { glowAnswer(); say(["hint", "w_" + key]); };
}

// ---------- 3단계: 색깔 풍선 (처음엔 3가지 색, 한 번 끝내면 5가지) ----------
function qBalloon() {
  const pool = (firstTime() ? L.COLORS.slice(0, 3) : L.COLORS).map(c => c.key);
  const key = L.pickWithReview(pool, settings.review, G.lastAnswer);
  G.lastAnswer = key;
  Object.assign(G.current, { answer: key, word: key, show: swatch(colorOf(key).hex), answerKey: "col_" + key });
  $("choices").style.display = "none";
  const sky = el("div", "sky");
  const colors = L.choicesFor(key, pool, 4);
  const heights = shuffle(range(0, colors.length - 1)); // 풍선 높이를 섞어서 시작
  let target = null;
  colors.forEach((c, i) => {
    const b = el("button", "balloon");
    const hex = colorOf(c).hex;
    b.setAttribute("aria-label", c + " balloon");
    // 하늘 너비 안에 고르게 (풍선 너비 92px가 오른쪽 밖으로 나가지 않게)
    b.style.left = `calc((100% - 100px) * ${i / Math.max(1, colors.length - 1)} + ${rand(2, 6)}px)`;
    b.style.background = hex;
    const dur = rand(7, 9); // 풍선이 하늘을 지나가는 시간(초)
    b.style.animationDuration = dur + "s";
    b.style.animationDelay = `-${((heights[i] + 0.5) * dur / colors.length * 0.8).toFixed(1)}s`;
    b.onclick = () => {
      if (G.busy) return;
      if (c !== key) { b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 600); missed(); return; }
      G.busy = true;
      sfx.pop();
      burst(sky, b, hex);
      b.classList.add("pop");
      setTimeout(correct, 500);
    };
    if (c === key) target = b;
    sky.appendChild(b);
  });
  $("play").appendChild(sky);
  ask(`Pop the ${key} balloon!`, ["pop_" + key], intro("balloon_intro"));
  // 힌트: 정답 풍선이 가운데로 와서 멈춘 채 반짝반짝
  const hintTarget = () => { target.classList.remove("wrong"); target.classList.add("glow", "hinted"); };
  G.current.glow = () => { hintTarget(); return null; };
  G.current.together = () => { hintTarget(); say(["hint", "col_" + key]); };
}

// 4단계 캐릭터: 어린아이 그림 (팔은 어깨·팔꿈치, 다리는 엉덩이를 축으로 움직여요)
const KID_SVG = `<svg class="kid" viewBox="0 0 120 170" aria-hidden="true"><g class="k-all">
<g class="k-tl"><rect x="47" y="118" width="10" height="20" rx="5" fill="#378ADD"/><rect x="47" y="134" width="10" height="20" rx="5" fill="#378ADD"/><rect x="42" y="150" width="16" height="8" rx="4" fill="#444441"/></g>
<g class="k-tr"><rect x="63" y="118" width="10" height="20" rx="5" fill="#378ADD"/><rect x="63" y="134" width="10" height="20" rx="5" fill="#378ADD"/><rect x="62" y="150" width="16" height="8" rx="4" fill="#444441"/></g>
<rect x="42" y="74" width="36" height="48" rx="14" fill="#F0997B"/>
<circle cx="60" cy="46" r="26" fill="#FFD9B8"/>
<path d="M34 44 Q36 16 60 18 Q86 18 86 44 Q78 30 62 30 Q46 30 34 44Z" fill="#633806"/>
<g class="k-eyes"><g class="k-blink"><circle cx="50" cy="48" r="3.2" fill="#2C2C2A"/><circle cx="70" cy="48" r="3.2" fill="#2C2C2A"/></g></g>
<circle cx="44" cy="57" r="4" fill="#F4C0D1"/><circle cx="76" cy="57" r="4" fill="#F4C0D1"/>
<path d="M53 59 Q60 66 67 59" stroke="#993C1D" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<g class="k-ul"><rect x="40" y="78" width="9" height="20" rx="4.5" fill="#D85A30"/><g class="k-fl"><rect x="40" y="94" width="9" height="18" rx="4.5" fill="#FFD9B8"/><circle cx="44.5" cy="113" r="5.5" fill="#FFD9B8"/></g></g>
<g class="k-ur"><rect x="71" y="78" width="9" height="20" rx="4.5" fill="#D85A30"/><g class="k-fr"><rect x="71" y="94" width="9" height="18" rx="4.5" fill="#FFD9B8"/><circle cx="75.5" cy="113" r="5.5" fill="#FFD9B8"/></g></g>
<g class="k-pop"><path d="M60 76 L60 70 M50 80 L46 76 M70 80 L74 76" stroke="#EF9F27" stroke-width="2.5" stroke-linecap="round"/></g>
</g></svg>`;

// ---------- 4단계: 따라 해요 (TPR: 몸으로 따라 하며 배우기, 틀림 없음) ----------
function qAction() {
  const a = pickAvoid(firstTime() ? L.ACTIONS.slice(0, 4) : L.ACTIONS, x => x.key);
  Object.assign(G.current, { answer: a.key, show: a.ico, answerKey: "act_" + a.key });
  $("choices").style.display = "none";
  // 그린 아이가 동작을 먼저 보여 줘요 (kid-동작 이름 클래스로 움직임)
  const doll = el("div", "kid-wrap", KID_SVG);
  const box = el("div", "act-stage");
  box.append(doll);
  const star = el("button", "star-btn", "⭐");
  star.setAttribute("aria-label", "따라 했어요");
  star.disabled = true;
  star.onclick = () => { if (!G.busy) correct(); };
  $("play").append(box, star);
  $("bubble").textContent = a.text;
  const q = G.current;
  q.keys = ["act_" + a.key];
  // 말 → 아이가 먼저 보여 주기 → 한 번 더 말하고 별 켜기
  q.replay = async () => {
    G.busy = true;
    star.disabled = true;
    doll.classList.remove("kid-" + a.key);
    await say([intro("act_intro"), "act_" + a.key]);
    if (G.current !== q) return;
    void doll.offsetWidth;
    doll.classList.add("kid-" + a.key);
    await sleep(2400);
    if (G.current !== q) return;
    G.busy = false;
    star.disabled = false;
    star.classList.add("glow");
    await say(["act_" + a.key, G.qIndex === 1 ? "act_done" : null]);
    armIdle();
  };
  q.replay();
}

// ---------- 5단계: 영어 친구 도와주기 (친구가 "Apple, please!" → 그림을 골라 건네주기) ----------
// 고른 그림이 친구에게 날아가요 (화면 위에 잠깐 복사본을 띄워 움직여요)
const FLY_MS = 700;
function flyTo(from, to, html) {
  const a = from.getBoundingClientRect(), z = to.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const f = el("div", "flyer", html);
  f.style.left = x0 + "px";
  f.style.top = y0 + "px";
  document.body.appendChild(f);
  void f.offsetWidth;
  f.style.transform = `translate(${z.left + z.width / 2 - x0}px, ${z.top + z.height / 2 - y0}px) scale(.6)`;
  return sleep(FLY_MS).then(() => f.remove());
}
function qHelp() {
  const pool = L.NOUNS.filter(n => n.ko).map(n => n.key); // 한국어 녹음이 있는 단어만
  const key = L.pickWithReview(pool, settings.review, G.lastAnswer);
  G.lastAnswer = key;
  const n = noun(key);
  Object.assign(G.current, { answer: key, word: key, show: n.emoji, answerKey: "w_" + key });
  const q = G.current;
  const talk = el("div", "help-talk", L.pleaseText(key));
  const friend = el("div", "help-friend", pick(L.FRIENDS));
  const scene = el("div", "help-scene");
  scene.append(talk, friend);
  $("play").appendChild(scene);
  pictureChoices(L.choicesFor(key, pool, firstTime() ? 2 : 3).map(k => ({ v: k, html: noun(k).emoji })), async (v, b) => {
    if (v !== key) { b.classList.add("wrong"); missed(); return; }
    // 맞음: 그림이 친구에게 날아가고 → "사과!" → 친구가 "Thank you!"
    G.busy = true;
    stopSay();
    sfx.tap();
    b.classList.add("right");
    await flyTo(b, friend, n.emoji);
    if (G.current !== q) return;
    friend.textContent = friend.textContent + n.emoji;
    friend.classList.add("happy");
    await say(["k_" + key]);
    if (G.current !== q) return;
    talk.textContent = "Thank you!";
    await say(["thanks"]);
    if (G.current !== q) return;
    correct();
  });
  ask(L.pleaseText(key), ["pl_" + key], intro("listen_intro"));
  showDemo(q.glow());
  q.together = () => { glowAnswer(); say(["hint", "pl_" + key]); };
}

// ---------- 6단계: 인사 놀이 (상황 → 알맞은 영어 인사 고르기) ----------
function qGreet() {
  const g = pickAvoid(firstTime() ? L.GREETS.slice(0, 3) : L.GREETS, x => x.scene);
  const friend = pick(L.NOUNS.filter(n => n.theme === "animal"));
  const keys = Object.keys(L.PHRASES);
  Object.assign(G.current, { answer: g.answer, show: L.PHRASES[g.answer].ico, answerKey: null });
  const scene = el("div", "scene scene-" + g.scene);
  scene.style.background = g.sky;
  const pal = el("div", "pal", friend.emoji);
  const talk = el("div", "talk");
  scene.append(el("div", "prop", g.prop), pal, talk);
  $("play").appendChild(scene);
  const q = G.current;
  pictureChoices(L.choicesFor(g.answer, keys, firstTime() ? 2 : 3).map(k => ({
    v: k, html: `${L.PHRASES[k].ico}<small>${L.PHRASES[k].text}</small>`, label: L.PHRASES[k].text,
  })), async (v, b) => {
    G.busy = true;
    await say([v]);
    if (G.current !== q) return;
    if (v !== g.answer) { G.busy = false; b.classList.add("wrong"); missed(); return; }
    b.classList.add("right");
    // 친구가 대답해요 (Thank you! → You're welcome!)
    talk.textContent = g.reply === "welcome" ? "You're welcome!" : L.PHRASES[g.reply].text;
    talk.classList.add("on");
    pal.classList.add("happy");
    await say([g.reply]);
    if (G.current !== q) return;
    correct();
  });
  ask(g.ko + " 뭐라고 말할까?", ["greet_" + g.scene, "greet_q"]);
  q.together = () => { glowAnswer(); say(["hint", g.answer]); };
}

// ---------- 7단계: 알파벳 소리 (A~Z를 4묶음으로 나눠 하나씩) ----------
function qAbc() {
  const group = L.ABC_GROUPS[settings.abcGroup % L.ABC_GROUPS.length].map(i => L.ABC[i]);
  explore(group.map(a => ({
    html: `<b>${a.letter}<i>${a.letter.toLowerCase()}</i></b><span class="pic">${a.emoji}</span>`,
    key: a.key, label: a.letter, show: a.letter + a.emoji,
  })), "abc_intro", "글자를 누르면 소리가 나와요!", "abc");
}

// ---------- 8단계: 영어 그림책 (짧고 반복되는 이야기, 부모와 함께) ----------
function bookPicture(p) {
  const pic = el("div", "book-pic " + p.kind);
  const dollFace = () => { const d = el("div", "doll book-doll"); paintDoll(d); return d; };
  if (p.kind === "door") pic.append(el("span", "door", "🚪"));
  else if (p.kind === "reveal") {
    pic.append(el("span", "door open", "🚪"));
    pic.append(p.who === "doll" ? dollFace() : el("span", "who", noun(p.who).emoji));
  } else if (p.kind === "hungry") pic.append(dollFace(), el("span", "who", "🍽️"));
  else if (p.kind === "eat") pic.append(dollFace(), el("span", "who chomp", noun(p.who).emoji));
  else if (p.kind === "art") {
    if (p.cls) pic.classList.add(p.cls);
    p.art.forEach(t => {
      const flies = t[0] === "^";
      const tok = flies ? t.slice(1) : t;
      let node;
      if (tok === "@doll") node = dollFace();
      else if (tok.startsWith("b:")) { node = el("span", "mini-balloon"); node.style.background = colorOf(tok.slice(2)).hex; }
      else node = el("span", "who", tok);
      if (flies) node.classList.add("fly");
      pic.append(node);
    });
  }
  else pic.append(dollFace(), el("span", "who", "💖"));
  return pic;
}
// 별점이 오르는 장면 (문 열기, 먹기, point 표시한 장)
const scoresPage = p => p.point || p.kind === "reveal" || p.kind === "eat";
function qBook() {
  const story = L.STORIES[(settings.stars[G.stage] || 0) % L.STORIES.length];
  const scored = story.pages.filter(scoresPage).length;
  G.goal = scored;
  $("choices").style.display = "none";
  $("bubble").textContent = story.title;
  const book = el("div", "book-page");
  const nextBtn = el("button", "color-btn next small");
  nextBtn.setAttribute("aria-label", "다음 장");
  const wrap = el("div", "book-wrap");
  wrap.append(book, nextBtn);
  $("play").appendChild(wrap);
  const q = G.current;
  let at = -1;

  async function turn() {
    if (G.busy) return;
    at++;
    const p = story.pages[at];
    if (!p) return;
    G.busy = true;
    book.innerHTML = "";
    const pic = bookPicture(p);
    book.append(pic, el("p", "book-text", p.text));
    if (p.kind === "door") sfx.knock();
    if (p.kind === "eat") sfx.chomp();
    if (scoresPage(p)) { G.score++; renderDots(); }
    q.keys = [p.key];
    const first = at === 0;
    await say([first ? "book_intro" : null, first ? "book_parent" : null, p.key, first ? "book_next" : null]);
    if (G.current !== q) return;
    if (at === story.pages.length - 1) {
      await say(["book_end"]);
      if (G.current !== q) return;
      celebrate("📖", null);
      return;
    }
    G.busy = false;
    nextBtn.classList.add("glow");
    armIdle();
  }
  const go = () => { nextBtn.classList.remove("glow"); sfx.tap(); turn(); };
  book.onclick = go;
  nextBtn.onclick = go;
  G.current.glow = () => nextBtn;
  turn();
  showDemo(nextBtn);
}
