"use client";

import {
  type CSSProperties,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SalesHistoryPanel,
  type HistoryFilters,
} from "@/app/components/sales-history-panel";

type ReportTab = "summary" | "detail";

type DailyReportMetrics = {
  totalSalesClp: number;
  salesCount: number;
  units: number;
  averageClp: number;
  outstandingSalesClp: number;
  pendingCustomerClp: number;
  collaboratorClp: number;
  collectedClp: number;
  settlementClp: number;
  cashClp: number;
  cardClp: number;
  transferClp: number;
};

type DailyReportPeriod = DailyReportMetrics & {
  dateFrom: string;
  dateTo: string;
};

type DailyReportDay = DailyReportMetrics & {
  date: string;
};

type DailyReport = {
  period: DailyReportPeriod;
  days: DailyReportDay[];
};

type DateRange = {
  dateFrom: string;
  dateTo: string;
};

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function dateOnlyToDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatReportDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(dateOnlyToDate(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Santiago",
  }).format(dateOnlyToDate(value));
}

function santiagoDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Santiago",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addCalendarDays(date: string, days: number) {
  const value = dateOnlyToDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function makeDefaultRange(): DateRange {
  const dateTo = santiagoDateString();
  return { dateFrom: addCalendarDays(dateTo, -29), dateTo };
}

function inclusiveDayCount(dateFrom: string, dateTo: string) {
  return Math.round(
    (dateOnlyToDate(dateTo).getTime() - dateOnlyToDate(dateFrom).getTime()) / 86_400_000,
  ) + 1;
}

function reportQuery(range: DateRange) {
  return new URLSearchParams({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  }).toString();
}

async function readError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

