"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type PaidPaymentMethod = "efectivo" | "tarjeta" | "transferencia";
type SalePaymentMethod = PaidPaymentMethod | "pendiente" | "colaborador";
type PaymentStatus = "paid" | "pending" | "verification_pending";

type SaleItem = {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  lineTotalClp: number;
};

type SalePayment = {
  id: string;
  createdAt: string;
  shift: "am" | "pm" | null;
  paymentMethod: PaidPaymentMethod;
  amountClp: number;
  receivedBy: string | null;
};

type HistoricalSale = {
  id: string;
  createdAt: string;
  shift: "am" | "pm" | null;
  paymentMethod: SalePaymentMethod;
  settledPaymentMethod: PaidPaymentMethod | null;
  paymentStatus: PaymentStatus;
  debtNote: string | null;
  debtorCollaborator: string | null;
  seller: string | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  paymentCount: number;
  paymentsHasMore: boolean;
  payments: SalePayment[];
  items: SaleItem[];
};

export type HistoryFilters = {
  dateFrom: string;
  dateTo: string;
  paymentStatus: PaymentStatus | "";
  paymentMethod: SalePaymentMethod | "";
  q: string;
};

type HistoryPage = {
  sales: HistoricalSale[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

const EMPTY_FILTERS: HistoryFilters = {
  dateFrom: "",
  dateTo: "",
  paymentStatus: "",
  paymentMethod: "",
  q: "",
};

type SalesHistoryPanelProps = {
  refreshSignal?: number;
  defaultDateFrom: string;
  defaultDateTo: string;
  focusDate?: string | null;
  focusRequestId?: number;
  exportReport: (filters: HistoryFilters) => Promise<string>;
};

const EMPTY_PAGE: HistoryPage = {
  sales: [],
  totalCount: 0,
  hasMore: false,
  nextCursor: null,
};

const PAYMENT_METHODS: Array<{ value: SalePaymentMethod; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "pendiente", label: "Pendiente" },
  { value: "colaborador", label: "Colaborador" },
];

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function paymentLabel(value: SalePaymentMethod | null) {
  if (!value) return "Sin información";
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
}

function makeQuery(filters: HistoryFilters, cursor?: string) {
  const query = new URLSearchParams({ limit: "30" });
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.paymentStatus) query.set("paymentStatus", filters.paymentStatus);
  if (filters.paymentMethod) query.set("paymentMethod", filters.paymentMethod);
  if (filters.q.trim()) query.set("q", filters.q.trim());
  if (cursor) query.set("cursor", cursor);
  return query.toString();
}

function filtersForRange(dateFrom: string, dateTo: string): HistoryFilters {
  return { ...EMPTY_FILTERS, dateFrom, dateTo };
}

function inclusiveDayCount(dateFrom: string, dateTo: string) {
  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000) + 1;
}

