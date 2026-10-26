import { ensureDatabase } from "@/db";
import {
  LEGACY_PAYMENT_METHODS,
  SALE_PAYMENT_METHODS,
  listSalesHistory,
  PosError,
  type PaymentStatus,
  type SaleHistoryCursor,
  type SalePaymentMethod,
} from "@/db/pos";
import { requireAdmin } from "../../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  validateBusinessDate,
} from "../../_shared";

function parseCursor(value: string | null): SaleHistoryCursor | undefined {
  if (value === null) return undefined;
  const separator = value.indexOf("~");
  if (separator <= 0 || separator === value.length - 1) {
    throw new PosError(400, "El cursor del historial no es válido.");
  }
  const createdAt = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      createdAt,
    ) ||
    Number.isNaN(Date.parse(createdAt)) ||
    id.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)
  ) {
    throw new PosError(400, "El cursor del historial no es válido.");
  }
  return { createdAt, id };
}

function parsePaymentStatus(value: string | null): PaymentStatus | null {
  if (value === null) return null;
  if (value !== "paid" && value !== "pending" && value !== "verification_pending") {
    throw new PosError(400, "El estado de pago no es válido.");
  }
  return value;
}

function parsePaymentMethod(value: string | null): SalePaymentMethod | null {
  if (value === null) return null;
  const normalized = LEGACY_PAYMENT_METHODS.includes(
    value as (typeof LEGACY_PAYMENT_METHODS)[number],
  )
    ? "tarjeta"
    : value;
  if (!SALE_PAYMENT_METHODS.includes(normalized as SalePaymentMethod)) {
    throw new PosError(400, "El medio de pago no es válido.");
  }
  return normalized as SalePaymentMethod;
}

function parseSearch(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (normalized.length > 80) {
    throw new PosError(400, "La búsqueda no puede superar 80 caracteres.");
  }
  return normalized || null;
}

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const url = new URL(request.url);
    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit === null ? 30 : Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 90) {
      throw new PosError(400, "El límite del historial debe estar entre 1 y 90.");
    }
    const rawDateFrom = url.searchParams.get("dateFrom");
    const rawDateTo = url.searchParams.get("dateTo");
    const dateFrom = rawDateFrom === null
      ? null
      : validateBusinessDate(rawDateFrom);
    const dateTo = rawDateTo === null
      ? null
      : validateBusinessDate(rawDateTo);
    if (dateFrom !== null && dateTo !== null && dateFrom > dateTo) {
      throw new PosError(
        400,
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
    }

    const database = await ensureDatabase();
    const result = await listSalesHistory(database, {
      limit,
      cursor: parseCursor(url.searchParams.get("cursor")),
      dateFrom,
      dateTo,
      paymentStatus: parsePaymentStatus(url.searchParams.get("paymentStatus")),
      paymentMethod: parsePaymentMethod(url.searchParams.get("paymentMethod")),
      q: parseSearch(url.searchParams.get("q")),
    });
    return noStoreJson(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
