import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../worker/basic-auth.ts", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "worker/basic-auth.ts",
}).outputText;
function moduleUrl(moduleSource) {
  return `data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`;
}

const authModuleUrl = moduleUrl(output);
const auth = await import(authModuleUrl);

const workerSource = await readFile(
  new URL("../worker/index.ts", import.meta.url),
  "utf8",
);
let workerOutput = ts.transpileModule(workerSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "worker/index.ts",
}).outputText;
const handlerModuleUrl = moduleUrl(`
  export default {
    async fetch(request, env) {
      globalThis.__cafeteriaWorkerRequests?.push({
        method: request.method,
        pathname: new URL(request.url).pathname,
        origin: request.headers.get("origin"),
        role: request.headers.get("x-demogym-auth-role"),
      });
      const payload = {
        method: request.method,
        pathname: new URL(request.url).pathname,
        role: request.headers.get("x-demogym-auth-role"),
      };
      if (env?.SCHEDULED_RESPONSE_DETAIL) {
        payload.detail = env.SCHEDULED_RESPONSE_DETAIL;
      }
      return Response.json(payload, {
        status: Number(env?.SCHEDULED_RESPONSE_STATUS ?? 200),
      });
    },
  };
`);
const imageModuleUrl = moduleUrl(`
  export const DEFAULT_DEVICE_SIZES = [];
  export const DEFAULT_IMAGE_SIZES = [];
  export async function handleImageOptimization() {
    return new Response("unused");
  }
`);
for (const [specifier, replacement] of [
  ["vinext/server/image-optimization", imageModuleUrl],
  ["vinext/server/app-router-entry", handlerModuleUrl],
  ["./basic-auth", authModuleUrl],
]) {
  workerOutput = workerOutput.replaceAll(`"${specifier}"`, JSON.stringify(replacement));
  workerOutput = workerOutput.replaceAll(`'${specifier}'`, JSON.stringify(replacement));
}
const { default: worker } = await import(moduleUrl(workerOutput));

