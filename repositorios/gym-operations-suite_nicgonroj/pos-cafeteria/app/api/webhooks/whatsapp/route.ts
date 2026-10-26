import { env } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import {
  applyWhatsAppWebhookStatuses,
  readWhatsAppConfig,
  verifyWhatsAppWebhookSignature,
} from "@/db/notifications";

const MAX_WEBHOOK_BYTES = 1_000_000;

function plainText(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const config = readWhatsAppConfig(env);
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (!config.webhookVerifyToken) {
    return plainText("Webhook no configurado.", 503);
  }
  if (
    mode !== "subscribe" ||
    token !== config.webhookVerifyToken ||
    challenge === null ||
    challenge.length > 500
  ) {
    return plainText("Verificación rechazada.", 403);
  }
  return plainText(challenge);
}

export async function POST(request: Request): Promise<Response> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_WEBHOOK_BYTES) {
    return plainText("Payload demasiado grande.", 413);
  }
  const config = readWhatsAppConfig(env);
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_WEBHOOK_BYTES) {
    return plainText("Payload demasiado grande.", 413);
  }
  const valid = await verifyWhatsAppWebhookSignature(
    body,
    request.headers.get("x-hub-signature-256"),
    config.appSecret,
  );
  if (!valid) return plainText("Firma inválida.", 401);
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return plainText("JSON inválido.", 400);
  }
  const database = await ensureDatabase();
  await applyWhatsAppWebhookStatuses(database, payload);
  return plainText("EVENT_RECEIVED");
}
