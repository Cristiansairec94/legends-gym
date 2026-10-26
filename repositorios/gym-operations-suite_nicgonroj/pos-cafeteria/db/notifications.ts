import {
  getClosureIncident,
  getClosureIncidentSettings,
  type ClosureIncidentDetail,
  type ClosureNotificationDelivery,
} from "./incidents";
import { PosError } from "./errors";

export type WhatsAppEnvironment = {
  WHATSAPP_ENABLED?: string;
  WHATSAPP_GRAPH_API_VERSION?: string;
  WHATSAPP_API_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_WABA_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
  WHATSAPP_ADMIN_RECIPIENTS?: string;
  WHATSAPP_GROUPS_ENABLED?: string;
  WHATSAPP_GROUP_IDS?: string;
  WHATSAPP_ALERT_TEMPLATE_NAME?: string;
  WHATSAPP_REMINDER_TEMPLATE_NAME?: string;
  WHATSAPP_DAILY_TEMPLATE_NAME?: string;
  WHATSAPP_TEMPLATE_LANGUAGE?: string;
  WHATSAPP_UTILITY_TTL_SECONDS?: string;
  WHATSAPP_MAX_RETRIES?: string;
  APP_PUBLIC_URL?: string;
};

export type WhatsAppRecipient = {
  type: "individual" | "group";
  id: string;
};

export type WhatsAppConfig = {
  enabled: boolean;
  graphApiVersion: string;
  accessToken: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  appSecret: string | null;
  webhookVerifyToken: string | null;
  recipients: WhatsAppRecipient[];
  groupsEnabled: boolean;
  alertTemplateName: string | null;
  reminderTemplateName: string | null;
  dailyTemplateName: string | null;
  templateLanguage: string;
  utilityTtlSeconds: number;
  maxRetries: number;
  publicUrl: string | null;
  outboundIssues: string[];
  webhookIssues: string[];
  issues: string[];
};

type NotificationKind = ClosureNotificationDelivery["kind"];
const CLOSURE_NOTIFICATIONS_ENABLED_FROM_KEY =
  "notifications.closure-incidents.enabled-from";

