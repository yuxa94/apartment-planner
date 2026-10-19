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
  assert.equal(U.resizeRoom(unit, 'bed3', 'left', 9.5, { linked: false }).ok, true, 'alone it may overlap; layer order decides');
  assert.equal(U.layerAreas(unit).find(l => l.id === 'bed2').visibleArea, 7.77, 'bed3 is the upper layer and takes 0.35 m of bed2');
  assert.equal(U.resizeRoom(unit, 'bed3', 'right', 13.5).ok, false, 'may not leave the outline');
  assert.equal(U.resizeRoom(unit, 'bed2', 'right', 7.6).ok, false, 'neighbour may not shrink below 300 mm');
  unit.rooms.find(r => r.id === 'kitchen').locked = true;
  assert.match(U.resizeRoom(unit, 'living', 'top', 4).message, /잠겨/);
});

test('an unlinked resize may overlap and a clamped grow stops at the outline', () => {
  const unit = U.createUnit(74), bath1 = unit.rooms.find(r => r.id === 'bath1');
  assert.equal(U.resizeRoom(unit, 'bath1', 'right', 1.5, { linked: false }).ok, true);
  assert.ok(U.checkUnit(unit).gapArea > 0);
  assert.equal(U.resizeRoom(unit, 'bath1', 'right', 2.2, { linked: false }).ok, true);
  assert.equal(bath1.width, 2.2);
  const grown = U.resizeRoomClamped(unit, 'bath1', 'left', -0.6, { linked: false });
  assert.equal(grown.ok, false, 'the outline edge is at x = 0');
  assert.equal(bath1.x, 0);
});

test('rooms are layers: the upper room takes the overlapped area and reordering hands it back', () => {
  const unit = U.createUnit(74), bath1 = unit.rooms.find(r => r.id === 'bath1');
  U.resizeRoom(unit, 'bath1', 'right', 2.2, { linked: false });
  const area = id => U.layerAreas(unit).find(l => l.id === id);
  assert.equal(unit.rooms.indexOf(bath1), 0, 'bath1 is the bottom layer');
  assert.equal(area('bath1').visibleArea, 4.463, 'shoes and hall cover the extension');
  assert.equal(area('shoes').visibleArea, 0.845);
  const report = U.checkUnit(unit);
  assert.equal(report.gapArea, 0);
  assert.equal(report.unionArea, report.outlineArea);
  assert.equal(U.moveRoomLayer(unit, 'bath1', unit.rooms.length - 1), true);
  assert.equal(unit.rooms[unit.rooms.length - 1], bath1);
  assert.equal(area('bath1').visibleArea, 5.61);
  assert.equal(area('shoes').visibleArea, 0.26);
  assert.equal(U.checkUnit(unit).unionArea, report.unionArea, 'reordering never changes the occupied total');
  assert.equal(U.moveRoomLayer(unit, 'bath1', unit.rooms.length - 1), false, 'already on top');
  U.resizeRoom(unit, 'bath1', 'right', 2.4, { linked: false });
  U.resizeRoom(unit, 'bath1', 'bottom', 5.7, { linked: false });
  assert.ok(U.checkUnit(unit).hidden.includes('shoes'), 'a fully covered room is reported');
});

test('blank plans load through the shared project validator and start empty', () => {
  const S = require('./state.js');
  const project = S.createProject();
  U.ensureUnits(project);
  const blank = U.createBlankUnit({ name: '테스트 도면', type: 74, width: 10, depth: 8 });
  project.units.push(blank);
  const loaded = S.validateProject(JSON.parse(JSON.stringify(project)));
  const unit = loaded.units.find(u => u.id === blank.id);
  assert.equal(unit.custom, true);
  assert.equal(unit.rooms.length, 0);
  assert.equal(U.checkUnit(unit).gapArea, 80);
  const room = U.addRoom(unit);
  assert.deepEqual([room.width, room.depth], [3, 3], 'a big empty plan gets a 3 m room, not a flood fill');
  assert.equal(U.createBlankUnit({ type: 99, width: 999 }).type, 84);
  assert.equal(U.createBlankUnit({ type: 99, width: 999 }).width, 60);
});

