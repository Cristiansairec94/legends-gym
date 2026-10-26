(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DGYMCalculator = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const VERSION = '2.0.0';
  const BASE_FACTORS = Object.freeze({ seated: 1.4, standing: 1.6, physical: 1.8 });
  const TRAINING_METS = Object.freeze({ light: 3.5, moderate: 5, hard: 6 });
  const DEFICITS = Object.freeze({ gentle: 0.9, moderate: 0.85, aggressive: 0.8 });
  const SURPLUSES = Object.freeze({ small: 1.05, medium: 1.1, large: 1.15 });
  const REPLACED_MET = 1.3;
  const has = (object, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(object, key);
  const range = (id, min, max, maxInclusive = false) => Object.freeze({ id, min, max, maxInclusive });
  // UI categories, not health classifications or validated image measurements.
  // Adjacent categories exclude their upper limit; only the last includes it.
  // Both mathematical boundary values are nevertheless evaluated conservatively.
  const VISUAL_RANGES = Object.freeze({
    male: Object.freeze([
      range('m1', 10, 15), range('m2', 15, 20), range('m3', 20, 25),
      range('m4', 25, 30), range('m5', 30, 40, true)
    ]),
    female: Object.freeze([
      range('f1', 18, 23), range('f2', 23, 28), range('f3', 28, 33),
      range('f4', 33, 38), range('f5', 38, 48, true)
    ])
  });

  function parseDecimal(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    const trimmed = value.trim();
    if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) return NaN;
    const parsed = Number(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  const interval = values => ({ min: Math.min(...values), max: Math.max(...values) });
  const guardrail = message => ({ ok: false, guardrail: message });

  function calculate(input) {
    const data = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const errors = {};
    const age = parseDecimal(data.age);
    const weight = parseDecimal(data.weight);
    const height = parseDecimal(data.height);
    const trainingDays = parseDecimal(data.trainingDays);
    let trainingMinutes = 0;
    let met = null;
    let adjustment = 1;
    let bodyFatValues = [null];
    let composition = { mode: 'none', range: null, source: 'none' };

    if (!Number.isInteger(age) || age < 18 || age > 78) {
      errors.age = 'Ingresa tu edad en años completos, entre 18 y 78.';
    }
    if (!Number.isFinite(weight) || weight < 35 || weight > 250) {
      errors.weight = 'Ingresa un peso entre 35 y 250 kg. Puedes usar coma o punto para los decimales.';
    }
    if (!Number.isFinite(height) || height < 130 || height > 230) {
      errors.height = 'Ingresa una estatura entre 130 y 230 cm. Por ejemplo, 170.';
    }
    if (data.sex !== 'male' && data.sex !== 'female') {
      errors.sex = 'Selecciona el coeficiente de la fórmula que deseas utilizar.';
    }
    if (!has(BASE_FACTORS, data.dailyMovement)) {
      errors.dailyMovement = 'Selecciona cómo te mueves fuera de tus sesiones de entrenamiento.';
    }
    if (!Number.isInteger(trainingDays) || trainingDays < 0 || trainingDays > 7) {
      errors.trainingDays = 'Indica cuántos días entrenas por semana, entre 0 y 7.';
    } else if (trainingDays > 0) {
      trainingMinutes = parseDecimal(data.trainingMinutes);
      if (!Number.isInteger(trainingMinutes) || trainingMinutes < 15 || trainingMinutes > 120) {
        errors.trainingMinutes = 'Indica una duración en minutos completos, entre 15 y 120.';
      }
      if (!has(TRAINING_METS, data.trainingEffort)) {
        errors.trainingEffort = 'Selecciona el esfuerzo aproximado de tus sesiones de entrenamiento.';
      } else {
        met = TRAINING_METS[data.trainingEffort];
      }
    }

    if (!['maintain', 'loss', 'gain'].includes(data.goal)) {
      errors.goal = 'Selecciona qué quieres estimar: mantener, perder grasa o ganar músculo.';
    } else if (data.goal === 'loss') {
      const deficit = data.deficit === undefined ? 'gentle' : data.deficit;
      if (!has(DEFICITS, deficit)) errors.deficit = 'Selecciona la intensidad de déficit que quieres explorar.';
      else adjustment = DEFICITS[deficit];
    } else if (data.goal === 'gain') {
      const surplus = data.surplus === undefined ? 'small' : data.surplus;
      if (!has(SURPLUSES, surplus)) errors.surplus = 'Selecciona el superávit que quieres explorar.';
      else adjustment = SURPLUSES[surplus];
    }

    if (!['none', 'measured', 'visual'].includes(data.compositionMode)) {
      errors.compositionMode = 'Elige si quieres usar una medición, una guía visual o continuar sin este dato.';
    } else if (data.compositionMode === 'measured') {
      const bodyFat = parseDecimal(data.bodyFat);
      if (!Number.isFinite(bodyFat) || bodyFat < 3 || bodyFat > 60) {
        errors.bodyFat = 'Ingresa un porcentaje entre 3 y 60. Puedes usar coma o punto para los decimales.';
      } else {
        bodyFatValues = [bodyFat];
        composition = { mode: 'measured', range: null, bodyFat, source: 'measured' };
      }
    } else if (data.compositionMode === 'visual') {
      if (data.visualRange === 'skip') {
        // No body-composition input, including stale series/measurement fields,
        // participates when the person explicitly continues without this data.
        composition = { mode: 'none', range: null, source: 'visual-fallback' };
      } else if (!has(VISUAL_RANGES, data.visualSeries)) {
        errors.visualSeries = 'Elige qué serie de ilustraciones quieres consultar.';
      } else {
        const selected = VISUAL_RANGES[data.visualSeries].find(item => item.id === data.visualRange);
        if (!selected) {
          errors.visualRange = 'Selecciona una tarjeta o continúa sin este dato.';
        } else {
          bodyFatValues = [selected.min, selected.max];
          composition = {
            mode: 'visual', range: { min: selected.min, max: selected.max },
            series: data.visualSeries, source: 'visual'
          };
        }
      }
    }

    if (data.eligible !== true) {
      errors.eligible = 'Para continuar, confirma que cumples las condiciones de uso.';
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 18.5) {
      return guardrail('Esta herramienta general no es adecuada para tu combinación de peso y estatura. Una evaluación con un profesional de nutrición puede orientarte mejor, sin depender de una cifra automática.');
    }

    // Product-scope safeguards, not diagnostic or universal health thresholds.
    // The sex coefficient remains explicit even when the FFM equation is used.
    const lowerBodyFat = data.sex === 'male' ? 8 : 16;
    if (bodyFatValues.some(value => value !== null && (value < lowerBodyFat || value > 50))) {
      return guardrail('La composición corporal que ingresaste, o parte del rango visual, queda fuera del alcance orientativo de esta herramienta. No significa un diagnóstico: una evaluación con un profesional de nutrición puede ayudarte a elegir una referencia adecuada.');
    }
    const lossLowerBodyFat = data.sex === 'male' ? 10 : 18;
    if (data.goal === 'loss' && bodyFatValues.some(value => value !== null && value < lossLowerBodyFat)) {
      return guardrail('Explorar un descenso con la composición corporal que ingresaste queda fuera del alcance automatizado de esta herramienta. No es una clasificación de salud: conversa con un profesional de nutrición antes de elegir una meta de pérdida de grasa.');
    }

    const model = composition.mode === 'none' ? 'mifflin' : 'cunningham1991';
    const baseFactor = BASE_FACTORS[data.dailyMovement];
    const weeklyHours = trainingDays * trainingMinutes / 60;
    // Estimate NET exercise above the low-activity time it is assumed to replace.
    // The everyday movement factor explicitly excludes training. The 1.3 MET
    // counterfactual is a disclosed modelling assumption, not measured expenditure.
    const netExercise = trainingDays === 0 ? 0 : (met - REPLACED_MET) * weight * weeklyHours / 7;
    const scenarios = bodyFatValues.map(bodyFat => {
      const ffm = bodyFat === null ? null : weight * (1 - bodyFat / 100);
      const ree = ffm === null
        ? 10 * weight + 6.25 * height - 5 * age + (data.sex === 'male' ? 5 : -161)
        : 370 + 21.6 * ffm;
      const maintenance = ree * baseFactor + netExercise;
      const energy = maintenance * adjustment;
      const proteinTarget = 1.6 * weight; // Total body mass, never substituted with FFM.
      const proteinLimit = energy * 0.3 / 4;
      const protein = Math.min(proteinTarget, proteinLimit);
      const fat = energy * 0.25 / 9;
      const carbs = (energy - protein * 4 - fat * 9) / 4;
      return {
        ree, maintenance, energy, protein, fat, carbs, ffm, bodyFat,
        proteinCapped: proteinTarget > proteinLimit
      };
    });

    if (scenarios.some(item => item.maintenance / item.ree > 2.4)) {
      return guardrail('La combinación de movimiento y entrenamiento, o parte de tu rango visual, queda fuera del alcance orientativo de esta calculadora. Un profesional de nutrición puede valorar mejor tus necesidades de actividad y recuperación.');
    }
    if (scenarios.some(item => item.energy < 1500 || item.energy > 5000)) {
      return guardrail('Tu estimación, o parte del rango visual, queda fuera del rango orientativo de esta calculadora. Para elegir un objetivo adecuado para ti, lo mejor es una evaluación con un profesional de nutrición.');
    }

    const summary = {};
    for (const key of ['ree', 'maintenance', 'energy', 'protein', 'carbs', 'fat']) {
      summary[key] = interval(scenarios.map(item => item[key]));
    }
    summary.ffm = model === 'mifflin' ? null : interval(scenarios.map(item => item.ffm));
    return {
      ok: true, isRange: composition.mode === 'visual', model, composition,
      summary, scenarios,
      activity: {
        baseFactor, netExercise, met, weeklyHours,
        effectivePAL: interval(scenarios.map(item => item.maintenance / item.ree))
      },
      adjustment
    };
  }

  // Native calculations keep precision. Presentation deliberately avoids false
  // precision; outward rounding keeps both visual-boundary scenarios represented.
  function displayTotals(outcome) {
    if (!outcome || outcome.ok !== true) return null;
    const totals = {};
    for (const key of ['energy', 'protein', 'carbs', 'fat']) {
      const step = key === 'energy' ? 50 : 1;
      const source = outcome.summary[key];
      totals[key] = outcome.isRange
        ? { min: Math.floor(source.min / step) * step, max: Math.ceil(source.max / step) * step }
        : { min: Math.round(source.min / step) * step, max: Math.round(source.max / step) * step };
    }
    return totals;
  }

  function distributeMeals(outcome, count) {
    if (![3, 4, 5].includes(count)) throw new RangeError('Elige 3, 4 o 5 comidas.');
    const totals = displayTotals(outcome);
    if (!totals) return [];
    const meals = Array.from({ length: count }, () => ({}));
    for (const key of ['protein', 'carbs', 'fat']) {
      for (const limit of ['min', 'max']) {
        const base = Math.floor(totals[key][limit] / count);
        const remainder = totals[key][limit] % count;
        meals.forEach((meal, index) => {
          if (!meal[key]) meal[key] = {};
          meal[key][limit] = base + (index < remainder ? 1 : 0);
        });
      }
    }
    return meals;
  }

  return Object.freeze({ VERSION, VISUAL_RANGES, calculate, displayTotals, distributeMeals });
});
