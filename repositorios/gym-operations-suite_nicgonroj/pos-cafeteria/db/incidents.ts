import {
  INVENTORY_DIFFERENCE_REASON_LABELS,
  isInventoryDifferenceReason,
  type InventoryDifferenceReason,
  type Shift,
} from "@/lib/business";
import { PosError } from "./errors";

export const CLOSURE_INCIDENT_LEVELS = ["yellow", "red"] as const;
export const CLOSURE_INCIDENT_STATUSES = [
  "pending_clarification",
  "clarified",
  "validated",
  "requires_correction",
] as const;
export const CLOSURE_INCIDENT_ACTIONS = [
  "clarification_requested",
  "comment_added",
  "clarified",
  "requires_correction",
] as const;

export type ClosureIncidentLevel =
  (typeof CLOSURE_INCIDENT_LEVELS)[number];
export type ClosureIncidentStatus =
  (typeof CLOSURE_INCIDENT_STATUSES)[number];
export type ClosureIncidentAction =
  (typeof CLOSURE_INCIDENT_ACTIONS)[number];

export type ClosureIncidentSettings = {
  moneyRedThresholdClp: number;
  multipleProductRedCount: number;
  highValueProductClp: number;
  recurrenceWindowDays: number;
  recurrenceRedCount: number;
  reminderHours: number;
  updatedAt: string;
};

export type ClosureIncidentInventoryInput = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  unit: string;
  location: "simple" | "vitrina" | "ingredient";
  expectedQuantity: number;
  countedQuantity: number;
  adjustmentApplied?: number;
  reasonCategory: InventoryDifferenceReason;
  comment: string;
};

export type PrepareClosureIncidentInput = {
  closureId: string;
  businessDate: string;
  shift: Shift;
  responsible: string;
  createdAt: string;
  cashDifferenceClp: number;
  cardDifferenceClp: number;
  transferDifferenceClp: number;
  inventory: ClosureIncidentInventoryInput[];
};

export type PreparedClosureIncident = {
  incidentId: string;
  level: ClosureIncidentLevel;
  classificationReason: string;
  estimatedValueClp: number;
  unvaluedItemCount: number;
  statements: D1PreparedStatement[];
};

export type ClosureIncidentEvent = {
  id: string;
  createdAt: string;
  eventType:
    | "created"
    | ClosureIncidentAction
    | "validated"
    | "correction_applied"
    | "notification_retry";
  status: ClosureIncidentStatus | null;
  actorRole: "system" | "admin" | "sales";
  actorName: string;
  comment: string | null;
};

export type ClosureIncidentItem = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  unit: string;
  location: "simple" | "vitrina" | "ingredient";
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  reasonCategory: InventoryDifferenceReason;
  reasonLabel: string;
  initialComment: string;
  adjustmentApplied: number;
  unitValueClp: number | null;
  estimatedValueClp: number | null;
  highValue: boolean;
};

