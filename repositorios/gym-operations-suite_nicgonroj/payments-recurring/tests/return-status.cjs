"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../public/assets/return-status.js"), "utf8");
const returnPageSource = fs.readFileSync(path.resolve(__dirname, "../public/retorno.php"), "utf8");
const reference = "DGYM-20261005-B34EFAB44DDC3247AE971B0AFC30C6E4";
const uuid = "dbe45bb8-8954-4d94-853d-fb571798dbf1";
const uuid2 = "7c78f029-67ca-4fd4-b157-3b9ea330ff42";
const handoffKey = "dgym_checkout_handoff_v1:" + reference;
const fixedNow = 1791320400000;

function readyHandoff(checkoutUrl, overrides = {}) {
  return {
    version: 1,
    status: "ready",
    reference,
    provider: "mercado_pago",
    checkoutUrl,
    createdAt: fixedNow,
    expiresAt: fixedNow + 10 * 60 * 1000,
    ...overrides,
  };
}

function node(hidden = false) {
  return {
    textContent: "",
    disabled: false,
    hidden,
    href: "",
    attributes: {},
    listeners: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; if (name === "href") this.href = ""; },
    addEventListener(name, listener) { this.listeners[name] = listener; },
  };
}

function response(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json() { return Promise.resolve(data); },
  };
}

async function flush(rounds = 24) {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

async function harness(statusData, postResponses = [], options = {}) {
  const root = node();
  root.getAttribute = name => name === "data-reference"
    ? reference
    : name === "data-auto-continue"
      ? (options.autoContinue ? "true" : "false")
      : null;
  const nodes = {
    "status-indicator": node(),
    "status-title": node(),
    "status-message": node(),
    "retry-payment": node(true),
    "restart-payment": node(true),
    "retry-status": node(),
    "copy-reference": node(),
  };
  const calls = [];
  const navigations = [];
  const openings = [];
  const windowListeners = new Map();
  const documentListeners = new Map();
  const storage = options.storage || new Map();
  let postIndex = 0;
  let getIndex = 0;
  let uuidIndex = 0;
  const now = Number.isFinite(options.now) ? options.now : 1791320400000;
  class TestDate extends Date { static now() { return now; } }
  const context = {
    URL, Date: TestDate,
    Uint8Array,
    encodeURIComponent,
    document: {
      visibilityState: "visible",
      querySelector(selector) { return selector === "[data-reference]" ? root : null; },
      getElementById(id) { return nodes[id]; },
      addEventListener(name, listener) { documentListeners.set(name, listener); },
    },
    fetch(url, options) {
      calls.push({ url, options });
      if (!options || options.method !== "POST") {
        const states = Array.isArray(statusData) ? statusData : [statusData];
        const state = states[Math.min(getIndex, states.length - 1)];
        getIndex += 1;
        return Promise.resolve(response(200, state));
      }
      const configured = postResponses[postIndex++];
      if (typeof configured === "function") return configured({ url, options });
      return Promise.resolve(configured || response(503, { error: { code: "service_unavailable" } }));
    },
    window: {
      AbortController,
      crypto: { randomUUID() { return [uuid, uuid2][Math.min(uuidIndex++, 1)]; } },
      sessionStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) {
          if (options.storageSetFails || (options.handoffStorageSetFails && key === handoffKey)) {
            throw new Error("storage unavailable");
          }
          storage.set(key, value);
        },
        removeItem(key) { storage.delete(key); },
      },
      navigator: {
        clipboard: {
          writeText(value) {
            if (options.clipboardFails) return Promise.reject(new Error("clipboard unavailable"));
            context.copiedReference = value;
            return Promise.resolve();
          },
        },
      },
      location: { assign(url) {
        if (options.navigationFails) throw new Error("navigation unavailable");
        navigations.push(url);
      } },
      open(url, target, features) {
        if (options.popupBlocked) return null;
        const opened = { initialUrl: url, target, features, url: null, closed: false, opener: context.window };
        opened.location = { replace(nextUrl) { opened.url = nextUrl; } };
        opened.close = function () { opened.closed = true; };
        openings.push(opened);
        return opened;
      },
      addEventListener(name, listener) { windowListeners.set(name, listener); },
      clearTimeout() {},
      setTimeout() { return 1; },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  await flush();
  return { root, nodes, calls, navigations, openings, storage, context, windowListeners, documentListeners };
}

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

test("un checkout pendiente continúa por el enlace verificado", async () => {
  const url = "https://www.mercadopago.cl/subscriptions/checkout/existing";
  const h = await harness({
    state: "checkout_pending",
    message: "Completa el proceso en Mercado Pago.",
    payment_confirmed: false,
    recovery_action: "resume_checkout",
    retry_checkout_url: url,
  });
  assert.equal(h.nodes["retry-payment"].hidden, false);
  assert.equal(h.nodes["retry-payment"].href, url);
  assert.equal(h.nodes["retry-payment"].textContent, "Continuar a Mercado Pago");
  assert.equal(h.nodes["restart-payment"].hidden, true);
  assert.equal(h.nodes["retry-status"].hidden, true);
  assert.match(h.nodes["status-indicator"].textContent, /Continúa con el pago seguro/);
});

test("handoff inicial válido redirige automáticamente en la misma pestaña y se consume una sola vez", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/from-form";
  const storage = new Map([[handoffKey, JSON.stringify(readyHandoff(checkoutUrl))]]);
  const h = await harness({
    state: "payment_pending",
    message: "Inscripción guardada.",
    payment_confirmed: false,
    recovery_action: "probe_payment",
  }, [], { storage, now: fixedNow, autoContinue: true });
  assert.deepEqual(h.navigations, [checkoutUrl]);
  assert.equal(h.openings.length, 0);
  assert.equal(h.nodes["status-title"].textContent, "Te llevamos a Mercado Pago");
  assert.equal(h.nodes["status-message"].textContent, "Tus datos fueron recibidos. Tu inscripción se completará cuando Mercado Pago confirme el pago.");
  assert.equal(h.nodes["status-indicator"].textContent, "Preparando pago seguro…");
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["retry-status"].hidden, true);
  const consumed = JSON.parse(storage.get(handoffKey));
  assert.equal(consumed.status, "opened");
  assert.equal(Object.hasOwn(consumed, "checkoutUrl"), false);
});

