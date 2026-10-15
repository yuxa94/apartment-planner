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

test('reference-traced templates tile their outlines with no gap', () => {
  for (const type of [59, 74, 84]) {
    const unit = U.createUnit(type), report = U.checkUnit(unit);
    assert.ok(unit.outline.length >= 8, type + ' outline is not a plain rectangle');
    assert.equal(report.overlaps.length, 0);
    assert.deepEqual(report.outside, []);
    assert.equal(report.gapArea, 0, type + ' gap');
    assert.equal(report.area, report.outlineArea);
    assert.ok(report.outlineArea < unit.width * unit.depth);
  }
  assert.equal(U.createUnit(74).rooms.find(r => r.id === 'living').width, 4.59);
});

test('fill grows unlocked rooms until the outline is covered, keeping locked rooms', () => {
  const unit = U.createUnit(59), bath = unit.rooms.find(r => r.id === 'bath1');
  bath.locked = true;
  unit.rooms.forEach(r => { if (!r.locked) { r.width = Math.max(0.5, r.width - 0.6); r.depth = Math.max(0.5, r.depth - 0.5); } });
  const lockedBefore = JSON.stringify(bath);
  assert.ok(U.checkUnit(unit).gapArea > 30);
  const report = U.fillUnit(unit);
  assert.equal(report.overlaps.length, 0);
  assert.deepEqual(report.outside, []);
  assert.ok(report.gapArea < 0.01, 'gap left: ' + report.gapArea);
  assert.equal(JSON.stringify(bath), lockedBefore);
});

test('moving a wall stretches the rooms along it and keeps the outline filled', () => {
  const unit = U.createUnit(59), right = unit.outline.findIndex((p, i) => p[0] === 12.9 && unit.outline[(i + 1) % unit.outline.length][0] === 12.9);
  const bed3 = unit.rooms.find(r => r.id === 'bed3').width;
  assert.equal(U.moveEdge(unit, right, 0.5).ok, true);
  assert.equal(unit.width, 13.4);
  assert.equal(unit.rooms.find(r => r.id === 'bed3').width, round3(bed3 + 0.5));
  assert.equal(U.checkUnit(unit).gapArea, 0);
  unit.rooms.find(r => r.id === 'bed3').locked = true;
  assert.equal(U.moveEdge(unit, right, -0.5).ok, false, 'locked room on the wall blocks the move');
});
function round3(n) { return Math.round(n * 1000) / 1000; }

test('splitting and pushing part of a wall makes a square notch and can be pushed back flat', () => {
  const unit = U.createUnit(74), area = U.checkUnit(unit).outlineArea;
  const split = U.splitEdge(unit, 5, [14.4, 4]);
  assert.equal(split.ok, true);
  const moved = U.moveEdge(unit, split.edge, -1);
  assert.equal(moved.ok, true);
  for (let i = 0; i < unit.outline.length; i++) {
    const a = unit.outline[i], b = unit.outline[(i + 1) % unit.outline.length];
    assert.ok(a[0] === b[0] || a[1] === b[1], 'edge ' + i + ' stays orthogonal');
  }
  assert.equal(U.checkUnit(unit).outlineArea, round3(area - 1));
  assert.deepEqual(U.checkUnit(unit).outside, []);
  assert.equal(U.moveEdge(unit, moved.edge, 1).ok, true);
  assert.equal(U.checkUnit(unit).outlineArea, area);
});

test('orthogonal corner moves keep right angles and shift the origin back to zero', () => {
  const unit = U.createUnit(84), result = U.moveVertex(unit, 0, -0.5, 0.3, { orthogonal: true });
  assert.equal(result.ok, true);
  assert.equal(unit.width, 15.4);
  assert.ok(unit.outline.every(p => p[0] >= 0 && p[1] >= 0));
  assert.equal(U.checkUnit(unit).gapArea, 0);
  assert.throws(() => U.setOutline(unit, [[0, 0], [5, 5], [5, 0], [0, 5]]), /교차/);
});

