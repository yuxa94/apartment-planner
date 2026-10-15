'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Engine = require('./engine.js');

const SITE = [[0, 0], [100, 0], [100, 100], [0, 100]];
const rules = (changes = {}) => ({ setback: 2, minDistance: 5, distanceFactor: 0.5,
  northEnabled: true, northFactor: 0.5, northLowHeight: 9, northLowSetback: 2,
  northAngle: 0, coverageLimit: 50, farLimit: 300, ...changes });
const building = (changes = {}) => ({ id: 'A', x: 30, y: 30, width: 10, depth: 10,
  rotation: 0, floors: 3, floorHeight: 3, baseElevation: 0, unitsPerFloor: 2,
  unitArea: 40, coreArea: 20, ...changes });
function api(name) {
  assert.equal(typeof Engine[name], 'function', `${name} must be implemented`);
  return Engine[name];
}
function near(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected}`);
}

test('shoelace area handles a concave site and either vertex winding', () => {
  const poly = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  near(api('polygonArea')(poly), 64);
  near(Engine.polygonArea([...poly].reverse()), 64);
});

test('clockwise rotation keeps the footprint centre and dimensions', () => {
  const poly = api('footprint')(building({ x: 10, y: 20, width: 8, depth: 4, rotation: 90 }));
  const expected = [[12, 16], [12, 24], [8, 24], [8, 16]];
  poly.forEach((point, i) => point.forEach((value, j) => near(value, expected[i][j])));
  near(api('polygonArea')(poly), 32);
});

test('point containment includes boundary points and respects a concave notch', () => {
  const poly = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  const contains = api('insidePolygon');
  assert.equal(contains([2, 8], poly), true);
  assert.equal(contains([4, 8], poly), true);
  assert.equal(contains([8, 8], poly), false);
});

test('polygon intersection detects edge crossing, containment, and boundary touching', () => {
  const intersects = api('polygonsIntersect');
  const a = [[0, 0], [4, 0], [4, 4], [0, 4]];
  assert.equal(intersects(a, [[1, 1], [2, 1], [2, 2], [1, 2]]), true);
  assert.equal(intersects(a, [[4, 1], [6, 1], [6, 3], [4, 3]]), true);
  assert.equal(intersects(a, [[5, 1], [6, 1], [6, 3], [5, 3]]), false);
  assert.equal(intersects([[-3, -1], [3, -1], [3, 1], [-3, 1]],
    [[-1, -3], [1, -3], [1, 3], [-1, 3]]), true);
});

test('polygon distance measures rotated edges, not centres or bounding boxes', () => {
  const fp = api('footprint');
  const a = fp(building({ x: 0, y: 0, width: 2, depth: 2, rotation: 45 }));
  const b = fp(building({ x: 6, y: 0, width: 2, depth: 2, rotation: 45 }));
  const result = api('polygonDistance')(a, b);
  near(result.distance, 6 - 2 * Math.sqrt(2));
  near(result.a[0], Math.sqrt(2));
  near(result.a[1], 0);
  near(result.b[0], 6 - Math.sqrt(2));
  near(result.b[1], 0);
});

test('polygon distance returns zero for crossing and contained filled polygons', () => {
  const distance = api('polygonDistance');
  const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const b = [[2, 2], [3, 2], [3, 3], [2, 3]];
  const result = distance(a, b);
  near(result.distance, 0);
  assert.deepEqual(result.a, result.b);
});

test('site containment rejects a rectangle crossing a notch even when all corners are inside', () => {
  const site = [[0, 0], [12, 0], [12, 12], [8, 12], [8, 4], [4, 4], [4, 12], [0, 12]];
  const b = building({ x: 6, y: 7, width: 10, depth: 2 });
  const result = api('evaluateSite')(site, [b], rules({ setback: 0, northEnabled: false }));
  assert.equal(result.buildings[0].inside, false);
  assert.equal(result.buildings[0].pass, false);
  assert.equal(result.pass, false);
});

test('setback measures distance to site edges without treating containment as overlap', () => {
  const evaluate = api('evaluateSite');
  const result = evaluate(SITE, [building()], rules({ setback: 25 }));
  near(result.buildings[0].setback, 25);
  assert.equal(result.buildings[0].setbackPass, true);
  assert.equal(evaluate(SITE, [building()], rules({ setback: 25.1 })).buildings[0].setbackPass, false);
});

test('north angle rotates directional clearance and the low-height rule changes at its threshold', () => {
  const evaluate = api('evaluateSite');
  const b = building({ x: 30, y: 40 });
  const up = evaluate(SITE, [b], rules()).buildings[0];
  const right = evaluate(SITE, [b], rules({ northAngle: 90 })).buildings[0];
  near(up.northDistance, 35);
  near(right.northDistance, 65);
  near(up.northRequired, 2);
  const tall = evaluate(SITE, [building({ ...b, floors: 4 })], rules()).buildings[0];
  near(tall.northRequired, 6);
});

test('north clearance uses the first boundary at a concave notch', () => {
  const site = [[0, 0], [40, 0], [40, 40], [24, 40], [24, 15], [16, 15], [16, 40], [0, 40]];
  const result = api('evaluateSite')(site,
    [building({ x: 8, y: 25, width: 4, depth: 4 })], rules({ northAngle: 90 }));
  near(result.buildings[0].northDistance, 6);
});

test('height edits update required pair spacing while preserving geometric gap', () => {
  const evaluate = api('evaluateSite');
  const a = building({ x: 30 });
  const b = building({ id: 'B', x: 50 });
  const low = evaluate(SITE, [a, b], rules());
  near(low.pairs[0].distance, 10);
  near(low.pairs[0].required, 5);
  assert.equal(low.pairs[0].pass, true);
  const high = evaluate(SITE, [a, building({ ...b, floors: 10, baseElevation: 100 })], rules());
  near(high.pairs[0].distance, 10);
  near(high.pairs[0].required, 15);
  near(high.buildings[1].height, 30);
  assert.equal(high.pairs[0].pass, false);
  assert.equal(high.buildings[0].pass, false);
  assert.equal(high.buildings[1].pass, false);
});

test('touching buildings fail collision screening even when all spacing rules are zero', () => {
  const result = api('evaluateSite')(SITE, [building(), building({ id: 'B', x: 40 })],
    rules({ minDistance: 0, distanceFactor: 0, northEnabled: false }));
  near(result.pairs[0].distance, 0);
  assert.equal(result.pairs[0].pass, false);
  assert.equal(result.pass, false);
});

test('site metrics use footprint area, full floor area, percentages, and floor household count', () => {
  const result = api('evaluateSite')(SITE, [building({ width: 20, depth: 10, floors: 4, unitsPerFloor: 3 })], rules());
  near(result.area, 10000);
  near(result.footprintArea, 200);
  near(result.grossFloorArea, 800);
  near(result.coverage, 2);
  near(result.far, 8);
  assert.equal(result.households, 12);
  assert.equal(result.pass, true);
  assert.equal(Engine.evaluateSite(SITE, [building()], rules({ coverageLimit: 0.5 })).pass, false);
  assert.equal(Engine.evaluateSite(SITE, [building()], rules({ farLimit: 2 })).pass, false);
});

test('empty layouts return zero metrics without modifying inputs', () => {
  const evaluate = api('evaluateSite');
  const site = structuredClone(SITE);
  const config = rules();
  const snapshot = JSON.stringify({ site, config });
  const result = evaluate(site, [], config);
  assert.equal(result.households, 0);
  assert.equal(result.coverage, 0);
  assert.equal(result.far, 0);
  assert.equal(result.pass, true);
  assert.equal(JSON.stringify({ site, config }), snapshot);
});

test('invalid dimensions and non-finite geometry fail explicitly', () => {
  const evaluate = api('evaluateSite');
  for (const changes of [{ width: 0 }, { depth: -1 }, { floors: 0 }, { floors: 1.2 },
    { floorHeight: 0 }, { x: NaN }, { rotation: Infinity }, { unitsPerFloor: -1 }]) {
    assert.throws(() => evaluate(SITE, [building(changes)], rules()), /invalid|finite|positive|integer/i);
  }
  assert.throws(() => evaluate([[0, 0], [10, 10], [0, 10], [10, 0]], [], rules()), /polygon|site/i);
  assert.throws(() => evaluate(SITE, [building(), building()], rules()), /unique|duplicate/i);
  assert.throws(() => evaluate(SITE, [], rules({ setback: -1 })), /invalid|negative|nonnegative/i);
});

test('the browser global executes the same calculation without CommonJS', () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('./engine.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.PlannerEngine?.evaluateSite, 'function');
  near(sandbox.PlannerEngine.polygonArea([[0, 0], [4, 0], [4, 3], [0, 3]]), 12);
});

test('candidate placement matches full checks for collision, spacing, and rotated buildings', () => {
  const canPlace = api('canPlace');
  const other = building({ id: 'B', x: 50, y: 50, rotation: 35 });
  for (const [changes, expected] of [
    [{ x: 20, y: 50, rotation: 20 }, true],
    [{ x: 50, y: 50 }, false],
    [{ x: 35, y: 50, floors: 10 }, false],
    [{ x: 75, y: 50 }, true]
  ]) {
    const candidate = building(changes);
    assert.equal(canPlace(SITE, candidate, [other], rules()), expected);
    assert.equal(canPlace(SITE, candidate, [other], rules()),
      Engine.evaluateSite(SITE, [candidate, other], rules()).buildings[0].pass);
  }
});

test('candidate placement ignores stationary pair failures and overall area limits', () => {
  const canPlace = api('canPlace');
  const candidate = building({ x: 20, y: 50 });
  const others = [building({ id: 'B', x: 70, y: 50 }), building({ id: 'C', x: 75, y: 50 })];
  const config = rules({ coverageLimit: 0, farLimit: 0 });
  const full = Engine.evaluateSite(SITE, [candidate, ...others], config);
  assert.equal(full.pass, false);
  assert.equal(full.buildings[0].pass, true);
  assert.equal(canPlace(SITE, candidate, others, config), true);
});

test('candidate placement follows boundary setbacks and enabled directional north checks', () => {
  const canPlace = api('canPlace');
  for (const [changes, ruleChanges, expected] of [
    [{ x: 4 }, {}, false],
    [{ x: 6 }, {}, false],
    [{ x: 7 }, {}, true],
    [{ y: 10, floors: 10 }, {}, false],
    [{ y: 10, floors: 10 }, { northEnabled: false }, true],
    [{ x: 90, floors: 10 }, { northAngle: 90 }, false]
  ]) {
    const candidate = building(changes), config = rules(ruleChanges);
    assert.equal(canPlace(SITE, candidate, [], config), expected);
    assert.equal(canPlace(SITE, candidate, [], config), Engine.evaluateSite(SITE, [candidate], config).buildings[0].pass);
  }
});

test('candidate placement is pure and validates invalid dimensions and duplicate IDs', () => {
  const canPlace = api('canPlace');
  const candidate = building(), others = [building({ id: 'B', x: 70 })], config = rules();
  const snapshot = JSON.stringify({ candidate, others, config });
  canPlace(SITE, candidate, others, config);
  assert.equal(JSON.stringify({ candidate, others, config }), snapshot);
  assert.throws(() => canPlace(SITE, building({ width: -1 }), [], config), /invalid|positive/i);
  assert.throws(() => canPlace(SITE, candidate, [building()], config), /unique|duplicate/i);
});
