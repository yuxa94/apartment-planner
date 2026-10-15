const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const U = fs.existsSync(__dirname + '/units.js') ? require('./units.js') : {};

test('three independent zoning templates fit their envelopes without overlap', () => {
  assert.equal(typeof U.createUnit, 'function');
  const units = [59, 74, 84].map(U.createUnit);
  for (const unit of units) {
    const report = U.checkUnit(unit);
    assert.equal(report.overlaps.length, 0, unit.type + ' overlap');
    assert.equal(report.outside.length, 0, unit.type + ' outside');
    assert.ok(report.area > 50 && report.area < unit.width * unit.depth);
    assert.equal(unit.reference.status, 'illustrative');
    assert.equal(unit.rooms.filter(r => /침실|안방/.test(r.name)).length, 3);
  }
  assert.notEqual(units[1].rooms.find(r => r.id === 'bed3').y / units[1].depth,
    units[0].rooms.find(r => r.id === 'bed3').y / units[0].depth);
  const fresh = U.createUnit(59);
  units[0].rooms[0].width = 99;
  assert.notEqual(fresh.rooms[0].width, 99);
});

test('checks expose overlap and outside areas without calling zone sums exclusive area', () => {
  assert.equal(typeof U.checkUnit, 'function');
  const result = U.checkUnit({ width: 10, depth: 10, rooms: [
    { id: 'a', name: 'A', x: 0, y: 0, width: 3, depth: 3 },
    { id: 'b', name: 'B', x: 2, y: 2, width: 3, depth: 3 },
    { id: 'c', name: 'C', x: 9, y: 0, width: 2, depth: 2 }
  ] });
  assert.equal(result.overlaps.length, 1);
  assert.equal(result.overlaps[0].area, 1);
  assert.deepEqual(result.outside, ['c']);
  assert.equal(result.area, 22);
  assert.equal(result.unionArea, 21);
});

test('room edits respect lock and update dimensions with finite positive values', () => {
  assert.equal(typeof U.editRoom, 'function');
  const unit = U.createUnit(59);
  const room = unit.rooms[0];
  const before = room.width;
  room.locked = true;
  assert.equal(U.editRoom(unit, room.id, { width: 9 }), false);
  assert.equal(room.width, before);
  room.locked = false;
  assert.equal(U.editRoom(unit, room.id, { width: 4.5, depth: 3.2 }), true);
  assert.equal(room.width * room.depth, 14.4);
  assert.equal(U.editRoom(unit, room.id, { width: Infinity }), false);
  assert.equal(U.editRoom(unit, room.id, { depth: -1 }), false);
});

test('room edits reject nonpersistent sizes and positions without partial mutation', () => {
  const unit = U.createUnit(59), room = unit.rooms[0];
  for (const patch of [
    { width: 1000 }, { depth: 500.001 }, { width: 0.0001 }, { depth: 0.0999 },
    { x: -500.001 }, { x: 500.001 }, { y: -501 }, { y: 501 },
    { width: NaN }, { depth: -Infinity }, { x: Infinity }, { y: NaN },
    { width: 4, depth: 0.0001 }, { x: 2, y: 600 }
  ]) {
    const before = JSON.stringify(room);
    assert.equal(U.editRoom(unit, room.id, patch), false, JSON.stringify(patch));
    assert.equal(JSON.stringify(room), before, 'invalid patch must not partially mutate');
  }
});

test('room edits accept exact persistence bounds and round only valid dimensions', () => {
  const unit = U.createUnit(59), room = unit.rooms[0];
  assert.equal(U.editRoom(unit, room.id, { x: -500, y: 500, width: 0.1, depth: 500 }), true);
  assert.deepEqual([room.x, room.y, room.width, room.depth], [-500, 500, 0.1, 500]);
  assert.equal(U.editRoom(unit, room.id, { x: 500, y: -500, width: 500, depth: 0.1 }), true);
  assert.deepEqual([room.x, room.y, room.width, room.depth], [500, -500, 500, 0.1]);
  assert.equal(U.editRoom(unit, room.id, { width: 0.1004, depth: 2.1234 }), true);
  assert.deepEqual([room.width, room.depth], [0.1, 2.123]);
});