export type ClosureNotificationDelivery = {
  id: string;
  incidentId: string | null;
  closureId: string;
  businessDate: string;
  kind: "immediate_alert" | "reminder" | "daily_summary";
  recipientType: "individual" | "group" | "configuration";
  recipient: string;
  templateName: string | null;
  messagePreview: string;
  status:
    | "queued"
    | "sending"
    | "accepted"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "superseded"
    | "configuration_required";
  attemptCount: number;
  lastAttemptAt: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
  responseStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClosureIncidentSummary = {
  id: string;
  closureId: string;
  sessionId: string | null;
  createdAt: string;
  businessDate: string;
  shift: Shift;
  responsible: string;
  level: ClosureIncidentLevel;
  classificationReason: string;
  financialDifferenceReason: string | null;
  status: ClosureIncidentStatus;
  statusUpdatedAt: string;
  ageHours: number;
  cashDifferenceClp: number;
  cardDifferenceClp: number;
  transferDifferenceClp: number;
  totalDifferenceClp: number;
  inventoryDifferenceCount: number;
  estimatedValueClp: number;
  unvaluedItemCount: number;
  priorResponsibleIncidentCount: number;
  highestPriorProductIncidentCount: number;
  latestRevisionNumber: number;
  notificationFailedCount: number;
  notificationPendingCount: number;
};

export type ClosureIncidentDetail = ClosureIncidentSummary & {
  items: ClosureIncidentItem[];
  events: ClosureIncidentEvent[];
  notifications: ClosureNotificationDelivery[];
  financialEvidence: {
    sourceRevisionNumber: number | null;
    expectedCashClp: number;
    countedCashClp: number;
    expectedCardClp: number;
    countedCardClp: number;
    expectedTransferClp: number;
    countedTransferClp: number;
    expectedCashBeforeExpensesClp: number;
    totalSalesClp: number;
    salesCount: number;
  };
  thresholds: Omit<ClosureIncidentSettings, "updatedAt" | "reminderHours">;
};

export type ClosureIncidentFilters = {
  status?: ClosureIncidentStatus | null;
  level?: ClosureIncidentLevel | null;
  from?: string | null;
  to?: string | null;
  responsible?: string | null;
  product?: string | null;
  limit?: number;
};

export type ClosureIncidentDashboard = {
  incidents: ClosureIncidentSummary[];
  hasMore: boolean;
  total: number;
  pendingCount: number;
  redCount: number;
  accumulatedEstimatedClp: number;
  accumulatedMoneyDifferenceClp: number;
  responsibleRecurrence: Array<{
    responsible: string;
    incidentCount: number;
    accumulatedClp: number;
  }>;
  productRecurrence: Array<{
    itemId: string;
    name: string;
    incidentCount: number;
    accumulatedQuantity: number;
    accumulatedClp: number;
  }>;
  settings: ClosureIncidentSettings;
};

type IncidentSettingsRow = {
  money_red_threshold_clp: number;
  multiple_product_red_count: number;
  high_value_product_clp: number;
  recurrence_window_days: number;
  recurrence_red_count: number;
  reminder_hours: number;
  updated_at: string;
};

type IncidentSummaryRow = {
  id: string;
  closure_id: string;
  session_id: string | null;
  created_at: string;
  business_date: string;
  shift: Shift;
  responsible: string;
  level: ClosureIncidentLevel;
  classification_reason: string;
  financial_difference_reason: string | null;
  current_status: ClosureIncidentStatus;
  status_updated_at: string;
  cash_difference_clp: number;
  card_difference_clp: number;
  transfer_difference_clp: number;
  total_difference_clp: number;
  inventory_difference_count: number;
  estimated_value_clp: number;
  unvalued_item_count: number;
  prior_responsible_incident_count: number;
  highest_prior_product_incident_count: number;
  latest_revision_number: number;
  notification_failed_count: number;
  notification_pending_count: number;
  money_red_threshold_clp: number;
  multiple_product_red_count: number;
  high_value_product_clp: number;
  recurrence_window_days: number;
  recurrence_red_count: number;
};

type IncidentFinancialEvidenceRow = {
  source_revision_number: number | null;
  expected_cash_clp: number;
  counted_cash_clp: number;
  expected_card_clp: number;
  counted_card_clp: number;
  expected_transfer_clp: number;
  counted_transfer_clp: number;
  expected_cash_before_expenses_clp: number;
  total_sales_clp: number;
  sales_count: number;
  financial_difference_reason: string | null;
};

const incidentSummarySelect = `
  SELECT incident.*, closure.session_id,
    closure.handoff_financial_difference_reason AS financial_difference_reason,
    COALESCE((
      SELECT event.status
      FROM closure_incident_events AS event
      WHERE event.incident_id = incident.id AND event.status IS NOT NULL
      ORDER BY event.rowid DESC LIMIT 1
    ), 'pending_clarification') AS current_status,
    COALESCE((
      SELECT event.created_at
      FROM closure_incident_events AS event
      WHERE event.incident_id = incident.id AND event.status IS NOT NULL
      ORDER BY event.rowid DESC LIMIT 1
    ), incident.created_at) AS status_updated_at,
    COALESCE((
      SELECT MAX(revision.revision_number)
      FROM cash_closure_revisions AS revision
      INNER JOIN cash_closure_revision_seals AS seal
        ON seal.revision_id = revision.id
      WHERE revision.closure_id = incident.closure_id
        AND seal.request_fingerprint = revision.request_fingerprint
    ), 0) AS latest_revision_number,
    (SELECT COUNT(*) FROM closure_notification_deliveries AS delivery
      WHERE delivery.incident_id = incident.id
        AND delivery.status = 'failed') AS notification_failed_count,
    (SELECT COUNT(*) FROM closure_notification_deliveries AS delivery
      WHERE delivery.incident_id = incident.id
        AND delivery.status IN ('queued', 'sending',
          'configuration_required')) AS notification_pending_count
  FROM closure_incidents AS incident
  INNER JOIN cash_closures AS closure ON closure.id = incident.closure_id
`;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function assertSettings(settings: Omit<ClosureIncidentSettings, "updatedAt">) {
  const values: Array<[number, string, number, number]> = [
    [settings.moneyRedThresholdClp, "El umbral de dinero", 1, 10_000_000],
    [settings.multipleProductRedCount, "La cantidad de productos", 1, 90],
    [settings.highValueProductClp, "El umbral de alto valor", 1, 10_000_000],
    [settings.recurrenceWindowDays, "La ventana de reincidencia", 1, 365],
    [settings.recurrenceRedCount, "La cantidad de reincidencias", 2, 100],
    [settings.reminderHours, "El intervalo de recordatorio", 1, 720],
  ];
  for (const [value, label, minimum, maximum] of values) {
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new PosError(
        400,
        `${label} debe ser un entero entre ${minimum} y ${maximum}.`,
      );
    }
  }
}

function mapSettings(row: IncidentSettingsRow): ClosureIncidentSettings {
  return {
    moneyRedThresholdClp: Number(row.money_red_threshold_clp),
    multipleProductRedCount: Number(row.multiple_product_red_count),
    highValueProductClp: Number(row.high_value_product_clp),
    recurrenceWindowDays: Number(row.recurrence_window_days),
    recurrenceRedCount: Number(row.recurrence_red_count),
    reminderHours: Number(row.reminder_hours),
    updatedAt: row.updated_at,
  };
}

export async function getClosureIncidentSettings(
  database: D1Database,
): Promise<ClosureIncidentSettings> {
  const row = await database
    .prepare(`
      SELECT money_red_threshold_clp, multiple_product_red_count,
        high_value_product_clp, recurrence_window_days,
        recurrence_red_count, reminder_hours, updated_at
      FROM closure_incident_settings WHERE id = 'default'
    `)
    .first<IncidentSettingsRow>();
  if (!row) throw new Error("Closure incident settings missing");
  return mapSettings(row);
}

export async function updateClosureIncidentSettings(
  database: D1Database,
  input: Omit<ClosureIncidentSettings, "updatedAt"> & {
    expectedUpdatedAt: string;
  },
  now = new Date(),
): Promise<ClosureIncidentSettings> {
  assertSettings(input);
  if (!input.expectedUpdatedAt || Number.isNaN(Date.parse(input.expectedUpdatedAt))) {
    throw new PosError(400, "La versión de la configuración no es válida.");
  }
  const updatedAt = now.toISOString();
  const result = await database
    .prepare(`
      UPDATE closure_incident_settings
      SET money_red_threshold_clp = ?, multiple_product_red_count = ?,
        high_value_product_clp = ?, recurrence_window_days = ?,
        recurrence_red_count = ?, reminder_hours = ?, updated_at = ?
      WHERE id = 'default' AND updated_at = ?
    `)
    .bind(
      input.moneyRedThresholdClp,
      input.multipleProductRedCount,
      input.highValueProductClp,
      input.recurrenceWindowDays,
      input.recurrenceRedCount,
      input.reminderHours,
      updatedAt,
      input.expectedUpdatedAt,
    )
    .run();
  if (Number(result.meta.changes ?? 0) === 0) {
    throw new PosError(
      409,
      "La configuración cambió. Actualiza el panel e intenta nuevamente.",
    );
  }
  return getClosureIncidentSettings(database);
}

