import { strToU8, zipSync } from "fflate";

import type {
  DailySalesReport,
  PaymentMethod,
  SaleHistoryFilters,
  SalePaymentMethod,
  SalesExportResult,
} from "@/db/pos";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EXCEL_EPOCH_OFFSET_DAYS = 25_569;
const MILLISECONDS_PER_DAY = 86_400_000;
const SANTIAGO_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export { XLSX_MIME };

type Cell =
  | { kind: "text"; value: string; style?: number }
  | { kind: "number"; value: number; style?: number }
  | { kind: "date"; value: string; style?: number }
  | { kind: "datetime"; value: string; style?: number };

type SheetDefinition = {
  rows: Cell[][];
  widths: number[];
  headerRow: number;
  filterLastRow?: number;
  mergedRanges: string[];
};

function isValidXmlCodePoint(codePoint: number): boolean {
  return (
    codePoint === 0x09 ||
    codePoint === 0x0a ||
    codePoint === 0x0d ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff)
  );
}

/** Keeps every exported value as a literal inline string and valid XML 1.0. */
export function sanitizeSpreadsheetText(value: unknown): string {
  const input = String(value ?? "");
  let result = "";
  let codeUnits = 0;
  for (const character of input) {
    const size = character.length;
    if (codeUnits + size > 32_767) break;
    const codePoint = character.codePointAt(0)!;
    result += isValidXmlCodePoint(codePoint) ? character : "�";
    codeUnits += size;
  }
  return result;
}

function escapeXml(value: unknown): string {
  return sanitizeSpreadsheetText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number): string {
  let current = index + 1;
  let label = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }
  return label;
}

function excelDateSerial(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid spreadsheet date");
  return (
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) /
      MILLISECONDS_PER_DAY +
    EXCEL_EPOCH_OFFSET_DAYS
  );
}

function santiagoDateTimeSerial(value: string): number {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid spreadsheet datetime");
  const values = Object.fromEntries(
    SANTIAGO_DATE_TIME_FORMATTER
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, Number(partValue)]),
  );
  return (
    Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    ) /
      MILLISECONDS_PER_DAY +
    EXCEL_EPOCH_OFFSET_DAYS
  );
}

