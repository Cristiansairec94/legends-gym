import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function render({
  authorized = true,
  configured = true,
  extraHeaders = {},
  hashOverride,
  path = "/",
  role = "admin",
} = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const adminCredentials = "render-test:render-secret";
  const salesCredentials = "ventas-render:ventas-secret";
  const credentials = role === "sales" ? salesCredentials : adminCredentials;
  const basicAuthSha256 = await sha256Hex(adminCredentials);
  const basicAuthSalesSha256 = await sha256Hex(salesCredentials);
  const headers = { accept: "text/html", host: "localhost" };
  if (authorized) {
    headers.authorization = `Basic ${btoa(credentials)}`;
  }
  Object.assign(headers, extraHeaders);

  const environment = {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };
  if (configured) {
    environment.BASIC_AUTH_SHA256 = hashOverride ?? basicAuthSha256;
    environment.BASIC_AUTH_SALES_SHA256 = basicAuthSalesSha256;
  }

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers,
    }),
    environment,
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("challenges anonymous requests before rendering the application", async () => {
  for (const path of ["/", "/api/pos", "/_vinext/image", "/og.png"]) {
    const response = await render({ authorized: false, path });
    assert.equal(response.status, 401, path);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Basic\b/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("fails closed when the hosted credential is absent", async () => {
  for (const response of [
    await render({ configured: false }),
    await render({ hashOverride: "invalid" }),
  ]) {
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

test("server-renders the cafeteria point of sale", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Demo Gym Ops — Cafetería &amp; Protein Bar<\/title>/i);
  assert.match(html, /Selecciona productos/);
  assert.match(html, /Ticket en curso/);
  assert.match(html, /Medio de pago/);
  assert.match(html, />Tarjeta</);
  assert.match(html, />Colaborador</);
  assert.match(html, /Turno y responsable/);
  assert.match(html, /Abre el turno para vender/);
  assert.match(html, /Ahora no/);
  assert.match(html, /Fondo inicial/);
  assert.match(html, /Verificando turno/);
  assert.doesNotMatch(html, />D(?:é|&eacute;)bito</i);
  assert.doesNotMatch(html, />Cr(?:é|&eacute;)dito</i);
  assert.doesNotMatch(html, /value="(?:debito|credito)"/i);
  assert.match(html, /Verificando perfil/);
  assert.match(html, /Cambiar perfil/);
  assert.doesNotMatch(html, /Gestionar productos|Pagos pendientes|Cuadraturas AM \/ PM|Ventas recientes|Ventas de hoy|Reportes de ventas|Detalle de ventas/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("accepts the seller credential without rendering admin-only surfaces initially", async () => {
  const response = await render({ role: "sales" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Ticket en curso/);
  assert.doesNotMatch(html, /Gestionar productos|Pagos pendientes|Cuadraturas AM \/ PM|Reportes de ventas|Detalle de ventas/);
});

test("separa cierre, reportes e incidencias en páginas con permisos por perfil", async () => {
  const closureResponse = await render({ role: "sales", path: "/cierre-caja" });
  assert.equal(closureResponse.status, 200);
  const closureHtml = await closureResponse.text();
  assert.match(closureHtml, /Cierre de caja/);
  assert.match(closureHtml, /Preparando el cierre de caja/);
  assert.match(closureHtml, /Nueva venta/);

  const adminReportsResponse = await render({ role: "admin", path: "/reportes" });
  assert.equal(adminReportsResponse.status, 200);
  const reportsHtml = await adminReportsResponse.text();
  assert.match(reportsHtml, /Análisis y reportes de ventas/);
  assert.match(reportsHtml, /Preparando reportes/);

  const salesReportsResponse = await render({ role: "sales", path: "/reportes" });
  assert.equal(salesReportsResponse.status, 403);
  assert.match(await salesReportsResponse.text(), /no tiene permisos de administración/i);

  const adminIncidentsResponse = await render({
    role: "admin",
    path: "/incidencias-cierres",
  });
  assert.equal(adminIncidentsResponse.status, 200);
  const incidentsHtml = await adminIncidentsResponse.text();
  assert.match(incidentsHtml, /Incidencias de cierres/);
  assert.match(incidentsHtml, /Administración por excepción/);
  assert.match(incidentsHtml, /Preparando incidencias/);

  const salesIncidentsResponse = await render({
    role: "sales",
    path: "/incidencias-cierres",
  });
  assert.equal(salesIncidentsResponse.status, 403);
  assert.match(
    await salesIncidentsResponse.text(),
    /no tiene permisos de administración/i,
  );
});

test("profile switch route redirects only to internal return paths", async () => {
  const challenge = await render({
    path: "/api/auth/switch-profile?returnTo=/pos?turno=am",
  });
  assert.equal(challenge.status, 401);
  assert.match(challenge.headers.get("set-cookie") ?? "", /demogymcafe_profile_switch=1/);

  const response = await render({
    path: "/api/auth/switch-profile?returnTo=/pos?turno=am",
    extraHeaders: { cookie: "demogymcafe_profile_switch=1" },
  });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/pos?turno=am");
  assert.equal(response.headers.get("cache-control"), "no-store");

  const external = await render({
    path: "/api/auth/switch-profile?returnTo=https://evil.test/",
    extraHeaders: { cookie: "demogymcafe_profile_switch=1" },
  });
  assert.equal(external.status, 302);
  assert.equal(external.headers.get("location"), "/");
});

test("profile switch route challenges when credentials are absent", async () => {
  const response = await render({
    authorized: false,
    path: "/api/auth/switch-profile?returnTo=/",
  });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate") ?? "", /^Basic\b/);
});

test("ships product metadata and removes starter-only assets", async () => {
  const [page, appShellHeader, closurePage, reportsPage, incidentsPage, closuresPanel, incidentsPanel, correctionPanel, debtsPanel, todaySalesPanel, salesReportsPanel, salesHistoryPanel, layout, globals, packageJson, wrangler, sourceIncidentsMigration, sourceStockMigration, deployedIncidentsMigration, deployedStockMigration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/app-shell-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/cierre-caja/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reportes/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/incidencias-cierres/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/cash-closures-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/closure-incidents-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/closure-correction-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/debts-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/today-sales-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/sales-reports-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/sales-history-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0013_shocking_vermin.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0014_right_sentry.sql", import.meta.url), "utf8"),
    readFile(new URL("../dist/migrations/0013_shocking_vermin.sql", import.meta.url), "utf8"),
    readFile(new URL("../dist/migrations/0014_right_sentry.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/pos"/);
  assert.match(page, /crypto\.randomUUID\(\)/);
  assert.match(page, /paymentMethod/);
  assert.match(page, /role === "admin"/);
  assert.match(page, /<AppShellHeader/);
  assert.match(page, /paymentMethod === "colaborador"/);
  assert.match(page, /debtorCollaborator/);
  assert.doesNotMatch(page, /<CashClosuresPanel/);
  assert.match(page, /<DebtsPanel/);
  assert.match(page, /\{role \? \(\s*<DebtsPanel/);
  assert.match(page, /role=\{role\}/);
  assert.match(page, /\{role \? \([\s\S]*?<TodaySalesPanel[\s\S]*?refreshSignal=\{todaySalesRefreshSignal\}/);
  assert.match(page, /activeSessionId=\{activeSession\?\.id \?\? null\}/);
  assert.match(page, /activityRevision=\{activeShiftSummary\?\.activityRevision \?\? null\}/);
  assert.match(page, /onSaleVoided=\{async \(message\) => \{/);
  assert.match(page, /setDebtsRefreshSignal\(\(current\) => current \+ 1\)/);
  assert.match(page, /await loadPos\(\)/);
  assert.doesNotMatch(page, /\{isAdmin \? <TodaySalesPanel/);
  assert.match(page, /setTodaySalesRefreshSignal\(\(current\) => current \+ 1\)/);
  assert.match(todaySalesPanel, /voidedAt: string \| null/);
  assert.match(todaySalesPanel, /canVoid: boolean/);
  assert.match(todaySalesPanel, /\/api\/sales\/\$\{encodeURIComponent\(saleId\)\}\/void/);
  assert.match(todaySalesPanel, /method: "POST"/);
  assert.match(todaySalesPanel, /expectedActivityRevision: activityRevision/);
  assert.match(todaySalesPanel, /const attemptId = voidAttemptIdRef\.current \?\? crypto\.randomUUID\(\)/);
  assert.match(todaySalesPanel, /voidAttemptIdRef\.current = attemptId/);
  assert.match(todaySalesPanel, /role="alertdialog"/);
  assert.match(todaySalesPanel, /aria-labelledby="sale-void-dialog-title"/);
  assert.match(todaySalesPanel, /aria-describedby="sale-void-dialog-description"/);
  assert.match(todaySalesPanel, /Confirmar anulación/);
  assert.match(todaySalesPanel, /Motivo de la anulación/);
  assert.match(todaySalesPanel, /required\s+maxLength=\{500\}/);
  assert.match(todaySalesPanel, /voidCancelRef\.current\?\.focus\(\)/);
  assert.match(todaySalesPanel, /returnTarget\?\.isConnected/);
  assert.match(todaySalesPanel, /role="alert" ref=\{voidErrorRef\} tabIndex=\{-1\}/);
  assert.match(todaySalesPanel, /aria-busy=\{voidSubmitting\}/);
  assert.match(todaySalesPanel, /disabled=\{voidSubmitting \|\| !voidReason\.trim\(\)\}/);
  assert.match(todaySalesPanel, /\{voidSubmitting \? "Anulando…" : "Anular venta"\}/);
  assert.match(todaySalesPanel, /Esta acción no se puede deshacer/);
  assert.match(todaySalesPanel, /\? "Anulada"/);
  assert.match(todaySalesPanel, /aria-label="Registro de anulación"/);
  assert.match(todaySalesPanel, /\{sale\.canVoid \? \(/);
  assert.match(globals, /\.today-sale-status-voided/);
  assert.match(globals, /\.today-sale-void-button\s*\{[\s\S]*?min-height: 44px/);
  assert.match(globals, /\.sale-void-dialog::backdrop/);
  assert.match(globals, /\.sale-void-dialog-actions button\s*\{[\s\S]*?min-height: 48px/);
  assert.match(globals, /@media \(max-width: 660px\)[\s\S]*?\.today-sale-void-button \{ width: 100%; \}/);
  assert.doesNotMatch(page, /<SalesReportsPanel/);
  assert.doesNotMatch(page, /Ventas recientes|recent-section/);
  assert.match(page, /activeSession/);
  assert.match(page, /activeShiftSummary/);
  assert.match(page, /Ventas incluidas/);
  assert.match(page, /Dinero recibido en este turno/);
  assert.match(page, /activeShiftSummary\.settlementCollectedClp/);
  assert.match(page, /Abonos cobrados/);
  assert.match(page, /Incluye abonos de clientes y colaboradores\. Los consumos pendientes de colaboradores siguen fuera de caja/);
  assert.match(page, /className="shift-opening-dialog"/);
  assert.match(page, /dialog\.showModal\(\)/);
  assert.match(page, /onCancel=\{\(event\) => \{\s*event\.preventDefault\(\);\s*dismissOpeningDialog\(\)/);
  assert.match(page, /Ahora no/);
  assert.match(page, /shiftDialogRef\.current\?\.close\(\)/);
  assert.match(page, /openingReturnFocusRef\.current\?\.focus\(\)/);
  assert.match(page, /switchProfileFromOpening/);
  assert.match(page, /openingAttempt \?\?/);
  assert.match(page, /error\.status >= 400 && error\.status < 500/);
  assert.match(page, /const authoritativeState = await loadPos\(\)/);
  assert.match(page, /confirmedSession\?\.status === "open"/);
  assert.match(page, /const sessionForSale = authoritativeState\?\.activeSession \?\? null/);
  assert.match(page, /sessionForSale\.id !== activeSession\.id/);
  assert.match(page, /posRequestSequenceRef/);
  assert.match(page, /soldOut \|\| !activeSession/);
  assert.match(page, /activeSession \? void submitSale\(\) : showOpeningDialog\(\)/);
  assert.match(page, /sessionId: sessionForSale\.id/);
  assert.match(page, /\+ Ingresar stock/);
  assert.match(page, /Ingresar stock recibido/);
  assert.match(page, /El sistema lo sumará al stock vigente sin reemplazarlo/);
  assert.match(page, /Stock actual/);
  assert.match(page, /<small>Ingreso<\/small>/);
  assert.match(page, /Nuevo total/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /max=\{MAX_STOCK_ENTRY_QUANTITY\}/);
  assert.match(page, /Revisa antes de confirmar/);
  assert.match(page, /la clave de seguridad evita sumarlo dos veces/);
  assert.match(page, /demogymcafe\.pending-stock-entry\.v1/);
  assert.match(page, /window\.localStorage\.setItem\(STOCK_ENTRY_ATTEMPT_STORAGE_KEY/);
  assert.match(page, /parseStoredStockEntryAttempt\(stored\)/);
  assert.match(page, /!stockEntryAttempt && !stockEntryFormValid/);
  assert.match(page, /product\.id === payload\.product!\.id/);
  assert.match(page, /ingredient\.id === payload\.ingredient!\.id/);
  assert.doesNotMatch(page, /cancelar intento/i);
  assert.match(page, /\/api\/products\/\$\{encodeURIComponent\(attempt\.targetId\)\}\/stock-entry/);
  assert.match(page, /\/api\/ingredients\/\$\{encodeURIComponent\(attempt\.targetId\)\}\/stock-entry/);
  assert.match(page, /Ajuste manual · Stock compartido/);
  assert.match(page, /Ajuste manual de stock/);
  assert.match(page, /Para mercadería nueva usa “Ingresar stock”/);
  assert.doesNotMatch(page, /demogymcafe\.(?:shift|seller)/);
  assert.match(appShellHeader, /function switchProfile/);
  assert.match(appShellHeader, /\/api\/auth\/switch-profile/);
  assert.doesNotMatch(appShellHeader, /url\.username|url\.password/);
  assert.match(appShellHeader, /Cambiar a Ventas/);
  assert.match(appShellHeader, /Cambiar a Admin/);
  assert.match(appShellHeader, /href: "\/cierre-caja"/);
  assert.match(appShellHeader, /href: "\/reportes"/);
  assert.match(appShellHeader, /href: "\/incidencias-cierres"/);
  assert.match(appShellHeader, /aria-current/);
  assert.doesNotMatch(
    [page, appShellHeader, closurePage, reportsPage, incidentsPage].join("\n"),
    /from "next\/link"/,
  );
  assert.match(closurePage, /<CashClosuresPanel/);
  assert.match(closurePage, /canManageClosures/);
  assert.match(closurePage, /showHistory=\{role === "admin"\}/);
  assert.match(reportsPage, /role === "admin"/);
  assert.match(reportsPage, /<SalesReportsPanel/);
  assert.match(incidentsPage, /currentSection="incidents"/);
  assert.match(incidentsPage, /role === "admin"/);
  assert.match(incidentsPage, /<ClosureIncidentsPanel/);
  assert.match(incidentsPage, /Administración por excepción/);
  assert.match(incidentsPanel, /fetch\(`\/api\/closure-incidents\?\$\{params\}`/);
  assert.match(incidentsPanel, /Pendiente de aclaración/);
  assert.match(incidentsPanel, /Solicitar aclaración/);
  assert.match(incidentsPanel, /Requiere corrección/);
  assert.match(incidentsPanel, /Validar incidencia/);
  assert.match(incidentsPanel, /Notificaciones WhatsApp/);
  assert.match(incidentsPanel, /Reintentar envío/);
  assert.match(incidentsPanel, /financialEvidence/);
  assert.match(incidentsPanel, /Detectada en la revisión administrativa/);
  assert.match(incidentsPanel, /Motivo financiero registrado/);
  assert.match(incidentsPanel, /<dt>Esperado<\/dt>/);
  assert.match(incidentsPanel, /<dt>Contado<\/dt>/);
  assert.match(incidentsPanel, /<dt>Diferencia<\/dt>/);
  assert.match(incidentsPanel, /Umbrales para cierres futuros/);
  assert.match(incidentsPanel, /Dinero para nivel rojo \(CLP\)/);
  assert.match(incidentsPanel, /Incidencias para reincidencia/);
  assert.match(incidentsPanel, /<span>Estado<\/span>/);
  assert.match(incidentsPanel, /<span>Nivel<\/span>/);
  assert.match(incidentsPanel, /<span>Desde<\/span>/);
  assert.match(incidentsPanel, /<span>Hasta<\/span>/);
  assert.match(incidentsPanel, /<span>Responsable<\/span>/);
  assert.match(incidentsPanel, /<span>Producto o insumo<\/span>/);
  assert.match(incidentsPanel, /aria-live="polite"/);
  assert.match(closuresPanel, /fetch\("\/api\/shift-sessions"/);
  assert.match(closuresPanel, /openingCashClp/);
  assert.match(closuresPanel, /expectedActivityRevision/);
  assert.doesNotMatch(closuresPanel, /Checklist|checklistVersion|Confirmaciones de entrega/);
  assert.match(closuresPanel, /expenses: hasCashShortfall/);
  assert.match(closuresPanel, /handoffComments/);
  assert.match(closuresPanel, /Gastos de caja chica/);
  assert.match(closuresPanel, /Efectivo esperado antes de gastos/);
  assert.match(closuresPanel, /Resumen de entrega/);
  assert.match(closuresPanel, /Recibo inmutable/);
  assert.match(closuresPanel, /Pendiente de validar/);
  assert.match(closuresPanel, /Histórico · sin validación requerida/);
  assert.match(closuresPanel, /\/api\/cash-closures\/\$\{closure\.id\}\/validate/);
  assert.match(closuresPanel, /expectedRevisionNumber: correctionState\.latestRevisionNumber/);
  assert.match(closuresPanel, /<ClosureCorrectionPanel/);
  assert.match(closuresPanel, /closure-revisions-lazy/);
  assert.match(closuresPanel, /expandedRevisionClosures/);
  assert.match(closuresPanel, /validationAttempts/);
  assert.match(closuresPanel, /error\.status >= 400 && error\.status < 500/);
  assert.match(closuresPanel, /noValidate/);
  assert.doesNotMatch(closuresPanel, /disabled=\{saving \|\| !readyToClose\}/);
  assert.match(closuresPanel, /line\.location !== "bodega"/);
  assert.match(closuresPanel, /bodega queda fuera de esta entrega/);
  assert.match(closuresPanel, /versionToken/);
  assert.match(closuresPanel, /inventorySignature/);
  assert.match(closuresPanel, /\.sort\(\(left, right\) => left\.key\.localeCompare/);
  assert.match(closuresPanel, /reasonCategory:\s*difference === 0 \? null : reasonCategory \|\| null/);
  assert.match(closuresPanel, /comment:\s*difference === 0 \? null : comment \|\| null/);
  assert.match(closuresPanel, /Motivo categorizado/);
  assert.match(closuresPanel, /Comentario del caso <small>Obligatorio<\/small>/);
  assert.match(closuresPanel, /Confirmar cierre y entregar turno/);
  assert.match(closuresPanel, /Conteo físico de inventario/);
  assert.match(closuresPanel, /pendingCustomers/);
  assert.match(closuresPanel, /Pendientes de clientes/);
  assert.match(closuresPanel, /Solo como seguimiento: estas cuentas no forman parte del dinero que debes entregar/);
  assert.match(closuresPanel, /Solo se concilia dinero efectivamente recibido/);
  assert.match(closuresPanel, /Ventas incluidas en el cierre/);
  assert.doesNotMatch(closuresPanel, /preview\.(?:collaboratorCount|collaboratorClp|pendingCollaborators)/);
  assert.match(closuresPanel, /showHistoricalCollaboratorReference/);
  assert.match(closuresPanel, /Referencia histórica · fuera de caja/);
  assert.match(closuresPanel, /Math\.max\(\s*closure\.pendingCustomerCount,\s*closure\.pendingCustomers\.length/);
  assert.match(closuresPanel, /Math\.max\(\s*closure\.collaboratorCount,\s*historicalCollaborators\.length/);
  assert.match(closuresPanel, /No correspondían\s+a dinero recibido ni afectaron el efectivo esperado del turno/);
  assert.match(correctionPanel, /\/api\/cash-closures\/\$\{encodeURIComponent\(closureId\)\}\/revisions/);
  assert.match(correctionPanel, /fetch\("\/api\/products"/);
  assert.match(correctionPanel, /Precio cobrado/);
  assert.match(correctionPanel, /const unitPriceClp = validWholeNumber\(item\.unitPriceClp, 1\)/);
  assert.match(correctionPanel, /<span>Precio cobrado<\/span>[\s\S]*?min="1"/);
  assert.match(correctionPanel, /Preparar revisión/);
  assert.match(correctionPanel, /Vista previa · revisión/);
  assert.match(correctionPanel, /Stock vigente \{line\.currentQuantity\}/);
  assert.match(correctionPanel, /currentQuantity: number \| null/);
  assert.match(correctionPanel, /currentVersionToken: string \| null/);
  assert.match(correctionPanel, /adjustable: boolean/);
  assert.match(correctionPanel, /Ya no existe en inventario vigente \/ no ajustable/);
  assert.match(correctionPanel, /disabled=\{saving \|\| Boolean\(attempt\) \|\| !adjustable\}/);
  assert.match(correctionPanel, /changedInventory\.flatMap/);
  assert.match(correctionPanel, /line\.adjustable && line\.currentVersionToken !== null && line\.currentQuantity !== null/);
  assert.match(correctionPanel, /inventory_location_unavailable/);
  assert.match(correctionPanel, /La venta omitida corrige la expectativa histórica, pero no descuenta nuevamente el stock vigente/);
  assert.match(correctionPanel, /Retirar cambios de inventario/);
  assert.match(correctionPanel, /inventory_locked_by_later_closure/);
  assert.match(correctionPanel, /Ver historial de correcciones/);
  assert.match(correctionPanel, /Ventas añadidas/);
  assert.match(correctionPanel, /Cambios de inventario/);
  assert.match(correctionPanel, /Fotografía financiera vigente/);
  assert.match(correctionPanel, /totalAddedItemLines >= 50/);
  assert.match(correctionPanel, /setAttempt\(payload\)/);
  assert.match(closuresPanel, /<summary>Revisar, corregir y validar<\/summary>/);
  assert.match(closuresPanel, /expandedRevisionClosures\[closure\.id\] \? \([\s\S]*className="admin-validation-panel"[\s\S]*<ClosureCorrectionPanel/);
  assert.match(closuresPanel, /pendingHasMore: boolean/);
  assert.match(closuresPanel, /pendingNextCursor: string \| null/);
  assert.match(closuresPanel, /pendingCursor: cursor/);
  assert.match(closuresPanel, /knownIds\.has\(closure\.id\)/);
  assert.match(closuresPanel, /requestId !== pendingPageRequestRef\.current/);
  assert.match(closuresPanel, /return \[\.\.\.current, \.\.\.additions\]/);
  assert.match(closuresPanel, /Cargar más entregas pendientes/);
  assert.match(globals, /\.correction-inventory-unavailable/);
  assert.match(globals, /@media \(max-width: 430px\)[\s\S]*\.shift-opening-modal-fields/);
  assert.match(globals, /\.correction-preview-grid,[\s\S]*grid-template-columns: 1fr/);
  assert.match(debtsPanel, /new URLSearchParams\(\{ kind: "customer" \}\)/);
  assert.match(debtsPanel, /fetch\(`\/api\/debts\?\$\{query\.toString\(\)\}`/);
  assert.match(debtsPanel, /kind: "collaborator"/);
  assert.match(debtsPanel, /collaborator,/);
  assert.match(debtsPanel, /loadCollaboratorDebts\(summary\.collaborator\)/);
  assert.match(debtsPanel, /data\.collaboratorSummaries\.map/);
  assert.match(debtsPanel, /Pendientes por colaborador/);
  assert.match(debtsPanel, /Pendiente total/);
  assert.match(debtsPanel, /Cargar más transacciones/);
  assert.match(debtsPanel, /amountClp/);
  assert.match(debtsPanel, /Total original/);
  assert.match(debtsPanel, /Abonado/);
  assert.match(debtsPanel, /Saldo/);
  assert.match(debtsPanel, /Registrar abono/);
  assert.match(debtsPanel, /Cobrar saldo/);
  assert.match(debtsPanel, /paymentsHasMore/);
  assert.match(debtsPanel, /error\.status >= 400 && error\.status < 500/);
  assert.match(debtsPanel, /settlementAttempts\[debt\.id\]/);
  assert.match(debtsPanel, /demogymcafe\.pending-settlements\.v1/);
  assert.match(debtsPanel, /window\.localStorage\.setItem\(SETTLEMENT_ATTEMPTS_STORAGE_KEY/);
  assert.match(debtsPanel, /parseStoredSettlementAttempts\(stored\)/);
  assert.match(debtsPanel, /debtsRequestId/);
  assert.match(debtsPanel, /collaboratorRequestIds/);
  assert.match(debtsPanel, /preserveCollaboratorDetails/);
  assert.match(debtsPanel, /disabled=\{controlsLocked\}/);
  assert.match(debtsPanel, /role: "admin" \| "sales"/);
  assert.doesNotMatch(debtsPanel, /if \(role === "sales" && isCollaboratorDebt\(debt\)\)/);
  assert.doesNotMatch(debtsPanel, /data\.debts\.filter\(\(debt\) => !isCollaboratorDebt\(debt\)\)/);
  assert.match(debtsPanel, /Cobra saldos o registra abonos parciales de clientes y colaboradores/);
  assert.doesNotMatch(debtsPanel, /collaborator-collection-notice|quedan visibles como respaldo|El perfil Ventas no puede cobrarlo ni abonarlo/);
  assert.match(todaySalesPanel, /fetch\(`\/api\/sales\/today\?\$\{query\.toString\(\)\}`/);
  assert.match(todaySalesPanel, /limit: "20"/);
  assert.match(todaySalesPanel, /Ventas de hoy/);
  assert.match(todaySalesPanel, /Hora Chile/);
  assert.match(todaySalesPanel, /Medio registrado/);
  assert.match(todaySalesPanel, /Saldo pendiente/);
  assert.match(todaySalesPanel, /debtorCollaborator: string \| null/);
  assert.match(todaySalesPanel, /const isCollaboratorConsumption = sale\.checkoutMethod === "colaborador"/);
  assert.match(todaySalesPanel, /Consumo de colaborador/);
  assert.match(todaySalesPanel, /Resumen de ventas y caja del día/);
  assert.match(todaySalesPanel, /page\.summary\.settlementClp/);
  assert.match(todaySalesPanel, /Abonos incluidos en dinero recibido/);
  assert.match(todaySalesPanel, /no se suma nuevamente/);
  assert.match(todaySalesPanel, /El consumo queda fuera; cada abono recibido sí entra a caja/);
  assert.match(todaySalesPanel, /Transferencias por validar/);
  assert.match(todaySalesPanel, /Validar con correo/);
  assert.match(todaySalesPanel, /Confirmar pago recibido/);
  assert.match(todaySalesPanel, /Abrir correo de pagos de Mercado Pago/);
  assert.match(todaySalesPanel, /subject%3A%22Recibiste\+un\+pago%22/);
  assert.match(todaySalesPanel, /formatClp\(sale\.paidClp\)/);
  assert.match(todaySalesPanel, /formatClp\(sale\.balanceClp\)/);
  assert.match(todaySalesPanel, /sale\.debtorCollaborator \|\| "Colaborador sin identificar"/);
  assert.match(todaySalesPanel, /isCollaboratorConsumption \? \(\s*<>/);
  assert.doesNotMatch(todaySalesPanel, /page\.sales\.filter\(\(sale\) => sale\.checkoutMethod !== "colaborador"\)/);
  assert.match(todaySalesPanel, /Cargar más/);
  assert.match(todaySalesPanel, /new Set\(current\.sales\.map\(\(sale\) => sale\.id\)\)/);
  assert.match(todaySalesPanel, /timeZone: "America\/Santiago"/);
  assert.match(todaySalesPanel, /aria-live="polite"/);
  assert.match(todaySalesPanel, /headingRef\.current\?\.focus\(\)/);
  assert.match(todaySalesPanel, /ref=\{headingRef\} tabIndex=\{-1\}/);
  assert.doesNotMatch(todaySalesPanel, /debtNote/);
  assert.match(salesHistoryPanel, /fetch\(`\/api\/sales\/history\?\$\{makeQuery\(filters, cursor\)\}`/);
  assert.match(salesHistoryPanel, /dateFrom/);
  assert.match(salesHistoryPanel, /paymentStatus/);
  assert.match(salesHistoryPanel, /Medio de registro/);
  assert.match(salesHistoryPanel, /Detalle de ventas/);
  assert.match(salesHistoryPanel, /Cargar más/);
  assert.match(salesHistoryPanel, /new Set\(current\.sales\.map\(\(sale\) => sale\.id\)\)/);
  assert.match(salesHistoryPanel, /\.payments\.at\(-1\)/);
  assert.match(salesHistoryPanel, /timeZone: "America\/Santiago"/);
  assert.match(salesHistoryPanel, /aria-live="polite"/);
  assert.match(salesHistoryPanel, /filtersForRange\(focusDate \?\? defaultDateFrom, focusDate \?\? defaultDateTo\)/);
  assert.match(salesHistoryPanel, /exportReport\(appliedFilters\)/);
  assert.match(salesHistoryPanel, /Exportar a Excel/);
  assert.match(salesReportsPanel, /fetch\(`\/api\/sales\/reports\/daily\?\$\{reportQuery\(range\)\}`/);
  assert.match(salesReportsPanel, /fetch\(`\/api\/sales\/reports\/export\.xlsx\?\$\{query\.toString\(\)\}`/);
  assert.match(salesReportsPanel, /Reportes de ventas/);
  assert.match(salesReportsPanel, /role="tablist"/);
  assert.match(salesReportsPanel, /role="tabpanel"/);
  assert.match(salesReportsPanel, /aria-controls="sales-report-detail-panel"/);
  assert.match(salesReportsPanel, /hidden=\{activeTab !== "detail"\}/);
  assert.match(salesReportsPanel, /Ventas originadas/);
  assert.match(salesReportsPanel, /Cobros recibidos ese día/);
  assert.match(salesReportsPanel, /Los abonos incluyen cobros de clientes y colaboradores, aunque el consumo se haya originado antes/);
  assert.match(salesReportsPanel, /day\.settlementClp/);
  assert.match(salesReportsPanel, /Abonos cobrados/);
  assert.match(salesReportsPanel, /Ver detalle/);
  assert.match(salesReportsPanel, /setDetailRequestId/);
  assert.match(salesReportsPanel, /trendMaximum > 0/);
  assert.match(salesReportsPanel, /day\.totalSalesClp === 0/);
  assert.match(salesReportsPanel, /timeZone: "America\/Santiago"/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /prepare-deploy-migrations\.mjs/);
  assert.match(sourceIncidentsMigration, /CREATE TRIGGER/);
  assert.match(sourceStockMigration, /CREATE TRIGGER/);
  assert.doesNotMatch(deployedIncidentsMigration, /CREATE TRIGGER/);
  assert.doesNotMatch(deployedStockMigration, /CREATE TRIGGER/);
  assert.equal(JSON.parse(wrangler).assets?.binding, "ASSETS");
  assert.equal(JSON.parse(wrangler).assets?.run_worker_first, true);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/_sites-preview/preview.css", import.meta.url)));
  await access(projectRoot);
});
