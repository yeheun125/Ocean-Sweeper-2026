
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORAGE = {
  points: "surviveFishPoints",
  catches: "surviveFishCatches",
  releases: "surviveFishReleases",
  photos: "surviveFishCertifiedPhotos",
  quiz: "surviveFishQuizRewarded"
};

let points = Number(localStorage.getItem(STORAGE.points)) || 0;
let catches = readArray(STORAGE.catches);
let releases = readArray(STORAGE.releases);
let certifiedPhotos = readArray(STORAGE.photos);
let selectedPhoto = null;
let selectedPhotoUrl = "";
let lastAnalysis = null;
let toastTimer;

const fishEmoji = {
  rockfish: "🐟", flatfish: "🐟", "sea-bream": "🐠", mackerel: "🐟",
  "black-porgy": "🐠", "black-rockfish": "🐟", "ridged-eye-flounder": "🐟",
  "sea-bass": "🐟", yellowtail: "🐟", "greater-amberjack": "🐟", hairtail: "〰️",
  "spanish-mackerel": "🐟", flounder: "🐟", greenling: "🐟", "rock-bream": "🐠",
  "brown-croaker": "🐟", "white-croaker": "🐟", girella: "🐠",
  "marbled-rockfish": "🐟", mullet: "🐟", pufferfish: "🐡"
};

const products = [
  { id: "coffee", icon: "☕", name: "커피 교환권", description: "제휴 카페 아메리카노 예시 교환권", cost: 30 },
  { id: "gift", icon: "🎁", name: "기프트 카드", description: "온라인에서 사용할 수 있는 예시 카드", cost: 100 },
  { id: "culture", icon: "🎫", name: "문화상품권", description: "문화생활을 위한 예시 교환권", cost: 80 },
  { id: "fishing", icon: "🎣", name: "낚시용품점 할인", description: "친환경 낚시용품 10% 예시 할인권", cost: 50 }
];

const achievements = [
  { count: 1, icon: "🌱", title: "바다 새싹", text: "첫 방생 성공" },
  { count: 10, icon: "🎣", title: "착한 낚시왕", text: "10회 방생" },
  { count: 30, icon: "🐟", title: "물고기 친구", text: "30회 방생" },
  { count: 50, icon: "🌊", title: "부산 바다 지킴이", text: "50회 방생" }
];

function readArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveState() {
  localStorage.setItem(STORAGE.points, String(points));
  localStorage.setItem(STORAGE.catches, JSON.stringify(catches));
  localStorage.setItem(STORAGE.releases, JSON.stringify(releases));
  localStorage.setItem(STORAGE.photos, JSON.stringify(certifiedPhotos));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function todayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchView(name) {
  $$(".view").forEach((view) => { view.hidden = view.id !== `${name}-view`; });
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.go === name));
  if (name === "home") renderHome();
  if (name === "rewards") renderRewards();
  if (name === "collection") renderCollection();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$("[data-go]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.go)));
$$("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
$$("[data-report]").forEach((button) => button.addEventListener("click", () => $("#report-dialog").showModal()));
$("#ar-help").addEventListener("click", () => $("#help-dialog").showModal());

fishRules.forEach((fish) => {
  [$("#fish-type"), $("#release-fish")].forEach((select) => {
    const option = document.createElement("option");
    option.value = fish.id;
    option.textContent = fish.name;
    select.append(option);
  });
});

$("#release-date").value = todayLocal();
$("#release-date").max = todayLocal();

function renderHome() {
  const species = new Set(catches.map((item) => item.fishId));
  $("#header-points").textContent = formatNumber(points);
  $("#home-release-count").textContent = `${releases.length}회`;
  $("#home-species-count").textContent = `${species.size}종`;
  $("#home-streak").textContent = `${calculateStreak()}일`;
}

function calculateStreak() {
  const days = [...new Set(releases.map((item) => item.date))].sort().reverse();
  if (!days.length) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = new Date(`${days[index - 1]}T00:00:00`);
    const current = new Date(`${days[index]}T00:00:00`);
    if ((previous - current) / 86400000 === 1) streak += 1;
    else break;
  }
  return streak;
}

$$("[data-quiz]").forEach((button) => {
  button.addEventListener("click", () => {
    const result = $("#quiz-result");
    if (button.dataset.quiz === "wrong") {
      result.textContent = "다시 생각해 보세요.";
      result.style.color = "var(--red)";
      playTone(false);
      return;
    }
    if (!localStorage.getItem(STORAGE.quiz)) {
      points += 5;
      localStorage.setItem(STORAGE.quiz, "true");
      saveState();
      result.textContent = "정답! +5P";
      showToast("해양 퀴즈 보상 5P를 받았습니다.");
    } else {
      result.textContent = "정답입니다!";
    }
    result.style.color = "var(--green)";
    playTone(true);
    renderHome();
  });
});

$("#fish-photo").addEventListener("change", () => {
  const [file] = $("#fish-photo").files;
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("이미지 파일을 선택해 주세요.");
    return;
  }
  selectedPhoto = file;
  if (selectedPhotoUrl) URL.revokeObjectURL(selectedPhotoUrl);
  selectedPhotoUrl = URL.createObjectURL(file);
  $("#photo-preview").src = selectedPhotoUrl;
  $("#photo-preview").hidden = false;
  $("#upload-placeholder").hidden = true;
  $("#ar-stage").classList.add("has-photo");
  $("#ar-stage").style.backgroundImage = `url("${selectedPhotoUrl}")`;
  $("#ar-empty").hidden = true;
  $("#measure-line").hidden = false;
  const recommendation = demoRecognize(file);
  $("#fish-type").value = recommendation?.id || "";
  showToast(recommendation ? `AI 데모 추천: ${recommendation.name}` : "물고기 여부를 확인할 수 없습니다.");
});