async function fetchDailyReport(range: DateRange) {
  const response = await fetch(`/api/sales/reports/daily?${reportQuery(range)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "No se pudo cargar el resumen de ventas."));
  }
  return response.json() as Promise<DailyReport>;
}

function safeDownloadName(response: Response, filters: HistoryFilters) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = disposition.match(/filename="([^"]+)"/i)?.[1];
  let candidate = quoted;
  if (encoded) {
    try {
      candidate = decodeURIComponent(encoded);
    } catch {
      candidate = undefined;
    }
  }
  const fallback = `cafeteria-demogym-ventas_${filters.dateFrom}_a_${filters.dateTo}.xlsx`;
  const sanitized = (candidate || fallback)
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/[^A-Za-z0-9._áéíóúÁÉÍÓÚñÑ-]/g, "_");
  return sanitized?.toLowerCase().endsWith(".xlsx") ? sanitized : fallback;
}

async function downloadSalesReport(filters: HistoryFilters) {
  const query = new URLSearchParams({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  if (filters.paymentStatus) query.set("paymentStatus", filters.paymentStatus);
  if (filters.paymentMethod) query.set("paymentMethod", filters.paymentMethod);
  if (filters.q.trim()) query.set("q", filters.q.trim());

  const response = await fetch(`/api/sales/reports/export.xlsx?${query.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(await readError(response, "No se pudo preparar el archivo Excel."));
  }

  const blob = await response.blob();
  if (blob.size === 0) throw new Error("El archivo Excel llegó vacío. Inténtalo nuevamente.");
  const filename = safeDownloadName(response, filters);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  return filename;
}

function filtersForRange(range: DateRange): HistoryFilters {
  return {
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    paymentStatus: "",
    paymentMethod: "",
    q: "",
  };
}

function rangeError(range: DateRange) {
  if (!range.dateFrom || !range.dateTo) {
    return "Selecciona las fechas Desde y Hasta para generar el reporte.";
  }
  if (range.dateFrom > range.dateTo) {
    return "La fecha Hasta debe ser igual o posterior a la fecha Desde.";
  }
  if (inclusiveDayCount(range.dateFrom, range.dateTo) > 366) {
    return "El reporte puede incluir como máximo 366 días. Acorta el rango.";
  }
  return "";
}

function DailySummary({
  refreshSignal,
  defaultRange,
  onViewDetail,
}: {
  refreshSignal: number;
  defaultRange: DateRange;
  onViewDetail: (date: string) => void;
}) {
  const [draftRange, setDraftRange] = useState<DateRange>(defaultRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const requestIdRef = useRef(0);
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const exportErrorRef = useRef<HTMLParagraphElement>(null);

  const loadReport = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    try {
      const payload = await fetchDailyReport(appliedRange);
      if (requestId !== requestIdRef.current) return;
      setData(payload);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el resumen de ventas.",
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [appliedRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReport, refreshSignal]);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = rangeError(draftRange);
    if (nextError) {
      setFilterError(nextError);
      window.requestAnimationFrame(() =>
        (!draftRange.dateFrom ? dateFromRef : dateToRef).current?.focus(),
      );
      return;
    }
    requestIdRef.current += 1;
    setAppliedRange({ ...draftRange });
    setData(null);
    setLoading(true);
    setError("");
    setFilterError("");
    setExportError("");
    setExportNotice("");
  }

  function resetRange() {
    requestIdRef.current += 1;
    setDraftRange(defaultRange);
    setAppliedRange({ ...defaultRange });
    setData(null);
    setLoading(true);
    setError("");
    setFilterError("");
    setExportError("");
    setExportNotice("");
  }

  async function exportRange() {
    if (exporting || loading) return;
    setExporting(true);
    setExportError("");
    setExportNotice("");
    try {
      const filename = await downloadSalesReport(filtersForRange(appliedRange));
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

  const trendDays = useMemo(
    () => data?.days.slice(0, 7).reverse() ?? [],
    [data],
  );
  const trendMaximum = Math.max(0, ...trendDays.map((day) => day.totalSalesClp));
  const hasActivity = data?.days.some(
    (day) => day.salesCount > 0 || day.collectedClp > 0,
  ) ?? false;

  return (
    <div className="sales-report-summary" aria-labelledby="sales-report-summary-title">
      <div className="sales-report-subheading">
        <div>
          <h3 id="sales-report-summary-title">Resumen por día</h3>
          <p>Ventas originadas y cobros recibidos son métricas distintas.</p>
        </div>
      </div>

      <form className="sales-report-range-form" onSubmit={applyRange}>
        <fieldset>
          <legend>Período del reporte</legend>
          <label>
            <span>Desde</span>
            <input
              ref={dateFromRef}
              type="date"
              value={draftRange.dateFrom}
              onChange={(event) => {
                setDraftRange((current) => ({ ...current, dateFrom: event.target.value }));
                setFilterError("");
              }}
              aria-invalid={Boolean(filterError) && !draftRange.dateFrom}
              aria-describedby={filterError ? "sales-report-range-error" : undefined}
              required
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              ref={dateToRef}
              type="date"
              value={draftRange.dateTo}
              onChange={(event) => {
                setDraftRange((current) => ({ ...current, dateTo: event.target.value }));
                setFilterError("");
              }}
              aria-invalid={Boolean(filterError)}
              aria-describedby={filterError ? "sales-report-range-error" : undefined}
              required
            />
          </label>
        </fieldset>
        <div className="sales-report-range-actions">
          <button className="sales-report-apply" type="submit" disabled={loading || exporting}>
            {loading ? "Consultando…" : "Aplicar período"}
          </button>
          <button className="sales-report-reset" type="button" onClick={resetRange} disabled={loading || exporting}>
            Últimos 30 días
          </button>
          <button className="sales-report-export" type="button" onClick={() => void exportRange()} disabled={loading || exporting}>
            {exporting ? "Preparando Excel…" : "Exportar a Excel"}
          </button>
        </div>
        {filterError ? <p id="sales-report-range-error" className="sales-report-filter-error" role="alert">{filterError}</p> : null}
        <p className="sales-report-export-help">La descarga usa el período aplicado, aunque existan cambios sin aplicar en las fechas.</p>
        {exportError ? <p className="sales-report-export-error" ref={exportErrorRef} role="alert" tabIndex={-1}>{exportError}</p> : null}
        {exportNotice ? <p className="sales-report-export-notice" role="status">{exportNotice}</p> : null}
      </form>

      {error ? (
        <div className="sales-report-alert" ref={errorRef} role="alert" tabIndex={-1}>
          <div><strong>No pudimos cargar el reporte</strong><span>{error}</span></div>
          <button type="button" onClick={() => void loadReport()}>Reintentar</button>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="sales-report-state" role="status">
          <strong>Calculando resumen…</strong>
          <span>Estamos reuniendo las ventas y los cobros del período.</span>
        </div>
      ) : data ? (
        <>
          <p className="sr-only" role="status">
            Reporte cargado: {data.period.salesCount} ventas por {formatClp(data.period.totalSalesClp)} entre {formatReportDate(data.period.dateFrom)} y {formatReportDate(data.period.dateTo)}.
          </p>
          <div className="sales-report-kpis">
            <article className="sales-report-kpi sales-report-kpi-primary">
              <span>Vendido en el período</span>
              <strong>{formatClp(data.period.totalSalesClp)}</strong>
              <small>{data.period.salesCount} ventas · {data.period.units} unidades</small>
            </article>
            <article className="sales-report-kpi">
              <span>Abonado a esas ventas</span>
              <strong>{formatClp(data.period.totalSalesClp - data.period.outstandingSalesClp)}</strong>
              <small>Pagos acumulados de ventas originadas en el período</small>
            </article>
            <article className="sales-report-kpi sales-report-kpi-pending">
              <span>Saldo actual de esas ventas</span>
              <strong>{formatClp(data.period.outstandingSalesClp)}</strong>
              <small>Clientes {formatClp(data.period.pendingCustomerClp)} · Colaboradores {formatClp(data.period.collaboratorClp)}</small>
            </article>
            <article className="sales-report-kpi">
              <span>Cobros recibidos en el período</span>
              <strong>{formatClp(data.period.collectedClp)}</strong>
              <small>Abonos {formatClp(data.period.settlementClp)} · Efectivo {formatClp(data.period.cashClp)} · Tarjeta {formatClp(data.period.cardClp)} · Transferencia {formatClp(data.period.transferClp)}.</small>
            </article>
            <article className="sales-report-kpi">
              <span>Ticket promedio</span>
              <strong>{formatClp(data.period.averageClp)}</strong>
              <small>Promedio de ventas originadas</small>
            </article>
          </div>

          {trendDays.length >= 4 && trendMaximum > 0 ? (
            <section className="sales-report-trend" aria-labelledby="sales-report-trend-title">
              <div>
                <h4 id="sales-report-trend-title">Tendencia de ventas diarias</h4>
                <p>Últimos {trendDays.length} días del período.</p>
              </div>
              <ol>
                {trendDays.map((day) => {
                  const height = day.totalSalesClp === 0
                    ? 0
                    : Math.max(6, Math.round((day.totalSalesClp / trendMaximum) * 100));
                  return (
                    <li key={day.date} aria-label={`${formatReportDate(day.date)}: vendido ${formatClp(day.totalSalesClp)}`}>
                      <strong>{formatCompactClp(day.totalSalesClp)}</strong>
                      <span className="sales-report-trend-track" aria-hidden="true">
                        <span style={{ "--sales-trend-height": `${height}%` } as CSSProperties} />
                      </span>
                      <time dateTime={day.date}>{formatShortDate(day.date)}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          {hasActivity ? (
            <div className="sales-report-days">
              {data.days.map((day) => (
                <article className="sales-report-day-card" key={day.date}>
                  <header>
                    <time dateTime={day.date}>{formatReportDate(day.date)}</time>
                    <button type="button" onClick={() => onViewDetail(day.date)} aria-label={`Ver detalle de ventas originadas el ${formatReportDate(day.date)}`}>
                      Ver detalle
                    </button>
                  </header>
                  <div className="sales-report-day-groups">
                    <section aria-label={`Ventas originadas el ${formatReportDate(day.date)}`}>
                      <h4>Ventas originadas</h4>
                      <dl>
                        <div><dt>Total vendido</dt><dd>{formatClp(day.totalSalesClp)}</dd></div>
                        <div><dt>Abonado a esas ventas</dt><dd>{formatClp(day.totalSalesClp - day.outstandingSalesClp)}</dd></div>
                        <div><dt>Saldo actual</dt><dd>{formatClp(day.outstandingSalesClp)}</dd></div>
                        <div><dt>Ventas</dt><dd>{day.salesCount}</dd></div>
                        <div><dt>Unidades</dt><dd>{day.units}</dd></div>
                        <div><dt>Ticket promedio</dt><dd>{formatClp(day.averageClp)}</dd></div>
                      </dl>
                      <p>Saldo: clientes {formatClp(day.pendingCustomerClp)} · colaboradores {formatClp(day.collaboratorClp)}</p>
                    </section>
                    <section aria-label={`Cobros recibidos el ${formatReportDate(day.date)}`}>
                      <h4>Cobros recibidos ese día</h4>
                      <dl>
                        <div><dt>Total recibido</dt><dd>{formatClp(day.collectedClp)}</dd></div>
                        <div><dt>Abonos cobrados</dt><dd>{formatClp(day.settlementClp)}</dd></div>
                        <div><dt>Efectivo</dt><dd>{formatClp(day.cashClp)}</dd></div>
                        <div><dt>Tarjeta</dt><dd>{formatClp(day.cardClp)}</dd></div>
                        <div><dt>Transferencia</dt><dd>{formatClp(day.transferClp)}</dd></div>
                      </dl>
                      <p>Los abonos incluyen cobros de clientes y colaboradores, aunque el consumo se haya originado antes.</p>
                    </section>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sales-report-state">
              <strong>No hay actividad en este período</strong>
              <span>Cambia las fechas para revisar otro rango.</span>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export function SalesReportsPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [detailVisited, setDetailVisited] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [detailRequestId, setDetailRequestId] = useState(0);
  const [defaultRange] = useState<DateRange>(makeDefaultRange);
  const summaryTabRef = useRef<HTMLButtonElement>(null);
  const detailTabRef = useRef<HTMLButtonElement>(null);

  function activateTab(tab: ReportTab, focus = false) {
    setActiveTab(tab);
    if (tab === "detail") setDetailVisited(true);
    if (focus) {
      window.requestAnimationFrame(() =>
        (tab === "summary" ? summaryTabRef : detailTabRef).current?.focus(),
      );
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextTab: ReportTab | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextTab = activeTab === "summary" ? "detail" : "summary";
    } else if (event.key === "Home") {
      nextTab = "summary";
    } else if (event.key === "End") {
      nextTab = "detail";
    }
    if (!nextTab) return;
    event.preventDefault();
    activateTab(nextTab, true);
  }

  function viewDay(date: string) {
    setDetailDate(date);
    setDetailRequestId((current) => current + 1);
    activateTab("detail", true);
  }

  return (
    <section className="sales-reports-section" aria-labelledby="sales-reports-title">
      <header className="sales-reports-heading">
        <div>
          <p className="eyebrow">Análisis administrativo</p>
          <h2 id="sales-reports-title">Reportes de ventas</h2>
          <p>Consulta el desempeño diario o revisa cada venta y expórtala a Excel.</p>
        </div>
      </header>

      <div className="sales-report-tabs" role="tablist" aria-label="Apartados del reporte de ventas">
        <button
          ref={summaryTabRef}
          id="sales-report-summary-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "summary"}
          aria-controls="sales-report-summary-panel"
          tabIndex={activeTab === "summary" ? 0 : -1}
          onClick={() => activateTab("summary")}
          onKeyDown={handleTabKeyDown}
        >
          Resumen por día
        </button>
        <button
          ref={detailTabRef}
          id="sales-report-detail-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "detail"}
          aria-controls="sales-report-detail-panel"
          tabIndex={activeTab === "detail" ? 0 : -1}
          onClick={() => activateTab("detail")}
          onKeyDown={handleTabKeyDown}
        >
          Detalle de ventas
        </button>
      </div>

      <div
        id="sales-report-summary-panel"
        className="sales-report-tab-panel"
        role="tabpanel"
        aria-labelledby="sales-report-summary-tab"
        tabIndex={0}
        hidden={activeTab !== "summary"}
      >
        <DailySummary
          refreshSignal={refreshSignal}
          defaultRange={defaultRange}
          onViewDetail={viewDay}
        />
      </div>

      <div
        id="sales-report-detail-panel"
        className="sales-report-tab-panel"
        role="tabpanel"
        aria-labelledby="sales-report-detail-tab"
        tabIndex={0}
        hidden={activeTab !== "detail"}
      >
        {detailVisited ? (
          <SalesHistoryPanel
            refreshSignal={refreshSignal}
            defaultDateFrom={defaultRange.dateFrom}
            defaultDateTo={defaultRange.dateTo}
            focusDate={detailDate}
            focusRequestId={detailRequestId}
            exportReport={downloadSalesReport}
          />
        ) : null}
      </div>
    </section>
  );
}
