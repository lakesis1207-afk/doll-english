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
    // 영어로만 듣는 단어 (한국어 녹음 없음: 단어 카드, 듣고 고르기에만 나와요)
    { key: "nose", emoji: "👃", theme: "body" },
    { key: "eye", emoji: "👁️", theme: "body" },
    { key: "ear", emoji: "👂", theme: "body" },
    { key: "mouth", emoji: "👄", theme: "body" },
    { key: "hand", emoji: "✋", theme: "body" },
    { key: "foot", emoji: "🦶", theme: "body" },
    { key: "car", emoji: "🚗", theme: "vehicle" },
    { key: "bus", emoji: "🚌", theme: "vehicle" },
    { key: "train", emoji: "🚂", theme: "vehicle" },
    { key: "airplane", emoji: "✈️", theme: "vehicle" },
    { key: "bike", emoji: "🚲", theme: "vehicle" },
    { key: "boat", emoji: "⛵", theme: "vehicle" },
    { key: "fish", emoji: "🐟", theme: "animal2" },
    { key: "lion", emoji: "🦁", theme: "animal2" },
    { key: "elephant", emoji: "🐘", theme: "animal2" },
    { key: "monkey", emoji: "🐵", theme: "animal2" },
    { key: "frog", emoji: "🐸", theme: "animal2" },
    { key: "chicken", emoji: "🐔", theme: "animal2" },
  ];
  // 단어 카드는 이 순서로 주제를 돌아가며 보여 줘요
  const THEMES = ["animal", "food", "body", "vehicle", "animal2"];
  // 맞혔을 때 영어 칭찬 (소리 파일 이름)
  const PRAISE = [
    ["Good job!", "e_good"], ["Great listening!", "e_great"], ["Well done!", "e_well"],
    ["You did it!", "e_did"], ["Awesome!", "e_awesome"], ["Super!", "e_super"],
  ];
  // 영어 친구 도와주기: 부탁하는 친구 (단어 그림과 겹치지 않는 동물)
  const FRIENDS = ["🐼", "🦊", "🐨", "🐯", "🐧"];
  const pleaseText = key => key[0].toUpperCase() + key.slice(1) + ", please!";
  // 색깔 (소리 파일: col_색, pop_색)
  const COLORS = [
    { key: "red", hex: "#ff5a5f", ko: "빨강" },
    { key: "blue", hex: "#3d8bfd", ko: "파랑" },
    { key: "yellow", hex: "#ffd23f", ko: "노랑" },
    { key: "green", hex: "#3cc47c", ko: "초록" },
    { key: "purple", hex: "#9b6bff", ko: "보라" },
  ];
  // 몸 동작 (소리 파일: act_동작)
  const ACTIONS = [
    { key: "jump", ico: "⬆️", text: "Jump!" },
    { key: "clap", ico: "👏", text: "Clap your hands!" },
    { key: "nose", ico: "👃", text: "Touch your nose!" },
    { key: "stomp", ico: "🦶", text: "Stomp your feet!" },
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
    // 아래 3편은 그림을 art 목록으로 그려요: 이모지, "@doll"(인형 얼굴), "b:색"(풍선), 앞에 "^"면 날아가기
    {
      title: "Where is the duck?",
      pages: [
        { kind: "art", art: ["🦆", "❓"], text: "Where is the duck?", key: "st3_start" },
        { kind: "art", art: ["📦"], cls: "nope", text: "Is it in the box? No!", key: "st3_box", point: true },
        { kind: "art", art: ["🎩"], cls: "nope", text: "Is it under the hat? No!", key: "st3_hat", point: true },
        { kind: "art", art: ["🧺"], cls: "nope", text: "Is it in the basket? No!", key: "st3_basket", point: true },
        { kind: "art", art: ["🌳", "🦆"], cls: "found", text: "Is it behind the tree? Yes!", key: "st3_tree", point: true },
        { kind: "art", art: ["🦆", "👋"], text: "Here it is! Hello, duck!", key: "st3_end" },
      ],
    },
    {
      title: "Up, up, up!",
      pages: [
        { kind: "art", art: ["b:red", "b:blue", "b:yellow", "b:green", "b:purple"], text: "I have five balloons!", key: "st4_start" },
        ...["red", "blue", "yellow", "green", "purple"].map((c, i, all) => ({
          kind: "art", art: ["^b:" + c, ...all.slice(i + 1).map(x => "b:" + x)],
          text: `${c[0].toUpperCase() + c.slice(1)} balloon, up, up, up!`, key: "st4_" + c, point: true,
        })),
        { kind: "art", art: ["☁️", "👋"], text: "Bye-bye, balloons!", key: "st4_end" },
      ],
    },
    {
      title: "Good night!",
      pages: [
        { kind: "art", art: ["🌙", "🛏️"], cls: "night", text: "It's time for bed.", key: "st5_start" },
        ...[["dog", "🐶"], ["cat", "🐱"], ["duck", "🦆"], ["pig", "🐷"], ["bear", "🐻"]].map(([a, e]) => ({
          kind: "art", art: [e, "💤"], cls: "night", text: `Good night, ${a}!`, key: "st5_" + a, point: true,
        })),
        { kind: "art", art: ["@doll", "💤"], cls: "night", text: "Good night, my friend!", key: "st5_end" },
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
    NOUNS, THEMES, PRAISE, FRIENDS, pleaseText, COLORS, ACTIONS, PHRASES, GREETS, ABC, ABC_GROUPS, STORIES,
    choicesFor, REVIEW_MAX, addReview, removeReview, pickWithReview,
    DOLL_NAMES, randomDollName, backTarget, resumeScore,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== "undefined" ? window : globalThis);
