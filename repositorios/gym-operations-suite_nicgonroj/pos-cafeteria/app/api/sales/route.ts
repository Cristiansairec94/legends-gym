import { ensureDatabase } from "@/db";
import { createSale } from "@/db/pos";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateSalePayload,
} from "../_shared";

export async function POST(request: Request): Promise<Response> {
  try {
    const input = validateSalePayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await createSale(database, input);

    return noStoreJson(
      { sale: result.sale, idempotent: result.idempotent },
      { status: result.idempotent ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
