import {
  isCollaborator,
  isInventoryDifferenceReason,
  isShift,
  type Collaborator,
  type InventoryDifferenceReason,
  type Shift,
} from "@/lib/business";
import { PosError } from "./errors";
import {
  findClosureIncidentId,
  prepareClosureIncident,
  recordClosureIncidentCorrection,
  recordClosureIncidentValidation,
} from "./incidents";

export { PosError } from "./errors";

export const PAYMENT_METHODS = [
  "efectivo",
  "tarjeta",
  "transferencia",
] as const;

export const LEGACY_PAYMENT_METHODS = ["debito", "credito"] as const;

export const SALE_PAYMENT_METHODS = [
  ...PAYMENT_METHODS,
  "pendiente",
  "colaborador",
] as const;
export const STOCK_MODES = ["untracked", "simple", "split"] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type StoredPaymentMethod =
  | PaymentMethod
  | (typeof LEGACY_PAYMENT_METHODS)[number];
export type SalePaymentMethod = (typeof SALE_PAYMENT_METHODS)[number];
export type PaymentStatus = "paid" | "pending" | "verification_pending";
export type StockMode = (typeof STOCK_MODES)[number];

export type SaleVoidInput = {
  id: string;
  sessionId: string;
  expectedActivityRevision: number;
  reason: string;
};

export type SaleVoidResult = {
  saleId: string;
  voidedAt: string;
  voidReason: string;
  voidedBy: string;
  idempotent: boolean;
};

export type TransferValidationInput = {
  id: string;
  sessionId: string;
  emailReference: string;
};

export type TransferValidationResult = {
  sale: PosSale;
  validatedAt: string;
  validatedBy: string;
  emailReference: string;
  idempotent: boolean;
};

export type PosProduct = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  priceClp: number;
  stockMode: StockMode;
  stock: number | null;
  stockVitrina: number | null;
  stockBodega: number | null;
  availableStock: number | null;
  stockGroup: string | null;
  active: boolean;
  needsPriceReview: boolean;
  updatedAt: string;
};

export type PosSaleItem = {
  productId: string;
  productName: string;
  unitPriceClp: number;
  quantity: number;
  lineTotalClp: number;
};

export type SalePayment = {
  id: string;
  createdAt: string;
  businessDate: string | null;
  shift: Shift | null;
  sessionId: string | null;
  paymentMethod: PaymentMethod;
  amountClp: number;
  receivedBy: Collaborator | null;
  kind: "direct" | "settlement";
};

export type PosSale = {
  id: string;
  createdAt: string;
  businessDate: string | null;
  shift: Shift | null;
  sessionId: string | null;
  paymentMethod: SalePaymentMethod;
  settledPaymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  debtNote: string | null;
  debtorCollaborator: Collaborator | null;
  paidAt: string | null;
  seller: string | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  paymentCount: number;
  paymentsHasMore: boolean;
  payments: SalePayment[];
  items: PosSaleItem[];
};

export type PosSummary = {
  totalClp: number;
  salesCount: number;
  averageClp: number;
  units: number;
  collectedClp: number;
  outstandingClp: number;
};

export type DebtSummary = {
  count: number;
  /** Alias compatible del saldo pendiente total. */
  totalClp: number;
  originalClp: number;
  paidClp: number;
  balanceClp: number;
};

export type CollaboratorDebtSummary = {
  collaborator: string;
  count: number;
  originalClp: number;
  paidClp: number;
  balanceClp: number;
};

export type DebtCursor = {
  createdAt: string;
  id: string;
};

export type DebtPage = {
  debts: PosSale[];
  summary: DebtSummary;
  collaboratorSummaries: CollaboratorDebtSummary[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type SaleHistoryCursor = {
  createdAt: string;
  id: string;
};

export type SaleHistoryFilters = {
  dateFrom: string | null;
  dateTo: string | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: SalePaymentMethod | null;
  q: string | null;
};

export type SaleHistoryPage = {
  sales: PosSale[];
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
  filters: SaleHistoryFilters;
};

export type TodaySalesCursor = {
  createdAt: string;
  id: string;
};

export type TodaySale = {
  id: string;
  createdAt: string;
  businessDate: string | null;
  shift: Shift | null;
  sessionId: string | null;
  responsible: string | null;
  debtorCollaborator: Collaborator | null;
  checkoutMethod: SalePaymentMethod;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  transferValidatedAt: string | null;
  transferValidatedBy: string | null;
  transferEmailReference: string | null;
  items: PosSaleItem[];
  voidedAt: string | null;
  voidReason: string | null;
  voidedBy: string | null;
  canVoid: boolean;
};

export type TodaySalesPage = {
  businessDate: string;
  sales: TodaySale[];
  summary: {
    totalSalesClp: number;
    collectedClp: number;
    settlementClp: number;
    cashClp: number;
    cardClp: number;
    transferClp: number;
    pendingTransferClp: number;
    pendingTransferCount: number;
  };
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export type DailySalesMetrics = {
  totalSalesClp: number;
  salesCount: number;
  units: number;
  averageClp: number;
  /** Saldo actual de las ventas originadas en la fecha, no flujo de caja. */
  outstandingSalesClp: number;
  /** Saldo actual de ventas con checkout "pendiente" originadas en la fecha. */
  pendingCustomerClp: number;
  /** Saldo actual de ventas de colaboradores originadas en la fecha. */
  collaboratorClp: number;
  /** Cobros efectivamente recibidos en la fecha, incluidos abonos de ventas antiguas. */
  collectedClp: number;
  /** Parte de los cobros recibidos que corresponde a abonos de cuentas pendientes. */
  settlementClp: number;
  cashClp: number;
  cardClp: number;
  transferClp: number;
};

export type DailySalesReportDay = DailySalesMetrics & {
  date: string;
};

export type DailySalesReportPeriod = DailySalesMetrics & {
  dateFrom: string;
  dateTo: string;
};

export type DailySalesReport = {
  period: DailySalesReportPeriod;
  days: DailySalesReportDay[];
};

export type SalesReportDateRange = {
  dateFrom: string;
  dateTo: string;
  dayCount: number;
};

export type SalesExportRow = {
  id: string;
  createdAt: string;
  businessDate: string | null;
  shift: Shift | null;
  seller: string | null;
  checkoutMethod: SalePaymentMethod;
  paymentStatus: PaymentStatus;
  settledPaymentMethod: PaymentMethod | null;
  debtNote: string | null;
  debtorCollaborator: Collaborator | null;
  totalClp: number;
  paidClp: number;
  balanceClp: number;
  units: number;
  products: string;
};

export type SalesExportPaymentRow = {
  id: string;
  saleId: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  amountClp: number;
  receivedBy: Collaborator | null;
  shift: Shift | null;
  kind: "direct" | "settlement";
};

export type SalesExportResult = {
  filters: SaleHistoryFilters;
  dateRange: SalesReportDateRange;
  sales: SalesExportRow[];
  /** Flujo recibido dentro de dateRange, independiente de la fecha de la venta. */
  payments: SalesExportPaymentRow[];
};

export type PosIngredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  revision: number;
  updatedAt: string;
};

export type IngredientStockInput = {
  stock: number;
  expectedRevision: number;
};

export const MAX_STOCK_ENTRY_QUANTITY = 1_000_000;
export const PRODUCT_STOCK_ENTRY_LOCATIONS = [
  "simple",
  "vitrina",
  "bodega",
] as const;

export type ProductStockEntryLocation =
  (typeof PRODUCT_STOCK_ENTRY_LOCATIONS)[number];

export type ProductStockEntryInput = {
  id: string;
  quantity: number;
  location: ProductStockEntryLocation;
};

export type IngredientStockEntryInput = {
  id: string;
  quantity: number;
};

export type InventoryStockEntry = {
  id: string;
  itemType: "product" | "ingredient";
  itemId: string;
  itemName: string;
  location: ProductStockEntryLocation | "ingredient";
  quantityBefore: number;
  quantityAdded: number;
  quantityAfter: number;
  createdAt: string;
};

export type SaleInput = {
  id: string;
  sessionId: string;
  paymentMethod: SalePaymentMethod;
  debtNote: string | null;
  debtorCollaborator: Collaborator | null;
  seller: Collaborator | null;
  shift: Shift | null;
  items: Array<{
    productId: string;
    unitPriceClp: number;
    quantity: number;
  }>;
};

export type ProductUpdateInput = {
  expectedUpdatedAt: string;
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

export type SettlementInput = {
  id: string;
  sessionId: string;
  paymentMethod: PaymentMethod;
  /** Null is accepted only for rolling compatibility and means full balance. */
  amountClp: number | null;
  /** Legacy context is checked but never used as the accounting source. */
  shift: Shift | null;
  responsible: Collaborator | null;
};

export type DebtSettlementRole = "admin" | "sales";

export type ShiftSessionStatus = "open" | "closed";

export type ShiftSession = {
  id: string;
  businessDate: string;
  shift: Shift;
  responsible: Collaborator;
  openingCashClp: number;
  activityRevision: number;
  status: ShiftSessionStatus;
  openedAt: string;
  closedAt: string | null;
  closureId: string | null;
};

export type ActiveShiftSummary = {
  sessionId: string;
  businessDate: string;
  shift: Shift;
  activityRevision: number;
  includedSalesClp: number;
  includedSalesCount: number;
  cashCollectedClp: number;
  cardCollectedClp: number;
  transferCollectedClp: number;
  settlementCollectedClp: number;
  totalCollectedClp: number;
};

export type ActiveShiftState = {
  session: ShiftSession;
  summary: ActiveShiftSummary;
};

export type OpenShiftSessionInput = {
  id: string;
  shift: Shift;
  responsible: Collaborator;
  openingCashClp: number;
};

export type PendingCustomerDetail = {
  id: string;
  createdAt: string;
  debtNote: string;
  totalClp: number;
};

export type PendingCollaboratorDetail = {
  id: string;
  createdAt: string;
  debtorCollaborator: Collaborator;
  debtNote: string | null;
  totalClp: number;
};

export type ClosingInventoryLocation =
  | "simple"
  | "vitrina"
  | "bodega"
  | "ingredient";

export type ClosingInventoryLine = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  unit: string;
  location: ClosingInventoryLocation;
  versionToken: string;
  expectedQuantity: number;
};

export type CountedInventoryLine = {
  key: string;
  versionToken: string;
  expectedQuantity: number;
  countedQuantity: number;
  reasonCategory: InventoryDifferenceReason | null;
  comment: string | null;
};

export type CashClosureInventoryLine = ClosingInventoryLine & {
  countedQuantity: number;
  differenceQuantity: number;
  reason: string | null;
  reasonCategory: InventoryDifferenceReason | null;
  comment: string | null;
};

export type CashClosureExpense = {
  id: string;
  description: string;
  amountClp: number;
};

export type CashClosureValidation = {
  validatedAt: string;
  comment: string | null;
  revisionNumber: number;
};

export type ReconciliationChecklist = {
  cashReconciled: true;
  cardReconciled: true;
  transferReconciled: true;
  pendingCustomerReviewed: true;
  collaboratorReviewed: true;
  inventoryCountConfirmed: true;
};

export type CashClosurePreview = {
  businessDate: string;
  shift: Shift;
  activityRevision: number | null;
  openingCashClp: number;
  cashMovementsClp: number;
  expectedCashClp: number;
  expectedCardClp: number;
  expectedTransferClp: number;
  collectedPaymentsClp: number;
  expectedCollectedClp: number;
  totalSalesClp: number;
  salesCount: number;
  pendingCustomerClp: number;
  pendingCustomerCount: number;
  collaboratorClp: number;
  collaboratorCount: number;
  pendingCustomers: PendingCustomerDetail[];
  pendingCollaborators: PendingCollaboratorDetail[];
  unassignedSalesClp: number;
  unassignedSalesCount: number;
  unassignedPaymentsClp: number;
  unassignedPaymentsCount: number;
  closed: boolean;
};

export type CashClosure = CashClosurePreview & {
  id: string;
  sessionId: string | null;
  closureContractVersion: 2 | null;
  latestRevisionNumber: number;
  responsible: Collaborator;
  createdAt: string;
  countedCashClp: number;
  expensesClp: number;
  adjustedExpectedCashClp: number;
  differenceClp: number;
  countedCardClp: number | null;
  differenceCardClp: number | null;
  countedTransferClp: number | null;
  differenceTransferClp: number | null;
  countedCollectedClp: number | null;
  differenceCollectedClp: number | null;
  financialDifferenceReason: string | null;
  checklist: ReconciliationChecklist | null;
  checklistVersion: 1 | null;
  notes: string | null;
  handoffComments: string | null;
  expenses: CashClosureExpense[];
  validationStatus: "not_required" | "pending" | "validated";
  validation: CashClosureValidation | null;
  inventory: CashClosureInventoryLine[];
  inventoryCaptured: boolean;
  inventoryLineCount: number;
  inventoryDifferenceCount: number;
  inventoryDifferences: CashClosureInventoryLine[];
};

export type CashClosureInput = {
  id: string;
  sessionId: string;
  expectedActivityRevision: number;
  countedCashClp: number;
  countedCardClp: number;
  countedTransferClp: number;
  financialDifferenceReason: string | null;
  expenses: CashClosureExpense[];
  inventory: CountedInventoryLine[];
  handoffComments: string | null;
};

export type CashClosureValidationInput = {
  comment: string | null;
  expectedRevisionNumber: number | null;
};

export type CashClosureRevisionSaleInput = {
  id: string;
  paymentMethod: PaymentMethod;
  items: Array<{
    productId: string;
    unitPriceClp: number;
    quantity: number;
  }>;
};

export type CashClosureRevisionInventoryInput = {
  key: string;
  expectedCountedQuantity: number;
  countedQuantity: number;
  liveVersionToken: string;
  liveQuantity: number;
};

export type CashClosureRevisionInput = {
  id: string;
  expectedRevisionNumber: number;
  reason: string;
  countedCashClp: number;
  countedCardClp: number;
  countedTransferClp: number;
  addedSales: CashClosureRevisionSaleInput[];
  inventory: CashClosureRevisionInventoryInput[];
};

export type CashClosureRevisionSale = {
  id: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  totalClp: number;
  items: PosSaleItem[];
};

export type CashClosureRevisionInventoryChange = {
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

export type CashClosureCorrectionFinancial = {
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
};

export type CashClosureCorrectionInventoryLine = {
  key: string;
  itemType: "product" | "ingredient";
  itemId: string;
  name: string;
  unit: string;
  location: Exclude<ClosingInventoryLocation, "bodega">;
  expectedQuantity: number;
  countedQuantity: number;
  differenceQuantity: number;
  currentQuantity: number | null;
  currentVersionToken: string | null;
  adjustable: boolean;
};

export type CashClosureCorrectionEffective = CashClosureCorrectionFinancial & {
  inventory: CashClosureCorrectionInventoryLine[];
};

export type CashClosureRevision = {
  id: string;
  revisionNumber: number;
  createdAt: string;
  reason: string;
  addedSales: CashClosureRevisionSale[];
  inventoryChanges: CashClosureRevisionInventoryChange[];
  effective: CashClosureCorrectionFinancial;
};

export type CashClosureRevisionContext = {
  closureId: string;
  correctable: boolean;
  latestRevisionNumber: number;
  effective: CashClosureCorrectionEffective;
  revisions: CashClosureRevision[];
};

type ProductRow = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  price_clp: number;
  stock_mode: StockMode;
  stock: number | null;
  stock_vitrina: number | null;
  stock_bodega: number | null;
  available_stock: number | null;
  stock_group: string | null;
  active: number;
  needs_price_review: number;
  updated_at: string;
};

type SaleRow = {
  id: string;
  created_at: string;
  business_date: string | null;
  shift: Shift | null;
  shift_session_id: string | null;
  payment_status: PaymentStatus;
  payment_method: StoredPaymentMethod | null;
  checkout_method: SalePaymentMethod;
  debt_note: string | null;
  debtor_collaborator: Collaborator | null;
  paid_at: string | null;
  settlement_id: string | null;
  seller: string | null;
  total_clp: number;
};

type TodaySaleRow = SaleRow & {
  paid_clp: number;
  voided_at: string | null;
  void_reason: string | null;
  voided_by: string | null;
  can_void: number;
  transfer_validated_at: string | null;
  transfer_validated_by: string | null;
  transfer_email_reference: string | null;
};

type TransferValidationRow = {
  id: string;
  sale_id: string;
  shift_session_id: string;
  validated_at: string;
  validator_role: "admin" | "sales";
  validated_by: string;
  email_reference: string;
  amount_clp: number;
};

type SaleVoidRow = {
  id: string;
  sale_id: string;
  shift_session_id: string;
  created_at: string;
  actor_role: "admin";
  actor_name: string;
  reason: string;
  expected_activity_revision: number;
  request_fingerprint: string;
  original_total_clp: number;
  original_paid_clp: number;
  original_balance_clp: number;
  inventory_source: "snapshot" | "derived_legacy";
  inventory_restoration_json: string;
  payment_snapshot_json: string;
};

type SaleInventoryConsumptionRow = {
  sale_id: string;
  item_type: "product" | "ingredient";
  item_id: string;
  item_name: string;
  location: "simple" | "vitrina" | "ingredient";
  quantity: number;
};

type TodaySalesSummaryRow = {
  total_count: number;
  total_sales_clp: number;
  collected_clp: number;
  settlement_clp: number;
  cash_clp: number;
  card_clp: number;
  transfer_clp: number;
  pending_transfer_clp: number;
  pending_transfer_count: number;
};

type SaleItemRow = {
  sale_id: string;
  product_id: string;
  product_name: string;
  unit_price_clp: number;
  quantity: number;
  line_total_clp: number;
};

type SalePaymentRow = {
  id: string;
  sale_id: string;
  created_at: string;
  business_date: string | null;
  shift: Shift | null;
  shift_session_id: string | null;
  payment_method: StoredPaymentMethod;
  amount_clp: number;
  received_by: Collaborator | null;
  kind: "direct" | "settlement";
  payment_count?: number;
  paid_clp?: number;
};

type DailyOriginatedSalesRow = {
  report_date: string;
  total_sales_clp: number;
  sales_count: number;
  units: number;
  outstanding_sales_clp: number;
  pending_customer_clp: number;
  collaborator_clp: number;
};

type DailyCollectedPaymentsRow = {
  report_date: string;
  collected_clp: number;
  settlement_clp: number;
  cash_clp: number;
  card_clp: number;
  transfer_clp: number;
};

type SalesExportDatabaseRow = {
  id: string;
  created_at: string;
  business_date: string | null;
  shift: Shift | null;
  seller: string | null;
  checkout_method: SalePaymentMethod;
  payment_status: PaymentStatus;
  payment_method: StoredPaymentMethod | null;
  debt_note: string | null;
  debtor_collaborator: Collaborator | null;
  total_clp: number;
  paid_clp: number;
  balance_clp: number;
  units: number;
  products: string | null;
};

type SalesExportPaymentDatabaseRow = {
  id: string;
  sale_id: string;
  created_at: string;
  payment_method: StoredPaymentMethod;
  amount_clp: number;
  received_by: Collaborator | null;
  shift: Shift | null;
  kind: "direct" | "settlement";
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  revision: number;
  updated_at: string;
};

type InventoryStockEntryRow = {
  id: string;
  item_type: "product" | "ingredient";
  item_id: string;
  item_name: string;
  location: ProductStockEntryLocation | "ingredient";
  quantity_before: number;
  quantity_added: number;
  quantity_after: number;
  operation_token: string;
  created_at: string;
};

type RecipeRow = {
  product_id: string;
  ingredient_id: string;
  quantity: number;
  ingredient_name: string;
  ingredient_stock: number;
  ingredient_revision: number;
};

type StoredSale = PosSale & { settlementId: string | null };

type ClosureRow = {
  id: string;
  session_id: string | null;
  session_activity_revision: number | null;
  request_fingerprint: string | null;
  business_date: string;
  shift: Shift;
  responsible: Collaborator;
  created_at: string;
  expected_cash_clp: number;
  opening_cash_clp: number | null;
  cash_movements_clp: number | null;
  expected_card_clp: number;
  expected_transfer_clp: number;
  expected_collected_clp: number;
  total_sales_clp: number;
  sales_count: number;
  pending_customer_clp: number;
  pending_customer_count: number | null;
  collaborator_clp: number;
  collaborator_count: number | null;
  counted_cash_clp: number;
  difference_clp: number;
  counted_card_clp: number | null;
  difference_card_clp: number | null;
  counted_transfer_clp: number | null;
  difference_transfer_clp: number | null;
  counted_collected_clp: number | null;
  difference_collected_clp: number | null;
  financial_difference_reason: string | null;
  closure_contract_version: number | null;
  expenses_clp: number;
  adjusted_expected_cash_clp: number | null;
  adjusted_difference_clp: number | null;
  adjusted_difference_collected_clp: number | null;
  handoff_financial_difference_reason: string | null;
  handoff_comments: string | null;
  cash_reconciled: number | null;
  card_reconciled: number | null;
  transfer_reconciled: number | null;
  pending_customer_reviewed: number | null;
  collaborator_reviewed: number | null;
  inventory_count_confirmed: number | null;
  checklist_version: number | null;
  unassigned_sales_clp: number;
  unassigned_sales_count: number;
  unassigned_payments_clp: number;
  unassigned_payments_count: number;
  notes: string | null;
  latest_revision_number: number;
};

type ClosingInventoryRow = {
  item_key: string;
  item_type: "product" | "ingredient";
  item_id: string;
  item_name: string;
  unit: string;
  location: ClosingInventoryLocation;
  version_token: string;
  expected_quantity: number;
};

type ClosureInventoryRow = ClosingInventoryRow & {
  closure_id: string;
  counted_quantity: number;
  difference_quantity: number;
  reason: string | null;
  reason_category: InventoryDifferenceReason | null;
  incident_comment: string | null;
};

type ClosureDebtRow = {
  closure_id: string;
  sale_id: string;
  debt_type: "pendiente" | "colaborador";
  created_at: string;
  debt_note: string | null;
  debtor_collaborator: Collaborator | null;
  amount_clp: number;
};

type ClosureExpenseRow = {
  closure_id: string;
  id: string;
  description: string;
  amount_clp: number;
};

type ClosureValidationRow = {
  closure_id: string;
  validated_at: string;
  comment: string | null;
  revision_number: number;
  request_fingerprint: string | null;
};

type ClosureRevisionRow = {
  id: string;
  closure_id: string;
  revision_number: number;
  expected_revision_number: number;
  expected_added_sales_count: number;
  expected_inventory_line_count: number;
  request_fingerprint: string;
  reason: string;
  created_at: string;
  included_sales_clp: number;
  included_sales_count: number;
  opening_cash_clp: number;
  cash_collected_clp: number;
  card_collected_clp: number;
  transfer_collected_clp: number;
  total_collected_clp: number;
  expected_cash_clp: number;
  expected_collected_clp: number;
  expenses_clp: number;
  adjusted_expected_cash_clp: number;
  counted_cash_clp: number;
  counted_card_clp: number;
  counted_transfer_clp: number;
  counted_collected_clp: number;
  difference_cash_clp: number;
  difference_card_clp: number;
  difference_transfer_clp: number;
  difference_collected_clp: number;
};

type ClosureRevisionSaleRow = {
  revision_id: string;
  sale_id: string;
  created_at: string;
  payment_method: PaymentMethod;
  total_clp: number;
};

type ClosureRevisionInventoryRow = {
  revision_id: string;
  item_key: string;
  item_type: "product" | "ingredient";
  item_id: string;
  item_name: string;
  unit: string;
  location: Exclude<ClosingInventoryLocation, "bodega">;
  previous_expected_quantity: number;
  expected_quantity: number;
  sale_consumption_quantity: number;
  previous_counted_quantity: number;
  counted_quantity: number;
  counted_delta_quantity: number;
  difference_quantity: number;
  live_quantity_before: number | null;
  live_version_token_before: string | null;
  live_quantity_after: number | null;
  live_version_token_after: string | null;
};

type ShiftSessionRow = {
  id: string;
  business_date: string;
  shift: Shift;
  responsible: Collaborator;
  opening_cash_clp: number;
  activity_revision: number;
  status: ShiftSessionStatus;
  opened_at: string;
  closed_at: string | null;
  closure_id: string | null;
};

function mapNullableInteger(value: number | null): number | null {
  return value === null ? null : Number(value);
}

function mapProduct(row: ProductRow): PosProduct {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    priceClp: Number(row.price_clp),
    stockMode: row.stock_mode,
    stock: mapNullableInteger(row.stock),
    stockVitrina: mapNullableInteger(row.stock_vitrina),
    stockBodega: mapNullableInteger(row.stock_bodega),
    availableStock: mapNullableInteger(row.available_stock),
    stockGroup: row.stock_group,
    active: Boolean(row.active),
    needsPriceReview: Boolean(row.needs_price_review),
    updatedAt: row.updated_at,
  };
}

function mapSaleItem(row: SaleItemRow): PosSaleItem {
  return {
    productId: row.product_id,
    productName: row.product_name,
    unitPriceClp: Number(row.unit_price_clp),
    quantity: Number(row.quantity),
    lineTotalClp: Number(row.line_total_clp),
  };
}

function publicPaymentId(row: SalePaymentRow): string {
  if (row.kind === "settlement" && row.id.startsWith("settlement:")) {
    return row.id.slice("settlement:".length);
  }
  if (row.kind === "direct" && row.id.startsWith("direct:")) {
    return row.id.slice("direct:".length);
  }
  return row.id;
}

function mapSalePayment(row: SalePaymentRow): SalePayment {
  const paymentMethod = normalizePaymentMethod(row.payment_method);
  if (paymentMethod === null) {
    throw new Error("Stored sale payment has an invalid payment method");
  }
  return {
    id: publicPaymentId(row),
    createdAt: row.created_at,
    businessDate: row.business_date,
    shift: row.shift,
    sessionId: row.shift_session_id,
    paymentMethod,
    amountClp: Number(row.amount_clp),
    receivedBy: row.received_by,
    kind: row.kind,
  };
}

export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  if (value === "debito" || value === "credito") return "tarjeta";
  return typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : null;
}

function mapStoredSale(
  row: SaleRow,
  items: PosSaleItem[],
  payments: SalePayment[],
  paidClp: number,
  paymentCount: number,
): StoredSale {
  const paidPaymentMethod = normalizePaymentMethod(row.payment_method);
  if (row.payment_status === "paid" && paidPaymentMethod === null) {
    throw new Error("Stored sale has an invalid payment method");
  }
  const totalClp = Number(row.total_clp);
  if (
    !Number.isSafeInteger(paidClp) ||
    paidClp < 0 ||
    paidClp > totalClp ||
    (row.payment_status === "paid" && paidClp !== totalClp) ||
    ((row.payment_status === "pending" ||
      row.payment_status === "verification_pending") &&
      paidClp >= totalClp) ||
    !Number.isSafeInteger(paymentCount) ||
    paymentCount < payments.length
  ) {
    throw new Error("Stored sale payment ledger is inconsistent");
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    businessDate: row.business_date,
    shift: row.shift,
    sessionId: row.shift_session_id,
    paymentMethod: row.checkout_method,
    settledPaymentMethod:
      row.checkout_method === "pendiente" || row.checkout_method === "colaborador"
        ? paidPaymentMethod
        : null,
    paymentStatus: row.payment_status,
    debtNote: row.debt_note,
    debtorCollaborator: row.debtor_collaborator,
    paidAt: row.paid_at,
    seller: row.seller,
    totalClp,
    paidClp,
    balanceClp: totalClp - paidClp,
    paymentCount,
    paymentsHasMore: paymentCount > payments.length,
    payments,
    items,
    settlementId: row.settlement_id,
  };
}

function publicSale(stored: StoredSale): PosSale {
  return {
    id: stored.id,
    createdAt: stored.createdAt,
    businessDate: stored.businessDate,
    shift: stored.shift,
    sessionId: stored.sessionId,
    paymentMethod: stored.paymentMethod,
    settledPaymentMethod: stored.settledPaymentMethod,
    paymentStatus: stored.paymentStatus,
    debtNote: stored.debtNote,
    debtorCollaborator: stored.debtorCollaborator,
    paidAt: stored.paidAt,
    seller: stored.seller,
    totalClp: stored.totalClp,
    paidClp: stored.paidClp,
    balanceClp: stored.balanceClp,
    paymentCount: stored.paymentCount,
    paymentsHasMore: stored.paymentsHasMore,
    payments: stored.payments,
    items: stored.items,
  };
}

const productColumns = `
  p.id, p.sku, p.name, p.category, p.price_clp, p.stock_mode, p.stock,
  p.stock_vitrina, p.stock_bodega, p.active, p.needs_price_review, p.updated_at,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM product_ingredients AS recipe
      WHERE recipe.product_id = p.id
    ) THEN (
      SELECT MIN(CAST(i.stock / recipe.quantity AS INTEGER))
      FROM product_ingredients AS recipe
      INNER JOIN ingredients AS i ON i.id = recipe.ingredient_id
      WHERE recipe.product_id = p.id
    )
    WHEN p.stock_mode = 'simple' THEN p.stock
    WHEN p.stock_mode = 'split' THEN p.stock_vitrina
    ELSE NULL
  END AS available_stock,
  CASE
    WHEN (
      SELECT COUNT(*) FROM product_ingredients AS recipe
      WHERE recipe.product_id = p.id
    ) = 1 THEN 'ingredient:' || (
      SELECT recipe.ingredient_id FROM product_ingredients AS recipe
      WHERE recipe.product_id = p.id LIMIT 1
    )
    WHEN EXISTS (
      SELECT 1 FROM product_ingredients AS recipe
      WHERE recipe.product_id = p.id
    ) THEN 'recipe:' || p.id
    WHEN p.stock_mode = 'simple' THEN 'product:' || p.id
    WHEN p.stock_mode = 'split' THEN 'vitrina:' || p.id
    ELSE NULL
  END AS stock_group
`;

const saleColumns = `
  id, created_at, business_date, shift, shift_session_id, payment_status, checkout_method,
  payment_method, debt_note, debtor_collaborator, paid_at, settlement_id,
  seller, total_clp
`;

export async function listProducts(
  database: D1Database,
  options: { activeOnly: boolean },
): Promise<PosProduct[]> {
  const query = options.activeOnly
    ? `
        SELECT ${productColumns}
        FROM products AS p
        WHERE p.active = 1
        ORDER BY p.category COLLATE NOCASE, p.name COLLATE NOCASE, p.id
      `
    : `
        SELECT ${productColumns}
        FROM products AS p
        ORDER BY p.name COLLATE NOCASE, p.id
      `;
  const result = await database.prepare(query).all<ProductRow>();
  return result.results.map(mapProduct);
}

