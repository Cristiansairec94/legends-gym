import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const isoNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(isoNow),
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    sku: text("sku"),
    name: text("name").notNull(),
    category: text("category").notNull(),
    priceClp: integer("price_clp").notNull(),
    stockMode: text("stock_mode").notNull().default("untracked"),
    stock: integer("stock"),
    stockVitrina: integer("stock_vitrina"),
    stockBodega: integer("stock_bodega"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    catalogManaged: integer("catalog_managed", { mode: "boolean" })
      .notNull()
      .default(false),
    needsPriceReview: integer("needs_price_review", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [
    uniqueIndex("uq_products_sku").on(table.sku),
    index("idx_products_active_category").on(
      table.active,
      table.category,
      table.name,
    ),
    check("products_price_clp_positive", sql`${table.priceClp} > 0`),
    check(
      "products_stock_mode_allowed",
      sql`${table.stockMode} IN ('untracked', 'simple', 'split')`,
    ),
    check(
      "products_stock_shape_valid",
      sql`(
        ${table.stockMode} = 'untracked'
        AND ${table.stock} IS NULL
        AND ${table.stockVitrina} IS NULL
        AND ${table.stockBodega} IS NULL
      ) OR (
        ${table.stockMode} = 'simple'
        AND ${table.stock} IS NOT NULL
        AND ${table.stock} >= 0
        AND ${table.stockVitrina} IS NULL
        AND ${table.stockBodega} IS NULL
      ) OR (
        ${table.stockMode} = 'split'
        AND ${table.stock} IS NULL
        AND ${table.stockVitrina} IS NOT NULL
        AND ${table.stockVitrina} >= 0
        AND ${table.stockBodega} IS NOT NULL
        AND ${table.stockBodega} >= 0
      )`,
    ),
  ],
);

export const ingredients = sqliteTable(
  "ingredients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    unit: text("unit").notNull(),
    stock: integer("stock").notNull(),
    revision: integer("revision").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [
    index("idx_ingredients_name").on(table.name),
    check("ingredients_stock_nonnegative", sql`${table.stock} >= 0`),
    check("ingredients_revision_nonnegative", sql`${table.revision} >= 0`),
  ],
);

export const inventoryStockEntries = sqliteTable(
  "inventory_stock_entries",
  {
    id: text("id").primaryKey(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    location: text("location").notNull(),
    quantityBefore: integer("quantity_before").notNull(),
    quantityAdded: integer("quantity_added").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    actorRole: text("actor_role").notNull(),
    operationToken: text("operation_token").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    index("idx_inventory_stock_entries_item_created").on(
      table.itemType,
      table.itemId,
      table.createdAt,
    ),
    index("idx_inventory_stock_entries_created_at").on(table.createdAt),
    check(
      "inventory_stock_entries_shape_valid",
      sql`(
          (${table.itemType} = 'product'
            AND ${table.location} IN ('simple', 'vitrina', 'bodega'))
          OR (${table.itemType} = 'ingredient'
            AND ${table.location} = 'ingredient')
        )
        AND length(trim(${table.itemId})) BETWEEN 1 AND 100
        AND length(trim(${table.itemName})) BETWEEN 1 AND 120
        AND ${table.quantityBefore} BETWEEN 0 AND 9007199254740991
        AND ${table.quantityAdded} BETWEEN 1 AND 1000000
        AND ${table.quantityAfter} = ${table.quantityBefore} + ${table.quantityAdded}
        AND ${table.quantityAfter} BETWEEN 1 AND 9007199254740991
        AND ${table.actorRole} = 'admin'
        AND length(${table.operationToken}) BETWEEN 1 AND 100`,
    ),
  ],
);

export const productIngredients = sqliteTable(
  "product_ingredients",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.ingredientId] }),
    index("idx_product_ingredients_ingredient_id").on(table.ingredientId),
    check(
      "product_ingredients_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
  ],
);

export const shiftSessions = sqliteTable(
  "shift_sessions",
  {
    id: text("id").primaryKey(),
    businessDate: text("business_date").notNull(),
    shift: text("shift").notNull(),
    responsible: text("responsible").notNull(),
    openingCashClp: integer("opening_cash_clp").notNull(),
    activityRevision: integer("activity_revision").notNull().default(0),
    status: text("status").notNull().default("open"),
    activeSlot: integer("active_slot"),
    openedAt: text("opened_at").notNull().default(isoNow),
    closedAt: text("closed_at"),
    closureId: text("closure_id"),
  },
  (table) => [
    uniqueIndex("uq_shift_sessions_active_slot").on(table.activeSlot),
    index("idx_shift_sessions_opened_at").on(table.openedAt),
    check(
      "shift_sessions_context_valid",
      sql`${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.shift} IN ('am', 'pm')
        AND length(trim(${table.responsible})) BETWEEN 1 AND 100`,
    ),
    check(
      "shift_sessions_counters_valid",
      sql`${table.openingCashClp} >= 0 AND ${table.activityRevision} >= 0`,
    ),
    check(
      "shift_sessions_state_valid",
      sql`(
        ${table.status} = 'open'
        AND ${table.activeSlot} = 1
        AND ${table.closedAt} IS NULL
        AND ${table.closureId} IS NULL
      ) OR (
        ${table.status} = 'closed'
        AND ${table.activeSlot} IS NULL
        AND ${table.closedAt} IS NOT NULL
        AND ${table.closureId} IS NOT NULL
      )`,
    ),
  ],
);

