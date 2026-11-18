'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const engine = require('../calculator.js');
const directory = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
const controller = fs.readFileSync(path.join(directory, 'page.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(directory, 'calculator.js'), 'utf8');

function attributes(raw) {
  const result = {};
  const attribute = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of raw.matchAll(attribute)) {
    result[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? '').replace(/&amp;/g, '&');
  }
  return result;
}

// Strict, intentionally small DOM harness built from the actual markup. It
// supports dynamic cards and table rows but does not simulate browser layout,
// asset loading, assistive technology, or native keyboard radio navigation.
function createPage({ calculate = engine.calculate, engineAvailable = true } = {}) {
  const nodes = new Map();
  const windowListeners = new Map();
  const privacyCalls = [];
  let activeElement = null;

  class Element {
    constructor(tag, attrs = {}) {
      this.tagName = tag.toUpperCase();
      this.attrs = { ...attrs };
      this.id = attrs.id || '';
      this.name = attrs.name || '';
      this.value = attrs.value || '';
      this.defaultValue = this.value;
      this.checked = Object.hasOwn(attrs, 'checked');
      this.defaultChecked = this.checked;
      this.hidden = Object.hasOwn(attrs, 'hidden');
      this.disabled = Object.hasOwn(attrs, 'disabled');
      this.open = Object.hasOwn(attrs, 'open');
      this.textContent = '';
      this.className = attrs.class || '';
      this.children = [];
      this.parentElement = null;
      this.style = {};
      this.listeners = new Map();
      this.classList = {
        toggle: (name, forced) => {
          const classes = new Set(this.className.split(/\s+/).filter(Boolean));
          const add = forced ?? !classes.has(name);
          if (add) classes.add(name); else classes.delete(name);
          this.className = [...classes].join(' ');
          return add;
        },
        contains: name => this.className.split(/\s+/).includes(name)
      };
    }
    append(...children) {
      for (const child of children) {
        if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(node => node !== child);
        child.parentElement = this;
        this.children.push(child);
      }
    }
    replaceChildren(...children) {
      for (const child of this.children) child.parentElement = null;
      this.children = [];
      this.append(...children);
    }
    descendants() { return this.children.flatMap(child => [child, ...child.descendants()]); }
    querySelectorAll(selector) {
      const group = /^\[name="([^"]+)"\]$/.exec(selector);
      if (group) return this.descendants().filter(node => node.name === group[1]);
      if (/^[a-z]+$/.test(selector)) return this.descendants().filter(node => node.tagName === selector.toUpperCase());
      assert.fail(`Unsupported selector ${this.id}: ${selector}`);
    }
    matches(selector) {
      assert.equal(selector, ':focus-visible');
      return this.focusVisible === true;
    }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
    dispatch(type, bubbles = ['input', 'change', 'click', 'submit'].includes(type)) {
      const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      for (let node = this; node; node = bubbles ? node.parentElement : null) {
        for (const listener of node.listeners.get(type) || []) listener(event);
      }
      return event;
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    removeAttribute(name) { delete this.attrs[name]; }
    getAttribute(name) { return this.attrs[name] ?? null; }
    focus(options) { activeElement = this; this.focusOptions = options; }
    scrollIntoView(options) { this.scrollOptions = options; }
    reset() {
      assert.equal(this.tagName, 'FORM');
      for (const node of this.descendants()) {
        if (['INPUT', 'SELECT'].includes(node.tagName)) {
          node.value = node.defaultValue;
          node.checked = node.defaultChecked;
        }
      }
    }
  }

  const root = new Element('document');
  const stack = [root];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const node = stack.pop();
      assert.equal(node.tagName, tag.toUpperCase(), `Unexpected closing ${tag}`);
      continue;
    }
    const node = new Element(tag, attributes(match[2]));
    stack.at(-1).append(node);
    if (node.id) {
      assert.equal(nodes.has(node.id), false, `Duplicate id ${node.id}`);
      nodes.set(node.id, node);
    }
    if (!voidTags.has(tag)) stack.push(node);
  }
  assert.equal(stack.length, 1);
  for (const select of root.querySelectorAll('select')) {
    const options = select.querySelectorAll('option');
    select.value = select.defaultValue = (options.find(option => Object.hasOwn(option.attrs, 'selected')) || options[0]).value;
  }
  const forbidden = name => () => { privacyCalls.push(name); throw new Error(`Unexpected privacy API: ${name}`); };
  const document = {
    getElementById(id) { assert.ok(nodes.has(id), `Missing #${id}`); return nodes.get(id); },
    createElement(tag) { return new Element(tag); }
  };
  Object.defineProperty(document, 'cookie', { get: forbidden('cookie read'), set: forbidden('cookie write') });
  const window = {
    ...(engineAvailable ? { DGYMCalculator: { ...engine, calculate } } : {}),
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    }
  };
  const context = { document, window, Intl, navigator: { sendBeacon: forbidden('sendBeacon') } };
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) context[name] = window[name] = forbidden(name);
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
    Object.defineProperty(context, name, { get: forbidden(name) });
    Object.defineProperty(window, name, { get: forbidden(name) });
  }
  vm.runInNewContext(controller, context, { filename: 'page.js' });
  const get = id => document.getElementById(id);
  const group = name => get('macro-form').querySelectorAll(`[name="${name}"]`);
  const change = (id, value, type = 'input') => { get(id).value = value; get(id).dispatch(type); };
  const choose = (name, value, type = 'input') => {
    const controls = group(name);
    const target = controls.find(node => node.value === value);
    assert.ok(target, `Missing ${name}=${value}`);
    for (const node of controls) node.checked = node === target;
    target.dispatch(type);
  };
  return {
    get, group, change, choose, privacyCalls,
    get activeElement() { return activeElement; },
    fill(overrides = {}) {
      const values = { sex: 'male', age: '30', weight: '80', height: '180', dailyMovement: 'seated', trainingDays: '0', goal: 'maintain', eligible: true, ...overrides };
      for (const key of ['sex', 'age', 'weight', 'height', 'dailyMovement', 'trainingDays']) change(key, values[key]);
      choose('goal', values.goal);
      get('eligible').checked = values.eligible;
      get('eligible').dispatch('input');
    },
    submit() { return get('macro-form').dispatch('submit'); },
    click(id) { return get(id).dispatch('click'); },
    pagehide() { for (const listener of windowListeners.get('pagehide') || []) listener({ type: 'pagehide' }); }
  };
}