export async function findProduct(
  database: D1Database,
  id: string,
): Promise<PosProduct | null> {
  const row = await database
    .prepare(`SELECT ${productColumns} FROM products AS p WHERE p.id = ?`)
    .bind(id)
    .first<ProductRow>();
  return row ? mapProduct(row) : null;
}

export async function updateProduct(
  database: D1Database,
  id: string,
  input: ProductUpdateInput,
): Promise<PosProduct> {
  const expectedTime = Date.parse(input.expectedUpdatedAt);
  const nextUpdatedAt = new Date(
    Math.max(Date.now(), Number.isNaN(expectedTime) ? 0 : expectedTime + 1),
  ).toISOString();
  const result = await database
    .prepare(`
      UPDATE products
      SET
        sku = ?, name = ?, category = ?, price_clp = ?, stock_mode = ?,
        stock = ?, stock_vitrina = ?, stock_bodega = ?, active = ?,
        needs_price_review = ?, updated_at = ?
      WHERE id = ? AND updated_at = ?
        AND (
          ? = 'untracked'
          OR NOT EXISTS (
            SELECT 1 FROM product_ingredients
            WHERE product_id = products.id
          )
        )
    `)
    .bind(
      input.sku,
      input.name,
      input.category,
      input.priceClp,
      input.stockMode,
      input.stock,
      input.stockVitrina,
      input.stockBodega,
      input.active ? 1 : 0,
      input.needsPriceReview ? 1 : 0,
      nextUpdatedAt,
      id,
      input.expectedUpdatedAt,
      input.stockMode,
    )
    .run();
  if (Number(result.meta.changes ?? 0) === 0) {
    const current = await findProduct(database, id);
    if (!current) throw new PosError(404, "El producto no existe.");
    if (
      input.stockMode !== "untracked" &&
      (current.stockGroup?.startsWith("ingredient:") ||
        current.stockGroup?.startsWith("recipe:"))
    ) {
      throw new PosError(
        400,
        "Un producto con receta debe usar inventario controlado por insumos.",
      );
    }
    throw new PosError(
      409,
      "El producto cambió. Actualiza los datos e intenta nuevamente.",
    );
  }
  const product = await findProduct(database, id);
  if (!product) throw new Error("Product missing after update");
  return product;
}

function mapIngredient(row: IngredientRow): PosIngredient {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    stock: Number(row.stock),
    revision: Number(row.revision),
    updatedAt: row.updated_at,
  };
}

export async function listIngredients(
  database: D1Database,
): Promise<PosIngredient[]> {
  const result = await database
    .prepare(`
      SELECT id, name, unit, stock, revision, updated_at
      FROM ingredients
      ORDER BY name COLLATE NOCASE, id
    `)
    .all<IngredientRow>();
  return result.results.map(mapIngredient);
}

export async function findIngredient(
  database: D1Database,
  id: string,
): Promise<PosIngredient | null> {
  const row = await database
    .prepare(`
      SELECT id, name, unit, stock, revision, updated_at
      FROM ingredients
      WHERE id = ?
    `)
    .bind(id)
    .first<IngredientRow>();
  return row ? mapIngredient(row) : null;
}

export async function updateIngredientStock(
  database: D1Database,
  id: string,
  input: IngredientStockInput,
): Promise<PosIngredient> {
  const updatedAt = new Date().toISOString();
  const result = await database
    .prepare(`
      UPDATE ingredients
      SET stock = ?, revision = revision + 1, updated_at = ?
      WHERE id = ? AND revision = ?
    `)
    .bind(input.stock, updatedAt, id, input.expectedRevision)
    .run();
  if (Number(result.meta.changes ?? 0) === 0) {
    const current = await findIngredient(database, id);
    if (!current) throw new PosError(404, "El insumo no existe.");
    throw new PosError(
      409,
      "El stock del insumo cambió. Actualiza los datos e intenta nuevamente.",
    );
  }
  const ingredient = await findIngredient(database, id);
  if (!ingredient) throw new Error("Ingredient missing after update");
  return ingredient;
}

function mapInventoryStockEntry(
  row: InventoryStockEntryRow,
): InventoryStockEntry {
  const quantityBefore = Number(row.quantity_before);
  const quantityAdded = Number(row.quantity_added);
  const quantityAfter = Number(row.quantity_after);
  if (
    !Number.isSafeInteger(quantityBefore) ||
    !Number.isSafeInteger(quantityAdded) ||
    !Number.isSafeInteger(quantityAfter)
  ) {
    throw new Error("Stored inventory stock entry has an unsafe quantity");
  }
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemName: row.item_name,
    location: row.location,
    quantityBefore,
    quantityAdded,
    quantityAfter,
    createdAt: row.created_at,
  };
}

async function findInventoryStockEntryRow(
  database: D1Database,
  id: string,
): Promise<InventoryStockEntryRow | null> {
  return database
    .prepare(`
      SELECT id, item_type, item_id, item_name, location,
        quantity_before, quantity_added, quantity_after,
        operation_token, created_at
      FROM inventory_stock_entries
      WHERE id = ?
    `)
    .bind(id)
    .first<InventoryStockEntryRow>();
}

function stockEntryMatches(
  row: InventoryStockEntryRow,
  expected: {
    itemType: "product" | "ingredient";
    itemId: string;
    location: ProductStockEntryLocation | "ingredient";
    quantity: number;
  },
): boolean {
  return (
    row.item_type === expected.itemType &&
    row.item_id === expected.itemId &&
    row.location === expected.location &&
    Number(row.quantity_added) === expected.quantity
  );
}

function assertStockEntryQuantity(quantity: number): void {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_STOCK_ENTRY_QUANTITY
  ) {
    throw new PosError(
      400,
      `La cantidad recibida debe ser un entero entre 1 y ${MAX_STOCK_ENTRY_QUANTITY.toLocaleString("es-CL")}.`,
    );
  }
}

function assertStockEntryId(id: string): void {
  if (
    typeof id !== "string" ||
    id.length < 1 ||
    id.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)
  ) {
    throw new PosError(400, "El id del ingreso de stock no es válido.");
  }
}

function assertProductStockEntryLocation(
  product: PosProduct,
  location: ProductStockEntryLocation,
): number {
  if (
    product.stockGroup?.startsWith("ingredient:") ||
    product.stockGroup?.startsWith("recipe:")
  ) {
    throw new PosError(
      400,
      "Este producto usa stock compartido por insumos. Registra la entrada en el insumo correspondiente.",
    );
  }
  if (product.stockMode === "untracked") {
    throw new PosError(
      400,
      "Este producto no tiene control de stock. Configúralo antes de registrar una entrada.",
    );
  }
  if (product.stockMode === "simple") {
    if (location !== "simple") {
      throw new PosError(
        400,
        "Este producto usa stock simple; registra la entrada en Stock total.",
      );
    }
    if (product.stock === null) throw new Error("Simple product stock is missing");
    return product.stock;
  }
  if (location === "simple") {
    throw new PosError(
      400,
      "Este producto separa el stock; selecciona Vitrina o Bodega.",
    );
  }
  const stock = location === "vitrina" ? product.stockVitrina : product.stockBodega;
  if (stock === null) throw new Error("Split product stock is missing");
  return stock;
}

function assertStockEntryResultIsSafe(
  quantityBefore: number,
  quantityAdded: number,
): void {
  if (
    !Number.isSafeInteger(quantityBefore) ||
    quantityBefore < 0 ||
    quantityBefore > Number.MAX_SAFE_INTEGER - quantityAdded
  ) {
    throw new PosError(
      409,
      "El stock resultante supera el máximo permitido. Revisa la existencia actual.",
    );
  }
}

function stockEntryIdConflict(): PosError {
  return new PosError(
    409,
    "El id del ingreso de stock ya fue utilizado con otros datos.",
  );
}

export async function addProductStockEntry(
  database: D1Database,
  productId: string,
  input: ProductStockEntryInput,
  now = new Date(),
): Promise<{
  entry: InventoryStockEntry;
  product: PosProduct;
  idempotent: boolean;
}> {
  assertStockEntryId(input.id);
  assertStockEntryQuantity(input.quantity);
  if (!PRODUCT_STOCK_ENTRY_LOCATIONS.includes(input.location)) {
    throw new PosError(
      400,
      "La ubicación debe ser simple, vitrina o bodega.",
    );
  }
  const expected = {
    itemType: "product" as const,
    itemId: productId,
    location: input.location,
    quantity: input.quantity,
  };
  const existing = await findInventoryStockEntryRow(database, input.id);
  if (existing) {
    if (!stockEntryMatches(existing, expected)) throw stockEntryIdConflict();
    const product = await findProduct(database, productId);
    if (!product) throw new PosError(404, "El producto no existe.");
    return {
      entry: mapInventoryStockEntry(existing),
      product,
      idempotent: true,
    };
  }

  const current = await findProduct(database, productId);
  if (!current) throw new PosError(404, "El producto no existe.");
  const currentQuantity = assertProductStockEntryLocation(
    current,
    input.location,
  );
  assertStockEntryResultIsSafe(currentQuantity, input.quantity);

  const column =
    input.location === "simple"
      ? "stock"
      : input.location === "vitrina"
        ? "stock_vitrina"
        : "stock_bodega";
  const stockMode = input.location === "simple" ? "simple" : "split";
  const operationToken = crypto.randomUUID();
  const createdAt = now.toISOString();
  const statement = database
    .prepare(`
      INSERT INTO inventory_stock_entries (
        id, item_type, item_id, item_name, location,
        quantity_before, quantity_added, quantity_after,
        actor_role, operation_token, created_at
      )
      SELECT ?, 'product', product.id, product.name, ?,
        product.${column}, ?, product.${column} + ?,
        'admin', ?, ?
      FROM products AS product
      WHERE product.id = ?
        AND product.stock_mode = ?
        AND product.${column} IS NOT NULL
        AND product.${column} BETWEEN 0 AND ?
        AND NOT EXISTS (
          SELECT 1 FROM product_ingredients AS recipe
          WHERE recipe.product_id = product.id
        )
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(
      input.id,
      input.location,
      input.quantity,
      input.quantity,
      operationToken,
      createdAt,
      productId,
      stockMode,
      Number.MAX_SAFE_INTEGER - input.quantity,
    );

  try {
    await database.batch([statement]);
  } catch (error) {
    const raced = await findInventoryStockEntryRow(database, input.id);
    if (raced && stockEntryMatches(raced, expected)) {
      const product = await findProduct(database, productId);
      if (!product) throw new PosError(404, "El producto no existe.");
      return {
        entry: mapInventoryStockEntry(raced),
        product,
        idempotent: true,
      };
    }
    if (raced) throw stockEntryIdConflict();
    if (
      error instanceof Error &&
      error.message.includes("inventory stock entry product conflict")
    ) {
      throw new PosError(
        409,
        "El stock cambió antes de registrar el ingreso. Revisa el total e intenta nuevamente.",
      );
    }
    throw error;
  }

  const entryRow = await findInventoryStockEntryRow(database, input.id);
  if (!entryRow) {
    const latest = await findProduct(database, productId);
    if (!latest) throw new PosError(404, "El producto no existe.");
    const latestQuantity = assertProductStockEntryLocation(
      latest,
      input.location,
    );
    assertStockEntryResultIsSafe(latestQuantity, input.quantity);
    throw new PosError(
      409,
      "El producto cambió antes de registrar el ingreso. Revisa sus datos e intenta nuevamente.",
    );
  }
  if (!stockEntryMatches(entryRow, expected)) throw stockEntryIdConflict();
  const product = await findProduct(database, productId);
  if (!product) throw new Error("Product missing after stock entry");
  return {
    entry: mapInventoryStockEntry(entryRow),
    product,
    idempotent: entryRow.operation_token !== operationToken,
  };
}

export async function addIngredientStockEntry(
  database: D1Database,
  ingredientId: string,
  input: IngredientStockEntryInput,
  now = new Date(),
): Promise<{
  entry: InventoryStockEntry;
  ingredient: PosIngredient;
  idempotent: boolean;
}> {
  assertStockEntryId(input.id);
  assertStockEntryQuantity(input.quantity);
  const expected = {
    itemType: "ingredient" as const,
    itemId: ingredientId,
    location: "ingredient" as const,
    quantity: input.quantity,
  };
  const existing = await findInventoryStockEntryRow(database, input.id);
  if (existing) {
    if (!stockEntryMatches(existing, expected)) throw stockEntryIdConflict();
    const ingredient = await findIngredient(database, ingredientId);
    if (!ingredient) throw new PosError(404, "El insumo no existe.");
    return {
      entry: mapInventoryStockEntry(existing),
      ingredient,
      idempotent: true,
    };
  }

  const current = await findIngredient(database, ingredientId);
  if (!current) throw new PosError(404, "El insumo no existe.");
  assertStockEntryResultIsSafe(current.stock, input.quantity);

  const operationToken = crypto.randomUUID();
  const createdAt = now.toISOString();
  const statement = database
    .prepare(`
      INSERT INTO inventory_stock_entries (
        id, item_type, item_id, item_name, location,
        quantity_before, quantity_added, quantity_after,
        actor_role, operation_token, created_at
      )
      SELECT ?, 'ingredient', ingredient.id, ingredient.name, 'ingredient',
        ingredient.stock, ?, ingredient.stock + ?,
        'admin', ?, ?
      FROM ingredients AS ingredient
      WHERE ingredient.id = ?
        AND ingredient.stock BETWEEN 0 AND ?
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(
      input.id,
      input.quantity,
      input.quantity,
      operationToken,
      createdAt,
      ingredientId,
      Number.MAX_SAFE_INTEGER - input.quantity,
    );

  try {
    await database.batch([statement]);
  } catch (error) {
    const raced = await findInventoryStockEntryRow(database, input.id);
    if (raced && stockEntryMatches(raced, expected)) {
      const ingredient = await findIngredient(database, ingredientId);
      if (!ingredient) throw new PosError(404, "El insumo no existe.");
      return {
        entry: mapInventoryStockEntry(raced),
        ingredient,
        idempotent: true,
      };
    }
    if (raced) throw stockEntryIdConflict();
    if (
      error instanceof Error &&
      error.message.includes("inventory stock entry ingredient conflict")
    ) {
      throw new PosError(
        409,
        "El stock cambió antes de registrar el ingreso. Revisa el total e intenta nuevamente.",
      );
    }
    throw error;
  }

  const entryRow = await findInventoryStockEntryRow(database, input.id);
  if (!entryRow) {
    const latest = await findIngredient(database, ingredientId);
    if (!latest) throw new PosError(404, "El insumo no existe.");
    assertStockEntryResultIsSafe(latest.stock, input.quantity);
    throw new PosError(
      409,
      "El insumo cambió antes de registrar el ingreso. Revisa sus datos e intenta nuevamente.",
    );
  }
  if (!stockEntryMatches(entryRow, expected)) throw stockEntryIdConflict();
  const ingredient = await findIngredient(database, ingredientId);
  if (!ingredient) throw new Error("Ingredient missing after stock entry");
  return {
    entry: mapInventoryStockEntry(entryRow),
    ingredient,
    idempotent: entryRow.operation_token !== operationToken,
  };
}

const zonedDateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getZonedParts(date: Date, timeZone: string) {
  let formatter = zonedDateTimeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    zonedDateTimeFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function firstInstantOfZonedDate(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const targetDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const utcMidnight = Date.UTC(year, month - 1, day);
  let low = utcMidnight - 48 * 60 * 60 * 1000;
  let high = utcMidnight + 48 * 60 * 60 * 1000;

  // Local calendar dates advance monotonically even when a DST transition
  // skips or repeats wall-clock times. Finding the first instant whose local
  // date is >= the target works even when local 00:00 itself does not exist.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const observed = getZonedParts(new Date(middle), timeZone);
    const observedDate = `${String(observed.year).padStart(4, "0")}-${String(observed.month).padStart(2, "0")}-${String(observed.day).padStart(2, "0")}`;
    if (observedDate < targetDate) low = middle + 1;
    else high = middle;
  }

  const first = new Date(low);
  const observed = getZonedParts(first, timeZone);
  const observedDate = `${String(observed.year).padStart(4, "0")}-${String(observed.month).padStart(2, "0")}-${String(observed.day).padStart(2, "0")}`;
  if (observedDate !== targetDate) {
    throw new PosError(400, "La fecha de negocio no existe en la zona horaria.");
  }
  return first;
}

export function getSantiagoDayBounds(now = new Date()): {
  startIso: string;
  endIso: string;
} {
  return getSantiagoDateBounds(getSantiagoBusinessDate(now));
}

export function getSantiagoBusinessDate(now = new Date()): string {
  const current = getZonedParts(now, "America/Santiago");
  return `${String(current.year).padStart(4, "0")}-${String(current.month).padStart(2, "0")}-${String(current.day).padStart(2, "0")}`;
}

function parseBusinessDate(businessDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate);
  if (!match) throw new PosError(400, "La fecha de negocio no es válida.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() + 1 !== month ||
    calendarCheck.getUTCDate() !== day
  ) {
    throw new PosError(400, "La fecha de negocio no es válida.");
  }
  return { year, month, day };
}

function getSantiagoDateStart(businessDate: string): Date {
  const { year, month, day } = parseBusinessDate(businessDate);
  return firstInstantOfZonedDate(
    year,
    month,
    day,
    "America/Santiago",
  );
}