export const sales = sqliteTable(
  "sales",
  {
    id: text("id").primaryKey(),
    createdAt: text("created_at").notNull().default(isoNow),
    businessDate: text("business_date"),
    shift: text("shift"),
    shiftSessionId: text("shift_session_id").references(
      () => shiftSessions.id,
      { onDelete: "restrict" },
    ),
    paymentStatus: text("payment_status").notNull().default("paid"),
    checkoutMethod: text("checkout_method").notNull(),
    paymentMethod: text("payment_method"),
    debtNote: text("debt_note"),
    debtorCollaborator: text("debtor_collaborator"),
    paidAt: text("paid_at"),
    settlementId: text("settlement_id"),
    seller: text("seller"),
    totalClp: integer("total_clp").notNull(),
  },
  (table) => [
    index("idx_sales_created_at").on(table.createdAt),
    index("idx_sales_business_date_shift").on(table.businessDate, table.shift),
    index("idx_sales_shift_session_id").on(table.shiftSessionId),
    index("idx_sales_paid_at").on(table.paidAt),
    index("idx_sales_pending_created_at")
      .on(table.createdAt)
      .where(sql`${table.paymentStatus} = 'pending'`),
    uniqueIndex("uq_sales_settlement_id").on(table.settlementId),
    check(
      "sales_payment_status_allowed",
      sql`${table.paymentStatus} IN ('paid', 'pending', 'verification_pending')`,
    ),
    check(
      "sales_shift_context_valid",
      sql`(
        ${table.businessDate} IS NULL AND ${table.shift} IS NULL
      ) OR (
        ${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.shift} IN ('am', 'pm')
      )`,
    ),
    check(
      "sales_checkout_method_allowed",
      sql`${table.checkoutMethod} IN ('efectivo', 'tarjeta', 'transferencia', 'pendiente', 'colaborador')`,
    ),
    check(
      "sales_payment_state_valid",
      sql`(
        ${table.paymentStatus} = 'verification_pending'
        AND ${table.checkoutMethod} = 'transferencia'
        AND ${table.paymentMethod} IS NULL
        AND ${table.debtNote} IS NULL
        AND ${table.debtorCollaborator} IS NULL
        AND ${table.paidAt} IS NULL
        AND ${table.settlementId} IS NULL
      ) OR (
        ${table.paymentStatus} = 'pending'
        AND ${table.paymentMethod} IS NULL
        AND ${table.paidAt} IS NULL
        AND ${table.settlementId} IS NULL
        AND (
          (
            ${table.checkoutMethod} = 'pendiente'
            AND ${table.debtNote} IS NOT NULL
            AND length(trim(${table.debtNote})) BETWEEN 1 AND 500
            AND ${table.debtorCollaborator} IS NULL
          ) OR (
            ${table.checkoutMethod} = 'colaborador'
            AND ${table.debtorCollaborator} IS NOT NULL
            AND length(trim(${table.debtorCollaborator})) BETWEEN 1 AND 100
            AND (
              ${table.debtNote} IS NULL
              OR length(trim(${table.debtNote})) BETWEEN 1 AND 500
            )
          )
        )
      ) OR (
        ${table.paymentStatus} = 'paid'
        AND ${table.paymentMethod} IS NOT NULL
        AND ${table.paymentMethod} IN ('efectivo', 'tarjeta', 'debito', 'credito', 'transferencia')
        AND ${table.paidAt} IS NOT NULL
        AND (
          (
            ${table.checkoutMethod} IN ('efectivo', 'tarjeta', 'transferencia')
            AND ${table.debtNote} IS NULL
            AND ${table.debtorCollaborator} IS NULL
            AND ${table.settlementId} IS NULL
          )
          OR (
            ${table.checkoutMethod} = 'pendiente'
            AND ${table.debtNote} IS NOT NULL
            AND length(trim(${table.debtNote})) BETWEEN 1 AND 500
            AND ${table.debtorCollaborator} IS NULL
            AND ${table.settlementId} IS NOT NULL
          )
          OR (
            ${table.checkoutMethod} = 'colaborador'
            AND ${table.debtorCollaborator} IS NOT NULL
            AND length(trim(${table.debtorCollaborator})) BETWEEN 1 AND 100
            AND (
              ${table.debtNote} IS NULL
              OR length(trim(${table.debtNote})) BETWEEN 1 AND 500
            )
            AND ${table.settlementId} IS NOT NULL
          )
        )
      )`,
    ),
    check("sales_total_clp_positive", sql`${table.totalClp} > 0`),
  ],
);

export const transferValidations = sqliteTable(
  "transfer_validations",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    shiftSessionId: text("shift_session_id")
      .notNull()
      .references(() => shiftSessions.id, { onDelete: "restrict" }),
    validatedAt: text("validated_at").notNull().default(isoNow),
    validatorRole: text("validator_role").notNull(),
    validatedBy: text("validated_by").notNull(),
    emailReference: text("email_reference").notNull(),
    amountClp: integer("amount_clp").notNull(),
  },
  (table) => [
    uniqueIndex("uq_transfer_validations_sale_id").on(table.saleId),
    index("idx_transfer_validations_validated_at").on(table.validatedAt),
    check(
      "transfer_validations_shape_valid",
      sql`${table.validatorRole} IN ('admin', 'sales')
        AND length(trim(${table.validatedBy})) BETWEEN 1 AND 100
        AND length(trim(${table.emailReference})) BETWEEN 1 AND 200
        AND ${table.amountClp} > 0`,
    ),
  ],
);

export const salePayments = sqliteTable(
  "sale_payments",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(isoNow),
    businessDate: text("business_date"),
    shift: text("shift"),
    shiftSessionId: text("shift_session_id").references(
      () => shiftSessions.id,
      { onDelete: "restrict" },
    ),
    paymentMethod: text("payment_method").notNull(),
    amountClp: integer("amount_clp").notNull(),
    receivedBy: text("received_by"),
    kind: text("kind").notNull(),
  },
  (table) => [
    index("idx_sale_payments_sale_id").on(table.saleId),
    index("idx_sale_payments_created_at").on(table.createdAt),
    uniqueIndex("uq_sale_payments_direct_sale_id")
      .on(table.saleId)
      .where(sql`${table.kind} = 'direct'`),
    index("idx_sale_payments_business_date_shift").on(
      table.businessDate,
      table.shift,
    ),
    index("idx_sale_payments_shift_session_id").on(table.shiftSessionId),
    check(
      "sale_payments_context_valid",
      sql`(
        ${table.businessDate} IS NULL
        AND ${table.shift} IS NULL
        AND ${table.receivedBy} IS NULL
      ) OR (
        ${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.shift} IN ('am', 'pm')
        AND ${table.receivedBy} IS NOT NULL
        AND length(trim(${table.receivedBy})) BETWEEN 1 AND 100
      )`,
    ),
    check(
      "sale_payments_method_allowed",
      sql`${table.paymentMethod} IN ('efectivo', 'tarjeta', 'transferencia')`,
    ),
    check("sale_payments_amount_positive", sql`${table.amountClp} > 0`),
    check(
      "sale_payments_kind_allowed",
      sql`${table.kind} IN ('direct', 'settlement')`,
    ),
  ],
);

