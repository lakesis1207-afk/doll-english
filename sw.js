// 인터넷 없이도 앱이 열리도록 파일을 휴대폰에 저장해 두는 일꾼(서비스 워커)
// 앱 파일을 고치면 VERSION 숫자를 올려 주세요. 그래야 새 파일로 바뀌어요.
const VERSION = "v4";
const CACHE = "kkokkori-english-" + VERSION;

// 소리 파일: 영어는 Kokoro(af_bella), 한국어 안내는 클로바더빙 (숫자 앱과 같은 목소리)
const SOUND_KEYS = [
 "abc_a", "abc_b", "abc_c", "abc_d", "abc_e", "abc_f", "abc_g", "abc_h",
 "abc_i", "abc_intro", "abc_j", "abc_k", "abc_l", "abc_m", "abc_n", "abc_o",
 "abc_p", "abc_q", "abc_r", "abc_s", "abc_t", "abc_u", "abc_v", "abc_w",
 "abc_x", "abc_y", "abc_z", "act_clap", "act_done", "act_intro", "act_jump", "act_nose",
 "act_sit", "act_stand", "act_stomp", "act_turn", "act_wave", "balloon_intro", "book_end", "book_intro",
 "book_next", "book_parent", "btn_home", "btn_last", "btn_next", "btn_speaker", "bye", "card_intro",
 "cheer0", "cheer1", "cheer2", "clear", "col_blue", "col_green", "col_purple", "col_red",
 "col_yellow", "e_again", "e_awesome", "e_did", "e_good", "e_great", "e_super", "e_well",
 "greet_come", "greet_gift", "greet_go", "greet_morning", "greet_night", "greet_q", "hello_eng", "hi",
 "hint", "k_apple", "k_banana", "k_bear", "k_carrot", "k_cat", "k_dog", "k_duck",
 "k_egg", "k_milk", "k_pig", "k_rabbit", "k_strawberry", "listen_intro", "locked", "mission_hello",
 "mission_jump", "mission_red", "morning", "night", "opened", "pl_apple", "pl_banana", "pl_bear",
 "pl_carrot", "pl_cat", "pl_dog", "pl_duck", "pl_egg", "pl_milk", "pl_pig", "pl_rabbit",
 "pl_strawberry", "pop_blue", "pop_green", "pop_purple", "pop_red", "pop_yellow", "sleepy", "st1_bear",
 "st1_cat", "st1_dog", "st1_duck", "st1_end", "st1_knock", "st1_pig", "st2_apple", "st2_banana",
 "st2_carrot", "st2_end", "st2_milk", "st2_start", "st2_strawberry", "st3_basket", "st3_box", "st3_end",
 "st3_hat", "st3_start", "st3_tree", "st4_blue", "st4_end", "st4_green", "st4_purple", "st4_red",
 "st4_start", "st4_yellow", "st5_bear", "st5_cat", "st5_dog", "st5_duck", "st5_end", "st5_pig",
 "st5_start", "sticker", "thanks", "w_airplane", "w_apple", "w_banana", "w_bear", "w_bike",
 "w_boat", "w_bus", "w_car", "w_carrot", "w_cat", "w_chicken", "w_dog", "w_duck",
 "w_ear", "w_egg", "w_elephant", "w_eye", "w_fish", "w_foot", "w_frog", "w_hand",
 "w_lion", "w_milk", "w_monkey", "w_mouth", "w_nose", "w_pig", "w_rabbit", "w_strawberry",
 "w_train", "welcome", "wh_airplane", "wh_apple", "wh_banana", "wh_bear", "wh_bike", "wh_boat",
 "wh_bus", "wh_car", "wh_carrot", "wh_cat", "wh_chicken", "wh_dog", "wh_duck", "wh_ear",
 "wh_egg", "wh_elephant", "wh_eye", "wh_fish", "wh_foot", "wh_frog", "wh_hand", "wh_lion",
 "wh_milk", "wh_monkey", "wh_mouth", "wh_nose", "wh_pig", "wh_rabbit", "wh_strawberry", "wh_train",
];
const sounds = SOUND_KEYS.map(k => `sounds/${k}.mp3`);

const FILES = [
  "./", "index.html", "style.css", "js/logic.js", "js/core.js", "js/stages.js", "js/app.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", ...sounds,
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  // 앱 화면은 새 버전을 먼저 받아 보고, 인터넷이 없으면 저장된 것 쓰기
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./", copy));
        return res;
      }).catch(() => caches.match("./"))
    );
    return;
  }

  // 나머지(소리, 그림, 글꼴)는 저장된 것이 있으면 그걸 쓰고, 없으면 받아서 저장
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok || res.type === "opaque") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
