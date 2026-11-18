import { ensureDatabase } from "@/db";
import {
  getActiveShiftState,
  getDailySummary,
  listProducts,
} from "@/db/pos";
import { COLLABORATORS, SHIFTS } from "@/lib/business";
import { getAuthRole } from "../_auth";
import { apiErrorResponse, noStoreJson } from "../_shared";

export async function GET(request: Request): Promise<Response> {
  try {
    const role = getAuthRole(request);
    if (role === null) {
      return noStoreJson({ error: "No autenticado." }, { status: 401 });
    }
    const database = await ensureDatabase();
    const [products, activeShiftState] = await Promise.all([
      listProducts(database, { activeOnly: true }),
      getActiveShiftState(database),
    ]);
    const activeSession = activeShiftState?.session ?? null;
    const activeShiftSummary = activeShiftState?.summary ?? null;
    if (role === "sales") {
      return noStoreJson({
        role,
        products,
        activeShiftSummary,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              businessDate: activeSession.businessDate,
              shift: activeSession.shift,
              responsible: activeSession.responsible,
              status: activeSession.status,
              openedAt: activeSession.openedAt,
            }
          : null,
        collaborators: COLLABORATORS,
        shifts: SHIFTS,
      });
    }
    const summary = await getDailySummary(database);

    return noStoreJson({
      role,
      products,
      summary,
      activeShiftSummary,
      activeSession,
      collaborators: COLLABORATORS,
      shifts: SHIFTS,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