function distinctAffectedProducts(
  inventory: ClosureIncidentInventoryInput[],
): number {
  return new Set(inventory.map((line) => `${line.itemType}:${line.itemId}`)).size;
}

export async function prepareClosureIncident(
  database: D1Database,
  input: PrepareClosureIncidentInput,
): Promise<PreparedClosureIncident | null> {
  const differenceInventory = input.inventory.filter(
    (line) => line.countedQuantity !== line.expectedQuantity,
  );
  const financialMagnitude =
    Math.abs(input.cashDifferenceClp) +
    Math.abs(input.cardDifferenceClp) +
    Math.abs(input.transferDifferenceClp);
  if (financialMagnitude === 0 && differenceInventory.length === 0) return null;

  for (const line of differenceInventory) {
    if (!isInventoryDifferenceReason(line.reasonCategory)) {
      throw new PosError(400, `El motivo categorizado de «${line.name}» no es válido.`);
    }
    if (!line.comment.trim() || line.comment.length > 1000) {
      throw new PosError(400, `El comentario de «${line.name}» es obligatorio.`);
    }
  }

  const settings = await getClosureIncidentSettings(database);
  const productIds = [
    ...new Set(
      differenceInventory
        .filter(({ itemType }) => itemType === "product")
        .map(({ itemId }) => itemId),
    ),
  ];
  const productPrices = new Map<string, number>();
  if (productIds.length > 0) {
    const rows = await database
      .prepare(`
        WITH requested AS (
          SELECT CAST(value AS TEXT) AS id FROM json_each(?)
        )
        SELECT product.id, product.price_clp
        FROM products AS product
        INNER JOIN requested ON requested.id = product.id
      `)
      .bind(JSON.stringify(productIds))
      .all<{ id: string; price_clp: number }>();
    for (const row of rows.results) {
      productPrices.set(row.id, Number(row.price_clp));
    }
  }

  const cutoff = new Date(
    Date.parse(input.createdAt) - settings.recurrenceWindowDays * 86_400_000,
  ).toISOString();
  const requestedItems = [
    ...new Map(
      differenceInventory.map((line) => [
        `${line.itemType}:${line.itemId}`,
        { itemType: line.itemType, itemId: line.itemId },
      ]),
    ).values(),
  ];
  const [responsiblePrior, productPrior] = await Promise.all([
    database
      .prepare(`
        SELECT COUNT(*) AS count FROM closure_incidents
        WHERE responsible = ? AND created_at >= ? AND created_at < ?
      `)
      .bind(input.responsible, cutoff, input.createdAt)
      .first<{ count: number }>(),
    requestedItems.length
      ? database
          .prepare(`
            WITH requested AS (
              SELECT json_extract(value, '$.itemType') AS item_type,
                json_extract(value, '$.itemId') AS item_id
              FROM json_each(?)
            )
            SELECT item.item_type, item.item_id,
              COUNT(DISTINCT item.incident_id) AS count
            FROM closure_incident_items AS item
            INNER JOIN closure_incidents AS incident
              ON incident.id = item.incident_id
            INNER JOIN requested
              ON requested.item_type = item.item_type
                AND requested.item_id = item.item_id
            WHERE incident.created_at >= ? AND incident.created_at < ?
            GROUP BY item.item_type, item.item_id
          `)
          .bind(JSON.stringify(requestedItems), cutoff, input.createdAt)
          .all<{ item_type: string; item_id: string; count: number }>()
      : Promise.resolve({ results: [] as Array<{ item_type: string; item_id: string; count: number }> }),
  ]);

  const priorResponsibleIncidentCount = Number(responsiblePrior?.count ?? 0);
  const highestPriorProductIncidentCount = productPrior.results.reduce(
    (maximum, row) => Math.max(maximum, Number(row.count)),
    0,
  );
  const itemRows = differenceInventory.map((line) => {
    const differenceQuantity = line.countedQuantity - line.expectedQuantity;
    const adjustmentApplied = line.adjustmentApplied ?? differenceQuantity;
    if (!Number.isSafeInteger(adjustmentApplied)) {
      throw new PosError(
        400,
        `El ajuste aplicado a «${line.name}» no es un entero válido.`,
      );
    }
    const unitValueClp =
      line.itemType === "product" ? productPrices.get(line.itemId) ?? null : null;
    const estimatedValueClp =
      unitValueClp === null
        ? null
        : Math.abs(differenceQuantity) * unitValueClp;
    return {
      ...line,
      differenceQuantity,
      adjustmentApplied,
      comment: line.comment.trim(),
      unitValueClp,
      estimatedValueClp,
      highValue:
        estimatedValueClp !== null &&
        estimatedValueClp >= settings.highValueProductClp,
    };
  });
  const estimatedValueClp = itemRows.reduce(
    (total, line) => total + (line.estimatedValueClp ?? 0),
    0,
  );
  const unvaluedItemCount = itemRows.filter(
    ({ estimatedValueClp }) => estimatedValueClp === null,
  ).length;
  const reasons: string[] = [];
  if (financialMagnitude >= settings.moneyRedThresholdClp) {
    reasons.push("diferencia de dinero");
  }
  if (
    distinctAffectedProducts(differenceInventory) >=
    settings.multipleProductRedCount
  ) {
    reasons.push("varios productos afectados");
  }
  if (itemRows.some(({ highValue }) => highValue)) {
    reasons.push("producto de alto valor");
  }
  if (
    priorResponsibleIncidentCount + 1 >= settings.recurrenceRedCount ||
    highestPriorProductIncidentCount + 1 >= settings.recurrenceRedCount
  ) {
    reasons.push("reincidencia en la ventana configurada");
  }
  const level: ClosureIncidentLevel = reasons.length ? "red" : "yellow";
  const classificationReason = reasons.length
    ? `Nivel rojo por ${reasons.join(", ")}.`
    : financialMagnitude > 0 && differenceInventory.length > 0
      ? "Nivel amarillo: diferencias menores de dinero e inventario, sin criterio rojo."
      : financialMagnitude > 0
        ? "Nivel amarillo: diferencia menor de dinero, sin criterio rojo."
        : "Nivel amarillo: diferencia de inventario aislada, sin criterio rojo.";
  const incidentId = `incident:${input.closureId}`;
  const initialEventId = `created:${incidentId}`;
  const initialFingerprint = await sha256Hex(
    JSON.stringify({ incidentId, event: "created", status: "pending_clarification" }),
  );
  const totalDifferenceClp =
    input.cashDifferenceClp +
    input.cardDifferenceClp +
    input.transferDifferenceClp;
  const statements = [
    database
      .prepare(`
        INSERT INTO closure_incidents (
          id, closure_id, created_at, business_date, shift, responsible,
          level, classification_reason, cash_difference_clp,
          card_difference_clp, transfer_difference_clp,
          total_difference_clp, inventory_difference_count,
          estimated_value_clp, unvalued_item_count,
          prior_responsible_incident_count,
          highest_prior_product_incident_count, money_red_threshold_clp,
          multiple_product_red_count, high_value_product_clp,
          recurrence_window_days, recurrence_red_count
        )
        SELECT ?, closure.id, ?, closure.business_date, closure.shift,
          closure.responsible, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM cash_closures AS closure
        WHERE closure.id = ? AND closure.session_id IS NOT NULL
        ON CONFLICT(closure_id) DO NOTHING
      `)
      .bind(
        incidentId,
        input.createdAt,
        level,
        classificationReason,
        input.cashDifferenceClp,
        input.cardDifferenceClp,
        input.transferDifferenceClp,
        totalDifferenceClp,
        itemRows.length,
        estimatedValueClp,
        unvaluedItemCount,
        priorResponsibleIncidentCount,
        highestPriorProductIncidentCount,
        settings.moneyRedThresholdClp,
        settings.multipleProductRedCount,
        settings.highValueProductClp,
        settings.recurrenceWindowDays,
        settings.recurrenceRedCount,
        input.closureId,
      ),
    database
      .prepare(`
        WITH input_items AS (
          SELECT json_extract(value, '$.key') AS item_key,
            json_extract(value, '$.itemType') AS item_type,
            json_extract(value, '$.itemId') AS item_id,
            json_extract(value, '$.name') AS item_name,
            json_extract(value, '$.unit') AS unit,
            json_extract(value, '$.location') AS location,
            CAST(json_extract(value, '$.expectedQuantity') AS INTEGER)
              AS expected_quantity,
            CAST(json_extract(value, '$.countedQuantity') AS INTEGER)
              AS counted_quantity,
            CAST(json_extract(value, '$.differenceQuantity') AS INTEGER)
              AS difference_quantity,
            CAST(json_extract(value, '$.adjustmentApplied') AS INTEGER)
              AS adjustment_applied,
            json_extract(value, '$.reasonCategory') AS reason_category,
            json_extract(value, '$.comment') AS initial_comment,
            CAST(json_extract(value, '$.unitValueClp') AS INTEGER)
              AS unit_value_clp,
            CAST(json_extract(value, '$.estimatedValueClp') AS INTEGER)
              AS estimated_value_clp,
            CAST(json_extract(value, '$.highValue') AS INTEGER) AS high_value
          FROM json_each(?)
        )
        INSERT INTO closure_incident_items (
          incident_id, item_key, item_type, item_id, item_name, unit,
          location, expected_quantity, counted_quantity,
          difference_quantity, reason_category, initial_comment,
          adjustment_applied, unit_value_clp, estimated_value_clp, high_value
        )
        SELECT ?, item_key, item_type, item_id, item_name, unit, location,
          expected_quantity, counted_quantity, difference_quantity,
          reason_category, initial_comment, adjustment_applied,
          unit_value_clp, estimated_value_clp, high_value
        FROM input_items
        WHERE EXISTS (SELECT 1 FROM closure_incidents WHERE id = ?)
        ON CONFLICT(incident_id, item_key) DO NOTHING
      `)
      .bind(JSON.stringify(itemRows), incidentId, incidentId),
    database
      .prepare(`
        INSERT INTO closure_incident_events (
          id, incident_id, created_at, event_type, status, actor_role,
          actor_name, comment, request_fingerprint
        )
        SELECT ?, incident.id, ?, 'created', 'pending_clarification',
          'system', 'Sistema', ?, ?
        FROM closure_incidents AS incident WHERE incident.id = ?
        ON CONFLICT(id) DO NOTHING
      `)
      .bind(
        initialEventId,
        input.createdAt,
        classificationReason,
        initialFingerprint,
        incidentId,
      ),
  ];
  return {
    incidentId,
    level,
    classificationReason,
    estimatedValueClp,
    unvaluedItemCount,
    statements,
  };
}

