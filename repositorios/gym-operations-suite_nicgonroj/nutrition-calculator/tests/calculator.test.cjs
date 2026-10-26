'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const calculator = require('../calculator.js');
const { calculate, displayTotals, distributeMeals, VISUAL_RANGES } = calculator;
const base = Object.freeze({
  age: 30, sex: 'male', weight: 80, height: 180, dailyMovement: 'seated',
  trainingDays: 0, compositionMode: 'none', goal: 'maintain', eligible: true
});
const close = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) < 1e-8,
  message || `${actual} should equal ${expected}`
);
const successful = input => {
  const result = calculate({ ...base, ...input });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
};
const blocked = input => {
  const result = calculate({ ...base, ...input });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result).sort(), ['guardrail', 'ok']);
  assert.equal(typeof result.guardrail, 'string');
  assert.doesNotMatch(result.guardrail, /\d/);
  return result;
};
const one = input => successful(input).scenarios[0];
const methods = { seated: 1.4, standing: 1.6, physical: 1.8 };
const efforts = { light: 3.5, moderate: 5, hard: 6 };

test('versioned immutable API works in CommonJS with no DOM dependency', () => {
  assert.equal(calculator.VERSION, '2.0.0');
  assert.equal(Object.isFrozen(calculator), true);
  assert.deepEqual(Object.keys(calculator).sort(), [
    'VERSION', 'VISUAL_RANGES', 'calculate', 'displayTotals', 'distributeMeals'
  ].sort());
});

test('browser API works with no storage, network or DOM access', () => {
  const source = fs.readFileSync(path.join(__dirname, '../calculator.js'), 'utf8');
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);
  assert.equal(context.window.DGYMCalculator.VERSION, calculator.VERSION);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.window.DGYMCalculator.calculate(base))), calculate(base)
  );
  assert.equal(context.DGYMCalculator, undefined);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|document|location|URLSearchParams)\b/);
});

test('visual catalogs are immutable, closed, non-overlapping and contain 33 percent', () => {
  assert.equal(Object.isFrozen(VISUAL_RANGES), true);
  for (const [series, limits] of Object.entries({ male: [10, 15, 20, 25, 30, 40], female: [18, 23, 28, 33, 38, 48] })) {
    const ranges = VISUAL_RANGES[series];
    assert.equal(Object.isFrozen(ranges), true);
    assert.equal(ranges.length, 5);
    ranges.forEach((item, index) => {
      assert.equal(Object.isFrozen(item), true);
      assert.equal(item.id, `${series === 'male' ? 'm' : 'f'}${index + 1}`);
      assert.equal(item.min, limits[index]);
      assert.equal(item.max, limits[index + 1]);
      assert.equal(item.maxInclusive, index === 4);
    });
    const matches = ranges.filter(item => 33 >= item.min && (33 < item.max || item.maxInclusive && 33 === item.max));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, series === 'male' ? 'm5' : 'f4');
    for (const boundary of limits.slice(1, -1)) {
      assert.equal(ranges.filter(item => boundary >= item.min && (boundary < item.max || item.maxInclusive && boundary === item.max)).length, 1);
    }
  }
});

test('without composition, documented Mifflin case remains 2492 kcal', () => {
  const result = successful({});
  assert.equal(result.model, 'mifflin');
  assert.equal(result.isRange, false);
  assert.deepEqual(result.composition, { mode: 'none', range: null, source: 'none' });
  assert.equal(result.scenarios.length, 1);
  const scenario = result.scenarios[0];
  close(scenario.ree, 1780);
  close(scenario.maintenance, 2492);
  close(scenario.energy, 2492);
  close(scenario.protein, 128);
  close(scenario.fat, 623 / 9);
  close(scenario.carbs, 339.25);
  assert.equal(scenario.ffm, null);
  assert.equal(scenario.bodyFat, null);
  assert.equal(result.summary.ffm, null);
  for (const key of ['ree', 'maintenance', 'energy', 'protein', 'fat', 'carbs']) {
    assert.deepEqual(result.summary[key], { min: scenario[key], max: scenario[key] });
  }
});

