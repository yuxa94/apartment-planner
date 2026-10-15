// Builds package/planby-unit-planner.html: the Stage 1 unit planner as one self-contained HTML file
// (inline CSS and scripts, no reference images) so it can be opened inside chat apps such as a Claude
// artifact or a ChatGPT canvas, or simply double-clicked. On Windows it also refreshes the zip.
// Usage: node tools/build-package.cjs
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..'), out = path.join(root, 'package');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
// A literal "</script" inside a script would end the inline block early.
const inlineScript = code => '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
function swap(html, tag, replacement) {
  if (!html.includes(tag)) throw new Error('index.html no longer contains ' + tag);
  return html.replace(tag, () => replacement);
}

let html = read('index.html');
html = swap(html, '<link rel="stylesheet" href="style.css">', '<style>\n' + read('style.css') + '\n</style>');
html = swap(html, '<script src="stage.js"></script>', inlineScript("window.PLANBY_STAGE = 'units';\nwindow.PLANBY_NO_ASSETS = true;"));
for (const file of ['engine.js', 'state.js', 'units.js', 'app.js']) html = swap(html, `<script src="${file}"></script>`, inlineScript(read(file)));
html = html.replace(/<title>[^<]*<\/title>/, '<title>PLANBY · 단위세대 평면 계획</title>');
html = html.replace('<head>', `<head>\n<!-- PLANBY unit planner package · stage1-unit-plan · built ${new Date().toISOString().slice(0, 10)} -->`);

const leftovers = html.match(/<(script|link)[^>]*(src|href)="(?!https?:)[^"]+"/g);
if (leftovers) throw new Error('local references left: ' + leftovers.join(', '));

fs.mkdirSync(out, { recursive: true });
const target = path.join(out, 'planby-unit-planner.html');
fs.writeFileSync(target, html);
console.log(`${path.relative(root, target)} ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);

if (process.platform === 'win32') {
  const zip = path.join(out, 'planby-unit-planner.zip');
  const files = ['planby-unit-planner.html', 'README.md', 'MODEL-INSTRUCTIONS.md'].map(f => path.join(out, f)).filter(f => fs.existsSync(f));
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Force -DestinationPath '${zip}' -Path ${files.map(f => `'${f}'`).join(',')}`], { stdio: 'inherit' });
  console.log(`${path.relative(root, zip)} ${(fs.statSync(zip).size / 1024).toFixed(0)} KB`);
}
