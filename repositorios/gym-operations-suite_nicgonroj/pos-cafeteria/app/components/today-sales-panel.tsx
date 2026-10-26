"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type PaidPaymentMethod = "efectivo" | "tarjeta" | "transferencia";
type CheckoutMethod = PaidPaymentMethod | "pendiente" | "colaborador";
type PaymentStatus = "paid" | "pending" | "verification_pending";

type TodaySaleItem = {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  lineTotalClp: number;
};

type TodaySale = {
  id: string;
  createdAt: string;
  businessDate: string;
  shift: "am" | "pm" | null;
  sessionId: string | null;
  responsible: string | null;
  debtorCollaborator: string | null;
  checkoutMethod: CheckoutMethod;
  paymentStatus: PaymentStatus;
  paymentMethod: PaidPaymentMethod | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  transferValidatedAt: string | null;
  transferValidatedBy: string | null;
  transferEmailReference: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  canVoid: boolean;
  items: TodaySaleItem[];
};

type TodaySalesPage = {
  businessDate: string;
  totalCount: number;
  summary: {
    totalSalesClp: number;
    collectedClp: number;
    settlementClp: number;
    cashClp: number;
    cardClp: number;
    transferClp: number;
    pendingTransferClp: number;
    pendingTransferCount: number;
  };
  sales: TodaySale[];
  hasMore: boolean;
  nextCursor: string | null;
};

type TodaySalesPanelProps = {
  refreshSignal?: number;
  activeSessionId: string | null;
  activityRevision: number | null;
  onSaleVoided?: (message: string) => void | Promise<void>;
  onTransferValidated?: (message: string) => void | Promise<void>;
};

type VoidSaleResponse = {
  message?: string;
};

const EMPTY_PAGE: TodaySalesPage = {
  businessDate: "",
  totalCount: 0,
  summary: {
    totalSalesClp: 0,
    collectedClp: 0,
    settlementClp: 0,
    cashClp: 0,
    cardClp: 0,
    transferClp: 0,
    pendingTransferClp: 0,
    pendingTransferCount: 0,
  },
  sales: [],
  hasMore: false,
  nextCursor: null,
};

const PAYMENT_LABELS: Record<CheckoutMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  pendiente: "Pendiente",
  colaborador: "Colaborador",
};

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function formatBusinessDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
  }).format(new Date(`${value}T12:00:00Z`));
}

