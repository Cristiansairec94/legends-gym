"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClosureCorrectionPanel,
  type ClosureEffective,
} from "./closure-correction-panel";

type IncidentLevel = "yellow" | "red";
type IncidentStatus =
  | "pending_clarification"
  | "clarified"
  | "validated"
  | "requires_correction";
type IncidentAction =
  | "clarification_requested"
  | "comment_added"
  | "clarified"
  | "requires_correction";

type IncidentSettings = {
  moneyRedThresholdClp: number;
  multipleProductRedCount: number;
  highValueProductClp: number;
  recurrenceWindowDays: number;
  recurrenceRedCount: number;
  reminderHours: number;
  updatedAt: string;
};

type IncidentSummary = {
  id: string;
  closureId: string;
  sessionId: string | null;
  createdAt: string;
  businessDate: string;
  shift: "am" | "pm";
  responsible: string;
  level: IncidentLevel;
  classificationReason: string;
  financialDifferenceReason: string | null;
  status: IncidentStatus;
  statusUpdatedAt: string;
  ageHours: number;
  cashDifferenceClp: number;
  cardDifferenceClp: number;
  transferDifferenceClp: number;
  totalDifferenceClp: number;
  inventoryDifferenceCount: number;
  estimatedValueClp: number;
  unvaluedItemCount: number;
  priorResponsibleIncidentCount: number;
  highestPriorProductIncidentCount: number;
  latestRevisionNumber: number;
  notificationFailedCount: number;
  notificationPendingCount: number;
};

type IncidentItem = {
  key: string;
  itemType: "product" | "ingredient";
  name: string;
  unit: string;
  location: "simple" | "vitrina" | "ingredient";
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  reasonLabel: string;
  initialComment: string;
  adjustmentApplied: number;
  unitValueClp: number | null;
  estimatedValueClp: number | null;
  highValue: boolean;
};

type IncidentEvent = {
  id: string;
  createdAt: string;
  eventType: string;
  status: IncidentStatus | null;
  actorName: string;
  comment: string | null;
};

type NotificationDelivery = {
  id: string;
  kind: "immediate_alert" | "reminder" | "daily_summary";
  recipientType: "individual" | "group" | "configuration";
  recipient: string;
  messagePreview: string;
  status:
    | "queued"
    | "sending"
    | "accepted"
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "superseded"
    | "configuration_required";
  attemptCount: number;
  lastAttemptAt: string | null;
  responseStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
};

type IncidentDetail = IncidentSummary & {
  items: IncidentItem[];
  events: IncidentEvent[];
  notifications: NotificationDelivery[];
  financialEvidence: {
    sourceRevisionNumber: number | null;
    expectedCashClp: number;
    countedCashClp: number;
    expectedCardClp: number;
    countedCardClp: number;
    expectedTransferClp: number;
    countedTransferClp: number;
    expectedCashBeforeExpensesClp: number;
    totalSalesClp: number;
    salesCount: number;
  };
};

type ClosureEvidence = {
  id: string;
  openingCashClp: number;
  cashMovementsClp: number;
  expectedCashClp: number;
  expensesClp: number;
  adjustedExpectedCashClp: number;
  countedCashClp: number;
  differenceClp: number;
  expectedCardClp: number;
  countedCardClp: number | null;
  differenceCardClp: number | null;
  expectedTransferClp: number;
  countedTransferClp: number | null;
  differenceTransferClp: number | null;
  totalSalesClp: number;
  salesCount: number;
  financialDifferenceReason: string | null;
  handoffComments: string | null;
  validationStatus: "pending" | "validated" | "not_required";
  expenses: Array<{ id: string; description: string; amountClp: number }>;
};

type DashboardResponse = {
  incidents: IncidentSummary[];
  hasMore: boolean;
  total: number;
  pendingCount: number;
  redCount: number;
  accumulatedEstimatedClp: number;
  accumulatedMoneyDifferenceClp: number;
  responsibleRecurrence: Array<{
    responsible: string;
    incidentCount: number;
    accumulatedClp: number;
  }>;
  productRecurrence: Array<{
    itemId: string;
    name: string;
    incidentCount: number;
    accumulatedQuantity: number;
    accumulatedClp: number;
  }>;
  settings: IncidentSettings;
  whatsApp: {
    enabled: boolean;
    ready: boolean;
    outboundReady: boolean;
    alertReady: boolean;
    dailySummaryReady: boolean;
    webhookReady: boolean;
    individualRecipientCount: number;
    groupRecipientCount: number;
    groupsEnabled: boolean;
    issues: string[];
  };
};

