"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type PaidPaymentMethod = "efectivo" | "tarjeta" | "transferencia";

type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  priceClp: number;
  active: boolean;
};

export type ClosureEffectiveInventory = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  unit: string;
  location: "simple" | "vitrina" | "ingredient";
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  currentQuantity: number | null;
  currentVersionToken: string | null;
  adjustable: boolean;
};

export type ClosureEffective = {
  revisionNumber: number;
  includedSalesClp: number;
  includedSalesCount: number;
  openingCashClp: number;
  cashCollectedClp: number;
  cardCollectedClp: number;
  transferCollectedClp: number;
  totalCollectedClp: number;
  expectedCashClp: number;
  expectedCollectedClp: number;
  expensesClp: number;
  adjustedExpectedCashClp: number;
  countedCashClp: number;
  countedCardClp: number;
  countedTransferClp: number;
  countedCollectedClp: number;
  differenceCashClp: number;
  differenceCardClp: number;
  differenceTransferClp: number;
  differenceCollectedClp: number;
  inventoryDifferenceCount: number;
  inventory: ClosureEffectiveInventory[];
};

type RevisionSale = {
  id: string;
  createdAt: string;
  paymentMethod: PaidPaymentMethod;
  totalClp: number;
  items: Array<{
    productId: string;
    productName: string;
    unitPriceClp: number;
    quantity: number;
    lineTotalClp: number;
  }>;
};

type InventoryChange = {
  key: string;
  previousExpectedQuantity: number;
  expectedQuantity: number;
  saleConsumptionQuantity: number;
  previousCountedQuantity: number;
  countedQuantity: number;
  countedDeltaQuantity: number;
  liveQuantityBefore: number | null;
  liveVersionTokenBefore: string | null;
  liveQuantityAfter: number | null;
  liveVersionTokenAfter: string | null;
};

type ClosureRevision = {
  id: string;
  revisionNumber: number;
  createdAt: string;
  reason: string;
  addedSales: RevisionSale[];
  inventoryChanges: InventoryChange[];
  effective: Omit<ClosureEffective, "inventory">;
};

type RevisionsResponse = {
  closureId: string;
  correctable: boolean;
  latestRevisionNumber: number;
  effective: ClosureEffective;
  revisions: ClosureRevision[];
};

type DraftSaleItem = {
  key: string;
  productId: string;
  unitPriceClp: string;
  quantity: string;
};

type DraftSale = {
  id: string;
  paymentMethod: PaidPaymentMethod | "";
  items: DraftSaleItem[];
};

type CorrectionPayload = {
  id: string;
  expectedRevisionNumber: number;
  reason: string;
  countedCashClp: number;
  countedCardClp: number;
  countedTransferClp: number;
  addedSales: Array<{
    id: string;
    paymentMethod: PaidPaymentMethod;
    items: Array<{ productId: string; unitPriceClp: number; quantity: number }>;
  }>;
  inventory: Array<{
    key: string;
    expectedCountedQuantity: number;
    countedQuantity: number;
    liveVersionToken: string;
    liveQuantity: number;
  }>;
};

type ClosureCorrectionPanelProps = {
  closureId: string;
  readOnly?: boolean;
  refreshSignal: number;
  onStateChange: (
    state: { ready: boolean; latestRevisionNumber?: number; effective?: ClosureEffective },
  ) => void;
  onEditingChange: (editing: boolean) => void;
  onCorrected: (message: string) => void;
};

const PAYMENT_METHODS: Array<{ value: PaidPaymentMethod; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function validWholeNumber(value: string, minimum = 0) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum ? parsed : null;
}

function locationLabel(value: ClosureEffectiveInventory["location"]) {
  if (value === "vitrina") return "Vitrina";
  if (value === "ingredient") return "Insumo";
  return "Stock";
}

function differenceText(value: number) {
  if (value === 0) return "Cuadra";
  return value > 0 ? `Sobran ${formatClp(value)}` : `Faltan ${formatClp(Math.abs(value))}`;
}

class HttpResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "HttpResponseError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: T & { error?: string; code?: string };
  try {
    payload = (await response.json()) as T & { error?: string; code?: string };
  } catch (error) {
    if (!response.ok) {
      throw new HttpResponseError(`La solicitud fue rechazada (${response.status}).`, response.status);
    }
    throw error;
  }
  if (!response.ok) {
    throw new HttpResponseError(
      payload.error || "No se pudo completar la operación.",
      response.status,
      payload.code ?? null,
    );
  }
  return payload;
}

function newDraftSaleItem(): DraftSaleItem {
  return { key: crypto.randomUUID(), productId: "", unitPriceClp: "", quantity: "1" };
}

