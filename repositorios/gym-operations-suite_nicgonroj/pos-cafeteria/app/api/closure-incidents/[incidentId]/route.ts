import { ensureDatabase } from "@/db";
import { getClosureIncident } from "@/db/incidents";
import { getCashClosureById } from "@/db/pos";
import { requireAdmin } from "../../_auth";
import { apiErrorResponse, noStoreJson } from "../../_shared";
import { validateIncidentId } from "../_validation";

type RouteContext = {
  params: Promise<{ incidentId: string }> | { incidentId: string };
};

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const { incidentId: rawIncidentId } = await context.params;
    const incidentId = validateIncidentId(rawIncidentId);
    const database = await ensureDatabase();
    const incident = await getClosureIncident(database, incidentId);
    if (!incident) {
      return noStoreJson({ error: "La incidencia no existe." }, { status: 404 });
    }
    const closure = await getCashClosureById(database, incident.closureId);
    if (!closure) {
      return noStoreJson({ error: "El cierre asociado no existe." }, { status: 404 });
    }
    return noStoreJson({ incident, closure });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
