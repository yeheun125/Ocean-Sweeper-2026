const form = document.querySelector("#fishing-form");
const fishType = document.querySelector("#fish-type");
const photoInput = document.querySelector("#fish-photo");
const photoPreview = document.querySelector("#photo-preview");
const uploadMessage = document.querySelector("#upload-message");
const result = document.querySelector("#result");
const releasePhoto = document.querySelector("#release-photo");
const releasePhotoPreview = document.querySelector("#release-photo-preview");
const releasePreviewImage = document.querySelector("#release-preview-image");
const releasePhotoName = document.querySelector("#release-photo-name");
const releaseCheck = document.querySelector("#release-check");
const releaseButton = document.querySelector("#release-button");
const releaseCount = document.querySelector("#release-count");
const couponResult = document.querySelector("#coupon-result");
const releaseFishType = document.querySelector("#release-fish-type");
const releaseArea = document.querySelector("#release-area");
const releaseDate = document.querySelector("#release-date");

// 브라우저에 방생 인증 횟수를 저장합니다. 같은 브라우저에서 다시 열면 유지됩니다.
let releaseTotal = Number(localStorage.getItem("releaseTotal")) || 0;

function showReleaseCount() {
  releaseCount.textContent = `현재 인증 횟수: ${releaseTotal} / 5회`;
}

showReleaseCount();
releaseDate.value = new Date().toISOString().slice(0, 10);

// fish-data.js에 적어 둔 물고기 목록을 선택 상자에 넣습니다.
fishRules.forEach((fish) => {
  const option = document.createElement("option");
  option.value = fish.id;
  option.textContent = fish.name;
  fishType.append(option);
  releaseFishType.append(option.cloneNode(true));
});

photoInput.addEventListener("change", () => {
  const [photo] = photoInput.files;
  if (!photo) return;

  photoPreview.src = URL.createObjectURL(photo);
  photoPreview.hidden = false;
  uploadMessage.hidden = true;
});

releasePhoto.addEventListener("change", () => {
  const [photo] = releasePhoto.files;
  if (!photo) return;
  releasePreviewImage.src = URL.createObjectURL(photo);
  releasePhotoName.textContent = `선택한 사진: ${photo.name}`;
  releasePhotoPreview.hidden = false;
});

// 오늘의 월-일이 금어기 사이에 있는지 확인합니다.
function isClosedSeason(closedSeason) {
  if (!closedSeason) return false;

  const today = new Date();
  const todayMonthDay = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const { start, end } = closedSeason;

  // 같은 해 안의 기간(예: 04-01~05-31)과 연말을 넘는 기간 모두 처리합니다.
  return start <= end
    ? todayMonthDay >= start && todayMonthDay <= end
    : todayMonthDay >= start || todayMonthDay <= end;
}

function seasonText(closedSeason) {
  return closedSeason ? `${closedSeason.start.replace("-", "월 ")}일 ~ ${closedSeason.end.replace("-", "월 ")}일` : "없음";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const selectedFish = fishRules.find((fish) => fish.id === fishType.value);
  const size = Number(document.querySelector("#fish-size").value);
  const area = document.querySelector("#fishing-area").value.trim();
  const today = new Date().toLocaleDateString("ko-KR");

  let title;
  let className;
  let description;

  if (isClosedSeason(selectedFish.closedSeason)) {
    title = "잡으면 안 됩니다";
    className = "not-allowed";
    description = `오늘은 ${selectedFish.name}의 금어기예요. 금어기: ${seasonText(selectedFish.closedSeason)}`;
  } else if (size < selectedFish.minSize) {
    title = "크기가 너무 작습니다";
    className = "too-small";
    description = `${selectedFish.name}은 최소 ${selectedFish.minSize}cm 이상이어야 해요. 입력한 크기: ${size}cm`;
  } else {
    title = "잡아도 됩니다";
    className = "allowed";
    description = `예시 규정 기준으로 ${selectedFish.name} ${size}cm는 잡을 수 있어요.`;
  }

  result.className = `result ${className}`;
  result.hidden = false;
  result.innerHTML = `<p class="result-label">${today} · ${area}</p><h2>${title}</h2><p>${description}</p><p class="rule">최소 허용 크기: ${selectedFish.minSize}cm / 금어기: ${seasonText(selectedFish.closedSeason)}</p>`;
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

releaseButton.addEventListener("click", () => {
  const [photo] = releasePhoto.files;
  if (!photo || !releaseCheck.checked || !releaseFishType.value || !releaseArea.value.trim() || !releaseDate.value) {
    couponResult.hidden = false;
    couponResult.className = "coupon-result coupon-error";
    couponResult.textContent = "사진, 물고기 종류, 장소, 날짜를 입력하고 방생 확인에도 체크해 주세요.";
    return;
  }

  const photoKey = `${photo.name}-${photo.size}-${photo.lastModified}`;
  const certifiedPhotos = JSON.parse(localStorage.getItem("certifiedPhotos") || "[]");
  if (certifiedPhotos.includes(photoKey)) {
    couponResult.hidden = false;
    couponResult.className = "coupon-result coupon-error";
    couponResult.textContent = "같은 사진은 한 번만 인증할 수 있어요. 다른 방생 사진을 선택해 주세요.";
    return;
  }

  releaseTotal += 1;
  localStorage.setItem("releaseTotal", releaseTotal);
  certifiedPhotos.push(photoKey);
  localStorage.setItem("certifiedPhotos", JSON.stringify(certifiedPhotos));
  showReleaseCount();
  releasePhoto.value = "";
  releaseCheck.checked = false;
  releasePhotoPreview.hidden = true;
  releaseArea.value = "";
  releaseFishType.value = "";
  couponResult.hidden = false;

  if (releaseTotal >= 5) {
    const couponCode = `RELEASE-${new Date().getFullYear()}-FISH`;
    couponResult.className = "coupon-result coupon-success";
    couponResult.innerHTML = `<strong>축하합니다! 5회 인증 완료 🎉</strong><br>낚시 용품 10% 할인 예시 쿠폰: <b>${couponCode}</b><br><span>실제 쇼핑몰과 연결하기 전의 학습용 쿠폰입니다.</span>`;
  } else {
    couponResult.className = "coupon-result coupon-info";
    couponResult.textContent = `방생 인증이 완료됐어요! 앞으로 ${5 - releaseTotal}회 더 인증하면 쿠폰을 받을 수 있어요.`;
  }
});