type DetailResponse = {
  incident: IncidentDetail;
  closure: ClosureEvidence;
};

type Filters = {
  status: "" | IncidentStatus;
  level: "" | IncidentLevel;
  from: string;
  to: string;
  responsible: string;
  product: string;
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  pending_clarification: "Pendiente de aclaración",
  clarified: "Aclarada · pendiente de validar",
  validated: "Validada por administrador",
  requires_correction: "Requiere corrección",
};

const EVENT_LABELS: Record<string, string> = {
  created: "Incidencia creada",
  clarification_requested: "Aclaración solicitada",
  comment_added: "Comentario agregado",
  clarified: "Incidencia aclarada",
  validated: "Validada por administrador",
  requires_correction: "Corrección solicitada",
  correction_applied: "Corrección aplicada",
  notification_retry: "Notificación reintentada",
};

const NOTIFICATION_LABELS: Record<NotificationDelivery["status"], string> = {
  queued: "En cola",
  sending: "Enviando",
  accepted: "Aceptado por WhatsApp",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Fallido",
  superseded: "Reemplazado",
  configuration_required: "Configuración pendiente",
};

const EMPTY_FILTERS: Filters = {
  status: "",
  level: "",
  from: "",
  to: "",
  responsible: "",
  product: "",
};

function formatClp(value: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function signedClp(value: number): string {
  if (value === 0) return "$0 · Cuadrado";
  return `${value > 0 ? "+" : "−"}${formatClp(Math.abs(value))}`;
}

function signedQuantity(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${value.toLocaleString("es-CL")} ${unit}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(value));
}