test("Khipu verifica y redirige directamente sin crear ni conservar handoff", async () => {
  const checkoutUrl = "https://app.khipu.com/payment/info/v67prof2ugg3";
  const otherReferenceHandoff = "dgym_checkout_handoff_v1:DGYM-20261006-" + "E".repeat(32);
  const staleHandoff = new Map([[handoffKey, JSON.stringify(readyHandoff(
    "https://www.mercadopago.cl/checkout/stale"
  ))], [otherReferenceHandoff, "unrelated"]]);
  const h = await harness({
    state: "checkout_pending",
    message: "Completa la transferencia en Khipu.",
    payment_confirmed: false,
    payment_provider: "khipu",
    recovery_action: "probe_payment",
  }, [response(200, { next_action: "khipu", checkout_url: checkoutUrl })], {
    storage: staleHandoff,
    now: fixedNow,
  });
  assert.equal(h.storage.has(handoffKey), false, "Khipu elimina cualquier handoff MP obsoleto");
  assert.equal(h.storage.get(otherReferenceHandoff), "unrelated", "no toca handoffs de otras referencias");
  assert.equal(h.nodes["restart-payment"].hidden, false);
  assert.equal(h.nodes["restart-payment"].textContent, "Verificar transferencia y continuar");
  h.nodes["restart-payment"].listeners.click();
  await flush(30);
  assert.deepEqual(h.navigations, [checkoutUrl]);
  assert.equal(h.openings.length, 0);
  assert.equal(h.storage.has(handoffKey), false);
});

