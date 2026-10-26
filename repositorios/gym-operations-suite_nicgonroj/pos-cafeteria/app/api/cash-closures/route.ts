import { env, waitUntil } from "cloudflare:workers";
import { ensureDatabase } from "@/db";
import {
  createCashClosure,
  getActiveShiftSession,
  getCashClosurePreview,
  getShiftSessionForContext,
  getSantiagoBusinessDate,
  listClosingInventory,
  listCashClosurePage,
  type CashClosure,
} from "@/db/pos";
import {
  dispatchWhatsAppDelivery,
  queueImmediateIncidentNotifications,
  readWhatsAppConfig,
} from "@/db/notifications";
import { getAuthRole } from "../_auth";
import {
  apiErrorResponse,
  noStoreJson,
  readJson,
  validateBusinessDate,
  validateCashClosurePayload,
  validateShift,
} from "../_shared";

function salesClosureReceipt(closure: CashClosure) {
  return {
    id: closure.id,
    sessionId: closure.sessionId,
    closureContractVersion: closure.closureContractVersion,
    businessDate: closure.businessDate,
    shift: closure.shift,
    responsible: closure.responsible,
    createdAt: closure.createdAt,
    activityRevision: closure.activityRevision,
    openingCashClp: closure.openingCashClp,
    cashMovementsClp: closure.cashMovementsClp,
    expectedCashClp: closure.expectedCashClp,
    expectedCardClp: closure.expectedCardClp,
    expectedTransferClp: closure.expectedTransferClp,
    collectedPaymentsClp: closure.collectedPaymentsClp,
    expectedCollectedClp: closure.expectedCollectedClp,
    totalSalesClp: closure.totalSalesClp,
    salesCount: closure.salesCount,
    pendingCustomerClp: closure.pendingCustomerClp,
    pendingCustomerCount: closure.pendingCustomerCount,
    pendingCustomers: closure.pendingCustomers,
    collaboratorClp: 0,
    collaboratorCount: 0,
    pendingCollaborators: [],
    unassignedSalesClp: closure.unassignedSalesClp,
    unassignedSalesCount: closure.unassignedSalesCount,
    unassignedPaymentsClp: closure.unassignedPaymentsClp,
    unassignedPaymentsCount: closure.unassignedPaymentsCount,
    countedCashClp: closure.countedCashClp,
    expensesClp: closure.expensesClp,
    adjustedExpectedCashClp: closure.adjustedExpectedCashClp,
    differenceClp: closure.differenceClp,
    countedCardClp: closure.countedCardClp,
    differenceCardClp: closure.differenceCardClp,
    countedTransferClp: closure.countedTransferClp,
    differenceTransferClp: closure.differenceTransferClp,
    countedCollectedClp: closure.countedCollectedClp,
    differenceCollectedClp: closure.differenceCollectedClp,
    financialDifferenceReason: closure.financialDifferenceReason,
    checklist: closure.checklist,
    checklistVersion: closure.checklistVersion,
    notes: closure.notes,
    handoffComments: closure.handoffComments,
    expenses: closure.expenses,
    validationStatus: closure.validationStatus,
    validation: null,
    inventory: closure.inventory,
    inventoryCaptured: closure.inventoryCaptured,
    inventoryLineCount: closure.inventoryLineCount,
    inventoryDifferenceCount: closure.inventoryDifferenceCount,
    inventoryDifferences: closure.inventoryDifferences,
    closed: closure.closed,
  };
}

export async function GET(request: Request): Promise<Response> {
  const role = getAuthRole(request);
  if (role === null) {
    return noStoreJson({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const businessDate = validateBusinessDate(
      url.searchParams.get("date") ?? getSantiagoBusinessDate(),
    );
    const shift = validateShift(url.searchParams.get("shift") ?? "am");
    const pendingLimitRaw = url.searchParams.get("pendingLimit");
    const pendingLimit = pendingLimitRaw === null ? 30 : Number(pendingLimitRaw);
    if (
      pendingLimitRaw !== null &&
      (!/^\d+$/u.test(pendingLimitRaw) || !Number.isSafeInteger(pendingLimit))
    ) {
      return noStoreJson(
        { error: "El límite de cierres pendientes no es válido." },
        { status: 400 },
      );
    }
    const pendingCursor = url.searchParams.get("pendingCursor");
    const database = await ensureDatabase();
    const activeSession = role === "sales" ? await getActiveShiftSession(database) : null;
    if (
      role === "sales" &&
      (!activeSession ||
        activeSession.businessDate !== businessDate ||
        activeSession.shift !== shift)
    ) {
      return noStoreJson(
        { error: "Ventas solo puede revisar la cuadratura del turno activo." },
        { status: 403 },
      );
    }
    const [session, preview, inventory, closurePage] = await Promise.all([
      activeSession ?? getShiftSessionForContext(database, businessDate, shift),
      getCashClosurePreview(database, businessDate, shift),
      listClosingInventory(database),
      role === "admin"
        ? listCashClosurePage(database, { pendingLimit, pendingCursor })
        : Promise.resolve({
            closures: [],
            pendingHasMore: false,
            pendingNextCursor: null,
          }),
    ]);
    if (role === "sales" && preview.closed) {
      return noStoreJson(
        {
          error:
            "El turno se cerró mientras revisabas la cuadratura. Actualiza la página.",
        },
        { status: 409 },
      );
    }
    return noStoreJson({ session, preview, inventory, ...closurePage });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const role = getAuthRole(request);
  if (role === null) {
    return noStoreJson({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const input = validateCashClosurePayload(await readJson(request));
    const database = await ensureDatabase();
    const result = await createCashClosure(database, input);
    if (result.incidentId) {
      try {
        const whatsAppConfig = readWhatsAppConfig(env);
        const deliveryIds = await queueImmediateIncidentNotifications(
          database,
          result.incidentId,
          whatsAppConfig,
        );
        waitUntil(
          Promise.all(
            deliveryIds.map((deliveryId) =>
              dispatchWhatsAppDelivery(
                database,
                deliveryId,
                whatsAppConfig,
              ).catch(() => undefined),
            ),
          ).then(() => undefined),
        );
      } catch {
        // La entrega del turno ya quedó confirmada. Administración puede
        // reintentar o completar la configuración desde Incidencias.
      }
    }
    const closure =
      role === "sales"
        ? salesClosureReceipt(result.closure)
        : result.closure;
    return noStoreJson(
      { ...result, closure, nextSessionAvailable: true },
      { status: result.idempotent ? 200 : 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