function mapIncidentSummary(
  row: IncidentSummaryRow,
  now = new Date(),
): ClosureIncidentSummary {
  return {
    id: row.id,
    closureId: row.closure_id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    businessDate: row.business_date,
    shift: row.shift,
    responsible: row.responsible,
    level: row.level,
    classificationReason: row.classification_reason,
    financialDifferenceReason: row.financial_difference_reason,
    status: row.current_status,
    statusUpdatedAt: row.status_updated_at,
    ageHours: Math.max(
      0,
      Math.floor((now.getTime() - Date.parse(row.created_at)) / 3_600_000),
    ),
    cashDifferenceClp: Number(row.cash_difference_clp),
    cardDifferenceClp: Number(row.card_difference_clp),
    transferDifferenceClp: Number(row.transfer_difference_clp),
    totalDifferenceClp: Number(row.total_difference_clp),
    inventoryDifferenceCount: Number(row.inventory_difference_count),
    estimatedValueClp: Number(row.estimated_value_clp),
    unvaluedItemCount: Number(row.unvalued_item_count),
    priorResponsibleIncidentCount: Number(
      row.prior_responsible_incident_count,
    ),
    highestPriorProductIncidentCount: Number(
      row.highest_prior_product_incident_count,
    ),
    latestRevisionNumber: Number(row.latest_revision_number),
    notificationFailedCount: Number(row.notification_failed_count),
    notificationPendingCount: Number(row.notification_pending_count),
  };
}