type StoredDeliveryRow = {
  id: string;
  incident_id: string | null;
  closure_id: string;
  business_date: string;
  kind: NotificationKind;
  recipient_type: ClosureNotificationDelivery["recipientType"];
  recipient: string;
  idempotency_key: string;
  template_name: string | null;
  template_payload_json: string;
  message_preview: string;
  status: ClosureNotificationDelivery["status"];
  attempt_count: number;
  active_attempt_id: string | null;
  last_attempt_at: string | null;
  sent_at: string | null;
  provider_message_id: string | null;
  response_status: number | null;
  provider_response: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type StoredTemplatePayload = {
  language: string;
  parameters: string[];
};

type EnqueueTemplateInput = {
  incidentId: string | null;
  closureId: string;
  businessDate: string;
  kind: NotificationKind;
  eventKey: string;
  templateName: string | null;
  preview: string;
  parameters: string[];
};

type AttemptOutcome = "accepted" | "failed" | "ambiguous";

type StoredWebhookRow = {
  id: string;
  provider_message_id: string;
  provider_status: "sent" | "delivered" | "read" | "failed";
  provider_timestamp: number | null;
  callback_data: string | null;
  error_code: string | null;
  error_message: string | null;
  received_at: string;
};

function parseList(value: string | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  ];
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function readWhatsAppConfig(
  environment: WhatsAppEnvironment,
): WhatsAppConfig {
  const enabled = environment.WHATSAPP_ENABLED === "true";
  const groupsEnabled = environment.WHATSAPP_GROUPS_ENABLED === "true";
  const rawIndividualRecipients = parseList(
    environment.WHATSAPP_ADMIN_RECIPIENTS,
  );
  const invalidIndividualRecipients = rawIndividualRecipients.filter(
    (recipient) => !/^\+?[1-9]\d{7,14}$/u.test(recipient),
  );
  const individualRecipients = rawIndividualRecipients
    .filter((recipient) => /^\+?[1-9]\d{7,14}$/u.test(recipient))
    .slice(0, 20)
    .map((id) => ({ type: "individual" as const, id: id.replace(/^\+/u, "") }));
  const rawGroupRecipients = parseList(environment.WHATSAPP_GROUP_IDS);
  const invalidGroupRecipients = rawGroupRecipients.filter(
    (id) => !/^[A-Za-z0-9._:-]{1,100}$/u.test(id),
  );
  const groupRecipients = groupsEnabled
    ? rawGroupRecipients
        .filter((id) => /^[A-Za-z0-9._:-]{1,100}$/u.test(id))
        .slice(0, 20)
        .map((id) => ({ type: "group" as const, id }))
    : [];
  const graphApiVersion = /^v\d+\.\d+$/u.test(
    environment.WHATSAPP_GRAPH_API_VERSION ?? "",
  )
    ? (environment.WHATSAPP_GRAPH_API_VERSION as string)
    : "v23.0";
  const config: WhatsAppConfig = {
    enabled,
    graphApiVersion,
    accessToken: environment.WHATSAPP_API_TOKEN?.trim() || null,
    phoneNumberId: environment.WHATSAPP_PHONE_NUMBER_ID?.trim() || null,
    wabaId: environment.WHATSAPP_WABA_ID?.trim() || null,
    appSecret: environment.WHATSAPP_APP_SECRET?.trim() || null,
    webhookVerifyToken:
      environment.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || null,
    recipients: [...individualRecipients, ...groupRecipients],
    groupsEnabled,
    alertTemplateName:
      environment.WHATSAPP_ALERT_TEMPLATE_NAME?.trim() || null,
    reminderTemplateName:
      environment.WHATSAPP_REMINDER_TEMPLATE_NAME?.trim() ||
      environment.WHATSAPP_ALERT_TEMPLATE_NAME?.trim() ||
      null,
    dailyTemplateName:
      environment.WHATSAPP_DAILY_TEMPLATE_NAME?.trim() || null,
    templateLanguage:
      environment.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es_CL",
    utilityTtlSeconds: boundedInteger(
      environment.WHATSAPP_UTILITY_TTL_SECONDS,
      3600,
      30,
      43_200,
    ),
    maxRetries: boundedInteger(environment.WHATSAPP_MAX_RETRIES, 3, 1, 10),
    publicUrl: environment.APP_PUBLIC_URL?.trim().replace(/\/$/u, "") || null,
    outboundIssues: [],
    webhookIssues: [],
    issues: [],
  };
  if (!enabled) config.outboundIssues.push("WHATSAPP_ENABLED no está activo.");
  if (!config.accessToken) config.outboundIssues.push("Falta WHATSAPP_API_TOKEN.");
  if (!config.phoneNumberId) {
    config.outboundIssues.push("Falta WHATSAPP_PHONE_NUMBER_ID.");
  }
  if (!config.alertTemplateName) {
    config.outboundIssues.push("Falta WHATSAPP_ALERT_TEMPLATE_NAME.");
  }
  if (!config.dailyTemplateName) {
    config.outboundIssues.push("Falta WHATSAPP_DAILY_TEMPLATE_NAME para el resumen.");
  }
  if (config.recipients.length === 0) {
    config.outboundIssues.push("No hay destinatarios de WhatsApp configurados.");
  }
  if (invalidIndividualRecipients.length > 0) {
    config.outboundIssues.push("Hay teléfonos de administradores con formato inválido.");
  }
  if (rawIndividualRecipients.length > 20 || rawGroupRecipients.length > 20) {
    config.outboundIssues.push("Se permiten como máximo 20 destinatarios por tipo.");
  }
  if (invalidGroupRecipients.length > 0) {
    config.outboundIssues.push("Hay GROUP_ID con formato o longitud inválidos.");
  }
  if (groupsEnabled && groupRecipients.length === 0) {
    config.outboundIssues.push(
      "WHATSAPP_GROUPS_ENABLED está activo, pero faltan GROUP_ID oficiales.",
    );
  }
  if (groupsEnabled && !config.wabaId) {
    config.outboundIssues.push("El modo grupos requiere WHATSAPP_WABA_ID.");
  }
  if (!config.appSecret) config.webhookIssues.push("Falta WHATSAPP_APP_SECRET.");
  if (!config.webhookVerifyToken) {
    config.webhookIssues.push("Falta WHATSAPP_WEBHOOK_VERIFY_TOKEN.");
  }
  config.issues = [...new Set([...config.outboundIssues, ...config.webhookIssues])];
  return config;
}

export function publicWhatsAppConfiguration(
  config: WhatsAppConfig,
): {
  enabled: boolean;
  ready: boolean;
  outboundReady: boolean;
  alertReady: boolean;
  dailySummaryReady: boolean;
  webhookReady: boolean;
  individualRecipientCount: number;
  groupRecipientCount: number;
  groupsEnabled: boolean;
  templateLanguage: string;
  utilityTtlSeconds: number;
  maxRetries: number;
  issues: string[];
} {
  const baseOutboundReady = Boolean(
    config.enabled &&
      config.accessToken &&
      config.phoneNumberId &&
      config.recipients.length > 0 &&
      (!config.groupsEnabled || config.wabaId),
  );
  const alertReady = baseOutboundReady && Boolean(config.alertTemplateName);
  const dailySummaryReady =
    baseOutboundReady && Boolean(config.dailyTemplateName);
  const webhookReady = Boolean(
    config.appSecret && config.webhookVerifyToken,
  );
  return {
    enabled: config.enabled,
    ready: alertReady && dailySummaryReady && webhookReady,
    outboundReady: alertReady,
    alertReady,
    dailySummaryReady,
    webhookReady,
    individualRecipientCount: config.recipients.filter(
      ({ type }) => type === "individual",
    ).length,
    groupRecipientCount: config.recipients.filter(
      ({ type }) => type === "group",
    ).length,
    groupsEnabled: config.groupsEnabled,
    templateLanguage: config.templateLanguage,
    utilityTtlSeconds: config.utilityTtlSeconds,
    maxRetries: config.maxRetries,
    issues: config.issues,
  };
}

function formatClp(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function signedClp(value: number): string {
  if (value === 0) return "cuadrado";
  return value > 0
    ? `sobran ${formatClp(value)}`
    : `faltan ${formatClp(Math.abs(value))}`;
}

function incidentMessage(
  incident: ClosureIncidentDetail,
  kind: "immediate_alert" | "reminder",
  publicUrl: string | null,
): { preview: string; parameters: string[] } {
  const inventorySummary = incident.items.length
    ? incident.items
        .map(
          (item) =>
            `${item.name}: esperado ${item.expectedQuantity}, contado ${item.countedQuantity}, diferencia ${item.differenceQuantity > 0 ? "+" : ""}${item.differenceQuantity}`,
        )
        .join("; ")
    : "Inventario cuadrado";
  const contexts = [
    ...(incident.financialDifferenceReason
      ? [`Motivo financiero: ${incident.financialDifferenceReason}`]
      : []),
    ...incident.items.map(
      (item) => `${item.reasonLabel}: ${item.initialComment}`,
    ),
  ];
  const comments = contexts.length
    ? contexts.join("; ")
    : "Sin diferencias que requieran contexto";
  const detailUrl = publicUrl
    ? `${publicUrl}/incidencias-cierres?incident=${encodeURIComponent(incident.id)}`
    : incident.id;
  const title =
    kind === "reminder"
      ? "RECORDATORIO: incidencia de cierre pendiente"
      : "Cierre de turno con diferencia";
  const preview = [
    title,
    `Nivel: ${incident.level === "red" ? "rojo" : "amarillo"}`,
    `Responsable: ${incident.responsible}`,
    `Turno: ${incident.shift.toUpperCase()} — ${incident.businessDate}`,
    `Efectivo: ${signedClp(incident.cashDifferenceClp)}`,
    `Tarjeta: ${signedClp(incident.cardDifferenceClp)}`,
    `Transferencias: ${signedClp(incident.transferDifferenceClp)}`,
    `Inventario: ${inventorySummary}`,
    `Contexto: ${comments}`,
    `Incidencia: ${detailUrl}`,
  ].join("\n").slice(0, 4000);
  return {
    preview,
    parameters: [
      incident.id,
      incident.responsible,
      `${incident.shift.toUpperCase()} — ${incident.businessDate}`,
      signedClp(incident.cashDifferenceClp),
      signedClp(incident.cardDifferenceClp),
      signedClp(incident.transferDifferenceClp),
      inventorySummary.slice(0, 900),
      comments.slice(0, 900),
      detailUrl,
    ],
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function maskRecipient(recipient: WhatsAppRecipient): string {
  if (recipient.type === "group") {
    return `Grupo oficial · …${recipient.id.slice(-6)}`;
  }
  return `Administrador · …${recipient.id.slice(-4)}`;
}

async function enqueueTemplateNotifications(
  database: D1Database,
  config: WhatsAppConfig,
  input: EnqueueTemplateInput,
  now = new Date(),
): Promise<string[]> {
  const ready =
    config.enabled &&
    Boolean(config.accessToken && config.phoneNumberId && input.templateName) &&
    config.recipients.length > 0 &&
    (!config.groupsEnabled || Boolean(config.wabaId));
  const recipients: Array<WhatsAppRecipient | null> = ready
    ? config.recipients
    : [null];
  const deliveries = await Promise.all(
    recipients.map(async (recipient) => {
      const recipientType = recipient?.type ?? "configuration";
      const recipientId = recipient?.id ?? "Configuración pendiente";
      const idempotencyKey = [
        input.eventKey,
        input.kind,
        recipientType,
        recipientId,
      ].join(":");
      const digest = await sha256Hex(idempotencyKey);
      return {
        recipient,
        recipientType,
        recipientId,
        idempotencyKey,
        deliveryId: `notification:${digest.slice(0, 40)}`,
      };
    }),
  );
  const statements: D1PreparedStatement[] = [];
  if (ready) {
    statements.push(
      database
        .prepare(`
        UPDATE closure_notification_deliveries
        SET status = 'superseded', updated_at = ?, error_code = NULL,
          error_message =
            'Configuración completada; se generaron envíos por destinatario.'
        WHERE incident_id IS ? AND closure_id = ? AND kind = ?
          AND status = 'configuration_required'
        `)
        .bind(
          now.toISOString(),
          input.incidentId,
          input.closureId,
          input.kind,
        ),
    );
  }
  for (const delivery of deliveries) {
    const templatePayload: StoredTemplatePayload = {
      language: config.templateLanguage,
      parameters: input.parameters,
    };
    statements.push(
      database
        .prepare(`
        INSERT INTO closure_notification_deliveries (
          id, incident_id, closure_id, business_date, kind,
          recipient_type, recipient, idempotency_key, template_name,
          template_payload_json, message_preview, status, attempt_count,
          created_at, updated_at, error_code, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        ON CONFLICT(idempotency_key) DO NOTHING
        `)
        .bind(
          delivery.deliveryId,
          input.incidentId,
          input.closureId,
          input.businessDate,
          input.kind,
          delivery.recipientType,
          delivery.recipient?.id ?? delivery.recipientId,
          delivery.idempotencyKey,
          input.templateName,
          JSON.stringify(templatePayload),
          input.preview,
          ready ? "queued" : "configuration_required",
          now.toISOString(),
          now.toISOString(),
          ready ? null : "configuration_required",
          ready
            ? null
            : config.issues.join(" ").slice(0, 1000) ||
                "La integración de WhatsApp no está configurada.",
        ),
    );
  }
  await database.batch(statements);
  return deliveries.map(({ deliveryId }) => deliveryId);
}

async function findDelivery(
  database: D1Database,
  deliveryId: string,
): Promise<StoredDeliveryRow | null> {
  return database
    .prepare(`
      SELECT id, incident_id, closure_id, business_date, kind,
        recipient_type, recipient, idempotency_key, template_name,
        template_payload_json, message_preview, status, attempt_count,
        active_attempt_id, last_attempt_at, sent_at, provider_message_id,
        response_status, provider_response, error_code, error_message,
        created_at, updated_at
      FROM closure_notification_deliveries WHERE id = ?
    `)
    .bind(deliveryId)
    .first<StoredDeliveryRow>();
}

function providerErrorCode(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "code" in value.error
  ) {
    return String(value.error.code).trim().slice(0, 200) || null;
  }
  return null;
}

function providerErrorMessage(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message.slice(0, 1000);
  }
  return null;
}

function providerMessageId(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    typeof value.messages[0] === "object" &&
    value.messages[0] !== null &&
    "id" in value.messages[0] &&
    typeof value.messages[0].id === "string"
  ) {
    const id = value.messages[0].id.trim();
    return id.length >= 1 && id.length <= 500 ? id : null;
  }
  return null;
}

function storedTemplatePayload(
  raw: string,
  fallbackLanguage: string,
): StoredTemplatePayload {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTemplatePayload>;
    const language =
      typeof parsed.language === "string" &&
      /^[A-Za-z]{2,3}(?:_[A-Za-z]{2})?$/u.test(parsed.language)
        ? parsed.language
        : fallbackLanguage;
    const parameters = Array.isArray(parsed.parameters)
      ? parsed.parameters
          .filter((value): value is string => typeof value === "string")
          .slice(0, 20)
          .map((value) => value.slice(0, 1000))
      : [];
    return { language, parameters };
  } catch {
    return { language: fallbackLanguage, parameters: [] };
  }
}