export const saleInventorySnapshots = sqliteTable(
  "sale_inventory_snapshots",
  {
    saleId: text("sale_id")
      .primaryKey()
      .references(() => sales.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    check("sale_inventory_snapshots_version_valid", sql`${table.version} = 1`),
  ],
);

export const saleInventoryConsumptions = sqliteTable(
  "sale_inventory_consumptions",
  {
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    location: text("location").notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    primaryKey({
      columns: [table.saleId, table.itemType, table.itemId, table.location],
    }),
    index("idx_sale_inventory_consumptions_sale_id").on(table.saleId),
    check(
      "sale_inventory_consumptions_shape_valid",
      sql`(
          (${table.itemType} = 'product'
            AND ${table.location} IN ('simple', 'vitrina'))
          OR (${table.itemType} = 'ingredient'
            AND ${table.location} = 'ingredient')
        )
        AND length(trim(${table.itemId})) BETWEEN 1 AND 100
        AND length(trim(${table.itemName})) BETWEEN 1 AND 120
        AND ${table.quantity} BETWEEN 1 AND 1000000`,
    ),
  ],
);

export const saleVoids = sqliteTable(
  "sale_voids",
  {
    id: text("id").primaryKey(),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    shiftSessionId: text("shift_session_id")
      .notNull()
      .references(() => shiftSessions.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(isoNow),
    actorRole: text("actor_role").notNull(),
    actorName: text("actor_name").notNull(),
    reason: text("reason").notNull(),
    expectedActivityRevision: integer("expected_activity_revision").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    originalTotalClp: integer("original_total_clp").notNull(),
    originalPaidClp: integer("original_paid_clp").notNull(),
    originalBalanceClp: integer("original_balance_clp").notNull(),
    inventorySource: text("inventory_source").notNull(),
    inventoryRestorationJson: text("inventory_restoration_json").notNull(),
    paymentSnapshotJson: text("payment_snapshot_json").notNull(),
  },
  (table) => [
    uniqueIndex("uq_sale_voids_sale_id").on(table.saleId),
    index("idx_sale_voids_created_at").on(table.createdAt),
    index("idx_sale_voids_shift_session_id").on(table.shiftSessionId),
    check(
      "sale_voids_shape_valid",
      sql`${table.actorRole} = 'admin'
        AND length(trim(${table.actorName})) BETWEEN 1 AND 100
        AND length(trim(${table.reason})) BETWEEN 1 AND 500
        AND ${table.expectedActivityRevision} >= 0
        AND length(${table.requestFingerprint}) BETWEEN 1 AND 1000
        AND ${table.originalTotalClp} > 0
        AND ${table.originalPaidClp} >= 0
        AND ${table.originalPaidClp} <= ${table.originalTotalClp}
        AND ${table.originalBalanceClp} = ${table.originalTotalClp} - ${table.originalPaidClp}
        AND ${table.inventorySource} IN ('snapshot', 'derived_legacy')
        AND json_valid(${table.inventoryRestorationJson})
        AND json_valid(${table.paymentSnapshotJson})`,
    ),
  ],
);

export const cashClosures = sqliteTable(
  "cash_closures",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").references(() => shiftSessions.id, {
      onDelete: "restrict",
    }),
    sessionActivityRevision: integer("session_activity_revision"),
    requestFingerprint: text("request_fingerprint"),
    businessDate: text("business_date").notNull(),
    shift: text("shift").notNull(),
    responsible: text("responsible").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    expectedCashClp: integer("expected_cash_clp").notNull(),
    openingCashClp: integer("opening_cash_clp"),
    cashMovementsClp: integer("cash_movements_clp"),
    expectedCardClp: integer("expected_card_clp").notNull(),
    expectedTransferClp: integer("expected_transfer_clp").notNull(),
    expectedCollectedClp: integer("expected_collected_clp").notNull(),
    totalSalesClp: integer("total_sales_clp").notNull(),
    salesCount: integer("sales_count").notNull(),
    pendingCustomerClp: integer("pending_customer_clp").notNull(),
    pendingCustomerCount: integer("pending_customer_count"),
    collaboratorClp: integer("collaborator_clp").notNull(),
    collaboratorCount: integer("collaborator_count"),
    countedCashClp: integer("counted_cash_clp").notNull(),
    differenceClp: integer("difference_clp").notNull(),
    countedCardClp: integer("counted_card_clp"),
    differenceCardClp: integer("difference_card_clp"),
    countedTransferClp: integer("counted_transfer_clp"),
    differenceTransferClp: integer("difference_transfer_clp"),
    countedCollectedClp: integer("counted_collected_clp"),
    differenceCollectedClp: integer("difference_collected_clp"),
    financialDifferenceReason: text("financial_difference_reason"),
    closureContractVersion: integer("closure_contract_version"),
    expensesClp: integer("expenses_clp").notNull().default(0),
    adjustedExpectedCashClp: integer("adjusted_expected_cash_clp"),
    adjustedDifferenceClp: integer("adjusted_difference_clp"),
    adjustedDifferenceCollectedClp: integer(
      "adjusted_difference_collected_clp",
    ),
    handoffFinancialDifferenceReason: text(
      "handoff_financial_difference_reason",
    ),
    handoffComments: text("handoff_comments"),
    cashReconciled: integer("cash_reconciled", { mode: "boolean" }),
    cardReconciled: integer("card_reconciled", { mode: "boolean" }),
    transferReconciled: integer("transfer_reconciled", { mode: "boolean" }),
    pendingCustomerReviewed: integer("pending_customer_reviewed", {
      mode: "boolean",
    }),
    collaboratorReviewed: integer("collaborator_reviewed", {
      mode: "boolean",
    }),
    inventoryCountConfirmed: integer("inventory_count_confirmed", {
      mode: "boolean",
    }),
    checklistVersion: integer("checklist_version"),
    unassignedSalesClp: integer("unassigned_sales_clp").notNull(),
    unassignedSalesCount: integer("unassigned_sales_count").notNull(),
    unassignedPaymentsClp: integer("unassigned_payments_clp").notNull(),
    unassignedPaymentsCount: integer("unassigned_payments_count").notNull(),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("uq_cash_closures_session_id").on(table.sessionId),
    index("idx_cash_closures_created_at").on(table.createdAt),
    check(
      "cash_closures_context_valid",
      sql`${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.shift} IN ('am', 'pm')
        AND length(trim(${table.responsible})) BETWEEN 1 AND 100`,
    ),
    check(
      "cash_closures_nonnegative",
      sql`${table.expectedCashClp} >= 0
        AND ${table.expectedCardClp} >= 0
        AND ${table.expectedTransferClp} >= 0
        AND ${table.expectedCollectedClp} >= 0
        AND ${table.totalSalesClp} >= 0
        AND ${table.salesCount} >= 0
        AND ${table.pendingCustomerClp} >= 0
        AND ${table.collaboratorClp} >= 0
        AND ${table.countedCashClp} >= 0
        AND ${table.unassignedSalesClp} >= 0
        AND ${table.unassignedSalesCount} >= 0
        AND ${table.unassignedPaymentsClp} >= 0
        AND ${table.unassignedPaymentsCount} >= 0`,
    ),
    check(
      "cash_closures_collected_total_valid",
      sql`${table.expectedCollectedClp} = ${table.expectedCashClp} + ${table.expectedCardClp} + ${table.expectedTransferClp}`,
    ),
    check(
      "cash_closures_difference_valid",
      sql`${table.differenceClp} = ${table.countedCashClp} - ${table.expectedCashClp}`,
    ),
    check(
      "cash_closures_formal_state_valid",
      sql`(
        ${table.sessionId} IS NULL
        AND ${table.sessionActivityRevision} IS NULL
        AND ${table.requestFingerprint} IS NULL
        AND ${table.openingCashClp} IS NULL
        AND ${table.cashMovementsClp} IS NULL
        AND ${table.pendingCustomerCount} IS NULL
        AND ${table.collaboratorCount} IS NULL
        AND ${table.countedCardClp} IS NULL
        AND ${table.differenceCardClp} IS NULL
        AND ${table.countedTransferClp} IS NULL
        AND ${table.differenceTransferClp} IS NULL
        AND ${table.countedCollectedClp} IS NULL
        AND ${table.differenceCollectedClp} IS NULL
        AND ${table.financialDifferenceReason} IS NULL
        AND ${table.cashReconciled} IS NULL
        AND ${table.cardReconciled} IS NULL
        AND ${table.transferReconciled} IS NULL
        AND ${table.pendingCustomerReviewed} IS NULL
        AND ${table.collaboratorReviewed} IS NULL
        AND ${table.inventoryCountConfirmed} IS NULL
        AND ${table.checklistVersion} IS NULL
      ) OR (
        ${table.sessionId} IS NOT NULL
        AND ${table.sessionActivityRevision} >= 0
        AND length(${table.requestFingerprint}) = 64
        AND ${table.openingCashClp} >= 0
        AND ${table.cashMovementsClp} >= 0
        AND ${table.expectedCashClp} = ${table.openingCashClp} + ${table.cashMovementsClp}
        AND ${table.pendingCustomerCount} >= 0
        AND ${table.collaboratorCount} >= 0
        AND ${table.countedCardClp} >= 0
        AND ${table.differenceCardClp} = ${table.countedCardClp} - ${table.expectedCardClp}
        AND ${table.countedTransferClp} >= 0
        AND ${table.differenceTransferClp} = ${table.countedTransferClp} - ${table.expectedTransferClp}
        AND ${table.countedCollectedClp} = ${table.countedCashClp} + ${table.countedCardClp} + ${table.countedTransferClp}
        AND ${table.differenceCollectedClp} = ${table.countedCollectedClp} - ${table.expectedCollectedClp}
        AND ${table.differenceCollectedClp} = ${table.differenceClp} + ${table.differenceCardClp} + ${table.differenceTransferClp}
        AND ${table.cashReconciled} = 1
        AND ${table.cardReconciled} = 1
        AND ${table.transferReconciled} = 1
        AND ${table.pendingCustomerReviewed} = 1
        AND ${table.collaboratorReviewed} = 1
        AND ${table.inventoryCountConfirmed} = 1
        AND ${table.checklistVersion} = 1
        AND (
          (
            ${table.differenceClp} = 0
            AND ${table.differenceCardClp} = 0
            AND ${table.differenceTransferClp} = 0
            AND ${table.financialDifferenceReason} IS NULL
          ) OR (
            (
              ${table.differenceClp} <> 0
              OR ${table.differenceCardClp} <> 0
              OR ${table.differenceTransferClp} <> 0
            )
            AND ${table.financialDifferenceReason} IS NOT NULL
            AND length(trim(${table.financialDifferenceReason})) BETWEEN 1 AND 500
          )
        )
      )`,
    ),
  ],
);