const apiAuthSource = await readFile(
  new URL("../app/api/_auth.ts", import.meta.url),
  "utf8",
);
const apiAuthOutput = ts.transpileModule(apiAuthSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "app/api/_auth.ts",
}).outputText;
const apiAuth = await import(
  `data:text/javascript;base64,${Buffer.from(apiAuthOutput).toString("base64")}`
);
const debtsRouteSource = await readFile(
  new URL("../app/api/debts/route.ts", import.meta.url),
  "utf8",
);
const settleRouteSource = await readFile(
  new URL("../app/api/debts/[saleId]/settle/route.ts", import.meta.url),
  "utf8",
);
const salesHistoryRouteSource = await readFile(
  new URL("../app/api/sales/history/route.ts", import.meta.url),
  "utf8",
);
const todaySalesRouteSource = await readFile(
  new URL("../app/api/sales/today/route.ts", import.meta.url),
  "utf8",
);
const validateTransferRouteSource = await readFile(
  new URL(
    "../app/api/sales/[saleId]/validate-transfer/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const voidSaleRouteSource = await readFile(
  new URL("../app/api/sales/[saleId]/void/route.ts", import.meta.url),
  "utf8",
);
const dailySalesReportRouteSource = await readFile(
  new URL("../app/api/sales/reports/daily/route.ts", import.meta.url),
  "utf8",
);
const salesExportRouteSource = await readFile(
  new URL("../app/api/sales/reports/export.xlsx/route.ts", import.meta.url),
  "utf8",
);
const cashClosuresRouteSource = await readFile(
  new URL("../app/api/cash-closures/route.ts", import.meta.url),
  "utf8",
);
const cashClosureValidationRouteSource = await readFile(
  new URL(
    "../app/api/cash-closures/[closureId]/validate/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const cashClosureRevisionsRouteSource = await readFile(
  new URL(
    "../app/api/cash-closures/[closureId]/revisions/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const productStockEntryRouteSource = await readFile(
  new URL(
    "../app/api/products/[id]/stock-entry/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const ingredientStockEntryRouteSource = await readFile(
  new URL(
    "../app/api/ingredients/[id]/stock-entry/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const closureIncidentRouteSources = await Promise.all(
  [
    "../app/api/closure-incidents/route.ts",
    "../app/api/closure-incidents/[incidentId]/route.ts",
    "../app/api/closure-incidents/[incidentId]/events/route.ts",
    "../app/api/closure-incidents/[incidentId]/notifications/[deliveryId]/retry/route.ts",
    "../app/api/closure-incidents/notifications/process/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const whatsAppWebhookRouteSource = await readFile(
  new URL("../app/api/webhooks/whatsapp/route.ts", import.meta.url),
  "utf8",
);
const viteConfigSource = await readFile(
  new URL("../vite.config.ts", import.meta.url),
  "utf8",
);

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function requestWithCredentials(credentials) {
  return new Request("https://example.test/", {
    headers: { authorization: `Basic ${btoa(credentials)}` },
  });
}

async function requestThroughWorker({
  path,
  method = "GET",
  role,
  spoofedRole,
}) {
  const adminCredentials = "admin-prueba:clave-admin-prueba";
  const salesCredentials = "ventas-prueba:clave-ventas-prueba";
  const headers = new Headers({
    authorization: `Basic ${btoa(
      role === "admin" ? adminCredentials : salesCredentials,
    )}`,
  });
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("origin", "https://example.test");
  }
  if (spoofedRole) headers.set("x-demogym-auth-role", spoofedRole);

  return worker.fetch(
    new Request(`https://example.test${path}`, { method, headers }),
    {
      ASSETS: { fetch: async () => new Response("unused") },
      BASIC_AUTH_SHA256: await sha256Hex(adminCredentials),
      BASIC_AUTH_SALES_SHA256: await sha256Hex(salesCredentials),
      DB: {},
      IMAGES: {},
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("autentica las credenciales Basic con su rol correspondiente", async () => {
  const adminHash = await sha256Hex("admin-prueba:clave-admin-prueba");
  const salesHash = await sha256Hex("ventas-prueba:clave-ventas-prueba");

  assert.equal(
    await auth.authenticateBasicRole(
      requestWithCredentials("admin-prueba:clave-admin-prueba"),
      adminHash,
      salesHash,
    ),
    "admin",
  );
  assert.equal(
    await auth.authenticateBasicRole(
      requestWithCredentials("ventas-prueba:clave-ventas-prueba"),
      adminHash,
      salesHash,
    ),
    "sales",
  );
  assert.equal(
    await auth.authenticateBasicRole(
      requestWithCredentials("ventas-prueba:clave-incorrecta"),
      adminHash,
      salesHash,
    ),
    null,
  );
  assert.equal(
    await auth.authenticateBasicRole(
      new Request("https://example.test/"),
      adminHash,
      salesHash,
    ),
    null,
  );
  assert.equal(
    await auth.authenticateBasicRole(
      new Request("https://example.test/", {
        headers: { authorization: "Basic !!!" },
      }),
      adminHash,
      salesHash,
    ),
    null,
  );
});

test("exige dos hashes válidos y diferentes para habilitar los roles", async () => {
  const challenge = auth.basicAuthChallenge();
  assert.equal(challenge.status, 401);
  assert.match(challenge.headers.get("www-authenticate") ?? "", /^Basic\b/);
  assert.equal(challenge.headers.get("cache-control"), "no-store");

  assert.equal(auth.authConfigurationError().status, 503);
  assert.equal(auth.isBasicAuthConfigured(undefined), false);
  assert.equal(auth.isBasicAuthConfigured("not-a-sha256-hash"), false);
  assert.equal(auth.isBasicAuthConfigured("a".repeat(64)), true);
  assert.equal(
    auth.areBasicAuthRolesConfigured("a".repeat(64), "b".repeat(64)),
    true,
  );
  assert.equal(
    auth.areBasicAuthRolesConfigured("a".repeat(64), undefined),
    false,
  );
  assert.equal(
    auth.areBasicAuthRolesConfigured("a".repeat(64), "A".repeat(64)),
    false,
  );

  assert.equal(
    await auth.authenticateBasicRole(
      requestWithCredentials("admin-prueba:clave-admin-prueba"),
      "a".repeat(64),
      "A".repeat(64),
    ),
    null,
  );
});

test("reemplaza cualquier rol inyectado por el rol verificado", () => {
  const forged = new Request("https://example.test/api/pos", {
    headers: {
      "x-demogym-auth-role": "admin",
      "x-request-marker": "preserved",
    },
  });
  const trusted = auth.withTrustedAuthRole(forged, "sales");

  assert.equal(trusted.headers.get("x-demogym-auth-role"), "sales");
  assert.equal(trusted.headers.get("x-request-marker"), "preserved");
});

test("la ACL reserva administración y deja libre el flujo de venta", () => {
  for (const path of [
    "/api/products",
    "/api/products/producto-1",
    "/api/products/producto-1/stock-entry",
    "/api/ingredients",
    "/api/ingredients/insumo-1/stock-entry",
    "/api/sales/history",
    "/api/sales/history/export",
    "/api/sales/reports",
    "/api/sales/reports/daily",
    "/api/sales/reports/export.xlsx",
    "/api/cash-closures/cierre-1/revisions",
    "/api/closure-incidents",
    "/api/closure-incidents/incident:cierre-1",
    "/api/closure-incidents/incident:cierre-1/events",
    "/api/closure-incidents/incident:cierre-1/notifications/envio-1/retry",
    "/api/closure-incidents/notifications/process",
  ]) {
    assert.equal(auth.isAdminOnlyApiPath(path), true, path);
  }

  assert.equal(auth.isAdminOnlyApiPath("/api/pos"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/today"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/debts"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/debts/venta-1/settle"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/cash-closures"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/cash-closures/preview"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1"), false);
  assert.equal(
    auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1/validate"),
    true,
  );
  assert.equal(
    auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1/validate/extra"),
    false,
  );
  assert.equal(
    auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1/revisions/extra"),
    false,
  );
  assert.equal(auth.isAdminOnlyApiPath("/api/auth/switch-profile"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/products-public"), false);
  assert.equal(auth.forbiddenRoleResponse().status, 403);
});

test("solo Administración puede registrar entradas aditivas de stock", async () => {
  for (const [routeSource, functionName] of [
    [productStockEntryRouteSource, "addProductStockEntry"],
    [ingredientStockEntryRouteSource, "addIngredientStockEntry"],
  ]) {
    assert.match(routeSource, /export async function POST/);
    assert.match(routeSource, /requireAdmin\(request\)/);
    assert.doesNotMatch(routeSource, /getAuthRole\(request\)/);
    assert.match(routeSource, new RegExp(`${functionName}\\(`));
    assert.match(routeSource, /result\.idempotent \? 200 : 201/);
    assert.match(routeSource, /noStoreJson\(result/);
  }

  for (const path of [
    "/api/products/producto-1/stock-entry",
    "/api/ingredients/insumo-1/stock-entry",
  ]) {
    const denied = await requestThroughWorker({
      path,
      method: "POST",
      role: "sales",
    });
    assert.equal(denied.status, 403, `Ventas POST ${path}`);

    const forged = await requestThroughWorker({
      path,
      method: "POST",
      role: "sales",
      spoofedRole: "admin",
    });
    assert.equal(forged.status, 403, `rol inyectado POST ${path}`);

    const allowed = await requestThroughWorker({
      path,
      method: "POST",
      role: "admin",
    });
    assert.equal(allowed.status, 200, `Administración POST ${path}`);
    assert.equal((await allowed.json()).role, "admin");
  }
});

test("Ventas puede cuadrar el turno activo pero no abrir reportes administrativos", () => {
  assert.match(cashClosuresRouteSource, /getAuthRole\(request\)/);
  assert.doesNotMatch(cashClosuresRouteSource, /requireAdmin\(request\)/);
  assert.match(cashClosuresRouteSource, /Ventas solo puede revisar la cuadratura del turno activo/);
  assert.match(cashClosuresRouteSource, /role === "admin"\s*\? listCashClosurePage/);
  assert.match(cashClosuresRouteSource, /role === "sales" && preview\.closed/);
  assert.match(cashClosuresRouteSource, /\{ status: 409 \}/);
  assert.equal(auth.isAdminOnlyPagePath("/reportes"), true);
  assert.equal(auth.isAdminOnlyPagePath("/reportes/ventas"), true);
  assert.equal(auth.isAdminOnlyPagePath("/incidencias-cierres"), true);
  assert.equal(auth.isAdminOnlyPagePath("/incidencias-cierres/caso-1"), true);
  assert.equal(auth.isAdminOnlyPagePath("/cierre-caja"), false);
  assert.equal(auth.isAdminOnlyPagePath("/"), false);
});

test("incidencias queda reservada a Administración y el webhook usa autenticación propia", async () => {
  for (const routeSource of closureIncidentRouteSources) {
    assert.match(routeSource, /requireAdmin\(request\)/);
  }
  assert.match(closureIncidentRouteSources[0], /listClosureIncidents\(/);
  assert.match(closureIncidentRouteSources[0], /updateClosureIncidentSettings\(/);
  assert.match(closureIncidentRouteSources[2], /appendClosureIncidentEvent\(/);
  assert.match(closureIncidentRouteSources[3], /retryWhatsAppDelivery\(/);
  assert.match(closureIncidentRouteSources[4], /processDueNotificationPolicies\(/);

  for (const [path, method] of [
    ["/api/closure-incidents", "GET"],
    ["/api/closure-incidents", "PATCH"],
    ["/api/closure-incidents/incident:cierre-1", "GET"],
    ["/api/closure-incidents/incident:cierre-1/events", "POST"],
    [
      "/api/closure-incidents/incident:cierre-1/notifications/envio-1/retry",
      "POST",
    ],
    ["/api/closure-incidents/notifications/process", "POST"],
  ]) {
    const denied = await requestThroughWorker({ path, method, role: "sales" });
    assert.equal(denied.status, 403, `Ventas ${method} ${path}`);
    const forged = await requestThroughWorker({
      path,
      method,
      role: "sales",
      spoofedRole: "admin",
    });
    assert.equal(forged.status, 403, `rol inyectado ${method} ${path}`);
    const allowed = await requestThroughWorker({ path, method, role: "admin" });
    assert.equal(allowed.status, 200, `Administración ${method} ${path}`);
    assert.equal((await allowed.json()).role, "admin");
  }

  assert.match(workerSource, /url\.pathname === "\/api\/webhooks\/whatsapp"/);
  assert.match(whatsAppWebhookRouteSource, /config\.webhookVerifyToken/);
  assert.match(whatsAppWebhookRouteSource, /verifyWhatsAppWebhookSignature\(/);
  assert.match(whatsAppWebhookRouteSource, /x-hub-signature-256/);
  assert.match(whatsAppWebhookRouteSource, /MAX_WEBHOOK_BYTES/);
  assert.doesNotMatch(whatsAppWebhookRouteSource, /requireAdmin\(request\)/);

  const webhookResponse = await worker.fetch(
    new Request("https://example.test/api/webhooks/whatsapp", {
      method: "POST",
    }),
    {
      ASSETS: { fetch: async () => new Response("unused") },
      DB: {},
      IMAGES: {},
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
  assert.equal(webhookResponse.status, 200);
  assert.deepEqual(await webhookResponse.json(), {
    method: "POST",
    pathname: "/api/webhooks/whatsapp",
    role: null,
  });
});

test("el cron horario procesa notificaciones con rol interno y reporta fallos sin filtrar el cuerpo", async () => {
  assert.match(viteConfigSource, /crons:\s*\["7 \* \* \* \*"\]/);
  assert.match(workerSource, /async scheduled\(/);
  assert.match(
    workerSource,
    /\/api\/closure-incidents\/notifications\/process/,
  );
  assert.match(workerSource, /withTrustedAuthRole\([\s\S]*?"admin"/);
  assert.match(workerSource, /if \(!response\.ok\)/);

  const requests = [];
  globalThis.__cafeteriaWorkerRequests = requests;
  const successfulWaits = [];
  await worker.scheduled(
    { cron: "7 * * * *", scheduledTime: Date.now(), noRetry() {} },
    {
      ASSETS: { fetch: async () => new Response("unused") },
      DB: {},
      IMAGES: {},
    },
    {
      waitUntil(promise) {
        successfulWaits.push(promise);
      },
      passThroughOnException() {},
    },
  );
  assert.equal(successfulWaits.length, 1);
  await successfulWaits[0];
  assert.deepEqual(requests, [
    {
      method: "POST",
      pathname: "/api/closure-incidents/notifications/process",
      origin: "https://scheduler.demogymcafe.invalid",
      role: "admin",
    },
  ]);

  const failedWaits = [];
  await worker.scheduled(
    { cron: "7 * * * *", scheduledTime: Date.now(), noRetry() {} },
    {
      ASSETS: { fetch: async () => new Response("unused") },
      DB: {},
      IMAGES: {},
      SCHEDULED_RESPONSE_STATUS: 503,
      SCHEDULED_RESPONSE_DETAIL: "credencial-super-secreta",
    },
    {
      waitUntil(promise) {
        failedWaits.push(promise);
      },
      passThroughOnException() {},
    },
  );
  assert.equal(failedWaits.length, 1);
  await assert.rejects(
    failedWaits[0],
    (error) =>
      /status 503/i.test(error.message) &&
      !error.message.includes("credencial-super-secreta"),
  );
  delete globalThis.__cafeteriaWorkerRequests;
});

test("solo Administración puede validar una entrega de turno en ambas capas", () => {
  assert.match(cashClosureValidationRouteSource, /requireAdmin\(request\)/);
  assert.doesNotMatch(cashClosureValidationRouteSource, /getAuthRole\(request\)/);
  assert.match(cashClosureValidationRouteSource, /validateCashClosure\(/);

  const adminRequest = new Request(
    "https://example.test/api/cash-closures/cierre-1/validate",
    { headers: { "x-demogym-auth-role": "admin" } },
  );
  const salesRequest = new Request(
    "https://example.test/api/cash-closures/cierre-1/validate",
    { headers: { "x-demogym-auth-role": "sales" } },
  );
  assert.equal(apiAuth.requireAdmin(adminRequest), null);
  assert.equal(apiAuth.requireAdmin(salesRequest)?.status, 403);
  assert.equal(
    auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1/validate"),
    true,
  );
  assert.equal(auth.isAdminOnlyApiPath("/api/cash-closures"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/cash-closures/cierre-1"), false);
});

test("solo Administración puede consultar o corregir revisiones de cierre", async () => {
  assert.match(cashClosureRevisionsRouteSource, /export async function GET/);
  assert.match(cashClosureRevisionsRouteSource, /export async function POST/);
  assert.equal(
    cashClosureRevisionsRouteSource.match(/requireAdmin\(request\)/g)?.length,
    2,
  );
  assert.doesNotMatch(cashClosureRevisionsRouteSource, /getAuthRole\(request\)/);
  assert.match(cashClosureRevisionsRouteSource, /getCashClosureRevisionContext\(/);
  assert.match(cashClosureRevisionsRouteSource, /createCashClosureRevision\(/);

  const revisionsPath = "/api/cash-closures/cierre-1/revisions";
  for (const method of ["GET", "POST"]) {
    const denied = await requestThroughWorker({
      path: revisionsPath,
      method,
      role: "sales",
    });
    assert.equal(denied.status, 403, `Ventas ${method}`);

    const forged = await requestThroughWorker({
      path: revisionsPath,
      method,
      role: "sales",
      spoofedRole: "admin",
    });
    assert.equal(forged.status, 403, `encabezado inyectado ${method}`);

    const allowed = await requestThroughWorker({
      path: revisionsPath,
      method,
      role: "admin",
      spoofedRole: "sales",
    });
    assert.equal(allowed.status, 200, `Administración ${method}`);
    assert.deepEqual(await allowed.json(), {
      method,
      pathname: revisionsPath,
      role: "admin",
    });
  }

  for (const method of ["GET", "POST"]) {
    const base = await requestThroughWorker({
      path: "/api/cash-closures",
      method,
      role: "sales",
      spoofedRole: "admin",
    });
    assert.equal(base.status, 200, `cierre base ${method}`);
    assert.equal((await base.json()).role, "sales");
  }

  assert.equal(
    (
      await requestThroughWorker({
        path: "/api/cash-closures/cierre-1/validate",
        method: "POST",
        role: "sales",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await requestThroughWorker({
        path: "/api/cash-closures/cierre-1/validate",
        method: "POST",
        role: "admin",
      })
    ).status,
    200,
  );
});

test("Ventas no recibe el comentario de validación al reintentar un cierre", () => {
  assert.match(cashClosuresRouteSource, /role === "sales"/);
  assert.match(cashClosuresRouteSource, /validation: null/);
  assert.match(cashClosuresRouteSource, /collaboratorClp: 0/);
  assert.match(cashClosuresRouteSource, /collaboratorCount: 0/);
  assert.match(cashClosuresRouteSource, /pendingCollaborators: \[\]/);
  assert.doesNotMatch(
    cashClosuresRouteSource,
    /role === "sales"[\s\S]{0,400}validationStatus\s*:/,
  );
});

test("la ruta de cambio de perfil redirige solo a destinos internos", () => {
  assert.equal(auth.isProfileSwitchPath("/api/auth/switch-profile"), true);
  assert.equal(auth.isProfileSwitchPath("/api/auth/switch-profile/extra"), false);
  assert.equal(auth.shouldCompleteProfileSwitch(new Request("https://example.test/")), false);
  assert.equal(
    auth.shouldCompleteProfileSwitch(
      new Request("https://example.test/", {
        headers: { cookie: "other=1; demogymcafe_profile_switch=1" },
      }),
    ),
    true,
  );

  const challenge = auth.profileSwitchChallenge();
  assert.equal(challenge.status, 401);
  assert.match(challenge.headers.get("set-cookie") ?? "", /demogymcafe_profile_switch=1/);
  assert.match(challenge.headers.get("www-authenticate") ?? "", /^Basic\b/);

  const response = auth.profileSwitchRedirect(
    new Request("https://example.test/api/auth/switch-profile?returnTo=%2Fventas%3Fdia%3Dhoy%23ticket"),
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("location"), "/ventas?dia=hoy#ticket");
  assert.match(response.headers.get("set-cookie") ?? "", /demogymcafe_profile_switch=; Max-Age=0/);

  const external = auth.profileSwitchRedirect(
    new Request("https://example.test/api/auth/switch-profile?returnTo=https://evil.test/"),
  );
  assert.equal(external.headers.get("location"), "/");

  const loop = auth.profileSwitchRedirect(
    new Request("https://example.test/api/auth/switch-profile?returnTo=/api/auth/switch-profile"),
  );
  assert.equal(loop.headers.get("location"), "/");
});

test("el historial de ventas queda reservado al administrador en ambas capas", () => {
  assert.match(salesHistoryRouteSource, /requireAdmin\(request\)/);
  assert.doesNotMatch(salesHistoryRouteSource, /getAuthRole\(request\)/);

  const adminRequest = new Request("https://example.test/api/sales/history", {
    headers: { "x-demogym-auth-role": "admin" },
  });
  const salesRequest = new Request("https://example.test/api/sales/history", {
    headers: { "x-demogym-auth-role": "sales" },
  });
  assert.equal(apiAuth.requireAdmin(adminRequest), null);
  assert.equal(apiAuth.requireAdmin(salesRequest)?.status, 403);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/history"), true);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales"), false);
});

test("Ventas de hoy exige autenticación pero permite Admin y Ventas", () => {
  assert.match(todaySalesRouteSource, /getAuthRole\(request\)/);
  assert.doesNotMatch(todaySalesRouteSource, /requireAdmin\(request\)/);
  assert.match(todaySalesRouteSource, /listTodaySales\(/);
  assert.match(todaySalesRouteSource, /listTodaySales\(database, \{[\s\S]*?role,/);

  const adminRequest = new Request("https://example.test/api/sales/today", {
    headers: { "x-demogym-auth-role": "admin" },
  });
  const salesRequest = new Request("https://example.test/api/sales/today", {
    headers: { "x-demogym-auth-role": "sales" },
  });
  const anonymousRequest = new Request("https://example.test/api/sales/today");
  assert.equal(apiAuth.requireAuthenticatedRole(adminRequest), null);
  assert.equal(apiAuth.requireAuthenticatedRole(salesRequest), null);
  const anonymous = apiAuth.requireAuthenticatedRole(anonymousRequest);
  assert.equal(anonymous?.status, 401);
  assert.equal(anonymous?.headers.get("cache-control"), "no-store");
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/today"), false);
});

test("Admin y Ventas pueden validar transferencias sin convertir la ruta en administrativa", () => {
  assert.match(validateTransferRouteSource, /getAuthRole\(request\)/);
  assert.doesNotMatch(validateTransferRouteSource, /requireAdmin\(request\)/);
  assert.match(validateTransferRouteSource, /validateTransferPayment\(/);
  assert.match(validateTransferRouteSource, /validateTransferValidationPayload\(/);

  const adminRequest = new Request(
    "https://example.test/api/sales/venta-1/validate-transfer",
    { headers: { "x-demogym-auth-role": "admin" } },
  );
  const salesRequest = new Request(
    "https://example.test/api/sales/venta-1/validate-transfer",
    { headers: { "x-demogym-auth-role": "sales" } },
  );
  const anonymousRequest = new Request(
    "https://example.test/api/sales/venta-1/validate-transfer",
  );
  assert.equal(apiAuth.requireAuthenticatedRole(adminRequest), null);
  assert.equal(apiAuth.requireAuthenticatedRole(salesRequest), null);
  assert.equal(apiAuth.requireAuthenticatedRole(anonymousRequest)?.status, 401);
  assert.equal(
    auth.isAdminOnlyApiPath("/api/sales/venta-1/validate-transfer"),
    false,
  );
});

test("solo Administración puede anular una venta y la ACL no captura otras rutas", async () => {
  assert.match(voidSaleRouteSource, /export async function POST/);
  assert.match(voidSaleRouteSource, /requireAdmin\(request\)/);
  assert.doesNotMatch(voidSaleRouteSource, /getAuthRole\(request\)/);
  assert.match(voidSaleRouteSource, /voidSale\(/);
  assert.match(voidSaleRouteSource, /noStoreJson\(\{/);
  assert.match(voidSaleRouteSource, /La venta ya estaba anulada/);

  assert.equal(auth.isAdminOnlyApiPath("/api/sales/venta-1/void"), true);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/venta-1/void/extra"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/today"), false);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales"), false);

  const denied = await requestThroughWorker({
    path: "/api/sales/venta-1/void",
    method: "POST",
    role: "sales",
  });
  assert.equal(denied.status, 403);

  const forged = await requestThroughWorker({
    path: "/api/sales/venta-1/void",
    method: "POST",
    role: "sales",
    spoofedRole: "admin",
  });
  assert.equal(forged.status, 403);

  const allowed = await requestThroughWorker({
    path: "/api/sales/venta-1/void",
    method: "POST",
    role: "admin",
  });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).role, "admin");
});

test("los reportes y la exportación Excel quedan reservados al administrador", () => {
  for (const routeSource of [
    dailySalesReportRouteSource,
    salesExportRouteSource,
  ]) {
    assert.match(routeSource, /requireAdmin\(request\)/);
    assert.doesNotMatch(routeSource, /getAuthRole\(request\)/);
  }
  assert.match(salesExportRouteSource, /Content-Disposition/);
  assert.match(salesExportRouteSource, /filename\*=UTF-8''/);
  assert.match(salesExportRouteSource, /\.xlsx`/);
  assert.match(salesExportRouteSource, /"Content-Type": XLSX_MIME/);
  assert.match(salesExportRouteSource, /"Cache-Control": "no-store"/);
  assert.match(salesExportRouteSource, /X-Content-Type-Options/);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/reports/daily"), true);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales/reports/export.xlsx"), true);
  assert.equal(auth.isAdminOnlyApiPath("/api/sales"), false);
});

test("las rutas de deudas permiten a Ventas listar y abonar cuentas de colaboradores", () => {
  for (const routeSource of [debtsRouteSource, settleRouteSource]) {
    assert.match(routeSource, /getAuthRole\(request\)/);
    assert.doesNotMatch(routeSource, /requireAdmin/);
    assert.match(routeSource, /No autenticado/);
  }
  assert.equal(
    apiAuth.getAuthRole(
      new Request("https://example.test/api/debts", {
        headers: { "x-demogym-auth-role": "sales" },
      }),
    ),
    "sales",
  );
  assert.match(settleRouteSource, /const role = getAuthRole\(request\)/);
  assert.match(debtsRouteSource, /const role = getAuthRole\(request\)/);
  assert.match(debtsRouteSource, /listPendingDebts\(database, \{[\s\S]*?role,/);
  assert.match(debtsRouteSource, /rawKind !== "all"/);
  assert.match(debtsRouteSource, /url\.searchParams\.get\("collaborator"\)/);
  assert.match(debtsRouteSource, /kind: rawKind/);
  assert.match(debtsRouteSource, /collaborator,/);
  assert.match(
    settleRouteSource,
    /settleDebt\(database, saleId, input, role\)/,
  );
  assert.equal(auth.isAdminOnlyApiPath("/api/debts"), false);
  assert.equal(
    auth.isAdminOnlyApiPath("/api/debts/venta-1/settle"),
    false,
  );
});

test("las rutas de servidor solo reconocen el encabezado interno de administrador", async () => {
  const adminRequest = new Request("https://example.test/api/products", {
    headers: { "x-demogym-auth-role": "admin" },
  });
  const salesRequest = new Request("https://example.test/api/products", {
    headers: { "x-demogym-auth-role": "sales" },
  });
  const unknownRequest = new Request("https://example.test/api/products", {
    headers: { "x-demogym-auth-role": "owner" },
  });

  assert.equal(apiAuth.getAuthRole(adminRequest), "admin");
  assert.equal(apiAuth.getAuthRole(salesRequest), "sales");
  assert.equal(apiAuth.getAuthRole(unknownRequest), null);
  assert.equal(apiAuth.requireAdmin(adminRequest), null);

  const denied = apiAuth.requireAdmin(salesRequest);
  assert.equal(denied?.status, 403);
  assert.equal(denied?.headers.get("cache-control"), "no-store");
  assert.deepEqual(await denied?.json(), {
    error: "Tu perfil no tiene permisos de administración.",
  });
});

test("las escrituras solo aceptan el mismo origen", () => {
  assert.equal(
    auth.hasTrustedMutationOrigin(new Request("https://control.example/")),
    true,
  );
  assert.equal(
    auth.hasTrustedMutationOrigin(
      new Request("https://control.example/api/sales", {
        method: "POST",
        headers: { origin: "https://control.example" },
      }),
    ),
    true,
  );
  assert.equal(
    auth.hasTrustedMutationOrigin(
      new Request("https://control.example/api/sales", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    ),
    false,
  );
  assert.equal(
    auth.hasTrustedMutationOrigin(
      new Request("https://control.example/api/sales", { method: "POST" }),
    ),
    false,
  );
  assert.equal(auth.untrustedOriginResponse().status, 403);
});
