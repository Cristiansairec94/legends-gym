import { ensureDatabase } from "@/db";
import { getDailySalesReport, listSalesForExport } from "@/db/pos";
import { buildSalesReportWorkbook, XLSX_MIME } from "@/lib/xlsx";

import { requireAdmin } from "../../../_auth";
import { apiErrorResponse } from "../../../_shared";
import { parseSalesReportQuery } from "../_params";

export async function GET(request: Request): Promise<Response> {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const query = parseSalesReportQuery(new URL(request.url));
    const database = await ensureDatabase();
    const now = new Date();
    const [exportResult, dailyReport] = await Promise.all([
      listSalesForExport(database, query, now),
      getDailySalesReport(database, query, now),
    ]);
    const workbook = buildSalesReportWorkbook({ dailyReport, exportResult });
    const filename = `cafeteria-demogym-ventas_${exportResult.dateRange.dateFrom}_a_${exportResult.dateRange.dateTo}.xlsx`;
    const body = workbook.buffer.slice(
      workbook.byteOffset,
      workbook.byteOffset + workbook.byteLength,
    ) as ArrayBuffer;

    return new Response(body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Type": XLSX_MIME,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  }
}