export const cashClosureExpenses = sqliteTable(
  "cash_closure_expenses",
  {
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    id: text("id").notNull(),
    description: text("description").notNull(),
    amountClp: integer("amount_clp").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.closureId, table.id] }),
    check(
      "cash_closure_expenses_shape_valid",
      sql`length(trim(${table.id})) BETWEEN 1 AND 100
        AND length(trim(${table.description})) BETWEEN 1 AND 200
        AND ${table.amountClp} > 0`,
    ),
  ],
);

export const cashClosureValidations = sqliteTable(
  "cash_closure_validations",
  {
    closureId: text("closure_id")
      .primaryKey()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    validatedAt: text("validated_at").notNull().default(isoNow),
    comment: text("comment"),
    revisionNumber: integer("revision_number").notNull().default(0),
    requestFingerprint: text("request_fingerprint"),
  },
  (table) => [
    check(
      "cash_closure_validations_comment_valid",
      sql`${table.comment} IS NULL OR length(trim(${table.comment})) BETWEEN 1 AND 1000`,
    ),
  ],
);

export const cashClosureRevisions = sqliteTable(
  "cash_closure_revisions",
  {
    id: text("id").primaryKey(),
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    expectedRevisionNumber: integer("expected_revision_number").notNull(),
    expectedAddedSalesCount: integer("expected_added_sales_count").notNull(),
    expectedInventoryLineCount: integer("expected_inventory_line_count").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull().default(isoNow),
    includedSalesClp: integer("included_sales_clp").notNull(),
    includedSalesCount: integer("included_sales_count").notNull(),
    openingCashClp: integer("opening_cash_clp").notNull(),
    cashCollectedClp: integer("cash_collected_clp").notNull(),
    cardCollectedClp: integer("card_collected_clp").notNull(),
    transferCollectedClp: integer("transfer_collected_clp").notNull(),
    totalCollectedClp: integer("total_collected_clp").notNull(),
    expectedCashClp: integer("expected_cash_clp").notNull(),
    expectedCollectedClp: integer("expected_collected_clp").notNull(),
    expensesClp: integer("expenses_clp").notNull(),
    adjustedExpectedCashClp: integer("adjusted_expected_cash_clp").notNull(),
    countedCashClp: integer("counted_cash_clp").notNull(),
    countedCardClp: integer("counted_card_clp").notNull(),
    countedTransferClp: integer("counted_transfer_clp").notNull(),
    countedCollectedClp: integer("counted_collected_clp").notNull(),
    differenceCashClp: integer("difference_cash_clp").notNull(),
    differenceCardClp: integer("difference_card_clp").notNull(),
    differenceTransferClp: integer("difference_transfer_clp").notNull(),
    differenceCollectedClp: integer("difference_collected_clp").notNull(),
  },
  (table) => [
    uniqueIndex("uq_cash_closure_revisions_number").on(
      table.closureId,
      table.revisionNumber,
    ),
    index("idx_cash_closure_revisions_closure").on(
      table.closureId,
      table.createdAt,
    ),
    check(
      "cash_closure_revisions_shape_valid",
      sql`${table.revisionNumber} = ${table.expectedRevisionNumber} + 1
        AND ${table.revisionNumber} BETWEEN 1 AND 50
        AND ${table.expectedRevisionNumber} >= 0
        AND ${table.expectedAddedSalesCount} BETWEEN 0 AND 5
        AND ${table.expectedInventoryLineCount} BETWEEN 0 AND 90
        AND length(${table.requestFingerprint}) = 64
        AND length(trim(${table.reason})) BETWEEN 1 AND 1000
        AND ${table.includedSalesClp} >= 0
        AND ${table.includedSalesCount} >= 0
        AND ${table.openingCashClp} >= 0
        AND ${table.cashCollectedClp} >= 0
        AND ${table.cardCollectedClp} >= 0
        AND ${table.transferCollectedClp} >= 0
        AND ${table.totalCollectedClp} = ${table.cashCollectedClp} + ${table.cardCollectedClp} + ${table.transferCollectedClp}
        AND ${table.expectedCashClp} = ${table.openingCashClp} + ${table.cashCollectedClp}
        AND ${table.expectedCollectedClp} = ${table.openingCashClp} + ${table.totalCollectedClp}
        AND ${table.expensesClp} >= 0
        AND ${table.adjustedExpectedCashClp} = ${table.expectedCashClp} - ${table.expensesClp}
        AND ${table.adjustedExpectedCashClp} >= 0
        AND ${table.countedCashClp} >= 0
        AND ${table.countedCardClp} >= 0
        AND ${table.countedTransferClp} >= 0
        AND ${table.countedCollectedClp} = ${table.countedCashClp} + ${table.countedCardClp} + ${table.countedTransferClp}
        AND ${table.differenceCashClp} = ${table.countedCashClp} - ${table.adjustedExpectedCashClp}
        AND ${table.differenceCardClp} = ${table.countedCardClp} - ${table.cardCollectedClp}
        AND ${table.differenceTransferClp} = ${table.countedTransferClp} - ${table.transferCollectedClp}
        AND ${table.differenceCollectedClp} = ${table.countedCollectedClp} - (${table.expectedCollectedClp} - ${table.expensesClp})`,
    ),
  ],
);

