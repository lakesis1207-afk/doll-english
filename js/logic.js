// 화면과 상관없는 도우미: 단어 목록, 보기 고르기, 복습 목록, 받침 확인
// 브라우저에서는 window.Logic 으로, 테스트(node)에서는 require 로 써요.
(function (root) {
  const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = arr => arr[rand(0, arr.length - 1)];
  // 원래 배열은 그대로 두고 섞은 새 배열을 돌려줘요
  const shuffle = arr => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

  // 받침이 있으면 true (영어 이름 등은 받침 없음으로 봄)
  function hasBatchim(word) {
    const w = String(word || "");
    const c = w.charCodeAt(w.length - 1) - 0xac00;
    return c >= 0 && c <= 11171 && c % 28 !== 0;
  }
  const josa = (word, withB, withoutB) => word + (hasBatchim(word) ? withB : withoutB);

  // ---------- 단어 (소리 파일: w_단어, wh_단어, k_단어) ----------
  const NOUNS = [
    { key: "dog", emoji: "🐶", ko: "강아지", theme: "animal" },
    { key: "cat", emoji: "🐱", ko: "고양이", theme: "animal" },
    { key: "duck", emoji: "🦆", ko: "오리", theme: "animal" },
    { key: "pig", emoji: "🐷", ko: "돼지", theme: "animal" },
    { key: "bear", emoji: "🐻", ko: "곰", theme: "animal" },
    { key: "rabbit", emoji: "🐰", ko: "토끼", theme: "animal" },
    { key: "apple", emoji: "🍎", ko: "사과", theme: "food" },
    { key: "banana", emoji: "🍌", ko: "바나나", theme: "food" },
    { key: "strawberry", emoji: "🍓", ko: "딸기", theme: "food" },
    { key: "carrot", emoji: "🥕", ko: "당근", theme: "food" },
    { key: "milk", emoji: "🥛", ko: "우유", theme: "food" },
    { key: "egg", emoji: "🥚", ko: "달걀", theme: "food" },
  ];
  // 색깔 (소리 파일: col_색, pop_색)
  const COLORS = [
    { key: "red", hex: "#ff5a5f", ko: "빨강" },
    { key: "blue", hex: "#3d8bfd", ko: "파랑" },
    { key: "yellow", hex: "#ffd23f", ko: "노랑" },
    { key: "green", hex: "#3cc47c", ko: "초록" },
    { key: "orange", hex: "#ff9233", ko: "주황" },
    { key: "purple", hex: "#9b6bff", ko: "보라" },
  ];
  // 몸 동작 (소리 파일: act_동작)
  const ACTIONS = [
    { key: "jump", ico: "⬆️", text: "Jump!" },
    { key: "clap", ico: "👏", text: "Clap your hands!" },
    { key: "nose", ico: "👃", text: "Touch your nose!" },
    { key: "stomp", ico: "🦶", text: "Stomp your feet!" },
    { key: "turn", ico: "🔄", text: "Turn around!" },
    { key: "wave", ico: "👋", text: "Wave your hands!" },
    { key: "sit", ico: "⬇️", text: "Sit down!" },
    { key: "stand", ico: "🧍", text: "Stand up!" },
  ];
  // 인사 상황: 상황 설명(greet_장면) → 아이가 고를 말 → 친구의 대답
  const PHRASES = {
    hi: { ico: "🙋", text: "Hello!" },
    bye: { ico: "👋", text: "Bye-bye!" },
    thanks: { ico: "🙏", text: "Thank you!" },
    morning: { ico: "🌞", text: "Good morning!" },
    night: { ico: "🌙", text: "Good night!" },
  };
  const GREETS = [
    { scene: "come", ko: "친구가 놀러 왔어요.", answer: "hi", reply: "hi", sky: "#e6f3ff", prop: "🚪" },
    { scene: "go", ko: "친구가 집에 가요.", answer: "bye", reply: "bye", sky: "#ffeede", prop: "🏠" },
    { scene: "gift", ko: "친구가 선물을 줬어요.", answer: "thanks", reply: "welcome", sky: "#fff3c4", prop: "🎁" },
    { scene: "morning", ko: "아침이 밝았어요.", answer: "morning", reply: "morning", sky: "#fff7d6", prop: "🌞" },
    { scene: "night", ko: "이제 잘 시간이에요.", answer: "night", reply: "night", sky: "#2d3561", prop: "🌙" },
  ];
  // 알파벳 (소리 파일: abc_글자) — 한 번에 한 묶음씩
  const ABC = [
    ["A", "apple", "🍎"], ["B", "ball", "⚽"], ["C", "cat", "🐱"], ["D", "dog", "🐶"], ["E", "egg", "🥚"],
    ["F", "fish", "🐟"], ["G", "grapes", "🍇"], ["H", "hat", "🎩"], ["I", "insect", "🐞"], ["J", "juice", "🧃"],
    ["K", "kite", "🪁"], ["L", "lion", "🦁"], ["M", "moon", "🌙"], ["N", "nose", "👃"], ["O", "octopus", "🐙"],
    ["P", "pig", "🐷"], ["Q", "queen", "👸"], ["R", "rabbit", "🐰"], ["S", "sun", "☀️"], ["T", "tiger", "🐯"],
    ["U", "umbrella", "☂️"], ["V", "van", "🚐"], ["W", "whale", "🐳"], ["X", "fox", "🦊"], ["Y", "yo-yo", "🪀"],
    ["Z", "zebra", "🦓"],
  ].map(([letter, word, emoji]) => ({ letter, word, emoji, key: "abc_" + letter.toLowerCase() }));
  const ABC_GROUPS = [range(0, 5), range(6, 11), range(12, 18), range(19, 25)];

  // 그림책 2편: 장마다 그림, 글, 소리
  const STORIES = [
    {
      title: "Knock, knock!",
      pages: [
        ...["dog", "duck", "cat", "pig", "bear"].flatMap(a => [
          { kind: "door", text: "Knock, knock! Who is it?", key: "st1_knock" },
          { kind: "reveal", who: a, text: `It's the ${a}! Hello, ${a}!`, key: "st1_" + a },
        ]),
        { kind: "door", text: "Knock, knock! Who is it?", key: "st1_knock" },
        { kind: "reveal", who: "doll", text: "It's you! Hello, my friend!", key: "st1_end" },
      ],
    },
    {
      title: "I'm hungry!",
      pages: [
        { kind: "hungry", text: "I'm hungry!", key: "st2_start" },
        ...[["apple", "apples"], ["banana", "bananas"], ["strawberry", "strawberries"], ["carrot", "carrots"], ["milk", "milk"]]
          .map(([k, many]) => ({ kind: "eat", who: k, text: `I like ${many}! Yum, yum!`, key: "st2_" + k })),
        { kind: "full", text: "I'm full! Thank you!", key: "st2_end" },
      ],
    },
  ];

  // 정답 + 다른 것 (모두 count개, 순서 섞음)
  function choicesFor(answer, pool, count) {
    const others = shuffle(pool.filter(x => x !== answer)).slice(0, Math.max(0, count - 1));
    return shuffle([answer, ...others]);
  }

  // ---------- 복습 목록 (틀린 단어가 다음에 다시 나와요) ----------
  const REVIEW_MAX = 8;
  // 새 배열을 돌려줘요 (원래 목록은 그대로)
  function addReview(list, key) {
    return [...list.filter(k => k !== key), key].slice(-REVIEW_MAX);
  }
  const removeReview = (list, key) => list.filter(k => k !== key);
  // 복습할 단어가 있으면 반쯤은 그걸, 아니면 아무거나 (바로 앞 단어는 피해서)
  function pickWithReview(pool, review, last, rnd = Math.random) {
    const fresh = pool.filter(k => k !== last);
    const candidates = fresh.length ? fresh : pool;
    const due = candidates.filter(k => review.includes(k));
    const from = due.length && rnd() < 0.5 ? due : candidates;
    return from[Math.floor(rnd() * from.length) % from.length];
  }

  // ---------- 인형 이름 (등록을 건너뛰면 하나 골라 줌) ----------
  const DOLL_NAMES = ["토토", "몽이", "콩이", "보리", "뽀미", "꼬미", "단추", "호두"];
  const randomDollName = (rnd = Math.random) => DOLL_NAMES[Math.floor(rnd() * DOLL_NAMES.length) % DOLL_NAMES.length];

  // ---------- 휴대폰 뒤로가기: 지금 화면에서 어디로 갈지 ----------
  // "home" | "intro" | "photos" | "exit"(한 번 더 누르면 나가기) | "stay"(아무것도 안 함)
  function backTarget(screen, { setup, overlay }) {
    if (overlay) return "stay";
    if (screen === "game" || screen === "clear" || screen === "stickers") return "home";
    if (screen === "intro") return setup ? "home" : "exit";
    if (screen === "photos") return setup ? "home" : "intro";
    if (screen === "naming") return "photos";
    return "exit"; // 처음 화면, 쉬는 시간
  }

  // ---------- 이어 하기: 오늘 저장한 진도만 이어서 ----------
  function resumeScore(progress, stage, today) {
    if (!progress || progress.stage !== stage || progress.date !== today) return 0;
    return progress.score > 0 ? progress.score : 0;
  }

  const api = {
    rand, pick, shuffle, range, hasBatchim, josa,
    NOUNS, COLORS, ACTIONS, PHRASES, GREETS, ABC, ABC_GROUPS, STORIES,
    choicesFor, REVIEW_MAX, addReview, removeReview, pickWithReview,
    DOLL_NAMES, randomDollName, backTarget, resumeScore,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
