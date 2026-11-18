import { env } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import {
  listClosureIncidents,
  updateClosureIncidentSettings,
} from "@/db/incidents";
import {
  publicWhatsAppConfiguration,
  readWhatsAppConfig,
} from "@/db/notifications";
import { requireAdmin } from "../_auth";
import { apiErrorResponse, noStoreJson, readJson } from "../_shared";
import {
  validateIncidentFilters,
  validateIncidentSettingsPayload,
} from "./_validation";

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const database = await ensureDatabase();
    const dashboard = await listClosureIncidents(
      database,
      validateIncidentFilters(new URL(request.url)),
    );
    return noStoreJson({
      ...dashboard,
      whatsApp: publicWhatsAppConfiguration(readWhatsAppConfig(env)),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const input = validateIncidentSettingsPayload(await readJson(request));
    const database = await ensureDatabase();
    return noStoreJson({
      settings: await updateClosureIncidentSettings(database, input),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
