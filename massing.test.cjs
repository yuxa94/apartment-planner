'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('./engine.js');
const S = require('./state.js');
const M = require('./massing.js');

const scene = (changes = {}) => {
  const project = S.createProject();
  const result = E.evaluateSite(project.site.polygon, project.buildings, project.rules);
  return M.render({ project, result, footprint: E.footprint, selected: 'b101', ...changes });
};

test('massing renders every building as a selectable mass with its height label', () => {
  const { svg, viewBox } = scene();
  assert.equal((svg.match(/data-mass="/g) || []).length, 3);
  assert.match(svg, /101동/);
  assert.match(svg, /20F · H 58\.0 m/);
  assert.equal(viewBox.length, 4);
  assert.ok(viewBox[2] > 0 && viewBox[3] > 0);
});

test('a plan-like camera hides side faces and zoom narrows the view', () => {
  const near = scene({ zoom: 2 }).viewBox, far = scene().viewBox;
  assert.ok(Math.abs(near[2] - far[2] / 2) < 1e-6);
  const cam = M.camera([0, 0], 0, 90);
  const p = cam.project(10, 5, 30);
  assert.ok(Math.abs(p[0] - 10) < 1e-9 && Math.abs(p[1] - 5) < 1e-9, 'top view ignores height');
});

test('buildings are painted far to near for the camera', () => {
  const { svg } = scene({ azimuth: 0, elevation: 35 });
  // b101/b102 (y≈62) are farther from the viewer than b103 (y=119).
  assert.ok(svg.indexOf('data-mass="b103"') > svg.indexOf('data-mass="b101"'));
  const flipped = scene({ azimuth: 180, elevation: 35 }).svg;
  assert.ok(flipped.indexOf('data-mass="b103"') < flipped.indexOf('data-mass="b101"'));
});
