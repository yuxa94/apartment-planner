'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

test('single-file package has no external references and loads the engine bundle', () => {
  execFileSync(process.execPath, [path.join(__dirname, 'tools', 'build-package.cjs')]);
  const html = fs.readFileSync(path.join(__dirname, 'package', 'planby-site-planner.html'), 'utf8');
  assert.doesNotMatch(html, /<script src=|<link rel="stylesheet"/);
  for (const name of ['PlannerEngine', 'PlannerDrawing', 'PlannerMassing', 'PlannerImport', 'PLANBY_STAGE']) assert.match(html, new RegExp(name));
  assert.doesNotMatch(html, /PLANBY_INITIAL_PROJECT=/);
  const bundle = require('./package/planner-engine.js');
  const p = bundle.PlannerState.createProject();
  assert.equal(bundle.PlannerEngine.evaluateSite(p.site.polygon, p.buildings, p.rules).households, 248);
});

test('--project embeds a validated starting project', () => {
  const tmp = path.join(__dirname, 'package', 'tmp-project.json');
  const project = require('./state.js').createProject();
  project.name = '포함 테스트';
  fs.writeFileSync(tmp, JSON.stringify(project));
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'tools', 'build-package.cjs'), '--project', tmp]);
    const html = fs.readFileSync(path.join(__dirname, 'package', 'planby-site-planner.html'), 'utf8');
    assert.match(html, /PLANBY_INITIAL_PROJECT=\{.*포함 테스트/);
  } finally {
    fs.unlinkSync(tmp);
    execFileSync(process.execPath, [path.join(__dirname, 'tools', 'build-package.cjs')]);
  }
});
