'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('macro-form');
  const engine = window.DGYMCalculator;
  const ready = typeof engine?.calculate === 'function' && typeof engine?.displayTotals === 'function';
  const loadError = 'No se pudo cargar la calculadora. Recarga la página para intentarlo; no se ha enviado ningún dato.';
  const fields = ['sex', 'age', 'weight', 'height', 'compositionMode', 'bodyFat', 'visualSeries', 'visualRange', 'dailyMovement', 'trainingDays', 'trainingMinutes', 'trainingEffort', 'goal', 'deficit', 'surplus', 'eligible'];
  const groups = new Set(['goal', 'compositionMode', 'visualRange']);
  const byGroup = (name) => [...form.querySelectorAll(`[name="${name}"]`)];
  const value = (name) => groups.has(name) ? byGroup(name).find((node) => node.checked)?.value || '' : $(name).value;
  const controls = (name) => groups.has(name) ? byGroup(name) : [$(name)];
  const fmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  const n = (number) => fmt.format(number);
  const interval = (range) => range.min === range.max ? n(range.min) : `${n(range.min)}–${n(range.max)}`;
  const roundedRange = (range, digits = 0) => {
    const formatter = new Intl.NumberFormat('es-CL', { maximumFractionDigits: digits });
    return range.min === range.max ? formatter.format(range.min) : `${formatter.format(range.min)}–${formatter.format(range.max)}`;
  };
  let currentResult = null;
  let lastMode = value('compositionMode');
  let lastGoal = '';
  let lastSex = '';
  let lastSeries = '';

  function clearErrors() {
    for (const key of fields) {
      $(`${key}-error`).hidden = true;
      $(`${key}-error`).textContent = '';
      controls(key).forEach((node) => node.removeAttribute('aria-invalid'));
    }
    $('form-status').textContent = ready ? '' : loadError;
  }

  function clearResult() {
    currentResult = null;
    $('result').hidden = true;
    $('guardrail').hidden = true;
    $('empty-result').hidden = false;
    for (const id of ['energy', 'protein', 'carbs', 'fat', 'result-goal', 'range-explanation', 'calculation-model', 'calculation-composition', 'calculation-activity', 'calculation-summary', 'rounding-note', 'guardrail-message', 'meal-range-note']) $(id).textContent = '';
    $('protein-cap').hidden = true;
    $('range-explanation').hidden = true;
    $('meal-rows').replaceChildren();
    $('meal-total').replaceChildren();
    $('meal-details').open = false;
    $('mealCount').value = '3';
    $('result').querySelectorAll('details').forEach((node) => { node.open = false; });
  }

  function panel(id, shown, ids) {
    $(id).hidden = !shown;
    ids.forEach((key) => controls(key).forEach((node) => { node.disabled = !shown; }));
  }

  function renderCards(series) {
    const cards = $('visual-cards');
    cards.replaceChildren();
    const ranges = engine?.VISUAL_RANGES?.[series] || [];
    for (const [index, range] of ranges.entries()) {
      const label = document.createElement('label');
      label.className = 'body-card';
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'visualRange'; radio.value = range.id;
      radio.setAttribute('aria-describedby', 'visual-help visualRange-error');
      const crop = document.createElement('span');
      crop.className = 'body-crop';
      const img = document.createElement('img');
      img.src = `assets/series-${series}-v2.png`;
      img.alt = `Ilustración ficticia ${index + 1} de la serie ${series === 'male' ? 'masculina' : 'femenina'}; no es una medición.`;
      img.width = 1983; img.height = 793; img.loading = 'lazy'; img.decoding = 'async';
      // CSS crops equal columns of the original sheet without altering the asset.
      img.style.left = `${-index * 100}%`;
      const fallback = document.createElement('span');
      fallback.className = 'image-fallback';
      fallback.textContent = 'Ilustración no disponible. Puedes usar la etiqueta de rango o continuar sin este dato.';
      fallback.hidden = true;
      img.addEventListener('error', () => { img.hidden = true; fallback.hidden = false; });
      crop.append(img, fallback);
      const text = document.createElement('span');
      text.className = 'body-range';
      text.textContent = `${range.min}% a ${range.maxInclusive ? '' : 'menos de '}${range.max}%`;
      const note = document.createElement('small');
      note.textContent = 'Rango orientativo';
      label.append(radio, crop, text, note);
      cards.append(label);
      // Keep keyboard choices visible without moving a pointer target between
      // mousedown and mouseup, which can cancel a click near a carousel edge.
      radio.addEventListener('focus', () => {
        if (radio.matches(':focus-visible')) label.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      });
    }
  }

  function syncConditional() {
    const mode = value('compositionMode');
    const goal = value('goal');
    const sex = value('sex');
    if (mode !== lastMode) {
      $('bodyFat').value = '';
      byGroup('visualRange').forEach((node) => { node.checked = false; });
      if (mode === 'visual') $('visualSeries').value = sex;
      lastMode = mode;
    }
    if (sex !== lastSex) {
      // A coefficient change must not retain a visual choice from another series.
      $('visualSeries').value = sex;
      byGroup('visualRange').forEach((node) => { node.checked = false; });
      lastSex = sex;
    }
    const series = value('visualSeries');
    if (series !== lastSeries) {
      renderCards(series);
      byGroup('visualRange').forEach((node) => { node.checked = false; });
      lastSeries = series;
    }
    panel('measured-panel', mode === 'measured', ['bodyFat']);
    panel('visual-panel', mode === 'visual', ['visualSeries', 'visualRange']);
    if (mode !== 'measured') $('bodyFat').value = '';
    if (mode !== 'visual') byGroup('visualRange').forEach((node) => { node.checked = false; });
    $('composition-help').hidden = mode !== 'none';
    const training = Number(value('trainingDays')) > 0;
    panel('training-panel', training, ['trainingMinutes', 'trainingEffort']);
    if (!training) { $('trainingMinutes').value = ''; $('trainingEffort').value = ''; }
    if (goal !== lastGoal) { $('deficit').value = 'gentle'; $('surplus').value = 'small'; lastGoal = goal; }
    panel('deficit-panel', goal === 'loss', ['deficit']);
    panel('surplus-panel', goal === 'gain', ['surplus']);
  }

  function readInput() {
    const data = Object.fromEntries(fields.filter((key) => key !== 'eligible').map((key) => [key, value(key)]));
    data.eligible = $('eligible').checked;
    return data;
  }

  function mealRow(label, macros, heading = false) {
    const row = document.createElement('tr');
    const first = document.createElement('th'); first.scope = 'row'; first.textContent = label; row.append(first);
    for (const macro of ['protein', 'carbs', 'fat']) {
      const cell = document.createElement(heading ? 'th' : 'td');
      cell.textContent = `${interval(macros[macro])} g`; row.append(cell);
    }
    return row;
  }

  function renderMeals() {
    if (!currentResult) return;
    const count = Number($('mealCount').value);
    const meals = engine.distributeMeals(currentResult, count);
    $('meal-rows').replaceChildren(...meals.map((meal, i) => mealRow(`${i + 1}`, meal)));
    $('meal-total').replaceChildren(mealRow('Total', engine.displayTotals(currentResult), true));
    $('meal-caption').textContent = `Ejemplo en ${count} comidas · gramos de nutrientes`;
    $('meal-range-note').textContent = currentResult.isRange
      ? 'Cada columna conserva los extremos de los escenarios. Los mínimos y máximos suman por separado los totales diarios mostrados; no son límites validados de tus necesidades.'
      : 'Los gramos que sobran al dividir se reparten en las primeras comidas para que la suma coincida con el total diario.';
  }

  function reveal(panelId, headingId) {
    $(headingId).focus({ preventScroll: true });
    $(panelId).scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  function showErrors(errors) {
    for (const [key, message] of Object.entries(errors)) {
      if (!fields.includes(key)) continue;
      $(`${key}-error`).textContent = message;
      $(`${key}-error`).hidden = false;
      controls(key).forEach((node) => node.setAttribute('aria-invalid', 'true'));
    }
    $('form-status').textContent = 'Revisa los campos indicados para continuar.';
    const first = fields.find((key) => errors[key] && controls(key).some((node) => !node.disabled));
    controls(first || 'sex').find((node) => !node.disabled)?.focus();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    syncConditional(); clearErrors(); clearResult();
    if (!ready) return;
    const input = readInput();
    let outcome;
    try { outcome = engine.calculate(input); }
    catch { $('form-status').textContent = 'No pudimos calcular esta referencia. Revisa tus datos o recarga la página.'; $('calculate').focus(); return; }
    if (outcome.errors) { showErrors(outcome.errors); return; }
    if (outcome.guardrail) {
      $('guardrail-message').textContent = outcome.guardrail;
      $('empty-result').hidden = true; $('guardrail').hidden = false;
      reveal('guardrail', 'guardrail-title'); return;
    }
    if (!outcome.ok) { $('form-status').textContent = 'No pudimos calcular con estos datos.'; return; }
    currentResult = outcome;
    const totals = engine.displayTotals(outcome);
    for (const key of ['energy', 'protein', 'carbs', 'fat']) $(key).textContent = interval(totals[key]);
    $('result').classList.toggle('is-range', outcome.isRange);
    $('energy-kind').textContent = outcome.isRange ? 'kcal al día · intervalo de escenarios' : 'kcal al día · estimación';
    $('result-goal').textContent = input.goal === 'maintain' ? 'Mantenerme' : input.goal === 'loss'
      ? `Perder grasa · ${Math.round((1 - outcome.adjustment) * 100)}% bajo mantenimiento`
      : `Ganar músculo · ${Math.round((outcome.adjustment - 1) * 100)}% sobre mantenimiento`;
    $('range-explanation').hidden = !outcome.isRange;
    $('range-explanation').textContent = outcome.isRange ? 'Calculamos los dos extremos del rango visual elegido. No es un margen de error validado: la actividad, la ecuación y tu elección también pueden cambiar el resultado.' : '';
    $('calculation-model').textContent = outcome.model === 'mifflin'
      ? 'Energía: Mifflin–St Jeor, con peso, estatura, edad y sexo utilizado por la fórmula. Calcular sin composición corporal sigue siendo una referencia válida como punto de partida, no una medición individual.'
      : 'Energía: Cunningham (1991), 370 + 21,6 × masa libre de grasa. Usar composición corporal no garantiza mayor precisión. Masa libre de grasa incluye agua, órganos y huesos, no solo músculo.';
    const compositionRange = outcome.composition.range || (outcome.composition.mode === 'measured' ? { min: outcome.composition.bodyFat, max: outcome.composition.bodyFat } : null);
    $('calculation-composition').textContent = compositionRange
      ? `Grasa usada: ${roundedRange(compositionRange, 1)}%. Masa libre de grasa estimada: ${roundedRange(outcome.summary.ffm, 1)} kg. ${outcome.isRange ? 'Los extremos se usan como escenarios, incluido el límite superior aunque la etiqueta lo excluya, para no estrechar artificialmente el cálculo.' : 'La medición informada también tiene incertidumbre, aunque aquí exploremos un solo valor.'}`
      : 'No se utilizó un porcentaje de grasa corporal.';
    $('calculation-activity').textContent = `Base cotidiana: reposo × ${outcome.activity.baseFactor.toLocaleString('es-CL')}. Entrenamiento neto: aproximadamente ${n(Math.round(outcome.activity.netExercise))} kcal al día, promediadas entre siete días. ${outcome.activity.weeklyHours > 0 ? `Supuesto de ${outcome.activity.met.toLocaleString('es-CL')} MET menos 1,3 MET de actividad reemplazada; incluye pausas.` : 'Sin sesiones añadidas.'} No sumamos de nuevo el entrenamiento dentro del factor cotidiano.`;
    $('calculation-summary').textContent = `Reposo estimado: ${roundedRange(outcome.summary.ree)} kcal. Mantenimiento: ${roundedRange(outcome.summary.maintenance)} kcal al día. Ajuste de objetivo: factor ${outcome.adjustment.toLocaleString('es-CL')}. Proteína sobre peso total, grasas al 25% y carbohidratos restantes.`;
    $('protein-cap').hidden = !outcome.scenarios.some((scenario) => scenario.proteinCapped);
    $('rounding-note').textContent = outcome.isRange
      ? 'Para mostrar el intervalo redondeamos hacia afuera: energía a 50 kcal y macros a gramos enteros. Por eso los números mostrados pueden no reproducir exactamente la identidad 4/4/9; los cálculos internos sí la mantienen.'
      : 'Energía redondeada a 50 kcal y macros al gramo más cercano. Su suma puede diferir por redondeo; el cálculo interno conserva 4/4/9.';
    renderMeals();
    $('empty-result').hidden = true; $('result').hidden = false;
    reveal('result', 'result-title');
  });

  function invalidateResult() {
    const hadResult = currentResult !== null || !$('guardrail').hidden;
    const alreadyStale = $('form-status').textContent.startsWith('Cambiaste un dato.');
    syncConditional(); clearErrors(); clearResult();
    if ((hadResult || alreadyStale) && ready) $('form-status').textContent = 'Cambiaste un dato. Vuelve a calcular para ver una referencia actualizada.';
  }
  form.addEventListener('input', invalidateResult);
  // change covers native selects/radios in browsers that do not emit input consistently.
  form.addEventListener('change', invalidateResult);
  $('mealCount').addEventListener('change', renderMeals);
  function reset(focus = true) {
    form.reset();
    lastMode = 'none'; lastSex = ''; lastSeries = ''; lastGoal = '';
    $('visual-cards').replaceChildren();
    $('visualSeries').value = '';
    syncConditional(); clearErrors(); clearResult();
    if (focus) $('sex').focus();
  }
  $('reset').addEventListener('click', () => reset());
  $('guardrail-reset').addEventListener('click', () => reset());
  window.addEventListener('pagehide', () => reset(false));
  syncConditional();
  $('calculate').disabled = !ready;
  if (!ready) $('form-status').textContent = loadError;
})();