test("Khipu ignora resume_checkout y exige el probe canónico", async () => {
  const checkoutUrl = "https://khipu.com/payment/info/direct-resume";
  const h = await harness({
    state: "checkout_pending",
    message: "Transferencia pendiente.",
    payment_confirmed: false,
    payment_provider: "khipu",
    recovery_action: "resume_checkout",
    retry_checkout_url: checkoutUrl,
  }, [], { now: fixedNow });
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["restart-payment"].hidden, true);
  assert.deepEqual(h.navigations, []);
  assert.equal(h.openings.length, 0);
  assert.equal(h.storage.has(handoffKey), false);
});

test("Khipu rechaza destinos inseguros y todo mismatch de proveedor", async () => {
  const pendingKhipu = {
    state: "checkout_pending",
    message: "Transferencia pendiente.",
    payment_confirmed: false,
    payment_provider: "khipu",
    recovery_action: "probe_payment",
  };
  for (const unsafe of [
    "http://khipu.com/payment/info/test",
    "https://user:pass@khipu.com/payment/info/test",
    "https://khipu.com:444/payment/info/test",
    "https://khipu.com.evil.example/payment/info/test",
    "https://www.mercadopago.cl/checkout/test",
  ]) {
    const blocked = await harness(pendingKhipu, [response(200, { next_action: "khipu", checkout_url: unsafe })]);
    blocked.nodes["restart-payment"].listeners.click();
    await flush(30);
    assert.deepEqual(blocked.navigations, [], unsafe);
    assert.equal(blocked.storage.has(handoffKey), false, unsafe);
  }

  const khipuToMp = await harness(pendingKhipu, [response(200, {
    next_action: "mercado_pago",
    checkout_url: "https://www.mercadopago.cl/checkout/mismatch",
  })]);
  khipuToMp.nodes["restart-payment"].listeners.click();
  await flush(30);
  assert.deepEqual(khipuToMp.navigations, []);
  assert.equal(khipuToMp.storage.has(handoffKey), false);

  const mpToKhipu = await harness({
    state: "checkout_pending",
    message: "Pago pendiente.",
    payment_confirmed: false,
    payment_provider: "mercadopago",
    recovery_action: "probe_payment",
  }, [response(200, {
    next_action: "khipu",
    checkout_url: "https://khipu.com/payment/info/mismatch",
  })]);
  mpToKhipu.nodes["restart-payment"].listeners.click();
  await flush(30);
  assert.deepEqual(mpToKhipu.navigations, []);
  assert.equal(mpToKhipu.storage.has(handoffKey), false);

  for (const invalidProvider of ["otro_proveedor", 7, { name: "khipu" }]) {
    const unknownProvider = await harness({
      state: "checkout_pending",
      message: "Pago pendiente.",
      payment_confirmed: false,
      payment_provider: invalidProvider,
      recovery_action: "probe_payment",
    });
    assert.equal(unknownProvider.nodes["retry-payment"].hidden, true);
    assert.equal(unknownProvider.nodes["restart-payment"].hidden, true);
    assert.match(unknownProvider.nodes["status-indicator"].textContent, /contacta al gimnasio/);
  }

  const invalidKhipuRestart = await harness({
    state: "payment_rejected",
    message: "Transferencia rechazada.",
    payment_confirmed: false,
    payment_provider: "khipu",
    recovery_action: "restart_payment",
  });
  assert.equal(invalidKhipuRestart.nodes["retry-payment"].hidden, true);
  assert.equal(invalidKhipuRestart.nodes["restart-payment"].hidden, true);
});