test('female Mifflin coefficient still applies when no body composition is used', () => {
  const scenario = one({ sex: 'female', weight: 60, height: 165, dailyMovement: 'standing', goal: 'loss' });
  close(scenario.ree, 1320.25);
  close(scenario.maintenance, 2112.4);
  close(scenario.energy, 1901.16);
  close(scenario.protein, 96);
});

test('measured composition uses Cunningham 1991 and total weight for protein', () => {
  const result = successful({ compositionMode: 'measured', bodyFat: 20 });
  assert.equal(result.model, 'cunningham1991');
  assert.equal(result.isRange, false);
  assert.deepEqual(result.composition, { mode: 'measured', bodyFat: 20, range: null, source: 'measured' });
  close(result.scenarios[0].ffm, 64);
  close(result.scenarios[0].ree, 1752.4);
  close(result.scenarios[0].energy, 2453.36);
  close(result.scenarios[0].protein, 128);
  assert.notEqual(result.scenarios[0].protein, 64 * 1.6);
});

test('same weight with different entered compositions changes the model, not proof of real expenditure', () => {
  const lower = one({ compositionMode: 'measured', bodyFat: 20 });
  const higher = one({ compositionMode: 'measured', bodyFat: 30 });
  close(lower.ree - higher.ree, 21.6 * 8);
  close(lower.maintenance - higher.maintenance, 21.6 * 8 * 1.4);
  assert.equal(lower.protein, higher.protein);
});

test('visual selection calculates both stored boundaries, not their midpoint', () => {
  const result = successful({ compositionMode: 'visual', visualSeries: 'male', visualRange: 'm5' });
  assert.equal(result.isRange, true);
  assert.equal(result.model, 'cunningham1991');
  assert.deepEqual(result.composition, { mode: 'visual', range: { min: 30, max: 40 }, series: 'male', source: 'visual' });
  assert.deepEqual(result.scenarios.map(item => item.bodyFat), [30, 40]);
  assert.deepEqual(result.scenarios.map(item => item.ffm), [56, 48]);
  for (const key of ['ree', 'maintenance', 'energy', 'protein', 'carbs', 'fat', 'ffm']) {
    assert.equal(result.summary[key].min, Math.min(...result.scenarios.map(item => item[key])));
    assert.equal(result.summary[key].max, Math.max(...result.scenarios.map(item => item[key])));
  }
});

test('all ten visual choices evaluate exact boundaries with no implicit selection', () => {
  for (const series of ['male', 'female']) {
    for (const item of VISUAL_RANGES[series]) {
      const result = successful({ sex: series, compositionMode: 'visual', visualSeries: series, visualRange: item.id });
      assert.deepEqual(result.scenarios.map(value => value.bodyFat), [item.min, item.max]);
      result.scenarios.forEach(scenario => {
        const measured = one({ sex: series, compositionMode: 'measured', bodyFat: scenario.bodyFat });
        assert.deepEqual(scenario, measured);
      });
    }
    const empty = calculate({ ...base, compositionMode: 'visual', visualSeries: series });
    assert.equal(empty.ok, false);
    assert.equal(typeof empty.errors.visualRange, 'string');
  }
});

test('visual series is independent of formula sex but cannot bypass body composition safeguards', () => {
  const maleFormula = successful({ compositionMode: 'visual', visualSeries: 'female', visualRange: 'f4' });
  assert.equal(maleFormula.composition.series, 'female');
  blocked({ sex: 'female', compositionMode: 'visual', visualSeries: 'male', visualRange: 'm1' });
  blocked({ sex: 'female', compositionMode: 'visual', visualSeries: 'male', visualRange: 'm2', goal: 'loss' });
});

test('skip visual fallback is valid without a series and ignores hidden composition data', () => {
  const result = successful({ compositionMode: 'visual', visualRange: 'skip', visualSeries: '__proto__', bodyFat: 'garbage' });
  assert.equal(result.model, 'mifflin');
  assert.equal(result.isRange, false);
  assert.deepEqual(result.composition, { mode: 'none', range: null, source: 'visual-fallback' });
  assert.deepEqual(result.summary, successful({}).summary);
});