export function getSantiagoDateBounds(businessDate: string): {
  startIso: string;
  endIso: string;
} {
  const { year, month, day } = parseBusinessDate(businessDate);
  const nextCalendarDay = new Date(
    Date.UTC(year, month - 1, day + 1),
  );
  const start = getSantiagoDateStart(businessDate);
  const nextDate = nextCalendarDay.toISOString().slice(0, 10);
  const end = getSantiagoDateStart(nextDate);

  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export const DEFAULT_SALES_REPORT_DAYS = 30;
export const MAX_SALES_REPORT_DAYS = 366;
export const MAX_SALES_EXPORT_ROWS = 1500;
export const MAX_SALES_EXPORT_PAYMENT_ROWS = 10_000;

function offsetCalendarDate(businessDate: string, days: number): string {
  const { year, month, day } = parseBusinessDate(businessDate);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function calendarDayCount(dateFrom: string, dateTo: string): number {
  const start = Date.parse(`${dateFrom}T00:00:00.000Z`);
  const end = Date.parse(`${dateTo}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function normalizeSalesReportDateRange(
  options: { dateFrom?: string | null; dateTo?: string | null } = {},
  now = new Date(),
): SalesReportDateRange {
  const today = getSantiagoBusinessDate(now);
  const dateTo = options.dateTo ?? today;
  const dateFrom =
    options.dateFrom ??
    offsetCalendarDate(dateTo, -(DEFAULT_SALES_REPORT_DAYS - 1));

  getSantiagoDateBounds(dateFrom);
  getSantiagoDateBounds(dateTo);
  if (dateFrom > dateTo) {
    throw new PosError(
      400,
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
  }
  const dayCount = calendarDayCount(dateFrom, dateTo);
  if (dayCount > MAX_SALES_REPORT_DAYS) {
    throw new PosError(
      400,
      `El reporte no puede superar ${MAX_SALES_REPORT_DAYS} días.`,
    );
  }
  return { dateFrom, dateTo, dayCount };
}

function enumerateSalesReportDays(range: SalesReportDateRange): Array<{
  date: string;
  startIso: string;
  endIso: string;
}> {
  const dates = Array.from({ length: range.dayCount }, (_, index) =>
    offsetCalendarDate(range.dateFrom, index),
  );
  const boundaryDates = [...dates, offsetCalendarDate(range.dateTo, 1)];
  const boundaries = boundaryDates.map((date) =>
    getSantiagoDateStart(date).toISOString(),
  );
  return dates.map((date, index) => ({
    date,
    startIso: boundaries[index],
    endIso: boundaries[index + 1],
  }));
}

const shiftSessionColumns = `
  id, business_date, shift, responsible, opening_cash_clp,
  activity_revision, status, opened_at, closed_at, closure_id
`;

function mapShiftSession(row: ShiftSessionRow): ShiftSession {
  return {
    id: row.id,
    businessDate: row.business_date,
    shift: row.shift,
    responsible: row.responsible,
    openingCashClp: Number(row.opening_cash_clp),
    activityRevision: Number(row.activity_revision),
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    closureId: row.closure_id,
  };
}

export async function findShiftSession(
  database: D1Database,
  id: string,
): Promise<ShiftSession | null> {
  const row = await database
    .prepare(`SELECT ${shiftSessionColumns} FROM shift_sessions WHERE id = ?`)
    .bind(id)
    .first<ShiftSessionRow>();
  return row ? mapShiftSession(row) : null;
}

export async function getActiveShiftSession(
  database: D1Database,
): Promise<ShiftSession | null> {
  const row = await database
    .prepare(`
      SELECT ${shiftSessionColumns}
      FROM shift_sessions
      WHERE active_slot = 1 AND status = 'open'
      LIMIT 1
    `)
    .first<ShiftSessionRow>();
  return row ? mapShiftSession(row) : null;
}

async function getActiveShiftSessionForContext(
  database: D1Database,
  businessDate: string,
  shift: Shift,
): Promise<ShiftSession | null> {
  const row = await database
    .prepare(`
      SELECT ${shiftSessionColumns}
      FROM shift_sessions
      WHERE active_slot = 1 AND status = 'open'
        AND business_date = ? AND shift = ?
      LIMIT 1
    `)
    .bind(businessDate, shift)
    .first<ShiftSessionRow>();
  return row ? mapShiftSession(row) : null;
}

/**
 * Compact, non-identifying accounting summary for the active shift. A
 * collaborator consumption remains outside sales and cash until an actual
 * settlement is received; that payment then belongs to the collecting shift.
 */
export async function getActiveShiftState(
  database: D1Database,
): Promise<ActiveShiftState | null> {
  const row = await database
    .prepare(`
      SELECT
        session.id AS session_id,
        session.business_date,
        session.shift,
        session.responsible,
        session.opening_cash_clp,
        session.activity_revision,
        session.status,
        session.opened_at,
        session.closed_at,
        session.closure_id,
        COALESCE((
          SELECT SUM(sale.total_clp)
          FROM sales AS sale
          WHERE (sale.shift_session_id = session.id OR (
              sale.shift_session_id IS NULL
              AND sale.business_date = session.business_date
              AND sale.shift = session.shift
            ))
            AND sale.checkout_method <> 'colaborador'
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
        ), 0) AS included_sales_clp,
        COALESCE((
          SELECT COUNT(*)
          FROM sales AS sale
          WHERE (sale.shift_session_id = session.id OR (
              sale.shift_session_id IS NULL
              AND sale.business_date = session.business_date
              AND sale.shift = session.shift
            ))
            AND sale.checkout_method <> 'colaborador'
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
        ), 0) AS included_sales_count,
        COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          INNER JOIN sales AS sale ON sale.id = payment.sale_id
          WHERE (payment.shift_session_id = session.id OR (
              payment.shift_session_id IS NULL
              AND payment.business_date = session.business_date
              AND payment.shift = session.shift
            ))
            AND (sale.checkout_method <> 'colaborador'
              OR payment.kind = 'settlement')
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
            AND payment.payment_method = 'efectivo'
        ), 0) AS cash_collected_clp,
        COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          INNER JOIN sales AS sale ON sale.id = payment.sale_id
          WHERE (payment.shift_session_id = session.id OR (
              payment.shift_session_id IS NULL
              AND payment.business_date = session.business_date
              AND payment.shift = session.shift
            ))
            AND (sale.checkout_method <> 'colaborador'
              OR payment.kind = 'settlement')
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
            AND payment.payment_method = 'tarjeta'
        ), 0) AS card_collected_clp,
        COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          INNER JOIN sales AS sale ON sale.id = payment.sale_id
          WHERE (payment.shift_session_id = session.id OR (
              payment.shift_session_id IS NULL
              AND payment.business_date = session.business_date
              AND payment.shift = session.shift
            ))
            AND (sale.checkout_method <> 'colaborador'
              OR payment.kind = 'settlement')
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
            AND payment.payment_method = 'transferencia'
        ), 0) AS transfer_collected_clp,
        COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          WHERE (payment.shift_session_id = session.id OR (
              payment.shift_session_id IS NULL
              AND payment.business_date = session.business_date
              AND payment.shift = session.shift
            ))
            AND payment.kind = 'settlement'
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
            )
        ), 0) AS settlement_collected_clp
      FROM shift_sessions AS session
      WHERE session.active_slot = 1 AND session.status = 'open'
      LIMIT 1
    `)
    .first<{
      session_id: string;
      business_date: string;
      shift: Shift;
      responsible: Collaborator;
      opening_cash_clp: number;
      activity_revision: number;
      status: ShiftSessionStatus;
      opened_at: string;
      closed_at: string | null;
      closure_id: string | null;
      included_sales_clp: number;
      included_sales_count: number;
      cash_collected_clp: number;
      card_collected_clp: number;
      transfer_collected_clp: number;
      settlement_collected_clp: number;
    }>();
  if (!row) return null;
  const cashCollectedClp = Number(row.cash_collected_clp);
  const cardCollectedClp = Number(row.card_collected_clp);
  const transferCollectedClp = Number(row.transfer_collected_clp);
  const summary: ActiveShiftSummary = {
    sessionId: row.session_id,
    businessDate: row.business_date,
    shift: row.shift,
    activityRevision: Number(row.activity_revision),
    includedSalesClp: Number(row.included_sales_clp),
    includedSalesCount: Number(row.included_sales_count),
    cashCollectedClp,
    cardCollectedClp,
    transferCollectedClp,
    settlementCollectedClp: Number(row.settlement_collected_clp),
    totalCollectedClp:
      cashCollectedClp + cardCollectedClp + transferCollectedClp,
  };
  return {
    session: {
      id: row.session_id,
      businessDate: row.business_date,
      shift: row.shift,
      responsible: row.responsible,
      openingCashClp: Number(row.opening_cash_clp),
      activityRevision: Number(row.activity_revision),
      status: row.status,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      closureId: row.closure_id,
    },
    summary,
  };
}

export async function getActiveShiftSummary(
  database: D1Database,
): Promise<ActiveShiftSummary | null> {
  return (await getActiveShiftState(database))?.summary ?? null;
}

export async function getShiftSessionForContext(
  database: D1Database,
  businessDate: string,
  shift: Shift,
): Promise<ShiftSession | null> {
  const row = await database
    .prepare(`
      SELECT ${shiftSessionColumns}
      FROM shift_sessions
      WHERE business_date = ? AND shift = ?
      ORDER BY opened_at DESC, id DESC
      LIMIT 1
    `)
    .bind(businessDate, shift)
    .first<ShiftSessionRow>();
  return row ? mapShiftSession(row) : null;
}

function sessionMatchesOpenInput(
  session: ShiftSession,
  input: OpenShiftSessionInput,
): boolean {
  return (
    session.shift === input.shift &&
    session.responsible === input.responsible &&
    session.openingCashClp === input.openingCashClp
  );
}

export async function openShiftSession(
  database: D1Database,
  input: OpenShiftSessionInput,
  now = new Date(),
): Promise<{ session: ShiftSession; idempotent: boolean }> {
  if (!isShift(input.shift)) throw new PosError(400, "El turno debe ser AM o PM.");
  if (!isCollaborator(input.responsible)) {
    throw new PosError(400, "El colaborador responsable no es válido.");
  }
  if (!Number.isSafeInteger(input.openingCashClp) || input.openingCashClp < 0) {
    throw new PosError(400, "El efectivo inicial debe ser un entero no negativo.");
  }
  const businessDate = getSantiagoBusinessDate(now);
  const existing = await findShiftSession(database, input.id);
  if (existing) {
    if (!sessionMatchesOpenInput(existing, input)) {
      throw new PosError(409, "El id de la sesión ya fue utilizado.");
    }
    return { session: existing, idempotent: true };
  }

  const openedAt = now.toISOString();
  try {
    const result = await database
      .prepare(`
        INSERT INTO shift_sessions (
          id, business_date, shift, responsible, opening_cash_clp,
          activity_revision, status, active_slot, opened_at, closed_at,
          closure_id
        )
        SELECT ?, ?, ?, ?, ?, 0, 'open', 1, ?, NULL, NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM shift_sessions WHERE active_slot = 1
        )
      `)
      .bind(
        input.id,
        businessDate,
        input.shift,
        input.responsible,
        input.openingCashClp,
        openedAt,
      )
      .run();
    if (Number(result.meta.changes ?? 0) > 0) {
      const session = await findShiftSession(database, input.id);
      if (!session) throw new Error("Shift session missing after insert");
      return { session, idempotent: false };
    }
  } catch (error) {
    const same = await findShiftSession(database, input.id);
    if (same) {
      if (!sessionMatchesOpenInput(same, input)) {
        throw new PosError(409, "El id de la sesión ya fue utilizado.");
      }
      return { session: same, idempotent: true };
    }
    const active = await getActiveShiftSession(database);
    if (active) {
      throw new PosError(
        409,
        `El turno ${active.shift.toUpperCase()} de ${active.responsible} sigue abierto. Debe cerrarse antes de iniciar otro.`,
      );
    }
    throw error;
  }

  const active = await getActiveShiftSession(database);
  if (active) {
    throw new PosError(
      409,
      `El turno ${active.shift.toUpperCase()} de ${active.responsible} sigue abierto. Debe cerrarse antes de iniciar otro.`,
    );
  }
  throw new PosError(409, "No se pudo abrir el turno. Actualiza el estado e intenta nuevamente.");
}

export async function getDailySummary(
  database: D1Database,
  now = new Date(),
): Promise<PosSummary> {
  const { startIso, endIso } = getSantiagoDayBounds(now);
  const row = await database
    .prepare(`
      SELECT
        (SELECT COALESCE(SUM(sale.total_clp), 0) FROM sales AS sale
          WHERE sale.created_at >= ? AND sale.created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )) AS total_clp,
        (SELECT COUNT(*) FROM sales AS sale
          WHERE sale.created_at >= ? AND sale.created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )) AS sales_count,
        (SELECT COALESCE(SUM(si.quantity), 0)
          FROM sale_items AS si INNER JOIN sales AS s ON s.id = si.sale_id
          WHERE s.created_at >= ? AND s.created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = s.id
            )) AS units,
        (SELECT COALESCE(SUM(payment.amount_clp), 0)
          FROM sale_payments AS payment
          WHERE payment.created_at >= ? AND payment.created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
            )) AS collected_clp,
        (SELECT COALESCE(SUM(
            sale.total_clp - COALESCE((
              SELECT SUM(payment.amount_clp)
              FROM sale_payments AS payment
              WHERE payment.sale_id = sale.id
            ), 0)
          ), 0)
          FROM sales AS sale
          WHERE sale.payment_status = 'pending'
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )) AS outstanding_clp
    `)
    .bind(
      startIso,
      endIso,
      startIso,
      endIso,
      startIso,
      endIso,
      startIso,
      endIso,
    )
    .first<{
      total_clp: number;
      sales_count: number;
      units: number;
      collected_clp: number;
      outstanding_clp: number;
    }>();
  const totalClp = Number(row?.total_clp ?? 0);
  const salesCount = Number(row?.sales_count ?? 0);

  return {
    totalClp,
    salesCount,
    averageClp: salesCount === 0 ? 0 : Math.round(totalClp / salesCount),
    units: Number(row?.units ?? 0),
    collectedClp: Number(row?.collected_clp ?? 0),
    outstandingClp: Number(row?.outstanding_clp ?? 0),
  };
}

function reportDaysValuesSql(
  days: Array<{ date: string; startIso: string; endIso: string }>,
): string {
  // Every value is generated from validated calendar dates and ISO timestamps,
  // so this avoids hundreds of D1 bindings without accepting arbitrary SQL.
  return days
    .map(({ date, startIso, endIso }) =>
      `('${date}', '${startIso}', '${endIso}')`,
    )
    .join(",\n");
}

function sumDailySalesMetrics(
  days: DailySalesReportDay[],
): DailySalesMetrics {
  const totals = days.reduce<DailySalesMetrics>(
    (sum, day) => ({
      totalSalesClp: sum.totalSalesClp + day.totalSalesClp,
      salesCount: sum.salesCount + day.salesCount,
      units: sum.units + day.units,
      averageClp: 0,
      outstandingSalesClp:
        sum.outstandingSalesClp + day.outstandingSalesClp,
      pendingCustomerClp: sum.pendingCustomerClp + day.pendingCustomerClp,
      collaboratorClp: sum.collaboratorClp + day.collaboratorClp,
      collectedClp: sum.collectedClp + day.collectedClp,
      settlementClp: sum.settlementClp + day.settlementClp,
      cashClp: sum.cashClp + day.cashClp,
      cardClp: sum.cardClp + day.cardClp,
      transferClp: sum.transferClp + day.transferClp,
    }),
    {
      totalSalesClp: 0,
      salesCount: 0,
      units: 0,
      averageClp: 0,
      outstandingSalesClp: 0,
      pendingCustomerClp: 0,
      collaboratorClp: 0,
      collectedClp: 0,
      settlementClp: 0,
      cashClp: 0,
      cardClp: 0,
      transferClp: 0,
    },
  );
  totals.averageClp =
    totals.salesCount === 0
      ? 0
      : Math.round(totals.totalSalesClp / totals.salesCount);
  return totals;
}

/**
 * Returns an administrative report with two deliberately separate timelines:
 * sales are grouped by their Santiago creation day, while collections are
 * grouped by the day each payment was actually received.
 */
export async function getDailySalesReport(
  database: D1Database,
  options: { dateFrom?: string | null; dateTo?: string | null } = {},
  now = new Date(),
): Promise<DailySalesReport> {
  const range = normalizeSalesReportDateRange(options, now);
  const calendarDays = enumerateSalesReportDays(range);
  const daysValues = reportDaysValuesSql(calendarDays);
  const overallStart = calendarDays[0].startIso;
  const overallEnd = calendarDays.at(-1)!.endIso;

  const [originatedRows, collectedRows] = await Promise.all([
    database
      .prepare(`
        WITH report_days(report_date, start_iso, end_iso) AS (
          VALUES ${daysValues}
        ),
        report_sales AS (
          SELECT * FROM sales
          WHERE created_at >= ? AND created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sales.id
            )
        ),
        item_totals AS (
          SELECT item.sale_id, SUM(item.quantity) AS units
          FROM sale_items AS item
          INNER JOIN report_sales AS report_sale ON report_sale.id = item.sale_id
          GROUP BY item.sale_id
        ),
        payment_totals AS (
          SELECT payment.sale_id, SUM(payment.amount_clp) AS paid_clp
          FROM sale_payments AS payment
          INNER JOIN report_sales AS report_sale ON report_sale.id = payment.sale_id
          GROUP BY payment.sale_id
        )
        SELECT
          day.report_date,
          COALESCE(SUM(sale.total_clp), 0) AS total_sales_clp,
          COUNT(sale.id) AS sales_count,
          COALESCE(SUM(item.units), 0) AS units,
          COALESCE(SUM(
            CASE WHEN sale.id IS NULL THEN 0
              ELSE MAX(sale.total_clp - COALESCE(payment.paid_clp, 0), 0)
            END
          ), 0) AS outstanding_sales_clp,
          COALESCE(SUM(
            CASE WHEN sale.checkout_method = 'pendiente'
              THEN MAX(sale.total_clp - COALESCE(payment.paid_clp, 0), 0)
              ELSE 0
            END
          ), 0) AS pending_customer_clp,
          COALESCE(SUM(
            CASE WHEN sale.checkout_method = 'colaborador'
              THEN MAX(sale.total_clp - COALESCE(payment.paid_clp, 0), 0)
              ELSE 0
            END
          ), 0) AS collaborator_clp
        FROM report_days AS day
        LEFT JOIN report_sales AS sale
          ON sale.created_at >= day.start_iso AND sale.created_at < day.end_iso
        LEFT JOIN item_totals AS item ON item.sale_id = sale.id
        LEFT JOIN payment_totals AS payment ON payment.sale_id = sale.id
        GROUP BY day.report_date
        ORDER BY day.report_date DESC
      `)
      .bind(overallStart, overallEnd)
      .all<DailyOriginatedSalesRow>(),
    database
      .prepare(`
        WITH report_days(report_date, start_iso, end_iso) AS (
          VALUES ${daysValues}
        ),
        report_payments AS (
          SELECT payment.* FROM sale_payments AS payment
          WHERE payment.created_at >= ? AND payment.created_at < ?
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
            )
        )
        SELECT
          day.report_date,
          COALESCE(SUM(payment.amount_clp), 0) AS collected_clp,
          COALESCE(SUM(CASE WHEN payment.kind = 'settlement'
            THEN payment.amount_clp ELSE 0 END), 0) AS settlement_clp,
          COALESCE(SUM(CASE WHEN payment.payment_method = 'efectivo'
            THEN payment.amount_clp ELSE 0 END), 0) AS cash_clp,
          COALESCE(SUM(CASE WHEN payment.payment_method IN ('tarjeta', 'debito', 'credito')
            THEN payment.amount_clp ELSE 0 END), 0) AS card_clp,
          COALESCE(SUM(CASE WHEN payment.payment_method = 'transferencia'
            THEN payment.amount_clp ELSE 0 END), 0) AS transfer_clp
        FROM report_days AS day
        LEFT JOIN report_payments AS payment
          ON payment.created_at >= day.start_iso AND payment.created_at < day.end_iso
        GROUP BY day.report_date
        ORDER BY day.report_date DESC
      `)
      .bind(overallStart, overallEnd)
      .all<DailyCollectedPaymentsRow>(),
  ]);

  const collectionsByDate = new Map(
    collectedRows.results.map((row) => [row.report_date, row]),
  );
  const days = originatedRows.results.map<DailySalesReportDay>((row) => {
    const collections = collectionsByDate.get(row.report_date);
    const totalSalesClp = Number(row.total_sales_clp ?? 0);
    const salesCount = Number(row.sales_count ?? 0);
    return {
      date: row.report_date,
      totalSalesClp,
      salesCount,
      units: Number(row.units ?? 0),
      averageClp:
        salesCount === 0 ? 0 : Math.round(totalSalesClp / salesCount),
      outstandingSalesClp: Number(row.outstanding_sales_clp ?? 0),
      pendingCustomerClp: Number(row.pending_customer_clp ?? 0),
      collaboratorClp: Number(row.collaborator_clp ?? 0),
      collectedClp: Number(collections?.collected_clp ?? 0),
      settlementClp: Number(collections?.settlement_clp ?? 0),
      cashClp: Number(collections?.cash_clp ?? 0),
      cardClp: Number(collections?.card_clp ?? 0),
      transferClp: Number(collections?.transfer_clp ?? 0),
    };
  });
  const totals = sumDailySalesMetrics(days);
  return {
    period: {
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      ...totals,
    },
    days,
  };
}

async function attachItems(
  database: D1Database,
  saleRows: SaleRow[],
): Promise<StoredSale[]> {
  if (saleRows.length === 0) return [];

  const itemsBySale = new Map<string, PosSaleItem[]>();
  const paymentsBySale = new Map<string, SalePayment[]>();
  const paymentStatsBySale = new Map<
    string,
    { paidClp: number; paymentCount: number }
  >();
  const chunkSize = 90;
  for (let start = 0; start < saleRows.length; start += chunkSize) {
    const chunk = saleRows.slice(start, start + chunkSize);
    const placeholders = chunk.map(() => "?").join(", ");
    const saleIds = chunk.map((sale) => sale.id);
    const [items, payments] = await Promise.all([
      database
        .prepare(`
          SELECT sale_id, product_id, product_name, unit_price_clp, quantity,
            line_total_clp
          FROM sale_items
          WHERE sale_id IN (${placeholders})
          ORDER BY id
        `)
        .bind(...saleIds)
        .all<SaleItemRow>(),
      database
        .prepare(`
          SELECT id, sale_id, created_at, business_date, shift,
            shift_session_id, payment_method, amount_clp, received_by, kind,
            payment_count, paid_clp
          FROM (
            SELECT id, sale_id, created_at, business_date, shift,
              shift_session_id, payment_method, amount_clp, received_by, kind,
              COUNT(*) OVER (PARTITION BY sale_id) AS payment_count,
              SUM(amount_clp) OVER (PARTITION BY sale_id) AS paid_clp,
              ROW_NUMBER() OVER (
                PARTITION BY sale_id ORDER BY created_at DESC, id DESC
              ) AS payment_rank
            FROM sale_payments
            WHERE sale_id IN (${placeholders})
          )
          WHERE payment_rank <= 20
          ORDER BY created_at, id
        `)
        .bind(...saleIds)
        .all<SalePaymentRow>(),
    ]);
    for (const row of items.results) {
      const saleItems = itemsBySale.get(row.sale_id) ?? [];
      saleItems.push(mapSaleItem(row));
      itemsBySale.set(row.sale_id, saleItems);
    }
    for (const row of payments.results) {
      const salePayments = paymentsBySale.get(row.sale_id) ?? [];
      salePayments.push(mapSalePayment(row));
      paymentsBySale.set(row.sale_id, salePayments);
      paymentStatsBySale.set(row.sale_id, {
        paidClp: Number(row.paid_clp ?? 0),
        paymentCount: Number(row.payment_count ?? 0),
      });
    }
  }

  return saleRows.map((sale) =>
    mapStoredSale(
      sale,
      itemsBySale.get(sale.id) ?? [],
      paymentsBySale.get(sale.id) ?? [],
      paymentStatsBySale.get(sale.id)?.paidClp ?? 0,
      paymentStatsBySale.get(sale.id)?.paymentCount ?? 0,
    ),
  );
}

export async function getRecentSales(
  database: D1Database,
  limit = 10,
  now = new Date(),
): Promise<PosSale[]> {
  const { startIso, endIso } = getSantiagoDayBounds(now);
  const sales = await database
    .prepare(`
      SELECT ${saleColumns}
      FROM sales
      WHERE created_at >= ? AND created_at < ?
        AND NOT EXISTS (
          SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sales.id
        )
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `)
    .bind(startIso, endIso, limit)
    .all<SaleRow>();
  return (await attachItems(database, sales.results)).map(publicSale);
}

function validateTodaySalesCursor(cursor: TodaySalesCursor): void {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      cursor.createdAt,
    ) ||
    Number.isNaN(Date.parse(cursor.createdAt)) ||
    cursor.id.length < 1 ||
    cursor.id.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(cursor.id)
  ) {
    throw new PosError(400, "El cursor de ventas de hoy no es válido.");
  }
}

function mapTodaySale(
  row: TodaySaleRow,
  items: PosSaleItem[],
): TodaySale {
  const checkoutMethod = normalizeStoredCheckoutMethod(row.checkout_method);
  const paymentMethod = normalizePaymentMethod(row.payment_method);
  const totalClp = Number(row.total_clp);
  const paidClp = Number(row.paid_clp ?? 0);
  if (
    !Number.isSafeInteger(totalClp) ||
    totalClp <= 0 ||
    !Number.isSafeInteger(paidClp) ||
    paidClp < 0 ||
    paidClp > totalClp ||
    (row.payment_status === "paid" &&
      (paymentMethod === null || paidClp !== totalClp)) ||
    ((row.payment_status === "pending" ||
      row.payment_status === "verification_pending") &&
      paidClp >= totalClp)
  ) {
    throw new Error("Stored today sale payment ledger is inconsistent");
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    businessDate: row.business_date,
    shift: row.shift,
    sessionId: row.shift_session_id,
    responsible: row.seller,
    debtorCollaborator:
      checkoutMethod === "colaborador" ? row.debtor_collaborator : null,
    checkoutMethod,
    paymentStatus: row.payment_status,
    paymentMethod,
    totalClp,
    paidClp,
    balanceClp: totalClp - paidClp,
    transferValidatedAt: row.transfer_validated_at,
    transferValidatedBy: row.transfer_validated_by,
    transferEmailReference: row.transfer_email_reference,
    items,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    voidedBy: row.voided_by,
    canVoid: Boolean(row.can_void),
  };
}

/**
 * Returns only sales created during the current Santiago business day. One
 * page uses at most three D1 queries and 50 ids in the item lookup.
 */
export async function listTodaySales(
  database: D1Database,
  options: {
    role: "admin" | "sales";
    limit?: number;
    cursor?: TodaySalesCursor;
  },
  now = new Date(),
): Promise<TodaySalesPage> {
  if (options.role !== "admin" && options.role !== "sales") {
    throw new PosError(403, "El perfil no puede consultar las ventas de hoy.");
  }
  const limit = options.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new PosError(
      400,
      "El límite de ventas de hoy debe estar entre 1 y 50.",
    );
  }
  if (options.cursor) validateTodaySalesCursor(options.cursor);

  const businessDate = getSantiagoBusinessDate(now);
  const { startIso, endIso } = getSantiagoDateBounds(businessDate);
  if (
    options.cursor &&
    (options.cursor.createdAt < startIso || options.cursor.createdAt >= endIso)
  ) {
    throw new PosError(400, "El cursor no corresponde a las ventas de hoy.");
  }
  const cursorClause = options.cursor
    ? "AND (s.created_at < ? OR (s.created_at = ? AND s.id < ?))"
    : "";
  const cursorBindings = options.cursor
    ? [
        options.cursor.createdAt,
        options.cursor.createdAt,
        options.cursor.id,
      ]
    : [];
  const [rows, summaryRow] = await Promise.all([
    database
      .prepare(`
        SELECT
          s.id, s.created_at, s.business_date, s.shift, s.shift_session_id,
          s.payment_status, s.checkout_method, s.payment_method, s.debt_note,
          s.debtor_collaborator, s.paid_at, s.settlement_id, s.seller,
          s.total_clp,
          COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          WHERE payment.sale_id = s.id
        ), 0) AS paid_clp,
        void.created_at AS voided_at,
        void.reason AS void_reason,
        void.actor_name AS voided_by,
        transfer_validation.validated_at AS transfer_validated_at,
        transfer_validation.validated_by AS transfer_validated_by,
        transfer_validation.email_reference AS transfer_email_reference,
        CASE WHEN ? = 'admin'
          AND void.id IS NULL
          AND s.shift_session_id IS NOT NULL
          AND session.id = s.shift_session_id
          AND session.status = 'open'
          AND session.active_slot = 1
          AND EXISTS (
            SELECT 1 FROM sale_inventory_snapshots AS inventory_snapshot
            WHERE inventory_snapshot.sale_id = s.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM cash_closures AS closure
            WHERE closure.session_id = s.shift_session_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM cash_closure_revision_sales AS revision_sale
            WHERE revision_sale.sale_id = s.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM sale_payments AS settlement
            WHERE settlement.sale_id = s.id AND settlement.kind = 'settlement'
          )
        THEN 1 ELSE 0 END AS can_void
        FROM sales AS s
        LEFT JOIN sale_voids AS void ON void.sale_id = s.id
        LEFT JOIN transfer_validations AS transfer_validation
          ON transfer_validation.sale_id = s.id
        LEFT JOIN shift_sessions AS session ON session.id = s.shift_session_id
        WHERE s.created_at >= ? AND s.created_at < ?
          ${cursorClause}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ?
      `)
      .bind(options.role, startIso, endIso, ...cursorBindings, limit + 1)
      .all<TodaySaleRow>(),
    database
      .prepare(`
        WITH bounds(start_iso, end_iso) AS (VALUES (?, ?))
        SELECT
          (SELECT COUNT(*) FROM sales AS sale, bounds
            WHERE sale.created_at >= bounds.start_iso
              AND sale.created_at < bounds.end_iso) AS total_count,
          (SELECT COALESCE(SUM(sale.total_clp), 0)
            FROM sales AS sale, bounds
            WHERE sale.created_at >= bounds.start_iso
              AND sale.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS total_sales_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment, bounds
            WHERE payment.created_at >= bounds.start_iso
              AND payment.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
              )) AS collected_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment, bounds
            WHERE payment.created_at >= bounds.start_iso
              AND payment.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
              )
              AND payment.kind = 'settlement') AS settlement_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment, bounds
            WHERE payment.created_at >= bounds.start_iso
              AND payment.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
              )
              AND payment.payment_method = 'efectivo') AS cash_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment, bounds
            WHERE payment.created_at >= bounds.start_iso
              AND payment.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
              )
              AND payment.payment_method IN ('tarjeta', 'debito', 'credito'))
            AS card_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment, bounds
            WHERE payment.created_at >= bounds.start_iso
              AND payment.created_at < bounds.end_iso
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
              )
              AND payment.payment_method = 'transferencia') AS transfer_clp
          ,(SELECT COALESCE(SUM(sale.total_clp), 0)
            FROM sales AS sale, bounds
            WHERE sale.created_at >= bounds.start_iso
              AND sale.created_at < bounds.end_iso
              AND sale.payment_status = 'verification_pending'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS pending_transfer_clp
          ,(SELECT COUNT(*)
            FROM sales AS sale, bounds
            WHERE sale.created_at >= bounds.start_iso
              AND sale.created_at < bounds.end_iso
              AND sale.payment_status = 'verification_pending'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS pending_transfer_count
      `)
      .bind(startIso, endIso)
      .first<TodaySalesSummaryRow>(),
  ]);
  const hasMore = rows.results.length > limit;
  const pageRows = rows.results.slice(0, limit);
  const itemsBySale = new Map<string, PosSaleItem[]>();
  if (pageRows.length > 0) {
    const placeholders = pageRows.map(() => "?").join(", ");
    const itemRows = await database
      .prepare(`
        SELECT sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        FROM sale_items
        WHERE sale_id IN (${placeholders})
        ORDER BY sale_id, id
      `)
      .bind(...pageRows.map(({ id }) => id))
      .all<SaleItemRow>();
    for (const itemRow of itemRows.results) {
      const items = itemsBySale.get(itemRow.sale_id) ?? [];
      items.push(mapSaleItem(itemRow));
      itemsBySale.set(itemRow.sale_id, items);
    }
  }
  const last = pageRows.at(-1);
  return {
    businessDate,
    sales: pageRows.map((row) =>
      mapTodaySale(row, itemsBySale.get(row.id) ?? []),
    ),
    summary: {
      totalSalesClp: Number(summaryRow?.total_sales_clp ?? 0),
      collectedClp: Number(summaryRow?.collected_clp ?? 0),
      settlementClp: Number(summaryRow?.settlement_clp ?? 0),
      cashClp: Number(summaryRow?.cash_clp ?? 0),
      cardClp: Number(summaryRow?.card_clp ?? 0),
      transferClp: Number(summaryRow?.transfer_clp ?? 0),
      pendingTransferClp: Number(summaryRow?.pending_transfer_clp ?? 0),
      pendingTransferCount: Number(summaryRow?.pending_transfer_count ?? 0),
    },
    totalCount: Number(summaryRow?.total_count ?? 0),
    hasMore,
    nextCursor: hasMore && last ? `${last.created_at}~${last.id}` : null,
  };
}

function normalizeSaleHistoryFilters(
  options: {
    dateFrom?: string | null;
    dateTo?: string | null;
    paymentStatus?: PaymentStatus | null;
    paymentMethod?: SalePaymentMethod | (typeof LEGACY_PAYMENT_METHODS)[number] | null;
    q?: string | null;
  },
): SaleHistoryFilters {
  const dateFrom = options.dateFrom ?? null;
  const dateTo = options.dateTo ?? null;
  if (dateFrom !== null) getSantiagoDateBounds(dateFrom);
  if (dateTo !== null) getSantiagoDateBounds(dateTo);
  if (dateFrom !== null && dateTo !== null && dateFrom > dateTo) {
    throw new PosError(400, "La fecha inicial no puede ser posterior a la fecha final.");
  }
  const paymentStatus = options.paymentStatus ?? null;
  if (
    paymentStatus !== null &&
    paymentStatus !== "paid" &&
    paymentStatus !== "pending" &&
    paymentStatus !== "verification_pending"
  ) {
    throw new PosError(400, "El estado de pago no es válido.");
  }
  let paymentMethod = options.paymentMethod ?? null;
  if (paymentMethod === "debito" || paymentMethod === "credito") {
    paymentMethod = "tarjeta";
  }
  if (
    paymentMethod !== null &&
    !SALE_PAYMENT_METHODS.includes(paymentMethod as SalePaymentMethod)
  ) {
    throw new PosError(400, "El medio de pago no es válido.");
  }
  if (options.q !== undefined && options.q !== null && typeof options.q !== "string") {
    throw new PosError(400, "La búsqueda debe ser texto.");
  }
  const q = options.q?.trim() || null;
  if (q !== null && q.length > 80) {
    throw new PosError(400, "La búsqueda no puede superar 80 caracteres.");
  }
  return {
    dateFrom,
    dateTo,
    paymentStatus,
    paymentMethod: paymentMethod as SalePaymentMethod | null,
    q,
  };
}

function buildSaleHistoryFilterSql(filters: SaleHistoryFilters): {
  predicates: string[];
  bindings: Array<string | number>;
} {
  const predicates: string[] = [
    "NOT EXISTS (SELECT 1 FROM sale_voids AS void WHERE void.sale_id = s.id)",
  ];
  const bindings: Array<string | number> = [];
  if (filters.dateFrom !== null) {
    predicates.push("s.created_at >= ?");
    bindings.push(getSantiagoDateBounds(filters.dateFrom).startIso);
  }
  if (filters.dateTo !== null) {
    predicates.push("s.created_at < ?");
    bindings.push(getSantiagoDateBounds(filters.dateTo).endIso);
  }
  if (filters.paymentStatus !== null) {
    predicates.push("s.payment_status = ?");
    bindings.push(filters.paymentStatus);
  }
  if (filters.paymentMethod === "tarjeta") {
    predicates.push("s.checkout_method IN ('tarjeta', 'debito', 'credito')");
  } else if (filters.paymentMethod !== null) {
    predicates.push("s.checkout_method = ?");
    bindings.push(filters.paymentMethod);
  }
  if (filters.q !== null) {
    const term = filters.q.toLocaleLowerCase("es-CL");
    predicates.push(`(
      instr(lower(s.id), ?) > 0
      OR instr(lower(COALESCE(s.debt_note, '')), ?) > 0
      OR instr(lower(COALESCE(s.debtor_collaborator, '')), ?) > 0
      OR instr(lower(COALESCE(s.seller, '')), ?) > 0
      OR EXISTS (
        SELECT 1 FROM sale_items AS history_item
        WHERE history_item.sale_id = s.id
          AND instr(lower(history_item.product_name), ?) > 0
      )
      OR EXISTS (
        SELECT 1 FROM sale_payments AS history_payment
        WHERE history_payment.sale_id = s.id
          AND instr(lower(COALESCE(history_payment.received_by, '')), ?) > 0
      )
    )`);
    bindings.push(term, term, term, term, term, term);
  }
  return { predicates, bindings };
}

function validateSaleHistoryCursor(cursor: SaleHistoryCursor): void {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      cursor.createdAt,
    ) ||
    Number.isNaN(Date.parse(cursor.createdAt)) ||
    cursor.id.length < 1 ||
    cursor.id.length > 100 ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(cursor.id)
  ) {
    throw new PosError(400, "El cursor del historial no es válido.");
  }
}

/**
 * Lists the complete sales history through stable keyset pages. The matching
 * count intentionally ignores the cursor so the UI can retain useful context
 * while it advances through every result.
 */
export async function listSalesHistory(
  database: D1Database,
  options: {
    limit?: number;
    cursor?: SaleHistoryCursor;
    dateFrom?: string | null;
    dateTo?: string | null;
    paymentStatus?: PaymentStatus | null;
    paymentMethod?:
      | SalePaymentMethod
      | (typeof LEGACY_PAYMENT_METHODS)[number]
      | null;
    q?: string | null;
  } = {},
): Promise<SaleHistoryPage> {
  const limit = options.limit ?? 30;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 90) {
    throw new PosError(400, "El límite del historial debe estar entre 1 y 90.");
  }
  if (options.cursor) validateSaleHistoryCursor(options.cursor);
  const filters = normalizeSaleHistoryFilters(options);
  const { predicates, bindings: filterBindings } =
    buildSaleHistoryFilterSql(filters);

  const filterWhere = predicates.length > 0
    ? `WHERE ${predicates.join(" AND ")}`
    : "";
  const pagePredicates = [...predicates];
  const pageBindings = [...filterBindings];
  if (options.cursor) {
    pagePredicates.push(
      "(s.created_at < ? OR (s.created_at = ? AND s.id < ?))",
    );
    pageBindings.push(
      options.cursor.createdAt,
      options.cursor.createdAt,
      options.cursor.id,
    );
  }
  const pageWhere = pagePredicates.length > 0
    ? `WHERE ${pagePredicates.join(" AND ")}`
    : "";

  const [rows, countRow] = await Promise.all([
    database
      .prepare(`
        SELECT ${saleColumns}
        FROM sales AS s
        ${pageWhere}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ?
      `)
      .bind(...pageBindings, limit + 1)
      .all<SaleRow>(),
    database
      .prepare(`
        SELECT COUNT(*) AS count
        FROM sales AS s
        ${filterWhere}
      `)
      .bind(...filterBindings)
      .first<{ count: number }>(),
  ]);
  const hasMore = rows.results.length > limit;
  const pageRows = rows.results.slice(0, limit);
  const sales = (await attachItems(database, pageRows)).map(publicSale);
  const last = pageRows.at(-1);
  return {
    sales,
    totalCount: Number(countRow?.count ?? 0),
    hasMore,
    nextCursor: hasMore && last ? `${last.created_at}~${last.id}` : null,
    filters,
  };
}

function normalizeStoredCheckoutMethod(value: unknown): SalePaymentMethod {
  if (value === "debito" || value === "credito") return "tarjeta";
  if (
    typeof value === "string" &&
    SALE_PAYMENT_METHODS.includes(value as SalePaymentMethod)
  ) {
    return value as SalePaymentMethod;
  }
  throw new Error("Stored sale has an invalid checkout method");
}

/**
 * Loads one bounded export with one D1 query for sales originated in the
 * selected period and another for every payment actually received in that
 * period. Sale filters apply only to the sales detail; the payment timeline
 * deliberately remains aligned with the daily cash summary. Extra rows only
 * detect oversize exports, so data is never silently truncated.
 */
export async function listSalesForExport(
  database: D1Database,
  options: {
    dateFrom?: string | null;
    dateTo?: string | null;
    paymentStatus?: PaymentStatus | null;
    paymentMethod?:
      | SalePaymentMethod
      | (typeof LEGACY_PAYMENT_METHODS)[number]
      | null;
    q?: string | null;
  } = {},
  now = new Date(),
): Promise<SalesExportResult> {
  const dateRange = normalizeSalesReportDateRange(options, now);
  const filters = normalizeSaleHistoryFilters({
    ...options,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const { predicates, bindings } = buildSaleHistoryFilterSql(filters);
  const where = predicates.length > 0
    ? `WHERE ${predicates.join(" AND ")}`
    : "";
  const paymentStartIso = getSantiagoDateBounds(dateRange.dateFrom).startIso;
  const paymentEndIso = getSantiagoDateBounds(dateRange.dateTo).endIso;
  const [result, paymentResult] = await Promise.all([
    database
      .prepare(`
      WITH filtered_sales AS (
        SELECT s.*
        FROM sales AS s
        ${where}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT ?
      ),
      payment_totals AS (
        SELECT payment.sale_id, SUM(payment.amount_clp) AS paid_clp
        FROM sale_payments AS payment
        INNER JOIN filtered_sales AS filtered ON filtered.id = payment.sale_id
        GROUP BY payment.sale_id
      ),
      item_summaries AS (
        SELECT
          ordered_item.sale_id,
          SUM(ordered_item.quantity) AS units,
          GROUP_CONCAT(
            ordered_item.product_name || ' ×' || ordered_item.quantity,
            ' · '
          ) AS products
        FROM (
          SELECT item.sale_id, item.product_name, item.quantity
          FROM sale_items AS item
          INNER JOIN filtered_sales AS filtered ON filtered.id = item.sale_id
          ORDER BY item.sale_id, item.id
        ) AS ordered_item
        GROUP BY ordered_item.sale_id
      )
      SELECT
        sale.id,
        sale.created_at,
        sale.business_date,
        sale.shift,
        sale.seller,
        sale.checkout_method,
        sale.payment_status,
        sale.payment_method,
        sale.debt_note,
        sale.debtor_collaborator,
        sale.total_clp,
        COALESCE(payment.paid_clp, 0) AS paid_clp,
        MAX(sale.total_clp - COALESCE(payment.paid_clp, 0), 0) AS balance_clp,
        COALESCE(item.units, 0) AS units,
        item.products
      FROM filtered_sales AS sale
      LEFT JOIN payment_totals AS payment ON payment.sale_id = sale.id
      LEFT JOIN item_summaries AS item ON item.sale_id = sale.id
      ORDER BY sale.created_at DESC, sale.id DESC
    `)
      .bind(...bindings, MAX_SALES_EXPORT_ROWS + 1)
      .all<SalesExportDatabaseRow>(),
    database
      .prepare(`
        SELECT
          payment.id,
          payment.sale_id,
          payment.created_at,
          payment.payment_method,
          payment.amount_clp,
          payment.received_by,
          payment.shift,
          payment.kind
        FROM sale_payments AS payment
        WHERE payment.created_at >= ? AND payment.created_at < ?
          AND NOT EXISTS (
            SELECT 1 FROM sale_voids AS void WHERE void.sale_id = payment.sale_id
          )
        ORDER BY payment.created_at, payment.id
        LIMIT ?
      `)
      .bind(
        paymentStartIso,
        paymentEndIso,
        MAX_SALES_EXPORT_PAYMENT_ROWS + 1,
      )
      .all<SalesExportPaymentDatabaseRow>(),
  ]);

  if (result.results.length > MAX_SALES_EXPORT_ROWS) {
    throw new PosError(
      413,
      `La exportación supera ${MAX_SALES_EXPORT_ROWS} ventas. Acota el rango o aplica más filtros.`,
    );
  }
  if (paymentResult.results.length > MAX_SALES_EXPORT_PAYMENT_ROWS) {
    throw new PosError(
      413,
      `La exportación supera ${MAX_SALES_EXPORT_PAYMENT_ROWS} pagos. Acota el rango.`,
    );
  }

  return {
    filters,
    dateRange,
    sales: result.results.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      businessDate: row.business_date,
      shift: row.shift,
      seller: row.seller,
      checkoutMethod: normalizeStoredCheckoutMethod(row.checkout_method),
      paymentStatus: row.payment_status,
      settledPaymentMethod: normalizePaymentMethod(row.payment_method),
      debtNote: row.debt_note,
      debtorCollaborator: row.debtor_collaborator,
      totalClp: Number(row.total_clp),
      paidClp: Number(row.paid_clp),
      balanceClp: Number(row.balance_clp),
      units: Number(row.units),
      products: row.products ?? "",
    })),
    payments: paymentResult.results.map((row) => {
      const paymentMethod = normalizePaymentMethod(row.payment_method);
      if (paymentMethod === null) {
        throw new Error("Stored sale payment has an invalid payment method");
      }
      return {
        id: row.id,
        saleId: row.sale_id,
        createdAt: row.created_at,
        paymentMethod,
        amountClp: Number(row.amount_clp),
        receivedBy: row.received_by,
        shift: row.shift,
        kind: row.kind,
      };
    }),
  };
}

async function findStoredSale(
  database: D1Database,
  column: "id" | "settlement_id",
  value: string,
): Promise<StoredSale | null> {
  const sale = await database
    .prepare(`SELECT ${saleColumns} FROM sales WHERE ${column} = ?`)
    .bind(value)
    .first<SaleRow>();

  if (!sale) return null;
  const [result] = await attachItems(database, [sale]);
  return result;
}

export async function findSale(
  database: D1Database,
  id: string,
): Promise<PosSale | null> {
  const [sale, saleVoid] = await Promise.all([
    findStoredSale(database, "id", id),
    findSaleVoidBy(database, "sale_id", id),
  ]);
  if (saleVoid) return null;
  return sale ? publicSale(sale) : null;
}

export async function listPendingDebts(
  database: D1Database,
  options: {
    role: "admin" | "sales";
    limit?: number;
    cursor?: DebtCursor;
    kind?: "all" | "customer" | "collaborator";
    collaborator?: string | null;
  },
): Promise<DebtPage> {
  if (options.role !== "admin" && options.role !== "sales") {
    throw new PosError(403, "El perfil no puede consultar cuentas pendientes.");
  }
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 90) {
    throw new PosError(400, "El límite de deudas debe estar entre 1 y 90.");
  }
  const kind = options.kind ?? "all";
  if (kind !== "all" && kind !== "customer" && kind !== "collaborator") {
    throw new PosError(400, "El tipo de deuda no es válido.");
  }
  const collaborator = options.collaborator?.trim() || null;
  if (collaborator !== null && (collaborator.length > 100 || kind !== "collaborator")) {
    throw new PosError(400, "El filtro de colaborador no es válido.");
  }
  const cursorClause = options.cursor
    ? "AND (created_at > ? OR (created_at = ? AND id > ?))"
    : "";
  const kindClause = kind === "customer"
    ? "AND checkout_method = 'pendiente'"
    : kind === "collaborator"
      ? "AND checkout_method = 'colaborador'"
      : "";
  const collaboratorClause = collaborator === null
    ? ""
    : "AND debtor_collaborator = ?";
  const filterBindings: Array<string> = collaborator === null
    ? []
    : [collaborator];
  const rowsStatement = database.prepare(`
    SELECT ${saleColumns}
    FROM sales
    WHERE payment_status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sales.id
      )
      ${kindClause}
      ${collaboratorClause}
      ${cursorClause}
    ORDER BY created_at, id
    LIMIT ?
  `);
  const [rows, summaryRow, collaboratorRows] = await Promise.all([
    (options.cursor
      ? rowsStatement.bind(
          ...filterBindings,
          options.cursor.createdAt,
          options.cursor.createdAt,
          options.cursor.id,
          limit + 1,
        )
      : rowsStatement.bind(...filterBindings, limit + 1)
    ).all<SaleRow>(),
    database
      .prepare(`
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(sale.total_clp), 0) AS original_clp,
          COALESCE(SUM(COALESCE((
            SELECT SUM(payment.amount_clp)
            FROM sale_payments AS payment
            WHERE payment.sale_id = sale.id
          ), 0)), 0) AS paid_clp,
          COALESCE(SUM(
            sale.total_clp - COALESCE((
              SELECT SUM(payment.amount_clp)
              FROM sale_payments AS payment
              WHERE payment.sale_id = sale.id
            ), 0)
          ), 0) AS balance_clp
        FROM sales AS sale
        WHERE sale.payment_status = 'pending'
          AND NOT EXISTS (
            SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
          )
      `)
      .first<{
        count: number;
        original_clp: number;
        paid_clp: number;
        balance_clp: number;
      }>(),
    database
      .prepare(`
        WITH collaborator_debts AS (
          SELECT
            sale.debtor_collaborator AS collaborator,
            sale.total_clp AS original_clp,
            COALESCE((
              SELECT SUM(payment.amount_clp)
              FROM sale_payments AS payment
              WHERE payment.sale_id = sale.id
            ), 0) AS paid_clp
          FROM sales AS sale
          WHERE sale.payment_status = 'pending'
            AND sale.checkout_method = 'colaborador'
            AND sale.debtor_collaborator IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
            )
        )
        SELECT
          collaborator,
          COUNT(*) AS count,
          COALESCE(SUM(original_clp), 0) AS original_clp,
          COALESCE(SUM(paid_clp), 0) AS paid_clp,
          COALESCE(SUM(original_clp - paid_clp), 0) AS balance_clp
        FROM collaborator_debts
        GROUP BY collaborator
        ORDER BY balance_clp DESC, collaborator COLLATE NOCASE
      `)
      .all<{
        collaborator: string;
        count: number;
        original_clp: number;
        paid_clp: number;
        balance_clp: number;
      }>(),
  ]);
  const hasMore = rows.results.length > limit;
  const pageRows = rows.results.slice(0, limit);
  const debts = (await attachItems(database, pageRows)).map(publicSale);
  const last = pageRows.at(-1);
  return {
    debts,
    summary: {
      count: Number(summaryRow?.count ?? 0),
      totalClp: Number(summaryRow?.balance_clp ?? 0),
      originalClp: Number(summaryRow?.original_clp ?? 0),
      paidClp: Number(summaryRow?.paid_clp ?? 0),
      balanceClp: Number(summaryRow?.balance_clp ?? 0),
    },
    collaboratorSummaries: collaboratorRows.results.map((row) => ({
      collaborator: row.collaborator,
      count: Number(row.count),
      originalClp: Number(row.original_clp),
      paidClp: Number(row.paid_clp),
      balanceClp: Number(row.balance_clp),
    })),
    hasMore,
    nextCursor: hasMore && last ? `${last.created_at}~${last.id}` : null,
  };
}

function nextProductUpdatedAt(currentUpdatedAt: string, createdAt: string): string {
  const currentTime = Date.parse(currentUpdatedAt);
  const createdTime = Date.parse(createdAt);
  const nextTime = Math.max(
    Number.isFinite(createdTime) ? createdTime : Date.now(),
    Number.isFinite(currentTime) ? currentTime + 1 : 0,
  );
  return new Date(nextTime).toISOString();
}

function aggregateInputItems(
  items: SaleInput["items"],
): Map<string, { quantity: number; unitPriceClp: number }> {
  const quantities = new Map<
    string,
    { quantity: number; unitPriceClp: number }
  >();
  for (const item of items) {
    const previous = quantities.get(item.productId);
    if (previous && previous.unitPriceClp !== item.unitPriceClp) {
      throw new PosError(
        400,
        "Las líneas duplicadas de un producto deben usar el mismo precio.",
      );
    }
    const quantity = (previous?.quantity ?? 0) + item.quantity;
    if (quantity > 99) {
      throw new PosError(
        400,
        "La cantidad acumulada de un producto no puede superar 99.",
      );
    }
    quantities.set(item.productId, {
      quantity,
      unitPriceClp: item.unitPriceClp,
    });
  }
  return quantities;
}

function saleMatchesInput(sale: StoredSale, input: SaleInput): boolean {
  if (
    sale.sessionId !== input.sessionId ||
    (input.seller !== null && sale.seller !== input.seller) ||
    (input.shift !== null && sale.shift !== input.shift) ||
    sale.debtNote !== input.debtNote ||
    sale.debtorCollaborator !== input.debtorCollaborator ||
    sale.paymentMethod !== input.paymentMethod
  ) {
    return false;
  }

  if (
    input.paymentMethod === "pendiente" ||
    input.paymentMethod === "colaborador"
  ) {
    const originallyPending =
      sale.paymentStatus === "pending" || sale.settlementId !== null;
    if (!originallyPending) return false;
  } else if (input.paymentMethod === "transferencia") {
    const transferStateMatches =
      (sale.paymentStatus === "verification_pending" &&
        sale.settledPaymentMethod === null &&
        sale.settlementId === null) ||
      (sale.paymentStatus === "paid" &&
        sale.settledPaymentMethod === null &&
        sale.settlementId === null);
    if (!transferStateMatches) return false;
  } else if (
    sale.paymentStatus !== "paid" ||
    sale.settledPaymentMethod !== null ||
    sale.settlementId !== null
  ) {
    return false;
  }

  const expected = aggregateInputItems(input.items);
  if (expected.size !== sale.items.length) return false;
  return sale.items.every(
    (item) =>
      expected.get(item.productId)?.quantity === item.quantity &&
      expected.get(item.productId)?.unitPriceClp === item.unitPriceClp,
  );
}

async function idempotentSaleOrConflict(
  database: D1Database,
  sale: StoredSale,
  input: SaleInput,
): Promise<{ sale: PosSale; idempotent: true }> {
  const saleVoid = await findSaleVoidBy(database, "sale_id", sale.id);
  if (saleVoid) {
    throw new PosError(
      409,
      "La venta fue anulada y su identificador no puede reutilizarse.",
    );
  }
  if (!saleMatchesInput(sale, input)) {
    throw new PosError(
      409,
      "El id de la venta ya fue usado con un contenido diferente.",
    );
  }
  return { sale: publicSale(sale), idempotent: true };
}

export async function createSale(
  database: D1Database,
  input: SaleInput,
  now = new Date(),
): Promise<{ sale: PosSale; idempotent: boolean }> {
  const previous = await findStoredSale(database, "id", input.id);
  if (previous) return idempotentSaleOrConflict(database, previous, input);

  const session = await findShiftSession(database, input.sessionId);
  if (!session || session.status !== "open") {
    throw new PosError(409, "No existe una sesión de turno abierta.");
  }
  if (input.seller !== null && input.seller !== session.responsible) {
    throw new PosError(
      409,
      `El turno está asignado a ${session.responsible}.`,
    );
  }
  if (input.shift !== null && input.shift !== session.shift) {
    throw new PosError(
      409,
      `La sesión abierta corresponde al turno ${session.shift.toUpperCase()}.`,
    );
  }
  const pending =
    input.paymentMethod === "pendiente" ||
    input.paymentMethod === "colaborador";
  const awaitingTransferValidation = input.paymentMethod === "transferencia";
  if (input.paymentMethod === "pendiente" && !input.debtNote) {
    throw new PosError(400, "La nota de la deuda es obligatoria.");
  }
  if (
    input.paymentMethod === "colaborador" &&
    !isCollaborator(input.debtorCollaborator)
  ) {
    throw new PosError(400, "Debes seleccionar al colaborador deudor.");
  }
  if (input.paymentMethod !== "colaborador" && input.debtorCollaborator !== null) {
    throw new PosError(
      400,
      "El colaborador deudor solo se permite con ese medio de pago.",
    );
  }
  if (!pending && input.debtNote !== null) {
    throw new PosError(400, "Una venta pagada no puede incluir una nota de deuda.");
  }

  const quantities = aggregateInputItems(input.items);
  if (quantities.size > 10) {
    throw new PosError(
      400,
      "La venta no puede incluir más de 10 productos diferentes.",
    );
  }
  const productIds = [...quantities.keys()];
  const placeholders = productIds.map(() => "?").join(", ");
  const [productsResult, recipesResult] = await Promise.all([
    database
      .prepare(
        `SELECT ${productColumns} FROM products AS p WHERE p.id IN (${placeholders})`,
      )
      .bind(...productIds)
      .all<ProductRow>(),
    database
      .prepare(`
        SELECT
          recipe.product_id, recipe.ingredient_id, recipe.quantity,
          i.name AS ingredient_name, i.stock AS ingredient_stock,
          i.revision AS ingredient_revision
        FROM product_ingredients AS recipe
        INNER JOIN ingredients AS i ON i.id = recipe.ingredient_id
        WHERE recipe.product_id IN (${placeholders})
      `)
      .bind(...productIds)
      .all<RecipeRow>(),
  ]);

  if (productsResult.results.length !== productIds.length) {
    throw new PosError(404, "Uno o más productos no existen.");
  }

  const productsById = new Map(
    productsResult.results.map((product) => [product.id, product]),
  );
  const recipeProductIds = new Set(
    recipesResult.results.map(({ product_id }) => product_id),
  );
  const lines = productIds.map((productId) => {
    const product = productsById.get(productId);
    if (!product) throw new PosError(404, "Uno o más productos no existen.");
    if (!product.active) {
      throw new PosError(409, `El producto «${product.name}» está desactivado.`);
    }
    if (recipeProductIds.has(productId) && product.stock_mode !== "untracked") {
      throw new PosError(
        409,
        `El inventario de «${product.name}» debe controlarse mediante sus insumos.`,
      );
    }

    const expected = quantities.get(productId);
    if (!expected) throw new PosError(400, "La venta no tiene productos válidos.");
    const { quantity } = expected;
    if (Number(product.price_clp) !== expected.unitPriceClp) {
      throw new PosError(
        409,
        `El precio de «${product.name}» cambió. Actualiza el ticket e intenta nuevamente.`,
      );
    }
    if (product.stock_mode === "simple" && Number(product.stock) < quantity) {
      throw new PosError(409, `No hay stock suficiente de «${product.name}».`);
    }
    if (
      product.stock_mode === "split" &&
      Number(product.stock_vitrina) < quantity
    ) {
      throw new PosError(
        409,
        `No hay stock suficiente en vitrina de «${product.name}».`,
      );
    }

    const unitPriceClp = Number(product.price_clp);
    const lineTotalClp = unitPriceClp * quantity;
    if (!Number.isSafeInteger(lineTotalClp) || lineTotalClp <= 0) {
      throw new PosError(409, `El precio de «${product.name}» no es válido.`);
    }
    return { product, quantity, unitPriceClp, lineTotalClp };
  });
  const totalClp = lines.reduce((total, line) => total + line.lineTotalClp, 0);
  if (!Number.isSafeInteger(totalClp) || totalClp <= 0) {
    throw new PosError(400, "El total de la venta no es válido.");
  }

  const ingredientConsumption = new Map<
    string,
    { row: RecipeRow; quantity: number }
  >();
  for (const recipe of recipesResult.results) {
    const saleQuantity = quantities.get(recipe.product_id)?.quantity ?? 0;
    const required = Number(recipe.quantity) * saleQuantity;
    const accumulated =
      (ingredientConsumption.get(recipe.ingredient_id)?.quantity ?? 0) + required;
    if (!Number.isSafeInteger(accumulated) || accumulated <= 0) {
      throw new PosError(409, "La receta de un producto no es válida.");
    }
    ingredientConsumption.set(recipe.ingredient_id, {
      row: recipe,
      quantity: accumulated,
    });
  }
  for (const { row, quantity } of ingredientConsumption.values()) {
    if (Number(row.ingredient_stock) < quantity) {
      throw new PosError(
        409,
        `No hay stock suficiente del insumo «${row.ingredient_name}».`,
      );
    }
  }

  const inventoryConsumption: SaleInventoryConsumptionRow[] = [
    ...lines.flatMap<SaleInventoryConsumptionRow>((line) => {
      if (recipeProductIds.has(line.product.id)) return [];
      if (
        line.product.stock_mode !== "simple" &&
        line.product.stock_mode !== "split"
      ) {
        return [];
      }
      return [{
        sale_id: input.id,
        item_type: "product",
        item_id: line.product.id,
        item_name: line.product.name,
        location:
          line.product.stock_mode === "simple" ? "simple" : "vitrina",
        quantity: line.quantity,
      }];
    }),
    ...[...ingredientConsumption.values()].map<SaleInventoryConsumptionRow>(
      ({ row, quantity }) => ({
        sale_id: input.id,
        item_type: "ingredient",
        item_id: row.ingredient_id,
        item_name: row.ingredient_name,
        location: "ingredient",
        quantity,
      }),
    ),
  ];

  const createdAt = now.toISOString();
  const paymentStatus: PaymentStatus = awaitingTransferValidation
    ? "verification_pending"
    : pending
      ? "pending"
      : "paid";
  const storedPaymentMethod = pending || awaitingTransferValidation
    ? null
    : input.paymentMethod;
  const paidAt = pending || awaitingTransferValidation ? null : createdAt;
  const statements: D1PreparedStatement[] = [
    database
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        )
        SELECT ?, ?, s.business_date, s.shift, s.id, ?, ?, ?, ?, ?, ?, NULL,
          s.responsible, ?
        FROM shift_sessions AS s
        WHERE s.id = ? AND s.status = 'open' AND s.active_slot = 1
          AND s.activity_revision = ?
          AND NOT EXISTS (
            SELECT 1 FROM cash_closures
            WHERE session_id = s.id
          )
      `)
      .bind(
        input.id,
        createdAt,
        paymentStatus,
        input.paymentMethod,
        storedPaymentMethod,
        input.debtNote,
        input.debtorCollaborator,
        paidAt,
        totalClp,
        session.id,
        session.activityRevision,
      ),
  ];

  if (!pending && !awaitingTransferValidation) {
    statements.push(
      database
        .prepare(`
          INSERT INTO sale_payments (
            id, sale_id, created_at, business_date, shift, shift_session_id,
            payment_method, amount_clp, received_by, kind
          )
          SELECT ?, id, ?, business_date, shift, shift_session_id,
            payment_method, total_clp, seller, 'direct'
          FROM sales WHERE id = ?
        `)
        .bind(
          `direct:${input.id}`,
          createdAt,
          input.id,
        ),
    );
  }

  const itemChunkSize = 16;
  for (let start = 0; start < lines.length; start += itemChunkSize) {
    const chunk = lines.slice(start, start + itemChunkSize);
    const values = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    statements.push(
      database
        .prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, unit_price_clp, quantity, line_total_clp
          ) VALUES ${values}
        `)
        .bind(
          ...chunk.flatMap((line) => [
            input.id,
            line.product.id,
            line.product.name,
            line.unitPriceClp,
            line.quantity,
            line.lineTotalClp,
          ]),
        ),
    );
  }

  statements.push(
    database
      .prepare(`
        INSERT INTO sale_inventory_snapshots (sale_id, version, created_at)
        SELECT id, 1, ? FROM sales WHERE id = ?
      `)
      .bind(createdAt, input.id),
  );

  if (inventoryConsumption.length > 0) {
    const values = inventoryConsumption
      .map(() => "(?, ?, ?, ?, ?, ?, ?)")
      .join(", ");
    statements.push(
      database
        .prepare(`
          INSERT INTO sale_inventory_consumptions (
            sale_id, item_type, item_id, item_name, location, quantity,
            created_at
          ) VALUES ${values}
        `)
        .bind(
          ...inventoryConsumption.flatMap((consumption) => [
            consumption.sale_id,
            consumption.item_type,
            consumption.item_id,
            consumption.item_name,
            consumption.location,
            consumption.quantity,
            createdAt,
          ]),
        ),
    );
  }

  for (const line of lines) {
    statements.push(
      database
        .prepare(`
          UPDATE products
          SET
            stock_mode = CASE
              WHEN active = 1
                AND price_clp = ?
                AND stock_mode = ?
                AND updated_at = ?
                AND EXISTS (SELECT 1 FROM sales WHERE id = ?)
                AND (
                  stock_mode = 'untracked'
                  OR (stock_mode = 'simple' AND stock >= ?)
                  OR (stock_mode = 'split' AND stock_vitrina >= ?)
                )
              THEN stock_mode
              ELSE NULL
            END,
            stock = CASE
              WHEN stock_mode = 'simple' THEN stock - ?
              ELSE stock
            END,
            stock_vitrina = CASE
              WHEN stock_mode = 'split' THEN stock_vitrina - ?
              ELSE stock_vitrina
            END,
            updated_at = ?
          WHERE id = ?
        `)
        .bind(
          line.unitPriceClp,
          line.product.stock_mode,
          line.product.updated_at,
          input.id,
          line.quantity,
          line.quantity,
          line.quantity,
          line.quantity,
          nextProductUpdatedAt(line.product.updated_at, createdAt),
          line.product.id,
        ),
    );
  }

  for (const { row, quantity } of ingredientConsumption.values()) {
    statements.push(
      database
        .prepare(`
          UPDATE ingredients
          SET
            revision = CASE
              WHEN revision = ? AND stock >= ?
                AND EXISTS (SELECT 1 FROM sales WHERE id = ?)
              THEN revision + 1
              ELSE NULL
            END,
            stock = CASE
              WHEN revision = ? AND stock >= ?
                AND EXISTS (SELECT 1 FROM sales WHERE id = ?)
              THEN stock - ?
              ELSE stock
            END,
            updated_at = ?
          WHERE id = ?
        `)
        .bind(
          row.ingredient_revision,
          quantity,
          input.id,
          row.ingredient_revision,
          quantity,
          input.id,
          quantity,
          createdAt,
          row.ingredient_id,
        ),
    );
  }

  statements.push(
    database
      .prepare(`
        UPDATE shift_sessions
        SET activity_revision = CASE
          WHEN status = 'open'
            AND active_slot = 1
            AND activity_revision = ?
            AND EXISTS (SELECT 1 FROM sales WHERE id = ?)
          THEN activity_revision + 1
          ELSE NULL
        END
        WHERE id = ?
      `)
      .bind(session.activityRevision, input.id, session.id),
  );

  if (statements.length > 20) {
    throw new PosError(
      400,
      "La venta requiere demasiadas operaciones de stock para registrarse de forma segura.",
    );
  }

  try {
    await database.batch(statements);
  } catch (error) {
    const duplicate = await findStoredSale(database, "id", input.id);
    if (duplicate) {
      return idempotentSaleOrConflict(database, duplicate, input);
    }

    const closed = await database
      .prepare(
        "SELECT id FROM cash_closures WHERE session_id = ?",
      )
      .bind(session.id)
      .first<{ id: string }>();
    if (closed) {
      throw new PosError(409, "El turno ya está cerrado y no acepta ventas.");
    }
    const currentSession = await findShiftSession(database, session.id);
    if (!currentSession || currentSession.status !== "open") {
      throw new PosError(409, "La sesión del turno ya está cerrada.");
    }
    if (currentSession.activityRevision !== session.activityRevision) {
      throw new PosError(
        409,
        "La actividad del turno cambió. Actualiza e intenta nuevamente.",
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("CHECK constraint failed") ||
      message.includes("products.stock_mode") ||
      message.includes("ingredients.revision")
    ) {
      throw new PosError(
        409,
        "La venta no se registró porque cambió el producto o su stock. Revisa el ticket e intenta nuevamente.",
      );
    }
    throw error;
  }

  const sale = await findStoredSale(database, "id", input.id);
  if (!sale) throw new Error("Sale missing after insert");
  return { sale: publicSale(sale), idempotent: false };
}

export async function validateTransferPayment(
  database: D1Database,
  saleId: string,
  input: TransferValidationInput,
  role: "admin" | "sales",
  now = new Date(),
): Promise<TransferValidationResult> {
  if (role !== "admin" && role !== "sales") {
    throw new PosError(403, "El perfil no puede validar transferencias.");
  }
  const existingValidation = await database
    .prepare(`
      SELECT id, sale_id, shift_session_id, validated_at, validator_role,
        validated_by, email_reference, amount_clp
      FROM transfer_validations
      WHERE sale_id = ?
    `)
    .bind(saleId)
    .first<TransferValidationRow>();
  if (existingValidation) {
    if (
      existingValidation.id !== input.id ||
      existingValidation.shift_session_id !== input.sessionId ||
      existingValidation.email_reference !== input.emailReference
    ) {
      throw new PosError(
        409,
        "La transferencia ya fue validada con otro registro de correo.",
      );
    }
    const existingSale = await findStoredSale(database, "id", saleId);
    if (!existingSale || existingSale.paymentStatus !== "paid") {
      throw new PosError(409, "La validación registrada no está conciliada.");
    }
    return {
      sale: publicSale(existingSale),
      validatedAt: existingValidation.validated_at,
      validatedBy: existingValidation.validated_by,
      emailReference: existingValidation.email_reference,
      idempotent: true,
    };
  }

  const sale = await findStoredSale(database, "id", saleId);
  if (!sale) throw new PosError(404, "La venta no existe.");
  if (sale.paymentMethod !== "transferencia") {
    throw new PosError(409, "La venta no corresponde a una transferencia.");
  }
  if (sale.paymentStatus === "paid") {
    throw new PosError(409, "La transferencia ya figura como pagada.");
  }
  if (sale.paymentStatus !== "verification_pending") {
    throw new PosError(409, "La transferencia no está pendiente de validación.");
  }
  if (!sale.sessionId || sale.sessionId !== input.sessionId) {
    throw new PosError(409, "La venta no corresponde al turno activo indicado.");
  }
  const session = await findShiftSession(database, input.sessionId);
  if (!session || session.status !== "open" || session.id !== sale.sessionId) {
    throw new PosError(
      409,
      "El turno de la venta ya no está abierto. Solicita revisión administrativa.",
    );
  }

  const validatedAt = now.toISOString();
  const validatedBy = role === "sales" ? session.responsible : "Administración";
  await database.batch([
    database
      .prepare(`
        INSERT INTO transfer_validations (
          id, sale_id, shift_session_id, validated_at, validator_role,
          validated_by, email_reference, amount_clp
        )
        SELECT ?, sale.id, sale.shift_session_id, ?, ?, ?, ?, sale.total_clp
        FROM sales AS sale
        INNER JOIN shift_sessions AS session
          ON session.id = sale.shift_session_id
        WHERE sale.id = ?
          AND sale.shift_session_id = ?
          AND sale.payment_status = 'verification_pending'
          AND sale.checkout_method = 'transferencia'
          AND session.status = 'open'
          AND session.active_slot = 1
          AND NOT EXISTS (
            SELECT 1 FROM cash_closures WHERE session_id = session.id
          )
      `)
      .bind(
        input.id,
        validatedAt,
        role,
        validatedBy,
        input.emailReference,
        saleId,
        input.sessionId,
      ),
    database
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        )
        SELECT 'direct:' || sale.id, sale.id, validation.validated_at,
          sale.business_date, sale.shift, sale.shift_session_id,
          'transferencia', sale.total_clp, sale.seller, 'direct'
        FROM sales AS sale
        INNER JOIN transfer_validations AS validation
          ON validation.sale_id = sale.id AND validation.id = ?
        WHERE sale.id = ? AND sale.payment_status = 'verification_pending'
      `)
      .bind(input.id, saleId),
    database
      .prepare(`
        UPDATE sales
        SET payment_status = 'paid', payment_method = 'transferencia',
          paid_at = ?
        WHERE id = ? AND payment_status = 'verification_pending'
          AND EXISTS (
            SELECT 1 FROM transfer_validations
            WHERE sale_id = sales.id AND id = ?
          )
          AND EXISTS (
            SELECT 1 FROM sale_payments
            WHERE sale_id = sales.id AND id = 'direct:' || sales.id
          )
      `)
      .bind(validatedAt, saleId, input.id),
    database
      .prepare(`
        UPDATE shift_sessions
        SET activity_revision = activity_revision + 1
        WHERE id = ? AND status = 'open'
          AND EXISTS (
            SELECT 1 FROM transfer_validations
            WHERE sale_id = ? AND id = ?
          )
      `)
      .bind(input.sessionId, saleId, input.id),
  ]);

  const [validatedSale, validation] = await Promise.all([
    findStoredSale(database, "id", saleId),
    database
      .prepare(`
        SELECT id, sale_id, shift_session_id, validated_at, validator_role,
          validated_by, email_reference, amount_clp
        FROM transfer_validations
        WHERE sale_id = ?
      `)
      .bind(saleId)
      .first<TransferValidationRow>(),
  ]);
  if (!validatedSale || validatedSale.paymentStatus !== "paid" || !validation) {
    throw new PosError(
      409,
      "No se pudo validar la transferencia porque el turno cambió. Actualiza e intenta nuevamente.",
    );
  }
  return {
    sale: publicSale(validatedSale),
    validatedAt: validation.validated_at,
    validatedBy: validation.validated_by,
    emailReference: validation.email_reference,
    idempotent: false,
  };
}