function ageLabel(hours: number): string {
  if (hours < 1) return "Menos de 1 hora";
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "día" : "días"}`;
}

function locationLabel(location: IncidentItem["location"]): string {
  if (location === "vitrina") return "Vitrina";
  if (location === "ingredient") return "Insumo";
  return "Stock simple";
}

async function readResponse<T>(response: Response): Promise<T> {
  let payload: (T & { error?: string }) | null = null;
  try {
    payload = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida.");
  }
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo completar la operación.");
  }
  return payload;
}

export function ClosureIncidentsPanel() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadSignal, setReloadSignal] = useState(0);
  const [correctionReady, setCorrectionReady] = useState(false);
  const [correctionEditing, setCorrectionEditing] = useState(false);
  const [latestRevisionNumber, setLatestRevisionNumber] = useState<number>();
  const [settingsDraft, setSettingsDraft] = useState<IncidentSettings | null>(null);
  const dashboardRequestId = useRef(0);
  const detailRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const incident = new URL(window.location.href).searchParams.get("incident");
      if (incident) setSelectedId(incident);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadDashboard = useCallback(async () => {
    const requestId = ++dashboardRequestId.current;
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ limit: "50" });
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      const response = await fetch(`/api/closure-incidents?${params}`, {
        cache: "no-store",
      });
      const payload = await readResponse<DashboardResponse>(response);
      if (requestId !== dashboardRequestId.current) return;
      setDashboard(payload);
      setSettingsDraft(payload.settings);
      setSelectedId((current) => current || payload.incidents[0]?.id || "");
    } catch (error) {
      if (requestId !== dashboardRequestId.current) return;
      setLoadError(
        error instanceof Error ? error.message : "No se pudieron cargar las incidencias.",
      );
    } finally {
      if (requestId === dashboardRequestId.current) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, reloadSignal]);

  const loadDetail = useCallback(async () => {
    const requestId = ++detailRequestId.current;
    if (!selectedId) {
      setDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError("");
    try {
      const response = await fetch(
        `/api/closure-incidents/${encodeURIComponent(selectedId)}`,
        { cache: "no-store" },
      );
      const payload = await readResponse<DetailResponse>(response);
      if (requestId !== detailRequestId.current) return;
      setDetail(payload);
    } catch (error) {
      if (requestId !== detailRequestId.current) return;
      setDetailError(
        error instanceof Error ? error.message : "No se pudo cargar la incidencia.",
      );
      setDetail(null);
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setComment("");
      setCorrectionReady(false);
      setCorrectionEditing(false);
      setLatestRevisionNumber(undefined);
      void loadDetail();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, reloadSignal]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selected = detail?.incident ?? null;
  const moneyDifference = selected
    ? Math.abs(selected.cashDifferenceClp) +
      Math.abs(selected.cardDifferenceClp) +
      Math.abs(selected.transferDifferenceClp)
    : 0;

  const activeCount = useMemo(
    () =>
      dashboard?.incidents.filter(({ status }) => status !== "validated").length ?? 0,
    [dashboard],
  );

  function selectIncident(incidentId: string) {
    if (incidentId === selectedId) return;
    if (
      comment.trim() &&
      !window.confirm(
        "Hay un comentario sin guardar. ¿Quieres descartarlo y abrir otro caso?",
      )
    ) {
      return;
    }
    detailRequestId.current += 1;
    setComment("");
    setDetailError("");
    setSelectedId(incidentId);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    detailRequestId.current += 1;
    setSelectedId("");
    setDetail(null);
    setFilters({
      ...draftFilters,
      responsible: draftFilters.responsible.trim(),
      product: draftFilters.product.trim(),
    });
  }

  async function runIncidentAction(action: IncidentAction) {
    if (!selected || !comment.trim()) return;
    setActionBusy(action);
    setDetailError("");
    try {
      const response = await fetch(
        `/api/closure-incidents/${encodeURIComponent(selected.id)}/events`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            action,
            expectedStatus: selected.status,
            comment: comment.trim(),
          }),
        },
      );
      const payload = await readResponse<{ incident: IncidentDetail }>(response);
      setDetail((current) =>
        current?.incident.id === payload.incident.id
          ? { ...current, incident: payload.incident }
          : current,
      );
      setComment("");
      setNotice("El historial de la incidencia fue actualizado.");
      setReloadSignal((current) => current + 1);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "No se pudo actualizar la incidencia.",
      );
    } finally {
      setActionBusy("");
    }
  }

  async function validateIncident() {
    if (!selected || !correctionReady || latestRevisionNumber === undefined) return;
    setActionBusy("validate");
    setDetailError("");
    try {
      const response = await fetch(
        `/api/cash-closures/${encodeURIComponent(selected.closureId)}/validate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            comment: comment.trim() || null,
            expectedRevisionNumber: latestRevisionNumber,
          }),
        },
      );
      await readResponse(response);
      setComment("");
      setNotice("Incidencia y cierre validados por Administración.");
      setReloadSignal((current) => current + 1);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "No se pudo validar la incidencia.",
      );
    } finally {
      setActionBusy("");
    }
  }

  async function retryNotification(deliveryId: string) {
    if (!selected) return;
    setActionBusy(`retry:${deliveryId}`);
    setDetailError("");
    try {
      const response = await fetch(
        `/api/closure-incidents/${encodeURIComponent(selected.id)}/notifications/${encodeURIComponent(deliveryId)}/retry`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ eventId: crypto.randomUUID() }),
        },
      );
      await readResponse(response);
      setNotice("Se procesó el reintento de WhatsApp.");
      setReloadSignal((current) => current + 1);
    } catch (error) {
      setDetailError(
        error instanceof Error ? error.message : "No se pudo reintentar el envío.",
      );
    } finally {
      setActionBusy("");
    }
  }

  async function processPolicies() {
    setActionBusy("policies");
    setLoadError("");
    try {
      const response = await fetch("/api/closure-incidents/notifications/process", {
        method: "POST",
      });
      const payload = await readResponse<{ queued: number; attempted: number }>(response);
      setNotice(
        `Política procesada: ${payload.queued} envío(s) en cola y ${payload.attempted} intento(s).`,
      );
      setReloadSignal((current) => current + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "No se pudieron procesar los avisos.",
      );
    } finally {
      setActionBusy("");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft) return;
    setActionBusy("settings");
    setLoadError("");
    try {
      const response = await fetch("/api/closure-incidents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          moneyRedThresholdClp: settingsDraft.moneyRedThresholdClp,
          multipleProductRedCount: settingsDraft.multipleProductRedCount,
          highValueProductClp: settingsDraft.highValueProductClp,
          recurrenceWindowDays: settingsDraft.recurrenceWindowDays,
          recurrenceRedCount: settingsDraft.recurrenceRedCount,
          reminderHours: settingsDraft.reminderHours,
          expectedUpdatedAt: settingsDraft.updatedAt,
        }),
      });
      const payload = await readResponse<{ settings: IncidentSettings }>(response);
      setSettingsDraft(payload.settings);
      setNotice("Los criterios se actualizaron para los cierres futuros.");
      setReloadSignal((current) => current + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "No se pudieron guardar los criterios.",
      );
    } finally {
      setActionBusy("");
    }
  }

  return (
    <section className="incidents-panel" aria-labelledby="incidents-panel-title">
      <div className="incidents-panel-heading">
        <div>
          <p className="eyebrow">Bandeja de excepciones</p>
          <h3 id="incidents-panel-title">Diferencias que requieren seguimiento</h3>
          <p>
            Los cierres verdes quedan fuera de esta bandeja y entran al resumen diario.
            Amarillo exige aclaración; rojo prioriza dinero, alto valor, varios productos
            o reincidencia.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void processPolicies()}
          disabled={actionBusy === "policies"}
        >
          {actionBusy === "policies" ? "Procesando…" : "Procesar avisos"}
        </button>
      </div>

      {loadError ? (
        <div className="page-alert incidents-alert" role="alert">
          <div><strong>No pudimos actualizar el panel</strong><span>{loadError}</span></div>
          <button type="button" onClick={() => void loadDashboard()}>Reintentar</button>
        </div>
      ) : null}

      <form className="incident-filters" onSubmit={applyFilters}>
        <fieldset>
          <legend>Filtrar incidencias</legend>
          <label>
            <span>Estado</span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as Filters["status"],
                }))
              }
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Nivel</span>
            <select
              value={draftFilters.level}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  level: event.target.value as Filters["level"],
                }))
              }
            >
              <option value="">Todos</option>
              <option value="red">Rojo</option>
              <option value="yellow">Amarillo</option>
            </select>
          </label>
          <label>
            <span>Desde</span>
            <input
              type="date"
              value={draftFilters.from}
              max={draftFilters.to || undefined}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, from: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Hasta</span>
            <input
              type="date"
              value={draftFilters.to}
              min={draftFilters.from || undefined}
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, to: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Responsable</span>
            <input
              type="search"
              value={draftFilters.responsible}
              maxLength={100}
              placeholder="Buscar nombre"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  responsible: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Producto o insumo</span>
            <input
              type="search"
              value={draftFilters.product}
              maxLength={100}
              placeholder="Buscar producto"
              onChange={(event) =>
                setDraftFilters((current) => ({ ...current, product: event.target.value }))
              }
            />
          </label>
          <div className="incident-filter-actions">
            <button className="primary-button" type="submit">Aplicar filtros</button>
            <button
              className="quiet-button"
              type="button"
              onClick={() => {
                detailRequestId.current += 1;
                setSelectedId("");
                setDetail(null);
                setDraftFilters(EMPTY_FILTERS);
                setFilters(EMPTY_FILTERS);
              }}
            >
              Limpiar
            </button>
          </div>
        </fieldset>
      </form>

      <div className="incident-kpis" aria-label="Resumen de incidencias">
        <article><span>Pendientes</span><strong>{dashboard?.pendingCount ?? 0}</strong><small>{activeCount} visibles</small></article>
        <article className="incident-kpi-red"><span>Nivel rojo</span><strong>{dashboard?.redCount ?? 0}</strong><small>Prioridad alta</small></article>
        <article><span>Diferencia de dinero</span><strong>{formatClp(dashboard?.accumulatedMoneyDifferenceClp ?? 0)}</strong><small>Magnitud acumulada</small></article>
        <article><span>Valor estimado stock</span><strong>{formatClp(dashboard?.accumulatedEstimatedClp ?? 0)}</strong><small>Insumos sin costo excluidos</small></article>
      </div>

      {loading && !dashboard ? (
        <div className="module-loading" role="status" aria-busy="true">
          Cargando excepciones…
        </div>
      ) : (
        <div className="incident-workspace">
          <section className="incident-list" aria-labelledby="incident-list-title">
            <div className="incident-list-heading">
              <div><h4 id="incident-list-title">Casos</h4><span>{dashboard?.total ?? 0} resultado(s)</span></div>
              {loading ? <span role="status">Actualizando…</span> : null}
            </div>
            {dashboard?.incidents.length ? (
              <div className="incident-case-list">
                {dashboard.incidents.map((incident) => (
                  <button
                    className={`incident-case ${selectedId === incident.id ? "incident-case-selected" : ""}`}
                    type="button"
                    aria-pressed={selectedId === incident.id}
                    onClick={() => selectIncident(incident.id)}
                    key={incident.id}
                  >
                    <span className="incident-case-topline">
                      <span className={`incident-level-badge incident-level-${incident.level}`}>
                        {incident.level === "red" ? "Roja" : "Amarilla"}
                      </span>
                      <span className={`incident-status-text incident-status-${incident.status}`}>
                        {STATUS_LABELS[incident.status]}
                      </span>
                    </span>
                    <strong>{incident.responsible}</strong>
                    <span>Turno {incident.shift.toUpperCase()} · {formatDate(incident.businessDate)}</span>
                    <span className="incident-case-metrics">
                      <span>{incident.inventoryDifferenceCount} diferencia(s) de stock</span>
                      <span>{formatClp(
                        Math.abs(incident.cashDifferenceClp) +
                          Math.abs(incident.cardDifferenceClp) +
                          Math.abs(incident.transferDifferenceClp),
                      )} en caja</span>
                    </span>
                    <small>Antigüedad: {ageLabel(incident.ageHours)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="incident-empty">
                <strong>No hay incidencias para estos filtros</strong>
                <span>Prueba ampliar el período o limpiar los filtros.</span>
              </div>
            )}
            {dashboard?.hasMore ? (
              <p className="incident-list-note">Hay más resultados. Refina los filtros para encontrar el caso.</p>
            ) : null}
          </section>

          <section className="incident-detail" aria-labelledby="incident-detail-title">
            {detailLoading ? (
              <div className="module-loading" role="status" aria-busy="true">
                Cargando detalle inmutable…
              </div>
            ) : detailError && !detail ? (
              <div className="page-alert incidents-alert" role="alert">
                <div><strong>No pudimos cargar el caso</strong><span>{detailError}</span></div>
                <button type="button" onClick={() => void loadDetail()}>Reintentar</button>
              </div>
            ) : selected && detail ? (
              <>
                {detailError ? (
                  <div className="page-alert incidents-alert" role="alert">
                    <div><strong>No pudimos completar la acción</strong><span>{detailError}</span></div>
                    <button type="button" onClick={() => setDetailError("")}>Cerrar</button>
                  </div>
                ) : null}
                <header className="incident-detail-heading">
                  <div>
                    <span className={`incident-level-badge incident-level-${selected.level}`}>
                      Nivel {selected.level === "red" ? "rojo" : "amarillo"}
                    </span>
                    <h4 id="incident-detail-title">{selected.responsible} · turno {selected.shift.toUpperCase()}</h4>
                    <p>{formatDate(selected.businessDate)} · detectada {formatDateTime(selected.createdAt)}</p>
                  </div>
                  <span className={`incident-status-badge incident-status-${selected.status}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </header>

                <p className="incident-classification">{selected.classificationReason}</p>

                <section className="incident-evidence" aria-labelledby="incident-evidence-title">
                  <div className="incident-section-heading">
                    <div><p className="eyebrow">Registro no modificable</p><h5 id="incident-evidence-title">Evidencia original de la incidencia</h5></div>
                    <span>
                      {selected.financialEvidence.sourceRevisionNumber === null
                        ? "Capturada al entregar el turno; el estado vigente se muestra más abajo."
                        : `Detectada en la revisión administrativa ${selected.financialEvidence.sourceRevisionNumber}; el acta de entrega permanece intacta.`}
                    </span>
                  </div>
                  <div className="incident-money-grid">
                    <article>
                      <span>Efectivo</span>
                      <dl><div><dt>Esperado</dt><dd>{formatClp(selected.financialEvidence.expectedCashClp)}</dd></div><div><dt>Contado</dt><dd>{formatClp(selected.financialEvidence.countedCashClp)}</dd></div><div><dt>Diferencia</dt><dd>{signedClp(selected.cashDifferenceClp)}</dd></div></dl>
                    </article>
                    <article>
                      <span>Tarjeta</span>
                      <dl><div><dt>Esperado</dt><dd>{formatClp(selected.financialEvidence.expectedCardClp)}</dd></div><div><dt>Contado</dt><dd>{formatClp(selected.financialEvidence.countedCardClp)}</dd></div><div><dt>Diferencia</dt><dd>{signedClp(selected.cardDifferenceClp)}</dd></div></dl>
                    </article>
                    <article>
                      <span>Transferencias</span>
                      <dl><div><dt>Esperado</dt><dd>{formatClp(selected.financialEvidence.expectedTransferClp)}</dd></div><div><dt>Contado</dt><dd>{formatClp(selected.financialEvidence.countedTransferClp)}</dd></div><div><dt>Diferencia</dt><dd>{signedClp(selected.transferDifferenceClp)}</dd></div></dl>
                    </article>
                  </div>
                  <div className="incident-original-context">
                    <div><span>Ventas incluidas</span><strong>{formatClp(selected.financialEvidence.totalSalesClp)} · {selected.financialEvidence.salesCount} venta(s)</strong></div>
                    <div><span>Fondo + cobros en efectivo</span><strong>{formatClp(selected.financialEvidence.expectedCashBeforeExpensesClp)}</strong></div>
                    <div><span>Gastos de caja chica</span><strong>{formatClp(detail.closure.expensesClp)}</strong></div>
                    <div><span>Valor estimado de stock</span><strong>{formatClp(selected.estimatedValueClp)}</strong></div>
                  </div>
                  {selected.financialDifferenceReason ? (
                    <div className="incident-note"><strong>Motivo financiero registrado</strong><p>{selected.financialDifferenceReason}</p></div>
                  ) : null}
                  {detail.closure.expenses.length ? (
                    <div className="incident-note"><strong>Gastos registrados</strong><ul>{detail.closure.expenses.map((expense) => <li key={expense.id}><span>{expense.description}</span><b>{formatClp(expense.amountClp)}</b></li>)}</ul></div>
                  ) : null}
                  {detail.closure.handoffComments ? (
                    <div className="incident-note"><strong>Comentario de entrega</strong><p>{detail.closure.handoffComments}</p></div>
                  ) : null}

                  {selected.items.length ? (
                    <div className="incident-stock-table-wrap">
                      <table className="incident-stock-table">
                        <caption>Diferencias registradas al detectar la incidencia y ajuste aplicado</caption>
                        <thead><tr><th>Producto o insumo</th><th>Esperado</th><th>Contado</th><th>Diferencia</th><th>Motivo y comentario</th><th>Valor</th></tr></thead>
                        <tbody>
                          {selected.items.map((item) => (
                            <tr key={item.key}>
                              <th scope="row"><strong>{item.name}</strong><span>{locationLabel(item.location)}</span></th>
                              <td>{item.expectedQuantity.toLocaleString("es-CL")}</td>
                              <td>{item.countedQuantity.toLocaleString("es-CL")}</td>
                              <td><strong>{signedQuantity(item.differenceQuantity, item.unit)}</strong><span>Ajuste aplicado: {signedQuantity(item.adjustmentApplied, item.unit)}</span></td>
                              <td><strong>{item.reasonLabel}</strong><span>{item.initialComment}</span></td>
                              <td>{item.estimatedValueClp === null ? <span>Sin costo configurado</span> : <strong>{formatClp(item.estimatedValueClp)}</strong>}{item.highValue ? <small>Alto valor</small> : null}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="incident-no-stock">Inventario cuadrado; esta incidencia corresponde solo a dinero.</p>
                  )}
                </section>

                <section className="incident-workflow" aria-labelledby="incident-workflow-title">
                  <div className="incident-section-heading"><div><p className="eyebrow">Seguimiento</p><h5 id="incident-workflow-title">Aclaraciones y decisión</h5></div><span>Los comentarios se agregan; el original nunca se reemplaza.</span></div>
                  <label className="cash-field">
                    <span>Comentario administrativo</span>
                    <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} placeholder="Registra la aclaración, evidencia o acción solicitada." disabled={Boolean(actionBusy)} />
                  </label>
                  <div className="incident-actions">
                    <button className="quiet-button" type="button" onClick={() => void runIncidentAction("comment_added")} disabled={!comment.trim() || Boolean(actionBusy)}>Agregar comentario</button>
                    <button className="quiet-button" type="button" onClick={() => void runIncidentAction("clarification_requested")} disabled={!comment.trim() || Boolean(actionBusy) || selected.status === "validated"}>Solicitar aclaración</button>
                    <button className="quiet-button incident-requires-button" type="button" onClick={() => void runIncidentAction("requires_correction")} disabled={!comment.trim() || Boolean(actionBusy) || selected.status === "validated"}>Requiere corrección</button>
                    <button className="secondary-button" type="button" onClick={() => void runIncidentAction("clarified")} disabled={!comment.trim() || Boolean(actionBusy) || selected.status === "validated"}>Marcar aclarada</button>
                    <button className="primary-button" type="button" onClick={() => void validateIncident()} disabled={Boolean(actionBusy) || selected.status === "validated" || !correctionReady || correctionEditing}>Validar incidencia</button>
                  </div>
                  {correctionEditing ? <p className="incident-inline-help" role="status">Guarda o cancela la corrección antes de validar.</p> : null}
                </section>

                <ClosureCorrectionPanel
                  key={selected.id}
                  closureId={selected.closureId}
                  readOnly={selected.status === "validated" || Boolean(actionBusy)}
                  refreshSignal={reloadSignal}
                  onStateChange={(state: {
                    ready: boolean;
                    latestRevisionNumber?: number;
                    effective?: ClosureEffective;
                  }) => {
                    setCorrectionReady(state.ready);
                    setLatestRevisionNumber(state.latestRevisionNumber);
                  }}
                  onEditingChange={setCorrectionEditing}
                  onCorrected={(message) => {
                    setNotice(message);
                    setReloadSignal((current) => current + 1);
                  }}
                />

                <details className="incident-history" open>
                  <summary>Historial del caso · {selected.events.length} evento(s)</summary>
                  <ol>
                    {selected.events.map((event) => (
                      <li key={event.id}>
                        <span aria-hidden="true" />
                        <div><strong>{EVENT_LABELS[event.eventType] ?? event.eventType}</strong><small>{event.actorName} · {formatDateTime(event.createdAt)}</small>{event.comment ? <p>{event.comment}</p> : null}</div>
                      </li>
                    ))}
                  </ol>
                </details>

                <details className="incident-notifications">
                  <summary>Notificaciones WhatsApp · {selected.notifications.length} registro(s)</summary>
                  {selected.notifications.length ? (
                    <div className="incident-notification-list">
                      {selected.notifications.map((delivery) => (
                        <article key={delivery.id}>
                          <div><strong>{delivery.kind === "immediate_alert" ? "Alerta inmediata" : delivery.kind === "reminder" ? "Recordatorio" : "Resumen diario"}</strong><span>{delivery.recipient}</span></div>
                          <span className={`notification-status notification-status-${delivery.status}`}>{NOTIFICATION_LABELS[delivery.status]}</span>
                          <p>{delivery.messagePreview}</p>
                          <small>Intentos: {delivery.attemptCount}{delivery.responseStatus ? ` · HTTP ${delivery.responseStatus}` : ""}{delivery.errorMessage ? ` · ${delivery.errorMessage}` : ""}</small>
                          {delivery.status === "failed" || delivery.status === "configuration_required" ? (
                            <button className="quiet-button" type="button" onClick={() => void retryNotification(delivery.id)} disabled={Boolean(actionBusy) || (delivery.status === "configuration_required" && !dashboard?.whatsApp.alertReady)}>{actionBusy === `retry:${delivery.id}` ? "Reintentando…" : "Reintentar envío"}</button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  ) : <p className="incident-empty-copy">Aún no hay registros de notificación.</p>}
                </details>
              </>
            ) : (
              <div className="incident-empty incident-detail-empty">
                <strong>Selecciona una incidencia</strong>
                <span>Aquí verás el cierre original, su historial y las acciones disponibles.</span>
              </div>
            )}
          </section>
        </div>
      )}

      {dashboard ? (
        <div className="incident-secondary-grid">
          <details className="incident-secondary-card">
            <summary>Indicadores de reincidencia</summary>
            <div className="incident-recurrence-grid">
              <section><h4>Por responsable</h4>{dashboard.responsibleRecurrence.length ? <ul>{dashboard.responsibleRecurrence.map((row) => <li key={row.responsible}><span><strong>{row.responsible}</strong><small>{row.incidentCount} incidencias</small></span><b>{formatClp(row.accumulatedClp)}</b></li>)}</ul> : <p>Sin responsables reincidentes en el período.</p>}</section>
              <section><h4>Por producto o insumo</h4>{dashboard.productRecurrence.length ? <ul>{dashboard.productRecurrence.map((row) => <li key={row.itemId}><span><strong>{row.name}</strong><small>{row.incidentCount} incidencias · {row.accumulatedQuantity} unidades</small></span><b>{formatClp(row.accumulatedClp)}</b></li>)}</ul> : <p>Sin productos reincidentes en el período.</p>}</section>
            </div>
          </details>

          <details className="incident-secondary-card">
            <summary>Criterios y WhatsApp</summary>
            <div className="incident-configuration-grid">
              {settingsDraft ? (
                <form onSubmit={saveSettings}>
                  <h4>Umbrales para cierres futuros</h4>
                  <p>La incidencia conserva una copia del criterio aplicado al momento de cerrar.</p>
                  <div className="incident-settings-fields">
                    {([
                      ["moneyRedThresholdClp", "Dinero para nivel rojo (CLP)", 1, 10000000],
                      ["multipleProductRedCount", "Productos afectados", 1, 90],
                      ["highValueProductClp", "Producto de alto valor (CLP)", 1, 10000000],
                      ["recurrenceWindowDays", "Ventana de reincidencia (días)", 1, 365],
                      ["recurrenceRedCount", "Incidencias para reincidencia", 2, 100],
                      ["reminderHours", "Recordatorio cada (horas)", 1, 720],
                    ] as const).map(([key, label, min, max]) => (
                      <label key={key}><span>{label}</span><input type="number" min={min} max={max} step="1" value={settingsDraft[key]} onChange={(event) => setSettingsDraft((current) => current ? { ...current, [key]: Number(event.target.value) } : current)} required /></label>
                    ))}
                  </div>
                  <button className="secondary-button" type="submit" disabled={actionBusy === "settings"}>{actionBusy === "settings" ? "Guardando…" : "Guardar criterios"}</button>
                </form>
              ) : null}
              <section className={`whatsapp-configuration ${dashboard.whatsApp.ready ? "whatsapp-ready" : "whatsapp-pending"}`}>
                <h4>WhatsApp oficial</h4>
                <strong>{dashboard.whatsApp.ready ? "Configurado" : dashboard.whatsApp.outboundReady ? "Alertas listas · webhook pendiente" : "Configuración pendiente"}</strong>
                <p>{dashboard.whatsApp.individualRecipientCount} administrador(es) · {dashboard.whatsApp.groupRecipientCount} grupo(s) oficial(es).</p>
                {dashboard.whatsApp.issues.length ? <ul>{dashboard.whatsApp.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
                <small>Los grupos requieren una cuenta oficial OBA y un GROUP_ID creado por la API. No se envía a grupos existentes de WhatsApp. Los recordatorios y el resumen diario requieren invocar periódicamente el procesador.</small>
              </section>
            </div>
          </details>
        </div>
      ) : null}

      {notice ? <div className="toast" role="status">{notice}</div> : null}
      <span className="sr-only" aria-live="polite">
        {selected ? `Incidencia seleccionada con ${moneyDifference} pesos de diferencia.` : ""}
      </span>
    </section>
  );
}