function filtersSql(filters: ClosureIncidentFilters): {
  sql: string;
  bindings: Array<string | number>;
} {
  const clauses: string[] = [];
  const bindings: Array<string | number> = [];
  if (filters.status) {
    clauses.push(`COALESCE((
      SELECT event.status FROM closure_incident_events AS event
      WHERE event.incident_id = incident.id AND event.status IS NOT NULL
      ORDER BY event.rowid DESC LIMIT 1
    ), 'pending_clarification') = ?`);
    bindings.push(filters.status);
  }
  if (filters.level) {
    clauses.push("incident.level = ?");
    bindings.push(filters.level);
  }
  if (filters.from) {
    clauses.push("incident.business_date >= ?");
    bindings.push(filters.from);
  }
  if (filters.to) {
    clauses.push("incident.business_date <= ?");
    bindings.push(filters.to);
  }
  if (filters.responsible) {
    clauses.push("lower(incident.responsible) LIKE ? ESCAPE '\\'");
    bindings.push(
      `%${filters.responsible
        .toLocaleLowerCase("es-CL")
        .replaceAll("\\", "\\\\")
        .replaceAll("%", "\\%")
        .replaceAll("_", "\\_")}%`,
    );
  }
  if (filters.product) {
    clauses.push(`EXISTS (
      SELECT 1 FROM closure_incident_items AS filtered_item
      WHERE filtered_item.incident_id = incident.id
        AND lower(filtered_item.item_name) LIKE ? ESCAPE '\\'
    )`);
    bindings.push(
      `%${filters.product
        .toLocaleLowerCase("es-CL")
        .replaceAll("\\", "\\\\")
        .replaceAll("%", "\\%")
        .replaceAll("_", "\\_")}%`,
    );
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    bindings,
  };
}

export async function listClosureIncidents(
  database: D1Database,
  filters: ClosureIncidentFilters = {},
  now = new Date(),
): Promise<ClosureIncidentDashboard> {
  const limit = filters.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new PosError(400, "El límite de incidencias debe estar entre 1 y 100.");
  }
  const where = filtersSql(filters);
  const periodClauses: string[] = [];
  const periodBindings: string[] = [];
  if (filters.from) {
    periodClauses.push("incident.business_date >= ?");
    periodBindings.push(filters.from);
  }
  if (filters.to) {
    periodClauses.push("incident.business_date <= ?");
    periodBindings.push(filters.to);
  }
  const periodWhere = periodClauses.length
    ? `WHERE ${periodClauses.join(" AND ")}`
    : "";
  const [rows, aggregate, responsibleRows, productRows, settings] =
    await Promise.all([
      database
        .prepare(`
          ${incidentSummarySelect}
          ${where.sql}
          ORDER BY CASE current_status
            WHEN 'requires_correction' THEN 0
            WHEN 'pending_clarification' THEN 1
            WHEN 'clarified' THEN 2
            ELSE 3 END,
            CASE incident.level WHEN 'red' THEN 0 ELSE 1 END,
            incident.created_at DESC, incident.id DESC
          LIMIT ?
        `)
        .bind(...where.bindings, limit + 1)
        .all<IncidentSummaryRow>(),
      database
        .prepare(`
          SELECT COUNT(*) AS total,
            SUM(CASE WHEN COALESCE((
              SELECT event.status FROM closure_incident_events AS event
              WHERE event.incident_id = incident.id
                AND event.status IS NOT NULL
              ORDER BY event.rowid DESC LIMIT 1
            ), 'pending_clarification') <> 'validated' THEN 1 ELSE 0 END)
              AS pending_count,
            SUM(CASE WHEN incident.level = 'red' THEN 1 ELSE 0 END)
              AS red_count,
            COALESCE(SUM(incident.estimated_value_clp), 0)
              AS accumulated_estimated_clp,
            COALESCE(SUM(abs(incident.cash_difference_clp)
              + abs(incident.card_difference_clp)
              + abs(incident.transfer_difference_clp)), 0)
              AS accumulated_money_difference_clp
          FROM closure_incidents AS incident
          ${where.sql}
        `)
        .bind(...where.bindings)
        .first<{
          total: number;
          pending_count: number | null;
          red_count: number | null;
          accumulated_estimated_clp: number;
          accumulated_money_difference_clp: number;
        }>(),
      database
        .prepare(`
          SELECT incident.responsible, COUNT(*) AS incident_count,
            COALESCE(SUM(abs(incident.cash_difference_clp)
              + abs(incident.card_difference_clp)
              + abs(incident.transfer_difference_clp)
              + incident.estimated_value_clp), 0) AS accumulated_clp
          FROM closure_incidents AS incident
          ${periodWhere}
          GROUP BY incident.responsible
          HAVING COUNT(*) > 1
          ORDER BY incident_count DESC, accumulated_clp DESC
          LIMIT 10
        `)
        .bind(...periodBindings)
        .all<{
          responsible: string;
          incident_count: number;
          accumulated_clp: number;
        }>(),
      database
        .prepare(`
          SELECT item.item_id, MAX(item.item_name) AS item_name,
            COUNT(DISTINCT item.incident_id) AS incident_count,
            SUM(abs(item.difference_quantity)) AS accumulated_quantity,
            COALESCE(SUM(item.estimated_value_clp), 0) AS accumulated_clp
          FROM closure_incident_items AS item
          INNER JOIN closure_incidents AS incident
            ON incident.id = item.incident_id
          ${periodWhere}
          GROUP BY item.item_type, item.item_id
          HAVING COUNT(DISTINCT item.incident_id) > 1
          ORDER BY incident_count DESC, accumulated_clp DESC
          LIMIT 10
        `)
        .bind(...periodBindings)
        .all<{
          item_id: string;
          item_name: string;
          incident_count: number;
          accumulated_quantity: number;
          accumulated_clp: number;
        }>(),
      getClosureIncidentSettings(database),
    ]);
  const visible = rows.results.slice(0, limit);
  return {
    incidents: visible.map((row) => mapIncidentSummary(row, now)),
    hasMore: rows.results.length > limit,
    total: Number(aggregate?.total ?? 0),
    pendingCount: Number(aggregate?.pending_count ?? 0),
    redCount: Number(aggregate?.red_count ?? 0),
    accumulatedEstimatedClp: Number(
      aggregate?.accumulated_estimated_clp ?? 0,
    ),
    accumulatedMoneyDifferenceClp: Number(
      aggregate?.accumulated_money_difference_clp ?? 0,
    ),
    responsibleRecurrence: responsibleRows.results.map((row) => ({
      responsible: row.responsible,
      incidentCount: Number(row.incident_count),
      accumulatedClp: Number(row.accumulated_clp),
    })),
    productRecurrence: productRows.results.map((row) => ({
      itemId: row.item_id,
      name: row.item_name,
      incidentCount: Number(row.incident_count),
      accumulatedQuantity: Number(row.accumulated_quantity),
      accumulatedClp: Number(row.accumulated_clp),
    })),
    settings,
  };
}