export const cashClosureRevisionSeals = sqliteTable(
  "cash_closure_revision_seals",
  {
    revisionId: text("revision_id")
      .primaryKey()
      .references(() => cashClosureRevisions.id, { onDelete: "restrict" }),
    sealedAt: text("sealed_at").notNull().default(isoNow),
    requestFingerprint: text("request_fingerprint").notNull(),
  },
  (table) => [
    check(
      "cash_closure_revision_seals_fingerprint_valid",
      sql`length(${table.requestFingerprint}) = 64`,
    ),
  ],
);

export const cashClosureRevisionSales = sqliteTable(
  "cash_closure_revision_sales",
  {
    revisionId: text("revision_id")
      .notNull()
      .references(() => cashClosureRevisions.id, { onDelete: "restrict" }),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
    paymentMethod: text("payment_method").notNull(),
    totalClp: integer("total_clp").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.revisionId, table.saleId] }),
    uniqueIndex("uq_cash_closure_revision_sales_sale").on(table.saleId),
    check(
      "cash_closure_revision_sales_shape_valid",
      sql`${table.paymentMethod} IN ('efectivo', 'tarjeta', 'transferencia')
        AND ${table.totalClp} > 0`,
    ),
  ],
);

export const cashClosureRevisionInventory = sqliteTable(
  "cash_closure_revision_inventory",
  {
    revisionId: text("revision_id")
      .notNull()
      .references(() => cashClosureRevisions.id, { onDelete: "restrict" }),
    itemKey: text("item_key").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    unit: text("unit").notNull(),
    location: text("location").notNull(),
    previousExpectedQuantity: integer("previous_expected_quantity").notNull(),
    expectedQuantity: integer("expected_quantity").notNull(),
    saleConsumptionQuantity: integer("sale_consumption_quantity").notNull(),
    previousCountedQuantity: integer("previous_counted_quantity").notNull(),
    countedQuantity: integer("counted_quantity").notNull(),
    countedDeltaQuantity: integer("counted_delta_quantity").notNull(),
    differenceQuantity: integer("difference_quantity").notNull(),
    liveQuantityBefore: integer("live_quantity_before"),
    liveVersionTokenBefore: text("live_version_token_before"),
    liveQuantityAfter: integer("live_quantity_after"),
    liveVersionTokenAfter: text("live_version_token_after"),
  },
  (table) => [
    primaryKey({ columns: [table.revisionId, table.itemKey] }),
    index("idx_cash_closure_revision_inventory_item").on(
      table.itemType,
      table.itemId,
    ),
    check(
      "cash_closure_revision_inventory_shape_valid",
      sql`${table.itemType} IN ('product', 'ingredient')
        AND ${table.location} IN ('simple', 'vitrina', 'ingredient')
        AND ${table.previousExpectedQuantity} >= 0
        AND ${table.expectedQuantity} >= 0
        AND ${table.saleConsumptionQuantity} >= 0
        AND ${table.expectedQuantity} = ${table.previousExpectedQuantity} - ${table.saleConsumptionQuantity}
        AND ${table.previousCountedQuantity} >= 0
        AND ${table.countedQuantity} >= 0
        AND ${table.countedDeltaQuantity} = ${table.countedQuantity} - ${table.previousCountedQuantity}
        AND ${table.differenceQuantity} = ${table.countedQuantity} - ${table.expectedQuantity}
        AND (
          (${table.countedDeltaQuantity} = 0
            AND ${table.liveQuantityBefore} IS NULL
            AND ${table.liveVersionTokenBefore} IS NULL
            AND ${table.liveQuantityAfter} IS NULL
            AND ${table.liveVersionTokenAfter} IS NULL)
          OR
          (${table.countedDeltaQuantity} <> 0
            AND ${table.liveQuantityBefore} >= 0
            AND length(${table.liveVersionTokenBefore}) BETWEEN 1 AND 100
            AND ${table.liveQuantityAfter} = ${table.liveQuantityBefore} + ${table.countedDeltaQuantity}
            AND ${table.liveQuantityAfter} >= 0
            AND length(${table.liveVersionTokenAfter}) BETWEEN 1 AND 100)
        )`,
    ),
  ],
);