test('finite combinations preserve counts, actual envelopes and nonoverlapping geometry', () => {
  assert.equal(typeof U.generateCombinations, 'function');
  const units = [59, 74, 84].map(U.createUnit);
  for (const count of [2, 4, 6]) for (const coreCapacity of [2, 4]) {
    const result = U.generateCombinations(units, { count, coreCapacity, types: [59, 74, 84] });
    assert.equal(result.length, 3);
    assert.equal(new Set(result.map(r => r.id)).size, 3);
    for (const c of result) {
      assert.equal(c.unitsPerFloor, count);
      assert.equal(c.unitMix.reduce((s, m) => s + m.count, 0), count);
      assert.equal(c.coreCount, Math.ceil(count / coreCapacity));
      assert.equal(c.totalUnitArea, c.unitMix.reduce((s, m) => s + m.type * m.count, 0));
      assert.equal(c.unitArea, c.totalUnitArea / count);
      assert.equal(c.source, 'schematic');
      assert.ok(c.width > 0 && c.depth > 0 && c.coreArea > 0);
      const r = U.checkUnit({ width: c.width, depth: c.depth, rooms: c.geometry.units.concat(c.geometry.cores) });
      assert.equal(r.overlaps.length, 0);
      assert.equal(r.outside.length, 0);
      for (const placed of c.geometry.units) {
        const original = units.find(u => u.type === placed.type);
        assert.equal(placed.width, original.width);
        assert.equal(placed.depth, original.depth);
      }
    }
  }
});

test('mix choices and candidate generation are deterministic', () => {
  assert.equal(typeof U.generateCombinations, 'function');
  const units = [59, 74, 84].map(U.createUnit);
  const options = { count: 4, coreCapacity: 4, types: [74] };
  const a = U.generateCombinations(units, options);
  assert.deepEqual(a, U.generateCombinations(units, options));
  assert.deepEqual(a[0].unitMix, [{ type: 74, count: 4 }]);
});

test('Susaek4 101 reproduction matches the A-303 dimension strings', () => {
  const t = U.reproduceReference('susaek4-101');
  assert.equal(t.unitsPerFloor, 4);
  assert.equal(t.width, 20.08);
  for (const row of t.comparison) assert.ok(row.ok, row.label + ' ' + row.generated + ' vs ' + row.drawing);
  for (const check of t.checks) assert.ok(check.ok, check.label);
  // Narrow frontage, deep plan; entrances paired at the shared walls.
  for (const u of t.geometry.units) assert.ok(u.width < u.depth);
  assert.deepEqual(t.geometry.units.map(u => u.entrance), ['right', 'left', 'right', 'left']);
  const corridor = t.geometry.corridors[0], core = t.geometry.cores[0];
  assert.equal(core.y + core.depth, corridor.y);
  assert.ok(t.geometry.units.every(u => Math.abs(u.y - (corridor.y + corridor.depth)) < 1e-9));
  assert.equal(U.reproduceReference('missing'), null);
});

test('corridor rule flags a core that overhangs the corridor', () => {
  const ref = U.REFERENCES['susaek4-101'];
  const plan = U.buildCorridorPlan({ ...ref, core: { ...ref.core, offset: 15 } });
  assert.equal(plan.checks.find(c => c.label.includes('코어')).ok, false);
});

test('saved reproduction is a valid project typology', () => {
  const S = require('./state.js');
  const p = S.createProject();
  p.typologies.push(JSON.parse(JSON.stringify(U.reproduceReference('susaek4-101'))));
  assert.equal(S.validateProject(p).typologies[0].id, 'ref-susaek4-101');
});

const boxesOverlap = (a, b) => a[0] < b[2] - 1e-6 && b[0] < a[2] - 1e-6 && a[1] < b[3] - 1e-6 && b[1] < a[3] - 1e-6;
const plans = U.UNIT_PLAN_FILES.map(f => JSON.parse(fs.readFileSync(__dirname + '/' + f, 'utf8')));

