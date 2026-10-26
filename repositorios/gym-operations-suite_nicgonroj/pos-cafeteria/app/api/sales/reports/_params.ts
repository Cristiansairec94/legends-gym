import {
  LEGACY_PAYMENT_METHODS,
  SALE_PAYMENT_METHODS,
  PosError,
  type PaymentStatus,
  type SalePaymentMethod,
} from "@/db/pos";

export type SalesReportQuery = {
  dateFrom: string | null;
  dateTo: string | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: SalePaymentMethod | null;
  q: string | null;
};

function parsePaymentStatus(value: string | null): PaymentStatus | null {
  if (value === null || value === "") return null;
  if (value !== "paid" && value !== "pending" && value !== "verification_pending") {
    throw new PosError(400, "El estado de pago no es válido.");
  }
  return value;
}

function parsePaymentMethod(value: string | null): SalePaymentMethod | null {
  if (value === null || value === "") return null;
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

export function parseSalesReportQuery(url: URL): SalesReportQuery {
  return {
    dateFrom: url.searchParams.get("dateFrom"),
    dateTo: url.searchParams.get("dateTo"),
    paymentStatus: parsePaymentStatus(url.searchParams.get("paymentStatus")),
    paymentMethod: parsePaymentMethod(url.searchParams.get("paymentMethod")),
    q: parseSearch(url.searchParams.get("q")),
  };
}