test('markup areas list the visible rooms under them and travel with the Claude request', () => {
  const project = { revision: 3, units: [], typologies: [] };
  U.ensureUnits(project);
  const unit = project.units.find(u => u.type === 59);
  const mark = { label: 'A', x: 7, y: 5, width: 2, depth: 2 };
  const rooms = U.roomsInMark(unit, mark);
  assert.deepEqual(rooms.map(r => r.id), ['bed2', 'living', 'hall']);
  assert.deepEqual(rooms.map(r => r.overlapArea), [2.4, 0.8, 0.8]);
  const request = U.buildUnitRequest(project, 'unit-59', '영역 A로 욕실을 옮겨줘', [mark]);
  assert.equal(request.unitId, 'unit-59');
  assert.equal(request.marks[0].label, 'A');
  assert.match(U.unitRequestPrompt(request), /영역 A: x 7~9 m, y 5~7 m \(침실 2, 거실, 복도\)/);
});

test('patches can target a blank plan by unitId', () => {
  const project = { revision: 5, units: [], typologies: [] };
  U.ensureUnits(project);
  const blank = U.createBlankUnit({ id: 'plan-x', name: '빈 도면', type: 59, width: 6, depth: 4 });
  project.units.push(blank);
  const patch = { schema: 'apartment-planner-unit-patch/1', baseRevision: 5, unitId: 'plan-x', unitType: 59,
    rooms: [{ id: 'a', name: '거실', category: 'living', x: 0, y: 0, width: 4, depth: 4 }, { id: 'b', name: '욕실', category: 'wet', x: 4, y: 0, width: 2, depth: 4 }] };
  const result = U.applyUnitPatch(project, patch);
  assert.equal(result.unitId, 'plan-x');
  assert.equal(blank.rooms.length, 2);
  assert.equal(U.checkUnit(blank).gapArea, 0);
  assert.equal(project.units.find(u => u.id === 'unit-59').rooms.length, 14, 'the 59 template is untouched');
  assert.throws(() => U.readUnitPatch(project, Object.assign({}, patch, { unitId: 'nope' })), /찾을 수 없습니다/);
});

test('snapping pulls a dragged edge onto nearby room edges and outline vertices', () => {
  const unit = U.createUnit(59), bed3 = unit.rooms.find(r => r.id === 'bed3');
  const near = U.snapRoomMove(unit, bed3, 10.08, 5.57, 0.15);
  assert.equal(near.x, 10.15, 'left edge snaps to bed2 right edge');
  assert.equal(near.y, 5.5, 'top edge snaps to the hall bottom line');
  assert.deepEqual(near.guides.filter(g => g.axis === 'x').map(g => g.value), [10.15, 12.9], 'both aligned edges get a guide');
  assert.deepEqual(near.guides.filter(g => g.axis === 'y').map(g => g.value), [5.5, 9.2]);
  assert.deepEqual(near.guides.find(g => g.axis === 'point'), { axis: 'point', x: 10.15, y: 5.5 });
  const right = U.snapRoomMove(unit, bed3, 10.22, 5.0, 0.15);
  assert.equal(right.x, 10.15);
  assert.equal(right.snappedY, false, 'nothing within tolerance on y');
  const far = U.snapRoomMove(unit, bed3, 9.6, 5.0, 0.15);
  assert.equal(far.snappedX, false);
  assert.deepEqual(U.snapCoordinate(unit, 'x', 8.62, 0.15, ['bed3']), { value: 8.7, snapped: true }, 'outline vertex line');
  assert.deepEqual(U.snapCoordinate(unit, 'x', 9.0, 0.15, ['bed3']), { value: 9.0, snapped: false });
});

// ---- Stage 2 (동평면 조합) tests ----
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

test('unit-first hall is a connected corridor network sized to the entrances', () => {
  const r = U.assembleUnitsFirst(plans, { floors: 25 });
  assert.ok(r.combos.some(c => c.unitsPerFloor === 4), '4-unit cores');
  const touches = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) >= -1e-6 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) >= -1e-6;
  for (const c of r.combos) {
    const hall = c.geometry.core.parts.filter(p => p.kind === 'hall').map(p => p.rect);
    // Every hall rect is reachable from the first one through rects that touch or overlap.
    const seen = new Set([0]), queue = [0];
    while (queue.length) { const i = queue.shift(); hall.forEach((r, j) => { if (!seen.has(j) && touches(hall[i], r)) { seen.add(j); queue.push(j); } }); }
    assert.equal(seen.size, hall.length, c.id + ' hall split');
  }
  const median = n => { const a = r.combos.filter(c => c.unitsPerFloor === n).map(c => c.commonArea).sort((x, y) => x - y); return a[a.length >> 1]; };
  assert.ok(median(3) < 65, 'three-unit cores stay near the 57–67 ㎡ reference range');
});