async function notificationAttemptId(
  deliveryId: string,
  requestKey: string | undefined,
): Promise<string> {
  if (!requestKey) return `notification-attempt:${crypto.randomUUID()}`;
  const digest = await sha256Hex(`${deliveryId}:${requestKey}`);
  return `notification-attempt:${digest.slice(0, 40)}`;
}

async function recordAttemptResult(
  database: D1Database,
  input: {
    deliveryId: string;
    attemptId: string;
    attemptNumber: number;
    eventKey: "provider_response" | "transport_error" | "lease_expired";
    outcome: AttemptOutcome;
    finishedAt: string;
    providerMessageId: string | null;
    responseStatus: number | null;
    providerResponse: string | null;
    errorCode: string | null;
    errorMessage: string | null;
  },
): Promise<void> {
  const resultDigest = await sha256Hex(`${input.attemptId}:${input.eventKey}`);
  const resultId = `notification-result:${resultDigest.slice(0, 40)}`;
  const providerMessageIdValue = input.providerMessageId?.slice(0, 500) ?? null;
  const responseStatus =
    input.responseStatus !== null &&
    Number.isInteger(input.responseStatus) &&
    input.responseStatus >= 100 &&
    input.responseStatus <= 599
      ? input.responseStatus
      : null;
  const providerResponse = input.providerResponse?.slice(0, 10_000) || null;
  const errorCode =
    input.outcome === "accepted"
      ? null
      : input.errorCode?.trim().slice(0, 200) || "provider_error";
  const errorMessage =
    input.outcome === "accepted"
      ? null
      : input.errorMessage?.trim().slice(0, 1000) ||
        "El proveedor no confirmó el envío.";
  const projectedStatus = input.outcome === "accepted" ? "accepted" : "failed";
  await database.batch([
    database
      .prepare(`
        INSERT INTO closure_notification_attempt_results (
          id, attempt_id, event_key, outcome, finished_at,
          provider_message_id, response_status, provider_response,
          error_code, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(attempt_id, event_key) DO NOTHING
      `)
      .bind(
        resultId,
        input.attemptId,
        input.eventKey,
        input.outcome,
        input.finishedAt,
        providerMessageIdValue,
        responseStatus,
        providerResponse,
        errorCode,
        errorMessage,
      ),
    database
      .prepare(`
        UPDATE closure_notification_deliveries
        SET status = CASE
            WHEN status IN ('sent', 'delivered', 'read') THEN status
            WHEN status = 'failed' AND active_attempt_id IS NULL
              THEN status
            ELSE ?
          END,
          active_attempt_id = CASE WHEN active_attempt_id = ?
            THEN NULL ELSE active_attempt_id END,
          sent_at = CASE WHEN ? = 'accepted'
            THEN COALESCE(sent_at, ?) ELSE sent_at END,
          provider_message_id = COALESCE(?, provider_message_id),
          response_status = COALESCE(?, response_status),
          provider_response = COALESCE(?, provider_response),
          error_code = CASE
            WHEN status IN ('sent', 'delivered', 'read') THEN NULL
            WHEN status = 'failed' AND active_attempt_id IS NULL
              AND ? = 'accepted' THEN error_code
            ELSE ?
          END,
          error_message = CASE
            WHEN status IN ('sent', 'delivered', 'read') THEN NULL
            WHEN status = 'failed' AND active_attempt_id IS NULL
              AND ? = 'accepted' THEN error_message
            ELSE ?
          END,
          updated_at = ?
        WHERE id = ? AND attempt_count = ?
      `)
      .bind(
        projectedStatus,
        input.attemptId,
        input.outcome,
        input.finishedAt,
        providerMessageIdValue,
        responseStatus,
        providerResponse,
        input.outcome,
        errorCode,
        input.outcome,
        errorMessage,
        input.finishedAt,
        input.deliveryId,
        input.attemptNumber,
      ),
  ]);
}

