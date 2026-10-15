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
  const round = n => Math.round(n * 1000) / 1000;
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
      .pu-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:20px;align-items:start}.pu-main,.pu-inspector{min-width:0}.pu-tabs{display:flex;gap:8px;margin:0 0 18px}.pu-tabs button{border:1px solid #dce5ed;background:#fff;border-radius:10px;padding:12px 24px;color:#506377;font-weight:750;cursor:pointer}.pu-tabs button.active{background:#143e6a;color:white;border-color:#143e6a}.pu-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap}.pu-toolbar h3{margin:0;font-size:18px}.pu-hint{color:#708396;font-size:12px;line-height:1.65}.pu-canvas-wrap{border:1px solid #d9e3ec;border-radius:12px;background:#f8fbfd;overflow:hidden}.pu-canvas{display:block;width:100%;min-height:330px;max-height:610px;touch-action:none;user-select:none}.pu-room{cursor:grab;outline:none}.pu-room:focus rect{stroke:#1262cb;stroke-width:.07}.pu-room.pu-locked{cursor:pointer}.pu-room text{pointer-events:none}.pu-legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;font-size:11px;color:#64788a}.pu-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px}.pu-statrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.pu-stat{border:1px solid #dce6ee;border-radius:10px;background:white;padding:12px}.pu-stat b{display:block;font-size:20px;color:#163f69;margin-top:7px}.pu-stat span{font-size:11px;color:#6f8295}.pu-inspector h3{font-size:16px;margin:0 0 16px}.pu-inputs{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pu-inputs label,.pu-combo-fields label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#64788a}.pu-inputs input,.pu-combo-fields select{width:100%;box-sizing:border-box;border:1px solid #d8e2eb;border-radius:7px;padding:9px;background:white;color:#233f59;font:inherit}.pu-inputs input:disabled{background:#f0f3f6;color:#8b99a7}.pu-check{font-size:12px;display:flex;align-items:center;gap:7px;margin:14px 0}.pu-check input{accent-color:#1f62b4}.pu-roomlist{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}.pu-roomlist td,.pu-roomlist th{padding:8px 3px;border-bottom:1px solid #e7edf2;text-align:left}.pu-roomlist th{font-weight:500;color:#8695a4}.pu-roomlist td:last-child,.pu-roomlist th:last-child{text-align:right}.pu-roomlist button{border:0;background:transparent;padding:0;color:#354e65;cursor:pointer;font:inherit;text-align:left}.pu-roomlist tr.selected{background:#eef5fd}.pu-warning{background:#fff4e7;color:#915d18;border:1px solid #f2d7ad;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.6;margin-top:12px}.pu-pass{background:#eef8f5;color:#36765e;border:1px solid #d3eadd;border-radius:8px;padding:10px 12px;font-size:12px;margin-top:12px}.pu-note{font-size:12px;line-height:1.75;color:#748596;margin:12px 0}.pu-reference{margin-top:18px;border-top:1px solid #e2e9f0;padding-top:16px}.pu-reference summary{cursor:pointer;font-size:13px;font-weight:650;color:#34516d}.pu-reference img{display:block;max-width:100%;max-height:460px;object-fit:contain;margin:16px auto;background:white}.pu-reference p{font-size:12px;line-height:1.7;color:#718497}.pu-combo-fields{display:flex;gap:18px;align-items:end;flex-wrap:wrap;margin-bottom:18px}.pu-combo-fields select{min-width:130px}.pu-mix{display:flex;gap:8px;align-items:center}.pu-mix label{display:flex;flex-direction:row;align-items:center;border:1px solid #d9e3ec;border-radius:8px;padding:10px;cursor:pointer;color:#325777;font-size:13px}.pu-mix input{accent-color:#2266aa}.pu-combo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.pu-combo-card{border:1px solid #dbe4ed;background:#fff;border-radius:13px;padding:17px;min-width:0}.pu-combo-card h3{font-size:16px;margin:14px 0 8px}.pu-combo-card svg{width:100%;height:180px;background:#f6f9fc;border-radius:8px}.pu-combo-meta{font-size:12px;color:#73869a;line-height:1.8}.pu-combo-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0}.pu-combo-metrics div{background:#f5f8fb;border-radius:7px;padding:9px}.pu-combo-metrics span{font-size:10px;color:#7e90a2;display:block}.pu-combo-metrics b{font-size:14px;color:#2c5071}.pu-combo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pu-empty{padding:30px;color:#74869a;text-align:center;border:1px dashed #cad7e2;border-radius:10px}.pu-saved{margin-top:24px}.pu-saved-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:12px;border-bottom:1px solid #e2e9f0}.pu-saved-row strong{font-size:13px}.pu-saved-row small{display:block;margin-top:5px;color:#7b8da0}.pu-footnote{font-size:12px;color:#8090a0;line-height:1.7;margin:15px 0}.pu-active-room{display:flex;align-items:center;gap:8px;margin-bottom:14px}.pu-active-room i{width:12px;height:12px;border-radius:4px}.pu-active-room strong{font-size:15px;color:#24496c}.pu-area{font-size:24px;color:#1e5686;margin:14px 0}.pu-area small{font-size:12px;color:#7a8d9f}.pu-status{min-height:20px;font-size:12px;color:#347658;margin-top:10px}
      @media(max-width:1100px){.pu-layout{grid-template-columns:1fr}.pu-inspector{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pu-combo-grid{grid-template-columns:1fr 1fr}.pu-canvas{min-height:300px}}@media(max-width:700px){.pu-combo-grid,.pu-inspector{grid-template-columns:1fr}.pu-statrow{gap:6px}.pu-stat{padding:8px}.pu-stat b{font-size:17px}.pu-tabs button{padding:10px 18px}.pu-canvas{min-height:220px}.pu-combo-fields{align-items:stretch;gap:12px}}
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

  function mountUnits(container, project, onChange) {
    ensureUnits(project); injectStyles(container.ownerDocument); injectUnitEditorStyles(container.ownerDocument);
    const doc = container.ownerDocument, win = doc.defaultView;
    const first = project.units.find(u => u.id === project.selectedUnitId) || project.units.find(u => Number(u.type) === Number(project.selectedUnitType)) || project.units[0];
    let unitId = first.id, type = Number(first.type), newPlanOpen = false, selectedMark = null;
    let selectedId = 'living', drag = null, selectionPointer = null;
    let mode = 'rooms', selectedEdge = null, selectedVertex = null, autoFill = true, orthogonal = true, overlay = false, status = '', lastEdgeTap = null, linked = true;
    const active = () => project.units.find(u => u.id === unitId) || project.units[0];
    const changed = () => { project.selectedUnitType = type; project.selectedUnitId = unitId; if (typeof onChange === 'function') onChange(); };
    function selectUnit(id) { const unit = project.units.find(u => u.id === id) || project.units[0]; unitId = unit.id; type = Number(unit.type); selectedMark = null; }
    function markChanged() {
      for (const t of project.typologies) if (t.sourceUnitIds && t.sourceUnitIds.includes(active().id)) t.needsReview = true;
      changed();
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
        <div class="pu-options"><label><input type="checkbox" data-opt="autoFill" ${autoFill ? 'checked' : ''}>외곽 변경 후 빈 영역 자동 채우기</label><label><input type="checkbox" data-opt="orthogonal" ${orthogonal ? 'checked' : ''}>꼭짓점 이동 시 직각 유지</label>${unit.custom ? '' : `<label><input type="checkbox" data-opt="overlay" ${overlay ? 'checked' : ''}>참고도면 겹쳐 보기</label>`}<label title="Alt를 누른 채 끌면 반대로 동작합니다"><input type="checkbox" data-opt="linked" ${linked ? 'checked' : ''}>크기 조절 시 맞닿은 공간 함께 조정</label></div>
        <p class="pu-hint">${mode === 'markup' ? '도면 위를 끌어 빨간 영역을 그리세요(A, B, C…). Claude 대화에서 “영역 A로 욕실을 옮겨줘”처럼 요청하면 영역 위치와 겹친 공간이 요청에 함께 들어갑니다. 영역을 눌러 선택하고 Delete로 지웁니다.' : mode === 'rooms' ? '공간을 드래그해 이동하세요. 선택한 공간의 파란 변·모서리를 끌면 크기가 바뀌고, 맞닿은 공간의 경계도 함께 움직입니다(Alt: 이 공간만). 방향키 이동 0.1m · Alt+방향키로 오른쪽·아래 변 크기 조절.' : '외곽 변을 드래그하면 그 벽에 붙은 공간이 함께 늘어나거나 줄어듭니다. 변을 더블클릭하면 꺾임점 2개가 생기고, 가운데 변을 끌어 들어가거나 튀어나온 부분을 만듭니다. 꼭짓점을 선택하고 Delete로 지웁니다. 방향키 0.1m · Shift 0.5m.'}</p>
        <div class="pu-canvas-wrap"><svg class="pu-canvas${mode === 'outline' ? ' pu-outline-mode' : mode === 'markup' ? ' pu-markup-mode' : ''}" aria-label="${esc(unit.name)} 편집 가능한 조닝" role="group" tabindex="-1"></svg></div>
        <div class="pu-legend">${CATEGORIES.map(k => `<span><i style="background:${COLORS[k]}"></i>${CATEGORY_LABELS[k]}</span>`).join('')}<span><i style="background:repeating-linear-gradient(45deg,#c9d5df 0 2px,#fff 2px 5px)"></i>빈 영역</span></div><div class="pu-statrow pu-four" data-stats></div><div data-checks aria-live="polite"></div><div class="pu-status" data-status role="status">${esc(status)}</div>
        ${unit.custom ? `<p class="pu-note">사용자가 만든 빈 도면입니다. 외곽선 편집으로 외곽을 그리고 ＋ 공간 추가나 Claude 대화로 공간을 채우세요. 기준 평형 ${type}형은 동평면 조합에서 쓰는 참고값이며, 외곽 면적은 법정 전용면적이 아닙니다.</p>` : `<p class="pu-note">외곽과 실 배치는 LH 양주회천 A-26 ${type}A 공식 안내도의 표기 치수를 따라 개략 추적한 계획값입니다. 벽 두께와 중심선을 구분하지 않았고, 외곽 면적에는 확장 발코니·벽체·실외기실이 포함되므로 명목 전용면적과 다릅니다. 법정 전용면적 산정이 아닙니다.</p>
        <details class="pu-reference"><summary>공식 참고 평면과 도면 표기 치수 보기 · ${type}A</summary><img src="assets/${type}A-plan.png" alt="LH 양주회천 A-26 ${type}A 공식 참고 평면"><p>자료: LH 양주회천 A-26 ${type}A · 공식 도면 표기 ${Object.entries(ROOM_DATA[type].officialDims).map(([k, v]) => `${esc(k)} <strong>${esc(v)}</strong>`).join(' · ')} (mm).<br>표기 기준과 마감 두께를 확인하지 않은 값이며, 시공·가구 제작용 실측치가 아닙니다.</p></details>`}
        </div><aside class="pu-inspector"><div class="panel"><h3>${{ rooms: '공간 편집', outline: '외곽선', markup: '표시한 영역' }[mode]}</h3><div data-inspector></div></div><div class="panel pu-chat"><h3>✧ Claude 대화 <small>API 없이 복사·붙여넣기</small></h3><div class="pu-chat-log" data-chat-log aria-live="polite"></div>
          <div class="pu-chat-marks" data-chat-marks></div><textarea data-chat-input rows="3" placeholder="수정 요청을 쓰거나, Claude의 답변을 통째로 붙여넣으세요. (Ctrl+Enter 보내기)">${esc(CHAT.draft)}</textarea>
          <div class="pu-chat-actions"><span><button type="button" class="text-btn" data-chat-file-save>요청 파일 저장</button> · <label class="text-btn" style="cursor:pointer">답변 파일 열기<input type="file" accept=".json,application/json,text/plain" data-chat-file hidden></label></span><button type="button" class="btn primary" data-chat-send></button></div></div>
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
        if (!win.confirm(`“${unit.name}” 도면을 삭제할까요? 실행 취소(Ctrl+Z)로 복원할 수 있습니다.`)) return;
        project.units = project.units.filter(u => u.id !== unit.id); delete MARKS[unit.id];
        selectUnit(project.units[0].id); setStatus(`“${unit.name}” 도면을 삭제했습니다.`); render(); markChanged();
      });
      container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; selectedEdge = selectedVertex = null; render(); }));
      container.querySelectorAll('[data-opt]').forEach(input => input.addEventListener('change', () => {
        if (input.dataset.opt === 'autoFill') autoFill = input.checked;
        if (input.dataset.opt === 'orthogonal') orthogonal = input.checked;
        if (input.dataset.opt === 'overlay') { overlay = input.checked; paintSvg(); }
        if (input.dataset.opt === 'linked') linked = input.checked;
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
        if (!win.confirm(`${type}형을 참고도면 기반 기본 배치로 되돌릴까요? 실행 취소(Ctrl+Z)로 복원할 수 있습니다.`)) return;
        const unit = active(), fresh = createUnit(type);
        Object.assign(unit, { name: fresh.name, outline: fresh.outline, rooms: fresh.rooms, width: fresh.width, depth: fresh.depth, layoutVersion: 2, reference: fresh.reference });
        selectedEdge = selectedVertex = null; setStatus('참고도면 기반 배치로 재설정했습니다.'); render(); markChanged();
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
      const poly = unit.outline, svg = container.querySelector('.pu-canvas'), pad = 1.1, image = !unit.custom && ROOM_DATA[type] && ROOM_DATA[type].image;
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
        <path d="${path}" fill="none" stroke="#3d566d" stroke-width=".07" stroke-linejoin="miter" pointer-events="none"/>${dims}${editHandles}${resizeHandles(unit)}${marksSvg(unit)}`;
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
    function applyResize(unit, roomId, sides, starts, dx, dy, link) {
      let message = '';
      for (const side of sides) {
        const horizontal = side === 'left' || side === 'right';
        const result = resizeRoomClamped(unit, roomId, side, snap(starts[side] + (horizontal ? dx : dy), 0.05), { linked: link });
        if (!result.ok || result.clamped) message = result.message || message;
      }
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
        selectionPointer = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); return;
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
        selectionPointer = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); refresh(); return;
      }
      const handle = event.target.closest('[data-resize]');
      if (handle && p) {
        const room = active().rooms.find(r => r.id === selectedId), sides = handle.dataset.resize.split(' ');
        drag = { kind: 'resize', id: room.id, sides, starts: Object.fromEntries(sides.map(side => [side, sideValue(room, side)])), startX: p.x, startY: p.y, pointerId: event.pointerId, snapshot: snapshotOf(active()), moved: false, area: room.width * room.depth };
        selectionPointer = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); return;
      }
      const g = event.target.closest('[data-room]'); if (!g) return;
      const room = active().rooms.find(r => r.id === g.dataset.room);
      selectedId = room.id; selectionPointer = event.pointerId;
      if (!room.locked && p) drag = { kind: 'room', id: room.id, x: room.x, y: room.y, startX: p.x, startY: p.y, pointerId: event.pointerId, moved: false };
      event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault(); refresh();
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
        drag.moved = editRoom(unit, drag.id, { x: snap(drag.x + dx, 0.1), y: snap(drag.y + dy, 0.1) }) || drag.moved;
        refresh(); return;
      }
      if (drag.kind === 'resize') {
        restore(unit, drag.snapshot);
        const message = applyResize(unit, drag.id, drag.sides, drag.starts, dx, dy, linked !== event.altKey);
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
      drag = null; selectionPointer = null; refresh();
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
        if (m.role === 'me') return `<div class="pu-msg me">${esc(m.text)}<small>${esc(m.label)}${m.marks && m.marks.length ? ' · 영역 ' + m.marks.join(', ') : ''} · 개정 ${m.revision} · 요청문 ${m.copied ? '복사됨' : '자동 복사 안 됨'} · ${m.time}</small><button type="button" class="btn" data-chat-copy="${i}">${m.copied ? '요청문 다시 복사' : '요청문 복사'}</button></div>`;
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
      container.querySelector('[data-chat-file-save]').addEventListener('click', () => {
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
  return { createUnit, checkUnit, editRoom, fillUnit, setOutline, moveEdge, moveVertex, splitEdge, removeVertex, addRoom, createBlankUnit, roomsInMark, moveRoomLayer, layerAreas, resizeRoom, resizeRoomClamped, polygonArea, rectInside,
    buildUnitRequest, unitRequestPrompt, extractJson, readUnitPatch, applyUnitPatch, ensureUnits, generateCombinations, mountUnits, mountCombinations, schematicSvg };
});
