import { ensureDatabase } from "@/db";
import { listPendingDebts, PosError, type DebtCursor } from "@/db/pos";
import { getAuthRole } from "../_auth";
import { apiErrorResponse, noStoreJson } from "../_shared";

function parseCursor(value: string | null): DebtCursor | undefined {
  if (value === null) return undefined;
  const separator = value.indexOf("~");
  if (separator <= 0 || separator === value.length - 1) {
    throw new PosError(400, "El cursor de deudas no es válido.");
  }
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (
    Number.isNaN(Date.parse(createdAt)) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(createdAt) ||
    id.length > 100
  ) {
    throw new PosError(400, "El cursor de deudas no es válido.");
  }
  return { createdAt, id };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const role = getAuthRole(request);
    if (role === null) {
      return noStoreJson({ error: "No autenticado." }, { status: 401 });
    }
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? 50 : Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 90) {
      throw new PosError(400, "El límite de deudas debe estar entre 1 y 90.");
    }
    const rawKind = url.searchParams.get("kind") ?? "all";
    if (rawKind !== "all" && rawKind !== "customer" && rawKind !== "collaborator") {
      throw new PosError(400, "El tipo de deuda no es válido.");
    }
    const collaborator = url.searchParams.get("collaborator");
    const cursor = parseCursor(url.searchParams.get("cursor"));
    const database = await ensureDatabase();
    const result = await listPendingDebts(database, {
      limit,
      cursor,
      role,
      kind: rawKind,
      collaborator,
    });
    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