test('unit plans from Stage 1: outline rectangles reproduce the outline area and the entrance sits on the outline', () => {
  for (const plan of plans) {
    const p = U.profileFromPlan(plan);
    const area = p.rects.reduce((s, r) => s + (r[2] - r[0]) * (r[3] - r[1]), 0);
    assert.ok(Math.abs(area - plan.checks.outlineArea) < 1e-3, p.type + ' area ' + area);
    assert.ok(p.door.y > 0 && p.door.y < p.depth, p.type + ' door depth');
  }
  assert.throws(() => U.profileFromPlan({ ...plans[0], unit: { ...plans[0].unit, rooms: plans[0].unit.rooms.filter(r => r.id !== 'entry') } }), /현관/);
  assert.throws(() => U.profileFromPlan({ ...plans[0], coordinateUnit: 'mm' }), /단위/);
});

test('every single core placement puts the entrance on a core face and keeps the unit off the core', () => {
  const core = { width: 8.6, depth: 8 };
  const { placements } = U.corePlacements(plans.map(U.profileFromPlan), core);
  assert.ok(placements.length > 20);
  for (const p of placements) {
    assert.ok(!p.rects.some(r => boxesOverlap(r, [0, 0, core.width, core.depth])), p.type + p.face);
    const onFace = p.door.every(([x, y]) => (Math.abs(y - core.depth) < 1e-6 || Math.abs(y) < 1e-6) ? x >= -1e-6 && x <= core.width + 1e-6 : (Math.abs(x) < 1e-6 || Math.abs(x - core.width) < 1e-6) && y >= -1e-6 && y <= core.depth + 1e-6);
    assert.ok(onFace, 'door off core face: ' + p.type + p.face + p.t);
  }
});

test('core combos: two south-facing units share one core like a stair-hall pair', () => {
  const r = U.generateCoreCombos(plans, { types: [59], counts: [2], coreWidth: 8.6, coreDepth: 5 });
  const pair = r.combos.find(c => c.facings.join() === '남향,남향');
  assert.ok(pair);
  const [a, b] = pair.geometry.units;
  assert.notEqual(a.mirrored, b.mirrored);
  assert.equal(r.combos.some(c => c.facings.includes('북향')), false);
  assert.deepEqual(pair.sourceUnitIds, ['unit-59']);
});

test('core combos: no overlapping units, deeper core admits 3–4 units, results are deterministic', () => {
  const opts = { types: [59, 74, 84], counts: [2, 3, 4], coreWidth: 8.6, coreDepth: 8 };
  const r = U.generateCoreCombos(plans, opts);
  for (const n of [2, 3, 4]) assert.ok(r.combos.some(c => c.unitsPerFloor === n), n + ' units');
  const ids = r.combos.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, U.generateCoreCombos(plans, opts).combos.map(c => c.id));
  for (const c of r.combos) {
    const units = c.geometry.units, core = c.geometry.core, coreRect = [core.x, core.y, core.x + core.width, core.y + core.depth];
    for (let i = 0; i < units.length; i++) {
      assert.ok(!units[i].rects.some(q => boxesOverlap(q, coreRect)), c.id + ' unit ' + i + ' overlaps core');
      for (let j = i + 1; j < units.length; j++) assert.ok(!units[i].rects.some(q => units[j].rects.some(w => boxesOverlap(q, w))), c.id + ` units ${i},${j} overlap`);
    }
  }
  assert.ok(U.generateCoreCombos(plans, { ...opts, allowNorth: true }).combos.length >= r.combos.length);
});

test('saved core combo is a valid project typology', () => {
  const S = require('./state.js'), p = S.createProject();
  p.typologies.push(JSON.parse(JSON.stringify(U.generateCoreCombos(plans, { coreDepth: 8 }).combos[0])));
  assert.equal(S.validateProject(p).typologies.length, 1);
});