test('candidates export as standalone building JSON that round-trips', () => {
  const r = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] });
  const one = U.exportCandidates(r.combos[0], { mode: 'units', floors: 25 });
  assert.equal(one.schema, 'apartment-planner-building/1');
  assert.equal(one.coordinateUnit, 'm');
  assert.equal(one.count, 1);
  const back = JSON.parse(JSON.stringify(one));
  assert.deepEqual(back.candidates[0].geometry, r.combos[0].geometry);
  assert.equal(back.settings.floors, 25);
  const all = U.exportCandidates(r.combos.slice(0, 5), { floors: 25 });
  assert.equal(all.count, 5);
  assert.match(U.candidateFileName(r.combos[0], {}), /^building-2u-[0-9x-]+-[0-9A-Za-z]*\.json$/);
  assert.match(U.candidateFileName(r.combos.slice(0, 5), { floors: 25 }), /^building-candidates-2u-5-f25\.json$/);
  // The exported candidate is still a valid project typology.
  const S = require('./state.js'), p = S.createProject();
  p.typologies.push(back.candidates[0]);
  assert.equal(S.validateProject(p).typologies.length, 1);
});

test('east, west and north fronts are switched separately', () => {
  const only = opts => new Set(U.assembleUnitsFirst(plans, { floors: 25, counts: [2, 3], ...opts }).combos.flatMap(c => c.geometry.units.map(u => u.face)));
  const noWest = only({ allowEast: true, allowWest: false });
  assert.ok(!noWest.has('W') && !noWest.has('N'));
  const noEast = only({ allowEast: false, allowWest: true });
  assert.ok(!noEast.has('E'));
  const core = U.generateCoreCombos(plans, { floors: 25, counts: [3], allowEast: false, allowWest: false });
  assert.ok(core.combos.every(c => c.geometry.units.every(u => u.face === 'S')));
});

test('windows sit on exposed outline edges of habitable rooms and point the way those edges face', () => {
  const r = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] });
  const pair = r.combos.find(c => c.facings.join() === '남향,남향');
  assert.ok(pair.windows.total.S > 20, 'south-facing pair has long south windows');
  for (const u of pair.geometry.units) {
    assert.ok(u.windows.some(w => w.category === 'living' && w.dir === 'S'));
    for (const w of u.windows) {
      // A window never runs along another unit's wall or the core.
      const others = [...pair.geometry.units.filter(v => v !== u).flatMap(v => v.rects), ...pair.geometry.core.parts.map(p => p.rect)];
      const mx = (w.a[0] + w.b[0]) / 2, my = (w.a[1] + w.b[1]) / 2;
      assert.ok(!others.some(q => mx > q[0] + 1e-6 && mx < q[2] - 1e-6 && my >= q[1] - 1e-6 && my <= q[3] + 1e-6 && (Math.abs(my - q[1]) < 1e-6 || Math.abs(my - q[3]) < 1e-6)), 'window against a neighbour');
    }
  }
});

test('saved candidates can be moved, turned, mirrored and checked by hand', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  assert.ok(U.isEditable(c));
  assert.deepEqual(U.checkEdited(c), []);
  // Moving a unit onto its neighbour is flagged; moving it back clears it.
  const w = c.geometry.units[0].rects[0][2] - c.geometry.units[0].rects[0][0];
  const bad = U.editMove(c, { kind: 'unit', i: 1 }, -w, 0);
  assert.ok(U.checkEdited(bad).some(x => x.includes('겹침')));
  assert.deepEqual(U.checkEdited(U.editMove(bad, { kind: 'unit', i: 1 }, w, 0)), []);
  // Four quarter turns return the unit; facing cycles S → W → N → E → S.
  let t = c;
  const faces = [];
  for (let k = 0; k < 4; k++) { t = U.editRotate(t, { kind: 'unit', i: 0 }); faces.push(t.geometry.units[0].face); }
  assert.deepEqual(faces, ['W', 'N', 'E', 'S']);
  assert.deepEqual(t.geometry.units[0].rects, c.geometry.units[0].rects);
  const m = U.editMirror(U.editMirror(c, { kind: 'unit', i: 0 }), { kind: 'unit', i: 0 });
  assert.deepEqual(m.geometry.units[0].rects, c.geometry.units[0].rects);
  // Adding and removing a part updates the common area; saving normalises the origin and stays a valid typology.
  const added = U.editAddPart(c, 'shaft');
  assert.ok(added.commonArea > c.commonArea);
  assert.equal(U.editRemovePart(added, added.geometry.core.parts.length - 1).commonArea, c.commonArea);
  const saved = U.normalizeEdited(U.editMove(c, { kind: 'part', i: 0 }, 5, 5));
  const all = [...saved.geometry.units.flatMap(u => u.rects), ...saved.geometry.core.parts.map(p => p.rect)];
  assert.equal(Math.min(...all.map(r => r[0])), 0);
  assert.equal(Math.min(...all.map(r => r[1])), 0);
  const S = require('./state.js'), p = S.createProject();
  p.typologies.push(saved);
  assert.equal(S.validateProject(p).typologies.length, 1);
});