const displayed = ['energy', 'protein', 'carbs', 'fat', 'result-goal', 'range-explanation', 'calculation-model', 'calculation-composition', 'calculation-activity', 'calculation-summary', 'rounding-note', 'guardrail-message', 'meal-range-note'];
function assertEmpty(page) {
  assert.equal(page.get('result').hidden, true);
  assert.equal(page.get('guardrail').hidden, true);
  assert.equal(page.get('empty-result').hidden, false);
  for (const id of displayed) assert.equal(page.get(id).textContent, '', `${id} retains stale output`);
  assert.equal(page.get('meal-rows').children.length, 0);
  assert.equal(page.get('meal-total').children.length, 0);
  assert.equal(page.get('mealCount').value, '3');
  assert.ok(page.get('result').querySelectorAll('details').every(node => !node.open));
}
function assertFieldsCleared(page) {
  for (const id of ['sex', 'age', 'weight', 'height', 'bodyFat', 'visualSeries', 'dailyMovement', 'trainingDays', 'trainingMinutes', 'trainingEffort']) assert.equal(page.get(id).value, '', `${id} not cleared`);
  assert.equal(page.get('eligible').checked, false);
  assert.equal(page.group('compositionMode').find(node => node.checked).value, 'none');
  assert.ok(page.group('goal').every(node => !node.checked));
  assert.ok(page.group('visualRange').every(node => !node.checked));
  assert.equal(page.get('visual-cards').children.length, 0);
  for (const id of ['measured-panel', 'visual-panel', 'training-panel', 'deficit-panel', 'surplus-panel']) assert.equal(page.get(id).hidden, true);
}
const renderedMacros = row => row.children.slice(1).map(cell => cell.textContent.replace(/ g$/, '').split('–').map(value => Number(value.replaceAll('.', ''))));

test('initial state enables a loaded engine and preserves recovery guidance when unavailable', () => {
  const ready = createPage();
  assert.equal(ready.get('calculate').disabled, false);
  assert.equal(ready.get('bodyFat').disabled, true);
  assert.equal(ready.get('trainingMinutes').disabled, true);
  const missing = createPage({ engineAvailable: false });
  missing.fill();
  missing.click('reset');
  assert.equal(missing.get('calculate').disabled, true);
  assert.match(missing.get('form-status').textContent, /Recarga la página/);
  assertFieldsCleared(missing);
});

