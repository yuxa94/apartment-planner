
/* building-import.js */
/* Import of Stage 2 building plans (schema apartment-planner-building/1) into
   site-plan buildings. Each candidate becomes a building whose `shape` holds
   the footprint outline, unit outlines, core parts and window segments in local
   metres centred on the outline's bounding box (x east, y south). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlannerImport = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 'apartment-planner-building/1';
  const r3 = v => Math.round(v * 1000) / 1000;
  const finite = v => typeof v === 'number' && Number.isFinite(v);

  function areaOf(poly) {
    let a = 0;
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; });
    return a / 2;
  }

  // Outline of the union of axis-aligned rectangles [x1, y1, x2, y2]. Cells of
  // the compressed grid are filled when covered; boundary edges are linked into
  // loops and the largest loop is the footprint (courtyards are not kept).
  function unionOutline(rects) {
    const xs = [...new Set(rects.flatMap(r => [r3(r[0]), r3(r[2])]))].sort((a, b) => a - b);
    const ys = [...new Set(rects.flatMap(r => [r3(r[1]), r3(r[3])]))].sort((a, b) => a - b);
    const nx = xs.length - 1, ny = ys.length - 1;
    const filled = (i, j) => {
      if (i < 0 || j < 0 || i >= nx || j >= ny) return false;
      const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
      return rects.some(r => cx > Math.min(r[0], r[2]) && cx < Math.max(r[0], r[2]) && cy > Math.min(r[1], r[3]) && cy < Math.max(r[1], r[3]));
    };
    const grid = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) grid[j * nx + i] = filled(i, j);
    const at = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && grid[j * nx + i];
    // Directed edges keep the filled side on the right (clockwise on screen).
    const edges = new Map(), key = (i, j) => `${i},${j}`;
    const add = (a, b) => { const k = key(...a); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!at(i, j)) continue;
        if (!at(i, j - 1)) add([i, j], [i + 1, j]);
        if (!at(i + 1, j)) add([i + 1, j], [i + 1, j + 1]);
        if (!at(i, j + 1)) add([i + 1, j + 1], [i, j + 1]);
        if (!at(i - 1, j)) add([i, j + 1], [i, j]);
      }
    }
    const loops = [];
    while (edges.size) {
      const startKey = edges.keys().next().value;
      const loop = [];
      let cur = startKey.split(',').map(Number);
      for (let guard = 0; guard < 100000; guard++) {
        const k = key(...cur), out = edges.get(k);
        if (!out || !out.length) break;
        const next = out.shift();
        if (!out.length) edges.delete(k);
        loop.push([xs[cur[0]], ys[cur[1]]]);
        cur = next;
        if (key(...cur) === startKey) break;
      }
      if (loop.length >= 3) loops.push(simplify(loop));
    }
    loops.sort((a, b) => Math.abs(areaOf(b)) - Math.abs(areaOf(a)));
    return { outline: loops[0] || [], loops: loops.length };
  }

  // Drops collinear vertices.
  function simplify(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[(i + poly.length - 1) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-9) out.push(b);
    }
    return out;
  }

  function rectsOf(candidate) {
    const g = candidate.geometry || {};
    const units = Array.isArray(g.units) ? g.units : [];
    const rects = units.flatMap(u => Array.isArray(u.rects) ? u.rects : []);
    // The core's overall rectangle closes the gaps between its parts.
    const c = g.core || {};
    const core = (Array.isArray(c.rects) ? c.rects : []).concat([c.x, c.y, c.width, c.depth].every(finite) ? [[c.x, c.y, c.x + c.width, c.y + c.depth]] : []);
    return rects.concat(core).filter(r => Array.isArray(r) && r.length === 4 && r.every(finite));
  }

  // One candidate → building fields (without id, name, position).
  function toBuilding(candidate, floors) {
    const rects = rectsOf(candidate);
    if (rects.length < 1) throw new Error(`${candidate.name || '후보'}: 세대·코어 형상이 없습니다.`);
    const { outline, loops } = unionOutline(rects);
    if (outline.length < 3) throw new Error(`${candidate.name || '후보'}: 동 외곽을 만들 수 없습니다.`);
    const minX = Math.min(...outline.map(p => p[0])), maxX = Math.max(...outline.map(p => p[0]));
    const minY = Math.min(...outline.map(p => p[1])), maxY = Math.max(...outline.map(p => p[1]));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, L = p => [r3(p[0] - cx), r3(p[1] - cy)];
    const g = candidate.geometry;
    const units = (g.units || []).map(u => ({
      id: String(u.id ?? ''), type: u.type, name: String(u.name ?? `${u.type}형`), facing: String(u.facing ?? ''),
      outline: (u.outline || []).map(L)
    }));
    const windows = (g.units || []).flatMap(u => (u.windows || []).map(w => ({
      a: L(w.a), b: L(w.b), dir: w.dir, room: String(w.room ?? ''), category: String(w.category ?? ''), unit: String(u.id ?? '')
    })));
    const core = g.core ? { parts: (g.core.parts || []).map(p => ({ kind: String(p.kind ?? ''), name: String(p.name ?? ''),
      rect: [r3(p.rect[0] - cx), r3(p.rect[1] - cy), r3(p.rect[2] - cx), r3(p.rect[3] - cy)] })) } : null;
    const footprintArea = Math.abs(areaOf(outline));
    return {
      width: r3(maxX - minX), depth: r3(maxY - minY), rotation: 0,
      floors: Math.max(1, Math.min(100, Math.round(floors || candidate.core?.floors || 15))),
      unitsPerFloor: Math.max(1, Math.round(candidate.unitsPerFloor || units.length || 1)),
      unitArea: Math.max(10, Math.min(400, candidate.unitArea || 59)),
      coreArea: Math.max(0, Math.min(2000, candidate.coreArea || 0)),
      shape: {
        outline: outline.map(L), units, core, windows,
        source: { schema: SCHEMA, id: String(candidate.id ?? ''), name: String(candidate.name ?? ''),
          unitMix: (candidate.unitMix || []).map(m => `${m.type}×${m.count}`).join(' + '),
          footprintArea: r3(footprintArea), loops }
      }
    };
  }

  // Parsed file → { floors, candidates: [{ name, building, warnings }] }.
  function parseBuildingFile(raw) {
    if (!raw || raw.schema !== SCHEMA) throw new Error('동평면 파일 형식(apartment-planner-building/1)이 아닙니다.');
    if (raw.coordinateUnit !== 'm') throw new Error('좌표 단위가 m가 아닙니다.');
    const list = Array.isArray(raw.candidates) ? raw.candidates : [];
    if (!list.length) throw new Error('후보 동평면이 없습니다.');
    if (list.length > 60) throw new Error('후보가 너무 많습니다 (최대 60).');
    const floors = raw.settings && finite(raw.settings.floors) ? raw.settings.floors : undefined;
    return {
      floors,
      note: String(raw.note ?? ''),
      candidates: list.map(c => {
        const building = toBuilding(c, c.core?.floors || floors);
        const warnings = [];
        if (building.shape.source.loops > 1) warnings.push('떨어진 부분이 있어 가장 큰 외곽만 사용했습니다.');
        if (!building.shape.windows.length) warnings.push('창 정보가 없어 모든 면을 측벽으로 봅니다.');
        return { name: String(c.name ?? c.id ?? '후보'), building, warnings };
      })
    };
  }

  return Object.freeze({ SCHEMA, unionOutline, parseBuildingFile, toBuilding });
}));