test('hand-edit checks accept a special stair that reaches the hall through its lobby', () => {
  for (const c of U.generateCoreCombos(plans, { floors: 25, counts: [2, 3] }).combos.slice(0, 20)) assert.deepEqual(U.checkEdited(c), [], c.id);
});

test('core parts resize from their bounding-box handles with wall snapping and a minimum size', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  const i = c.geometry.core.parts.findIndex(p => p.kind === 'shaft'), r = c.geometry.core.parts[i].rect;
  // East handle 0.52 m right lands on the 5 cm grid (or on a wall within 0.3 m).
  const e = U.resizeRect(c, i, 'e', .52, 0);
  assert.equal(e[0], r[0]); assert.equal(e[1], r[1]); assert.equal(e[3], r[3]);
  assert.ok(Math.abs(e[2] - (r[2] + .52)) <= .3 + 1e-6);
  // Dragging a corner past the opposite side stops at the 0.3 m minimum.
  const nw = U.resizeRect(c, i, 'nw', 50, 50);
  assert.ok(nw[2] - nw[0] >= .3 - 1e-6 && nw[3] - nw[1] >= .3 - 1e-6);
  const t = U.editResize(c, i, e);
  assert.ok(t.commonArea >= c.commonArea - 1e-6);
  // A quarter turn of a part keeps its centre and swaps width and depth.
  const turned = U.editRotate(c, { kind: 'part', i }).geometry.core.parts[i].rect;
  assert.ok(Math.abs((turned[0] + turned[2]) - (r[0] + r[2])) < 1e-6 && Math.abs((turned[2] - turned[0]) - (r[3] - r[1])) < 1e-6);
});

test('rotating a part records its quarter turn so square lifts still show where they open', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  const i = c.geometry.core.parts.findIndex(p => p.kind === 'lift');
  let t = c;
  const turns = [];
  for (let k = 0; k < 4; k++) { t = U.editRotate(t, { kind: 'part', i }); turns.push(t.geometry.core.parts[i].turn); }
  assert.deepEqual(turns, [1, 2, 3, 0]);
  const svg0 = U.coreComboSvg(c), svg1 = U.coreComboSvg(U.editRotate(c, { kind: 'part', i }));
  assert.notEqual(svg0, svg1, 'drawing changes after a quarter turn');
});

test('free rotation: any angle is kept, checks use the rotated shape, and turning back restores the layout', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  const i = c.geometry.core.parts.findIndex(p => p.kind === 'stair');
  const t30 = U.editSetAngle(c, { kind: 'part', i }, 30);
  assert.equal(t30.geometry.core.parts[i].angle, 30);
  // A long stair turned 30° in a tight core runs into its neighbours.
  assert.ok(U.checkEdited(t30).length > 0);
  assert.deepEqual(U.checkEdited(U.editSetAngle(t30, { kind: 'part', i }, 0)), []);
  assert.equal(U.editSetAngle(c, { kind: 'part', i }, -45).geometry.core.parts[i].angle, 315);
  // Units turn freely too; the facing label follows the turned front.
  const u = U.editSetAngle(c, { kind: 'unit', i: 0 }, 20).geometry.units[0];
  assert.equal(u.angle, 20);
  assert.match(u.facing, /20°/);
  // Rotated layouts still report windows and stay valid typologies after saving.
  const saved = U.normalizeEdited(U.editSetAngle(U.editMove(c, { kind: 'unit', i: 0 }, -8, 0), { kind: 'unit', i: 0 }, 20));
  assert.ok(saved.windows.total.S + saved.windows.total.E + saved.windows.total.W + saved.windows.total.N > 0);
  const S = require('./state.js'), p = S.createProject();
  p.typologies.push(saved);
  assert.equal(S.validateProject(p).typologies.length, 1);
});