function isStaleAttempt(delivery: StoredDeliveryRow, now: Date): boolean {
  if (delivery.status !== "sending") return false;
  const attemptedAt = Date.parse(delivery.last_attempt_at ?? "");
  return (
    !Number.isFinite(attemptedAt) || attemptedAt <= now.getTime() - 2 * 60_000
  );
}

async function recoverStaleAttempt(
  database: D1Database,
  delivery: StoredDeliveryRow,
  now: Date,
): Promise<void> {
  const finishedAt = now.toISOString();
  if (!delivery.active_attempt_id) {
    await database
      .prepare(`
        UPDATE closure_notification_deliveries
        SET status = 'failed', active_attempt_id = NULL,
          error_code = 'ambiguous_delivery',
          error_message = ?, updated_at = ?
        WHERE id = ? AND status = 'sending' AND active_attempt_id IS NULL
      `)
      .bind(
        "El intento vencido no tenía una reserva auditable; requiere revisión manual.",
        finishedAt,
        delivery.id,
      )
      .run();
    return;
  }
  await recordAttemptResult(database, {
    deliveryId: delivery.id,
    attemptId: delivery.active_attempt_id,
    attemptNumber: delivery.attempt_count,
    eventKey: "lease_expired",
    outcome: "ambiguous",
    finishedAt,
    providerMessageId: null,
    responseStatus: null,
    providerResponse: null,
    errorCode: "ambiguous_delivery",
    errorMessage:
      "El intento venció sin respuesta concluyente; revisa webhooks antes de reenviar.",
  });
}

export async function dispatchWhatsAppDelivery(
  database: D1Database,
  deliveryId: string,
  config: WhatsAppConfig,
  options: {
    manualRetry?: boolean;
    requestKey?: string;
    fetcher?: typeof fetch;
  } = {},
  now = new Date(),
): Promise<StoredDeliveryRow> {
  await reconcilePendingWhatsAppWebhooks(database, now);
  let delivery = await findDelivery(database, deliveryId);
  if (!delivery) throw new PosError(404, "El envío de WhatsApp no existe.");
  if (delivery.status === "sending") {
    if (!isStaleAttempt(delivery, now)) return delivery;
    await recoverStaleAttempt(database, delivery, now);
    delivery = await findDelivery(database, deliveryId);
    if (!delivery) throw new PosError(404, "El envío de WhatsApp no existe.");
  }
  if (
    ["accepted", "sent", "delivered", "read", "superseded"].includes(
      delivery.status,
    )
  ) {
    return delivery;
  }
  if (delivery.recipient_type === "configuration") {
    throw new PosError(
      409,
      "Configura WhatsApp y vuelve a generar los envíos pendientes.",
    );
  }
  if (
    !config.enabled ||
    !config.accessToken ||
    !config.phoneNumberId ||
    !delivery.template_name
  ) {
    throw new PosError(409, "La integración de WhatsApp no está configurada.");
  }
  if (
    delivery.recipient_type === "group" &&
    (!config.groupsEnabled || !config.wabaId)
  ) {
    throw new PosError(
      409,
      "El envío a grupos requiere habilitación y un WHATSAPP_WABA_ID válido.",
    );
  }
  if (
    !config.recipients.some(
      (recipient) =>
        recipient.type === delivery.recipient_type &&
        recipient.id === delivery.recipient,
    )
  ) {
    throw new PosError(
      409,
      delivery.recipient_type === "group"
        ? "El envío a grupos requiere OBA y un GROUP_ID oficial habilitado."
        : "El destinatario ya no está autorizado en la configuración.",
    );
  }
  if (
    delivery.error_code === "ambiguous_delivery" &&
    !options.manualRetry
  ) {
    throw new PosError(
      409,
      "El resultado anterior fue ambiguo; revisa el webhook antes de reenviar.",
    );
  }
  if (!options.manualRetry && delivery.attempt_count >= config.maxRetries) {
    throw new PosError(409, "El envío alcanzó el máximo de reintentos automáticos.");
  }
  if (options.manualRetry && delivery.attempt_count >= 100) {
    throw new PosError(409, "El envío alcanzó el límite de seguridad de 100 intentos.");
  }

  const storedPayload = storedTemplatePayload(
    delivery.template_payload_json,
    config.templateLanguage,
  );
  const body = {
    messaging_product: "whatsapp",
    recipient_type: delivery.recipient_type,
    to: delivery.recipient,
    type: "template",
    template: {
      name: delivery.template_name,
      language: { code: storedPayload.language },
      components: [
        {
          type: "body",
          parameters: storedPayload.parameters.map((text) => ({
            type: "text",
            text,
          })),
        },
      ],
    },
    biz_opaque_callback_data: delivery.id,
  };
  const serializedBody = JSON.stringify(body);
  const requestFingerprint = await sha256Hex(serializedBody);
  const attemptId = await notificationAttemptId(
    delivery.id,
    options.requestKey,
  );
  const attemptNumber = delivery.attempt_count + 1;
  const claimedAt = now.toISOString();
  const [claim] = await database.batch([
    database
      .prepare(`
        UPDATE closure_notification_deliveries
        SET status = 'sending', attempt_count = attempt_count + 1,
          active_attempt_id = ?, last_attempt_at = ?, updated_at = ?,
          error_code = NULL, error_message = NULL,
          provider_message_id = NULL, response_status = NULL,
          provider_response = NULL, sent_at = NULL
        WHERE id = ? AND status IN ('queued', 'failed')
          AND active_attempt_id IS NULL AND attempt_count = ?
          AND attempt_count < ?
          AND NOT EXISTS (
            SELECT 1 FROM closure_notification_attempts WHERE id = ?
          )
      `)
      .bind(
        attemptId,
        claimedAt,
        claimedAt,
        delivery.id,
        delivery.attempt_count,
        options.manualRetry ? 100 : config.maxRetries,
        attemptId,
      ),
    database
      .prepare(`
        INSERT INTO closure_notification_attempts (
          id, delivery_id, attempt_number, initiated_by,
          request_fingerprint, started_at
        )
        SELECT ?, id, attempt_count, ?, ?, ?
        FROM closure_notification_deliveries
        WHERE id = ? AND status = 'sending' AND active_attempt_id = ?
      `)
      .bind(
        attemptId,
        options.manualRetry ? "manual" : "automatic",
        requestFingerprint,
        claimedAt,
        delivery.id,
        attemptId,
      ),
  ]);
  if (Number(claim.meta.changes ?? 0) === 0) {
    const current = await findDelivery(database, deliveryId);
    if (!current) throw new PosError(404, "El envío de WhatsApp no existe.");
    return current;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await (options.fetcher ?? fetch)(
      `https://graph.facebook.com/${config.graphApiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.accessToken}`,
          "content-type": "application/json",
        },
        body: serializedBody,
        signal: controller.signal,
      },
    );
    const responseText = (await response.text()).slice(0, 3000);
    let responsePayload: unknown = null;
    try {
      responsePayload = responseText ? JSON.parse(responseText) : null;
    } catch {
      responsePayload = null;
    }
    const messageId = providerMessageId(responsePayload);
    const errorCode = providerErrorCode(responsePayload);
    const errorMessage = providerErrorMessage(responsePayload);
    const finishedAt = new Date().toISOString();
    const accepted = response.ok && Boolean(messageId);
    const ambiguous = response.ok || response.status >= 500;
    await recordAttemptResult(database, {
      deliveryId,
      attemptId,
      attemptNumber,
      eventKey: "provider_response",
      outcome: accepted ? "accepted" : ambiguous ? "ambiguous" : "failed",
      finishedAt,
      providerMessageId: messageId,
      responseStatus: response.status,
      providerResponse: responseText || null,
      errorCode: accepted
        ? null
        : errorCode ??
          (ambiguous ? "ambiguous_delivery" : `http_${response.status}`),
      errorMessage: accepted
        ? null
        : errorMessage ?? "WhatsApp rechazó el mensaje.",
    });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    await recordAttemptResult(database, {
      deliveryId,
      attemptId,
      attemptNumber,
      eventKey: "transport_error",
      outcome: "ambiguous",
      finishedAt,
      providerMessageId: null,
      responseStatus: null,
      providerResponse: null,
      errorCode: "ambiguous_delivery",
      errorMessage:
        error instanceof Error
          ? `No se confirmó la recepción del proveedor: ${error.name}.`
          : "No se confirmó la recepción del proveedor.",
    });
  } finally {
    clearTimeout(timeout);
  }
  await reconcilePendingWhatsAppWebhooks(database, new Date());
  const updated = await findDelivery(database, deliveryId);
  if (!updated) throw new Error("Notification delivery missing after dispatch");
  return updated;
}

