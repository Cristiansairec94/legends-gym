import { env } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import {
  processDueNotificationPolicies,
  readWhatsAppConfig,
} from "@/db/notifications";
import { requireAdmin } from "../../../_auth";
import { apiErrorResponse, noStoreJson } from "../../../_shared";

export async function POST(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;
  try {
    const database = await ensureDatabase();
    return noStoreJson(
      await processDueNotificationPolicies(database, readWhatsAppConfig(env)),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
