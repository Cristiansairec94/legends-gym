import { PosError } from "@/db/errors";
import {
  CLOSURE_INCIDENT_ACTIONS,
  CLOSURE_INCIDENT_LEVELS,
  CLOSURE_INCIDENT_STATUSES,
  type ClosureIncidentAction,
  type ClosureIncidentFilters,
  type ClosureIncidentLevel,
  type ClosureIncidentSettings,
  type ClosureIncidentStatus,
} from "@/db/incidents";
import { validateBusinessDate } from "../_shared";

function record(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PosError(400, message);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowedKeys = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedKeys.has(key));
  if (unexpected) {
    throw new PosError(400, `El campo «${unexpected}» no está permitido.`);
  }
}

function integer(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new PosError(
      400,
      `${label} debe ser un entero entre ${minimum} y ${maximum}.`,
    );
  }
  return Number(value);
}

function optionalText(
  value: unknown,
  label: string,
  maximum: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new PosError(400, `${label} debe ser texto.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new PosError(400, `${label} no es válido.`);
  }
  return normalized;
}

export function validateIncidentId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 120 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  ) {
    throw new PosError(400, "El id de la incidencia no es válido.");
  }
  return value;
}

export function validateDeliveryId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value)
  ) {
    throw new PosError(400, "El id del envío no es válido.");
  }
  return value;
}

function validateClientEventId(value: unknown): string {
  const eventId = validateIncidentId(value);
  if (/^(?:created|correction|validated|system):/iu.test(eventId)) {
    throw new PosError(400, "El id del evento usa un prefijo reservado.");
  }
  return eventId;
}

export function validateIncidentFilters(url: URL): ClosureIncidentFilters {
  const statusValue = url.searchParams.get("status");
  const levelValue = url.searchParams.get("level");
  if (
    statusValue !== null &&
    !CLOSURE_INCIDENT_STATUSES.includes(statusValue as ClosureIncidentStatus)
  ) {
    throw new PosError(400, "El estado de incidencia no es válido.");
  }
  if (
    levelValue !== null &&
    !CLOSURE_INCIDENT_LEVELS.includes(levelValue as ClosureIncidentLevel)
  ) {
    throw new PosError(400, "El nivel de incidencia no es válido.");
  }
  const fromValue = url.searchParams.get("from");
  const toValue = url.searchParams.get("to");
  const from = fromValue === null ? null : validateBusinessDate(fromValue);
  const to = toValue === null ? null : validateBusinessDate(toValue);
  if (from && to && from > to) {
    throw new PosError(400, "La fecha desde no puede ser posterior a la fecha hasta.");
  }
  const responsible = optionalText(
    url.searchParams.get("responsible"),
    "El responsable",
    100,
  );
  const product = optionalText(
    url.searchParams.get("product"),
    "El producto",
    100,
  );
  const limitValue = url.searchParams.get("limit");
  const limit =
    limitValue === null
      ? 50
      : /^\d+$/u.test(limitValue)
        ? integer(Number(limitValue), "El límite", 1, 100)
        : (() => {
            throw new PosError(400, "El límite de incidencias no es válido.");
          })();
  return {
    status: statusValue as ClosureIncidentStatus | null,
    level: levelValue as ClosureIncidentLevel | null,
    from,
    to,
    responsible,
    product,
    limit,
  };
}

export function validateIncidentSettingsPayload(
  value: unknown,
): Omit<ClosureIncidentSettings, "updatedAt"> & { expectedUpdatedAt: string } {
  const input = record(value, "La configuración debe ser un objeto JSON.");
  exactKeys(input, [
    "moneyRedThresholdClp",
    "multipleProductRedCount",
    "highValueProductClp",
    "recurrenceWindowDays",
    "recurrenceRedCount",
    "reminderHours",
    "expectedUpdatedAt",
  ]);
  if (
    typeof input.expectedUpdatedAt !== "string" ||
    Number.isNaN(Date.parse(input.expectedUpdatedAt))
  ) {
    throw new PosError(400, "La versión de configuración no es válida.");
  }
  return {
    moneyRedThresholdClp: integer(
      input.moneyRedThresholdClp,
      "El umbral de dinero",
      1,
      10_000_000,
    ),
    multipleProductRedCount: integer(
      input.multipleProductRedCount,
      "La cantidad de productos",
      1,
      90,
    ),
    highValueProductClp: integer(
      input.highValueProductClp,
      "El umbral de alto valor",
      1,
      10_000_000,
    ),
    recurrenceWindowDays: integer(
      input.recurrenceWindowDays,
      "La ventana de reincidencia",
      1,
      365,
    ),
    recurrenceRedCount: integer(
      input.recurrenceRedCount,
      "La cantidad de reincidencias",
      2,
      100,
    ),
    reminderHours: integer(
      input.reminderHours,
      "El intervalo de recordatorio",
      1,
      720,
    ),
    expectedUpdatedAt: input.expectedUpdatedAt,
  };
}

export function validateIncidentEventPayload(value: unknown): {
  id: string;
  action: ClosureIncidentAction;
  expectedStatus: ClosureIncidentStatus;
  comment: string | null;
} {
  const input = record(value, "La acción debe ser un objeto JSON.");
  exactKeys(input, ["id", "action", "expectedStatus", "comment"]);
  const id = validateClientEventId(input.id);
  if (!CLOSURE_INCIDENT_ACTIONS.includes(input.action as ClosureIncidentAction)) {
    throw new PosError(400, "La acción de incidencia no es válida.");
  }
  if (
    !CLOSURE_INCIDENT_STATUSES.includes(
      input.expectedStatus as ClosureIncidentStatus,
    )
  ) {
    throw new PosError(400, "El estado esperado no es válido.");
  }
  return {
    id,
    action: input.action as ClosureIncidentAction,
    expectedStatus: input.expectedStatus as ClosureIncidentStatus,
    comment: optionalText(input.comment, "El comentario", 1000),
  };
}

export function validateRetryPayload(value: unknown): { eventId: string } {
  const input = record(value, "El reintento debe ser un objeto JSON.");
  exactKeys(input, ["eventId"]);
  return { eventId: validateClientEventId(input.eventId) };
}