test("Khipu vencido deriva a soporte y una transferencia recibida no abre pago", async () => {
  const expired = await harness({
    state: "payment_rejected",
    message: "El enlace de pago venció sin registrar una transferencia.",
    payment_confirmed: false,
    payment_provider: "khipu",
    recovery_action: "none",
  });
  assert.equal(expired.nodes["restart-payment"].hidden, true);
  assert.match(expired.nodes["status-indicator"].textContent, /contacta al gimnasio/);

  const received = await harness([
    { state: "checkout_pending", message: "Completa la transferencia.", payment_confirmed: false, payment_provider: "khipu", recovery_action: "probe_payment" },
    { state: "payment_confirmed", message: "Transferencia confirmada.", payment_confirmed: true, payment_provider: "khipu", recovery_action: "none" },
  ], [response(409, { error: { code: "payment_already_received", retry_mode: "status_only" } })]);
  received.nodes["restart-payment"].listeners.click();
  await flush(40);
  assert.deepEqual(received.navigations, []);
  assert.equal(received.nodes["status-title"].textContent, "Pago recibido; activación pendiente");
});

test("si falla la navegación automática conserva el handoff y muestra un único botón", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/popup-test";
  const storage = new Map([[handoffKey, JSON.stringify(readyHandoff(checkoutUrl))]]);
  const h = await harness({
    state: "checkout_pending",
    message: "Inscripción guardada.",
    payment_confirmed: false,
    recovery_action: "probe_payment",
  }, [], { storage, now: fixedNow, autoContinue: true, navigationFails: true });
  assert.equal(h.nodes["retry-payment"].textContent, "Continuar a Mercado Pago");
  assert.equal(JSON.parse(storage.get(handoffKey)).status, "ready");
  assert.equal(h.nodes["retry-payment"].hidden, false);
  assert.equal(h.nodes["retry-payment"].href, checkoutUrl);
  assert.equal(h.nodes["retry-status"].hidden, true);
  assert.match(h.nodes["status-indicator"].textContent, /No pudimos abrir Mercado Pago automáticamente/);
});

test("fallo de storage al consumir no abre Mercado Pago ni expone otra inscripción", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/consume-storage";
  const storage = new Map([[handoffKey, JSON.stringify(readyHandoff(checkoutUrl))]]);
  const h = await harness({
    state: "payment_pending",
    message: "Inscripción guardada.",
    payment_confirmed: false,
    recovery_action: "probe_payment",
  }, [], { storage, now: fixedNow, handoffStorageSetFails: true, autoContinue: true });
  assert.equal(h.openings.length, 0);
  assert.deepEqual(h.navigations, []);
  assert.equal(JSON.parse(storage.get(handoffKey)).status, "ready");
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["retry-status"].hidden, false);
});

test("fallo de storage al preparar handoff MP no expone URL ni navega", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/persist-storage";
  const h = await harness({
    state: "payment_pending",
    message: "Pago pendiente.",
    payment_confirmed: false,
    recovery_action: "probe_payment",
  }, [response(200, { next_action: "mercado_pago", checkout_url: checkoutUrl })], {
    now: fixedNow,
    handoffStorageSetFails: true,
  });
  h.nodes["restart-payment"].listeners.click();
  await flush(30);
  assert.deepEqual(h.navigations, []);
  assert.equal(h.openings.length, 0);
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["retry-payment"].href, "");
  assert.equal(h.storage.has(handoffKey), false);
  assert.match(h.nodes["status-indicator"].textContent, /no pudo guardar el enlace seguro/);
});

