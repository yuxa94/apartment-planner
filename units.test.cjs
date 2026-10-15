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