function demoRecognize(file) {
  const name = file.name.toLowerCase();
  const nonFishWords = ["cat", "dog", "person", "car", "food", "고양이", "강아지", "사람", "자동차"];
  if (nonFishWords.some((word) => name.includes(word))) return null;
  const aliases = [
    ["mackerel", "고등어"], ["flatfish", "광어"], ["rockfish", "우럭"],
    ["sea-bream", "참돔"], ["puffer", "복어"], ["mullet", "숭어"], ["hairtail", "갈치"]
  ];
  const matched = aliases.find(([english, korean]) => name.includes(english) || name.includes(korean));
  if (matched) {
    const [english, korean] = matched;
    return fishRules.find((fish) => fish.id.includes(english) || fish.name === korean) || fishRules[0];
  }
  return fishRules[file.size % fishRules.length];
}

$("#length-range").addEventListener("input", () => {
  const value = Number($("#length-range").value).toFixed(1);
  $("#length-output").textContent = `${value}cm`;
  $("#measure-label").textContent = `${value} cm`;
  const width = 35 + (Number(value) / 100) * 55;
  $("#measure-line").style.width = `${width}%`;
});

function isClosedSeason(closedSeason, date = new Date()) {
  if (!closedSeason) return false;
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const { start, end } = closedSeason;
  return start <= end ? monthDay >= start && monthDay <= end : monthDay >= start || monthDay <= end;
}

function seasonText(closedSeason) {
  return closedSeason ? `${closedSeason.start.replace("-", ".")} ~ ${closedSeason.end.replace("-", ".")}` : "해당 없음";
}

$("#analyze-button").addEventListener("click", () => {
  if (!selectedPhoto) {
    showToast("분석할 물고기 사진을 먼저 등록해 주세요.");
    return;
  }
  const fish = fishRules.find((item) => item.id === $("#fish-type").value);
  if (!fish) {
    $("#analysis-result").hidden = false;
    $("#analysis-result").className = "result-panel not-allowed";
    $("#result-title").textContent = "물고기로 확인되지 않았습니다.";
    $("#result-message").textContent = "다른 사진을 사용하거나 어종을 직접 확인해 주세요.";
    $("#result-icon").textContent = "!";
    $("#result-fish").textContent = "판별 불가";
    $("#result-size").textContent = "-";
    $("#result-limit").textContent = "-";
    $("#result-season").textContent = "-";
    $("#release-guide").hidden = true;
    playTone(false);
    return;
  }
  const size = Number($("#length-range").value);
  const closed = isClosedSeason(fish.closedSeason);
  const allowed = !closed && size >= fish.minSize;
  lastAnalysis = { fishId: fish.id, size, allowed, closed, area: $("#fishing-area").value.trim() || "부산 연안", date: todayLocal() };
  catches.push({ ...lastAnalysis, analyzedAt: new Date().toISOString() });
  saveState();
  renderAnalysisResult(fish, size, allowed, closed);
});