test('invalid submit prevents navigation, marks accessible errors and focuses the first control', () => {
  const page = createPage();
  assert.equal(page.submit().defaultPrevented, true);
  assertEmpty(page);
  for (const field of ['sex', 'age', 'weight', 'height', 'dailyMovement', 'trainingDays', 'goal', 'eligible']) {
    assert.equal(page.get(`${field}-error`).hidden, false);
    for (const control of field === 'goal' ? page.group(field) : [page.get(field)]) assert.equal(control.getAttribute('aria-invalid'), 'true');
  }
  assert.equal(page.activeElement.id, 'sex');
  page.fill();
  page.submit();
  assert.equal(page.get('result').hidden, false);
  assert.equal(page.get('energy').textContent, '2.500');
  assert.equal(page.get('protein').textContent, '128');
  assert.equal(page.get('carbs').textContent, '339');
  assert.equal(page.get('fat').textContent, '69');
  assert.equal(page.activeElement.id, 'result-title');
});

test('measured composition renders the supplied percentage and FFM, including comma decimals', () => {
  const page = createPage();
  page.fill();
  page.choose('compositionMode', 'measured');
  assert.equal(page.get('bodyFat').disabled, false);
  page.change('bodyFat', '25,5');
  page.submit();
  assert.equal(page.get('result').hidden, false);
  assert.equal(page.get('range-explanation').hidden, true);
  assert.match(page.get('calculation-model').textContent, /Cunningham/);
  assert.match(page.get('calculation-composition').textContent, /Grasa usada: 25,5%/);
  assert.match(page.get('calculation-composition').textContent, /59,6 kg/);
  assert.match(page.get('calculation-composition').textContent, /medición informada/);
  assert.doesNotMatch(page.get('calculation-composition').textContent, /No se utilizó/);
});

test('visual series render five cards without choosing a card and changes clear prior selections', () => {
  const page = createPage();
  page.fill();
  page.choose('compositionMode', 'visual');
  assert.equal(page.get('visualSeries').value, 'male');
  assert.equal(page.get('visual-cards').children.length, 5);
  assert.equal(page.group('visualRange').length, 6);
  assert.ok(page.group('visualRange').every(node => !node.checked && !node.disabled));
  page.submit();
  assert.equal(page.get('visualRange-error').hidden, false);
  assert.equal(page.activeElement, page.group('visualRange')[0]);
  page.choose('visualRange', 'm3');
  page.submit();
  assert.equal(page.get('result').hidden, false);
  assert.equal(page.get('result').classList.contains('is-range'), true);
  assert.match(page.get('energy').textContent, /–/);
  assert.match(page.get('calculation-composition').textContent, /20–25%/);
  page.change('visualSeries', 'female');
  assertEmpty(page);
  assert.ok(page.group('visualRange').every(node => !node.checked));
  assert.deepEqual(page.group('visualRange').map(node => node.value), ['f1', 'f2', 'f3', 'f4', 'f5', 'skip']);
  page.choose('visualRange', 'f2');
  page.change('sex', 'female');
  assert.ok(page.group('visualRange').every(node => !node.checked), 'Changing coefficient also clears a choice within the same visible series');
});

test('skip works with no series and produces exactly the composition-free result', () => {
  const page = createPage();
  page.fill();
  page.submit();
  const withoutComposition = ['energy', 'protein', 'carbs', 'fat'].map(id => page.get(id).textContent);
  page.choose('compositionMode', 'visual');
  page.change('visualSeries', '');
  page.choose('visualRange', 'skip');
  page.submit();
  assert.equal(page.get('result').hidden, false);
  assert.deepEqual(['energy', 'protein', 'carbs', 'fat'].map(id => page.get(id).textContent), withoutComposition);
  assert.equal(page.get('range-explanation').hidden, true);
  assert.match(page.get('calculation-model').textContent, /Mifflin/);
  assert.match(page.get('calculation-composition').textContent, /No se utilizó/);
});

test('leaving measured and visual modes removes hidden sensitive values', () => {
  const page = createPage();
  page.fill();
  page.choose('compositionMode', 'measured');
  page.change('bodyFat', '22');
  page.choose('compositionMode', 'visual');
  assert.equal(page.get('bodyFat').value, '');
  assert.equal(page.get('bodyFat').disabled, true);
  page.choose('visualRange', 'm2');
  page.choose('compositionMode', 'none');
  assert.ok(page.group('visualRange').every(node => !node.checked && node.disabled));
  page.choose('compositionMode', 'measured');
  assert.equal(page.get('bodyFat').value, '');
  page.submit();
  assert.equal(page.get('bodyFat-error').hidden, false);
});