test('core rules: lift count and capacity, stair type and fire lift follow floors and units per core', () => {
  const low = U.buildCore({ floors: 5, unitsPerFloor: 2 });
  assert.equal(low.lifts.count, 0);
  assert.equal(low.stairKind, 'escape');
  const mid = U.buildCore({ floors: 15, unitsPerFloor: 2 });
  assert.equal(mid.lifts.count, 1);
  assert.equal(mid.stairKind, 'escape');
  assert.ok(!mid.parts.some(p => p.kind === 'lobby'));
  const tall2 = U.buildCore({ floors: 25, unitsPerFloor: 2 });
  assert.equal(tall2.lifts.count, 1);
  assert.equal(tall2.stairKind, 'special');
  assert.ok(tall2.parts.some(p => p.kind === 'lobby'));
  assert.equal(tall2.lifts.emergency, true);
  const tall4 = U.buildCore({ floors: 25, unitsPerFloor: 4 });
  assert.equal(tall4.lifts.count, 2);
  // 4 units × 22 floors × 0.3 = 26.4 → 27 persons over two lifts.
  assert.equal(tall4.lifts.persons, 27);
  assert.ok(tall4.lifts.count * tall4.lifts.capacity >= 27);
  assert.equal(U.buildCore({ floors: 21, unitsPerFloor: 3 }).lifts.count, 1);
  assert.equal(U.buildCore({ floors: 22, unitsPerFloor: 3 }).lifts.count, 2);
});

test('core parts tile the core rectangles and the hall carries every door zone', () => {
  for (const options of [{ floors: 25, unitsPerFloor: 2, extLeft: 1.5, extRight: 3 }, { floors: 25, unitsPerFloor: 4, sideHalls: 'both' }, { floors: 12, unitsPerFloor: 3, sideHalls: 'E', extLeft: 3 }]) {
    const c = U.buildCore(options);
    const partArea = c.parts.reduce((s, p) => s + (p.rect[2] - p.rect[0]) * (p.rect[3] - p.rect[1]), 0);
    assert.ok(partArea <= c.commonArea + 1e-6, 'parts exceed core');
    for (const p of c.parts) assert.ok(c.rects.some(r => p.rect[0] >= r[0] - 1e-6 && p.rect[2] <= r[2] + 1e-6 && p.rect[1] >= r[1] - 1e-6 && p.rect[3] <= r[3] + 1e-6), p.name + ' outside core');
    for (let i = 0; i < c.parts.length; i++) for (let j = i + 1; j < c.parts.length; j++) assert.ok(!boxesOverlap(c.parts[i].rect, c.parts[j].rect), c.parts[i].kind + '/' + c.parts[j].kind);
  }
});

test('parametric core: hall extensions and side halls open 2–4 unit combinations with entrances on the hall', () => {
  const r = U.generateCoreCombos(plans, { floors: 25 });
  for (const n of [2, 3, 4]) assert.ok(r.combos.some(c => c.unitsPerFloor === n), n + ' units');
  for (const c of r.combos) {
    const hall = c.geometry.core.parts.filter(p => p.kind === 'hall').map(p => p.rect);
    for (const u of c.geometry.units) {
      const [[x0, y0], [x1, y1]] = u.door, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      assert.ok(hall.some(h => mx >= h[0] - 1e-6 && mx <= h[2] + 1e-6 && my >= h[1] - 1e-6 && my <= h[3] + 1e-6), c.id + ' door not on hall');
    }
    assert.ok(c.core && c.core.rules.length === 3);
  }
  const pair = r.combos.find(c => c.unitsPerFloor === 2 && c.facings.join() === '남향,남향');
  assert.ok(pair && pair.commonArea < 70);
});