test("handoff abierto o inválido nunca vuelve a exponer init_point y cae al probe existente", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/sensitive";
  const invalidRecords = [
    "{invalid-json",
    JSON.stringify(readyHandoff(checkoutUrl, { reference: "DGYM-20261005-" + "A".repeat(32) })),
    JSON.stringify(readyHandoff(checkoutUrl, { expiresAt: fixedNow - 1 })),
    JSON.stringify(readyHandoff(checkoutUrl, { expiresAt: fixedNow + 10 * 60 * 1000 + 1 })),
    JSON.stringify(readyHandoff(checkoutUrl, { createdAt: fixedNow + 60001, expiresAt: fixedNow + 120000 })),
    JSON.stringify(readyHandoff("http://mercadopago.cl/checkout")),
    JSON.stringify(readyHandoff("https://user:pass@mercadopago.cl/checkout")),
    JSON.stringify(readyHandoff("https://mercadopago.cl:444/checkout")),
    JSON.stringify(readyHandoff("https://mercadopago.cl.evil.example/checkout")),
    JSON.stringify(readyHandoff(checkoutUrl, { provider: "otro_proveedor" })),
  ];
  for (const stored of invalidRecords) {
    const storage = new Map([[handoffKey, stored]]);
    const h = await harness({
      state: "payment_pending",
      message: "Inscripción guardada.",
      payment_confirmed: false,
      recovery_action: "probe_payment",
    }, [], { storage, now: fixedNow });
    assert.equal(h.nodes["retry-payment"].hidden, true, stored);
    assert.equal(h.nodes["retry-payment"].href, "", stored);
    assert.equal(h.nodes["restart-payment"].hidden, false, stored);
    assert.equal(storage.has(handoffKey), false, stored);
  }

  const openedStorage = new Map([[handoffKey, JSON.stringify({
    version: 1, status: "opened", reference, provider: "mercado_pago",
    openedAt: fixedNow, expiresAt: fixedNow + 10 * 60 * 1000,
  })]]);
  const opened = await harness({
    state: "payment_pending",
    message: "Inscripción guardada.",
    payment_confirmed: false,
    recovery_action: "resume_checkout",
    retry_checkout_url: checkoutUrl,
  }, [], { storage: openedStorage, now: fixedNow });
  assert.equal(opened.nodes["retry-payment"].hidden, true);
  assert.equal(opened.nodes["restart-payment"].hidden, false);
  assert.equal(JSON.parse(openedStorage.get(handoffKey)).status, "opened");

  const expiredStorage = new Map([[handoffKey, JSON.stringify(readyHandoff(checkoutUrl, { expiresAt: fixedNow - 1 }))]]);
  const expired = await harness({
    state: "payment_pending",
    message: "Inscripción guardada.",
    payment_confirmed: false,
    recovery_action: "resume_checkout",
    retry_checkout_url: checkoutUrl,
  }, [], { storage: expiredStorage, now: fixedNow });
  assert.equal(expired.nodes["retry-payment"].hidden, true);
  assert.equal(expired.nodes["restart-payment"].hidden, false);
  assert.equal(expiredStorage.has(handoffKey), false);
});

test("acepta todos los dominios de Mercado Pago permitidos por el servidor", async () => {
  const hosts = [
    "mercadopago.cl", "mercadopago.com", "mercadopago.com.ar", "mercadopago.com.br",
    "mercadopago.com.mx", "mercadopago.com.co", "mercadopago.com.pe", "mercadopago.com.uy",
  ];
  for (const host of hosts) {
    const url = `https://www.${host}/checkout/recovery`;
    const h = await harness({
      state: "payment_pending",
      message: "Pago pendiente.",
      payment_confirmed: false,
      recovery_action: "resume_checkout",
      retry_checkout_url: url,
    });
    assert.equal(h.nodes["retry-payment"].href, url, host);
    assert.equal(h.nodes["retry-payment"].hidden, false, host);
  }
});

test("rechaza enlaces externos, credenciales embebidas y dominios parecidos", async () => {
  for (const url of [
    "https://example.com/phishing",
    "https://mercadopago.cl.example.com/phishing",
    "https://user:pass@mercadopago.cl/checkout",
    "https://mercadopago.cl:444/checkout",
    "http://mercadopago.cl/checkout",
  ]) {
    const h = await harness({
      state: "checkout_pending",
      message: "Pago pendiente.",
      payment_confirmed: false,
      recovery_action: "resume_checkout",
      retry_checkout_url: url,
    });
    assert.equal(h.nodes["retry-payment"].hidden, true, url);
    assert.equal(h.nodes["retry-payment"].href, "", url);
  }
});

