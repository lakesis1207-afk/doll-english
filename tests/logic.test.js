// 실행: node --test tests/logic.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const L = require("../js/logic.js");

const SOUNDS = new Set(fs.readdirSync(path.join(__dirname, "../sounds")).map(f => f.replace(/\.mp3$/, "")));

test("choicesFor: 정답 포함, 겹치지 않고, 개수 맞음", () => {
  const pool = L.NOUNS.map(n => n.key);
  for (let i = 0; i < 200; i++) {
    const c = L.choicesFor("dog", pool, 3);
    assert.strictEqual(c.length, 3);
    assert.ok(c.includes("dog"));
    assert.strictEqual(new Set(c).size, 3);
  }
  assert.deepStrictEqual(L.choicesFor("a", ["a"], 3), ["a"]);
});

test("addReview: 원래 목록을 바꾸지 않고, 겹치지 않고, 최대 개수 유지", () => {
  const base = ["dog"];
  const next = L.addReview(base, "cat");
  assert.deepStrictEqual(base, ["dog"]);
  assert.deepStrictEqual(next, ["dog", "cat"]);
  assert.deepStrictEqual(L.addReview(next, "dog"), ["cat", "dog"]);
  let list = [];
  for (let i = 0; i < 20; i++) list = L.addReview(list, "w" + i);
  assert.strictEqual(list.length, L.REVIEW_MAX);
  assert.strictEqual(list[list.length - 1], "w19");
});

test("removeReview: 빼고 새 배열", () => {
  const base = ["dog", "cat"];
  assert.deepStrictEqual(L.removeReview(base, "dog"), ["cat"]);
  assert.deepStrictEqual(base, ["dog", "cat"]);
});

test("pickWithReview: 바로 앞 단어는 피하고, 복습 단어를 자주 고름", () => {
  const pool = ["dog", "cat", "pig"];
  for (let i = 0; i < 200; i++) assert.notStrictEqual(L.pickWithReview(pool, [], "dog"), "dog");
  // 난수가 작으면(0.1) 복습 단어에서 고름
  assert.strictEqual(L.pickWithReview(pool, ["pig"], null, () => 0.1), "pig");
  // 하나뿐이면 같은 것이라도 고름
  assert.strictEqual(L.pickWithReview(["dog"], [], "dog"), "dog");
});

test("josa: 받침에 따라 조사 고르기", () => {
  assert.strictEqual(L.josa("토토", "이랑", "랑"), "토토랑");
  assert.strictEqual(L.josa("곰돌", "이랑", "랑"), "곰돌이랑");
});

test("알파벳 26개, 묶음이 빠짐없이 한 번씩", () => {
  assert.strictEqual(L.ABC.length, 26);
  const all = L.ABC_GROUPS.flat();
  assert.deepStrictEqual(all, L.range(0, 25));
});

test("앱이 쓰는 소리 파일이 모두 있음", () => {
  const keys = [
    ...L.NOUNS.flatMap(n => ["w_" + n.key, "wh_" + n.key, ...(n.ko ? ["k_" + n.key, "pl_" + n.key] : [])]),
    ...L.PRAISE.map(p => p[1]),
    ...L.COLORS.flatMap(c => ["col_" + c.key, "pop_" + c.key]),
    ...L.ACTIONS.map(a => "act_" + a.key),
    ...Object.keys(L.PHRASES),
    ...L.GREETS.flatMap(g => ["greet_" + g.scene, g.reply]),
    ...L.ABC.map(a => a.key),
    ...L.STORIES.flatMap(s => s.pages.map(p => p.key)),
    "hello_eng", "card_intro", "listen_intro", "balloon_intro", "act_intro", "act_done", "thanks",
    "greet_q", "abc_intro", "book_intro", "book_parent", "book_next", "book_end",
    "mission_red", "mission_hello", "mission_jump", "e_again",
    "hint", "cheer0", "cheer1", "cheer2", "locked", "clear", "sticker", "opened", "sleepy",
    "btn_home", "btn_speaker", "btn_next", "btn_last",
  ];
  const missing = keys.filter(k => !SOUNDS.has(k));
  assert.deepStrictEqual(missing, []);
});

test("서비스 워커가 소리 파일을 빠짐없이 저장함", () => {
  const src = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  const listed = new Set([...src.matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]));
  const missing = [...SOUNDS].filter(k => !listed.has(k));
  assert.deepStrictEqual(missing, []);
});

test("단어 카드 주제마다 단어가 있고, 부탁 문장은 첫 글자 대문자", () => {
  for (const t of L.THEMES) assert.ok(L.NOUNS.filter(n => n.theme === t).length >= 4, t);
  assert.ok(L.NOUNS.every(n => L.THEMES.includes(n.theme)));
  assert.strictEqual(L.pleaseText("apple"), "Apple, please!");
});

test("randomDollName: 후보 중 하나", () => {
  assert.strictEqual(L.randomDollName(() => 0), "토토");
  assert.strictEqual(L.randomDollName(() => 0.999), "호두");
  for (let i = 0; i < 50; i++) assert.ok(L.DOLL_NAMES.includes(L.randomDollName()));
});

test("backTarget: 뒤로가기로 갈 화면", () => {
  const set = { setup: true, overlay: false }, first = { setup: false, overlay: false };
  assert.strictEqual(L.backTarget("game", set), "home");
  assert.strictEqual(L.backTarget("clear", set), "home");
  assert.strictEqual(L.backTarget("stickers", set), "home");
  assert.strictEqual(L.backTarget("intro", set), "home");
  assert.strictEqual(L.backTarget("intro", first), "exit");
  assert.strictEqual(L.backTarget("photos", set), "home");
  assert.strictEqual(L.backTarget("photos", first), "intro");
  assert.strictEqual(L.backTarget("naming", first), "photos");
  assert.strictEqual(L.backTarget("home", set), "exit");
  assert.strictEqual(L.backTarget("rest", set), "exit");
  assert.strictEqual(L.backTarget("game", { setup: true, overlay: true }), "stay");
});

test("resumeScore: 오늘, 같은 단계, 1개 이상일 때만 이어 하기", () => {
  const p = { stage: 2, score: 3, date: "Mon" };
  assert.strictEqual(L.resumeScore(p, 2, "Mon"), 3);
  assert.strictEqual(L.resumeScore(p, 1, "Mon"), 0);
  assert.strictEqual(L.resumeScore(p, 2, "Tue"), 0);
  assert.strictEqual(L.resumeScore(null, 2, "Mon"), 0);
  assert.strictEqual(L.resumeScore({ stage: 2, score: 0, date: "Mon" }, 2, "Mon"), 0);
});