function cellXml(cell: Cell, reference: string): string {
  const style = cell.style ?? 0;
  if (cell.kind === "text") {
    return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`;
  }
  const numericValue =
    cell.kind === "date"
      ? excelDateSerial(cell.value)
      : cell.kind === "datetime"
        ? santiagoDateTimeSerial(cell.value)
        : cell.value;
  if (!Number.isFinite(numericValue)) {
    throw new Error("Spreadsheet numeric value is not finite");
  }
  return `<c r="${reference}" s="${style}"><v>${numericValue}</v></c>`;
}

function worksheetXml(definition: SheetDefinition): string {
  const lastColumn = columnName(Math.max(0, definition.widths.length - 1));
  const lastRow = Math.max(definition.rows.length, definition.headerRow);
  const rows = definition.rows
    .map((cells, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const content = cells
        .map((cell, columnIndex) =>
          cellXml(cell, `${columnName(columnIndex)}${rowNumber}`),
        )
        .join("");
      const height = rowNumber <= definition.headerRow - 1 ? " ht=\"24\" customHeight=\"1\"" : "";
      return `<row r="${rowNumber}"${height}>${content}</row>`;
    })
    .join("");
  const columns = definition.widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");
  const merges = definition.mergedRanges
    .map((reference) => `<mergeCell ref="${reference}"/>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${definition.headerRow}" topLeftCell="A${definition.headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${columns}</cols>
  <sheetData>${rows}</sheetData>
  <autoFilter ref="A${definition.headerRow}:${lastColumn}${definition.filterLastRow ?? lastRow}"/>
  <mergeCells count="${definition.mergedRanges.length}">${merges}</mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

function paymentMethodLabel(method: SalePaymentMethod | PaymentMethod | null): string {
  const labels: Record<SalePaymentMethod, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
    pendiente: "Pendiente de pago",
    colaborador: "Colaborador",
  };
  return method === null ? "—" : labels[method];
}

function filtersLabel(filters: SaleHistoryFilters): string {
  return [
    `Estado: ${filters.paymentStatus === null ? "Todos" : filters.paymentStatus === "paid" ? "Pagada" : "Pendiente"}`,
    `Medio al vender: ${filters.paymentMethod === null ? "Todos" : paymentMethodLabel(filters.paymentMethod)}`,
    `Búsqueda: ${filters.q ?? "Sin búsqueda"}`,
  ].join(" · ");
}

function buildSummarySheet(
  report: DailySalesReport,
  exportResult: SalesExportResult,
): SheetDefinition {
  const lastColumn = "M";
  const header: Cell[] = [
    "Fecha",
    "Total vendido del día",
    "N.º ventas",
    "Unidades",
    "Ticket promedio",
    "Saldo actual",
    "Pendiente clientes",
    "Pendiente colaboradores",
    "Cobros recibidos del día",
    "Abonos recibidos",
    "Efectivo recibido",
    "Tarjeta recibida",
    "Transferencia recibida",
  ].map((value) => ({ kind: "text", value, style: 1 }));
  const dataRows: Cell[][] = report.days.map((day) => [
    { kind: "date", value: day.date, style: 2 },
    { kind: "number", value: day.totalSalesClp, style: 4 },
    { kind: "number", value: day.salesCount, style: 5 },
    { kind: "number", value: day.units, style: 5 },
    { kind: "number", value: day.averageClp, style: 4 },
    { kind: "number", value: day.outstandingSalesClp, style: 4 },
    { kind: "number", value: day.pendingCustomerClp, style: 4 },
    { kind: "number", value: day.collaboratorClp, style: 4 },
    { kind: "number", value: day.collectedClp, style: 4 },
    { kind: "number", value: day.settlementClp, style: 4 },
    { kind: "number", value: day.cashClp, style: 4 },
    { kind: "number", value: day.cardClp, style: 4 },
    { kind: "number", value: day.transferClp, style: 4 },
  ]);
  const totalRow: Cell[] = [
    { kind: "text", value: "TOTAL PERÍODO", style: 8 },
    { kind: "number", value: report.period.totalSalesClp, style: 10 },
    { kind: "number", value: report.period.salesCount, style: 9 },
    { kind: "number", value: report.period.units, style: 9 },
    { kind: "number", value: report.period.averageClp, style: 10 },
    { kind: "number", value: report.period.outstandingSalesClp, style: 10 },
    { kind: "number", value: report.period.pendingCustomerClp, style: 10 },
    { kind: "number", value: report.period.collaboratorClp, style: 10 },
    { kind: "number", value: report.period.collectedClp, style: 10 },
    { kind: "number", value: report.period.settlementClp, style: 10 },
    { kind: "number", value: report.period.cashClp, style: 10 },
    { kind: "number", value: report.period.cardClp, style: 10 },
    { kind: "number", value: report.period.transferClp, style: 10 },
  ];
  return {
    rows: [
      [{ kind: "text", value: "Cafetería Demo Gym · Resumen diario", style: 7 }],
      [
        {
          kind: "text",
          value: `Período: ${exportResult.dateRange.dateFrom} a ${exportResult.dateRange.dateTo}`,
          style: 6,
        },
      ],
      [
        {
          kind: "text",
          value: `Resumen global del período. Los filtros de estado, medio y búsqueda se aplican solo a “Detalle ventas”: ${filtersLabel(exportResult.filters)}`,
          style: 6,
        },
      ],
      [
        {
          kind: "text",
          value:
            "Ventas y saldos se agrupan por la fecha de origen de la venta. Cobros recibidos son el flujo real del día para todas las ventas y pueden incluir abonos de ventas anteriores.",
          style: 6,
        },
      ],
      [],
      header,
      ...dataRows,
      totalRow,
    ],
    widths: [13, 17, 12, 11, 17, 16, 20, 23, 22, 19, 18, 18, 23],
    headerRow: 6,
    filterLastRow: 6 + dataRows.length,
    mergedRanges: [`A1:${lastColumn}1`, `A2:${lastColumn}2`, `A3:${lastColumn}3`, `A4:${lastColumn}4`],
  };
}

function buildPaymentsSheet(exportResult: SalesExportResult): SheetDefinition {
  const lastColumn = "H";
  const header: Cell[] = [
    "Fecha y hora (Chile)",
    "ID pago",
    "ID venta",
    "Medio",
    "Monto",
    "Receptor",
    "Turno",
    "Tipo",
  ].map((value) => ({ kind: "text", value, style: 1 }));
  const paymentRows: Cell[][] = exportResult.payments.map((payment) => [
    { kind: "datetime", value: payment.createdAt, style: 3 },
    { kind: "text", value: payment.id },
    { kind: "text", value: payment.saleId },
    { kind: "text", value: paymentMethodLabel(payment.paymentMethod) },
    { kind: "number", value: payment.amountClp, style: 4 },
    { kind: "text", value: payment.receivedBy ?? "—" },
    { kind: "text", value: payment.shift?.toUpperCase() ?? "—" },
    {
      kind: "text",
      value: payment.kind === "direct" ? "Pago directo" : "Abono / liquidación",
    },
  ]);
  return {
    rows: [
      [{ kind: "text", value: "Cafetería Demo Gym · Pagos recibidos", style: 7 }],
      [
        {
          kind: "text",
          value: `Pagos recibidos entre ${exportResult.dateRange.dateFrom} y ${exportResult.dateRange.dateTo}`,
          style: 6,
        },
      ],
      [
        {
          kind: "text",
          value: "Los filtros de ventas no alteran esta hoja.",
          style: 6,
        },
      ],
      [
        {
          kind: "text",
          value:
            "Incluye todos los pagos directos y abonos recibidos dentro del período, aunque la venta se haya originado antes.",
          style: 6,
        },
      ],
      [],
      header,
      ...paymentRows,
    ],
    widths: [22, 30, 30, 18, 16, 24, 10, 22],
    headerRow: 6,
    mergedRanges: [`A1:${lastColumn}1`, `A2:${lastColumn}2`, `A3:${lastColumn}3`, `A4:${lastColumn}4`],
  };
}

function buildDetailSheet(exportResult: SalesExportResult): SheetDefinition {
  const lastColumn = "O";
  const header: Cell[] = [
    "Fecha y hora (Chile)",
    "ID venta",
    "Fecha de negocio",
    "Turno",
    "Vendedor",
    "Productos",
    "Unidades",
    "Medio al vender",
    "Estado de pago",
    "Medio de liquidación",
    "Total",
    "Abonado actual",
    "Saldo actual",
    "Cliente / colaborador",
    "Nota",
  ].map((value) => ({ kind: "text", value, style: 1 }));
  const detailRows: Cell[][] = exportResult.sales.map((sale) => [
    { kind: "datetime", value: sale.createdAt, style: 3 },
    { kind: "text", value: sale.id },
    sale.businessDate
      ? { kind: "date", value: sale.businessDate, style: 2 }
      : { kind: "text", value: "—" },
    { kind: "text", value: sale.shift?.toUpperCase() ?? "—" },
    { kind: "text", value: sale.seller ?? "—" },
    { kind: "text", value: sale.products || "—", style: 6 },
    { kind: "number", value: sale.units, style: 5 },
    { kind: "text", value: paymentMethodLabel(sale.checkoutMethod) },
    {
      kind: "text",
      value: sale.paymentStatus === "paid" ? "Pagada" : "Pendiente",
    },
    { kind: "text", value: paymentMethodLabel(sale.settledPaymentMethod) },
    { kind: "number", value: sale.totalClp, style: 4 },
    { kind: "number", value: sale.paidClp, style: 4 },
    { kind: "number", value: sale.balanceClp, style: 4 },
    { kind: "text", value: sale.debtorCollaborator ?? "—" },
    { kind: "text", value: sale.debtNote ?? "—", style: 6 },
  ]);
  return {
    rows: [
      [{ kind: "text", value: "Cafetería Demo Gym · Detalle de ventas", style: 7 }],
      [
        {
          kind: "text",
          value: `Período de creación: ${exportResult.dateRange.dateFrom} a ${exportResult.dateRange.dateTo}`,
          style: 6,
        },
      ],
      [{ kind: "text", value: filtersLabel(exportResult.filters), style: 6 }],
      [
        {
          kind: "text",
          value:
            "Abonado y saldo corresponden al estado actual de cada venta al momento de exportar.",
          style: 6,
        },
      ],
      [],
      header,
      ...detailRows,
    ],
    widths: [22, 28, 18, 10, 20, 48, 11, 21, 18, 22, 16, 18, 16, 24, 44],
    headerRow: 6,
    mergedRanges: [`A1:${lastColumn}1`, `A2:${lastColumn}2`, `A3:${lastColumn}3`, `A4:${lastColumn}4`],
  };
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
    <numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/>
    <numFmt numFmtId="166" formatCode="&quot;$&quot;#,##0"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Aptos"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos Display"/></font>
    <font><b/><color rgb="FF111827"/><sz val="16"/><name val="Aptos Display"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF172033"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFB230"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top/><bottom style="thin"><color rgb="FFD6DAE3"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="11">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="3" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="166" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/></bookViews>
  <sheets>
    <sheet name="Resumen diario" sheetId="1" r:id="rId1"/>
    <sheet name="Detalle ventas" sheetId="2" r:id="rId2"/>
    <sheet name="Pagos" sheetId="3" r:id="rId3"/>
  </sheets>
  <calcPr calcId="0" calcMode="auto"/>
</workbook>`;

const workbookRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const rootRelationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

export function buildSalesReportWorkbook(input: {
  dailyReport: DailySalesReport;
  exportResult: SalesExportResult;
}): Uint8Array {
  const entries = {
    "[Content_Types].xml": strToU8(contentTypesXml),
    "_rels/.rels": strToU8(rootRelationshipsXml),
    "xl/workbook.xml": strToU8(workbookXml),
    "xl/_rels/workbook.xml.rels": strToU8(workbookRelationshipsXml),
    "xl/styles.xml": strToU8(stylesXml),
    "xl/worksheets/sheet1.xml": strToU8(
      worksheetXml(buildSummarySheet(input.dailyReport, input.exportResult)),
    ),
    "xl/worksheets/sheet2.xml": strToU8(
      worksheetXml(buildDetailSheet(input.exportResult)),
    ),
    "xl/worksheets/sheet3.xml": strToU8(
      worksheetXml(buildPaymentsSheet(input.exportResult)),
    ),
  };
  return zipSync(entries, { level: 6 });
}
