"use strict";

// Offline regression checks: execute the actual frontend functions, never create a checkout.
// Run: node tests/frontend-selection.cjs (from the integration directory).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.resolve(__dirname, "../public/index.html"), "utf8");
const landingPath = process.env.DGYM_LANDING_HTML || null;
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(script);
let count = 0;
let skipped = 0;
function check(name, work) { work(); count += 1; console.log("PASS " + name); }
function crossSiteCheck(name, work) {
  if (!landingPath) {
    skipped += 1;
    console.log("SKIP " + name + " (set DGYM_LANDING_HTML to validate the separate landing artifact)");
    return;
  }
  check(name, work);
}
function actualFunction(name) {
  const match = script.match(new RegExp("      function " + name + "\\([^]*?\\n      \\}"));
  assert.ok(match, name + " exists in the actual frontend");
  return match[0];
}
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: "", textContent: "", checked: false, hidden: false,
    attributes: {}, setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  });
  return elements.get(id);
}
const cards = ["inicio", "pro"].map(plan => ({
  getAttribute() { return plan; },
  classList: { toggle() {} },
  querySelector(selector) { return element(plan + ":" + selector); }
}));
const location = new URL("https://demogym.example/inscripcion/?plan=inicio&duration=6&mode=prepaid&utm_source=qa");
const sandbox = {
  URL, URLSearchParams, Intl, Number, Object,
  state: { step: 1, plan: null, duration: 12, mode: "automatic" },
  durationInputs: [1, 3, 6, 12].map(value => ({ value: String(value) })),
  modeInputs: ["automatic", "prepaid"].map(value => ({ value })),
  paymentGroup: {}, paymentComparisonNote: {}, selectionTouched: false,
  summarizedSelectionKey: null, isLocalPreview: false,
  attributionKeys: ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"],
  document: { getElementById: element, querySelectorAll: () => cards },
  window: { location, history: { state: null, replaceState(state, title, href) { location.href = href; } } },
  showStep(step) { sandbox.state.step = step; },
  syncCheckoutReadiness() {},
  checkoutAvailability: { resolved: true, enabled: false, preflightReady: false },
  checkoutHold: { blocked: false },
  selectionAvailable() { return false; }
};
vm.createContext(sandbox);
vm.runInContext(script.match(/      var plans = \{[^]*?\n      \};/)[0], sandbox);
for (const variable of ["availabilitySchemaVersion", "pricingVersion", "consentTextVersion"]) {
  vm.runInContext(script.match(new RegExp("      var " + variable + " = [^;]+;"))[0], sandbox);
}
vm.runInContext(script.match(/      var paymentModeContract = \{[^]*?\n      \};/)[0], sandbox);
for (const name of ["currency", "hasPlan", "selectionFromQuery", "durationLabel", "matriculaWaived", "offerKey", "offerFor", "getOffer", "syncSelectionUrl", "updateBackLink", "updatePlanCards", "updateSummary", "applyDurationMode", "selectPlan", "checkoutReadiness", "isRecord", "normalizedDurations", "availabilityOfferMatches", "parseCheckoutAvailability"]) {
  vm.runInContext(actualFunction(name), sandbox);
}
const plain = obj => JSON.parse(JSON.stringify(obj));
check("JavaScript compiles and every literal element reference exists", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, id] of script.matchAll(/getElementById\("([^"]+)"\)/g)) assert.ok(ids.has(id), id);
  assert.match(html, /<h1 id="step-2-title"/);
  assert.match(actualFunction("showStep"), /getElementById\("enrollment-intro"\)\.hidden = step !== 1/);
  assert.match(html, /\.field \{ display: grid; align-content: start;/);
});
check("14 legal landing combinations retain plan, term and payment method", () => {
  let offers = 0;
  for (const plan of ["inicio", "pro"]) for (const duration of [1, 3, 6, 12]) {
    for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) {
      const selection = sandbox.selectionFromQuery(`?plan=${plan}&duration=${duration}&mode=${mode}`);
      assert.deepEqual(plain(selection), { plan, duration, mode, explicit: true });
      assert.ok(sandbox.offerFor(plan, mode, duration));
      offers += 1;
    }
  }
  assert.equal(offers, 14);
});
check("Historical links default to annual automatic without selecting twice", () => {
  assert.deepEqual(plain(sandbox.selectionFromQuery("?plan=inicio")), { plan: "inicio", duration: 12, mode: "automatic", explicit: true });
  sandbox.selectPlan("inicio", true, true);
  assert.equal(sandbox.state.step, 2);
  assert.match(script, /selectPlan\(requestedSelection\.plan, true, true\)/);
});
check("Malformed IDs and impossible payment modes normalize safely", () => {
  for (const plan of ["bad", "constructor", "toString", "__proto__"]) {
    assert.equal(sandbox.selectionFromQuery(`?plan=${plan}`).plan, null);
    assert.equal(sandbox.offerFor(plan, "automatic", 12), null);
  }
  for (const duration of ["0", "2", "-1", "Infinity", "03", "12oops"]) {
    assert.equal(sandbox.selectionFromQuery(`?duration=${duration}`).duration, 12);
  }
  assert.equal(sandbox.selectionFromQuery("?duration=1&mode=automatic").mode, "single");
  assert.equal(sandbox.selectionFromQuery("?duration=3&mode=single").mode, "automatic");
  assert.equal(sandbox.selectionFromQuery("?duration=6&mode=nonsense").mode, "automatic");
  assert.deepEqual(plain(sandbox.selectionFromQuery("?duration=6&mode=prepaid")), { plan: null, duration: 6, mode: "prepaid", explicit: true });
});
check("Changing plan preserves term, method and all three personal fields", () => {
  sandbox.state.duration = 6; sandbox.state.mode = "prepaid";
  element("full-name").value = "Persona de prueba";
  element("email").value = "qa@example.test";
  element("phone").value = "912345678";
  sandbox.selectPlan("pro", true);
  assert.equal(sandbox.state.duration, 6); assert.equal(sandbox.state.mode, "prepaid");
  assert.equal(element("summary-today").textContent, "$173.340");
  assert.equal(element("summary-frequency").textContent, "Todos los días de apertura");
  assert.equal(element("full-name").value, "Persona de prueba");
  assert.equal(element("email").value, "qa@example.test");
  assert.equal(element("phone").value, "912345678");
});
check("Cards and compact order summary agree for every legal combination", () => {
  for (const plan of ["inicio", "pro"]) for (const duration of [1, 3, 6, 12]) {
    for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) {
      Object.assign(sandbox.state, { plan, duration, mode });
      sandbox.applyDurationMode();
      const offer = sandbox.getOffer();
      assert.equal(element("summary-primary-label").textContent, mode === "automatic" ? "Mensualidad" : "Cobro de hoy");
      assert.equal(element("summary-today").textContent, sandbox.currency(mode === "automatic" ? offer.installmentAmount : offer.today));
      assert.equal(element("summary-first-charge").hidden, mode !== "automatic");
      assert.equal(element("summary-first-charge-total").textContent, sandbox.currency(offer.today));
      assert.equal(element("summary-total-label").textContent, mode === "automatic" ? "Total del contrato" : "Total a pagar");
      assert.equal(element("summary-total").textContent, sandbox.currency(offer.total));
      if (plan === "pro") assert.equal(element("summary-frequency").textContent, "Todos los días de apertura");
      assert.equal(element(plan + ":.offer-price strong").textContent, sandbox.currency(mode === "automatic" ? offer.installmentAmount : offer.chargeAmount));
      assert.equal(sandbox.durationInputs.find(input => input.checked).value, String(duration));
      assert.equal(sandbox.paymentGroup.hidden, duration === 1);
    }
  }
});
check("All 14 online offers include one $15.000 enrollment fee", () => {
  let offerCount = 0;
  for (const plan of ["inicio", "pro"]) for (const duration of [1, 3, 6, 12]) {
    for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) {
      Object.assign(sandbox.state, { plan, duration, mode });
      sandbox.applyDurationMode();
      const offer = sandbox.getOffer();
      assert.equal(sandbox.matriculaWaived(mode, duration), false);
      assert.equal(element("summary-matricula").attributes["data-waived"], "false");
      assert.equal(element("summary-matricula-title").textContent, "Matrícula incluida · $15.000");
      assert.equal(offer.enrollmentFeeAmount, 15000);
      assert.equal(offer.total, offer.planAmount + 15000);
      assert.equal(element("summary-today").textContent, sandbox.currency(mode === "automatic" ? offer.installmentAmount : offer.today));
      offerCount++;
    }
  }
  assert.equal(offerCount, 14);
  assert.equal(sandbox.matriculaWaived("automatic", 1), false);
});
check("Changed commercial terms clear only required consent", () => {
  Object.assign(sandbox.state, { plan: "inicio", duration: 6, mode: "automatic" });
  sandbox.updateSummary();
  element("necessary-consent").checked = true;
  element("marketing-consent").checked = true;
  sandbox.state.duration = 3;
  sandbox.applyDurationMode();
  assert.equal(element("necessary-consent").checked, false);
  assert.equal(element("marketing-consent").checked, true);
  assert.equal(element("consent-selection-notice").hidden, false);
  element("necessary-consent").checked = true;
  sandbox.updateSummary();
  assert.equal(element("necessary-consent").checked, true, "same terms do not reset consent");
});
check("One month stays single; returning to longer term selects a valid visible method", () => {
  sandbox.state.duration = 1; sandbox.applyDurationMode();
  assert.equal(sandbox.state.mode, "single");
  sandbox.state.duration = 6; sandbox.applyDurationMode();
  assert.equal(sandbox.state.mode, "automatic");
  assert.equal(sandbox.modeInputs.find(input => input.checked).value, "automatic");
});
check("URL and return link preserve offer and attribution without form data", () => {
  sandbox.state.plan = "pro"; sandbox.state.duration = 3; sandbox.state.mode = "prepaid";
  sandbox.updateBackLink();
  assert.equal(location.searchParams.get("plan"), "pro");
  assert.equal(location.searchParams.get("duration"), "3");
  assert.equal(location.searchParams.get("mode"), "prepaid");
  assert.equal(location.searchParams.get("utm_source"), "qa");
  const back = new URL(element("back-to-plans").href);
  assert.equal(back.origin, "https://demogym.example"); assert.equal(back.hash, "#planes");
  assert.equal(back.searchParams.get("duration"), "3");
  assert.equal(back.searchParams.get("utm_source"), "qa");
  assert.ok(!back.href.includes("example.test")); assert.ok(!back.href.includes("912345678"));
  sandbox.isLocalPreview = true;
  sandbox.window.location.href = "http://127.0.0.1:8876/Prototipo.html?utm_source=qa";
  sandbox.updateBackLink();
  assert.match(decodeURIComponent(element("back-to-plans").href), /landing-demo\.html/);
});
check("Local previews remain closed and production retains fail-closed availability", () => {
  sandbox.isLocalPreview = true;
  assert.equal(sandbox.checkoutReadiness().code, "preview_only");
  assert.equal(sandbox.checkoutReadiness().ready, false);
  sandbox.isLocalPreview = false;
  assert.equal(sandbox.checkoutReadiness().code, "preflight_unavailable");
  sandbox.checkoutAvailability.resolved = false;
  assert.equal(sandbox.checkoutReadiness().code, "availability_pending");
});
crossSiteCheck("Landing promotion and all 14 links agree with checkout; contact and trial links are marked", () => {
  const landing = fs.readFileSync(path.resolve(landingPath), "utf8");
  const js = landing.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function(js);
  const nodes = new Map();
  const node = key => { if (!nodes.has(key)) nodes.set(key, {}); return nodes.get(key); };
  const landingCards = ["inicio", "pro"].map(plan => ({
    dataset: { plan }, querySelector: selector => node(plan + selector),
  }));
  const durationButtons = [1, 3, 6, 12].map(duration => ({
    dataset: { duration: String(duration) }, setAttribute() {},
  }));
  const ctx = {
    URL, URLSearchParams, Intl, duration: 12, paymentMode: "automatic", monthlyButton: {},
    location: new URL("https://demogym.example/?utm_source=qa"),
    enrollmentUrl: () => new URL("https://demogym.example/inscripcion/"),
    document: {
      querySelectorAll: selector => selector === "[data-duration]" ? durationButtons : landingCards,
      querySelector: node, getElementById: node,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(js.match(/^const prices=.*$/m)[0] + "\n" + js.match(/^const clp=.*$/m)[0] + "\n" + js.match(/function updatePlans\(\)\{[^]*?\n\}/)[0], ctx);
  for (const duration of [1, 3, 6, 12]) for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) {
    ctx.duration = duration; ctx.paymentMode = mode; ctx.updatePlans();
    assert.equal(node("online-promo").hidden, false);
    assert.equal(node("matricula-standard").hidden, true);
    for (const plan of ["inicio", "pro"]) {
      const link = new URL(node(plan + ".btn").href);
      assert.equal(link.searchParams.get("plan"), plan);
      assert.equal(link.searchParams.get("duration"), String(duration));
      assert.equal(link.searchParams.get("mode"), mode);
      assert.equal(link.searchParams.get("utm_source"), "qa");
      const checkoutOffer = sandbox.offerFor(plan, mode, duration);
      assert.equal(node(plan + ".amount").textContent, sandbox.currency(mode === "automatic" ? checkoutOffer.installmentAmount : checkoutOffer.chargeAmount));
    }
  }
  const trial = new URL(landing.match(/href="([^"]+)" id="trial-booking-link"/)[1].replaceAll("&amp;", "&"));
  assert.equal(trial.origin, "https://clase.demogym.example");
  assert.equal(trial.pathname, "/r/equipo-360");
  assert.equal(trial.searchParams.get("utm_source"), "demogym.example");
  assert.equal(trial.searchParams.get("utm_medium"), "website");
  assert.equal(trial.searchParams.get("utm_campaign"), "prueba_gratuita");
  assert.ok(landing.includes("<dt>Domingo</dt><dd>Cerrado</dd>"));
  assert.ok(landing.includes('class="step welcome-step"'));
  for (const page of [landing, html]) {
    assert.ok(page.includes('class="whatsapp-float"'));
    const href = page.match(/class="whatsapp-float" href="([^"]+)"/)[1];
    const whatsapp = new URL(href);
    assert.equal(whatsapp.hostname, "wa.me");
    assert.equal(whatsapp.pathname, "/56900000000");
    assert.ok(whatsapp.searchParams.get("text").includes("página"));
  }
});
crossSiteCheck("V04 prioritizes enrollment and free trial with one icon-only green WhatsApp per page", () => {
  const landing = fs.readFileSync(path.resolve(landingPath), "utf8");
  assert.ok(!landing.includes("Inscribirme y pagar"));
  assert.ok(!landing.includes("Hablar con el equipo"));
  assert.ok(!landing.includes("Conversemos por WhatsApp"));
  for (const page of [landing, html]) {
    const contacts = [...page.matchAll(/<a\b[^>]*href="https:\/\/wa\.me\/[^"]+"[^>]*>([^]*?)<\/a>/g)];
    assert.equal(contacts.length, 1);
    assert.match(contacts[0][0], /class="whatsapp-float"/);
    assert.match(contacts[0][0], /aria-label="/);
    assert.equal(contacts[0][1].replace(/<[^>]+>/g, "").trim(), "");
    assert.match(page, /--whatsapp-green:\s*#25d366/);
    assert.match(page, /background:\s*var\(--whatsapp-green\)/);
  }
  const hero = landing.match(/<section class="hero[^"]*"[^>]*>([^]*?)<\/section>/)[1];
  assert.ok(hero.includes("Inscríbete ahora"));
  assert.ok(hero.includes("Agenda tu clase gratis"));
  const mobile = landing.match(/<div class="mobile-cta"[^>]*>([^]*?)<\/div>/)[1];
  assert.equal([...mobile.matchAll(/<a\b/g)].length, 2);
  assert.ok(mobile.includes("Inscríbete ahora"));
  const trialLinks = [...landing.matchAll(/href="(https:\/\/clase\.demogym\.example[^"]+)"/g)];
  assert.equal(trialLinks.length, 5);
  for (const [, href] of trialLinks) {
    const url = new URL(href.replaceAll("&amp;", "&"));
    assert.equal(url.pathname, "/r/equipo-360");
    assert.equal(url.searchParams.get("utm_source"), "demogym.example");
    assert.equal(url.searchParams.get("utm_medium"), "website");
    assert.equal(url.searchParams.get("utm_campaign"), "prueba_gratuita");
  }
  assert.ok(!landing.includes("#fff4de"));
  assert.match(html, /El pago se realiza en Mercado Pago\. Tu inscripción se confirma al validar el pago\./);
});
check("Every checkout includes matrícula exactly once and shows the breakdown", () => {
  for (const [plan, base] of [["inicio", 19990], ["pro", 29990]]) {
    Object.assign(sandbox.state, { plan, duration: 1, mode: "single" });
    for (let repeat = 0; repeat < 2; repeat++) {
      sandbox.applyDurationMode();
      const offer = sandbox.getOffer();
      assert.equal(offer.planAmount, base);
      assert.equal(offer.enrollmentFeeAmount, 15000);
      assert.equal(offer.total, base + 15000);
      assert.equal(offer.installmentAmount, base + 15000);
      assert.equal(offer.today, base + 15000);
      assert.equal(offer.savings, 0);
      assert.equal(element("summary-charges-label").textContent, "Plan por 1 mes");
      assert.equal(element("summary-charges").textContent, sandbox.currency(base));
      assert.equal(element("summary-fee-row").hidden, false);
      assert.equal(element("summary-fee").textContent, "$15.000");
      assert.equal(element("summary-today").textContent, sandbox.currency(base + 15000));
      assert.equal(element("summary-total").textContent, sandbox.currency(base + 15000));
    }
    sandbox.state.mode = "automatic"; sandbox.state.duration = 3; sandbox.applyDurationMode();
    const automatic = sandbox.getOffer();
    assert.equal(element("summary-primary-label").textContent, "Mensualidad");
    assert.equal(element("summary-today").textContent, sandbox.currency(automatic.installmentAmount));
    assert.equal(element("summary-first-charge").hidden, false);
    assert.equal(element("summary-first-charge-fee").textContent, "+ $15.000");
    assert.equal(element("summary-first-charge-total").textContent, sandbox.currency(automatic.today));
    assert.equal(element("summary-fee-row").hidden, true);
    assert.equal(element("summary-charges-label").textContent, "Mensualidades del plan");
    assert.equal(element("summary-charges").textContent, "3 de " + sandbox.currency(automatic.installmentAmount));
    assert.equal(element("summary-total-label").textContent, "Total del contrato");
    assert.equal(automatic.enrollmentFeeAmount, 15000);
    assert.equal(automatic.today, automatic.installmentAmount + 15000);
    assert.equal(automatic.total, automatic.planAmount + 15000);
    assert.match(element("summary-matricula-copy").textContent, /una sola vez/);
    sandbox.state.mode = "prepaid"; sandbox.applyDurationMode();
    const prepaid = sandbox.getOffer();
    assert.equal(element("summary-primary-label").textContent, "Cobro de hoy");
    assert.equal(element("summary-today").textContent, sandbox.currency(prepaid.today));
    assert.equal(element("summary-first-charge").hidden, true);
    assert.equal(element("summary-fee-row").hidden, false);
    assert.equal(element("summary-total-label").textContent, "Total a pagar");
    assert.equal(prepaid.enrollmentFeeAmount, 15000);
    assert.equal(prepaid.today, prepaid.planAmount + 15000);
    assert.equal(prepaid.total, prepaid.planAmount + 15000);
    assert.match(element("summary-matricula-copy").textContent, /una sola vez/);
  }
});
function availabilityPayload(offers) {
  return { schema_version: sandbox.availabilitySchemaVersion, pricing_version: sandbox.pricingVersion,
    consent_text_version: sandbox.consentTextVersion, checkout_enabled: true,
    preflight: { ready: true, status: "ready" },
    payment_options: { automatic: { checkout_type: "subscription", durations: [3,6,12] }, single: { checkout_type: "preference", durations: [1] }, prepaid: { checkout_type: "preference", durations: [3,6,12] } }, offers };
}
function publicRecord(offer) {
  return { plan_id: offer.planId, plan_name: offer.planName, payment_mode: offer.paymentMode, duration_months: offer.duration,
    checkout_type: offer.checkoutType, regular_monthly_amount: offer.regularMonthly, installment_amount: offer.installmentAmount,
    regular_total_amount: offer.regularTotal, plan_amount: offer.planAmount, enrollment_fee_amount: offer.enrollmentFeeAmount,
    total_amount: offer.total, charge_amount: offer.chargeAmount, charge_count: offer.chargeCount, discount_percent: offer.discount,
    savings_amount: offer.savings, today_amount: offer.today, currency: offer.currency };
}
check("Availability fails closed for old prices, omitted matrícula or mismatching breakdown", () => {
  const offers = [];
  for (const plan of ["inicio", "pro"]) for (const duration of [1,3,6,12]) {
    for (const mode of duration === 1 ? ["single"] : ["automatic", "prepaid"]) offers.push(publicRecord(sandbox.offerFor(plan, mode, duration)));
  }
  const payload = availabilityPayload(offers);
  assert.equal(sandbox.parseCheckoutAvailability(payload).enabled, true);
  const old = plain(payload); old.pricing_version = "2026-09-07-v2";
  assert.throws(() => sandbox.parseCheckoutAvailability(old), /availability_response_invalid/);
  for (const patch of [{ enrollment_fee_amount: 0 }, { charge_amount: 19990 }, { enrollment_fee_amount: 20000 }, { plan_amount: 34990 }]) {
    const bad = plain(payload); Object.assign(bad.offers[0], patch);
    assert.throws(() => sandbox.parseCheckoutAvailability(bad), /availability_offer_invalid/);
  }
  const absent = plain(payload); delete absent.offers[0].enrollment_fee_amount;
  assert.throws(() => sandbox.parseCheckoutAvailability(absent), /availability_offer_invalid/);
});
if (process.argv.includes("--backend-catalog")) {
  check("Actual PHP public catalog matches frontend for all 14 offers", () => {
    const payload = JSON.parse(fs.readFileSync(0, "utf8"));
    const offers = Array.isArray(payload) ? payload : payload.offers;
    assert.equal(offers.length, 14);
    assert.equal(sandbox.parseCheckoutAvailability(availabilityPayload(offers)).enabled, true);
  });
}
check("Plan pricing stays intact while v4 adds one enrollment fee", () => {
  assert.match(script, /var consentTextVersion = "2026-09-21-v1"/);
  assert.match(script, /var pricingVersion = "2026-10-06-v4"/);
  assert.ok(html.includes("Acepto las condiciones del plan y el uso de mis datos para gestionar la inscripción y el pago."));
  assert.ok(html.includes("Quiero recibir consejos, novedades y beneficios de Comunidad Demo Gym por WhatsApp y correo."));
  assert.equal(sandbox.offerFor("inicio", "automatic", 12).chargeAmount, 31990);
  assert.equal(sandbox.offerFor("pro", "automatic", 12).chargeAmount, 40490);
  assert.equal(sandbox.offerFor("pro", "automatic", 12).installmentAmount, 25490);
  assert.match(html, /matrícula única de \$15\.000/i);
});
console.log(`${count} offline regression groups passed; no network calls or payment attempts.`);
if (skipped > 0) console.log(`${skipped} cross-site groups skipped because DGYM_LANDING_HTML was not provided.`);