export async function queueImmediateIncidentNotifications(
  database: D1Database,
  incidentId: string,
  config: WhatsAppConfig,
  now = new Date(),
): Promise<string[]> {
  const incident = await getClosureIncident(database, incidentId, now);
  if (!incident) throw new PosError(404, "La incidencia no existe.");
  const message = incidentMessage(incident, "immediate_alert", config.publicUrl);
  return enqueueTemplateNotifications(
    database,
    config,
    {
      incidentId,
      closureId: incident.closureId,
      businessDate: incident.businessDate,
      kind: "immediate_alert",
      eventKey: `incident:${incidentId}:created`,
      templateName: config.alertTemplateName,
      preview: message.preview,
      parameters: message.parameters,
    },
    now,
  );
}

export async function enqueueImmediateIncidentNotifications(
  database: D1Database,
  incidentId: string,
  config: WhatsAppConfig,
  now = new Date(),
): Promise<string[]> {
  const deliveryIds = await queueImmediateIncidentNotifications(
    database,
    incidentId,
    config,
    now,
  );
  for (const deliveryId of deliveryIds) {
    try {
      await dispatchWhatsAppDelivery(database, deliveryId, config, {}, now);
    } catch {
      // La incidencia y el cierre ya están confirmados. El panel conserva el
      // envío pendiente o fallido para un reintento administrativo explícito.
    }
  }
  return deliveryIds;
}

function santiagoBusinessDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export async function processDueNotificationPolicies(
  database: D1Database,
  config: WhatsAppConfig,
  now = new Date(),
): Promise<{ queued: number; attempted: number }> {
  await reconcilePendingWhatsAppWebhooks(database, now);
  const settings = await getClosureIncidentSettings(database);
  const reminderCutoff = new Date(
    now.getTime() - settings.reminderHours * 3_600_000,
  ).toISOString();
  const missingAlerts = await database
    .prepare(`
      SELECT incident.id
      FROM closure_incidents AS incident
      WHERE incident.created_at >= COALESCE((
          SELECT value FROM app_meta WHERE key = ?
        ), '9999-12-31T23:59:59.999Z')
        AND COALESCE((
          SELECT event.status FROM closure_incident_events AS event
          WHERE event.incident_id = incident.id AND event.status IS NOT NULL
          ORDER BY event.rowid DESC LIMIT 1
        ), 'pending_clarification') <> 'validated'
        AND NOT EXISTS (
        SELECT 1 FROM closure_notification_deliveries AS delivery
        WHERE delivery.incident_id = incident.id
          AND delivery.kind = 'immediate_alert'
          AND delivery.recipient_type <> 'configuration'
      )
      ORDER BY incident.created_at LIMIT 50
    `)
    .bind(CLOSURE_NOTIFICATIONS_ENABLED_FROM_KEY)
    .all<{ id: string }>();
  const queuedIds: string[] = [];
  for (const row of missingAlerts.results) {
    queuedIds.push(
      ...(await queueImmediateIncidentNotifications(
        database,
        row.id,
        config,
        now,
      )),
    );
  }
  const due = await database
    .prepare(`
      SELECT incident.id
      FROM closure_incidents AS incident
      WHERE incident.created_at <= ?
        AND COALESCE((
          SELECT event.status FROM closure_incident_events AS event
          WHERE event.incident_id = incident.id AND event.status IS NOT NULL
          ORDER BY event.rowid DESC LIMIT 1
        ), 'pending_clarification') <> 'validated'
        AND NOT EXISTS (
          SELECT 1 FROM closure_notification_deliveries AS delivery
          WHERE delivery.incident_id = incident.id
            AND delivery.kind = 'reminder'
            AND delivery.created_at > ?
        )
      ORDER BY incident.created_at LIMIT 50
    `)
    .bind(reminderCutoff, reminderCutoff)
    .all<{ id: string }>();
  for (const row of due.results) {
    const incident = await getClosureIncident(database, row.id, now);
    if (!incident) continue;
    const bucket = Math.max(
      1,
      Math.floor(incident.ageHours / settings.reminderHours),
    );
    const message = incidentMessage(incident, "reminder", config.publicUrl);
    queuedIds.push(
      ...(await enqueueTemplateNotifications(
        database,
        config,
        {
          incidentId: incident.id,
          closureId: incident.closureId,
          businessDate: incident.businessDate,
          kind: "reminder",
          eventKey: `incident:${incident.id}:reminder:${bucket}`,
          templateName: config.reminderTemplateName,
          preview: message.preview,
          parameters: message.parameters,
        },
        now,
      )),
    );
  }

  const yesterday = santiagoBusinessDate(
    new Date(now.getTime() - 24 * 3_600_000),
  );
  const green = await database
    .prepare(`
      SELECT MIN(closure.id) AS closure_id, COUNT(*) AS green_count
      FROM cash_closures AS closure
      LEFT JOIN closure_incidents AS incident
        ON incident.closure_id = closure.id
      WHERE closure.business_date = ?
        AND closure.closure_contract_version = 2
        AND incident.id IS NULL
    `)
    .bind(yesterday)
    .first<{ closure_id: string | null; green_count: number }>();
  if (green?.closure_id && Number(green.green_count) > 0) {
    const anomaly = await database
      .prepare(`
        SELECT COUNT(*) AS count FROM closure_incidents
        WHERE business_date = ?
      `)
      .bind(yesterday)
      .first<{ count: number }>();
    const preview = `Resumen diario ${yesterday}: ${green.green_count} cierres verdes y ${Number(anomaly?.count ?? 0)} cierres con incidencia.`;
    queuedIds.push(
      ...(await enqueueTemplateNotifications(
        database,
        config,
        {
          incidentId: null,
          closureId: green.closure_id,
          businessDate: yesterday,
          kind: "daily_summary",
          eventKey: `daily:${yesterday}`,
          templateName: config.dailyTemplateName,
          preview,
          parameters: [
            yesterday,
            String(green.green_count),
            String(Number(anomaly?.count ?? 0)),
          ],
        },
        now,
      )),
    );
  }

  const staleAttemptBefore = new Date(now.getTime() - 2 * 60_000).toISOString();
  const recoverableOutbox = await database
    .prepare(`
      SELECT id FROM closure_notification_deliveries
      WHERE recipient_type <> 'configuration'
        AND (
          (status = 'queued' AND attempt_count < ?)
          OR (status = 'failed' AND attempt_count < ?
            AND COALESCE(error_code, '') <> 'ambiguous_delivery')
          OR (status = 'sending'
            AND (last_attempt_at IS NULL OR last_attempt_at <= ?))
        )
      ORDER BY created_at, id LIMIT 100
    `)
    .bind(config.maxRetries, config.maxRetries, staleAttemptBefore)
    .all<{ id: string }>();
  const deliveryIds = [
    ...new Set([
      ...queuedIds,
      ...recoverableOutbox.results.map(({ id }) => id),
    ]),
  ];
  let attempted = 0;
  for (const deliveryId of deliveryIds) {
    try {
      const before = await findDelivery(database, deliveryId);
      const delivery = await dispatchWhatsAppDelivery(
        database,
        deliveryId,
        config,
        {},
        now,
      );
      if (before && delivery.attempt_count > before.attempt_count) attempted += 1;
    } catch {
      // El detalle queda disponible en Administración.
    }
  }
  await reconcilePendingWhatsAppWebhooks(database, now);
  return { queued: new Set(queuedIds).size, attempted };
}

export async function retryWhatsAppDelivery(
  database: D1Database,
  deliveryId: string,
  config: WhatsAppConfig,
  now = new Date(),
  expectedIncidentId?: string,
  retryKey?: string,
): Promise<StoredDeliveryRow[]> {
  const delivery = await findDelivery(database, deliveryId);
  if (!delivery) throw new PosError(404, "El envío de WhatsApp no existe.");
  if (
    expectedIncidentId !== undefined &&
    delivery.incident_id !== expectedIncidentId
  ) {
    throw new PosError(404, "El envío no pertenece a esta incidencia.");
  }
  if (delivery.status === "configuration_required") {
    if (!delivery.incident_id) {
      throw new PosError(
        409,
        "Procesa nuevamente las políticas cuando WhatsApp esté configurado.",
      );
    }
    const templatePayload = JSON.parse(
      delivery.template_payload_json,
    ) as StoredTemplatePayload;
    const templateName =
      delivery.kind === "immediate_alert"
        ? config.alertTemplateName
        : delivery.kind === "reminder"
          ? config.reminderTemplateName
          : config.dailyTemplateName;
    const ids = await enqueueTemplateNotifications(
      database,
      config,
      {
        incidentId: delivery.incident_id,
        closureId: delivery.closure_id,
        businessDate: delivery.business_date,
        kind: delivery.kind,
        eventKey: `retry:${retryKey ?? delivery.id}`,
        templateName,
        preview: delivery.message_preview,
        parameters: templatePayload.parameters,
      },
      now,
    );
    const rows = await Promise.all(
      ids.map(async (id) => {
        await dispatchWhatsAppDelivery(
          database,
          id,
          config,
          { manualRetry: true, requestKey: retryKey },
          now,
        );
        return findDelivery(database, id);
      }),
    );
    return rows.filter((row): row is StoredDeliveryRow => row !== null);
  }
  return [
    await dispatchWhatsAppDelivery(
      database,
      deliveryId,
      config,
      { manualRetry: true, requestKey: retryKey },
      now,
    ),
  ];
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyWhatsAppWebhookSignature(
  body: ArrayBuffer,
  signatureHeader: string | null,
  appSecret: string | null,
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const match = /^sha256=([0-9a-f]{64})$/iu.exec(signatureHeader);
  if (!match) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, body),
  );
  const actual = Uint8Array.from(
    match[1].match(/.{2}/gu) ?? [],
    (hex) => Number.parseInt(hex, 16),
  );
  return constantTimeEqual(expected, actual);
}

type WhatsAppWebhookStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  biz_opaque_callback_data?: unknown;
  errors?: unknown;
};