test("un rechazo ofrece reiniciar y nunca reutiliza el enlace anterior", async () => {
  const h = await harness({
    state: "payment_rejected",
    message: "El pago no fue aprobado.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
    retry_checkout_url: "https://www.mercadopago.cl/subscriptions/checkout/old",
  });
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["retry-payment"].href, "");
  assert.equal(h.nodes["restart-payment"].hidden, false);
  assert.equal(h.nodes["restart-payment"].textContent, "Reintentar con el mismo u otro medio de pago");
  assert.match(h.nodes["status-indicator"].textContent, /misma inscripción/);
});

test("suscripción pendiente verifica en servidor y continúa en la misma pestaña", async () => {
  const checkoutUrl = "https://www.mercadopago.cl/subscriptions/checkout/verified";
  const h = await harness({
    state: "payment_pending",
    message: "Estamos confirmando el pago.",
    payment_confirmed: false,
    recovery_action: "probe_payment",
    retry_checkout_url: "https://www.mercadopago.cl/subscriptions/checkout/stored",
  }, [response(200, { next_action: "mercado_pago", checkout_url: checkoutUrl })]);
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["restart-payment"].hidden, false);
  assert.equal(h.nodes["restart-payment"].textContent, "Verificar pago y continuar");
  h.nodes["restart-payment"].listeners.click();
  await flush(30);
  assert.equal(h.calls.filter(call => call.options && call.options.method === "POST").length, 1);
  assert.deepEqual(h.navigations, [checkoutUrl]);
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.openings.length, 0);
});

test("el reinicio de tres fases conserva la clave hasta conciliar y redirige en la misma pestaña", async () => {
  const checkoutUrl = "https://www.mercadopago.com.ar/subscriptions/checkout/new";
  const h = await harness({
    state: "payment_rejected",
    message: "El pago no fue aprobado.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
    retry_checkout_url: null,
  }, [
    response(202, { next_action: "continue_retry" }),
    response(202, { next_action: "continue_retry" }),
    response(200, { next_action: "mercado_pago", checkout_url: checkoutUrl }),
  ]);
  h.nodes["restart-payment"].listeners.click();
  await flush(40);
  const posts = h.calls.filter(call => call.options && call.options.method === "POST");
  assert.equal(posts.length, 3);
  assert.equal(posts[0].url, "api/reintentar-pago.php");
  assert.equal(posts[0].options.credentials, "same-origin");
  assert.equal(posts[0].options.headers["X-Idempotency-Key"], uuid);
  assert.equal(posts[1].options.headers["X-Idempotency-Key"], uuid);
  assert.equal(posts[2].options.headers["X-Idempotency-Key"], uuid);
  assert.deepEqual(JSON.parse(posts[0].options.body), { reference });
  assert.equal(posts[1].options.body, posts[0].options.body);
  assert.equal(posts[2].options.body, posts[0].options.body);
  assert.deepEqual(h.navigations, [checkoutUrl]);
  assert.equal(h.openings.length, 0);
  assert.equal(h.storage.has("dgym-payment-retry:" + reference), false);
  assert.equal(JSON.parse(h.storage.get(handoffKey)).status, "opened");
});

test("retry_busy informa que la inscripción está ocupada y no redirige", async () => {
  const h = await harness({
    state: "payment_rejected",
    message: "El pago no fue aprobado.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
  }, [response(409, { error: { code: "retry_busy" } })]);
  h.nodes["restart-payment"].listeners.click();
  await flush();
  assert.deepEqual(h.navigations, []);
  assert.equal(h.nodes["restart-payment"].disabled, false);
  assert.match(h.nodes["status-indicator"].textContent, /en curso/);
});