test('unit request and patch round trip respects revision, locks and geometry', () => {
  const project = { revision: 7, units: [], typologies: [] };
  U.ensureUnits(project);
  const unit = project.units.find(u => u.type === 74);
  unit.rooms.find(r => r.id === 'bath2').locked = true;
  const request = U.buildUnitRequest(project, 74, '거실을 넓혀줘');
  assert.equal(request.schema, 'apartment-planner-unit-request/1');
  assert.equal(request.baseRevision, 7);
  assert.match(U.unitRequestPrompt(request), /```json/);
  const rooms = request.unit.rooms.map(r => Object.assign({}, r));
  const bed3 = rooms.find(r => r.id === 'bed3'), bed2 = rooms.find(r => r.id === 'bed2');
  bed3.width += 0.3; bed2.x += 0.3; bed2.width -= 0.3;
  const patch = { schema: 'apartment-planner-unit-patch/1', baseRevision: 7, unitType: 74, rooms, summary: '침실 3을 0.3m 넓힘' };
  const text = 'Here you go:\n```json\n' + JSON.stringify(patch) + '\n```';
  const preview = U.readUnitPatch(project, U.extractJson(text));
  assert.equal(preview.report.overlaps.length, 0);
  assert.equal(preview.report.gapArea, 0);
  assert.equal(unit.rooms.find(r => r.id === 'bed3').width, 3.16, 'preview does not mutate');
  U.applyUnitPatch(project, patch);
  assert.equal(unit.rooms.find(r => r.id === 'bed3').width, 3.46);
  assert.throws(() => U.readUnitPatch(project, Object.assign({}, patch, { baseRevision: 6 })), /개정/);
  assert.throws(() => U.readUnitPatch(project, Object.assign({}, patch, { color: 'red' })), /지원하지 않는/);
  const moved = rooms.map(r => r.id === 'bath2' ? Object.assign({}, r, { x: r.x + 0.1 }) : r);
  assert.throws(() => U.readUnitPatch(project, Object.assign({}, patch, { rooms: moved })), /잠긴/);
  assert.throws(() => U.readUnitPatch(project, Object.assign({}, patch, { rooms: rooms.map(r => Object.assign({}, r, { category: 'garage' })) })), /category/);
});

test('untouched first-edition templates are upgraded, edited ones are kept', () => {
  const legacy = { id: 'unit-59', type: 59, name: '59형 · 조닝 초안', width: 12.9, depth: 8.3, reference: {}, rooms: [
    ['master', .2, 4.5, 3.4, 3.6], ['living', 3.7, 4.3, 3.6, 4], ['bed2', 7.4, 5, 2.7, 3.3], ['bed3', 10.2, 5, 2.6, 3.3], ['kitchen', 3.7, .6, 3, 3.2],
    ['bath1', 6.9, .5, 1.6, 2.3], ['bath2', 1.9, .5, 1.4, 2.2], ['dress', .2, .5, 1.5, 1.8], ['entry', 8.8, 2.9, 1.5, 1.8], ['utility', .2, 2.4, 1.5, 2], ['pantry', 10.5, 3.2, 1, 1.2]
  ].map(([id, x, y, width, depth]) => ({ id, name: id, x, y, width, depth, category: 'service', locked: false })) };
  const edited = JSON.parse(JSON.stringify(legacy)); edited.type = 74; edited.id = 'unit-74'; edited.rooms[0].x = 0.4;
  const project = { units: [legacy, edited] };
  U.ensureUnits(project);
  assert.equal(project.units[0].layoutVersion, 2);
  assert.equal(U.checkUnit(project.units[0]).gapArea, 0);
  assert.equal(project.units[1].rooms[0].x, 0.4);
  assert.deepEqual(project.units[1].outline, [[0, 0], [12.9, 0], [12.9, 8.3], [0, 8.3]]);
});

test('resizing a room moves the shared wall with its neighbours and keeps the plan gapless', () => {
  const unit = U.createUnit(59), bed3 = unit.rooms.find(r => r.id === 'bed3'), bed2 = unit.rooms.find(r => r.id === 'bed2');
  const result = U.resizeRoom(unit, 'bed3', 'left', 9.85);
  assert.equal(result.ok, true);
  assert.deepEqual(result.changed.sort(), ['bed2', 'bed3']);
  assert.equal(bed3.width, 3.05);
  assert.equal(bed2.width, 2.45);
  assert.equal(U.checkUnit(unit).gapArea, 0);
  assert.equal(U.resizeRoom(unit, 'bed3', 'left', 9.5, { linked: false }).ok, false, 'alone it may not overlap');
  assert.equal(U.resizeRoom(unit, 'bed3', 'right', 13.5).ok, false, 'may not leave the outline');
  assert.equal(U.resizeRoom(unit, 'bed2', 'right', 7.6).ok, false, 'neighbour may not shrink below 300 mm');
  unit.rooms.find(r => r.id === 'kitchen').locked = true;
  assert.match(U.resizeRoom(unit, 'living', 'top', 4).message, /잠겨/);
});

test('an unlinked resize shrinks freely and a clamped grow stops at the nearest neighbour', () => {
  const unit = U.createUnit(74), bath1 = unit.rooms.find(r => r.id === 'bath1');
  assert.equal(U.resizeRoom(unit, 'bath1', 'right', 1.5, { linked: false }).ok, true);
  assert.equal(bath1.width, 1.5);
  assert.ok(U.checkUnit(unit).gapArea > 0);
  const grown = U.resizeRoomClamped(unit, 'bath1', 'right', 2.2, { linked: false });
  assert.equal(grown.ok, true);
  assert.equal(grown.clamped, true);
  assert.equal(bath1.width, 1.75);
  assert.equal(U.checkUnit(unit).gapArea, 0);
});
