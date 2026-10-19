// Combines the projects that were open in each stage's browser into one project:
//   units (세대 도면) from Stage 1, typologies (저장한 동평면 안) from Stage 2,
//   site · rules · buildings · layouts (대지·검토 조건·동·배치안 버전) from Stage 3.
// Also refreshes unit-plans/unit-59|74|84.json from the Stage 1 plans so Stage 2 explores the current drawings.
// usage: node tools/combine-project.cjs   (reads data/stage1-open.json, stage2-open.json, stage3-open.json)
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'state.js')), U = require(path.join(root, 'units.js'));
const read = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const s1 = read('stage1-open.json'), s2 = read('stage2-open.json'), s3 = read('stage3-open.json');

const project = S.clone(s3);
project.name = '공동주택 초기 검토 · 1·2·3단계 통합';
project.units = S.clone(s1.units);
if (s1.selectedUnitId) project.selectedUnitId = s1.selectedUnitId;
if (s1.selectedUnitType) project.selectedUnitType = s1.selectedUnitType;
project.typologies = S.clone(s2.typologies || []);
project.revision = 1;
const checked = S.validateProject(project);
fs.writeFileSync(path.join(root, 'data', 'combined-project.json'), JSON.stringify(checked, null, 2));

const now = new Date().toISOString();
for (const type of [59, 74, 84]) {
  const unit = checked.units.find(u => u.id === 'unit-' + type) || checked.units.find(u => u.type === type && !u.custom);
  const report = U.checkUnit(unit);
  const file = { schema: 'apartment-planner-unit/1', coordinateUnit: 'm', areaUnit: '㎡', axes: 'x 오른쪽, y 아래(화면 기준), 원점 = 외곽 경계상자 좌상단',
    projectRevision: s1.revision, exportedAt: now, unit,
    checks: { outlineArea: report.outlineArea, area: report.area, gapArea: report.gapArea, overlaps: report.overlaps.length, outside: report.outside },
    note: 'Stage 1 브라우저 작업본(개정 ' + s1.revision + ')에서 내보냄. 개략 계획 치수이며 법정 전용면적이 아님.' };
  fs.writeFileSync(path.join(root, 'unit-plans', `unit-${type}.json`), JSON.stringify(file, null, 2) + '\n');
}
console.log(`units ${checked.units.length} · typologies ${checked.typologies.length} · buildings ${checked.buildings.length} · layouts ${(checked.layouts || []).length}`);