export async function getClosureIncident(
  database: D1Database,
  incidentId: string,
  now = new Date(),
): Promise<ClosureIncidentDetail | null> {
  const row = await database
    .prepare(`${incidentSummarySelect} WHERE incident.id = ?`)
    .bind(incidentId)
    .first<IncidentSummaryRow>();
  if (!row) return null;
  const [items, events, notifications, financialEvidence] = await Promise.all([
    database
      .prepare(`
        SELECT item_key, item_type, item_id, item_name, unit, location,
          expected_quantity, counted_quantity, difference_quantity,
          reason_category, initial_comment, adjustment_applied,
          unit_value_clp, estimated_value_clp, high_value
        FROM closure_incident_items
        WHERE incident_id = ? ORDER BY item_name, item_key
      `)
      .bind(incidentId)
      .all<{
        item_key: string;
        item_type: "product" | "ingredient";
        item_id: string;
        item_name: string;
        unit: string;
        location: "simple" | "vitrina" | "ingredient";
        expected_quantity: number;
        counted_quantity: number;
        difference_quantity: number;
        reason_category: InventoryDifferenceReason;
        initial_comment: string;
        adjustment_applied: number;
        unit_value_clp: number | null;
        estimated_value_clp: number | null;
        high_value: number;
      }>(),
    database
      .prepare(`
        SELECT id, created_at, event_type, status, actor_role, actor_name,
          comment FROM closure_incident_events
        WHERE incident_id = ? ORDER BY rowid
      `)
      .bind(incidentId)
      .all<{
        id: string;
        created_at: string;
        event_type: ClosureIncidentEvent["eventType"];
        status: ClosureIncidentStatus | null;
        actor_role: ClosureIncidentEvent["actorRole"];
        actor_name: string;
        comment: string | null;
      }>(),
    database
      .prepare(`
        SELECT id, incident_id, closure_id, business_date, kind,
          recipient_type, recipient, template_name, message_preview, status,
          attempt_count, last_attempt_at, sent_at, provider_message_id,
          response_status, error_code, error_message, created_at, updated_at
        FROM closure_notification_deliveries
        WHERE incident_id = ? ORDER BY created_at DESC, id DESC
      `)
      .bind(incidentId)
      .all<{
        id: string;
        incident_id: string | null;
        closure_id: string;
        business_date: string;
        kind: ClosureNotificationDelivery["kind"];
        recipient_type: ClosureNotificationDelivery["recipientType"];
        recipient: string;
        template_name: string | null;
        message_preview: string;
        status: ClosureNotificationDelivery["status"];
        attempt_count: number;
        last_attempt_at: string | null;
        sent_at: string | null;
        provider_message_id: string | null;
        response_status: number | null;
        error_code: string | null;
        error_message: string | null;
        created_at: string;
        updated_at: string;
      }>(),
    database
      .prepare(`
        SELECT revision.revision_number AS source_revision_number,
          COALESCE(revision.adjusted_expected_cash_clp,
            closure.adjusted_expected_cash_clp,
            closure.expected_cash_clp) AS expected_cash_clp,
          COALESCE(revision.counted_cash_clp,
            closure.counted_cash_clp) AS counted_cash_clp,
          COALESCE(revision.card_collected_clp,
            closure.expected_card_clp) AS expected_card_clp,
          COALESCE(revision.counted_card_clp,
            closure.counted_card_clp, 0) AS counted_card_clp,
          COALESCE(revision.transfer_collected_clp,
            closure.expected_transfer_clp) AS expected_transfer_clp,
          COALESCE(revision.counted_transfer_clp,
            closure.counted_transfer_clp, 0) AS counted_transfer_clp,
          COALESCE(revision.expected_cash_clp,
            closure.expected_cash_clp) AS expected_cash_before_expenses_clp,
          COALESCE(revision.included_sales_clp,
            closure.total_sales_clp) AS total_sales_clp,
          COALESCE(revision.included_sales_count,
            closure.sales_count) AS sales_count,
          COALESCE(revision.reason,
            closure.handoff_financial_difference_reason)
            AS financial_difference_reason
        FROM cash_closures AS closure
        LEFT JOIN cash_closure_revisions AS revision
          ON revision.id = (
            SELECT candidate.id
            FROM cash_closure_revisions AS candidate
            INNER JOIN cash_closure_revision_seals AS seal
              ON seal.revision_id = candidate.id
              AND seal.request_fingerprint = candidate.request_fingerprint
            WHERE candidate.closure_id = closure.id
              AND candidate.created_at <= ?
            ORDER BY candidate.revision_number DESC LIMIT 1
          )
          AND closure.created_at < ?
        WHERE closure.id = ?
      `)
      .bind(row.created_at, row.created_at, row.closure_id)
      .first<IncidentFinancialEvidenceRow>(),
  ]);
  if (!financialEvidence) {
    throw new Error("Closure incident financial evidence missing");
  }
  return {
    ...mapIncidentSummary(row, now),
    financialDifferenceReason:
      financialEvidence.financial_difference_reason ??
      row.financial_difference_reason,
    items: items.results.map((item) => ({
      key: item.item_key,
      itemType: item.item_type,
      itemId: item.item_id,
      name: item.item_name,
      unit: item.unit,
      location: item.location,
      expectedQuantity: Number(item.expected_quantity),
      countedQuantity: Number(item.counted_quantity),
      differenceQuantity: Number(item.difference_quantity),
      reasonCategory: item.reason_category,
      reasonLabel: INVENTORY_DIFFERENCE_REASON_LABELS[item.reason_category],
      initialComment: item.initial_comment,
      adjustmentApplied: Number(item.adjustment_applied),
      unitValueClp:
        item.unit_value_clp === null ? null : Number(item.unit_value_clp),
      estimatedValueClp:
        item.estimated_value_clp === null
          ? null
          : Number(item.estimated_value_clp),
      highValue: Boolean(item.high_value),
    })),
    events: events.results.map((event) => ({
      id: event.id,
      createdAt: event.created_at,
      eventType: event.event_type,
      status: event.status,
      actorRole: event.actor_role,
      actorName: event.actor_name,
      comment: event.comment,
    })),
    notifications: notifications.results.map((delivery) => ({
      id: delivery.id,
      incidentId: delivery.incident_id,
      closureId: delivery.closure_id,
      businessDate: delivery.business_date,
      kind: delivery.kind,
      recipientType: delivery.recipient_type,
      recipient:
        delivery.recipient_type === "configuration"
          ? delivery.recipient
          : delivery.recipient_type === "group"
            ? `Grupo oficial · …${delivery.recipient.slice(-6)}`
            : `Administrador · …${delivery.recipient.slice(-4)}`,
      templateName: delivery.template_name,
      messagePreview: delivery.message_preview,
      status: delivery.status,
      attemptCount: Number(delivery.attempt_count),
      lastAttemptAt: delivery.last_attempt_at,
      sentAt: delivery.sent_at,
      providerMessageId: delivery.provider_message_id,
      responseStatus:
        delivery.response_status === null
          ? null
          : Number(delivery.response_status),
      errorCode: delivery.error_code,
      errorMessage: delivery.error_message,
      createdAt: delivery.created_at,
      updatedAt: delivery.updated_at,
    })),
    financialEvidence: {
      sourceRevisionNumber:
        financialEvidence.source_revision_number === null
          ? null
          : Number(financialEvidence.source_revision_number),
      expectedCashClp: Number(financialEvidence.expected_cash_clp),
      countedCashClp: Number(financialEvidence.counted_cash_clp),
      expectedCardClp: Number(financialEvidence.expected_card_clp),
      countedCardClp: Number(financialEvidence.counted_card_clp),
      expectedTransferClp: Number(financialEvidence.expected_transfer_clp),
      countedTransferClp: Number(financialEvidence.counted_transfer_clp),
      expectedCashBeforeExpensesClp: Number(
        financialEvidence.expected_cash_before_expenses_clp,
      ),
      totalSalesClp: Number(financialEvidence.total_sales_clp),
      salesCount: Number(financialEvidence.sales_count),
    },
    thresholds: {
      moneyRedThresholdClp: Number(row.money_red_threshold_clp),
      multipleProductRedCount: Number(row.multiple_product_red_count),
      highValueProductClp: Number(row.high_value_product_clp),
      recurrenceWindowDays: Number(row.recurrence_window_days),
      recurrenceRedCount: Number(row.recurrence_red_count),
    },
  };
}

