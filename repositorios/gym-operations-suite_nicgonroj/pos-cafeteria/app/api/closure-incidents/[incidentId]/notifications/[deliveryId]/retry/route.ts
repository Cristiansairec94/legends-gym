import { env } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import { PosError } from "@/db/errors";
import {
  appendClosureIncidentEvent,
  getClosureIncident,
} from "@/db/incidents";
import {
  publicWhatsAppConfiguration,
  readWhatsAppConfig,
  retryWhatsAppDelivery,
} from "@/db/notifications";
import { requireAdmin } from "../../../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
} from "../../../../../_shared";
import {
  validateDeliveryId,
  validateIncidentId,
  validateRetryPayload,
} from "../../../../_validation";

type RouteContext = {
  params:
    | Promise<{ incidentId: string; deliveryId: string }>
    | { incidentId: string; deliveryId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { incidentId: rawIncidentId, deliveryId: rawDeliveryId } =
      await context.params;
    const incidentId = validateIncidentId(rawIncidentId);
    const deliveryId = validateDeliveryId(rawDeliveryId);
    const { eventId } = validateRetryPayload(await readJson(request));
    const database = await ensureDatabase();
    const before = await getClosureIncident(database, incidentId);
    if (!before) {
      return noStoreJson({ error: "La incidencia no existe." }, { status: 404 });
    }
    const whatsAppConfig = readWhatsAppConfig(env);
    if (!publicWhatsAppConfiguration(whatsAppConfig).alertReady) {
      throw new PosError(
        409,
        "Completa la configuración de alertas de WhatsApp antes de reintentar.",
      );
    }
    const reserved = await appendClosureIncidentEvent(database, incidentId, {
      id: eventId,
      action: "notification_retry",
      expectedStatus: before.status,
      comment: "Reintento manual de notificación por WhatsApp solicitado.",
    });
    if (reserved.idempotent) return noStoreJson(reserved);
    await retryWhatsAppDelivery(
      database,
      deliveryId,
      whatsAppConfig,
      new Date(),
      incidentId,
      eventId,
    );
    const incident = await getClosureIncident(database, incidentId);
    if (!incident) {
      return noStoreJson({ error: "La incidencia no existe." }, { status: 404 });
    }
    return noStoreJson({ incident, idempotent: false });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
