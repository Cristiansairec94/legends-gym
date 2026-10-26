import { ensureDatabase } from "@/db";
import { settleDebt } from "@/db/pos";
import { getAuthRole } from "../../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateSalePathId,
  validateSettlementPayload,
} from "../../../_shared";

type RouteContext = {
  params: Promise<{ saleId: string }> | { saleId: string };
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const role = getAuthRole(request);
    if (role === null) {
      return noStoreJson({ error: "No autenticado." }, { status: 401 });
    }
    const { saleId: rawSaleId } = await context.params;
    const saleId = validateSalePathId(rawSaleId);
    const input = validateSettlementPayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await settleDebt(database, saleId, input, role);
    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
