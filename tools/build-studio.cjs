#!/usr/bin/env node
/* Builds the combined Stage 1·2·3 package in package/studio/:
   - planby-studio.html           all three stages in one self-contained file (CSS, scripts, unit plans and the
                                  starting project inlined); opens by double-click with no server.
   - planby-studio.artifact.html  the same without the document shell, for Claude artifacts.
   - planby-project.json          the embedded starting project, to load into other copies with '불러오기'.
   - unit-59|74|84.json           the unit plans Stage 2 explores (apartment-planner-unit/1).
   usage: node tools/build-studio.cjs [--project data/combined-project.json]
   A project saved in the browser still takes precedence over the embedded one. */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');

const root = path.resolve(__dirname, '..'), out = path.join(root, 'package', 'studio');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
// Inline text must not close its own tag early.
const safeScript = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const safeStyle = css => css.replace(/<\/style/gi, '<\\/style');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };

const { validateProject } = require(path.join(root, 'state.js'));
const projectPath = path.resolve(root, arg('--project') || 'data/combined-project.json');
const project = validateProject(JSON.parse(fs.readFileSync(projectPath, 'utf8')));
const planFiles = ['unit-plans/unit-59.json', 'unit-plans/unit-74.json', 'unit-plans/unit-84.json'];
const plans = planFiles.map(f => JSON.parse(read(f)));

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  if (execSync('git status --porcelain -- *.js index.html style.css unit-plans data', { cwd: root }).toString().trim()) commit += '+작업중변경';
} catch (e) { /* not a git checkout */ }

let html = read('index.html');
const missing = [], scripts = [];
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => { try { return `<style>\n${safeStyle(read(href))}\n</style>`; } catch (e) { missing.push(href); return ''; } });
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  let body;
  try { body = read(src); } catch (e) { missing.push(src); return ''; }
  scripts.push(src);
  // All three stages; reference PNGs are left out to keep one file small (Stage 1 hides the overlay without them).
  if (src === 'stage.js') body = 'window.PLANBY_STAGE = null;\nwindow.PLANBY_NO_ASSETS = true;';
  let pre = '';
  if (src === 'stage.js') pre = `<script>\nwindow.PLANBY_UNIT_PLANS = ${safeScript(JSON.stringify(plans))};\n</script>\n`;
  if (src === 'app.js') pre = `<script>\nwindow.PLANBY_INITIAL_PROJECT = ${safeScript(JSON.stringify(project))};\n</script>\n`;
  return `${pre}<script data-src="${src}">\n${safeScript(body)}\n</script>`;
});
if (missing.length) throw new Error('missing files: ' + missing.join(', '));
if (/<script src=|<link rel="stylesheet"/.test(html)) throw new Error('an external reference was left in the page');

const stamp = `<!-- PLANBY studio · Stage 1·2·3 single-file build · commit ${commit} · ${new Date().toISOString()} · tools/build-studio.cjs, do not edit by hand -->`;
const full = html.replace(/^<!doctype html>/i, `<!doctype html>\n${stamp}`).replace(/<title>[^<]*<\/title>/, '<title>PLANBY 공동주택 초기계획 스튜디오</title>');
// Claude artifact: the host adds the document shell; keep a plain title, the styles and the body.
const styles = (html.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
const body = html.slice(html.indexOf('<body>') + '<body>'.length, html.lastIndexOf('</body>'));
const artifact = `<title>PLANBY 공동주택 초기계획 스튜디오</title>\n${stamp}\n<style>:root{color-scheme:light}</style>\n${styles}\n${body.trim()}\n`;

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'planby-studio.html'), full);
fs.writeFileSync(path.join(out, 'planby-studio.artifact.html'), artifact);
fs.writeFileSync(path.join(out, 'planby-project.json'), JSON.stringify(project, null, 2) + '\n');
planFiles.forEach((f, i) => fs.writeFileSync(path.join(out, path.basename(f)), JSON.stringify(plans[i], null, 2) + '\n'));
const kb = s => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log(`package/studio/planby-studio.html ${kb(full)} · artifact ${kb(artifact)} · commit ${commit}`);
console.log(`project: ${project.units.length} unit plans · ${project.typologies.length} saved building plans · ${project.buildings.length} buildings · ${(project.layouts || []).length} layout versions`);