export const cashClosureInventory = sqliteTable(
  "cash_closure_inventory",
  {
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    itemKey: text("item_key").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    unit: text("unit").notNull(),
    location: text("location").notNull(),
    expectedVersionToken: text("expected_version_token").notNull(),
    expectedQuantity: integer("expected_quantity").notNull(),
    countedQuantity: integer("counted_quantity").notNull(),
    differenceQuantity: integer("difference_quantity").notNull(),
    reason: text("reason"),
    reasonCategory: text("reason_category"),
    incidentComment: text("incident_comment"),
  },
  (table) => [
    primaryKey({ columns: [table.closureId, table.itemKey] }),
    index("idx_cash_closure_inventory_item").on(
      table.itemType,
      table.itemId,
    ),
    check(
      "cash_closure_inventory_shape_valid",
      sql`${table.itemType} IN ('product', 'ingredient')
        AND ${table.location} IN ('simple', 'vitrina', 'bodega', 'ingredient')
        AND length(${table.expectedVersionToken}) BETWEEN 1 AND 100
        AND ${table.expectedQuantity} >= 0
        AND ${table.countedQuantity} >= 0
        AND ${table.differenceQuantity} = ${table.countedQuantity} - ${table.expectedQuantity}
        AND (
          (${table.differenceQuantity} = 0 AND ${table.reason} IS NULL)
          OR (
            ${table.differenceQuantity} <> 0
            AND ${table.reason} IS NOT NULL
            AND length(trim(${table.reason})) BETWEEN 1 AND 500
          )
        )`,
    ),
  ],
);

export const closureIncidentSettings = sqliteTable(
  "closure_incident_settings",
  {
    id: text("id").primaryKey(),
    moneyRedThresholdClp: integer("money_red_threshold_clp")
      .notNull()
      .default(1),
    multipleProductRedCount: integer("multiple_product_red_count")
      .notNull()
      .default(2),
    highValueProductClp: integer("high_value_product_clp")
      .notNull()
      .default(10000),
    recurrenceWindowDays: integer("recurrence_window_days")
      .notNull()
      .default(30),
    recurrenceRedCount: integer("recurrence_red_count")
      .notNull()
      .default(2),
    reminderHours: integer("reminder_hours").notNull().default(24),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [
    check(
      "closure_incident_settings_shape_valid",
      sql`${table.id} = 'default'
        AND ${table.moneyRedThresholdClp} >= 1
        AND ${table.multipleProductRedCount} BETWEEN 1 AND 90
        AND ${table.highValueProductClp} >= 1
        AND ${table.recurrenceWindowDays} BETWEEN 1 AND 365
        AND ${table.recurrenceRedCount} BETWEEN 2 AND 100
        AND ${table.reminderHours} BETWEEN 1 AND 720`,
    ),
  ],
);

export const closureIncidents = sqliteTable(
  "closure_incidents",
  {
    id: text("id").primaryKey(),
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(isoNow),
    businessDate: text("business_date").notNull(),
    shift: text("shift").notNull(),
    responsible: text("responsible").notNull(),
    level: text("level").notNull(),
    classificationReason: text("classification_reason").notNull(),
    cashDifferenceClp: integer("cash_difference_clp").notNull(),
    cardDifferenceClp: integer("card_difference_clp").notNull(),
    transferDifferenceClp: integer("transfer_difference_clp").notNull(),
    totalDifferenceClp: integer("total_difference_clp").notNull(),
    inventoryDifferenceCount: integer("inventory_difference_count").notNull(),
    estimatedValueClp: integer("estimated_value_clp").notNull(),
    unvaluedItemCount: integer("unvalued_item_count").notNull(),
    priorResponsibleIncidentCount: integer("prior_responsible_incident_count")
      .notNull(),
    highestPriorProductIncidentCount: integer(
      "highest_prior_product_incident_count",
    ).notNull(),
    moneyRedThresholdClp: integer("money_red_threshold_clp").notNull(),
    multipleProductRedCount: integer("multiple_product_red_count").notNull(),
    highValueProductClp: integer("high_value_product_clp").notNull(),
    recurrenceWindowDays: integer("recurrence_window_days").notNull(),
    recurrenceRedCount: integer("recurrence_red_count").notNull(),
  },
  (table) => [
    uniqueIndex("uq_closure_incidents_closure_id").on(table.closureId),
    index("idx_closure_incidents_created_at").on(table.createdAt),
    index("idx_closure_incidents_responsible_created").on(
      table.responsible,
      table.createdAt,
    ),
    index("idx_closure_incidents_level_created").on(
      table.level,
      table.createdAt,
    ),
    check(
      "closure_incidents_shape_valid",
      sql`${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.shift} IN ('am', 'pm')
        AND length(trim(${table.responsible})) BETWEEN 1 AND 100
        AND ${table.level} IN ('yellow', 'red')
        AND length(trim(${table.classificationReason})) BETWEEN 1 AND 500
        AND ${table.totalDifferenceClp} = ${table.cashDifferenceClp}
          + ${table.cardDifferenceClp} + ${table.transferDifferenceClp}
        AND ${table.inventoryDifferenceCount} >= 0
        AND ${table.estimatedValueClp} >= 0
        AND ${table.unvaluedItemCount} >= 0
        AND ${table.priorResponsibleIncidentCount} >= 0
        AND ${table.highestPriorProductIncidentCount} >= 0
        AND ${table.moneyRedThresholdClp} >= 1
        AND ${table.multipleProductRedCount} BETWEEN 1 AND 90
        AND ${table.highValueProductClp} >= 1
        AND ${table.recurrenceWindowDays} BETWEEN 1 AND 365
        AND ${table.recurrenceRedCount} BETWEEN 2 AND 100
        AND (
          ${table.cashDifferenceClp} <> 0
          OR ${table.cardDifferenceClp} <> 0
          OR ${table.transferDifferenceClp} <> 0
          OR ${table.inventoryDifferenceCount} > 0
        )`,
    ),
  ],
);

export const closureIncidentItems = sqliteTable(
  "closure_incident_items",
  {
    incidentId: text("incident_id")
      .notNull()
      .references(() => closureIncidents.id, { onDelete: "restrict" }),
    itemKey: text("item_key").notNull(),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    itemName: text("item_name").notNull(),
    unit: text("unit").notNull(),
    location: text("location").notNull(),
    expectedQuantity: integer("expected_quantity").notNull(),
    countedQuantity: integer("counted_quantity").notNull(),
    differenceQuantity: integer("difference_quantity").notNull(),
    reasonCategory: text("reason_category").notNull(),
    initialComment: text("initial_comment").notNull(),
    adjustmentApplied: integer("adjustment_applied").notNull(),
    unitValueClp: integer("unit_value_clp"),
    estimatedValueClp: integer("estimated_value_clp"),
    highValue: integer("high_value", { mode: "boolean" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.incidentId, table.itemKey] }),
    index("idx_closure_incident_items_product").on(
      table.itemType,
      table.itemId,
      table.incidentId,
    ),
    check(
      "closure_incident_items_shape_valid",
      sql`${table.itemType} IN ('product', 'ingredient')
        AND ${table.location} IN ('simple', 'vitrina', 'ingredient')
        AND ${table.expectedQuantity} >= 0
        AND ${table.countedQuantity} >= 0
        AND ${table.differenceQuantity} <> 0
        AND ${table.differenceQuantity} = ${table.countedQuantity} - ${table.expectedQuantity}
        AND ${table.reasonCategory} IN (
          'venta_no_registrada', 'consumo_no_registrado', 'merma',
          'error_conteo', 'reposicion_no_registrada', 'otro'
        )
        AND length(trim(${table.initialComment})) BETWEEN 1 AND 1000
        AND (${table.unitValueClp} IS NULL OR ${table.unitValueClp} > 0)
        AND (${table.estimatedValueClp} IS NULL OR ${table.estimatedValueClp} >= 0)`,
    ),
  ],
);

