import {
  PosError,
  MAX_STOCK_ENTRY_QUANTITY,
  PRODUCT_STOCK_ENTRY_LOCATIONS,
  STOCK_MODES,
  normalizePaymentMethod,
  type PaymentMethod,
  type CashClosureInput,
  type CashClosureRevisionInput,
  type OpenShiftSessionInput,
  type IngredientStockEntryInput,
  type IngredientStockInput,
  type ProductStockEntryInput,
  type ProductStockEntryLocation,
  type SalePaymentMethod,
  type SaleInput,
  type SaleVoidInput,
  type SettlementInput,
  type StockMode,
  type TransferValidationInput,
} from "@/db/pos";
import {
  COLLABORATORS,
  SHIFTS,
  isCollaborator,
  isInventoryDifferenceReason,
  isShift,
  type Collaborator,
  type InventoryDifferenceReason,
  type Shift,
} from "@/lib/business";

export type CreateProductInput = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  priceClp: number;
  stockMode: StockMode;
  stock: number | null;
  stockVitrina: number | null;
  stockBodega: number | null;
  active: boolean;
  needsPriceReview: boolean;
};

export type PatchProductInput = Partial<Omit<CreateProductInput, "id">> & {
  expectedUpdatedAt: string;
};

export type ProductInventory = Pick<
  CreateProductInput,
  "stockMode" | "stock" | "stockVitrina" | "stockBodega"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new PosError(400, message);
  return value;
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unexpected) {
    throw new PosError(400, `El campo «${unexpected}» no está permitido.`);
  }
}

function normalizeRequiredText(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new PosError(400, `${label} debe ser texto.`);
  }
  const normalized = value.trim();
  if (!normalized) throw new PosError(400, `${label} es obligatorio.`);
  if (normalized.length > maxLength) {
    throw new PosError(400, `${label} es demasiado largo.`);
  }
  return normalized;
}

function normalizeId(value: unknown, label: string): string {
  const id = normalizeRequiredText(value, label, 100);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw new PosError(400, `${label} contiene caracteres no permitidos.`);
  }
  return id;
}

function normalizeSku(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new PosError(400, "El SKU debe ser texto o nulo.");
  }
  const sku = value.trim();
  if (!sku) return null;
  if (sku.length > 64) throw new PosError(400, "El SKU es demasiado largo.");
  return sku;
}

function normalizePrice(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new PosError(400, "El precio debe ser un entero mayor que cero.");
  }
  return Number(value);
}

function normalizeStock(value: unknown, label = "El stock"): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new PosError(
      400,
      `${label} debe ser un entero mayor o igual a cero, o nulo.`,
    );
  }
  return Number(value);
}

function normalizeStockMode(value: unknown): StockMode {
  if (
    typeof value !== "string" ||
    !STOCK_MODES.includes(value as StockMode)
  ) {
    throw new PosError(
      400,
      "El modo de stock debe ser untracked, simple o split.",
    );
  }
  return value as StockMode;
}

export function resolveProductInventory(
  _category: string,
  current: ProductInventory | null,
  changes: Partial<ProductInventory>,
): ProductInventory {
  const has = (field: keyof ProductInventory) => Object.hasOwn(changes, field);
  let stockMode = has("stockMode")
    ? (changes.stockMode as StockMode)
    : (current?.stockMode ?? "untracked");

  // Compatibilidad con el contrato anterior: stock numérico activa control simple
  // y stock nulo lo desactiva cuando no se envía stockMode.
  if (!has("stockMode") && has("stock")) {
    stockMode = changes.stock === null ? "untracked" : "simple";
  } else if (
    !has("stockMode") &&
    (has("stockVitrina") || has("stockBodega"))
  ) {
    stockMode = "split";
  }

  const stock = has("stock") ? (changes.stock ?? null) : (current?.stock ?? null);
  const stockVitrina = has("stockVitrina")
    ? (changes.stockVitrina ?? null)
    : (current?.stockVitrina ?? null);
  const stockBodega = has("stockBodega")
    ? (changes.stockBodega ?? null)
    : (current?.stockBodega ?? null);

  if (stockMode === "untracked") {
    if (
      (has("stock") && stock !== null) ||
      (has("stockVitrina") && stockVitrina !== null) ||
      (has("stockBodega") && stockBodega !== null)
    ) {
      throw new PosError(
        400,
        "Un producto sin control de stock no puede incluir existencias.",
      );
    }
    return {
      stockMode,
      stock: null,
      stockVitrina: null,
      stockBodega: null,
    };
  }

  if (stockMode === "simple") {
    if (stock === null) {
      throw new PosError(400, "El stock simple requiere una cantidad.");
    }
    if (
      (has("stockVitrina") && stockVitrina !== null) ||
      (has("stockBodega") && stockBodega !== null)
    ) {
      throw new PosError(
        400,
        "El stock simple no puede incluir cantidades de vitrina o bodega.",
      );
    }
    return {
      stockMode,
      stock,
      stockVitrina: null,
      stockBodega: null,
    };
  }

  if (stockVitrina === null || stockBodega === null) {
    throw new PosError(
      400,
      "El stock dividido requiere cantidades de vitrina y bodega.",
    );
  }
  if (has("stock") && stock !== null) {
    throw new PosError(
      400,
      "El stock dividido no puede incluir una cantidad de stock simple.",
    );
  }
  return {
    stockMode,
    stock: null,
    stockVitrina,
    stockBodega,
  };
}

function normalizeBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new PosError(400, `${label} debe ser verdadero o falso.`);
  }
  return value;
}

function normalizeIsoTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new PosError(400, `${label} debe ser una fecha ISO válida.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new PosError(400, `${label} debe estar expresada en UTC.`);
  }
  return value;
}

export async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new PosError(415, "La solicitud debe enviarse como JSON.");
  }
  try {
    return await request.json();
  } catch {
    throw new PosError(400, "El JSON enviado no es válido.");
  }
}

export function validateSalePayload(value: unknown): SaleInput {
  const record = requireRecord(value, "La venta debe ser un objeto JSON.");
  assertOnlyKeys(record, [
    "id",
    "sessionId",
    "paymentMethod",
    "debtNote",
    "debtorCollaborator",
    "seller",
    "shift",
    "items",
  ]);
  const id = normalizeId(record.id, "El id de la venta");

  const rawPaymentMethod = record.paymentMethod;
  const normalizedPaidMethod = normalizePaymentMethod(rawPaymentMethod);
  if (
    typeof rawPaymentMethod !== "string" ||
    (rawPaymentMethod !== "pendiente" &&
      rawPaymentMethod !== "colaborador" &&
      normalizedPaidMethod === null)
  ) {
    throw new PosError(
      400,
      "El medio de pago debe ser efectivo, tarjeta, transferencia, pendiente o colaborador.",
    );
  }
  const paymentMethod: SalePaymentMethod =
    rawPaymentMethod === "pendiente" || rawPaymentMethod === "colaborador"
      ? rawPaymentMethod
      : (normalizedPaidMethod as PaymentMethod);
  let debtNote: string | null = null;
  if (paymentMethod === "pendiente") {
    debtNote = normalizeRequiredText(
      record.debtNote,
      "La nota de la deuda",
      500,
    );
  } else if (paymentMethod === "colaborador") {
    if (record.debtNote !== undefined && record.debtNote !== null) {
      debtNote = normalizeRequiredText(record.debtNote, "La nota", 500);
    }
  } else if (record.debtNote !== undefined && record.debtNote !== null) {
    throw new PosError(
      400,
      "La nota de deuda solo se permite cuando el pago está pendiente.",
    );
  }

  let seller: Collaborator | null = null;
  if (record.seller !== undefined && record.seller !== null) {
    if (!isCollaborator(record.seller)) {
      throw new PosError(
        400,
        `El vendedor debe ser uno de los colaboradores autorizados: ${COLLABORATORS.join(", ")}.`,
      );
    }
    seller = record.seller;
  }
  let shift: Shift | null = null;
  if (record.shift !== undefined && record.shift !== null) {
    if (!isShift(record.shift)) {
      throw new PosError(400, `El turno debe ser ${SHIFTS.join(" o ")}.`);
    }
    shift = record.shift;
  }

  let debtorCollaborator: Collaborator | null = null;
  if (paymentMethod === "colaborador") {
    if (!isCollaborator(record.debtorCollaborator)) {
      throw new PosError(400, "Debes seleccionar al colaborador deudor.");
    }
    debtorCollaborator = record.debtorCollaborator;
  } else if (
    record.debtorCollaborator !== undefined &&
    record.debtorCollaborator !== null
  ) {
    throw new PosError(
      400,
      "El colaborador deudor solo se permite con el medio Colaborador.",
    );
  }

  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new PosError(400, "La venta debe incluir al menos un producto.");
  }
  if (record.items.length > 100) {
    throw new PosError(400, "La venta no puede incluir más de 100 líneas.");
  }

  const items = record.items.map((value, index) => {
    const item = requireRecord(
      value,
      `La línea ${index + 1} debe ser un objeto JSON.`,
    );
    assertOnlyKeys(item, ["productId", "unitPriceClp", "quantity"]);
    const productId = normalizeId(
      item.productId,
      `El producto de la línea ${index + 1}`,
    );
    if (
      !Number.isSafeInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 99
    ) {
      throw new PosError(
        400,
        `La cantidad de la línea ${index + 1} debe ser un entero entre 1 y 99.`,
      );
    }
    return {
      productId,
      unitPriceClp: normalizePrice(item.unitPriceClp),
      quantity: Number(item.quantity),
    };
  });

  return {
    id,
    sessionId: normalizeId(record.sessionId, "El id de la sesión"),
    paymentMethod,
    debtNote,
    debtorCollaborator,
    seller,
    shift,
    items,
  };
}

export function validateSettlementPayload(value: unknown): SettlementInput {
  const record = requireRecord(value, "El abono debe ser un objeto JSON.");
  assertOnlyKeys(record, [
    "id",
    "sessionId",
    "paymentMethod",
    "amountClp",
    "shift",
    "responsible",
  ]);
  const id = normalizeId(record.id, "El id del abono");
  if (id.startsWith("direct:")) {
    throw new PosError(400, "El id del abono usa un prefijo reservado.");
  }
  const paymentMethod = normalizePaymentMethod(record.paymentMethod);
  if (paymentMethod === null) {
    throw new PosError(
      400,
      "El medio de pago debe ser efectivo, tarjeta o transferencia.",
    );
  }
  let shift: Shift | null = null;
  if (record.shift !== undefined && record.shift !== null) {
    if (!isShift(record.shift)) {
      throw new PosError(400, "El turno debe ser AM o PM.");
    }
    shift = record.shift;
  }
  let responsible: Collaborator | null = null;
  if (record.responsible !== undefined && record.responsible !== null) {
    if (!isCollaborator(record.responsible)) {
      throw new PosError(400, "El colaborador responsable no es válido.");
    }
    responsible = record.responsible;
  }
  const hasAmount = Object.hasOwn(record, "amountClp");
  let amountClp: number | null = null;
  if (hasAmount) {
    if (!Number.isSafeInteger(record.amountClp) || Number(record.amountClp) <= 0) {
      throw new PosError(
        400,
        "El monto del abono debe ser un entero mayor que cero.",
      );
    }
    amountClp = Number(record.amountClp);
  } else if (shift === null || responsible === null) {
    throw new PosError(400, "El monto del abono es obligatorio.");
  }
  return {
    id,
    sessionId: normalizeId(record.sessionId, "El id de la sesión"),
    paymentMethod,
    amountClp,
    shift,
    responsible,
  };
}

export function validateSaleVoidPayload(value: unknown): SaleVoidInput {
  const record = requireRecord(
    value,
    "La anulación debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, [
    "id",
    "sessionId",
    "expectedActivityRevision",
    "reason",
  ]);
  const id = normalizeId(record.id, "El id de la anulación");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new PosError(400, "El id de la anulación debe ser un UUID válido.");
  }
  if (
    !Number.isSafeInteger(record.expectedActivityRevision) ||
    Number(record.expectedActivityRevision) < 0
  ) {
    throw new PosError(
      400,
      "La revisión esperada del turno debe ser un entero no negativo.",
    );
  }
  return {
    id,
    sessionId: normalizeId(record.sessionId, "El id de la sesión"),
    expectedActivityRevision: Number(record.expectedActivityRevision),
    reason: normalizeRequiredText(record.reason, "El motivo", 500),
  };
}

export function validateTransferValidationPayload(
  value: unknown,
): TransferValidationInput {
  const record = requireRecord(
    value,
    "La validación de transferencia debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, ["id", "sessionId", "emailReference"]);
  const id = normalizeId(record.id, "El id de la validación");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    throw new PosError(400, "El id de la validación debe ser un UUID válido.");
  }
  return {
    id,
    sessionId: normalizeId(record.sessionId, "El id de la sesión"),
    emailReference: normalizeRequiredText(
      record.emailReference,
      "La referencia del correo de Mercado Pago",
      200,
    ),
  };
}

export function validateBusinessDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new PosError(400, "La fecha de negocio es obligatoria.");
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new PosError(400, "La fecha de negocio no es válida.");
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) {
    throw new PosError(400, "La fecha de negocio no es válida.");
  }
  return value;
}

export function validateShift(value: unknown): Shift {
  if (!isShift(value)) throw new PosError(400, "El turno debe ser AM o PM.");
  return value;
}

export function validateCashClosurePayload(value: unknown): CashClosureInput {
  const record = requireRecord(value, "La cuadratura debe ser un objeto JSON.");
  assertOnlyKeys(record, [
    "id",
    "sessionId",
    "expectedActivityRevision",
    "countedCashClp",
    "countedCardClp",
    "countedTransferClp",
    "financialDifferenceReason",
    "expenses",
    "inventory",
    "handoffComments",
    // Compatibilidad temporal para pestañas abiertas antes del despliegue v2.
    "checklistVersion",
    "checklist",
    "notes",
  ]);
  const isLegacyPayload =
    record.checklistVersion !== undefined ||
    record.checklist !== undefined ||
    record.notes !== undefined;
  if (
    isLegacyPayload &&
    (record.expenses !== undefined || record.handoffComments !== undefined)
  ) {
    throw new PosError(
      400,
      "La cuadratura no puede mezclar contratos de entrega.",
    );
  }
  if (isLegacyPayload) {
    if (record.checklistVersion !== 1) {
      throw new PosError(
        400,
        "La versión de la lista de conciliación no es válida.",
      );
    }
    const checklist = requireRecord(
      record.checklist,
      "La lista de conciliación es obligatoria.",
    );
    const checklistKeys = [
      "cashReconciled",
      "cardReconciled",
      "transferReconciled",
      "pendingCustomerReviewed",
      "collaboratorReviewed",
      "inventoryCountConfirmed",
    ] as const;
    assertOnlyKeys(checklist, checklistKeys);
    for (const key of checklistKeys) {
      if (checklist[key] !== true) {
        throw new PosError(
          400,
          "Debes confirmar toda la lista de conciliación.",
        );
      }
    }
  }
  const integer = (raw: unknown, label: string): number => {
    if (!Number.isSafeInteger(raw) || Number(raw) < 0) {
      throw new PosError(400, `${label} debe ser un entero no negativo.`);
    }
    return Number(raw);
  };
  if (
    (!isLegacyPayload && !Array.isArray(record.expenses)) ||
    (Array.isArray(record.expenses) && record.expenses.length > 25)
  ) {
    throw new PosError(400, "Los gastos de caja chica no son válidos.");
  }
  const expenseValues = isLegacyPayload ? [] : (record.expenses as unknown[]);
  const expenses = expenseValues.map((raw, index) => {
    const expense = requireRecord(
      raw,
      `El gasto ${index + 1} no es válido.`,
    );
    assertOnlyKeys(expense, ["id", "description", "amountClp"]);
    if (!Number.isSafeInteger(expense.amountClp) || Number(expense.amountClp) <= 0) {
      throw new PosError(
        400,
        `El monto del gasto ${index + 1} debe ser un entero mayor que cero.`,
      );
    }
    return {
      id: normalizeId(expense.id, `El id del gasto ${index + 1}`),
      description: normalizeRequiredText(
        expense.description,
        `La descripción del gasto ${index + 1}`,
        200,
      ),
      amountClp: Number(expense.amountClp),
    };
  });
  if (new Set(expenses.map(({ id }) => id)).size !== expenses.length) {
    throw new PosError(400, "Los gastos contienen identificadores duplicados.");
  }
  if (!Array.isArray(record.inventory) || record.inventory.length > 90) {
    throw new PosError(400, "El inventario de cierre no es válido.");
  }
  const inventory = record.inventory.map((raw, index) => {
    const line = requireRecord(
      raw,
      `La línea de inventario ${index + 1} no es válida.`,
    );
    assertOnlyKeys(line, [
      "key",
      "versionToken",
      "expectedQuantity",
      "countedQuantity",
      "reasonCategory",
      "comment",
      // Compatibilidad con pestañas abiertas antes del formulario categorizado.
      "reason",
    ]);
    const expectedQuantity = integer(
      line.expectedQuantity,
      `La cantidad esperada de la línea ${index + 1}`,
    );
    const countedQuantity = integer(
      line.countedQuantity,
      `La cantidad contada de la línea ${index + 1}`,
    );
    let reasonCategory: InventoryDifferenceReason | null = null;
    let comment: string | null = null;
    if (line.reasonCategory !== undefined && line.reasonCategory !== null) {
      if (!isInventoryDifferenceReason(line.reasonCategory)) {
        throw new PosError(
          400,
          `La categoría de diferencia de la línea ${index + 1} no es válida.`,
        );
      }
      reasonCategory = line.reasonCategory;
    }
    if (line.comment !== undefined && line.comment !== null) {
      comment = normalizeRequiredText(
        line.comment,
        "El comentario de diferencia",
        1000,
      );
    }
    if (
      reasonCategory === null &&
      comment === null &&
      line.reason !== undefined &&
      line.reason !== null
    ) {
      reasonCategory = "otro";
      comment = normalizeRequiredText(
        line.reason,
        "El comentario de diferencia",
        500,
      );
    }
    if (
      expectedQuantity !== countedQuantity &&
      (reasonCategory === null || comment === null)
    ) {
      throw new PosError(
        400,
        `Debes categorizar y comentar la diferencia de la línea ${index + 1}.`,
      );
    }
    if (
      expectedQuantity === countedQuantity &&
      (reasonCategory !== null || comment !== null)
    ) {
      throw new PosError(
        400,
        `La línea ${index + 1} no debe tener motivo ni comentario si no hay diferencia.`,
      );
    }
    return {
      key: normalizeId(line.key, `La clave de la línea ${index + 1}`),
      versionToken: normalizeRequiredText(
        line.versionToken,
        `La versión de la línea ${index + 1}`,
        100,
      ),
      expectedQuantity,
      countedQuantity,
      reasonCategory,
      comment,
    };
  });
  if (new Set(inventory.map(({ key }) => key)).size !== inventory.length) {
    throw new PosError(400, "El inventario contiene ubicaciones duplicadas.");
  }
  const closingInventory = isLegacyPayload
    ? inventory.filter(
        ({ key }) =>
          !(key.startsWith("product:") && key.endsWith(":bodega")),
      )
    : inventory;
  let financialDifferenceReason: string | null = null;
  if (
    record.financialDifferenceReason !== undefined &&
    record.financialDifferenceReason !== null
  ) {
    financialDifferenceReason = normalizeRequiredText(
      record.financialDifferenceReason,
      "El motivo de la diferencia financiera",
      500,
    );
  }
  let handoffComments: string | null = null;
  if (isLegacyPayload && record.notes !== undefined && record.notes !== null) {
    handoffComments = normalizeRequiredText(record.notes, "Las notas", 500);
  } else if (
    record.handoffComments !== undefined &&
    record.handoffComments !== null
  ) {
    handoffComments = normalizeRequiredText(
      record.handoffComments,
      "Los comentarios de entrega",
      1000,
    );
  }
  return {
    id: normalizeId(record.id, "El id de la cuadratura"),
    sessionId: normalizeId(record.sessionId, "El id de la sesión"),
    expectedActivityRevision: integer(
      record.expectedActivityRevision,
      "La revisión esperada del turno",
    ),
    countedCashClp: integer(record.countedCashClp, "El efectivo contado"),
    countedCardClp: integer(record.countedCardClp, "La tarjeta conciliada"),
    countedTransferClp: integer(
      record.countedTransferClp,
      "La transferencia conciliada",
    ),
    financialDifferenceReason,
    expenses,
    inventory: closingInventory,
    handoffComments,
  };
}

export function validateCashClosurePathId(value: unknown): string {
  return normalizeId(value, "El id del cierre");
}

export function validateCashClosureValidationPayload(
  value: unknown,
): { comment: string | null; expectedRevisionNumber: number | null } {
  const record = requireRecord(
    value,
    "La validación debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, ["comment", "expectedRevisionNumber"]);
  let expectedRevisionNumber: number | null = null;
  if (record.expectedRevisionNumber !== undefined) {
    if (
      !Number.isSafeInteger(record.expectedRevisionNumber) ||
      Number(record.expectedRevisionNumber) < 0
    ) {
      throw new PosError(
        400,
        "La revisión esperada del cierre debe ser un entero no negativo.",
      );
    }
    expectedRevisionNumber = Number(record.expectedRevisionNumber);
  }
  if (record.comment === undefined || record.comment === null) {
    return { comment: null, expectedRevisionNumber };
  }
  return {
    comment: normalizeRequiredText(
      record.comment,
      "El comentario de validación",
      1000,
    ),
    expectedRevisionNumber,
  };
}

export function validateCashClosureRevisionPayload(
  value: unknown,
): CashClosureRevisionInput {
  const record = requireRecord(
    value,
    "La corrección debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, [
    "id",
    "expectedRevisionNumber",
    "reason",
    "countedCashClp",
    "countedCardClp",
    "countedTransferClp",
    "addedSales",
    "inventory",
  ]);
  const integer = (raw: unknown, label: string): number => {
    if (!Number.isSafeInteger(raw) || Number(raw) < 0) {
      throw new PosError(400, `${label} debe ser un entero no negativo.`);
    }
    return Number(raw);
  };
  if (!Array.isArray(record.addedSales) || record.addedSales.length > 5) {
    throw new PosError(
      400,
      "La corrección puede incluir como máximo 5 ventas omitidas.",
    );
  }
  let inputLineCount = 0;
  const addedSales = record.addedSales.map((raw, saleIndex) => {
    const sale = requireRecord(
      raw,
      `La venta omitida ${saleIndex + 1} no es válida.`,
    );
    assertOnlyKeys(sale, ["id", "paymentMethod", "items"]);
    const paymentMethod = normalizePaymentMethod(sale.paymentMethod);
    if (paymentMethod === null) {
      throw new PosError(
        400,
        "Las ventas omitidas deben usar efectivo, tarjeta o transferencia.",
      );
    }
    if (!Array.isArray(sale.items) || sale.items.length === 0) {
      throw new PosError(400, "Cada venta omitida debe incluir productos.");
    }
    if (sale.items.length > 10) {
      throw new PosError(
        400,
        "Cada venta omitida puede incluir como máximo 10 productos.",
      );
    }
    inputLineCount += sale.items.length;
    const items = sale.items.map((rawItem, itemIndex) => {
      const item = requireRecord(
        rawItem,
        `La línea ${itemIndex + 1} de la venta omitida ${saleIndex + 1} no es válida.`,
      );
      assertOnlyKeys(item, ["productId", "unitPriceClp", "quantity"]);
      if (
        !Number.isSafeInteger(item.quantity) ||
        Number(item.quantity) < 1 ||
        Number(item.quantity) > 99
      ) {
        throw new PosError(
          400,
          "La cantidad de una venta omitida debe estar entre 1 y 99.",
        );
      }
      return {
        productId: normalizeId(item.productId, "El id del producto"),
        unitPriceClp: normalizePrice(item.unitPriceClp),
        quantity: Number(item.quantity),
      };
    });
    if (new Set(items.map(({ productId }) => productId)).size !== items.length) {
      throw new PosError(
        400,
        "Una venta omitida no puede repetir el mismo producto.",
      );
    }
    return {
      id: normalizeId(sale.id, `El id de la venta omitida ${saleIndex + 1}`),
      paymentMethod,
      items,
    };
  });
  if (inputLineCount > 50) {
    throw new PosError(
      400,
      "La corrección puede incluir como máximo 50 líneas de venta.",
    );
  }
  if (new Set(addedSales.map(({ id }) => id)).size !== addedSales.length) {
    throw new PosError(400, "Las ventas omitidas contienen ids duplicados.");
  }
  if (!Array.isArray(record.inventory) || record.inventory.length > 90) {
    throw new PosError(
      400,
      "La corrección puede incluir como máximo 90 líneas de inventario.",
    );
  }
  const inventory = record.inventory.map((raw, index) => {
    const line = requireRecord(
      raw,
      `La corrección de inventario ${index + 1} no es válida.`,
    );
    assertOnlyKeys(line, [
      "key",
      "expectedCountedQuantity",
      "countedQuantity",
      "liveVersionToken",
      "liveQuantity",
    ]);
    return {
      key: normalizeId(line.key, `La clave de inventario ${index + 1}`),
      expectedCountedQuantity: integer(
        line.expectedCountedQuantity,
        `El conteo anterior de la línea ${index + 1}`,
      ),
      countedQuantity: integer(
        line.countedQuantity,
        `El nuevo conteo de la línea ${index + 1}`,
      ),
      liveVersionToken: normalizeRequiredText(
        line.liveVersionToken,
        `La versión actual de la línea ${index + 1}`,
        100,
      ),
      liveQuantity: integer(
        line.liveQuantity,
        `El stock actual de la línea ${index + 1}`,
      ),
    };
  });
  if (new Set(inventory.map(({ key }) => key)).size !== inventory.length) {
    throw new PosError(400, "El inventario corregido contiene claves duplicadas.");
  }
  return {
    id: normalizeId(record.id, "El id de la corrección"),
    expectedRevisionNumber: integer(
      record.expectedRevisionNumber,
      "La revisión esperada del cierre",
    ),
    reason: normalizeRequiredText(record.reason, "La razón de la corrección", 1000),
    countedCashClp: integer(record.countedCashClp, "El efectivo contado"),
    countedCardClp: integer(record.countedCardClp, "La tarjeta conciliada"),
    countedTransferClp: integer(
      record.countedTransferClp,
      "La transferencia conciliada",
    ),
    addedSales,
    inventory,
  };
}

export function validateOpenShiftSessionPayload(
  value: unknown,
): OpenShiftSessionInput {
  const record = requireRecord(value, "La apertura debe ser un objeto JSON.");
  assertOnlyKeys(record, ["id", "shift", "responsible", "openingCashClp"]);
  if (!isShift(record.shift)) {
    throw new PosError(400, "El turno debe ser AM o PM.");
  }
  if (!isCollaborator(record.responsible)) {
    throw new PosError(400, "El colaborador responsable no es válido.");
  }
  if (!Number.isSafeInteger(record.openingCashClp) || Number(record.openingCashClp) < 0) {
    throw new PosError(400, "El efectivo inicial debe ser un entero no negativo.");
  }
  return {
    id: normalizeId(record.id, "El id de la sesión"),
    shift: record.shift,
    responsible: record.responsible,
    openingCashClp: Number(record.openingCashClp),
  };
}

export function validateIngredientStockPayload(
  value: unknown,
): IngredientStockInput {
  const record = requireRecord(value, "El ajuste debe ser un objeto JSON.");
  assertOnlyKeys(record, ["stock", "expectedRevision"]);
  const stock = normalizeStock(record.stock, "El stock del insumo");
  if (stock === null) {
    throw new PosError(400, "El stock del insumo es obligatorio.");
  }
  if (
    !Number.isSafeInteger(record.expectedRevision) ||
    Number(record.expectedRevision) < 0
  ) {
    throw new PosError(
      400,
      "La revisión esperada debe ser un entero mayor o igual a cero.",
    );
  }
  return { stock, expectedRevision: Number(record.expectedRevision) };
}

function normalizeStockEntryQuantity(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > MAX_STOCK_ENTRY_QUANTITY
  ) {
    throw new PosError(
      400,
      `La cantidad recibida debe ser un entero entre 1 y ${MAX_STOCK_ENTRY_QUANTITY.toLocaleString("es-CL")}.`,
    );
  }
  return Number(value);
}

export function validateProductStockEntryPayload(
  value: unknown,
): ProductStockEntryInput {
  const record = requireRecord(
    value,
    "El ingreso de stock debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, ["id", "quantity", "location"]);
  if (
    typeof record.location !== "string" ||
    !PRODUCT_STOCK_ENTRY_LOCATIONS.includes(
      record.location as ProductStockEntryLocation,
    )
  ) {
    throw new PosError(
      400,
      "La ubicación debe ser simple, vitrina o bodega.",
    );
  }
  return {
    id: normalizeId(record.id, "El id del ingreso de stock"),
    quantity: normalizeStockEntryQuantity(record.quantity),
    location: record.location as ProductStockEntryLocation,
  };
}

export function validateIngredientStockEntryPayload(
  value: unknown,
): IngredientStockEntryInput {
  const record = requireRecord(
    value,
    "El ingreso de stock debe ser un objeto JSON.",
  );
  assertOnlyKeys(record, ["id", "quantity"]);
  return {
    id: normalizeId(record.id, "El id del ingreso de stock"),
    quantity: normalizeStockEntryQuantity(record.quantity),
  };
}

const productFields = [
  "id",
  "sku",
  "name",
  "category",
  "priceClp",
  "stockMode",
  "stock",
  "stockVitrina",
  "stockBodega",
  "active",
  "needsPriceReview",
] as const;

export function validateCreateProduct(value: unknown): CreateProductInput {
  const record = requireRecord(value, "El producto debe ser un objeto JSON.");
  assertOnlyKeys(record, productFields);

  const category = normalizeRequiredText(record.category, "La categoría", 80);
  const inventoryChanges: Partial<ProductInventory> = {};
  if (Object.hasOwn(record, "stockMode")) {
    inventoryChanges.stockMode = normalizeStockMode(record.stockMode);
  }
  if (Object.hasOwn(record, "stock")) {
    inventoryChanges.stock = normalizeStock(record.stock);
  }
  if (Object.hasOwn(record, "stockVitrina")) {
    inventoryChanges.stockVitrina = normalizeStock(
      record.stockVitrina,
      "El stock de vitrina",
    );
  }
  if (Object.hasOwn(record, "stockBodega")) {
    inventoryChanges.stockBodega = normalizeStock(
      record.stockBodega,
      "El stock de bodega",
    );
  }
  const inventory = resolveProductInventory(category, null, inventoryChanges);

  return {
    id:
      record.id === undefined
        ? crypto.randomUUID()
        : normalizeId(record.id, "El id del producto"),
    sku: normalizeSku(record.sku),
    name: normalizeRequiredText(record.name, "El nombre", 120),
    category,
    priceClp: normalizePrice(record.priceClp),
    ...inventory,
    active:
      record.active === undefined
        ? true
        : normalizeBoolean(record.active, "El estado activo"),
    needsPriceReview:
      record.needsPriceReview === undefined
        ? true
        : normalizeBoolean(
            record.needsPriceReview,
            "El indicador de revisión de precio",
          ),
  };
}

const editableProductFields = [
  ...productFields.filter((field) => field !== "id"),
  "expectedUpdatedAt",
];

export function validatePatchProduct(value: unknown): PatchProductInput {
  const record = requireRecord(value, "Los cambios deben ser un objeto JSON.");
  assertOnlyKeys(record, editableProductFields);
  const expectedUpdatedAt = normalizeIsoTimestamp(
    record.expectedUpdatedAt,
    "La versión esperada del producto",
  );
  if (Object.keys(record).length === 1) {
    throw new PosError(400, "Debes enviar al menos un cambio.");
  }

  const changes: PatchProductInput = { expectedUpdatedAt };
  if (Object.hasOwn(record, "sku")) changes.sku = normalizeSku(record.sku);
  if (Object.hasOwn(record, "name")) {
    changes.name = normalizeRequiredText(record.name, "El nombre", 120);
  }
  if (Object.hasOwn(record, "category")) {
    changes.category = normalizeRequiredText(
      record.category,
      "La categoría",
      80,
    );
  }
  if (Object.hasOwn(record, "priceClp")) {
    changes.priceClp = normalizePrice(record.priceClp);
  }
  if (Object.hasOwn(record, "stockMode")) {
    changes.stockMode = normalizeStockMode(record.stockMode);
  }
  if (Object.hasOwn(record, "stock")) {
    changes.stock = normalizeStock(record.stock);
  }
  if (Object.hasOwn(record, "stockVitrina")) {
    changes.stockVitrina = normalizeStock(
      record.stockVitrina,
      "El stock de vitrina",
    );
  }
  if (Object.hasOwn(record, "stockBodega")) {
    changes.stockBodega = normalizeStock(
      record.stockBodega,
      "El stock de bodega",
    );
  }
  if (Object.hasOwn(record, "active")) {
    changes.active = normalizeBoolean(record.active, "El estado activo");
  }
  if (Object.hasOwn(record, "needsPriceReview")) {
    changes.needsPriceReview = normalizeBoolean(
      record.needsPriceReview,
      "El indicador de revisión de precio",
    );
  }
  return changes;
}

export function validatePathId(value: string): string {
  return normalizeId(value, "El id del producto");
}

export function validateSalePathId(value: string): string {
  return normalizeId(value, "El id de la venta");
}

export function validateIngredientPathId(value: string): string {
  return normalizeId(value, "El id del insumo");
}

export function databaseConflict(error: unknown): PosError | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("products.sku") || message.includes("uq_products_sku")) {
    return new PosError(409, "Ya existe un producto con ese SKU.");
  }
  if (message.includes("products.id")) {
    return new PosError(409, "Ya existe un producto con ese id.");
  }
  return null;
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof PosError) {
    return Response.json(
      error.code === null
        ? { error: error.message }
        : { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("POS API error", error);
  return Response.json(
    { error: "No se pudo completar la operación. Intenta nuevamente." },
    { status: 500 },
  );
}

export function noStoreJson(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}