test('composition none ignores invalid or old measured/visual fields entirely', () => {
  const result = successful({ bodyFat: -5, visualSeries: 'female', visualRange: 'f4', compositionMode: 'none' });
  assert.deepEqual(result, successful({}));
});

test('measured composition ignores visual fields, while visual ignores measured fields', () => {
  assert.deepEqual(
    successful({ compositionMode: 'measured', bodyFat: 33, visualSeries: {}, visualRange: 'm1' }),
    successful({ compositionMode: 'measured', bodyFat: 33 })
  );
  assert.deepEqual(
    successful({ compositionMode: 'visual', visualSeries: 'male', visualRange: 'm4', bodyFat: 'bad' }),
    successful({ compositionMode: 'visual', visualSeries: 'male', visualRange: 'm4' })
  );
});

test('maintain ignores hidden intensities; loss and gain ignore the other goal intensity', () => {
  assert.deepEqual(successful({ deficit: 'bad', surplus: 'bad' }), successful({}));
  assert.deepEqual(successful({ goal: 'loss', surplus: {} }), successful({ goal: 'loss' }));
  assert.deepEqual(successful({ goal: 'gain', deficit: {} }), successful({ goal: 'gain' }));
});

test('all loss and gain intensities use correct factors, with conservative missing defaults', () => {
  for (const [deficit, factor] of Object.entries({ gentle: 0.9, moderate: 0.85, aggressive: 0.8 })) {
    const result = successful({ goal: 'loss', deficit });
    assert.equal(result.adjustment, factor);
    close(result.summary.energy.min, 2492 * factor);
  }
  for (const [surplus, factor] of Object.entries({ small: 1.05, medium: 1.1, large: 1.15 })) {
    const result = successful({ goal: 'gain', surplus });
    assert.equal(result.adjustment, factor);
    close(result.summary.energy.min, 2492 * factor);
  }
  assert.equal(successful({ goal: 'loss' }).adjustment, 0.9);
  assert.equal(successful({ goal: 'gain' }).adjustment, 1.05);
  for (const value of ['', null, 'constructor', {}, false]) {
    assert.equal(typeof calculate({ ...base, goal: 'loss', deficit: value }).errors.deficit, 'string');
    assert.equal(typeof calculate({ ...base, goal: 'gain', surplus: value }).errors.surplus, 'string');
  }
});

test('non-training inputs ignore hidden duration and intensity and add exactly zero exercise', () => {
  const result = successful({ trainingMinutes: 'invalid', trainingEffort: '__proto__' });
  assert.deepEqual(result, successful({}));
  assert.equal(result.activity.netExercise, 0);
  assert.equal(result.activity.weeklyHours, 0);
  assert.equal(result.activity.met, null);
});

test('training model uses daily average NET expenditure above 1.3 MET, never gross twice', () => {
  for (const [dailyMovement, factor] of Object.entries(methods)) {
    for (const [trainingEffort, met] of Object.entries(efforts)) {
      const result = successful({ dailyMovement, trainingEffort, trainingDays: 3, trainingMinutes: 60 });
      const net = (met - 1.3) * 80 * 3 / 7;
      assert.equal(result.activity.baseFactor, factor);
      assert.equal(result.activity.met, met);
      assert.equal(result.activity.weeklyHours, 3);
      close(result.activity.netExercise, net);
      close(result.summary.maintenance.min, 1780 * factor + net);
      close(result.activity.effectivePAL.min, (1780 * factor + net) / 1780);
    }
  }
});

test('independently worked measured case matches energy and macros with net training', () => {
  const result = successful({ compositionMode: 'measured', bodyFat: 20, trainingDays: 3, trainingMinutes: 60, trainingEffort: 'moderate', goal: 'loss' });
  const scenario = result.scenarios[0];
  close(result.activity.netExercise, 126.85714285714286);
  close(scenario.ree, 1752.4);
  close(scenario.maintenance, 2580.217142857143);
  close(scenario.energy, 2322.1954285714287);
  close(scenario.protein, 128);
  close(scenario.fat, 64.50542857142857);
  close(scenario.carbs, 307.4116428571429);
});