function renderAnalysisResult(fish, size, allowed, closed) {
  const panel = $("#analysis-result");
  panel.hidden = false;
  panel.className = `result-panel${allowed ? "" : " not-allowed"}`;
  $("#result-icon").textContent = allowed ? "✓" : "!";
  $("#result-title").textContent = allowed ? "포획 가능한 크기입니다!" : closed ? "현재는 포획 금지 기간입니다." : "아직 어린 물고기입니다!";
  $("#result-message").textContent = allowed ? "예시 기준을 통과했습니다. 현장 공식 규정도 확인하세요." : "바다로 안전하게 돌려보내 주세요.";
  $("#result-fish").textContent = fish.name;
  $("#result-size").textContent = `${size.toFixed(1)}cm`;
  $("#result-limit").textContent = `${fish.minSize}cm`;
  $("#result-season").textContent = seasonText(fish.closedSeason);
  $("#release-guide").hidden = allowed;
  playTone(allowed);
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
  showToast(`새로운 분석 기록이 도감에 저장되었습니다: ${fish.name}`);
}

$("#go-release").addEventListener("click", () => {
  switchView("rewards");
  if (lastAnalysis) $("#release-fish").value = lastAnalysis.fishId;
  $("#release-area").value = lastAnalysis?.area || "부산 연안";
  setTimeout(() => $(".release-cert").scrollIntoView({ behavior: "smooth" }), 250);
});

function playTone(success) {
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.type = success ? "sine" : "square";
    oscillator.frequency.setValueAtTime(success ? 660 : 210, context.currentTime);
    if (success) oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + .18);
    gain.gain.setValueAtTime(.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .3);
    oscillator.start();
    oscillator.stop(context.currentTime + .31);
  } catch {
    // 소리를 사용할 수 없는 환경에서는 시각 효과만 제공합니다.
  }
}

$("#release-photo").addEventListener("change", () => {
  const [file] = $("#release-photo").files;
  if (!file) return;
  $("#release-preview").src = URL.createObjectURL(file);
  $("#release-preview").hidden = false;
  $(".release-upload span").hidden = true;
});

$("#release-submit").addEventListener("click", () => {
  const [photo] = $("#release-photo").files;
  const fish = fishRules.find((item) => item.id === $("#release-fish").value);
  const area = $("#release-area").value.trim();
  const date = $("#release-date").value;
  const result = $("#release-result");
  if (!photo || !fish || !area || !date || !$("#release-check").checked) {
    result.textContent = "사진, 어종, 장소, 날짜와 확인 체크를 모두 입력해 주세요.";
    result.style.color = "var(--red)";
    return;
  }
  const photoKey = `${photo.name}-${photo.size}-${photo.lastModified}`;
  if (certifiedPhotos.includes(photoKey)) {
    result.textContent = "이미 인증한 사진입니다.";
    result.style.color = "var(--red)";
    return;
  }
  const linkedYoungFish = lastAnalysis && lastAnalysis.fishId === fish.id && !lastAnalysis.allowed;
  let reward = 10 + (linkedYoungFish ? 5 : 0);
  const nextCount = releases.length + 1;
  if (nextCount % 3 === 0) reward += 10;
  points += reward;
  releases.push({ fishId: fish.id, area, date, points: reward, releasedAt: new Date().toISOString() });
  certifiedPhotos.push(photoKey);
  saveState();
  result.textContent = `방생 인증 완료! ${reward}P가 적립되었습니다.`;
  result.style.color = "var(--green)";
  playTone(true);
  showToast(`물고기가 바다로 돌아갔어요! +${reward}P`);
  $("#release-photo").value = "";
  $("#release-preview").hidden = true;
  $(".release-upload span").hidden = false;
  $("#release-check").checked = false;
  renderRewards();
});

function currentTitle() {
  const unlocked = achievements.filter((item) => releases.length >= item.count).at(-1);
  return unlocked?.title || "첫 항해";
}

