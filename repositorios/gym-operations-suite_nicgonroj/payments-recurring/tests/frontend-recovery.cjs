"use strict";

// Offline only: run the real HTML functions and event handlers against a deterministic
// DOM, fetch queue and clock. No HTTP calls, enrollment creation or real payment.
// Run: node tests/frontend-recovery.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");
const html = fs.readFileSync(path.resolve(__dirname, "../public/index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
const plain = value => JSON.parse(JSON.stringify(value));
function actualFunction(name) {
  const match = script.match(new RegExp("      function " + name + "\\([^]*?\\n      \\}"));
  assert.ok(match, name + " exists in actual frontend");
  return match[0];
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 16; i++) await Promise.resolve(); }
async function until(predicate) {
  for (let i = 0; i < 100 && !predicate(); i++) await new Promise(resolve => setImmediate(resolve));
  assert.ok(predicate(), "expected async work completed");
}
function harness(withAbort = true, storageFails = false) {
  const nodes = new Map(), calls = [], timers = new Map(), storage = new Map(), listeners = new Map();
  let timerId = 0, uuidCount = 0;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value: "", textContent: "", checked: false, hidden: false, disabled: false, attributes: {}, listeners: {},
      open: false, focused: false,
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      querySelectorAll(selector) { return selector.split(",").map(value => node(value.trim().replace(/^#/, ""))); },
      focus() { this.focused = true; },
      close() { this.open = false; },
      showModal() { this.open = true; },
    });
    return nodes.get(id);
  }
  const location = { protocol: "https:", hostname: "demogym.example", search: "?plan=inicio&duration=1&mode=single&utm_source=qa", assigned: null,
    assign(url) { this.assigned = url; } };
  const ctx = {
    URL, URLSearchParams, Intl, Number, Object, Uint8Array, Promise, AbortController: withAbort ? AbortController : undefined,
    state: { step: 2, plan: "inicio", duration: 1, mode: "single" }, selectionTouched: true, isLocalPreview: false,
    checkoutAvailability: { resolved: false, enabled: false, preflightReady: false, paymentOptions: {}, offers: {} },
    checkoutHold: { blocked: false, reference: null, reconcileAllowed: false, completed: false },
    checkoutAttempt: { fingerprintHash: null, key: null }, isSubmitting: false,
    availabilityRequestSequence: 0, availabilityRequestController: null,
    availabilityEndpoint: "api/disponibilidad.php", checkoutEndpoint: "api/inscripciones.php",
    attributionKeys: ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"],
    attemptStorageKey: "dgym_checkout_attempt_v2", holdStorageKey: "dgym_checkout_hold_v2",
    checkoutHandoffPrefix: "dgym_checkout_handoff_v1:", checkoutHandoffTtlMilliseconds: 10 * 60 * 1000,
    durationInputs: [1,3,6,12].map(value => ({ value: String(value), checked: value === 1 })),
    modeInputs: ["automatic", "prepaid"].map(value => ({ value, checked: false })),
    providerInputs: ["mercadopago", "khipu"].map(value => ({ value, checked: value === "mercadopago", disabled: false })),
    providerGroup: node("provider-group"),
    form: node("enrollment-form"), submitButton: node("submit-button"), dialog: node("checkout-dialog"),
    document: { getElementById: node, referrer: "https://demogym.example/" },
    window: {
      location, TextEncoder,
      crypto: { subtle: webcrypto.subtle, randomUUID() {
        uuidCount++;
        return uuidCount === 1
          ? "ab111111-1111-4111-8111-111111111111"
          : "ab222222-2222-4222-8222-222222222222";
      } },
      sessionStorage: {
        getItem(key) { return storage.get(key) || null; },
        setItem(key, value) { if (storageFails) throw new Error("storage blocked"); storage.set(key, value); },
        removeItem(key) { storage.delete(key); },
      },
      setTimeout(callback, ms) { const id = ++timerId; timers.set(id, { callback, ms }); return id; },
      clearTimeout(id) { timers.delete(id); },
      addEventListener(name, callback) { listeners.set(name, callback); },
    },
    fetch(url, options) { const response = deferred(); calls.push({ url, options, ...response }); return response.promise; },
    applyDurationMode() { throw new Error("Explicit selection must not change during recovery"); },
  };
  vm.createContext(ctx);
  for (const expression of [
    /      var plans = \{[^]*?\n      \};/,
    /      var paymentModeContract = \{[^]*?\n      \};/,
    ...["availabilitySchemaVersion", "pricingVersion", "consentTextVersion"].map(name => new RegExp("      var " + name + " = [^;]+;")),
  ]) vm.runInContext(script.match(expression)[0], ctx);
  for (const name of ["currency", "hasPlan", "offerKey", "offerFor", "getOffer", "matriculaWaived", "selectionAvailable", "firstAvailableSelection",
    "khipuAvailableFor", "selectedProvider", "syncProviderOptions", "checkoutReadiness", "syncOptionAvailability", "syncCheckoutReadiness", "isRecord", "normalizedDurations", "availabilityOfferMatches",
    "parseCheckoutAvailability", "loadCheckoutAvailability", "setSubmitting", "restoreCheckoutAfterBack", "normalizePhone", "readAttribution",
    "createPayload", "createIdempotencyKey", "payloadFingerprint", "validStoredAttempt", "storedCheckoutAttempt", "idempotencyKeyFor",
    "persistSessionRecord", "existingIdempotencyKeyFor", "clearCheckoutHold", "holdCompletedEnrollment", "startNewEnrollment", "validateConsent",
    "trustedMercadoPagoDestination", "trustedCheckoutUrl", "checkoutHandoffKey", "persistMercadoPagoHandoff",
    "validCheckoutResponse", "requestCheckout", "continueCheckout",
    "ambiguousCheckoutFailure", "resetCheckoutAttempt", "safeErrorMessage", "showCheckoutError"]) vm.runInContext(actualFunction(name), ctx);
  const retryListener = script.match(/      document\.getElementById\("retry-availability"\)\.addEventListener\("click", function \(\) \{[^]*?\n      \}\);/);
  assert.ok(retryListener, "retry listener is actually installed");
  vm.runInContext(retryListener[0], ctx);
  vm.runInContext(script.match(/      window\.addEventListener\("pageshow", restoreCheckoutAfterBack\);/)[0], ctx);
  node("necessary-consent").checked = true;
  node("full-name").value = "Persona de prueba";
  node("phone").value = "+56912345678";
  node("email").value = "QA@example.test";
  function fixture() {
    const offers = [];
    for (const plan of ["inicio", "pro"]) for (const duration of [1,3,6,12]) {
      for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) {
        const offer = ctx.offerFor(plan, mode, duration);
        offers.push({ plan_id: plan, plan_name: offer.planName, payment_mode: mode, duration_months: duration,
          checkout_type: offer.checkoutType, regular_monthly_amount: offer.regularMonthly, installment_amount: offer.installmentAmount,
          regular_total_amount: offer.regularTotal, plan_amount: offer.planAmount, enrollment_fee_amount: offer.enrollmentFeeAmount,
          total_amount: offer.total, charge_amount: offer.chargeAmount, charge_count: offer.chargeCount, discount_percent: offer.discount,
          savings_amount: offer.savings, today_amount: offer.today, currency: offer.currency });
      }
    }
    return { schema_version: ctx.availabilitySchemaVersion, pricing_version: ctx.pricingVersion, consent_text_version: ctx.consentTextVersion,
      checkout_enabled: true, preflight: { ready: true, status: "ready" },
      payment_options: { automatic: { checkout_type: "subscription", durations: [3,6,12] }, single: { checkout_type: "preference", durations: [1] }, prepaid: { checkout_type: "preference", durations: [3,6,12] } }, offers };
  }
  const success = (call, value = fixture()) => call.resolve({ ok: true, json: () => Promise.resolve(value) });
  async function expireDeadline() {
    const entry = [...timers.entries()].find(([, timer]) => timer.ms === 10000);
    assert.ok(entry, "availability deadline is armed at 10 seconds");
    timers.delete(entry[0]); entry[1].callback(); await settle();
  }
  return { ctx, node, calls, timers, storage, listeners, fixture, success, expireDeadline, get uuidCount() { return uuidCount; } };
}
let count = 0;
async function check(name, work) { await work(); count++; console.log("PASS " + name); }
(async () => {
  await check("Timeout closes availability with an accessible manual retry, with and without AbortController", async () => {
    for (const withAbort of [true, false]) {
      const h = harness(withAbort), attempt = h.ctx.loadCheckoutAvailability();
      assert.equal(h.ctx.checkoutReadiness().code, "availability_pending");
      assert.equal(h.node("submit-button").disabled, true);
      await settle();
      assert.equal(h.calls.length, 1); assert.equal(h.calls[0].options.method, "GET");
      await h.expireDeadline(); await attempt;
      assert.equal(h.ctx.checkoutReadiness().code, "availability_unavailable");
      assert.equal(h.node("retry-availability").hidden, false);
      assert.equal(h.node("retry-availability").disabled, false);
      assert.equal(h.node("submit-button").disabled, true);
      assert.equal(h.timers.size, 0);
      if (withAbort) assert.equal(h.calls[0].options.signal.aborted, true);
      assert.equal(h.calls.length, 1, "no automatic retry or checkout POST");
    }
    assert.match(html, /id="retry-availability" type="button" aria-describedby="availability-copy"/);
    assert.match(html, /id="availability-copy" role="status" aria-live="polite"/);
  });
  await check("Network, HTTP, invalid JSON and invalid catalog failures all stay closed and can be retried", async () => {
    for (const failure of [call => call.reject(new Error("offline")), call => call.resolve({ ok: false }),
      call => call.resolve({ ok: true, json() { return Promise.reject(new Error("invalid json")); } }),
      call => call.resolve({ ok: true, json() { return Promise.resolve({}); } })]) {
      const h = harness(), attempt = h.ctx.loadCheckoutAvailability(); await settle(); failure(h.calls[0]); await attempt;
      assert.equal(h.ctx.checkoutAvailability.enabled, false);
      assert.equal(h.node("retry-availability").hidden, false);
      assert.equal(h.node("submit-button").disabled, true); assert.equal(h.timers.size, 0);
    }
  });
  await check("Deadline also ends a stalled JSON body and late success cannot reopen checkout", async () => {
    const h = harness(), body = deferred(), attempt = h.ctx.loadCheckoutAvailability(); await settle();
    h.calls[0].resolve({ ok: true, json: () => body.promise }); await settle();
    await h.expireDeadline(); await attempt;
    body.resolve(h.fixture()); await settle();
    assert.equal(h.ctx.checkoutAvailability.requestFailed, true);
    assert.equal(h.node("submit-button").disabled, true);
  });
  await check("Manual retry revalidates once without changing entered data, plan or idempotency key", async () => {
    const h = harness(), initialPayload = plain(h.ctx.createPayload());
    const key = await h.ctx.idempotencyKeyFor(initialPayload);
    const attempt = h.ctx.loadCheckoutAvailability(); await settle(); h.calls[0].reject(new Error("offline")); await attempt;
    h.node("retry-availability").listeners.click(); h.node("retry-availability").listeners.click(); await settle();
    assert.equal(h.calls.length, 2, "repeat clicks do not start parallel requests");
    assert.equal(h.node("submit-button").disabled, true);
    h.success(h.calls[1]); await settle();
    assert.equal(h.ctx.checkoutReadiness().ready, true);
    assert.equal(h.node("retry-availability").hidden, true);
    assert.deepEqual(plain(h.ctx.createPayload()), initialPayload);
    assert.equal(await h.ctx.idempotencyKeyFor(h.ctx.createPayload()), key);
    assert.equal(h.uuidCount, 1); assert.ok(h.calls.every(call => call.options.method === "GET"));
  });
  await check("Superseded responses never overwrite the latest availability result", async () => {
    for (const newerSucceeds of [true, false]) {
      const h = harness(), old = h.ctx.loadCheckoutAvailability(); await settle();
      const latest = h.ctx.loadCheckoutAvailability(); await settle();
      assert.equal(h.calls[0].options.signal.aborted, true);
      if (newerSucceeds) h.success(h.calls[1]); else h.calls[1].reject(new Error("offline"));
      await latest;
      if (newerSucceeds) h.calls[0].reject(new Error("late rejection")); else h.success(h.calls[0]);
      await old;
      assert.equal(h.ctx.checkoutReadiness().ready, newerSucceeds);
      assert.equal(h.node("submit-button").disabled, !newerSucceeds);
      assert.equal(h.timers.size, 0);
    }
  });
  await check("Checkout fails closed before POST when session safety state cannot be persisted", async () => {
    const h = harness(true, true); h.ctx.checkoutAvailability = h.ctx.parseCheckoutAvailability(h.fixture());
    h.ctx.continueCheckout(h.ctx.createPayload(), false);
    await until(() => h.ctx.dialog.open);
    assert.equal(h.calls.length, 0, "no checkout request is sent without durable request idempotency");
    assert.match(h.node("dialog-message").textContent, /no pudo guardar la protección del intento/i);
    assert.equal(h.ctx.checkoutHold.blocked, false);
    assert.equal(h.ctx.isSubmitting, false);
  });
  await check("Ambiguous POST results retain the same key and reconcile that exact request", async () => {
    const failures = [
      call => call.reject(new Error("network timeout")),
      call => call.resolve({ ok: false, status: 502, text: () => Promise.resolve("upstream failure") }),
      call => call.resolve({ ok: true, status: 200, text: () => Promise.resolve("{not-json") }),
    ];
    for (const fail of failures) {
      const h = harness(); h.ctx.checkoutAvailability = h.ctx.parseCheckoutAvailability(h.fixture());
      const payload = plain(h.ctx.createPayload());
      h.ctx.continueCheckout(payload, false);
      await until(() => h.calls.length === 1);
      const originalKey = h.calls[0].options.headers["X-Idempotency-Key"];
      fail(h.calls[0]);
      await until(() => h.ctx.checkoutHold.blocked);
      assert.equal(h.ctx.checkoutAttempt.key, originalKey);
      assert.equal(JSON.parse(h.storage.get("dgym_checkout_attempt_v2")).key, originalKey);
      assert.equal(h.ctx.checkoutHold.blocked, true);
      assert.equal(h.ctx.checkoutHold.reconcileAllowed, true);
      const reconcile = h.ctx.requestCheckout(payload, true);
      await until(() => h.calls.length === 2);
      assert.equal(h.calls[1].options.headers["X-Idempotency-Key"], originalKey);
      h.calls[1].resolve({ ok: true, status: 200, text: () => Promise.resolve("{}") });
      await reconcile;
    }
  });
  await check("BFCache return restores controls and a deliberate new enrollment receives a new key", async () => {
    const h = harness(); h.ctx.checkoutAvailability = h.ctx.parseCheckoutAvailability(h.fixture());
    const payload = plain(h.ctx.createPayload());
    h.ctx.continueCheckout(payload, false);
    await until(() => h.calls.length === 1);
    assert.equal(h.calls[0].options.method, "POST");
    const originalKey = h.calls[0].options.headers["X-Idempotency-Key"];
    h.calls[0].resolve({ ok: true, text: () => Promise.resolve(JSON.stringify({ next_action: "mercado_pago", checkout_type: "preference",
      payment_mode: "single", enrollment_id: "ab111111-1111-4111-8111-111111111111", reference: "DGYM-20260923-" + "A".repeat(32),
      checkout_url: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=offline-test" })) });
    await until(() => h.ctx.window.location.assigned !== null);
    const acceptedReference = "DGYM-20260923-" + "A".repeat(32);
    assert.equal(h.ctx.window.location.assigned, "retorno.php?ref=" + encodeURIComponent(acceptedReference) + "&continue=1");
    const handoff = JSON.parse(h.storage.get("dgym_checkout_handoff_v1:" + acceptedReference));
    assert.equal(handoff.status, "ready");
    assert.equal(handoff.provider, "mercado_pago");
    assert.equal(handoff.checkoutUrl, "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=offline-test");
    assert.equal(handoff.expiresAt - handoff.createdAt, 10 * 60 * 1000);
    assert.equal(h.ctx.isSubmitting, true, "navigation was in progress");
    assert.deepEqual(plain(h.ctx.checkoutAttempt), { fingerprintHash: null, key: null });
    assert.equal(h.storage.has("dgym_checkout_attempt_v2"), false, "accepted checkout consumes the request key");
    assert.deepEqual(plain(h.ctx.checkoutHold), {
      blocked: true,
      reference: "DGYM-20260923-" + "A".repeat(32),
      reconcileAllowed: false,
      completed: true,
    }, "the accepted enrollment stays held until the person explicitly starts another one");
    assert.equal(JSON.parse(h.storage.get("dgym_checkout_hold_v2")).completed, true);
    h.listeners.get("pageshow")({ persisted: false }); assert.equal(h.calls.length, 1, "normal pageshow does not repeat initialization");
    h.listeners.get("pageshow")({ persisted: true });
    assert.equal(h.ctx.isSubmitting, false);
    assert.equal(h.ctx.form.attributes["aria-busy"], "false");
    assert.equal(h.node("full-name").disabled, false);
    assert.equal(h.node("submit-button").disabled, true, "stale availability never enables checkout on return");
    await settle(); assert.equal(h.calls.length, 2); assert.equal(h.calls[1].options.method, "GET");
    h.success(h.calls[1]); await settle();
    assert.equal(h.node("submit-button").disabled, true, "fresh availability does not silently create another enrollment");
    assert.equal(h.node("start-new-enrollment-inline").hidden, false);
    assert.equal(h.uuidCount, 1, "returning from checkout does not allocate a new request key");
    assert.deepEqual(plain(h.ctx.createPayload()), payload);

    h.ctx.startNewEnrollment();
    assert.deepEqual(plain(h.ctx.checkoutHold), { blocked: false, reference: null, reconcileAllowed: false, completed: false });
    assert.equal(h.storage.has("dgym_checkout_hold_v2"), false);
    assert.equal(h.node("necessary-consent").checked, false, "a second contract requires renewed consent");
    assert.equal(h.node("necessary-consent").focused, true);
    assert.equal(h.node("submit-button").disabled, true);
    h.node("necessary-consent").checked = true;
    h.ctx.validateConsent();
    h.ctx.syncCheckoutReadiness();
    assert.equal(h.node("submit-button").disabled, false);
    const secondKey = await h.ctx.idempotencyKeyFor(h.ctx.createPayload());
    assert.notEqual(secondKey, originalKey); assert.equal(h.uuidCount, 2);
    assert.equal(h.calls.filter(call => call.options.method === "POST").length, 1, "return never creates a second payment");
    const deliberateRetry = h.ctx.requestCheckout(h.ctx.createPayload(), false);
    await until(() => h.calls.length === 3);
    assert.equal(h.calls[2].options.headers["X-Idempotency-Key"], secondKey, "an explicit new enrollment uses a new key");
    h.calls[2].resolve({ ok: true, text: () => Promise.resolve("{}") }); await deliberateRetry;
  });
  await check("BFCache and retry never clear a duplicate-payment safety hold", async () => {
    const h = harness(); h.ctx.checkoutHold = { blocked: true, reference: null, reconcileAllowed: true, completed: false }; h.ctx.isSubmitting = true;
    h.listeners.get("pageshow")({ persisted: true }); await settle(); h.success(h.calls[0]); await settle();
    assert.equal(h.ctx.checkoutReadiness().code, "checkout_held");
    assert.equal(h.node("submit-button").disabled, true); assert.equal(h.ctx.checkoutHold.blocked, true);
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0].options.method, "GET");
  });
  await check("A handoff storage failure preserves the accepted enrollment state", async () => {
    const h = harness();
    const reference = "DGYM-20261006-" + "D".repeat(32);
    h.ctx.checkoutHold = { blocked: true, reference, reconcileAllowed: false, completed: true };
    h.ctx.showCheckoutError({ code: "checkout_handoff_storage_unavailable", retryMode: "status_only", reference });
    assert.equal(h.ctx.checkoutHold.completed, true);
    assert.equal(JSON.parse(h.storage.get("dgym_checkout_hold_v2")).completed, true);
    assert.equal(h.node("check-status-link").href, "retorno.php?ref=" + encodeURIComponent(reference));
    assert.match(h.node("dialog-message").textContent, /no pudo preparar el enlace seguro/i);
  });
  await check("A completed enrollment offers an explicit independent enrollment action", async () => {
    assert.match(html, /id="start-new-enrollment" type="button" hidden>Realizar otra inscripción<\/button>/);
    assert.match(html, /id="start-new-enrollment-inline" type="button" hidden>Realizar otra inscripción<\/button>/);
    assert.match(html, /newEnrollmentButton\.hidden = !statusOnly;/);
    assert.match(html, /holdCompletedEnrollment\(result\.reference\);[\s\S]*?if \(result\.next_action === "khipu"\) \{\s*window\.location\.assign\(result\.checkout_url\);\s*resetCheckoutAttempt\(\);\s*return;\s*\}[\s\S]*?persistMercadoPagoHandoff\(result\.reference, result\.checkout_url\);[\s\S]*?window\.location\.assign\("retorno\.php\?ref=" \+ encodeURIComponent\(result\.reference\) \+ "&continue=1"\);/);
    assert.match(html, /function startNewEnrollment\(\) \{[\s\S]*?clearCheckoutHold\(\);[\s\S]*?resetCheckoutAttempt\(\);[\s\S]*?necessaryConsent\.checked = false;/);
    assert.match(html, /start-new-enrollment"\)\.addEventListener\("click", startNewEnrollment\);/);
    assert.match(html, /start-new-enrollment-inline"\)\.addEventListener\("click", startNewEnrollment\);/);
  });
  await check("Khipu transfer is offered only when the backend enables it, and never changes a Mercado Pago request", async () => {
    const uuidV4 = "ab111111-1111-4111-8111-111111111111", ref = "DGYM-20261006-0123456789ABCDEF0123456789ABCDEF";
    const withKhipu = modes => h => Object.assign(h.fixture(), { payment_providers: {
      mercadopago: { enabled: true, payment_modes: ["automatic", "single", "prepaid"] }, khipu: { enabled: true, payment_modes: modes } } });
    // Sin el campo (backend anterior) o con una forma inesperada, no existe la opción.
    for (const providers of [undefined, null, { khipu: { enabled: "true", payment_modes: ["single"] } }, { khipu: { enabled: true, payment_modes: "single" } }]) {
      const h = harness(), value = h.fixture();
      if (providers !== undefined) value.payment_providers = providers;
      h.ctx.checkoutAvailability = h.ctx.parseCheckoutAvailability(value); h.ctx.state.provider = "khipu"; h.ctx.syncCheckoutReadiness();
      assert.equal(h.node("provider-group").hidden, true);
      assert.equal(h.ctx.selectedProvider(), "mercadopago");
      assert.equal("payment_provider" in plain(h.ctx.createPayload()).selection, false);
    }
    const h = harness(), mercadoPagoPayload = plain(h.ctx.createPayload());
    h.ctx.checkoutAvailability = h.ctx.parseCheckoutAvailability(withKhipu(["single", "prepaid", "automatic"])(h));
    assert.deepEqual(plain(h.ctx.checkoutAvailability.khipuModes), ["single", "prepaid"], "automatic is never a transfer mode");
    h.ctx.syncCheckoutReadiness();
    assert.equal(h.node("provider-group").hidden, false);
    assert.deepEqual(plain(h.ctx.createPayload()), mercadoPagoPayload, "default stays Mercado Pago with an identical payload");
    assert.equal(h.node("submit-button").textContent, "Pagar $34.990 hoy en Mercado Pago");
    h.ctx.state.provider = "khipu"; h.ctx.syncCheckoutReadiness();
    const khipuPayload = plain(h.ctx.createPayload());
    assert.equal(khipuPayload.selection.payment_provider, "khipu");
    assert.equal(h.node("submit-button").textContent, "Pagar $34.990 hoy por transferencia");
    assert.match(h.node("secure-copy-text").textContent, /Khipu/);
    assert.notEqual(await h.ctx.payloadFingerprint(khipuPayload), await h.ctx.payloadFingerprint(mercadoPagoPayload), "each provider gets its own idempotency key");
    const offer = h.ctx.offerFor("inicio", "single", 1);
    const ok = { next_action: "khipu", checkout_type: "khipu_transfer", payment_mode: "single", enrollment_id: uuidV4, reference: ref,
      checkout_url: "https://khipu.com/payment/info/v67prof2ugg3" };
    assert.equal(Boolean(h.ctx.validCheckoutResponse(ok, offer, "khipu")), true);
    assert.equal(Boolean(h.ctx.validCheckoutResponse(ok, offer, undefined)), false, "a Khipu answer is never accepted for a card request");
    for (const change of [{ checkout_url: "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1" }, { checkout_url: "https://khipu.com.evil.example/x" },
      { checkout_url: "https://user@khipu.com/x" }, { checkout_url: "http://khipu.com/x" }, { next_action: "mercado_pago" }, { checkout_type: "preference" }]) {
      assert.equal(Boolean(h.ctx.validCheckoutResponse(Object.assign({}, ok, change), offer, "khipu")), false, JSON.stringify(change));
    }
    // Con cargo automático la transferencia desaparece y la elección vuelve a tarjeta.
    h.ctx.state.duration = 12; h.ctx.state.mode = "automatic"; h.ctx.syncCheckoutReadiness();
    assert.equal(h.node("provider-group").hidden, true); assert.equal(h.ctx.selectedProvider(), "mercadopago");
    assert.equal("payment_provider" in plain(h.ctx.createPayload()).selection, false);
    assert.equal(h.node("submit-button").textContent, "Pagar $31.990 hoy y activar 11 cargos de $16.990");
    // Recargar la disponibilidad no altera la solicitud Khipu que "Comprobar mi intento" debe repetir.
    h.ctx.state.duration = 1; h.ctx.state.mode = "single"; h.ctx.syncCheckoutReadiness();
    assert.deepEqual(plain(h.ctx.createPayload()), khipuPayload, "the transfer preference returns with a single payment");
    const reload = h.ctx.loadCheckoutAvailability(); await settle();
    assert.equal("payment_provider" in plain(h.ctx.createPayload()).selection, false, "never sent while availability is unknown");
    h.success(h.calls[h.calls.length - 1], withKhipu(["single", "prepaid"])(h)); await reload;
    assert.deepEqual(plain(h.ctx.createPayload()), khipuPayload);
    assert.match(html, /provider: selectedProvider\(\)/, "an uncertain attempt remembers its provider");
    assert.match(html, /if \(storedHold\.provider === "khipu"\) state\.provider = "khipu";/);
    // Si el backend solo habilita prepago, un mes sigue solo con tarjeta.
    const partial = harness(); partial.ctx.checkoutAvailability = partial.ctx.parseCheckoutAvailability(withKhipu(["prepaid"])(partial));
    partial.ctx.state.provider = "khipu"; partial.ctx.syncCheckoutReadiness();
    assert.equal(partial.node("provider-group").hidden, true);
    assert.match(html, /id="provider-group" hidden>/, "the chooser is hidden until availability enables it");
  });
  await check("Keyboard focus remains visible independently of the checked-radio box shadow", async () => {
    assert.match(html, /\.option-choice input:focus-visible \+ \.option-body \{[^}]*outline: 3px solid var\(--accent-strong\);[^}]*outline-offset: 2px;/);
  });
  console.log(`${count} offline recovery groups passed; no network calls or real payment attempts.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