function saleVoidFingerprint(
  saleId: string,
  input: SaleVoidInput,
): string {
  return JSON.stringify({
    saleId,
    sessionId: input.sessionId,
    expectedActivityRevision: input.expectedActivityRevision,
    reason: input.reason.trim(),
  });
}

async function findSaleVoidBy(
  database: D1Database,
  column: "id" | "sale_id",
  value: string,
): Promise<SaleVoidRow | null> {
  return database
    .prepare(`
      SELECT id, sale_id, shift_session_id, created_at, actor_role, actor_name,
        reason, expected_activity_revision, request_fingerprint,
        original_total_clp, original_paid_clp, original_balance_clp,
        inventory_source, inventory_restoration_json, payment_snapshot_json
      FROM sale_voids
      WHERE ${column} = ?
    `)
    .bind(value)
    .first<SaleVoidRow>();
}

function idempotentSaleVoidOrConflict(
  row: SaleVoidRow,
  saleId: string,
  fingerprint: string,
): SaleVoidResult {
  if (row.sale_id !== saleId || row.request_fingerprint !== fingerprint) {
    throw new PosError(409, "El id de la anulación ya fue utilizado.");
  }
  return {
    saleId: row.sale_id,
    voidedAt: row.created_at,
    voidReason: row.reason,
    voidedBy: row.actor_name,
    idempotent: true,
  };
}

