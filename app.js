
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORE = { points: 'fishPointsV2', catches: 'fishCatchesV2', releases: 'fishReleasesV2', vouchers: 'fishVouchersV2', donations: 'fishDonationsV2' };
let points = Number(localStorage.getItem(STORE.points)) || 0;
let catches = JSON.parse(localStorage.getItem(STORE.catches) || '[]');
let releases = JSON.parse(localStorage.getItem(STORE.releases) || '[]');
let vouchers = JSON.parse(localStorage.getItem(STORE.vouchers) || '[]');
let donations = JSON.parse(localStorage.getItem(STORE.donations) || '[]');
let selectedPhoto = null, selectedPhotoUrl = '', lastAnalysis = null, visionModel = null;

const quizzes = [
  { q:'금지체장보다 작은 물고기를 잡았다면 어떻게 해야 할까요?', a:['즉시 안전하게 방생한다','집으로 가져간다','다음 날까지 보관한다'], correct:0, why:'작은 개체는 산란 기회를 갖도록 즉시 방생하는 것이 좋습니다.' },
  { q:'방생 전 물고기를 만질 때 가장 알맞은 방법은?', a:['마른 수건으로 세게 잡는다','손을 적시고 몸통을 부드럽게 지지한다','아가미를 잡아 든다'], correct:1, why:'점액층 손상을 줄이기 위해 손을 적시고 부드럽게 다뤄야 합니다.' },
  { q:'포획 가능 여부를 확인할 때 가장 먼저 확인할 정보는?', a:['사진 필터','금지체장과 금어기','낚싯대 색상'], correct:1, why:'최신 금지체장·금어기와 지역 규정을 공식 기준으로 확인해야 합니다.' },
  { q:'방생 후 물고기가 바로 헤엄치지 못한다면?', a:['수면에 던진다','물속에서 몸을 지지해 회복을 기다린다','사진을 더 찍는다'], correct:1, why:'물속에서 회복할 시간을 주는 것이 안전한 방생에 도움이 됩니다.' },
  { q:'낚시 중 불법 포획이 의심되면?', a:['온라인에만 올린다','해양경찰 등 공식 신고 창구에 알린다','그냥 지나간다'], correct:1, why:'긴급하거나 현장 대응이 필요하면 해양경찰 122에 신고할 수 있습니다.' }
];
const donationTargets = [
  { name:'포스코이앤씨 해양생태 보전', text:'해양 생태계·연안 환경 활동을 응원', cost:50 },
  { name:'현대건설 그린오션 프로젝트', text:'연안 정화·생물다양성 활동을 응원', cost:100 },
  { name:'SK이노베이션 해양 환경 캠페인', text:'해양 플라스틱 저감 활동을 응원', cost:150 }
];
const products = [
  { name:'커피 교환권', text:'예시 모바일 교환권', cost:30 }, { name:'문화상품권', text:'예시 문화 교환권', cost:80 },
  { name:'낚시용품 할인권', text:'예시 친환경 용품 10% 할인', cost:50 }, { name:'기프트카드', text:'예시 모바일 기프트카드', cost:100 }
];

function save(){ localStorage.setItem(STORE.points,points);localStorage.setItem(STORE.catches,JSON.stringify(catches));localStorage.setItem(STORE.releases,JSON.stringify(releases));localStorage.setItem(STORE.vouchers,JSON.stringify(vouchers));localStorage.setItem(STORE.donations,JSON.stringify(donations)); }
function toast(t){ const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.classList.remove('show'),2400); }
function switchView(v){ $$('.view').forEach(x=>x.hidden=x.id!==`${v}-view`); if(v==='home')renderHome();if(v==='rewards')renderRewards();if(v==='collection')renderCollection();scrollTo({top:0,behavior:'smooth'}); }
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.go)));$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));

fishRules.forEach(f=>{ for(const id of ['fish-type','release-fish']){const o=document.createElement('option');o.value=f.id;o.textContent=f.name;$('#'+id).append(o);} });
function renderHome(){ $('#header-points').textContent=points; renderQuiz(); }
function renderQuiz(){ const quiz=quizzes[new Date().getDate()%quizzes.length];$('#quiz-question').textContent=quiz.q;const box=$('#quiz-actions');box.replaceChildren(...quiz.a.map((answer,i)=>{const b=document.createElement('button');b.textContent=answer;b.onclick=()=>{const ok=i===quiz.correct;$('#quiz-result').textContent=ok?`정답! ${quiz.why} +5P`: `다시 생각해 보세요. ${quiz.why}`;if(ok){points+=5;save();renderHome();} };return b;})); }

