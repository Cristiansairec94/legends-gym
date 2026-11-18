import { ensureDatabase } from "@/db";
import { addIngredientStockEntry } from "@/db/pos";
import { requireAdmin } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateIngredientPathId,
  validateIngredientStockEntryPayload,
} from "../../../_shared";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { id: rawId } = await context.params;
    const ingredientId = validateIngredientPathId(rawId);
    const input = validateIngredientStockEntryPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await addIngredientStockEntry(database, ingredientId, input);
    return noStoreJson(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