test("ciclo terminado elimina la clave vieja y el siguiente clic usa una UUID nueva", async () => {
  const rejected = {
    state: "payment_rejected",
    message: "El pago no fue aprobado.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
  };
  const h = await harness([rejected, rejected], [
    response(409, { error: { code: "payment_retry_cycle_finished", retry_mode: "new_idempotency_key" } }),
    response(409, { error: { code: "retry_busy" } }),
  ]);
  h.nodes["restart-payment"].listeners.click();
  await flush(40);
  assert.equal(h.storage.has("dgym-payment-retry:" + reference), false);
  assert.equal(h.nodes["restart-payment"].hidden, false);
  h.nodes["restart-payment"].listeners.click();
  await flush(24);
  const posts = h.calls.filter(call => call.options && call.options.method === "POST");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].options.headers["X-Idempotency-Key"], uuid);
  assert.equal(posts[1].options.headers["X-Idempotency-Key"], uuid2);
});

test("pago hallado oculta el reintento y refresca a confirmación sin abrir otro cobro", async () => {
  const h = await harness([
    {
      state: "payment_rejected",
      message: "El pago no fue aprobado.",
      payment_confirmed: false,
      recovery_action: "restart_payment",
    },
    {
      state: "payment_pending",
      message: "Estamos confirmando el pago con Mercado Pago.",
      payment_confirmed: false,
      recovery_action: "none",
    },
  ], [response(409, { error: { code: "payment_already_received", retry_mode: "status_only" } })]);
  h.nodes["restart-payment"].listeners.click();
  await flush(40);
  assert.equal(h.nodes["restart-payment"].hidden, true);
  assert.equal(h.storage.has("dgym-payment-retry:" + reference), false);
  assert.match(h.nodes["status-indicator"].textContent, /No inicies otro cobro para esta inscripción/);
  assert.equal(h.calls.filter(call => !call.options || call.options.method !== "POST").length >= 2, true);
});

test("respuesta status_only limpia la clave, oculta la acción y refresca el estado", async () => {
  for (const errorCode of ["payment_retry_review_required", "payment_retry_not_allowed"]) {
    const h = await harness([
      {
        state: "payment_rejected",
        message: "El pago no fue aprobado.",
        payment_confirmed: false,
        recovery_action: "restart_payment",
      },
      {
        state: errorCode === "payment_retry_review_required" ? "manual_review" : "payment_pending",
        message: errorCode === "payment_retry_review_required"
          ? "La inscripción requiere revisión del gimnasio."
          : "Estamos confirmando el pago con Mercado Pago.",
        payment_confirmed: false,
        recovery_action: "none",
      },
    ], [response(409, { error: { code: errorCode, retry_mode: "status_only" } })]);
    h.nodes["restart-payment"].listeners.click();
    await flush(40);
    assert.equal(h.storage.has("dgym-payment-retry:" + reference), false, errorCode);
    assert.equal(h.nodes["restart-payment"].hidden, true, errorCode);
    assert.equal(h.calls.filter(call => !call.options || call.options.method !== "POST").length >= 2, true, errorCode);
  }
});

test("revisión manual ignora toda acción o URL de recuperación", async () => {
  const h = await harness({
    state: "manual_review",
    message: "Requiere revisión por devolución.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
    retry_checkout_url: "https://mercadopago.cl/checkout/should-not-open",
  });
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["restart-payment"].hidden, true);
  assert.match(h.nodes["status-indicator"].textContent, /revisar el caso/);
});

test("un pago confirmado prevalece sobre una acción de recuperación incoherente", async () => {
  const h = await harness({
    state: "payment_rejected",
    message: "Dato atrasado.",
    payment_confirmed: true,
    recovery_action: "restart_payment",
  });
  assert.equal(h.nodes["retry-payment"].hidden, true);
  assert.equal(h.nodes["restart-payment"].hidden, true);
  assert.match(h.nodes["status-indicator"].textContent, /fue confirmado para esta inscripción/);
  assert.doesNotMatch(h.nodes["status-indicator"].textContent, /otra inscripción/i);
});

