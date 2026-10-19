#!/usr/bin/env node
/* Builds the shareable package in package/:
   - planby-site-planner.html: index.html with style.css and every script inlined,
     so it opens from a single file in a browser with no server.
   - artifact.html: the same app without the document shell, for Claude artifacts.
   - planner-engine.js: engine, state, presets and building import bundled for an
     LLM's code tool (Node require, or a browser/global script).
   usage: node tools/build-package.cjs [--project file.json | --no-project] [--out dir]
   The starting project embedded in the HTML is package/project.json when it
   exists (the saved site layout), or --project's file; --no-project embeds
   none. A browser-saved project still takes precedence when the page opens. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
// Inline scripts must not close their own <script> element.
const safeScript = code => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

function args() {
  const value = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
  const fallback = path.join(root, 'package', 'project.json');
  const project = process.argv.includes('--no-project') ? null : value('--project') || (fs.existsSync(fallback) ? fallback : null);
  return { project, out: path.resolve(value('--out') || path.join(root, 'package')) };
}

function buildHtml(projectPath) {
  let html = read('index.html');
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>\n${read(href)}\n</style>`);
  const scripts = [];
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => { scripts.push(src); return `<script>\n/* ${src} */\n${safeScript(read(src))}\n</script>`; });
  if (projectPath) {
    const { validateProject } = require(path.join(root, 'state.js'));
    const project = validateProject(JSON.parse(fs.readFileSync(path.resolve(projectPath), 'utf8')));
    const embed = `<script>window.PLANBY_INITIAL_PROJECT=${safeScript(JSON.stringify(project))};</script>`;
    html = html.replace('<script>\n/* app.js */', `${embed}\n<script>\n/* app.js */`);
  }
  const stamp = `<!-- PLANBY site planner · single-file build · ${new Date().toISOString().slice(0, 10)} · scripts: ${scripts.join(', ')} -->`;
  return html.replace('<!doctype html>', `<!doctype html>\n${stamp}`);
}

// Claude artifact variant: the host wraps the page in its own document shell, so
// keep only <title>, the styles and the body content (scripts included).
function buildArtifact(html) {
  const style = [...html.matchAll(/<style>[\s\S]*?<\/style>/g)].map(m => m[0]).join('\n');
  const body = html.match(/<body>([\s\S]*)<\/body>/);
  if (!body) throw new Error('index.html has no <body>');
  return `<title>PLANBY 단지배치 검토</title>\n<style>:root{color-scheme:light}</style>\n${style}\n${body[1].trim()}\n`;
}

function buildEngine() {
  const parts = ['engine.js', 'state.js', 'presets.js', 'building-import.js'].map(f =>
    `/* ${f} */\n(function (module) {\n${read(f)}\n}).call(globalThis, undefined);`);
  return `/* PLANBY planner engine bundle: PlannerEngine, PlannerState, PlannerPresets, PlannerImport.
   Node: const { PlannerEngine } = require('./planner-engine.js'); Browser: <script src>. */\n` +
    parts.join('\n') +
    `\nif (typeof module === 'object' && module.exports) module.exports = { PlannerEngine: globalThis.PlannerEngine, PlannerState: globalThis.PlannerState, PlannerPresets: globalThis.PlannerPresets, PlannerImport: globalThis.PlannerImport };\n`;
}

const { project, out } = args();
fs.mkdirSync(out, { recursive: true });
const html = buildHtml(project);
fs.writeFileSync(path.join(out, 'planby-site-planner.html'), html);
fs.writeFileSync(path.join(out, 'artifact.html'), buildArtifact(html));
fs.writeFileSync(path.join(out, 'planner-engine.js'), buildEngine());
fs.copyFileSync(path.join(root, 'rules-reference.json'), path.join(out, 'rules-reference.json'));
const rel = path.relative(root, out) || '.';
console.log(`${rel}/planby-site-planner.html ${(html.length / 1024).toFixed(0)} KB${project ? ` (embedded ${path.relative(root, project)})` : ''}`);
console.log(`${rel}/artifact.html, planner-engine.js, rules-reference.json`);
