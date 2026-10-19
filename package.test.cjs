'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Builds go to a temp folder so tests never overwrite the committed package/.
function build(...extra) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'planby-pkg-'));
  execFileSync(process.execPath, [path.join(__dirname, 'tools', 'build-package.cjs'), '--out', out, ...extra]);
  return out;
}
const html = dir => fs.readFileSync(path.join(dir, 'planby-site-planner.html'), 'utf8');

test('single-file build has no external references and its engine bundle works', () => {
  const out = build('--no-project');
  const page = html(out);
  assert.doesNotMatch(page, /<script src=|<link rel="stylesheet"/);
  for (const name of ['PlannerEngine', 'PlannerDrawing', 'PlannerMassing', 'PlannerImport', 'PLANBY_STAGE']) assert.match(page, new RegExp(name));
  assert.doesNotMatch(page, /PLANBY_INITIAL_PROJECT=/);
  const artifact = fs.readFileSync(path.join(out, 'artifact.html'), 'utf8');
  assert.match(artifact, /^<title>PLANBY 단지배치 검토<\/title>/);
  assert.doesNotMatch(artifact, /<!doctype|<html|<head>|<body/i);
  const bundle = require(path.join(out, 'planner-engine.js'));
  const p = bundle.PlannerState.createProject();
  assert.equal(bundle.PlannerEngine.evaluateSite(p.site.polygon, p.buildings, p.rules).households, 248);
});

test('--project embeds a validated starting project', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'planby-proj-'));
  const file = path.join(dir, 'p.json');
  const project = require('./state.js').createProject();
  project.name = '포함 테스트';
  fs.writeFileSync(file, JSON.stringify(project));
  assert.match(html(build('--project', file)), /PLANBY_INITIAL_PROJECT=\{.*포함 테스트/);
});

test('the committed package embeds package/project.json when it exists', () => {
  const saved = path.join(__dirname, 'package', 'project.json');
  if (!fs.existsSync(saved)) return;
  const project = require('./state.js').validateProject(JSON.parse(fs.readFileSync(saved, 'utf8')));
  const page = fs.readFileSync(path.join(__dirname, 'package', 'planby-site-planner.html'), 'utf8');
  assert.ok(page.includes(`"revision":${project.revision}`), 'package HTML should embed the saved project');
});
