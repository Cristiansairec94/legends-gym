"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ClosureCorrectionPanel,
  type ClosureEffective,
} from "@/app/components/closure-correction-panel";
import {
  COLLABORATORS,
  INVENTORY_DIFFERENCE_REASON_LABELS,
  INVENTORY_DIFFERENCE_REASONS,
  SHIFTS,
  type InventoryDifferenceReason,
} from "@/lib/business";

type Shift = (typeof SHIFTS)[number];
type Collaborator = (typeof COLLABORATORS)[number];

export type ShiftSession = {
  id: string;
  businessDate: string;
  shift: Shift;
  responsible: Collaborator;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string | null;
  closureId?: string | null;
  openingCashClp?: number;
  activityRevision?: number;
};

type PendingCustomer = {
  id: string;
  createdAt: string;
  debtNote: string;
  totalClp: number;
};

type PendingCollaborator = {
  id: string;
  createdAt: string;
  debtorCollaborator: string;
  debtNote: string | null;
  totalClp: number;
};

type ClosurePreview = {
  businessDate: string;
  shift: Shift;
  closed: boolean;
  activityRevision: number;
  totalSalesClp: number;
  salesCount: number;
  openingCashClp: number;
  cashMovementsClp: number;
  expectedCashClp: number;
  expectedCardClp: number;
  expectedTransferClp: number;
  expectedCollectedClp: number;
  collectedPaymentsClp: number;
  pendingCustomerCount: number;
  pendingCustomerClp: number;
  collaboratorCount: number;
  collaboratorClp: number;
  pendingCustomers: PendingCustomer[];
  pendingCollaborators: PendingCollaborator[];
  unassignedSalesClp: number;
  unassignedSalesCount: number;
  unassignedPaymentsClp: number;
  unassignedPaymentsCount: number;
};

type ClosingInventoryLine = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  location: "simple" | "vitrina" | "bodega" | "ingredient";
  unit: string;
  expectedQuantity: number;
  versionToken: string;
};

type PettyCashExpense = {
  id: string;
  description: string;
  amountClp: number;
};

type PettyCashExpenseDraft = Omit<PettyCashExpense, "amountClp"> & {
  amountClp: string;
};

type DeliveryValidation = {
  validatedAt: string;
  comment: string | null;
  revisionNumber?: number;
};

type CashClosure = ClosurePreview & {
  id: string;
  closureContractVersion: 2 | null;
  sessionId: string | null;
  responsible: string;
  countedCashClp: number;
  differenceClp: number;
  countedCardClp: number | null;
  differenceCardClp: number | null;
  countedTransferClp: number | null;
  differenceTransferClp: number | null;
  countedCollectedClp: number | null;
  differenceCollectedClp: number | null;
  financialDifferenceReason: string | null;
  expensesClp: number;
  adjustedExpectedCashClp: number;
  expenses: PettyCashExpense[];
  inventory: Array<ClosingInventoryLine & {
    countedQuantity: number;
    differenceQuantity: number;
    reason: string | null;
    reasonCategory: InventoryDifferenceReason | null;
    comment: string | null;
  }>;
  handoffComments: string | null;
  notes: string | null;
  validationStatus: "pending" | "validated" | "not_required";
  validation: DeliveryValidation | null;
  createdAt: string;
};

type CashClosuresResponse = {
  session: ShiftSession | null;
  preview: ClosurePreview;
  inventory: ClosingInventoryLine[];
  closures: CashClosure[];
  pendingHasMore: boolean;
  pendingNextCursor: string | null;
};

type ClosePayload = {
  id: string;
  sessionId: string;
  expectedActivityRevision: number;
  countedCashClp: number;
  countedCardClp: number;
  countedTransferClp: number;
  financialDifferenceReason: string | null;
  expenses: PettyCashExpense[];
  inventory: Array<{
    key: string;
    versionToken: string;
    expectedQuantity: number;
    countedQuantity: number;
    reasonCategory: InventoryDifferenceReason | null;
    comment: string | null;
  }>;
  handoffComments: string | null;
};

type OpeningAttempt = {
  id: string;
  shift: Shift;
  responsible: Collaborator;
  openingCashClp: number;
};

type DeliveryValidationAttempt = {
  comment: string | null;
  expectedRevisionNumber: number;
};

type CorrectionUiState = {
  ready: boolean;
  latestRevisionNumber?: number;
  effective?: ClosureEffective;
};

type CashClosuresPanelProps = {
  activeSession: ShiftSession | null;
  canManageClosures: boolean;
  showHistory?: boolean;
  refreshSignal: number;
  onSessionChanged: (message: string) => void;
};

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function santiagoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatBusinessDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function signedQuantity(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function locationLabel(value: ClosingInventoryLine["location"]) {
  if (value === "vitrina") return "Vitrina";
  if (value === "bodega") return "Bodega";
  if (value === "ingredient") return "Insumo";
  return "Stock";
}

function validWholeNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function inventorySignature(lines: ClosingInventoryLine[]) {
  return JSON.stringify(
    lines
      .map(({ key, versionToken, expectedQuantity }) => ({
        key,
        versionToken,
        expectedQuantity,
      }))
      .sort((left, right) => left.key.localeCompare(right.key, "es")),
  );
}

function differenceText(value: number) {
  if (value === 0) return "Cuadra";
  return value > 0 ? `Sobran ${formatClp(value)}` : `Faltan ${formatClp(Math.abs(value))}`;
}

class HttpResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "HttpResponseError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: T & { error?: string };
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch (error) {
    if (!response.ok) {
      throw new HttpResponseError(`La solicitud fue rechazada (${response.status}).`, response.status);
    }
    throw error;
  }
  if (!response.ok) {
    throw new HttpResponseError(payload.error || "No se pudo completar la operación.", response.status);
  }
  return payload;
}

