import { ensureDatabase } from "@/db";
import { voidSale } from "@/db/pos";
import { requireAdmin } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateSalePathId,
  validateSaleVoidPayload,
} from "../../../_shared";

type RouteContext = {
  params: Promise<{ saleId: string }> | { saleId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const { saleId: rawSaleId } = await context.params;
    const saleId = validateSalePathId(rawSaleId);
    const input = validateSaleVoidPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await voidSale(database, saleId, input, "admin");
    return noStoreJson({
      ...result,
      message: result.idempotent
        ? "La venta ya estaba anulada."
        : "Venta anulada correctamente; el stock controlado fue repuesto cuando correspondía.",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