type InventoryRestoration = SaleInventoryConsumptionRow & {
  quantityBefore: number;
  quantityAfter: number;
};

async function prepareInventoryRestoration(
  database: D1Database,
  consumption: SaleInventoryConsumptionRow[],
): Promise<InventoryRestoration[]> {
  return Promise.all(
    consumption.map(async (item) => {
      let quantityBefore: number | null = null;
      if (item.item_type === "ingredient") {
        const ingredient = await database
          .prepare("SELECT stock FROM ingredients WHERE id = ?")
          .bind(item.item_id)
          .first<{ stock: number }>();
        if (!ingredient) {
          throw new PosError(
            409,
            `El insumo «${item.item_name}» cambió; no se repuso inventario.`,
          );
        }
        quantityBefore = Number(ingredient.stock);
      } else {
        const product = await database
          .prepare(`
            SELECT stock_mode, stock, stock_vitrina,
              EXISTS (
                SELECT 1 FROM product_ingredients AS recipe
                WHERE recipe.product_id = products.id
              ) AS has_recipe
            FROM products WHERE id = ?
          `)
          .bind(item.item_id)
          .first<{
            stock_mode: StockMode;
            stock: number | null;
            stock_vitrina: number | null;
            has_recipe: number;
          }>();
        const expectedMode = item.location === "simple" ? "simple" : "split";
        if (
          !product ||
          product.stock_mode !== expectedMode ||
          Boolean(product.has_recipe)
        ) {
          throw new PosError(
            409,
            `El inventario de «${item.item_name}» cambió; no se puede reponer automáticamente.`,
          );
        }
        quantityBefore = Number(
          item.location === "simple" ? product.stock : product.stock_vitrina,
        );
      }
      const quantityAfter = quantityBefore + item.quantity;
      if (
        !Number.isSafeInteger(quantityBefore) ||
        quantityBefore < 0 ||
        !Number.isSafeInteger(quantityAfter) ||
        quantityAfter > Number.MAX_SAFE_INTEGER
      ) {
        throw new PosError(
          409,
          `El inventario de «${item.item_name}» no admite esta reposición.`,
        );
      }
      return { ...item, quantityBefore, quantityAfter };
    }),
  );
}

export async function voidSale(
  database: D1Database,
  saleId: string,
  input: SaleVoidInput,
  actorRole: "admin" | "sales",
  now = new Date(),
): Promise<SaleVoidResult> {
  if (actorRole !== "admin") {
    throw new PosError(403, "Solo Administración puede anular ventas.");
  }
  if (!UUID_PATTERN.test(input.id)) {
    throw new PosError(400, "El id de la anulación debe ser un UUID válido.");
  }
  const reason = input.reason.trim();
  if (reason.length < 1 || reason.length > 500) {
    throw new PosError(400, "El motivo de la anulación es obligatorio.");
  }
  if (
    !Number.isSafeInteger(input.expectedActivityRevision) ||
    input.expectedActivityRevision < 0
  ) {
    throw new PosError(400, "La revisión esperada del turno no es válida.");
  }
  const normalizedInput = { ...input, reason };
  const fingerprint = saleVoidFingerprint(saleId, normalizedInput);
  const existingById = await findSaleVoidBy(database, "id", input.id);
  if (existingById) {
    return idempotentSaleVoidOrConflict(existingById, saleId, fingerprint);
  }

  const [sale, session, existingForSale] = await Promise.all([
    findStoredSale(database, "id", saleId),
    findShiftSession(database, input.sessionId),
    findSaleVoidBy(database, "sale_id", saleId),
  ]);
  if (!sale) throw new PosError(404, "La venta no existe.");
  if (existingForSale) {
    throw new PosError(409, "La venta ya fue anulada.");
  }
  if (!session || session.status !== "open" || session.closureId !== null) {
    throw new PosError(409, "El turno de la venta ya no está abierto.");
  }
  if (sale.sessionId !== session.id || session.activityRevision !== input.expectedActivityRevision) {
    throw new PosError(
      409,
      sale.sessionId !== session.id
        ? "La venta no pertenece al turno activo indicado."
        : "La actividad del turno cambió. Actualiza e intenta nuevamente.",
    );
  }
  const today = getSantiagoBusinessDate(now);
  const { startIso, endIso } = getSantiagoDateBounds(today);
  if (sale.createdAt < startIso || sale.createdAt >= endIso) {
    throw new PosError(409, "Solo se pueden anular ventas del día actual.");
  }

  const [closure, revisionSale, paymentRows, snapshot, snapshotRows] =
    await Promise.all([
      database
        .prepare("SELECT id FROM cash_closures WHERE session_id = ?")
        .bind(session.id)
        .first<{ id: string }>(),
      database
        .prepare(
          "SELECT sale_id FROM cash_closure_revision_sales WHERE sale_id = ? LIMIT 1",
        )
        .bind(sale.id)
        .first<{ sale_id: string }>(),
      database
        .prepare(`
          SELECT id, sale_id, created_at, business_date, shift,
            shift_session_id, payment_method, amount_clp, received_by, kind
          FROM sale_payments WHERE sale_id = ? ORDER BY created_at, id
        `)
        .bind(sale.id)
        .all<SalePaymentRow>(),
      database
        .prepare("SELECT version FROM sale_inventory_snapshots WHERE sale_id = ?")
        .bind(sale.id)
        .first<{ version: number }>(),
      database
        .prepare(`
          SELECT sale_id, item_type, item_id, item_name, location, quantity
          FROM sale_inventory_consumptions
          WHERE sale_id = ?
          ORDER BY item_type, item_id, location
        `)
        .bind(sale.id)
        .all<SaleInventoryConsumptionRow>(),
    ]);
  if (closure || revisionSale) {
    throw new PosError(
      409,
      "La venta ya forma parte de un cierre y no puede anularse.",
    );
  }
  if (paymentRows.results.some(({ kind }) => kind === "settlement")) {
    throw new PosError(
      409,
      "La venta tiene abonos registrados y no puede anularse.",
    );
  }
  const paidClp = paymentRows.results.reduce(
    (total, payment) => total + Number(payment.amount_clp),
    0,
  );
  if (!Number.isSafeInteger(paidClp) || paidClp < 0 || paidClp > sale.totalClp) {
    throw new PosError(409, "El registro de pagos de la venta no es consistente.");
  }

  if (!snapshot) {
    throw new PosError(
      409,
      "Esta venta es anterior al registro exacto de inventario y no puede anularse de forma segura.",
    );
  }
  const inventorySource: SaleVoidRow["inventory_source"] = "snapshot";
  const consumption = snapshotRows.results;
  const restoration = await prepareInventoryRestoration(database, consumption);
  const voidedAt = now.toISOString();
  const actorName = "Administrador";
  const restorationJson = JSON.stringify(
    restoration.map((item) => ({
      itemType: item.item_type,
      itemId: item.item_id,
      itemName: item.item_name,
      location: item.location,
      quantity: item.quantity,
      quantityBefore: item.quantityBefore,
      quantityAfter: item.quantityAfter,
    })),
  );
  const paymentSnapshotJson = JSON.stringify(
    paymentRows.results.map((payment) => ({
      id: payment.id,
      createdAt: payment.created_at,
      paymentMethod: payment.payment_method,
      amountClp: Number(payment.amount_clp),
      kind: payment.kind,
    })),
  );

  const statements: D1PreparedStatement[] = [
    database
      .prepare(`
        INSERT INTO sale_voids (
          id, sale_id, shift_session_id, created_at, actor_role, actor_name,
          reason, expected_activity_revision, request_fingerprint,
          original_total_clp, original_paid_clp, original_balance_clp,
          inventory_source, inventory_restoration_json, payment_snapshot_json
        )
        SELECT ?, sale.id, session.id, ?, 'admin', ?, ?, ?, ?, sale.total_clp,
          ?, sale.total_clp - ?, ?, ?, ?
        FROM sales AS sale
        INNER JOIN shift_sessions AS session ON session.id = ?
        WHERE sale.id = ?
          AND sale.shift_session_id = session.id
          AND session.status = 'open' AND session.active_slot = 1
          AND session.activity_revision = ?
          AND NOT EXISTS (
            SELECT 1 FROM cash_closures WHERE session_id = session.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM cash_closure_revision_sales
            WHERE sale_id = sale.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM sale_payments
            WHERE sale_id = sale.id AND kind = 'settlement'
          )
          AND NOT EXISTS (
            SELECT 1 FROM sale_voids WHERE sale_id = sale.id
          )
      `)
      .bind(
        input.id,
        voidedAt,
        actorName,
        reason,
        input.expectedActivityRevision,
        fingerprint,
        paidClp,
        paidClp,
        inventorySource,
        restorationJson,
        paymentSnapshotJson,
        session.id,
        sale.id,
        input.expectedActivityRevision,
      ),
  ];
  for (const [index, item] of restoration.entries()) {
    statements.push(
      database
        .prepare(`
          INSERT INTO inventory_stock_entries (
            id, item_type, item_id, item_name, location, quantity_before,
            quantity_added, quantity_after, actor_role, operation_token,
            created_at
          )
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?
          WHERE EXISTS (SELECT 1 FROM sale_voids WHERE id = ?)
        `)
        .bind(
          `void:${input.id}:${index}`,
          item.item_type,
          item.item_id,
          item.item_name,
          item.location,
          item.quantityBefore,
          item.quantity,
          item.quantityAfter,
          input.id,
          voidedAt,
          input.id,
        ),
    );
  }
  statements.push(
    database
      .prepare(`
        UPDATE shift_sessions
        SET activity_revision = CASE
          WHEN status = 'open' AND active_slot = 1
            AND activity_revision = ?
            AND EXISTS (SELECT 1 FROM sale_voids WHERE id = ?)
          THEN activity_revision + 1
          ELSE NULL
        END
        WHERE id = ?
      `)
      .bind(input.expectedActivityRevision, input.id, session.id),
  );

  try {
    await database.batch(statements);
  } catch (error) {
    const racedById = await findSaleVoidBy(database, "id", input.id);
    if (racedById) {
      return idempotentSaleVoidOrConflict(racedById, saleId, fingerprint);
    }
    const racedForSale = await findSaleVoidBy(database, "sale_id", saleId);
    if (racedForSale) throw new PosError(409, "La venta ya fue anulada.");
    const latestSession = await findShiftSession(database, session.id);
    if (!latestSession || latestSession.status !== "open") {
      throw new PosError(409, "El turno de la venta ya no está abierto.");
    }
    if (latestSession.activityRevision !== input.expectedActivityRevision) {
      throw new PosError(
        409,
        "La actividad del turno cambió. Actualiza e intenta nuevamente.",
      );
    }
    if (
      error instanceof Error &&
      error.message.includes("inventory stock entry")
    ) {
      throw new PosError(
        409,
        "El inventario cambió durante la anulación. Actualiza e intenta nuevamente.",
      );
    }
    throw error;
  }

  const stored = await findSaleVoidBy(database, "id", input.id);
  if (!stored) throw new Error("Sale void missing after insert");
  return {
    saleId: stored.sale_id,
    voidedAt: stored.created_at,
    voidReason: stored.reason,
    voidedBy: stored.actor_name,
    idempotent: false,
  };
}

type PaymentEventRow = SalePaymentRow;

async function findPaymentEvent(
  database: D1Database,
  id: string,
): Promise<PaymentEventRow | null> {
  return database
    .prepare(`
      SELECT id, sale_id, created_at, business_date, shift, shift_session_id,
        payment_method, amount_clp, received_by, kind
      FROM sale_payments WHERE id = ?
    `)
    .bind(id)
    .first<PaymentEventRow>();
}

function settledResultOrConflict(
  sale: StoredSale,
  payment: PaymentEventRow | null,
  session: ShiftSession | null,
  saleId: string,
  input: SettlementInput,
): { sale: PosSale; payment: SalePayment; idempotent: true } {
  if (
    sale.id !== saleId ||
    payment?.sale_id !== saleId ||
    session === null ||
    payment.shift_session_id !== input.sessionId ||
    payment.business_date !== session.businessDate ||
    payment.shift !== session.shift ||
    payment.received_by !== session.responsible ||
    payment.payment_method !== input.paymentMethod ||
    (input.shift !== null && payment.shift !== input.shift) ||
    (input.responsible !== null &&
      payment.received_by !== input.responsible) ||
    (input.amountClp !== null &&
      input.amountClp !== undefined &&
      Number(payment.amount_clp) !== input.amountClp) ||
    payment.kind !== "settlement"
  ) {
    throw new PosError(409, "El id del abono ya fue utilizado.");
  }
  return {
    sale: publicSale(sale),
    payment: mapSalePayment(payment),
    idempotent: true,
  };
}

