"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShiftSession } from "@/app/components/cash-closures-panel";

type PaidPaymentMethod = "efectivo" | "tarjeta" | "transferencia";
type DeferredPaymentMethod = "pendiente" | "colaborador";

type DebtItem = {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  lineTotalClp: number;
};

type DebtPayment = {
  id: string;
  createdAt: string;
  businessDate: string | null;
  shift: "am" | "pm" | null;
  sessionId: string | null;
  paymentMethod: PaidPaymentMethod;
  amountClp: number;
  receivedBy: string | null;
  kind: "settlement" | "direct";
};

type Debt = {
  id: string;
  createdAt: string;
  paymentMethod: DeferredPaymentMethod;
  paymentStatus: "pending" | "paid";
  debtNote: string | null;
  debtorCollaborator: string | null;
  seller: string | null;
  shift: "am" | "pm" | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  paymentCount: number;
  paymentsHasMore: boolean;
  payments: DebtPayment[];
  items: DebtItem[];
};

type DebtsData = {
  debts: Debt[];
  summary: {
    count: number;
    totalClp: number;
    originalClp: number;
    paidClp: number;
    balanceClp: number;
  };
  collaboratorSummaries: Array<{
    collaborator: string;
    count: number;
    originalClp: number;
    paidClp: number;
    balanceClp: number;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
};

type CollaboratorDetailState = {
  debts: Debt[];
  hasMore: boolean;
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string;
};

type SettlementDraft = {
  amount: string;
  paymentMethod: PaidPaymentMethod | "";
};

type SettlementAttempt = {
  id: string;
  sessionId: string;
  paymentMethod: PaidPaymentMethod;
  amountClp: number;
};

type DebtsPanelProps = {
  role: "admin" | "sales";
  activeSession: ShiftSession | null;
  refreshSignal: number;
  onPaymentRegistered: (message: string) => void | Promise<void>;
};

const EMPTY_DEBTS: DebtsData = {
  debts: [],
  summary: {
    count: 0,
    totalClp: 0,
    originalClp: 0,
    paidClp: 0,
    balanceClp: 0,
  },
  collaboratorSummaries: [],
  hasMore: false,
  nextCursor: null,
};

const PAID_PAYMENT_METHODS: Array<{ value: PaidPaymentMethod; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

const SETTLEMENT_ATTEMPTS_STORAGE_KEY = "demogymcafe.pending-settlements.v1";

function parseStoredSettlementAttempts(value: string): Record<string, SettlementAttempt> | null {
  try {
    const candidate = JSON.parse(value) as unknown;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const entries = Object.entries(candidate);
    if (entries.length > 100) return null;
    const parsed: Record<string, SettlementAttempt> = {};
    for (const [saleId, rawAttempt] of entries) {
      if (!saleId || saleId.length > 100 || !rawAttempt || typeof rawAttempt !== "object") {
        return null;
      }
      const attempt = rawAttempt as Partial<SettlementAttempt>;
      if (
        typeof attempt.id !== "string" || !attempt.id || attempt.id.length > 100 ||
        typeof attempt.sessionId !== "string" || !attempt.sessionId || attempt.sessionId.length > 100 ||
        !PAID_PAYMENT_METHODS.some(({ value: method }) => method === attempt.paymentMethod) ||
        !Number.isSafeInteger(attempt.amountClp) || Number(attempt.amountClp) <= 0
      ) {
        return null;
      }
      parsed[saleId] = attempt as SettlementAttempt;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSettlementAttempts(attempts: Record<string, SettlementAttempt>) {
  try {
    if (Object.keys(attempts).length) {
      window.localStorage.setItem(SETTLEMENT_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
    } else {
      window.localStorage.removeItem(SETTLEMENT_ATTEMPTS_STORAGE_KEY);
    }
  } catch {
    // The in-memory attempt still protects retries while this page remains open.
  }
}

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDebtDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function paymentLabel(value: PaidPaymentMethod) {
  return PAID_PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value;
}

function isCollaboratorDebt(debt: Debt) {
  return debt.paymentMethod === "colaborador" || Boolean(debt.debtorCollaborator);
}

class HttpResponseError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new HttpResponseError(
      payload.error || "Ocurrió un error inesperado.",
      response.status,
    );
  }
  return payload;
}

export function DebtsPanel({
  role,
  activeSession,
  refreshSignal,
  onPaymentRegistered,
}: DebtsPanelProps) {
  const [data, setData] = useState<DebtsData>(EMPTY_DEBTS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [paginationError, setPaginationError] = useState("");
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SettlementDraft>>({});
  const [settlementErrors, setSettlementErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [settlementAttempts, setSettlementAttempts] = useState<Record<string, SettlementAttempt>>({});
  const [collaboratorDetails, setCollaboratorDetails] = useState<Record<string, CollaboratorDetailState>>({});
  const [collaboratorGroupsVersion, setCollaboratorGroupsVersion] = useState(0);
  const settlementsInFlight = useRef<Set<string>>(new Set());
  const debtsRequestId = useRef(0);
  const collaboratorRequestIds = useRef<Record<string, number>>({});
  const amountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const methodRefs = useRef<Record<string, HTMLSelectElement | null>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SETTLEMENT_ATTEMPTS_STORAGE_KEY);
      if (!stored) return;
      const attempts = parseStoredSettlementAttempts(stored);
      if (!attempts) {
        window.localStorage.removeItem(SETTLEMENT_ATTEMPTS_STORAGE_KEY);
        return;
      }
      setSettlementAttempts(attempts);
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  }, []);

  const updateSettlementAttempts = useCallback((
    updater: (current: Record<string, SettlementAttempt>) => Record<string, SettlementAttempt>,
  ) => {
    setSettlementAttempts((current) => {
      const next = updater(current);
      persistSettlementAttempts(next);
      return next;
    });
  }, []);

  const loadDebts = useCallback(async (options: {
    cursor?: string;
    append?: boolean;
    preserveCollaboratorDetails?: boolean;
  } = {}) => {
    const append = options.append === true && Boolean(options.cursor);
    const requestId = debtsRequestId.current + 1;
    debtsRequestId.current = requestId;
    try {
      if (append) {
        setLoadingMore(true);
        setPaginationError("");
      } else {
        setLoading(true);
        setLoadError("");
        setPaginationError("");
      }
      const query = new URLSearchParams({ kind: "customer" });
      if (options.cursor) query.set("cursor", options.cursor);
      const response = await fetch(`/api/debts?${query.toString()}`, { cache: "no-store" });
      const payload = await readJson<DebtsData>(response);
      if (requestId !== debtsRequestId.current) return;
      setData((current) => {
        if (!append) return payload;
        const seen = new Set(current.debts.map(({ id }) => id));
        return {
          ...payload,
          debts: [
            ...current.debts,
            ...payload.debts.filter(({ id }) => !seen.has(id)),
          ],
        };
      });
      if (!append && !options.preserveCollaboratorDetails) {
        setCollaboratorDetails({});
        setCollaboratorGroupsVersion((current) => current + 1);
      }
    } catch (error) {
      if (requestId !== debtsRequestId.current) return;
      const message = error instanceof Error
        ? error.message
        : "No se pudieron cargar las cuentas por cobrar.";
      if (append) setPaginationError(message);
      else setLoadError(message);
    } finally {
      if (requestId === debtsRequestId.current) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  }, []);

  const loadCollaboratorDebts = useCallback(async (
    collaborator: string,
    options: { cursor?: string; append?: boolean } = {},
  ) => {
    const append = options.append === true && Boolean(options.cursor);
    const requestId = (collaboratorRequestIds.current[collaborator] ?? 0) + 1;
    collaboratorRequestIds.current[collaborator] = requestId;
    setCollaboratorDetails((current) => ({
      ...current,
      [collaborator]: {
        debts: append ? current[collaborator]?.debts ?? [] : [],
        hasMore: current[collaborator]?.hasMore ?? false,
        nextCursor: current[collaborator]?.nextCursor ?? null,
        loading: !append,
        loadingMore: append,
        error: "",
      },
    }));
    try {
      const query = new URLSearchParams({
        kind: "collaborator",
        collaborator,
        limit: "50",
      });
      if (options.cursor) query.set("cursor", options.cursor);
      const response = await fetch(`/api/debts?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = await readJson<DebtsData>(response);
      if (requestId !== collaboratorRequestIds.current[collaborator]) return;
      setCollaboratorDetails((current) => {
        const previous = current[collaborator];
        const seen = new Set((append ? previous?.debts ?? [] : []).map(({ id }) => id));
        return {
          ...current,
          [collaborator]: {
            debts: append
              ? [
                  ...(previous?.debts ?? []),
                  ...payload.debts.filter(({ id }) => !seen.has(id)),
                ]
              : payload.debts,
            hasMore: payload.hasMore,
            nextCursor: payload.nextCursor,
            loading: false,
            loadingMore: false,
            error: "",
          },
        };
      });
    } catch (error) {
      if (requestId !== collaboratorRequestIds.current[collaborator]) return;
      setCollaboratorDetails((current) => ({
        ...current,
        [collaborator]: {
          debts: current[collaborator]?.debts ?? [],
          hasMore: current[collaborator]?.hasMore ?? false,
          nextCursor: current[collaborator]?.nextCursor ?? null,
          loading: false,
          loadingMore: false,
          error: error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle del colaborador.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDebts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDebts, refreshSignal, role]);

  function draftFor(debt: Debt): SettlementDraft {
    return drafts[debt.id] ?? {
      amount: String(debt.balanceClp),
      paymentMethod: "",
    };
  }

  function updateDraft(debt: Debt, patch: Partial<SettlementDraft>) {
    const attempt = settlementAttempts[debt.id];
    if (attempt) return;
    setDrafts((current) => ({
      ...current,
      [debt.id]: { ...draftFor(debt), ...patch },
    }));
    setSettlementErrors((current) => ({ ...current, [debt.id]: "" }));
    setFeedback("");
  }

  async function settleDebt(debt: Debt) {
    if (settlementsInFlight.current.has(debt.id)) return;
    if (!activeSession) {
      setSettlementErrors((current) => ({
        ...current,
        [debt.id]: "No hay un turno abierto. Abre el turno antes de registrar este cobro.",
      }));
      return;
    }

    const storedAttempt = settlementAttempts[debt.id];
    const draft = draftFor(debt);
    const amountClp = storedAttempt?.amountClp ?? Number(draft.amount);
    const paymentMethod = storedAttempt?.paymentMethod ?? draft.paymentMethod;

    if (
      !storedAttempt &&
      (!Number.isSafeInteger(amountClp) || amountClp <= 0 || amountClp > debt.balanceClp)
    ) {
      setSettlementErrors((current) => ({
        ...current,
        [debt.id]: `Ingresa un monto entero entre ${formatClp(1)} y ${formatClp(debt.balanceClp)}.`,
      }));
      window.requestAnimationFrame(() => amountRefs.current[debt.id]?.focus());
      return;
    }
    if (!paymentMethod) {
      setSettlementErrors((current) => ({
        ...current,
        [debt.id]: "Selecciona el medio de pago recibido.",
      }));
      window.requestAnimationFrame(() => methodRefs.current[debt.id]?.focus());
      return;
    }

    const paysFullBalance = amountClp === debt.balanceClp;
    if (!storedAttempt) {
      const owner = debt.debtorCollaborator || debt.debtNote || "esta cuenta";
      const prompt = paysFullBalance
        ? `¿Confirmas el cobro del saldo completo de ${formatClp(amountClp)} a ${owner} mediante ${paymentLabel(paymentMethod)}?`
        : `¿Confirmas un abono de ${formatClp(amountClp)} a ${owner} mediante ${paymentLabel(paymentMethod)}? Quedará un saldo de ${formatClp(debt.balanceClp - amountClp)}.`;
      if (!window.confirm(prompt)) return;
    }

    const attempt: SettlementAttempt = storedAttempt ?? {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      paymentMethod,
      amountClp,
    };
    updateSettlementAttempts((current) => ({ ...current, [debt.id]: attempt }));
    settlementsInFlight.current.add(debt.id);
    setSettlingDebtId(debt.id);
    setSettlementErrors((current) => ({ ...current, [debt.id]: "" }));
    setFeedback("");

    const clearAttempt = () => {
      updateSettlementAttempts((current) => {
        const next = { ...current };
        delete next[debt.id];
        return next;
      });
    };

    try {
      const response = await fetch(`/api/debts/${encodeURIComponent(debt.id)}/settle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attempt),
      });
      const payload = await readJson<{
        sale: Debt;
        payment: DebtPayment;
        idempotent: boolean;
      }>(response);
      clearAttempt();
      setDrafts((current) => {
        const next = { ...current };
        delete next[debt.id];
        return next;
      });
      const owner = payload.sale.debtorCollaborator || payload.sale.debtNote || "Cuenta pendiente";
      const message = payload.sale.balanceClp === 0
        ? `Saldo pagado · ${formatClp(payload.payment.amountClp)} · ${owner}.`
        : `Abono de ${formatClp(payload.payment.amountClp)} · saldo ${formatClp(payload.sale.balanceClp)} · ${owner}.`;
      setFeedback(message);
      const collaborator = payload.sale.debtorCollaborator;
      await Promise.all([
        loadDebts({ preserveCollaboratorDetails: Boolean(collaborator) }),
        collaborator ? loadCollaboratorDebts(collaborator) : Promise.resolve(),
        onPaymentRegistered(message),
      ]);
      if (payload.sale.balanceClp > 0 && !collaborator) {
        window.requestAnimationFrame(() => amountRefs.current[debt.id]?.focus());
      }
    } catch (error) {
      const definitiveResponse =
        error instanceof HttpResponseError && error.status >= 400 && error.status < 500;
      if (definitiveResponse) clearAttempt();
      if (error instanceof HttpResponseError && error.status === 409) {
        void Promise.all([loadDebts(), onPaymentRegistered("")]);
      }
      const message = definitiveResponse
        ? error.message
        : "No pudimos confirmar el abono. Reintenta para consultar y enviar exactamente el mismo cobro sin duplicarlo.";
      setSettlementErrors((current) => ({ ...current, [debt.id]: message }));
    } finally {
      settlementsInFlight.current.delete(debt.id);
      setSettlingDebtId(null);
    }
  }

  const visibleDebts = data.debts;

  function renderDebtCard(debt: Debt) {
    const draft = draftFor(debt);
    const settlementError = settlementErrors[debt.id] ?? "";
    const isSettling = settlingDebtId === debt.id;
    const collaboratorDebt = isCollaboratorDebt(debt);
    const storedAttempt = settlementAttempts[debt.id];
    const parsedAmount = Number(storedAttempt?.amountClp ?? draft.amount);
    const willPayFullBalance =
      Number.isSafeInteger(parsedAmount) && parsedAmount === debt.balanceClp;
    const controlsLocked = !activeSession || isSettling || Boolean(storedAttempt);
    return (
      <article className="debt-row" aria-busy={isSettling} key={debt.id}>
        <div className="debt-copy">
          <div className="debt-title-line">
            <div className="debt-owner">
              <span className={`debt-kind ${collaboratorDebt ? "debt-kind-collaborator" : ""}`}>
                {collaboratorDebt ? "Colaborador" : "Cliente"}
              </span>
              <strong>
                {collaboratorDebt
                  ? debt.debtorCollaborator || "Colaborador sin identificar"
                  : debt.debtNote || "Pendiente sin identificar"}
              </strong>
            </div>
            <time dateTime={debt.createdAt}>{formatDebtDate(debt.createdAt)}</time>
          </div>
          <span>{debt.items.map((item) => `${item.quantity}× ${item.productName}`).join(" · ")}</span>
          {collaboratorDebt && debt.debtNote ? <small>Nota: {debt.debtNote}</small> : null}
          {debt.seller || debt.shift ? (
            <small>
              {debt.seller ? `Registrado por ${debt.seller}` : "Responsable histórico"}
              {debt.shift ? ` · Turno ${debt.shift.toUpperCase()}` : ""}
            </small>
          ) : null}
        </div>

        <dl className="debt-money-breakdown" aria-label="Estado de la cuenta">
          <div><dt>Total original</dt><dd>{formatClp(debt.totalClp)}</dd></div>
          <div><dt>Abonado</dt><dd>{formatClp(debt.paidClp)}</dd></div>
          <div className="debt-balance"><dt>Saldo</dt><dd>{formatClp(debt.balanceClp)}</dd></div>
        </dl>

        <div className="settlement-area">
          <div className="settlement-controls">
            <label>
              <span>Monto a recibir</span>
              <input
                ref={(node) => { amountRefs.current[debt.id] = node; }}
                type="number"
                inputMode="numeric"
                min={1}
                max={debt.balanceClp}
                step={1}
                value={storedAttempt?.amountClp ?? draft.amount}
                onChange={(event) => updateDraft(debt, { amount: event.target.value })}
                aria-invalid={Boolean(settlementError)}
                aria-describedby={settlementError ? `settlement-error-${debt.id}` : undefined}
                disabled={controlsLocked}
              />
            </label>
            <label>
              <span>Medio recibido</span>
              <select
                ref={(node) => { methodRefs.current[debt.id] = node; }}
                value={storedAttempt?.paymentMethod ?? draft.paymentMethod}
                onChange={(event) => updateDraft(debt, {
                  paymentMethod: event.target.value as PaidPaymentMethod | "",
                })}
                aria-invalid={Boolean(settlementError)}
                aria-describedby={settlementError ? `settlement-error-${debt.id}` : undefined}
                disabled={controlsLocked}
              >
                <option value="">Seleccionar</option>
                {PAID_PAYMENT_METHODS.map((method) => (
                  <option value={method.value} key={method.value}>{method.label}</option>
                ))}
              </select>
            </label>
            <button
              className="settle-button"
              type="button"
              onClick={() => void settleDebt(debt)}
              disabled={!activeSession || Boolean(settlingDebtId)}
            >
              {isSettling
                ? "Registrando…"
                : storedAttempt
                  ? "Reintentar mismo abono"
                  : willPayFullBalance
                    ? "Cobrar saldo"
                    : "Registrar abono"}
            </button>
          </div>
          {settlementError ? (
            <p className="settlement-error" id={`settlement-error-${debt.id}`} role="alert">
              {settlementError}
            </p>
          ) : null}
        </div>

        <details className="debt-history">
          <summary>
            {debt.paymentCount
              ? `${debt.paymentCount} ${debt.paymentCount === 1 ? "abono registrado" : "abonos registrados"}`
              : "Sin abonos previos"}
          </summary>
          {debt.payments.length ? (
            <ul>
              {debt.payments.map((payment) => (
                <li key={payment.id}>
                  <div>
                    <time dateTime={payment.createdAt}>{formatDebtDate(payment.createdAt)}</time>
                    <span>
                      {[paymentLabel(payment.paymentMethod), payment.receivedBy]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <strong>{formatClp(payment.amountClp)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>El primer cobro quedará registrado aquí.</p>
          )}
          {debt.paymentsHasMore ? (
            <p>Se muestran los {debt.payments.length} abonos más recientes de {debt.paymentCount}.</p>
          ) : null}
        </details>
      </article>
    );
  }

  return (
    <section className="debts-section" aria-labelledby="debts-title" aria-busy={loading}>
      <div className="debts-heading">
        <div>
          <p className="eyebrow">Cobranza operativa</p>
          <h2 id="debts-title">Pendientes por cobrar</h2>
          <p>
            {role === "admin"
              ? "Registra pagos completos o abonos parciales de clientes y colaboradores."
              : "Cobra saldos o registra abonos parciales de clientes y colaboradores."}
          </p>
        </div>
        <div className="debts-heading-actions">
          <div
            className="debts-summary"
            aria-label={`${data.summary.count} cuentas con saldo pendiente por ${formatClp(data.summary.balanceClp)}`}
          >
            <span>{data.summary.count} {data.summary.count === 1 ? "cuenta" : "cuentas"}</span>
            <strong>Saldo {formatClp(data.summary.balanceClp)}</strong>
          </div>
          <button
            className="quiet-button debts-refresh-button"
            type="button"
            onClick={() => void loadDebts()}
            disabled={loading || loadingMore || Boolean(settlingDebtId)}
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {!activeSession ? (
        <div className="debts-turn-notice" role="status">
          {role === "admin"
            ? "Puedes consultar las cuentas, pero debes abrir un turno para registrar cobros o abonos."
            : "Puedes consultar las cuentas, pero debes abrir un turno para cobrar o registrar abonos."}
        </div>
      ) : null}

      <p className="debts-feedback" aria-live="polite">{feedback}</p>

      {loadError ? (
        <div className="debts-alert" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadDebts()}>Reintentar</button>
        </div>
      ) : loading ? (
        <div className="debts-empty" role="status">Cargando cuentas pendientes…</div>
      ) : visibleDebts.length || data.collaboratorSummaries.length ? (
        <div className="debts-content">
          {data.collaboratorSummaries.length ? (
            <section className="collaborator-debts-section" aria-labelledby="collaborator-debts-title">
              <header>
                <div>
                  <p className="eyebrow">Resumen agrupado</p>
                  <h3 id="collaborator-debts-title">Pendientes por colaborador</h3>
                  <p>Despliega una persona para revisar sus consumos y aplicar el abono a la transacción correspondiente.</p>
                </div>
              </header>
              <div className="collaborator-debt-groups">
                {data.collaboratorSummaries.map((summary) => {
                  const detail = collaboratorDetails[summary.collaborator];
                  return (
                    <details
                      className="collaborator-debt-group"
                      key={`${summary.collaborator}-${collaboratorGroupsVersion}`}
                      onToggle={(event) => {
                        if (event.currentTarget.open && !collaboratorDetails[summary.collaborator]) {
                          void loadCollaboratorDebts(summary.collaborator);
                        }
                      }}
                    >
                      <summary>
                        <span className="collaborator-debt-identity">
                          <strong>{summary.collaborator}</strong>
                          <small>{summary.count} {summary.count === 1 ? "consumo pendiente" : "consumos pendientes"}</small>
                        </span>
                        <span className="collaborator-debt-totals">
                          <small>Original {formatClp(summary.originalClp)} · Abonado {formatClp(summary.paidClp)}</small>
                          <strong>Pendiente total {formatClp(summary.balanceClp)}</strong>
                        </span>
                      </summary>
                      <div className="collaborator-debt-detail">
                        {detail?.loading ? (
                          <div className="collaborator-debt-state" role="status">Cargando transacciones…</div>
                        ) : detail?.error && !detail.debts.length ? (
                          <div className="debts-alert" role="alert">
                            <span>{detail.error}</span>
                            <button type="button" onClick={() => void loadCollaboratorDebts(summary.collaborator)}>Reintentar</button>
                          </div>
                        ) : detail?.debts.length ? (
                          <>
                            <p className="collaborator-debt-help">Elige el consumo al que aplicarás el cobro o abono.</p>
                            <div className="debts-list collaborator-debts-list">
                              {detail.debts.map(renderDebtCard)}
                            </div>
                            {detail.error ? <p className="debts-pagination-error" role="alert">{detail.error}</p> : null}
                            {detail.hasMore && detail.nextCursor ? (
                              <button
                                className="debts-load-more"
                                type="button"
                                onClick={() => void loadCollaboratorDebts(summary.collaborator, {
                                  cursor: detail.nextCursor ?? undefined,
                                  append: true,
                                })}
                                disabled={detail.loadingMore || Boolean(settlingDebtId)}
                              >
                                {detail.loadingMore ? "Cargando…" : "Cargar más transacciones"}
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <div className="collaborator-debt-state">No quedan transacciones pendientes para esta persona.</div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="customer-debts-section" aria-labelledby="customer-debts-title">
            <header>
              <p className="eyebrow">Cuentas individuales</p>
              <h3 id="customer-debts-title">Pendientes de clientes</h3>
            </header>
            {visibleDebts.length ? (
              <div className="debts-list">
                {visibleDebts.map(renderDebtCard)}
                {paginationError ? (
                  <p className="debts-pagination-error" role="alert">{paginationError}</p>
                ) : null}
                {data.hasMore && data.nextCursor ? (
                  <button
                    className="debts-load-more"
                    type="button"
                    onClick={() => void loadDebts({
                      cursor: data.nextCursor ?? undefined,
                      append: true,
                    })}
                    disabled={loadingMore || Boolean(settlingDebtId)}
                  >
                    {loadingMore ? "Cargando…" : "Cargar más cuentas"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="debts-empty debts-empty-compact">
                <strong>No hay pendientes de clientes</strong>
                <span>Las cuentas nuevas aparecerán aquí hasta completar su saldo.</span>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="debts-empty">
          <strong>No hay cuentas pendientes</strong>
          <span>Los pagos aplazados aparecerán aquí hasta completar su saldo.</span>
        </div>
      )}
    </section>
  );
}
