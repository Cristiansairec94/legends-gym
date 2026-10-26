import { ensureDatabase } from "@/db";
import { validateCashClosure } from "@/db/pos";
import { requireAdmin } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateCashClosurePathId,
  validateCashClosureValidationPayload,
} from "../../../_shared";

type RouteContext = {
  params:
    | Promise<{ closureId: string }>
    | { closureId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { closureId: rawClosureId } = await context.params;
    const closureId = validateCashClosurePathId(rawClosureId);
    const input = validateCashClosureValidationPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await validateCashClosure(database, closureId, input);
    return noStoreJson(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
