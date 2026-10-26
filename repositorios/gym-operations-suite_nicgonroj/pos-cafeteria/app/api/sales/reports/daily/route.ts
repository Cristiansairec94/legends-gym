import { ensureDatabase } from "@/db";
import { getDailySalesReport } from "@/db/pos";

import { requireAdmin } from "../../../_auth";
import { apiErrorResponse, noStoreJson } from "../../../_shared";

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const url = new URL(request.url);
    const database = await ensureDatabase();
    const report = await getDailySalesReport(database, {
      dateFrom: url.searchParams.get("dateFrom"),
      dateTo: url.searchParams.get("dateTo"),
    });
    return noStoreJson(report);
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }
}