function webhookStatuses(payload: unknown): WhatsAppWebhookStatus[] {
  if (typeof payload !== "object" || payload === null || !("entry" in payload)) {
    return [];
  }
  const entry = payload.entry;
  if (!Array.isArray(entry)) return [];
  const statuses: WhatsAppWebhookStatus[] = [];
  for (const item of entry) {
    if (typeof item !== "object" || item === null || !("changes" in item)) continue;
    if (!Array.isArray(item.changes)) continue;
    for (const change of item.changes) {
      if (
        typeof change !== "object" ||
        change === null ||
        !("value" in change) ||
        typeof change.value !== "object" ||
        change.value === null ||
        !("statuses" in change.value) ||
        !Array.isArray(change.value.statuses)
      ) {
        continue;
      }
      statuses.push(...(change.value.statuses as WhatsAppWebhookStatus[]));
    }
  }
  return statuses;
}

function boundedExternalString(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maximumLength);
}

function webhookTimestamp(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 253_402_300_799
    ? parsed
    : null;
}

async function normalizedWebhook(
  event: WhatsAppWebhookStatus,
  receivedAt: string,
): Promise<(StoredWebhookRow & { payload_fingerprint: string }) | null> {
  const providerMessageId = boundedExternalString(event.id, 500);
  const providerStatus = String(event.status) as StoredWebhookRow["provider_status"];
  if (
    !providerMessageId ||
    !["sent", "delivered", "read", "failed"].includes(providerStatus)
  ) {
    return null;
  }
  const callbackData = boundedExternalString(
    event.biz_opaque_callback_data,
    100,
  );
  const errors = Array.isArray(event.errors) ? event.errors : [];
  const firstError =
    typeof errors[0] === "object" && errors[0] !== null
      ? (errors[0] as Record<string, unknown>)
      : null;
  const errorCode =
    providerStatus === "failed"
      ? boundedExternalString(firstError?.code, 200) ?? "provider_failed"
      : null;
  const errorMessage =
    providerStatus === "failed"
      ? boundedExternalString(
          firstError?.message ?? firstError?.title,
          1000,
        ) ?? "WhatsApp informó que el mensaje falló."
      : null;
  const payloadFingerprint = await sha256Hex(JSON.stringify(event));
  const eventFingerprint = await sha256Hex(
    JSON.stringify({
      providerMessageId,
      providerStatus,
      providerTimestamp: webhookTimestamp(event.timestamp),
      callbackData,
      errorCode,
      errorMessage,
      payloadFingerprint,
    }),
  );
  return {
    id: `notification-webhook:${eventFingerprint.slice(0, 40)}`,
    provider_message_id: providerMessageId,
    provider_status: providerStatus,
    provider_timestamp: webhookTimestamp(event.timestamp),
    callback_data: callbackData,
    error_code: errorCode,
    error_message: errorMessage,
    payload_fingerprint: payloadFingerprint,
    received_at: receivedAt,
  };
}

async function projectWhatsAppDelivery(
  database: D1Database,
  deliveryId: string,
  now: Date,
): Promise<void> {
  const delivery = await findDelivery(database, deliveryId);
  if (
    !delivery ||
    ["superseded", "configuration_required"].includes(delivery.status)
  ) {
    return;
  }
  const webhookRows = await database
    .prepare(`
      SELECT webhook.id, webhook.provider_message_id,
        webhook.provider_status, webhook.provider_timestamp,
        webhook.callback_data, webhook.error_code, webhook.error_message,
        webhook.received_at
      FROM closure_notification_webhooks AS webhook
      INNER JOIN closure_notification_webhook_links AS link
        ON link.webhook_id = webhook.id
      WHERE link.delivery_id = ?
    `)
    .bind(deliveryId)
    .all<StoredWebhookRow>();
  if (webhookRows.results.length === 0) return;
  const attemptResults = await database
    .prepare(`
      SELECT result.id, result.outcome, result.finished_at,
        result.provider_message_id, result.error_code, result.error_message
      FROM closure_notification_attempts AS attempt
      INNER JOIN closure_notification_attempt_results AS result
        ON result.attempt_id = attempt.id
      WHERE attempt.delivery_id = ?
      ORDER BY attempt.attempt_number, result.rowid
    `)
    .bind(deliveryId)
    .all<{
      id: string;
      outcome: AttemptOutcome;
      finished_at: string;
      provider_message_id: string | null;
      error_code: string | null;
      error_message: string | null;
    }>();
  let projectedStatus: ClosureNotificationDelivery["status"] =
    delivery.attempt_count === 0 ? delivery.status : "queued";
  let errorCode: string | null =
    delivery.attempt_count === 0 ? delivery.error_code : null;
  let errorMessage: string | null =
    delivery.attempt_count === 0 ? delivery.error_message : null;
  let providerMessageId = delivery.provider_message_id;
  let firstPositiveAt: string | null = null;
  const timeline = [
    ...attemptResults.results.map((result) => ({
      id: `attempt:${result.id}`,
      at: Date.parse(result.finished_at),
      happenedAt: result.finished_at,
      status: result.outcome === "accepted" ? "accepted" : "failed",
      providerMessageId: result.provider_message_id,
      errorCode: result.error_code,
      errorMessage: result.error_message,
      source: "attempt" as const,
    })),
    ...(delivery.active_attempt_id
      ? [{
          id: `active:${delivery.active_attempt_id}`,
          at: Date.parse(delivery.last_attempt_at ?? delivery.updated_at),
          happenedAt: delivery.last_attempt_at ?? delivery.updated_at,
          status: "sending" as const,
          providerMessageId: null,
          errorCode: null,
          errorMessage: null,
          source: "attempt" as const,
        }]
      : []),
    ...webhookRows.results.map((webhook) => ({
      id: `webhook:${webhook.id}`,
      at:
        webhook.provider_timestamp === null
          ? Date.parse(webhook.received_at)
          : webhook.provider_timestamp * 1000,
      happenedAt:
        webhook.provider_timestamp === null
          ? webhook.received_at
          : new Date(webhook.provider_timestamp * 1000).toISOString(),
      status: webhook.provider_status,
      providerMessageId: webhook.provider_message_id,
      errorCode: webhook.error_code,
      errorMessage: webhook.error_message,
      source: "webhook" as const,
    })),
  ].sort((left, right) => left.at - right.at || left.id.localeCompare(right.id));
  for (const event of timeline) {
    providerMessageId ??= event.providerMessageId;
    if (["sent", "delivered", "read"].includes(event.status)) {
      firstPositiveAt ??= event.happenedAt;
    }
    if (event.status === "read") {
      projectedStatus = "read";
      errorCode = null;
      errorMessage = null;
    } else if (event.status === "delivered") {
      if (projectedStatus !== "read") projectedStatus = "delivered";
      errorCode = null;
      errorMessage = null;
    } else if (event.status === "sent") {
      if (!["delivered", "read"].includes(projectedStatus)) {
        projectedStatus = "sent";
        errorCode = null;
        errorMessage = null;
      }
    } else if (event.status === "accepted") {
      if (!["sent", "delivered", "read"].includes(projectedStatus)) {
        projectedStatus = "accepted";
        errorCode = null;
        errorMessage = null;
      }
    } else if (event.status === "sending") {
      if (!["sent", "delivered", "read"].includes(projectedStatus)) {
        projectedStatus = "sending";
        errorCode = null;
        errorMessage = null;
      }
    } else if (!["delivered", "read"].includes(projectedStatus)) {
      if (event.source === "webhook" || projectedStatus !== "sent") {
        projectedStatus = "failed";
        errorCode = event.errorCode ?? "provider_failed";
        errorMessage =
          event.errorMessage ?? "WhatsApp informó que el mensaje falló.";
      }
    }
  }
  const retainActiveAttempt = Boolean(
    delivery.active_attempt_id && projectedStatus === "failed",
  );
  if (retainActiveAttempt) {
    projectedStatus = "sending";
    errorCode = null;
    errorMessage = null;
  }
  await database
    .prepare(`
      UPDATE closure_notification_deliveries
      SET status = ?, active_attempt_id = ?,
        sent_at = COALESCE(sent_at, ?),
        provider_message_id = COALESCE(provider_message_id, ?),
        error_code = ?, error_message = ?, updated_at = ?
      WHERE id = ? AND status NOT IN ('superseded', 'configuration_required')
    `)
    .bind(
      projectedStatus,
      retainActiveAttempt ? delivery.active_attempt_id : null,
      firstPositiveAt,
      providerMessageId,
      errorCode,
      errorMessage,
      now.toISOString(),
      deliveryId,
    )
    .run();
}