async function readTodaySales(response: Response): Promise<TodaySalesPage> {
  let payload: TodaySalesPage & { error?: string };
  try {
    payload = (await response.json()) as TodaySalesPage & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "Las ventas de hoy respondieron con datos no válidos."
        : `No se pudieron consultar las ventas de hoy (${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new Error(payload.error || "No se pudieron consultar las ventas de hoy.");
  }
  return payload;
}

async function fetchTodaySales(cursor?: string) {
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`/api/sales/today?${query.toString()}`, {
    cache: "no-store",
  });
  return readTodaySales(response);
}

async function requestSaleVoid(
  saleId: string,
  body: {
    id: string;
    sessionId: string;
    expectedActivityRevision: number;
    reason: string;
  },
) {
  const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload: VoidSaleResponse & { error?: string };
  try {
    payload = (await response.json()) as VoidSaleResponse & { error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "La anulación respondió con datos no válidos."
        : `No se pudo anular la venta (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo anular la venta.");
  }
  return payload;
}

async function requestTransferValidation(
  saleId: string,
  body: { id: string; sessionId: string; emailReference: string },
) {
  const response = await fetch(
    `/api/sales/${encodeURIComponent(saleId)}/validate-transfer`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  let payload: { message?: string; error?: string };
  try {
    payload = (await response.json()) as { message?: string; error?: string };
  } catch {
    throw new Error(
      response.ok
        ? "La validación respondió con datos no válidos."
        : `No se pudo validar la transferencia (${response.status}).`,
    );
  }
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo validar la transferencia.");
  }
  return payload;
}

export function TodaySalesPanel({
  refreshSignal = 0,
  activeSessionId,
  activityRevision,
  onSaleVoided,
  onTransferValidated,
}: TodaySalesPanelProps) {
  const [page, setPage] = useState<TodaySalesPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retryMore, setRetryMore] = useState(false);
  const [voidTarget, setVoidTarget] = useState<TodaySale | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<TodaySale | null>(null);
  const [transferReference, setTransferReference] = useState("");
  const [transferError, setTransferError] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const transferDialogRef = useRef<HTMLDialogElement>(null);
  const transferReferenceRef = useRef<HTMLInputElement>(null);
  const transferReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const transferAttemptIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const errorRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const voidDialogRef = useRef<HTMLDialogElement>(null);
  const voidCancelRef = useRef<HTMLButtonElement>(null);
  const voidErrorRef = useRef<HTMLParagraphElement>(null);
  const voidReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const voidAttemptIdRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setRetryMore(false);
    setPage(EMPTY_PAGE);
    try {
      const payload = await fetchTodaySales();
      if (requestId !== requestIdRef.current) return;
      setPage(payload);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron consultar las ventas de hoy.",
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFirstPage(), 0);
    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [loadFirstPage, refreshSignal]);

  async function loadMore() {
    if (!page.nextCursor || loading || loadingMore) return;
    const requestId = ++requestIdRef.current;
    setLoadingMore(true);
    setError("");
    setRetryMore(false);
    try {
      const payload = await fetchTodaySales(page.nextCursor);
      if (requestId !== requestIdRef.current) return;
      setPage((current) => {
        const knownIds = new Set(current.sales.map((sale) => sale.id));
        return {
          ...payload,
          sales: [
            ...current.sales,
            ...payload.sales.filter((sale) => !knownIds.has(sale.id)),
          ],
        };
      });
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      setRetryMore(true);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar más ventas de hoy.",
      );
      window.requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  }

  function openVoidDialog(sale: TodaySale, trigger: HTMLButtonElement) {
    setVoidTarget(sale);
    setVoidReason("");
    setVoidError("");
    voidAttemptIdRef.current = null;
    voidReturnFocusRef.current = trigger;
    window.requestAnimationFrame(() => {
      const dialog = voidDialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      window.requestAnimationFrame(() => voidCancelRef.current?.focus());
    });
  }

  function returnFocusAfterVoidDialog() {
    window.requestAnimationFrame(() => {
      const returnTarget = voidReturnFocusRef.current;
      if (returnTarget?.isConnected) returnTarget.focus();
      else headingRef.current?.focus();
      voidReturnFocusRef.current = null;
    });
  }

  function dismissVoidDialog() {
    if (voidSubmitting) return;
    voidDialogRef.current?.close();
    setVoidTarget(null);
    setVoidReason("");
    setVoidError("");
    voidAttemptIdRef.current = null;
    returnFocusAfterVoidDialog();
  }

  async function submitVoid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!voidTarget || voidSubmitting) return;

    const normalizedReason = voidReason.trim();
    if (!normalizedReason) {
      setVoidError("Escribe el motivo para dejar respaldo de la anulación.");
      window.requestAnimationFrame(() => voidErrorRef.current?.focus());
      return;
    }
    if (!activeSessionId || activityRevision === null) {
      setVoidError("El turno cambió. Actualiza las ventas del día antes de volver a intentarlo.");
      window.requestAnimationFrame(() => voidErrorRef.current?.focus());
      return;
    }

    setVoidSubmitting(true);
    setVoidError("");
    try {
      const attemptId = voidAttemptIdRef.current ?? crypto.randomUUID();
      voidAttemptIdRef.current = attemptId;
      const payload = await requestSaleVoid(voidTarget.id, {
        id: attemptId,
        sessionId: activeSessionId,
        expectedActivityRevision: activityRevision,
        reason: normalizedReason,
      });
      const message = payload.message || "Venta anulada correctamente.";

      await onSaleVoided?.(message);
      await loadFirstPage();
      voidDialogRef.current?.close();
      setVoidTarget(null);
      setVoidReason("");
      voidAttemptIdRef.current = null;
      returnFocusAfterVoidDialog();
    } catch (submitError) {
      setVoidError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo anular la venta.",
      );
      window.requestAnimationFrame(() => voidErrorRef.current?.focus());
    } finally {
      setVoidSubmitting(false);
    }
  }

  function openTransferDialog(sale: TodaySale, trigger: HTMLButtonElement) {
    setTransferTarget(sale);
    setTransferReference("");
    setTransferError("");
    transferAttemptIdRef.current = null;
    transferReturnFocusRef.current = trigger;
    window.requestAnimationFrame(() => {
      const dialog = transferDialogRef.current;
      if (dialog && !dialog.open) dialog.showModal();
      window.requestAnimationFrame(() => transferReferenceRef.current?.focus());
    });
  }

  function returnFocusAfterTransferDialog() {
    window.requestAnimationFrame(() => {
      const returnTarget = transferReturnFocusRef.current;
      if (returnTarget?.isConnected) returnTarget.focus();
      else headingRef.current?.focus();
      transferReturnFocusRef.current = null;
    });
  }

  function dismissTransferDialog() {
    if (transferSubmitting) return;
    transferDialogRef.current?.close();
    setTransferTarget(null);
    setTransferReference("");
    setTransferError("");
    transferAttemptIdRef.current = null;
    returnFocusAfterTransferDialog();
  }

  async function submitTransferValidation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transferTarget || transferSubmitting) return;
    const emailReference = transferReference.trim();
    if (!emailReference) {
      setTransferError("Ingresa la referencia visible en el correo de Mercado Pago.");
      window.requestAnimationFrame(() => transferReferenceRef.current?.focus());
      return;
    }
    if (!activeSessionId || transferTarget.sessionId !== activeSessionId) {
      setTransferError("El turno de esta venta ya no está activo. Solicita revisión administrativa.");
      return;
    }

    setTransferSubmitting(true);
    setTransferError("");
    try {
      const attemptId = transferAttemptIdRef.current ?? crypto.randomUUID();
      transferAttemptIdRef.current = attemptId;
      const payload = await requestTransferValidation(transferTarget.id, {
        id: attemptId,
        sessionId: activeSessionId,
        emailReference,
      });
      const message = payload.message || "Transferencia validada correctamente.";
      await onTransferValidated?.(message);
      await loadFirstPage();
      transferDialogRef.current?.close();
      setTransferTarget(null);
      setTransferReference("");
      transferAttemptIdRef.current = null;
      returnFocusAfterTransferDialog();
    } catch (submitError) {
      setTransferError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo validar la transferencia.",
      );
      window.requestAnimationFrame(() => transferReferenceRef.current?.focus());
    } finally {
      setTransferSubmitting(false);
    }
  }

  const businessDateLabel = formatBusinessDate(page.businessDate);
  const visibleCount = page.sales.length;
  const statusAnnouncement = loading || error
    ? ""
    : `${visibleCount} de ${page.totalCount} ${page.totalCount === 1 ? "venta cargada" : "ventas cargadas"}.`;

  return (
    <section className="today-sales-section" aria-labelledby="today-sales-title">
      <div className="today-sales-heading">
        <div>
          <p className="eyebrow">Actividad del día</p>
          <h2 id="today-sales-title" ref={headingRef} tabIndex={-1}>Ventas de hoy</h2>
          <p>
            {businessDateLabel
              ? `${businessDateLabel}. Horas mostradas en Chile.`
              : "Consulta rápida del día operativo en horario de Chile."}
          </p>
        </div>
        <div className="today-sales-heading-actions">
          <span className="today-sales-count" aria-label={`${page.totalCount} ventas registradas hoy`}>
            <strong>{page.totalCount}</strong>
            <small>{page.totalCount === 1 ? "venta" : "ventas"}</small>
          </span>
          <button
            className="today-sales-refresh"
            type="button"
            onClick={() => void loadFirstPage()}
            disabled={loading || loadingMore}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement}
      </p>

      {!loading && !error ? (
        <section className="today-sales-summary" aria-labelledby="today-sales-summary-title">
          <header>
            <div>
              <h3 id="today-sales-summary-title">Resumen de ventas y caja del día</h3>
              <p>Separa lo registrado como venta del dinero efectivamente recibido.</p>
            </div>
          </header>
          <dl className="today-sales-summary-kpis">
            <div>
              <dt>Ventas registradas</dt>
              <dd>{formatClp(page.summary.totalSalesClp)}</dd>
              <small>Incluye pendientes y consumos de colaboradores.</small>
            </div>
            <div>
              <dt>Dinero recibido</dt>
              <dd>{formatClp(page.summary.collectedClp)}</dd>
              <small>Es el total que sí afecta la caja del día.</small>
            </div>
            <div className="today-sales-summary-settlements">
              <dt>Abonos incluidos en dinero recibido</dt>
              <dd>{formatClp(page.summary.settlementClp)}</dd>
              <small>Desglose informativo de clientes y colaboradores; no se suma nuevamente.</small>
            </div>
            <div className="today-sales-summary-transfers-pending">
              <dt>Transferencias por validar</dt>
              <dd>{formatClp(page.summary.pendingTransferClp)}</dd>
              <small>
                {page.summary.pendingTransferCount === 1
                  ? "1 venta aún no entra a caja."
                  : `${page.summary.pendingTransferCount} ventas aún no entran a caja.`}
              </small>
            </div>
          </dl>
          <dl className="today-sales-summary-methods" aria-label="Dinero recibido hoy por medio de pago">
            <div><dt>Efectivo</dt><dd>{formatClp(page.summary.cashClp)}</dd></div>
            <div><dt>Tarjeta</dt><dd>{formatClp(page.summary.cardClp)}</dd></div>
            <div><dt>Transferencia</dt><dd>{formatClp(page.summary.transferClp)}</dd></div>
          </dl>
        </section>
      ) : null}

      {error ? (
        <div className="today-sales-alert" role="alert" ref={errorRef} tabIndex={-1}>
          <div>
            <strong>{retryMore ? "No pudimos cargar más ventas" : "No pudimos cargar las ventas de hoy"}</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              headingRef.current?.focus();
              void (retryMore ? loadMore() : loadFirstPage());
            }}
            disabled={loading || loadingMore}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="today-sales-state" role="status">
          <strong>Cargando ventas de hoy…</strong>
          <span>Estamos reuniendo la actividad más reciente.</span>
        </div>
      ) : !page.sales.length && !error ? (
        <div className="today-sales-state">
          <strong>Aún no hay ventas nuevas hoy</strong>
          <span>
            {page.summary.settlementClp > 0
              ? "Los abonos cobrados hoy ya están incluidos en el resumen de caja."
              : "La primera venta registrada aparecerá aquí."}
          </span>
        </div>
      ) : page.sales.length ? (
        <div className="today-sales-results" aria-busy={loadingMore}>
          <ol className="today-sales-list">
            {page.sales.map((sale) => {
              const isCollaboratorConsumption = sale.checkoutMethod === "colaborador";
              const isTransferPending = sale.paymentStatus === "verification_pending";
              const isVoided = Boolean(sale.voidedAt);
              return (
                <li key={sale.id}>
                  <article className={`today-sale-card${isVoided ? " today-sale-card-voided" : ""}`}>
                  <header className="today-sale-card-header">
                    <div className="today-sale-time">
                      <span>Hora Chile</span>
                      <time dateTime={sale.createdAt}>{formatTime(sale.createdAt)}</time>
                    </div>
                    <div className="today-sale-total">
                      <span>{isCollaboratorConsumption ? "Total del consumo" : "Total"}</span>
                      <strong>{formatClp(sale.totalClp)}</strong>
                    </div>
                    <span
                      className={`today-sale-status today-sale-status-${isVoided ? "voided" : isCollaboratorConsumption ? "pending" : sale.paymentStatus}`}
                    >
                      {isVoided
                        ? "Anulada"
                        : isCollaboratorConsumption
                        ? "Consumo de colaborador"
                        : isTransferPending
                          ? "Transferencia por validar"
                        : sale.paymentStatus === "paid"
                          ? "Pagada"
                          : "Pendiente"}
                    </span>
                  </header>

                  <div className="today-sale-card-body">
                    <ul
                      className="today-sale-items"
                      aria-label={isCollaboratorConsumption ? "Productos del consumo" : "Productos vendidos"}
                    >
                      {sale.items.map((item) => (
                        <li key={`${sale.id}-${item.productId}`}>
                          <span>{item.quantity} × {item.productName}</span>
                          <strong>{formatClp(item.lineTotalClp)}</strong>
                        </li>
                      ))}
                    </ul>

                    <dl className="today-sale-context">
                      <div>
                        <dt>Responsable</dt>
                        <dd>{sale.responsible || "Sin información"}</dd>
                      </div>
                      <div>
                        <dt>Turno</dt>
                        <dd>{sale.shift ? sale.shift.toUpperCase() : "Sin turno"}</dd>
                      </div>
                      <div>
                        <dt>{isCollaboratorConsumption ? "Tipo de registro" : "Medio registrado"}</dt>
                        <dd>{isCollaboratorConsumption ? "Consumo de colaborador" : PAYMENT_LABELS[sale.checkoutMethod] ?? sale.checkoutMethod}</dd>
                      </div>
                      {isCollaboratorConsumption ? (
                        <>
                          <div>
                            <dt>Colaborador</dt>
                            <dd>{sale.debtorCollaborator || "Colaborador sin identificar"}</dd>
                          </div>
                          <div>
                            <dt>Abonado</dt>
                            <dd>{formatClp(sale.paidClp)}</dd>
                          </div>
                          <div className="today-sale-balance">
                            <dt>Saldo pendiente</dt>
                            <dd>{formatClp(sale.balanceClp)}</dd>
                          </div>
                          <div>
                            <dt>Tratamiento de caja</dt>
                            <dd>El consumo queda fuera; cada abono recibido sí entra a caja</dd>
                          </div>
                        </>
                      ) : isTransferPending ? (
                        <>
                          <div className="today-sale-balance">
                            <dt>Estado de caja</dt>
                            <dd>No contabilizada hasta validar el correo</dd>
                          </div>
                          <div>
                            <dt>Comprobante válido</dt>
                            <dd>Correo “Recibiste un pago” de Mercado Pago</dd>
                          </div>
                        </>
                      ) : sale.paymentStatus === "pending" ? (
                        <>
                          <div>
                            <dt>Abonado</dt>
                            <dd>{formatClp(sale.paidClp)}</dd>
                          </div>
                          <div className="today-sale-balance">
                            <dt>Saldo pendiente</dt>
                            <dd>{formatClp(sale.balanceClp)}</dd>
                          </div>
                        </>
                      ) : null}
                    </dl>

                    {isVoided ? (
                      <aside className="today-sale-void-record" aria-label="Registro de anulación">
                        <strong>Venta anulada</strong>
                        <p><span>Motivo:</span> {sale.voidReason || "Sin motivo informado"}</p>
                        <small>
                          {sale.voidedBy ? `Anulada por ${sale.voidedBy}` : "Anulada por Administración"}
                          {sale.voidedAt ? ` · ${formatTime(sale.voidedAt)} h` : ""}
                        </small>
                      </aside>
                    ) : null}

                    {!isVoided && sale.transferValidatedAt ? (
                      <aside className="today-sale-transfer-record" aria-label="Registro de validación de transferencia">
                        <strong>Transferencia validada</strong>
                        <p><span>Referencia:</span> {sale.transferEmailReference}</p>
                        <small>
                          {sale.transferValidatedBy ? `Validada por ${sale.transferValidatedBy}` : "Validación registrada"}
                          {sale.transferValidatedAt ? ` · ${formatTime(sale.transferValidatedAt)} h` : ""}
                        </small>
                      </aside>
                    ) : null}
                  </div>

                  {sale.canVoid || (isTransferPending && sale.sessionId === activeSessionId) ? (
                    <footer className="today-sale-card-actions">
                      {isTransferPending && sale.sessionId === activeSessionId ? (
                        <button
                          className="today-sale-transfer-button"
                          type="button"
                          onClick={(event) => openTransferDialog(sale, event.currentTarget)}
                        >
                          Validar con correo
                        </button>
                      ) : null}
                      {sale.canVoid ? (
                      <button
                        className="today-sale-void-button"
                        type="button"
                        onClick={(event) => openVoidDialog(sale, event.currentTarget)}
                        aria-label={`Anular venta de ${formatClp(sale.totalClp)} registrada a las ${formatTime(sale.createdAt)}`}
                      >
                        Anular venta
                      </button>
                      ) : null}
                    </footer>
                  ) : null}
                  </article>
                </li>
              );
            })}
          </ol>

          {page.hasMore ? (
            <div className="today-sales-pagination">
              <span>{visibleCount} de {page.totalCount} ventas visibles</span>
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Cargando…" : retryMore ? "Reintentar cargar más" : "Cargar más"}
              </button>
            </div>
          ) : (
            <p className="today-sales-end">
              {page.totalCount === 1
                ? "Está visible la única venta de hoy."
                : `Están visibles las ${page.totalCount} ventas de hoy.`}
            </p>
          )}
        </div>
      ) : null}

      <dialog
        className="transfer-validation-dialog"
        ref={transferDialogRef}
        aria-labelledby="transfer-validation-title"
        aria-describedby="transfer-validation-description"
        onCancel={(event) => {
          event.preventDefault();
          dismissTransferDialog();
        }}
      >
        {transferTarget ? (
          <form className="transfer-validation-dialog-shell" onSubmit={submitTransferValidation}>
            <header>
              <span className="transfer-validation-mark" aria-hidden="true">MP</span>
              <div>
                <p className="eyebrow">Validación de pago</p>
                <h2 id="transfer-validation-title">Confirmar transferencia</h2>
                <p id="transfer-validation-description">
                  Confirma únicamente si ves el correo “Recibiste un pago” enviado por Mercado Pago.
                </p>
              </div>
            </header>
            <a
              className="transfer-validation-inbox-link"
              href="https://mail.google.com/mail/#search/from%3Ainfo%40mercadopago.com+subject%3A%22Recibiste+un+pago%22"
              target="_blank"
              rel="noreferrer"
            >
              Abrir correo de pagos de Mercado Pago
              <span aria-hidden="true">↗</span>
            </a>
            <dl className="transfer-validation-summary">
              <div><dt>Monto esperado</dt><dd>{formatClp(transferTarget.totalClp)}</dd></div>
              <div><dt>Hora de venta</dt><dd>{formatTime(transferTarget.createdAt)} h</dd></div>
            </dl>
            <label className="transfer-validation-field">
              <span>Referencia del correo <small>Obligatorio</small></span>
              <input
                ref={transferReferenceRef}
                value={transferReference}
                onChange={(event) => {
                  setTransferReference(event.target.value);
                  setTransferError("");
                }}
                maxLength={200}
                placeholder="Ej. nombre del pagador u operación 123456"
                aria-invalid={Boolean(transferError)}
                aria-describedby="transfer-validation-help"
                disabled={transferSubmitting}
              />
              <small id="transfer-validation-help">
                Copia un dato visible en el correo para dejar trazabilidad. No uses una captura del cliente.
              </small>
            </label>
            {transferError ? <p className="transfer-validation-error" role="alert">{transferError}</p> : null}
            <div className="transfer-validation-actions">
              <button type="button" onClick={dismissTransferDialog} disabled={transferSubmitting}>
                Cancelar
              </button>
              <button type="submit" disabled={transferSubmitting}>
                {transferSubmitting ? "Validando…" : "Confirmar pago recibido"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>

      <dialog
        className="sale-void-dialog"
        ref={voidDialogRef}
        role="alertdialog"
        aria-labelledby="sale-void-dialog-title"
        aria-describedby="sale-void-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          if (!voidSubmitting) dismissVoidDialog();
        }}
      >
        {voidTarget ? (
          <div className="sale-void-dialog-shell">
            <header className="sale-void-dialog-header">
              <span className="sale-void-dialog-mark" aria-hidden="true">!</span>
              <div>
                <p className="eyebrow">Control de venta</p>
                <h2 id="sale-void-dialog-title">Confirmar anulación</h2>
                <p id="sale-void-dialog-description">
                  Revisa la venta e indica por qué debe quedar anulada.
                </p>
              </div>
            </header>

            <form
              className="sale-void-form"
              onSubmit={(event) => void submitVoid(event)}
              aria-busy={voidSubmitting}
            >
              <section className="sale-void-summary" aria-label="Resumen de la venta que se anulará">
                <dl>
                  <div><dt>Hora Chile</dt><dd>{formatTime(voidTarget.createdAt)}</dd></div>
                  <div><dt>Total</dt><dd>{formatClp(voidTarget.totalClp)}</dd></div>
                  <div><dt>Responsable</dt><dd>{voidTarget.responsible || "Sin información"}</dd></div>
                  <div><dt>Medio</dt><dd>{PAYMENT_LABELS[voidTarget.checkoutMethod]}</dd></div>
                </dl>
                <ul aria-label="Productos de la venta">
                  {voidTarget.items.map((item) => (
                    <li key={`void-${voidTarget.id}-${item.productId}`}>
                      <span>{item.quantity} × {item.productName}</span>
                      <strong>{formatClp(item.lineTotalClp)}</strong>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="sale-void-warning">
                Esta acción no se puede deshacer. La venta saldrá de los totales y del cuadre;
                cuando corresponda, el stock descontado será repuesto.
              </p>

              <label className="sale-void-reason-field" htmlFor="sale-void-reason">
                <span>Motivo de la anulación <small>Obligatorio</small></span>
                <textarea
                  id="sale-void-reason"
                  value={voidReason}
                  onChange={(event) => {
                    setVoidReason(event.target.value);
                    setVoidError("");
                    voidAttemptIdRef.current = null;
                  }}
                  required
                  maxLength={500}
                  rows={3}
                  disabled={voidSubmitting}
                  aria-invalid={Boolean(voidError)}
                  aria-describedby={voidError ? "sale-void-error sale-void-reason-help" : "sale-void-reason-help"}
                  placeholder="Ej. Venta ingresada dos veces"
                />
                <small id="sale-void-reason-help">Este motivo quedará guardado en el registro de la venta.</small>
              </label>

              {voidError ? (
                <p className="sale-void-error" id="sale-void-error" role="alert" ref={voidErrorRef} tabIndex={-1}>
                  {voidError}
                </p>
              ) : null}

              <div className="sale-void-dialog-actions">
                <button
                  className="sale-void-cancel-button"
                  type="button"
                  onClick={dismissVoidDialog}
                  disabled={voidSubmitting}
                  ref={voidCancelRef}
                >
                  Volver
                </button>
                <button
                  className="sale-void-confirm-button"
                  type="submit"
                  disabled={voidSubmitting || !voidReason.trim()}
                >
                  {voidSubmitting ? "Anulando…" : "Anular venta"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
