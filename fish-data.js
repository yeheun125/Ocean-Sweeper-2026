
// 물고기 규정을 수정하고 싶다면 이 파일의 숫자와 날짜를 바꾸세요.
// minSize: 잡을 수 있는 최소 크기(cm)
// closedSeason: 잡으면 안 되는 기간. 월과 일만 사용합니다.
const fishRules = [
  {
    id: "rockfish",
    name: "우럭",
    minSize: 23,
    closedSeason: { start: "04-01", end: "05-31" }
  },
  {
    id: "flatfish",
    name: "광어",
    minSize: 35,
    closedSeason: { start: "01-01", end: "02-28" }
  },
  {
    id: "sea-bream",
    name: "참돔",
    minSize: 24,
    closedSeason: { start: "04-20", end: "08-20" }
  },
  {
    id: "mackerel",
    name: "고등어",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "black-porgy",
    name: "감성돔",
    minSize: 25,
    closedSeason: null
  },
  {
    id: "black-rockfish",
    name: "볼락",
    minSize: 15,
    closedSeason: null
  },
  {
    id: "ridged-eye-flounder",
    name: "도다리",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "sea-bass",
    name: "농어",
    minSize: 30,
    closedSeason: null
  },
  {
    id: "yellowtail",
    name: "방어",
    minSize: 30,
    closedSeason: null
  },
  {
    id: "greater-amberjack",
    name: "부시리",
    minSize: 30,
    closedSeason: null
  },
  {
    id: "hairtail",
    name: "갈치",
    minSize: 18,
    closedSeason: null
  },
  {
    id: "spanish-mackerel",
    name: "삼치",
    minSize: 30,
    closedSeason: null
  },
  {
    id: "flounder",
    name: "가자미",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "greenling",
    name: "노래미",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "rock-bream",
    name: "돌돔",
    minSize: 24,
    closedSeason: null
  },
  {
    id: "brown-croaker",
    name: "민어",
    minSize: 33,
    closedSeason: null
  },
  {
    id: "white-croaker",
    name: "백조기",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "girella",
    name: "벵에돔",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "marbled-rockfish",
    name: "쏨뱅이",
    minSize: 20,
    closedSeason: null
  },
  {
    id: "mullet",
    name: "숭어",
    minSize: 25,
    closedSeason: null
  },
  {
    id: "pufferfish",
    name: "복어",
    minSize: 20,
    closedSeason: null
  }
];
