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

  function ensureUnits(project) {
    if (!Array.isArray(project.units)) project.units = [];
    for (const type of TYPES) if (!project.units.some(u => Number(u.type) === type)) project.units.push(createUnit(type));
    if (!Array.isArray(project.typologies)) project.typologies = [];
  }

  function injectStyles(doc) {
    if (doc.getElementById('planner-units-style')) return;
    const style = doc.createElement('style'); style.id = 'planner-units-style';
    style.textContent = `
      .pu-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:20px;align-items:start}.pu-main,.pu-inspector{min-width:0}.pu-tabs{display:flex;gap:8px;margin:0 0 18px}.pu-tabs button{border:1px solid #dce5ed;background:#fff;border-radius:10px;padding:12px 24px;color:#506377;font-weight:750;cursor:pointer}.pu-tabs button.active{background:#143e6a;color:white;border-color:#143e6a}.pu-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}.pu-toolbar h3{margin:0;font-size:18px}.pu-hint{color:#708396;font-size:12px;line-height:1.65}.pu-canvas-wrap{border:1px solid #d9e3ec;border-radius:12px;background:#f8fbfd;overflow:hidden}.pu-canvas{display:block;width:100%;min-height:330px;max-height:610px;touch-action:none;user-select:none}.pu-room{cursor:grab;outline:none}.pu-room:focus rect{stroke:#1262cb;stroke-width:.07}.pu-room.pu-locked{cursor:pointer}.pu-room text{pointer-events:none}.pu-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;font-size:11px;color:#64788a}.pu-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.pu-statrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.pu-stat{border:1px solid #dce6ee;border-radius:10px;background:white;padding:12px}.pu-stat b{display:block;font-size:20px;color:#163f69;margin-top:7px}.pu-stat span{font-size:11px;color:#6f8295}.pu-inspector h3{font-size:16px;margin:0 0 16px}.pu-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pu-inputs label,.pu-combo-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#64788a}.pu-inputs input,.pu-combo-fields select{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;background:white;color:#233f59;font:inherit}.pu-inputs input:disabled{background:#f0f3f6;color:#8b99a7}.pu-check{font-size:12px;display:flex;align-items:center;gap:7px;margin:14px 0}.pu-check input{accent-color:#1f62b4}.pu-roomlist{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}.pu-roomlist td,.pu-roomlist th{padding:8px 3px;border-bottom:1px solid #e7edf2;text-align:left}.pu-roomlist th{font-weight:500;color:#8695a4}.pu-roomlist td:last-child,.pu-roomlist th:last-child{text-align:right}.pu-roomlist button{border:0;background:transparent;padding:0;color:#354e65;cursor:pointer;font:inherit;text-align:left}.pu-roomlist tr.selected{background:#eef5fd}.pu-warning{background:#fff4e7;color:#915d18;border:1px solid #f2d7ad;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6;margin-top:12px}.pu-pass{background:#eef8f5;color:#36765e;border:1px solid #d3eadd;border-radius:8px;padding:10px 12px;font-size:12px;margin-top:12px}.pu-note{font-size:12px;line-height:1.75;color:#748596;margin:12px 0}.pu-reference{margin-top:18px;border-top:1px solid #e2e9f0;padding-top:16px}.pu-reference summary{cursor:pointer;font-size:13px;font-weight:650;color:#34516d}.pu-reference img{display:block;max-width:100%;max-height:460px;object-fit:contain;margin:16px auto;background:white}.pu-reference p{font-size:12px;line-height:1.7;color:#718497}.pu-combo-fields{display:flex;gap:18px;align-items:end;flex-wrap:wrap;margin-bottom:18px}.pu-combo-fields select{min-width:130px}.pu-mix{display:flex;gap:8px;align-items:center}.pu-mix label{display:flex;flex-direction:row;align-items:center;border:1px solid #d9e3ec;border-radius:8px;padding:10px;cursor:pointer;color:#325777;font-size:13px}.pu-mix input{accent-color:#2266aa}.pu-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.pu-combo-card{border:1px solid #dbe4ed;background:#fff;border-radius:13px;padding:17px;min-width:0}.pu-combo-card h3{font-size:16px;margin:14px 0 8px}.pu-combo-card svg{width:100%;height:180px;background:#f6f9fc;border-radius:8px}.pu-combo-meta{font-size:12px;color:#73869a;line-height:1.8}.pu-combo-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0}.pu-combo-metrics div{background:#f5f8fb;border-radius:7px;padding:9px}.pu-combo-metrics span{font-size:10px;color:#7e90a2;display:block}.pu-combo-metrics b{font-size:14px;color:#2c5071}.pu-combo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pu-empty{padding:30px;color:#74869a;text-align:center;border:1px dashed #cad7e2;border-radius:10px}.pu-saved{margin-top:24px}.pu-saved-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:12px;border-bottom:1px solid #e2e9f0}.pu-saved-row strong{font-size:13px}.pu-saved-row small{display:block;margin-top:5px;color:#7b8da0}.pu-footnote{font-size:12px;color:#8090a0;line-height:1.7;margin:15px 0}.pu-active-room{display:flex;align-items:center;gap:8px;margin-bottom:14px}.pu-active-room i{width:12px;height:12px;border-radius:4px}.pu-active-room strong{font-size:15px;color:#24496c}.pu-area{font-size:24px;color:#1e5686;margin:14px 0}.pu-area small{font-size:12px;color:#7a8d9f}.pu-status{min-height:20px;font-size:12px;color:#347658;margin-top:10px}
      @media(max-width:1100px){.pu-layout{grid-template-columns:1fr}.pu-inspector{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pu-combo-grid{grid-template-columns:1fr 1fr}.pu-canvas{min-height:300px}}@media(max-width:700px){.pu-combo-grid,.pu-inspector{grid-template-columns:1fr}.pu-statrow{gap:6px}.pu-stat{padding:8px}.pu-stat b{font-size:17px}.pu-tabs button{padding:10px 18px}.pu-canvas{min-height:220px}.pu-combo-fields{align-items:stretch;gap:12px}}
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

  function mountCombinations(container, project, onChange, onPlace) {
    ensureUnits(project); injectStyles(container.ownerDocument);
    let count = 4, coreCapacity = 4, types = [59, 74, 84], status = '';
    function save(candidate) {
      const existing = project.typologies.findIndex(t => t.id === candidate.id);
      const saved = JSON.parse(JSON.stringify(candidate));
      if (existing >= 0) project.typologies[existing] = saved; else project.typologies.push(saved);
      status = candidate.name + ' 저장됨';
      if (typeof onChange === 'function') onChange();
      return saved;
    }
    function render() {
      const candidates = generateCombinations(project.units, { count, coreCapacity, types });
      container.innerHTML = `<div class="panel"><div class="pu-toolbar"><h3>세대와 코어로 동평면 후보 만들기</h3><span class="tag">유한 후보 3안</span></div><p class="pu-note">선택한 평형을 순서대로 고르게 배분합니다. 현재 세대 외곽 크기를 유지하며, 연결 띠와 코어를 더한 개념 조합입니다.</p>
        <div class="pu-combo-fields"><div><div class="section-label" style="margin-bottom:8px">포함할 평형</div><div class="pu-mix">${TYPES.map(t => `<label><input type="checkbox" data-mix="${t}" ${types.includes(t) ? 'checked' : ''}>${t}㎡</label>`).join('')}</div></div>
        <label>층당 세대 수<select data-count>${[2, 4, 6].map(n => `<option value="${n}" ${n === count ? 'selected' : ''}>${n}세대</option>`).join('')}</select></label><label>코어당 계획 세대 수<select data-core><option value="2" ${coreCapacity === 2 ? 'selected' : ''}>최대 2세대</option><option value="4" ${coreCapacity === 4 ? 'selected' : ''}>최대 4세대</option></select></label></div>
        <div class="pu-warning">코어 5.8 × 6.2m와 연결 띠는 임의 계획값입니다. HAUD에서 실측·추출한 코어가 아니며, 현관 접합·공용 동선·피난·구조·채광 적합성은 미검토입니다.</div></div>
        <div class="pu-status" role="status">${esc(status)}</div><div class="pu-combo-grid">${candidates.length ? candidates.map((c, i) => `<article class="pu-combo-card">${schematicSvg(c)}<h3>${esc(c.name)}</h3><div class="pu-combo-meta">${c.unitMix.map(m => `${m.type}형 ${m.count}세대`).join(' + ')}<br>코어 ${c.coreCount}개 · ${fmt(c.width)} × ${fmt(c.depth)}m</div><div class="pu-combo-metrics"><div><span>명목 전용 합계 / 층</span><b>${fmt(c.totalUnitArea)}㎡</b></div><div><span>개념 공용부 / 층</span><b>${fmt(c.coreArea)}㎡</b></div></div><span class="tag">연결 적합성 미검토</span><div class="pu-combo-actions"><button class="btn" type="button" data-save="${i}">후보 저장</button><button class="btn primary" type="button" data-place="${i}">대지에 배치 →</button></div></article>`).join('') : '<div class="pu-empty">조합할 평형을 한 개 이상 선택하세요.</div>'}</div>
        <p class="pu-footnote">탐색 범위: 선택 평형을 59→74→84 순서로 순환 배분 × 3가지 직교 배치. 세대 수보다 선택 평형이 많으면 뒷순서 평형은 제외됩니다. 모든 가능한 동평면을 탐색한 결과가 아닙니다. 공용부는 코어와 연결 띠의 합집합이며, 세대 조닝 면적·법정 연면적과 구분합니다.</p>
        <div class="panel pu-saved"><div class="pu-toolbar"><h3>저장한 동 유형</h3><span class="muted">${project.typologies.length}개</span></div>${project.typologies.length ? project.typologies.map((t, i) => `<div class="pu-saved-row"><div><strong>${esc(t.name)}</strong><small>${t.unitsPerFloor}세대/층 · ${fmt(t.width)} × ${fmt(t.depth)}m${t.needsReview ? ' · 세대 변경: 재검토 필요' : ''}</small></div><button class="btn" type="button" data-saved-place="${i}">배치에 추가</button></div>`).join('') : '<p class="pu-note">후보를 저장하면 배치 단계에서 다시 사용할 수 있습니다.</p>'}</div>`;
      container.querySelectorAll('[data-mix]').forEach(input => input.addEventListener('change', () => { types = Array.from(container.querySelectorAll('[data-mix]:checked')).map(el => Number(el.dataset.mix)); render(); }));
      container.querySelector('[data-count]').addEventListener('change', e => { count = Number(e.target.value); render(); });
      container.querySelector('[data-core]').addEventListener('change', e => { coreCapacity = Number(e.target.value); render(); });
      container.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () => { save(candidates[Number(b.dataset.save)]); render(); }));
      container.querySelectorAll('[data-place]').forEach(b => b.addEventListener('click', () => { const saved = save(candidates[Number(b.dataset.place)]); if (typeof onPlace === 'function') onPlace(saved); }));
      container.querySelectorAll('[data-saved-place]').forEach(b => b.addEventListener('click', () => { if (typeof onPlace === 'function') onPlace(project.typologies[Number(b.dataset.savedPlace)]); }));
    }
    render(); return { render, destroy() { container.innerHTML = ''; } };
  }
  return { createUnit, checkUnit, editRoom, generateCombinations, mountUnits, mountCombinations, schematicSvg };
});
