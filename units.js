(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerUnits = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = [59, 74, 84];
  const COLORS = { living: '#dbeafe', kitchen: '#e0e7ff', bedroom: '#d1e7f1', wet: '#ccebe8', service: '#f2e9d9' };
  const round = n => Math.round(n * 1000) / 1000;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const ROOM_DATA = {
    59: { width: 12.9, depth: 8.3, livingWidth: 3790, rooms: [
      ['master', '안방', .2, 4.5, 3.4, 3.6, 'bedroom'], ['living', '거실', 3.7, 4.3, 3.6, 4, 'living'],
      ['bed2', '침실 2', 7.4, 5, 2.7, 3.3, 'bedroom'], ['bed3', '침실 3', 10.2, 5, 2.6, 3.3, 'bedroom'],
      ['kitchen', '주방·식당', 3.7, .6, 3, 3.2, 'kitchen'], ['bath1', '공용욕실', 6.9, .5, 1.6, 2.3, 'wet'],
      ['bath2', '부부욕실', 1.9, .5, 1.4, 2.2, 'wet'], ['dress', '드레스룸', .2, .5, 1.5, 1.8, 'service'],
      ['entry', '현관', 8.8, 2.9, 1.5, 1.8, 'service'], ['utility', '다용도실', .2, 2.4, 1.5, 2, 'wet'],
      ['pantry', '팬트리', 10.5, 3.2, 1, 1.2, 'service']
    ] },
    74: { width: 13.1, depth: 9, livingWidth: 4590, rooms: [
      ['master', '안방', .2, 5.2, 3.6, 3.6, 'bedroom'], ['living', '거실', 3.9, 4.6, 4.2, 4.2, 'living'],
      ['bed2', '침실 2', 8.2, 5.3, 2.8, 3.5, 'bedroom'], ['bed3', '침실 3', 9.9, .2, 3, 3.4, 'bedroom'],
      ['kitchen', '주방·식당', 4.1, .3, 3.4, 3.6, 'kitchen'], ['bath1', '공용욕실', 7.7, .3, 1.7, 2.3, 'wet'],
      ['bath2', '부부욕실', 2.3, .3, 1.5, 2.2, 'wet'], ['dress', '드레스룸', .2, .3, 1.8, 2, 'service'],
      ['entry', '현관', 11.1, 3.8, 1.7, 1.8, 'service'], ['utility', '다용도실', .2, 2.6, 1.6, 2.2, 'wet'],
      ['pantry', '팬트리', 2.3, 3, 1.2, 1.5, 'service']
    ] },
    84: { width: 13.8, depth: 9.4, livingWidth: 4690, rooms: [
      ['master', '안방', .2, .2, 3.7, 3.8, 'bedroom'], ['living', '거실', 6.5, 4.9, 4.5, 4.4, 'living'],
      ['bed2', '침실 2', 3.4, 5.6, 3, 3.6, 'bedroom'], ['bed3', '침실 3', .2, 5.6, 3.1, 3.6, 'bedroom'],
      ['kitchen', '주방·식당', 6.5, .2, 3.6, 3.9, 'kitchen'], ['bath1', '공용욕실', 11.1, 6.9, 1.7, 2.4, 'wet'],
      ['bath2', '부부욕실', 11.1, 4.4, 1.6, 2.3, 'wet'], ['dress', '드레스룸', 4.1, .2, 2.1, 2.4, 'service'],
      ['entry', '현관', 10.3, .2, 1.8, 2, 'service'], ['utility', '다용도실', .2, 4.1, 1.8, 1.4, 'wet'],
      ['powder', '파우더룸', 4.1, 2.8, 1.2, 1.4, 'service']
    ] }
  };

  function createUnit(type) {
    type = Number(type);
    if (!ROOM_DATA[type]) throw new Error('지원하는 평형은 59, 74, 84입니다.');
    const source = ROOM_DATA[type];
    return {
      id: 'unit-' + type, type, name: type + '형 · 조닝 초안', width: source.width, depth: source.depth,
      rooms: source.rooms.map(r => ({ id: r[0], name: r[1], x: r[2], y: r[3], width: r[4], depth: r[5], category: r[6], locked: false })),
      reference: { status: 'illustrative', project: 'LH 양주회천 A-26', type: type + 'A', image: 'assets/' + type + 'A-plan.png',
        officialLivingWidthMm: source.livingWidth, areaDefinition: '직사각형 조닝 영역. 벽체·발코니·법정 전용면적 미산정.',
        sourceFile: '59-74-84_실별면적_치수_대표도면.md', dimensionStatus: '공식 도면 표기값은 조닝의 유효치수와 구분' }
    };
  }

  function checkUnit(unit) {
    const rooms = unit.rooms || [], overlaps = [], outside = [], invalid = [];
    let area = 0;
    for (const r of rooms) {
      if (![r.x, r.y, r.width, r.depth].every(Number.isFinite) || r.width <= 0 || r.depth <= 0) { invalid.push(r.id); continue; }
      area += r.width * r.depth;
      if (r.x < -1e-7 || r.y < -1e-7 || r.x + r.width > unit.width + 1e-7 || r.y + r.depth > unit.depth + 1e-7) outside.push(r.id);
    }
    const valid = rooms.filter(r => !invalid.includes(r.id));
    valid.forEach((a, i) => valid.slice(i + 1).forEach(b => {
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const d = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
      if (w > 1e-7 && d > 1e-7) overlaps.push({ a: a.id, b: b.id, area: round(w * d) });
    }));
    // Sweep the occupied rectangles, so triple overlap is counted only once.
    const xs = [...new Set(valid.flatMap(r => [r.x, r.x + r.width]))].sort((a, b) => a - b);
    let unionArea = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      const middle = (xs[i] + xs[i + 1]) / 2;
      const intervals = valid.filter(r => r.x < middle && r.x + r.width > middle).map(r => [r.y, r.y + r.depth]).sort((a, b) => a[0] - b[0]);
      let low = null, high = null, depth = 0;
      for (const p of intervals) {
        if (low === null) { low = p[0]; high = p[1]; }
        else if (p[0] <= high) high = Math.max(high, p[1]);
        else { depth += high - low; low = p[0]; high = p[1]; }
      }
      if (low !== null) depth += high - low;
      unionArea += (xs[i + 1] - xs[i]) * depth;
    }
    return { area: round(area), unionArea: round(unionArea), overlaps, outside, invalid };
  }

  function editRoom(unit, roomId, patch) {
    const room = unit.rooms.find(r => r.id === roomId);
    if (!room || room.locked) return false;
    for (const key of ['x', 'y', 'width', 'depth']) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      const minimum = key === 'width' || key === 'depth' ? 0.1 : -500;
      if (!Number.isFinite(patch[key]) || patch[key] < minimum || patch[key] > 500) return false;
    }
    for (const key of ['x', 'y', 'width', 'depth']) if (Object.prototype.hasOwnProperty.call(patch, key)) room[key] = round(patch[key]);
    return true;
  }

  function generateCombinations(units, options) {
    options = options || {};
    const count = [2, 4, 6].includes(Number(options.count)) ? Number(options.count) : 4;
    const coreCapacity = Number(options.coreCapacity) === 2 ? 2 : 4;
    const types = [...new Set((options.types || TYPES).map(Number).filter(t => TYPES.includes(t)))];
    if (!types.length) return [];
    const sequence = Array.from({ length: count }, (_, i) => {
      const type = types[i % types.length];
      return units.find(u => Number(u.type) === type) || createUnit(type);
    });
    const unitMix = types.map(type => ({ type, count: sequence.filter(u => Number(u.type) === type).length })).filter(m => m.count);
    const coreCount = Math.ceil(count / coreCapacity), unitArea = sequence.reduce((sum, u) => sum + Number(u.type), 0);
    const slotW = Math.max(...sequence.map(u => u.width)), slotD = Math.max(...sequence.map(u => u.depth)), belt = 9.8, passage = 1.8;
    const labels = ['일렬 배치', '마주보기 배치', '세로 연결 배치'];
    return ['linear', 'double', 'vertical'].map((layout, index) => {
      const placed = [], cores = [], corridors = [];
      let width, depth;
      const half = count / 2;
      if (layout === 'linear') {
        width = count * slotW; depth = slotD + passage + 6.2;
        sequence.forEach((u, i) => placed.push({ id: 'u' + i, type: Number(u.type), name: u.type + '형', x: i * slotW, y: slotD - u.depth, width: u.width, depth: u.depth }));
        corridors.push({ x: 0, y: slotD, width, depth: passage });
        for (let i = 0; i < coreCount; i++) cores.push({ id: 'c' + i, name: '코어', x: (i + .5) * width / coreCount - 2.9, y: slotD + passage, width: 5.8, depth: 6.2 });
      } else if (layout === 'double') {
        width = half * slotW; depth = slotD * 2 + belt;
        sequence.forEach((u, i) => placed.push({ id: 'u' + i, type: Number(u.type), name: u.type + '형', x: (i % half) * slotW, y: i < half ? slotD - u.depth : slotD + belt, width: u.width, depth: u.depth }));
        corridors.push({ x: 0, y: slotD, width, depth: belt });
        for (let i = 0; i < coreCount; i++) cores.push({ id: 'c' + i, name: '코어', x: (i + .5) * width / coreCount - 2.9, y: slotD + passage, width: 5.8, depth: 6.2 });
      } else {
        width = slotW * 2 + belt; depth = half * slotD;
        sequence.forEach((u, i) => placed.push({ id: 'u' + i, type: Number(u.type), name: u.type + '형', x: i < half ? slotW - u.width : slotW + belt, y: (i % half) * slotD, width: u.width, depth: u.depth }));
        corridors.push({ x: slotW, y: 0, width: belt, depth });
        for (let i = 0; i < coreCount; i++) cores.push({ id: 'c' + i, name: '코어', x: slotW + 2, y: (i + .5) * depth / coreCount - 3.1, width: 5.8, depth: 6.2 });
      }
      const corridorArea = corridors.reduce((s, c) => s + c.width * c.depth, 0);
      const coreOnlyArea = coreCount * 5.8 * 6.2;
      // In the two-sided layouts cores occupy part of the common belt.
      const coreArea = layout === 'linear' ? corridorArea + coreOnlyArea : corridorArea;
      return { id: 'type-' + types.join('-') + '-' + count + '-' + coreCapacity + '-' + layout,
        name: count + '세대 · ' + labels[index], width: round(width), depth: round(depth), unitsPerFloor: count,
        unitArea: unitArea / count, totalUnitArea: unitArea, nominalArea: unitArea, coreArea: round(coreArea), coreOnlyArea: round(coreOnlyArea), coreCount, coreCapacity,
        unitMix, source: 'schematic', layout, footprintArea: round(width * depth), sourceUnitIds: sequence.map(u => u.id),
        reviewStatus: '연결·피난·구조·채광 미검토', geometry: { units: placed, cores, corridors } };
    });
  }

  // Reference building plans read from drawing dimension strings (mm → m). Observed values, not DWG extraction.
  const REFERENCES = {
    'susaek4-101': {
      id: 'susaek4-101', name: '수색4 101동 · 편복도 4세대 + 후면 코어',
      source: 'HAUD 수색4 사업시행변경인가(2019.08) A-303 · 101동 2층 및 3~7층 평면도 1/100',
      unitType: 39, unitArea: 39, balconyDepth: 1.5, corridorDepth: 2.056, entranceWidth: 1.0,
      // Entrances are paired at the shared wall (mirrored units), read from the plan.
      units: [{ frontage: 5.02, depth: 10.385, entrance: 'right' }, { frontage: 5.02, depth: 10.385, entrance: 'left' },
        { frontage: 5.02, depth: 10.385, entrance: 'right' }, { frontage: 5.02, depth: 10.385, entrance: 'left' }],
      // Core offset from grid A1, width A2–A3; depth 2,800 + 620 (B4–B5). Parts follow the 4,880 / 2,000 / 2,550 dimension segments.
      core: { offset: 5.375, width: 9.43, depth: 3.42, parts: [
        { kind: 'stair', name: '계단실', x: 0, y: 0, width: 4.88, depth: 2.8 },
        { kind: 'hall', name: '승강기홀', x: 4.88, y: 0, width: 2.0, depth: 2.8 },
        { kind: 'elevator', name: '승강기', x: 6.88, y: 0, width: 2.55, depth: 2.8 },
        { kind: 'shaft', name: 'AV/PS · PS · ST · EPS/TPS', x: 0, y: 2.8, width: 9.43, depth: 0.62 }] },
      expected: [
        { key: 'width', label: '동 전체 폭 (A1–A4)', value: 20.08 },
        { key: 'depth', label: '동 전체 깊이 (B1–B5)', value: 15.86 },
        { key: 'unitDepth', label: '세대 깊이 (B1–B3, 발코니 포함)', value: 10.385 },
        { key: 'coreOffset', label: '코어 시작 위치 (A1–A2)', value: 5.375 },
        { key: 'coreWidth', label: '코어 폭 (A2–A3)', value: 9.43 },
        { key: 'eastEnd', label: '코어 끝 ~ 동 끝 (A3–A4)', value: 5.275 }],
      excluded: ['코어 상부 5.0 m 구간 (2층 개방부, 3층 한정 부분)', '세대 내부 실 구획', '벽체 두께와 중심선·외곽선 구분', '계단·승강기 세부 치수 (치수선 구간 기준 개략 구획)']
    }
  };

  // Single-loaded corridor rule: units side by side by frontage, entrances on the corridor edge, core behind the corridor.
  function buildCorridorPlan(spec) {
    const unitsSpec = spec.units || [], core = spec.core, cd = spec.corridorDepth;
    const width = unitsSpec.reduce((s, u) => s + u.frontage, 0), unitY = core.depth + cd;
    const depth = unitY + Math.max(...unitsSpec.map(u => u.depth));
    const units = [], entrances = [];
    let x = 0;
    unitsSpec.forEach((u, i) => {
      units.push({ id: 'u' + i, type: spec.unitType, name: spec.unitType + '㎡형', x: round(x), y: round(unitY), width: u.frontage, depth: u.depth, balconyDepth: spec.balconyDepth || 0, entrance: u.entrance });
      const ew = spec.entranceWidth || 1;
      entrances.push({ unitId: 'u' + i, x: round(u.entrance === 'left' ? x + .2 : x + u.frontage - .2 - ew), y: round(unitY), width: ew });
      x += u.frontage;
    });
    const coreX = Number.isFinite(core.offset) ? core.offset : (width - core.width) / 2;
    const cores = [{ id: 'c0', name: '코어', x: round(coreX), y: 0, width: core.width, depth: core.depth, parts: (core.parts || []).map(p => ({ ...p, x: round(coreX + p.x), y: round(p.y) })) }];
    const corridors = [{ x: 0, y: round(core.depth), width: round(width), depth: cd }];
    const c = corridors[0], k = cores[0], eps = 1e-6;
    const checks = [
      { label: '모든 세대 현관이 복도 경계에 접함', ok: entrances.every(e => Math.abs(e.y - (c.y + c.depth)) < eps && e.x >= c.x - eps && e.x + e.width <= c.x + c.width + eps) },
      { label: '코어가 복도 후면에 접함', ok: Math.abs(k.y + k.depth - c.y) < eps && k.x >= c.x - eps && k.x + k.width <= c.x + c.width + eps },
      { label: '세대가 빈틈 없이 연속 배치', ok: units.every((u, i) => i === 0 ? Math.abs(u.x) < eps : Math.abs(u.x - (units[i - 1].x + units[i - 1].width)) < eps) }];
    const totalUnitArea = spec.unitArea * units.length, coreOnlyArea = core.width * core.depth, corridorArea = c.width * c.depth;
    return { width: round(width), depth: round(depth), units, entrances, cores, corridors, checks, totalUnitArea, coreOnlyArea: round(coreOnlyArea), coreArea: round(coreOnlyArea + corridorArea) };
  }

  function reproduceReference(id) {
    const ref = REFERENCES[id];
    if (!ref) return null;
    const plan = buildCorridorPlan(ref), core = plan.cores[0];
    const measured = { width: plan.width, depth: plan.depth, unitDepth: plan.units[0].depth, coreOffset: core.x, coreWidth: core.width, eastEnd: round(plan.width - core.x - core.width) };
    const comparison = ref.expected.map(e => { const diff = round(measured[e.key] - e.value); return { label: e.label, drawing: e.value, generated: measured[e.key], diff, ok: Math.abs(diff) <= .01 }; });
    return { id: 'ref-' + ref.id, name: ref.name, width: plan.width, depth: plan.depth, unitsPerFloor: plan.units.length,
      unitArea: ref.unitArea, totalUnitArea: plan.totalUnitArea, nominalArea: plan.totalUnitArea, coreArea: plan.coreArea, coreOnlyArea: plan.coreOnlyArea,
      coreCount: 1, coreCapacity: plan.units.length, unitMix: [{ type: ref.unitType, count: plan.units.length }], source: 'reference', referenceId: ref.id,
      referenceSource: ref.source, layout: 'single-loaded', footprintArea: round(plan.width * plan.depth), sourceUnitIds: [],
      reviewStatus: '도면 치수 판독 재현 · 피난·구조·설비 미검토', checks: plan.checks, comparison, excluded: ref.excluded.slice(),
      geometry: { units: plan.units, cores: plan.cores, corridors: plan.corridors, entrances: plan.entrances } };
  }

  function referenceSvg(t) {
    const g = t.geometry, pad = 3.2, partFill = { stair: '#3f6b93', hall: '#6f95b8', elevator: '#2f557b', shaft: '#8aa6c0' };
    const dim = (x1, x2, y, label) => `<g stroke="#8193a5" stroke-width=".05"><line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line x1="${x1}" y1="${y - .3}" x2="${x1}" y2="${y + .3}"/><line x1="${x2}" y1="${y - .3}" x2="${x2}" y2="${y + .3}"/></g><text x="${(x1 + x2) / 2}" y="${y - .25}" text-anchor="middle" font-size=".5" fill="#5d7185">${label}</text>`;
    const mm = v => Math.round(v * 1000).toLocaleString('ko-KR');
    const core = g.cores[0];
    return `<svg viewBox="${-pad} ${-pad} ${t.width + pad * 2} ${t.depth + pad * 2}" role="img" aria-label="${esc(t.name)} 재현 평면">
      ${g.corridors.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="#e3eaf1" stroke="#9fb2c4" stroke-width=".05"/><text x="${r.x + r.width - .4}" y="${r.y + r.depth / 2 + .2}" text-anchor="end" font-size=".55" fill="#5d7185">복도 ${mm(r.depth)}</text>`).join('')}
      ${g.units.map(u => `<g><rect x="${u.x}" y="${u.y}" width="${u.width}" height="${u.depth}" fill="#d2e9ee" stroke="#6d8ca4" stroke-width=".08"/><rect x="${u.x}" y="${u.y + u.depth - u.balconyDepth}" width="${u.width}" height="${u.balconyDepth}" fill="#eef6f8" stroke="#9ab4c4" stroke-width=".04"/><text x="${u.x + u.width / 2}" y="${u.y + u.depth / 2}" text-anchor="middle" font-size=".75" font-weight="650" fill="#3b5c77">${esc(u.name)}</text><text x="${u.x + u.width / 2}" y="${u.y + u.depth - u.balconyDepth / 2 + .18}" text-anchor="middle" font-size=".42" fill="#7b91a3">발코니</text></g>`).join('')}
      ${g.entrances.map(e => `<g><rect x="${e.x}" y="${e.y - .12}" width="${e.width}" height=".24" fill="#e08a2e"/><text x="${e.x + e.width / 2}" y="${e.y + .75}" text-anchor="middle" font-size=".42" fill="#b4691c">현관</text></g>`).join('')}
      ${core.parts.map(p => `<g><rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.depth}" fill="${partFill[p.kind] || '#507ca5'}" stroke="#fff" stroke-width=".05"/><text x="${p.x + p.width / 2}" y="${p.y + p.depth / 2 + .17}" text-anchor="middle" font-size="${p.depth < 1 ? .32 : p.width < 2.2 ? .4 : .5}" fill="white">${esc(p.name)}</text></g>`).join('')}
      ${dim(0, t.width, -1.6, mm(t.width))}
      ${dim(0, core.x, -.6, mm(core.x))}${dim(core.x, core.x + core.width, -.6, mm(core.width))}${dim(core.x + core.width, t.width, -.6, mm(t.width - core.x - core.width))}
      ${g.units.map(u => dim(u.x, u.x + u.width, t.depth + 1.1, mm(u.width))).join('')}
      <g transform="translate(${t.width + 1.6} 0)"><g stroke="#8193a5" stroke-width=".05"><line x1="0" y1="0" x2="0" y2="${t.depth}"/><line x1="-.3" y1="0" x2=".3" y2="0"/><line x1="-.3" y1="${t.depth}" x2=".3" y2="${t.depth}"/></g><text transform="translate(-.25 ${t.depth / 2}) rotate(-90)" text-anchor="middle" font-size=".5" fill="#5d7185">${mm(t.depth)}</text></g>
    </svg>`;
  }

  // Unit plans exported by Stage 1 (schema apartment-planner-unit/1): orthogonal outline, rooms, entry room.
  const UNIT_PLAN_FILES = ['unit-plans/unit-59.json', 'unit-plans/unit-74.json', 'unit-plans/unit-84.json'];
  const FACES = {
    S: { name: '남측', facing: '남향', origin: c => [0, c.depth], u: [1, 0], v: [0, 1], length: c => c.width },
    E: { name: '동측', facing: '동향', origin: c => [c.width, c.depth], u: [0, -1], v: [1, 0], length: c => c.depth },
    N: { name: '북측', facing: '북향', origin: c => [c.width, 0], u: [-1, 0], v: [0, -1], length: c => c.width },
    W: { name: '서측', facing: '서향', origin: c => [0, 0], u: [0, 1], v: [-1, 0], length: c => c.depth }
  };
  const DOOR = 1.0, EPS = 1e-6;

  // Parametric stair-hall core. Rules follow 주택건설기준 등에 관한 규칙 제4조 (lifts) and 건축법 시행령 제35조 (stairs);
  // every dimension below is a planning assumption, not a manufacturer or code minimum.
  const CORE_DIMENSIONS = {
    stairWidth: 2.7, stairLength: 5.4, lobbyLength: 2.0, hallDepth: 2.2, sideHallWidth: 1.8, shaftWidth: 0.9, floorHeight: 2.9,
    // Lift shaft (width × depth, m) by passenger capacity.
    lifts: { 13: [2.05, 2.15], 15: [2.15, 2.25], 17: [2.25, 2.35], 20: [2.45, 2.45], 24: [2.65, 2.55] }
  };
  const LIFT_CAPACITIES = [13, 15, 17, 20, 24];

  function coreRules(floors, unitsPerFloor, dims) {
    const rules = [], height = round(floors * dims.floorHeight);
    // Lifts: one per stair hall from 6 floors; two when 3+ units share it at 22+ floors. Capacity ≥ 0.3 persons per unit on floors 4+.
    let count = floors >= 6 ? (unitsPerFloor >= 3 && floors >= 22 ? 2 : 1) : 0, capacity = null;
    const persons = floors >= 4 ? Math.max(1, Math.ceil(unitsPerFloor * (floors - 3) * 0.3)) : 0;
    if (count) {
      for (;;) { capacity = LIFT_CAPACITIES.find(c => c * count >= persons); if (capacity) break; count++; }
    }
    rules.push({ label: '승용승강기', value: count ? `${count}대 × ${capacity}인승` : '설치 의무 없음 (5층 이하)',
      basis: `계단실형: 계단실마다 1대, 층당 3세대 이상·22층 이상이면 2대. 탑승인원 ≥ 4층 이상 세대 ${unitsPerFloor * Math.max(0, floors - 3)}세대 × 0.3 = ${persons}명 (규칙 제4조)` });
    const stairKind = floors >= 16 ? 'special' : floors >= 5 ? 'escape' : 'direct';
    rules.push({ label: '계단 형식', value: { special: '특별피난계단 (부속실)', escape: '피난계단', direct: '직통계단' }[stairKind],
      basis: '공동주택 16층 이상 특별피난계단, 5층 이상 피난계단 (시행령 제35조, 갓복도식 예외 미적용)' });
    const emergency = height > 31;
    rules.push({ label: '비상용승강기', value: emergency ? `필요 (높이 약 ${fmt(height)} m > 31 m) · 승용 1대 겸용 가정` : `해당 없음 (높이 약 ${fmt(height)} m)`,
      basis: '건축법 제64조 높이 31 m 초과. 승강장·부속실 겸용 면적과 구조는 미검토' });
    return { rules, lifts: { count, capacity, persons, emergency }, stairKind, height };
  }

  // Layout (y down = south): a north band holds the stair (+ lobby) and the lift bank; the hall runs along its south side
  // and may extend left/right as a corridor (extLeft/extRight) or wrap up its east/west sides (sideHalls) for wing units.
  function buildCore(options) {
    options = options || {};
    const floors = Math.max(1, Math.round(Number(options.floors) || 25)), unitsPerFloor = Math.max(1, Math.round(Number(options.unitsPerFloor) || 2));
    const dims = { ...CORE_DIMENSIONS, ...(options.dims || {}) }, spec = coreRules(floors, unitsPerFloor, dims);
    const sides = options.sideHalls === 'both' ? ['W', 'E'] : options.sideHalls === 'E' ? ['E'] : [];
    const sideW = sides.includes('W') ? dims.sideHallWidth : 0, sideE = sides.includes('E') ? dims.sideHallWidth : 0;
    // A side hall replaces the corridor extension on that side so the hall edge stays on the core boundary.
    const extLeft = sideW ? 0 : Math.max(0, Number(options.extLeft) || 0), extRight = sideE ? 0 : Math.max(0, Number(options.extRight) || 0);
    const [lw, ld] = spec.lifts.count ? dims.lifts[spec.lifts.capacity] : [0, 0];
    const parts = [], stairDepth = dims.stairLength + (spec.stairKind === 'special' ? dims.lobbyLength : 0), bandDepth = round(Math.max(stairDepth, ld));
    const bandLeft = extLeft + sideW;
    let x = bandLeft;
    parts.push({ kind: 'stair', name: spec.stairKind === 'special' ? '특별피난계단' : '계단실', rect: [x, 0, x + dims.stairWidth, dims.stairLength] });
    if (spec.stairKind === 'special') parts.push({ kind: 'lobby', name: '부속실', rect: [x, dims.stairLength, x + dims.stairWidth, stairDepth] });
    x += dims.stairWidth;
    const liftLeft = x;
    for (let i = 0; i < spec.lifts.count; i++) {
      parts.push({ kind: 'lift', name: (spec.lifts.emergency && i === 0 ? '비상용 겸용 ' : '') + '승강기', rect: [x, bandDepth - ld, x + lw, bandDepth] });
      x += lw;
    }
    // Space over the lift bank left by a deeper stair: kept as core reserve (pit access, storage) in the drawing.
    if (x > liftLeft && bandDepth - ld > .3) parts.push({ kind: 'spare', name: '코어 여유', rect: [liftLeft, 0, x, bandDepth - ld] });
    parts.push({ kind: 'shaft', name: 'EPS·TPS·PS', rect: [x, 0, x + dims.shaftWidth, bandDepth] });
    x += dims.shaftWidth;
    if (x < bandLeft + dims.stairWidth + 1.2) parts.push({ kind: 'spare', name: '코어 여유', rect: [x, 0, bandLeft + dims.stairWidth + 1.2, bandDepth] });
    const bandRight = round(Math.max(x, bandLeft + dims.stairWidth + 1.2)), width = round(bandRight + sideE + extRight), depth = round(bandDepth + dims.hallDepth);
    const hallName = (extLeft || extRight || sides.length ? '승강기홀·복도' : '승강기홀') + (spec.lifts.emergency ? ' (비상용 승강장 겸용)' : '');
    parts.push({ kind: 'hall', name: hallName, rect: [0, bandDepth, width, depth] });
    if (sideW) parts.push({ kind: 'hall', name: '', rect: [0, 0, sideW, bandDepth] });
    if (sideE) parts.push({ kind: 'hall', name: '', rect: [bandRight, 0, bandRight + sideE, bandDepth] });
    parts.forEach(p => { p.rect = p.rect.map(round); });
    // Entrances open only onto the hall: its south edge, plus its east/west ends (the full depth where a side hall runs).
    const doorZones = [{ face: 'S', from: 0, to: width },
      { face: 'E', from: 0, to: sideE ? depth : round(depth - bandDepth) },
      { face: 'W', from: sideW ? 0 : bandDepth, to: depth }];
    const rects = [[bandLeft, 0, bandRight, bandDepth], [0, bandDepth, width, depth]];
    if (sideW) rects.push([0, 0, sideW, bandDepth]);
    if (sideE) rects.push([bandRight, 0, bandRight + sideE, bandDepth]);
    rects.forEach((r, i) => { rects[i] = r.map(round); });
    const commonArea = round(rects.reduce((sum, r) => sum + (r[2] - r[0]) * (r[3] - r[1]), 0));
    return { width, depth, floors, unitsPerFloor, parts, rects, commonArea, extLeft, extRight, sideHalls: sides.join('') || 'none', doorZones,
      lifts: spec.lifts, stairKind: spec.stairKind, height: spec.height, rules: spec.rules, dims };
  }

  // Splits an orthogonal polygon into rectangles [x0, y0, x1, y1] by vertical slabs.
  function polygonRects(outline) {
    const xs = [...new Set(outline.map(p => p[0]))].sort((a, b) => a - b), rects = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const xm = (xs[i] + xs[i + 1]) / 2, ys = [];
      outline.forEach((a, k) => {
        const b = outline[(k + 1) % outline.length];
        if (Math.abs(a[1] - b[1]) < EPS && Math.min(a[0], b[0]) < xm && xm < Math.max(a[0], b[0])) ys.push(a[1]);
      });
      ys.sort((a, b) => a - b);
      for (let j = 0; j + 1 < ys.length; j += 2) rects.push([xs[i], ys[j], xs[i + 1], ys[j + 1]]);
    }
    return rects;
  }

  // Reads one exported unit plan. The entrance is the edge of the entry room that lies on the outline and faces north (−y).
  function profileFromPlan(plan) {
    const unit = plan && plan.unit ? plan.unit : plan;
    if (!unit || !TYPES.includes(Number(unit.type)) || !Array.isArray(unit.outline) || unit.outline.length < 4 || !Array.isArray(unit.rooms)) throw new Error('세대 평면 형식 오류');
    if (plan.coordinateUnit && plan.coordinateUnit !== 'm') throw new Error('세대 평면 좌표 단위는 m여야 합니다.');
    const outline = unit.outline.map(p => [Number(p[0]), Number(p[1])]);
    if (outline.some(p => !p.every(Number.isFinite))) throw new Error('세대 외곽 좌표 오류');
    const entry = unit.rooms.find(r => r.id === 'entry') || unit.rooms.find(r => /현관$/.test(r.name || ''));
    if (!entry) throw new Error(unit.type + '형: 현관 실이 없습니다.');
    const onTop = outline.some((a, k) => { const b = outline[(k + 1) % outline.length];
      return Math.abs(a[1] - entry.y) < EPS && Math.abs(b[1] - entry.y) < EPS && Math.min(a[0], b[0]) <= entry.x + EPS && Math.max(a[0], b[0]) >= entry.x + entry.width - EPS; });
    if (!onTop) throw new Error(unit.type + '형: 현관 북측 변이 외곽선 위에 있지 않습니다.');
    const xs = outline.map(p => p[0]), ys = outline.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), width = Math.max(...xs) - minX, depth = Math.max(...ys) - minY;
    const norm = ([x, y]) => [round(x - minX), round(y - minY)];
    const local = outline.map(norm), door = { x: round(entry.x + entry.width / 2 - minX), y: round(entry.y - minY) };
    return { type: Number(unit.type), id: unit.id, name: unit.name, width: round(width), depth: round(depth), outline: local, rects: polygonRects(local), door,
      // Corners on or behind the entrance line: where the core pocket can be aligned to a core face.
      anchors: [...new Set(local.filter(p => p[1] <= door.y + EPS).map(p => p[0]))].sort((a, b) => a - b),
      rooms: unit.rooms.map(r => ({ id: r.id, name: r.name, category: r.category, rect: [round(r.x - minX), round(r.y - minY), round(r.x - minX + r.width), round(r.y - minY + r.depth)] })),
      area: Number(plan.checks && plan.checks.outlineArea) || null, revision: plan.projectRevision, exportedAt: plan.exportedAt };
  }

  function mirrorProfile(p) {
    const fx = x => round(p.width - x);
    return { ...p, outline: p.outline.map(([x, y]) => [fx(x), y]).reverse(), rects: p.rects.map(([x0, y0, x1, y1]) => [fx(x1), y0, fx(x0), y1]),
      door: { x: fx(p.door.x), y: p.door.y }, anchors: p.anchors.map(fx).sort((a, b) => a - b), rooms: p.rooms.map(r => ({ ...r, rect: [fx(r.rect[2]), r.rect[1], fx(r.rect[0]), r.rect[3]] })) };
  }

  function rectOf(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  const overlaps = (a, b) => a[0] < b[2] - EPS && b[0] < a[2] - EPS && a[1] < b[3] - EPS && b[1] < a[3] - EPS;

  // Places one unit so its entrance lies on a core face at position t, with the unit outside that face.
  function placeOnCore(profile, mirrored, faceKey, t, core) {
    const p = mirrored ? mirrorProfile(profile) : profile, f = FACES[faceKey], [ox, oy] = f.origin(core);
    const toWorld = ([x, y]) => { const u = x - p.door.x + t, v = y - p.door.y; return [round(ox + f.u[0] * u + f.v[0] * v), round(oy + f.u[1] * u + f.v[1] * v)]; };
    const box = r => rectOf([toWorld([r[0], r[1]]), toWorld([r[2], r[3]])]);
    const outline = p.outline.map(toWorld);
    return { type: p.type, unitId: p.id, mirrored: Boolean(mirrored), face: faceKey, facing: f.facing, t: round(t), rects: p.rects.map(box), outline,
      rooms: p.rooms.map(r => ({ name: r.name, category: r.category, rect: box(r.rect) })),
      door: [toWorld([p.door.x - DOOR / 2, p.door.y]), toWorld([p.door.x + DOOR / 2, p.door.y])],
      centre: toWorld([p.width / 2, (p.door.y + p.depth) / 2]), box: rectOf(outline) };
  }

  // All single placements: a corner on the entrance side aligned to a target along the face.
  function corePlacements(profiles, core) {
    const placements = [], rejected = {}, seen = new Set(), coreRects = core.rects || [[0, 0, core.width, core.depth]];
    const reject = r => { rejected[r] = (rejected[r] || 0) + 1; };
    // Face start/middle/end, plus the entrance depths of other units so side wings can line up with them.
    const depths = profiles.map(p => p.door.y), zones = core.doorZones || Object.keys(FACES).map(face => ({ face, from: 0, to: FACES[face].length(core) }));
    const zoneEnds = face => zones.filter(z => z.face === face).flatMap(z => [z.from, z.to]);
    const targets = (L, face) => [...new Set([0, L / 2, L, ...zoneEnds(face), ...depths, ...depths.map(d => L - d)].map(round))].filter(v => v >= 0 && v <= L);
    const inZone = (face, t) => zones.some(z => z.face === face && t >= z.from + DOOR / 2 - EPS && t <= z.to - DOOR / 2 + EPS);
    for (const profile of profiles) for (const faceKey of Object.keys(FACES)) for (const mirrored of [false, true]) {
      const p = mirrored ? mirrorProfile(profile) : profile, L = FACES[faceKey].length(core);
      for (const anchor of p.anchors) for (const target of targets(L, faceKey)) {
        const t = round(target + p.door.x - anchor), key = [p.type, faceKey, mirrored, t].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        if (t < DOOR / 2 - EPS || t > L - DOOR / 2 + EPS) { reject('현관이 코어 면을 벗어남'); continue; }
        if (!inZone(faceKey, t)) { reject('현관이 승강기홀에 닿지 않음'); continue; }
        const placed = placeOnCore(profile, mirrored, faceKey, t, core);
        if (placed.rects.some(r => coreRects.some(c => overlaps(r, c)))) { reject('세대가 코어와 겹침'); continue; }
        placements.push(placed);
      }
    }
    return { placements, rejected };
  }

  function comboSignature(units, core) {
    const sig = list => list.map(u => u.type + ':' + u.outline.map(p => p.join(',')).sort().join(';')).sort().join('|');
    const mirror = units.map(u => ({ type: u.type, outline: u.outline.map(([x, y]) => [round(core.width - x), y]) }));
    const a = sig(units), b = sig(mirror);
    return a < b ? a : b;
  }

  // Enumerates sets of units around one core: pairwise no overlap, separate entrances, mirror and slide duplicates merged.
  // Builds the core for each requested unit count from floors (coreWidth/coreDepth give a plain box instead) and merges the results.
  function generateCoreCombos(plans, options) {
    options = options || {};
    const counts = [...new Set((options.counts || [2, 3, 4]).map(Number))].filter(n => n >= 1 && n <= 4).sort((a, b) => b - a);
    const fixed = Number(options.coreWidth) > 0 && Number(options.coreDepth) > 0;
    // Hall extensions (corridor reach) tried on each side; mirrored pairs are skipped because results are mirror-merged.
    const steps = (options.hallExtensions || [0, 1.5, 3, 4.5, 6]).map(Number).filter(v => v >= 0 && v <= 20);
    const pairs = fixed ? [[0, 0]] : steps.flatMap(a => steps.filter(b => b >= a).map(b => [a, b]));
    const variants = n => fixed ? [{ sideHalls: 'none', ext: [0, 0] }] : [...pairs.map(ext => ({ sideHalls: 'none', ext })),
      ...(n >= 3 ? [...steps.map(e => ({ sideHalls: 'E', ext: [e, 0] })), { sideHalls: 'both', ext: [0, 0] }] : [])];
    const rejected = {}, cores = {}, combos = [];
    let placements = 0, profiles = [];
    for (const n of counts) {
      const best = new Map();
      for (const { sideHalls, ext: [extLeft, extRight] } of variants(n)) {
        const core = fixed ? { width: Number(options.coreWidth), depth: Number(options.coreDepth) } : buildCore({ floors: options.floors, unitsPerFloor: n, dims: options.dims, extLeft, extRight, sideHalls });
        if (!cores[n]) cores[n] = core;
        const r = searchCore(plans, { ...options, counts: [n] }, core);
        placements += r.placements; profiles = r.profiles;
        Object.entries(r.rejected).forEach(([k, v]) => { rejected[k] = (rejected[k] || 0) + v; });
        for (const c of r.combos) {
          const prev = best.get(c.topology);
          if (!prev || c.commonArea < prev.commonArea - EPS || (Math.abs(c.commonArea - prev.commonArea) < EPS && c.footprintArea < prev.footprintArea - EPS)) best.set(c.topology, c);
        }
      }
      combos.push(...[...best.values()].sort((a, b) => b.southCount - a.southCount || a.commonArea - b.commonArea || a.footprintArea - b.footprintArea || a.id.localeCompare(b.id)));
    }
    return { combos, cores, core: cores[counts[0]] || null, profiles, placements, rejected };
  }

  function searchCore(plans, options, core) {
    const types = (options.types || TYPES).map(Number);
    const profiles = (plans || []).map(p => p.outline && p.door && p.rects ? p : profileFromPlan(p)).filter(p => types.includes(p.type));
    const counts = [...new Set((options.counts || [2, 3, 4]).map(Number))].filter(n => n >= 1 && n <= 4);
    const allowNorth = Boolean(options.allowNorth), allowSide = options.allowSide !== false;
    const { placements: all, rejected } = corePlacements(profiles, core);
    const placements = all.filter(p => (allowNorth || p.face !== 'N') && (allowSide || p.face === 'S'));
    if (all.length > placements.length) rejected['향 조건으로 제외한 배치'] = all.length - placements.length;
    const compatible = placements.map(a => placements.map(b => a !== b && !a.rects.some(r => b.rects.some(s => overlaps(r, s))) &&
      !(a.face === b.face && Math.abs(a.t - b.t) < DOOR - EPS)));
    const results = [], seen = new Set(), maxCount = Math.max(0, ...counts);
    let duplicates = 0;
    (function grow(start, chosen) {
      if (chosen.length && counts.includes(chosen.length)) {
        const units = chosen.map(i => placements[i]), sig = comboSignature(units, core);
        if (seen.has(sig)) duplicates++;
        else { seen.add(sig); results.push(units); }
      }
      if (chosen.length >= maxCount) return;
      for (let i = start; i < placements.length; i++) if (chosen.every(j => compatible[i][j])) grow(i + 1, [...chosen, i]);
    })(0, []);
    if (duplicates) rejected['좌우 대칭·중복 형상'] = duplicates;
    // Same unit types on the same faces with the same handing differ only by sliding; keep the most compact one.
    const topo = units => {
      const key = list => list.map(u => u.type + u.face + (u.mirrored ? 'm' : '')).sort().join('_');
      const flip = { S: 'S', N: 'N', E: 'W', W: 'E' }, a = key(units), b = key(units.map(u => ({ type: u.type, face: flip[u.face], mirrored: !u.mirrored })));
      return a < b ? a : b;
    };
    const best = new Map();
    for (const units of results) {
      const c = coreComboTypology(units, core), k = topo(units), prev = best.get(k);
      c.topology = k;
      if (!prev || c.footprintArea < prev.footprintArea - EPS || (Math.abs(c.footprintArea - prev.footprintArea) < EPS && c.id < prev.id)) best.set(k, c);
    }
    if (results.length > best.size) rejected['같은 구성의 미세 위치 차이'] = results.length - best.size;
    const combos = [...best.values()];
    combos.sort((a, b) => b.unitsPerFloor - a.unitsPerFloor || b.southCount - a.southCount || a.footprintArea / a.unitsPerFloor - b.footprintArea / b.unitsPerFloor || a.id.localeCompare(b.id));
    return { core, combos, profiles, placements: placements.length, rejected };
  }

  function coreComboTypology(units, core) {
    const boxes = [...units.map(u => u.box), [0, 0, core.width, core.depth]];
    const minX = Math.min(...boxes.map(b => b[0])), minY = Math.min(...boxes.map(b => b[1]));
    const maxX = Math.max(...boxes.map(b => b[2])), maxY = Math.max(...boxes.map(b => b[3]));
    const shift = ([x, y]) => [round(x - minX), round(y - minY)], shiftRect = ([x0, y0, x1, y1]) => [...shift([x0, y0]), ...shift([x1, y1])];
    const placed = units.map((u, i) => ({ id: 'u' + i, type: u.type, unitId: u.unitId, name: u.type + '형', facing: u.facing, face: u.face, mirrored: u.mirrored,
      outline: u.outline.map(shift), rects: u.rects.map(shiftRect), rooms: u.rooms.map(r => ({ ...r, rect: shiftRect(r.rect) })), door: u.door.map(shift), centre: shift(u.centre) }));
    const mix = TYPES.map(t => ({ type: t, count: units.filter(u => u.type === t).length })).filter(m => m.count);
    const total = units.reduce((s, u) => s + u.type, 0), n = units.length, order = { S: 0, E: 1, W: 2, N: 3 };
    const key = units.map(u => u.type + u.face + (u.mirrored ? 'm' : '') + u.t).sort().join('_') + (core.floors ? '_f' + core.floors + '_e' + core.extLeft + '-' + core.extRight + '_s' + core.sideHalls : '');
    return { id: 'core-' + key, name: n + '세대 · ' + mix.map(m => m.type + '×' + m.count).join(' + '),
      width: round(maxX - minX), depth: round(maxY - minY), unitsPerFloor: n, unitArea: round(total / n), totalUnitArea: total, nominalArea: total,
      coreArea: core.commonArea || round(core.width * core.depth), coreOnlyArea: core.commonArea || round(core.width * core.depth), commonArea: core.commonArea || round(core.width * core.depth), coreCount: 1, coreCapacity: n, unitMix: mix,
      southCount: units.filter(u => u.face === 'S').length, facings: [...units].sort((a, b) => order[a.face] - order[b.face]).map(u => u.facing),
      footprintArea: round((maxX - minX) * (maxY - minY)), source: 'core-attachment', layout: 'core-cluster', sourceUnitIds: [...new Set(units.map(u => u.unitId).filter(Boolean))],
      reviewStatus: '단위세대 평면 외곽 + 코어 가정 · 채광·피난·구조·설비 미검토',
      core: core.lifts ? { floors: core.floors, lifts: core.lifts, stairKind: core.stairKind, rules: core.rules, width: core.width, depth: core.depth, extLeft: core.extLeft, extRight: core.extRight, sideHalls: core.sideHalls } : null,
      geometry: { units: placed, core: { x: round(-minX), y: round(-minY), width: core.width, depth: core.depth, rects: core.rects ? core.rects.map(shiftRect) : null, parts: (core.parts || []).map(p => ({ ...p, rect: shiftRect(p.rect) })) } } };
  }

  const PART_FILL = { stair: '#3f6b93', lobby: '#5d86ad', lift: '#2c4f75', shaft: '#8aa6c0', hall: '#c9d8e6', spare: '#dfe6ee' };
  function coreParts(parts) {
    return parts.map(p => {
      const [x0, y0, x1, y1] = p.rect, w = round(x1 - x0), h = round(y1 - y0), cx = round(x0 + w / 2), cy = round(y0 + h / 2);
      const steps = p.kind === 'stair' ? Array.from({ length: Math.max(0, Math.floor(h / .55)) }, (_, i) => `<line x1="${x0 + .2}" y1="${round(y0 + .3 + i * .55)}" x2="${round(x0 + w / 2 - .1)}" y2="${round(y0 + .3 + i * .55)}" stroke="#c8dcea" stroke-width=".05"/><line x1="${round(x0 + w / 2 + .1)}" y1="${round(y0 + .3 + i * .55)}" x2="${x1 - .2}" y2="${round(y0 + .3 + i * .55)}" stroke="#c8dcea" stroke-width=".05"/>`).join('') : '';
      const cross = p.kind === 'lift' ? `<path d="M${x0 + .25} ${y0 + .25}L${x1 - .25} ${y1 - .25}M${x1 - .25} ${y0 + .25}L${x0 + .25} ${y1 - .25}" stroke="#c8dcea" stroke-width=".06"/>` : '';
      const label = p.kind === 'hall' ? p.name : { stair: '계단', lobby: '부속실', lift: 'EV', shaft: 'PS', spare: '' }[p.kind];
      return `<g><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${PART_FILL[p.kind] || '#507ca5'}" stroke="#fff" stroke-width=".06"/>${steps}${cross}<text x="${cx}" y="${cy + .22}" text-anchor="middle" font-size="${p.kind === 'hall' ? .55 : .6}" fill="${p.kind === 'hall' ? '#24476b' : '#fff'}" ${p.kind === 'shaft' ? `transform="rotate(-90 ${cx} ${cy})"` : ''}>${esc(label)}</text></g>`;
    }).join('');
  }

  const ROOM_FILL = { living: '#f4efe2', kitchen: '#f1ead8', bedroom: '#e5eef6', wet: '#d9ecef', service: '#ecedf0', circulation: '#f5f6f8', balcony: '#e9f2e6' };
  function coreComboSvg(t) {
    const g = t.geometry, c = g.core, pad = 1.5, stroke = { 59: '#3f7f8f', 74: '#4f6fa5', 84: '#6d5ca0' };
    return `<svg viewBox="${-pad} ${-pad} ${t.width + pad * 2} ${t.depth + pad * 2}" role="img" aria-label="${esc(t.name)} 코어 조합">
      ${g.units.map(u => `<g>
        ${u.rooms.map(r => `<rect x="${r.rect[0]}" y="${r.rect[1]}" width="${round(r.rect[2] - r.rect[0])}" height="${round(r.rect[3] - r.rect[1])}" fill="${ROOM_FILL[r.category] || '#eef2f6'}" stroke="#b8c6d3" stroke-width=".05"/>`).join('')}
        <polygon points="${u.outline.map(p => p.join(',')).join(' ')}" fill="none" stroke="${stroke[u.type]}" stroke-width=".18"/>
        <text x="${u.centre[0]}" y="${u.centre[1] - .1}" text-anchor="middle" font-size="1.7" font-weight="750" fill="${stroke[u.type]}" paint-order="stroke" stroke="#fff" stroke-width=".35">${u.type}</text>
        <text x="${u.centre[0]}" y="${u.centre[1] + 1.25}" text-anchor="middle" font-size=".9" fill="#4f667a" paint-order="stroke" stroke="#fff" stroke-width=".25">${u.facing}</text>
        <line x1="${u.door[0][0]}" y1="${u.door[0][1]}" x2="${u.door[1][0]}" y2="${u.door[1][1]}" stroke="#e08a2e" stroke-width=".5"/></g>`).join('')}
      ${c.parts && c.parts.length ? coreParts(c.parts) : `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.depth}" fill="#3f6b93" stroke="#fff" stroke-width=".1"/><text x="${c.x + c.width / 2}" y="${c.y + c.depth / 2 + .4}" text-anchor="middle" font-size="1.1" fill="#fff" font-weight="650">코어</text>`}
      ${(c.rects || [[c.x, c.y, c.x + c.width, c.y + c.depth]]).map(r => `<rect x="${r[0]}" y="${r[1]}" width="${round(r[2] - r[0])}" height="${round(r[3] - r[1])}" fill="none" stroke="#24476b" stroke-width=".16"/>`).join('')}
    </svg>`;
  }

  function ensureUnits(project) {
    if (!Array.isArray(project.units)) project.units = [];
    for (const type of TYPES) if (!project.units.some(u => Number(u.type) === type)) project.units.push(createUnit(type));
    if (!Array.isArray(project.typologies)) project.typologies = [];
  }

  function injectStyles(doc) {
    if (doc.getElementById('planner-units-style')) return;
    const style = doc.createElement('style'); style.id = 'planner-units-style';
    style.textContent = `
      .pu-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:20px;align-items:start}.pu-main,.pu-inspector{min-width:0}.pu-tabs{display:flex;gap:8px;margin:0 0 18px}.pu-tabs button{border:1px solid #dce5ed;background:#fff;border-radius:10px;padding:12px 24px;color:#506377;font-weight:750;cursor:pointer}.pu-tabs button.active{background:#143e6a;color:white;border-color:#143e6a}.pu-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}.pu-toolbar h3{margin:0;font-size:18px}.pu-hint{color:#708396;font-size:12px;line-height:1.65}.pu-canvas-wrap{border:1px solid #d9e3ec;border-radius:12px;background:#f8fbfd;overflow:hidden}.pu-canvas{display:block;width:100%;min-height:330px;max-height:610px;touch-action:none;user-select:none}.pu-room{cursor:grab;outline:none}.pu-room:focus rect{stroke:#1262cb;stroke-width:.07}.pu-room.pu-locked{cursor:pointer}.pu-room text{pointer-events:none}.pu-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;font-size:11px;color:#64788a}.pu-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.pu-statrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.pu-stat{border:1px solid #dce6ee;border-radius:10px;background:white;padding:12px}.pu-stat b{display:block;font-size:20px;color:#163f69;margin-top:7px}.pu-stat span{font-size:11px;color:#6f8295}.pu-inspector h3{font-size:16px;margin:0 0 16px}.pu-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pu-inputs label,.pu-combo-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#64788a}.pu-inputs input,.pu-combo-fields select{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;background:white;color:#233f59;font:inherit}.pu-inputs input:disabled{background:#f0f3f6;color:#8b99a7}.pu-check{font-size:12px;display:flex;align-items:center;gap:7px;margin:14px 0}.pu-check input{accent-color:#1f62b4}.pu-roomlist{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}.pu-roomlist td,.pu-roomlist th{padding:8px 3px;border-bottom:1px solid #e7edf2;text-align:left}.pu-roomlist th{font-weight:500;color:#8695a4}.pu-roomlist td:last-child,.pu-roomlist th:last-child{text-align:right}.pu-roomlist button{border:0;background:transparent;padding:0;color:#354e65;cursor:pointer;font:inherit;text-align:left}.pu-roomlist tr.selected{background:#eef5fd}.pu-warning{background:#fff4e7;color:#915d18;border:1px solid #f2d7ad;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6;margin-top:12px}.pu-pass{background:#eef8f5;color:#36765e;border:1px solid #d3eadd;border-radius:8px;padding:10px 12px;font-size:12px;margin-top:12px}.pu-note{font-size:12px;line-height:1.75;color:#748596;margin:12px 0}.pu-reference{margin-top:18px;border-top:1px solid #e2e9f0;padding-top:16px}.pu-reference summary{cursor:pointer;font-size:13px;font-weight:650;color:#34516d}.pu-reference img{display:block;max-width:100%;max-height:460px;object-fit:contain;margin:16px auto;background:white}.pu-reference p{font-size:12px;line-height:1.7;color:#718497}.pu-combo-fields{display:flex;gap:18px;align-items:end;flex-wrap:wrap;margin-bottom:18px}.pu-combo-fields select{min-width:130px}.pu-mix{display:flex;gap:8px;align-items:center}.pu-mix label{display:flex;flex-direction:row;align-items:center;border:1px solid #d9e3ec;border-radius:8px;padding:10px;cursor:pointer;color:#325777;font-size:13px}.pu-mix input{accent-color:#2266aa}.pu-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.pu-combo-card{border:1px solid #dbe4ed;background:#fff;border-radius:13px;padding:17px;min-width:0}.pu-combo-card h3{font-size:16px;margin:14px 0 8px}.pu-combo-card svg{width:100%;height:180px;background:#f6f9fc;border-radius:8px}.pu-combo-meta{font-size:12px;color:#73869a;line-height:1.8}.pu-combo-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0}.pu-combo-metrics div{background:#f5f8fb;border-radius:7px;padding:9px}.pu-combo-metrics span{font-size:10px;color:#7e90a2;display:block}.pu-combo-metrics b{font-size:14px;color:#2c5071}.pu-combo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pu-empty{padding:30px;color:#74869a;text-align:center;border:1px dashed #cad7e2;border-radius:10px}.pu-saved{margin-top:24px}.pu-saved-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:12px;border-bottom:1px solid #e2e9f0}.pu-saved-row strong{font-size:13px}.pu-saved-row small{display:block;margin-top:5px;color:#7b8da0}.pu-footnote{font-size:12px;color:#8090a0;line-height:1.7;margin:15px 0}.pu-active-room{display:flex;align-items:center;gap:8px;margin-bottom:14px}.pu-active-room i{width:12px;height:12px;border-radius:4px}.pu-active-room strong{font-size:15px;color:#24496c}.pu-area{font-size:24px;color:#1e5686;margin:14px 0}.pu-area small{font-size:12px;color:#7a8d9f}.pu-status{min-height:20px;font-size:12px;color:#347658;margin-top:10px}.pu-cc-group{margin:22px 0}.pu-rules{margin:0 0 14px;background:#fff;border:1px solid #dce5ed;border-radius:10px}.pu-rules td{padding:8px 12px;vertical-align:top}.pu-rules td:last-child{text-align:left;color:#7a8d9f;font-size:11px}.pu-cc-card svg{height:220px}.pu-num{width:110px;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;font:inherit;color:#233f59}.pu-reference table{margin:10px 0}.pu-ref{margin-bottom:22px}.pu-ref-body{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:20px;align-items:start}.pu-ref-drawing svg{width:100%;height:auto;max-height:520px;background:#f8fbfd;border:1px solid #dce5ed;border-radius:10px}.pu-ref-side .pu-roomlist td:nth-child(n+2),.pu-ref-side .pu-roomlist th:nth-child(n+2){text-align:right;font-variant-numeric:tabular-nums}.pu-checks{list-style:none;padding:0;margin:14px 0;font-size:12px;line-height:1.9}.pu-ok{color:#2f7a58}.pu-ng{color:#b4472f;font-weight:650}.pu-section-title{font-size:16px;margin:4px 0 14px}.pu-section-title small{font-size:12px;font-weight:500;color:#8a6a3a;margin-left:8px}
      @media(max-width:1100px){.pu-layout{grid-template-columns:1fr}.pu-inspector{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pu-combo-grid{grid-template-columns:1fr 1fr}.pu-canvas{min-height:300px}}@media(max-width:700px){.pu-combo-grid,.pu-inspector,.pu-ref-body{grid-template-columns:1fr}.pu-statrow{gap:6px}.pu-stat{padding:8px}.pu-stat b{font-size:17px}.pu-tabs button{padding:10px 18px}.pu-canvas{min-height:220px}.pu-combo-fields{align-items:stretch;gap:12px}}
    `;
    doc.head.appendChild(style);
  }

  function mountUnits(container, project, onChange) {
    ensureUnits(project); injectStyles(container.ownerDocument);
    let type = TYPES.includes(Number(project.selectedUnitType)) ? Number(project.selectedUnitType) : 59;
    let selectedId = 'living', drag = null, selectionPointer = null;
    const active = () => project.units.find(u => Number(u.type) === type);
    const changed = () => { project.selectedUnitType = type; if (typeof onChange === 'function') onChange(); };
    function markChanged() {
      for (const t of project.typologies) if (t.sourceUnitIds && t.sourceUnitIds.includes(active().id)) t.needsReview = true;
      changed();
    }
    function render() {
      const unit = active();
      if (!unit.rooms.some(r => r.id === selectedId)) selectedId = unit.rooms[0] && unit.rooms[0].id;
      container.innerHTML = `<div class="pu-tabs" role="tablist" aria-label="단위세대 평형">${TYPES.map(t => `<button type="button" role="tab" aria-selected="${t === type}" class="${t === type ? 'active' : ''}" data-unit-type="${t}">${t}<small>㎡</small></button>`).join('')}</div>
        <div class="pu-layout"><div class="pu-main"><div class="pu-toolbar"><h3>${esc(unit.name)}</h3><span class="tag">직접 편집 · 개념 조닝</span></div>
        <p class="pu-hint">공간을 드래그해 이동하세요. 선택한 공간은 방향키로 0.1m씩 이동할 수 있습니다. 치수는 오른쪽에서 조정합니다.</p>
        <div class="pu-canvas-wrap"><svg class="pu-canvas" aria-label="${type}형 편집 가능한 조닝" role="group" viewBox="-0.8 -0.75 ${unit.width + 1.6} ${unit.depth + 1.5}"></svg></div>
        <div class="pu-legend">${Object.entries({ living: '거실', bedroom: '침실', kitchen: '주방', wet: '욕실·다용도', service: '수납·현관' }).map(([k, v]) => `<span><i style="background:${COLORS[k]}"></i>${v}</span>`).join('')}<span>빈 영역: 미배분·동선</span></div><div class="pu-statrow" data-stats></div><div data-checks aria-live="polite"></div>
        <p class="pu-note">이 조닝은 편집용으로 새로 구성한 직사각형 배치입니다. 참고 평면을 실측·벡터화한 도면이 아니며, 공간 합계를 법정 전용면적으로 사용하지 않습니다. 벽체·발코니·문·동선은 상세 검토가 필요합니다.</p>
        <details class="pu-reference"><summary>공식 참고 평면과 도면 표기 치수 보기 · ${type}A</summary><img src="assets/${type}A-plan.png" alt="LH 양주회천 A-26 ${type}A 공식 참고 평면"><p>자료: LH 양주회천 A-26 ${type}A · 공식 도면 거실 폭 표기 <strong>${ROOM_DATA[type].livingWidth.toLocaleString('ko-KR')} mm</strong>.<br>현재 조닝 치수와는 별개입니다. 표기 기준과 마감 두께를 확인하지 않은 상태이며, 시공·가구 제작용 실측치가 아닙니다.</p></details>
        </div><aside class="pu-inspector"><div class="panel"><h3>공간 편집</h3><div data-inspector></div></div><div class="panel"><h3>공간별 면적</h3><div data-roomlist></div></div></aside></div>`;
      container.querySelectorAll('[data-unit-type]').forEach(b => b.addEventListener('click', () => { type = Number(b.dataset.unitType); selectedId = 'living'; changed(); render(); }));
      const svg = container.querySelector('.pu-canvas');
      svg.addEventListener('pointerdown', pointerDown);
      svg.addEventListener('pointermove', pointerMove);
      svg.addEventListener('pointerup', pointerEnd);
      svg.addEventListener('pointercancel', pointerCancel);
      svg.addEventListener('keydown', keyMove);
      refresh();
    }
    function refresh() {
      paintSvg(); paintInspector(); paintStats();
    }
    function focusSelectedRoom() {
      const target = Array.from(container.querySelectorAll('[data-room]')).find(el => el.dataset.room === selectedId);
      if (target) target.focus({ preventScroll: true });
    }
    function paintSvg() {
      const unit = active(), report = checkUnit(unit), bad = new Set(report.overlaps.flatMap(p => [p.a, p.b]).concat(report.outside));
      const svg = container.querySelector('.pu-canvas');
      const horizontal = Array.from({ length: Math.ceil(unit.depth) }, (_, i) => `<path d="M0 ${i}H${unit.width}"/>`).join('');
      const vertical = Array.from({ length: Math.ceil(unit.width) }, (_, i) => `<path d="M${i} 0V${unit.depth}"/>`).join('');
      svg.innerHTML = `<rect x="0" y="0" width="${unit.width}" height="${unit.depth}" rx=".04" fill="#fff" stroke="#617a91" stroke-width=".045"/><g stroke="#e9eff4" stroke-width=".018">${horizontal}${vertical}</g>
        <text x="${unit.width / 2}" y="-.3" text-anchor="middle" font-size=".22" fill="#7890a3">개념 외곽 ${fmt(unit.width)} × ${fmt(unit.depth)}m</text>
        ${unit.rooms.map(r => `<g class="pu-room ${r.locked ? 'pu-locked' : ''}" data-room="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.name)} ${fmt(r.width * r.depth)}제곱미터 ${r.locked ? '잠김' : '선택 및 이동'}" aria-pressed="${r.id === selectedId}"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" rx=".055" fill="${COLORS[r.category] || COLORS.service}" stroke="${bad.has(r.id) ? '#c36735' : r.id === selectedId ? '#2569ad' : '#9bb3c6'}" stroke-width="${r.id === selectedId ? '.065' : '.025'}"/><text x="${r.x + r.width / 2}" y="${r.y + r.depth / 2 - .08}" text-anchor="middle" font-size="${r.width < 1.5 ? '.19' : '.23'}" font-weight="650" fill="#294b64">${esc(r.name)}${r.locked ? ' · 잠금' : ''}</text><text x="${r.x + r.width / 2}" y="${r.y + r.depth / 2 + .25}" text-anchor="middle" font-size=".19" fill="#6a8397">${fmt(r.width * r.depth)}㎡</text></g>`).join('')}`;
    }
    function paintInspector() {
      const unit = active(), room = unit.rooms.find(r => r.id === selectedId), inspector = container.querySelector('[data-inspector]');
      if (!room) { inspector.innerHTML = '<p class="muted">공간을 선택하세요.</p>'; return; }
      inspector.innerHTML = `<div class="pu-active-room"><i style="background:${COLORS[room.category] || COLORS.service}"></i><strong>${esc(room.name)}</strong></div><div class="pu-area">${fmt(room.width * room.depth)} <small>㎡ · 조닝 면적</small></div>
        <div class="pu-inputs">${[['width', '가로'], ['depth', '세로'], ['x', 'X 위치'], ['y', 'Y 위치']].map(([key, label]) => `<label>${label} (m)<input aria-label="${label} (m)" data-room-field="${key}" type="number" value="${room[key]}" step="0.1" min="${key === 'width' || key === 'depth' ? '0.1' : '-500'}" max="500" ${room.locked ? 'disabled' : ''}></label>`).join('')}</div>
        <label class="pu-check"><input type="checkbox" data-lock ${room.locked ? 'checked' : ''}>이 공간의 위치·치수 잠금</label><p class="pu-hint">외곽을 벗어나거나 다른 공간과 겹치면 검토 항목에 표시됩니다.</p>`;
      inspector.querySelectorAll('[data-room-field]').forEach(input => input.addEventListener('change', () => {
        const field = input.dataset.roomField;
        if (input.value.trim() !== '' && editRoom(unit, room.id, { [field]: Number(input.value) })) {
          // Keep the input nodes mounted so typing, stepping and tabbing retain focus.
          input.value = String(room[field]); paintSvg(); paintStats();
          inspector.querySelector('.pu-area').innerHTML = `${fmt(room.width * room.depth)} <small>㎡ · 조닝 면적</small>`;
          markChanged();
        } else input.value = String(room[field]);
      }));
      inspector.querySelector('[data-lock]').addEventListener('change', e => { room.locked = e.target.checked; refresh(); markChanged(); });
    }
    function paintStats() {
      const unit = active(), report = checkUnit(unit);
      container.querySelector('[data-stats]').innerHTML = `<div class="pu-stat"><span>명목 전용면적</span><b>${type}<small> ㎡</small></b></div><div class="pu-stat"><span>공간 합계 · 중복 포함</span><b>${fmt(report.area)}<small> ㎡</small></b></div><div class="pu-stat"><span>조닝 점유 · 중복 제외</span><b>${fmt(report.unionArea)}<small> ㎡</small></b></div>`;
      const name = id => unit.rooms.find(r => r.id === id)?.name || id;
      const issues = report.overlaps.map(p => `${name(p.a)} ↔ ${name(p.b)} 겹침 ${fmt(p.area)}㎡`).concat(report.outside.map(id => name(id) + ' 외곽 이탈')).concat(report.invalid.map(id => name(id) + ' 유효하지 않은 치수'));
      container.querySelector('[data-checks]').innerHTML = issues.length ? `<div class="pu-warning"><strong>형상 확인 ${issues.length}건</strong><br>${issues.map(esc).join('<br>')}</div>` : '<div class="pu-pass">직사각형 형상 검사: 겹침·외곽 이탈 없음</div>';
      const list = container.querySelector('[data-roomlist]');
      list.innerHTML = `<table class="pu-roomlist"><thead><tr><th>공간</th><th>㎡</th></tr></thead><tbody>${unit.rooms.map(r => `<tr class="${r.id === selectedId ? 'selected' : ''}"><td><button type="button" data-select-room="${esc(r.id)}">${esc(r.name)}${r.locked ? ' · 잠금' : ''}</button></td><td>${fmt(r.width * r.depth)}</td></tr>`).join('')}</tbody></table>`;
      list.querySelectorAll('[data-select-room]').forEach(b => b.addEventListener('click', () => { selectedId = b.dataset.selectRoom; refresh(); focusSelectedRoom(); }));
    }
    function point(event) {
      const svg = container.querySelector('.pu-canvas'), matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; return p.matrixTransform(matrix.inverse());
    }
    function pointerDown(event) {
      if (selectionPointer !== null) return;
      const g = event.target.closest('[data-room]'); if (!g) return;
      const room = active().rooms.find(r => r.id === g.dataset.room), p = point(event);
      selectedId = room.id; selectionPointer = event.pointerId;
      if (!room.locked && p) drag = { id: room.id, x: room.x, y: room.y, startX: p.x, startY: p.y, pointerId: event.pointerId, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); refresh();
    }
    function pointerMove(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const p = point(event); if (!p) return;
      const snap = n => Math.round(n * 10) / 10;
      drag.moved = editRoom(active(), drag.id, { x: snap(drag.x + p.x - drag.startX), y: snap(drag.y + p.y - drag.startY) }) || drag.moved;
      refresh();
    }
    function pointerEnd(event) {
      if (selectionPointer !== event.pointerId) return;
      const moved = drag && drag.moved; drag = null; selectionPointer = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (moved) markChanged();
      focusSelectedRoom();
    }
    function pointerCancel(event) {
      if (selectionPointer !== event.pointerId) return;
      if (drag) editRoom(active(), drag.id, { x: drag.x, y: drag.y });
      drag = null; selectionPointer = null; refresh();
    }
    function keyMove(event) {
      const g = event.target.closest('[data-room]'); if (!g) return;
      selectedId = g.dataset.room;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); refresh(); focusSelectedRoom(); return; }
      const vector = { ArrowLeft: [-.1, 0], ArrowRight: [.1, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] }[event.key];
      if (!vector) return;
      event.preventDefault(); const room = active().rooms.find(r => r.id === selectedId);
      if (editRoom(active(), room.id, { x: room.x + vector[0], y: room.y + vector[1] })) { refresh(); markChanged(); }
      focusSelectedRoom();
    }
    render();
    return { render, destroy() { drag = null; selectionPointer = null; container.innerHTML = ''; } };
  }

  function schematicSvg(typology) {
    const c = typology, geometry = c.geometry;
    if (!geometry) return `<svg viewBox="0 0 160 100" aria-label="개념 외곽"><rect x="25" y="20" width="110" height="60" fill="#dceafa" stroke="#7596b7"/></svg>`;
    const pad = 2, font = Math.max(.8, Math.min(c.width / 38, 1.3));
    return `<svg viewBox="${-pad} ${-pad} ${c.width + pad * 2} ${c.depth + pad * 2}" role="img" aria-label="${esc(c.name)} 개념 조합">
      ${geometry.corridors.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="#e5ecf3"/>`).join('')}
      ${geometry.units.map(r => `<g><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="${r.type === 59 ? '#d2e9ee' : r.type === 74 ? '#d8e5f5' : '#e6e2f4'}" stroke="#7694ac" stroke-width=".12"/><text x="${r.x + r.width / 2}" y="${r.y + r.depth / 2 + font / 3}" text-anchor="middle" font-size="${font}" fill="#3b5c77" font-weight="650">${r.type}</text></g>`).join('')}
      ${geometry.cores.map(r => `<g><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="#507ca5" rx=".15"/><path d="M${r.x + .65} ${r.y + 1.1}h2.1m-2.1 .6h2.1m-2.1 .6h2.1m-2.1 .6h2.1" stroke="#c8dcea" stroke-width=".12"/><rect x="${r.x + 3.2}" y="${r.y + .8}" width="1.6" height="1.8" fill="none" stroke="#c8dcea" stroke-width=".12"/><text x="${r.x + r.width / 2}" y="${r.y + 4.8}" text-anchor="middle" font-size="${font * .8}" fill="white">코어</text></g>`).join('')}</svg>`;
  }

  function referencePanel(t) {
    const allOk = t.comparison.every(r => r.ok) && t.checks.every(c => c.ok);
    return `<section class="panel pu-ref"><div class="pu-toolbar"><h3>참고 재현 · ${esc(t.name)}</h3><span class="tag ${allOk ? 'green' : 'amber'}">${allOk ? '도면 치수 일치' : '치수 차이 있음'}</span></div>
      <p class="pu-note">${esc(t.referenceSource)}. 세대(${t.unitMix[0].type}㎡ × ${t.unitsPerFloor})는 좁은 전면 폭으로 나란히 놓고, 현관은 복도 경계에, 코어는 복도 뒤에 붙입니다. 치수는 도면 치수선을 판독한 관찰값이며 DWG 추출값이 아닙니다.</p>
      <div class="pu-ref-body"><div class="pu-ref-drawing">${referenceSvg(t)}</div><div class="pu-ref-side">
        <table class="pu-roomlist"><thead><tr><th>항목</th><th>도면</th><th>재현</th></tr></thead><tbody>${t.comparison.map(r => `<tr><td>${esc(r.label)}</td><td>${r.drawing.toFixed(3)}</td><td class="${r.ok ? 'pu-ok' : 'pu-ng'}">${r.generated.toFixed(3)}${r.ok ? '' : ' (' + (r.diff > 0 ? '+' : '') + r.diff.toFixed(3) + ')'}</td></tr>`).join('')}</tbody></table>
        <ul class="pu-checks">${t.checks.map(c => `<li class="${c.ok ? 'pu-ok' : 'pu-ng'}">${c.ok ? '✓' : '✗'} ${esc(c.label)}</li>`).join('')}</ul>
        <div class="pu-combo-metrics"><div><span>명목 전용 합계 / 층</span><b>${fmt(t.totalUnitArea)}㎡</b></div><div><span>코어 + 복도 / 층</span><b>${fmt(t.coreArea)}㎡</b></div></div>
        <div class="pu-warning">재현 제외: ${t.excluded.map(esc).join(' · ')}. 피난·구조·설비 적합성은 미검토입니다.</div>
        <div class="pu-combo-actions"><button class="btn" data-ref-save>동 유형으로 저장</button><button class="btn primary" data-ref-place>대지에 배치 →</button></div>
      </div></div></section>`;
  }

  function profileNote(profiles, source) {
    const rows = profiles.map(p => `<tr><td>${p.type}형</td><td>${fmt(p.width)} × ${fmt(p.depth)}</td><td>${p.area ? fmt(p.area) + '㎡' : '—'}</td><td>x ${fmt(p.door.x)} · y ${fmt(p.door.y)}</td><td>${p.rooms.length}개</td></tr>`).join('');
    const rev = [...new Set(profiles.map(p => p.revision).filter(v => v != null))].join(', ');
    return `<details class="pu-reference"><summary>사용한 세대 평면 (${esc(source)}${rev ? ' · Stage 1 개정 ' + esc(rev) : ''})</summary>
      <table class="pu-roomlist"><thead><tr><th>유형</th><th>외곽 W×D (m)</th><th>외곽 면적</th><th>현관 중심</th><th>실</th></tr></thead><tbody>${rows}</tbody></table>
      <p>외곽선과 실 구획은 Stage 1이 내보낸 세대 평면 JSON(apartment-planner-unit/1)을 그대로 씁니다. 현관은 현관 실의 북측 변 중앙이며, 이 점이 코어 면에 닿도록 세대를 붙입니다. 세대는 좌우를 뒤집어 붙일 수 있습니다.</p></details>`;
  }

  function mountCombinations(container, project, onChange, onPlace) {
    ensureUnits(project); injectStyles(container.ownerDocument);
    const DIM_FIELDS = [['stairWidth', '계단실 폭'], ['stairLength', '계단실 길이'], ['lobbyLength', '부속실 깊이'], ['hallDepth', '승강기홀 깊이'], ['sideHallWidth', '측면 홀 폭'], ['shaftWidth', '샤프트 폭'], ['floorHeight', '층고']];
    let opts = { types: [59, 74, 84], counts: [2, 3, 4], floors: 25, dims: {}, allowSide: true, allowNorth: false, sort: 'default' };
    let shown = { 2: 12, 3: 12, 4: 12 }, status = '', plans = null, planSource = '', loadError = '';
    async function loadDefaultPlans() {
      try {
        plans = await Promise.all(UNIT_PLAN_FILES.map(f => fetch(f, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
        plans.forEach(profileFromPlan); planSource = 'unit-plans 폴더'; loadError = '';
      } catch (e) { plans = null; loadError = '세대 평면 JSON을 읽지 못했습니다. 로컬 서버(start-local.ps1)로 열거나 아래에서 파일을 직접 불러오세요.'; }
      render();
    }
    async function loadFiles(files) {
      try {
        const loaded = await Promise.all(Array.from(files).map(f => f.size > 2e6 ? Promise.reject(new Error(f.name + ': 파일이 너무 큽니다.')) : f.text().then(t => JSON.parse(t))));
        const byType = new Map((plans || []).map(p => [Number((p.unit || p).type), p]));
        loaded.forEach(p => { const q = profileFromPlan(p); byType.set(q.type, p); });
        plans = TYPES.filter(t => byType.has(t)).map(t => byType.get(t)); planSource = '불러온 파일'; loadError = ''; status = loaded.length + '개 세대 평면을 불러왔습니다.';
      } catch (e) { loadError = '불러오기 실패: ' + e.message; }
      render();
    }
    function save(candidate) {
      const existing = project.typologies.findIndex(t => t.id === candidate.id);
      const saved = JSON.parse(JSON.stringify(candidate));
      if (existing >= 0) project.typologies[existing] = saved; else project.typologies.push(saved);
      status = candidate.name + ' 저장됨';
      if (typeof onChange === 'function') onChange();
      return saved;
    }
    function render() {
      if (!plans) {
        container.innerHTML = `<div class="panel"><div class="pu-toolbar"><h3>코어 1개에 세대 붙이기 · 경우의 수 탐색</h3></div><p class="pu-note">${esc(loadError || '세대 평면을 불러오는 중입니다.')}</p>
          <label class="btn">세대 평면 JSON 불러오기<input type="file" accept=".json,application/json" multiple data-cc-files hidden></label></div>`;
        container.querySelector('[data-cc-files]').addEventListener('change', e => loadFiles(e.target.files));
        return;
      }
      const result = generateCoreCombos(plans, opts), reference = reproduceReference('susaek4-101');
      const sorters = { default: null, compact: (a, b) => a.footprintArea / a.unitsPerFloor - b.footprintArea / b.unitsPerFloor, narrow: (a, b) => a.width - b.width || a.depth - b.depth, area: (a, b) => b.totalUnitArea - a.totalUnitArea };
      if (sorters[opts.sort]) result.combos.sort(sorters[opts.sort]);
      const groups = [4, 3, 2].filter(n => opts.counts.includes(n)).map(n => ({ n, list: result.combos.filter(c => c.unitsPerFloor === n) }));
      const visible = {};
      groups.forEach(g => { visible[g.n] = g.list.slice(0, shown[g.n]); });
      const box = (attr, value, on, label) => `<label><input type="checkbox" ${attr}="${value}" ${on ? 'checked' : ''}>${label}</label>`;
      const rejects = Object.entries(result.rejected);
      container.innerHTML = `<div class="panel"><div class="pu-toolbar"><h3>코어 1개에 세대 붙이기 · 경우의 수 탐색</h3><span class="tag">${result.combos.length}안</span></div>
        <p class="pu-note">단위세대 단계에서 만든 59·74·84형 평면의 현관이 코어 면에 닿도록 남·동·서·북 네 면에 세대를 붙입니다. 현관 앞 오목한 부분에 코어가 들어가고, 세대 외곽끼리나 세대와 코어가 겹치는 배치는 제외합니다. 세대끼리 겹치지 않는 조합만 남기고, 좌우 대칭이거나 위치만 조금 다른 안은 하나로 묶습니다.</p>
        <div class="pu-combo-fields">
          <div><div class="section-label" style="margin-bottom:8px">포함할 평형</div><div class="pu-mix">${TYPES.map(t => box('data-cc-type', t, opts.types.includes(t), t + '㎡')).join('')}</div></div>
          <div><div class="section-label" style="margin-bottom:8px">코어당 세대 수</div><div class="pu-mix">${[2, 3, 4].map(n => box('data-cc-count', n, opts.counts.includes(n), n + '세대')).join('')}</div></div>
          <div><div class="section-label" style="margin-bottom:8px">향</div><div class="pu-mix">${box('data-cc-side', 1, opts.allowSide, '동·서향 허용')}${box('data-cc-north', 1, opts.allowNorth, '북향 허용')}</div></div>
        </div>
        <div class="pu-combo-fields">
          <label>층수<input class="pu-num" type="number" min="1" max="80" step="1" value="${opts.floors}" data-cc-floors></label>
          <label>정렬<select data-cc-sort>${[['default', '남향 세대 많은 순'], ['compact', '세대당 점유 면적 작은 순'], ['narrow', '동 폭 좁은 순'], ['area', '전용 합계 큰 순']].map(([k, l]) => `<option value="${k}" ${opts.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="pu-warning">코어는 층수와 코어당 세대 수로 승강기 대수·용량, 계단 형식, 비상용승강기 필요 여부를 정한 뒤 계단실·부속실·승강기·샤프트·승강기홀을 조립합니다. 승강기홀은 현관에 닿도록 좌우로 0~6 m 복도처럼 늘리거나(판상형) 측면으로 감쌀 수 있고(타워형), 공용면적이 가장 작은 경우를 남깁니다. 부품 치수는 계획 가정이며, 규정은 선별 계산일 뿐 법규 적합 판정이 아닙니다. 채광·일조, 피난 거리, 구조, 설비는 검토하지 않았습니다.</div>
        <details class="pu-reference"><summary>코어 부품 치수 가정 (m)</summary><div class="pu-combo-fields">${DIM_FIELDS.map(([k, l]) => `<label>${l}<input class="pu-num" type="number" min=".5" max="20" step=".05" value="${opts.dims[k] != null ? opts.dims[k] : CORE_DIMENSIONS[k]}" data-cc-dim="${k}"></label>`).join('')}</div>
          <p>승강로 크기(인승별): ${Object.entries(CORE_DIMENSIONS.lifts).map(([c, d]) => c + '인승 ' + d.join('×')).join(' · ')}. 제조사 사양과 다를 수 있습니다.</p></details>
        <p class="pu-note">탐색: 코어 면에 붙일 수 있는 단일 배치 ${result.placements}개 · 제외 ${rejects.length ? rejects.map(([r, n]) => esc(r) + ' ' + n).join(' · ') : '없음'}</p>
        ${profileNote(result.profiles, planSource)}<div class="pu-combo-actions"><label class="btn">세대 평면 JSON 다시 불러오기<input type="file" accept=".json,application/json" multiple data-cc-files hidden></label>${loadError ? `<span class="pu-ng">${esc(loadError)}</span>` : ''}</div></div>
        <div class="pu-status" role="status">${esc(status)}</div>
        ${groups.map(g => `<section class="pu-cc-group"><h3 class="pu-section-title">${g.n}세대 코어 <small>${g.list.length}안</small></h3>
          ${result.cores[g.n] && result.cores[g.n].rules ? `<table class="pu-roomlist pu-rules"><tbody>${result.cores[g.n].rules.map(r => `<tr><td>${esc(r.label)}</td><td><b>${esc(r.value)}</b></td><td>${esc(r.basis)}</td></tr>`).join('')}</tbody></table>` : ''}
          ${g.list.length ? `<div class="pu-combo-grid">${visible[g.n].map((c, i) => `<article class="pu-combo-card pu-cc-card">${coreComboSvg(c)}<h3>${esc(c.name)}</h3>
            <div class="pu-combo-meta">${c.facings.join(' · ')}<br>외곽 ${fmt(c.width)} × ${fmt(c.depth)}m · 코어 ${c.core ? fmt(c.core.width) + ' × ' + fmt(c.core.depth) + 'm' + (c.core.sideHalls !== 'none' ? ' · 측면 홀' : c.core.extLeft || c.core.extRight ? ' · 홀 연장 ' + fmt(c.core.extLeft + c.core.extRight) + 'm' : '') : ''}</div>
            <div class="pu-combo-metrics"><div><span>명목 전용 합계 / 층</span><b>${fmt(c.totalUnitArea)}㎡</b></div><div><span>코어·홀 공용 / 층</span><b>${fmt(c.commonArea)}㎡</b></div></div>
            <div class="pu-combo-actions"><button class="btn" type="button" data-cc-save="${g.n}:${i}">후보 저장</button><button class="btn primary" type="button" data-cc-place="${g.n}:${i}">대지에 배치 →</button></div></article>`).join('')}</div>
            ${g.list.length > visible[g.n].length ? `<div class="pu-combo-actions"><button class="btn" type="button" data-cc-more="${g.n}">${g.list.length - visible[g.n].length}안 더 보기</button></div>` : ''}`
          : `<div class="pu-empty">이 조건에서는 ${g.n}세대를 붙일 수 없습니다.${g.n > 2 && !opts.allowSide ? ' 동·서향 세대를 허용하면 늘어납니다.' : ''}</div>`}</section>`).join('')}
        <div class="panel pu-saved"><div class="pu-toolbar"><h3>저장한 동 유형</h3><span class="muted">${project.typologies.length}개</span></div>${project.typologies.length ? project.typologies.map((t, i) => `<div class="pu-saved-row"><div><strong>${esc(t.name)}</strong><small>${t.unitsPerFloor}세대/층 · ${fmt(t.width)} × ${fmt(t.depth)}m${t.needsReview ? ' · 세대 변경: 재검토 필요' : ''}</small></div><button class="btn" type="button" data-saved-place="${i}">배치에 추가</button></div>`).join('') : '<p class="pu-note">후보를 저장하면 배치 단계에서 다시 사용할 수 있습니다.</p>'}</div>
        <details class="pu-reference"><summary>참고: 수색4 101동 편복도 재현 (A-303)</summary>${referencePanel(reference)}</details>`;
      const toggle = (list, value) => list.includes(value) ? list.filter(v => v !== value) : [...list, value].sort((a, b) => a - b);
      const pick = key => { const [n, i] = key.split(':').map(Number); return visible[n][i]; };
      container.querySelector('[data-cc-files]').addEventListener('change', e => loadFiles(e.target.files));
      container.querySelectorAll('[data-cc-type]').forEach(el => el.addEventListener('change', () => { opts.types = toggle(opts.types, Number(el.dataset.ccType)); render(); }));
      container.querySelectorAll('[data-cc-count]').forEach(el => el.addEventListener('change', () => { opts.counts = toggle(opts.counts, Number(el.dataset.ccCount)); render(); }));
      container.querySelector('[data-cc-side]').addEventListener('change', e => { opts.allowSide = e.target.checked; render(); });
      container.querySelector('[data-cc-north]').addEventListener('change', e => { opts.allowNorth = e.target.checked; render(); });
      container.querySelector('[data-cc-floors]').addEventListener('change', e => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= 80) opts.floors = v; render(); });
      container.querySelectorAll('[data-cc-dim]').forEach(el => el.addEventListener('change', () => { const v = Number(el.value); if (v >= .5 && v <= 20) opts.dims = { ...opts.dims, [el.dataset.ccDim]: v }; render(); }));
      container.querySelector('[data-cc-sort]').addEventListener('change', e => { opts.sort = e.target.value; render(); });
      container.querySelectorAll('[data-cc-more]').forEach(b => b.addEventListener('click', () => { shown[b.dataset.ccMore] += 12; render(); }));
      container.querySelectorAll('[data-cc-save]').forEach(b => b.addEventListener('click', () => { save(pick(b.dataset.ccSave)); render(); }));
      container.querySelectorAll('[data-cc-place]').forEach(b => b.addEventListener('click', () => { const saved = save(pick(b.dataset.ccPlace)); if (typeof onPlace === 'function') onPlace(saved); }));
      container.querySelector('[data-ref-save]').addEventListener('click', () => { save(reference); render(); });
      container.querySelector('[data-ref-place]').addEventListener('click', () => { const saved = save(reference); if (typeof onPlace === 'function') onPlace(saved); });
      container.querySelectorAll('[data-saved-place]').forEach(b => b.addEventListener('click', () => { if (typeof onPlace === 'function') onPlace(project.typologies[Number(b.dataset.savedPlace)]); }));
    }
    render(); loadDefaultPlans(); return { render, destroy() { container.innerHTML = ''; } };
  }
  return { createUnit, checkUnit, editRoom, generateCombinations, buildCorridorPlan, reproduceReference, REFERENCES, UNIT_PLAN_FILES, CORE_DIMENSIONS, buildCore, profileFromPlan, polygonRects, corePlacements, generateCoreCombos, coreComboSvg, mountUnits, mountCombinations, schematicSvg, referenceSvg };
});