test('seven training days are supported when total activity stays in scope', () => {
  const result = successful({ trainingDays: 7, trainingMinutes: 60, trainingEffort: 'moderate' });
  close(result.activity.netExercise, 296);
  assert.equal(result.activity.weeklyHours, 7);
});

test('numbers, trimmed strings, point/comma decimals and 33 percent are accepted', () => {
  const numeric = successful({ age: 30, weight: 80.5, height: 180.5, compositionMode: 'measured', bodyFat: 33.3, trainingDays: 3, trainingMinutes: 45, trainingEffort: 'light' });
  const local = successful({ age: ' 30 ', weight: '80,5', height: ' 180,5 ', compositionMode: 'measured', bodyFat: '33,3', trainingDays: '3', trainingMinutes: '45.0', trainingEffort: 'light' });
  assert.deepEqual(local, numeric);
  assert.equal(successful({ compositionMode: 'measured', bodyFat: '33' }).composition.bodyFat, 33);
});

test('blank, unsafe coercions, grouped numbers and invalid decimal syntax are rejected', () => {
  const invalid = ['', ' ', null, undefined, true, false, [], {}, NaN, Infinity, -Infinity,
    'Infinity', 'NaN', '1e2', '0x50', '+80', '-80', '80kg', '80 000', '1,234.5', '1.234,5',
    '80,5,0', '80..5', '.5', ',5', '80.', '80,', '8\n0'];
  for (const field of ['age', 'weight', 'height', 'bodyFat', 'trainingDays', 'trainingMinutes']) {
    for (const value of invalid) {
      const result = calculate({ ...base, compositionMode: 'measured', bodyFat: 20, trainingDays: 3, trainingMinutes: 60, trainingEffort: 'light', [field]: value });
      assert.equal(result.ok, false, `${field} accepted ${String(value)}`);
      assert.equal(typeof result.errors[field], 'string');
      assert.deepEqual(Object.keys(result).sort(), ['errors', 'ok']);
    }
  }
});

test('required enums are strict including inherited-property names', () => {
  const fields = ['sex', 'dailyMovement', 'goal', 'compositionMode', 'trainingEffort', 'visualSeries', 'visualRange'];
  for (const field of fields) for (const value of ['', 'other', '__proto__', 'constructor', 'toString', null, undefined, {}, ['male']]) {
    const result = calculate({ ...base, trainingDays: 3, trainingMinutes: 60, trainingEffort: 'light', compositionMode: 'visual', visualSeries: 'male', visualRange: 'm3', [field]: value });
    assert.equal(result.ok, false, `${field} accepted ${String(value)}`);
    assert.equal(typeof result.errors[field], 'string');
  }
  assert.equal(typeof calculate({ ...base, compositionMode: 'visual', visualSeries: 'male', visualRange: 'f3' }).errors.visualRange, 'string');
});

test('technical field limits reject out-of-range values without clamping', () => {
  const bounds = { age: [17, 79, 30.5], weight: [34.99, 250.01], height: [129.99, 230.01], bodyFat: [2.99, 60.01], trainingDays: [-1, 7.01, 3.5], trainingMinutes: [14, 121, 60.5] };
  for (const [field, values] of Object.entries(bounds)) for (const value of values) {
    const result = calculate({ ...base, compositionMode: 'measured', bodyFat: 20, trainingDays: 3, trainingMinutes: 60, trainingEffort: 'light', [field]: value });
    assert.equal(typeof result.errors[field], 'string', `${field}: ${value}`);
  }
  const supported = { age: [18, 78], weight: [35, 250], height: [130, 230], bodyFat: [3, 60], trainingDays: [0, 7], trainingMinutes: [15, 120] };
  for (const [field, values] of Object.entries(supported)) for (const value of values) {
    const result = calculate({ ...base, compositionMode: 'measured', bodyFat: 20, trainingDays: 3, trainingMinutes: 60, trainingEffort: 'light', [field]: value });
    assert.equal(result.errors, undefined, `Range boundary rejected: ${field}=${value}`);
  }
});

test('eligibility must be explicit true, never a truthy scalar or object', () => {
  for (const eligible of [false, undefined, null, 0, 1, 'true', 'on', [], {}]) {
    assert.equal(typeof calculate({ ...base, eligible }).errors.eligible, 'string');
  }
});