test('training zero erases session details and goal switches restore default adjustments', () => {
  let received;
  const page = createPage({ calculate(input) { received = { ...input }; return engine.calculate(input); } });
  page.fill();
  page.change('trainingDays', '3');
  page.change('trainingMinutes', '60');
  page.change('trainingEffort', 'moderate');
  page.submit();
  assert.equal(page.get('result').hidden, false);
  assert.match(page.get('calculation-activity').textContent, /MET menos 1,3/);
  page.change('trainingDays', '0');
  for (const id of ['trainingMinutes', 'trainingEffort']) { assert.equal(page.get(id).value, ''); assert.equal(page.get(id).disabled, true); }
  page.choose('goal', 'loss');
  page.change('deficit', 'aggressive');
  page.submit();
  assert.match(page.get('result-goal').textContent, /20%/);
  assert.equal(received.trainingMinutes, '');
  assert.equal(received.trainingEffort, '');
  page.choose('goal', 'gain');
  assert.equal(page.get('deficit').disabled, true);
  assert.equal(page.get('surplus').value, 'small');
  page.change('surplus', 'large');
  page.choose('goal', 'maintain');
  page.choose('goal', 'loss');
  assert.equal(page.get('deficit').value, 'gentle');
  assert.equal(page.get('surplus').value, 'small');
});

test('change without input invalidates output and input followed by change preserves recalculation guidance', () => {
  const page = createPage();
  page.fill();
  page.submit();
  page.get('meal-details').open = true;
  page.choose('goal', 'loss', 'change');
  assertEmpty(page);
  assert.equal(page.get('deficit-panel').hidden, false);
  assert.match(page.get('form-status').textContent, /Vuelve a calcular/);
  page.submit();
  page.change('dailyMovement', 'standing', 'input');
  page.get('dailyMovement').dispatch('change');
  assertEmpty(page);
  assert.match(page.get('form-status').textContent, /Vuelve a calcular/);
});

test('missing illustrations reveal a text fallback without silently selecting a card', () => {
  const page = createPage();
  page.fill();
  page.choose('compositionMode', 'visual');
  for (const card of page.get('visual-cards').children) {
    const [radio, crop] = card.children;
    const [image, fallback] = crop.children;
    assert.match(image.src, /^assets\/series-male-v2\.png$/);
    assert.equal(fallback.hidden, true);
    image.dispatch('error');
    assert.equal(image.hidden, true);
    assert.equal(fallback.hidden, false);
    assert.match(fallback.textContent, /Ilustración no disponible/);
    assert.equal(radio.checked, false);
    radio.dispatch('focus');
    assert.equal(card.scrollOptions, undefined, 'Pointer focus must not reposition a card during its click');
    radio.focusVisible = true;
    radio.dispatch('focus');
    assert.equal(card.scrollOptions.inline, 'nearest');
  }
  page.choose('visualRange', 'skip');
  page.submit();
  assert.equal(page.get('result').hidden, false);
});

test('meal count updates keep results and both interval edges sum to the displayed daily totals', () => {
  for (const mode of ['none', 'visual']) {
    const page = createPage();
    page.fill();
    if (mode === 'visual') { page.choose('compositionMode', mode); page.choose('visualRange', 'm3'); }
    page.submit();
    const energy = page.get('energy').textContent;
    for (const count of [3, 4, 5]) {
      page.change('mealCount', String(count), 'change');
      assert.equal(page.get('result').hidden, false, 'Meal selector must not invalidate the form result');
      assert.equal(page.get('energy').textContent, energy);
      const meals = page.get('meal-rows').children.map(renderedMacros);
      const totals = renderedMacros(page.get('meal-total').children[0]);
      assert.equal(meals.length, count);
      for (let macro = 0; macro < 3; macro++) {
        for (const edge of [0, 1]) assert.equal(meals.reduce((sum, meal) => sum + meal[macro][Math.min(edge, meal[macro].length - 1)], 0), totals[macro][Math.min(edge, totals[macro].length - 1)]);
      }
      assert.match(page.get('meal-caption').textContent, new RegExp(`${count} comidas`));
    }
  }
});

