import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { strFromU8, unzipSync } from "fflate";

async function loadXlsxModule() {
  const source = await readFile(
    new URL("../lib/xlsx.ts", import.meta.url),
    "utf8",
  );
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    fileName: "lib/xlsx.ts",
  }).outputText;
  output = output.replaceAll('"fflate"', JSON.stringify(import.meta.resolve("fflate")));
  const url = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  return import(url);
}

const xlsx = await loadXlsxModule();

function fixture() {
  return {
    dailyReport: {
      period: {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-02",
        totalSalesClp: 12000,
        salesCount: 2,
        units: 3,
        averageClp: 6000,
        outstandingSalesClp: 5000,
        pendingCustomerClp: 5000,
        collaboratorClp: 0,
        collectedClp: 9000,
        settlementClp: 2000,
        cashClp: 2000,
        cardClp: 5000,
        transferClp: 2000,
      },
      days: [
        {
          date: "2026-09-02",
          totalSalesClp: 5000,
          salesCount: 1,
          units: 2,
          averageClp: 5000,
          outstandingSalesClp: 0,
          pendingCustomerClp: 0,
          collaboratorClp: 0,
          collectedClp: 7000,
          settlementClp: 2000,
          cashClp: 0,
          cardClp: 5000,
          transferClp: 2000,
        },
        {
          date: "2026-09-01",
          totalSalesClp: 7000,
          salesCount: 1,
          units: 1,
          averageClp: 7000,
          outstandingSalesClp: 5000,
          pendingCustomerClp: 5000,
          collaboratorClp: 0,
          collectedClp: 2000,
          settlementClp: 0,
          cashClp: 2000,
          cardClp: 0,
          transferClp: 0,
        },
      ],
    },
    exportResult: {
      filters: {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-02",
        paymentStatus: "pending",
        paymentMethod: "pendiente",
        q: "=BUSCAR(<venta>)",
      },
      dateRange: {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-02",
        dayCount: 2,
      },
      sales: [
        {
          id: "venta-segura",
          createdAt: "2026-09-01T15:30:00.000Z",
          businessDate: "2026-09-01",
          shift: "am",
          seller: "+Matías & equipo",
          checkoutMethod: "pendiente",
          paymentStatus: "pending",
          settledPaymentMethod: null,
          debtNote: "@SUM(A1:A2)\u0001 <pendiente>",
          debtorCollaborator: null,
          totalClp: 7000,
          paidClp: 2000,
          balanceClp: 5000,
          units: 1,
          products: '=HYPERLINK("https://example.test") & Café',
        },
      ],
      payments: [
        {
          id: "abono-1",
          saleId: "venta-antigua",
          createdAt: "2026-09-02T14:15:00.000Z",
          paymentMethod: "transferencia",
          amountClp: 2000,
          receivedBy: "Matías Muñoz",
          shift: "am",
          kind: "settlement",
        },
      ],
    },
  };
}

test("genera un XLSX OOXML real, tipado y sin fórmulas inyectables", () => {
  const bytes = xlsx.buildSalesReportWorkbook(fixture());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const files = unzipSync(bytes);
  assert.deepEqual(Object.keys(files).sort(), [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "xl/worksheets/sheet3.xml",
  ]);

  const workbook = strFromU8(files["xl/workbook.xml"]);
  const summary = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const detail = strFromU8(files["xl/worksheets/sheet2.xml"]);
  const payments = strFromU8(files["xl/worksheets/sheet3.xml"]);
  const styles = strFromU8(files["xl/styles.xml"]);
  assert.match(workbook, /name="Resumen diario"/);
  assert.match(workbook, /name="Detalle ventas"/);
  assert.match(workbook, /name="Pagos"/);
  assert.match(summary, /Total vendido del día/);
  assert.match(summary, /abonos de ventas anteriores/);
  assert.match(summary, /Abonos recibidos/);
  assert.match(summary, /TOTAL PERÍODO/);
  assert.match(summary, /<c r="B9" s="10"><v>12000<\/v><\/c>/);
  assert.match(summary, /<c r="J7" s="4"><v>2000<\/v><\/c>/);
  assert.match(summary, /<c r="J9" s="10"><v>2000<\/v><\/c>/);
  assert.match(summary, /<autoFilter\b/);
  assert.match(summary, /state="frozen"/);
  assert.match(detail, /t="inlineStr"/);
  assert.match(detail, /=HYPERLINK\(&quot;https:\/\/example\.test&quot;\) &amp; Café/);
  assert.match(detail, /@SUM\(A1:A2\)� &lt;pendiente&gt;/);
  assert.doesNotMatch(summary + detail, /<f(?:\s|>)/);
  assert.match(payments, /Abono \/ liquidación/);
  assert.match(payments, /Cafetería Demo Gym · Pagos recibidos/);
  assert.match(payments, /aunque la venta se haya originado antes/);
  assert.match(payments, /venta-antigua/);
  assert.match(payments, /<c r="E7" s="4"><v>2000<\/v><\/c>/);
  assert.doesNotMatch(payments, /<f(?:\s|>)/);
  assert.equal((summary + detail).includes(String.fromCharCode(1)), false);
  assert.match(detail, /<c r="K7" s="4"><v>7000<\/v><\/c>/);
  assert.match(detail, /<c r="A7" s="3"><v>\d+(?:\.\d+)?<\/v><\/c>/);
  assert.match(styles, /formatCode="yyyy-mm-dd hh:mm"/);
  assert.match(styles, /formatCode="&quot;\$&quot;#,##0"/);
  assert.doesNotMatch(styles, /<xf[^>]*verticalAlignment=/);
  assert.equal(
    xlsx.XLSX_MIME,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
});

test("sanitiza XML 1.0 y limita cada texto al máximo de Excel", () => {
  assert.equal(xlsx.sanitizeSpreadsheetText("A\u0000B\u000bC"), "A�B�C");
  assert.equal(xlsx.sanitizeSpreadsheetText("x".repeat(40_000)).length, 32_767);
  assert.equal(
    xlsx.sanitizeSpreadsheetText("😀".repeat(20_000)).length,
    32_766,
  );
});
