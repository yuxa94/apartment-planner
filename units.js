(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerUnits = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = [59, 74, 84];
  const COLORS = { living: '#dbeafe', kitchen: '#e0e7ff', bedroom: '#d1e7f1', wet: '#ccebe8', service: '#f2e9d9', circulation: '#eef1f5', balcony: '#e4eedf' };
  const CATEGORY_LABELS = { living: '거실', bedroom: '침실', kitchen: '주방', wet: '욕실·다용도', service: '수납·현관', circulation: '복도', balcony: '발코니' };
  const CATEGORIES = Object.keys(CATEGORY_LABELS);
  // Rooms in these categories absorb gaps first, so wet rooms and storage keep their planned size.
  const PRIMARY = new Set(['living', 'kitchen', 'bedroom', 'circulation']);
  const EPS = 1e-6;
  const round = n => Math.round(n * 1000) / 1000 + 0; // + 0 turns -0 into 0
  const clone = o => JSON.parse(JSON.stringify(o));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const mm = n => Math.round(n * 1000).toLocaleString('ko-KR');

  // Reference layouts traced from the dimension strings of the LH 양주회천 A-26 59A·74A·84A guide plans.
  // Coordinates are metres, x right / y down, origin at the outline's bounding-box corner. Wall thickness
  // and centreline/finish faces are not separated, so expect a few tens of centimetres of deviation.
  const ROOM_DATA = {
    59: { livingWidth: 3790,
      outline: [[0, 0], [8.7, 0], [8.7, 2.9], [12.9, 2.9], [12.9, 9.2], [3.6, 9.2], [3.6, 8.1], [0, 8.1]],
      officialDims: { '거실 폭': '3,790', '안방': '3,600 × 3,570', '침실 2': '2,750 × 3,610', '침실 3': '2,760 × 3,610', '전체 폭': '12,900' },
      image: { x: 290, y: 320, scale: 64.3 },
      rooms: [
        ['dress', '드레스룸', 0, 0, 1.8, 4.5, 'service'], ['ac', '실외기실', 1.8, 0, 1.8, 2.1, 'service'],
        ['bath2', '부부욕실', 1.8, 2.1, 1.8, 2.4, 'wet'], ['master', '안방', 0, 4.5, 3.6, 3.6, 'bedroom'],
        ['kitchen', '주방·식당', 3.6, 0, 3.8, 4.3, 'kitchen'], ['living', '거실', 3.6, 4.3, 3.8, 4.9, 'living'],
        ['utility', '다용도실', 7.4, 0, 1.3, 2.8, 'wet'], ['pantry', '팬트리', 7.4, 2.8, 0.7, 1.5, 'service'],
        ['storage', '현관창고', 8.1, 2.8, 0.6, 1.5, 'service'], ['entry', '현관', 8.7, 2.9, 2.6, 1.4, 'service'],
        ['bath1', '공용욕실', 11.3, 2.9, 1.6, 2.6, 'wet'], ['hall', '복도', 7.4, 4.3, 3.9, 1.2, 'circulation'],
        ['bed2', '침실 2', 7.4, 5.5, 2.75, 3.7, 'bedroom'], ['bed3', '침실 3', 10.15, 5.5, 2.75, 3.7, 'bedroom']
      ] },
    74: { livingWidth: 4590,
      outline: [[0, 3.15], [2.4, 3.15], [2.4, 2.6], [5.15, 2.6], [5.15, 0], [14.4, 0], [14.4, 9.4], [0, 9.4]],
      officialDims: { '거실 폭': '4,590', '안방': '3,800 × 3,270', '침실 2': '2,850 × 3,710', '침실 3': '3,160 × 3,710', '전체 폭': '14,400' },
      image: { x: 237, y: 311, scale: 62.2 },
      rooms: [
        ['bath1', '공용욕실', 0, 3.15, 1.75, 2.55, 'wet'], ['shoes', '신발장', 1.75, 3.15, 0.65, 1.3, 'service'],
        ['entry', '현관', 2.4, 2.6, 1.9, 1.85, 'service'], ['storage', '현관창고', 4.3, 2.6, 0.85, 1.85, 'service'],
        ['utility', '다용도실', 5.15, 0, 1.4, 2.95, 'wet'], ['pantry', '팬트리', 5.15, 2.95, 1.4, 1.5, 'service'],
        ['kitchen', '주방·식당', 6.55, 0, 4.05, 4.45, 'kitchen'], ['hall', '복도', 1.75, 4.45, 4.26, 1.25, 'circulation'],
        ['living', '거실', 6.01, 4.45, 4.59, 4.95, 'living'], ['bed3', '침실 3', 0, 5.7, 3.16, 3.7, 'bedroom'],
        ['bed2', '침실 2', 3.16, 5.7, 2.85, 3.7, 'bedroom'], ['ac', '실외기실', 10.6, 0, 1.8, 2.07, 'service'],
        ['bath2', '부부욕실', 10.6, 2.07, 1.8, 2.57, 'wet'], ['dress', '드레스룸', 12.4, 0, 2, 4.64, 'service'],
        ['master', '안방', 10.6, 4.64, 3.8, 3.27, 'bedroom'], ['balcony', '발코니', 10.6, 7.91, 3.8, 1.49, 'balcony']
      ] },
    84: { livingWidth: 4690,
      outline: [[0, 4.2], [2.2, 4.2], [2.2, 3.5], [4.9, 3.5], [4.9, 1], [6.31, 1], [6.31, 0.55], [13, 0.55], [13, 0], [14.9, 0], [14.9, 10.57], [0, 10.57]],
      officialDims: { '거실 폭': '4,690', '안방': '3,900 × 3,570', '침실 2': '3,150 × 3,710', '침실 3': '3,160 × 3,710', '전체 폭': '14,900' },
      image: { x: 207, y: 301, scale: 62.35 },
      rooms: [
        ['bath1', '공용욕실', 0, 4.2, 1.75, 2.66, 'wet'], ['shoes', '신발장', 1.75, 4.2, 0.45, 1.45, 'service'],
        ['entry', '현관', 2.2, 3.5, 2.1, 2.15, 'service'], ['storage', '현관창고', 4.3, 3.5, 2.01, 2.15, 'service'],
        ['utility', '다용도실', 4.9, 1, 1.41, 2.5, 'wet'], ['hall', '복도', 1.75, 5.65, 4.56, 1.21, 'circulation'],
        ['kitchen', '주방·식당', 6.31, 0.55, 4.69, 4.45, 'kitchen'], ['living', '거실', 6.31, 5, 4.69, 5.57, 'living'],
        ['bed3', '침실 3', 0, 6.86, 3.16, 3.71, 'bedroom'], ['bed2', '침실 2', 3.16, 6.86, 3.15, 3.71, 'bedroom'],
        ['dress', '드레스룸', 11, 0.55, 2, 4.95, 'service'], ['ac', '실외기실', 13, 0, 1.9, 2.07, 'service'],
        ['bath2', '부부욕실', 13, 2.07, 1.9, 2.07, 'wet'], ['powder', '파우더룸', 13, 4.14, 1.9, 1.36, 'service'],
        ['master', '안방', 11, 5.5, 3.9, 3.57, 'bedroom'], ['balcony', '발코니', 11, 9.07, 3.9, 1.5, 'balcony']
      ] }
  };
  // Room geometry of the first-edition default templates. Units still identical to these are upgraded.
  const LEGACY_FINGERPRINTS = {
    59: 'master,0.2,4.5,3.4,3.6;living,3.7,4.3,3.6,4;bed2,7.4,5,2.7,3.3;bed3,10.2,5,2.6,3.3;kitchen,3.7,0.6,3,3.2;bath1,6.9,0.5,1.6,2.3;bath2,1.9,0.5,1.4,2.2;dress,0.2,0.5,1.5,1.8;entry,8.8,2.9,1.5,1.8;utility,0.2,2.4,1.5,2;pantry,10.5,3.2,1,1.2',
    74: 'master,0.2,5.2,3.6,3.6;living,3.9,4.6,4.2,4.2;bed2,8.2,5.3,2.8,3.5;bed3,9.9,0.2,3,3.4;kitchen,4.1,0.3,3.4,3.6;bath1,7.7,0.3,1.7,2.3;bath2,2.3,0.3,1.5,2.2;dress,0.2,0.3,1.8,2;entry,11.1,3.8,1.7,1.8;utility,0.2,2.6,1.6,2.2;pantry,2.3,3,1.2,1.5',
    84: 'master,0.2,0.2,3.7,3.8;living,6.5,4.9,4.5,4.4;bed2,3.4,5.6,3,3.6;bed3,0.2,5.6,3.1,3.6;kitchen,6.5,0.2,3.6,3.9;bath1,11.1,6.9,1.7,2.4;bath2,11.1,4.4,1.6,2.3;dress,4.1,0.2,2.1,2.4;entry,10.3,0.2,1.8,2;utility,0.2,4.1,1.8,1.4;powder,4.1,2.8,1.2,1.4'
  };
  const fingerprint = unit => (unit.rooms || []).map(r => [r.id, r.x, r.y, r.width, r.depth].join(',')).join(';');

  function createUnit(type) {
    type = Number(type);
    if (!ROOM_DATA[type]) throw new Error('지원하는 평형은 59, 74, 84입니다.');
    const source = ROOM_DATA[type], box = bounds(source.outline);
    return {
      id: 'unit-' + type, type, name: type + '형 · 참고도면 조닝', width: round(box.maxX - box.minX), depth: round(box.maxY - box.minY),
      outline: clone(source.outline), layoutVersion: 2,
      rooms: source.rooms.map(r => ({ id: r[0], name: r[1], x: r[2], y: r[3], width: r[4], depth: r[5], category: r[6], locked: false })),
      reference: { status: 'illustrative', project: 'LH 양주회천 A-26', type: type + 'A', image: 'assets/' + type + 'A-plan.png',
        officialLivingWidthMm: source.livingWidth, areaDefinition: '직사각형 조닝 영역. 벽체·발코니·법정 전용면적 미산정.',
        geometrySource: '공식 안내도 표기 치수를 따라 개략 추적. 벽 두께·중심선 미구분.',
        sourceFile: '59-74-84_실별면적_치수_대표도면.md', dimensionStatus: '공식 도면 표기값은 조닝의 유효치수와 구분' }
    };
  }

  /* ---------- geometry ---------- */
  function bounds(poly) {
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
  }
  function polygonArea(poly) {
    let s = 0;
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; });
    return Math.abs(s) / 2;
  }
  function pointInPolygon(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Liang-Barsky clip: does segment a-b reach the open box (x0,y0)-(x1,y1)?
  function segmentHitsBox(a, b, x0, y0, x1, y1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], p = [-dx, dx, -dy, dy], q = [a[0] - x0, x1 - a[0], a[1] - y0, y1 - a[1]];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-12) { if (q[i] <= 0) return false; continue; }
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return t0 <= t1;
  }
  function rectInside(r, poly) {
    const e = 1e-4;
    if (!pointInPolygon(r.x + r.width / 2, r.y + r.depth / 2, poly)) return false;
    return poly.every((a, i) => !segmentHitsBox(a, poly[(i + 1) % poly.length], r.x + e, r.y + e, r.x + r.width - e, r.y + r.depth - e));
  }
  function rectsOverlap(a, b) {
    return Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > EPS && Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y) > EPS;
  }
  function simplePolygon(poly) {
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const n = poly.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      const a = poly[i], b = poly[(i + 1) % n], c = poly[j], d = poly[(j + 1) % n];
      const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
      if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return false;
      const onSeg = (p, q, r) => Math.abs(cross(p, q, r)) <= EPS && Math.min(p[0], q[0]) - EPS <= r[0] && r[0] <= Math.max(p[0], q[0]) + EPS && Math.min(p[1], q[1]) - EPS <= r[1] && r[1] <= Math.max(p[1], q[1]) + EPS;
      if (onSeg(a, b, c) || onSeg(a, b, d) || onSeg(c, d, a) || onSeg(c, d, b)) return false;
    }
    return true;
  }
  function validateOutline(poly) {
    if (!Array.isArray(poly) || poly.length < 3 || poly.length > 64) throw new Error('외곽은 3~64개의 꼭짓점이 필요합니다.');
    const points = [];
    for (const p of poly) {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(v => Number.isFinite(v) && v >= -500 && v <= 500)) throw new Error('외곽 좌표는 [x, y] m 숫자여야 합니다.');
      const q = [round(p[0]), round(p[1])], last = points[points.length - 1];
      if (!last || Math.hypot(last[0] - q[0], last[1] - q[1]) > 1e-3) points.push(q);
    }
    if (points.length > 2 && Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]) <= 1e-3) points.pop();
    if (points.length < 3) throw new Error('외곽은 3개 이상의 서로 다른 꼭짓점이 필요합니다.');
    if (!simplePolygon(points)) throw new Error('외곽선이 스스로 교차합니다.');
    if (polygonArea(points) < 4) throw new Error('외곽 면적이 너무 작습니다 (4㎡ 이상).');
    return points;
  }
  function outlineOf(unit) {
    try { return validateOutline(unit.outline); } catch (e) { return [[0, 0], [unit.width, 0], [unit.width, unit.depth], [0, unit.depth]]; }
  }
  function normalizeUnit(unit) {
    unit.outline = outlineOf(unit);
    const box = bounds(unit.outline);
    if (Math.abs(box.minX) > EPS || Math.abs(box.minY) > EPS) {
      unit.outline = unit.outline.map(p => [round(p[0] - box.minX), round(p[1] - box.minY)]);
      for (const r of unit.rooms) { r.x = round(r.x - box.minX); r.y = round(r.y - box.minY); }
    }
    unit.width = round(box.maxX - box.minX); unit.depth = round(box.maxY - box.minY);
    for (const r of unit.rooms) if (!CATEGORIES.includes(r.category)) r.category = 'service';
    return unit;
  }

  function checkUnit(unit) {
    const rooms = unit.rooms || [], overlaps = [], outside = [], invalid = [], poly = outlineOf(unit);
    let area = 0;
    for (const r of rooms) {
      if (![r.x, r.y, r.width, r.depth].every(Number.isFinite) || r.width <= 0 || r.depth <= 0) { invalid.push(r.id); continue; }
      area += r.width * r.depth;
      if (!rectInside(r, poly)) outside.push(r.id);
    }
    const valid = rooms.filter(r => !invalid.includes(r.id));
    valid.forEach((a, i) => valid.slice(i + 1).forEach(b => {
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const d = Math.min(a.y + a.depth, b.y + b.depth) - Math.max(a.y, b.y);
      if (w > 1e-7 && d > 1e-7) overlaps.push({ a: a.id, b: b.id, area: round(w * d) });
    }));
    const unionArea = unionOf(valid), outlineArea = polygonArea(poly), layers = layerAreas(unit);
    // The gap is exact only while every room sits inside the outline.
    const gapArea = outside.length ? null : round(Math.max(0, outlineArea - unionArea));
    const hidden = layers.filter(l => l.area > 0 && l.visibleArea < 0.01).map(l => l.id);
    return { area: round(area), unionArea: round(unionArea), outlineArea: round(outlineArea), gapArea, overlaps, outside, invalid, layers, hidden };
  }
  // Sweep the rectangles along x, so overlapping parts count once.
  function unionOf(rects) {
    const xs = [...new Set(rects.flatMap(r => [r.x, r.x + r.width]))].sort((a, b) => a - b);
    let total = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      const middle = (xs[i] + xs[i + 1]) / 2;
      const intervals = rects.filter(r => r.x < middle && r.x + r.width > middle).map(r => [r.y, r.y + r.depth]).sort((a, b) => a[0] - b[0]);
      let low = null, high = null, depth = 0;
      for (const p of intervals) {
        if (low === null) { low = p[0]; high = p[1]; }
        else if (p[0] <= high) high = Math.max(high, p[1]);
        else { depth += high - low; low = p[0]; high = p[1]; }
      }
      if (low !== null) depth += high - low;
      total += (xs[i + 1] - xs[i]) * depth;
    }
    return total;
  }
  function clipRect(a, b) {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), w = Math.min(a.x + a.width, b.x + b.width) - x, d = Math.min(a.y + a.depth, b.y + b.depth) - y;
    return w > 1e-7 && d > 1e-7 ? { x, y, width: w, depth: d } : null;
  }
  const finiteRect = r => [r.x, r.y, r.width, r.depth].every(Number.isFinite) && r.width > 0 && r.depth > 0;
  // Rooms are layers in array order: a later room sits on top and takes the area it overlaps.
  function layerAreas(unit) {
    const rooms = unit.rooms || [];
    return rooms.map((r, i) => {
      if (!finiteRect(r)) return { id: r.id, area: 0, visibleArea: 0, coveredArea: 0 };
      const area = r.width * r.depth, covered = unionOf(rooms.slice(i + 1).filter(finiteRect).map(o => clipRect(o, r)).filter(Boolean));
      return { id: r.id, area: round(area), visibleArea: round(Math.max(0, area - covered)), coveredArea: round(covered) };
    });
  }
  // Centre of the largest uncovered cell of a room, so a partly hidden room keeps a readable label.
  function visibleSpot(unit, index) {
    const r = unit.rooms[index], uppers = unit.rooms.slice(index + 1).filter(finiteRect).map(o => clipRect(o, r)).filter(Boolean);
    if (!uppers.length) return { x: r.x + r.width / 2, y: r.y + r.depth / 2, width: r.width, depth: r.depth };
    const xs = [...new Set([r.x, r.x + r.width].concat(uppers.flatMap(u => [u.x, u.x + u.width])))].sort((a, b) => a - b);
    const ys = [...new Set([r.y, r.y + r.depth].concat(uppers.flatMap(u => [u.y, u.y + u.depth])))].sort((a, b) => a - b);
    let best = null;
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2, w = xs[i + 1] - xs[i], d = ys[j + 1] - ys[j];
      if (uppers.some(u => cx > u.x && cx < u.x + u.width && cy > u.y && cy < u.y + u.depth)) continue;
      if (!best || w * d > best.width * best.depth) best = { x: cx, y: cy, width: w, depth: d };
    }
    return best;
  }
  function moveRoomLayer(unit, roomId, toIndex) {
    const from = unit.rooms.findIndex(r => r.id === roomId);
    if (from < 0 || !Number.isInteger(toIndex)) return false;
    const to = Math.max(0, Math.min(unit.rooms.length - 1, toIndex));
    if (to === from) return false;
    const [room] = unit.rooms.splice(from, 1);
    unit.rooms.splice(to, 0, room);
    return true;
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

  /* ---------- fill: grow rooms until they meet each other and the outline ---------- */
  const SIDES = ['left', 'right', 'top', 'bottom'];
  const sideDir = side => side === 'left' || side === 'top' ? -1 : 1;
  function sideValue(r, side) { return side === 'left' ? r.x : side === 'right' ? r.x + r.width : side === 'top' ? r.y : r.y + r.depth; }
  function withSide(r, side, v) {
    if (side === 'left') return { x: round(v), y: r.y, width: round(r.x + r.width - v), depth: r.depth };
    if (side === 'right') return { x: r.x, y: r.y, width: round(v - r.x), depth: r.depth };
    if (side === 'top') return { x: r.x, y: round(v), width: r.width, depth: round(r.y + r.depth - v) };
    return { x: r.x, y: r.y, width: r.width, depth: round(v - r.y) };
  }
  function stripFree(unit, poly, room, side, v) {
    const c = sideValue(room, side), lo = Math.min(c, v), hi = Math.max(c, v);
    if (hi - lo <= EPS) return true;
    const s = side === 'left' || side === 'right' ? { x: lo, y: room.y, width: hi - lo, depth: room.depth } : { x: room.x, y: lo, width: room.width, depth: hi - lo };
    return rectInside(s, poly) && unit.rooms.every(o => o === room || !rectsOverlap(o, s));
  }
  function maxExtent(unit, poly, room, side) {
    const cur = sideValue(room, side), dir = sideDir(side), horizontal = side === 'left' || side === 'right';
    const coords = new Set(poly.map(p => horizontal ? p[0] : p[1]));
    for (const o of unit.rooms) if (o !== room) { if (horizontal) { coords.add(o.x); coords.add(o.x + o.width); } else { coords.add(o.y); coords.add(o.y + o.depth); } }
    const list = [...coords].filter(c => (c - cur) * dir > EPS).sort((a, b) => (a - b) * dir);
    let last = cur;
    for (const c of list) {
      if (stripFree(unit, poly, room, side, c)) { last = c; continue; }
      let lo = last, hi = c;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (stripFree(unit, poly, room, side, mid)) lo = mid; else hi = mid; }
      last = lo; break;
    }
    // Round toward the room so rounding never creates an overlap.
    return dir > 0 ? Math.floor(last * 1000 + 1e-6) / 1000 : Math.ceil(last * 1000 - 1e-6) / 1000;
  }
  function fillUnit(unit, options) {
    options = options || {};
    normalizeUnit(unit);
    const poly = unit.outline, step = options.step || 0.1, before = checkUnit(unit);
    const bad = new Set(before.outside.concat(before.invalid));
    const growable = unit.rooms.filter(r => !r.locked && !bad.has(r.id) && (!options.ids || options.ids.includes(r.id)));
    const phases = options.ids ? [growable] : [growable.filter(r => PRIMARY.has(r.category)), growable];
    for (const group of phases) {
      for (let guard = 0; guard < 5000; guard++) {
        let moved = false;
        for (const room of group) for (const side of SIDES) {
          const cur = sideValue(room, side), dir = sideDir(side);
          let target = round(cur + dir * step);
          if (!stripFree(unit, poly, room, side, target)) {
            const limit = maxExtent(unit, poly, room, side);
            target = dir > 0 ? Math.min(target, limit) : Math.max(target, limit);
          }
          if ((target - cur) * dir > 5e-4) { Object.assign(room, withSide(room, side, target)); moved = true; }
        }
        if (!moved) break;
      }
    }
    if (!options.ids) repairGaps(unit, growable);
    return checkUnit(unit);
  }
  // Rooms that met at staggered lines leave L-shaped slivers no single rectangle can grow into.
  // Let a room extend across a sliver while the neighbour in its way retracts by the same depth,
  // keeping the trade only when the total gap shrinks.
  function repairGaps(unit, growable) {
    const poly = unit.outline, movable = new Set(growable.map(r => r.id));
    const opposite = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    for (let pass = 0; pass < 40; pass++) {
      const start = checkUnit(unit), gap = start.gapArea, overlapBefore = problemTotals(start).overlap;
      if (gap === null || gap < 1e-3) return;
      const xs = [...new Set(poly.map(p => p[0]).concat(unit.rooms.flatMap(r => [r.x, r.x + r.width])))].sort((a, b) => a - b);
      const ys = [...new Set(poly.map(p => p[1]).concat(unit.rooms.flatMap(r => [r.y, r.y + r.depth])))].sort((a, b) => a - b);
      const cells = [];
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
        const c = { x: xs[i], y: ys[j], width: xs[i + 1] - xs[i], depth: ys[j + 1] - ys[j] };
        if (c.width > 1e-3 && c.depth > 1e-3 && rectInside(c, poly) && unit.rooms.every(r => !rectsOverlap(r, c))) cells.push(c);
      }
      let improved = false;
      for (const cell of cells) {
        for (const room of unit.rooms.filter(r => movable.has(r.id))) {
          for (const side of SIDES) {
            const horizontal = side === 'left' || side === 'right', dir = sideDir(side), cur = sideValue(room, side);
            const near = horizontal ? (dir > 0 ? cell.x : cell.x + cell.width) : (dir > 0 ? cell.y : cell.y + cell.depth);
            const far = horizontal ? (dir > 0 ? cell.x + cell.width : cell.x) : (dir > 0 ? cell.y + cell.depth : cell.y);
            const spans = horizontal ? room.y < cell.y + cell.depth - 1e-3 && room.y + room.depth > cell.y + 1e-3 : room.x < cell.x + cell.width - 1e-3 && room.x + room.width > cell.x + 1e-3;
            if (Math.abs(cur - near) > 1e-3 || !spans) continue;
            const trial = clone(unit.rooms), r = trial.find(t => t.id === room.id);
            Object.assign(r, withSide(r, side, far));
            let ok = true;
            for (const other of trial) {
              if (other === r || !rectsOverlap(other, r)) continue;
              const face = sideValue(other, opposite[side]);
              // The blocker must start inside the new strip, so pulling its facing side back to `far` clears it.
              if (!movable.has(other.id) || (face - cur) * dir < -1e-3 || (face - far) * dir > -1e-3) { ok = false; break; }
              const retracted = withSide(other, opposite[side], far);
              if (retracted.width < 0.3 || retracted.depth < 0.3) { ok = false; break; }
              Object.assign(other, retracted);
            }
            if (!ok) continue;
            const report = checkUnit(Object.assign(clone(unit), { rooms: trial }));
            if (problemTotals(report).overlap > overlapBefore + 1e-4 || report.outside.length || report.gapArea === null || report.gapArea > gap - 1e-3) continue;
            // Copy into the existing room objects so callers holding references stay valid.
            trial.forEach((t, i) => Object.assign(unit.rooms[i], t)); improved = true; break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (!improved) return;
    }
  }

  /* ---------- outline edits ---------- */
  // Largest rectangle inside both the room and the outline, so a shrinking outline trims rooms instead of dropping them.
  function clipRoom(room, poly) {
    if (rectInside(room, poly)) return true;
    const xs = [...new Set([room.x, room.x + room.width].concat(poly.map(p => p[0]).filter(x => x > room.x && x < room.x + room.width)))].sort((a, b) => a - b);
    const ys = [...new Set([room.y, room.y + room.depth].concat(poly.map(p => p[1]).filter(y => y > room.y && y < room.y + room.depth)))].sort((a, b) => a - b);
    let best = null;
    for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) for (let k = 0; k < ys.length; k++) for (let l = k + 1; l < ys.length; l++) {
      const r = { x: xs[i], y: ys[k], width: xs[j] - xs[i], depth: ys[l] - ys[k] };
      if (r.width < 0.3 || r.depth < 0.3 || (best && r.width * r.depth <= best.width * best.depth)) continue;
      if (rectInside(r, poly)) best = r;
    }
    if (!best) return false;
    Object.assign(room, { x: round(best.x), y: round(best.y), width: round(best.width), depth: round(best.depth) });
    return true;
  }
  function setOutline(unit, poly, options) {
    options = options || {};
    unit.outline = validateOutline(poly);
    normalizeUnit(unit);
    if (options.clip !== false) for (const room of unit.rooms) if (!room.locked) clipRoom(room, unit.outline);
    return options.fill ? fillUnit(unit) : checkUnit(unit);
  }
  function edgeInfo(poly, index) {
    const a = poly[index], b = poly[(index + 1) % poly.length];
    return { a, b, horizontal: Math.abs(a[1] - b[1]) < 1e-4, vertical: Math.abs(a[0] - b[0]) < 1e-4, length: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  }
  // Push or pull one wall. Rooms whose side lies on an axis-aligned wall move with it.
  function moveEdge(unit, index, delta) {
    if (!Number.isFinite(delta)) return { ok: false, message: '이동 거리가 올바르지 않습니다.' };
    const trial = clone(unit);
    let poly = outlineOf(trial);
    const n = poly.length;
    if (index < 0 || index >= n) return { ok: false, message: '변을 찾을 수 없습니다.' };
    if (Math.abs(delta) < 1e-4) return { ok: true, edge: index };
    const { a, b, horizontal, vertical, length } = edgeInfo(poly, index);
    if (horizontal || vertical) {
      const line = horizontal ? a[1] : a[0], lo = Math.min(horizontal ? a[0] : a[1], horizontal ? b[0] : b[1]), hi = Math.max(horizontal ? a[0] : a[1], horizontal ? b[0] : b[1]);
      for (const r of trial.rooms) {
        const start = horizontal ? r.x : r.y, end = start + (horizontal ? r.width : r.depth);
        // Only rooms lying wholly along the moved segment follow it; others are trimmed by the new outline.
        if (start < lo - 1e-3 || end > hi + 1e-3 || end - start <= 1e-3) continue;
        const near = horizontal ? r.y : r.x, far = near + (horizontal ? r.depth : r.width);
        const onNear = Math.abs(near - line) < 1e-3, onFar = Math.abs(far - line) < 1e-3;
        if (!onNear && !onFar) continue;
        if (r.locked) return { ok: false, message: `잠긴 공간(${r.name})이 이 벽에 붙어 있습니다.` };
        const side = horizontal ? (onNear ? 'top' : 'bottom') : (onNear ? 'left' : 'right');
        const next = withSide(r, side, sideValue(r, side) + delta);
        if (next.width < 0.3 || next.depth < 0.3) return { ok: false, message: `${r.name}이(가) 너무 작아집니다.` };
        Object.assign(r, next);
      }
      // A segment of a longer straight wall is extruded: keep the original corners so the connectors stay square.
      const parallel = e => horizontal ? e.horizontal : e.vertical;
      const keepA = parallel(edgeInfo(poly, (index - 1 + n) % n)), keepB = parallel(edgeInfo(poly, (index + 1) % n));
      const oldA = a.slice(), oldB = b.slice(), ib = (index + 1) % n;
      if (horizontal) { a[1] = round(a[1] + delta); b[1] = round(b[1] + delta); } else { a[0] = round(a[0] + delta); b[0] = round(b[0] + delta); }
      const next = [];
      poly.forEach((p, i) => { if (i === index && keepA) next.push(oldA); next.push(p); if (i === ib && keepB) next.push(oldB); });
      poly = next;
    } else {
      const nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
      for (const p of [a, b]) { p[0] = round(p[0] + nx * delta); p[1] = round(p[1] + ny * delta); }
    }
    const edge = poly.indexOf(a);
    try { setOutline(trial, poly); } catch (e) { return { ok: false, message: e.message }; }
    Object.assign(unit, { outline: trial.outline, rooms: trial.rooms, width: trial.width, depth: trial.depth });
    // When a notch is pushed flat its corner points merge, so the edge numbering is no longer known.
    return { ok: true, edge: trial.outline.length === poly.length ? edge : -1 };
  }
  // Move one corner. With `orthogonal`, the two walls meeting at the corner move instead, keeping right angles.
  function moveVertex(unit, index, dx, dy, options) {
    options = options || {};
    const poly = outlineOf(unit), n = poly.length;
    if (index < 0 || index >= n || !Number.isFinite(dx) || !Number.isFinite(dy)) return { ok: false, message: '꼭짓점을 찾을 수 없습니다.' };
    const prev = edgeInfo(poly, (index - 1 + n) % n), next = edgeInfo(poly, index);
    if (options.orthogonal && (prev.horizontal || prev.vertical) && (next.horizontal || next.vertical) && prev.horizontal !== next.horizontal) {
      // Move the horizontal wall by dy, then the vertical one by dx; extrusion may renumber the corner.
      const trial = clone(unit), firstIsPrev = prev.horizontal;
      const first = moveEdge(trial, firstIsPrev ? (index - 1 + n) % n : index, dy);
      if (!first.ok) return first;
      if (first.edge < 0) return { ok: false, message: '꼭짓점이 다른 꼭짓점과 겹칩니다.' };
      const m = trial.outline.length, corner = firstIsPrev ? (first.edge + 1) % m : first.edge;
      const second = moveEdge(trial, firstIsPrev ? corner : (corner - 1 + m) % m, dx);
      if (!second.ok) return second;
      Object.assign(unit, { outline: trial.outline, rooms: trial.rooms, width: trial.width, depth: trial.depth });
      return { ok: true, vertex: second.edge < 0 ? -1 : firstIsPrev ? second.edge : (second.edge + 1) % trial.outline.length };
    }
    const trial = clone(unit);
    poly[index] = [round(poly[index][0] + dx), round(poly[index][1] + dy)];
    try { setOutline(trial, poly); } catch (e) { return { ok: false, message: e.message }; }
    Object.assign(unit, { outline: trial.outline, rooms: trial.rooms, width: trial.width, depth: trial.depth });
    return { ok: true, vertex: trial.outline.length === poly.length ? index : -1 };
  }
  // Split an edge around a point into three parts; dragging the middle part then makes a notch or bump.
  function splitEdge(unit, index, point) {
    const poly = outlineOf(unit), { a, b, length } = edgeInfo(poly, index);
    if (length < 1.2) return { ok: false, message: '1.2 m보다 짧은 변은 나눌 수 없습니다.' };
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / (length * length)));
    const half = Math.min(0.5, length / 4) / length, t1 = Math.max(0.1 / length, Math.min(t - half, 1 - 2 * half - 0.1 / length)), t2 = t1 + 2 * half;
    const at = s => [round(a[0] + (b[0] - a[0]) * s), round(a[1] + (b[1] - a[1]) * s)];
    poly.splice(index + 1, 0, at(t1), at(t2));
    const trial = clone(unit);
    try { setOutline(trial, poly); } catch (e) { return { ok: false, message: e.message }; }
    Object.assign(unit, { outline: trial.outline, rooms: trial.rooms, width: trial.width, depth: trial.depth });
    return { ok: true, edge: index + 1 };
  }
  function removeVertex(unit, index) {
    const poly = outlineOf(unit);
    if (poly.length <= 3) return { ok: false, message: '꼭짓점은 3개 이상이어야 합니다.' };
    poly.splice(index, 1);
    const trial = clone(unit);
    try { setOutline(trial, poly); } catch (e) { return { ok: false, message: e.message }; }
    Object.assign(unit, { outline: trial.outline, rooms: trial.rooms, width: trial.width, depth: trial.depth });
    return { ok: true };
  }
  /* ---------- object snapping: other rooms' edges and outline vertices ---------- */
  // Coordinates on one axis a moving edge may snap to. Edges count as infinite lines, as in CAD extension snaps.
  function snapTargets(unit, axis, excludeIds) {
    const skip = new Set(excludeIds || []), out = new Set();
    for (const r of unit.rooms || []) {
      if (skip.has(r.id) || !finiteRect(r)) continue;
      if (axis === 'x') { out.add(r.x); out.add(round(r.x + r.width)); } else { out.add(r.y); out.add(round(r.y + r.depth)); }
    }
    for (const p of outlineOf(unit)) out.add(axis === 'x' ? p[0] : p[1]);
    return [...out];
  }
  function snapCoordinate(unit, axis, value, tolerance, excludeIds) {
    let best = null;
    for (const t of snapTargets(unit, axis, excludeIds)) {
      const d = Math.abs(t - value);
      if (d <= tolerance && (!best || d < best.distance)) best = { value: t, distance: d };
    }
    return best ? { value: best.value, snapped: true } : { value, snapped: false };
  }
  // Snap a dragged room so whichever of its edges is closest lands on a nearby line, per axis.
  function snapRoomMove(unit, room, x, y, tolerance) {
    const result = { x, y, snappedX: false, snappedY: false, guides: [] };
    for (const axis of ['x', 'y']) {
      const size = axis === 'x' ? room.width : room.depth, start = axis === 'x' ? x : y;
      let best = null;
      for (const t of snapTargets(unit, axis, [room.id])) for (const offset of [0, size]) {
        const d = Math.abs(t - (start + offset));
        if (d <= tolerance && (!best || d < best.d)) best = { d, position: t - offset, line: t };
      }
      if (!best) continue;
      result[axis] = round(best.position);
      result[axis === 'x' ? 'snappedX' : 'snappedY'] = true;
      // Show every edge of the room that now sits on a line, not just the one that pulled it.
      const lines = snapTargets(unit, axis, [room.id]);
      for (const edge of [result[axis], round(result[axis] + size)]) if (lines.some(t => Math.abs(t - edge) < 1e-6)) result.guides.push({ axis, value: edge });
    }
    const gx = result.guides.find(g => g.axis === 'x'), gy = result.guides.find(g => g.axis === 'y');
    if (gx && gy) result.guides.push({ axis: 'point', x: gx.value, y: gy.value });
    return result;
  }

  /* ---------- room resize: move one side, optionally dragging the shared wall with it ---------- */
  const OPPOSITE = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
  const MIN_ROOM = 0.3;
  function problemTotals(report) {
    return { overlap: report.overlaps.reduce((s, p) => s + p.area, 0), outside: report.outside.length };
  }
  // With `linked` (default) rooms touching that side along the room's span move their facing side too,
  // so a gapless plan stays gapless. Without it the room alone changes; any overlap is settled by layer order.
  function resizeRoom(unit, roomId, side, value, options) {
    options = options || {};
    if (!SIDES.includes(side) || !Number.isFinite(value)) return { ok: false, message: '크기 조절 값이 올바르지 않습니다.' };
    const trial = clone(unit), room = trial.rooms.find(r => r.id === roomId);
    if (!room) return { ok: false, message: '공간을 찾을 수 없습니다.' };
    if (room.locked) return { ok: false, message: `${room.name}은(는) 잠겨 있습니다.` };
    const cur = sideValue(room, side);
    value = round(value);
    if (Math.abs(value - cur) < 1e-4) return { ok: true, changed: [] };
    const horizontal = side === 'left' || side === 'right', lo = horizontal ? room.y : room.x, hi = lo + (horizontal ? room.depth : room.width);
    const moved = [room];
    if (options.linked !== false) {
      for (const other of trial.rooms) {
        if (other === room || Math.abs(sideValue(other, OPPOSITE[side]) - cur) > 1e-3) continue;
        const start = horizontal ? other.y : other.x, end = start + (horizontal ? other.depth : other.width);
        if (Math.min(end, hi) - Math.max(start, lo) <= 1e-3) continue;
        if (other.locked) return { ok: false, message: `맞닿은 ${other.name}이(가) 잠겨 있습니다.` };
        Object.assign(other, withSide(other, OPPOSITE[side], value));
        moved.push(other);
      }
    }
    Object.assign(room, withSide(room, side, value));
    const small = moved.find(r => r.width < MIN_ROOM - 1e-6 || r.depth < MIN_ROOM - 1e-6);
    if (small) return { ok: false, message: `${small.name}이(가) ${MIN_ROOM * 1000} mm보다 작아집니다.` };
    // A room already outside may still be resized, but a resize may not push another room out.
    const before = problemTotals(checkUnit(unit)), after = problemTotals(checkUnit(trial));
    if (after.outside > before.outside) return { ok: false, message: '외곽을 벗어납니다.' };
    trial.rooms.forEach((r, i) => Object.assign(unit.rooms[i], r));
    return { ok: true, changed: moved.map(r => r.id) };
  }
  // Like resizeRoom, but when the requested side position is blocked it backs off toward the
  // current position in 0.05 m steps, so a drag stops at the nearest wall instead of freezing.
  function resizeRoomClamped(unit, roomId, side, value, options) {
    const room = unit.rooms.find(r => r.id === roomId);
    if (!room) return { ok: false, message: '공간을 찾을 수 없습니다.' };
    const cur = sideValue(room, side), dir = Math.sign(value - cur);
    let first = null;
    for (let v = value, i = 0; (v - cur) * dir > 1e-4 && i < 400; v = round(v - dir * 0.05), i++) {
      const result = resizeRoom(unit, roomId, side, v, options);
      if (result.ok) return Object.assign(result, { value: v, clamped: i > 0, message: first && first.message });
      first = first || result;
    }
    return first || { ok: true, changed: [] };
  }

  function addRoom(unit, options) {
    options = options || {};
    normalizeUnit(unit);
    const id = options.id || 'room-' + Date.now().toString(36), gap = checkUnit(unit).gapArea;
    // In a large empty area (a blank plan) start from a 3 m square instead of flooding the whole gap.
    const sizes = gap !== null && gap > 20 ? [3, 0.6] : [0.6];
    for (const size of sizes) {
      for (let y = 0; y + size <= unit.depth + EPS; y = round(y + 0.1)) for (let x = 0; x + size <= unit.width + EPS; x = round(x + 0.1)) {
        const r = { id, name: options.name || '새 공간', x, y, width: size, depth: size, category: options.category || 'service', locked: false };
        if (rectInside(r, unit.outline) && unit.rooms.every(o => !rectsOverlap(o, r))) {
          unit.rooms.push(r);
          if (size < 1) fillUnit(unit, { ids: [id] });
          return r;
        }
      }
    }
    return null;
  }
  // An empty plan drawn by the user. `type` stays 59/74/84: it is the nominal size class the project
  // schema accepts, so blank plans load everywhere without changing the shared validator.
  function createBlankUnit(options) {
    options = options || {};
    const type = TYPES.includes(Number(options.type)) ? Number(options.type) : 84;
    const width = round(Math.min(60, Math.max(2, Number(options.width) || 12))), depth = round(Math.min(60, Math.max(2, Number(options.depth) || 9)));
    return {
      id: options.id || 'plan-' + Date.now().toString(36), type, name: String(options.name || '새 도면').trim().slice(0, 60) || '새 도면', custom: true, layoutVersion: 2,
      width, depth, outline: [[0, 0], [width, 0], [width, depth], [0, depth]], rooms: [],
      reference: { status: 'blank', note: '사용자가 만든 빈 도면. 기준 평형은 동평면 조합 시 참고값.' }
    };
  }
  // Rooms a markup rectangle touches, with the visible (layered) overlap, largest first.
  function roomsInMark(unit, mark) {
    const layers = layerAreas(unit);
    return unit.rooms.map((r, i) => {
      const hit = finiteRect(r) && clipRect(r, mark);
      if (!hit) return null;
      const covered = unionOf(unit.rooms.slice(i + 1).filter(finiteRect).map(o => clipRect(o, hit)).filter(Boolean));
      return { id: r.id, name: r.name, overlapArea: round(Math.max(0, hit.width * hit.depth - covered)), visibleArea: layers[i].visibleArea };
    }).filter(r => r && r.overlapArea > 0.005).sort((a, b) => b.overlapArea - a.overlapArea);
  }
  function findUnit(project, ref) {
    return typeof ref === 'string' ? project.units.find(u => u.id === ref) : project.units.find(u => Number(u.type) === Number(ref));
  }

  /* ---------- Claude round trip without an API: request text out, patch JSON back ---------- */
  // `ref` is a unit id (string) or a nominal type (number). `marks` are the red markup rectangles.
  function buildUnitRequest(project, ref, text, marks) {
    const unit = findUnit(project, ref);
    if (!unit) throw new Error('세대 도면을 찾을 수 없습니다.');
    marks = Array.isArray(marks) ? marks : [];
    normalizeUnit(unit);
    const report = checkUnit(unit), source = ROOM_DATA[unit.type], areas = report.layers;
    return {
      schema: 'apartment-planner-unit-request/1', baseRevision: project.revision, unitId: unit.id, unitType: Number(unit.type), request: String(text || '').slice(0, 4000),
      coordinateUnit: 'm', axes: 'x는 오른쪽, y는 아래쪽(화면 기준). 원점은 외곽 경계상자의 좌상단.',
      unit: { name: unit.name, outline: unit.outline, width: unit.width, depth: unit.depth,
        rooms: unit.rooms.map((r, i) => ({ id: r.id, name: r.name, category: r.category, x: r.x, y: r.y, width: r.width, depth: r.depth, locked: r.locked, visibleArea: areas[i].visibleArea })) },
      checks: { outlineArea: report.outlineArea, occupiedArea: report.unionArea, gapArea: report.gapArea, overlaps: report.overlaps, outside: report.outside, hidden: report.hidden },
      marks: marks.map(m => ({ label: m.label, x: m.x, y: m.y, width: m.width, depth: m.depth, rooms: roomsInMark(unit, m) })),
      reference: source && !unit.custom ? { plan: 'LH 양주회천 A-26 ' + unit.type + 'A 공식 안내도', officialDimsMm: source.officialDims,
        note: '공식 도면 표기값이며 실내 유효치수가 아니다. 현재 조닝은 이 치수를 따라 개략 추적한 계획값이다.' } : null,
      categories: CATEGORY_LABELS,
      rules: [
        '좌표·치수 단위는 m이며 소수점 셋째 자리까지 쓴다. 외곽은 꼭짓점 배열, 실은 축에 평행한 직사각형 {x, y, width, depth}이다.',
        '실은 외곽 안에 있어야 한다. rooms 배열 순서가 레이어 순서이며 뒤에 있을수록 위 레이어다. 겹치면 위 레이어 실이 그 면적을 차지하고(visibleArea), 겹침 자체는 허용된다. 특별한 요청이 없으면 빈틈 없이 외곽을 채운다.',
        'locked가 true인 실은 이름·위치·치수를 그대로 둔다.',
        '기존 실 id는 유지하고, 새 실에는 새 id를 붙인다. category는 categories의 키 중 하나다.',
        'outline을 생략하면 기존 외곽을 유지한다. rooms를 보내면 그것이 전체 실 목록이 된다.',
        '요청의 "영역 A" 같은 표현은 marks에 있는 같은 label의 빨간 사각형이다(x·y는 좌상단, m). marks[].rooms는 그 영역에 보이는 실과 겹친 면적이다.',
        '법정 전용면적 산정이나 법규 적합 판정을 하지 않는다. 가정은 summary에 적는다.',
        '응답은 apartment-planner-unit-patch/1 JSON 하나를 ```json 코드 블록으로 준다.'
      ],
      expectedPatch: { schema: 'apartment-planner-unit-patch/1', baseRevision: project.revision, unitId: unit.id, unitType: Number(unit.type),
        outline: '(선택) 바꿀 때만 전체 꼭짓점 배열', rooms: '(선택) 바꿀 때 전체 실 목록', fill: '(선택) true면 적용 후 빈 영역 자동 채우기', summary: '변경 요약과 가정' }
    };
  }
  function unitRequestPrompt(request) {
    return [
      `공동주택 단위세대 도면 "${request.unit.name}"(기준 ${request.unitType}형) 조닝을 수정해줘. 아래 JSON이 현재 상태와 규칙이야.`,
      '요청: ' + (request.request || '(요청 내용 없음)'),
      ...(request.marks || []).map(m => `영역 ${m.label}: x ${m.x}~${round(m.x + m.width)} m, y ${m.y}~${round(m.y + m.depth)} m (${m.rooms.length ? m.rooms.map(r => r.name).join(', ') : '빈 영역'})`),
      '', '결과는 apartment-planner-unit-patch/1 JSON 하나만 ```json 코드 블록으로 줘. rules를 지켜줘.',
      '', '```json', JSON.stringify(request, null, 1), '```'
    ].join('\n');
  }
  function extractJson(text) {
    const s = String(text || ''), start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('JSON을 찾을 수 없습니다.');
    try { return JSON.parse(s.slice(start, end + 1)); } catch (e) { throw new Error('JSON 형식 오류: ' + e.message); }
  }
  function readUnitPatch(project, patch) {
    if (!patch || patch.schema !== 'apartment-planner-unit-patch/1') throw new Error('apartment-planner-unit-patch/1 형식이 아닙니다.');
    if (patch.baseRevision !== project.revision) throw new Error(`결과의 기준 개정(${patch.baseRevision})이 현재 개정(${project.revision})과 다릅니다. 최신 상태로 다시 요청하세요.`);
    for (const key of Object.keys(patch)) if (!['schema', 'baseRevision', 'unitId', 'unitType', 'outline', 'rooms', 'fill', 'summary'].includes(key)) throw new Error('지원하지 않는 항목: ' + key);
    const unit = patch.unitId !== undefined ? findUnit(project, String(patch.unitId)) : findUnit(project, Number(patch.unitType));
    if (!unit) throw new Error(patch.unitId !== undefined ? `도면 ${patch.unitId}을(를) 찾을 수 없습니다.` : 'unitType은 59, 74, 84 중 하나여야 합니다.');
    const next = normalizeUnit(clone(unit));
    if (patch.outline !== undefined) next.outline = validateOutline(patch.outline);
    if (patch.rooms !== undefined) {
      if (!Array.isArray(patch.rooms) || !patch.rooms.length || patch.rooms.length > 60) throw new Error('rooms는 1~60개의 실 목록이어야 합니다.');
      const ids = new Set();
      next.rooms = patch.rooms.map(r => {
        if (!r || typeof r.id !== 'string' || !r.id.trim() || r.id.length > 60 || ids.has(r.id)) throw new Error('실 id가 비었거나 중복되었습니다.');
        ids.add(r.id);
        if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 40) throw new Error(`실 이름 오류: ${r.id}`);
        for (const k of ['x', 'y', 'width', 'depth']) if (!Number.isFinite(r[k]) || r[k] < (k === 'width' || k === 'depth' ? 0.1 : -500) || r[k] > 500) throw new Error(`${r.name}의 ${k} 값을 확인하세요.`);
        if (!CATEGORIES.includes(r.category)) throw new Error(`${r.name}의 category는 ${CATEGORIES.join(', ')} 중 하나여야 합니다.`);
        return { id: r.id, name: r.name.trim(), x: round(r.x), y: round(r.y), width: round(r.width), depth: round(r.depth), category: r.category, locked: r.locked === true };
      });
      for (const old of unit.rooms.filter(r => r.locked)) {
        const r = next.rooms.find(n => n.id === old.id);
        if (!r || ['x', 'y', 'width', 'depth'].some(k => Math.abs(r[k] - old[k]) > 1e-3) || r.name !== old.name) throw new Error(`잠긴 공간(${old.name})이 바뀌었거나 빠졌습니다.`);
        r.locked = true;
      }
    }
    setOutline(next, next.outline, { clip: false });
    const report = patch.fill === true ? fillUnit(next) : checkUnit(next);
    return { type: Number(unit.type), unitId: unit.id, name: unit.name, unit: next, report, summary: typeof patch.summary === 'string' ? patch.summary.slice(0, 2000) : '' };
  }
  function applyUnitPatch(project, patch) {
    const result = readUnitPatch(project, patch), unit = project.units.find(u => u.id === result.unitId);
    Object.assign(unit, { outline: result.unit.outline, rooms: result.unit.rooms, width: result.unit.width, depth: result.unit.depth });
    return result;
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
  const DOOR = 1.0; // EPS (1e-6) is shared with the unit editor above
  // Unit fronts allowed by the search: south always; east, west and north each on their own switch (allowSide keeps old callers).
  function allowedFaces(options) {
    const side = options.allowSide !== false;
    const east = options.allowEast != null ? Boolean(options.allowEast) : side, west = options.allowWest != null ? Boolean(options.allowWest) : side;
    return ['S', ...(east ? ['E'] : []), ...(west ? ['W'] : []), ...(options.allowNorth ? ['N'] : [])];
  }

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

  // Fixed stair/lift/shaft blocks read from 인천계양1 standard-floor core drawings
  // (HAUD 04_인천계양1_동별코어조합/00-XREF-계양/core/CORE-*-기준층.dwg, ObjectDBX read-only). Coordinates are metres in the
  // drawing frame with y down, rooms taken from the A-CON wall lines and rounded to 5 cm. The internal hall touches the block's
  // south edge, where the generated hall/corridor attaches. rotate180 turns a block whose hall opens north.
  const CORE_TEMPLATES = {
    'gyeyang-59A': { name: '계양 59A 코어', source: 'CORE-59A-기준층.dwg', lifts: [20],
      observed: '계단 상부 · 승강기 20인승 120 m/min 1대 · 승강기홀 동측 EPS·TPS·AV',
      parts: [['stair', [0, 0, 5.3, 3.05]], ['lift', [0.3, 3.05, 2.85, 5.85]], ['hall', [2.85, 3.05, 4.85, 5.85]], ['shaft', [4.85, 3.05, 6.0, 5.85], 'EPS·TPS·AV']] },
    'gyeyang-84A': { name: '계양 84A 코어', source: 'CORE-84A-기준층.dwg', lifts: [20],
      observed: '계단 상부 · 승강기 20인승 120 m/min 1대 · 승강기홀 동측 EPS·TPS',
      parts: [['stair', [0, 0, 5.3, 3.05]], ['lift', [0.25, 3.05, 2.85, 5.65]], ['hall', [2.85, 3.05, 4.9, 5.85]], ['shaft', [4.9, 3.05, 6.0, 5.85], 'EPS·TPS']] },
    'gyeyang-53A': { name: '계양 53A 코어', source: 'CORE-53A-기준층.dwg', lifts: [15, 15], rotate180: true,
      observed: '승강기 15인승 2대와 계단이 중앙 복도를 사이에 두고 마주 봄 · 복도 북측 개구를 남측으로 돌려 사용',
      parts: [['lift', [0.3, 1.85, 2.5, 4.2]], ['lift', [0.3, 4.2, 2.5, 6.6]], ['stair', [4.38, 1.65, 9.58, 4.65]], ['shaft', [0.2, 6.8, 2.7, 9.55], 'EPS·TPS·PD'],
        ['shaft', [4.38, 4.65, 7.47, 6.13], 'PD'], ['shaft', [4.38, 0.13, 5.6, 1.65], 'PD'], ['shaft', [2.7, 8.47, 4.38, 9.55], 'AV·PD'], ['hall', [2.7, 0, 4.38, 8.47]]] },
    'gyeyang-101': { name: '계양 101동 코어', source: 'CORE-101동-기준층.dwg', lifts: [20],
      observed: '타워형 · 승강기 20인승 1대와 계단 사이 홀 · 하부 홀 동·서측으로 현관 개구 · 원 도면의 사선 세대 벽은 제외',
      parts: [['lift', [4.43, 5.86, 7.23, 8.76]], ['hall', [7.23, 5.61, 9.18, 12.36]], ['stair', [9.18, 6.41, 12.23, 11.66]], ['shaft', [5.35, 8.76, 6.86, 12.36], 'EPS·TPS·AV·PD'],
        ['shaft', [10.47, 11.66, 11.98, 12.36], 'PD']] },
    'gyeyang-103': { name: '계양 103동 코어', source: 'CORE-103동-기준층.dwg', lifts: [17, 15],
      observed: '타워형 · 승강기 17·15인승 2대와 계단 사이 홀 · 하부 홀 동·서측으로 현관 개구 · 원 도면의 사선 세대 벽은 제외',
      parts: [['stair', [6.24, 6.41, 9.29, 11.46]], ['hall', [9.29, 4.41, 11.44, 11.46]], ['lift', [11.44, 4.66, 13.84, 7.16]], ['lift', [11.44, 7.16, 13.84, 9.66]],
        ['shaft', [11.44, 9.66, 14.09, 11.46], 'AV·PD']] },
    'gyeyang-104': { name: '계양 104동 코어', source: 'CORE-104동-기준층.dwg', lifts: [20],
      observed: '타워형 · 승강기 20인승 1대와 계단 사이 홀 · 하부 홀 동·서측으로 현관 개구 · 원 도면의 사선 세대 벽은 제외',
      parts: [['lift', [4.93, 7.36, 7.73, 10.16]], ['shaft', [4.93, 10.16, 7.73, 12.41], 'AV·PD'], ['hall', [7.73, 5.36, 9.68, 12.41]], ['stair', [9.68, 7.11, 12.73, 12.41]]] }
  };

  // Normalises a drawn block to its own frame (origin top-left, y down), turning it 180° when its hall opens north.
  function drawnBlock(id) {
    const t = CORE_TEMPLATES[id];
    let rects = t.parts.map(p => p[1]);
    const x0 = Math.min(...rects.map(r => r[0])), y0 = Math.min(...rects.map(r => r[1])), x1 = Math.max(...rects.map(r => r[2])), y1 = Math.max(...rects.map(r => r[3]));
    const w = x1 - x0, d = y1 - y0;
    const place = ([a, b, c, e]) => t.rotate180 ? [w - (c - x0), d - (e - y0), w - (a - x0), d - (b - y0)] : [a - x0, b - y0, c - x0, e - y0];
    let liftNo = 0;
    const parts = t.parts.map(([kind, rect, name]) => ({ kind, rect: place(rect).map(round),
      name: name || (kind === 'lift' ? '승강기 ' + t.lifts[liftNo++] + '인승' : kind === 'stair' ? '계단실' : kind === 'hall' ? '' : kind) }));
    return { width: round(w), depth: round(d), parts };
  }

  // Layout (y down = south): a north band holds the stair (+ lobby) and the lift bank — assembled from rules, or a drawn block
  // (options.template) — and the hall runs along its south side. The hall may extend left/right as a corridor (extLeft/extRight)
  // or wrap up its east/west sides (sideHalls) for wing units.
  function buildCore(options) {
    options = options || {};
    const floors = Math.max(1, Math.round(Number(options.floors) || 25)), unitsPerFloor = Math.max(1, Math.round(Number(options.unitsPerFloor) || 2));
    const dims = { ...CORE_DIMENSIONS, ...(options.dims || {}) }, spec = coreRules(floors, unitsPerFloor, dims);
    const template = CORE_TEMPLATES[options.template] ? options.template : null;
    const sides = options.sideHalls === 'both' ? ['W', 'E'] : options.sideHalls === 'E' ? ['E'] : [];
    const sideW = sides.includes('W') ? dims.sideHallWidth : 0, sideE = sides.includes('E') ? dims.sideHallWidth : 0;
    // A side hall replaces the corridor extension on that side so the hall edge stays on the core boundary.
    const extLeft = sideW ? 0 : Math.max(0, Number(options.extLeft) || 0), extRight = sideE ? 0 : Math.max(0, Number(options.extRight) || 0);
    const bandLeft = extLeft + sideW, parts = [];
    let bandRight, bandDepth, rules = spec.rules, lifts = spec.lifts, stairKind = spec.stairKind;
    if (template) {
      const t = CORE_TEMPLATES[template], block = drawnBlock(template);
      block.parts.forEach(p => parts.push({ ...p, rect: [p.rect[0] + bandLeft, p.rect[1], p.rect[2] + bandLeft, p.rect[3]] }));
      bandRight = round(bandLeft + block.width); bandDepth = block.depth;
      const capacity = t.lifts.reduce((s, c) => s + c, 0);
      const liftOk = t.lifts.length >= spec.lifts.count && capacity >= spec.lifts.persons, stairOk = spec.stairKind !== 'special';
      lifts = { ...spec.lifts, count: t.lifts.length, capacity: Math.min(...t.lifts) };
      stairKind = 'drawn';
      rules = [
        { label: '승용승강기', value: `도면 ${t.lifts.map(c => c + '인승').join('·')} ${t.lifts.length}대 · 필요 ${spec.lifts.count ? spec.lifts.count + '대 · ' + spec.lifts.persons + '명' : '없음'} → ${liftOk ? '충족' : '부족'}`, basis: spec.rules[0].basis, ok: liftOk },
        { label: '계단 형식', value: `도면 계단 · 필요 ${spec.rules[1].value} → ${stairOk ? '충족' : '부속실 여부 확인 필요'}`, basis: spec.rules[1].basis + '. 도면 블록에 부속실을 따로 표시하지 않음', ok: stairOk },
        spec.rules[2]];
    } else {
      const [lw, ld] = spec.lifts.count ? dims.lifts[spec.lifts.capacity] : [0, 0];
      const stairDepth = dims.stairLength + (spec.stairKind === 'special' ? dims.lobbyLength : 0);
      bandDepth = round(Math.max(stairDepth, ld));
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
      bandRight = round(Math.max(x, bandLeft + dims.stairWidth + 1.2));
    }
    const width = round(bandRight + sideE + extRight), depth = round(bandDepth + dims.hallDepth);
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
      lifts, stairKind, height: spec.height, rules, dims,
      template: template ? { id: template, name: CORE_TEMPLATES[template].name, source: CORE_TEMPLATES[template].source, observed: CORE_TEMPLATES[template].observed } : null };
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
    const fixed = Number(options.coreWidth) > 0 && Number(options.coreDepth) > 0, template = CORE_TEMPLATES[options.coreTemplate] ? options.coreTemplate : null;
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
        const core = fixed ? { width: Number(options.coreWidth), depth: Number(options.coreDepth) } : buildCore({ floors: options.floors, unitsPerFloor: n, dims: options.dims, extLeft, extRight, sideHalls, template });
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
    const faces = allowedFaces(options);
    const { placements: all, rejected } = corePlacements(profiles, core);
    const placements = all.filter(p => faces.includes(p.face));
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
    const combos = [...best.values()].map(attachWindows);
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
    const key = units.map(u => u.type + u.face + (u.mirrored ? 'm' : '') + u.t).sort().join('_') + (core.floors ? '_f' + core.floors + (core.template ? '_t' + core.template.id : '_e' + core.extLeft + '-' + core.extRight + '_s' + core.sideHalls) : '');
    return { id: 'core-' + key, name: n + '세대 · ' + mix.map(m => m.type + '×' + m.count).join(' + '),
      width: round(maxX - minX), depth: round(maxY - minY), unitsPerFloor: n, unitArea: round(total / n), totalUnitArea: total, nominalArea: total,
      coreArea: core.commonArea || round(core.width * core.depth), coreOnlyArea: core.commonArea || round(core.width * core.depth), commonArea: core.commonArea || round(core.width * core.depth), coreCount: 1, coreCapacity: n, unitMix: mix,
      southCount: units.filter(u => u.face === 'S').length, facings: [...units].sort((a, b) => order[a.face] - order[b.face]).map(u => u.facing),
      footprintArea: round((maxX - minX) * (maxY - minY)), source: 'core-attachment', layout: 'core-cluster', sourceUnitIds: [...new Set(units.map(u => u.unitId).filter(Boolean))],
      reviewStatus: '단위세대 평면 외곽 + 코어 가정 · 채광·피난·구조·설비 미검토',
      core: core.lifts ? { floors: core.floors, lifts: core.lifts, stairKind: core.stairKind, rules: core.rules, width: core.width, depth: core.depth, extLeft: core.extLeft, extRight: core.extRight, sideHalls: core.sideHalls, template: core.template || null } : null,
      geometry: { units: placed, core: { x: round(-minX), y: round(-minY), width: core.width, depth: core.depth, rects: core.rects ? core.rects.map(shiftRect) : null, parts: (core.parts || []).map(p => ({ ...p, rect: shiftRect(p.rect) })) } } };
  }

  // Windows: edges of habitable rooms (and balconies) that lie on the unit outline and are not covered by a neighbouring unit
  // or the core. Direction is the side the edge faces (N/S/E/W, y down = south). Planning reading only, not a daylight check.
  const WINDOW_ROOMS = ['living', 'bedroom', 'kitchen', 'balcony'], WINDOW_MIN = .6;
  const DIR_NAMES = { S: '남', E: '동', W: '서', N: '북' };

  function subtractIntervals(span, cuts) {
    let parts = [span];
    for (const [c0, c1] of cuts) parts = parts.flatMap(([a, b]) => c1 <= a + EPS || c0 >= b - EPS ? [[a, b]] : [[a, Math.min(b, c0)], [Math.max(a, c1), b]].filter(([x, y]) => y - x > EPS));
    return parts;
  }

  function computeWindows(units, coreRects) {
    return units.map((u, ui) => {
      const edges = u.outline.map((p, i) => [p, u.outline[(i + 1) % u.outline.length]]);
      const others = [...units.filter((_, j) => j !== ui).flatMap(v => v.rects), ...(coreRects || [])];
      const out = [];
      for (const room of u.rooms || []) {
        if (!WINDOW_ROOMS.includes(room.category)) continue;
        const [x0, y0, x1, y1] = room.rect;
        const sides = [['N', 'h', y0, x0, x1], ['S', 'h', y1, x0, x1], ['W', 'v', x0, y0, y1], ['E', 'v', x1, y0, y1]];
        for (const [dir, axis, at, lo, hi] of sides) {
          // Parts of this room side that lie on the outline.
          const onOutline = edges.flatMap(([p, q]) => {
            if (axis === 'h' && Math.abs(p[1] - at) < EPS && Math.abs(q[1] - at) < EPS) { const a = Math.max(lo, Math.min(p[0], q[0])), b = Math.min(hi, Math.max(p[0], q[0])); return b - a > EPS ? [[a, b]] : []; }
            if (axis === 'v' && Math.abs(p[0] - at) < EPS && Math.abs(q[0] - at) < EPS) { const a = Math.max(lo, Math.min(p[1], q[1])), b = Math.min(hi, Math.max(p[1], q[1])); return b - a > EPS ? [[a, b]] : []; }
            return [];
          });
          // Neighbours flush against that side block it.
          const cuts = others.flatMap(r => {
            if (axis === 'h' && (dir === 'N' ? Math.abs(r[3] - at) < EPS : Math.abs(r[1] - at) < EPS)) return [[r[0], r[2]]];
            if (axis === 'v' && (dir === 'W' ? Math.abs(r[2] - at) < EPS : Math.abs(r[0] - at) < EPS)) return [[r[1], r[3]]];
            return [];
          });
          for (const span of onOutline) for (const [a, b] of subtractIntervals(span, cuts)) {
            if (b - a < WINDOW_MIN - EPS) continue;
            out.push({ dir, room: room.name, category: room.category, length: round(b - a), a: axis === 'h' ? [round(a), at] : [at, round(a)], b: axis === 'h' ? [round(b), at] : [at, round(b)] });
          }
        }
      }
      return out;
    });
  }

  // Window length per direction over all units, and the direction of each unit's living-room window.
  function windowSummary(windows, units) {
    const total = { S: 0, E: 0, W: 0, N: 0 };
    windows.flat().forEach(w => { total[w.dir] = round(total[w.dir] + w.length); });
    const living = windows.map((ws, i) => {
      const dirs = [...new Set(ws.filter(w => w.category === 'living' || w.category === 'balcony').map(w => w.dir))];
      return { unit: units[i].id, type: units[i].type, dirs };
    });
    return { total, living };
  }

  function attachWindows(t) {
    const g = t.geometry, coreRects = g.core && g.core.parts ? g.core.parts.map(p => p.rect) : [];
    const windows = computeWindows(g.units, coreRects);
    g.units.forEach((u, i) => { u.windows = windows[i]; });
    t.windows = windowSummary(windows, g.units);
    return t;
  }

  function windowLabel(t) {
    if (!t.windows) return '';
    const parts = ['S', 'E', 'W', 'N'].filter(d => t.windows.total[d] > 0).map(d => DIR_NAMES[d] + ' ' + fmt(t.windows.total[d]) + 'm');
    return parts.length ? '창 ' + parts.join(' · ') : '창 없음';
  }

  const PART_FILL = { stair: '#3f6b93', lobby: '#5d86ad', lift: '#2c4f75', shaft: '#8aa6c0', hall: '#c9d8e6', spare: '#dfe6ee' };
  // Parts carry a quarter-turn count (turn 0–3, clockwise on screen). Stairs draw treads across the long axis with an UP arrow
  // on the first flight; lifts draw their door on the side the turn points to (0 south, 1 west, 2 north, 3 east).
  function coreParts(parts) {
    return parts.map(p => {
      const [x0, y0, x1, y1] = p.rect, w = round(x1 - x0), h = round(y1 - y0), cx = round(x0 + w / 2), cy = round(y0 + h / 2), turn = ((p.turn || 0) % 4 + 4) % 4;
      let marks = '';
      if (p.kind === 'stair') {
        const vertical = h >= w, len = vertical ? h : w, n = Math.max(0, Math.floor((len - .6) / .5)), line = (ax, ay, bx, by) => `<line x1="${round(ax)}" y1="${round(ay)}" x2="${round(bx)}" y2="${round(by)}" stroke="#c8dcea" stroke-width=".05"/>`;
        for (let i = 0; i <= n; i++) {
          const t = .3 + i * .5;
          marks += vertical ? line(x0 + .15, y0 + t, cx - .08, y0 + t) + line(cx + .08, y0 + t, x1 - .15, y0 + t) : line(x0 + t, y0 + .15, x0 + t, cy - .08) + line(x0 + t, cy + .08, x0 + t, y1 - .15);
        }
        const up = turn < 2, ax = vertical ? (up ? x0 + w / 4 : x1 - w / 4) : null, ay = vertical ? null : (up ? y0 + h / 4 : y1 - h / 4);
        const [sx, sy, ex, ey] = vertical ? [ax, up ? y1 - .4 : y0 + .4, ax, up ? y0 + .5 : y1 - .5] : [up ? x0 + .4 : x1 - .4, ay, up ? x1 - .5 : x0 + .5, ay];
        const ang = Math.atan2(ey - sy, ex - sx), hd = .35;
        marks += `<path d="M${round(sx)} ${round(sy)}L${round(ex)} ${round(ey)}M${round(ex - hd * Math.cos(ang - .5))} ${round(ey - hd * Math.sin(ang - .5))}L${round(ex)} ${round(ey)}L${round(ex - hd * Math.cos(ang + .5))} ${round(ey - hd * Math.sin(ang + .5))}" fill="none" stroke="#fff" stroke-width=".09"/>`;
      }
      if (p.kind === 'lift') {
        const d = Math.min(w, h) * .5, side = ['S', 'W', 'N', 'E'][turn];
        const door = side === 'S' ? [cx - d / 2, y1 - .08, cx + d / 2, y1 - .08] : side === 'N' ? [cx - d / 2, y0 + .08, cx + d / 2, y0 + .08] : side === 'W' ? [x0 + .08, cy - d / 2, x0 + .08, cy + d / 2] : [x1 - .08, cy - d / 2, x1 - .08, cy + d / 2];
        marks += `<path d="M${x0 + .25} ${y0 + .25}L${x1 - .25} ${y1 - .25}M${x1 - .25} ${y0 + .25}L${x0 + .25} ${y1 - .25}" stroke="#c8dcea" stroke-width=".06"/><line x1="${round(door[0])}" y1="${round(door[1])}" x2="${round(door[2])}" y2="${round(door[3])}" stroke="#f2b45c" stroke-width=".16"/>`;
      }
      const label = p.kind === 'hall' ? p.name : { stair: '계단', lobby: '부속실', lift: 'EV', shaft: 'PS', spare: '' }[p.kind];
      return `<g><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${PART_FILL[p.kind] || '#507ca5'}" stroke="#fff" stroke-width=".06"/>${marks}<text x="${cx}" y="${cy + .22}" text-anchor="middle" font-size="${p.kind === 'hall' ? .55 : .6}" fill="${p.kind === 'hall' ? '#24476b' : '#fff'}" ${p.kind === 'shaft' || (p.kind === 'stair' && h > w * 1.4) ? `transform="rotate(-90 ${cx} ${cy})"` : ''}>${esc(label)}</text></g>`;
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
        <line x1="${u.door[0][0]}" y1="${u.door[0][1]}" x2="${u.door[1][0]}" y2="${u.door[1][1]}" stroke="#e08a2e" stroke-width=".5"/>
        ${(u.windows || []).map(w => `<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="#2aa6d8" stroke-width=".38" stroke-linecap="butt"><title>${esc(w.room)} 창 · ${DIR_NAMES[w.dir]}</title></line>`).join('')}</g>`).join('')}
      ${(c.rects || []).map(r => `<rect x="${r[0]}" y="${r[1]}" width="${round(r[2] - r[0])}" height="${round(r[3] - r[1])}" fill="${PART_FILL.spare}"/>`).join('')}${c.parts && c.parts.length ? coreParts(c.parts) : `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.depth}" fill="#3f6b93" stroke="#fff" stroke-width=".1"/><text x="${c.x + c.width / 2}" y="${c.y + c.depth / 2 + .4}" text-anchor="middle" font-size="1.1" fill="#fff" font-weight="650">코어</text>`}
      ${(c.rects || [[c.x, c.y, c.x + c.width, c.y + c.depth]]).map(r => `<rect x="${r[0]}" y="${r[1]}" width="${round(r[2] - r[0])}" height="${round(r[3] - r[1])}" fill="none" stroke="#24476b" stroke-width=".16"/>`).join('')}
    </svg>`;
  }

  // ── Unit-first assembly: units are snapped wall-to-wall first, then the hall and the core parts are fitted into
  // the gap their entrances face. The core takes whatever shape the gap allows instead of a fixed rectangle.
  const FACINGS = {
    S: { facing: '남향', m: [1, 0, 0, 1] }, W: { facing: '서향', m: [0, -1, 1, 0] },
    E: { facing: '동향', m: [0, 1, -1, 0] }, N: { facing: '북향', m: [-1, 0, 0, -1] }
  };
  // FRONT_CLEAR: planning assumption for daylight in front of each unit (no other unit inside it).
  const LANDING = 1.8, HALL_MIN = 1.8, CONTACT_MIN = 2.0, FRONT_CLEAR = 6;

  function unionArea(rects) {
    const xs = [...new Set(rects.flatMap(r => [r[0], r[2]]))].sort((a, b) => a - b);
    let area = 0;
    for (let i = 0; i + 1 < xs.length; i++) {
      const xm = (xs[i] + xs[i + 1]) / 2, spans = rects.filter(r => r[0] < xm && xm < r[2]).map(r => [r[1], r[3]]).sort((a, b) => a[0] - b[0]);
      let len = 0, lo = null, hi = null;
      for (const [a, b] of spans) { if (hi === null || a > hi) { if (hi !== null) len += hi - lo; lo = a; hi = b; } else hi = Math.max(hi, b); }
      if (hi !== null) len += hi - lo;
      area += (xs[i + 1] - xs[i]) * len;
    }
    return round(area);
  }
  const contactLength = (a, b) => {
    const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    if ((Math.abs(a[2] - b[0]) < EPS || Math.abs(b[2] - a[0]) < EPS) && oy > EPS) return oy;
    if ((Math.abs(a[3] - b[1]) < EPS || Math.abs(b[3] - a[1]) < EPS) && ox > EPS) return ox;
    return 0;
  };
  const boxOf = rects => [Math.min(...rects.map(r => r[0])), Math.min(...rects.map(r => r[1])), Math.max(...rects.map(r => r[2])), Math.max(...rects.map(r => r[3]))];

  // One unit turned to a facing (front towards S/W/E/N) and optionally mirrored, in a frame whose box starts at 0,0.
  function orientUnit(profile, facing, mirrored) {
    const p = mirrored ? mirrorProfile(profile) : profile, [a, b, c, d] = FACINGS[facing].m;
    const raw = ([x, y]) => [a * x + b * y, c * x + d * y];
    const pts = p.outline.map(raw), x0 = Math.min(...pts.map(q => q[0])), y0 = Math.min(...pts.map(q => q[1]));
    const tf = q => { const [x, y] = raw(q); return [round(x - x0), round(y - y0)]; };
    const tr = r => rectOf([tf([r[0], r[1]]), tf([r[2], r[3]])]);
    const [nx, ny] = raw([0, -1]);
    return { type: p.type, unitId: p.id, facing: FACINGS[facing].facing, face: facing, mirrored: Boolean(mirrored),
      outline: p.outline.map(tf), rects: p.rects.map(tr), rooms: p.rooms.map(r => ({ name: r.name, category: r.category, rect: tr(r.rect) })),
      door: { a: tf([p.door.x - DOOR / 2, p.door.y]), b: tf([p.door.x + DOOR / 2, p.door.y]), nx, ny }, centre: tf([p.width / 2, (p.door.y + p.depth) / 2]),
      front: tr([0, p.depth, p.width, p.depth + FRONT_CLEAR]) };
  }

  function moveUnit(u, dx, dy) {
    const mv = ([x, y]) => [round(x + dx), round(y + dy)], mr = r => [round(r[0] + dx), round(r[1] + dy), round(r[2] + dx), round(r[3] + dy)];
    return { ...u, outline: u.outline.map(mv), rects: u.rects.map(mr), rooms: u.rooms.map(r => ({ ...r, rect: mr(r.rect) })),
      door: { ...u.door, a: mv(u.door.a), b: mv(u.door.b) }, centre: mv(u.centre), front: mr(u.front) };
  }
  const doorMid = u => [(u.door.a[0] + u.door.b[0]) / 2, (u.door.a[1] + u.door.b[1]) / 2];
  // The strip just outside an entrance that must stay clear for the hall.
  const landing = u => rectOf([u.door.a, u.door.b, [u.door.a[0] + u.door.nx * LANDING, u.door.a[1] + u.door.ny * LANDING], [u.door.b[0] + u.door.nx * LANDING, u.door.b[1] + u.door.ny * LANDING]]);

  // Translations that put a new unit wall-to-wall with a placed one (edges flush, ends aligned).
  function snapOffsets(placed, piece) {
    const out = new Map();
    for (const a of placed.rects) for (const b of piece.rects) {
      const ys = [a[1] - b[1], a[3] - b[3]], xs = [a[0] - b[0], a[2] - b[2]];
      for (const dy of ys) { out.set((a[2] - b[0]) + ',' + dy, [a[2] - b[0], dy]); out.set((a[0] - b[2]) + ',' + dy, [a[0] - b[2], dy]); }
      for (const dx of xs) { out.set(dx + ',' + (a[3] - b[1]), [dx, a[3] - b[1]]); out.set(dx + ',' + (a[1] - b[3]), [dx, a[1] - b[3]]); }
    }
    return [...out.values()].map(([dx, dy]) => [round(dx), round(dy)]);
  }

  function clusterKey(units) {
    const box = boxOf(units.flatMap(u => u.rects));
    return units.map(u => u.type + u.face + (u.mirrored ? 'm' : '') + '@' + round(u.rects[0][0] - box[0]) + ',' + round(u.rects[0][1] - box[1])).sort().join('|');
  }

  // Grows clusters unit by unit. Each new unit snaps wall-to-wall onto a placed unit or onto the core fitted so far, then the
  // hall and core parts are refitted; only clusters whose core still fits survive, smallest common area first.
  function unitClusters(profiles, options, fit, reject) {
    const counts = options.counts, maxN = Math.max(...counts), spread = Number(options.doorSpread) > 0 ? Number(options.doorSpread) : 14;
    const beam = Number(options.beam) || 60, tryCap = Number(options.tryCap) || 2500;
    const faces = allowedFaces(options);
    const pieces = profiles.flatMap(p => faces.flatMap(f => [false, true].map(m => orientUnit(p, f, m))));
    const results = [];
    let layer = profiles.flatMap(p => [false, true].map(m => ({ units: [orientUnit(p, 'S', m)], hall: [], parts: [] })));
    for (let n = 2; n <= maxN; n++) {
      const next = new Map();
      for (const item of layer) {
        const cluster = item.units, coreRects = [...item.hall, ...item.parts.map(p => p.rect)];
        const hosts = [...cluster, ...coreRects.map(r => ({ rects: [r] }))];
        for (const piece of pieces) for (const host of hosts) for (const [dx, dy] of snapOffsets(host, piece)) {
          const u = moveUnit(piece, dx, dy), m = doorMid(u);
          if (cluster.some(v => { const q = doorMid(v); return Math.abs(q[0] - m[0]) > spread || Math.abs(q[1] - m[1]) > spread; })) continue;
          if (cluster.some(v => v.rects.some(r => u.rects.some(s => overlaps(r, s))))) continue;
          if (item.hall.some(h => u.rects.some(s => overlaps(h, s)))) continue;
          if (cluster.some(v => v.rects.some(r => overlaps(r, u.front)) || u.rects.some(r => overlaps(r, v.front)))) continue;
          const touch = [...cluster.flatMap(v => v.rects), ...coreRects].reduce((s, r) => s + u.rects.reduce((w, q) => w + contactLength(r, q), 0), 0);
          if (touch < CONTACT_MIN) continue;
          const all = [...cluster, u], lands = all.map(landing);
          if (lands.some(l => all.some(v => v.rects.some(r => overlaps(l, r))))) continue;
          const key = clusterKey(all);
          if (!next.has(key)) { const ds = all.map(doorMid), xs = ds.map(d => d[0]), ys = ds.map(d => d[1]); next.set(key, { units: all, pre: (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys)) }); }
        }
      }
      const fitted = [];
      for (const cand of [...next.values()].sort((a, b) => a.pre - b.pre).slice(0, tryCap)) {
        const f = fit(cand.units);
        if (!f.ok) { reject(f.reason); continue; }
        const box = boxOf([...cand.units.flatMap(u => u.rects), ...f.hall, ...f.parts.map(p => p.rect)]);
        fitted.push({ units: cand.units, hall: f.hall, parts: f.parts, score: unionArea([...f.hall, ...f.parts.map(p => p.rect)]) + .01 * (box[2] - box[0]) * (box[3] - box[1]) });
      }
      fitted.sort((a, b) => a.score - b.score);
      if (counts.includes(n)) results.push(...fitted.slice(0, beam * 3));
      layer = fitted.slice(0, beam);
    }
    return results;
  }

  // Hall: a 1.8 m corridor network that links the entrance landings, grown nearest-first (Prim). Each landing joins the
  // network by the straight or L-shaped strip that adds the least area; strips must stay clear of every unit.
  function fitHall(units) {
    const half = HALL_MIN / 2, clear = r => !units.some(u => u.rects.some(q => overlaps(r, q)));
    const lands = units.map(landing), starts = units.map(u => { const [mx, my] = doorMid(u); return [round(mx + u.door.nx * half), round(my + u.door.ny * half)]; });
    const strip = (p, q) => Math.abs(p[1] - q[1]) < EPS
      ? [Math.min(p[0], q[0]) - half, p[1] - half, Math.max(p[0], q[0]) + half, p[1] + half].map(round)
      : [p[0] - half, Math.min(p[1], q[1]) - half, p[0] + half, Math.max(p[1], q[1]) + half].map(round);
    // Point of a hall rect nearest to p, kept a half-width inside so the joining strip stays within the corridor.
    const target = (p, r) => [0, 1].map(k => { const lo = r[k] + half, hi = r[k + 2] - half; return round(lo > hi ? (r[k] + r[k + 2]) / 2 : Math.min(Math.max(p[k], lo), hi)); });
    const routes = (p, q) => Math.abs(p[0] - q[0]) < EPS || Math.abs(p[1] - q[1]) < EPS ? [[strip(p, q)]] : [[strip(p, [q[0], p[1]]), strip([q[0], p[1]], q)], [strip(p, [p[0], q[1]]), strip([p[0], q[1]], q)]];
    const cx = starts.reduce((s, p) => s + p[0], 0) / starts.length, cy = starts.reduce((s, p) => s + p[1], 0) / starts.length;
    const first = starts.map((p, i) => [Math.hypot(p[0] - cx, p[1] - cy), i]).sort((a, b) => a[0] - b[0])[0][1];
    // The first landing seeds the network as a full-width square in front of its door.
    let hall = [lands[first], strip(starts[first], starts[first])];
    if (!clear(hall[hall.length - 1])) return null;
    const left = new Set(starts.map((_, i) => i).filter(i => i !== first));
    while (left.size) {
      let best = null;
      const base = unionArea(hall);
      for (const i of left) for (const r of hall) for (const route of routes(starts[i], target(starts[i], r))) {
        if (!route.every(clear)) continue;
        const add = unionArea([...hall, ...route]) - base;
        if (!best || add < best.add - EPS) best = { i, route, add };
      }
      if (!best) return null;
      hall = [...hall, lands[best.i], ...best.route];
      left.delete(best.i);
    }
    // Drop rects already covered by others so the drawing stays clean.
    return hall.filter((r, i) => !hall.some((q, j) => j !== i && q[0] <= r[0] + EPS && q[1] <= r[1] + EPS && q[2] >= r[2] - EPS && q[3] >= r[3] - EPS && (unionArea([q]) > unionArea([r]) + EPS || j < i)));
  }

  // Places stair, lifts and shaft one by one against the hall (stair and lifts need a 1 m hall contact for their doors),
  // keeping the arrangements with the smallest core extent.
  function fitCoreParts(units, hall, spec, dims) {
    const [lw, ld] = spec.lifts.count ? dims.lifts[spec.lifts.capacity] : [0, 0];
    const stairLen = dims.stairLength + (spec.stairKind === 'special' ? dims.lobbyLength : 0);
    const pieces = [{ kind: 'stair', name: spec.stairKind === 'special' ? '특별피난계단·부속실' : '계단실', w: dims.stairWidth, h: stairLen, door: true },
      ...Array.from({ length: spec.lifts.count }, (_, i) => ({ kind: 'lift', name: (spec.lifts.emergency && i === 0 ? '비상용 겸용 ' : '') + '승강기 ' + spec.lifts.capacity + '인승', w: lw, h: ld, door: true })),
      { kind: 'shaft', name: 'EPS·TPS·PS', w: dims.shaftWidth, h: 2.4, door: false }];
    const blocked = units.flatMap(u => u.rects), hull = boxOf(blocked);
    const outside = r => (r[2] - r[0]) * (r[3] - r[1]) - Math.max(0, Math.min(r[2], hull[2]) - Math.max(r[0], hull[0])) * Math.max(0, Math.min(r[3], hull[3]) - Math.max(r[1], hull[1]));
    let states = [{ parts: [], score: 0 }];
    for (const piece of pieces) {
      const next = [];
      for (const st of states) {
        const taken = [...hall, ...st.parts.map(p => p.rect)], anchors = piece.door ? hall : taken;
        for (const [w, h] of [[piece.w, piece.h], [piece.h, piece.w]]) for (const a of anchors) {
          const cands = [[a[2], a[1]], [a[2], a[3] - h], [a[0] - w, a[1]], [a[0] - w, a[3] - h], [a[0], a[3]], [a[2] - w, a[3]], [a[0], a[1] - h], [a[2] - w, a[1] - h]];
          for (const [x, y] of cands) {
            const r = [x, y, x + w, y + h].map(round);
            if (blocked.some(q => overlaps(r, q)) || taken.some(q => overlaps(r, q))) continue;
            const touch = (piece.door ? hall : taken).reduce((s, q) => s + contactLength(r, q), 0);
            if (touch < (piece.door ? DOOR : .5) - EPS) continue;
            const parts = [...st.parts, { kind: piece.kind, name: piece.name, rect: r }], box = boxOf([...hall, ...parts.map(p => p.rect)]);
            // Compact cores that fill the gap: inside the units' outline, against unit walls, lifts banked together.
            const hug = parts.reduce((s, p) => s + blocked.reduce((t, q) => t + contactLength(p.rect, q), 0), 0);
            const out = parts.reduce((s, p) => s + outside(p.rect), 0) + hall.reduce((s, h) => s + outside(h), 0);
            const lifts = parts.filter(p => p.kind === 'lift'), bank = lifts.reduce((s, p, i) => s + lifts.slice(i + 1).reduce((t, q) => t + contactLength(p.rect, q.rect), 0), 0);
            next.push({ parts, score: (box[2] - box[0]) * (box[3] - box[1]) + 3 * out - hug - 2 * bank });
          }
        }
      }
      if (!next.length) return null;
      states = next.sort((a, b) => a.score - b.score).filter((s, i, arr) => i === 0 || JSON.stringify(s.parts) !== JSON.stringify(arr[i - 1].parts)).slice(0, 6);
    }
    return states[0].parts;
  }

  function assembleUnitsFirst(plans, options) {
    options = options || {};
    const types = (options.types || TYPES).map(Number);
    const profiles = (plans || []).map(p => p.outline && p.door && p.rects ? p : profileFromPlan(p)).filter(p => types.includes(p.type));
    const counts = [...new Set((options.counts || [2, 3, 4]).map(Number))].filter(n => n >= 2 && n <= 4);
    if (!profiles.length || !counts.length) return { combos: [], cores: {}, rejected: {}, profiles };
    const dims = { ...CORE_DIMENSIONS, ...(options.dims || {}) }, floors = Math.max(1, Math.round(Number(options.floors) || 25));
    const rejected = {}, reject = r => { rejected[r] = (rejected[r] || 0) + 1; }, combos = [], seen = new Set(), cores = {};
    const coreFor = n => cores[n] || (cores[n] = buildCore({ floors, unitsPerFloor: n, dims }));
    const fit = units => {
      const core = coreFor(units.length), hall = fitHall(units);
      if (!hall) return { ok: false, reason: '현관 사이 홀이 세대와 겹침' };
      const parts = fitCoreParts(units, hall, { lifts: core.lifts, stairKind: core.stairKind }, dims);
      return parts ? { ok: true, hall, parts } : { ok: false, reason: '계단·승강기를 끼울 빈틈 없음' };
    };
    for (const { units, hall, parts } of unitClusters(profiles, { ...options, counts }, fit, reject)) {
      const c = attachWindows(unitsFirstTypology(units, hall, parts, coreFor(units.length)));
      if (seen.has(c.topology)) { reject('같은 구성의 미세 위치 차이'); continue; }
      seen.add(c.topology);
      combos.push(c);
    }
    combos.sort((a, b) => b.unitsPerFloor - a.unitsPerFloor || b.southCount - a.southCount || a.commonArea - b.commonArea || a.footprintArea - b.footprintArea || a.id.localeCompare(b.id));
    return { combos, cores, rejected, profiles, placements: 0 };
  }

  function unitsFirstTypology(units, hall, parts, core) {
    const coreRects = [...hall, ...parts.map(p => p.rect)], all = [...units.flatMap(u => u.rects), ...coreRects], box = boxOf(all);
    const sx = v => round(v - box[0]), sy = v => round(v - box[1]), sp = ([x, y]) => [sx(x), sy(y)], sr = r => [sx(r[0]), sy(r[1]), sx(r[2]), sy(r[3])];
    const placed = units.map((u, i) => ({ id: 'u' + i, type: u.type, unitId: u.unitId, name: u.type + '형', facing: u.facing, face: u.face, mirrored: u.mirrored,
      outline: u.outline.map(sp), rects: u.rects.map(sr), rooms: u.rooms.map(r => ({ ...r, rect: sr(r.rect) })), door: [sp(u.door.a), sp(u.door.b)], centre: sp(u.centre) }));
    const mix = TYPES.map(t => ({ type: t, count: units.filter(u => u.type === t).length })).filter(m => m.count), n = units.length;
    const total = units.reduce((s, u) => s + u.type, 0), common = unionArea(coreRects), cbox = boxOf(coreRects), order = { S: 0, E: 1, W: 2, N: 3 };
    const topology = units.map(u => u.type + u.face + (u.mirrored ? 'm' : '')).sort().join('_') + '#' + coreRects.length + '#' + Math.round(common);
    const partsOut = [...hall.map(r => ({ kind: 'hall', name: '홀·복도', rect: sr(r) })), ...parts.map(p => ({ ...p, rect: sr(p.rect) }))];
    return { id: 'fit-' + clusterKey(units).replace(/[^0-9A-Za-z@,|.-]/g, '') + '-f' + core.floors, name: n + '세대 · ' + mix.map(m => m.type + '×' + m.count).join(' + '),
      width: round(box[2] - box[0]), depth: round(box[3] - box[1]), unitsPerFloor: n, unitArea: round(total / n), totalUnitArea: total, nominalArea: total,
      coreArea: common, coreOnlyArea: common, commonArea: common, coreCount: 1, coreCapacity: n, unitMix: mix, topology,
      southCount: units.filter(u => u.face === 'S').length, facings: [...units].sort((a, b) => order[a.face] - order[b.face]).map(u => u.facing),
      footprintArea: round((box[2] - box[0]) * (box[3] - box[1])), source: 'units-first', layout: 'units-first', sourceUnitIds: [...new Set(units.map(u => u.unitId).filter(Boolean))],
      reviewStatus: '세대 먼저 맞붙인 뒤 빈틈에 코어 배치 · 채광·피난·구조·설비 미검토',
      core: { floors: core.floors, lifts: core.lifts, stairKind: core.stairKind, rules: core.rules, width: round(cbox[2] - cbox[0]), depth: round(cbox[3] - cbox[1]), extLeft: 0, extRight: 0, sideHalls: 'none', template: null, fitted: true },
      geometry: { units: placed, core: { x: sx(cbox[0]), y: sy(cbox[1]), width: round(cbox[2] - cbox[0]), depth: round(cbox[3] - cbox[1]), rects: coreRects.map(sr), parts: partsOut } } };
  }

  function ensureUnits(project) {
    if (!Array.isArray(project.units)) project.units = [];
    for (const type of TYPES) if (!project.units.some(u => Number(u.type) === type)) project.units.push(createUnit(type));
    project.units.forEach((unit, i) => {
      // Untouched first-edition templates are replaced by the reference-traced layout; edited ones are kept.
      if (!unit.layoutVersion && LEGACY_FINGERPRINTS[unit.type] === fingerprint(unit)) project.units[i] = Object.assign(createUnit(unit.type), { id: unit.id });
      else normalizeUnit(unit);
    });
    if (!Array.isArray(project.typologies)) project.typologies = [];
  }

  function injectStyles(doc) {
    if (doc.getElementById('planner-units-style')) return;
    const style = doc.createElement('style'); style.id = 'planner-units-style';
    style.textContent = `
      .pu-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:20px;align-items:start}.pu-main,.pu-inspector{min-width:0}.pu-tabs{display:flex;gap:8px;margin:0 0 18px}.pu-tabs button{border:1px solid #dce5ed;background:#fff;border-radius:10px;padding:12px 24px;color:#506377;font-weight:750;cursor:pointer}.pu-tabs button.active{background:#143e6a;color:white;border-color:#143e6a}.pu-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}.pu-toolbar h3{margin:0;font-size:18px}.pu-hint{color:#708396;font-size:12px;line-height:1.65}.pu-canvas-wrap{border:1px solid #d9e3ec;border-radius:12px;background:#f8fbfd;overflow:hidden}.pu-canvas{display:block;width:100%;min-height:330px;max-height:610px;touch-action:none;user-select:none}.pu-room{cursor:grab;outline:none}.pu-room:focus rect{stroke:#1262cb;stroke-width:.07}.pu-room.pu-locked{cursor:pointer}.pu-room text{pointer-events:none}.pu-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;font-size:11px;color:#64788a}.pu-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.pu-statrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.pu-stat{border:1px solid #dce6ee;border-radius:10px;background:white;padding:12px}.pu-stat b{display:block;font-size:20px;color:#163f69;margin-top:7px}.pu-stat span{font-size:11px;color:#6f8295}.pu-inspector h3{font-size:16px;margin:0 0 16px}.pu-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pu-inputs label,.pu-combo-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#64788a}.pu-inputs input,.pu-combo-fields select{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;background:white;color:#233f59;font:inherit}.pu-inputs input:disabled{background:#f0f3f6;color:#8b99a7}.pu-check{font-size:12px;display:flex;align-items:center;gap:7px;margin:14px 0}.pu-check input{accent-color:#1f62b4}.pu-roomlist{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}.pu-roomlist td,.pu-roomlist th{padding:8px 3px;border-bottom:1px solid #e7edf2;text-align:left}.pu-roomlist th{font-weight:500;color:#8695a4}.pu-roomlist td:last-child,.pu-roomlist th:last-child{text-align:right}.pu-roomlist button{border:0;background:transparent;padding:0;color:#354e65;cursor:pointer;font:inherit;text-align:left}.pu-roomlist tr.selected{background:#eef5fd}.pu-warning{background:#fff4e7;color:#915d18;border:1px solid #f2d7ad;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6;margin-top:12px}.pu-pass{background:#eef8f5;color:#36765e;border:1px solid #d3eadd;border-radius:8px;padding:10px 12px;font-size:12px;margin-top:12px}.pu-note{font-size:12px;line-height:1.75;color:#748596;margin:12px 0}.pu-reference{margin-top:18px;border-top:1px solid #e2e9f0;padding-top:16px}.pu-reference summary{cursor:pointer;font-size:13px;font-weight:650;color:#34516d}.pu-reference img{display:block;max-width:100%;max-height:460px;object-fit:contain;margin:16px auto;background:white}.pu-reference p{font-size:12px;line-height:1.7;color:#718497}.pu-combo-fields{display:flex;gap:18px;align-items:end;flex-wrap:wrap;margin-bottom:18px}.pu-combo-fields select{min-width:130px}.pu-mix{display:flex;gap:8px;align-items:center}.pu-mix label{display:flex;flex-direction:row;align-items:center;border:1px solid #d9e3ec;border-radius:8px;padding:10px;cursor:pointer;color:#325777;font-size:13px}.pu-mix input{accent-color:#2266aa}.pu-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.pu-combo-card{border:1px solid #dbe4ed;background:#fff;border-radius:13px;padding:17px;min-width:0}.pu-combo-card h3{font-size:16px;margin:14px 0 8px}.pu-combo-card svg{width:100%;height:180px;background:#f6f9fc;border-radius:8px}.pu-combo-meta{font-size:12px;color:#73869a;line-height:1.8}.pu-combo-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0}.pu-combo-metrics div{background:#f5f8fb;border-radius:7px;padding:9px}.pu-combo-metrics span{font-size:10px;color:#7e90a2;display:block}.pu-combo-metrics b{font-size:14px;color:#2c5071}.pu-combo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pu-empty{padding:30px;color:#74869a;text-align:center;border:1px dashed #cad7e2;border-radius:10px}.pu-saved{margin-top:24px}.pu-saved-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:12px;border-bottom:1px solid #e2e9f0}.pu-saved-row strong{font-size:13px}.pu-saved-row small{display:block;margin-top:5px;color:#7b8da0}.pu-footnote{font-size:12px;color:#8090a0;line-height:1.7;margin:15px 0}.pu-active-room{display:flex;align-items:center;gap:8px;margin-bottom:14px}.pu-active-room i{width:12px;height:12px;border-radius:4px}.pu-active-room strong{font-size:15px;color:#24496c}.pu-area{font-size:24px;color:#1e5686;margin:14px 0}.pu-area small{font-size:12px;color:#7a8d9f}.pu-status{min-height:20px;font-size:12px;color:#347658;margin-top:10px}.pu-cc-group{margin:22px 0}.pu-ed-import{margin-top:14px;border-top:1px solid #e2e9f0;padding-top:12px}.pu-ed-import textarea{width:100%;box-sizing:border-box;height:140px;margin-top:8px;font:11px/1.45 ui-monospace,Consolas,monospace;border:1px solid #d8e2eb;border-radius:8px;padding:8px}.pu-json textarea{width:100%;box-sizing:border-box;height:220px;margin-top:10px;font:12px/1.5 ui-monospace,Consolas,monospace;border:1px solid #d8e2eb;border-radius:8px;padding:10px;color:#24425f;background:#fbfdfe}.pu-ed{display:grid;grid-template-columns:230px minmax(0,1fr) 290px;gap:16px;align-items:start}.pu-ed-list h3,.pu-ed-side h3{font-size:15px;margin:0 0 12px}.pu-ed-row{display:block;width:100%;text-align:left;border:1px solid #dce5ed;background:#fff;border-radius:9px;padding:10px;margin-bottom:8px;cursor:pointer;font:inherit;color:#2c4964}.pu-ed-row small{display:block;color:#7b8da0;margin-top:4px;font-size:11px}.pu-ed-row.active{border-color:#1f62b4;background:#eef5fd}.pu-ed-row:disabled{opacity:.5;cursor:default}.pu-ed-wrap{border:1px solid #d9e3ec;border-radius:12px;background:#fbfdfe;outline:none}.pu-ed-wrap:focus{border-color:#1f62b4}.pu-ed-canvas{display:block;width:100%;height:560px;touch-action:none;user-select:none}.pu-ed-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 6px}.pu-ed-tools .section-label{margin:0 4px 0 0}.pu-ed-wrap.drawing .pu-ed-canvas,.pu-ed-wrap.drawing .pu-ed-item{cursor:crosshair}[data-handle=del]{cursor:pointer}.pu-ed-item{cursor:grab}.pu-ed-wall{stroke:transparent;stroke-linecap:butt}.pu-ed-wall.h{cursor:ns-resize}.pu-ed-wall.v{cursor:ew-resize}.pu-ed-wall:hover,.pu-ed-wall.active{stroke:rgba(18,98,203,.28)}.pu-ed-open{stroke:transparent;cursor:move}.pu-ed-open:hover{stroke:rgba(224,138,46,.25)}.pu-ed-guide{stroke:#d6337a;stroke-width:1.2px;stroke-dasharray:6 4;vector-effect:non-scaling-stroke;pointer-events:none}.pu-ed-snap{display:flex;align-items:center;gap:6px;margin-left:auto;font-size:12px;color:#5a6f83}[data-handle=nw],[data-handle=se]{cursor:nwse-resize}[data-handle=ne],[data-handle=sw]{cursor:nesw-resize}[data-handle=n],[data-handle=s]{cursor:ns-resize}[data-handle=e],[data-handle=w]{cursor:ew-resize}[data-handle=rot]{cursor:grab}.pu-ed-item.selected{cursor:grabbing}@media(max-width:1100px){.pu-ed{grid-template-columns:1fr}.pu-ed-canvas{height:420px}}.pu-rules{margin:0 0 14px;background:#fff;border:1px solid #dce5ed;border-radius:10px}.pu-rules td{padding:8px 12px;vertical-align:top}.pu-rules td:last-child{text-align:left;color:#7a8d9f;font-size:11px}.pu-cc-card svg{height:220px}.pu-num{width:110px;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;font:inherit;color:#233f59}.pu-reference table{margin:10px 0}.pu-ref{margin-bottom:22px}.pu-ref-body{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:20px;align-items:start}.pu-ref-drawing svg{width:100%;height:auto;max-height:520px;background:#f8fbfd;border:1px solid #dce5ed;border-radius:10px}.pu-ref-side .pu-roomlist td:nth-child(n+2),.pu-ref-side .pu-roomlist th:nth-child(n+2){text-align:right;font-variant-numeric:tabular-nums}.pu-checks{list-style:none;padding:0;margin:14px 0;font-size:12px;line-height:1.9}.pu-ok{color:#2f7a58}.pu-ng{color:#b4472f;font-weight:650}.pu-section-title{font-size:16px;margin:4px 0 14px}.pu-section-title small{font-size:12px;font-weight:500;color:#8a6a3a;margin-left:8px}
      @media(max-width:1100px){.pu-layout{grid-template-columns:1fr}.pu-inspector{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pu-combo-grid{grid-template-columns:1fr 1fr}.pu-canvas{min-height:300px}}@media(max-width:700px){.pu-combo-grid,.pu-inspector,.pu-ref-body{grid-template-columns:1fr}.pu-statrow{gap:6px}.pu-stat{padding:8px}.pu-stat b{font-size:17px}.pu-tabs button{padding:10px 18px}.pu-canvas{min-height:220px}.pu-combo-fields{align-items:stretch;gap:12px}}
    `;
    doc.head.appendChild(style);
  }

  function injectUnitEditorStyles(doc) {
    if (doc.getElementById('planner-units-editor-style')) return;
    const style = doc.createElement('style'); style.id = 'planner-units-editor-style';
    style.textContent = `
      .pu-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.pu-spacer{flex:1}.pu-seg{display:inline-flex;border:1px solid #d6e0ea;border-radius:9px;overflow:hidden;background:#fff}.pu-seg button{border:0;background:transparent;padding:9px 14px;font:inherit;font-size:13px;font-weight:700;color:#506377;cursor:pointer}.pu-seg button.active{background:#143e6a;color:#fff}
      .pu-options{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#5f7386;margin:0 0 8px}.pu-options label{display:flex;gap:6px;align-items:center;cursor:pointer}.pu-options input{accent-color:#1f62b4}
      .pu-outline-mode .pu-room{pointer-events:none;opacity:.6}.pu-edge{cursor:grab}.pu-vertex{cursor:move}.pu-edge:focus,.pu-vertex:focus{outline:none}
      [data-resize=left],[data-resize=right]{cursor:ew-resize}[data-resize=top],[data-resize=bottom]{cursor:ns-resize}[data-resize="left top"],[data-resize="right bottom"]{cursor:nwse-resize}[data-resize="right top"],[data-resize="left bottom"]{cursor:nesw-resize}
      .pu-statrow.pu-four{grid-template-columns:repeat(4,1fr)}.pu-inputs input[type=text],.pu-inputs select{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;background:#fff;color:#233f59;font:inherit}.pu-wide{grid-column:1 / -1}
      .pu-coords{width:100%;box-sizing:border-box;min-height:150px;border:1px solid #d8e2eb;border-radius:7px;padding:9px;font:12px/1.5 ui-monospace,Consolas,monospace;color:#233f59;resize:vertical}
      .pu-row-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pu-danger{color:#a5462b!important}
      .pu-layers-panel h3{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.pu-layers-panel h3 small{font-size:11px;font-weight:500;color:#8193a5}
      .pu-layers{list-style:none;margin:0;padding:0;max-height:420px;overflow-y:auto}.pu-layer{display:grid;grid-template-columns:14px 10px minmax(0,1fr) auto auto;align-items:center;gap:7px;padding:6px 4px;border-bottom:1px solid #e9eef3;font-size:12px;background:#fff;border-top:2px solid transparent}
      .pu-layer.selected{background:#eef5fd}.pu-layer.dragging{opacity:.45}.pu-layer.drop-above{border-top-color:#2569ad}.pu-layer.drop-below{border-bottom:2px solid #2569ad}.pu-layer.hidden-layer .pu-layer-name{color:#b0703a;text-decoration:line-through}
      .pu-grip{cursor:grab;color:#a5b4c2;font-size:11px;letter-spacing:-2px;user-select:none}.pu-layer i{width:10px;height:10px;border-radius:3px}
      .pu-layer-name{border:0;background:transparent;padding:0;text-align:left;color:#2c4964;font:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pu-layer-area{color:#3c5873;font-variant-numeric:tabular-nums;text-align:right}.pu-layer-area small{color:#99a9b8;margin-left:2px}
      .pu-layer-move{display:flex;gap:2px}.pu-layer-move button{border:1px solid #d9e3ec;background:#fff;border-radius:5px;width:22px;height:22px;padding:0;font-size:9px;color:#4c6780;cursor:pointer}.pu-layer-move button:disabled{opacity:.3;cursor:default}
      .pu-layer-total{display:flex;justify-content:space-between;font-size:12px;color:#5f7386;padding:10px 4px 0}.pu-layer-total b{color:#1e5686}
      .pu-tabs{flex-wrap:wrap}.pu-tabs .pu-tab-new{border-style:dashed;color:#2d6aa6;background:#f7fbff}.pu-tabs button small{font-weight:500;opacity:.75}
      .pu-newplan{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:-6px 0 16px;padding:12px;border:1px dashed #b9cde0;border-radius:10px;background:#f7fbff}.pu-newplan label{display:flex;flex-direction:column;gap:5px;font-size:12px;color:#64788a}.pu-newplan input,.pu-newplan select{border:1px solid #d8e2eb;border-radius:7px;padding:8px;font:inherit;color:#233f59;background:#fff;width:110px}.pu-newplan input[data-np-name]{width:170px}
      .pu-title-edit{display:flex;align-items:center;gap:10px}.pu-title-input{font:inherit;font-size:18px;font-weight:700;color:#173e66;border:1px solid transparent;border-radius:7px;padding:4px 6px;background:transparent;min-width:200px}.pu-title-input:hover,.pu-title-input:focus{border-color:#d0dce7;background:#fff}
      .pu-seg .pu-seg-mark.active{background:#c93a3f}.pu-markup-mode{cursor:crosshair}.pu-markup-mode .pu-room{pointer-events:none}.pu-mark{cursor:pointer}.pu-mark:focus{outline:none}
      .pu-marklist{list-style:none;margin:0;padding:0}.pu-marklist li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;padding:9px 4px;border-bottom:1px solid #eef2f6;font-size:12px}.pu-marklist li.selected{background:#fff3f3}.pu-marklist b{display:grid;place-items:center;width:20px;height:20px;border-radius:5px;background:#e5484d;color:#fff;font-size:11px}.pu-marklist small{display:block;color:#7d8fa1;margin-top:2px}.pu-mark-actions{grid-column:2;display:flex;gap:10px}
      .pu-chat-marks{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px}.pu-chat-marks:empty{display:none}.pu-chat-marks span{font-size:10.5px;color:#8d9cab}.pu-chip{border:1px solid #f0b4b6;background:#fff4f4;color:#b8343a;border-radius:20px;padding:3px 10px;font:inherit;font-size:11.5px;font-weight:650;cursor:pointer}
      .pu-chat h3{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.pu-chat h3 small{font-size:11px;font-weight:500;color:#8193a5}
      .pu-chat-log{max-height:340px;min-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:2px 2px 10px;margin-bottom:10px;border-bottom:1px solid #e5ecf2}
      .pu-msg{max-width:92%;border-radius:11px;padding:8px 11px;font-size:12px;line-height:1.6;word-break:break-word}.pu-msg small{display:block;color:#8597a8;font-size:10.5px;margin-top:3px}
      .pu-msg.me{align-self:flex-end;background:#143e6a;color:#fff;border-bottom-right-radius:3px}.pu-msg.me small{color:#b9cbe0}
      .pu-msg.claude{align-self:flex-start;background:#f2f6fa;color:#24425e;border:1px solid #dfe8f0;border-bottom-left-radius:3px}.pu-msg.claude.bad{background:#fff4e7;border-color:#f2d7ad;color:#82531a}
      .pu-msg.system{align-self:center;background:transparent;color:#7d8fa1;font-size:11px;text-align:center;padding:2px 6px}
      .btn.pu-armed{background:#fbe9e9;border-color:#e6a1a3;color:#a8323a}
      .pu-manual-copy{display:block;width:100%;box-sizing:border-box;margin-top:6px;border:0;border-radius:6px;padding:6px;font:11px/1.4 ui-monospace,Consolas,monospace;color:#1d3550;background:#e9f1fb;resize:vertical;min-height:54px}
      .pu-msg.me .btn{display:block;background:#fff;color:#143e6a;border-color:#fff}.pu-msg .btn{margin-top:8px;padding:6px 12px;font-size:12px}.pu-msg b{font-weight:700}
      .pu-chat textarea{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:9px;padding:9px 10px;font:13px/1.5 inherit;color:#233f59;resize:vertical;min-height:64px}
      .pu-chat-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap}.pu-chat-actions .text-btn{font-size:11.5px}.pu-chat-mode{font-size:11px;color:#7d8fa1}
      @media(max-width:700px){.pu-statrow.pu-four{grid-template-columns:1fr 1fr}.pu-spacer{display:none}}
    `;
    doc.head.appendChild(style);
  }

  const CHAT = { log: [], draft: '' };
  const isReply = text => /apartment-planner-unit-patch\/1/.test(text);
  // Red markup rectangles per plan id. They are request context only, so they are not saved in the project.
  const MARKS = {};
  const marksOf = id => MARKS[id] || (MARKS[id] = []);
  const MARK_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // The single-file package for chat apps leaves out the reference PNGs (about 1.4 MB) and sets this flag.
  const assetsAvailable = () => !(typeof window !== 'undefined' && window.PLANBY_NO_ASSETS);
  // Claude artifacts block page-started downloads; the artifact build sets this flag.
  const downloadsBlocked = () => typeof window !== 'undefined' && Boolean(window.PLANBY_NO_DOWNLOAD);

  function mountUnits(container, project, onChange) {
    ensureUnits(project); injectStyles(container.ownerDocument); injectUnitEditorStyles(container.ownerDocument);
    const doc = container.ownerDocument, win = doc.defaultView;
    const first = project.units.find(u => u.id === project.selectedUnitId) || project.units.find(u => Number(u.type) === Number(project.selectedUnitType)) || project.units[0];
    let unitId = first.id, type = Number(first.type), newPlanOpen = false, selectedMark = null;
    let selectedId = 'living', drag = null, selectionPointer = null;
    let mode = 'rooms', selectedEdge = null, selectedVertex = null, autoFill = true, orthogonal = true, overlay = false, status = '', lastEdgeTap = null, linked = true, snapOn = true, snapGuides = [];
    const active = () => project.units.find(u => u.id === unitId) || project.units[0];
    const changed = () => { project.selectedUnitType = type; project.selectedUnitId = unitId; if (typeof onChange === 'function') onChange(); };
    function selectUnit(id) { const unit = project.units.find(u => u.id === id) || project.units[0]; unitId = unit.id; type = Number(unit.type); selectedMark = null; }
    function markChanged() {
      for (const t of project.typologies) if (t.sourceUnitIds && t.sourceUnitIds.includes(active().id)) t.needsReview = true;
      changed();
    }
    // Some viewers (Claude artifacts) suppress confirm(), so destructive buttons ask for a second click instead.
    function confirmClick(button, armedLabel, action) {
      if (button.dataset.armed === '1') { action(); return; }
      const label = button.textContent;
      button.dataset.armed = '1'; button.textContent = armedLabel; button.classList.add('pu-armed');
      setTimeout(() => { if (button.isConnected && button.dataset.armed === '1') { button.dataset.armed = ''; button.textContent = label; button.classList.remove('pu-armed'); } }, 3000);
    }
    function setStatus(message) { status = message; const el = container.querySelector('[data-status]'); if (el) el.textContent = message; }
    const snapshotOf = unit => clone({ outline: unit.outline, rooms: unit.rooms, width: unit.width, depth: unit.depth });
    const restore = (unit, snap) => Object.assign(unit, clone(snap));
    function render() {
      const unit = active();
      unitId = unit.id; type = Number(unit.type);
      if (!unit.rooms.some(r => r.id === selectedId)) selectedId = unit.rooms[0] && unit.rooms[0].id;
      container.innerHTML = `<div class="pu-tabs" role="tablist" aria-label="단위세대 도면">${project.units.map(u => `<button type="button" role="tab" aria-selected="${u.id === unitId}" class="${u.id === unitId ? 'active' : ''}" data-unit-id="${esc(u.id)}">${u.custom ? esc(u.name) + `<small> · ${u.type}</small>` : u.type + '<small>㎡</small>'}</button>`).join('')}<button type="button" class="pu-tab-new" data-new-plan aria-expanded="${newPlanOpen}">＋ 빈 도면</button></div>
        ${newPlanOpen ? `<div class="pu-newplan" role="group" aria-label="빈 도면 만들기"><label>이름<input type="text" data-np-name maxlength="60" value="새 도면 ${project.units.filter(u => u.custom).length + 1}"></label><label>기준 평형<select data-np-type>${TYPES.map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}형</option>`).join('')}</select></label><label>가로 (m)<input type="number" data-np-w value="12" min="2" max="60" step="0.1"></label><label>세로 (m)<input type="number" data-np-d value="9" min="2" max="60" step="0.1"></label><button type="button" class="btn primary" data-np-create>만들기</button><button type="button" class="btn" data-np-cancel>취소</button></div>` : ''}
        <div class="pu-layout"><div class="pu-main"><div class="pu-toolbar">${unit.custom ? `<span class="pu-title-edit"><input type="text" class="pu-title-input" data-unit-name maxlength="60" value="${esc(unit.name)}" aria-label="도면 이름"><button type="button" class="text-btn pu-danger" data-unit-delete>도면 삭제</button></span>` : `<h3>${esc(unit.name)}</h3>`}<span class="tag">${unit.custom ? `빈 도면 · 기준 ${type}형` : '직접 편집 · 개념 조닝'}</span></div>
        <div class="pu-actions"><div class="pu-seg" role="group" aria-label="편집 대상"><button type="button" data-mode="rooms" class="${mode === 'rooms' ? 'active' : ''}" aria-pressed="${mode === 'rooms'}">공간 편집</button><button type="button" data-mode="outline" class="${mode === 'outline' ? 'active' : ''}" aria-pressed="${mode === 'outline'}">외곽선 편집</button><button type="button" data-mode="markup" class="pu-seg-mark${mode === 'markup' ? ' active' : ''}" aria-pressed="${mode === 'markup'}">✎ 영역 표시</button></div>
          <button type="button" class="btn" data-action="fill" title="잠기지 않은 공간을 늘려 빈 영역을 채웁니다">빈 영역 채우기</button><button type="button" class="btn" data-action="add">＋ 공간 추가</button>${unit.custom ? '' : '<button type="button" class="btn" data-action="reset">참고도면 배치로 재설정</button>'}
          </div>
        <div class="pu-options"><label title="Ctrl을 누르는 동안 잠시 해제"><input type="checkbox" data-opt="snapOn" ${snapOn ? 'checked' : ''}>가까운 변·꼭짓점에 스냅</label><label><input type="checkbox" data-opt="autoFill" ${autoFill ? 'checked' : ''}>외곽 변경 후 빈 영역 자동 채우기</label><label><input type="checkbox" data-opt="orthogonal" ${orthogonal ? 'checked' : ''}>꼭짓점 이동 시 직각 유지</label>${unit.custom || !assetsAvailable() ? '' : `<label><input type="checkbox" data-opt="overlay" ${overlay ? 'checked' : ''}>참고도면 겹쳐 보기</label>`}<label title="Alt를 누른 채 끌면 반대로 동작합니다"><input type="checkbox" data-opt="linked" ${linked ? 'checked' : ''}>크기 조절 시 맞닿은 공간 함께 조정</label></div>
        <p class="pu-hint">${mode === 'markup' ? '도면 위를 끌어 빨간 영역을 그리세요(A, B, C…). Claude 대화에서 “영역 A로 욕실을 옮겨줘”처럼 요청하면 영역 위치와 겹친 공간이 요청에 함께 들어갑니다. 영역을 눌러 선택하고 Delete로 지웁니다.' : mode === 'rooms' ? '공간을 드래그해 이동하세요. 선택한 공간의 파란 변·모서리를 끌면 크기가 바뀌고, 맞닿은 공간의 경계도 함께 움직입니다(Alt: 이 공간만). 방향키 이동 0.1m · Alt+방향키로 오른쪽·아래 변 크기 조절.' : '외곽 변을 드래그하면 그 벽에 붙은 공간이 함께 늘어나거나 줄어듭니다. 변을 더블클릭하면 꺾임점 2개가 생기고, 가운데 변을 끌어 들어가거나 튀어나온 부분을 만듭니다. 꼭짓점을 선택하고 Delete로 지웁니다. 방향키 0.1m · Shift 0.5m.'}</p>
        <div class="pu-canvas-wrap"><svg class="pu-canvas${mode === 'outline' ? ' pu-outline-mode' : mode === 'markup' ? ' pu-markup-mode' : ''}" aria-label="${esc(unit.name)} 편집 가능한 조닝" role="group" tabindex="-1"></svg></div>
        <div class="pu-legend">${CATEGORIES.map(k => `<span><i style="background:${COLORS[k]}"></i>${CATEGORY_LABELS[k]}</span>`).join('')}<span><i style="background:repeating-linear-gradient(45deg,#c9d5df 0 2px,#fff 2px 5px)"></i>빈 영역</span></div><div class="pu-statrow pu-four" data-stats></div><div data-checks aria-live="polite"></div><div class="pu-status" data-status role="status">${esc(status)}</div>
        ${unit.custom ? `<p class="pu-note">사용자가 만든 빈 도면입니다. 외곽선 편집으로 외곽을 그리고 ＋ 공간 추가나 Claude 대화로 공간을 채우세요. 기준 평형 ${type}형은 동평면 조합에서 쓰는 참고값이며, 외곽 면적은 법정 전용면적이 아닙니다.</p>` : `<p class="pu-note">외곽과 실 배치는 LH 양주회천 A-26 ${type}A 공식 안내도의 표기 치수를 따라 개략 추적한 계획값입니다. 벽 두께와 중심선을 구분하지 않았고, 외곽 면적에는 확장 발코니·벽체·실외기실이 포함되므로 명목 전용면적과 다릅니다. 법정 전용면적 산정이 아닙니다.</p>
        <details class="pu-reference"><summary>공식 참고 평면과 도면 표기 치수 보기 · ${type}A</summary>${assetsAvailable() ? '' : '<p>이 패키지에는 참고 이미지가 없습니다. 원본: <a href="https://www.lh-hca26.co.kr/sub03_01.html?tab=1" target="_blank" rel="noopener">LH 양주회천 A-26 평면 안내</a></p>'}<img ${assetsAvailable() ? '' : 'hidden '}src="${assetsAvailable() ? `assets/${type}A-plan.png` : ''}" alt="LH 양주회천 A-26 ${type}A 공식 참고 평면"><p>자료: LH 양주회천 A-26 ${type}A · 공식 도면 표기 ${Object.entries(ROOM_DATA[type].officialDims).map(([k, v]) => `${esc(k)} <strong>${esc(v)}</strong>`).join(' · ')} (mm).<br>표기 기준과 마감 두께를 확인하지 않은 값이며, 시공·가구 제작용 실측치가 아닙니다.</p></details>`}
        </div><aside class="pu-inspector"><div class="panel"><h3>${{ rooms: '공간 편집', outline: '외곽선', markup: '표시한 영역' }[mode]}</h3><div data-inspector></div></div><div class="panel pu-chat"><h3>✧ Claude 대화 <small>API 없이 복사·붙여넣기</small></h3><div class="pu-chat-log" data-chat-log aria-live="polite"></div>
          <div class="pu-chat-marks" data-chat-marks></div><textarea data-chat-input rows="3" placeholder="수정 요청을 쓰거나, Claude의 답변을 통째로 붙여넣으세요. (Ctrl+Enter 보내기)">${esc(CHAT.draft)}</textarea>
          <div class="pu-chat-actions"><span>${downloadsBlocked() ? '' : '<button type="button" class="text-btn" data-chat-file-save>요청 파일 저장</button> · '}<label class="text-btn" style="cursor:pointer">답변 파일 열기<input type="file" accept=".json,application/json,text/plain" data-chat-file hidden></label></span><button type="button" class="btn primary" data-chat-send></button></div></div>
          <div class="panel pu-layers-panel"><h3>레이어 <small>위에 있는 공간이 겹친 면적을 차지</small></h3><div data-roomlist></div></div></aside></div>`;
      container.querySelectorAll('[data-unit-id]').forEach(b => b.addEventListener('click', () => { selectUnit(b.dataset.unitId); selectedId = 'living'; selectedEdge = selectedVertex = null; changed(); render(); }));
      container.querySelector('[data-new-plan]').addEventListener('click', () => { newPlanOpen = !newPlanOpen; render(); if (newPlanOpen) container.querySelector('[data-np-name]').select(); });
      if (newPlanOpen) {
        container.querySelector('[data-np-cancel]').addEventListener('click', () => { newPlanOpen = false; render(); });
        container.querySelector('[data-np-create]').addEventListener('click', () => {
          const w = Number(container.querySelector('[data-np-w]').value), d = Number(container.querySelector('[data-np-d]').value);
          if (!(w >= 2 && w <= 60 && d >= 2 && d <= 60)) { setStatus('가로·세로는 2~60 m로 입력하세요.'); return; }
          if (project.units.length >= 100) { setStatus('도면은 100개까지 만들 수 있습니다.'); return; }
          const unit = createBlankUnit({ name: container.querySelector('[data-np-name]').value, type: container.querySelector('[data-np-type]').value, width: w, depth: d });
          project.units.push(unit); selectUnit(unit.id); newPlanOpen = false; mode = 'rooms'; selectedId = null;
          setStatus(`빈 도면 “${unit.name}”을(를) 만들었습니다. 외곽선 편집으로 외곽을 바꾸고 ＋ 공간 추가나 Claude 대화로 공간을 넣으세요.`);
          render(); markChanged();
        });
      }
      const nameInput = container.querySelector('[data-unit-name]');
      if (nameInput) nameInput.addEventListener('change', () => { active().name = nameInput.value.trim().slice(0, 60) || '새 도면'; render(); markChanged(); });
      const deleteBtn = container.querySelector('[data-unit-delete]');
      if (deleteBtn) deleteBtn.addEventListener('click', () => {
        const unit = active();
        confirmClick(deleteBtn, '한 번 더 누르면 삭제', () => {
          project.units = project.units.filter(u => u.id !== unit.id); delete MARKS[unit.id];
          selectUnit(project.units[0].id); setStatus(`“${unit.name}” 도면을 삭제했습니다. 실행 취소(Ctrl+Z)로 복원할 수 있습니다.`); render(); markChanged();
        });
      });
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; selectedEdge = selectedVertex = null; render(); }));
      container.querySelectorAll('[data-opt]').forEach(input => input.addEventListener('change', () => {
        if (input.dataset.opt === 'autoFill') autoFill = input.checked;
        if (input.dataset.opt === 'orthogonal') orthogonal = input.checked;
        if (input.dataset.opt === 'overlay') { overlay = input.checked; paintSvg(); }
        if (input.dataset.opt === 'linked') linked = input.checked;
        if (input.dataset.opt === 'snapOn') snapOn = input.checked;
      }));
      container.querySelector('[data-action="fill"]').addEventListener('click', () => {
        const before = checkUnit(active()), after = fillUnit(active());
        if (before.gapArea === null) setStatus('외곽을 벗어난 공간이 있어 그 공간은 늘리지 않았습니다. 먼저 위치를 고쳐 주세요.');
        else setStatus(`빈 영역 ${fmt(before.gapArea)}㎡ → ${fmt(after.gapArea === null ? 0 : after.gapArea)}㎡`);
        refresh(); markChanged();
      });
      container.querySelector('[data-action="add"]').addEventListener('click', () => {
        const room = addRoom(active());
        if (!room) { setStatus('새 공간을 놓을 빈 영역이 없습니다. 공간을 줄이거나 외곽을 넓혀 주세요.'); return; }
        selectedId = room.id; mode = 'rooms'; setStatus('빈 영역에 새 공간을 만들었습니다. 이름과 용도를 지정하세요.'); render(); markChanged();
      });
      const resetBtn = container.querySelector('[data-action="reset"]');
      if (resetBtn) resetBtn.addEventListener('click', () => {
        confirmClick(resetBtn, '한 번 더 누르면 재설정', () => {
          const unit = active(), fresh = createUnit(type);
          Object.assign(unit, { name: fresh.name, outline: fresh.outline, rooms: fresh.rooms, width: fresh.width, depth: fresh.depth, layoutVersion: 2, reference: fresh.reference });
          selectedEdge = selectedVertex = null; setStatus('참고도면 기반 배치로 재설정했습니다. 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다.'); render(); markChanged();
        });
      });
      wireChat();
      const svg = container.querySelector('.pu-canvas');
      svg.addEventListener('pointerdown', pointerDown);
      svg.addEventListener('pointermove', pointerMove);
      svg.addEventListener('pointerup', pointerEnd);
      svg.addEventListener('pointercancel', pointerCancel);
      svg.addEventListener('keydown', keyMove);
      refresh();
    }
    function refresh() {
      paintSvg(); paintInspector(); paintStats(); paintMarkChips();
    }
    function focusSelected() {
      const selector = mode === 'markup' ? '[data-mark]' : mode === 'rooms' ? '[data-room]' : selectedVertex !== null ? '[data-vertex]' : '[data-edge]';
      const key = mode === 'markup' ? 'mark' : mode === 'rooms' ? 'room' : selectedVertex !== null ? 'vertex' : 'edge';
      const value = String(mode === 'markup' ? selectedMark : mode === 'rooms' ? selectedId : selectedVertex !== null ? selectedVertex : selectedEdge);
      const target = Array.from(container.querySelectorAll(selector)).find(el => el.dataset[key] === value);
      if (target) target.focus({ preventScroll: true });
    }
    function paintSvg() {
      const unit = active(), report = checkUnit(unit), bad = new Set(report.outside.concat(report.hidden));
      const poly = unit.outline, svg = container.querySelector('.pu-canvas'), pad = 1.1, image = !unit.custom && assetsAvailable() && ROOM_DATA[type] && ROOM_DATA[type].image;
      svg.setAttribute('viewBox', `${-pad} ${-pad} ${unit.width + pad * 2} ${unit.depth + pad * 2}`);
      const path = 'M' + poly.map(p => p[0] + ' ' + p[1]).join('L') + 'Z';
      const horizontal = Array.from({ length: Math.ceil(unit.depth) }, (_, i) => `<path d="M0 ${i}H${unit.width}"/>`).join('');
      const vertical = Array.from({ length: Math.ceil(unit.width) }, (_, i) => `<path d="M${i} 0V${unit.depth}"/>`).join('');
      const dims = poly.map((a, i) => {
        const b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.25) return '';
        let nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (pointInPolygon(mx + nx * 0.05, my + ny * 0.05, poly)) { nx = -nx; ny = -ny; }
        const tx = mx + nx * 0.42, ty = my + ny * 0.42, angle = Math.abs(b[0] - a[0]) < Math.abs(b[1] - a[1]) ? -90 : 0;
        return `<text x="${tx}" y="${ty}" transform="rotate(${angle} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" font-size="${len < 1.2 ? .17 : .21}" fill="${selectedEdge === i ? '#1262cb' : '#6f8699'}">${mm(len)}</text>`;
      }).join('');
      const editHandles = mode !== 'outline' ? '' : poly.map((a, i) => {
        const b = poly[(i + 1) % poly.length];
        return `<g class="pu-edge" data-edge="${i}" tabindex="0" role="button" aria-label="외곽 변 ${i + 1} 길이 ${mm(Math.hypot(b[0] - a[0], b[1] - a[1]))}mm"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="transparent" stroke-width=".42"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${selectedEdge === i ? '#1262cb' : '#2f4c66'}" stroke-width="${selectedEdge === i ? .13 : .08}" stroke-linecap="round"/></g>`;
      }).join('') + poly.map((p, i) => `<circle class="pu-vertex" data-vertex="${i}" tabindex="0" role="button" aria-label="꼭짓점 ${i + 1}" cx="${p[0]}" cy="${p[1]}" r="${selectedVertex === i ? .2 : .15}" fill="${selectedVertex === i ? '#1262cb' : '#fff'}" stroke="#1d4f7c" stroke-width=".05"/>`).join('');
      svg.innerHTML = `<defs><pattern id="pu-hatch-${type}" width=".3" height=".3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width=".3" height=".3" fill="#fff"/><line x1="0" y1="0" x2="0" y2=".3" stroke="#cbd7e1" stroke-width=".06"/></pattern><clipPath id="pu-clip-${type}"><path d="${path}"/></clipPath></defs>
        ${overlay && image ? `<image href="assets/${type}A-plan.png" x="${-image.x / image.scale}" y="${-image.y / image.scale}" width="${1400 / image.scale}" height="${1150 / image.scale}" opacity=".5" preserveAspectRatio="none" pointer-events="none"/>` : ''}
        <path d="${path}" fill="url(#pu-hatch-${type})" fill-opacity="${overlay ? .35 : 1}"/><g stroke="#e3eaf0" stroke-width=".018" clip-path="url(#pu-clip-${type})">${horizontal}${vertical}</g>
        <text x="${unit.width / 2}" y="${-pad + .3}" text-anchor="middle" font-size=".2" fill="#7890a3">외곽 ${fmt(unit.width)} × ${fmt(unit.depth)}m · ${fmt(report.outlineArea)}㎡</text>
        ${unit.rooms.map((r, i) => {
          const spot = visibleSpot(unit, i), layer = report.layers[i], selected = r.id === selectedId && mode === 'rooms';
          const label = spot && spot.width > .55 && spot.depth > .45 ? `<text x="${spot.x}" y="${spot.y - .08}" text-anchor="middle" font-size="${spot.width < 1.5 ? '.17' : '.23'}" font-weight="650" fill="#294b64">${esc(r.name)}${r.locked ? ' · 잠금' : ''}</text><text x="${spot.x}" y="${spot.y + .2}" text-anchor="middle" font-size="${spot.width < 1.5 ? '.14' : '.17'}" fill="#6a8397">${fmt(layer.visibleArea)}㎡</text>${spot.width > 1.6 && spot.depth > 1.2 ? `<text x="${spot.x}" y="${spot.y + .42}" text-anchor="middle" font-size=".14" fill="#8aa0b2">${mm(r.width)} × ${mm(r.depth)}</text>` : ''}` : '';
          return `<g class="pu-room ${r.locked ? 'pu-locked' : ''}" data-room="${esc(r.id)}" tabindex="${mode === 'rooms' ? 0 : -1}" role="button" aria-label="${esc(r.name)} ${fmt(layer.visibleArea)}제곱미터 ${r.locked ? '잠김' : '선택 및 이동'}" aria-pressed="${r.id === selectedId}"><rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="${COLORS[r.category] || COLORS.service}" fill-opacity="${overlay ? .55 : 1}" stroke="${bad.has(r.id) ? '#c36735' : selected ? '#2569ad' : '#8fa8bc'}" stroke-width="${selected ? '.065' : '.03'}"/>${label}</g>`;
        }).join('')}${selectionOutline(unit)}
        <path d="${path}" fill="none" stroke="#3d566d" stroke-width=".07" stroke-linejoin="miter" pointer-events="none"/>${dims}${editHandles}${resizeHandles(unit)}${marksSvg(unit)}${guidesSvg(unit)}`;
    }
    // Snap tolerance is about 10 screen pixels, whatever the zoom.
    function snapTolerance() {
      const m = container.querySelector('.pu-canvas').getScreenCTM();
      return m && m.a ? 10 / m.a : 0.2;
    }
    function guidesSvg(unit) {
      const reach = 0.7, style = 'stroke="#d6337a" stroke-width=".03" stroke-dasharray=".12 .08" pointer-events="none"';
      return snapGuides.map(g => g.axis === 'x' ? `<line x1="${g.value}" y1="${-reach}" x2="${g.value}" y2="${unit.depth + reach}" ${style}/>`
        : g.axis === 'y' ? `<line x1="${-reach}" y1="${g.value}" x2="${unit.width + reach}" y2="${g.value}" ${style}/>`
        : `<circle cx="${g.x}" cy="${g.y}" r=".12" fill="none" stroke="#d6337a" stroke-width=".05" pointer-events="none"/>`).join('');
    }
    function marksSvg(unit) {
      return marksOf(unit.id).map(m => {
        const sel = mode === 'markup' && m.label === selectedMark;
        return `<g class="pu-mark" data-mark="${m.label}" ${mode === 'markup' ? 'tabindex="0" role="button"' : 'pointer-events="none"'} aria-label="표시 영역 ${m.label}"><rect x="${m.x}" y="${m.y}" width="${m.width}" height="${m.depth}" fill="#e5484d" fill-opacity="${sel ? .2 : .12}" stroke="#e5484d" stroke-width="${sel ? .08 : .05}" stroke-dasharray=".18 .1"/><rect x="${m.x}" y="${m.y}" width=".42" height=".36" fill="#e5484d"/><text x="${m.x + .21}" y="${m.y + .27}" text-anchor="middle" font-size=".25" font-weight="700" fill="#fff">${m.label}</text></g>`;
      }).join('');
    }
    function removeMark(label) {
      const marks = marksOf(active().id), i = marks.findIndex(m => m.label === label);
      if (i >= 0) marks.splice(i, 1);
      if (selectedMark === label) selectedMark = null;
      setStatus(`영역 ${label}을(를) 지웠습니다.`); refresh();
    }
    function insertIntoChat(text) {
      const input = container.querySelector('[data-chat-input]');
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
      const before = input.value.slice(0, start), pad = before && !/\s$/.test(before) ? ' ' : '';
      input.value = before + pad + text + ' ' + input.value.slice(end);
      CHAT.draft = input.value; updateChatMode(); input.focus();
      const caret = (before + pad + text + ' ').length; input.setSelectionRange(caret, caret);
    }
    function paintMarkChips() {
      const box = container.querySelector('[data-chat-marks]'), marks = marksOf(active().id);
      if (!box) return;
      box.innerHTML = marks.length ? marks.map(m => `<button type="button" class="pu-chip" data-chip="${m.label}" title="대화 입력에 ‘영역 ${m.label}’ 넣기">영역 ${m.label}</button>`).join('') + '<span>요청에 영역 위치가 함께 들어갑니다</span>' : '';
      box.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => insertIntoChat('영역 ' + b.dataset.chip)));
    }
    // A selected room that lies under other layers still shows its full extent as a dashed outline.
    function selectionOutline(unit) {
      const r = mode === 'rooms' && unit.rooms.find(room => room.id === selectedId);
      return r ? `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="none" stroke="#2569ad" stroke-width=".05" stroke-dasharray=".16 .1" pointer-events="none"/>` : '';
    }
    function resizeHandles(unit) {
      const r = mode === 'rooms' && unit.rooms.find(room => room.id === selectedId);
      if (!r || r.locked) return '';
      const hit = .24, grip = .1, x2 = r.x + r.width, y2 = r.y + r.depth, cx = r.x + r.width / 2, cy = r.y + r.depth / 2;
      const gripLen = len => Math.min(.6, len * .4);
      const edge = (side, x, y, w, h, gx, gy, gw, gh) => `<g data-resize="${side}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx=".04" fill="#2569ad" pointer-events="none"/></g>`;
      return '<g class="pu-handles">' +
        edge('left', r.x - hit / 2, r.y + hit / 2, hit, Math.max(0, r.depth - hit), r.x - grip / 2, cy - gripLen(r.depth) / 2, grip, gripLen(r.depth)) +
        edge('right', x2 - hit / 2, r.y + hit / 2, hit, Math.max(0, r.depth - hit), x2 - grip / 2, cy - gripLen(r.depth) / 2, grip, gripLen(r.depth)) +
        edge('top', r.x + hit / 2, r.y - hit / 2, Math.max(0, r.width - hit), hit, cx - gripLen(r.width) / 2, r.y - grip / 2, gripLen(r.width), grip) +
        edge('bottom', r.x + hit / 2, y2 - hit / 2, Math.max(0, r.width - hit), hit, cx - gripLen(r.width) / 2, y2 - grip / 2, gripLen(r.width), grip) +
        [['left top', r.x, r.y], ['right top', x2, r.y], ['left bottom', r.x, y2], ['right bottom', x2, y2]].map(([sides, x, y]) => `<circle data-resize="${sides}" cx="${x}" cy="${y}" r=".13" fill="#fff" stroke="#2569ad" stroke-width=".05"/>`).join('') +
        '</g>';
    }
    // Apply each dragged side in turn; a blocked side stops at the nearest valid position.
    function applyResize(unit, roomId, sides, starts, dx, dy, link, useSnap) {
      let message = '';
      snapGuides = [];
      for (const side of sides) {
        const horizontal = side === 'left' || side === 'right', axis = horizontal ? 'x' : 'y', raw = starts[side] + (horizontal ? dx : dy);
        const hit = useSnap ? snapCoordinate(unit, axis, raw, snapTolerance(), [roomId]) : { snapped: false };
        const result = resizeRoomClamped(unit, roomId, side, hit.snapped ? hit.value : snap(raw, 0.05), { linked: link });
        if (hit.snapped && result.ok && !result.clamped) snapGuides.push({ axis, value: hit.value });
        if (!result.ok || result.clamped) message = result.message || message;
      }
      if (snapGuides.length === 2) snapGuides.push({ axis: 'point', x: snapGuides.find(g => g.axis === 'x').value, y: snapGuides.find(g => g.axis === 'y').value });
      return message;
    }
    function paintInspector() {
      const unit = active(), inspector = container.querySelector('[data-inspector]');
      if (mode === 'markup') {
        const marks = marksOf(unit.id);
        inspector.innerHTML = `<p class="pu-hint">도면 위를 끌어 빨간 영역을 그리세요. 영역은 요청에만 쓰이며 도면에 저장되지 않습니다.</p>${marks.length ? `<ul class="pu-marklist">${marks.map(m => {
          const rooms = roomsInMark(unit, m);
          return `<li class="${m.label === selectedMark ? 'selected' : ''}"><b>${m.label}</b><span>${mm(m.width)} × ${mm(m.depth)} mm<small>위치 (${fmt(m.x)}, ${fmt(m.y)}) m · ${rooms.length ? rooms.map(r => `${esc(r.name)} ${fmt(r.overlapArea)}㎡`).join(', ') : '빈 영역'}</small></span><span class="pu-mark-actions"><button type="button" class="text-btn" data-mark-insert="${m.label}">대화에 넣기</button><button type="button" class="text-btn pu-danger" data-mark-delete="${m.label}">삭제</button></span></li>`;
        }).join('')}</ul><div class="pu-row-actions"><button type="button" class="btn" data-mark-clear>모두 지우기</button></div>` : '<p class="pu-hint">아직 표시한 영역이 없습니다.</p>'}`;
        inspector.querySelectorAll('[data-mark-insert]').forEach(b => b.addEventListener('click', () => insertIntoChat('영역 ' + b.dataset.markInsert)));
        inspector.querySelectorAll('[data-mark-delete]').forEach(b => b.addEventListener('click', () => removeMark(b.dataset.markDelete)));
        const clear = inspector.querySelector('[data-mark-clear]');
        if (clear) clear.addEventListener('click', () => { marksOf(unit.id).length = 0; selectedMark = null; setStatus('표시한 영역을 모두 지웠습니다.'); refresh(); });
        return;
      }
      if (mode === 'outline') {
        const sel = selectedEdge !== null && unit.outline[selectedEdge] ? edgeInfo(unit.outline, selectedEdge) : null;
        inspector.innerHTML = `<div class="pu-area">${fmt(polygonArea(unit.outline))} <small>㎡ · 외곽 면적 (꼭짓점 ${unit.outline.length}개)</small></div>
          ${sel ? `<p class="pu-hint">선택한 변: ${mm(sel.length)} mm ${sel.horizontal ? '· 가로 벽' : sel.vertical ? '· 세로 벽' : '· 사선'}</p>` : selectedVertex !== null && unit.outline[selectedVertex] ? `<p class="pu-hint">선택한 꼭짓점: (${unit.outline[selectedVertex].map(v => fmt(v)).join(', ')}) m</p>` : '<p class="pu-hint">변이나 꼭짓점을 선택하세요.</p>'}
          <label class="pu-hint" for="pu-coords-${type}">꼭짓점 좌표 [x, y] (m) · 직접 입력 가능</label><textarea class="pu-coords" id="pu-coords-${type}" data-coords spellcheck="false">${esc(JSON.stringify(unit.outline))}</textarea>
          <div class="pu-row-actions"><button type="button" class="btn" data-coords-apply>좌표 적용</button>${selectedVertex !== null ? '<button type="button" class="btn pu-danger" data-vertex-delete>꼭짓점 삭제</button>' : ''}</div>`;
        inspector.querySelector('[data-coords-apply]').addEventListener('click', () => {
          try {
            const value = JSON.parse(inspector.querySelector('[data-coords]').value);
            const report = setOutline(unit, value, { fill: autoFill });
            selectedEdge = selectedVertex = null;
            setStatus('외곽 좌표를 적용했습니다.' + (report.outside.length ? ` 외곽을 벗어난 공간 ${report.outside.length}개를 확인하세요.` : ''));
            refresh(); markChanged();
          } catch (e) { setStatus(e.message); }
        });
        const del = inspector.querySelector('[data-vertex-delete]');
        if (del) del.addEventListener('click', deleteVertex);
        return;
      }
      const room = unit.rooms.find(r => r.id === selectedId);
      if (!room) { inspector.innerHTML = '<p class="muted">공간을 선택하세요.</p>'; return; }
      inspector.innerHTML = `<div class="pu-active-room"><i style="background:${COLORS[room.category] || COLORS.service}"></i><strong>${esc(room.name)}</strong></div><div class="pu-area">${fmt(checkUnit(unit).layers[unit.rooms.indexOf(room)].visibleArea)} <small>㎡ · 점유 면적 (사각형 ${fmt(room.width * room.depth)}㎡)</small></div>
        <div class="pu-inputs"><label class="pu-wide">이름<input type="text" data-room-name value="${esc(room.name)}" maxlength="40" ${room.locked ? 'disabled' : ''}></label><label class="pu-wide">용도<select data-room-category ${room.locked ? 'disabled' : ''}>${CATEGORIES.map(k => `<option value="${k}" ${room.category === k ? 'selected' : ''}>${CATEGORY_LABELS[k]}</option>`).join('')}</select></label>
        ${[['width', '가로'], ['depth', '세로'], ['x', 'X 위치'], ['y', 'Y 위치']].map(([key, label]) => `<label>${label} (m)<input aria-label="${label} (m)" data-room-field="${key}" type="number" value="${room[key]}" step="0.1" min="${key === 'width' || key === 'depth' ? '0.1' : '-500'}" max="500" ${room.locked ? 'disabled' : ''}></label>`).join('')}</div>
        <label class="pu-check"><input type="checkbox" data-lock ${room.locked ? 'checked' : ''}>이 공간의 위치·치수 잠금 (채우기·외곽 변경에서도 유지)</label>
        <div class="pu-row-actions"><button type="button" class="btn" data-layer-top>맨 위 레이어로</button><button type="button" class="btn" data-layer-bottom>맨 아래로</button></div><div class="pu-row-actions"><button type="button" class="btn" data-grow ${room.locked ? 'disabled' : ''}>이 공간만 늘려 채우기</button><button type="button" class="btn pu-danger" data-delete ${room.locked ? 'disabled' : ''}>삭제</button></div><p class="pu-hint">외곽을 벗어나거나 다른 공간과 겹치면 검토 항목에 표시됩니다.</p>`;
      inspector.querySelectorAll('[data-room-field]').forEach(input => input.addEventListener('change', () => {
        const field = input.dataset.roomField;
        if (input.value.trim() !== '' && editRoom(unit, room.id, { [field]: Number(input.value) })) {
          // Keep the input nodes mounted so typing, stepping and tabbing retain focus.
          input.value = String(room[field]); paintSvg(); paintStats();
          inspector.querySelector('.pu-area').innerHTML = `${fmt(checkUnit(unit).layers[unit.rooms.indexOf(room)].visibleArea)} <small>㎡ · 점유 면적 (사각형 ${fmt(room.width * room.depth)}㎡)</small>`;
          markChanged();
        } else input.value = String(room[field]);
      }));
      inspector.querySelector('[data-room-name]').addEventListener('change', e => {
        const name = e.target.value.trim().slice(0, 40);
        if (!name) { e.target.value = room.name; return; }
        room.name = name; paintSvg(); paintStats(); inspector.querySelector('.pu-active-room strong').textContent = name; markChanged();
      });
      inspector.querySelector('[data-room-category]').addEventListener('change', e => { room.category = e.target.value; paintSvg(); inspector.querySelector('.pu-active-room i').style.background = COLORS[room.category]; markChanged(); });
      inspector.querySelector('[data-lock]').addEventListener('change', e => { room.locked = e.target.checked; refresh(); markChanged(); });
      inspector.querySelector('[data-layer-top]').addEventListener('click', () => reorderLayer(room.id, unit.rooms.length - 1));
      inspector.querySelector('[data-layer-bottom]').addEventListener('click', () => reorderLayer(room.id, 0));
      inspector.querySelector('[data-grow]').addEventListener('click', () => { const before = room.width * room.depth; fillUnit(unit, { ids: [room.id] }); setStatus(`${room.name} ${fmt(before)}㎡ → ${fmt(room.width * room.depth)}㎡`); refresh(); markChanged(); });
      inspector.querySelector('[data-delete]').addEventListener('click', () => {
        unit.rooms = unit.rooms.filter(r => r.id !== room.id); selectedId = unit.rooms[0] && unit.rooms[0].id;
        setStatus(`${room.name}을(를) 삭제했습니다. 빈 영역 채우기로 주변 공간을 늘릴 수 있습니다.`); refresh(); markChanged();
      });
    }
    function paintStats() {
      const unit = active(), report = checkUnit(unit);
      container.querySelector('[data-stats]').innerHTML = `<div class="pu-stat"><span>명목 전용면적</span><b>${type}<small> ㎡</small></b></div><div class="pu-stat"><span>외곽 면적 · 확장·벽체 포함</span><b>${fmt(report.outlineArea)}<small> ㎡</small></b></div><div class="pu-stat"><span>공간 점유 합계 · 겹침 제외</span><b>${fmt(report.unionArea)}<small> ㎡</small></b></div><div class="pu-stat"><span>빈 영역 · 미배분</span><b>${report.gapArea === null ? '—' : fmt(report.gapArea)}<small> ㎡</small></b></div>`;
      const name = id => unit.rooms.find(r => r.id === id)?.name || id;
      const issues = report.outside.map(id => name(id) + ' 외곽 이탈').concat(report.hidden.map(id => name(id) + ' 위 레이어에 완전히 가려짐')).concat(report.invalid.map(id => name(id) + ' 유효하지 않은 치수'));
      const covered = report.layers.reduce((sum, l) => sum + l.coveredArea, 0);
      container.querySelector('[data-checks]').innerHTML = issues.length ? `<div class="pu-warning"><strong>형상 확인 ${issues.length}건</strong><br>${issues.map(esc).join('<br>')}</div>` : `<div class="pu-pass">직사각형 형상 검사: 외곽 이탈 없음${covered > 0.005 ? ` · 겹친 ${fmt(covered)}㎡는 위 레이어가 차지` : ''}${report.gapArea > 0.05 ? ` · 빈 영역 ${fmt(report.gapArea)}㎡ (‘빈 영역 채우기’로 정리)` : ' · 외곽을 빈틈 없이 채움'}</div>`;
      paintLayers(unit, report);
    }
    function paintLayers(unit, report) {
      const list = container.querySelector('[data-roomlist]'), n = unit.rooms.length;
      // Shown top layer first, like a drawing program; the array keeps bottom-first order.
      list.innerHTML = `<ol class="pu-layers">${unit.rooms.map((r, i) => ({ r, i, l: report.layers[i] })).reverse().map(({ r, i, l }) => `<li class="pu-layer${r.id === selectedId ? ' selected' : ''}${l.visibleArea < 0.01 ? ' hidden-layer' : ''}" draggable="true" data-layer="${esc(r.id)}">
          <span class="pu-grip" aria-hidden="true">⋮⋮</span><i style="background:${COLORS[r.category] || COLORS.service}"></i>
          <button type="button" class="pu-layer-name" data-select-room="${esc(r.id)}">${esc(r.name)}${r.locked ? ' · 잠금' : ''}</button>
          <span class="pu-layer-area">${fmt(l.visibleArea)}${l.coveredArea > 0.005 ? `<small>/${fmt(l.area)}</small>` : ''}</span>
          <span class="pu-layer-move"><button type="button" data-layer-step="1" data-id="${esc(r.id)}" aria-label="${esc(r.name)} 한 단계 위로" ${i === n - 1 ? 'disabled' : ''}>▲</button><button type="button" data-layer-step="-1" data-id="${esc(r.id)}" aria-label="${esc(r.name)} 한 단계 아래로" ${i === 0 ? 'disabled' : ''}>▼</button></span></li>`).join('')}</ol>
        <div class="pu-layer-total"><span>점유 합계</span><b>${fmt(report.unionArea)}㎡</b></div>`;
      list.querySelectorAll('[data-select-room]').forEach(b => b.addEventListener('click', () => { selectedId = b.dataset.selectRoom; if (mode !== 'rooms') { mode = 'rooms'; render(); } else refresh(); focusSelected(); }));
      list.querySelectorAll('[data-layer-step]').forEach(b => b.addEventListener('click', () => {
        const index = unit.rooms.findIndex(r => r.id === b.dataset.id);
        reorderLayer(b.dataset.id, index + Number(b.dataset.layerStep));
        const again = Array.from(container.querySelectorAll('[data-layer-step]')).find(x => x.dataset.id === b.dataset.id && x.dataset.layerStep === b.dataset.layerStep && !x.disabled);
        if (again) again.focus();
      }));
      let dragged = null;
      list.querySelectorAll('[data-layer]').forEach(row => {
        row.addEventListener('dragstart', e => { dragged = row.dataset.layer; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragged); });
        row.addEventListener('dragend', () => { dragged = null; list.querySelectorAll('.pu-layer').forEach(x => x.classList.remove('dragging', 'drop-above', 'drop-below')); });
        row.addEventListener('dragover', e => {
          if (!dragged || dragged === row.dataset.layer) return;
          e.preventDefault();
          const box = row.getBoundingClientRect(), above = e.clientY < box.top + box.height / 2;
          row.classList.toggle('drop-above', above); row.classList.toggle('drop-below', !above);
        });
        row.addEventListener('dragleave', () => row.classList.remove('drop-above', 'drop-below'));
        row.addEventListener('drop', e => {
          e.preventDefault();
          if (!dragged || dragged === row.dataset.layer) return;
          const above = row.classList.contains('drop-above');
          // Index of the target once the dragged room is taken out; "above" in the list means a higher layer.
          const rest = unit.rooms.filter(r => r.id !== dragged), target = rest.findIndex(r => r.id === row.dataset.layer);
          reorderLayer(dragged, above ? target + 1 : target);
        });
      });
    }
    function reorderLayer(id, toIndex) {
      const unit = active(), room = unit.rooms.find(r => r.id === id);
      if (!room || !moveRoomLayer(unit, id, toIndex)) return;
      const index = unit.rooms.indexOf(room), n = unit.rooms.length;
      setStatus(`${room.name} → 레이어 ${n - index}/${n}${index === n - 1 ? ' (맨 위)' : index === 0 ? ' (맨 아래)' : ''}`);
      refresh(); markChanged();
    }
    function point(event) {
      const svg = container.querySelector('.pu-canvas'), matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY; return p.matrixTransform(matrix.inverse());
    }
    const snap = (n, size) => Math.round(n / size) * size;
    // Capture can fail for pointers the browser no longer tracks; dragging still works without it.
    function capturePointer(event) { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ } }
    function pointerDown(event) {
      if (selectionPointer !== null) return;
      const p = point(event);
      if (mode === 'markup') {
        const g = event.target.closest('[data-mark]');
        if (g) { selectedMark = g.dataset.mark; refresh(); focusSelected(); return; }
        if (!p) return;
        const used = new Set(marksOf(active().id).map(m => m.label)), label = [...MARK_LABELS].find(l => !used.has(l));
        if (!label) { setStatus('영역은 26개까지 표시할 수 있습니다.'); return; }
        drag = { kind: 'mark', label, startX: p.x, startY: p.y, pointerId: event.pointerId, moved: false };
        selectionPointer = event.pointerId; capturePointer(event); event.preventDefault(); return;
      }
      if (mode === 'outline') {
        const v = event.target.closest('[data-vertex]'), e = event.target.closest('[data-edge]');
        if (!v && !e) { selectedEdge = selectedVertex = null; refresh(); return; }
        // Pointer-down repaints the canvas, so a native dblclick never reaches the edge; detect the second tap here.
        if (e && !v && p && lastEdgeTap && lastEdgeTap.edge === Number(e.dataset.edge) && event.timeStamp - lastEdgeTap.time < 400) {
          lastEdgeTap = null; splitAt(Number(e.dataset.edge), [p.x, p.y]); event.preventDefault(); return;
        }
        lastEdgeTap = e && !v ? { edge: Number(e.dataset.edge), time: event.timeStamp } : null;
        selectedVertex = v ? Number(v.dataset.vertex) : null; selectedEdge = v ? null : Number(e.dataset.edge);
        if (p) drag = { kind: v ? 'vertex' : 'edge', index: v ? selectedVertex : selectedEdge, startX: p.x, startY: p.y, pointerId: event.pointerId, snapshot: snapshotOf(active()), moved: false };
        selectionPointer = event.pointerId; capturePointer(event); event.preventDefault(); refresh(); return;
      }
      const handle = event.target.closest('[data-resize]');
      if (handle && p) {
        const room = active().rooms.find(r => r.id === selectedId), sides = handle.dataset.resize.split(' ');
        drag = { kind: 'resize', id: room.id, sides, starts: Object.fromEntries(sides.map(side => [side, sideValue(room, side)])), startX: p.x, startY: p.y, pointerId: event.pointerId, snapshot: snapshotOf(active()), moved: false, area: room.width * room.depth };
        selectionPointer = event.pointerId; capturePointer(event); event.preventDefault(); return;
      }
      const g = event.target.closest('[data-room]'); if (!g) return;
      const room = active().rooms.find(r => r.id === g.dataset.room);
      selectedId = room.id; selectionPointer = event.pointerId;
      if (!room.locked && p) drag = { kind: 'room', id: room.id, x: room.x, y: room.y, startX: p.x, startY: p.y, pointerId: event.pointerId, moved: false };
      capturePointer(event); event.preventDefault(); refresh();
    }
    function pointerMove(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const p = point(event); if (!p) return;
      const unit = active(), dx = p.x - drag.startX, dy = p.y - drag.startY;
      if (drag.kind === 'mark') {
        const clampX = v => Math.max(0, Math.min(unit.width, snap(v, 0.05))), clampY = v => Math.max(0, Math.min(unit.depth, snap(v, 0.05)));
        const x1 = clampX(drag.startX), y1 = clampY(drag.startY), x2 = clampX(p.x), y2 = clampY(p.y);
        const rect = { label: drag.label, x: round(Math.min(x1, x2)), y: round(Math.min(y1, y2)), width: round(Math.abs(x2 - x1)), depth: round(Math.abs(y2 - y1)) };
        const marks = marksOf(unit.id), i = marks.findIndex(m => m.label === drag.label);
        if (rect.width < 0.2 || rect.depth < 0.2) { if (i >= 0) marks.splice(i, 1); drag.moved = false; }
        else { if (i >= 0) marks[i] = rect; else marks.push(rect); drag.moved = true; selectedMark = drag.label; }
        setStatus(drag.moved ? `영역 ${drag.label} ${mm(rect.width)} × ${mm(rect.depth)} mm` : '');
        paintSvg(); return;
      }
      if (drag.kind === 'room') {
        const room = unit.rooms.find(r => r.id === drag.id);
        const hit = snapOn && !event.ctrlKey ? snapRoomMove(unit, room, drag.x + dx, drag.y + dy, snapTolerance()) : { x: drag.x + dx, y: drag.y + dy, guides: [] };
        snapGuides = hit.guides;
        drag.moved = editRoom(unit, drag.id, { x: hit.snappedX ? hit.x : snap(drag.x + dx, 0.1), y: hit.snappedY ? hit.y : snap(drag.y + dy, 0.1) }) || drag.moved;
        refresh(); return;
      }
      if (drag.kind === 'resize') {
        restore(unit, drag.snapshot);
        const message = applyResize(unit, drag.id, drag.sides, drag.starts, dx, dy, linked !== event.altKey, snapOn && !event.ctrlKey);
        const room = unit.rooms.find(r => r.id === drag.id);
        drag.moved = drag.sides.some(side => Math.abs(sideValue(room, side) - drag.starts[side]) > 1e-4);
        setStatus(`${room.name} ${mm(room.width)} × ${mm(room.depth)} mm · ${fmt(room.width * room.depth)}㎡${message ? ' · ' + message : ''}`);
        paintSvg(); paintStats(); return;
      }
      // Re-apply the whole drag from its starting state, so snapping never accumulates.
      restore(unit, drag.snapshot);
      let result;
      if (drag.kind === 'vertex') result = moveVertex(unit, drag.index, snap(dx, 0.05), snap(dy, 0.05), { orthogonal });
      else {
        const edge = edgeInfo(unit.outline, drag.index);
        const delta = edge.horizontal ? dy : edge.vertical ? dx : (dx * -(edge.b[1] - edge.a[1]) + dy * (edge.b[0] - edge.a[0])) / edge.length;
        result = Math.abs(delta) < 0.025 ? { ok: true, edge: drag.index } : moveEdge(unit, drag.index, snap(delta, 0.05));
      }
      if (!result.ok) { restore(unit, drag.snapshot); setStatus(result.message); }
      else { drag.moved = Math.hypot(dx, dy) > 0.025; drag.result = result; }
      paintSvg(); paintStats();
    }
    function pointerEnd(event) {
      if (selectionPointer !== event.pointerId) return;
      const finished = drag; drag = null; selectionPointer = null;
      if (snapGuides.length) { snapGuides = []; paintSvg(); }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (finished && finished.kind === 'mark') {
        if (finished.moved) setStatus(`영역 ${finished.label}을(를) 표시했습니다. Claude 대화에서 ‘영역 ${finished.label}’로 요청하세요.`);
        refresh(); focusSelected(); return;
      }
      if (finished && finished.moved) {
        if (finished.result) syncSelection(finished.result);
        if ((finished.kind === 'vertex' || finished.kind === 'edge') && autoFill) fillUnit(active());
        if (finished.kind === 'vertex' || finished.kind === 'edge') setStatus('외곽을 변경했습니다.' + (autoFill ? ' 빈 영역을 자동으로 채웠습니다.' : ''));
        if (finished.kind === 'resize') { const room = active().rooms.find(r => r.id === finished.id); setStatus(`${room.name} ${fmt(finished.area)}㎡ → ${fmt(room.width * room.depth)}㎡ (${mm(room.width)} × ${mm(room.depth)} mm)`); }
        refresh(); markChanged();
      }
      focusSelected();
    }
    function pointerCancel(event) {
      if (selectionPointer !== event.pointerId) return;
      if (drag && drag.kind === 'mark') { const marks = marksOf(active().id), i = marks.findIndex(m => m.label === drag.label); if (i >= 0) marks.splice(i, 1); }
      if (drag && drag.kind === 'room') editRoom(active(), drag.id, { x: drag.x, y: drag.y });
      else if (drag && drag.kind === 'resize') restore(active(), drag.snapshot);
      else if (drag) restore(active(), drag.snapshot);
      drag = null; selectionPointer = null; snapGuides = []; refresh();
    }
    // Extruding a wall segment renumbers the outline; follow the edited edge or corner.
    function syncSelection(result) {
      if (result.edge !== undefined) selectedEdge = result.edge >= 0 ? result.edge : null;
      if (result.vertex !== undefined) selectedVertex = result.vertex >= 0 ? result.vertex : null;
    }
    function deleteVertex() {
      const result = removeVertex(active(), selectedVertex);
      if (!result.ok) { setStatus(result.message); return; }
      if (autoFill) fillUnit(active());
      selectedVertex = null; setStatus('꼭짓점을 삭제했습니다.'); refresh(); markChanged();
    }
    function splitAt(edge, at) {
      const result = splitEdge(active(), edge, at);
      if (!result.ok) { setStatus(result.message); return; }
      selectedEdge = result.edge; selectedVertex = null;
      setStatus('꺾임점 2개를 추가했습니다. 파란 가운데 변을 끌어 들어가거나 튀어나온 부분을 만드세요.'); refresh(); markChanged(); focusSelected();
    }
    function keyMove(event) {
      const step = event.shiftKey ? 0.5 : 0.1;
      const vector = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (mode === 'markup') {
        const g = event.target.closest('[data-mark]');
        if (g) selectedMark = g.dataset.mark;
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedMark) { event.preventDefault(); removeMark(selectedMark); }
        return;
      }
      if (mode === 'outline') {
        const v = event.target.closest('[data-vertex]'), e = event.target.closest('[data-edge]');
        if (v) { selectedVertex = Number(v.dataset.vertex); selectedEdge = null; }
        if (e) { selectedEdge = Number(e.dataset.edge); selectedVertex = null; }
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedVertex !== null) { event.preventDefault(); deleteVertex(); focusSelected(); return; }
        if (!vector || (selectedVertex === null && selectedEdge === null)) return;
        event.preventDefault();
        const unit = active();
        let result;
        if (selectedVertex !== null) result = moveVertex(unit, selectedVertex, vector[0], vector[1], { orthogonal });
        else {
          const edge = edgeInfo(unit.outline, selectedEdge);
          result = moveEdge(unit, selectedEdge, edge.horizontal ? vector[1] : edge.vertical ? vector[0] : vector[0] + vector[1]);
        }
        if (!result.ok) setStatus(result.message);
        else { syncSelection(result); if (autoFill) fillUnit(unit); refresh(); markChanged(); }
        focusSelected(); return;
      }
      const g = event.target.closest('[data-room]'); if (!g) return;
      selectedId = g.dataset.room;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); refresh(); focusSelected(); return; }
      if (!vector) return;
      if (event.altKey) {
        event.preventDefault();
        const room = active().rooms.find(r => r.id === selectedId), side = vector[0] ? 'right' : 'bottom';
        const result = resizeRoom(active(), room.id, side, sideValue(room, side) + (vector[0] || vector[1]), { linked });
        if (result.ok) { setStatus(`${room.name} ${mm(room.width)} × ${mm(room.depth)} mm`); refresh(); markChanged(); } else setStatus(result.message);
        focusSelected(); return;
      }
      event.preventDefault(); const room = active().rooms.find(r => r.id === selectedId), unitStep = event.shiftKey ? 0.5 : 0.1;
      if (editRoom(active(), room.id, { x: room.x + Math.sign(vector[0]) * unitStep, y: room.y + Math.sign(vector[1]) * unitStep })) { refresh(); markChanged(); }
      focusSelected();
    }
    function download(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = doc.createElement('a');
      a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    function chatLog(entry) { CHAT.log.push(Object.assign({ time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }, entry)); if (CHAT.log.length > 60) CHAT.log.shift(); paintChat(); }
    function paintChat() {
      const log = container.querySelector('[data-chat-log]');
      if (!log) return;
      log.innerHTML = CHAT.log.length ? CHAT.log.map((m, i) => {
        if (m.role === 'system') return `<div class="pu-msg system">${esc(m.text)}</div>`;
        // In sandboxed frames (chat app canvases) the clipboard may be blocked, so the prompt stays selectable.
        if (m.role === 'me') return `<div class="pu-msg me">${esc(m.text)}${m.copied ? '' : `<textarea class="pu-manual-copy" readonly rows="3" aria-label="요청문 직접 복사" onfocus="this.select()">${esc(m.prompt)}</textarea>`}<small>${esc(m.label)}${m.marks && m.marks.length ? ' · 영역 ' + m.marks.join(', ') : ''} · 개정 ${m.revision} · 요청문 ${m.copied ? '복사됨' : '자동 복사 안 됨'} · ${m.time}</small><button type="button" class="btn" data-chat-copy="${i}">${m.copied ? '요청문 다시 복사' : '요청문 복사'}</button></div>`;
        if (m.error) return `<div class="pu-msg claude bad"><b>적용할 수 없는 답변</b><br>${esc(m.error)}<small>${m.time}</small></div>`;
        return `<div class="pu-msg claude${m.issues.length ? ' bad' : ''}"><b>${esc(m.label)} 수정안</b>${m.summary ? '<br>' + esc(m.summary) : ''}<br>공간 ${m.rooms}개 · 외곽 ${fmt(m.outlineArea)}㎡ · 빈 영역 ${m.gapArea === null ? '—' : fmt(m.gapArea) + '㎡'}${m.issues.length ? '<br>' + m.issues.map(esc).join('<br>') : ''}
          ${m.applied ? '<small>적용됨 · 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다 · ' + m.time + '</small>' : `<br><button type="button" class="btn primary" data-chat-apply="${i}">이 수정안 적용</button><small>${m.time}</small>`}</div>`;
      }).join('') : '<div class="pu-msg system">① 요청을 쓰고 ‘요청 복사’ → Claude 채팅(이 세션 또는 claude.ai)에 붙여넣기<br>② Claude의 답변을 통째로 여기에 붙여넣고 ‘답변 검토’ → 적용</div>';
      log.querySelectorAll('[data-chat-copy]').forEach(b => b.addEventListener('click', async () => { const m = CHAT.log[Number(b.dataset.chatCopy)]; m.copied = await copyText(m.prompt) || m.copied; b.textContent = m.copied ? '복사했습니다' : '복사 실패 — 요청 파일 저장을 이용하세요'; }));
      log.querySelectorAll('[data-chat-apply]').forEach(b => b.addEventListener('click', () => applyFromChat(Number(b.dataset.chatApply))));
      log.scrollTop = log.scrollHeight;
    }
    function updateChatMode() {
      const input = container.querySelector('[data-chat-input]'), send = container.querySelector('[data-chat-send]');
      send.textContent = isReply(input.value) ? '답변 검토' : '요청 복사';
      send.disabled = !input.value.trim();
    }
    async function copyText(text) {
      try { await win.navigator.clipboard.writeText(text); return true; } catch (e) {
        const area = doc.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; doc.body.appendChild(area); area.select();
        let ok = false; try { ok = doc.execCommand('copy'); } catch (err) { ok = false; }
        area.remove(); return ok;
      }
    }
    function reviewReply(text) {
      try {
        const patch = extractJson(text), result = readUnitPatch(project, patch), r = result.report;
        const names = id => result.unit.rooms.find(x => x.id === id)?.name || id;
        chatLog({ role: 'claude', label: result.name, patch, summary: result.summary, rooms: result.unit.rooms.length, outlineArea: r.outlineArea, gapArea: r.gapArea,
          issues: r.outside.map(id => names(id) + ' 외곽 이탈').concat(r.hidden.map(id => names(id) + ' 위 레이어에 완전히 가려짐')), applied: false });
      } catch (e) { chatLog({ role: 'claude', error: e.message }); }
    }
    async function sendChat() {
      const input = container.querySelector('[data-chat-input]'), text = input.value.trim();
      if (!text) return;
      if (isReply(text)) reviewReply(text);
      else {
        const marks = marksOf(unitId), prompt = unitRequestPrompt(buildUnitRequest(project, unitId, text, marks)), copied = await copyText(prompt);
        chatLog({ role: 'me', text, label: active().name, marks: marks.map(m => m.label), revision: project.revision, copied, prompt });
        if (copied) chatLog({ role: 'system', text: 'Claude 채팅에 붙여넣고, 받은 답변을 여기에 붙여넣으세요.' });
      }
      input.value = ''; CHAT.draft = ''; updateChatMode(); input.focus();
    }
    function applyFromChat(index) {
      const entry = CHAT.log[index];
      if (!entry || !entry.patch || entry.applied) return;
      try {
        const result = applyUnitPatch(project, entry.patch);
        entry.applied = true; selectUnit(result.unitId); mode = 'rooms'; selectedEdge = selectedVertex = null;
        setStatus(`Claude 수정안을 적용했습니다.${result.summary ? ' · ' + result.summary.slice(0, 120) : ''}`);
        render(); markChanged();
      } catch (e) { chatLog({ role: 'claude', error: e.message }); }
    }
    function wireChat() {
      const input = container.querySelector('[data-chat-input]');
      input.addEventListener('input', () => { CHAT.draft = input.value; updateChatMode(); });
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendChat(); } });
      container.querySelector('[data-chat-send]').addEventListener('click', sendChat);
      const fileSave = container.querySelector('[data-chat-file-save]');
      if (fileSave) fileSave.addEventListener('click', () => {
        download(`unit-${unitId}-request-r${project.revision}.json`, JSON.stringify(buildUnitRequest(project, unitId, input.value, marksOf(unitId)), null, 2));
        chatLog({ role: 'system', text: `${active().name} 요청 파일을 저장했습니다 (개정 ${project.revision}).` });
      });
      container.querySelector('[data-chat-file]').addEventListener('change', async e => {
        const file = e.target.files[0]; e.target.value = '';
        if (!file) return;
        if (file.size > 2e6) { chatLog({ role: 'claude', error: '2 MB 이하 파일을 선택하세요.' }); return; }
        reviewReply(await file.text());
      });
      updateChatMode(); paintChat(); paintMarkChips();
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
        <div class="pu-combo-actions"><button class="btn" data-ref-save>동 유형으로 저장</button></div>
      </div></div></section>`;
  }

  function profileNote(profiles, source) {
    const rows = profiles.map(p => `<tr><td>${p.type}형</td><td>${fmt(p.width)} × ${fmt(p.depth)}</td><td>${p.area ? fmt(p.area) + '㎡' : '—'}</td><td>x ${fmt(p.door.x)} · y ${fmt(p.door.y)}</td><td>${p.rooms.length}개</td></tr>`).join('');
    const rev = [...new Set(profiles.map(p => p.revision).filter(v => v != null))].join(', ');
    return `<details class="pu-reference"><summary>사용한 세대 평면 (${esc(source)}${rev ? ' · Stage 1 개정 ' + esc(rev) : ''})</summary>
      <table class="pu-roomlist"><thead><tr><th>유형</th><th>외곽 W×D (m)</th><th>외곽 면적</th><th>현관 중심</th><th>실</th></tr></thead><tbody>${rows}</tbody></table>
      <p>외곽선과 실 구획은 Stage 1이 내보낸 세대 평면 JSON(apartment-planner-unit/1)을 그대로 씁니다. 현관은 현관 실의 북측 변 중앙이며, 이 점이 코어 면에 닿도록 세대를 붙입니다. 세대는 좌우를 뒤집어 붙일 수 있습니다.</p></details>`;
  }

  // Building-plan candidates as a standalone file (one or many), with the search settings that produced them.
  function exportCandidates(candidates, settings) {
    const list = (Array.isArray(candidates) ? candidates : [candidates]).map(c => JSON.parse(JSON.stringify(c)));
    return { schema: 'apartment-planner-building/1', coordinateUnit: 'm', areaUnit: '㎡', axes: 'x 오른쪽(동), y 아래(남), 원점 = 후보 외곽 좌상단',
      exportedAt: new Date().toISOString(), settings: settings || {}, count: list.length, candidates: list,
      note: '세대 외곽은 단위세대 평면 JSON, 코어 부품 치수와 규칙은 계획 가정 · 법규 적합 판정 아님 · 채광·피난·구조·설비 미검토' };
  }

  function candidateFileName(candidates, settings) {
    const list = Array.isArray(candidates) ? candidates : [candidates], c = list[0] || {};
    const mix = (c.unitMix || []).map(m => m.type + 'x' + m.count).join('-');
    return list.length > 1 ? `building-candidates-${c.unitsPerFloor || 0}u-${list.length}-f${(settings && settings.floors) || ''}.json`
      : `building-${c.unitsPerFloor || 0}u-${mix}-${String(c.id || '').replace(/[^0-9A-Za-z]+/g, '').slice(-10)}.json`;
  }

  // Saves text as a file; inside a chat artifact or canvas downloads may be blocked, so the same text is also shown for copying.
  function saveJsonFile(doc, name, text) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = doc.createElement('a');
      a.href = url; a.download = name; doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { /* the text panel below still has it */ }
    return { name, text };
  }
  function jsonPanel(json) {
    if (!json) return '';
    return `<details class="pu-reference pu-json" open><summary>JSON 텍스트 · ${esc(json.name)} (내려받기가 막힌 화면에서는 여기서 복사해 대화에 붙여 넣으세요)</summary>
      <div class="pu-combo-actions"><button class="btn" type="button" data-json-copy>복사</button><button class="btn" type="button" data-json-close>닫기</button></div>
      <textarea readonly data-json-text spellcheck="false">${esc(json.text)}</textarea></details>`;
  }
  function bindJsonPanel(root, onClose) {
    const ta = root.querySelector('[data-json-text]');
    if (!ta) return;
    root.querySelector('[data-json-copy]').addEventListener('click', e => {
      ta.focus(); ta.select();
      const done = ok => { e.target.textContent = ok ? '복사됨' : '선택됨 · Ctrl+C로 복사'; };
      try { navigator.clipboard.writeText(ta.value).then(() => done(true), () => done(root.ownerDocument.execCommand && root.ownerDocument.execCommand('copy'))); }
      catch (err) { done(root.ownerDocument.execCommand && root.ownerDocument.execCommand('copy')); }
    });
    root.querySelector('[data-json-close]').addEventListener('click', onClose);
  }

  // ── Manual editing of saved building candidates. Pure geometry helpers first (testable), then the editor view.
  // Units and core parts keep their drawn shape axis-aligned and carry a free rotation `angle` (degrees, clockwise on screen)
  // about the centre of their box. Checks and windows use the rotated shapes. A unit's door, windows and outline are edited
  // in the unit's own (unrotated) frame.
  const FACE_CW = { S: 'W', W: 'N', N: 'E', E: 'S' }, FACE_NAME = { S: '남향', E: '동향', W: '서향', N: '북향' }, FLIP_EW = { S: 'S', N: 'N', E: 'W', W: 'E' };
  const PART_SIZES = { stair: [2.7, 5.4, '계단실'], lift: [2.25, 2.35, '승강기'], shaft: [.9, 2.4, 'EPS·TPS·PS'], hall: [1.8, 3.6, '홀·복도'] };
  const FRONT = { S: [0, 1], E: [1, 0], N: [0, -1], W: [-1, 0] };
  const COMPASS = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'];
  const WINDOW_NEW = 1.5;

  const isEditable = t => Boolean(t && t.geometry && Array.isArray(t.geometry.units) && t.geometry.units.length && t.geometry.units.every(u => Array.isArray(u.outline) && Array.isArray(u.rects)) && t.geometry.core && Array.isArray(t.geometry.core.parts));
  const normAngle = a => { const v = ((Number(a) || 0) % 360 + 360) % 360; return round(v > 359.9995 ? 0 : v); };
  const rotPt = ([x, y], [cx, cy], deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
  const corners = r => [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
  const unitCentre = u => { const b = boxOf(u.rects); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; };
  const partCentre = p => [(p.rect[0] + p.rect[2]) / 2, (p.rect[1] + p.rect[3]) / 2];
  const unitPolys = u => u.rects.map(r => corners(r).map(q => rotPt(q, unitCentre(u), u.angle || 0)));
  const partPoly = p => corners(p.rect).map(q => rotPt(q, partCentre(p), p.angle || 0));
  const isRotated = t => t.geometry.units.some(u => normAngle(u.angle)) || t.geometry.core.parts.some(p => normAngle(p.angle));
  const toUnitFrame = (u, p) => rotPt(p, unitCentre(u), -(u.angle || 0));

  // Convex polygons overlap when no edge normal separates them; touching edges do not count.
  function polysOverlap(A, B) {
    for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], nx = y1 - y2, ny = x2 - x1;
      const proj = Q => Q.map(([x, y]) => x * nx + y * ny), a = proj(A), b = proj(B), len = Math.hypot(nx, ny) || 1;
      if (Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b)) <= 1e-4 * len) return false;
    }
    return true;
  }
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const polyDist = (A, B) => polysOverlap(A, B) ? 0 : Math.min(...A.map(p => Math.min(...B.map((q, i) => segDist(p, q, B[(i + 1) % B.length])))), ...B.map(p => Math.min(...A.map((q, i) => segDist(p, q, A[(i + 1) % A.length])))));
  const pointNearPoly = (p, P, tol) => { let inside = true; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < 0) inside = false; } if (inside) return true; return Math.min(...P.map((a, i) => segDist(p, a, P[(i + 1) % P.length]))) <= tol; };
  // Ray casting for any simple polygon (unit outlines are not convex).
  function insidePolygon([x, y], P) {
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Shared boundary between two parts: exact when both are unrotated, else "touching" when the shapes come within 2 cm.
  const partContact = (p, q) => !normAngle(p.angle) && !normAngle(q.angle) ? contactLength(p.rect, q.rect) : polyDist(partPoly(p), partPoly(q)) <= .02 ? DOOR : 0;

  // Moves a unit's whole drawing; sides of hand-placed windows follow quarter turns and mirroring.
  function mapUnit(u, fp, fr, sideMap) {
    const mapW = w => ({ ...w, a: fp(w.a), b: fp(w.b), side: sideMap ? sideMap[w.side] || w.side : w.side });
    return { ...u, outline: u.outline.map(fp), rects: u.rects.map(fr), rooms: (u.rooms || []).map(r => ({ ...r, rect: fr(r.rect) })),
      door: u.door ? u.door.map(fp) : null, centre: fp(u.centre), windows: [], manualWindows: u.windowsManual ? (u.manualWindows || []).map(mapW) : u.manualWindows };
  }
  const shiftPoint = (dx, dy) => ([x, y]) => [round(x + dx), round(y + dy)];
  const shiftRect = (dx, dy) => r => [round(r[0] + dx), round(r[1] + dy), round(r[2] + dx), round(r[3] + dy)];

  /* ---------- snapping (as in Stage 1): edges of other shapes as infinite lines, plus outline corners ---------- */
  // Lines on each axis from unrotated units and parts; `skip(kind, index)` leaves out the element being moved.
  function snapLines(t, skip) {
    const g = t.geometry, xs = new Set(), ys = new Set(), add = r => { xs.add(r[0]); xs.add(r[2]); ys.add(r[1]); ys.add(r[3]); };
    g.units.forEach((u, i) => { if ((skip && skip('unit', i)) || normAngle(u.angle)) return; u.rects.forEach(add); u.outline.forEach(([x, y]) => { xs.add(x); ys.add(y); }); });
    g.core.parts.forEach((p, i) => { if ((skip && skip('part', i)) || normAngle(p.angle)) return; add(p.rect); });
    return { x: [...xs], y: [...ys] };
  }
  // Nearest line to any of `values` (+ d) within tol: returns the corrected offset and the line hit.
  function snapAxis(values, lines, d, tol) {
    let best = null;
    for (const v of values) for (const l of lines) { const off = l - (v + d); if (Math.abs(off) <= tol && (!best || Math.abs(off) < Math.abs(best.off))) best = { off, line: l }; }
    return best ? { d: round(d + best.off), line: best.line } : { d: round(Math.round(d / .05) * .05), line: null };
  }
  const guidesFrom = (gx, gy) => [...(gx !== null ? [{ axis: 'x', value: gx }] : []), ...(gy !== null ? [{ axis: 'y', value: gy }] : []), ...(gx !== null && gy !== null ? [{ axis: 'point', x: gx, y: gy }] : [])];

  // Snaps a moved element so its nearest edge lands on another shape's line (per axis); rotated elements move on a 5 cm grid.
  function snapMove(t, sel, dx, dy, tol) {
    const g = t.geometry, el = sel.kind === 'unit' ? g.units[sel.i] : g.core.parts[sel.i], T = tol == null ? .3 : tol;
    if (!T || normAngle(el.angle)) { const grid = v => round(Math.round(v / .05) * .05); return { dx: grid(dx), dy: grid(dy), guides: [] }; }
    const b = boxOf(sel.kind === 'unit' ? el.rects : [el.rect]), lines = snapLines(t, (k, i) => k === sel.kind && i === sel.i);
    const sx = snapAxis([b[0], b[2]], lines.x, dx, T), sy = snapAxis([b[1], b[3]], lines.y, dy, T);
    return { dx: sx.d, dy: sy.d, guides: guidesFrom(sx.line, sy.line) };
  }

  function editMove(t, sel, dx, dy) {
    const c = clone(t), g = c.geometry;
    if (sel.kind === 'unit') g.units[sel.i] = mapUnit(g.units[sel.i], shiftPoint(dx, dy), shiftRect(dx, dy));
    else g.core.parts[sel.i].rect = shiftRect(dx, dy)(g.core.parts[sel.i].rect);
    return refreshEdited(c);
  }

  function editSetAngle(t, sel, deg) {
    const c = clone(t), el = sel.kind === 'unit' ? c.geometry.units[sel.i] : c.geometry.core.parts[sel.i];
    el.angle = normAngle(deg);
    return refreshEdited(c);
  }

  // Exact quarter turn clockwise (the drawn shape itself turns, the free angle is kept).
  function editRotate(t, sel) {
    const c = clone(t), g = c.geometry;
    if (sel.kind === 'unit') {
      const u = g.units[sel.i], [cx, cy] = unitCentre(u);
      const fp = ([x, y]) => [round(cx - (y - cy)), round(cy + (x - cx))], fr = r => rectOf([fp([r[0], r[1]]), fp([r[2], r[3]])]);
      const face = FACE_CW[u.face] || u.face;
      g.units[sel.i] = { ...mapUnit(u, fp, fr, FACE_CW), face, facing: FACE_NAME[face] || u.facing };
    } else {
      const p = g.core.parts[sel.i], [cx, cy] = partCentre(p), w = p.rect[2] - p.rect[0], h = p.rect[3] - p.rect[1];
      p.rect = [cx - h / 2, cy - w / 2, cx + h / 2, cy + w / 2].map(round);
      p.turn = (((p.turn || 0) + 1) % 4 + 4) % 4;
    }
    return refreshEdited(c);
  }

  function editMirror(t, sel) {
    const c = clone(t), g = c.geometry;
    if (sel.kind !== 'unit') return c;
    const u = g.units[sel.i], b = boxOf(u.rects), sx = b[0] + b[2];
    const fp = ([x, y]) => [round(sx - x), y], fr = r => [round(sx - r[2]), r[1], round(sx - r[0]), r[3]];
    const face = FLIP_EW[u.face] || u.face;
    g.units[sel.i] = { ...mapUnit(u, fp, fr, FLIP_EW), outline: u.outline.map(fp).reverse(), face, facing: FACE_NAME[face] || u.facing, mirrored: !u.mirrored, angle: normAngle(-(u.angle || 0)) };
    return refreshEdited(c);
  }

  const PART_MIN = .3, HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };

  // Drags one bounding-box handle of a core part. Unrotated parts snap the moving edges to other shapes' lines; rotated parts
  // take the pointer offset in their own frame so the opposite side stays put, in 5 cm steps. The result carries `guides`.
  function resizeRect(t, i, handle, dx, dy, tol) {
    const g = t.geometry, p = g.core.parts[i], r = p.rect, a = normAngle(p.angle), [hx, hy] = HANDLES[handle] || [0, 0], T = tol == null ? .3 : tol;
    if (!a) {
      const lines = T ? snapLines(t, (k, j) => k === 'part' && j === i) : { x: [], y: [] };
      const pick = (v, ls) => { const s = snapAxis([v], ls, 0, T); return { v: round(v + s.d), line: s.line }; };
      let [x0, y0, x1, y1] = r, gx = null, gy = null;
      if (hx < 0) { const s = pick(r[0] + dx, lines.x); x0 = Math.min(s.v, x1 - PART_MIN); gx = s.line; }
      if (hx > 0) { const s = pick(r[2] + dx, lines.x); x1 = Math.max(s.v, x0 + PART_MIN); gx = s.line; }
      if (hy < 0) { const s = pick(r[1] + dy, lines.y); y0 = Math.min(s.v, y1 - PART_MIN); gy = s.line; }
      if (hy > 0) { const s = pick(r[3] + dy, lines.y); y1 = Math.max(s.v, y0 + PART_MIN); gy = s.line; }
      const out = [x0, y0, x1, y1].map(round);
      out.guides = guidesFrom(gx, gy);
      return out;
    }
    const [lx, ly] = rotPt([dx, dy], [0, 0], -a), w = r[2] - r[0], h = r[3] - r[1];
    const step = v => Math.round(v / .05) * .05;
    const nw = Math.max(PART_MIN, w + (hx ? hx * step(lx) : 0)), nh = Math.max(PART_MIN, h + (hy ? hy * step(ly) : 0));
    // Shift of the centre in the part frame keeps the fixed side in place, then back to the drawing frame.
    const [ox, oy] = rotPt([hx * (nw - w) / 2, hy * (nh - h) / 2], [0, 0], a), [cx, cy] = partCentre(p);
    const out = [cx + ox - nw / 2, cy + oy - nh / 2, cx + ox + nw / 2, cy + oy + nh / 2].map(round);
    out.guides = [];
    return out;
  }

  function editResize(t, i, rect) {
    const c = clone(t), [x0, y0, x1, y1] = rect;
    c.geometry.core.parts[i].rect = [x0, y0, Math.max(x1, x0 + PART_MIN), Math.max(y1, y0 + PART_MIN)].map(round);
    return refreshEdited(c);
  }

  function editRemovePart(t, i) {
    const c = clone(t);
    c.geometry.core.parts.splice(i, 1);
    return refreshEdited(c);
  }

  // Adds a part with the given box, or with its default size centred on `at`, or just east of everything.
  function editAddPart(t, kind, rectOrPoint) {
    const c = clone(t), g = c.geometry, [w, h, name] = PART_SIZES[kind];
    let rect;
    if (rectOrPoint && rectOrPoint.length === 4) rect = rectOrPoint;
    else if (rectOrPoint && rectOrPoint.length === 2) rect = [rectOrPoint[0] - w / 2, rectOrPoint[1] - h / 2, rectOrPoint[0] + w / 2, rectOrPoint[1] + h / 2];
    else { const all = boxOf([...g.units.flatMap(u => u.rects), ...g.core.parts.map(p => p.rect)]); rect = [all[2] + 1, all[1], all[2] + 1 + w, all[1] + h]; }
    g.core.parts.push({ kind, name, rect: rect.map(round), angle: 0 });
    return refreshEdited(c);
  }

  /* ---------- unit outline, door and windows (unit frame) ---------- */
  function outlineEdge(u, e) {
    const n = u.outline.length, a = u.outline[e], b = u.outline[(e + 1) % n], horizontal = Math.abs(a[1] - b[1]) < EPS, vertical = Math.abs(a[0] - b[0]) < EPS;
    // Outward side: the side of the wall that is outside the unit.
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], side = horizontal ? (insidePolygon([m[0], m[1] + .05], u.outline) ? 'N' : 'S') : vertical ? (insidePolygon([m[0] + .05, m[1]], u.outline) ? 'W' : 'E') : null;
    return { a, b, horizontal, vertical, side, length: Math.hypot(b[0] - a[0], b[1] - a[1]) };
  }

  // Nearest straight wall of the outline to a point (unit frame), long enough for an opening of `len`.
  function nearestWall(u, p, len) {
    let best = null;
    u.outline.forEach((_, e) => {
      const w = outlineEdge(u, e);
      if (!(w.horizontal || w.vertical) || w.length < len - EPS) return;
      const d = segDist(p, w.a, w.b);
      if (!best || d < best.d) best = { ...w, e, d };
    });
    return best;
  }

  // Places an opening of length `len` on that wall, centred as near `p` as the wall allows; `lines` snap the centre.
  function openingOnWall(w, p, len, lines, tol) {
    const along = w.horizontal ? 0 : 1, lo = Math.min(w.a[along], w.b[along]) + len / 2, hi = Math.max(w.a[along], w.b[along]) - len / 2;
    let c = Math.min(Math.max(p[along], lo), hi), guide = null;
    if (tol) {
      // Either end of the opening, or its centre, lands on a nearby line (room walls of the unit).
      let best = null;
      for (const l of lines) for (const off of [-len / 2, 0, len / 2]) { const d = l - (c + off); if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, l }; }
      if (best && c + best.d >= lo - EPS && c + best.d <= hi + EPS) { c += best.d; guide = best.l; }
    }
    c = round(Math.round(c / .05) * .05 === c ? c : (guide !== null ? c : Math.round(c / .05) * .05));
    const fixed = w.horizontal ? w.a[1] : w.a[0], ends = [c - len / 2, c + len / 2].map(round);
    const pts = w.horizontal ? [[ends[0], fixed], [ends[1], fixed]] : [[fixed, ends[0]], [fixed, ends[1]]];
    return { a: pts[0], b: pts[1], guide: guide === null ? null : { axis: w.horizontal ? 'x' : 'y', value: guide } };
  }
  const roomLines = u => ({ x: (u.rooms || []).flatMap(r => [r.rect[0], r.rect[2]]), y: (u.rooms || []).flatMap(r => [r.rect[1], r.rect[3]]) });
  const linesAlong = (u, w) => w.horizontal ? roomLines(u).x : roomLines(u).y;
  // The room whose wall carries a window (for its label and category).
  function roomAt(u, a, b, side) {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], o = FRONT[side] || [0, 0], q = [m[0] - o[0] * .05, m[1] - o[1] * .05];
    return (u.rooms || []).find(r => q[0] >= r.rect[0] - EPS && q[0] <= r.rect[2] + EPS && q[1] >= r.rect[1] - EPS && q[1] <= r.rect[3] + EPS) || null;
  }

  function editMoveDoor(t, ui, p, tol) {
    const c = clone(t), u = c.geometry.units[ui], w = nearestWall(u, p, DOOR);
    if (!w) return { t, guides: [] };
    const o = openingOnWall(w, p, DOOR, linesAlong(u, w), tol);
    u.door = [o.a, o.b];
    return { t: refreshEdited(c), guides: o.guide ? [o.guide] : [] };
  }
  function editDeleteDoor(t, ui) { const c = clone(t); c.geometry.units[ui].door = null; return refreshEdited(c); }

  // Windows become hand-placed for a unit on its first window edit (the current automatic ones are kept as the start).
  function manualWindowsOf(u) {
    if (u.windowsManual) return u.manualWindows || [];
    return (u.windows || []).map(w => ({ a: w.a, b: w.b, length: w.length, side: w.side || w.dir, room: w.room, category: w.category }));
  }
  function setManual(u, list) { u.windowsManual = true; u.manualWindows = list.map(w => ({ ...w, length: round(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])) })); }

  function editMoveWindow(t, ui, k, p, tol) {
    const c = clone(t), u = c.geometry.units[ui], list = manualWindowsOf(u), cur = list[k];
    if (!cur) return { t, guides: [] };
    const len = Math.max(WINDOW_MIN, cur.length || Math.hypot(cur.b[0] - cur.a[0], cur.b[1] - cur.a[1])), w = nearestWall(u, p, Math.min(len, WINDOW_MIN));
    if (!w) return { t, guides: [] };
    const fit = Math.min(len, w.length), o = openingOnWall(w, p, fit, linesAlong(u, w), tol), room = roomAt(u, o.a, o.b, w.side);
    list[k] = { ...cur, a: o.a, b: o.b, side: w.side, room: room ? room.name : '창', category: room ? room.category : 'window' };
    setManual(u, list);
    return { t: refreshEdited(c), guides: o.guide ? [o.guide] : [] };
  }
  function editAddWindow(t, ui, p, len) {
    const c = clone(t), u = c.geometry.units[ui], w = nearestWall(u, p, WINDOW_MIN);
    if (!w) return t;
    const o = openingOnWall(w, p, Math.min(len || WINDOW_NEW, w.length - .1), [], 0), room = roomAt(u, o.a, o.b, w.side);
    setManual(u, [...manualWindowsOf(u), { a: o.a, b: o.b, side: w.side, room: room ? room.name : '창', category: room ? room.category : 'window' }]);
    return refreshEdited(c);
  }
  function editDeleteWindow(t, ui, k) { const c = clone(t), u = c.geometry.units[ui], list = manualWindowsOf(u); list.splice(k, 1); setManual(u, list); return refreshEdited(c); }
  function editAutoWindows(t, ui) { const c = clone(t), u = c.geometry.units[ui]; u.windowsManual = false; delete u.manualWindows; return refreshEdited(c); }

  // Push/pull one straight wall of a unit outline by `delta` (unit frame, + = towards +x/+y), as in Stage 1: rooms lying along
  // that wall follow it, a wall that is part of a longer straight run is extruded, and the door/hand-placed windows on it move too.
  function moveOutlineEdge(t, ui, e, delta) {
    const c = clone(t), u = c.geometry.units[ui], n = u.outline.length;
    if (!Number.isFinite(delta)) return { ok: false, t, message: '이동 거리가 올바르지 않습니다.' };
    if (Math.abs(delta) < 1e-4) return { ok: true, t };
    const w = outlineEdge(u, e);
    if (!w.horizontal && !w.vertical) return { ok: false, t, message: '사선 벽은 밀고 당길 수 없습니다.' };
    const ax = w.horizontal ? 1 : 0, along = 1 - ax, line = w.a[ax], lo = Math.min(w.a[along], w.b[along]), hi = Math.max(w.a[along], w.b[along]);
    const onWall = q => Math.abs(q[ax] - line) < 1e-3 && q[along] >= lo - 1e-3 && q[along] <= hi + 1e-3;
    for (const r of u.rooms || []) {
      const s = r.rect[along], f = r.rect[along + 2];
      if (s < lo - 1e-3 || f > hi + 1e-3 || f - s <= 1e-3) continue;
      const nearIdx = ax, farIdx = ax + 2;
      const k = Math.abs(r.rect[nearIdx] - line) < 1e-3 ? nearIdx : Math.abs(r.rect[farIdx] - line) < 1e-3 ? farIdx : -1;
      if (k < 0) continue;
      r.rect[k] = round(r.rect[k] + delta);
      if (r.rect[farIdx] - r.rect[nearIdx] < PART_MIN) return { ok: false, t, message: `${r.name}이(가) 너무 작아집니다.` };
    }
    // A segment of a longer straight wall is extruded: keep the original corners so the connectors stay square.
    const poly = u.outline.map(q => q.slice()), parallel = i => { const v = outlineEdge(u, (i + n) % n); return w.horizontal ? v.horizontal : v.vertical; };
    const keepA = parallel(e - 1), keepB = parallel(e + 1), A = poly[e], B = poly[(e + 1) % n], oldA = A.slice(), oldB = B.slice();
    A[ax] = round(A[ax] + delta); B[ax] = round(B[ax] + delta);
    let next = [];
    poly.forEach((q, i) => { if (i === e && keepA) next.push(oldA); next.push(q); if (i === (e + 1) % n && keepB) next.push(oldB); });
    // Drop repeated corners and straight-through points left when a notch is pushed flat.
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < next.length && next.length > 3; i++) {
        const p0 = next[(i - 1 + next.length) % next.length], p1 = next[i], p2 = next[(i + 1) % next.length];
        const same = Math.abs(p0[0] - p1[0]) < EPS && Math.abs(p0[1] - p1[1]) < EPS, straight = (Math.abs(p0[0] - p1[0]) < EPS && Math.abs(p1[0] - p2[0]) < EPS) || (Math.abs(p0[1] - p1[1]) < EPS && Math.abs(p1[1] - p2[1]) < EPS);
        if (same || straight) { next.splice(i, 1); changed = true; break; }
      }
    }
    const rects = polygonRects(next), shoelace = Math.abs(next.reduce((s, p, i) => { const q = next[(i + 1) % next.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    if (next.length < 4 || !rects.length || Math.abs(unionArea(rects) - shoelace) > 1e-3) return { ok: false, t, message: '외곽선이 꼬여서 적용할 수 없습니다.' };
    if (u.door && onWall(u.door[0]) && onWall(u.door[1])) u.door = u.door.map(q => { const v = q.slice(); v[ax] = round(v[ax] + delta); return v; });
    if (u.windowsManual) u.manualWindows = (u.manualWindows || []).map(win => onWall(win.a) && onWall(win.b) ? { ...win, a: win.a.map((v, i) => i === ax ? round(v + delta) : v), b: win.b.map((v, i) => i === ax ? round(v + delta) : v) } : win);
    u.outline = next.map(q => q.map(round)); u.rects = rects;
    const nb = boxOf(rects); u.width = round(nb[2] - nb[0]); u.depth = round(nb[3] - nb[1]);
    return { ok: true, t: refreshEdited(c) };
  }

  function compassOf(vx, vy) { const a = (Math.atan2(vy, vx) * 180 / Math.PI + 360) % 360; return COMPASS[Math.round(a / 45) % 8]; }
  function face4Of(vx, vy) { return Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'E' : 'W') : (vy > 0 ? 'S' : 'N'); }

  // Windows for edited layouts with rotation: candidate spans from the unit's own outline, blocked where a neighbour
  // (taken into the unit's frame) sits within 5 cm outside the wall. Sampled every 10 cm.
  function computeWindowsRotated(units, parts) {
    return units.map((u, ui) => {
      const own = computeWindows([{ ...u, windows: [] }], [])[0], c = unitCentre(u), a = u.angle || 0;
      const others = [...units.filter((_, j) => j !== ui).flatMap(unitPolys), ...parts.map(partPoly)].map(P => P.map(q => rotPt(q, c, -a)));
      const out = [];
      for (const w of own) {
        const [nx, ny] = FRONT[w.dir], len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), n = Math.max(1, Math.round(len / .1));
        let run = null;
        const flush = k => { if (run !== null && (k - run) / n * len >= WINDOW_MIN - EPS) { const f = s => [round(w.a[0] + (w.b[0] - w.a[0]) * s), round(w.a[1] + (w.b[1] - w.a[1]) * s)]; out.push({ ...w, a: f(run / n), b: f(k / n), length: round((k - run) / n * len) }); } run = null; };
        for (let k = 0; k < n; k++) {
          const s = (k + .5) / n, p = [w.a[0] + (w.b[0] - w.a[0]) * s + nx * .05, w.a[1] + (w.b[1] - w.a[1]) * s + ny * .05];
          if (others.some(P => pointNearPoly(p, P, 0))) flush(k); else if (run === null) run = k;
        }
        flush(n);
      }
      // `side` stays in the unit frame (for editing); `dir` is the side turned by the unit's angle.
      return out.map(w => { const [vx, vy] = rotPt(FRONT[w.dir], [0, 0], a); return { ...w, side: w.dir, dir: face4Of(vx, vy), compass: compassOf(vx, vy) }; });
    });
  }

  // Recomputes everything derived from the geometry: core extent, common area, windows, facings, footprint.
  function refreshEdited(t) {
    const g = t.geometry, parts = g.core.parts, rotated = isRotated(t);
    const polys = [...g.units.flatMap(unitPolys), ...parts.map(partPoly)], pts = polys.flat();
    const box = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))].map(round);
    const cpts = parts.map(partPoly).flat(), cbox = cpts.length ? [Math.min(...cpts.map(p => p[0])), Math.min(...cpts.map(p => p[1])), Math.max(...cpts.map(p => p[0])), Math.max(...cpts.map(p => p[1]))].map(round) : [0, 0, 0, 0];
    g.core = { ...g.core, rects: parts.map(p => p.rect), x: cbox[0], y: cbox[1], width: round(cbox[2] - cbox[0]), depth: round(cbox[3] - cbox[1]) };
    // Units' fronts: the face turned by the free angle. Rooms remember how far they already stuck out when editing began.
    g.units.forEach(u => {
      (u.rooms || []).forEach(r => { if (r.outsideBase == null) r.outsideBase = roomOutside(r, u.rects); });
      const a = normAngle(u.angle), [vx, vy] = rotPt(FRONT[u.face] || [0, 1], [0, 0], a);
      u.angle = a; u.facingDir = face4Of(vx, vy);
      u.facing = a % 90 ? compassOf(vx, vy) + '향 (' + Math.round(a) + '°)' : FACE_NAME[face4Of(vx, vy)];
    });
    parts.forEach(p => { p.angle = normAngle(p.angle); });
    const order = { S: 0, E: 1, W: 2, N: 3 }, total = g.units.reduce((s, u) => s + u.type, 0), n = g.units.length;
    // With rotated parts the common area is the plain sum (overlaps between core parts are flagged by the checks).
    const common = !parts.length ? 0 : parts.some(p => p.angle) ? round(parts.reduce((s, p) => s + (p.rect[2] - p.rect[0]) * (p.rect[3] - p.rect[1]), 0)) : unionArea(parts.map(p => p.rect));
    Object.assign(t, { width: round(box[2] - box[0]), depth: round(box[3] - box[1]), footprintArea: round((box[2] - box[0]) * (box[3] - box[1])),
      commonArea: common, coreArea: common, coreOnlyArea: common, unitsPerFloor: n, totalUnitArea: total, nominalArea: total, unitArea: round(total / n),
      southCount: g.units.filter(u => u.facingDir === 'S').length, facings: [...g.units].sort((a, b) => (order[a.facingDir] || 0) - (order[b.facingDir] || 0)).map(u => u.facing) });
    if (t.core) t.core = { ...t.core, width: g.core.width, depth: g.core.depth };
    if (!rotated) attachWindows(t);
    else { const windows = computeWindowsRotated(g.units, parts); g.units.forEach((u, i) => { u.windows = windows[i]; }); }
    // Hand-placed windows replace the automatic ones for that unit; their direction follows the unit's turn.
    g.units.forEach(u => {
      if (!u.windowsManual) { u.windows = (u.windows || []).map(w => ({ ...w, side: w.side || w.dir })); return; }
      u.windows = (u.manualWindows || []).map(w => { const [vx, vy] = rotPt(FRONT[w.side] || [0, 1], [0, 0], u.angle || 0); return { ...w, dir: face4Of(vx, vy), length: round(Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])) }; });
    });
    t.windows = windowSummary(g.units.map(u => u.windows), g.units);
    return t;
  }

  // Moves the geometry so its rotated extent starts at 0,0 (done on save).
  function normalizeEdited(t) {
    const g = t.geometry, pts = [...g.units.flatMap(unitPolys), ...g.core.parts.map(partPoly)].flat();
    const dx = -Math.min(...pts.map(p => p[0])), dy = -Math.min(...pts.map(p => p[1])), c = clone(t);
    c.geometry.units = c.geometry.units.map(u => mapUnit(u, shiftPoint(dx, dy), shiftRect(dx, dy)));
    c.geometry.core.parts = c.geometry.core.parts.map(p => ({ ...p, rect: shiftRect(dx, dy)(p.rect) }));
    return refreshEdited(c);
  }

  const roomOutside = (r, rects) => round((r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1]) - rects.reduce((s, q) => s + Math.max(0, Math.min(q[2], r.rect[2]) - Math.max(q[0], r.rect[0])) * Math.max(0, Math.min(q[3], r.rect[3]) - Math.max(q[1], r.rect[1])), 0));

  function checkEdited(t) {
    const g = t.geometry, units = g.units, parts = g.core.parts, halls = parts.filter(p => p.kind === 'hall'), solid = parts.filter(p => p.kind !== 'hall');
    const issues = [], up = units.map(unitPolys), pp = parts.map(partPoly), label = p => p.name || p.kind;
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) if (up[i].some(A => up[j].some(B => polysOverlap(A, B)))) issues.push(`세대 ${i + 1}·${j + 1} 겹침`);
      parts.forEach((p, k) => { if (up[i].some(A => polysOverlap(A, pp[k]))) issues.push(`세대 ${i + 1}과 ${label(p)} 겹침`); });
      const u = units[i];
      if (!u.door) issues.push(`세대 ${i + 1} 현관 없음`);
      else {
        const mid = rotPt([(u.door[0][0] + u.door[1][0]) / 2, (u.door[0][1] + u.door[1][1]) / 2], unitCentre(u), u.angle || 0);
        if (!halls.some(h => pointNearPoly(mid, partPoly(h), .02))) issues.push(`세대 ${i + 1} 현관이 홀에 닿지 않음`);
      }
      // Rooms pushed outside the outline by an edit (a room already sticking out in the unit plan is not reported again).
      for (const r of u.rooms || []) {
        const out = roomOutside(r, u.rects);
        if (out - (r.outsideBase == null ? out : r.outsideBase) > .01) { issues.push(`세대 ${i + 1} ${r.name}이(가) 외곽선 밖으로 나감`); break; }
      }
    }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (polysOverlap(partPoly(solid[i]), partPoly(solid[j]))) issues.push(`${label(solid[i])}·${label(solid[j])} 겹침`);
    for (const p of solid) if (halls.some(h => polysOverlap(partPoly(h), partPoly(p)))) issues.push(`${label(p)}이 홀과 겹침`);
    // A stair may reach the hall through its lobby (special escape stair).
    const lobbies = parts.filter(p => p.kind === 'lobby' && halls.reduce((s, h) => s + partContact(p, h), 0) >= DOOR - EPS);
    for (const p of solid.filter(p => p.kind === 'stair' || p.kind === 'lift')) {
      const via = p.kind === 'stair' ? [...halls, ...lobbies] : halls;
      if (via.reduce((s, h) => s + partContact(p, h), 0) < DOOR - EPS) issues.push(`${label(p)} 출입이 홀에 닿지 않음`);
    }
    if (!parts.some(p => p.kind === 'stair')) issues.push('계단 없음');
    return issues;
  }

  const rotAttr = (a, c) => normAngle(a) ? ` transform="rotate(${normAngle(a)} ${round(c[0])} ${round(c[1])})"` : '';

  // view: { sel, preview, guides, hit } — hit is the grab width for walls and openings in drawing units.
  function editorSvg(t, view) {
    const { sel, preview, guides } = view || {}, g = t.geometry, pts = [...g.units.flatMap(unitPolys), ...g.core.parts.map(partPoly)].flat();
    const b = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))], pad = 4;
    const stroke = { 59: '#3f7f8f', 74: '#4f6fa5', 84: '#6d5ca0' }, vw = b[2] - b[0] + pad * 2, hit = round(Math.max(.5, vw / 70));
    const isSel = (k, i) => sel && sel.kind === k && sel.i === i, unitActive = i => sel && (sel.kind === 'unit' || sel.kind === 'door' || sel.kind === 'window' || sel.kind === 'edge') && sel.i === i;
    const guideSvg = (guides || []).map(gd => gd.axis === 'x' ? `<line x1="${gd.value}" y1="${round(b[1] - pad)}" x2="${gd.value}" y2="${round(b[3] + pad)}" class="pu-ed-guide"/>`
      : gd.axis === 'y' ? `<line x1="${round(b[0] - pad)}" y1="${gd.value}" x2="${round(b[2] + pad)}" y2="${gd.value}" class="pu-ed-guide"/>`
      : `<circle cx="${gd.x}" cy="${gd.y}" r="${round(hit * .35)}" fill="none" stroke="#d6337a" stroke-width="${round(hit / 8)}" pointer-events="none"/>`).join('');
    return `<svg class="pu-ed-canvas" viewBox="${round(b[0] - pad)} ${round(b[1] - pad)} ${round(vw)} ${round(b[3] - b[1] + pad * 2)}" data-ed-svg>
      <defs><pattern id="pu-ed-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#e6edf3" stroke-width=".03"/></pattern></defs>
      <rect x="${round(b[0] - pad * 4)}" y="${round(b[1] - pad * 4)}" width="${round(vw + pad * 6)}" height="${round(b[3] - b[1] + pad * 8)}" fill="url(#pu-ed-grid)" data-ed-bg/>
      ${g.units.map((u, i) => `<g class="pu-ed-item${unitActive(i) ? ' selected' : ''}" data-sel="unit:${i}"${rotAttr(u.angle, unitCentre(u))}>
        ${(u.rooms || []).map(r => `<rect x="${r.rect[0]}" y="${r.rect[1]}" width="${round(r.rect[2] - r.rect[0])}" height="${round(r.rect[3] - r.rect[1])}" fill="${ROOM_FILL[r.category] || '#eef2f6'}" stroke="#b8c6d3" stroke-width=".05"/>`).join('')}
        <polygon points="${u.outline.map(p => p.join(',')).join(' ')}" fill="${(u.rooms || []).length ? 'none' : '#e6edf4'}" stroke="${unitActive(i) ? '#1262cb' : stroke[u.type] || '#58768f'}" stroke-width="${unitActive(i) ? .32 : .18}"/>
        <text x="${u.centre[0]}" y="${u.centre[1] - .1}" text-anchor="middle" font-size="1.6" font-weight="750" fill="${stroke[u.type] || '#2f5270'}" paint-order="stroke" stroke="#fff" stroke-width=".35" pointer-events="none">${u.type}</text>
        <text x="${u.centre[0]}" y="${u.centre[1] + 1.2}" text-anchor="middle" font-size=".85" fill="#4f667a" paint-order="stroke" stroke="#fff" stroke-width=".25" pointer-events="none">${esc(u.facing || '')}</text>
        ${unitActive(i) ? u.outline.map((p, e) => { const q = u.outline[(e + 1) % u.outline.length], w = outlineEdge(u, e); return w.horizontal || w.vertical ? `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" class="pu-ed-wall ${w.horizontal ? 'h' : 'v'}${sel.kind === 'edge' && sel.e === e ? ' active' : ''}" stroke-width="${hit}" data-edge="${i}:${e}"><title>끌어서 벽 밀고 당기기 · 두 번 눌러 창 추가</title></line>` : ''; }).join('') : ''}
        ${(u.windows || []).map((w, k) => { const on = isSel('window', i) && sel.k === k; return `<line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" stroke="${on ? '#0b6fa4' : '#2aa6d8'}" stroke-width="${on ? .55 : .38}"/><line x1="${w.a[0]}" y1="${w.a[1]}" x2="${w.b[0]}" y2="${w.b[1]}" class="pu-ed-open" stroke-width="${hit}" data-win="${i}:${k}"><title>${esc(w.room || '창')} 창 · 끌어서 옮기기</title></line>${on ? delMark([(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2], w.side, hit, 'del-win') : ''}`; }).join('')}
        ${u.door ? `<line x1="${u.door[0][0]}" y1="${u.door[0][1]}" x2="${u.door[1][0]}" y2="${u.door[1][1]}" stroke="${isSel('door', i) ? '#b4580f' : '#e08a2e'}" stroke-width="${isSel('door', i) ? .7 : .5}"/><line x1="${u.door[0][0]}" y1="${u.door[0][1]}" x2="${u.door[1][0]}" y2="${u.door[1][1]}" class="pu-ed-open" stroke-width="${hit}" data-door="${i}"><title>현관 · 끌어서 옮기기</title></line>${isSel('door', i) ? delMark([(u.door[0][0] + u.door[1][0]) / 2, (u.door[0][1] + u.door[1][1]) / 2], doorSide(u), hit, 'del-door') : ''}` : ''}
        ${isSel('unit', i) ? handlesSvg(boxOf(u.rects), vw, false) : ''}</g>`).join('')}
      ${g.core.parts.map((p, i) => `<g class="pu-ed-item${isSel('part', i) ? ' selected' : ''}" data-sel="part:${i}"${rotAttr(p.angle, partCentre(p))}>${coreParts([p])}</g>`).join('')}
      ${sel && sel.kind === 'part' && g.core.parts[sel.i] ? `<g${rotAttr(g.core.parts[sel.i].angle, partCentre(g.core.parts[sel.i]))}>${handlesSvg(g.core.parts[sel.i].rect, vw, true)}</g>` : ''}
      ${preview ? `<rect x="${preview[0]}" y="${preview[1]}" width="${round(preview[2] - preview[0])}" height="${round(preview[3] - preview[1])}" fill="rgba(31,98,180,.15)" stroke="#1262cb" stroke-width=".1" stroke-dasharray=".3 .2" pointer-events="none"/>` : ''}
      ${guideSvg}
    </svg>`;
  }
  // The straight wall an opening ([a,b] pair or {a,b}) sits on.
  const openingWall = (u, o) => { if (!o) return null; const a = o.a || o[0], b = o.b || o[1], w = nearestWall(u, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 0); return w && w.d < .05 ? w : null; };
  const doorSide = u => { const w = nearestWall(u, [(u.door[0][0] + u.door[1][0]) / 2, (u.door[0][1] + u.door[1][1]) / 2], 0); return w ? w.side : 'N'; };
  // A small × just outside the wall, to delete the selected door or window.
  function delMark(m, side, hit, handle) {
    const o = FRONT[side] || [0, -1], r = round(hit * .55), cx = round(m[0] + o[0] * hit * 1.3), cy = round(m[1] + o[1] * hit * 1.3);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#c0392b" stroke-width="${round(r / 4)}" data-handle="${handle}"><title>삭제</title></circle><text x="${cx}" y="${round(cy + r * .45)}" text-anchor="middle" font-size="${round(r * 1.5)}" fill="#c0392b" pointer-events="none">×</text>`;
  }

  // Selection box: eight resize handles (parts only), a rotate handle above and a delete handle at the top right (parts only).
  function handlesSvg(r, viewWidth, isPart) {
    const hs = round(Math.max(.35, viewWidth / 75)), cx = round((r[0] + r[2]) / 2), cy = round((r[1] + r[3]) / 2), sw = round(hs / 6);
    const at = { nw: [r[0], r[1]], n: [cx, r[1]], ne: [r[2], r[1]], e: [r[2], cy], se: [r[2], r[3]], s: [cx, r[3]], sw: [r[0], r[3]], w: [r[0], cy] };
    const ry = round(r[1] - hs * 2.6), dx = round(r[2] + hs * 1.4), dy = round(r[1] - hs * 1.4);
    return `<g class="pu-ed-handles"><rect x="${r[0]}" y="${r[1]}" width="${round(r[2] - r[0])}" height="${round(r[3] - r[1])}" fill="none" stroke="#1262cb" stroke-width="${sw}" stroke-dasharray="${hs / 2} ${hs / 3}" pointer-events="none"/>
      <line x1="${cx}" y1="${r[1]}" x2="${cx}" y2="${ry}" stroke="#1262cb" stroke-width="${sw}" pointer-events="none"/>
      <circle cx="${cx}" cy="${ry}" r="${round(hs * .7)}" fill="#fff" stroke="#1262cb" stroke-width="${round(sw * 1.4)}" data-handle="rot"><title>끌어서 자유 회전 (Shift 15° 단위)</title></circle>
      <text x="${cx}" y="${round(ry + hs * .32)}" text-anchor="middle" font-size="${round(hs * .95)}" fill="#1262cb" pointer-events="none">↻</text>
      ${isPart ? `<circle cx="${dx}" cy="${dy}" r="${round(hs * .62)}" fill="#fff" stroke="#c0392b" stroke-width="${round(sw * 1.4)}" data-handle="del"><title>부품 삭제</title></circle><text x="${dx}" y="${round(dy + hs * .32)}" text-anchor="middle" font-size="${round(hs * .95)}" fill="#c0392b" pointer-events="none">×</text>` : ''}
      ${isPart ? Object.entries(at).map(([k, [x, y]]) => `<rect x="${round(x - hs / 2)}" y="${round(y - hs / 2)}" width="${hs}" height="${hs}" fill="#fff" stroke="#1262cb" stroke-width="${round(sw * 1.4)}" data-handle="${k}"/>`).join('') : ''}</g>`;
  }

  // Reads building JSON back in (a file saved here, or text edited in a chat): apartment-planner-building/1 with candidates,
  // or one candidate object. Each is re-derived (windows, areas, facings) and gets an id that does not clash with `taken`.
  function importCandidates(text, taken) {
    let data;
    try { data = typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return { added: [], errors: ['JSON 형식이 아닙니다: ' + e.message] }; }
    if (data && data.schema && data.schema !== 'apartment-planner-building/1') return { added: [], errors: ['지원하지 않는 형식입니다: ' + data.schema] };
    if (data && data.coordinateUnit && data.coordinateUnit !== 'm') return { added: [], errors: ['좌표 단위는 m여야 합니다.'] };
    const list = Array.isArray(data && data.candidates) ? data.candidates : Array.isArray(data) ? data : [data];
    const ids = new Set(taken || []), added = [], errors = [];
    list.forEach((c, n) => {
      const where = `후보 ${n + 1}${c && c.name ? ' (' + c.name + ')' : ''}`;
      if (!isEditable(c)) { errors.push(where + ': 세대 외곽·코어 부품 형상이 없습니다.'); return; }
      const bad = c.geometry.units.findIndex(u => !TYPES.includes(Number(u.type)) || u.outline.length < 4 || u.outline.some(p => !Array.isArray(p) || !p.every(Number.isFinite)));
      if (bad >= 0) { errors.push(where + `: 세대 ${bad + 1} 형상이 올바르지 않습니다.`); return; }
      if (c.geometry.core.parts.some(p => !Array.isArray(p.rect) || p.rect.length !== 4 || !p.rect.every(Number.isFinite) || p.rect[2] - p.rect[0] < PART_MIN - EPS || p.rect[3] - p.rect[1] < PART_MIN - EPS)) { errors.push(where + ': 코어 부품 치수가 올바르지 않습니다.'); return; }
      const t = refreshEdited(clone(c));
      let id = String(t.id || 'imported'), k = 1;
      while (ids.has(id)) id = String(t.id || 'imported') + '-' + (++k);
      ids.add(id);
      Object.assign(t, { id, name: String(t.name || '불러온 동 유형').slice(0, 100), sourceUnitIds: Array.isArray(t.sourceUnitIds) ? t.sourceUnitIds.filter(v => typeof v === 'string') : [], imported: true });
      added.push(t);
    });
    return { added, errors };
  }

  function mountEditor(container, project, onChange, startIndex) {
    let index = Number.isInteger(startIndex) ? startIndex : project.typologies.findIndex(isEditable), draft = null, original = null, sel = null, undo = [], drag = null, status = '', tool = null, snapOn = true, guides = [], lastWallTap = null, lastJson = null, importOpen = false, importMsg = '';
    const load = i => { index = i; original = project.typologies[i] ? clone(project.typologies[i]) : null; draft = isEditable(original) ? refreshEdited(clone(original)) : null; sel = null; undo = []; tool = null; };
    load(index);
    const change = next => { undo.push(draft); if (undo.length > 80) undo.shift(); draft = next; render(); focusCanvas(); };
    const focusCanvas = () => { const w = container.querySelector('[data-ed-wrap]'); if (w) w.focus({ preventScroll: true }); };
    const fmt3 = v => round(v).toFixed(2);
    const TOOLS = { ...Object.fromEntries(Object.entries(PART_SIZES).map(([k, v]) => [k, v[2]])), door: '현관 놓기', window: '창 추가' };
    function render() {
      const list = project.typologies.map((t, i) => `<button type="button" class="pu-ed-row${i === index ? ' active' : ''}" data-ed-pick="${i}" ${isEditable(t) ? '' : 'disabled'}><strong>${esc(t.name)}</strong><small>${t.unitsPerFloor}세대 · ${fmt(t.width)} × ${fmt(t.depth)}m${t.edited ? ' · 수정됨' : ''}${isEditable(t) ? '' : ' · 편집 불가(형상 없음)'}</small></button>`).join('');
      if (!draft) { container.innerHTML = `<div class="pu-ed"><aside class="panel pu-ed-list"><h3>저장한 동 유형</h3>${list || '<p class="pu-note">후보 탐색에서 "후보 저장"한 안이 여기에 나옵니다.</p>'}${importBox()}</aside><div class="panel pu-empty">편집할 안을 고르세요. 세대 외곽과 코어 부품이 있는 안만 편집할 수 있습니다.</div></div>`; bindList(); bindImport(); return; }
      const issues = checkEdited(draft), g = draft.geometry;
      container.innerHTML = `<div class="pu-ed">
        <aside class="panel pu-ed-list"><h3>저장한 동 유형</h3>${list}${importBox()}</aside>
        <section class="panel pu-ed-main"><div class="pu-toolbar"><h3>${esc(draft.name)} 편집</h3><span class="tag ${issues.length ? 'amber' : 'green'}">${issues.length ? '검토 필요 ' + issues.length : '겹침·연결 문제 없음'}</span></div>
          <div class="pu-ed-tools"><span class="section-label">그리기</span>${Object.entries(TOOLS).map(([k, v]) => `<button class="btn${tool === k ? ' primary' : ''}" type="button" data-ed-tool="${k}">${v}</button>`).join('')}${tool ? '<button class="btn" type="button" data-ed-tool="">끝내기 (Esc)</button>' : ''}
            <label class="pu-ed-snap" title="Ctrl을 누르는 동안 잠시 해제"><input type="checkbox" data-ed-snap ${snapOn ? 'checked' : ''}>스냅</label></div>
          <p class="pu-note">${tool ? toolHint() : '세대·부품을 눌러 고르고 끌어서 옮깁니다. 세대를 고르면 외곽 벽(파란 굵은 선)을 끌어 밀고 당길 수 있고, 주황 현관과 파란 창은 끌어서 벽을 따라 옮기거나 × 로 지웁니다. 벽을 두 번 누르면 창이 생깁니다. 부품은 네모 손잡이로 크기, ↻ 로 자유 회전(Shift 15°), × 로 삭제.'} 가장자리는 다른 벽의 연장선에 붙고(분홍 안내선), Ctrl을 누르는 동안 스냅이 꺼집니다. 방향키 0.1 m(Shift 1 m), R 90°, M 좌우 반전, Delete 삭제, Ctrl+Z 되돌리기.</p>
          <div class="pu-ed-wrap${tool ? ' drawing' : ''}" tabindex="0" data-ed-wrap>${editorSvg(draft, { sel, guides })}</div>
          <div class="pu-legend"><span><i style="background:#e08a2e"></i>현관</span><span><i style="background:#2aa6d8"></i>창</span><span><i style="background:#c9d8e6"></i>홀·복도</span><span><i style="background:#3f6b93"></i>계단(화살표 오름)</span><span><i style="background:#2c4f75"></i>승강기(주황 선 문)</span><span><i style="background:#8aa6c0"></i>샤프트</span><span><i style="background:#d6337a"></i>스냅 안내선</span></div>
        </section>
        <aside class="panel pu-ed-side">${sidePanel(g)}
          <div class="pu-combo-metrics"><div><span>외곽</span><b>${fmt(draft.width)} × ${fmt(draft.depth)}m</b></div><div><span>코어·홀 공용</span><b>${fmt(draft.commonArea)}㎡</b></div></div>
          <p class="pu-note">${esc(draft.facings.join(' · '))}<br>${esc(windowLabel(draft))}</p>
          <ul class="pu-checks">${issues.length ? issues.map(x => `<li class="pu-ng">✗ ${esc(x)}</li>`).join('') : '<li class="pu-ok">✓ 겹침 없음 · 현관과 계단·승강기가 홀에 닿음</li>'}</ul>
          <div class="pu-combo-actions"><button class="btn primary" type="button" data-ed-save>저장</button><button class="btn" type="button" data-ed-undo ${undo.length ? '' : 'disabled'}>되돌리기</button><button class="btn" type="button" data-ed-reset>저장본으로</button><button class="btn" type="button" data-ed-json>JSON ↓</button></div>
          <div class="pu-status" role="status">${esc(status)}</div>
        </aside></div>${jsonPanel(lastJson)}`;
      bindList(); bindImport(); bindCanvas(); bindSide(); bindJsonPanel(container, () => { lastJson = null; render(); });
    }
    const toolHint = () => tool === 'door' ? '<b>현관 놓기</b>: 세대 외곽 벽을 누르면 그 자리에 현관(폭 1 m)을 놓습니다.' : tool === 'window' ? `<b>창 추가</b>: 세대 외곽 벽을 누르면 그 자리에 창(${WINDOW_NEW} m)을 놓습니다.`
      : `<b>${esc(PART_SIZES[tool][2])} 그리기</b>: 빈 곳을 끌어 크기를 정하거나, 눌러서 기본 크기(${PART_SIZES[tool][0]} × ${PART_SIZES[tool][1]} m)로 놓습니다.`;
    function sidePanel(g) {
      if (!sel) return '<h3>선택 없음</h3><p class="pu-note">도면에서 세대나 부품을 누르세요.</p>';
      if (sel.kind === 'door') { const u = g.units[sel.i]; return `<h3>${u.type}형 현관</h3><p class="pu-note">벽을 따라 끌어 옮깁니다. 다른 벽으로 끌면 그 벽으로 옮겨 갑니다.</p><div class="pu-combo-actions"><button class="btn" type="button" data-ed-deldoor>현관 삭제</button><button class="btn" type="button" data-ed-backunit>세대 선택</button></div>`; }
      if (sel.kind === 'window') { const w = (g.units[sel.i].windows || [])[sel.k]; return `<h3>${g.units[sel.i].type}형 창${w ? ' · ' + esc(w.room || '') : ''}</h3><p class="pu-note">${w ? `길이 ${fmt(w.length)} m · ${DIR_NAMES[w.dir] || ''}쪽` : ''} · 벽을 따라 끌어 옮기거나 다른 벽으로 옮깁니다.</p><div class="pu-inputs"><label>길이 (m)<input type="number" step=".05" min="${WINDOW_MIN}" value="${w ? fmt3(w.length) : ''}" data-ed-winlen></label></div><div class="pu-combo-actions"><button class="btn" type="button" data-ed-delwin>창 삭제</button><button class="btn" type="button" data-ed-backunit>세대 선택</button></div>`; }
      const s = sel.kind === 'unit' ? g.units[sel.i] : g.core.parts[sel.i];
      if (!s) return '<h3>선택 없음</h3>';
      const box = sel.kind === 'unit' ? boxOf(s.rects) : s.rect;
      return `<h3>${esc(sel.kind === 'unit' ? s.type + '형 · ' + (s.facing || '') : s.name || s.kind)}</h3>
        <div class="pu-inputs"><label>X (m)<input type="number" step=".05" value="${fmt3(box[0])}" data-ed-x></label><label>Y (m)<input type="number" step=".05" value="${fmt3(box[1])}" data-ed-y></label>
          ${sel.kind === 'part' ? `<label>폭 (m)<input type="number" step=".05" min=".3" value="${fmt3(box[2] - box[0])}" data-ed-w></label><label>깊이 (m)<input type="number" step=".05" min=".3" value="${fmt3(box[3] - box[1])}" data-ed-h></label>` : ''}
          <label>회전 (°)<input type="number" step="1" value="${Math.round(normAngle(s.angle) * 10) / 10}" data-ed-angle></label></div>
        <div class="pu-combo-actions"><button class="btn" type="button" data-ed-turn="-15">−15°</button><button class="btn" type="button" data-ed-turn="15">+15°</button><button class="btn" type="button" data-ed-rotate>90° 회전</button><button class="btn" type="button" data-ed-angle0>각도 0°</button></div>
        <div class="pu-combo-actions">${sel.kind === 'unit' ? `<button class="btn" type="button" data-ed-mirror>좌우 반전</button>${s.door ? '' : '<button class="btn" type="button" data-ed-tool-door>현관 놓기</button>'}<button class="btn" type="button" data-ed-tool-window>창 추가</button>${s.windowsManual ? '<button class="btn" type="button" data-ed-autowin>창 자동 계산으로</button>' : ''}` : '<button class="btn" type="button" data-ed-delete>부품 삭제</button>'}</div>
        ${sel.kind === 'unit' ? `<p class="pu-note">${s.windowsManual ? '창을 직접 배치한 세대입니다.' : '창은 외곽에 닿는 거실·침실·주방·발코니 변에서 자동으로 계산합니다. 창을 옮기거나 지우면 이 세대는 직접 배치로 바뀝니다.'} 외곽 벽은 도면의 파란 굵은 선을 끌어 밀고 당깁니다.</p>` : ''}`;
    }
    function importBox() {
      return `<div class="pu-ed-import"><div class="pu-combo-actions"><button class="btn" type="button" data-ed-import-open>${importOpen ? '붙여넣기 닫기' : 'JSON 붙여넣기'}</button><label class="btn">파일 불러오기<input type="file" accept=".json,application/json" multiple hidden data-ed-import-file></label></div>
        ${importOpen ? '<textarea data-ed-import-text spellcheck="false" placeholder="이 화면이나 Claude·ChatGPT에서 받은 동 유형 JSON을 붙여 넣으세요."></textarea><div class="pu-combo-actions"><button class="btn primary" type="button" data-ed-import-go>가져오기</button></div>' : ''}
        ${importMsg ? `<p class="pu-note">${esc(importMsg)}</p>` : ''}</div>`;
    }
    function takeImport(text) {
      const r = importCandidates(text, project.typologies.map(t => t.id));
      if (r.added.length) {
        project.typologies.push(...r.added);
        if (typeof onChange === 'function') onChange();
        load(project.typologies.length - 1); importOpen = false;
      }
      importMsg = (r.added.length ? r.added.length + '개 동 유형을 가져왔습니다. ' : '') + r.errors.join(' ');
      render();
    }
    function bindImport() {
      const q = s => container.querySelector(s);
      q('[data-ed-import-open]').addEventListener('click', () => { importOpen = !importOpen; importMsg = ''; render(); });
      if (q('[data-ed-import-go]')) q('[data-ed-import-go]').addEventListener('click', () => takeImport(q('[data-ed-import-text]').value));
      q('[data-ed-import-file]').addEventListener('change', async e => {
        const texts = await Promise.all(Array.from(e.target.files).map(f => f.size > 5e6 ? Promise.resolve('') : f.text()));
        const all = [];
        for (const t of texts) { try { const d = JSON.parse(t); all.push(...(Array.isArray(d.candidates) ? d.candidates : [d])); } catch (err) { importMsg = '파일을 읽지 못했습니다: ' + err.message; } }
        if (all.length) takeImport({ schema: 'apartment-planner-building/1', coordinateUnit: 'm', candidates: all }); else render();
      });
    }
    function bindList() { container.querySelectorAll('[data-ed-pick]').forEach(b => b.addEventListener('click', () => { load(Number(b.dataset.edPick)); status = ''; render(); })); }
    function svgPoint(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
    // Snap reach is about 10 screen pixels, whatever the zoom (as in Stage 1); Ctrl turns it off while held.
    function tolerance(e) { if (!snapOn || (e && (e.ctrlKey || e.metaKey))) return 0; const m = container.querySelector('[data-ed-svg]').getScreenCTM(); return m && m.a ? 10 / m.a : .3; }
    // Redraws inside the existing svg element so a captured pointer keeps working during a drag.
    function redrawCanvas(preview) {
      const keep = container.querySelector('[data-ed-svg]'), tmp = container.ownerDocument.createElement('div');
      tmp.innerHTML = editorSvg(draft, { sel, preview, guides }); keep.innerHTML = tmp.firstElementChild.innerHTML;
    }
    const elCentre = () => sel.kind === 'part' ? partCentre(draft.geometry.core.parts[sel.i]) : unitCentre(draft.geometry.units[sel.i]);
    // Nearest unit wall to a drawing point (for the door/window tools), within a few metres.
    function wallUnderPointer(p) {
      let best = null;
      draft.geometry.units.forEach((u, i) => { const q = toUnitFrame(u, p), w = nearestWall(u, q, 0); if (w && (!best || w.d < best.d)) best = { i, q, d: w.d }; });
      return best && best.d < 3 ? best : null;
    }
    function bindCanvas() {
      const svg = container.querySelector('[data-ed-svg]'), wrap = container.querySelector('[data-ed-wrap]');
      svg.addEventListener('pointerdown', e => {
        const p = svgPoint(svg, e), pt = [p.x, p.y];
        if (tool === 'door' || tool === 'window') {
          const hitWall = wallUnderPointer(pt);
          if (!hitWall) { status = '세대 외곽 벽 가까이를 누르세요.'; render(); return; }
          if (tool === 'door') { const r = editMoveDoor(draft, hitWall.i, hitWall.q, 0); sel = { kind: 'door', i: hitWall.i }; tool = null; change(r.t); }
          else { const next = editAddWindow(draft, hitWall.i, hitWall.q); sel = { kind: 'window', i: hitWall.i, k: next.geometry.units[hitWall.i].windows.length - 1 }; tool = null; change(next); }
          return;
        }
        if (tool) { drag = { mode: 'draw', x: p.x, y: p.y, base: draft, id: e.pointerId, rect: null }; svg.setPointerCapture(e.pointerId); e.preventDefault(); return; }
        const handle = e.target.closest('[data-handle]');
        if (handle && sel) {
          const kind = handle.dataset.handle;
          if (kind === 'del' && sel.kind === 'part') { const i = sel.i; sel = null; change(editRemovePart(draft, i)); return; }
          if (kind === 'del-door' && sel.kind === 'door') { const i = sel.i; sel = { kind: 'unit', i }; change(editDeleteDoor(draft, i)); return; }
          if (kind === 'del-win' && sel.kind === 'window') { const { i, k } = sel; sel = { kind: 'unit', i }; change(editDeleteWindow(draft, i, k)); return; }
          if (kind === 'rot' || HANDLES[kind]) {
            const [cx, cy] = elCentre(), el = sel.kind === 'part' ? draft.geometry.core.parts[sel.i] : draft.geometry.units[sel.i];
            drag = { mode: kind === 'rot' ? 'rotate' : 'resize', handle: kind, x: p.x, y: p.y, cx, cy, a0: Math.atan2(p.y - cy, p.x - cx), ang0: el.angle || 0, base: draft, moved: false, id: e.pointerId };
            svg.setPointerCapture(e.pointerId); e.preventDefault();
            return;
          }
        }
        const edge = e.target.closest('[data-edge]'), door = e.target.closest('[data-door]'), win = e.target.closest('[data-win]');
        if (edge) {
          const [i, k] = edge.dataset.edge.split(':').map(Number), u = draft.geometry.units[i];
          // Two taps on the same wall within 0.4 s add a window there.
          const now = Date.now(), again = lastWallTap && lastWallTap.key === edge.dataset.edge && now - lastWallTap.time < 400;
          lastWallTap = { key: edge.dataset.edge, time: now };
          if (again) { lastWallTap = null; const next = editAddWindow(draft, i, toUnitFrame(u, pt)); sel = { kind: 'window', i, k: next.geometry.units[i].windows.length - 1 }; change(next); return; }
          sel = { kind: 'edge', i, e: k };
          drag = { mode: 'edge', i, e: k, start: toUnitFrame(u, pt), base: draft, moved: false, id: e.pointerId };
          svg.setPointerCapture(e.pointerId); e.preventDefault(); redrawCanvas(); return;
        }
        if (door) { const i = Number(door.dataset.door); sel = { kind: 'door', i }; drag = { mode: 'door', i, base: draft, moved: false, id: e.pointerId, start: toUnitFrame(draft.geometry.units[i], pt), wall: openingWall(draft.geometry.units[i], draft.geometry.units[i].door) }; svg.setPointerCapture(e.pointerId); e.preventDefault(); redrawCanvas(); wrap.focus({ preventScroll: true }); return; }
        if (win) { const [i, k] = win.dataset.win.split(':').map(Number); sel = { kind: 'window', i, k }; drag = { mode: 'window', i, k, base: draft, moved: false, id: e.pointerId, start: toUnitFrame(draft.geometry.units[i], pt), wall: openingWall(draft.geometry.units[i], (draft.geometry.units[i].windows || [])[k]) }; svg.setPointerCapture(e.pointerId); e.preventDefault(); redrawCanvas(); wrap.focus({ preventScroll: true }); return; }
        const item = e.target.closest('[data-sel]');
        if (!item) { sel = null; render(); focusCanvas(); return; }
        const [kind, i] = item.dataset.sel.split(':');
        sel = { kind, i: Number(i) };
        drag = { mode: 'move', x: p.x, y: p.y, base: draft, moved: false, id: e.pointerId };
        svg.setPointerCapture(e.pointerId);
        redrawCanvas();
        wrap.focus({ preventScroll: true });
      });
      svg.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        const p = svgPoint(svg, e), pt = [p.x, p.y], tol = tolerance(e);
        if (drag.mode === 'draw') {
          const g = v => round(Math.round(v / .05) * .05);
          drag.rect = [g(Math.min(drag.x, p.x)), g(Math.min(drag.y, p.y)), g(Math.max(drag.x, p.x)), g(Math.max(drag.y, p.y))];
          redrawCanvas(drag.rect);
          return;
        }
        if ((drag.mode === 'door' || drag.mode === 'window') && drag.wall && !drag.decided) {
          // The first 25 cm decide: across the wall pushes/pulls the wall, along it slides the opening.
          const u = drag.base.geometry.units[drag.i], q = toUnitFrame(u, pt), ax = drag.wall.horizontal ? 1 : 0, across = q[ax] - drag.start[ax], along = q[1 - ax] - drag.start[1 - ax];
          if (Math.hypot(across, along) < .25) return;
          drag.decided = true;
          if (Math.abs(across) > 1.5 * Math.abs(along)) { drag.mode = 'edge'; drag.e = drag.wall.e; sel = { kind: 'edge', i: drag.i, e: drag.wall.e }; }
        }
        if (drag.mode === 'door' || drag.mode === 'window') {
          const u = drag.base.geometry.units[drag.i], q = toUnitFrame(u, pt);
          const r = drag.mode === 'door' ? editMoveDoor(drag.base, drag.i, q, tol) : editMoveWindow(drag.base, drag.i, drag.k, q, tol);
          drag.moved = true; draft = r.t;
          // Guides are in the unit frame; show them only for unrotated units.
          guides = normAngle(u.angle) ? [] : r.guides;
          redrawCanvas();
          return;
        }
        if (drag.mode === 'edge') {
          const u = drag.base.geometry.units[drag.i], w = outlineEdge(u, drag.e), q = toUnitFrame(u, pt), ax = w.horizontal ? 1 : 0;
          let delta = q[ax] - drag.start[ax], line = null;
          if (tol && !normAngle(u.angle)) {
            const lines = snapLines(drag.base, (k, j) => k === 'unit' && j === drag.i), own = ax ? u.outline.map(v => v[1]).concat((u.rooms || []).flatMap(r => [r.rect[1], r.rect[3]])) : u.outline.map(v => v[0]).concat((u.rooms || []).flatMap(r => [r.rect[0], r.rect[2]]));
            const s = snapAxis([w.a[ax]], [...(ax ? lines.y : lines.x), ...own.filter(v => Math.abs(v - w.a[ax]) > 1e-6)], delta, tol);
            delta = s.d; line = s.line;
          } else delta = round(Math.round(delta / .05) * .05);
          const r = moveOutlineEdge(drag.base, drag.i, drag.e, delta);
          if (r.ok) { draft = r.t; drag.moved = Math.abs(delta) > 1e-6; guides = line === null ? [] : [{ axis: ax ? 'y' : 'x', value: line }]; status = ''; }
          else { draft = drag.base; status = r.message; guides = []; }
          redrawCanvas();
          return;
        }
        if (drag.mode === 'resize') {
          const rect = resizeRect(drag.base, sel.i, drag.handle, p.x - drag.x, p.y - drag.y, tol);
          if (!drag.moved && rect.join() === drag.base.geometry.core.parts[sel.i].rect.join()) return;
          drag.moved = true; guides = rect.guides || [];
          draft = editResize(drag.base, sel.i, rect);
          redrawCanvas();
          return;
        }
        if (drag.mode === 'rotate') {
          let a = drag.ang0 + (Math.atan2(p.y - drag.cy, p.x - drag.cx) - drag.a0) * 180 / Math.PI;
          a = e.shiftKey ? Math.round(a / 15) * 15 : Math.round(a);
          const near = Math.round(a / 90) * 90;
          if (Math.abs(a - near) <= 3) a = near;
          if (Math.abs(normAngle(a) - normAngle(drag.ang0)) > .5) drag.moved = true;
          draft = editSetAngle(drag.base, sel, a);
          redrawCanvas();
          return;
        }
        const s = snapMove(drag.base, sel, p.x - drag.x, p.y - drag.y, tol);
        if (!s.dx && !s.dy && !drag.moved) return;
        drag.moved = true; guides = s.guides;
        draft = editMove(drag.base, sel, s.dx, s.dy);
        redrawCanvas();
      });
      const end = e => {
        if (!drag || e.pointerId !== drag.id) return;
        guides = [];
        if (drag.mode === 'draw') {
          const r = drag.rect, kind = tool;
          const next = r && r[2] - r[0] >= PART_MIN && r[3] - r[1] >= PART_MIN ? editAddPart(drag.base, kind, r) : editAddPart(drag.base, kind, [drag.x, drag.y]);
          drag = null; sel = { kind: 'part', i: next.geometry.core.parts.length - 1 }; tool = null;
          status = PART_SIZES[kind][2] + ' 추가';
          change(next);
          return;
        }
        if (drag.mode === 'edge') sel = { kind: 'unit', i: drag.i };
        if (drag.moved && draft !== drag.base) { undo.push(drag.base); if (undo.length > 80) undo.shift(); }
        drag = null; render(); focusCanvas();
      };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      wrap.addEventListener('keydown', e => {
        // Keys handled here must not reach the app-wide shortcuts (its Ctrl+Z undoes the whole project).
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); if (undo.length) { draft = undo.pop(); render(); focusCanvas(); } return; }
        if (e.key === 'Escape' && tool) { e.stopPropagation(); tool = null; render(); focusCanvas(); return; }
        if (!sel) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'r', 'R', 'm', 'M', 'Delete', 'Backspace'].includes(e.key)) e.stopPropagation();
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          if (sel.kind === 'part') { const i = sel.i; sel = null; change(editRemovePart(draft, i)); }
          else if (sel.kind === 'door') { const i = sel.i; sel = { kind: 'unit', i }; change(editDeleteDoor(draft, i)); }
          else if (sel.kind === 'window') { const { i, k } = sel; sel = { kind: 'unit', i }; change(editDeleteWindow(draft, i, k)); }
          return;
        }
        if (sel.kind !== 'unit' && sel.kind !== 'part') return;
        const step = e.shiftKey ? 1 : .1, keys = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (keys[e.key]) { e.preventDefault(); change(editMove(draft, sel, ...keys[e.key])); return; }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); change(editRotate(draft, sel)); return; }
        if ((e.key === 'm' || e.key === 'M') && sel.kind === 'unit') { e.preventDefault(); change(editMirror(draft, sel)); }
      });
    }
    function bindSide() {
      const q = s => container.querySelector(s), num = el => Number(el && el.value), on = (s, f) => { const el = q(s); if (el) el.addEventListener('click', f); };
      container.querySelectorAll('[data-ed-tool]').forEach(b => b.addEventListener('click', () => { tool = b.dataset.edTool || null; if (tool !== 'door' && tool !== 'window') sel = null; render(); focusCanvas(); }));
      q('[data-ed-snap]').addEventListener('change', e => { snapOn = e.target.checked; focusCanvas(); });
      on('[data-ed-tool-door]', () => { tool = 'door'; render(); focusCanvas(); });
      on('[data-ed-tool-window]', () => { tool = 'window'; render(); focusCanvas(); });
      on('[data-ed-autowin]', () => change(editAutoWindows(draft, sel.i)));
      on('[data-ed-deldoor]', () => { const i = sel.i; sel = { kind: 'unit', i }; change(editDeleteDoor(draft, i)); });
      on('[data-ed-delwin]', () => { const { i, k } = sel; sel = { kind: 'unit', i }; change(editDeleteWindow(draft, i, k)); });
      on('[data-ed-backunit]', () => { sel = { kind: 'unit', i: sel.i }; render(); focusCanvas(); });
      if (q('[data-ed-winlen]')) q('[data-ed-winlen]').addEventListener('change', e => {
        const { i, k } = sel, u = draft.geometry.units[i], w = u.windows[k], len = Math.max(WINDOW_MIN, Number(e.target.value) || WINDOW_MIN);
        const c = clone(draft), cu = c.geometry.units[i], list = manualWindowsOf(cu), m = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2], wall = nearestWall(cu, m, Math.min(len, WINDOW_MIN));
        if (!wall) return;
        const o = openingOnWall(wall, m, Math.min(len, wall.length), [], 0);
        list[k] = { ...list[k], a: o.a, b: o.b };
        setManual(cu, list);
        change(refreshEdited(c));
      });
      if (sel && (sel.kind === 'unit' || sel.kind === 'part')) {
        const setBox = () => {
          const g = draft.geometry, s = sel.kind === 'unit' ? boxOf(g.units[sel.i].rects) : g.core.parts[sel.i].rect;
          let next = editMove(draft, sel, num(q('[data-ed-x]')) - s[0], num(q('[data-ed-y]')) - s[1]);
          if (sel.kind === 'part' && q('[data-ed-w]')) {
            const w = Math.max(PART_MIN, num(q('[data-ed-w]'))), h = Math.max(PART_MIN, num(q('[data-ed-h]'))), r = next.geometry.core.parts[sel.i].rect;
            next = editResize(next, sel.i, [r[0], r[1], r[0] + w, r[1] + h]);
          }
          change(next);
        };
        ['[data-ed-x]', '[data-ed-y]', '[data-ed-w]', '[data-ed-h]'].forEach(k => { const el = q(k); if (el) el.addEventListener('change', setBox); });
        q('[data-ed-angle]').addEventListener('change', e => change(editSetAngle(draft, sel, Number(e.target.value))));
        container.querySelectorAll('[data-ed-turn]').forEach(b => b.addEventListener('click', () => { const el = sel.kind === 'unit' ? draft.geometry.units[sel.i] : draft.geometry.core.parts[sel.i]; change(editSetAngle(draft, sel, (el.angle || 0) + Number(b.dataset.edTurn))); }));
        on('[data-ed-angle0]', () => change(editSetAngle(draft, sel, 0)));
        on('[data-ed-rotate]', () => change(editRotate(draft, sel)));
        on('[data-ed-mirror]', () => change(editMirror(draft, sel)));
        on('[data-ed-delete]', () => { const i = sel.i; sel = null; change(editRemovePart(draft, i)); });
      }
      q('[data-ed-undo]').addEventListener('click', () => { if (undo.length) { draft = undo.pop(); render(); } });
      q('[data-ed-reset]').addEventListener('click', () => { load(index); status = '저장본으로 되돌림'; render(); });
      q('[data-ed-save]').addEventListener('click', () => {
        const saved = normalizeEdited(draft);
        saved.edited = true; saved.editedAt = new Date().toISOString(); saved.reviewStatus = '수동 편집 · ' + (checkEdited(saved).length ? '겹침·연결 검토 필요' : '겹침·연결 문제 없음') + ' · 채광·피난·구조·설비 미검토';
        project.typologies[index] = saved; original = clone(saved); draft = refreshEdited(clone(saved)); undo = [];
        status = '저장했습니다. 단지 배치에서 이 동 유형을 쓰면 수정본이 들어갑니다.';
        if (typeof onChange === 'function') onChange();
        render();
      });
      q('[data-ed-json]').addEventListener('click', () => {
        lastJson = saveJsonFile(container.ownerDocument, candidateFileName(draft, {}).replace('.json', '-edited.json'), JSON.stringify(exportCandidates(normalizeEdited(draft), { edited: true }), null, 2));
        status = 'JSON 저장'; render();
      });
    }
    render();
    return { render, destroy() { drag = null; container.innerHTML = ''; } };
  }

  function mountCombinations(container, project, onChange) {
    ensureUnits(project); injectStyles(container.ownerDocument);
    const DIM_FIELDS = [['stairWidth', '계단실 폭'], ['stairLength', '계단실 길이'], ['lobbyLength', '부속실 깊이'], ['hallDepth', '승강기홀 깊이'], ['sideHallWidth', '측면 홀 폭'], ['shaftWidth', '샤프트 폭'], ['floorHeight', '층고']];
    let opts = { types: [59, 74, 84], counts: [2, 3, 4], floors: 25, dims: {}, allowEast: true, allowWest: true, allowNorth: false, sort: 'default', coreTemplate: 'parametric', mode: 'units' };
    let lastJson = null, cache = { key: '', result: null }, view = 'search', editIndex = null, editor = null;
    const viewTabs = () => `<div class="pu-tabs"><button type="button" data-cc-view="search" class="${view === 'search' ? 'active' : ''}">후보 탐색</button><button type="button" data-cc-view="edit" class="${view === 'edit' ? 'active' : ''}">저장한 안 편집 (${project.typologies.filter(isEditable).length})</button></div>`;
    const bindTabs = () => container.querySelectorAll('[data-cc-view]').forEach(b => b.addEventListener('click', () => { view = b.dataset.ccView; render(); }));
    let shown = { 2: 12, 3: 12, 4: 12 }, status = '', plans = null, planSource = '', loadError = '';
    async function loadDefaultPlans() {
      // The single-file build carries the unit plans inline (no server, no fetch).
      const embedded = typeof globalThis !== 'undefined' && Array.isArray(globalThis.PLANBY_UNIT_PLANS) ? globalThis.PLANBY_UNIT_PLANS : null;
      if (embedded && embedded.length) {
        try { embedded.forEach(profileFromPlan); plans = embedded.map(p => JSON.parse(JSON.stringify(p))); planSource = '파일에 포함된 세대 평면'; loadError = ''; render(); return; }
        catch (e) { loadError = '포함된 세대 평면이 올바르지 않습니다: ' + e.message; }
      }
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
    function downloadJson(candidates) {
      const settings = { mode: opts.mode, floors: opts.floors, types: opts.types, counts: opts.counts, allowEast: opts.allowEast, allowWest: opts.allowWest, allowNorth: opts.allowNorth,
        coreTemplate: opts.mode === 'core' ? opts.coreTemplate : null, dims: opts.dims, unitPlans: planSource, unitRevision: [...new Set((plans || []).map(p => p.projectRevision).filter(v => v != null))] };
      lastJson = saveJsonFile(container.ownerDocument, candidateFileName(candidates, settings), JSON.stringify(exportCandidates(candidates, settings), null, 2));
      status = (Array.isArray(candidates) ? candidates.length + '개 후보' : candidates.name) + ' JSON 저장';
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
      editor?.destroy?.(); editor = null;
      if (view === 'edit') {
        container.innerHTML = viewTabs() + '<div data-cc-editor></div>';
        bindTabs();
        editor = mountEditor(container.querySelector('[data-cc-editor]'), project, onChange, editIndex);
        return;
      }
      if (!plans) {
        container.innerHTML = `${viewTabs()}<div class="panel"><div class="pu-toolbar"><h3>코어 1개와 세대 조합 · 경우의 수 탐색</h3></div><p class="pu-note">${esc(loadError || '세대 평면을 불러오는 중입니다.')}</p>
          <label class="btn">세대 평면 JSON 불러오기<input type="file" accept=".json,application/json" multiple data-cc-files hidden></label></div>`;
        container.querySelector('[data-cc-files]').addEventListener('change', e => loadFiles(e.target.files));
        bindTabs();
        return;
      }
      // Unit-first search takes about a second; reuse it while only the view (sorting, paging) changes.
      const key = JSON.stringify([opts.mode, opts.types, opts.counts, opts.floors, opts.dims, opts.allowEast, opts.allowWest, opts.allowNorth, opts.coreTemplate, plans.length, planSource]);
      if (cache.key !== key) cache = { key, result: opts.mode === 'units' ? assembleUnitsFirst(plans, opts) : generateCoreCombos(plans, opts) };
      const result = { ...cache.result, combos: [...cache.result.combos] }, reference = reproduceReference('susaek4-101');
      const sorters = { default: null, compact: (a, b) => a.footprintArea / a.unitsPerFloor - b.footprintArea / b.unitsPerFloor, narrow: (a, b) => a.width - b.width || a.depth - b.depth, area: (a, b) => b.totalUnitArea - a.totalUnitArea };
      if (sorters[opts.sort]) result.combos.sort(sorters[opts.sort]);
      const groups = [4, 3, 2].filter(n => opts.counts.includes(n)).map(n => ({ n, list: result.combos.filter(c => c.unitsPerFloor === n) }));
      const visible = {};
      groups.forEach(g => { visible[g.n] = g.list.slice(0, shown[g.n]); });
      const box = (attr, value, on, label) => `<label><input type="checkbox" ${attr}="${value}" ${on ? 'checked' : ''}>${label}</label>`;
      const rejects = Object.entries(result.rejected);
      container.innerHTML = `${viewTabs()}<div class="panel"><div class="pu-toolbar"><h3>코어 1개와 세대 조합 · 경우의 수 탐색</h3><span class="tag">${result.combos.length}안</span></div>
        <p class="pu-note">단위세대 단계에서 만든 59·74·84형 평면의 현관이 코어 면에 닿도록 남·동·서·북 네 면에 세대를 붙입니다. 현관 앞 오목한 부분에 코어가 들어가고, 세대 외곽끼리나 세대와 코어가 겹치는 배치는 제외합니다. 세대끼리 겹치지 않는 조합만 남기고, 좌우 대칭이거나 위치만 조금 다른 안은 하나로 묶습니다.</p>
        <div class="pu-combo-fields">
          <div><div class="section-label" style="margin-bottom:8px">포함할 평형</div><div class="pu-mix">${TYPES.map(t => box('data-cc-type', t, opts.types.includes(t), t + '㎡')).join('')}</div></div>
          <div><div class="section-label" style="margin-bottom:8px">코어당 세대 수</div><div class="pu-mix">${[2, 3, 4].map(n => box('data-cc-count', n, opts.counts.includes(n), n + '세대')).join('')}</div></div>
          <div><div class="section-label" style="margin-bottom:8px">향</div><div class="pu-mix">${box('data-cc-east', 1, opts.allowEast, '동향 허용')}${box('data-cc-west', 1, opts.allowWest, '서향 허용')}${box('data-cc-north', 1, opts.allowNorth, '북향 허용')}</div></div>
        </div>
        <div class="pu-combo-fields">
          <label>층수<input class="pu-num" type="number" min="1" max="80" step="1" value="${opts.floors}" data-cc-floors></label>
          <label>조합 방식<select data-cc-mode><option value="units" ${opts.mode === 'units' ? 'selected' : ''}>세대 먼저 맞붙이고 빈틈에 코어 배치</option><option value="core" ${opts.mode === 'core' ? 'selected' : ''}>코어 먼저 놓고 세대 붙이기</option></select></label>
          <label>코어<select data-cc-template ${opts.mode === 'units' ? 'disabled title="세대 먼저 방식은 계단·승강기·샤프트를 빈틈에 하나씩 끼웁니다"' : ''}><option value="parametric" ${opts.coreTemplate === 'parametric' ? 'selected' : ''}>규칙 조립 코어 (가정 치수)</option>${Object.entries(CORE_TEMPLATES).map(([k, t]) => `<option value="${k}" ${opts.coreTemplate === k ? 'selected' : ''}>${esc(t.name)} (도면 블록)</option>`).join('')}</select></label>
          <label>정렬<select data-cc-sort>${[['default', '남향 세대 많은 순'], ['compact', '세대당 점유 면적 작은 순'], ['narrow', '동 폭 좁은 순'], ['area', '전용 합계 큰 순']].map(([k, l]) => `<option value="${k}" ${opts.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        </div>
        <div class="pu-warning">코어는 층수와 코어당 세대 수로 승강기 대수·용량, 계단 형식, 비상용승강기 필요 여부를 정한 뒤 계단실·부속실·승강기·샤프트·승강기홀을 조립합니다. 승강기홀은 현관에 닿도록 좌우로 0~6 m 복도처럼 늘리거나(판상형) 측면으로 감쌀 수 있고(타워형), 공용면적이 가장 작은 경우를 남깁니다. 부품 치수는 계획 가정이며, 규정은 선별 계산일 뿐 법규 적합 판정이 아닙니다. 채광·일조, 피난 거리, 구조, 설비는 검토하지 않았습니다.</div>
        <details class="pu-reference"><summary>코어 부품 치수 가정 (m)</summary><div class="pu-combo-fields">${DIM_FIELDS.map(([k, l]) => `<label>${l}<input class="pu-num" type="number" min=".5" max="20" step=".05" value="${opts.dims[k] != null ? opts.dims[k] : CORE_DIMENSIONS[k]}" data-cc-dim="${k}"></label>`).join('')}</div>
          <p>승강로 크기(인승별): ${Object.entries(CORE_DIMENSIONS.lifts).map(([c, d]) => c + '인승 ' + d.join('×')).join(' · ')}. 제조사 사양과 다를 수 있습니다.</p></details>
        <p class="pu-note">탐색: 코어 면에 붙일 수 있는 단일 배치 ${result.placements}개 · 제외 ${rejects.length ? rejects.map(([r, n]) => esc(r) + ' ' + n).join(' · ') : '없음'}</p>
        ${profileNote(result.profiles, planSource)}<div class="pu-combo-actions"><label class="btn">세대 평면 JSON 다시 불러오기<input type="file" accept=".json,application/json" multiple data-cc-files hidden></label>${loadError ? `<span class="pu-ng">${esc(loadError)}</span>` : ''}</div></div>
        <div class="pu-status" role="status">${esc(status)}</div>${jsonPanel(lastJson)}
        ${groups.map(g => `<section class="pu-cc-group"><div class="pu-toolbar"><h3 class="pu-section-title">${g.n}세대 코어 <small>${g.list.length}안</small></h3>${g.list.length ? `<button class="btn" type="button" data-cc-json-all="${g.n}">${g.n}세대 후보 전체 JSON ↓</button>` : ''}</div>
          ${result.cores[g.n] && result.cores[g.n].template ? `<p class="pu-note">${esc(result.cores[g.n].template.name)} · ${esc(result.cores[g.n].template.source)} · 계단·승강기·샤프트 블록은 도면 그대로, 홀·복도는 세대에 맞춰 생성 · ${esc(result.cores[g.n].template.observed)}</p>` : ''}${result.cores[g.n] && result.cores[g.n].rules ? `<table class="pu-roomlist pu-rules"><tbody>${result.cores[g.n].rules.map(r => `<tr><td>${esc(r.label)}</td><td><b class="${r.ok === false ? 'pu-ng' : ''}">${esc(r.value)}</b></td><td>${esc(r.basis)}</td></tr>`).join('')}</tbody></table>` : ''}
          ${g.list.length ? `<div class="pu-combo-grid">${visible[g.n].map((c, i) => `<article class="pu-combo-card pu-cc-card">${coreComboSvg(c)}<h3>${esc(c.name)}</h3>
            <div class="pu-combo-meta">${c.facings.join(' · ')} · ${windowLabel(c)}<br>외곽 ${fmt(c.width)} × ${fmt(c.depth)}m · 코어 ${c.core ? fmt(c.core.width) + ' × ' + fmt(c.core.depth) + 'm' + (c.core.fitted ? ' · 빈틈 맞춤 코어' : c.core.template ? ' · ' + c.core.template.name : c.core.sideHalls !== 'none' ? ' · 측면 홀' : c.core.extLeft || c.core.extRight ? ' · 홀 연장 ' + fmt(c.core.extLeft + c.core.extRight) + 'm' : '') : ''}</div>
            <div class="pu-combo-metrics"><div><span>명목 전용 합계 / 층</span><b>${fmt(c.totalUnitArea)}㎡</b></div><div><span>코어·홀 공용 / 층</span><b>${fmt(c.commonArea)}㎡</b></div></div>
            <div class="pu-combo-actions"><button class="btn" type="button" data-cc-save="${g.n}:${i}">후보 저장</button><button class="btn" type="button" data-cc-json="${g.n}:${i}">JSON ↓</button></div></article>`).join('')}</div>
            ${g.list.length > visible[g.n].length ? `<div class="pu-combo-actions"><button class="btn" type="button" data-cc-more="${g.n}">${g.list.length - visible[g.n].length}안 더 보기</button></div>` : ''}`
          : `<div class="pu-empty">이 조건에서는 ${g.n}세대를 붙일 수 없습니다.${g.n > 2 && !(opts.allowEast && opts.allowWest) ? ' 동향·서향 세대를 허용하면 늘어납니다.' : ''}</div>`}</section>`).join('')}
        <div class="panel pu-saved"><div class="pu-toolbar"><h3>저장한 동 유형</h3><span class="muted">${project.typologies.length}개</span></div>${project.typologies.length ? project.typologies.map((t, i) => `<div class="pu-saved-row"><div><strong>${esc(t.name)}</strong><small>${t.unitsPerFloor}세대/층 · ${fmt(t.width)} × ${fmt(t.depth)}m${t.needsReview ? ' · 세대 변경: 재검토 필요' : ''}${t.edited ? ' · 수동 수정' : ''}</small></div><span class="pu-combo-actions">${isEditable(t) ? `<button class="btn" type="button" data-saved-edit="${i}">편집</button>` : ''}</span></div>`).join('') : '<p class="pu-note">후보를 저장하면 배치 단계에서 다시 사용할 수 있습니다.</p>'}</div>
        <details class="pu-reference"><summary>참고: 수색4 101동 편복도 재현 (A-303)</summary>${referencePanel(reference)}</details>`;
      const toggle = (list, value) => list.includes(value) ? list.filter(v => v !== value) : [...list, value].sort((a, b) => a - b);
      const pick = key => { const [n, i] = key.split(':').map(Number); return visible[n][i]; };
      container.querySelector('[data-cc-files]').addEventListener('change', e => loadFiles(e.target.files));
      container.querySelectorAll('[data-cc-type]').forEach(el => el.addEventListener('change', () => { opts.types = toggle(opts.types, Number(el.dataset.ccType)); render(); }));
      container.querySelectorAll('[data-cc-count]').forEach(el => el.addEventListener('change', () => { opts.counts = toggle(opts.counts, Number(el.dataset.ccCount)); render(); }));
      container.querySelector('[data-cc-east]').addEventListener('change', e => { opts.allowEast = e.target.checked; render(); });
      container.querySelector('[data-cc-west]').addEventListener('change', e => { opts.allowWest = e.target.checked; render(); });
      container.querySelector('[data-cc-north]').addEventListener('change', e => { opts.allowNorth = e.target.checked; render(); });
      container.querySelector('[data-cc-template]').addEventListener('change', e => { opts.coreTemplate = e.target.value; render(); });
      container.querySelector('[data-cc-mode]').addEventListener('change', e => { opts.mode = e.target.value; shown = { 2: 12, 3: 12, 4: 12 }; render(); });
      container.querySelector('[data-cc-floors]').addEventListener('change', e => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= 80) opts.floors = v; render(); });
      container.querySelectorAll('[data-cc-dim]').forEach(el => el.addEventListener('change', () => { const v = Number(el.value); if (v >= .5 && v <= 20) opts.dims = { ...opts.dims, [el.dataset.ccDim]: v }; render(); }));
      container.querySelector('[data-cc-sort]').addEventListener('change', e => { opts.sort = e.target.value; render(); });
      container.querySelectorAll('[data-cc-more]').forEach(b => b.addEventListener('click', () => { shown[b.dataset.ccMore] += 12; render(); }));
      container.querySelectorAll('[data-cc-save]').forEach(b => b.addEventListener('click', () => { save(pick(b.dataset.ccSave)); render(); }));
      container.querySelectorAll('[data-cc-json]').forEach(b => b.addEventListener('click', () => { downloadJson(pick(b.dataset.ccJson)); render(); }));
      container.querySelectorAll('[data-cc-json-all]').forEach(b => b.addEventListener('click', () => { const g = groups.find(x => x.n === Number(b.dataset.ccJsonAll)); if (g) downloadJson(g.list); render(); }));
      container.querySelector('[data-ref-save]').addEventListener('click', () => { save(reference); render(); });
      bindTabs();
      bindJsonPanel(container, () => { lastJson = null; render(); });
      container.querySelectorAll('[data-saved-edit]').forEach(b => b.addEventListener('click', () => { editIndex = Number(b.dataset.savedEdit); view = 'edit'; render(); }));
    }
    render(); loadDefaultPlans(); return { render, destroy() { editor?.destroy?.(); container.innerHTML = ''; } };
  }
  return { createUnit, checkUnit, editRoom, fillUnit, setOutline, moveEdge, moveVertex, splitEdge, removeVertex, addRoom, snapCoordinate, snapRoomMove, createBlankUnit, roomsInMark, moveRoomLayer, layerAreas, resizeRoom, resizeRoomClamped, polygonArea, rectInside, buildUnitRequest, unitRequestPrompt, extractJson, readUnitPatch, applyUnitPatch, ensureUnits, generateCombinations, mountUnits, mountCombinations, schematicSvg, buildCorridorPlan, reproduceReference, REFERENCES, UNIT_PLAN_FILES, CORE_DIMENSIONS, CORE_TEMPLATES, buildCore, assembleUnitsFirst, editMove, editRotate, editMirror, editAddPart, editRemovePart, editResize, resizeRect, editSetAngle, polysOverlap, snapMove, editMoveDoor, editDeleteDoor, editMoveWindow, editAddWindow, editDeleteWindow, editAutoWindows, moveOutlineEdge, importCandidates, refreshEdited, normalizeEdited, checkEdited, isEditable, exportCandidates, candidateFileName, computeWindows, windowSummary, profileFromPlan, polygonRects, corePlacements, generateCoreCombos, coreComboSvg, referenceSvg };
});
