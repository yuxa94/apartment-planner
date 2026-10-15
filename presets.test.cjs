'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('./presets.js');
const S = require('./state.js');
const E = require('./engine.js');

test('every rule and height preset yields a valid, evaluable project', () => {
  for (const r of P.RULE_PRESETS) {
    for (const h of P.HEIGHT_PRESETS) {
      const p = S.createProject();
      p.rules = P.applyHeightPreset(P.applyRulePreset(p.rules, r.id), h.id);
      const checked = S.validateProject(p);
      assert.equal(checked.rules.preset, r.id);
      E.evaluateSite(checked.site.polygon, checked.buildings, checked.rules);
    }
  }
});

test('presets carry the current national and 청주 values', () => {
  const base = S.createProject().rules;
  const national = P.applyRulePreset(base, 'national-2026');
  assert.equal(national.northLowHeight, 10);
  assert.deepEqual(national.facing, { lightFactor: 0.5, southLowTall: 0, southLowLow: 0.5, southLowMin: 10, sideToSide: 4 });
  const cheongju = P.applyRulePreset(base, 'cheongju-2026');
  assert.equal(cheongju.facing.lightFactor, 1);
  assert.equal(cheongju.facing.southLowMin, 10);
  assert.equal(cheongju.lightLimit.factor, 2);
  // custom keeps the user's values and only records the choice
  assert.equal(P.applyRulePreset(base, 'custom').distanceFactor, base.distanceFactor);
  assert.throws(() => P.applyRulePreset(base, 'nope'));
});

test('height formula text matches the reference sheet wording', () => {
  assert.equal(P.heightFormula({ first: 3.5, top: [3, 3], parapet: 0.4 }),
    'H = 1층 3.5 + (층수 − 3) × 기준층고 + 3 + 3 + 파라펫 0.4 · 1층 전체 필로티 동은 1층 제외');
  assert.equal(P.heightFormula({}), 'H = 층수 × 층고');
  assert.equal(P.heightFormula({ base: 0.6, parapet: 0.25 }), 'H = 지반 0.6 + 층수 × 층고 + 파라펫 0.25');
});

test('state rejects malformed new rule and building fields', () => {
  const p = S.createProject();
  for (const bad of [{ lightLimit: { enabled: 'yes', factor: 2 } }, { lightLimit: { enabled: true, factor: 0 } },
    { height: { top: [3, 3, 3, 3, 3, 3] } }, { facing: { southLowMin: -1 } }, { preset: 5 }]) {
    assert.throws(() => S.validateProject({ ...p, rules: { ...p.rules, ...bad } }));
  }
  const q = S.clone(p);
  q.buildings[0].pilotiFull = 'yes';
  assert.throws(() => S.validateProject(q));
  q.buildings[0].pilotiFull = true;
  assert.equal(S.validateProject(q).buildings[0].pilotiFull, true);
});