test('guardrail, validation and engine errors erase a prior successful result', () => {
  const page = createPage();
  page.fill();
  page.submit();
  page.get('weight').value = '50';
  page.submit();
  assert.equal(page.get('result').hidden, true);
  assert.equal(page.get('energy').textContent, '');
  assert.equal(page.get('guardrail').hidden, false);
  assert.equal(page.activeElement.id, 'guardrail-title');
  page.change('weight', '80', 'change');
  assertEmpty(page);
  page.submit();
  page.get('age').value = '1e2';
  page.submit();
  assertEmpty(page);
  assert.equal(page.get('age-error').hidden, false);
  assert.equal(page.activeElement.id, 'age');
  const broken = createPage({ calculate() { throw new Error('private engine details'); } });
  broken.fill();
  broken.submit();
  assertEmpty(broken);
  assert.match(broken.get('form-status').textContent, /recarga la página/);
  assert.doesNotMatch(broken.get('form-status').textContent, /private engine/);
  assert.equal(broken.activeElement.id, 'calculate');
});

test('reset buttons and pagehide clear personal values, cards, errors, meal rows and results', () => {
  for (const trigger of ['reset', 'guardrail-reset', 'pagehide']) {
    const page = createPage();
    page.fill();
    page.choose('compositionMode', 'visual');
    page.choose('visualRange', 'm3');
    page.submit();
    page.get('meal-details').open = true;
    page.change('mealCount', '5', 'change');
    if (trigger === 'guardrail-reset') { page.change('weight', '50'); page.submit(); }
    const previousFocus = page.activeElement;
    if (trigger === 'pagehide') page.pagehide(); else page.click(trigger);
    assertEmpty(page);
    assertFieldsCleared(page);
    assert.equal(page.get('form-status').textContent, '');
    if (trigger === 'pagehide') assert.equal(page.activeElement, previousFocus);
    else assert.equal(page.activeElement.id, 'sex');
    assert.deepEqual(page.privacyCalls, []);
  }
  const invalid = createPage();
  invalid.submit();
  invalid.click('reset');
  assertFieldsCleared(invalid);
  assertEmpty(invalid);
  for (const field of ['sex', 'age', 'weight', 'height', 'dailyMovement', 'trainingDays', 'goal', 'eligible']) {
    assert.equal(invalid.get(`${field}-error`).hidden, true);
    assert.equal(invalid.get(`${field}-error`).textContent, '');
    for (const control of field === 'goal' ? invalid.group(field) : [invalid.get(field)]) assert.equal(control.getAttribute('aria-invalid'), null);
  }
});

test('privacy policy denies native submission and dynamic data never enter network or storage APIs', () => {
  const meta = [...html.matchAll(/<meta\b([^>]*)>/gi)].map(match => attributes(match[1]));
  const policy = meta.find(attrs => attrs['http-equiv'] === 'Content-Security-Policy').content.split(';').map(part => part.trim());
  for (const directive of ["connect-src 'none'", "form-action 'none'", "script-src 'self'", "base-uri 'none'"]) assert.ok(policy.includes(directive));
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /<form\b[^>]*autocomplete="off"/);
  const js = `${controller}\n${engineSource}`;
  assert.doesNotMatch(js, /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|URLSearchParams)\b/);
  assert.doesNotMatch(js, /document\.cookie|location\.|history\.|\.innerHTML\s*=|\.outerHTML\s*=/);
  for (const page of [createPage()]) {
    page.fill({ weight: '81,7', age: '41' });
    page.choose('compositionMode', 'measured');
    page.change('bodyFat', '23,4');
    assert.equal(page.submit().defaultPrevented, true);
    page.choose('compositionMode', 'visual');
    page.choose('visualRange', 'm2');
    page.submit();
    const sources = page.get('visual-cards').querySelectorAll('img').map(image => image.src);
    assert.ok(sources.every(source => source === 'assets/series-male-v2.png'));
    page.pagehide();
    assert.deepEqual(page.privacyCalls, []);
  }
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const anchor = attributes(match[1]);
    if (anchor.target === '_blank') assert.ok(anchor.rel.includes('noopener') && anchor.rel.includes('noreferrer'));
    if (anchor.href?.startsWith('https://wa.me/')) {
      const url = new URL(anchor.href);
      assert.deepEqual([...url.searchParams.keys()], ['text']);
      assert.doesNotMatch(url.searchParams.get('text'), /\b(?:kg|kcal|peso|edad|estatura|grasa)\b/i);
    }
  }
});