test("estados terminales eliminan cualquier handoff pendiente", async () => {
  const cases = [
    { state: "payment_confirmed", payment_confirmed: true, recovery_action: "none" },
    { state: "payment_rejected", payment_confirmed: false, recovery_action: "restart_payment" },
    { state: "manual_review", payment_confirmed: false, recovery_action: "none" },
  ];
  for (const state of cases) {
    const storage = new Map([[handoffKey, JSON.stringify(readyHandoff("https://www.mercadopago.cl/checkout/terminal"))]]);
    await harness({ ...state, message: "Estado terminal." }, [], { storage, now: fixedNow });
    assert.equal(storage.has(handoffKey), false, state.state);
  }
});

test("focus y visibility refrescan una sola vez al volver del proveedor", async () => {
  const h = await harness({
    state: "payment_pending",
    message: "Pago pendiente.",
    payment_confirmed: false,
    recovery_action: "none",
  }, [], { now: fixedNow });
  assert.equal(h.calls.length, 1);
  h.windowListeners.get("focus")();
  h.documentListeners.get("visibilitychange")();
  assert.equal(h.calls.length, 2, "focus y visibility del mismo retorno comparten la actualización");
  await flush();
  h.windowListeners.get("focus")();
  assert.equal(h.calls.length, 2, "el umbral evita un tercer GET inmediato");
});

test("el retorno elimina la acción especial de otra inscripción", async () => {
  assert.doesNotMatch(returnPageSource, /new-independent-enrollment|Realizar otra inscripción/i);
  assert.doesNotMatch(source, /Realizar otra inscripción|otra inscripción independiente/i);
});

test("la transición usa una sola pestaña, versión fija y referencia copiable", async () => {
  assert.match(returnPageSource, /id="retry-payment"[^>]*hidden>Continuar a Mercado Pago<\/a>/);
  assert.doesNotMatch(returnPageSource, /target="_blank"|window\.open/);
  assert.match(returnPageSource, /assets\/return-status\.js\?v=20261009-same-tab1/);
  assert.match(returnPageSource, /Te llevamos a Mercado Pago/);
  assert.match(returnPageSource, /Referencia para soporte/);
  assert.match(returnPageSource, /id="copy-reference"/);
});

test("la referencia para soporte se copia sin exponer otros datos", async () => {
  const h = await harness({ state: "payment_pending", message: "Pendiente.", payment_confirmed: false, recovery_action: "none" });
  h.nodes["copy-reference"].listeners.click();
  await flush();
  assert.equal(h.context.copiedReference, reference);
  assert.equal(h.nodes["copy-reference"].textContent, "Copiada");
});

test("un doble clic no dispara dos solicitudes simultáneas", async () => {
  let resolvePost;
  const pendingPost = new Promise(resolve => { resolvePost = resolve; });
  const h = await harness({
    state: "payment_rejected",
    message: "El pago no fue aprobado.",
    payment_confirmed: false,
    recovery_action: "restart_payment",
  }, [() => pendingPost]);
  h.nodes["restart-payment"].listeners.click();
  h.nodes["restart-payment"].listeners.click();
  await flush();
  assert.equal(h.calls.filter(call => call.options && call.options.method === "POST").length, 1);
  assert.equal(h.nodes["restart-payment"].disabled, true);
  resolvePost(response(409, { error: { code: "retry_busy" } }));
  await flush();
});

(async () => {
  let failures = 0;
  for (const entry of tests) {
    try {
      await entry.callback();
      console.log("✓", entry.name);
    } catch (error) {
      failures += 1;
      console.error("✗", entry.name);
      console.error(error);
    }
  }
  console.log(`${tests.length - failures}/${tests.length} pruebas de recuperación de pago pasaron.`);
  if (failures > 0) process.exitCode = 1;
})();