async function currentIncidentStatus(
  database: D1Database,
  incidentId: string,
): Promise<ClosureIncidentStatus | null> {
  const row = await database
    .prepare(`
      SELECT COALESCE((
        SELECT event.status FROM closure_incident_events AS event
        WHERE event.incident_id = incident.id AND event.status IS NOT NULL
        ORDER BY event.rowid DESC LIMIT 1
      ), 'pending_clarification') AS status
      FROM closure_incidents AS incident WHERE incident.id = ?
    `)
    .bind(incidentId)
    .first<{ status: ClosureIncidentStatus }>();
  return row?.status ?? null;
}

export async function appendClosureIncidentEvent(
  database: D1Database,
  incidentId: string,
  input: {
    id: string;
    action: ClosureIncidentAction | "validated" | "correction_applied" | "notification_retry";
    expectedStatus: ClosureIncidentStatus;
    comment: string | null;
    actorRole?: "system" | "admin" | "sales";
    actorName?: string;
  },
  now = new Date(),
): Promise<{ incident: ClosureIncidentDetail; idempotent: boolean }> {
  if (!input.id || input.id.length > 200) {
    throw new PosError(400, "El id del evento no es válido.");
  }
  const comment = input.comment?.trim() || null;
  const commentRequired = [
    "clarification_requested",
    "comment_added",
    "clarified",
    "requires_correction",
  ].includes(input.action);
  if ((commentRequired && !comment) || (comment && comment.length > 1000)) {
    throw new PosError(
      400,
      commentRequired
        ? "El comentario de esta acción es obligatorio."
        : "El comentario es demasiado largo.",
    );
  }
  const nextStatus: ClosureIncidentStatus | null =
    input.action === "clarification_requested"
      ? "pending_clarification"
      : input.action === "clarified" || input.action === "correction_applied"
        ? "clarified"
        : input.action === "requires_correction"
          ? "requires_correction"
          : input.action === "validated"
            ? "validated"
            : null;
  const actorRole = input.actorRole ?? "admin";
  const actorName = input.actorName ?? "Administrador";
  const fingerprint = await sha256Hex(
    JSON.stringify({
      incidentId,
      action: input.action,
      expectedStatus: input.expectedStatus,
      comment,
      actorRole,
      actorName,
    }),
  );
  const existing = await database
    .prepare(`
      SELECT incident_id, event_type, request_fingerprint
      FROM closure_incident_events WHERE id = ?
    `)
    .bind(input.id)
    .first<{
      incident_id: string;
      event_type: ClosureIncidentEvent["eventType"];
      request_fingerprint: string;
    }>();
  if (existing) {
    const semanticRetryReplay =
      input.action === "notification_retry" &&
      existing.incident_id === incidentId &&
      existing.event_type === "notification_retry";
    if (!semanticRetryReplay && existing.request_fingerprint !== fingerprint) {
      throw new PosError(409, "El id del evento ya fue utilizado.");
    }
    const incident = await getClosureIncident(database, incidentId, now);
    if (!incident) throw new PosError(404, "La incidencia no existe.");
    return { incident, idempotent: true };
  }
  const currentStatus = await currentIncidentStatus(database, incidentId);
  if (!currentStatus) throw new PosError(404, "La incidencia no existe.");
  if (currentStatus !== input.expectedStatus) {
    throw new PosError(
      409,
      "La incidencia cambió. Revisa su historial antes de continuar.",
    );
  }
  if (
    currentStatus === "validated" &&
    !["comment_added", "notification_retry"].includes(input.action)
  ) {
    throw new PosError(409, "La incidencia ya está validada.");
  }
  const result = await database
    .prepare(`
      INSERT INTO closure_incident_events (
        id, incident_id, created_at, event_type, status, actor_role,
        actor_name, comment, request_fingerprint
      )
      SELECT ?, incident.id, ?, ?, ?, ?, ?, ?, ?
      FROM closure_incidents AS incident
      WHERE incident.id = ? AND COALESCE((
        SELECT event.status FROM closure_incident_events AS event
        WHERE event.incident_id = incident.id AND event.status IS NOT NULL
        ORDER BY event.rowid DESC LIMIT 1
      ), 'pending_clarification') = ?
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(
      input.id,
      now.toISOString(),
      input.action,
      nextStatus,
      actorRole,
      actorName,
      comment,
      fingerprint,
      incidentId,
      input.expectedStatus,
    )
    .run();
  if (Number(result.meta.changes ?? 0) === 0) {
    const raced = await database
      .prepare(`
        SELECT incident_id, event_type, request_fingerprint
        FROM closure_incident_events WHERE id = ?
      `)
      .bind(input.id)
      .first<{
        incident_id: string;
        event_type: ClosureIncidentEvent["eventType"];
        request_fingerprint: string;
      }>();
    const semanticRetryReplay =
      input.action === "notification_retry" &&
      raced?.incident_id === incidentId &&
      raced.event_type === "notification_retry";
    if (!raced || (!semanticRetryReplay && raced.request_fingerprint !== fingerprint)) {
      throw new PosError(
        409,
        "La incidencia cambió. Revisa su historial antes de continuar.",
      );
    }
  }
  const incident = await getClosureIncident(database, incidentId, now);
  if (!incident) throw new Error("Closure incident missing after event");
  return { incident, idempotent: Number(result.meta.changes ?? 0) === 0 };
}

export async function findClosureIncidentId(
  database: D1Database,
  closureId: string,
): Promise<string | null> {
  const row = await database
    .prepare("SELECT id FROM closure_incidents WHERE closure_id = ?")
    .bind(closureId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function recordClosureIncidentValidation(
  database: D1Database,
  closureId: string,
  _revisionNumber: number,
  _comment: string | null,
  _now = new Date(),
): Promise<void> {
  void _now;
  await database
    .prepare(`
      INSERT INTO closure_incident_events (
        id, incident_id, created_at, event_type, status, actor_role,
        actor_name, comment, request_fingerprint
      )
      SELECT 'validated:' || validation.closure_id, incident.id,
        validation.validated_at, 'validated', 'validated', 'admin',
        'Administrador',
        substr(COALESCE(validation.comment,
          'Validación administrativa sobre la revisión '
            || validation.revision_number || '.'), 1, 1000),
        COALESCE(validation.request_fingerprint,
          closure.request_fingerprint, lower(hex(randomblob(32))))
      FROM cash_closure_validations AS validation
      INNER JOIN closure_incidents AS incident
        ON incident.closure_id = validation.closure_id
      INNER JOIN cash_closures AS closure
        ON closure.id = validation.closure_id
      WHERE validation.closure_id = ?
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(closureId)
    .run();
}

export async function recordClosureIncidentCorrection(
  database: D1Database,
  closureId: string,
  revisionId: string,
  _revisionNumber: number,
  _reason: string,
  _now = new Date(),
): Promise<void> {
  void _now;
  await database
    .prepare(`
      INSERT INTO closure_incident_events (
        id, incident_id, created_at, event_type, status, actor_role,
        actor_name, comment, request_fingerprint
      )
      SELECT 'correction:' || revision.id, incident.id, seal.sealed_at,
        'correction_applied', CASE WHEN
          revision.difference_cash_clp = 0
          AND revision.difference_card_clp = 0
          AND revision.difference_transfer_clp = 0
          AND NOT EXISTS (
            SELECT 1 FROM cash_closure_revision_inventory AS inventory
            WHERE inventory.revision_id = revision.id
              AND inventory.difference_quantity <> 0
          )
        THEN 'clarified' ELSE 'requires_correction' END,
        'admin', 'Administrador',
        substr('Revisión ' || revision.revision_number || ': '
          || revision.reason, 1, 1000),
        revision.request_fingerprint
      FROM cash_closure_revisions AS revision
      INNER JOIN cash_closure_revision_seals AS seal
        ON seal.revision_id = revision.id
        AND seal.request_fingerprint = revision.request_fingerprint
      INNER JOIN closure_incidents AS incident
        ON incident.closure_id = revision.closure_id
      WHERE revision.id = ? AND revision.closure_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM closure_incident_events AS event
          WHERE event.incident_id = incident.id AND event.status = 'validated'
        )
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(revisionId, closureId)
    .run();
}
