import { env, waitUntil } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import { findClosureIncidentId } from "@/db/incidents";
import {
  dispatchWhatsAppDelivery,
  queueImmediateIncidentNotifications,
  readWhatsAppConfig,
} from "@/db/notifications";
import {
  createCashClosureRevision,
  getCashClosureRevisionContext,
} from "@/db/pos";
import { requireAdmin } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateCashClosurePathId,
  validateCashClosureRevisionPayload,
} from "../../../_shared";

type RouteContext = {
  params: Promise<{ closureId: string }> | { closureId: string };
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { closureId: rawClosureId } = await context.params;
    const closureId = validateCashClosurePathId(rawClosureId);
    const database = await ensureDatabase();
    return noStoreJson(
      await getCashClosureRevisionContext(database, closureId),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { closureId: rawClosureId } = await context.params;
    const closureId = validateCashClosurePathId(rawClosureId);
    const input = validateCashClosureRevisionPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await createCashClosureRevision(database, closureId, input);
    const incidentId = await findClosureIncidentId(database, closureId);
    if (incidentId) {
      try {
        const whatsAppConfig = readWhatsAppConfig(env);
        const deliveryIds = await queueImmediateIncidentNotifications(
          database,
          incidentId,
          whatsAppConfig,
        );
        waitUntil(
          Promise.all(
            deliveryIds.map((deliveryId) =>
              dispatchWhatsAppDelivery(
                database,
                deliveryId,
                whatsAppConfig,
              ).catch(() => undefined),
            ),
          ).then(() => undefined),
        );
      } catch {
        // La revisión ya quedó sellada. La cola y el procesador horario
        // recuperan cualquier alerta pendiente sin afectar la corrección.
      }
    }
    return noStoreJson(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
