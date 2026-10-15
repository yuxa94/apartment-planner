'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('./drawing.js');

test('setback line offsets a site inward for either winding', () => {
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  for (const poly of [square, [...square].reverse()]) {
    const inner = D.offsetPolygon(poly, 3);
    for (const [x, y] of inner) {
      assert.ok(Math.abs(Math.min(x, 100 - x) - 3) < 1e-9 && Math.abs(Math.min(y, 100 - y) - 3) < 1e-9, `${x},${y}`);
    }
  }
  assert.equal(D.offsetPolygon(square, 0), null);
});

test('dimension notes restate the engine basis in reference style', () => {
  assert.equal(D.basisNote({ type: 'light-light', terms: [{ factor: 1, floors: 20, value: 56.85 }] }), '(기준 1.0H, 20F=56,850)');
  assert.equal(D.basisNote({ type: 'south-low', fixed: 10, terms: [{ factor: 1, floors: 18, value: 53.4 }] }), '(기준 남측저층 10m / 1.0H, 18F=53,400)');
  assert.equal(D.basisNote({ type: 'side-side', fixed: 4, terms: [], min: 10 }), '(기준 측벽 4m / 최소 10m)');
});