test('bad input collects field errors without partial estimates', () => {
  for (const input of [undefined, null, false, '', [], {}]) {
    const result = calculate(input);
    assert.deepEqual(Object.keys(result).sort(), ['errors', 'ok']);
    assert.deepEqual(Object.keys(result.errors).sort(), ['age', 'compositionMode', 'dailyMovement', 'eligible', 'goal', 'height', 'sex', 'trainingDays', 'weight']);
    assert.ok(Object.values(result.errors).every(message => typeof message === 'string' && message.length > 10));
  }
});

test('BMI below the product scope yields no figures on any composition path', () => {
  for (const fields of [
    { compositionMode: 'none' },
    { compositionMode: 'measured', bodyFat: 20 },
    { compositionMode: 'visual', visualSeries: 'male', visualRange: 'm3' }
  ]) blocked({ ...fields, weight: 50 });
  assert.equal(successful({ height: 200, weight: 74 }).ok, true);
});

test('measured BF product limits and loss-specific limits are not silently clamped', () => {
  for (const [sex, low, lossLow] of [['male', 8, 10], ['female', 16, 18]]) {
    for (const bodyFat of [low - 0.01, 50.01]) {
      for (const goal of ['maintain', 'loss', 'gain']) blocked({ sex, goal, compositionMode: 'measured', bodyFat });
    }
    for (const bodyFat of [low, lossLow - 0.01]) {
      assert.equal(successful({ sex, compositionMode: 'measured', bodyFat }).ok, true);
      assert.equal(successful({ sex, goal: 'gain', compositionMode: 'measured', bodyFat }).ok, true);
      blocked({ sex, goal: 'loss', compositionMode: 'measured', bodyFat });
    }
    assert.equal(successful({ sex, goal: 'loss', compositionMode: 'measured', bodyFat: lossLow }).ok, true);
    assert.equal(successful({ sex, compositionMode: 'measured', bodyFat: 50 }).ok, true);
  }
});

test('activity beyond effective PAL 2.4 returns no targets, not a capped estimate', () => {
  const result = blocked({ sex: 'female', height: 150, age: 78, dailyMovement: 'physical', trainingDays: 7, trainingMinutes: 120, trainingEffort: 'hard' });
  assert.match(result.guardrail, /movimiento y entrenamiento/);
});

test('one failing PAL endpoint blocks the entire visual range', () => {
  // PAL is 2.334 at BF30 and 2.409 at BF40; a 20% exploratory deficit
  // keeps the passing endpoint below 5000 kcal (4926.72), isolating PAL.
  const input = { weight: 150, goal: 'loss', deficit: 'aggressive', dailyMovement: 'physical', trainingDays: 7, trainingMinutes: 120, trainingEffort: 'hard' };
  assert.equal(successful({ ...input, compositionMode: 'measured', bodyFat: 30 }).ok, true);
  blocked({ ...input, compositionMode: 'measured', bodyFat: 40 });
  blocked({ ...input, compositionMode: 'visual', visualSeries: 'male', visualRange: 'm5' });
});

test('energy below 1500 or above 5000 yields no numerical estimates', () => {
  blocked({ sex: 'female', age: 78, weight: 50, height: 150, goal: 'loss' });
  blocked({ age: 18, weight: 250, height: 230, dailyMovement: 'physical', goal: 'gain', surplus: 'large' });
});

test('exact energy guardrail boundaries are included but neighboring outside values fail', () => {
  const lowerWeight = (1500 / 1.4 - 261.5) / 10;
  close(one({ sex: 'female', age: 78, height: 130, weight: lowerWeight }).energy, 1500);
  blocked({ sex: 'female', age: 78, height: 130, weight: lowerWeight - 0.0001 });
  const upperWeight = (5000 / 1.8 - 905) / 10;
  close(one({ age: 20, height: 160, weight: upperWeight, dailyMovement: 'physical' }).energy, 5000);
  blocked({ age: 20, height: 160, weight: upperWeight + 0.0001, dailyMovement: 'physical' });
});

