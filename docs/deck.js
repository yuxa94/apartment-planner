const slides = window.SLIDES;

const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
function saved(k, f) { try { return JSON.parse(localStorage.getItem(k)) || f; } catch { return f; } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
let checks = saved('apartment-stage123-checks', {});
let current = 0;
const narrow = () => innerWidth > 0 && innerWidth < 760;
let reading = narrow();
let userToggled = false;

const resolve = t => (t || '').replaceAll('https://yuxa94.github.io/apartment-planner/', new URL('.', location.href).href);
/* relative paths in prompts (unit-plan-cad/…, jobs/…) are highlighted; Codex resolves them from the class folder */
const marked = t => esc(t).replace(/(?<![\w/.:-])((?:unit-plan-cad|jobs|skills|reference-study)\/[\w./-]*)/g, '<mark>$1</mark>');

/* ---------- schedule ---------- */
const agenda = [["00–15","00 · 실습 자료와 첫 화면","15"],["15–35","01 · 참고도면·세대 외곽","20"],["35–55","02 · API 없는 대화 왕복","20"],["55–70","03 · 레이어·크기·스냅","15"],["70–80","휴식","10"],["80–100","04 · 실제 동평면 재현","20"],["100–120","05 · 코어 1개·조합 탐색","20"],["120–140","06 · CAD 코어·세대 우선","20"],["140–150","07 · 저장한 안·JSON","10"],["150–160","휴식","10"],["160–180","08 · 인동거리·높이 산식","20"],["180–200","09 · 프리셋·도면·3D","20"],["200–220","10 · 동평면·배치안","20"],["220–240","11 · 패키징·배포·정리","20"]];
const stepOf = row => row[1].slice(0, 2);
function slideFor(row) {
  if (row[1] === '휴식') return slides.findIndex(s => s.kind === 'break' && s.time.startsWith(row[0]));
  return slides.findIndex(s => s.part.startsWith(stepOf(row)));
}

/* ---------- diagrams (line drawings, ink on paper) ---------- */
const T = (x, y, t, size = 26, cls = '', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" class="${cls}" ${extra}>${t}</text>`;
const L = (x1, y1, x2, y2, cls = 'ln', extra = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" class="${cls}" ${extra}/>`;
const tick = (x, y) => L(x - 7, y + 7, x + 7, y - 7, 'ln');
function dimH(x1, x2, y, label, size = 26, ext = null) {
  let s = L(x1 - 12, y, x2 + 12, y, 'ln') + tick(x1, y) + tick(x2, y);
  if (ext !== null) s += L(x1, y - 14, x1, ext, 'sl') + L(x2, y - 14, x2, ext, 'sl');
  return s + T((x1 + x2) / 2, y - 16, label, size, '', 'text-anchor="middle"');
}
const svg = (inner, vb = '0 0 1744 640') => `<svg class="dg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="강의 설명 도식">${inner}</svg>`;

const diagrams = {
  flow3() {
    const nodes = [['STAGE 1', '단위세대 계획', '59·74·84 외곽 · 실 · 현관'], ['STAGE 2', '동평면 조합', '코어 + 세대 후보 · 창 방향'], ['STAGE 3', '단지 배치 검토', '인동거리 · 정북 · 사업 규모']];
    const files = ['unit-59|74|84.json', 'building/1 후보 JSON'];
    const w = 440, step = 652;
    let s = nodes.map((n, i) => {
      const x = i * step, hi = i === 1;
      return L(x, 90, x + w, 90, 'ln') + T(x, 70, n[0], 18, hi ? 'a' : 'q', 'font-weight="650" letter-spacing="2"') +
        `<rect x="${x}" y="115" width="${w}" height="180" class="${hi ? 'wash' : 'bx'}"/>` +
        T(x + 30, 195, n[1], 40, '', 'font-weight="560" letter-spacing="-1"') + T(x + 30, 248, n[2], 23, 'q');
    }).join('');
    for (let i = 0; i < 2; i++) {
      const x = i * step + w;
      s += L(x + 14, 205, x + step - w - 14, 205, 'ln', 'marker-end="url(#arr)"');
      s += T(x + (step - w) / 2, 180, files[i], 17, 'a', 'text-anchor="middle" font-weight="600"');
    }
    s += `<rect x="372" y="430" width="1000" height="110" class="bx"/>` + T(402, 478, 'Claude 대화 · API 키 없음', 30, '', 'font-weight="560"') + T(402, 515, '요청문을 복사해 붙여넣고, 돌아온 patch JSON을 앱이 검사한 뒤 적용', 22, 'q');
    for (let i = 0; i < 3; i++) { const cx = i * step + w / 2, tx = 372 + 1000 * (i + 0.5) / 3; s += `<path d="M${cx} 295V362H${tx}V430" class="ac" stroke-dasharray="10 8"/>`; }
    s += T(0, 600, '단계 사이에는 파일 형식만 넘깁니다. 좌표 m · 면적 ㎡ · x 동쪽 · y 남쪽.', 22, 'q');
    return svg(s);
  },
  worktree() {
    return `<div class="duo-tree"><section><div class="label"><small>작업 폴더 · git worktree</small><strong class="mono">Autocad_mcp_test/</strong></div><pre class="tree"><b>Autocad_mcp_test/</b>
  apartment-planner/         <span class="c"># main · 세 단계 모두</span>
  apartment-planner-stage1…/ <span class="c"># 단위세대 · :8771</span>
  apartment-planner-stage2…/ <span class="c"># 동평면 · :8772</span>
  apartment-planner-stage3…/ <span class="c"># 단지배치 · :8773</span>
  HAUD_참고도면_모음/        <span class="c"># 원본 · 수정 금지</span></pre></section>
<section><div class="label"><small>나누는 기준</small><strong>무엇이 같고 무엇이 다른가</strong></div><ul class="rules">
<li><b>브랜치마다 다른 것</b><i>→</i><span>시작: stage.js · STAGE.md / 이후: 기능별 소스</span></li>
<li><b>함께 쓰는 것</b><i>→</i><span>engine · state · units.js</span></li>
<li><b>세션 규칙</b><i>→</i><span>자기 폴더만 · checkout 금지</span></li>
<li><b>공통 모듈 변경</b><i>→</i><span>계약안 먼저 알리기</span></li></ul></section></div>`;
  },
  roundtrip() {
    const nodes = [['앱', '요청문 복사', '도면 JSON + 규칙 + 영역'], ['사람', 'Claude에 붙여넣기', '대화창 · 프로젝트 지침'], ['Claude', 'patch JSON', 'json 코드 블록 하나'], ['앱', '검토 후 적용', '개정 번호 · 잠금 확인']];
    const w = 370, step = 458;
    let s = nodes.map((n, i) => {
      const x = i * step, hi = i === 2;
      return L(x, 120, x + w, 120, 'ln') + T(x, 100, n[0], 18, hi ? 'a' : 'q', 'font-weight="650" letter-spacing="2"') +
        `<rect x="${x}" y="150" width="${w}" height="190" class="${hi ? 'wash' : 'bx'}"/>` +
        T(x + 30, 232, n[1], 38, '', 'font-weight="560" letter-spacing="-1"') + T(x + 30, 285, n[2], 23, 'q');
    }).join('');
    for (let i = 0; i < 3; i++) { const x = i * step + w; s += L(x + 16, 245, x + step - w - 16, 245, 'ln', 'marker-end="url(#arr)"'); }
    s += `<path d="M${3 * step + w / 2} 340V470H${w / 2}V352" class="ac" stroke-dasharray="10 8" marker-end="url(#arrA)"/>`;
    s += T(w / 2 + 30, 530, '← baseRevision이 다르거나 잠긴 실을 바꾸면 거부 → 요청문을 다시 복사', 30, '', 'font-weight="540"');
    s += T(w / 2 + 30, 576, '앱은 외부 API를 부르지 않습니다. 대화는 사람이 옮기고, 적용은 사람이 확인한 뒤에만 합니다.', 22, 'q');
    return svg(s);
  },
  layers() {
    const x = 120, y = 110, w = 700, h = 440;
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="wash"/>`;
    s += `<rect x="${x + 400}" y="${y}" width="300" height="230" class="bx"/><rect x="${x}" y="${y}" width="220" height="170" class="ht"/>`;
    s += T(x + 550, y + 125, '침실 2', 30, '', 'text-anchor="middle" font-weight="560"') + T(x + 550, y + 165, '위 레이어', 20, 'q', 'text-anchor="middle"');
    s += T(x + 110, y + 95, '욕실', 28, '', 'text-anchor="middle" font-weight="560"') + T(x + 110, y + 130, '위 레이어', 20, 'q', 'text-anchor="middle"');
    s += T(x + 270, y + 350, '거실 · 복도', 34, 'a', 'text-anchor="middle" font-weight="600"') + T(x + 270, y + 392, '맨 아래 큰 사각형 → 보이는 L자', 22, 'q', 'text-anchor="middle"');
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="ac" stroke-dasharray="10 8"/>`;
    const rows = [['레이어 순서', 'rooms 배열 뒤쪽 = 위'], ['겹친 면적', '위 레이어가 차지'], ['패널 표시', '보이는 면적 / 전체']];
    rows.forEach((rw, i) => {
      const ry = 130 + i * 130;
      s += L(980, ry, 1744, ry, i ? 'sl' : 'ln') + T(980, ry + 40, rw[0], 18, 'q', 'font-weight="650" letter-spacing="2"') + T(980, ry + 100, rw[1], 44, '', 'font-weight="520" letter-spacing="-1.5"');
    });
    s += L(980, 530, 1744, 530, 'sl') + T(980, 575, '개념도 · 완전히 가려진 실만 경고합니다', 22, 'q');
    return svg(s);
  },
  unitfirst() {
    let s = T(0, 50, '코어 먼저', 18, 'q', 'font-weight="650" letter-spacing="2"') + L(0, 66, 760, 66, 'ln');
    s += `<rect x="300" y="250" width="160" height="150" class="ht"/>`;
    s += `<rect x="250" y="95" width="260" height="155" class="bx"/><rect x="250" y="400" width="260" height="155" class="bx"/><rect x="60" y="230" width="240" height="190" class="bx"/><rect x="460" y="230" width="240" height="190" class="bx"/>`;
    s += T(380, 333, '코어', 26, '', 'text-anchor="middle" font-weight="600"');
    s += `<rect x="60" y="95" width="640" height="460" class="ac" stroke-dasharray="10 8"/>` + T(0, 605, '→ 늘 정사각형 덩어리 · 홀이 커짐', 24, '', 'font-weight="540"');
    const o = 960;
    s += T(o, 50, '세대 먼저 · 빈틈에 코어', 18, 'a', 'font-weight="650" letter-spacing="2"') + L(o, 66, 1744, 66, 'ln');
    s += `<rect x="${o}" y="95" width="370" height="210" class="bx"/><rect x="${o + 370}" y="95" width="370" height="210" class="bx"/><rect x="${o}" y="395" width="370" height="160" class="bx"/>`;
    s += T(o + 185, 210, '세대 1', 28, '', 'text-anchor="middle" font-weight="560"') + T(o + 555, 210, '세대 2', 28, '', 'text-anchor="middle" font-weight="560"') + T(o + 185, 485, '세대 3', 28, '', 'text-anchor="middle" font-weight="560"');
    s += `<rect x="${o}" y="305" width="740" height="90" class="wash"/>` + T(o + 370, 360, '복도 띠 1.8 m · 현관끼리 연결', 22, 'a', 'text-anchor="middle" font-weight="600"');
    s += `<rect x="${o + 380}" y="405" width="170" height="150" class="ht"/><rect x="${o + 560}" y="405" width="90" height="70" class="bx"/><rect x="${o + 560}" y="485" width="90" height="70" class="bx"/>`;
    s += T(o + 465, 590, '계단', 20, 'q', 'text-anchor="middle"') + T(o + 605, 447, '승강기', 16, 'q', 'text-anchor="middle"') + T(o + 605, 527, '샤프트', 16, 'q', 'text-anchor="middle"');
    [[o + 150, 305], [o + 520, 305], [o + 150, 395]].forEach(([dx, dy]) => s += L(dx, dy, dx + 70, dy, 'ac', 'stroke-width="6"'));
    s += T(o, 630, '현관(주황) 앞 1.5 m를 비우고 · 거실 앞 6 m 안에 다른 세대가 오면 버림', 22, 'q');
    return svg(s, '0 0 1744 650');
  },
  facing() {
    let s = `<rect x="120" y="100" width="520" height="120" class="ht"/><rect x="120" y="440" width="520" height="120" class="ht"/><rect x="800" y="100" width="380" height="120" class="ht"/>`;
    s += L(120, 220, 640, 220, 'ac', 'stroke-width="7"') + L(120, 440, 640, 440, 'ac', 'stroke-width="7"') + L(800, 220, 1180, 220, 'ac', 'stroke-width="7"');
    s += T(380, 85, '101동 · 20F', 22, '', 'text-anchor="middle" font-weight="560"') + T(380, 595, '103동 · 18F (남측 저층)', 22, '', 'text-anchor="middle" font-weight="560"') + T(990, 85, '102동 · 24F', 22, '', 'text-anchor="middle" font-weight="560"');
    s += L(380, 234, 380, 426, 'ln', 'marker-start="url(#arr)" marker-end="url(#arr)"');
    s += T(400, 320, '채광면 ↔ 채광면', 24, 'a', 'font-weight="600"') + T(400, 352, '10 m 이상 · 낮은 동 1.0H', 22, '');
    s += L(652, 160, 788, 160, 'ln', 'marker-start="url(#arr)" marker-end="url(#arr)"') + T(720, 145, '측벽 ↔ 측벽 4 m', 20, 'a', 'text-anchor="middle" font-weight="600"');
    s += `<path d="M720 470L720 400M720 400L708 424M720 400L732 424" class="ln"/>` + T(720, 500, 'N', 22, '', 'text-anchor="middle" font-weight="600"');
    const rows = [['채광면 (주황)', '창이 놓인 외곽면'], ['측벽', '창이 없는 면'], ['대각 배치', '단순 규칙으로 폴백']];
    rows.forEach((rw, i) => {
      const ry = 130 + i * 130;
      s += L(1300, ry, 1744, ry, i ? 'sl' : 'ln') + T(1300, ry + 40, rw[0], 18, 'q', 'font-weight="650" letter-spacing="2"') + T(1300, ry + 95, rw[1], 34, '', 'font-weight="520" letter-spacing="-1"');
    });
    s += T(1300, 575, '청주시 조례 프리셋 예 · 개념도', 20, 'q');
    return svg(s);
  },
  height() {
    const x = 180, w = 300;
    let s = '';
    const parts = [[560, 70, '1층 3.5', 'ht'], [260, 300, '기준층 × (n−3)', 'bx'], [200, 60, '3.0', 'bx'], [140, 60, '3.0', 'bx'], [128, 12, '파라펫 0.4', 'wash']];
    parts.forEach(([y, h, label, cls]) => {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
      s += L(x + w + 20, y, x + w + 60, y, 'sl') + T(x + w + 74, y + h / 2 + 9, label, 24, cls === 'wash' ? 'a' : '', 'font-weight="540"');
    });
    for (let k = 1; k < 8; k++) s += L(x, 260 + k * 37.5, x + w, 260 + k * 37.5, 'sl');
    s += L(120, 128, 120, 630, 'ln', 'marker-start="url(#arr)" marker-end="url(#arr)"') + T(100, 380, 'H', 30, 'a', 'text-anchor="middle" font-weight="650"');
    s += L(60, 630, 620, 630, 'ln');
    const rows = [['AG-109 산식', '3.5 + (n−3)×층고 + 3.0 + 3.0 + 0.4'], ['15층 · 도면 높이표', '43,500 / 43,300 / 40,000 / 39,800'], ['1층 전체 필로티 동', '1층 높이를 H에서 제외'], ['삼송 산식 (비교)', '0.6 + n × 2.8 + 0.25']];
    rows.forEach((rw, i) => {
      const ry = 90 + i * 128;
      s += L(860, ry, 1744, ry, i ? 'sl' : 'ln') + T(860, ry + 38, rw[0], 18, 'q', 'font-weight="650" letter-spacing="2"') + T(860, ry + 92, rw[1], 36, '', 'font-weight="520" letter-spacing="-1"');
    });
    s += T(860, 630, '높이가 바뀌면 인동거리·정북 요구값이 함께 바뀝니다 · 단위 m', 22, 'q');
    return svg(s, '0 0 1744 660');
  }
};

function diagram(type) {
  const d = diagrams[type] ? diagrams[type]() : '';
  return d.startsWith('<svg') ? `<div class="figure">${d}</div>` : d;
}
const coverArt = () => `<svg class="dg" viewBox="0 0 8800 8200" aria-hidden="true">
  <rect x="400" y="600" width="8000" height="7000" class="ln" vector-effect="non-scaling-stroke"/>
  <rect x="4600" y="600" width="3800" height="4100" class="wash" vector-effect="non-scaling-stroke"/>
  <rect x="6200" y="4700" width="2200" height="2900" class="bx" vector-effect="non-scaling-stroke"/>
  <rect x="3300" y="6300" width="1500" height="1300" class="ht" vector-effect="non-scaling-stroke"/>
  <path d="M6200 600V7600" class="ac" stroke-dasharray="10 8" vector-effect="non-scaling-stroke"/>
  <path d="M400 300H8400M400 180V420M8400 180V420M100 600V7600M-20 600H220M-20 7600H220" class="ln" vector-effect="non-scaling-stroke"/>
  <text x="4400" y="200" font-size="260" class="q" text-anchor="middle">8,000</text>
  <text x="-60" y="4100" font-size="260" class="q" text-anchor="middle" transform="rotate(-90 -60 4100)">7,000</text>
</svg>`;

/* ---------- slide bodies ---------- */
function refsNote(links, label = '자료') {
  if (!links.length) return '';
  return `<div class="bottom-note"><b>${label}</b><div class="refs">${links.map(l => `<a href="${esc(l[1])}" ${l[1].startsWith('#') ? '' : 'target="_blank" rel="noopener"'}>${esc(l[0])} ↗</a>`).join('')}</div><span></span></div>`;
}
function explainList(s) {
  if (!s.explain || !s.explain.length) return '';
  return `<div class="explain"><small>이 요청에서</small><dl>${s.explain.map(e => `<div><dt>${esc(e[0])}</dt><dd>${esc(e[1])}</dd></div>`).join('')}</dl></div>`;
}
function checkList(s, i, big = false) {
  return `<ul class="checks${big ? ' big' : ''}">${s.checks.map((c, j) => {
    const on = !!checks[i + '-' + j];
    return `<li><button data-check="${i}-${j}" aria-pressed="${on}"><em>${pad(j + 1)}</em><span>${esc(c)}</span><i>✓</i></button></li>`;
  }).join('')}</ul>`;
}
const tableHeads = { '질문에 답하면 무엇이 달라질까요?': ['단계', '질문', '정해지는 것'], 'v2에서 실제로 바꾼 것': ['항목', '이전', 'v2'] };
const kindLabel = { lab: '실습', diagram: '개념', image: '실제 화면', checklist: '확인', table: '정리', cards: '정리', steps: '순서', break: '휴식', resources: '자료', agenda: '안내', cover: '표지' };

function body(s, i) {
  switch (s.kind) {
    case 'cover': {
      const lines = s.title.split('\n');
      return `<div class="cover-layout"><div class="cover-kicker"><span>${esc(s.part)} · CLAUDE CODE × STAGE 1 · 2 · 3</span><span>${esc(s.time)}</span></div>
        <h1 class="cover-title">${lines.map(l => `<span>${esc(l)}</span>`).join('')}</h1>
        <p class="cover-lead">${esc(s.lead)}</p>
        <div class="cover-art">${coverArt()}</div>
        <div class="cover-meta"><span><em>00–70</em>Stage 1 · 단위세대 70분</span><span><em>80–150</em>Stage 2 · 동평면 70분</span><span><em>160–240</em>Stage 3 · 배치·배포 80분</span></div></div>`;
    }
    case 'agenda': {
      let acc = 0;
      const ticks = [0];
      agenda.forEach(r => { acc += +r[2]; ticks.push(acc); });
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main">
        <div class="timebar">${agenda.map(r => { const rest = r[1] === '휴식'; return `<button class="${rest ? 'rest' : ''}" style="flex:${r[2]}" data-go="${slideFor(r)}" title="${esc(r[1])}"><b>${rest ? '휴식' : stepOf(r)}</b><em>${r[2]}′</em></button>`; }).join('')}</div>
        <div class="ticks">${ticks.map(t => `<span style="left:${t / 240 * 100}%">${t}</span>`).join('')}</div>
        <div class="time-table">${[agenda.slice(0, 7), agenda.slice(7)].map(col => `<div>${col.map(r => `<button class="time-row${r[1] === '휴식' ? ' rest' : ''}" data-go="${slideFor(r)}"><em>${r[0]}</em><span>${esc(r[1])}</span><span>${r[2]}분</span></button>`).join('')}</div>`).join('')}</div>
      </div>`;
    }
    case 'git':
      return `<p class="lead">${esc(s.lead)}</p><div class="git-layout"><pre class="git-code">${esc(s.code)}</pre><div class="git-points">${s.cards.map(c=>`<div><b>${esc(c[0])}</b><p>${esc(c[1])}</p></div>`).join('')}</div></div>${refsNote(s.links)}`;
    case 'history':
      return `<p class="lead">${esc(s.lead)}</p><table class="git-history"><tbody>${s.history.map(c=>`<tr><td>${esc(c.short)}</td><td>${esc(c.feature)}</td></tr>`).join('')}</tbody></table>${refsNote(s.links)}`;
    case 'lab':
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main"><div class="req">
        <section><div class="label"><small>Claude Code에 입력 · <span style="text-transform:none">해당 Stage 작업 폴더</span></small><button class="copy" data-copy="${i}">요청 복사</button></div><pre class="prompt" id="prompt-${i}">${marked(resolve(s.prompt))}</pre>${explainList(s)}</section>
        <section><div class="label"><small>실행 후 직접 확인</small><strong>체크</strong></div>${checkList(s, i)}</section>
      </div></div>
      <div class="bottom-note"><b>안 되면</b><div class="fix-line"><span>${marked(s.repair)}</span></div><button class="copy small" data-repair="${i}">다시 요청 복사</button></div>`;
    case 'steps':
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main"><div class="step-grid">${s.cards.map((c, j) => `<div><small>STEP ${pad(j + 1)}</small><strong>${pad(j + 1)}</strong><h3>${esc(c[0].replace(/^[①-⑳]\s*/, ''))}</h3><p>${esc(c[1])}</p></div>`).join('')}</div></div>${refsNote(s.links)}`;
    case 'checklist': {
      const done = s.checks.filter((_, j) => checks[i + '-' + j]).length;
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main">${checkList(s, i, true)}<p class="check-count" data-count="${i}">${done} / ${s.checks.length} 확인</p></div>`;
    }
    case 'diagram':
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main">${diagram(s.visual)}</div>${refsNote(s.links)}`;
    case 'image':
      return `<div class="slide-main"><div class="result">
        <figure class="shot"><button class="shot-frame" data-enlarge="${esc(s.image)}" aria-label="확대 보기"><img src="${esc(s.image)}" alt="${esc(s.title)} · 실제 작업 화면"></button><figcaption><span>실제 작업 화면</span><span>클릭하여 확대</span></figcaption></figure>
        <aside><div class="label"><small>${esc(s.part)}</small><strong>요점</strong></div><p class="point">${esc(s.lead)}</p>
        ${s.links.length ? `<ul class="legend">${s.links.map(l => `<li><a href="${esc(l[1])}" target="_blank" rel="noopener">${esc(l[0])} ↗</a><span>${esc(l[1].split('.').pop().toUpperCase())}</span></li>`).join('')}</ul>` : ''}
        <p class="aside-note">${esc(s.aside || "기존 작업의 화면입니다. 실습 결과는 달라질 수 있습니다.")}</p></aside>
      </div></div>`;
    case 'table': {
      const heads = tableHeads[s.title] || ['항목', '내용'];
      const split = heads.length === 3;
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main"><table class="vtable"><thead><tr>${split ? `<th>${heads[0]}</th><th>${heads[1]}</th><th></th><th>${heads[2]}</th>` : `<th>${heads[0]}</th><th>${heads[1]}</th>`}</tr></thead><tbody>${s.cards.map(c => {
        if (!split) return `<tr><td>${esc(c[0])}</td><td>${esc(c[1])}</td></tr>`;
        const [a, b] = c[1].split(' → ');
        return `<tr><td>${esc(c[0])}</td><td class="q">${esc(a)}</td><td class="arrow">→</td><td>${esc(b ?? '')}</td></tr>`;
      }).join('')}</tbody></table></div>${refsNote(s.links, '근거')}`;
    }
    case 'cards': {
      const long = s.cards.some(c => c[1].length > 45);
      const inner = long
        ? `<div class="cols">${s.cards.map(c => `<div><b>${esc(c[0])}</b><p>${esc(c[1])}</p></div>`).join('')}</div>`
        : `<div class="statement-list">${s.cards.map(c => `<div><b>${esc(c[0])}</b><span>${esc(c[1])}</span></div>`).join('')}</div>`;
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main">${inner}</div>${refsNote(s.links)}`;
    }
    case 'break': {
      const ai = agenda.findIndex(r => r[1] === '휴식' && s.time.startsWith(r[0]));
      const next = [];
      for (let k = ai + 1; k < agenda.length && agenda[k][1] !== '휴식'; k++) next.push(agenda[k]);
      return `<div class="slide-main"><div class="break-body">
        <div class="timer"><output id="timer-${i}" data-sec="600">10:00</output><div class="timer-ctrl"><button data-timer="${i}" data-act="start">시작</button><button data-timer="${i}" data-act="pause">일시정지</button><button data-timer="${i}" data-act="reset">다시 10:00</button></div></div>
        <div class="index-col"><header><small>쉬고 나서</small><strong>${next.length} 단계</strong></header>${next.map(r => `<button class="index-row" data-go="${slideFor(r)}"><em>${r[0]}</em><span>${esc(r[1])}</span><span>${r[2]}분</span></button>`).join('')}<p class="break-lead">${esc(s.lead)}</p></div>
      </div></div>`;
    }
    case 'resources':
      return `<p class="lead">${esc(s.lead)}</p><div class="slide-main">${resourcesHTML()}</div>`;
  }
  return '';
}

const R = (name, href, tag, ext = false) => `<a class="res-row" href="${href}" ${ext ? 'target="_blank" rel="noopener"' : 'download'}><b style="font-weight:500">${name}</b><span>${tag}</span></a>`;
const resourceGroups = [["00","단계별 완성 앱",[["Stage 1 · 단위세대 계획","apps/stage1/index.html","APP ↗",true],["Stage 2 · 동평면 조합","apps/stage2/index.html","APP ↗",true],["Stage 3 · 단지 배치 검토","apps/stage3/index.html","APP ↗",true]]],["01","실습 입력 · 59 / 74 / 84",[["59형 평면","downloads/unit-59.json","JSON"],["74형 평면","downloads/unit-74.json","JSON"],["84형 평면","downloads/unit-84.json","JSON"],["3세대 동평면 후보","downloads/building-example.json","JSON"]]],["02","강의 · 시작 파일",[["실습 에셋 · 시작 소스 · 커밋 기준","materials.html","GUIDE ↗",true],["인계서 · 개인 경로 제거본","downloads/handoff.txt","TXT"],["전체 실습 요청문","downloads/prompts.txt","TXT"],["강사 노트","downloads/instructor-notes.txt","TXT"]]],["03","모델 지침 · 참고",[["Stage 1 모델 지침","downloads/stage1-instructions.txt","TXT"],["Stage 3 모델 지침","downloads/stage3-instructions.txt","TXT"],["규칙 출처 · 2026-10-15 기록","downloads/rules-reference.json","JSON"],["자료 준비·실행 안내","downloads/README.txt","TXT"],["참고한 강의 포맷","https://share.planby.us/haud-cad-mcp-skill/#1","WEB ↗",true]]]];
function resourcesHTML(){return `<div class="res-grid">${[resourceGroups.slice(0,2),resourceGroups.slice(2)].map(col=>`<div class="res-col">${col.map(g=>`<section><header><small>${g[0]}</small><strong>${g[1]}</strong></header>${g[2].map(r=>R(...r)).join('')}</section>`).join('')}</div>`).join('')}</div>`;}

/* ---------- render & navigation ---------- */
function render() {
  $('stage').innerHTML = slides.map((s, i) => {
    const head = s.kind === 'cover' ? '' : `<header class="slide-head"><div class="slide-chapter">${esc(s.part)}<span>${esc(s.time)}</span></div><h2>${esc(s.title)}</h2><div class="slide-page">${pad(i + 1)}</div></header>`;
    return `<section class="slide k-${s.kind}" data-slide="${i}" aria-label="${i + 1}. ${esc(s.title.replace('\n', ' '))}">${head}<div class="slide-body">${body(s, i)}</div></section>`;
  }).join('');
  document.documentElement.classList.toggle('reading', reading);
  $('readBtn').textContent = reading ? '발표' : '읽기';
  go(current, false);
  if (!reading) requestAnimationFrame(fitText);
}
function fitText() {
  document.querySelectorAll('.slide-head h2').forEach(h => {
    let size = 62;
    h.style.fontSize = '';
    while (h.scrollWidth > h.clientWidth + 1 && size > 38) h.style.fontSize = (size -= 2) + 'px';
  });
  document.querySelectorAll('.explain').forEach(x => {
    let size = 22;
    x.querySelectorAll('dd').forEach(d => d.style.fontSize = '');
    while (x.scrollHeight > x.clientHeight + 1 && size > 16) { size -= 1; x.querySelectorAll('dd').forEach(d => d.style.fontSize = size + 'px'); }
  });
  document.querySelectorAll('.prompt').forEach(p => {
    let size = 28;
    p.style.fontSize = '';
    while (p.scrollHeight > p.clientHeight + 1 && size > 18) p.style.fontSize = (size -= 1) + 'px';
  });
}
function fit() {
  if (reading) return;
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  const x = (innerWidth - 1920 * scale) / 2, y = (innerHeight - 1080 * scale) / 2;
  $('stage').style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}
function go(n, hash = true) {
  current = Math.max(0, Math.min(slides.length - 1, n));
  document.querySelectorAll('.slide').forEach((el, i) => el.classList.toggle('is-active', i === current));
  $('count').textContent = `${current + 1} / ${slides.length}`;
  $('prev').disabled = current === 0;
  $('next').disabled = current === slides.length - 1;
  $('progress').style.width = (current + 1) / slides.length * 100 + '%';
  if (hash) history.replaceState(null, '', '#' + (current + 1));
  if (reading && hash) document.querySelector(`[data-slide="${current}"]`)?.scrollIntoView({ block: 'start' });
  if ($('notes').classList.contains('open')) showNotes();
  fit();
}
function closeAll() { document.querySelectorAll('.overlay').forEach(e => e.classList.remove('open')); }
function open(id) { closeAll(); $(id).classList.add('open'); ($(id).querySelector('input,textarea') || $(id).querySelector('button'))?.focus(); }
function toast(t) { const el = $('toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 2300); }
async function copy(t, btn) {
  try {
    await navigator.clipboard.writeText(t);
    toast('복사했습니다.');
    if (btn) { const label = btn.textContent; btn.classList.add('done'); btn.textContent = '복사됨'; setTimeout(() => { btn.classList.remove('done'); btn.textContent = label; }, 1600); }
  } catch { open('fallback'); $('manualCopy').value = t; $('manualCopy').focus(); $('manualCopy').select(); }
}
function download(name, text) { const u = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1500); }
function toc() {
  const q = $('search').value.trim().toLowerCase();
  $('tocgrid').innerHTML = slides.map((s, i) => ({ s, i })).filter(({ s }) => (s.title + s.part + s.lead).toLowerCase().includes(q))
    .map(({ s, i }) => `<button data-go="${i}" class="${current === i ? 'cur' : ''}"><em>${pad(i + 1)}</em><span>${esc(s.title.replace('\n', ' '))}</span><small>${esc(s.part)} · ${esc(s.time)} · ${kindLabel[s.kind] || ''}</small></button>`).join('');
}
function showNotes() { $('notesTitle').textContent = `강사 노트 · ${pad(current + 1)} ${slides[current].title.replace('\n', ' ')}`; $('notesText').textContent = slides[current].note || '노트 없음'; }

/* break timers */
const timers = {};
function tickTimer(i) {
  const out = $('timer-' + i), t = timers[i];
  const left = Math.round((t.end - Date.now()) / 1000);
  const v = Math.abs(left);
  out.textContent = (left < 0 ? '+' : '') + `${Math.floor(v / 60)}:${pad(v % 60)}`;
  out.classList.toggle('over', left < 0);
}
function timer(i, act) {
  const out = $('timer-' + i), t = timers[i] || (timers[i] = { remain: 600, end: 0, id: 0 });
  if (act === 'start' && !t.id) { t.end = Date.now() + t.remain * 1000; t.id = setInterval(() => tickTimer(i), 250); tickTimer(i); }
  if (act === 'pause' && t.id) { clearInterval(t.id); t.id = 0; t.remain = Math.round((t.end - Date.now()) / 1000); }
  if (act === 'reset') { clearInterval(t.id); t.id = 0; t.remain = 600; out.textContent = '10:00'; out.classList.remove('over'); }
}

document.addEventListener('click', e => {
  const t = e.target.closest('button,a');
  if (!t) return;
  if (t.hasAttribute('data-close')) closeAll();
  if (t.dataset.copy !== undefined) copy(resolve(slides[+t.dataset.copy].prompt), t);
  if (t.dataset.repair !== undefined) copy(resolve(slides[+t.dataset.repair].repair), t);
  if (t.dataset.go !== undefined && +t.dataset.go >= 0) { closeAll(); go(+t.dataset.go); }
  if (t.dataset.enlarge) { $('largeImage').src = t.dataset.enlarge; open('lightbox'); }
  if (t.dataset.timer !== undefined) timer(+t.dataset.timer, t.dataset.act);
  if (t.dataset.check) {
    const k = t.dataset.check, on = !checks[k];
    checks[k] = on; store('apartment-stage123-checks', checks);
    t.setAttribute('aria-pressed', on);
    const i = +k.split('-')[0], c = document.querySelector(`[data-count="${i}"]`);
    if (c) c.textContent = `${slides[i].checks.filter((_, j) => checks[i + '-' + j]).length} / ${slides[i].checks.length} 확인`;
  }
  if (t.getAttribute('href') === '#resources') { e.preventDefault(); go(slides.findIndex(s => s.kind === 'resources')); }
  if (t.id === 'exportPrompts') download('Stage123-수업-프롬프트.txt', slides.filter(s => s.prompt).map(s => `${s.title}\n\n${resolve(s.prompt)}\n\n안 되면:\n${resolve(s.repair)}`).join('\n\n────────────────────\n\n'));
});
$('lightbox').addEventListener('click', e => { if (e.target === $('lightbox') || e.target.id === 'largeImage') closeAll(); });
$('prev').onclick = () => go(current - 1);
$('next').onclick = () => go(current + 1);
$('tocBtn').onclick = () => { toc(); open('toc'); };
$('search').oninput = toc;
$('notesBtn').onclick = () => { if ($('notes').classList.contains('open')) return closeAll(); showNotes(); open('notes'); };
$('resourcesBtn').onclick = () => go(slides.findIndex(s => s.kind === 'resources'));
$('readBtn').onclick = () => { userToggled = true; reading = !reading; render(); if (reading) document.querySelector(`[data-slide="${current}"]`)?.scrollIntoView({ block: 'start' }); };
$('print').onclick = () => window.print();
$('fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('브라우저 메뉴의 전체화면을 사용하세요.'); } };

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAll(); return; }
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const overlay = document.querySelector('.overlay.open');
  if (overlay && overlay.id !== 'notes') return;
  const k = e.key.toLowerCase();
  if (!reading && (k === 'arrowright' || k === 'pagedown' || k === ' ')) { e.preventDefault(); go(current + 1); }
  if (!reading && (k === 'arrowleft' || k === 'pageup')) { e.preventDefault(); go(current - 1); }
  if (k === 'home') go(0);
  if (k === 'end') go(slides.length - 1);
  const ids = { g: 'tocBtn', n: 'notesBtn', r: 'resourcesBtn', f: 'fullscreen' };
  if (ids[k] && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); $(ids[k]).click(); }
});
addEventListener('resize', () => { if (!userToggled && narrow() !== reading) { reading = narrow(); render(); } else fit(); });
addEventListener('hashchange', () => { const n = parseInt(location.hash.slice(1)); if (Number.isFinite(n)) go(n - 1, false); });
const start = parseInt(location.hash.slice(1));
if (Number.isFinite(start)) current = Math.max(0, Math.min(slides.length - 1, start - 1));
render();
if (document.fonts) document.fonts.ready.then(() => { if (!reading) fitText(); });

document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.getAttribute('href')==='downloads/prompts.txt'){e.preventDefault();download('Stage123-실습요청문.txt',slides.filter(s=>s.prompt).map(s=>s.title+'\n\n'+resolve(s.prompt)).join('\n\n────────\n\n'));}},true);