export async function settleDebt(
  database: D1Database,
  saleId: string,
  input: SettlementInput,
  actorRole: DebtSettlementRole,
  now = new Date(),
): Promise<{
  sale: PosSale;
  payment: SalePayment;
  idempotent: boolean;
}> {
  if (actorRole !== "admin" && actorRole !== "sales") {
    throw new PosError(403, "Tu perfil no tiene permisos para registrar este cobro.");
  }
  if (input.shift !== null && !isShift(input.shift)) {
    throw new PosError(400, "El turno debe ser AM o PM.");
  }
  if (input.responsible !== null && !isCollaborator(input.responsible)) {
    throw new PosError(400, "El colaborador responsable no es válido.");
  }
  if (
    input.amountClp !== null &&
    input.amountClp !== undefined &&
    (!Number.isSafeInteger(input.amountClp) || input.amountClp <= 0)
  ) {
    throw new PosError(400, "El monto del abono debe ser un entero mayor que cero.");
  }
  const paymentId = `settlement:${input.id}`;
  const [existingPayment, initialSale] = await Promise.all([
    findPaymentEvent(database, paymentId),
    findStoredSale(database, "id", saleId),
  ]);
  if (!initialSale) throw new PosError(404, "La venta no existe.");
  const existingVoid = await findSaleVoidBy(database, "sale_id", saleId);
  if (existingVoid) {
    throw new PosError(409, "La venta fue anulada y no acepta cobros.");
  }
  if (existingPayment) {
    const existingSession = await findShiftSession(database, input.sessionId);
    return settledResultOrConflict(
      initialSale,
      existingPayment,
      existingSession,
      saleId,
      input,
    );
  }

  const session = await findShiftSession(database, input.sessionId);
  if (!session || session.status !== "open") {
    throw new PosError(409, "No existe una sesión de turno abierta.");
  }
  if (input.shift !== null && input.shift !== session.shift) {
    throw new PosError(
      409,
      `La sesión abierta corresponde al turno ${session.shift.toUpperCase()}.`,
    );
  }
  if (input.responsible !== null && input.responsible !== session.responsible) {
    throw new PosError(409, `El turno está asignado a ${session.responsible}.`);
  }

  const current = initialSale;
  if (current.paymentStatus !== "pending") {
    throw new PosError(
      409,
      current.settlementId || current.balanceClp === 0
        ? "La deuda ya fue pagada."
        : "La venta no tiene una deuda pendiente.",
    );
  }
  if (
    (input.amountClp === null || input.amountClp === undefined) &&
    current.paidClp > 0
  ) {
    throw new PosError(
      409,
      "La deuda tiene abonos parciales; actualiza la página para cobrar el saldo correcto.",
    );
  }
  const amountClp = input.amountClp ?? current.balanceClp;
  if (amountClp <= 0) {
    throw new PosError(409, "La deuda ya fue pagada.");
  }
  if (amountClp > current.balanceClp) {
    throw new PosError(
      409,
      `El abono supera el saldo pendiente de $${current.balanceClp.toLocaleString("es-CL")}.`,
    );
  }

  const paidAt = now.toISOString();
  try {
    await database.batch([
      database.prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        )
        SELECT ?, sale.id, ?, session.business_date, session.shift, session.id,
          ?, ?, session.responsible, 'settlement'
        FROM sales AS sale
        INNER JOIN shift_sessions AS session ON session.id = ?
        WHERE sale.id = ? AND sale.payment_status = 'pending'
          AND sale.checkout_method IN ('pendiente', 'colaborador')
          AND NOT EXISTS (
            SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
          )
          AND session.status = 'open' AND session.active_slot = 1
          AND session.activity_revision = ?
          AND NOT EXISTS (
            SELECT 1 FROM cash_closures
            WHERE session_id = session.id
          )
          AND ? <= sale.total_clp - COALESCE((
            SELECT SUM(previous.amount_clp)
            FROM sale_payments AS previous
            WHERE previous.sale_id = sale.id
          ), 0)
      `).bind(
        paymentId,
        paidAt,
        input.paymentMethod,
        amountClp,
        session.id,
        saleId,
        session.activityRevision,
        amountClp,
      ),
      database.prepare(`
        UPDATE sales
        SET
          payment_status = CASE
            WHEN EXISTS (SELECT 1 FROM sale_payments WHERE id = ?)
              AND total_clp = (
                SELECT SUM(amount_clp) FROM sale_payments
                WHERE sale_id = sales.id
              ) THEN 'paid'
            WHEN EXISTS (SELECT 1 FROM sale_payments WHERE id = ?)
              AND total_clp > (
                SELECT SUM(amount_clp) FROM sale_payments
                WHERE sale_id = sales.id
              ) THEN 'pending'
            ELSE 'blocked'
          END,
          payment_method = CASE WHEN total_clp = (
            SELECT SUM(amount_clp) FROM sale_payments WHERE sale_id = sales.id
          ) THEN ? ELSE NULL END,
          paid_at = CASE WHEN total_clp = (
            SELECT SUM(amount_clp) FROM sale_payments WHERE sale_id = sales.id
          ) THEN ? ELSE NULL END,
          settlement_id = CASE WHEN total_clp = (
            SELECT SUM(amount_clp) FROM sale_payments WHERE sale_id = sales.id
          ) THEN ? ELSE NULL END
        WHERE id = ? AND checkout_method IN ('pendiente', 'colaborador')
      `).bind(
        paymentId,
        paymentId,
        input.paymentMethod,
        paidAt,
        input.id,
        saleId,
      ),
      database.prepare(`
        UPDATE shift_sessions
        SET activity_revision = CASE
          WHEN status = 'open'
            AND active_slot = 1
            AND activity_revision = ?
            AND EXISTS (
              SELECT 1 FROM sale_payments WHERE id = ?
            )
          THEN activity_revision + 1
          ELSE NULL
        END
        WHERE id = ?
      `).bind(
        session.activityRevision,
        paymentId,
        session.id,
      ),
    ]);
  } catch (error) {
    const samePayment = await findPaymentEvent(database, paymentId);
    if (samePayment) {
      const sameSale = await findStoredSale(database, "id", saleId);
      if (!sameSale) throw new PosError(409, "El id del abono ya fue utilizado.");
      return settledResultOrConflict(
        sameSale,
        samePayment,
        session,
        saleId,
        { ...input, amountClp },
      );
    }
    const closed = await database
      .prepare(
        "SELECT id FROM cash_closures WHERE session_id = ?",
      )
      .bind(session.id)
      .first<{ id: string }>();
    if (closed) {
      throw new PosError(409, "El turno ya está cerrado y no acepta cobros.");
    }
    const currentSession = await findShiftSession(database, session.id);
    if (!currentSession || currentSession.status !== "open") {
      throw new PosError(409, "La sesión del turno ya está cerrada.");
    }
    if (currentSession.activityRevision !== session.activityRevision) {
      throw new PosError(
        409,
        "La actividad del turno cambió. Actualiza e intenta nuevamente.",
      );
    }
    const raced = await findStoredSale(database, "id", saleId);
    const racedVoid = await findSaleVoidBy(database, "sale_id", saleId);
    if (racedVoid) {
      throw new PosError(409, "La venta fue anulada y no acepta cobros.");
    }
    if (raced?.paymentStatus === "paid" || raced?.balanceClp === 0) {
      throw new PosError(409, "La deuda ya fue pagada.");
    }
    if (raced && amountClp > raced.balanceClp) {
      throw new PosError(
        409,
        `El abono supera el saldo pendiente de $${raced.balanceClp.toLocaleString("es-CL")}.`,
      );
    }
    throw error;
  }

  const sale = await findStoredSale(database, "id", saleId);
  if (!sale) throw new Error("Sale missing after settlement");
  const payment = await findPaymentEvent(database, paymentId);
  if (!payment) throw new Error("Payment missing after settlement");
  return {
    sale: publicSale(sale),
    payment: mapSalePayment(payment),
    idempotent: false,
  };
}

const closingInventorySql = `
  SELECT
    'product:' || p.id || ':simple' AS item_key,
    'product' AS item_type,
    p.id AS item_id,
    p.name AS item_name,
    'unidades' AS unit,
    'simple' AS location,
    p.updated_at AS version_token,
    p.stock AS expected_quantity
  FROM products AS p
  WHERE p.stock_mode = 'simple'
  UNION ALL
  SELECT
    'product:' || p.id || ':vitrina', 'product', p.id, p.name, 'unidades',
    'vitrina', p.updated_at, p.stock_vitrina
  FROM products AS p
  WHERE p.stock_mode = 'split'
  UNION ALL
  SELECT
    'ingredient:' || i.id, 'ingredient', i.id, i.name, i.unit,
    'ingredient', CAST(i.revision AS TEXT), i.stock
  FROM ingredients AS i
`;

function mapClosingInventory(row: ClosingInventoryRow): ClosingInventoryLine {
  return {
    key: row.item_key,
    itemType: row.item_type,
    itemId: row.item_id,
    name: row.item_name,
    unit: row.unit,
    location: row.location,
    versionToken: row.version_token,
    expectedQuantity: Number(row.expected_quantity),
  };
}

export async function listClosingInventory(
  database: D1Database,
): Promise<ClosingInventoryLine[]> {
  const rows = await database
    .prepare(`${closingInventorySql} ORDER BY item_type, item_name, item_id, location`)
    .all<ClosingInventoryRow>();
  if (rows.results.length > 90) {
    throw new PosError(
      409,
      "El inventario rastreado supera el máximo seguro de 90 ubicaciones.",
    );
  }
  return rows.results.map(mapClosingInventory);
}

function emptyChecklist(row: ClosureRow): ReconciliationChecklist | null {
  if (row.checklist_version !== 1) return null;
  if (
    row.cash_reconciled !== 1 ||
    row.card_reconciled !== 1 ||
    row.transfer_reconciled !== 1 ||
    row.pending_customer_reviewed !== 1 ||
    row.collaborator_reviewed !== 1 ||
    row.inventory_count_confirmed !== 1
  ) {
    return null;
  }
  return {
    cashReconciled: true,
    cardReconciled: true,
    transferReconciled: true,
    pendingCustomerReviewed: true,
    collaboratorReviewed: true,
    inventoryCountConfirmed: true,
  };
}

function mapClosure(
  row: ClosureRow,
  inventory: CashClosureInventoryLine[] = [],
  pendingCustomers: PendingCustomerDetail[] = [],
  pendingCollaborators: PendingCollaboratorDetail[] = [],
  expenses: CashClosureExpense[] = [],
  validation: CashClosureValidation | null = null,
): CashClosure {
  const openingCashClp = Number(row.opening_cash_clp ?? 0);
  const cashMovementsClp = Number(
    row.cash_movements_clp ?? row.expected_cash_clp,
  );
  return {
    id: row.id,
    sessionId: row.session_id,
    closureContractVersion:
      row.closure_contract_version === 2 ? 2 : null,
    latestRevisionNumber: Number(row.latest_revision_number ?? 0),
    businessDate: row.business_date,
    shift: row.shift,
    responsible: row.responsible,
    createdAt: row.created_at,
    activityRevision:
      row.session_activity_revision === null
        ? null
        : Number(row.session_activity_revision),
    openingCashClp,
    cashMovementsClp,
    expectedCashClp: Number(row.expected_cash_clp),
    expectedCardClp: Number(row.expected_card_clp),
    expectedTransferClp: Number(row.expected_transfer_clp),
    collectedPaymentsClp:
      cashMovementsClp +
      Number(row.expected_card_clp) +
      Number(row.expected_transfer_clp),
    expectedCollectedClp: Number(row.expected_collected_clp),
    totalSalesClp: Number(row.total_sales_clp),
    salesCount: Number(row.sales_count),
    pendingCustomerClp: Number(row.pending_customer_clp),
    pendingCustomerCount: Number(row.pending_customer_count ?? 0),
    collaboratorClp: Number(row.collaborator_clp),
    collaboratorCount: Number(row.collaborator_count ?? 0),
    pendingCustomers,
    pendingCollaborators,
    countedCashClp: Number(row.counted_cash_clp),
    expensesClp: Number(row.expenses_clp ?? 0),
    adjustedExpectedCashClp: Number(
      row.adjusted_expected_cash_clp ?? row.expected_cash_clp,
    ),
    differenceClp: Number(
      row.closure_contract_version === 2
        ? row.adjusted_difference_clp
        : row.difference_clp,
    ),
    countedCardClp: mapNullableInteger(row.counted_card_clp),
    differenceCardClp: mapNullableInteger(row.difference_card_clp),
    countedTransferClp: mapNullableInteger(row.counted_transfer_clp),
    differenceTransferClp: mapNullableInteger(row.difference_transfer_clp),
    countedCollectedClp: mapNullableInteger(row.counted_collected_clp),
    differenceCollectedClp: mapNullableInteger(
      row.closure_contract_version === 2
        ? row.adjusted_difference_collected_clp
        : row.difference_collected_clp,
    ),
    financialDifferenceReason:
      row.closure_contract_version === 2
        ? row.handoff_financial_difference_reason
        : row.financial_difference_reason,
    checklist:
      row.closure_contract_version === 2 ? null : emptyChecklist(row),
    checklistVersion:
      row.closure_contract_version === 2
        ? null
        : row.checklist_version === 1
          ? 1
          : null,
    unassignedSalesClp: Number(row.unassigned_sales_clp),
    unassignedSalesCount: Number(row.unassigned_sales_count),
    unassignedPaymentsClp: Number(row.unassigned_payments_clp),
    unassignedPaymentsCount: Number(row.unassigned_payments_count),
    notes: row.notes,
    handoffComments: row.handoff_comments ?? row.notes,
    expenses,
    validationStatus:
      row.closure_contract_version !== 2
        ? "not_required"
        : validation === null
          ? "pending"
          : "validated",
    validation,
    inventory,
    inventoryCaptured: row.session_id !== null,
    inventoryLineCount: inventory.length,
    inventoryDifferenceCount: inventory.filter(
      ({ differenceQuantity }) => differenceQuantity !== 0,
    ).length,
    inventoryDifferences: inventory.filter(
      ({ differenceQuantity }) => differenceQuantity !== 0,
    ),
    closed: true,
  };
}

async function findClosureRowById(
  database: D1Database,
  id: string,
): Promise<ClosureRow | null> {
  return database
    .prepare(`
      SELECT closure.*, COALESCE((
        SELECT MAX(revision.revision_number)
        FROM cash_closure_revisions AS revision
        INNER JOIN cash_closure_revision_seals AS seal
          ON seal.revision_id = revision.id
        WHERE revision.closure_id = closure.id
          AND seal.request_fingerprint = revision.request_fingerprint
      ), 0) AS latest_revision_number
      FROM cash_closures AS closure
      WHERE closure.id = ?
    `)
    .bind(id)
    .first<ClosureRow>();
}

async function findClosureRowByContext(
  database: D1Database,
  businessDate: string,
  shift: Shift,
): Promise<ClosureRow | null> {
  return database
    .prepare(
      `
        SELECT closure.*, COALESCE((
          SELECT MAX(revision.revision_number)
          FROM cash_closure_revisions AS revision
          INNER JOIN cash_closure_revision_seals AS seal
            ON seal.revision_id = revision.id
          WHERE revision.closure_id = closure.id
            AND seal.request_fingerprint = revision.request_fingerprint
        ), 0) AS latest_revision_number
        FROM cash_closures AS closure
        WHERE closure.business_date = ? AND closure.shift = ?
        ORDER BY closure.created_at DESC, closure.id DESC
        LIMIT 1
      `,
    )
    .bind(businessDate, shift)
    .first<ClosureRow>();
}

function mapClosureInventoryRow(
  row: ClosureInventoryRow,
): CashClosureInventoryLine {
  return {
    ...mapClosingInventory(row),
    countedQuantity: Number(row.counted_quantity),
    differenceQuantity: Number(row.difference_quantity),
    reason: row.reason,
    reasonCategory: row.reason_category,
    comment: row.incident_comment ?? row.reason,
  };
}

function mapClosureDebts(rows: ClosureDebtRow[]): {
  pendingCustomers: PendingCustomerDetail[];
  pendingCollaborators: PendingCollaboratorDetail[];
} {
  const pendingCustomers: PendingCustomerDetail[] = [];
  const pendingCollaborators: PendingCollaboratorDetail[] = [];
  for (const row of rows) {
    if (row.debt_type === "pendiente" && row.debt_note !== null) {
      if (pendingCustomers.length < 50) {
        pendingCustomers.push({
          id: row.sale_id,
          createdAt: row.created_at,
          debtNote: row.debt_note,
          totalClp: Number(row.amount_clp),
        });
      }
    } else if (
      row.debt_type === "colaborador" &&
      row.debtor_collaborator !== null &&
      pendingCollaborators.length < 50
    ) {
      pendingCollaborators.push({
        id: row.sale_id,
        createdAt: row.created_at,
        debtorCollaborator: row.debtor_collaborator,
        debtNote: row.debt_note,
        totalClp: Number(row.amount_clp),
      });
    }
  }
  return { pendingCustomers, pendingCollaborators };
}

function mapClosureExpenses(rows: ClosureExpenseRow[]): CashClosureExpense[] {
  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amountClp: Number(row.amount_clp),
  }));
}

function mapClosureValidation(
  row: ClosureValidationRow | null | undefined,
): CashClosureValidation | null {
  return row
    ? {
        validatedAt: row.validated_at,
        comment: row.comment,
        revisionNumber: Number(row.revision_number ?? 0),
      }
    : null;
}

async function hydrateClosure(
  database: D1Database,
  row: ClosureRow,
): Promise<CashClosure> {
  const [inventoryResult, debtsResult, expensesResult, validationRow] =
    await Promise.all([
    database
      .prepare(`
        SELECT
          closure_id, item_key, item_type, item_id, item_name, unit, location,
          expected_version_token AS version_token, expected_quantity,
          counted_quantity, difference_quantity, reason, reason_category,
          incident_comment
        FROM cash_closure_inventory
        WHERE closure_id = ?
        ORDER BY item_type, item_name, item_id, location
      `)
      .bind(row.id)
      .all<ClosureInventoryRow>(),
    database
      .prepare(`
        SELECT closure_id, sale_id, debt_type, created_at, debt_note,
          debtor_collaborator, amount_clp
        FROM cash_closure_debts
        WHERE closure_id = ?
        ORDER BY created_at, sale_id
      `)
      .bind(row.id)
      .all<ClosureDebtRow>(),
    database
      .prepare(`
        SELECT closure_id, id, description, amount_clp
        FROM cash_closure_expenses
        WHERE closure_id = ?
        ORDER BY id
      `)
      .bind(row.id)
      .all<ClosureExpenseRow>(),
    database
      .prepare(`
        SELECT closure_id, validated_at, comment, revision_number,
          request_fingerprint
        FROM cash_closure_validations
        WHERE closure_id = ?
      `)
      .bind(row.id)
      .first<ClosureValidationRow>(),
  ]);
  const debts = mapClosureDebts(debtsResult.results);
  return mapClosure(
    row,
    inventoryResult.results.map(mapClosureInventoryRow),
    debts.pendingCustomers,
    debts.pendingCollaborators,
    mapClosureExpenses(expensesResult.results),
    mapClosureValidation(validationRow),
  );
}

async function findCashClosure(
  database: D1Database,
  id: string,
): Promise<CashClosure | null> {
  const row = await findClosureRowById(database, id);
  return row ? hydrateClosure(database, row) : null;
}

export async function getCashClosureById(
  database: D1Database,
  id: string,
): Promise<CashClosure | null> {
  return findCashClosure(database, id);
}

function previewFromClosure(closure: CashClosure): CashClosurePreview {
  return {
    businessDate: closure.businessDate,
    shift: closure.shift,
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
    collaboratorClp: closure.collaboratorClp,
    collaboratorCount: closure.collaboratorCount,
    pendingCustomers: closure.pendingCustomers,
    pendingCollaborators: closure.pendingCollaborators,
    unassignedSalesClp: closure.unassignedSalesClp,
    unassignedSalesCount: closure.unassignedSalesCount,
    unassignedPaymentsClp: closure.unassignedPaymentsClp,
    unassignedPaymentsCount: closure.unassignedPaymentsCount,
    closed: true,
  };
}

type PreviewTotalsRow = {
  total_sales_clp: number;
  sales_count: number;
  pending_customer_clp: number;
  pending_customer_count: number;
  collaborator_clp: number;
  collaborator_count: number;
  cash_movements_clp: number;
  expected_card_clp: number;
  expected_transfer_clp: number;
};

async function currentPendingDetails(
  database: D1Database,
): Promise<{
  pendingCustomers: PendingCustomerDetail[];
  pendingCollaborators: PendingCollaboratorDetail[];
}> {
  const customerRows = await database
    .prepare(`
      SELECT sale.id, sale.created_at, sale.debt_note,
        sale.total_clp - COALESCE((
          SELECT SUM(payment.amount_clp)
          FROM sale_payments AS payment
          WHERE payment.sale_id = sale.id
        ), 0) AS total_clp
      FROM sales AS sale
      WHERE sale.payment_status = 'pending'
        AND sale.checkout_method = 'pendiente'
        AND NOT EXISTS (
          SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
        )
      ORDER BY created_at, id LIMIT 50
    `)
    .all<{
      id: string;
      created_at: string;
      debt_note: string;
      total_clp: number;
    }>();
  return {
    pendingCustomers: customerRows.results.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      debtNote: row.debt_note,
      totalClp: Number(row.total_clp),
    })),
    pendingCollaborators: [],
  };
}

export async function getCashClosurePreview(
  database: D1Database,
  businessDate: string,
  shift: Shift,
): Promise<CashClosurePreview> {
  if (!isShift(shift)) throw new PosError(400, "El turno debe ser AM o PM.");
  const session = await getActiveShiftSessionForContext(database, businessDate, shift);
  if (!session) {
    const closureRow = await findClosureRowByContext(database, businessDate, shift);
    if (closureRow) return previewFromClosure(await hydrateClosure(database, closureRow));
  }
  const { startIso, endIso } = getSantiagoDateBounds(businessDate);
  const saleSessionPredicate = session
    ? "(sale.shift_session_id = ? OR (sale.shift_session_id IS NULL AND sale.business_date = ? AND sale.shift = ?))"
    : "sale.business_date = ? AND sale.shift = ?";
  const paymentSessionPredicate = session
    ? "(payment.shift_session_id = ? OR (payment.shift_session_id IS NULL AND payment.business_date = ? AND payment.shift = ?))"
    : "payment.business_date = ? AND payment.shift = ?";
  const sessionBindings = session
    ? [session.id, businessDate, shift]
    : [businessDate, shift];
  const [totals, unassigned, debts] = await Promise.all([
    database
      .prepare(`
        SELECT
          (SELECT COALESCE(SUM(sale.total_clp), 0) FROM sales AS sale
            WHERE ${saleSessionPredicate}
              AND sale.checkout_method <> 'colaborador'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS total_sales_clp,
          (SELECT COUNT(*) FROM sales AS sale
            WHERE ${saleSessionPredicate}
              AND sale.checkout_method <> 'colaborador'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS sales_count,
          (SELECT COALESCE(SUM(
              sale.total_clp - COALESCE((
                SELECT SUM(payment.amount_clp)
                FROM sale_payments AS payment
                WHERE payment.sale_id = sale.id
              ), 0)
            ), 0)
            FROM sales AS sale
            WHERE sale.payment_status = 'pending'
              AND sale.checkout_method = 'pendiente'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS pending_customer_clp,
          (SELECT COUNT(*) FROM sales AS sale
            WHERE sale.payment_status = 'pending'
              AND sale.checkout_method = 'pendiente'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS pending_customer_count,
          0 AS collaborator_clp,
          0 AS collaborator_count,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE ${paymentSessionPredicate}
              AND (sale.checkout_method <> 'colaborador'
                OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )
              AND payment.payment_method = 'efectivo')
            AS cash_movements_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE ${paymentSessionPredicate}
              AND (sale.checkout_method <> 'colaborador'
                OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )
              AND payment.payment_method = 'tarjeta')
            AS expected_card_clp,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE ${paymentSessionPredicate}
              AND (sale.checkout_method <> 'colaborador'
                OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )
              AND payment.payment_method = 'transferencia')
            AS expected_transfer_clp
      `)
      .bind(
        ...sessionBindings,
        ...sessionBindings,
        ...sessionBindings,
        ...sessionBindings,
        ...sessionBindings,
      )
      .first<PreviewTotalsRow>(),
    database
      .prepare(`
        SELECT
          (SELECT COALESCE(SUM(sale.total_clp), 0) FROM sales AS sale
            WHERE sale.created_at >= ? AND sale.created_at < ?
              AND (sale.business_date IS NULL OR sale.shift IS NULL)
              AND sale.checkout_method <> 'colaborador'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS unassigned_sales_clp,
          (SELECT COUNT(*) FROM sales AS sale
            WHERE sale.created_at >= ? AND sale.created_at < ?
              AND (sale.business_date IS NULL OR sale.shift IS NULL)
              AND sale.checkout_method <> 'colaborador'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS unassigned_sales_count,
          (SELECT COALESCE(SUM(payment.amount_clp), 0)
            FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE payment.created_at >= ? AND payment.created_at < ?
              AND (payment.business_date IS NULL OR payment.shift IS NULL)
              AND (sale.checkout_method <> 'colaborador'
                OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS unassigned_payments_clp,
          (SELECT COUNT(*) FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE payment.created_at >= ? AND payment.created_at < ?
              AND (payment.business_date IS NULL OR payment.shift IS NULL)
              AND (sale.checkout_method <> 'colaborador'
                OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )) AS unassigned_payments_count
      `)
      .bind(
        startIso,
        endIso,
        startIso,
        endIso,
        startIso,
        endIso,
        startIso,
        endIso,
      )
      .first<{
        unassigned_sales_clp: number;
        unassigned_sales_count: number;
        unassigned_payments_clp: number;
        unassigned_payments_count: number;
      }>(),
    session
      ? currentPendingDetails(database)
      : Promise.resolve({ pendingCustomers: [], pendingCollaborators: [] }),
  ]);
  const openingCashClp = session?.openingCashClp ?? 0;
  const cashMovementsClp = Number(totals?.cash_movements_clp ?? 0);
  const expectedCardClp = Number(totals?.expected_card_clp ?? 0);
  const expectedTransferClp = Number(totals?.expected_transfer_clp ?? 0);
  const expectedCashClp = openingCashClp + cashMovementsClp;
  const collectedPaymentsClp =
    cashMovementsClp + expectedCardClp + expectedTransferClp;
  return {
    businessDate,
    shift,
    activityRevision: session?.activityRevision ?? null,
    openingCashClp,
    cashMovementsClp,
    expectedCashClp,
    expectedCardClp,
    expectedTransferClp,
    collectedPaymentsClp,
    expectedCollectedClp: openingCashClp + collectedPaymentsClp,
    totalSalesClp: Number(totals?.total_sales_clp ?? 0),
    salesCount: Number(totals?.sales_count ?? 0),
    pendingCustomerClp: Number(totals?.pending_customer_clp ?? 0),
    pendingCustomerCount: Number(totals?.pending_customer_count ?? 0),
    collaboratorClp: 0,
    collaboratorCount: 0,
    pendingCustomers: debts.pendingCustomers,
    pendingCollaborators: [],
    unassignedSalesClp: Number(unassigned?.unassigned_sales_clp ?? 0),
    unassignedSalesCount: Number(unassigned?.unassigned_sales_count ?? 0),
    unassignedPaymentsClp: Number(unassigned?.unassigned_payments_clp ?? 0),
    unassignedPaymentsCount: Number(
      unassigned?.unassigned_payments_count ?? 0,
    ),
    closed: false,
  };
}

async function hydrateCashClosureRows(
  database: D1Database,
  rows: ClosureRow[],
): Promise<CashClosure[]> {
  if (rows.length === 0) return [];
  const placeholders = rows.map(() => "?").join(", ");
  const ids = rows.map((row) => row.id);
  const [inventoryResult, debtsResult, expensesResult, validationsResult] =
    await Promise.all([
    database
      .prepare(`
        SELECT closure_id, item_key, item_type, item_id, item_name, unit,
          location, expected_version_token AS version_token,
          expected_quantity, counted_quantity, difference_quantity, reason,
          reason_category, incident_comment
        FROM cash_closure_inventory
        WHERE closure_id IN (${placeholders})
        ORDER BY item_type, item_name, item_id, location
      `)
      .bind(...ids)
      .all<ClosureInventoryRow>(),
    database
      .prepare(`
        SELECT closure_id, sale_id, debt_type, created_at, debt_note,
          debtor_collaborator, amount_clp
        FROM cash_closure_debts
        WHERE closure_id IN (${placeholders})
        ORDER BY created_at, sale_id
      `)
      .bind(...ids)
      .all<ClosureDebtRow>(),
    database
      .prepare(`
        SELECT closure_id, id, description, amount_clp
        FROM cash_closure_expenses
        WHERE closure_id IN (${placeholders})
        ORDER BY closure_id, id
      `)
      .bind(...ids)
      .all<ClosureExpenseRow>(),
    database
      .prepare(`
        SELECT closure_id, validated_at, comment, revision_number,
          request_fingerprint
        FROM cash_closure_validations
        WHERE closure_id IN (${placeholders})
      `)
      .bind(...ids)
      .all<ClosureValidationRow>(),
  ]);
  return rows.map((row) => {
    const debts = mapClosureDebts(
      debtsResult.results.filter(({ closure_id }) => closure_id === row.id),
    );
    return mapClosure(
      row,
      inventoryResult.results
        .filter(({ closure_id }) => closure_id === row.id)
        .map(mapClosureInventoryRow),
      debts.pendingCustomers,
      debts.pendingCollaborators,
      mapClosureExpenses(
        expensesResult.results.filter(
          ({ closure_id }) => closure_id === row.id,
        ),
      ),
      mapClosureValidation(
        validationsResult.results.find(
          ({ closure_id }) => closure_id === row.id,
        ),
      ),
    );
  });
}

const cashClosureListSelect = `
  SELECT closure.*, COALESCE((
    SELECT MAX(revision.revision_number)
    FROM cash_closure_revisions AS revision
    INNER JOIN cash_closure_revision_seals AS seal
      ON seal.revision_id = revision.id
    WHERE revision.closure_id = closure.id
      AND seal.request_fingerprint = revision.request_fingerprint
  ), 0) AS latest_revision_number
  FROM cash_closures AS closure
  LEFT JOIN cash_closure_validations AS validation
    ON validation.closure_id = closure.id
`;

export async function listCashClosures(
  database: D1Database,
  limit = 30,
): Promise<CashClosure[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 90) {
    throw new PosError(400, "El límite de cuadraturas debe estar entre 1 y 90.");
  }
  const rows = await database
    .prepare(`
      ${cashClosureListSelect}
      ORDER BY CASE
        WHEN closure.closure_contract_version = 2
          AND validation.closure_id IS NULL THEN 0
        ELSE 1
      END,
        closure.created_at DESC, closure.id DESC
      LIMIT ?
    `)
    .bind(limit)
    .all<ClosureRow>();
  return hydrateCashClosureRows(database, rows.results);
}

type CashClosurePendingCursor = {
  v: 1;
  createdAt: string;
  id: string;
};

export type CashClosureListPage = {
  closures: CashClosure[];
  pendingHasMore: boolean;
  pendingNextCursor: string | null;
};

function encodeCashClosurePendingCursor(row: ClosureRow): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ v: 1, createdAt: row.created_at, id: row.id }),
  );
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeCashClosurePendingCursor(
  encoded: string,
): CashClosurePendingCursor {
  try {
    if (!encoded || encoded.length > 1000 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) {
      throw new Error("invalid cursor encoding");
    }
    const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/") + padding);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CashClosurePendingCursor>;
    if (
      value.v !== 1 ||
      typeof value.createdAt !== "string" ||
      !Number.isFinite(Date.parse(value.createdAt)) ||
      typeof value.id !== "string" ||
      !value.id ||
      value.id.length > 200
    ) {
      throw new Error("invalid cursor payload");
    }
    return value as CashClosurePendingCursor;
  } catch {
    throw new PosError(400, "El cursor de cierres pendientes no es válido.");
  }
}

export async function listCashClosurePage(
  database: D1Database,
  options: {
    pendingLimit?: number;
    pendingCursor?: string | null;
    historyLimit?: number;
  } = {},
): Promise<CashClosureListPage> {
  const pendingLimit = options.pendingLimit ?? 30;
  const historyLimit = options.historyLimit ?? 30;
  if (!Number.isSafeInteger(pendingLimit) || pendingLimit < 1 || pendingLimit > 50) {
    throw new PosError(400, "El límite de cierres pendientes debe estar entre 1 y 50.");
  }
  if (!Number.isSafeInteger(historyLimit) || historyLimit < 0 || historyLimit > 50) {
    throw new PosError(400, "El límite del historial debe estar entre 0 y 50.");
  }
  const cursor = options.pendingCursor
    ? decodeCashClosurePendingCursor(options.pendingCursor)
    : null;
  const pendingStatement = cursor
    ? database
        .prepare(`
          ${cashClosureListSelect}
          WHERE closure.closure_contract_version = 2
            AND validation.closure_id IS NULL
            AND (
              closure.created_at < ?
              OR (closure.created_at = ? AND closure.id < ?)
            )
          ORDER BY closure.created_at DESC, closure.id DESC
          LIMIT ?
        `)
        .bind(cursor.createdAt, cursor.createdAt, cursor.id, pendingLimit + 1)
    : database
        .prepare(`
          ${cashClosureListSelect}
          WHERE closure.closure_contract_version = 2
            AND validation.closure_id IS NULL
          ORDER BY closure.created_at DESC, closure.id DESC
          LIMIT ?
        `)
        .bind(pendingLimit + 1);
  const [pendingResult, historyResult] = await Promise.all([
    pendingStatement.all<ClosureRow>(),
    cursor || historyLimit === 0
      ? Promise.resolve({ results: [] as ClosureRow[], success: true, meta: {} })
      : database
          .prepare(`
            ${cashClosureListSelect}
            WHERE closure.closure_contract_version IS NULL
              OR closure.closure_contract_version <> 2
              OR validation.closure_id IS NOT NULL
            ORDER BY closure.created_at DESC, closure.id DESC
            LIMIT ?
          `)
          .bind(historyLimit)
          .all<ClosureRow>(),
  ]);
  const pendingHasMore = pendingResult.results.length > pendingLimit;
  const pendingRows = pendingResult.results.slice(0, pendingLimit);
  const rows = cursor ? pendingRows : [...pendingRows, ...historyResult.results];
  return {
    closures: await hydrateCashClosureRows(database, rows),
    pendingHasMore,
    pendingNextCursor:
      pendingHasMore && pendingRows.length > 0
        ? encodeCashClosurePendingCursor(pendingRows[pendingRows.length - 1])
        : null,
  };
}

function assertSafeNonnegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PosError(400, `${label} debe ser un entero no negativo.`);
  }
}

function validateFormalClosureInput(input: CashClosureInput): void {
  assertSafeNonnegativeInteger(
    input.expectedActivityRevision,
    "La revisión esperada del turno",
  );
  assertSafeNonnegativeInteger(input.countedCashClp, "El efectivo contado");
  assertSafeNonnegativeInteger(input.countedCardClp, "La tarjeta conciliada");
  assertSafeNonnegativeInteger(
    input.countedTransferClp,
    "La transferencia conciliada",
  );
  if (!Array.isArray(input.expenses) || input.expenses.length > 25) {
    throw new PosError(400, "Los gastos de caja chica no son válidos.");
  }
  const expenseIds = new Set<string>();
  for (const expense of input.expenses) {
    if (!expense.id || expense.id.length > 100 || expenseIds.has(expense.id)) {
      throw new PosError(400, "Los gastos contienen identificadores duplicados o inválidos.");
    }
    expenseIds.add(expense.id);
    if (
      !expense.description ||
      !expense.description.trim() ||
      expense.description.length > 200
    ) {
      throw new PosError(400, "La descripción de un gasto no es válida.");
    }
    if (!Number.isSafeInteger(expense.amountClp) || expense.amountClp <= 0) {
      throw new PosError(400, "El monto de cada gasto debe ser un entero mayor que cero.");
    }
  }
  if (!Array.isArray(input.inventory) || input.inventory.length > 90) {
    throw new PosError(400, "El inventario de cierre no es válido.");
  }
  const keys = new Set<string>();
  for (const line of input.inventory) {
    if (!line.key || keys.has(line.key)) {
      throw new PosError(400, "El inventario contiene ubicaciones duplicadas.");
    }
    keys.add(line.key);
    if (!line.versionToken || line.versionToken.length > 100) {
      throw new PosError(400, `La versión de «${line.key}» no es válida.`);
    }
    assertSafeNonnegativeInteger(
      line.expectedQuantity,
      `La cantidad esperada de «${line.key}»`,
    );
    assertSafeNonnegativeInteger(
      line.countedQuantity,
      `La cantidad contada de «${line.key}»`,
    );
    const differs = line.expectedQuantity !== line.countedQuantity;
    if (
      (differs &&
        (!isInventoryDifferenceReason(line.reasonCategory) ||
          !line.comment ||
          !line.comment.trim() ||
          line.comment.length > 1000)) ||
      (!differs &&
        (line.reasonCategory !== null || line.comment !== null))
    ) {
      throw new PosError(
        400,
        differs
          ? `Debes categorizar y comentar la diferencia de «${line.key}».`
          : `«${line.key}» no debe tener motivo ni comentario si no hay diferencia.`,
      );
    }
  }
  if (
    input.handoffComments !== null &&
    (!input.handoffComments.trim() || input.handoffComments.length > 1000)
  ) {
    throw new PosError(400, "Los comentarios de entrega no son válidos.");
  }
}

function canonicalClosurePayload(input: CashClosureInput): string {
  return JSON.stringify({
    closureAccountingPolicy: "exclude-collaborator-consumption-v2",
    sessionId: input.sessionId,
    expectedActivityRevision: input.expectedActivityRevision,
    countedCashClp: input.countedCashClp,
    countedCardClp: input.countedCardClp,
    countedTransferClp: input.countedTransferClp,
    financialDifferenceReason: input.financialDifferenceReason,
    expenses: [...input.expenses]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((expense) => ({
        id: expense.id,
        description: expense.description,
        amountClp: expense.amountClp,
      })),
    inventory: [...input.inventory]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((line) => ({
        key: line.key,
        versionToken: line.versionToken,
        expectedQuantity: line.expectedQuantity,
        countedQuantity: line.countedQuantity,
        reasonCategory: line.reasonCategory,
        comment: line.comment,
      })),
    handoffComments: input.handoffComments,
  });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function inventoryMatchesPreview(
  input: CountedInventoryLine[],
  current: ClosingInventoryLine[],
): boolean {
  if (input.length !== current.length) return false;
  const currentByKey = new Map(current.map((line) => [line.key, line]));
  return input.every((line) => {
    const stored = currentByKey.get(line.key);
    return (
      stored?.versionToken === line.versionToken &&
      stored.expectedQuantity === line.expectedQuantity
    );
  });
}

export async function createCashClosure(
  database: D1Database,
  input: CashClosureInput,
  now = new Date(),
): Promise<{
  closure: CashClosure;
  incidentId: string | null;
  idempotent: boolean;
}> {
  validateFormalClosureInput(input);
  const fingerprint = await sha256Hex(canonicalClosurePayload(input));
  const existing = await findClosureRowById(database, input.id);
  if (existing) {
    if (existing.request_fingerprint !== fingerprint) {
      throw new PosError(409, "El id de la cuadratura ya fue utilizado.");
    }
    return {
      closure: await hydrateClosure(database, existing),
      incidentId: await findClosureIncidentId(database, existing.id),
      idempotent: true,
    };
  }

  const session = await findShiftSession(database, input.sessionId);
  if (!session || session.status !== "open") {
    throw new PosError(409, "La sesión del turno ya está cerrada o no existe.");
  }
  if (session.activityRevision !== input.expectedActivityRevision) {
    throw new PosError(
      409,
      "La actividad del turno cambió. Actualiza la cuadratura e intenta nuevamente.",
    );
  }
  const [preview, currentInventory] = await Promise.all([
    getCashClosurePreview(database, session.businessDate, session.shift),
    listClosingInventory(database),
  ]);
  if (preview.activityRevision !== input.expectedActivityRevision) {
    throw new PosError(
      409,
      "La actividad del turno cambió. Actualiza la cuadratura e intenta nuevamente.",
    );
  }
  if (!inventoryMatchesPreview(input.inventory, currentInventory)) {
    throw new PosError(
      409,
      "El inventario cambió. Actualiza el conteo antes de cerrar el turno.",
    );
  }

  const expensesClp = input.expenses.reduce(
    (total, expense) => total + expense.amountClp,
    0,
  );
  if (!Number.isSafeInteger(expensesClp)) {
    throw new PosError(400, "La suma de gastos excede el límite seguro.");
  }
  const grossCashShortfall = preview.expectedCashClp - input.countedCashClp;
  if (grossCashShortfall > 0) {
    if (expensesClp > grossCashShortfall) {
      throw new PosError(
        400,
        "Los gastos de caja chica no pueden superar el faltante de efectivo.",
      );
    }
  } else if (input.expenses.length > 0) {
    throw new PosError(
      400,
      "Solo puedes registrar gastos cuando existe un faltante de efectivo.",
    );
  }
  const adjustedExpectedCashClp = preview.expectedCashClp - expensesClp;
  const legacyCashDifference = input.countedCashClp - preview.expectedCashClp;
  const cashDifference = input.countedCashClp - adjustedExpectedCashClp;
  const cardDifference = input.countedCardClp - preview.expectedCardClp;
  const transferDifference =
    input.countedTransferClp - preview.expectedTransferClp;
  const countedCollectedClp =
    input.countedCashClp + input.countedCardClp + input.countedTransferClp;
  const adjustedExpectedCollectedClp =
    preview.expectedCollectedClp - expensesClp;
  const differenceCollectedClp =
    countedCollectedClp - adjustedExpectedCollectedClp;
  const legacyDifferenceCollectedClp =
    countedCollectedClp - preview.expectedCollectedClp;
  if (
    !Number.isSafeInteger(cashDifference) ||
    !Number.isSafeInteger(legacyCashDifference) ||
    !Number.isSafeInteger(cardDifference) ||
    !Number.isSafeInteger(transferDifference) ||
    !Number.isSafeInteger(countedCollectedClp) ||
    !Number.isSafeInteger(adjustedExpectedCollectedClp) ||
    !Number.isSafeInteger(differenceCollectedClp) ||
    !Number.isSafeInteger(legacyDifferenceCollectedClp)
  ) {
    throw new PosError(400, "Los montos de la conciliación exceden el límite seguro.");
  }
  const hasFinancialDifference =
    cashDifference !== 0 || cardDifference !== 0 || transferDifference !== 0;
  if (
    (hasFinancialDifference &&
      (!input.financialDifferenceReason ||
        !input.financialDifferenceReason.trim() ||
        input.financialDifferenceReason.length > 500)) ||
    (!hasFinancialDifference && input.financialDifferenceReason !== null)
  ) {
    throw new PosError(
      400,
      hasFinancialDifference
        ? "Debes explicar las diferencias de la conciliación financiera."
        : "No debe existir un motivo financiero si no hay diferencias.",
    );
  }
  const legacyHasFinancialDifference =
    legacyCashDifference !== 0 ||
    cardDifference !== 0 ||
    transferDifference !== 0;
  const legacyFinancialDifferenceReason = legacyHasFinancialDifference
    ? (input.financialDifferenceReason ?? "Gastos de caja chica registrados")
    : null;

  const { startIso, endIso } = getSantiagoDateBounds(session.businessDate);
  const createdAt = now.toISOString();
  const countedByKey = new Map(input.inventory.map((line) => [line.key, line]));
  const preparedIncident = await prepareClosureIncident(database, {
    closureId: input.id,
    businessDate: session.businessDate,
    shift: session.shift,
    responsible: session.responsible,
    createdAt,
    cashDifferenceClp: cashDifference,
    cardDifferenceClp: cardDifference,
    transferDifferenceClp: transferDifference,
    inventory: currentInventory.flatMap((line) => {
      const counted = countedByKey.get(line.key);
      if (!counted || line.location === "bodega") return [];
      if (
        counted.countedQuantity === counted.expectedQuantity ||
        counted.reasonCategory === null ||
        counted.comment === null
      ) {
        return [];
      }
      return [{
        key: line.key,
        itemType: line.itemType,
        itemId: line.itemId,
        name: line.name,
        unit: line.unit,
        location: line.location,
        expectedQuantity: counted.expectedQuantity,
        countedQuantity: counted.countedQuantity,
        reasonCategory: counted.reasonCategory,
        comment: counted.comment,
      }];
    }),
  });
  const inventoryJson = JSON.stringify(
    [...input.inventory].sort((a, b) => a.key.localeCompare(b.key)),
  );
  const expensesJson = JSON.stringify(
    [...input.expenses].sort((a, b) => a.id.localeCompare(b.id)),
  );
  const statements: D1PreparedStatement[] = [
    database
      .prepare(`
        WITH
          input_inventory AS (
            SELECT
              json_extract(value, '$.key') AS item_key,
              json_extract(value, '$.versionToken') AS version_token,
              CAST(json_extract(value, '$.expectedQuantity') AS INTEGER)
                AS expected_quantity
            FROM json_each(?)
          ),
          current_inventory AS (${closingInventorySql}),
          inventory_guard AS (
            SELECT CASE WHEN
              (SELECT COUNT(*) FROM input_inventory) =
                (SELECT COUNT(*) FROM current_inventory)
              AND (SELECT COUNT(DISTINCT item_key) FROM input_inventory) =
                (SELECT COUNT(*) FROM input_inventory)
              AND NOT EXISTS (
                SELECT 1 FROM input_inventory AS input
                LEFT JOIN current_inventory AS current
                  ON current.item_key = input.item_key
                WHERE current.item_key IS NULL
                  OR current.version_token <> input.version_token
                  OR current.expected_quantity <> input.expected_quantity
              )
              AND NOT EXISTS (
                SELECT 1 FROM current_inventory AS current
                LEFT JOIN input_inventory AS input
                  ON input.item_key = current.item_key
                WHERE input.item_key IS NULL
              )
            THEN 1 ELSE 0 END AS ok
          ),
          sale_totals AS (
            SELECT
              COALESCE(SUM(sale.total_clp), 0) AS total_sales_clp,
              COUNT(*) AS sales_count
            FROM sales AS sale
            WHERE (sale.shift_session_id = ? OR (
              sale.shift_session_id IS NULL
                AND sale.business_date = ? AND sale.shift = ?
            )) AND sale.checkout_method <> 'colaborador'
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )
          ),
          debt_totals AS (
            SELECT
              COALESCE(SUM(CASE WHEN checkout_method = 'pendiente'
                AND payment_status = 'pending' THEN total_clp - COALESCE((
                  SELECT SUM(payment.amount_clp)
                  FROM sale_payments AS payment
                  WHERE payment.sale_id = sales.id
                ), 0) ELSE 0 END), 0)
                AS pending_customer_clp,
              COALESCE(SUM(CASE WHEN checkout_method = 'pendiente'
                AND payment_status = 'pending' THEN 1 ELSE 0 END), 0)
                AS pending_customer_count,
              0 AS collaborator_clp,
              0 AS collaborator_count
            FROM sales
            WHERE NOT EXISTS (
              SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sales.id
            )
          ),
          payment_totals AS (
            SELECT
              COALESCE(SUM(CASE WHEN payment.payment_method = 'efectivo'
                THEN payment.amount_clp ELSE 0 END), 0) AS cash_movements_clp,
              COALESCE(SUM(CASE WHEN payment.payment_method = 'tarjeta'
                THEN payment.amount_clp ELSE 0 END), 0) AS expected_card_clp,
              COALESCE(SUM(CASE WHEN payment.payment_method = 'transferencia'
                THEN payment.amount_clp ELSE 0 END), 0) AS expected_transfer_clp
            FROM sale_payments AS payment
            INNER JOIN sales AS sale ON sale.id = payment.sale_id
            WHERE (payment.shift_session_id = ? OR (
              payment.shift_session_id IS NULL
                AND payment.business_date = ? AND payment.shift = ?
            )) AND (sale.checkout_method <> 'colaborador'
              OR payment.kind = 'settlement')
              AND NOT EXISTS (
                SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
              )
          ),
          unassigned AS (
            SELECT
              (SELECT COALESCE(SUM(sale.total_clp), 0) FROM sales AS sale
                WHERE sale.created_at >= ? AND sale.created_at < ?
                  AND (sale.business_date IS NULL OR sale.shift IS NULL)
                  AND sale.checkout_method <> 'colaborador'
                  AND NOT EXISTS (
                    SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
                  )) AS unassigned_sales_clp,
              (SELECT COUNT(*) FROM sales AS sale
                WHERE sale.created_at >= ? AND sale.created_at < ?
                  AND (sale.business_date IS NULL OR sale.shift IS NULL)
                  AND sale.checkout_method <> 'colaborador'
                  AND NOT EXISTS (
                    SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
                  )) AS unassigned_sales_count,
              (SELECT COALESCE(SUM(payment.amount_clp), 0)
                FROM sale_payments AS payment
                INNER JOIN sales AS sale ON sale.id = payment.sale_id
                WHERE payment.created_at >= ? AND payment.created_at < ?
                  AND (payment.business_date IS NULL OR payment.shift IS NULL)
                  AND (sale.checkout_method <> 'colaborador'
                    OR payment.kind = 'settlement')
                  AND NOT EXISTS (
                    SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
                  )) AS unassigned_payments_clp,
              (SELECT COUNT(*) FROM sale_payments AS payment
                INNER JOIN sales AS sale ON sale.id = payment.sale_id
                WHERE payment.created_at >= ? AND payment.created_at < ?
                  AND (payment.business_date IS NULL OR payment.shift IS NULL)
                  AND (sale.checkout_method <> 'colaborador'
                    OR payment.kind = 'settlement')
                  AND NOT EXISTS (
                    SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
                  )) AS unassigned_payments_count
          )
        INSERT INTO cash_closures (
          id, session_id, session_activity_revision, request_fingerprint,
          business_date, shift, responsible, created_at, expected_cash_clp,
          opening_cash_clp, cash_movements_clp, expected_card_clp,
          expected_transfer_clp, expected_collected_clp, total_sales_clp,
          sales_count, pending_customer_clp, pending_customer_count,
          collaborator_clp, collaborator_count, counted_cash_clp,
          difference_clp, counted_card_clp, difference_card_clp,
          counted_transfer_clp, difference_transfer_clp,
          counted_collected_clp, difference_collected_clp,
          financial_difference_reason, closure_contract_version, expenses_clp,
          adjusted_expected_cash_clp, adjusted_difference_clp,
          adjusted_difference_collected_clp,
          handoff_financial_difference_reason, handoff_comments,
          cash_reconciled, card_reconciled,
          transfer_reconciled, pending_customer_reviewed,
          collaborator_reviewed, inventory_count_confirmed, checklist_version,
          unassigned_sales_clp, unassigned_sales_count,
          unassigned_payments_clp, unassigned_payments_count, notes
        )
        SELECT
          ?, session.id, session.activity_revision, ?, session.business_date,
          session.shift, session.responsible, ?,
          session.opening_cash_clp + payments.cash_movements_clp,
          session.opening_cash_clp, payments.cash_movements_clp,
          payments.expected_card_clp, payments.expected_transfer_clp,
          session.opening_cash_clp + payments.cash_movements_clp +
            payments.expected_card_clp + payments.expected_transfer_clp,
          sales.total_sales_clp, sales.sales_count,
          debts.pending_customer_clp, debts.pending_customer_count,
          debts.collaborator_clp, debts.collaborator_count,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?,
          session.opening_cash_clp + payments.cash_movements_clp - ?,
          ?, ?, ?, ?, 1, 1, 1, 1, 1, 1, 1,
          unassigned.unassigned_sales_clp, unassigned.unassigned_sales_count,
          unassigned.unassigned_payments_clp,
          unassigned.unassigned_payments_count, NULL
        FROM shift_sessions AS session, sale_totals AS sales,
          debt_totals AS debts, payment_totals AS payments, unassigned,
          inventory_guard
        WHERE session.id = ? AND session.status = 'open'
          AND session.active_slot = 1 AND session.activity_revision = ?
          AND inventory_guard.ok = 1
      `)
      .bind(
        inventoryJson,
        session.id,
        session.businessDate,
        session.shift,
        session.id,
        session.businessDate,
        session.shift,
        startIso,
        endIso,
        startIso,
        endIso,
        startIso,
        endIso,
        startIso,
        endIso,
        input.id,
        fingerprint,
        createdAt,
        input.countedCashClp,
        legacyCashDifference,
        input.countedCardClp,
        cardDifference,
        input.countedTransferClp,
        transferDifference,
        countedCollectedClp,
        legacyDifferenceCollectedClp,
        legacyFinancialDifferenceReason,
        expensesClp,
        expensesClp,
        cashDifference,
        differenceCollectedClp,
        input.financialDifferenceReason,
        input.handoffComments,
        session.id,
        input.expectedActivityRevision,
      ),
    database
      .prepare(`
        WITH input_expenses AS (
          SELECT
            json_extract(value, '$.id') AS id,
            json_extract(value, '$.description') AS description,
            CAST(json_extract(value, '$.amountClp') AS INTEGER) AS amount_clp
          FROM json_each(?)
        )
        INSERT INTO cash_closure_expenses (
          closure_id, id, description, amount_clp
        )
        SELECT ?, expense.id, expense.description, expense.amount_clp
        FROM input_expenses AS expense
        WHERE EXISTS (
          SELECT 1 FROM cash_closures
          WHERE id = ? AND session_id = ? AND request_fingerprint = ?
            AND expenses_clp = ?
        )
      `)
      .bind(
        expensesJson,
        input.id,
        input.id,
        session.id,
        fingerprint,
        expensesClp,
      ),
    database
      .prepare(`
        INSERT INTO cash_closure_debts (
          closure_id, sale_id, debt_type, created_at, debt_note,
          debtor_collaborator, amount_clp
        )
        SELECT closure.id, sale.id, sale.checkout_method, sale.created_at,
          sale.debt_note, sale.debtor_collaborator,
          sale.total_clp - COALESCE((
            SELECT SUM(payment.amount_clp)
            FROM sale_payments AS payment
            WHERE payment.sale_id = sale.id
          ), 0)
        FROM cash_closures AS closure
        CROSS JOIN sales AS sale
        WHERE closure.id = ? AND closure.session_id = ?
          AND closure.request_fingerprint = ?
          AND sale.payment_status = 'pending'
          AND sale.checkout_method = 'pendiente'
          AND NOT EXISTS (
            SELECT 1 FROM sale_voids AS void WHERE void.sale_id = sale.id
          )
      `)
      .bind(input.id, session.id, fingerprint),
    database
      .prepare(`
        WITH
          input_inventory AS (
            SELECT
              json_extract(value, '$.key') AS item_key,
              CAST(json_extract(value, '$.countedQuantity') AS INTEGER)
                AS counted_quantity,
              json_extract(value, '$.reasonCategory') AS reason_category,
              json_extract(value, '$.comment') AS incident_comment
            FROM json_each(?)
          ),
          current_inventory AS (${closingInventorySql})
        INSERT INTO cash_closure_inventory (
          closure_id, item_key, item_type, item_id, item_name, unit, location,
          expected_version_token, expected_quantity, counted_quantity,
          difference_quantity, reason, reason_category, incident_comment
        )
        SELECT ?, current.item_key, current.item_type, current.item_id,
          current.item_name, current.unit, current.location,
          current.version_token, current.expected_quantity,
          input.counted_quantity,
          input.counted_quantity - current.expected_quantity,
          substr(input.incident_comment, 1, 500), input.reason_category,
          input.incident_comment
        FROM current_inventory AS current
        INNER JOIN input_inventory AS input ON input.item_key = current.item_key
        WHERE EXISTS (
          SELECT 1 FROM cash_closures
          WHERE id = ? AND session_id = ? AND request_fingerprint = ?
        )
      `)
      .bind(inventoryJson, input.id, input.id, session.id, fingerprint),
    database
      .prepare(`
        WITH input_inventory AS (
          SELECT json_extract(value, '$.key') AS item_key,
            CAST(json_extract(value, '$.countedQuantity') AS INTEGER)
              AS counted_quantity
          FROM json_each(?)
        )
        UPDATE products
        SET
          stock = CASE WHEN stock_mode = 'simple' THEN (
            SELECT counted_quantity FROM input_inventory
            WHERE item_key = 'product:' || products.id || ':simple'
          ) ELSE stock END,
          stock_vitrina = CASE WHEN stock_mode = 'split' THEN (
            SELECT counted_quantity FROM input_inventory
            WHERE item_key = 'product:' || products.id || ':vitrina'
          ) ELSE stock_vitrina END,
          stock_bodega = stock_bodega,
          updated_at = CASE WHEN updated_at < ? THEN ? ELSE
            strftime('%Y-%m-%dT%H:%M:%fZ',
              julianday(updated_at) + 0.000000011574074)
          END
        WHERE stock_mode IN ('simple', 'split')
          AND EXISTS (
            SELECT 1 FROM cash_closures
            WHERE id = ? AND session_id = ? AND request_fingerprint = ?
          )
      `)
      .bind(
        inventoryJson,
        createdAt,
        createdAt,
        input.id,
        session.id,
        fingerprint,
      ),
    database
      .prepare(`
        WITH input_inventory AS (
          SELECT json_extract(value, '$.key') AS item_key,
            CAST(json_extract(value, '$.countedQuantity') AS INTEGER)
              AS counted_quantity
          FROM json_each(?)
        )
        UPDATE ingredients
        SET
          stock = (
            SELECT counted_quantity FROM input_inventory
            WHERE item_key = 'ingredient:' || ingredients.id
          ),
          revision = revision + 1,
          updated_at = CASE WHEN updated_at < ? THEN ? ELSE
            strftime('%Y-%m-%dT%H:%M:%fZ',
              julianday(updated_at) + 0.000000011574074)
          END
        WHERE EXISTS (
          SELECT 1 FROM cash_closures
          WHERE id = ? AND session_id = ? AND request_fingerprint = ?
        )
      `)
      .bind(
        inventoryJson,
        createdAt,
        createdAt,
        input.id,
        session.id,
        fingerprint,
      ),
    database
      .prepare(`
        WITH
          input_inventory AS (
            SELECT
              json_extract(value, '$.key') AS item_key,
              CAST(json_extract(value, '$.countedQuantity') AS INTEGER)
                AS counted_quantity
            FROM json_each(?)
          ),
          input_expenses AS (
            SELECT json_extract(value, '$.id') AS id
            FROM json_each(?)
          ),
          current_inventory AS (${closingInventorySql}),
          inventory_applied AS (
            SELECT CASE WHEN
              (SELECT COUNT(*) FROM input_inventory) =
                (SELECT COUNT(*) FROM current_inventory)
              AND NOT EXISTS (
                SELECT 1 FROM input_inventory AS input
                LEFT JOIN current_inventory AS current
                  ON current.item_key = input.item_key
                WHERE current.item_key IS NULL
                  OR current.expected_quantity <> input.counted_quantity
              )
              AND (SELECT COUNT(*) FROM cash_closure_inventory
                WHERE closure_id = ?) = (SELECT COUNT(*) FROM input_inventory)
            THEN 1 ELSE 0 END AS ok
          ),
          expenses_applied AS (
            SELECT CASE WHEN
              (SELECT COUNT(*) FROM cash_closure_expenses
                WHERE closure_id = ?) = (SELECT COUNT(*) FROM input_expenses)
              AND (SELECT COALESCE(SUM(amount_clp), 0)
                FROM cash_closure_expenses WHERE closure_id = ?) =
                (SELECT expenses_clp FROM cash_closures WHERE id = ?)
            THEN 1 ELSE 0 END AS ok
          ),
          close_guard AS (
            SELECT CASE WHEN EXISTS (
              SELECT 1 FROM cash_closures
              WHERE id = ? AND session_id = ? AND request_fingerprint = ?
            ) AND (SELECT ok FROM inventory_applied) = 1
              AND (SELECT ok FROM expenses_applied) = 1
            THEN 1 ELSE 0 END AS ok
          )
        UPDATE shift_sessions
        SET
          status = CASE WHEN status = 'open' AND active_slot = 1
            AND activity_revision = ? AND (SELECT ok FROM close_guard) = 1
            THEN 'closed' ELSE 'invalid' END,
          active_slot = CASE WHEN status = 'open' AND active_slot = 1
            AND activity_revision = ? AND (SELECT ok FROM close_guard) = 1
            THEN NULL ELSE active_slot END,
          closed_at = CASE WHEN status = 'open' AND active_slot = 1
            AND activity_revision = ? AND (SELECT ok FROM close_guard) = 1
            THEN ? ELSE closed_at END,
          closure_id = CASE WHEN status = 'open' AND active_slot = 1
            AND activity_revision = ? AND (SELECT ok FROM close_guard) = 1
            THEN ? ELSE closure_id END
        WHERE id = ?
      `)
      .bind(
        inventoryJson,
        expensesJson,
        input.id,
        input.id,
        input.id,
        input.id,
        input.id,
        session.id,
        fingerprint,
        input.expectedActivityRevision,
        input.expectedActivityRevision,
        input.expectedActivityRevision,
        createdAt,
        input.expectedActivityRevision,
        input.id,
        session.id,
      ),
  ];

  if (preparedIncident) {
    statements.splice(4, 0, ...preparedIncident.statements);
  }

  try {
    await database.batch(statements);
  } catch (error) {
    const byId = await findClosureRowById(database, input.id);
    if (byId) {
      if (byId.request_fingerprint !== fingerprint) {
        throw new PosError(409, "El id de la cuadratura ya fue utilizado.");
      }
      return {
        closure: await hydrateClosure(database, byId),
        incidentId: await findClosureIncidentId(database, byId.id),
        idempotent: true,
      };
    }
    const currentSession = await findShiftSession(database, session.id);
    if (!currentSession || currentSession.status !== "open") {
      throw new PosError(409, "La sesión del turno ya está cerrada.");
    }
    if (currentSession.activityRevision !== input.expectedActivityRevision) {
      throw new PosError(
        409,
        "La actividad del turno cambió. Actualiza la cuadratura e intenta nuevamente.",
      );
    }
    const racedInventory = await listClosingInventory(database);
    if (!inventoryMatchesPreview(input.inventory, racedInventory)) {
      throw new PosError(
        409,
        "El inventario cambió. Actualiza el conteo antes de cerrar el turno.",
      );
    }
    throw error;
  }

  const closure = await findCashClosure(database, input.id);
  if (!closure) throw new Error("Cash closure missing after insert");
  return {
    closure,
    incidentId: preparedIncident?.incidentId ?? null,
    idempotent: false,
  };
}

const cashClosureRevisionColumns = `
  revision.id, revision.closure_id, revision.revision_number,
  revision.expected_revision_number,
  revision.expected_added_sales_count,
  revision.expected_inventory_line_count,
  revision.request_fingerprint, revision.reason, revision.created_at,
  revision.included_sales_clp, revision.included_sales_count,
  revision.opening_cash_clp, revision.cash_collected_clp,
  revision.card_collected_clp, revision.transfer_collected_clp,
  revision.total_collected_clp, revision.expected_cash_clp,
  revision.expected_collected_clp, revision.expenses_clp,
  revision.adjusted_expected_cash_clp, revision.counted_cash_clp,
  revision.counted_card_clp, revision.counted_transfer_clp,
  revision.counted_collected_clp, revision.difference_cash_clp,
  revision.difference_card_clp, revision.difference_transfer_clp,
  revision.difference_collected_clp
`;

function correctionFinancialFromClosure(
  closure: CashClosure,
): CashClosureCorrectionFinancial {
  const countedCardClp = closure.countedCardClp ?? 0;
  const countedTransferClp = closure.countedTransferClp ?? 0;
  const countedCollectedClp =
    closure.countedCollectedClp ??
    closure.countedCashClp + countedCardClp + countedTransferClp;
  return {
    revisionNumber: 0,
    includedSalesClp: closure.totalSalesClp,
    includedSalesCount: closure.salesCount,
    openingCashClp: closure.openingCashClp,
    cashCollectedClp: closure.cashMovementsClp,
    cardCollectedClp: closure.expectedCardClp,
    transferCollectedClp: closure.expectedTransferClp,
    totalCollectedClp:
      closure.cashMovementsClp +
      closure.expectedCardClp +
      closure.expectedTransferClp,
    expectedCashClp: closure.expectedCashClp,
    expectedCollectedClp: closure.expectedCollectedClp,
    expensesClp: closure.expensesClp,
    adjustedExpectedCashClp: closure.adjustedExpectedCashClp,
    countedCashClp: closure.countedCashClp,
    countedCardClp,
    countedTransferClp,
    countedCollectedClp,
    differenceCashClp: closure.differenceClp,
    differenceCardClp: closure.differenceCardClp ?? 0,
    differenceTransferClp: closure.differenceTransferClp ?? 0,
    differenceCollectedClp: closure.differenceCollectedClp ?? 0,
    inventoryDifferenceCount: closure.inventoryDifferenceCount,
  };
}

function correctionFinancialFromRevision(
  row: ClosureRevisionRow,
  inventoryDifferenceCount: number,
): CashClosureCorrectionFinancial {
  return {
    revisionNumber: Number(row.revision_number),
    includedSalesClp: Number(row.included_sales_clp),
    includedSalesCount: Number(row.included_sales_count),
    openingCashClp: Number(row.opening_cash_clp),
    cashCollectedClp: Number(row.cash_collected_clp),
    cardCollectedClp: Number(row.card_collected_clp),
    transferCollectedClp: Number(row.transfer_collected_clp),
    totalCollectedClp: Number(row.total_collected_clp),
    expectedCashClp: Number(row.expected_cash_clp),
    expectedCollectedClp: Number(row.expected_collected_clp),
    expensesClp: Number(row.expenses_clp),
    adjustedExpectedCashClp: Number(row.adjusted_expected_cash_clp),
    countedCashClp: Number(row.counted_cash_clp),
    countedCardClp: Number(row.counted_card_clp),
    countedTransferClp: Number(row.counted_transfer_clp),
    countedCollectedClp: Number(row.counted_collected_clp),
    differenceCashClp: Number(row.difference_cash_clp),
    differenceCardClp: Number(row.difference_card_clp),
    differenceTransferClp: Number(row.difference_transfer_clp),
    differenceCollectedClp: Number(row.difference_collected_clp),
    inventoryDifferenceCount,
  };
}

function mapRevisionInventoryChange(
  row: ClosureRevisionInventoryRow,
): CashClosureRevisionInventoryChange {
  return {
    key: row.item_key,
    previousExpectedQuantity: Number(row.previous_expected_quantity),
    expectedQuantity: Number(row.expected_quantity),
    saleConsumptionQuantity: Number(row.sale_consumption_quantity),
    previousCountedQuantity: Number(row.previous_counted_quantity),
    countedQuantity: Number(row.counted_quantity),
    countedDeltaQuantity: Number(row.counted_delta_quantity),
    liveQuantityBefore:
      row.live_quantity_before === null ? null : Number(row.live_quantity_before),
    liveVersionTokenBefore: row.live_version_token_before,
    liveQuantityAfter:
      row.live_quantity_after === null ? null : Number(row.live_quantity_after),
    liveVersionTokenAfter: row.live_version_token_after,
  };
}

function correctionInventoryLine(
  row: {
    item_key: string;
    item_type: "product" | "ingredient";
    item_id: string;
    item_name: string;
    unit: string;
    location: Exclude<ClosingInventoryLocation, "bodega">;
    expected_quantity: number;
    counted_quantity: number;
    difference_quantity: number;
  },
  live: ClosingInventoryLine | undefined,
): CashClosureCorrectionInventoryLine {
  return {
    key: row.item_key,
    itemType: row.item_type,
    itemId: row.item_id,
    name: row.item_name,
    unit: row.unit,
    location: row.location,
    expectedQuantity: Number(row.expected_quantity),
    countedQuantity: Number(row.counted_quantity),
    differenceQuantity: Number(row.difference_quantity),
    currentQuantity: live?.expectedQuantity ?? null,
    currentVersionToken: live?.versionToken ?? null,
    adjustable: live !== undefined,
  };
}

export async function getCashClosureRevisionContext(
  database: D1Database,
  closureId: string,
): Promise<CashClosureRevisionContext> {
  const closure = await findCashClosure(database, closureId);
  if (!closure) throw new PosError(404, "El cierre de turno no existe.");
  if (closure.closureContractVersion !== 2 || closure.sessionId === null) {
    throw new PosError(409, "Este cierre histórico no admite correcciones.");
  }

  const revisionsResult = await database
    .prepare(`
      SELECT ${cashClosureRevisionColumns}
      FROM cash_closure_revisions AS revision
      INNER JOIN cash_closure_revision_seals AS seal
        ON seal.revision_id = revision.id
        AND seal.request_fingerprint = revision.request_fingerprint
      WHERE revision.closure_id = ?
      ORDER BY revision.revision_number
      LIMIT 51
    `)
    .bind(closureId)
    .all<ClosureRevisionRow>();
  if (revisionsResult.results.length > 50) {
    throw new PosError(
      409,
      "El cierre alcanzó el máximo seguro de revisiones administrativas.",
    );
  }
  const revisionRows = revisionsResult.results;
  const revisionIds = revisionRows.map(({ id }) => id);
  let inventoryRows: ClosureRevisionInventoryRow[] = [];
  let saleRows: ClosureRevisionSaleRow[] = [];
  if (revisionIds.length > 0) {
    const revisionIdsJson = JSON.stringify(revisionIds);
    const [inventoryResult, salesResult] = await Promise.all([
      database
        .prepare(`
          SELECT revision_id, item_key, item_type, item_id, item_name, unit,
            location, previous_expected_quantity, expected_quantity,
            sale_consumption_quantity, previous_counted_quantity,
            counted_quantity, counted_delta_quantity, difference_quantity,
            live_quantity_before, live_version_token_before,
            live_quantity_after, live_version_token_after
          FROM cash_closure_revision_inventory
          WHERE revision_id IN (SELECT value FROM json_each(?))
          ORDER BY revision_id, item_type, item_name, item_id, location
        `)
        .bind(revisionIdsJson)
        .all<ClosureRevisionInventoryRow>(),
      database
        .prepare(`
          SELECT revision_id, sale_id, created_at, payment_method, total_clp
          FROM cash_closure_revision_sales
          WHERE revision_id IN (SELECT value FROM json_each(?))
          ORDER BY revision_id, created_at, sale_id
        `)
        .bind(revisionIdsJson)
        .all<ClosureRevisionSaleRow>(),
    ]);
    inventoryRows = inventoryResult.results;
    saleRows = salesResult.results;
  }
  const saleIds = saleRows.map(({ sale_id }) => sale_id);
  const itemsBySale = new Map<string, PosSaleItem[]>();
  if (saleIds.length > 0) {
    const itemResult = await database
      .prepare(`
        SELECT sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        FROM sale_items
        WHERE sale_id IN (SELECT value FROM json_each(?))
        ORDER BY sale_id, id
      `)
      .bind(JSON.stringify(saleIds))
      .all<SaleItemRow>();
    for (const item of itemResult.results) {
      const values = itemsBySale.get(item.sale_id) ?? [];
      values.push(mapSaleItem(item));
      itemsBySale.set(item.sale_id, values);
    }
  }

  const liveInventory = await listClosingInventory(database);
  const liveByKey = new Map(liveInventory.map((line) => [line.key, line]));
  const latestRevision = revisionRows.at(-1) ?? null;
  const effectiveInventoryRows = latestRevision
    ? inventoryRows.filter(({ revision_id }) => revision_id === latestRevision.id)
    : closure.inventory
        .filter(({ location }) => location !== "bodega")
        .map((line) => ({
          item_key: line.key,
          item_type: line.itemType,
          item_id: line.itemId,
          item_name: line.name,
          unit: line.unit,
          location: line.location as Exclude<ClosingInventoryLocation, "bodega">,
          expected_quantity: line.expectedQuantity,
          counted_quantity: line.countedQuantity,
          difference_quantity: line.differenceQuantity,
        }));
  const effectiveInventory = effectiveInventoryRows.map((line) => {
    const live = liveByKey.get(line.item_key);
    return correctionInventoryLine(line, live);
  });
  const effectiveFinancial = latestRevision
    ? correctionFinancialFromRevision(
        latestRevision,
        effectiveInventory.filter(({ differenceQuantity }) =>
          differenceQuantity !== 0
        ).length,
      )
    : {
        ...correctionFinancialFromClosure(closure),
        inventoryDifferenceCount: effectiveInventory.filter(
          ({ differenceQuantity }) => differenceQuantity !== 0,
        ).length,
      };
  const revisions = revisionRows.map<CashClosureRevision>((revision) => {
    const revisionInventory = inventoryRows.filter(
      ({ revision_id }) => revision_id === revision.id,
    );
    const addedSales = saleRows
      .filter(({ revision_id }) => revision_id === revision.id)
      .map<CashClosureRevisionSale>((sale) => ({
        id: sale.sale_id,
        createdAt: sale.created_at,
        paymentMethod: sale.payment_method,
        totalClp: Number(sale.total_clp),
        items: itemsBySale.get(sale.sale_id) ?? [],
      }));
    return {
      id: revision.id,
      revisionNumber: Number(revision.revision_number),
      createdAt: revision.created_at,
      reason: revision.reason,
      addedSales,
      inventoryChanges: revisionInventory
        .filter(
          ({ sale_consumption_quantity, counted_delta_quantity }) =>
            Number(sale_consumption_quantity) !== 0 ||
            Number(counted_delta_quantity) !== 0,
        )
        .map(mapRevisionInventoryChange),
      effective: correctionFinancialFromRevision(
        revision,
        revisionInventory.filter(
          ({ difference_quantity }) => Number(difference_quantity) !== 0,
        ).length,
      ),
    };
  });
  return {
    closureId,
    correctable: closure.validationStatus === "pending",
    latestRevisionNumber: latestRevision?.revision_number ?? 0,
    effective: { ...effectiveFinancial, inventory: effectiveInventory },
    revisions,
  };
}

function canonicalRevisionPayload(input: CashClosureRevisionInput): string {
  return JSON.stringify({
    policy: "cash-closure-correction-v1",
    expectedRevisionNumber: input.expectedRevisionNumber,
    reason: input.reason,
    countedCashClp: input.countedCashClp,
    countedCardClp: input.countedCardClp,
    countedTransferClp: input.countedTransferClp,
    addedSales: [...input.addedSales]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((sale) => ({
        id: sale.id,
        paymentMethod: sale.paymentMethod,
        items: [...sale.items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        ),
      })),
    inventory: [...input.inventory].sort((a, b) => a.key.localeCompare(b.key)),
  });
}

function deterministicHistoricalTimestamp(
  closure: CashClosure,
  session: ShiftSession,
): string {
  const { startIso, endIso } = getSantiagoDateBounds(closure.businessDate);
  const start = Math.max(Date.parse(startIso), Date.parse(session.openedAt));
  const close = Math.min(
    Date.parse(endIso) - 1,
    Date.parse(session.closedAt ?? closure.createdAt) - 1,
    Date.parse(closure.createdAt) - 1,
  );
  if (!Number.isFinite(start) || !Number.isFinite(close) || close < start) {
    throw new PosError(
      409,
      "La sesión cerrada no tiene un intervalo histórico válido.",
    );
  }
  return new Date(close).toISOString();
}

async function hasLaterPhysicalClosure(
  database: D1Database,
  closureId: string,
): Promise<boolean> {
  const row = await database
    .prepare(`
      SELECT 1 AS found
      FROM cash_closures AS base
      INNER JOIN shift_sessions AS base_session ON base_session.id = base.session_id
      INNER JOIN cash_closures AS later ON later.id <> base.id
      INNER JOIN shift_sessions AS later_session ON later_session.id = later.session_id
      WHERE base.id = ? AND (
        later_session.closed_at > base_session.closed_at
        OR (
          later_session.closed_at = base_session.closed_at
          AND later.id > base.id
        )
      )
      LIMIT 1
    `)
    .bind(closureId)
    .first<{ found: number }>();
  return Boolean(row);
}

export async function createCashClosureRevision(
  database: D1Database,
  closureId: string,
  input: CashClosureRevisionInput,
  now = new Date(),
): Promise<{
  revision: CashClosureRevision;
  effective: CashClosureCorrectionEffective;
  idempotent: boolean;
}> {
  assertSafeNonnegativeInteger(
    input.expectedRevisionNumber,
    "La revisión esperada del cierre",
  );
  assertSafeNonnegativeInteger(input.countedCashClp, "El efectivo contado");
  assertSafeNonnegativeInteger(input.countedCardClp, "La tarjeta conciliada");
  assertSafeNonnegativeInteger(
    input.countedTransferClp,
    "La transferencia conciliada",
  );
  if (!input.reason.trim() || input.reason.length > 1000) {
    throw new PosError(400, "La razón de la corrección es obligatoria.");
  }
  if (input.addedSales.length > 5 || input.inventory.length > 90) {
    throw new PosError(400, "La corrección supera los límites permitidos.");
  }
  if (
    input.addedSales.reduce((total, sale) => total + sale.items.length, 0) > 50
  ) {
    throw new PosError(400, "La corrección supera 50 líneas de venta.");
  }
  if (
    input.addedSales.some(
      ({ paymentMethod }) =>
        !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod),
    )
  ) {
    throw new PosError(400, "Una venta omitida usa un medio de pago inválido.");
  }
  const fingerprint = await sha256Hex(canonicalRevisionPayload(input));
  const previousById = await database
    .prepare(`
      SELECT ${cashClosureRevisionColumns}
      FROM cash_closure_revisions AS revision
      INNER JOIN cash_closure_revision_seals AS seal
        ON seal.revision_id = revision.id
        AND seal.request_fingerprint = revision.request_fingerprint
      WHERE revision.id = ?
    `)
    .bind(input.id)
    .first<ClosureRevisionRow>();
  if (previousById) {
    if (
      previousById.closure_id !== closureId ||
      previousById.request_fingerprint !== fingerprint
    ) {
      throw new PosError(409, "El id de la corrección ya fue utilizado.");
    }
    const context = await getCashClosureRevisionContext(database, closureId);
    const revision = context.revisions.find(({ id }) => id === input.id);
    if (!revision) throw new Error("Cash closure revision missing after replay");
    if (revision.revisionNumber !== context.latestRevisionNumber) {
      throw new PosError(
        409,
        "La corrección ya no es la última revisión. Actualiza el cierre.",
        "revision_conflict",
      );
    }
    await recordClosureIncidentCorrection(
      database,
      closureId,
      revision.id,
      revision.revisionNumber,
      revision.reason,
      now,
    );
    return { revision, effective: context.effective, idempotent: true };
  }

  const closure = await findCashClosure(database, closureId);
  if (!closure) throw new PosError(404, "El cierre de turno no existe.");
  if (closure.closureContractVersion !== 2 || closure.sessionId === null) {
    throw new PosError(409, "Este cierre histórico no admite correcciones.");
  }
  if (closure.validationStatus !== "pending") {
    throw new PosError(409, "Un cierre validado no puede corregirse.");
  }
  const session = await findShiftSession(database, closure.sessionId);
  if (!session || session.status !== "closed") {
    throw new PosError(409, "El turno todavía no está cerrado.");
  }
  const context = await getCashClosureRevisionContext(database, closureId);
  if (context.latestRevisionNumber !== input.expectedRevisionNumber) {
    throw new PosError(
      409,
      "El cierre cambió. Actualiza las revisiones e intenta nuevamente.",
      "revision_conflict",
    );
  }
  const previous = context.effective;

  const allProductIds = [
    ...new Set(
      input.addedSales.flatMap((sale) =>
        sale.items.map(({ productId }) => productId),
      ),
    ),
  ];
  let productRows: ProductRow[] = [];
  let recipeRows: RecipeRow[] = [];
  if (allProductIds.length > 0) {
    const placeholders = allProductIds.map(() => "?").join(", ");
    const [productsResult, recipesResult] = await Promise.all([
      database
        .prepare(`
          SELECT ${productColumns}
          FROM products AS p WHERE p.id IN (${placeholders})
        `)
        .bind(...allProductIds)
        .all<ProductRow>(),
      database
        .prepare(`
          SELECT recipe.product_id, recipe.ingredient_id, recipe.quantity,
            ingredient.name AS ingredient_name,
            ingredient.stock AS ingredient_stock,
            ingredient.revision AS ingredient_revision
          FROM product_ingredients AS recipe
          INNER JOIN ingredients AS ingredient
            ON ingredient.id = recipe.ingredient_id
          WHERE recipe.product_id IN (${placeholders})
        `)
        .bind(...allProductIds)
        .all<RecipeRow>(),
    ]);
    productRows = productsResult.results;
    recipeRows = recipesResult.results;
    if (productRows.length !== allProductIds.length) {
      throw new PosError(404, "Uno o más productos omitidos no existen.");
    }
  }
  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const recipesByProduct = new Map<string, RecipeRow[]>();
  for (const recipe of recipeRows) {
    const rows = recipesByProduct.get(recipe.product_id) ?? [];
    rows.push(recipe);
    recipesByProduct.set(recipe.product_id, rows);
  }
  const historicalAt = deterministicHistoricalTimestamp(closure, session);
  const preparedSales = input.addedSales.map((sale) => {
    if (sale.items.length < 1 || sale.items.length > 10) {
      throw new PosError(
        400,
        "Cada venta omitida debe incluir entre 1 y 10 productos.",
      );
    }
    const ids = new Set<string>();
    const items = sale.items.map((item) => {
      if (ids.has(item.productId)) {
        throw new PosError(400, "Una venta omitida repite un producto.");
      }
      ids.add(item.productId);
      const product = productsById.get(item.productId);
      if (!product) throw new PosError(404, "Un producto omitido no existe.");
      if (
        !Number.isSafeInteger(item.unitPriceClp) ||
        item.unitPriceClp <= 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      ) {
        throw new PosError(400, "Una línea omitida tiene precio o cantidad inválidos.");
      }
      const lineTotalClp = item.unitPriceClp * item.quantity;
      if (!Number.isSafeInteger(lineTotalClp) || lineTotalClp <= 0) {
        throw new PosError(400, "El total de una línea omitida no es válido.");
      }
      return {
        productId: product.id,
        productName: product.name,
        unitPriceClp: item.unitPriceClp,
        quantity: item.quantity,
        lineTotalClp,
      };
    });
    const totalClp = items.reduce((sum, item) => sum + item.lineTotalClp, 0);
    if (!Number.isSafeInteger(totalClp) || totalClp <= 0) {
      throw new PosError(400, "El total de una venta omitida no es válido.");
    }
    return { ...sale, createdAt: historicalAt, totalClp, items };
  });
  const addedSalesClp = preparedSales.reduce(
    (sum, sale) => sum + sale.totalClp,
    0,
  );
  const addedByMethod = (method: PaymentMethod) =>
    preparedSales
      .filter(({ paymentMethod }) => paymentMethod === method)
      .reduce((sum, sale) => sum + sale.totalClp, 0);
  const cashCollectedClp = previous.cashCollectedClp + addedByMethod("efectivo");
  const cardCollectedClp = previous.cardCollectedClp + addedByMethod("tarjeta");
  const transferCollectedClp =
    previous.transferCollectedClp + addedByMethod("transferencia");
  const totalCollectedClp =
    cashCollectedClp + cardCollectedClp + transferCollectedClp;
  const expectedCashClp = previous.openingCashClp + cashCollectedClp;
  const expectedCollectedClp = previous.openingCashClp + totalCollectedClp;
  const adjustedExpectedCashClp = expectedCashClp - previous.expensesClp;
  if (adjustedExpectedCashClp < 0) {
    throw new PosError(409, "Los gastos del cierre superan el efectivo esperado.");
  }
  const countedCollectedClp =
    input.countedCashClp + input.countedCardClp + input.countedTransferClp;
  const revisionNumber = input.expectedRevisionNumber + 1;
  const financial = {
    includedSalesClp: previous.includedSalesClp + addedSalesClp,
    includedSalesCount: previous.includedSalesCount + preparedSales.length,
    openingCashClp: previous.openingCashClp,
    cashCollectedClp,
    cardCollectedClp,
    transferCollectedClp,
    totalCollectedClp,
    expectedCashClp,
    expectedCollectedClp,
    expensesClp: previous.expensesClp,
    adjustedExpectedCashClp,
    countedCashClp: input.countedCashClp,
    countedCardClp: input.countedCardClp,
    countedTransferClp: input.countedTransferClp,
    countedCollectedClp,
    differenceCashClp: input.countedCashClp - adjustedExpectedCashClp,
    differenceCardClp: input.countedCardClp - cardCollectedClp,
    differenceTransferClp:
      input.countedTransferClp - transferCollectedClp,
    differenceCollectedClp:
      countedCollectedClp - (expectedCollectedClp - previous.expensesClp),
  };
  for (const value of Object.values(financial)) {
    if (!Number.isSafeInteger(value)) {
      throw new PosError(400, "Los montos de la corrección exceden el límite seguro.");
    }
  }

  const consumptionByKey = new Map<string, number>();
  for (const sale of preparedSales) {
    for (const item of sale.items) {
      const product = productsById.get(item.productId)!;
      const recipes = recipesByProduct.get(item.productId) ?? [];
      if (recipes.length > 0) {
        for (const recipe of recipes) {
          const key = `ingredient:${recipe.ingredient_id}`;
          const quantity = item.quantity * Number(recipe.quantity);
          consumptionByKey.set(
            key,
            (consumptionByKey.get(key) ?? 0) + quantity,
          );
        }
      } else if (
        previous.inventory.some(
          ({ key }) => key === `product:${product.id}:simple`,
        )
      ) {
        const key = `product:${product.id}:simple`;
        consumptionByKey.set(key, (consumptionByKey.get(key) ?? 0) + item.quantity);
      } else if (
        previous.inventory.some(
          ({ key }) => key === `product:${product.id}:vitrina`,
        )
      ) {
        const key = `product:${product.id}:vitrina`;
        consumptionByKey.set(key, (consumptionByKey.get(key) ?? 0) + item.quantity);
      }
    }
  }
  const requestedInventory = new Map(input.inventory.map((line) => [line.key, line]));
  const effectiveKeys = new Set(previous.inventory.map(({ key }) => key));
  for (const key of requestedInventory.keys()) {
    if (!effectiveKeys.has(key)) {
      throw new PosError(409, `La ubicación «${key}» no pertenece al cierre.`);
    }
  }
  for (const key of consumptionByKey.keys()) {
    if (!effectiveKeys.has(key)) {
      throw new PosError(
        409,
        `La venta omitida requiere una ubicación no capturada: «${key}».`,
      );
    }
  }
  const createdAt = now.toISOString();
  const inventorySnapshot = previous.inventory.map((line) => {
    const saleConsumptionQuantity = consumptionByKey.get(line.key) ?? 0;
    const expectedQuantity = line.expectedQuantity - saleConsumptionQuantity;
    if (expectedQuantity < 0) {
      throw new PosError(
        409,
        `La venta omitida supera el stock esperado de «${line.name}».`,
      );
    }
    const requested = requestedInventory.get(line.key);
    const changesPhysicalCount =
      requested !== undefined &&
      requested.countedQuantity !== line.countedQuantity;
    if (
      changesPhysicalCount &&
      (line.currentQuantity === null || line.currentVersionToken === null)
    ) {
      throw new PosError(
        409,
        `La ubicación de inventario «${line.key}» ya no está disponible para ajustar.`,
        "inventory_location_unavailable",
      );
    }
    if (
      changesPhysicalCount &&
      (requested.expectedCountedQuantity !== line.countedQuantity ||
        requested.liveQuantity !== line.currentQuantity ||
        requested.liveVersionToken !== line.currentVersionToken)
    ) {
      throw new PosError(
        409,
        `El inventario de «${line.name}» cambió. Actualiza la corrección.`,
        "inventory_conflict",
      );
    }
    const countedQuantity = requested?.countedQuantity ?? line.countedQuantity;
    const countedDeltaQuantity = countedQuantity - line.countedQuantity;
    const liveQuantityAfter =
      countedDeltaQuantity === 0
        ? null
        : line.currentQuantity! + countedDeltaQuantity;
    if (liveQuantityAfter !== null && liveQuantityAfter < 0) {
      throw new PosError(400, `El ajuste dejaría «${line.name}» bajo cero.`);
    }
    const liveVersionTokenAfter =
      countedDeltaQuantity === 0
        ? null
        : line.itemType === "ingredient"
          ? String(Number(line.currentVersionToken!) + 1)
          : nextProductUpdatedAt(line.currentVersionToken!, createdAt);
    return {
      itemKey: line.key,
      itemType: line.itemType,
      itemId: line.itemId,
      itemName: line.name,
      unit: line.unit,
      location: line.location,
      previousExpectedQuantity: line.expectedQuantity,
      expectedQuantity,
      saleConsumptionQuantity,
      previousCountedQuantity: line.countedQuantity,
      countedQuantity,
      countedDeltaQuantity,
      differenceQuantity: countedQuantity - expectedQuantity,
      liveQuantityBefore: countedDeltaQuantity === 0 ? null : line.currentQuantity!,
      liveVersionTokenBefore:
        countedDeltaQuantity === 0 ? null : line.currentVersionToken,
      liveQuantityAfter: countedDeltaQuantity === 0 ? null : liveQuantityAfter,
      liveVersionTokenAfter,
    };
  });
  const hasCountChange =
    input.countedCashClp !== previous.countedCashClp ||
    input.countedCardClp !== previous.countedCardClp ||
    input.countedTransferClp !== previous.countedTransferClp;
  const hasPhysicalDelta = inventorySnapshot.some(
    ({ countedDeltaQuantity }) => countedDeltaQuantity !== 0,
  );
  if (hasPhysicalDelta && (await hasLaterPhysicalClosure(database, closureId))) {
    throw new PosError(
      409,
      "Existe un cierre físico posterior. Retira los cambios de inventario para continuar.",
      "inventory_locked_by_later_closure",
    );
  }
  if (
    preparedSales.length === 0 &&
    !hasCountChange &&
    !hasPhysicalDelta
  ) {
    throw new PosError(400, "La corrección no contiene cambios.");
  }

  const existingIncidentId = await findClosureIncidentId(database, closureId);
  const correctionIncidentComment = `Corrección administrativa ${revisionNumber}: ${input.reason.trim()}`
    .slice(0, 1000);
  const preparedRevisionIncident = existingIncidentId
    ? null
    : await prepareClosureIncident(database, {
        closureId,
        businessDate: closure.businessDate,
        shift: closure.shift,
        responsible: closure.responsible,
        createdAt,
        cashDifferenceClp: financial.differenceCashClp,
        cardDifferenceClp: financial.differenceCardClp,
        transferDifferenceClp: financial.differenceTransferClp,
        inventory: inventorySnapshot.flatMap((line) =>
          line.differenceQuantity === 0
            ? []
            : [{
                key: line.itemKey,
                itemType: line.itemType,
                itemId: line.itemId,
                name: line.itemName,
                unit: line.unit,
                location: line.location,
                expectedQuantity: line.expectedQuantity,
                countedQuantity: line.countedQuantity,
                adjustmentApplied: line.countedDeltaQuantity,
                reasonCategory: "otro" as const,
                comment: correctionIncidentComment,
              }],
        ),
      });

  const salesJson = JSON.stringify(preparedSales);
  const inventoryJson = JSON.stringify(inventorySnapshot);
  const statements: D1PreparedStatement[] = [
    database
      .prepare(`
        INSERT INTO cash_closure_revisions (
          id, closure_id, revision_number, expected_revision_number,
          expected_added_sales_count, expected_inventory_line_count,
          request_fingerprint, reason, created_at, included_sales_clp,
          included_sales_count, opening_cash_clp, cash_collected_clp,
          card_collected_clp, transfer_collected_clp, total_collected_clp,
          expected_cash_clp, expected_collected_clp, expenses_clp,
          adjusted_expected_cash_clp, counted_cash_clp, counted_card_clp,
          counted_transfer_clp, counted_collected_clp, difference_cash_clp,
          difference_card_clp, difference_transfer_clp,
          difference_collected_clp
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?
        )
      `)
      .bind(
        input.id,
        closureId,
        revisionNumber,
        input.expectedRevisionNumber,
        preparedSales.length,
        inventorySnapshot.length,
        fingerprint,
        input.reason,
        createdAt,
        financial.includedSalesClp,
        financial.includedSalesCount,
        financial.openingCashClp,
        financial.cashCollectedClp,
        financial.cardCollectedClp,
        financial.transferCollectedClp,
        financial.totalCollectedClp,
        financial.expectedCashClp,
        financial.expectedCollectedClp,
        financial.expensesClp,
        financial.adjustedExpectedCashClp,
        financial.countedCashClp,
        financial.countedCardClp,
        financial.countedTransferClp,
        financial.countedCollectedClp,
        financial.differenceCashClp,
        financial.differenceCardClp,
        financial.differenceTransferClp,
        financial.differenceCollectedClp,
      ),
    database
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        )
        SELECT
          json_extract(value, '$.id'),
          json_extract(value, '$.createdAt'), ?, ?, ?, 'paid',
          json_extract(value, '$.paymentMethod'),
          json_extract(value, '$.paymentMethod'), NULL, NULL,
          json_extract(value, '$.createdAt'), NULL, ?,
          CAST(json_extract(value, '$.totalClp') AS INTEGER)
        FROM json_each(?)
      `)
      .bind(
        closure.businessDate,
        closure.shift,
        closure.sessionId,
        closure.responsible,
        salesJson,
      ),
    database
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        )
        SELECT 'revision-direct:' || json_extract(value, '$.id'),
          json_extract(value, '$.id'), json_extract(value, '$.createdAt'),
          ?, ?, ?, json_extract(value, '$.paymentMethod'),
          CAST(json_extract(value, '$.totalClp') AS INTEGER), ?, 'direct'
        FROM json_each(?)
      `)
      .bind(
        closure.businessDate,
        closure.shift,
        closure.sessionId,
        closure.responsible,
        salesJson,
      ),
    database
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        )
        SELECT json_extract(sale.value, '$.id'),
          json_extract(item.value, '$.productId'),
          json_extract(item.value, '$.productName'),
          CAST(json_extract(item.value, '$.unitPriceClp') AS INTEGER),
          CAST(json_extract(item.value, '$.quantity') AS INTEGER),
          CAST(json_extract(item.value, '$.lineTotalClp') AS INTEGER)
        FROM json_each(?) AS sale,
          json_each(sale.value, '$.items') AS item
      `)
      .bind(salesJson),
    database
      .prepare(`
        INSERT INTO cash_closure_revision_sales (
          revision_id, sale_id, created_at, payment_method, total_clp
        )
        SELECT ?, json_extract(value, '$.id'),
          json_extract(value, '$.createdAt'),
          json_extract(value, '$.paymentMethod'),
          CAST(json_extract(value, '$.totalClp') AS INTEGER)
        FROM json_each(?)
      `)
      .bind(input.id, salesJson),
    database
      .prepare(`
        INSERT INTO cash_closure_revision_inventory (
          revision_id, item_key, item_type, item_id, item_name, unit,
          location, previous_expected_quantity, expected_quantity,
          sale_consumption_quantity, previous_counted_quantity,
          counted_quantity, counted_delta_quantity, difference_quantity,
          live_quantity_before, live_version_token_before,
          live_quantity_after, live_version_token_after
        )
        SELECT ?, json_extract(value, '$.itemKey'),
          json_extract(value, '$.itemType'), json_extract(value, '$.itemId'),
          json_extract(value, '$.itemName'), json_extract(value, '$.unit'),
          json_extract(value, '$.location'),
          CAST(json_extract(value, '$.previousExpectedQuantity') AS INTEGER),
          CAST(json_extract(value, '$.expectedQuantity') AS INTEGER),
          CAST(json_extract(value, '$.saleConsumptionQuantity') AS INTEGER),
          CAST(json_extract(value, '$.previousCountedQuantity') AS INTEGER),
          CAST(json_extract(value, '$.countedQuantity') AS INTEGER),
          CAST(json_extract(value, '$.countedDeltaQuantity') AS INTEGER),
          CAST(json_extract(value, '$.differenceQuantity') AS INTEGER),
          CAST(json_extract(value, '$.liveQuantityBefore') AS INTEGER),
          json_extract(value, '$.liveVersionTokenBefore'),
          CAST(json_extract(value, '$.liveQuantityAfter') AS INTEGER),
          json_extract(value, '$.liveVersionTokenAfter')
        FROM json_each(?)
      `)
      .bind(input.id, inventoryJson),
    database
      .prepare(`
        WITH changes AS (
          SELECT json_extract(value, '$.itemId') AS item_id,
            json_extract(value, '$.location') AS location,
            CAST(json_extract(value, '$.countedDeltaQuantity') AS INTEGER)
              AS delta_quantity,
            CAST(json_extract(value, '$.liveQuantityBefore') AS INTEGER)
              AS quantity_before,
            json_extract(value, '$.liveVersionTokenBefore') AS version_before,
            json_extract(value, '$.liveVersionTokenAfter') AS version_after
          FROM json_each(?)
          WHERE json_extract(value, '$.itemType') = 'product'
            AND CAST(json_extract(value, '$.countedDeltaQuantity') AS INTEGER) <> 0
        )
        UPDATE products
        SET stock = CASE WHEN stock_mode = 'simple' THEN stock + (
              SELECT delta_quantity FROM changes WHERE item_id = products.id
            ) ELSE stock END,
          stock_vitrina = CASE WHEN stock_mode = 'split' THEN stock_vitrina + (
              SELECT delta_quantity FROM changes WHERE item_id = products.id
            ) ELSE stock_vitrina END,
          updated_at = (
            SELECT version_after FROM changes WHERE item_id = products.id
          )
        WHERE EXISTS (
          SELECT 1 FROM changes
          WHERE item_id = products.id
            AND version_before = products.updated_at
            AND (
              (location = 'simple' AND stock_mode = 'simple'
                AND quantity_before = products.stock)
              OR (location = 'vitrina' AND stock_mode = 'split'
                AND quantity_before = products.stock_vitrina)
            )
        )
      `)
      .bind(inventoryJson),
    database
      .prepare(`
        WITH changes AS (
          SELECT json_extract(value, '$.itemId') AS item_id,
            CAST(json_extract(value, '$.countedDeltaQuantity') AS INTEGER)
              AS delta_quantity,
            CAST(json_extract(value, '$.liveQuantityBefore') AS INTEGER)
              AS quantity_before,
            CAST(json_extract(value, '$.liveVersionTokenBefore') AS INTEGER)
              AS version_before
          FROM json_each(?)
          WHERE json_extract(value, '$.itemType') = 'ingredient'
            AND CAST(json_extract(value, '$.countedDeltaQuantity') AS INTEGER) <> 0
        )
        UPDATE ingredients
        SET stock = stock + (
            SELECT delta_quantity FROM changes WHERE item_id = ingredients.id
          ),
          revision = revision + 1,
          updated_at = ?
        WHERE EXISTS (
          SELECT 1 FROM changes
          WHERE item_id = ingredients.id
            AND version_before = ingredients.revision
            AND quantity_before = ingredients.stock
        )
      `)
      .bind(inventoryJson, createdAt),
    database
      .prepare(`
        UPDATE shift_sessions
        SET activity_revision = activity_revision + 1
        WHERE status = 'open' AND active_slot = 1
          AND EXISTS (
            SELECT 1 FROM json_each(?)
            WHERE CAST(
              json_extract(value, '$.countedDeltaQuantity') AS INTEGER
            ) <> 0
          )
      `)
      .bind(inventoryJson),
    ...(preparedRevisionIncident?.statements ?? []),
    database
      .prepare(`
        INSERT INTO cash_closure_revision_seals (
          revision_id, sealed_at, request_fingerprint
        ) VALUES (?, ?, ?)
      `)
      .bind(input.id, createdAt, fingerprint),
  ];
  try {
    await database.batch(statements);
  } catch (error) {
    const same = await database
      .prepare(`
        SELECT ${cashClosureRevisionColumns}
        FROM cash_closure_revisions AS revision
        INNER JOIN cash_closure_revision_seals AS seal
          ON seal.revision_id = revision.id
          AND seal.request_fingerprint = revision.request_fingerprint
        WHERE revision.id = ?
      `)
      .bind(input.id)
      .first<ClosureRevisionRow>();
    if (same) {
      if (same.closure_id !== closureId || same.request_fingerprint !== fingerprint) {
        throw new PosError(409, "El id de la corrección ya fue utilizado.");
      }
      const racedContext = await getCashClosureRevisionContext(database, closureId);
      const revision = racedContext.revisions.find(({ id }) => id === input.id);
      if (!revision) throw new Error("Cash closure revision missing after replay");
      if (revision.revisionNumber !== racedContext.latestRevisionNumber) {
        throw new PosError(
          409,
          "La corrección ya no es la última revisión. Actualiza el cierre.",
          "revision_conflict",
        );
      }
      await recordClosureIncidentCorrection(
        database,
        closureId,
        revision.id,
        revision.revisionNumber,
        revision.reason,
        now,
      );
      return { revision, effective: racedContext.effective, idempotent: true };
    }
    if (hasPhysicalDelta && (await hasLaterPhysicalClosure(database, closureId))) {
      throw new PosError(
        409,
        "Existe un cierre físico posterior. Retira los cambios de inventario para continuar.",
        "inventory_locked_by_later_closure",
      );
    }
    if (hasPhysicalDelta) {
      const racedInventory = await listClosingInventory(database);
      const racedByKey = new Map(racedInventory.map((line) => [line.key, line]));
      const inventoryChanged = inventorySnapshot
        .filter(({ countedDeltaQuantity }) => countedDeltaQuantity !== 0)
        .some((line) => {
          const raced = racedByKey.get(line.itemKey);
          return (
            !raced ||
            raced.expectedQuantity !== line.liveQuantityBefore ||
            raced.versionToken !== line.liveVersionTokenBefore
          );
        });
      if (inventoryChanged) {
        throw new PosError(
          409,
          "El inventario cambió mientras se guardaba la corrección. Actualiza e intenta nuevamente.",
          "inventory_conflict",
        );
      }
    }
    const racedClosure = await findCashClosure(database, closureId);
    if (racedClosure?.validationStatus === "validated") {
      throw new PosError(409, "El cierre fue validado mientras se corregía.");
    }
    if (
      racedClosure &&
      racedClosure.latestRevisionNumber !== input.expectedRevisionNumber
    ) {
      throw new PosError(
        409,
        "El cierre cambió. Actualiza las revisiones e intenta nuevamente.",
        "revision_conflict",
      );
    }
    throw error;
  }
  const resultContext = await getCashClosureRevisionContext(database, closureId);
  const revision = resultContext.revisions.find(({ id }) => id === input.id);
  if (!revision) throw new Error("Cash closure revision missing after insert");
  await recordClosureIncidentCorrection(
    database,
    closureId,
    revision.id,
    revision.revisionNumber,
    revision.reason,
    now,
  );
  return { revision, effective: resultContext.effective, idempotent: false };
}

export async function validateCashClosure(
  database: D1Database,
  closureId: string,
  input: CashClosureValidationInput,
  now = new Date(),
): Promise<{ closure: CashClosure; idempotent: boolean }> {
  const expectedRevisionNumber = input.expectedRevisionNumber ?? null;
  if (
    input.comment !== null &&
    (!input.comment.trim() || input.comment.length > 1000)
  ) {
    throw new PosError(400, "El comentario de validación no es válido.");
  }
  const closureRow = await findClosureRowById(database, closureId);
  if (!closureRow) throw new PosError(404, "El cierre de turno no existe.");
  if (closureRow.closure_contract_version !== 2) {
    throw new PosError(
      409,
      "Este cierre histórico no requiere validación administrativa.",
    );
  }
  const revisionNumber = Number(closureRow.latest_revision_number ?? 0);
  if (
    (expectedRevisionNumber === null && revisionNumber > 0) ||
    (expectedRevisionNumber !== null &&
      expectedRevisionNumber !== revisionNumber)
  ) {
    throw new PosError(
      409,
      "El cierre cambió. Revisa la última corrección antes de validarlo.",
      "revision_conflict",
    );
  }
  const revisionFingerprint =
    revisionNumber === 0
      ? null
      : (
          await database
            .prepare(`
              SELECT revision.request_fingerprint
              FROM cash_closure_revisions AS revision
              INNER JOIN cash_closure_revision_seals AS seal
                ON seal.revision_id = revision.id
                AND seal.request_fingerprint = revision.request_fingerprint
              WHERE revision.closure_id = ? AND revision.revision_number = ?
            `)
            .bind(closureId, revisionNumber)
            .first<{ request_fingerprint: string }>()
        )?.request_fingerprint ?? null;
  if (revisionNumber > 0 && revisionFingerprint === null) {
    throw new PosError(409, "La última corrección todavía no está sellada.");
  }
  const existing = await database
    .prepare(`
      SELECT closure_id, validated_at, comment, revision_number,
        request_fingerprint
      FROM cash_closure_validations
      WHERE closure_id = ?
    `)
    .bind(closureId)
    .first<ClosureValidationRow>();
  if (existing) {
    if (
      existing.comment !== input.comment ||
      Number(existing.revision_number) !== revisionNumber ||
      existing.request_fingerprint !== revisionFingerprint
    ) {
      throw new PosError(
        409,
        "El cierre ya fue validado con un comentario diferente.",
      );
    }
    await recordClosureIncidentValidation(
      database,
      closureId,
      revisionNumber,
      input.comment,
      now,
    );
    return {
      closure: await hydrateClosure(database, closureRow),
      idempotent: true,
    };
  }

  const validatedAt = now.toISOString();
  try {
    const inserted = await database
      .prepare(`
        INSERT INTO cash_closure_validations (
          closure_id, validated_at, comment, revision_number,
          request_fingerprint
        )
        SELECT id, ?, ?, ?, ? FROM cash_closures
        WHERE id = ? AND closure_contract_version = 2
        ON CONFLICT(closure_id) DO NOTHING
      `)
      .bind(
        validatedAt,
        input.comment,
        revisionNumber,
        revisionFingerprint,
        closureId,
      )
      .run();
    if (Number(inserted.meta.changes ?? 0) === 0) {
      const raced = await database
        .prepare(`
          SELECT closure_id, validated_at, comment, revision_number,
            request_fingerprint
          FROM cash_closure_validations
          WHERE closure_id = ?
        `)
        .bind(closureId)
        .first<ClosureValidationRow>();
      if (!raced) {
        throw new PosError(409, "El cierre no está disponible para validar.");
      }
      if (
        raced.comment !== input.comment ||
        Number(raced.revision_number) !== revisionNumber ||
        raced.request_fingerprint !== revisionFingerprint
      ) {
        throw new PosError(
          409,
          "El cierre ya fue validado con un comentario diferente.",
        );
      }
      await recordClosureIncidentValidation(
        database,
        closureId,
        revisionNumber,
        input.comment,
        now,
      );
      return {
        closure: await hydrateClosure(database, closureRow),
        idempotent: true,
      };
    }
  } catch (error) {
    if (error instanceof PosError) throw error;
    const raced = await database
      .prepare(`
        SELECT closure_id, validated_at, comment, revision_number,
          request_fingerprint
        FROM cash_closure_validations
        WHERE closure_id = ?
      `)
      .bind(closureId)
      .first<ClosureValidationRow>();
    if (!raced) {
      const current = await findClosureRowById(database, closureId);
      if (
        current &&
        Number(current.latest_revision_number ?? 0) !== revisionNumber
      ) {
        throw new PosError(
          409,
          "El cierre cambió. Revisa la última corrección antes de validarlo.",
          "revision_conflict",
        );
      }
      throw error;
    }
    if (
      raced.comment !== input.comment ||
      Number(raced.revision_number) !== revisionNumber ||
      raced.request_fingerprint !== revisionFingerprint
    ) {
      throw new PosError(
        409,
        "El cierre ya fue validado con un comentario diferente.",
      );
    }
    await recordClosureIncidentValidation(
      database,
      closureId,
      revisionNumber,
      input.comment,
      now,
    );
    return {
      closure: await hydrateClosure(database, closureRow),
      idempotent: true,
    };
  }

  const closure = await findCashClosure(database, closureId);
  if (!closure) throw new Error("Cash closure missing after validation");
  await recordClosureIncidentValidation(
    database,
    closureId,
    revisionNumber,
    input.comment,
    now,
  );
  return { closure, idempotent: false };
}
