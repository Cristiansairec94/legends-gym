import { ensureDatabase } from "@/db";
import { listIngredients } from "@/db/pos";
import { requireAdmin } from "../_auth";
import { apiErrorResponse, noStoreJson } from "../_shared";

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const database = await ensureDatabase();
    const ingredients = await listIngredients(database);
    return noStoreJson({ ingredients });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