export const closureIncidentEvents = sqliteTable(
  "closure_incident_events",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id")
      .notNull()
      .references(() => closureIncidents.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(isoNow),
    eventType: text("event_type").notNull(),
    status: text("status"),
    actorRole: text("actor_role").notNull(),
    actorName: text("actor_name").notNull(),
    comment: text("comment"),
    requestFingerprint: text("request_fingerprint").notNull(),
  },
  (table) => [
    index("idx_closure_incident_events_incident_created").on(
      table.incidentId,
      table.createdAt,
    ),
    check(
      "closure_incident_events_shape_valid",
      sql`${table.eventType} IN (
          'created', 'clarification_requested', 'comment_added', 'clarified',
          'validated', 'requires_correction', 'correction_applied',
          'notification_retry'
        )
        AND (
          ${table.status} IS NULL OR ${table.status} IN (
            'pending_clarification', 'clarified', 'validated',
            'requires_correction'
          )
        )
        AND ${table.actorRole} IN ('system', 'admin', 'sales')
        AND length(trim(${table.actorName})) BETWEEN 1 AND 100
        AND (${table.comment} IS NULL OR length(trim(${table.comment})) BETWEEN 1 AND 1000)
        AND length(${table.requestFingerprint}) = 64`,
    ),
  ],
);

