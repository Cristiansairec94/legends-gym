import { ensureDatabase } from "@/db";
import { validateTransferPayment } from "@/db/pos";
import { getAuthRole } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateSalePathId,
  validateTransferValidationPayload,
} from "../../../_shared";

type RouteContext = {
  params: Promise<{ saleId: string }> | { saleId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const role = getAuthRole(request);
  if (role === null) {
    return noStoreJson({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const { saleId: rawSaleId } = await context.params;
    const saleId = validateSalePathId(rawSaleId);
    const input = validateTransferValidationPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await validateTransferPayment(
      database,
      saleId,
      input,
      role,
    );
    return noStoreJson({
      ...result,
      message: result.idempotent
        ? "La transferencia ya estaba validada."
        : "Transferencia validada y sumada al cierre de caja.",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
