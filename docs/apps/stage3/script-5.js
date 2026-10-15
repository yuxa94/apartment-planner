
/* presets.js */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerPresets = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Rule presets transcribed from official text or reference drawings, checked
  // 2026-10-15. They configure the screening engine; they are not a legal
  // determination. Applicability (zoning, roads, exceptions) stays unreviewed.
  const CHECKED = '2026-10-15';
  const REVISION_NOTE = `법령·조례는 개정될 수 있습니다. 원문 확인일(${CHECKED}) 이후의 개정 여부를 적용 시점에 원문에서 다시 확인하세요.`;

  const NATIONAL_UNREVIEWED = [
    '제86조제3항제2호 다목: 건축물과 부대시설·복리시설이 마주보는 경우 부대·복리시설 높이의 1배',
    '라목: 채광창(0.5㎡ 이상)이 없는 벽면과 측벽이 마주보는 경우 8m (면별 창 유무 미입력)',
    '제2호 단서: 동지 9~15시 연속 2시간 이상 일조 확보 시 거리 갈음',
    '제3호: 단지 내 도로를 사이에 둔 경우 도로 중심선 기준 채광방향 적용',
    '정북·인동 높이의 지반 고저차 보정, 부분 높이, 용도지역 적용 여부'
  ];

  const RULE_PRESETS = Object.freeze([
    {
      id: 'custom',
      name: '사용자 정의',
      effective: '사용자 가정 · 법규 미확정',
      rules: null,
      lines: ['설정 창에서 입력한 계수와 거리를 그대로 사용합니다.'],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'national-2026',
      name: '건축법 시행령 제86조 (조례 위임 하한)',
      short: '시행령 제86조',
      effective: '시행 2026-10-06 · 대통령령 제36746호',
      url: 'https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0086&lsiSeq=290833&urlMode=lsScJoRltInfoR',
      caution: '가목·나목은 "0.5배 이상의 범위에서 건축조례로 정하는 거리"입니다. 대상 지자체 조례로 상향될 수 있습니다.',
      rules: {
        profile: 'facing', distanceFactor: 0.5, minDistance: 4,
        northEnabled: true, northLowHeight: 10, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 0.5, southLowTall: 0, southLowLow: 0.5, southLowMin: 10, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '제1항 정북: 높이 10m 이하 부분 1.5m 이상, 10m 초과 부분 해당 높이의 1/2 이상',
        '제3항제1호 채광방향: 각 부분 높이 ≤ 채광창 벽면→인접대지경계 수평거리 × 2 (근린상업·준주거 4배)',
        '제3항제2호 가목: 채광창 벽면 직각방향 0.5H 이상 범위에서 조례',
        '나목: 높은 동의 주된 개구부가 남측(정동→정서) 낮은 동을 향하면 10m 이상 + 낮은 동 0.5H 이상 범위에서 조례',
        '마목: 측벽과 측벽이 마주보는 경우 4m 이상'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'cheongju-2026',
      name: '청주시 건축 조례 제35조',
      short: '청주시 조례 제35조',
      effective: '시행 2026-04-10 · 청주시조례 제1775호',
      url: 'https://www.law.go.kr/자치법규/청주시건축조례',
      caution: '정북 기준 높이는 2023-12-22 개정으로 10m입니다. AG-109(2023.08) 도면은 개정 전 9m 기준입니다.',
      rules: {
        profile: 'facing', distanceFactor: 1, minDistance: 4,
        northEnabled: true, northLowHeight: 10, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 1, southLowTall: 0, southLowLow: 1, southLowMin: 10, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '① 정북: 높이 10m 이하 부분 1.5m 이상, 10m 초과 부분 해당 높이의 1/2 이상',
        '② 영 제86조제3항 단서의 거리 1.5m (다세대주택 채광방향 특례)',
        '③-1 채광창 벽면 직각방향 건축물 각 부분 높이의 1.0배 이상 (도시형 생활주택 0.5배)',
        '③-2 높은 동(축 정동→정서)의 주된 개구부가 낮은 동을 향하면 10m 이상 + 낮은 동 높이의 1.0배 이상',
        '시행령 제86조: 측벽↔측벽 4m, 채광방향 높이 ≤ 경계거리 × 2'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    },
    {
      id: 'samsong-2016',
      name: '고양삼송 A00-008 도면 기준',
      short: '삼송 A00-008 (2016)',
      effective: '2016 참고도면 표기 · 현행 고양시 조례 미확인',
      caution: '참고도면의 당시 기준입니다. 현행 법령(정북 10m, 나목 10m 하한)과 다를 수 있습니다.',
      rules: {
        profile: 'facing', distanceFactor: 1, minDistance: 4,
        northEnabled: true, northLowHeight: 9, northLowSetback: 1.5, northFactor: 0.5,
        facing: { lightFactor: 1, southLowTall: 0.8, southLowLow: 1, southLowMin: 0, sideToSide: 4 },
        lightLimit: { enabled: true, factor: 2 }
      },
      lines: [
        '정북: 높이 9m 이하 1.5m, 9m 초과 높이의 1/2 이상',
        '채광창 벽면 직각방향 인접대지경계까지 수평거리의 2배 이하',
        '마주보는 동 1.0H, 남측이 낮은 경우 높은 동 0.8H 이상 + 낮은 동 1.0H 이상',
        '채광창 없는 벽면↔측벽 8m, 측벽↔측벽 4m, 대지안의 공지 아파트 3m'
      ],
      unreviewed: NATIONAL_UNREVIEWED
    }
  ]);

  const HEIGHT_PRESETS = Object.freeze([
    { id: 'simple', name: '층수 × 층고', height: {} },
    { id: 'ag109-penthouse', name: '청주월명 AG-109 · 펜트하우스', height: { first: 3.5, top: [3, 3], parapet: 0.4 } },
    { id: 'ag109', name: '청주월명 AG-109 · 펜트하우스 아님', height: { first: 3.5, top: [3], parapet: 0.4 } },
    { id: 'samsong', name: '고양삼송 A00-008', height: { base: 0.6, parapet: 0.25 } }
  ]);

  const clone = value => JSON.parse(JSON.stringify(value));
  const find = (list, id) => list.find(p => p.id === id) || null;
  const num = v => String(Math.round(v * 100) / 100);

  function applyRulePreset(rules, id) {
    const preset = find(RULE_PRESETS, id);
    if (!preset) throw new RangeError(`Unknown rule preset ${id}`);
    const next = { ...clone(rules), preset: id };
    if (preset.rules) Object.assign(next, clone(preset.rules));
    return next;
  }

  function applyHeightPreset(rules, id) {
    const preset = find(HEIGHT_PRESETS, id);
    if (!preset) throw new RangeError(`Unknown height preset ${id}`);
    return { ...clone(rules), height: clone(preset.height), heightPreset: id };
  }

  // Human-readable formula for a height configuration, e.g.
  // "H = 1층 3.5 + (층수 − 3) × 기준층고 + 3 + 3 + 파라펫 0.4".
  function heightFormula(height) {
    const h = height || {}, top = h.top || [];
    const parts = [];
    if (h.base) parts.push(`지반 ${num(h.base)}`);
    if (h.first !== undefined) parts.push(`1층 ${num(h.first)}`);
    const skip = (h.first !== undefined ? 1 : 0) + top.length;
    parts.push(skip ? `(층수 − ${skip}) × 기준층고` : '층수 × 층고');
    top.forEach(v => parts.push(num(v)));
    if (h.parapet) parts.push(`파라펫 ${num(h.parapet)}`);
    return `H = ${parts.join(' + ')}` + (h.first !== undefined ? ' · 1층 전체 필로티 동은 1층 제외' : '');
  }

  function describe(rules) {
    return {
      preset: find(RULE_PRESETS, rules.preset) || RULE_PRESETS[0],
      height: find(HEIGHT_PRESETS, rules.heightPreset),
      formula: heightFormula(rules.height),
      checked: CHECKED
    };
  }

  return Object.freeze({ RULE_PRESETS, HEIGHT_PRESETS, applyRulePreset, applyHeightPreset, heightFormula, describe, CHECKED, REVISION_NOTE });
}));