function ClosureAuditContent({
  closure,
  instanceKey = closure.id,
  showHistoricalCollaboratorReference = false,
}: {
  closure: CashClosure;
  instanceKey?: string;
  showHistoricalCollaboratorReference?: boolean;
}) {
  const inventoryDifferences = closure.inventory.filter((line) => line.differenceQuantity !== 0);
  const expenses = closure.expenses ?? [];
  const pendingCustomerCount = Math.max(
    closure.pendingCustomerCount,
    closure.pendingCustomers.length,
  );
  const historicalCollaborators = closure.pendingCollaborators ?? [];
  const historicalCollaboratorCount = Math.max(
    closure.collaboratorCount,
    historicalCollaborators.length,
  );
  const hasHistoricalCollaboratorReference = showHistoricalCollaboratorReference && (
    historicalCollaboratorCount > 0 ||
    closure.collaboratorClp > 0 ||
    historicalCollaborators.length > 0
  );
  return (
    <div className="delivery-audit-content">
      <section aria-labelledby={`delivery-money-${instanceKey}`}>
        <h4 id={`delivery-money-${instanceKey}`}>Dinero y medios de pago</h4>
        <dl className="delivery-money-grid">
          <div><dt>Ventas incluidas en el cierre</dt><dd>{formatClp(closure.totalSalesClp)}</dd></div>
          <div><dt>Efectivo esperado antes de gastos</dt><dd>{formatClp(closure.expectedCashClp)}</dd></div>
          <div><dt>Gastos de caja chica</dt><dd>{closure.closureContractVersion === 2 ? `− ${formatClp(closure.expensesClp)}` : "No registrado"}</dd></div>
          <div><dt>Efectivo esperado ajustado</dt><dd>{closure.closureContractVersion === 2 ? formatClp(closure.adjustedExpectedCashClp) : "No registrado"}</dd></div>
          <div><dt>Efectivo contado</dt><dd>{formatClp(closure.countedCashClp)}</dd></div>
          <div><dt>Diferencia residual efectivo</dt><dd>{differenceText(closure.differenceClp)}</dd></div>
          <div><dt>Tarjeta esperada / verificada</dt><dd>{formatClp(closure.expectedCardClp)} / {closure.countedCardClp === null ? "No registrado" : formatClp(closure.countedCardClp)}</dd></div>
          <div><dt>Diferencia tarjeta</dt><dd>{closure.differenceCardClp === null ? "No registrado" : differenceText(closure.differenceCardClp)}</dd></div>
          <div><dt>Transferencia esperada / verificada</dt><dd>{formatClp(closure.expectedTransferClp)} / {closure.countedTransferClp === null ? "No registrado" : formatClp(closure.countedTransferClp)}</dd></div>
          <div><dt>Diferencia transferencia</dt><dd>{closure.differenceTransferClp === null ? "No registrado" : differenceText(closure.differenceTransferClp)}</dd></div>
        </dl>
        {closure.financialDifferenceReason ? (
          <p className="closure-notes"><strong>Motivo de diferencias:</strong> {closure.financialDifferenceReason}</p>
        ) : null}
      </section>

      <section aria-labelledby={`delivery-expenses-${instanceKey}`}>
        <h4 id={`delivery-expenses-${instanceKey}`}>Gastos de caja chica</h4>
        {closure.closureContractVersion !== 2 ? (
          <p className="delivery-empty-copy">Este contrato histórico no registraba gastos de caja chica.</p>
        ) : expenses.length ? (
          <ul className="delivery-detail-list">
            {expenses.map((expense) => (
              <li key={expense.id}><span>{expense.description}</span><strong>{formatClp(expense.amountClp)}</strong></li>
            ))}
          </ul>
        ) : <p className="delivery-empty-copy">Sin gastos registrados.</p>}
      </section>

      <section aria-labelledby={`delivery-debts-${instanceKey}`}>
        <h4 id={`delivery-debts-${instanceKey}`}>Pendientes de clientes al entregar</h4>
        <div className="delivery-debt-summary">
          <span>Clientes: {pendingCustomerCount} · {formatClp(closure.pendingCustomerClp)}</span>
        </div>
        {closure.pendingCustomers.length ? (
          <ul className="delivery-detail-list">
            {closure.pendingCustomers.map((debt) => (
              <li key={debt.id}><span>Cliente · {debt.debtNote}</span><strong>{formatClp(debt.totalClp)}</strong></li>
            ))}
          </ul>
        ) : <p className="delivery-empty-copy">Sin pendientes de clientes registrados.</p>}
      </section>

      {hasHistoricalCollaboratorReference ? (
        <section className="delivery-historical-reference" aria-labelledby={`delivery-historical-collaborators-${instanceKey}`}>
          <h4 id={`delivery-historical-collaborators-${instanceKey}`}>Referencia histórica · fuera de caja</h4>
          <p className="delivery-section-meta">
            Una versión anterior guardó estos consumos pendientes como referencia. No correspondían
            a dinero recibido ni afectaron el efectivo esperado del turno.
          </p>
          {historicalCollaboratorCount > 0 || closure.collaboratorClp > 0 ? (
            <div className="delivery-debt-summary">
              <span>{historicalCollaboratorCount} {historicalCollaboratorCount === 1 ? "consumo" : "consumos"}</span>
              {closure.collaboratorClp > 0 ? <span>{formatClp(closure.collaboratorClp)}</span> : null}
            </div>
          ) : null}
          {historicalCollaborators.length ? (
            <ul className="delivery-detail-list">
              {historicalCollaborators.map((debt) => (
                <li key={debt.id}>
                  <span>{debt.debtorCollaborator}{debt.debtNote ? ` · ${debt.debtNote}` : ""}</span>
                  <strong>{formatClp(debt.totalClp)}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          {historicalCollaboratorCount > historicalCollaborators.length ? (
            <p className="delivery-section-meta">
              Se conserva el total del cierre; el detalle disponible contiene {historicalCollaborators.length} registros.
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby={`delivery-inventory-${instanceKey}`}>
        <h4 id={`delivery-inventory-${instanceKey}`}>Inventario entregado</h4>
        <p className="delivery-section-meta">
          {closure.inventory.length} líneas contadas · {inventoryDifferences.length} con diferencia. {closure.closureContractVersion === 2
            ? "Bodega fuera del cierre."
            : closure.inventory.some((line) => line.location === "bodega")
              ? "Cierre histórico: incluyó bodega bajo el contrato anterior."
              : "Cierre histórico bajo el contrato anterior."}
        </p>
        {closure.inventory.length ? (
          <ul className="delivery-inventory-list">
            {closure.inventory.map((line) => (
              <li key={line.key}>
                <div><strong>{line.name}</strong><span>{locationLabel(line.location)} · {line.unit}</span></div>
                <span>Esperado {line.expectedQuantity} · Contado {line.countedQuantity} · Diferencia {signedQuantity(line.differenceQuantity)}</span>
                {line.reasonCategory ? (
                  <small>
                    Motivo: {INVENTORY_DIFFERENCE_REASON_LABELS[line.reasonCategory]}
                  </small>
                ) : line.reason ? <small>Motivo histórico: {line.reason}</small> : null}
                {line.comment && line.comment !== line.reason ? (
                  <small>Comentario: {line.comment}</small>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="delivery-empty-copy">Sin inventario físico para esta entrega.</p>}
      </section>

      <section aria-labelledby={`delivery-comments-${instanceKey}`}>
        <h4 id={`delivery-comments-${instanceKey}`}>Comentarios de entrega</h4>
        <p className="delivery-comments-readonly">{closure.handoffComments || closure.notes || "Sin comentarios adicionales."}</p>
      </section>

      {closure.validationStatus === "validated" && closure.validation ? (
        <section className="delivery-validation-record" aria-labelledby={`delivery-validation-${instanceKey}`}>
          <h4 id={`delivery-validation-${instanceKey}`}>Validación administrativa</h4>
          <p>
            Validada el {formatCreatedAt(closure.validation.validatedAt)} sobre {closure.validation.revisionNumber
              ? `la revisión ${closure.validation.revisionNumber}`
              : "la entrega original"}.
          </p>
          <p>{closure.validation.comment || "Sin comentario administrativo."}</p>
        </section>
      ) : null}
    </div>
  );
}

export function CashClosuresPanel({
  activeSession,
  canManageClosures,
  showHistory = false,
  refreshSignal,
  onSessionChanged,
}: CashClosuresPanelProps) {
  const [closedSessionId, setClosedSessionId] = useState<string | null>(null);
  const [openingShift, setOpeningShift] = useState<Shift | "">("");
  const [openingResponsible, setOpeningResponsible] = useState<Collaborator | "">("");
  const [openingCashClp, setOpeningCashClp] = useState("");
  const [openingAttempt, setOpeningAttempt] = useState<OpeningAttempt | null>(null);
  const [opening, setOpening] = useState(false);
  const [openingError, setOpeningError] = useState("");
  const [historyDate, setHistoryDate] = useState(santiagoDate);
  const [historyShift, setHistoryShift] = useState<Shift>("am");
  const [preview, setPreview] = useState<ClosurePreview | null>(null);
  const [inventory, setInventory] = useState<ClosingInventoryLine[]>([]);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingHasMore, setPendingHasMore] = useState(false);
  const [pendingNextCursor, setPendingNextCursor] = useState<string | null>(null);
  const [loadingMorePending, setLoadingMorePending] = useState(false);
  const [pendingLoadError, setPendingLoadError] = useState("");
  const [countedCashClp, setCountedCashClp] = useState("");
  const [countedCardClp, setCountedCardClp] = useState("");
  const [countedTransferClp, setCountedTransferClp] = useState("");
  const [financialDifferenceReason, setFinancialDifferenceReason] = useState("");
  const [expenses, setExpenses] = useState<PettyCashExpenseDraft[]>([]);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [inventoryReasonCategories, setInventoryReasonCategories] = useState<
    Record<string, InventoryDifferenceReason | "">
  >({});
  const [inventoryComments, setInventoryComments] = useState<Record<string, string>>({});
  const [handoffComments, setHandoffComments] = useState("");
  const [validationComments, setValidationComments] = useState<Record<string, string>>({});
  const [validationAttempts, setValidationAttempts] = useState<Record<string, DeliveryValidationAttempt>>({});
  const [validatingClosureId, setValidatingClosureId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [correctionStates, setCorrectionStates] = useState<Record<string, CorrectionUiState>>({});
  const [correctionEditing, setCorrectionEditing] = useState<Record<string, boolean>>({});
  const [expandedRevisionClosures, setExpandedRevisionClosures] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [closeAttempt, setCloseAttempt] = useState<ClosePayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deliveryReceipt, setDeliveryReceipt] = useState<CashClosure | null>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const transferInputRef = useRef<HTMLInputElement>(null);
  const financialReasonRef = useRef<HTMLTextAreaElement>(null);
  const expenseDescriptionRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const expenseAmountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const inventoryCountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const inventoryCategoryRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const inventoryCommentRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingPageRequestRef = useRef(0);
  const previewSnapshotRef = useRef<{
    sessionId: string;
    revision: number;
    inventorySignature: string;
  } | null>(null);
  const session = activeSession?.id === closedSessionId ? null : activeSession;

  useEffect(() => () => {
    pendingPageRequestRef.current += 1;
  }, []);

  function resetClosingForm() {
    setCountedCashClp("");
    setCountedCardClp("");
    setCountedTransferClp("");
    setFinancialDifferenceReason("");
    setExpenses([]);
    setInventoryDrafts({});
    setInventoryReasonCategories({});
    setInventoryComments({});
    setHandoffComments("");
    setSubmitted(false);
    setTouchedFields(new Set());
    setCloseAttempt(null);
    setFormError("");
    previewSnapshotRef.current = null;
  }

  const queryDate = session?.businessDate ?? historyDate;
  const queryShift = session?.shift ?? historyShift;

  useEffect(() => {
    pendingPageRequestRef.current += 1;
    setLoadingMorePending(false);
    if (!canManageClosures || closeAttempt || (!session && !showHistory)) return;
    setPendingLoadError("");
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const query = new URLSearchParams({ date: queryDate, shift: queryShift });
        if (showHistory) query.set("pendingLimit", "30");
        const response = await fetch(`/api/cash-closures?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJson<CashClosuresResponse>(response);
        if (controller.signal.aborted) return;
        setClosures(payload.closures);
        setPendingHasMore(Boolean(payload.pendingHasMore && payload.pendingNextCursor));
        setPendingNextCursor(payload.pendingNextCursor ?? null);
        if (!session) {
          setPreview(null);
          setInventory([]);
          return;
        }
        const previous = previewSnapshotRef.current;
        const countableInventory = payload.inventory.filter((line) => line.location !== "bodega");
        const nextInventorySignature = inventorySignature(countableInventory);
        const sessionChanged = Boolean(previous && previous.sessionId !== session.id);
        const revisionChanged = Boolean(
          previous?.sessionId === session.id && previous.revision !== payload.preview.activityRevision,
        );
        const inventoryChanged = Boolean(
          previous?.sessionId === session.id &&
          previous.inventorySignature !== nextInventorySignature,
        );
        setPreview(payload.preview);
        setInventory(countableInventory);
        if (sessionChanged || revisionChanged || inventoryChanged) {
          resetClosingForm();
          if (revisionChanged || inventoryChanged) {
            setFormError(
              inventoryChanged
                ? "El inventario cambió desde la última revisión. Revisa los montos y vuelve a contar todas las ubicaciones."
                : "Hubo nuevos movimientos en el turno. Revisa los montos y vuelve a contar el inventario.",
            );
          }
        } else {
          setInventoryDrafts((current) =>
            Object.fromEntries(countableInventory.map((line) => [line.key, current[line.key] ?? ""])),
          );
        }
        previewSnapshotRef.current = {
          sessionId: session.id,
          revision: payload.preview.activityRevision,
          inventorySignature: nextInventorySignature,
        };
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreview(null);
        setInventory([]);
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar el cierre de turno.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [canManageClosures, closeAttempt, queryDate, queryShift, refreshKey, refreshSignal, session, showHistory]);

  async function loadMorePendingDeliveries() {
    if (!showHistory || loading || loadingMorePending || !pendingHasMore || !pendingNextCursor) return;
    const requestId = ++pendingPageRequestRef.current;
    const cursor = pendingNextCursor;
    setLoadingMorePending(true);
    setPendingLoadError("");
    try {
      const query = new URLSearchParams({
        date: queryDate,
        shift: queryShift,
        pendingLimit: "30",
        pendingCursor: cursor,
      });
      const response = await fetch(`/api/cash-closures?${query}`, { cache: "no-store" });
      const payload = await readJson<CashClosuresResponse>(response);
      if (requestId !== pendingPageRequestRef.current) return;
      setClosures((current) => {
        const knownIds = new Set(current.map((closure) => closure.id));
        const additions = payload.closures.filter(
          (closure) => {
            if (closure.validationStatus !== "pending" || knownIds.has(closure.id)) return false;
            knownIds.add(closure.id);
            return true;
          },
        );
        return [...current, ...additions];
      });
      setPendingHasMore(Boolean(payload.pendingHasMore && payload.pendingNextCursor));
      setPendingNextCursor(payload.pendingNextCursor ?? null);
    } catch (error) {
      if (requestId !== pendingPageRequestRef.current) return;
      setPendingLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar más entregas pendientes.",
      );
    } finally {
      if (requestId === pendingPageRequestRef.current) setLoadingMorePending(false);
    }
  }

  const cashCount = validWholeNumber(countedCashClp);
  const cardCount = validWholeNumber(countedCardClp);
  const transferCount = validWholeNumber(countedTransferClp);
  const expenseResults = useMemo(
    () => expenses.map((expense) => ({
      ...expense,
      parsedAmount: validWholeNumber(expense.amountClp),
      descriptionValid: Boolean(expense.description.trim()),
    })),
    [expenses],
  );
  const expensesClp = expenseResults.reduce(
    (total, expense) => total + (expense.parsedAmount && expense.parsedAmount > 0 ? expense.parsedAmount : 0),
    0,
  );
  const cashShortfallBeforeExpenses = preview && cashCount !== null
    ? Math.max(preview.expectedCashClp - cashCount, 0)
    : 0;
  const hasCashShortfall = cashShortfallBeforeExpenses > 0;
  const expensesValid = !hasCashShortfall || (
    expenseResults.every((expense) => expense.descriptionValid && expense.parsedAmount !== null && expense.parsedAmount > 0) &&
    expensesClp <= cashShortfallBeforeExpenses
  );
  const adjustedExpectedCashClp = preview
    ? preview.expectedCashClp - (hasCashShortfall ? expensesClp : 0)
    : null;
  const cashDifference = adjustedExpectedCashClp !== null && cashCount !== null
    ? cashCount - adjustedExpectedCashClp
    : null;
  const cardDifference = preview && cardCount !== null ? cardCount - preview.expectedCardClp : null;
  const transferDifference = preview && transferCount !== null
    ? transferCount - preview.expectedTransferClp
    : null;
  const financialCountsValid = cashCount !== null && cardCount !== null && transferCount !== null;
  const hasFinancialDifference = financialCountsValid &&
    [cashDifference, cardDifference, transferDifference].some((difference) => difference !== 0);

  const inventoryResults = useMemo(
    () => inventory.map((line) => {
      const countedQuantity = validWholeNumber(inventoryDrafts[line.key] ?? "");
      return {
        line,
        countedQuantity,
        difference: countedQuantity === null ? null : countedQuantity - line.expectedQuantity,
        reasonCategory: inventoryReasonCategories[line.key] ?? "",
        comment: inventoryComments[line.key]?.trim() ?? "",
      };
    }),
    [inventory, inventoryComments, inventoryDrafts, inventoryReasonCategories],
  );
  const inventoryComplete = inventoryResults.every(
    ({ countedQuantity, difference, reasonCategory, comment }) =>
      countedQuantity !== null &&
      (difference === 0 || (Boolean(reasonCategory) && Boolean(comment))),
  );
  const financialReasonComplete = !hasFinancialDifference || Boolean(financialDifferenceReason.trim());
  const readyToClose = Boolean(
    session && preview && financialCountsValid && expensesValid && financialReasonComplete && inventoryComplete,
  );

  const readinessText = !financialCountsValid
    ? "Ingresa los montos contados de efectivo, tarjeta y transferencia."
    : !expensesValid
      ? expensesClp > cashShortfallBeforeExpenses
        ? "El total de gastos no puede superar el faltante de efectivo."
        : "Completa la descripción y el monto de cada gasto de caja chica."
      : !financialReasonComplete
      ? "Explica la diferencia detectada en los medios de pago."
      : !inventoryComplete
        ? "Completa el conteo físico y explica cada diferencia de inventario."
        : "El resumen está completo. El turno está listo para cerrar y entregar.";

  function markTouched(key: string) {
    setTouchedFields((current) => new Set(current).add(key));
  }

  function addExpense() {
    if (expenses.length >= 25) return;
    const id = crypto.randomUUID();
    setExpenses((current) => [...current, { id, description: "", amountClp: "" }]);
    setCloseAttempt(null);
    setFormError("");
    window.setTimeout(() => expenseDescriptionRefs.current[id]?.focus(), 0);
  }

  function updateExpense(id: string, patch: Partial<PettyCashExpenseDraft>) {
    setExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, ...patch } : expense));
    setCloseAttempt(null);
    setFormError("");
  }

  function removeExpense(id: string) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    setTouchedFields((current) => {
      const next = new Set(current);
      next.delete(`expense-description-${id}`);
      next.delete(`expense-amount-${id}`);
      return next;
    });
    setCloseAttempt(null);
    setFormError("");
  }

  function handleCashChange(value: string) {
    setCountedCashClp(value);
    const nextCount = validWholeNumber(value);
    if (preview && nextCount !== null && nextCount >= preview.expectedCashClp && expenses.length) {
      setExpenses([]);
    }
    setCloseAttempt(null);
    setFormError("");
  }

  function focusFirstInvalid() {
    if (cashCount === null) return cashInputRef.current?.focus();
    if (cardCount === null) return cardInputRef.current?.focus();
    if (transferCount === null) return transferInputRef.current?.focus();
    if (hasCashShortfall) {
      const invalidDescription = expenseResults.find((expense) => !expense.descriptionValid);
      if (invalidDescription) return expenseDescriptionRefs.current[invalidDescription.id]?.focus();
      const invalidAmount = expenseResults.find(
        (expense) => expense.parsedAmount === null || expense.parsedAmount <= 0,
      );
      if (invalidAmount) return expenseAmountRefs.current[invalidAmount.id]?.focus();
      if (expensesClp > cashShortfallBeforeExpenses) {
        return expenseAmountRefs.current[expenseResults.at(-1)?.id ?? ""]?.focus();
      }
    }
    if (!financialReasonComplete) return financialReasonRef.current?.focus();
    const invalidInventory = inventoryResults.find(({ countedQuantity }) => countedQuantity === null);
    if (invalidInventory) return inventoryCountRefs.current[invalidInventory.line.key]?.focus();
    const uncategorizedInventory = inventoryResults.find(
      ({ difference, reasonCategory }) =>
        difference !== null && difference !== 0 && !reasonCategory,
    );
    if (uncategorizedInventory) {
      return inventoryCategoryRefs.current[uncategorizedInventory.line.key]?.focus();
    }
    const uncommentedInventory = inventoryResults.find(
      ({ difference, comment }) =>
        difference !== null && difference !== 0 && !comment,
    );
    if (uncommentedInventory) {
      return inventoryCommentRefs.current[uncommentedInventory.line.key]?.focus();
    }
  }

  async function openShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const openingCash = validWholeNumber(openingCashClp);
    if (!openingShift || !openingResponsible || openingCash === null) {
      setOpeningError("Selecciona turno y responsable e ingresa un efectivo inicial entero igual o mayor que cero.");
      return;
    }
    const attempt = openingAttempt ?? {
      id: crypto.randomUUID(),
      shift: openingShift,
      responsible: openingResponsible,
      openingCashClp: openingCash,
    };
    setOpeningAttempt(attempt);
    setOpening(true);
    setOpeningError("");
    let postAccepted = false;
    try {
      const response = await fetch("/api/shift-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attempt),
      });
      const payload = await readJson<{ session: ShiftSession; idempotent: boolean }>(response);
      postAccepted = true;
      const contextResponse = await fetch("/api/pos", { cache: "no-store" });
      const context = await readJson<{ activeSession: ShiftSession | null }>(contextResponse);
      setOpeningAttempt(null);
      setClosedSessionId(null);
      setOpeningShift("");
      setOpeningResponsible("");
      setOpeningCashClp("");
      setHistoryDate(payload.session.businessDate);
      setHistoryShift(payload.session.shift);
      setDeliveryReceipt(null);
      resetClosingForm();
      onSessionChanged(
        context.activeSession?.status === "open"
          ? context.activeSession.id === payload.session.id
            ? `Turno ${context.activeSession.shift.toUpperCase()} abierto con ${context.activeSession.responsible}.`
            : `Se recuperó el turno activo ${context.activeSession.shift.toUpperCase()} de ${context.activeSession.responsible}.`
          : "La apertura se recuperó, pero ese turno ya estaba cerrado. Puedes abrir el turno vigente.",
      );
    } catch (error) {
      if (error instanceof HttpResponseError) {
        if (!postAccepted && error.status >= 400 && error.status < 500) setOpeningAttempt(null);
        if (!postAccepted && error.status === 409) onSessionChanged("Se actualizó el estado de los turnos.");
      }
      setOpeningError(error instanceof Error ? error.message : "No se pudo abrir el turno.");
    } finally {
      setOpening(false);
    }
  }

  function resetAfterStale() {
    setCloseAttempt(null);
    setCountedCashClp("");
    setCountedCardClp("");
    setCountedTransferClp("");
    setFinancialDifferenceReason("");
    setExpenses([]);
    setInventoryDrafts({});
    setInventoryReasonCategories({});
    setInventoryComments({});
    setHandoffComments("");
    setSubmitted(false);
    setTouchedFields(new Set());
    previewSnapshotRef.current = null;
    setRefreshKey((current) => current + 1);
  }

  async function closeShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!session || !preview || !readyToClose || cashCount === null || cardCount === null || transferCount === null) {
      setFormError(readinessText);
      window.setTimeout(focusFirstInvalid, 0);
      return;
    }
    if (!closeAttempt && !window.confirm(
      `¿Cerrar y entregar el turno ${session.shift.toUpperCase()} de ${session.responsible}? Esta acción no se puede editar ni deshacer.`,
    )) return;

    const payload: ClosePayload = closeAttempt ?? {
      id: crypto.randomUUID(),
      sessionId: session.id,
      expectedActivityRevision: preview.activityRevision,
      countedCashClp: cashCount,
      countedCardClp: cardCount,
      countedTransferClp: transferCount,
      financialDifferenceReason: hasFinancialDifference ? financialDifferenceReason.trim() : null,
      expenses: hasCashShortfall ? expenseResults.map((expense) => ({
        id: expense.id,
        description: expense.description.trim(),
        amountClp: expense.parsedAmount as number,
      })) : [],
      inventory: inventoryResults.map(({
        line,
        countedQuantity,
        difference,
        reasonCategory,
        comment,
      }) => ({
        key: line.key,
        versionToken: line.versionToken,
        expectedQuantity: line.expectedQuantity,
        countedQuantity: countedQuantity as number,
        reasonCategory:
          difference === 0 ? null : reasonCategory || null,
        comment: difference === 0 ? null : comment || null,
      })),
      handoffComments: handoffComments.trim() || null,
    };
    setCloseAttempt(payload);
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/cash-closures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJson<{
        closure: CashClosure;
        idempotent: boolean;
        nextSessionAvailable: boolean;
      }>(response);
      setCloseAttempt(null);
      setDeliveryReceipt(result.closure);
      setClosedSessionId(session.id);
      resetClosingForm();
      setHistoryDate(result.closure.businessDate);
      setHistoryShift(result.closure.shift);
      setRefreshKey((current) => current + 1);
      onSessionChanged(`Turno ${result.closure.shift.toUpperCase()} entregado por ${result.closure.responsible}.`);
    } catch (error) {
      if (error instanceof HttpResponseError) {
        if (error.status === 409) resetAfterStale();
        else if (error.status >= 400 && error.status < 500) setCloseAttempt(null);
      }
      setFormError(
        error instanceof HttpResponseError && error.status === 409
          ? `${error.message} La información se actualizó: revisa los montos y vuelve a contar todo el inventario.`
          : error instanceof Error
            ? error.message
            : "No se pudo cerrar el turno. Reintenta sin cambiar los datos.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function validateDelivery(closure: CashClosure) {
    const correctionState = correctionStates[closure.id];
    if (!correctionState?.ready || correctionState.latestRevisionNumber === undefined) {
      setValidationErrors((current) => ({
        ...current,
        [closure.id]: "Espera a que termine de cargar el estado de revisión antes de validar.",
      }));
      return;
    }
    if (correctionEditing[closure.id]) {
      setValidationErrors((current) => ({
        ...current,
        [closure.id]: "Guarda o cancela el borrador de corrección antes de validar.",
      }));
      return;
    }
    const attempt = validationAttempts[closure.id] ?? {
      comment: validationComments[closure.id]?.trim() || null,
      expectedRevisionNumber: correctionState.latestRevisionNumber,
    };
    if (!validationAttempts[closure.id] && !window.confirm(
      `¿Validar la entrega del turno ${closure.shift.toUpperCase()} de ${closure.responsible}? La revisión administrativa quedará registrada.`,
    )) return;
    setValidationAttempts((current) => ({ ...current, [closure.id]: attempt }));
    setValidatingClosureId(closure.id);
    setValidationErrors((current) => ({ ...current, [closure.id]: "" }));
    try {
      const response = await fetch(`/api/cash-closures/${closure.id}/validate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(attempt),
      });
      const result = await readJson<{ closure: CashClosure; idempotent: boolean }>(response);
      setClosures((current) => current.map((item) => item.id === closure.id ? result.closure : item));
      setDeliveryReceipt((current) => current?.id === closure.id ? result.closure : current);
      setValidationAttempts((current) => {
        const next = { ...current };
        delete next[closure.id];
        return next;
      });
      onSessionChanged(`Entrega del turno ${closure.shift.toUpperCase()} validada.`);
    } catch (error) {
      if (error instanceof HttpResponseError && error.status >= 400 && error.status < 500) {
        setValidationAttempts((current) => {
          const next = { ...current };
          delete next[closure.id];
          return next;
        });
        if (error.status === 409) setRefreshKey((current) => current + 1);
      }
      setValidationErrors((current) => ({
        ...current,
        [closure.id]: error instanceof Error ? error.message : "No se pudo validar la entrega.",
      }));
    } finally {
      setValidatingClosureId(null);
    }
  }

  function renderClosureCard(closure: CashClosure) {
    const correctionState = correctionStates[closure.id];
    const effective = correctionState?.effective;
    const latestRevisionNumber = correctionState?.latestRevisionNumber ?? closure.validation?.revisionNumber ?? 0;
    const overallDifference = effective?.differenceCollectedClp ?? closure.differenceCollectedClp ?? closure.differenceClp;
    const statusLabel = closure.validationStatus === "validated"
      ? "Validada"
      : closure.validationStatus === "not_required"
        ? "Histórico · sin validación requerida"
        : "Pendiente de validar";
    return (
      <article
        className={`closure-card delivery-review-card ${closure.validationStatus === "pending" ? "delivery-review-card-pending" : ""}`}
        key={closure.id}
      >
        <div className="closure-card-heading">
          <div>
            <strong>Turno {closure.shift.toUpperCase()} · {closure.responsible}</strong>
            <span>{formatBusinessDate(closure.businessDate)} · Cerrado {formatCreatedAt(closure.createdAt)}</span>
            {latestRevisionNumber > 0 ? <span>Revisión {latestRevisionNumber} vigente</span> : null}
          </div>
          <span className={`delivery-status-badge delivery-status-${closure.validationStatus}`}>{statusLabel}</span>
        </div>
        <div className="delivery-card-summary">
          <dl>
            <div><dt>{effective ? "Ventas incluidas vigentes" : "Ventas del acta original"}</dt><dd>{formatClp(effective?.includedSalesClp ?? closure.totalSalesClp)}</dd></div>
            <div><dt>Gastos de caja chica</dt><dd>{closure.closureContractVersion === 2 ? formatClp(closure.expensesClp) : "No registrado"}</dd></div>
            <div><dt>Resultado de caja</dt><dd>{overallDifference === 0 ? "Cuadra" : differenceText(overallDifference)}</dd></div>
            <div><dt>Diferencias de stock</dt><dd>{effective?.inventoryDifferenceCount ?? closure.inventory.filter((line) => line.differenceQuantity !== 0).length}</dd></div>
          </dl>
        </div>
        <details className="closure-audit-details delivery-full-details">
          <summary>{latestRevisionNumber > 0 ? "Ver acta original de la entrega" : "Ver detalle completo de la entrega"}</summary>
          <ClosureAuditContent
            closure={closure}
            instanceKey={`history-${closure.id}`}
            showHistoricalCollaboratorReference
          />
        </details>
        {closure.closureContractVersion === 2 && closure.validationStatus !== "pending" ? (
          <details
            className="closure-revisions-lazy"
            onToggle={(event) => {
              if (!event.currentTarget.open || expandedRevisionClosures[closure.id]) return;
              setExpandedRevisionClosures((current) => ({ ...current, [closure.id]: true }));
            }}
          >
            <summary>Ver estado vigente y correcciones</summary>
            {expandedRevisionClosures[closure.id] ? (
              <ClosureCorrectionPanel
                closureId={closure.id}
                readOnly
                refreshSignal={refreshSignal + refreshKey}
                onStateChange={(state) => setCorrectionStates((current) => ({ ...current, [closure.id]: state }))}
                onEditingChange={() => undefined}
                onCorrected={() => undefined}
              />
            ) : null}
          </details>
        ) : null}
        {closure.validationStatus === "pending" ? (
          <details
            className="closure-revisions-lazy pending-delivery-workflow"
            onToggle={(event) => {
              if (!event.currentTarget.open || expandedRevisionClosures[closure.id]) return;
              setExpandedRevisionClosures((current) => ({ ...current, [closure.id]: true }));
            }}
          >
            <summary>Revisar, corregir y validar</summary>
            {expandedRevisionClosures[closure.id] ? (
              <section className="admin-validation-panel" aria-labelledby={`admin-validation-${closure.id}`}>
                <div>
                  <h4 id={`admin-validation-${closure.id}`}>Revisión administrativa</h4>
                  <p>Corrige cualquier error antes de validar. La revisión no bloquea el siguiente turno.</p>
                </div>
                {closure.closureContractVersion === 2 ? (
                  <ClosureCorrectionPanel
                    closureId={closure.id}
                    readOnly={Boolean(validationAttempts[closure.id])}
                    refreshSignal={refreshSignal + refreshKey}
                    onStateChange={(state) => setCorrectionStates((current) => ({ ...current, [closure.id]: state }))}
                    onEditingChange={(editing) => setCorrectionEditing((current) => ({ ...current, [closure.id]: editing }))}
                    onCorrected={(message) => {
                      setValidationErrors((current) => ({ ...current, [closure.id]: "" }));
                      onSessionChanged(message);
                    }}
                  />
                ) : null}
                <label className="cash-field">
                  <span>Comentario administrativo <small>Opcional</small></span>
                  <textarea
                    value={validationComments[closure.id] ?? ""}
                    onChange={(event) => setValidationComments((current) => ({ ...current, [closure.id]: event.target.value }))}
                    maxLength={1000}
                    rows={3}
                    disabled={Boolean(validationAttempts[closure.id]) || validatingClosureId === closure.id}
                    placeholder="Ej. Revisado contra comprobantes; diferencia respaldada."
                  />
                  {validationAttempts[closure.id] ? <small>Comentario congelado para reintentar la misma validación de forma segura.</small> : null}
                </label>
                {validationErrors[closure.id] ? (
                  <p className="cash-form-error" role="alert">{validationErrors[closure.id]}</p>
                ) : null}
                <button
                  className="validate-delivery-button"
                  type="button"
                  onClick={() => void validateDelivery(closure)}
                  disabled={
                    validatingClosureId === closure.id ||
                    !correctionState?.ready ||
                    correctionState.latestRevisionNumber === undefined ||
                    Boolean(correctionEditing[closure.id])
                  }
                >
                  {validatingClosureId === closure.id
                    ? "Validando entrega…"
                    : validationAttempts[closure.id]
                      ? "Reintentar validación"
                      : !correctionState?.ready
                        ? "Preparando validación…"
                        : latestRevisionNumber > 0
                          ? `Validar revisión ${latestRevisionNumber}`
                          : "Validar entrega"}
                </button>
              </section>
            ) : null}
          </details>
        ) : null}
      </article>
    );
  }

  const pendingValidations = closures.filter((closure) => closure.validationStatus === "pending");
  const reviewedHistory = closures.filter((closure) => closure.validationStatus !== "pending");
  const history = showHistory ? (
    <div className="admin-deliveries" aria-label="Revisión administrativa de entregas">
      {loadError && !session ? (
        <div className="cash-preview-state cash-preview-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => setRefreshKey((current) => current + 1)}>Reintentar</button></div>
      ) : loading && !session ? (
        <div className="closure-history-empty" role="status">Cargando entregas…</div>
      ) : (
        <>
          <section className="closure-history admin-pending-deliveries" aria-labelledby="pending-deliveries-title">
            <div className="closure-history-heading">
              <div><p className="eyebrow">Control administrativo</p><h3 id="pending-deliveries-title">Entregas pendientes de validar</h3><span>La validación es posterior y nunca bloquea el siguiente turno.</span></div>
              <span>{pendingValidations.length} {pendingValidations.length === 1 ? "pendiente" : "pendientes"}</span>
            </div>
            {pendingValidations.length ? (
              <div className="closure-history-grid">{pendingValidations.map(renderClosureCard)}</div>
            ) : (
              <div className="closure-history-empty"><strong>No hay entregas pendientes</strong><span>Las nuevas entregas aparecerán aquí para revisión.</span></div>
            )}
            {pendingHasMore || pendingLoadError ? (
              <div className="pending-deliveries-pagination">
                <p role="status">{pendingValidations.length} {pendingValidations.length === 1 ? "entrega pendiente cargada" : "entregas pendientes cargadas"}.</p>
                {pendingLoadError ? <p className="cash-form-error" role="alert">{pendingLoadError}</p> : null}
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => void loadMorePendingDeliveries()}
                  disabled={loading || loadingMorePending || !pendingNextCursor}
                >
                  {loadingMorePending ? "Cargando entregas pendientes…" : "Cargar más entregas pendientes"}
                </button>
              </div>
            ) : null}
          </section>
          <section className="closure-history" aria-labelledby="closure-history-title">
            <div className="closure-history-heading">
              <div><h3 id="closure-history-title">Historial de entregas</h3><span>Registros inmutables ya revisados o históricos.</span></div>
              <span>{reviewedHistory.length} {reviewedHistory.length === 1 ? "entrega" : "entregas"}</span>
            </div>
            {reviewedHistory.length ? (
              <div className="closure-history-grid">{reviewedHistory.map(renderClosureCard)}</div>
            ) : (
              <div className="closure-history-empty"><strong>Aún no hay entregas revisadas</strong><span>Al validar una entrega pasará a este historial.</span></div>
            )}
          </section>
        </>
      )}
    </div>
  ) : null;

  if (!session) {
    return (
      <section className="turn-opening-section" aria-labelledby="turn-opening-title">
        <div className="cash-closures-heading">
          <div><p className="eyebrow">Inicio de operación</p><h2 id="turn-opening-title">Abrir turno</h2></div>
          <span>La asignación quedará bloqueada hasta la entrega.</span>
        </div>
        {deliveryReceipt ? (
          <article className="delivery-receipt" aria-labelledby={`delivery-receipt-${deliveryReceipt.id}`}>
            <div className="delivery-receipt-heading" role="status">
              <div><p className="eyebrow">Recibo inmutable</p><h3 id={`delivery-receipt-${deliveryReceipt.id}`}>Turno entregado</h3></div>
              <span>{deliveryReceipt.shift.toUpperCase()} · {deliveryReceipt.responsible} · {formatBusinessDate(deliveryReceipt.businessDate)}</span>
            </div>
            <ClosureAuditContent closure={deliveryReceipt} instanceKey={`receipt-${deliveryReceipt.id}`} />
          </article>
        ) : null}
        <form className="turn-opening-form" onSubmit={openShift} aria-busy={opening}>
          <div className="turn-opening-copy"><h3>Nueva sesión de caja</h3><p>Selecciona estos datos una sola vez. Todas las ventas y cobros quedarán asociados al turno.</p></div>
          <div className="turn-opening-fields">
            <label className="cash-field">
              <span>Turno <small>Obligatorio</small></span>
              <select value={openingAttempt?.shift ?? openingShift} onChange={(event) => { setOpeningShift(event.target.value as Shift | ""); setOpeningError(""); }} disabled={Boolean(openingAttempt)} required>
                <option value="">Seleccionar</option>{SHIFTS.map((shift) => <option value={shift} key={shift}>Turno {shift.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="cash-field">
              <span>Responsable <small>Obligatorio</small></span>
              <select value={openingAttempt?.responsible ?? openingResponsible} onChange={(event) => { setOpeningResponsible(event.target.value as Collaborator | ""); setOpeningError(""); }} disabled={Boolean(openingAttempt)} required>
                <option value="">Seleccionar</option>{COLLABORATORS.map((person) => <option value={person} key={person}>{person}</option>)}
              </select>
            </label>
            <label className="cash-field">
              <span>Efectivo inicial <small>Obligatorio</small></span>
              <input type="number" inputMode="numeric" min="0" step="1" value={openingAttempt ? String(openingAttempt.openingCashClp) : openingCashClp} onChange={(event) => { setOpeningCashClp(event.target.value); setOpeningError(""); }} disabled={Boolean(openingAttempt)} placeholder="0" required />
              <small>Fondo de caja antes de la primera venta. Puede ser $0.</small>
            </label>
          </div>
          {openingError ? <p className="cash-form-error" role="alert">{openingError}</p> : null}
          <button className="open-shift-button" type="submit" disabled={opening}>{opening ? "Abriendo turno…" : openingAttempt ? "Reintentar apertura" : "Confirmar y abrir turno"}</button>
        </form>
        {history}
      </section>
    );
  }

  if (!canManageClosures) return null;

  return (
    <section className="cash-closures-section" aria-labelledby="cash-closures-title">
      <div className="cash-closures-heading">
        <div><p className="eyebrow">Entrega formal</p><h2 id="cash-closures-title">Cerrar turno</h2></div>
        <span>La entrega ajusta el inventario al conteo físico y no se puede editar.</span>
      </div>
      <div className="locked-session-card" role="status">
        <div><span>Turno activo</span><strong>{session.shift.toUpperCase()}</strong></div>
        <div><span>Responsable</span><strong>{session.responsible}</strong></div>
        <div><span>Fecha</span><strong>{formatBusinessDate(session.businessDate)}</strong></div>
        <div><span>Efectivo inicial</span><strong>{formatClp(preview?.openingCashClp ?? session.openingCashClp ?? 0)}</strong></div>
        <p>Contexto bloqueado hasta cerrar y entregar el turno.</p>
      </div>

      {loadError ? (
        <div className="cash-preview-state cash-preview-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => setRefreshKey((current) => current + 1)}>Reintentar</button></div>
      ) : loading || !preview ? (
        <div className="cash-preview-state" role="status" aria-busy="true">Preparando conciliación e inventario…</div>
      ) : (
        <form className="formal-closure-form" onSubmit={closeShift} aria-busy={saving} noValidate>
          <section className="closure-step" aria-labelledby="financial-review-title">
            <div className="closure-step-heading">
              <div><span className="step-number" aria-hidden="true">1</span><div><h3 id="financial-review-title">Conciliación de medios de pago</h3><p>Compara cada total esperado con el reporte o conteo real. Solo se concilia dinero efectivamente recibido.</p></div></div>
              <button className="quiet-button" type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={saving || Boolean(closeAttempt)}>Actualizar</button>
            </div>
            <div className="cash-preview-total">
              <div><span>Ventas incluidas en el cierre · {preview.salesCount} {preview.salesCount === 1 ? "venta" : "ventas"}</span><strong>{formatClp(preview.totalSalesClp)}</strong></div>
              <div><span>Cobros del turno</span><strong>{formatClp(preview.collectedPaymentsClp)}</strong></div>
              <div><span>Total esperado al conciliar</span><strong>{formatClp(preview.expectedCollectedClp)}</strong></div>
            </div>
            <div className="cash-formula" role="note"><span>Fondo inicial {formatClp(preview.openingCashClp)}</span><b aria-hidden="true">+</b><span>Movimientos en efectivo {formatClp(preview.cashMovementsClp)}</span><b aria-hidden="true">=</b><strong>Efectivo esperado antes de gastos {formatClp(preview.expectedCashClp)}</strong></div>
            <div className="financial-reconciliation-grid">
              {[
                { key: "cash", label: "Efectivo", expectedLabel: "Efectivo esperado ajustado", countLabel: "Efectivo contado", expected: adjustedExpectedCashClp ?? preview.expectedCashClp, draft: countedCashClp, setDraft: handleCashChange, inputRef: cashInputRef, difference: cashDifference },
                { key: "card", label: "Tarjeta", expectedLabel: "Tarjeta esperada", countLabel: "Total de tarjeta verificado", expected: preview.expectedCardClp, draft: countedCardClp, setDraft: setCountedCardClp, inputRef: cardInputRef, difference: cardDifference },
                { key: "transfer", label: "Transferencia", expectedLabel: "Transferencia esperada", countLabel: "Total de transferencias verificado", expected: preview.expectedTransferClp, draft: countedTransferClp, setDraft: setCountedTransferClp, inputRef: transferInputRef, difference: transferDifference },
              ].map((method) => (
                <article className="financial-method-card" key={method.key}>
                  <div><span>{method.expectedLabel}</span><strong>{formatClp(method.expected)}</strong></div>
                  <label className="cash-field">
                    <span>{method.countLabel} <small>Obligatorio</small></span>
                    <input
                      ref={method.inputRef}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={method.draft}
                      onChange={(event) => { method.setDraft(event.target.value); setCloseAttempt(null); setFormError(""); }}
                      onBlur={() => markTouched(method.key)}
                      disabled={saving || Boolean(closeAttempt)}
                      placeholder="0"
                      aria-invalid={(submitted || touchedFields.has(method.key)) && validWholeNumber(method.draft) === null}
                      aria-describedby={(submitted || touchedFields.has(method.key)) && validWholeNumber(method.draft) === null ? `${method.key}-count-error` : undefined}
                      required
                    />
                    {(submitted || touchedFields.has(method.key)) && validWholeNumber(method.draft) === null ? (
                      <small className="field-error" id={`${method.key}-count-error`} role="alert">Ingresa un monto entero igual o mayor que cero.</small>
                    ) : null}
                  </label>
                  <output className={method.difference === 0 ? "method-difference method-difference-ok" : "method-difference"}><span>Diferencia</span><strong>{method.difference === null ? "Pendiente" : differenceText(method.difference)}</strong></output>
                </article>
              ))}
            </div>

            {hasCashShortfall ? (
              <section className="petty-cash-expenses" aria-labelledby="petty-cash-expenses-title">
                <div className="petty-cash-expenses-heading">
                  <div><h4 id="petty-cash-expenses-title">Gastos de caja chica</h4><p>Registra solo gastos reales. Lo que no quede explicado seguirá como diferencia de efectivo y requerirá un motivo.</p></div>
                  <button className="quiet-button" type="button" onClick={addExpense} disabled={saving || Boolean(closeAttempt) || expenses.length >= 25}>Agregar gasto</button>
                </div>
                <dl className="petty-cash-balance">
                  <div><dt>Faltante antes de gastos</dt><dd>{formatClp(cashShortfallBeforeExpenses)}</dd></div>
                  <div><dt>Gastos registrados</dt><dd>{formatClp(expensesClp)}</dd></div>
                  <div><dt>Efectivo esperado ajustado</dt><dd>{formatClp(adjustedExpectedCashClp ?? preview.expectedCashClp)}</dd></div>
                </dl>
                {expenses.length ? (
                  <div className="petty-cash-expense-list">
                    {expenseResults.map((expense, index) => {
                      const descriptionKey = `expense-description-${expense.id}`;
                      const amountKey = `expense-amount-${expense.id}`;
                      const showDescriptionError = (submitted || touchedFields.has(descriptionKey)) && !expense.descriptionValid;
                      const showAmountError = (submitted || touchedFields.has(amountKey)) && (expense.parsedAmount === null || expense.parsedAmount <= 0);
                      return (
                        <div className="petty-cash-expense-row" key={expense.id}>
                          <label className="cash-field">
                            <span>Descripción del gasto {index + 1}</span>
                            <input
                              ref={(node) => { expenseDescriptionRefs.current[expense.id] = node; }}
                              value={expense.description}
                              onChange={(event) => updateExpense(expense.id, { description: event.target.value })}
                              onBlur={() => markTouched(descriptionKey)}
                              maxLength={200}
                              aria-invalid={showDescriptionError}
                              aria-describedby={showDescriptionError ? `${descriptionKey}-error` : undefined}
                              disabled={saving || Boolean(closeAttempt)}
                              placeholder="Ej. Compra de bolsas"
                              required
                            />
                            {showDescriptionError ? <small className="field-error" id={`${descriptionKey}-error`} role="alert">Describe en qué se utilizó el dinero.</small> : null}
                          </label>
                          <label className="cash-field">
                            <span>Monto</span>
                            <input
                              ref={(node) => { expenseAmountRefs.current[expense.id] = node; }}
                              type="number"
                              inputMode="numeric"
                              min="1"
                              step="1"
                              value={expense.amountClp}
                              onChange={(event) => updateExpense(expense.id, { amountClp: event.target.value })}
                              onBlur={() => markTouched(amountKey)}
                              aria-invalid={showAmountError || expensesClp > cashShortfallBeforeExpenses}
                              aria-describedby={showAmountError ? `${amountKey}-error` : expensesClp > cashShortfallBeforeExpenses ? "petty-cash-total-error" : undefined}
                              disabled={saving || Boolean(closeAttempt)}
                              placeholder="0"
                              required
                            />
                            {showAmountError ? <small className="field-error" id={`${amountKey}-error`} role="alert">Ingresa un monto entero mayor que cero.</small> : null}
                          </label>
                          <button className="expense-remove-button" type="button" onClick={() => removeExpense(expense.id)} disabled={saving || Boolean(closeAttempt)} aria-label={`Eliminar gasto ${index + 1}: ${expense.description || "sin descripción"}`}>Eliminar</button>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="petty-cash-empty">No hay gastos reales registrados. Puedes continuar y explicar el faltante como diferencia.</p>}
                {expensesClp > cashShortfallBeforeExpenses ? (
                  <p className="field-error petty-cash-total-error" id="petty-cash-total-error" role="alert">El total de gastos supera el faltante por {formatClp(expensesClp - cashShortfallBeforeExpenses)}. Corrige los montos.</p>
                ) : null}
              </section>
            ) : null}
            {hasFinancialDifference ? (
              <label className="cash-field financial-reason-field">
                <span>Motivo de la diferencia residual <small>Obligatorio</small></span>
                <textarea
                  ref={financialReasonRef}
                  value={financialDifferenceReason}
                  onChange={(event) => { setFinancialDifferenceReason(event.target.value); setCloseAttempt(null); setFormError(""); }}
                  onBlur={() => markTouched("financial-reason")}
                  disabled={saving || Boolean(closeAttempt)}
                  maxLength={500}
                  rows={3}
                  placeholder="Explica la diferencia que permanece después de considerar los gastos reales."
                  aria-invalid={(submitted || touchedFields.has("financial-reason")) && !financialDifferenceReason.trim()}
                  aria-describedby={(submitted || touchedFields.has("financial-reason")) && !financialDifferenceReason.trim() ? "financial-reason-error" : undefined}
                  required
                />
                {(submitted || touchedFields.has("financial-reason")) && !financialDifferenceReason.trim() ? <small className="field-error" id="financial-reason-error" role="alert">Explica la diferencia residual antes de cerrar.</small> : null}
              </label>
            ) : null}
          </section>

          <section className="closure-step" aria-labelledby="pending-review-title">
            <div className="closure-step-heading"><div><span className="step-number" aria-hidden="true">2</span><div><h3 id="pending-review-title">Pendientes de clientes</h3><p>Solo como seguimiento: estas cuentas no forman parte del dinero que debes entregar.</p></div></div></div>
            <div className="pending-review-grid">
              <article className="pending-review-card">
                <div className="pending-review-summary"><div><span>Clientes</span><strong>{preview.pendingCustomerCount}</strong></div><strong>{formatClp(preview.pendingCustomerClp)}</strong></div>
                {preview.pendingCustomers.length ? <ul>{preview.pendingCustomers.map((debt) => <li key={debt.id}><span>{debt.debtNote}</span><strong>Saldo {formatClp(debt.totalClp)}</strong></li>)}</ul> : <p>Sin deudas de clientes.</p>}
                {preview.pendingCustomerCount > preview.pendingCustomers.length ? <small>Hay más deudas disponibles en Pendientes por cobrar.</small> : null}
              </article>
            </div>
          </section>

          <section className="closure-step" aria-labelledby="inventory-review-title">
            <div className="closure-step-heading"><div><span className="step-number" aria-hidden="true">3</span><div><h3 id="inventory-review-title">Conteo físico de inventario</h3><p>Se cuenta vitrina, stock simple e insumos; bodega queda fuera de esta entrega.</p></div></div><span>{inventory.length} {inventory.length === 1 ? "ubicación" : "ubicaciones"}</span></div>
            <div className="inventory-count-list">
              {inventoryResults.length ? inventoryResults.map(({ line, difference }) => (
                <article className="inventory-count-row" key={line.key}>
                  <div className="inventory-count-name"><strong>{line.name}</strong><span>{locationLabel(line.location)} · {line.unit}</span></div>
                  <div className="inventory-expected"><span>Esperado</span><strong>{line.expectedQuantity}</strong></div>
                  <label className="cash-field inventory-count-input">
                    <span>Conteo físico <small>Obligatorio</small></span>
                    <input
                      ref={(node) => { inventoryCountRefs.current[line.key] = node; }}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={inventoryDrafts[line.key] ?? ""}
                      onChange={(event) => {
                        const nextDraft = event.target.value;
                        setInventoryDrafts((current) => ({ ...current, [line.key]: nextDraft }));
                        if (validWholeNumber(nextDraft) === line.expectedQuantity) {
                          setInventoryReasonCategories((current) => {
                            const next = { ...current };
                            delete next[line.key];
                            return next;
                          });
                          setInventoryComments((current) => {
                            const next = { ...current };
                            delete next[line.key];
                            return next;
                          });
                        }
                        setCloseAttempt(null);
                        setFormError("");
                      }}
                      onBlur={() => markTouched(`inventory-count-${line.key}`)}
                      disabled={saving || Boolean(closeAttempt)}
                      aria-invalid={(submitted || touchedFields.has(`inventory-count-${line.key}`)) && validWholeNumber(inventoryDrafts[line.key] ?? "") === null}
                      aria-describedby={(submitted || touchedFields.has(`inventory-count-${line.key}`)) && validWholeNumber(inventoryDrafts[line.key] ?? "") === null ? `inventory-difference-${line.key} inventory-count-error-${line.key}` : `inventory-difference-${line.key}`}
                      required
                    />
                    {(submitted || touchedFields.has(`inventory-count-${line.key}`)) && validWholeNumber(inventoryDrafts[line.key] ?? "") === null ? <small className="field-error" id={`inventory-count-error-${line.key}`} role="alert">Ingresa una cantidad entera igual o mayor que cero.</small> : null}
                  </label>
                  <output id={`inventory-difference-${line.key}`} className={difference === 0 ? "inventory-difference inventory-difference-ok" : "inventory-difference"}><span>Diferencia</span><strong>{difference === null ? "Pendiente" : difference === 0 ? "Cuadra" : signedQuantity(difference)}</strong></output>
                  {difference !== null && difference !== 0 ? (
                    <div className="inventory-incident-fields">
                      <label className="cash-field inventory-reason-field">
                        <span>Motivo categorizado <small>Obligatorio</small></span>
                        <select
                          ref={(node) => { inventoryCategoryRefs.current[line.key] = node; }}
                          value={inventoryReasonCategories[line.key] ?? ""}
                          onChange={(event) => {
                            setInventoryReasonCategories((current) => ({
                              ...current,
                              [line.key]: event.target.value as InventoryDifferenceReason | "",
                            }));
                            setCloseAttempt(null);
                            setFormError("");
                          }}
                          onBlur={() => markTouched(`inventory-category-${line.key}`)}
                          disabled={saving || Boolean(closeAttempt)}
                          aria-invalid={(submitted || touchedFields.has(`inventory-category-${line.key}`)) && !inventoryReasonCategories[line.key]}
                          aria-describedby={(submitted || touchedFields.has(`inventory-category-${line.key}`)) && !inventoryReasonCategories[line.key] ? `inventory-category-error-${line.key}` : undefined}
                          required
                        >
                          <option value="">Selecciona un motivo</option>
                          {INVENTORY_DIFFERENCE_REASONS.map((reason) => (
                            <option value={reason} key={reason}>
                              {INVENTORY_DIFFERENCE_REASON_LABELS[reason]}
                            </option>
                          ))}
                        </select>
                        {(submitted || touchedFields.has(`inventory-category-${line.key}`)) && !inventoryReasonCategories[line.key] ? <small className="field-error" id={`inventory-category-error-${line.key}`} role="alert">Selecciona el motivo de la diferencia.</small> : null}
                      </label>
                      <label className="cash-field inventory-comment-field">
                        <span>Comentario del caso <small>Obligatorio</small></span>
                        <textarea
                          ref={(node) => { inventoryCommentRefs.current[line.key] = node; }}
                          value={inventoryComments[line.key] ?? ""}
                          onChange={(event) => {
                            setInventoryComments((current) => ({
                              ...current,
                              [line.key]: event.target.value,
                            }));
                            setCloseAttempt(null);
                            setFormError("");
                          }}
                          onBlur={() => markTouched(`inventory-comment-${line.key}`)}
                          disabled={saving || Boolean(closeAttempt)}
                          maxLength={1000}
                          rows={3}
                          placeholder="Describe qué ocurrió y qué información debe revisar Administración."
                          aria-invalid={(submitted || touchedFields.has(`inventory-comment-${line.key}`)) && !inventoryComments[line.key]?.trim()}
                          aria-describedby={(submitted || touchedFields.has(`inventory-comment-${line.key}`)) && !inventoryComments[line.key]?.trim() ? `inventory-comment-error-${line.key}` : undefined}
                          required
                        />
                        {(submitted || touchedFields.has(`inventory-comment-${line.key}`)) && !inventoryComments[line.key]?.trim() ? <small className="field-error" id={`inventory-comment-error-${line.key}`} role="alert">Añade un comentario para conservar el contexto.</small> : null}
                      </label>
                    </div>
                  ) : null}
                </article>
              )) : (
                <div className="inventory-count-empty" role="status">
                  No hay productos ni insumos con stock físico para contar en este turno.
                </div>
              )}
            </div>
          </section>

          <section className="closure-step delivery-summary-step" aria-labelledby="delivery-summary-title">
            <div className="closure-step-heading"><div><span className="step-number" aria-hidden="true">4</span><div><h3 id="delivery-summary-title">Resumen de entrega</h3><p>Revisa la fotografía final. Al cerrar, este resumen quedará como recibo no modificable.</p></div></div></div>
            <div className="delivery-summary-readonly">
              <dl className="delivery-summary-grid">
                <div><dt>Turno y responsable</dt><dd>{session.shift.toUpperCase()} · {session.responsible}</dd></div>
                <div><dt>Ventas incluidas en el cierre</dt><dd>{formatClp(preview.totalSalesClp)} · {preview.salesCount} {preview.salesCount === 1 ? "venta" : "ventas"}</dd></div>
                <div><dt>Efectivo esperado antes de gastos</dt><dd>{formatClp(preview.expectedCashClp)}</dd></div>
                <div><dt>Gastos de caja chica</dt><dd>{formatClp(hasCashShortfall ? expensesClp : 0)}</dd></div>
                <div><dt>Efectivo esperado ajustado</dt><dd>{formatClp(adjustedExpectedCashClp ?? preview.expectedCashClp)}</dd></div>
                <div><dt>Efectivo contado / diferencia</dt><dd>{cashCount === null ? "Pendiente" : `${formatClp(cashCount)} · ${differenceText(cashDifference ?? 0)}`}</dd></div>
                <div><dt>Tarjeta verificada / diferencia</dt><dd>{cardCount === null ? "Pendiente" : `${formatClp(cardCount)} · ${differenceText(cardDifference ?? 0)}`}</dd></div>
                <div><dt>Transferencia verificada / diferencia</dt><dd>{transferCount === null ? "Pendiente" : `${formatClp(transferCount)} · ${differenceText(transferDifference ?? 0)}`}</dd></div>
                <div><dt>Pendientes de clientes</dt><dd>{preview.pendingCustomerCount} · {formatClp(preview.pendingCustomerClp)} · fuera de caja</dd></div>
                <div><dt>Inventario contabilizado</dt><dd>{inventory.length} líneas · sin bodega</dd></div>
                <div><dt>Diferencias de stock</dt><dd>{inventoryResults.filter(({ difference }) => difference !== null && difference !== 0).length}</dd></div>
              </dl>
              {hasCashShortfall && expenseResults.length ? (
                <div className="delivery-summary-block"><h4>Gastos registrados</h4><ul>{expenseResults.map((expense) => <li key={expense.id}><span>{expense.description || "Descripción pendiente"}</span><strong>{expense.parsedAmount && expense.parsedAmount > 0 ? formatClp(expense.parsedAmount) : "Monto pendiente"}</strong></li>)}</ul></div>
              ) : null}
              {hasFinancialDifference ? (
                <div className="delivery-summary-block"><h4>Motivo de diferencias de caja</h4><p>{financialDifferenceReason.trim() || "Motivo pendiente"}</p></div>
              ) : null}
              {inventoryResults.some(({ difference }) => difference !== null && difference !== 0) ? (
                <div className="delivery-summary-block"><h4>Diferencias de inventario</h4><ul>{inventoryResults.filter(({ difference }) => difference !== null && difference !== 0).map(({ line, difference, reasonCategory, comment }) => <li key={line.key}><span>{line.name} · {locationLabel(line.location)} · {signedQuantity(difference ?? 0)}</span><strong>{reasonCategory ? INVENTORY_DIFFERENCE_REASON_LABELS[reasonCategory] : "Motivo pendiente"} · {comment || "Comentario pendiente"}</strong></li>)}</ul></div>
              ) : null}
            </div>
            <label className="cash-field closure-notes-field"><span>Comentarios de entrega <small>Opcional</small></span><textarea value={handoffComments} onChange={(event) => { setHandoffComments(event.target.value); setCloseAttempt(null); setFormError(""); }} disabled={saving || Boolean(closeAttempt)} maxLength={1000} rows={4} placeholder="Añade información útil para quien recibe o revisa el turno." /><small>Este comentario también quedará guardado en el recibo inmutable.</small></label>
          </section>

          {preview.unassignedSalesCount || preview.unassignedPaymentsCount ? <div className="cash-warning" role="status"><strong>Hay movimientos históricos sin turno.</strong><span>{preview.unassignedSalesCount} ventas ({formatClp(preview.unassignedSalesClp)}) y {preview.unassignedPaymentsCount} pagos ({formatClp(preview.unassignedPaymentsClp)}) quedan fuera de esta entrega.</span></div> : null}
          {formError ? <p className="cash-form-error" role="alert">{formError}</p> : null}
          <div id="closure-readiness" className={`closure-readiness ${readyToClose ? "closure-readiness-ready" : ""}`} role="status"><strong>{readyToClose ? "Listo para entregar" : "Cierre incompleto"}</strong><span>{readinessText}</span></div>
          <button className="save-closure-button" type="submit" disabled={saving} aria-describedby="closure-readiness closure-final-help">{saving ? "Cerrando y entregando…" : closeAttempt ? "Reintentar cierre y entrega" : "Confirmar cierre y entregar turno"}</button>
          <small id="closure-final-help" className="closure-final-help">Acción irreversible: crea un recibo inmutable y ajusta solo vitrina, stock simple e insumos al conteo físico. Bodega no se modifica.</small>
        </form>
      )}
      {history}
    </section>
  );
}