test('rotated parts resize in their own frame, and parts can be drawn and deleted', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  const drawn = U.editAddPart(c, 'shaft', [-10, -10, -8.8, -7.6]);
  const k = drawn.geometry.core.parts.length - 1;
  assert.deepEqual(drawn.geometry.core.parts[k].rect, [-10, -10, -8.8, -7.6]);
  const dot = U.editAddPart(c, 'lift', [-20, -20]).geometry.core.parts.at(-1).rect;
  assert.ok(Math.abs((dot[2] - dot[0]) - 2.25) < 1e-6 && Math.abs((dot[0] + dot[2]) / 2 + 20) < 1e-6);
  // Widen a part turned 90° from its local east handle: the west side (now the north side on screen) stays put.
  const turned = U.editSetAngle(drawn, { kind: 'part', i: k }, 90), before = turned.geometry.core.parts[k].rect;
  const after = U.resizeRect(turned, k, 'e', 0, 1);
  assert.ok(Math.abs((after[2] - after[0]) - ((before[2] - before[0]) + 1)) < 1e-6, 'local width grows by 1 m');
  const top = r => (r[1] + r[3]) / 2 - (r[2] - r[0]) / 2;   // north edge of a part turned 90°
  assert.ok(Math.abs(top(after) - top(before)) < 1e-6, 'fixed side stays');
  assert.equal(U.editRemovePart(drawn, k).geometry.core.parts.length, c.geometry.core.parts.length);
  assert.ok(U.polysOverlap([[0, 0], [2, 0], [2, 2], [0, 2]], [[1, 1], [3, 1], [3, 3], [1, 3]]));
  assert.ok(!U.polysOverlap([[0, 0], [2, 0], [2, 2], [0, 2]], [[2, 0], [4, 0], [4, 2], [2, 2]]), 'touching is not overlapping');
});

test('editor snapping: a moved edge lands on another shape\'s line and reports a guide; Ctrl-style zero tolerance does not', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0];
  const i = c.geometry.core.parts.findIndex(p => p.kind === 'shaft'), r = c.geometry.core.parts[i].rect;
  const lines = [...c.geometry.units.flatMap(u => u.rects.flatMap(q => [q[0], q[2]])), ...c.geometry.core.parts.filter((_, j) => j !== i).flatMap(p => [p.rect[0], p.rect[2]])];
  const target = lines.map(l => l - r[0]).filter(d => Math.abs(d) > .5).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  const s = U.snapMove(c, { kind: 'part', i }, target + .13, 0, .3);
  assert.equal(round2(r[0] + s.dx), round2(r[0] + target));
  assert.ok(s.guides.some(g => g.axis === 'x'));
  const free = U.snapMove(c, { kind: 'part', i }, target + .13, 0, 0);
  assert.equal(free.guides.length, 0);
  assert.ok(Math.abs(free.dx - (target + .15)) < 1e-6 || Math.abs(free.dx - (target + .1)) < 1e-6, 'grid only');
});

const round2 = v => Math.round(v * 1000) / 1000;