async function readHistory(response: Response): Promise<HistoryPage> {
  let payload: HistoryPage & { error?: string };
  try {
    payload = (await response.json()) as HistoryPage & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "El historial respondió con datos no válidos."
        : `No se pudo consultar el historial (${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo consultar el historial de ventas.");
  }
  return payload;
}

async function fetchHistory(filters: HistoryFilters, cursor?: string) {
  const response = await fetch(`/api/sales/history?${makeQuery(filters, cursor)}`, {
    cache: "no-store",
  });
  return readHistory(response);
}

export function SalesHistoryPanel({
  refreshSignal = 0,
  defaultDateFrom,
  defaultDateTo,
  focusDate = null,
  focusRequestId = 0,
  exportReport,
}: SalesHistoryPanelProps) {
  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(() =>
    filtersForRange(focusDate ?? defaultDateFrom, focusDate ?? defaultDateTo),
  );
  const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>(() =>
    filtersForRange(focusDate ?? defaultDateFrom, focusDate ?? defaultDateTo),
  );
  const [page, setPage] = useState<HistoryPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retryMore, setRetryMore] = useState(false);
  const [filterError, setFilterError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const requestIdRef = useRef(0);
  const handledFocusRequestRef = useRef(focusRequestId);
  const errorRef = useRef<HTMLDivElement>(null);
  const exportErrorRef = useRef<HTMLParagraphElement>(null);
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setRetryMore(false);
    try {
      const payload = await fetchHistory(appliedFilters);
      if (requestId !== requestIdRef.current) return;
      setPage(payload);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo consultar el historial de ventas.",
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFirstPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFirstPage, refreshSignal]);

  useEffect(() => {
    if (!focusDate || handledFocusRequestRef.current === focusRequestId) return;
    handledFocusRequestRef.current = focusRequestId;
    const timer = window.setTimeout(() => {
      const nextFilters = filtersForRange(focusDate, focusDate);
      requestIdRef.current += 1;
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setPage(EMPTY_PAGE);
      setLoading(true);
      setLoadingMore(false);
      setError("");
      setFilterError("");
      setRetryMore(false);
      setExportError("");
      setExportNotice("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [focusDate, focusRequestId]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftFilters.dateFrom || !draftFilters.dateTo) {
      setFilterError("Selecciona las fechas Desde y Hasta para consultar y exportar el mismo período.");
      window.requestAnimationFrame(() =>
        (draftFilters.dateFrom ? dateToRef : dateFromRef).current?.focus(),
      );
      return;
    }
    if (
      draftFilters.dateFrom &&
      draftFilters.dateTo &&
      draftFilters.dateFrom > draftFilters.dateTo
    ) {
      setFilterError("La fecha Hasta debe ser igual o posterior a la fecha Desde.");
      window.requestAnimationFrame(() => dateToRef.current?.focus());
      return;
    }
    if (inclusiveDayCount(draftFilters.dateFrom, draftFilters.dateTo) > 366) {
      setFilterError("El rango puede incluir como máximo 366 días. Acorta la fecha Desde o Hasta.");
      window.requestAnimationFrame(() => dateToRef.current?.focus());
      return;
    }

    setFilterError("");
    setError("");
    setRetryMore(false);
    requestIdRef.current += 1;
    setLoading(true);
    setLoadingMore(false);
    setPage(EMPTY_PAGE);
    setAppliedFilters({ ...draftFilters, q: draftFilters.q.trim() });
    setExportError("");
    setExportNotice("");
  }

  function clearFilters() {
    const nextFilters = filtersForRange(defaultDateFrom, defaultDateTo);
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterError("");
    setError("");
    setRetryMore(false);
    requestIdRef.current += 1;
    setLoading(true);
    setLoadingMore(false);
    setPage(EMPTY_PAGE);
    setExportError("");
    setExportNotice("");
  }

  async function exportAppliedFilters() {
    if (exporting || loading || loadingMore) return;
    setExporting(true);
    setExportError("");
    setExportNotice("");
    try {
      const filename = await exportReport(appliedFilters);
      setExportNotice(`Excel descargado: ${filename}`);
    } catch (downloadError) {
      setExportError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo descargar el reporte. Inténtalo nuevamente.",
      );
      window.requestAnimationFrame(() => exportErrorRef.current?.focus());
    } finally {
      setExporting(false);
    }
  }

  async function loadMore() {
    if (!page.hasMore || !page.nextCursor || loading || loadingMore) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    setError("");
    setRetryMore(false);
    try {
      const payload = await fetchHistory(appliedFilters, page.nextCursor);
      if (requestId !== requestIdRef.current) return;
      setPage((current) => {
        const seen = new Set(current.sales.map((sale) => sale.id));
        const newSales = payload.sales.filter((sale) => !seen.has(sale.id));
        return {
          ...payload,
          sales: [...current.sales, ...newSales],
        };
      });
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar más ventas. Inténtalo nuevamente.",
      );
      setRetryMore(true);
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }

  return (
    <div className="sales-history-section" aria-labelledby="sales-history-title">
      <div className="sales-history-heading">
        <div>
          <h3 id="sales-history-title">Detalle de ventas</h3>
          <p>Revisa cada venta, sus productos, pagos y responsable.</p>
        </div>
        <div className="sales-history-count" aria-live="polite">
          <strong>{page.totalCount}</strong>
          <span>{page.totalCount === 1 ? "venta encontrada" : "ventas encontradas"}</span>
        </div>
      </div>

      <form className="sales-history-filters" onSubmit={applyFilters}>
        <fieldset>
          <legend>Filtrar historial</legend>
          <label>
            <span>Desde</span>
            <input
              ref={dateFromRef}
              type="date"
              value={draftFilters.dateFrom}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }));
                setFilterError("");
              }}
              aria-invalid={Boolean(filterError) && !draftFilters.dateFrom}
              aria-describedby={filterError ? "sales-history-filter-error" : undefined}
              required
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              ref={dateToRef}
              type="date"
              value={draftFilters.dateTo}
              onChange={(event) => {
                setDraftFilters((current) => ({ ...current, dateTo: event.target.value }));
                setFilterError("");
              }}
              aria-invalid={Boolean(filterError)}
              aria-describedby={filterError ? "sales-history-filter-error" : undefined}
              required
            />
          </label>
          <label>
            <span>Estado</span>
            <select
              value={draftFilters.paymentStatus}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  paymentStatus: event.target.value as PaymentStatus | "",
                }))
              }
            >
              <option value="">Todos</option>
              <option value="paid">Pagadas</option>
              <option value="pending">Pendientes</option>
              <option value="verification_pending">Transferencias por validar</option>
            </select>
          </label>
          <label>
            <span>Medio de registro</span>
            <select
              value={draftFilters.paymentMethod}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  paymentMethod: event.target.value as SalePaymentMethod | "",
                }))
              }
            >
              <option value="">Todos</option>
              {PAYMENT_METHODS.map((method) => (
                <option value={method.value} key={method.value}>{method.label}</option>
              ))}
            </select>
          </label>
          <label className="sales-history-search">
            <span>Buscar</span>
            <input
              type="search"
              value={draftFilters.q}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, q: event.target.value }))
              }
              maxLength={80}
              placeholder="Producto, persona, nota o ID"
            />
          </label>
        </fieldset>
        <div className="sales-history-filter-actions">
          <button className="sales-history-apply" type="submit" disabled={loading || loadingMore || exporting}>
            {loading ? "Consultando…" : "Aplicar filtros"}
          </button>
          <button className="sales-history-clear" type="button" onClick={clearFilters} disabled={loading || loadingMore || exporting}>
            Restablecer
          </button>
          <button
            className="sales-history-export"
            type="button"
            onClick={() => void exportAppliedFilters()}
            disabled={exporting || loading || loadingMore}
          >
            {exporting ? "Preparando Excel…" : "Exportar a Excel"}
          </button>
        </div>
        {filterError ? (
          <p className="sales-history-filter-error" id="sales-history-filter-error" role="alert">
            {filterError}
          </p>
        ) : null}
        <p className="sales-history-export-help">La descarga usa los filtros aplicados, no los cambios aún sin aplicar.</p>
        {exportError ? (
          <p className="sales-history-export-error" ref={exportErrorRef} role="alert" tabIndex={-1}>
            {exportError}
          </p>
        ) : null}
        {exportNotice ? <p className="sales-history-export-notice" role="status">{exportNotice}</p> : null}
      </form>

      {error ? (
        <div className="sales-history-alert" ref={errorRef} role="alert" tabIndex={-1}>
          <div>
            <strong>No pudimos cargar el historial</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => void (retryMore ? loadMore() : loadFirstPage())}>
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="sales-history-results" aria-busy={loading || loadingMore}>
        {loading && page.sales.length === 0 ? (
          <div className="sales-history-state" role="status">
            <strong>Cargando ventas…</strong>
            <span>Estamos consultando el historial completo.</span>
          </div>
        ) : !error && page.sales.length === 0 ? (
          <div className="sales-history-state">
            <strong>No encontramos ventas</strong>
            <span>Prueba limpiando o cambiando los filtros aplicados.</span>
          </div>
        ) : (
          <div className="sales-history-list">
            {page.sales.map((sale) => {
              const directMethod = sale.paymentMethod === "pendiente" || sale.paymentMethod === "colaborador"
                ? null
                : sale.paymentMethod;
              const method = sale.payments.at(-1)?.paymentMethod ?? sale.settledPaymentMethod ?? directMethod;
              return (
                <article className="sales-history-card" key={sale.id}>
                  <header className="sales-history-card-header">
                    <div>
                      <time dateTime={sale.createdAt}>
                        {formatDate(sale.createdAt)} · {formatTime(sale.createdAt)}
                      </time>
                      <span className="sales-history-id">ID {sale.id}</span>
                    </div>
                    <span
                      className={`sales-history-status ${sale.paymentStatus === "paid" ? "sales-history-status-paid" : "sales-history-status-pending"}`}
                    >
                      {sale.paymentStatus === "verification_pending"
                        ? "Transferencia por validar"
                        : sale.paymentStatus === "pending"
                          ? "Pendiente"
                          : "Pagada"}
                    </span>
                  </header>

                  <div className="sales-history-card-body">
                    <div className="sales-history-detail">
                      <h3>Productos</h3>
                      <ul className="sales-history-items">
                        {sale.items.map((item) => (
                          <li key={`${sale.id}-${item.productId}`}>
                            <span>{item.quantity} × {item.productName}</span>
                            <strong>{formatClp(item.lineTotalClp)}</strong>
                          </li>
                        ))}
                      </ul>
                      <dl className="sales-history-context">
                        <div>
                          <dt>Responsable</dt>
                          <dd>{sale.seller || "No registrado"}</dd>
                        </div>
                        <div>
                          <dt>Turno</dt>
                          <dd>{sale.shift ? sale.shift.toUpperCase() : "No registrado"}</dd>
                        </div>
                        <div>
                          <dt>Medio registrado</dt>
                          <dd>{paymentLabel(sale.paymentMethod)}</dd>
                        </div>
                        <div>
                          <dt>Último medio de cobro</dt>
                          <dd>{method ? paymentLabel(method) : "Sin cobros"}</dd>
                        </div>
                      </dl>
                      {sale.debtorCollaborator || sale.debtNote ? (
                        <p className="sales-history-note">
                          <strong>Referencia:</strong>{" "}
                          {[sale.debtorCollaborator, sale.debtNote].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="sales-history-money">
                      <dl>
                        <div><dt>Total</dt><dd>{formatClp(sale.totalClp)}</dd></div>
                        <div><dt>Abonado</dt><dd>{formatClp(sale.paidClp)}</dd></div>
                        <div><dt>Saldo</dt><dd>{formatClp(sale.balanceClp)}</dd></div>
                      </dl>
                      <details className="sales-history-payments">
                        <summary>
                          Ver pagos ({sale.paymentCount})
                        </summary>
                        {sale.payments.length ? (
                          <ul>
                            {sale.payments.map((payment) => (
                              <li key={payment.id}>
                                <div>
                                  <strong>{paymentLabel(payment.paymentMethod)}</strong>
                                  <span>
                                    {formatDate(payment.createdAt)} · {formatTime(payment.createdAt)}
                                    {payment.shift ? ` · ${payment.shift.toUpperCase()}` : ""}
                                    {payment.receivedBy ? ` · ${payment.receivedBy}` : ""}
                                  </span>
                                </div>
                                <strong>{formatClp(payment.amountClp)}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No hay eventos de pago disponibles para esta venta.</p>
                        )}
                        {sale.paymentsHasMore ? (
                          <p>Este registro muestra solo los pagos más recientes de la venta.</p>
                        ) : null}
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {page.hasMore && page.nextCursor ? (
        <div className="sales-history-pagination">
          <span>Mostrando {page.sales.length} de {page.totalCount}</span>
          <button type="button" onClick={() => void loadMore()} disabled={loading || loadingMore}>
            {loadingMore ? "Cargando más…" : "Cargar más"}
          </button>
        </div>
      ) : page.sales.length ? (
        <p className="sales-history-end" role="status">
          Estás viendo las {page.sales.length === 1 ? "venta disponible" : `${page.sales.length} ventas disponibles`}.
        </p>
      ) : null}
    </div>
  );
}