test('one failing energy endpoint blocks the complete visual interval', () => {
  // 1515.136 kcal at BF30 passes; 1357.888 kcal at BF40 does not.
  const fields = { weight: 65, height: 160, goal: 'loss', deficit: 'aggressive' };
  successful({ ...fields, compositionMode: 'measured', bodyFat: 30 });
  blocked({ ...fields, compositionMode: 'measured', bodyFat: 40 });
  blocked({ ...fields, compositionMode: 'visual', visualSeries: 'male', visualRange: 'm5' });
});

test('protein cap is applied per scenario using total weight and preserves 4/4/9 identity', () => {
  const result = successful({ weight: 150, compositionMode: 'visual', visualSeries: 'male', visualRange: 'm5', goal: 'loss', deficit: 'aggressive' });
  assert.equal(result.scenarios.every(item => item.proteinCapped), true);
  assert.ok(result.summary.protein.min < result.summary.protein.max);
  result.scenarios.forEach(item => {
    close(item.protein, item.energy * 0.3 / 4);
    close(item.protein * 4 + item.fat * 9 + item.carbs * 4, item.energy);
    close(item.fat * 9, item.energy * 0.25);
    close(item.carbs * 4, item.energy * 0.45);
  });
});

test('point presentation rounds kcal to nearest 50 and macros to whole grams', () => {
  const result = successful({});
  assert.deepEqual(displayTotals(result), {
    energy: { min: 2500, max: 2500 }, protein: { min: 128, max: 128 },
    carbs: { min: 339, max: 339 }, fat: { min: 69, max: 69 }
  });
  // Native calculations remain untouched and retain the energy identity.
  assert.equal(result.summary.energy.min, 2492);
});

test('visual interval rounds outward and preserves the interval flag even for flat protein', () => {
  const result = successful({ compositionMode: 'visual', visualSeries: 'male', visualRange: 'm3' });
  const shown = displayTotals(result);
  for (const key of ['energy', 'protein', 'carbs', 'fat']) {
    const step = key === 'energy' ? 50 : 1;
    assert.ok(shown[key].min <= result.summary[key].min);
    assert.ok(shown[key].max >= result.summary[key].max);
    assert.equal(shown[key].min % step, 0);
    assert.equal(shown[key].max % step, 0);
  }
  assert.deepEqual(shown.protein, { min: 128, max: 128 });
  assert.equal(result.isRange, true);
});

test('meals split rounded point and interval daily totals exactly for 3, 4 and 5 meals', () => {
  const inputs = [
    {}, { compositionMode: 'measured', bodyFat: 33.3 },
    { compositionMode: 'visual', visualSeries: 'male', visualRange: 'm5' },
    { compositionMode: 'visual', visualSeries: 'female', visualRange: 'f4', weight: 150, goal: 'loss' }
  ];
  for (const input of inputs) {
    const result = successful(input);
    const daily = displayTotals(result);
    for (const count of [3, 4, 5]) {
      const meals = distributeMeals(result, count);
      assert.equal(meals.length, count);
      for (const key of ['protein', 'carbs', 'fat']) for (const bound of ['min', 'max']) {
        assert.equal(meals.reduce((sum, meal) => sum + meal[key][bound], 0), daily[key][bound]);
        const grams = meals.map(meal => meal[key][bound]);
        assert.ok(Math.max(...grams) - Math.min(...grams) <= 1);
        assert.ok(grams.every(Number.isInteger));
      }
      meals.forEach(meal => {
        assert.deepEqual(Object.keys(meal).sort(), ['carbs', 'fat', 'protein']);
        for (const key of ['protein', 'carbs', 'fat']) assert.ok(meal[key].min <= meal[key].max);
      });
    }
  }
});

test('display and meal helpers do not manufacture results after validation or guardrail failures', () => {
  for (const result of [null, undefined, calculate({}), calculate({ ...base, weight: 50 })]) {
    assert.equal(displayTotals(result), null);
    assert.deepEqual(distributeMeals(result, 3), []);
  }
  for (const count of [undefined, null, '3', 0, 2, 6, 3.5, {}, []]) {
    assert.throws(() => distributeMeals(successful({}), count), RangeError);
  }
});