test('drawn core blocks keep their stair/lift/shaft parts and get a generated hall on the south side', () => {
  for (const id of Object.keys(U.CORE_TEMPLATES)) {
    const t = U.CORE_TEMPLATES[id];
    const c = U.buildCore({ floors: 25, unitsPerFloor: 2, template: id, extLeft: 1.5, extRight: 3 });
    assert.equal(c.template.id, id);
    // Every drawn part survives with its size.
    assert.equal(c.parts.filter(p => p.kind === 'lift').length, t.lifts.length, id + ' lifts');
    const drawnStair = t.parts.find(p => p[0] === 'stair')[1], stair = c.parts.find(p => p.kind === 'stair').rect;
    assert.ok(Math.abs((stair[2] - stair[0]) - (drawnStair[2] - drawnStair[0])) < 1e-6 && Math.abs((stair[3] - stair[1]) - (drawnStair[3] - drawnStair[1])) < 1e-6, id + ' stair size');
    // The drawn internal hall reaches the generated hall band.
    const band = c.rects[0], hall = c.parts.filter(p => p.kind === 'hall');
    assert.ok(hall.some(h => Math.abs(h.rect[3] - band[3]) < 1e-6 && h.rect[1] < band[3]), id + ' internal hall reaches south edge');
    for (let i = 0; i < c.parts.length; i++) for (let j = i + 1; j < c.parts.length; j++) assert.ok(!boxesOverlap(c.parts[i].rect, c.parts[j].rect), id + ' ' + c.parts[i].kind + '/' + c.parts[j].kind);
    assert.ok(c.rules[0].ok, id + ' lift rule');
  }
});

test('drawn core blocks combine with the Stage 1 unit plans', () => {
  for (const id of ['gyeyang-59A', 'gyeyang-101']) {
    const r = U.generateCoreCombos(plans, { floors: 25, coreTemplate: id });
    assert.ok(r.combos.some(c => c.unitsPerFloor === 2 && c.facings.join() === '남향,남향'), id + ' south pair');
    assert.ok(r.combos.some(c => c.unitsPerFloor >= 3), id + ' wings');
    assert.ok(r.combos.every(c => c.core.template && c.core.template.id === id));
  }
});

test('unit-first assembly: units snap wall to wall and the core fills the gap their entrances face', () => {
  const r = U.assembleUnitsFirst(plans, { floors: 25 });
  assert.ok(r.combos.some(c => c.unitsPerFloor === 2) && r.combos.some(c => c.unitsPerFloor === 3));
  const touch = (a, b) => {
    const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    if ((Math.abs(a[2] - b[0]) < 1e-6 || Math.abs(b[2] - a[0]) < 1e-6) && oy > 0) return oy;
    if ((Math.abs(a[3] - b[1]) < 1e-6 || Math.abs(b[3] - a[1]) < 1e-6) && ox > 0) return ox;
    return 0;
  };
  for (const c of r.combos) {
    const units = c.geometry.units, parts = c.geometry.core.parts, hall = parts.filter(p => p.kind === 'hall').map(p => p.rect), solid = parts.filter(p => p.kind !== 'hall');
    for (let i = 0; i < units.length; i++) {
      for (const p of parts) assert.ok(!units[i].rects.some(q => boxesOverlap(q, p.rect)), c.id + ' core part over unit');
      for (let j = i + 1; j < units.length; j++) assert.ok(!units[i].rects.some(q => units[j].rects.some(w => boxesOverlap(q, w))), c.id + ' units overlap');
      const [[x0, y0], [x1, y1]] = units[i].door, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      assert.ok(hall.some(h => mx >= h[0] - 1e-6 && mx <= h[2] + 1e-6 && my >= h[1] - 1e-6 && my <= h[3] + 1e-6), c.id + ' entrance off hall');
    }
    for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) assert.ok(!boxesOverlap(solid[i].rect, solid[j].rect), c.id + ' parts overlap');
    for (const p of solid.filter(p => p.kind === 'stair' || p.kind === 'lift')) assert.ok(hall.reduce((s, h) => s + touch(p.rect, h), 0) >= 1 - 1e-6, c.id + ' ' + p.kind + ' not on hall');
    assert.equal(c.core.fitted, true);
  }
  const pair = r.combos.find(c => c.unitsPerFloor === 2 && c.facings.join() === '남향,남향');
  assert.ok(pair && pair.commonArea < 50, 'south pair core stays compact');
});