export const closureNotificationDeliveries = sqliteTable(
  "closure_notification_deliveries",
  {
    id: text("id").primaryKey(),
    incidentId: text("incident_id").references(() => closureIncidents.id, {
      onDelete: "restrict",
    }),
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    businessDate: text("business_date").notNull(),
    kind: text("kind").notNull(),
    recipientType: text("recipient_type").notNull(),
    recipient: text("recipient").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    templateName: text("template_name"),
    templatePayloadJson: text("template_payload_json").notNull(),
    messagePreview: text("message_preview").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    activeAttemptId: text("active_attempt_id"),
    lastAttemptAt: text("last_attempt_at"),
    sentAt: text("sent_at"),
    providerMessageId: text("provider_message_id"),
    responseStatus: integer("response_status"),
    providerResponse: text("provider_response"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull().default(isoNow),
    updatedAt: text("updated_at").notNull().default(isoNow),
  },
  (table) => [
    uniqueIndex("uq_closure_notification_idempotency").on(
      table.idempotencyKey,
    ),
    index("idx_closure_notification_incident").on(
      table.incidentId,
      table.createdAt,
    ),
    index("idx_closure_notification_status").on(
      table.status,
      table.updatedAt,
    ),
    check(
      "closure_notification_deliveries_shape_valid",
      sql`${table.businessDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND ${table.kind} IN ('immediate_alert', 'reminder', 'daily_summary')
        AND ${table.recipientType} IN ('individual', 'group', 'configuration')
        AND length(trim(${table.recipient})) BETWEEN 1 AND 100
        AND length(${table.idempotencyKey}) BETWEEN 1 AND 300
        AND length(${table.templatePayloadJson}) BETWEEN 2 AND 10000
        AND length(trim(${table.messagePreview})) BETWEEN 1 AND 4000
        AND ${table.status} IN (
          'queued', 'sending', 'accepted', 'sent', 'delivered', 'read',
          'failed', 'superseded', 'configuration_required'
        )
        AND (
          (${table.status} = 'sending' AND ${table.activeAttemptId} IS NOT NULL)
          OR (${table.status} <> 'sending' AND ${table.activeAttemptId} IS NULL)
        )
        AND ${table.attemptCount} BETWEEN 0 AND 100`,
    ),
  ],
);

export const closureNotificationAttempts = sqliteTable(
  "closure_notification_attempts",
  {
    id: text("id").primaryKey(),
    deliveryId: text("delivery_id")
      .notNull()
      .references(() => closureNotificationDeliveries.id, {
        onDelete: "restrict",
      }),
    attemptNumber: integer("attempt_number").notNull(),
    initiatedBy: text("initiated_by").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    startedAt: text("started_at").notNull().default(isoNow),
  },
  (table) => [
    uniqueIndex("uq_closure_notification_attempt_number").on(
      table.deliveryId,
      table.attemptNumber,
    ),
    index("idx_closure_notification_attempt_delivery").on(
      table.deliveryId,
      table.startedAt,
    ),
    check(
      "closure_notification_attempts_shape_valid",
      sql`length(${table.id}) BETWEEN 1 AND 160
        AND ${table.attemptNumber} BETWEEN 1 AND 100
        AND ${table.initiatedBy} IN ('automatic', 'manual', 'recovery')
        AND length(${table.requestFingerprint}) = 64`,
    ),
  ],
);

export const closureNotificationAttemptResults = sqliteTable(
  "closure_notification_attempt_results",
  {
    id: text("id").primaryKey(),
    attemptId: text("attempt_id")
      .notNull()
      .references(() => closureNotificationAttempts.id, {
        onDelete: "restrict",
      }),
    eventKey: text("event_key").notNull(),
    outcome: text("outcome").notNull(),
    finishedAt: text("finished_at").notNull().default(isoNow),
    providerMessageId: text("provider_message_id"),
    responseStatus: integer("response_status"),
    providerResponse: text("provider_response"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
  },
  (table) => [
    uniqueIndex("uq_closure_notification_attempt_result_event").on(
      table.attemptId,
      table.eventKey,
    ),
    index("idx_closure_notification_attempt_result_attempt").on(
      table.attemptId,
      table.finishedAt,
    ),
    check(
      "closure_notification_attempt_results_shape_valid",
      sql`length(${table.id}) BETWEEN 1 AND 200
        AND length(${table.eventKey}) BETWEEN 1 AND 50
        AND ${table.outcome} IN ('accepted', 'failed', 'ambiguous')
        AND (${table.providerMessageId} IS NULL
          OR length(${table.providerMessageId}) BETWEEN 1 AND 500)
        AND (${table.responseStatus} IS NULL
          OR ${table.responseStatus} BETWEEN 100 AND 599)
        AND (${table.providerResponse} IS NULL
          OR length(${table.providerResponse}) BETWEEN 1 AND 10000)
        AND (${table.errorCode} IS NULL
          OR length(${table.errorCode}) BETWEEN 1 AND 200)
        AND (${table.errorMessage} IS NULL
          OR length(${table.errorMessage}) BETWEEN 1 AND 1000)
        AND (
          (${table.outcome} = 'accepted'
            AND ${table.providerMessageId} IS NOT NULL
            AND ${table.errorCode} IS NULL
            AND ${table.errorMessage} IS NULL)
          OR (${table.outcome} IN ('failed', 'ambiguous')
            AND ${table.errorCode} IS NOT NULL
            AND ${table.errorMessage} IS NOT NULL)
        )`,
    ),
  ],
);

export const closureNotificationWebhooks = sqliteTable(
  "closure_notification_webhooks",
  {
    id: text("id").primaryKey(),
    providerMessageId: text("provider_message_id").notNull(),
    providerStatus: text("provider_status").notNull(),
    providerTimestamp: integer("provider_timestamp"),
    callbackData: text("callback_data"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    payloadFingerprint: text("payload_fingerprint").notNull(),
    receivedAt: text("received_at").notNull().default(isoNow),
  },
  (table) => [
    index("idx_closure_notification_webhook_message").on(
      table.providerMessageId,
      table.providerTimestamp,
    ),
    index("idx_closure_notification_webhook_callback").on(
      table.callbackData,
      table.receivedAt,
    ),
    index("idx_closure_notification_webhook_received").on(table.receivedAt),
    check(
      "closure_notification_webhooks_shape_valid",
      sql`length(${table.id}) BETWEEN 1 AND 100
        AND length(${table.providerMessageId}) BETWEEN 1 AND 500
        AND ${table.providerStatus} IN ('sent', 'delivered', 'read', 'failed')
        AND (${table.providerTimestamp} IS NULL OR ${table.providerTimestamp} >= 0)
        AND (${table.callbackData} IS NULL
          OR length(${table.callbackData}) BETWEEN 1 AND 100)
        AND (${table.errorCode} IS NULL
          OR length(${table.errorCode}) BETWEEN 1 AND 200)
        AND (${table.errorMessage} IS NULL
          OR length(${table.errorMessage}) BETWEEN 1 AND 1000)
        AND length(${table.payloadFingerprint}) = 64`,
    ),
  ],
);

export const closureNotificationWebhookLinks = sqliteTable(
  "closure_notification_webhook_links",
  {
    webhookId: text("webhook_id")
      .primaryKey()
      .references(() => closureNotificationWebhooks.id, {
        onDelete: "restrict",
      }),
    deliveryId: text("delivery_id")
      .notNull()
      .references(() => closureNotificationDeliveries.id, {
        onDelete: "restrict",
      }),
    matchSource: text("match_source").notNull(),
    linkedAt: text("linked_at").notNull().default(isoNow),
  },
  (table) => [
    index("idx_closure_notification_webhook_link_delivery").on(
      table.deliveryId,
      table.linkedAt,
    ),
    check(
      "closure_notification_webhook_links_shape_valid",
      sql`${table.matchSource} IN (
          'provider_message_id', 'callback_data', 'reconciliation'
        )`,
    ),
  ],
);

export const cashClosureDebts = sqliteTable(
  "cash_closure_debts",
  {
    closureId: text("closure_id")
      .notNull()
      .references(() => cashClosures.id, { onDelete: "restrict" }),
    saleId: text("sale_id").notNull(),
    debtType: text("debt_type").notNull(),
    createdAt: text("created_at").notNull(),
    debtNote: text("debt_note"),
    debtorCollaborator: text("debtor_collaborator"),
    amountClp: integer("amount_clp").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.closureId, table.saleId] }),
    index("idx_cash_closure_debts_type").on(
      table.closureId,
      table.debtType,
    ),
    check(
      "cash_closure_debts_shape_valid",
      sql`${table.debtType} IN ('pendiente', 'colaborador')
        AND ${table.amountClp} > 0
        AND (
          (
            ${table.debtType} = 'pendiente'
            AND ${table.debtNote} IS NOT NULL
            AND length(trim(${table.debtNote})) BETWEEN 1 AND 500
            AND ${table.debtorCollaborator} IS NULL
          ) OR (
            ${table.debtType} = 'colaborador'
            AND ${table.debtorCollaborator} IS NOT NULL
            AND length(trim(${table.debtorCollaborator})) BETWEEN 1 AND 100
            AND (
              ${table.debtNote} IS NULL
              OR length(trim(${table.debtNote})) BETWEEN 1 AND 500
            )
          )
        )`,
    ),
  ],
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    unitPriceClp: integer("unit_price_clp").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalClp: integer("line_total_clp").notNull(),
  },
  (table) => [
    index("idx_sale_items_sale_id").on(table.saleId),
    check("sale_items_unit_price_positive", sql`${table.unitPriceClp} > 0`),
    check(
      "sale_items_quantity_allowed",
      sql`${table.quantity} BETWEEN 1 AND 99`,
    ),
    check(
      "sale_items_line_total_valid",
      sql`${table.lineTotalClp} = ${table.unitPriceClp} * ${table.quantity}`,
    ),
  ],
);