test('calculation, presentation and meal helpers never mutate input or retained outcomes', () => {
  const input = Object.freeze({ ...base, compositionMode: 'visual', visualSeries: 'male', visualRange: 'm4' });
  const result = calculate(input);
  const original = JSON.stringify(result);
  displayTotals(result);
  distributeMeals(result, 5);
  assert.equal(JSON.stringify(result), original);
  assert.deepEqual(calculate(input), result);
});

test('property grid checks both models, every goal intensity, range guards, energy identity and meal sums', () => {
  const goals = [
    { goal: 'maintain', factor: 1 },
    ...Object.entries({ gentle: 0.9, moderate: 0.85, aggressive: 0.8 }).map(([deficit, factor]) => ({ goal: 'loss', deficit, factor })),
    ...Object.entries({ small: 1.05, medium: 1.1, large: 1.15 }).map(([surplus, factor]) => ({ goal: 'gain', surplus, factor }))
  ];
  let success = 0;
  let safety = 0;
  for (const sex of ['male', 'female']) for (const weight of [50, 80, 150])
    for (const dailyMovement of Object.keys(methods)) for (const trainingDays of [0, 3, 7])
      for (const goal of goals) for (const route of [
        { compositionMode: 'none' }, { compositionMode: 'measured', bodyFat: 33 },
        ...VISUAL_RANGES[sex].map(item => ({ compositionMode: 'visual', visualSeries: sex, visualRange: item.id }))
      ]) {
        const input = Object.freeze({ ...base, sex, weight, dailyMovement, trainingDays, trainingMinutes: 90, trainingEffort: 'hard', ...goal, ...route });
        const result = calculate(input);
        assert.equal(result.errors, undefined);
        assert.deepEqual(calculate(input), result);
        const bmi = weight / 1.8 ** 2;
        const percentages = route.compositionMode === 'none' ? [null] : route.compositionMode === 'measured' ? [33] : (() => {
          const item = VISUAL_RANGES[sex].find(entry => entry.id === route.visualRange);
          return [item.min, item.max];
        })();
        const expected = percentages.map(bodyFat => {
          const ree = bodyFat === null ? 800 + (weight - 80) * 10 + 1125 - 150 + (sex === 'male' ? 5 : -161) : 370 + 21.6 * weight * (1 - bodyFat / 100);
          const net = (6 - 1.3) * weight * 1.5 * trainingDays / 7;
          const maintenance = ree * methods[dailyMovement] + net;
          return { ree, maintenance, energy: maintenance * goal.factor };
        });
        const shouldBlock = bmi < 18.5 || expected.some(item => item.energy < 1500 || item.energy > 5000 || item.maintenance / item.ree > 2.4);
        assert.equal(result.ok, !shouldBlock);
        if (shouldBlock) {
          safety++;
          assert.deepEqual(Object.keys(result).sort(), ['guardrail', 'ok']);
          continue;
        }
        success++;
        result.scenarios.forEach((scenario, index) => {
          close(scenario.ree, expected[index].ree);
          close(scenario.maintenance, expected[index].maintenance);
          close(scenario.energy, expected[index].energy);
          close(scenario.protein * 4 + scenario.carbs * 4 + scenario.fat * 9, scenario.energy);
          close(scenario.fat * 9, scenario.energy * 0.25);
          assert.ok(scenario.protein <= 1.6 * weight);
          assert.ok(scenario.protein * 4 <= scenario.energy * 0.3 + 1e-8);
          assert.equal(scenario.proteinCapped, 1.6 * weight > scenario.energy * 0.3 / 4);
          for (const key of ['ree', 'maintenance', 'energy', 'protein', 'carbs', 'fat']) assert.ok(Number.isFinite(scenario[key]) && scenario[key] > 0);
        });
        const displayed = displayTotals(result);
        for (const count of [3, 4, 5]) {
          const meals = distributeMeals(result, count);
          for (const key of ['protein', 'carbs', 'fat']) for (const bound of ['min', 'max']) {
            assert.equal(meals.reduce((sum, meal) => sum + meal[key][bound], 0), displayed[key][bound]);
          }
        }
      }
  assert.ok(success > 1000);
  assert.ok(safety > 1000);
});