function renderRewards() {
  $("#header-points").textContent = formatNumber(points);
  $("#wallet-points").textContent = formatNumber(points);
  $("#current-title").textContent = currentTitle();
  $("#achievement-list").replaceChildren(...achievements.map((item) => {
    const row = document.createElement("div");
    row.className = `achievement${releases.length >= item.count ? " unlocked" : ""}`;
    row.innerHTML = `<span>${item.icon}</span><div><b>${item.title}</b><small>${item.text} · ${Math.min(releases.length, item.count)}/${item.count}</small></div>`;
    return row;
  }));
  renderProducts();
  renderRanking();
}

function renderProducts() {
  $("#product-grid").replaceChildren(...products.map((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `<div class="product-art">${product.icon}</div><h3>${product.name}</h3><p>${product.description}</p><button type="button" ${points < product.cost ? "disabled" : ""}>${product.cost}P로 교환</button>`;
    card.querySelector("button").addEventListener("click", () => exchangeProduct(product));
    return card;
  }));
}

function exchangeProduct(product) {
  if (points < product.cost) return;
  points -= product.cost;
  saveState();
  const code = `SEA-${Date.now().toString().slice(-8)}`;
  $("#voucher-title").textContent = product.name;
  $("#voucher-description").textContent = `${product.cost}P를 사용했습니다.`;
  $("#voucher-code").textContent = code;
  $("#voucher-dialog").showModal();
  renderRewards();
}

function renderRanking() {
  const rows = [
    { rank: 1, name: "파도지기", title: "부산 바다 수호자", score: 420 },
    { rank: 2, name: "해운대돌고래", title: "해양 보호 전문가", score: 310 },
    { rank: 3, name: "착한낚시왕", title: "착한 낚시왕", score: 240 },
    { rank: "-", name: "나", title: currentTitle(), score: points, me: true }
  ];
  $("#ranking-list").replaceChildren(...rows.map((item) => {
    const row = document.createElement("div");
    row.className = `rank-row${item.me ? " me" : ""}`;
    row.innerHTML = `<span>${item.rank}</span><div><strong>${item.name}</strong><small>${item.title}</small></div><b>${formatNumber(item.score)}P</b>`;
    return row;
  }));
}

$("#collection-search").addEventListener("input", renderCollection);
$("#collection-filter").addEventListener("change", renderCollection);

function renderCollection() {
  const foundIds = new Set(catches.map((item) => item.fishId));
  const releasedIds = new Set(releases.map((item) => item.fishId));
  const query = $("#collection-search").value.trim();
  const filter = $("#collection-filter").value;
  $("#collection-count").textContent = `${foundIds.size} / ${fishRules.length}`;
  $("#collection-percent").textContent = `${Math.round((foundIds.size / fishRules.length) * 100)}%`;
  $("#collection-releases").textContent = `${releases.length}회`;
  const visibleFish = fishRules.filter((fish) => {
    if (query && !fish.name.includes(query)) return false;
    if (filter === "found" && !foundIds.has(fish.id)) return false;
    if (filter === "released" && !releasedIds.has(fish.id)) return false;
    return true;
  });
  $("#fish-collection").replaceChildren(...visibleFish.map((fish, index) => createFishCard(fish, fishRules.indexOf(fish) + 1, foundIds, releasedIds)));
}

function createFishCard(fish, number, foundIds, releasedIds) {
  const records = catches.filter((item) => item.fishId === fish.id);
  const releaseCount = releases.filter((item) => item.fishId === fish.id).length;
  const found = foundIds.has(fish.id);
  const card = document.createElement("article");
  card.className = `fish-card${found ? "" : " locked"}`;
  const maxSize = found ? Math.max(...records.map((item) => item.size)) : 0;
  card.innerHTML = `<span class="number">NO. ${String(number).padStart(2, "0")}</span><span class="fish-emoji">${found ? fishEmoji[fish.id] || "🐟" : "?"}</span><h3>${found ? fish.name : "미발견 어종"}</h3><p>${found ? `최대 ${maxSize.toFixed(1)}cm · 분석 ${records.length}회` : "사진 분석을 완료하면 정보가 공개됩니다."}</p><div class="tags">${found ? `<span>기준 ${fish.minSize}cm</span>${releasedIds.has(fish.id) ? `<span>방생 ${releaseCount}회</span>` : ""}` : ""}</div>`;
  return card;
}

renderHome();
renderRewards();
renderCollection();