test('doors and windows slide along walls, jump to another wall, and can be deleted or added', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0], u = c.geometry.units[0];
  // Door: dragged towards a far point it lands on the nearest wall, 1 m wide and on the outline.
  const b = u.outline.reduce((m, p) => [Math.min(m[0], p[0]), Math.min(m[1], p[1]), Math.max(m[2], p[0]), Math.max(m[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]);
  const moved = U.editMoveDoor(c, 0, [(b[0] + b[2]) / 2, b[3] + .4], 0).t.geometry.units[0].door;
  assert.ok(Math.abs(Math.hypot(moved[1][0] - moved[0][0], moved[1][1] - moved[0][1]) - 1) < 1e-6);
  assert.ok(Math.abs(moved[0][1] - b[3]) < 1e-6 && Math.abs(moved[1][1] - b[3]) < 1e-6, 'door on the south wall');
  const noDoor = U.editDeleteDoor(c, 0);
  assert.equal(noDoor.geometry.units[0].door, null);
  assert.ok(U.checkEdited(noDoor).some(x => x.includes('현관 없음')));
  // Windows: first edit switches the unit to hand-placed windows; delete and add change the count and totals.
  const n = u.windows.length;
  const del = U.editDeleteWindow(c, 0, 0);
  assert.equal(del.geometry.units[0].windowsManual, true);
  assert.equal(del.geometry.units[0].windows.length, n - 1);
  const add = U.editAddWindow(del, 0, [b[0] + 3, b[3]]);
  assert.equal(add.geometry.units[0].windows.length, n);
  assert.equal(add.geometry.units[0].windows.at(-1).dir, 'S');
  const slid = U.editMoveWindow(add, 0, n - 1, [b[0] + 5, b[3] + .3], 0).t.geometry.units[0].windows.at(-1);
  assert.ok(Math.abs((slid.a[0] + slid.b[0]) / 2 - (b[0] + 5)) < .06);
  // Hand-placed windows follow the unit when it turns and are kept by moves; going back to automatic restores them.
  const turned = U.editRotate(add, { kind: 'unit', i: 0 }).geometry.units[0];
  assert.equal(turned.windows.at(-1).dir, 'W');
  assert.equal(U.editAutoWindows(add, 0).geometry.units[0].windows.length, n);
});

test('outline walls push and pull, carrying the rooms, door and windows on them', () => {
  const c = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] }).combos[0], u = c.geometry.units[0];
  const area = rs => rs.reduce((s, r) => s + (r[2] - r[0]) * (r[3] - r[1]), 0);
  // The south wall: the longest horizontal edge at the largest y.
  const maxY = Math.max(...u.outline.map(p => p[1]));
  const e = u.outline.findIndex((p, k) => { const q = u.outline[(k + 1) % u.outline.length]; return Math.abs(p[1] - maxY) < 1e-6 && Math.abs(q[1] - maxY) < 1e-6; });
  assert.ok(e >= 0);
  const out = U.moveOutlineEdge(c, 0, e, .6);
  assert.ok(out.ok, out.message);
  const v = out.t.geometry.units[0];
  assert.ok(area(v.rects) > area(u.rects));
  // Rooms whose side sat on that wall moved with it, so nothing new sticks out.
  assert.ok(!U.checkEdited(U.editMove(out.t, { kind: 'unit', i: 0 }, 0, 0)).some(x => x.includes('외곽선 밖')));
  assert.ok(v.rooms.some(r => Math.abs(r.rect[3] - (maxY + .6)) < 1e-6));
  // Pulled back, the outline area returns.
  const back = U.moveOutlineEdge(out.t, 0, out.t.geometry.units[0].outline.findIndex((p, k, o) => Math.abs(p[1] - (maxY + .6)) < 1e-6 && Math.abs(o[(k + 1) % o.length][1] - (maxY + .6)) < 1e-6), -.6);
  assert.ok(back.ok);
  assert.ok(Math.abs(area(back.t.geometry.units[0].rects) - area(u.rects)) < 1e-6);
  // Pushing a wall through the opposite side is refused.
  assert.equal(U.moveOutlineEdge(c, 0, e, -50).ok, false);
});

test('building JSON round-trips back into saved types, with clashing ids renamed and bad entries reported', () => {
  const r = U.assembleUnitsFirst(plans, { floors: 25, counts: [2] });
  const doc = U.exportCandidates(r.combos.slice(0, 2), { floors: 25 });
  const back = U.importCandidates(JSON.stringify(doc), [r.combos[0].id]);
  assert.equal(back.added.length, 2);
  assert.notEqual(back.added[0].id, r.combos[0].id, 'clashing id renamed');
  assert.deepEqual(back.added[1].geometry.units.map(u => u.outline), r.combos[1].geometry.units.map(u => u.outline));
  assert.deepEqual(back.errors, []);
  // A chat-edited copy: one unit moved; derived numbers are recomputed on import.
  const edited = JSON.parse(JSON.stringify(doc));
  edited.candidates[0].width = 1;
  const again = U.importCandidates(edited, []);
  assert.ok(again.added[0].width > 1);
  assert.equal(U.importCandidates('{not json', []).errors.length, 1);
  assert.equal(U.importCandidates({ schema: 'other/1' }, []).errors.length, 1);
  assert.equal(U.importCandidates({ name: 'x' }, []).added.length, 0);
  const S = require('./state.js'), p = S.createProject();
  p.typologies.push(...back.added);
  assert.equal(S.validateProject(p).typologies.length, 2);
});
