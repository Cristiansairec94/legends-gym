import { ensureDatabase } from "@/db";
import { getActiveShiftSession, openShiftSession } from "@/db/pos";
import { getAuthRole } from "../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateOpenShiftSessionPayload,
} from "../_shared";

function publicSession(
  role: "admin" | "sales",
  session: Awaited<ReturnType<typeof getActiveShiftSession>>,
) {
  if (session === null || role === "admin") return session;
  return {
    id: session.id,
    businessDate: session.businessDate,
    shift: session.shift,
    responsible: session.responsible,
    status: session.status,
    openedAt: session.openedAt,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const role = getAuthRole(request);
    if (role === null) {
      return noStoreJson({ error: "No autenticado." }, { status: 401 });
    }
    const database = await ensureDatabase();
    const session = await getActiveShiftSession(database);
    return noStoreJson({ activeSession: publicSession(role, session) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const role = getAuthRole(request);
    if (role === null) {
      return noStoreJson({ error: "No autenticado." }, { status: 401 });
    }
    const input = validateOpenShiftSessionPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await openShiftSession(database, input);
    return noStoreJson(
      {
        session: publicSession(role, result.session),
        idempotent: result.idempotent,
      },
      { status: result.idempotent ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