function newDraftSale(): DraftSale {
  return {
    id: crypto.randomUUID(),
    paymentMethod: "",
    items: [newDraftSaleItem()],
  };
}

export function ClosureCorrectionPanel({
  closureId,
  readOnly = false,
  refreshSignal,
  onStateChange,
  onEditingChange,
  onCorrected,
}: ClosureCorrectionPanelProps) {
  const [revisionState, setRevisionState] = useState<RevisionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [activeSession, setActiveSession] = useState<{ id: string; shift: "am" | "pm"; responsible: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [reason, setReason] = useState("");
  const [countedCashClp, setCountedCashClp] = useState("");
  const [countedCardClp, setCountedCardClp] = useState("");
  const [countedTransferClp, setCountedTransferClp] = useState("");
  const [addedSales, setAddedSales] = useState<DraftSale[]>([]);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState<CorrectionPayload | null>(null);
  const [inventoryLocked, setInventoryLocked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const onStateChangeRef = useRef(onStateChange);
  const onEditingChangeRef = useRef(onEditingChange);
  const onCorrectedRef = useRef(onCorrected);

  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onEditingChangeRef.current = onEditingChange; }, [onEditingChange]);
  useEffect(() => { onCorrectedRef.current = onCorrected; }, [onCorrected]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError("");
      onStateChangeRef.current({ ready: false });
      try {
        const response = await fetch(`/api/cash-closures/${encodeURIComponent(closureId)}/revisions`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJson<RevisionsResponse>(response);
        if (controller.signal.aborted) return;
        setRevisionState(payload);
        onStateChangeRef.current({
          ready: true,
          latestRevisionNumber: payload.latestRevisionNumber,
          effective: payload.effective,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setRevisionState(null);
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar el estado de revisión.");
        onStateChangeRef.current({ ready: false });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [closureId, refreshSignal, reloadKey]);

  useEffect(() => () => onEditingChangeRef.current(false), []);

  const effective = revisionState?.effective ?? null;
  const cashCount = validWholeNumber(countedCashClp);
  const cardCount = validWholeNumber(countedCardClp);
  const transferCount = validWholeNumber(countedTransferClp);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const parsedSales = useMemo(
    () => addedSales.map((sale) => {
      const productIds = sale.items.map((item) => item.productId).filter(Boolean);
      const uniqueProducts = new Set(productIds).size === productIds.length;
      const items = sale.items.map((item) => {
        const product = productsById.get(item.productId);
        const quantity = validWholeNumber(item.quantity, 1);
        const unitPriceClp = validWholeNumber(item.unitPriceClp, 1);
        return {
          ...item,
          product,
          parsedQuantity: quantity,
          parsedUnitPriceClp: unitPriceClp,
          valid: Boolean(product && unitPriceClp !== null && quantity !== null && quantity <= 99),
          lineTotalClp: product && unitPriceClp !== null && quantity !== null ? unitPriceClp * quantity : 0,
        };
      });
      return {
        ...sale,
        items,
        valid: Boolean(sale.paymentMethod && items.length && items.length <= 10 && uniqueProducts && items.every((item) => item.valid)),
        totalClp: items.reduce((total, item) => total + item.lineTotalClp, 0),
      };
    }),
    [addedSales, productsById],
  );
  const addedByMethod = parsedSales.reduce(
    (totals, sale) => {
      if (sale.paymentMethod) totals[sale.paymentMethod] += sale.totalClp;
      return totals;
    },
    { efectivo: 0, tarjeta: 0, transferencia: 0 } satisfies Record<PaidPaymentMethod, number>,
  );
  const addedSalesClp = parsedSales.reduce((total, sale) => total + sale.totalClp, 0);
  const inventoryResults = effective?.inventory.map((line) => {
    const currentQuantity = line.currentQuantity;
    const adjustable = line.adjustable && currentQuantity !== null && line.currentVersionToken !== null;
    const countedQuantity = adjustable
      ? validWholeNumber(inventoryDrafts[line.key] ?? "")
      : line.countedQuantity;
    const countedDeltaQuantity = adjustable && countedQuantity !== null
      ? countedQuantity - line.countedQuantity
      : null;
    const liveFinalQuantity = adjustable && currentQuantity !== null && countedDeltaQuantity !== null
      ? currentQuantity + countedDeltaQuantity
      : null;
    return {
      line,
      adjustable,
      countedQuantity,
      countedDeltaQuantity,
      liveFinalQuantity,
      changed: adjustable && countedQuantity !== null && countedQuantity !== line.countedQuantity,
      valid: !adjustable || (countedQuantity !== null && liveFinalQuantity !== null && liveFinalQuantity >= 0),
    };
  }) ?? [];
  const changedInventory = inventoryResults.filter(
    (result): result is typeof result & { countedQuantity: number; countedDeltaQuantity: number; liveFinalQuantity: number } =>
      result.adjustable &&
      result.changed &&
      result.countedQuantity !== null &&
      result.countedDeltaQuantity !== null &&
      result.liveFinalQuantity !== null,
  );
  const financialChanged = Boolean(effective && (
    cashCount !== effective.countedCashClp ||
    cardCount !== effective.countedCardClp ||
    transferCount !== effective.countedTransferClp
  ));
  const hasMaterialChange = addedSales.length > 0 || changedInventory.length > 0 || financialChanged;
  const salesValid = parsedSales.every((sale) => sale.valid);
  const inventoryValid = Boolean(effective && inventoryResults.every((result) => result.valid));
  const totalAddedItemLines = addedSales.reduce((total, sale) => total + sale.items.length, 0);
  const formValid = Boolean(
    reason.trim() &&
    cashCount !== null &&
    cardCount !== null &&
    transferCount !== null &&
    salesValid &&
    inventoryValid &&
    hasMaterialChange,
  );
  const expectedCashPreview = effective
    ? effective.expectedCashClp + addedByMethod.efectivo
    : 0;
  const adjustedExpectedCashPreview = effective
    ? effective.adjustedExpectedCashClp + addedByMethod.efectivo
    : 0;
  const expectedCardPreview = effective
    ? effective.cardCollectedClp + addedByMethod.tarjeta
    : 0;
  const expectedTransferPreview = effective
    ? effective.transferCollectedClp + addedByMethod.transferencia
    : 0;
  const previewDifferences = {
    cash: cashCount === null ? null : cashCount - adjustedExpectedCashPreview,
    card: cardCount === null ? null : cardCount - expectedCardPreview,
    transfer: transferCount === null ? null : transferCount - expectedTransferPreview,
  };

  function resetDraft(nextEffective: ClosureEffective) {
    setReason("");
    setCountedCashClp(String(nextEffective.countedCashClp));
    setCountedCardClp(String(nextEffective.countedCardClp));
    setCountedTransferClp(String(nextEffective.countedTransferClp));
    setAddedSales([]);
    setInventoryDrafts(Object.fromEntries(
      nextEffective.inventory.map((line) => [line.key, String(line.countedQuantity)]),
    ));
    setSubmitted(false);
    setFormError("");
    setAttempt(null);
    setInventoryLocked(false);
  }

  async function beginCorrection() {
    if (!revisionState?.correctable || readOnly || preparing) return;
    setPreparing(true);
    setFormError("");
    try {
      const [productsResponse, contextResponse] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/pos", { cache: "no-store" }),
      ]);
      const [catalog, context] = await Promise.all([
        readJson<{ products: CatalogProduct[] }>(productsResponse),
        readJson<{
          role: "admin" | "sales";
          activeSession: { id: string; shift: "am" | "pm"; responsible: string } | null;
        }>(contextResponse),
      ]);
      if (context.role !== "admin") throw new HttpResponseError("Solo Administración puede crear revisiones.", 403);
      setProducts(catalog.products);
      setActiveSession(context.activeSession);
      resetDraft(revisionState.effective);
      setEditing(true);
      onEditingChangeRef.current(true);
      window.requestAnimationFrame(() => reasonRef.current?.focus());
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo preparar la corrección.");
    } finally {
      setPreparing(false);
    }
  }

  function cancelCorrection() {
    if (saving || attempt || !effective) return;
    resetDraft(effective);
    setEditing(false);
    onEditingChangeRef.current(false);
  }

  function addSale() {
    if (addedSales.length >= 5 || totalAddedItemLines >= 50 || saving || attempt) return;
    setAddedSales((current) => [...current, newDraftSale()]);
    setFormError("");
  }

  function updateSale(saleId: string, patch: Partial<DraftSale>) {
    setAddedSales((current) => current.map((sale) => sale.id === saleId ? { ...sale, ...patch } : sale));
    setAttempt(null);
    setFormError("");
  }

  function updateSaleItem(saleId: string, itemKey: string, patch: Partial<DraftSaleItem>) {
    setAddedSales((current) => current.map((sale) => sale.id === saleId
      ? { ...sale, items: sale.items.map((item) => item.key === itemKey ? { ...item, ...patch } : item) }
      : sale));
    setAttempt(null);
    setFormError("");
  }

  function removeSale(saleId: string) {
    setAddedSales((current) => current.filter((sale) => sale.id !== saleId));
    setAttempt(null);
    setFormError("");
  }

  function addSaleItem(saleId: string) {
    if (totalAddedItemLines >= 50) return;
    setAddedSales((current) => current.map((sale) => sale.id === saleId && sale.items.length < 10
      ? { ...sale, items: [...sale.items, newDraftSaleItem()] }
      : sale));
    setAttempt(null);
    setFormError("");
  }

  function removeSaleItem(saleId: string, itemKey: string) {
    setAddedSales((current) => current.map((sale) => sale.id === saleId
      ? { ...sale, items: sale.items.filter((item) => item.key !== itemKey) }
      : sale));
    setAttempt(null);
    setFormError("");
  }

  function removeInventoryChanges() {
    if (!effective || saving) return;
    setInventoryDrafts(Object.fromEntries(
      effective.inventory.map((line) => [line.key, String(line.countedQuantity)]),
    ));
    setAttempt(null);
    setInventoryLocked(false);
    setFormError("");
  }

  async function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!revisionState || !effective || !formValid || cashCount === null || cardCount === null || transferCount === null) {
      setFormError(
        !hasMaterialChange
          ? "Modifica al menos un monto, una línea de inventario o añade una venta omitida."
          : "Completa la razón y corrige los campos marcados antes de crear la revisión.",
      );
      window.setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      }, 0);
      return;
    }
    if (!attempt && !window.confirm(
      `¿Crear la revisión ${revisionState.latestRevisionNumber + 1}? El acta original se conservará y esta nueva revisión no podrá editarse.`,
    )) return;

    const payload: CorrectionPayload = attempt ?? {
      id: crypto.randomUUID(),
      expectedRevisionNumber: revisionState.latestRevisionNumber,
      reason: reason.trim(),
      countedCashClp: cashCount,
      countedCardClp: cardCount,
      countedTransferClp: transferCount,
      addedSales: parsedSales.map((sale) => ({
        id: sale.id,
        paymentMethod: sale.paymentMethod as PaidPaymentMethod,
        items: sale.items.map((item) => ({
          productId: item.productId,
          unitPriceClp: item.parsedUnitPriceClp as number,
          quantity: item.parsedQuantity as number,
        })),
      })),
      inventory: changedInventory.flatMap(({ line, countedQuantity }) =>
        line.adjustable && line.currentVersionToken !== null && line.currentQuantity !== null
          ? [{
              key: line.key,
              expectedCountedQuantity: line.countedQuantity,
              countedQuantity,
              liveVersionToken: line.currentVersionToken,
              liveQuantity: line.currentQuantity,
            }]
          : [],
      ),
    };
    setAttempt(payload);
    setSaving(true);
    setFormError("");

    try {
      const response = await fetch(`/api/cash-closures/${encodeURIComponent(closureId)}/revisions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await readJson<{
        revision: ClosureRevision;
        effective: ClosureEffective;
        idempotent: boolean;
      }>(response);
      const nextState: RevisionsResponse = {
        ...revisionState,
        latestRevisionNumber: result.revision.revisionNumber,
        effective: result.effective,
        revisions: [
          result.revision,
          ...revisionState.revisions.filter((revision) => revision.id !== result.revision.id),
        ].sort((left, right) => right.revisionNumber - left.revisionNumber),
      };
      setRevisionState(nextState);
      setAttempt(null);
      resetDraft(result.effective);
      setEditing(false);
      onEditingChangeRef.current(false);
      onStateChangeRef.current({
        ready: true,
        latestRevisionNumber: nextState.latestRevisionNumber,
        effective: result.effective,
      });
      onCorrectedRef.current(`Revisión ${result.revision.revisionNumber} creada. La entrega original se conservó intacta.`);
    } catch (error) {
      const inventoryBlocked = error instanceof HttpResponseError &&
        error.code === "inventory_locked_by_later_closure";
      const inventoryUnavailable = error instanceof HttpResponseError &&
        error.code === "inventory_location_unavailable";
      if (error instanceof HttpResponseError && error.status >= 400 && error.status < 500) {
        setAttempt(null);
        if (inventoryBlocked) {
          setInventoryLocked(true);
        } else if (inventoryUnavailable) {
          setReloadKey((current) => current + 1);
        } else if (error.status === 409) {
          setEditing(false);
          onEditingChangeRef.current(false);
          setReloadKey((current) => current + 1);
        }
      }
      setFormError(
        inventoryBlocked
          ? "Existe un cierre físico posterior. Retira solo los cambios de inventario; las ventas, los montos y la razón se conservarán."
          : inventoryUnavailable
            ? "Una ubicación ya no existe en el inventario vigente. Actualizamos el listado y omitiremos su ajuste físico; puedes continuar con las ventas y los montos."
          : error instanceof HttpResponseError && error.status === 409
          ? `${error.message} Actualizamos el estado; prepara nuevamente la corrección.`
          : error instanceof Error
            ? error.message
            : "No se pudo crear la revisión. Reintenta con los mismos datos.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="closure-correction-state" role="status" aria-busy="true">Preparando estado de revisión…</div>;
  }

  if (loadError || !revisionState) {
    return (
      <div className="closure-correction-state closure-correction-state-error" role="alert">
        <span>{loadError || "No se pudo cargar el estado de revisión."}</span>
        <button className="quiet-button" type="button" onClick={() => setReloadKey((current) => current + 1)}>Reintentar</button>
      </div>
    );
  }

  return (
    <section className="closure-correction-panel" aria-label="Correcciones de la entrega">
      <div className="closure-correction-heading">
        <div>
          <strong>
            {revisionState.latestRevisionNumber
              ? `Estado vigente · revisión ${revisionState.latestRevisionNumber}`
              : "Estado vigente · entrega original"}
          </strong>
          <span>Las correcciones crean una revisión; nunca reemplazan el acta original.</span>
        </div>
        {!readOnly && revisionState.correctable && !editing ? (
          <button className="correction-start-button" type="button" onClick={() => void beginCorrection()} disabled={preparing}>
            {preparing ? "Preparando…" : "Corregir antes de validar"}
          </button>
        ) : null}
      </div>

      {revisionState.latestRevisionNumber > 0 ? (
        <dl className="closure-effective-summary">
          <div><dt>Ventas incluidas</dt><dd>{formatClp(effective?.includedSalesClp ?? 0)}</dd></div>
          <div><dt>Efectivo contado</dt><dd>{formatClp(effective?.countedCashClp ?? 0)}</dd></div>
          <div><dt>Diferencia de dinero</dt><dd>{differenceText(effective?.differenceCollectedClp ?? 0)}</dd></div>
          <div><dt>Diferencias de stock</dt><dd>{effective?.inventoryDifferenceCount ?? 0}</dd></div>
        </dl>
      ) : null}

      {formError && !editing ? <p className="cash-form-error" role="alert">{formError}</p> : null}

      {editing && effective ? (
        <form ref={formRef} className="closure-correction-form" onSubmit={saveCorrection} aria-busy={saving} noValidate>
          <div className="correction-form-intro">
            <div>
              <strong>Preparar revisión {revisionState.latestRevisionNumber + 1}</strong>
              <span>Verifica los cambios abajo antes de guardarlos.</span>
            </div>
            <button className="quiet-button" type="button" onClick={cancelCorrection} disabled={saving || Boolean(attempt)}>Cancelar borrador</button>
          </div>

          <label className="cash-field correction-reason-field">
            <span>Razón de la corrección <small>Obligatorio</small></span>
            <textarea
              ref={reasonRef}
              value={attempt?.reason ?? reason}
              onChange={(event) => { setReason(event.target.value); setAttempt(null); setFormError(""); }}
              maxLength={1000}
              rows={3}
              disabled={saving || Boolean(attempt)}
              placeholder="Ej. Faltó registrar una venta con tarjeta y se corrigió el conteo de agua."
              aria-invalid={submitted && !reason.trim()}
              aria-describedby={submitted && !reason.trim() ? `correction-reason-error-${closureId}` : undefined}
              required
            />
            {submitted && !reason.trim() ? <small className="field-error" id={`correction-reason-error-${closureId}`} role="alert">Explica por qué se necesita esta revisión.</small> : null}
          </label>

          <section className="correction-form-section" aria-labelledby={`correction-sales-${closureId}`}>
            <div className="correction-section-heading">
              <div><h5 id={`correction-sales-${closureId}`}>Ventas omitidas</h5><p>Incluye productos activos o históricos y registra el precio realmente cobrado. La razón global respalda el cambio · máximo 5 ventas, 10 productos por venta y 50 líneas ({totalAddedItemLines}/50).</p></div>
              <button className="quiet-button" type="button" onClick={addSale} disabled={saving || Boolean(attempt) || addedSales.length >= 5 || totalAddedItemLines >= 50 || !products.length}>Añadir venta</button>
            </div>
            {parsedSales.length ? (
              <div className="correction-sales-list">
                {parsedSales.map((sale, saleIndex) => (
                  <article className="correction-sale-card" key={sale.id}>
                    <header>
                      <strong>Venta omitida {saleIndex + 1}</strong>
                      <button type="button" onClick={() => removeSale(sale.id)} disabled={saving || Boolean(attempt)}>Eliminar venta</button>
                    </header>
                    <label className="cash-field">
                      <span>Medio de pago <small>Obligatorio</small></span>
                      <select
                        value={sale.paymentMethod}
                        onChange={(event) => updateSale(sale.id, { paymentMethod: event.target.value as PaidPaymentMethod | "" })}
                        disabled={saving || Boolean(attempt)}
                        aria-invalid={submitted && !sale.paymentMethod}
                        required
                      >
                        <option value="">Seleccionar</option>
                        {PAYMENT_METHODS.map((method) => <option value={method.value} key={method.value}>{method.label}</option>)}
                      </select>
                    </label>
                    <div className="correction-sale-items">
                      {sale.items.map((item, itemIndex) => {
                        const duplicated = Boolean(item.productId && sale.items.some(
                          (candidate) => candidate.key !== item.key && candidate.productId === item.productId,
                        ));
                        return (
                          <div className="correction-sale-item" key={item.key}>
                            <label className="cash-field">
                              <span>Producto {itemIndex + 1}</span>
                              <select
                                value={item.productId}
                                onChange={(event) => {
                                  const product = productsById.get(event.target.value);
                                  updateSaleItem(sale.id, item.key, {
                                    productId: event.target.value,
                                    unitPriceClp: product ? String(product.priceClp) : "",
                                  });
                                }}
                                disabled={saving || Boolean(attempt)}
                                aria-invalid={submitted && (!item.product || duplicated)}
                                required
                              >
                                <option value="">Seleccionar</option>
                                {products.map((product) => (
                                  <option value={product.id} key={product.id}>
                                    {product.name} · {formatClp(product.priceClp)}{product.active ? "" : " · Inactivo"}
                                  </option>
                                ))}
                              </select>
                              {submitted && duplicated ? <small className="field-error" role="alert">El producto ya está en esta venta.</small> : null}
                            </label>
                            <label className="cash-field correction-price-field">
                              <span>Precio cobrado</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                step="1"
                                value={item.unitPriceClp}
                                onChange={(event) => updateSaleItem(sale.id, item.key, { unitPriceClp: event.target.value })}
                                disabled={saving || Boolean(attempt)}
                                aria-invalid={submitted && item.parsedUnitPriceClp === null}
                                required
                              />
                            </label>
                            <label className="cash-field correction-quantity-field">
                              <span>Cantidad</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="99"
                                step="1"
                                value={item.quantity}
                                onChange={(event) => updateSaleItem(sale.id, item.key, { quantity: event.target.value })}
                                disabled={saving || Boolean(attempt)}
                                aria-invalid={submitted && (!item.valid || duplicated)}
                                required
                              />
                            </label>
                            <strong className="correction-item-total">{item.product && item.quantity ? formatClp(item.lineTotalClp) : "—"}</strong>
                            {sale.items.length > 1 ? (
                              <button className="correction-remove-item" type="button" onClick={() => removeSaleItem(sale.id, item.key)} disabled={saving || Boolean(attempt)} aria-label={`Quitar producto ${itemIndex + 1} de la venta omitida ${saleIndex + 1}`}>Quitar</button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className="correction-sale-footer">
                      <button className="quiet-button" type="button" onClick={() => addSaleItem(sale.id)} disabled={saving || Boolean(attempt) || sale.items.length >= 10 || totalAddedItemLines >= 50}>Agregar producto</button>
                      <strong>Total {formatClp(sale.totalClp)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="correction-empty-copy">No se añadirán ventas en esta revisión.</p>}
          </section>

          <section className="correction-form-section" aria-labelledby={`correction-money-${closureId}`}>
            <div className="correction-section-heading">
              <div><h5 id={`correction-money-${closureId}`}>Montos verificados</h5><p>Corrige solo si el conteo registrado en la entrega fue incorrecto.</p></div>
            </div>
            <div className="correction-money-grid">
              {[
                { key: "cash", label: "Efectivo contado", value: countedCashClp, setValue: setCountedCashClp, parsed: cashCount },
                { key: "card", label: "Tarjeta verificada", value: countedCardClp, setValue: setCountedCardClp, parsed: cardCount },
                { key: "transfer", label: "Transferencia verificada", value: countedTransferClp, setValue: setCountedTransferClp, parsed: transferCount },
              ].map((field) => (
                <label className="cash-field" key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={field.value}
                    onChange={(event) => { field.setValue(event.target.value); setAttempt(null); setFormError(""); }}
                    disabled={saving || Boolean(attempt)}
                    aria-invalid={submitted && field.parsed === null}
                    required
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="correction-form-section" aria-labelledby={`correction-inventory-${closureId}`}>
            <div className="correction-section-heading">
              <div>
                <h5 id={`correction-inventory-${closureId}`}>Inventario contado</h5>
                <p>La bodega permanece fuera. La venta omitida corrige la expectativa histórica, pero no descuenta nuevamente el stock vigente.</p>
              </div>
            </div>
            {changedInventory.length ? (
              <div className="correction-inventory-impact" role="status">
                <div>
                  <strong>{activeSession ? "Este ajuste impacta un turno en curso" : "Este ajuste cambia el stock vigente"}</strong>
                  <span>
                    {activeSession
                      ? `Hay un turno ${activeSession.shift.toUpperCase()} activo con ${activeSession.responsible}. Revisa cada delta antes de guardar.`
                      : "El sistema aplicará solo la diferencia entre el conteo anterior y el corregido."}
                  </span>
                </div>
              </div>
            ) : null}
            {inventoryLocked && changedInventory.length ? (
              <div className="correction-inventory-lock" role="alert">
                <div>
                  <strong>El inventario ya fue entregado en un cierre posterior.</strong>
                  <span>Puedes conservar la razón, las ventas y los montos; retira solo los cambios de stock para crear la revisión.</span>
                </div>
                <button className="quiet-button" type="button" onClick={removeInventoryChanges}>Retirar cambios de inventario</button>
              </div>
            ) : null}
            {effective.inventory.length ? (
              <div className="correction-inventory-list">
                {inventoryResults.map(({ line, adjustable, countedQuantity, countedDeltaQuantity, liveFinalQuantity, changed, valid }) => {
                  const unavailableDescriptionId = `correction-inventory-unavailable-${closureId}-${line.key}`;
                  return (
                    <label className={`correction-inventory-row ${changed ? "correction-inventory-row-changed" : ""} ${!adjustable ? "correction-inventory-row-unavailable" : ""}`} key={line.key}>
                      <span><strong>{line.name}</strong><small>{locationLabel(line.location)} · esperado vigente {line.expectedQuantity} {line.unit}</small></span>
                      <span>Conteo anterior <strong>{line.countedQuantity}</strong></span>
                      <span className="cash-field">
                        <span>Conteo corregido</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="1"
                          value={adjustable ? inventoryDrafts[line.key] ?? "" : String(line.countedQuantity)}
                          onChange={(event) => { setInventoryDrafts((current) => ({ ...current, [line.key]: event.target.value })); setAttempt(null); setFormError(""); }}
                          disabled={saving || Boolean(attempt) || !adjustable}
                          aria-invalid={adjustable && submitted && !valid}
                          aria-describedby={!adjustable ? unavailableDescriptionId : undefined}
                          required={adjustable}
                        />
                      </span>
                      {!adjustable ? (
                        <span className="correction-inventory-unavailable" id={unavailableDescriptionId}>
                          Ya no existe en inventario vigente / no ajustable
                        </span>
                      ) : null}
                      {changed && countedDeltaQuantity !== null && liveFinalQuantity !== null ? (
                        <output className={liveFinalQuantity < 0 ? "correction-live-formula correction-live-formula-error" : "correction-live-formula"}>
                          Stock vigente {line.currentQuantity} {countedDeltaQuantity >= 0 ? "+" : "−"} {Math.abs(countedDeltaQuantity)} = <strong>{liveFinalQuantity}</strong>
                        </output>
                      ) : null}
                      {submitted && countedQuantity !== null && liveFinalQuantity !== null && liveFinalQuantity < 0 ? (
                        <small className="field-error correction-live-error" role="alert">El ajuste dejaría stock negativo. Corrige el conteo.</small>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            ) : <p className="correction-empty-copy">Esta entrega no tiene inventario contabilizado.</p>}
          </section>

          <section className="correction-preview" aria-labelledby={`correction-preview-${closureId}`}>
            <div className="correction-section-heading">
              <div><h5 id={`correction-preview-${closureId}`}>Vista previa · revisión {revisionState.latestRevisionNumber + 1}</h5><p>La venta y los conteos se aplicarán juntos como una nueva capa auditable.</p></div>
            </div>
            <dl className="correction-preview-grid">
              <div><dt>Ventas incluidas</dt><dd>{formatClp(effective.includedSalesClp + addedSalesClp)}</dd><small>{effective.includedSalesCount + addedSales.length} registros</small></div>
              <div><dt>Efectivo esperado</dt><dd>{formatClp(expectedCashPreview)}</dd><small>{previewDifferences.cash === null ? "Conteo pendiente" : differenceText(previewDifferences.cash)}</small></div>
              <div><dt>Tarjeta esperada</dt><dd>{formatClp(expectedCardPreview)}</dd><small>{previewDifferences.card === null ? "Conteo pendiente" : differenceText(previewDifferences.card)}</small></div>
              <div><dt>Transferencia esperada</dt><dd>{formatClp(expectedTransferPreview)}</dd><small>{previewDifferences.transfer === null ? "Conteo pendiente" : differenceText(previewDifferences.transfer)}</small></div>
              <div><dt>Conteos de stock corregidos</dt><dd>{changedInventory.length}</dd><small>El consumo de ventas omitidas se calcula al guardar.</small></div>
            </dl>
          </section>

          {attempt && !saving ? <p className="correction-retry-note" role="status">La respuesta no fue concluyente. Reintenta la misma revisión para evitar duplicados.</p> : null}
          {formError ? <p className="cash-form-error" role="alert">{formError}</p> : null}
          <button className="correction-save-button" type="submit" disabled={saving || (inventoryLocked && changedInventory.length > 0)}>
            {saving
              ? "Creando revisión…"
              : inventoryLocked && changedInventory.length > 0
                ? "Retira los cambios de inventario para continuar"
                : attempt
                  ? "Reintentar la misma revisión"
                  : `Crear revisión ${revisionState.latestRevisionNumber + 1}`}
          </button>
          <small className="correction-immutable-help">La entrega original y las revisiones anteriores seguirán disponibles y no podrán editarse.</small>
        </form>
      ) : null}

      {revisionState.revisions.length ? (
        <details className="closure-revision-history">
          <summary>Ver historial de correcciones ({revisionState.revisions.length})</summary>
          <ol>
            {[...revisionState.revisions]
              .sort((left, right) => right.revisionNumber - left.revisionNumber)
              .map((revision) => (
                <li key={revision.id}>
                  <details className="closure-revision-record">
                    <summary>
                      <span><strong>Revisión {revision.revisionNumber}</strong><time dateTime={revision.createdAt}>{formatTimestamp(revision.createdAt)}</time></span>
                      <small>{revision.addedSales.length} {revision.addedSales.length === 1 ? "venta" : "ventas"} · {revision.inventoryChanges.length} {revision.inventoryChanges.length === 1 ? "ajuste" : "ajustes"}</small>
                    </summary>
                    <div className="closure-revision-record-body">
                      <section>
                        <h6>Razón registrada</h6>
                        <p>{revision.reason}</p>
                      </section>

                      {revision.addedSales.length ? (
                        <section>
                          <h6>Ventas añadidas</h6>
                          <ul className="revision-sales-detail">
                            {revision.addedSales.map((sale) => (
                              <li key={sale.id}>
                                <div>
                                  <span>{PAYMENT_METHODS.find((method) => method.value === sale.paymentMethod)?.label ?? sale.paymentMethod}</span>
                                  <strong>{formatClp(sale.totalClp)}</strong>
                                </div>
                                <ul>
                                  {sale.items.map((item) => (
                                    <li key={`${sale.id}-${item.productId}`}>
                                      <span>{item.quantity} × {item.productName}</span>
                                      <strong>{formatClp(item.lineTotalClp)}</strong>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ) : null}

                      {revision.inventoryChanges.length ? (
                        <section>
                          <h6>Cambios de inventario</h6>
                          <ul className="revision-inventory-detail">
                            {revision.inventoryChanges.map((change) => {
                              const line = revisionState.effective.inventory.find((item) => item.key === change.key);
                              return (
                                <li key={change.key}>
                                  <strong>{line?.name ?? change.key}</strong>
                                  <span>Conteo {change.previousCountedQuantity} → {change.countedQuantity} · delta {change.countedDeltaQuantity >= 0 ? "+" : ""}{change.countedDeltaQuantity}</span>
                                  <span>Esperado {change.previousExpectedQuantity} → {change.expectedQuantity}{change.saleConsumptionQuantity ? ` · consumo virtual ${change.saleConsumptionQuantity}` : ""}</span>
                                  <span>{change.liveQuantityBefore === null || change.liveQuantityAfter === null ? "Sin ajuste del stock vigente" : `Stock vigente ${change.liveQuantityBefore} → ${change.liveQuantityAfter}`}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ) : null}

                      <section>
                        <h6>Fotografía financiera vigente</h6>
                        <dl className="revision-effective-detail">
                          <div><dt>Ventas incluidas</dt><dd>{formatClp(revision.effective.includedSalesClp)}</dd></div>
                          <div><dt>Efectivo esperado / contado</dt><dd>{formatClp(revision.effective.adjustedExpectedCashClp)} / {formatClp(revision.effective.countedCashClp)}</dd></div>
                          <div><dt>Tarjeta esperada / contada</dt><dd>{formatClp(revision.effective.cardCollectedClp)} / {formatClp(revision.effective.countedCardClp)}</dd></div>
                          <div><dt>Transferencia esperada / contada</dt><dd>{formatClp(revision.effective.transferCollectedClp)} / {formatClp(revision.effective.countedTransferClp)}</dd></div>
                          <div><dt>Diferencia total</dt><dd>{differenceText(revision.effective.differenceCollectedClp)}</dd></div>
                          <div><dt>Diferencias de stock</dt><dd>{revision.effective.inventoryDifferenceCount}</dd></div>
                        </dl>
                      </section>
                    </div>
                  </details>
                </li>
              ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
