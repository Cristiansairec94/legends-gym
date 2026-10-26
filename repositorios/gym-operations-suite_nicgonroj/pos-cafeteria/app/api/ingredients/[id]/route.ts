import { ensureDatabase } from "@/db";
import { updateIngredientStock } from "@/db/pos";
import { requireAdmin } from "../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateIngredientPathId,
  validateIngredientStockPayload,
} from "../../_shared";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { id: rawId } = await context.params;
    const id = validateIngredientPathId(rawId);
    const input = validateIngredientStockPayload(await readJson(request));
    const database = await ensureDatabase();
    const ingredient = await updateIngredientStock(database, id, input);
    return noStoreJson({ ingredient });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
