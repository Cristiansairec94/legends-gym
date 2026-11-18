import { ensureDatabase } from "@/db";
import {
  listTodaySales,
  PosError,
  type TodaySalesCursor,
} from "@/db/pos";
import { getAuthRole } from "../../_auth";
import { apiErrorResponse, noStoreJson } from "../../_shared";

function parseCursor(value: string | null): TodaySalesCursor | undefined {
  if (value === null) return undefined;
  const separator = value.indexOf("~");
  if (separator <= 0 || separator === value.length - 1) {
    throw new PosError(400, "El cursor de ventas de hoy no es válido.");
  }
  return {
    createdAt: value.slice(0, separator),
    id: value.slice(separator + 1),
  };
}

export async function GET(request: Request): Promise<Response> {
  const role = getAuthRole(request);
  if (role === null) {
    return noStoreJson({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? 20 : Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new PosError(
        400,
        "El límite de ventas de hoy debe estar entre 1 y 50.",
      );
    }
    const database = await ensureDatabase();
    const result = await listTodaySales(database, {
      role,
      limit,
      cursor: parseCursor(url.searchParams.get("cursor")),
    });
    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
