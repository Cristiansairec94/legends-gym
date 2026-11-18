import { ensureDatabase } from "@/db";
import { appendClosureIncidentEvent } from "@/db/incidents";
import { requireAdmin } from "../../../_auth";
import { apiErrorResponse, noStoreJson, readJson } from "../../../_shared";
import {
  validateIncidentEventPayload,
  validateIncidentId,
} from "../../_validation";

type RouteContext = {
  params: Promise<{ incidentId: string }> | { incidentId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { incidentId: rawIncidentId } = await context.params;
    const incidentId = validateIncidentId(rawIncidentId);
    const input = validateIncidentEventPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await appendClosureIncidentEvent(database, incidentId, input);
    return noStoreJson(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
