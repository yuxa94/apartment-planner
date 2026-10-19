'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('./building-import.js');
const E = require('./engine.js');
const S = require('./state.js');
const M = require('./massing.js');
const sample = require('./fixtures/building-3u-59x2-74x1.json');

const near = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) <= t, `${a} ≠ ${b}`);
const area = poly => Math.abs(poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

test('union outline merges touching rectangles into one simplified loop', () => {
  const { outline, loops } = I.unionOutline([[0, 0, 10, 5], [10, 0, 12, 8], [0, 5, 4, 8]]);
  assert.equal(loops, 1);
  near(area(outline), 50 + 16 + 12);
  assert.equal(outline.length, 8); // (0,0)(12,0)(12,8)(10,8)(10,5)(4,5)(4,8)(0,8)
  assert.equal(I.unionOutline([[0, 0, 1, 1], [5, 5, 6, 6]]).loops, 2);
});

test('the Stage 2 sample becomes one shaped building centred on its bounding box', () => {
  const parsed = I.parseBuildingFile(sample);
  assert.equal(parsed.candidates.length, 1);
  const { building, warnings } = parsed.candidates[0];
  assert.deepEqual(warnings, []);
  near(building.width, 25.8); near(building.depth, 24.65);
  assert.equal(building.floors, 25);
  assert.equal(building.unitsPerFloor, 3);
  assert.equal(building.shape.windows.length, 22);
  assert.equal(building.shape.units.length, 3);
  near(building.shape.source.footprintArea, 401.95, 1e-3);
  const xs = building.shape.outline.map(p => p[0]), ys = building.shape.outline.map(p => p[1]);
  near(Math.min(...xs) + Math.max(...xs), 0); near(Math.min(...ys) + Math.max(...ys), 0);
  assert.throws(() => I.parseBuildingFile({ ...sample, schema: 'x' }), /형식/);
  assert.throws(() => I.parseBuildingFile({ ...sample, coordinateUnit: 'mm' }), /단위/);
});

const placed = (changes = {}) => ({ id: 'b201', name: '201동', x: 100, y: 100, floorHeight: 2.9, baseElevation: 0, locked: false,
  ...I.parseBuildingFile(sample).candidates[0].building, ...changes });

test('a shaped building validates, keeps its outline area and rotates with the building', () => {
  const p = S.createProject();
  p.buildings.push(placed());
  assert.equal(S.validateProject(p).buildings[3].shape.outline.length, 20);
  near(E.polygonArea(E.footprint(placed())), 401.95, 1e-6);
  near(E.polygonArea(E.footprint(placed({ rotation: 33 }))), 401.95, 1e-6);
  const bad = S.clone(p); bad.buildings[3].shape.outline = [[0, 0], [1, 1]];
  assert.throws(() => S.validateProject(bad));
});

test('window segments decide the facing kinds of a shaped building', () => {
  const site = [[0, 0], [300, 0], [300, 300], [0, 300]];
  const rules = { setback: 0, minDistance: 0, distanceFactor: 0.5, northEnabled: false, northFactor: 0.5, northLowHeight: 10,
    northLowSetback: 1.5, northAngle: 0, coverageLimit: 100, farLimit: 9999, profile: 'facing',
    facing: { lightFactor: 1, southLowTall: 0, southLowLow: 1, southLowMin: 0, sideToSide: 4 } };
  // A plain slab due south faces the sample's south side, which has living-room windows.
  const slab = { id: 's', name: 'S', x: 100, y: 160, width: 20, depth: 10, rotation: 0, floors: 5, floorHeight: 3, baseElevation: 0, unitsPerFloor: 2, unitArea: 59, coreArea: 0 };
  let pair = E.evaluateSite(site, [placed(), slab], rules).pairs[0];
  assert.equal(pair.basis.faces[0], 'light');
  // Without windows every face is a side wall.
  const blind = placed(); blind.shape = { ...blind.shape, windows: [] };
  pair = E.evaluateSite(site, [blind, { ...slab, width: 4, depth: 4 }], rules).pairs[0];
  assert.equal(pair.basis.faces[0], 'side');
});

test('3D shows the 정북 plane and a roof handle, and maps screen points back to the ground', () => {
  const project = S.createProject();
  project.rules.northEnabled = true;
  project.buildings.push(placed({ x: 100, y: 110 }));
  const result = E.evaluateSite(project.site.polygon, project.buildings, project.rules);
  const view = M.render({ project, result, footprint: E.footprint, selected: 'b201' });
  assert.match(view.svg, /class="north-sheet"/);
  assert.match(view.svg, /data-roof="b201"/);
  assert.equal((view.svg.match(/data-mass="/g) || []).length, 4);
  const cam = view.camera, s = cam.project(120, 80, 0), g = cam.ground(s[0], s[1]);
  near(g[0], 120, 1e-9); near(g[1], 80, 1e-9);
  const frozen = M.render({ project, result, footprint: E.footprint, selected: 'b201', viewBox: [1, 2, 3, 4] });
  assert.deepEqual(frozen.viewBox, [1, 2, 3, 4]);
});