export async function reconcilePendingWhatsAppWebhooks(
  database: D1Database,
  now = new Date(),
): Promise<number> {
  const pending = await database
    .prepare(`
      SELECT webhook.id, webhook.provider_message_id,
        webhook.provider_status, webhook.provider_timestamp,
        webhook.callback_data, webhook.error_code, webhook.error_message,
        webhook.received_at
      FROM closure_notification_webhooks AS webhook
      LEFT JOIN closure_notification_webhook_links AS link
        ON link.webhook_id = webhook.id
      WHERE link.webhook_id IS NULL AND (
        EXISTS (
          SELECT 1 FROM closure_notification_deliveries AS delivery
          WHERE delivery.provider_message_id = webhook.provider_message_id
        )
        OR EXISTS (
          SELECT 1
          FROM closure_notification_attempt_results AS result
          WHERE result.provider_message_id = webhook.provider_message_id
        )
        OR (webhook.callback_data IS NOT NULL AND EXISTS (
          SELECT 1 FROM closure_notification_deliveries AS delivery
          WHERE delivery.id = webhook.callback_data
        ))
      )
      ORDER BY webhook.received_at DESC, webhook.id DESC LIMIT 200
    `)
    .all<StoredWebhookRow>();
  let linked = 0;
  const touchedDeliveries = new Set<string>();
  for (const webhook of pending.results) {
    const matches = await database
      .prepare(`
        SELECT delivery_id, match_source FROM (
          SELECT delivery.id AS delivery_id,
            'provider_message_id' AS match_source
          FROM closure_notification_deliveries AS delivery
          WHERE delivery.provider_message_id = ?
          UNION ALL
          SELECT attempt.delivery_id AS delivery_id,
            'provider_message_id' AS match_source
          FROM closure_notification_attempt_results AS result
          INNER JOIN closure_notification_attempts AS attempt
            ON attempt.id = result.attempt_id
          WHERE result.provider_message_id = ?
          UNION ALL
          SELECT delivery.id AS delivery_id, 'callback_data' AS match_source
          FROM closure_notification_deliveries AS delivery
          WHERE ? IS NOT NULL AND delivery.id = ?
        )
      `)
      .bind(
        webhook.provider_message_id,
        webhook.provider_message_id,
        webhook.callback_data,
        webhook.callback_data,
      )
      .all<{ delivery_id: string; match_source: "provider_message_id" | "callback_data" }>();
    const candidates = new Map<
      string,
      "provider_message_id" | "callback_data"
    >();
    for (const match of matches.results) {
      const current = candidates.get(match.delivery_id);
      candidates.set(
        match.delivery_id,
        current === "provider_message_id" ? current : match.match_source,
      );
    }
    if (candidates.size !== 1) continue;
    const [[matchedDeliveryId, matchSource]] = [...candidates.entries()];
    const result = await database
      .prepare(`
        INSERT OR IGNORE INTO closure_notification_webhook_links (
          webhook_id, delivery_id, match_source, linked_at
        ) VALUES (?, ?, ?, ?)
      `)
      .bind(webhook.id, matchedDeliveryId, matchSource, now.toISOString())
      .run();
    if (Number(result.meta.changes ?? 0) > 0) linked += 1;
    touchedDeliveries.add(matchedDeliveryId);
  }
  for (const deliveryId of touchedDeliveries) {
    await projectWhatsAppDelivery(database, deliveryId, now);
  }
  return linked;
}

export async function applyWhatsAppWebhookStatuses(
  database: D1Database,
  payload: unknown,
  now = new Date(),
): Promise<number> {
  const receivedAt = now.toISOString();
  const normalized = (
    await Promise.all(
      webhookStatuses(payload).map((event) =>
        normalizedWebhook(event, receivedAt),
      ),
    )
  ).filter((event): event is NonNullable<typeof event> => event !== null);
  if (normalized.length === 0) return 0;
  const results = await database.batch(
    normalized.map((event) =>
      database
        .prepare(`
          INSERT INTO closure_notification_webhooks (
            id, provider_message_id, provider_status, provider_timestamp,
            callback_data, error_code, error_message,
            payload_fingerprint, received_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING
        `)
        .bind(
          event.id,
          event.provider_message_id,
          event.provider_status,
          event.provider_timestamp,
          event.callback_data,
          event.error_code,
          event.error_message,
          event.payload_fingerprint,
          event.received_at,
        ),
    ),
  );
  const inserted = results.reduce(
    (count, result) => count + Number(result.meta.changes ?? 0),
    0,
  );
  await reconcilePendingWhatsAppWebhooks(database, now);
  return inserted;
}

export function recipientDisplay(row: StoredDeliveryRow): string {
  return row.recipient_type === "configuration"
    ? row.recipient
    : maskRecipient({ type: row.recipient_type, id: row.recipient });
}