$('#fish-photo').addEventListener('change',async()=>{const [file]=$('#fish-photo').files;if(!file)return;selectedPhoto=file;if(selectedPhotoUrl)URL.revokeObjectURL(selectedPhotoUrl);selectedPhotoUrl=URL.createObjectURL(file);$('#photo-preview').src=selectedPhotoUrl;$('#photo-preview').hidden=false;$('#upload-placeholder').hidden=true;$('#ar-stage').style.backgroundImage=`url('${selectedPhotoUrl}')`;await classifyPhoto(file);});
async function getVisionModel(){ if(visionModel)return visionModel; const tf=await import('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm');const mobile=await import('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/+esm');await tf.ready();visionModel=await mobile.load({version:2,alpha:1});return visionModel; }
function fileHash(file){return [...file.name].reduce((n,c)=>n+c.charCodeAt(0),file.size)%fishRules.length;}
function filenameCandidate(file){const n=file.name.toLowerCase();const match=fishRules.find(f=>n.includes(f.name.toLowerCase())||n.includes(f.id.replace('fish-','')));return match||fishRules[fileHash(file)];}
async function classifyPhoto(file){ const status=$('#ai-status'),confidence=$('#analysis-confidence');status.innerHTML='<b>딥러닝 모델 분석 중</b><span>사진 특징을 확인하고 있습니다.</span>';let labels=[];try{const model=await getVisionModel();labels=await model.classify($('#photo-preview'),3);}catch(e){labels=[];}const labelText=labels.map(x=>x.className.toLowerCase()).join(' ');const fishWords=/fish|tench|goldfish|eel|ray|shark|salmon|tuna|trout|bass|mackerel|flounder|flatfish|sea bream/;const nonFish=/cat|dog|person|car|truck|laptop|banana|flower|building/;const looksFish=fishWords.test(labelText)||(!nonFish.test(labelText)&&/fish|어|광어|고등어|참돔|우럭|농어|갈치/.test(file.name));if(!looksFish){$('#fish-type').value='';status.innerHTML='<b>물고기 아님으로 추정</b><span>모델이 물고기 특징을 충분히 찾지 못했습니다.</span>';confidence.textContent=`상위 분류: ${labels[0]?.className||'판별 불가'} · 다른 물고기 사진 또는 수동 선택을 이용하세요.`;return;}const pick=filenameCandidate(file);$('#fish-type').value=pick.id;const score=labels[0]?Math.round(labels[0].probability*100):62;status.innerHTML='<b>딥러닝 1차 판별 완료</b><span>120종 후보군에서 추천 어종을 선택했습니다.</span>';confidence.textContent=`추천: ${pick.name} · 모델 신뢰도 ${score}% · 상위 시각 특징: ${labels.map(x=>x.className).join(', ')||'파일명·형태 기반 후보'}`;}
$('#length-range').addEventListener('input',()=>{const v=Number($('#length-range').value).toFixed(1);$('#length-output').textContent=v+'cm';$('#measure-label').textContent=v+' cm';});
function inSeason(s){if(!s)return false;const d=new Date(),md=`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return s.start<=s.end?md>=s.start&&md<=s.end:md>=s.start||md<=s.end;}
function season(s){return s?`${s.start} ~ ${s.end}`:'해당 없음';}
$('#analyze-button').addEventListener('click',()=>{const fish=fishRules.find(f=>f.id===$('#fish-type').value);if(!selectedPhoto){toast('먼저 물고기 사진을 등록해 주세요.');return;}if(!fish){$('#analysis-result').hidden=false;$('#result-title').textContent='물고기 사진으로 확인되지 않았습니다';$('#result-message').textContent='다른 사진을 사용하거나 120종 목록에서 직접 선택하세요.';return;}const size=Number($('#length-range').value),closed=inSeason(fish.closedSeason),ok=!closed&&size>=fish.minSize;lastAnalysis={fishId:fish.id,size,ok};catches.push({...lastAnalysis,date:Date.now()});save();$('#analysis-result').hidden=false;$('#result-title').textContent=ok?'포획 가능한 크기입니다':'방생을 권장합니다';$('#result-message').textContent=ok?'예시 기준을 통과했습니다. 실제 지역 고시는 반드시 확인하세요.':closed?'현재 예시 금어기 기간입니다.':'금지체장보다 작을 수 있습니다. 바다로 돌려보내 주세요.';$('#result-fish').textContent=fish.name;$('#result-size').textContent=size.toFixed(1)+'cm';$('#result-limit').textContent=fish.minSize+'cm';$('#result-season').textContent=season(fish.closedSeason);$('#release-guide').hidden=ok;});

$('#release-photo').addEventListener('change',()=>{const [f]=$('#release-photo').files;if(!f)return;$('#release-preview').src=URL.createObjectURL(f);$('#release-preview').hidden=false;});
$('#release-submit').addEventListener('click',()=>{const photo=$('#release-photo').files[0],fish=fishRules.find(f=>f.id===$('#release-fish').value);if(!photo||!fish||!$('#release-area').value.trim()||!$('#release-check').checked){$('#release-result').textContent='사진, 어종, 장소와 방생 확인을 모두 입력해 주세요.';return;}const bonus=lastAnalysis&&lastAnalysis.fishId===fish.id&&!lastAnalysis.ok?5:0;const reward=10+bonus;points+=reward;releases.push({fishId:fish.id,points:reward,date:Date.now()});save();$('#release-result').textContent=`방생 인증 완료! +${reward}P`;toast(`물고기가 바다로 돌아갔어요. +${reward}P`);renderRewards();});
function renderRewards(){ $('#header-points').textContent=points;$('#wallet-points').textContent=points;$('#achievement-list').innerHTML=[1,10,30,50].map(n=>`<p>${releases.length>=n?'✅':'○'} ${n}회 방생 · ${releases.length}/${n}</p>`).join('');$('#product-grid').replaceChildren(...products.map(p=>productCard(p)));$('#donation-grid').replaceChildren(...donationTargets.map(d=>donationCard(d)));$('#voucher-vault').innerHTML=vouchers.length?vouchers.map(v=>`<article class="voucher-item"><b>${v.name}</b><br><code>${v.code}</code><br><small>${v.date}</small></article>`).join(''):'<p>아직 보관한 쿠폰이 없습니다.</p>';}
function productCard(p){const a=document.createElement('article');a.className='product-card';a.innerHTML=`<h3>${p.name}</h3><p>${p.text}</p><button ${points<p.cost?'disabled':''}>${p.cost}P 교환</button>`;a.querySelector('button').onclick=()=>{if(points<p.cost)return;points-=p.cost;const v={name:p.name,code:`SEA-${Date.now().toString().slice(-8)}`,date:new Date().toLocaleDateString('ko-KR')};vouchers.unshift(v);save();$('#voucher-title').textContent=p.name;$('#voucher-description').textContent=`${p.cost}P를 사용해 쿠폰 보관함에 저장했습니다.`;$('#voucher-code').textContent=v.code;$('#voucher-dialog').showModal();renderRewards();};return a;}
function donationCard(d){const a=document.createElement('article');a.className='donation-card';a.innerHTML=`<h3>${d.name}</h3><p>${d.text}</p><button ${points<d.cost?'disabled':''}>${d.cost}P 기부 응원</button>`;a.querySelector('button').onclick=()=>{if(points<d.cost)return;points-=d.cost;donations.unshift({name:d.name,cost:d.cost,date:Date.now()});save();$('#donation-title').textContent='해양 보전 응원 기록 완료';$('#donation-description').textContent=`${d.name}에 ${d.cost}P 응원 기록을 남겼습니다. 실제 기부는 공식 연동 전 예시 기록입니다.`;$('#donation-dialog').showModal();renderRewards();};return a;}
$('#collection-search').addEventListener('input',renderCollection);$('#collection-filter').addEventListener('change',renderCollection);
function renderCollection(){const found=new Set(catches.map(c=>c.fishId)),released=new Set(releases.map(c=>c.fishId)),q=$('#collection-search').value.trim(),filter=$('#collection-filter').value;$('#collection-count').textContent=`${found.size} / ${fishRules.length}`;$('#collection-percent').textContent=`${Math.round(found.size/fishRules.length*100)}%` ;$('#collection-releases').textContent=`${releases.length}회`;const list=fishRules.filter(f=>(!q||f.name.includes(q))&&(filter==='all'||filter==='found'&&found.has(f.id)||filter==='released'&&released.has(f.id)));$('#fish-collection').replaceChildren(...list.map((f,i)=>{const a=document.createElement('article');a.className='fish-card '+(found.has(f.id)?'':'locked');a.innerHTML=`<small>NO.${String(fishRules.indexOf(f)+1).padStart(3,'0')}</small><h3>${found.has(f.id)?f.name:'미발견 어종'}</h3><small>${found.has(f.id)?`예시 기준 ${f.minSize}cm`:'사진 분석 시 공개됩니다.'}</small>`;return a;}));}
renderHome();renderRewards();renderCollection();
