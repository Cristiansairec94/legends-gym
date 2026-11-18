import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { syncCatalog } from "./catalog";
import { PosError } from "./errors";
import * as schema from "./schema";

let initialization: Promise<D1Database> | undefined;

type TableColumn = { name: string; notnull: number };
type TableName =
  | "products"
  | "sales"
  | "sale_payments"
  | "cash_closures"
  | "cash_closure_inventory"
  | "cash_closure_validations"
  | "closure_notification_deliveries";
type TableDefinition = { sql: string | null };

const SCHEMA_LOCK_KEY = "schema.migration.pos-v3.lock";
const FORMAL_SHIFT_SCHEMA_LOCK_KEY = "schema.migration.formal-shift-v1.lock";
const FORMAL_SHIFT_SCHEMA_KEY = "schema.migration.formal-shift-v1";
const PARTIAL_PAYMENTS_SCHEMA_LOCK_KEY =
  "schema.migration.partial-payments-v1.lock";
const PARTIAL_PAYMENTS_SCHEMA_KEY = "schema.migration.partial-payments-v1";
const CASH_CLOSURE_V2_SCHEMA_LOCK_KEY =
  "schema.migration.cash-closure-v2.lock";
const CASH_CLOSURE_V2_SCHEMA_KEY = "schema.migration.cash-closure-v2";
const CASH_CLOSURE_REVISIONS_SCHEMA_LOCK_KEY =
  "schema.migration.cash-closure-revisions-v2.lock";
const CASH_CLOSURE_REVISIONS_SCHEMA_KEY =
  "schema.migration.cash-closure-revisions-v2";
const CLOSURE_INCIDENTS_SCHEMA_LOCK_KEY =
  "schema.migration.closure-incidents-v2.lock";
const CLOSURE_INCIDENTS_SCHEMA_KEY =
  "schema.migration.closure-incidents-v2";
const INVENTORY_STOCK_ENTRIES_SCHEMA_KEY =
  "schema.migration.inventory-stock-entries-v1";
const SALE_VOIDS_SCHEMA_KEY = "schema.migration.sale-voids-v1";
const CLOSURE_NOTIFICATIONS_ENABLED_FROM_KEY =
  "notifications.closure-incidents.enabled-from";
const ACCOUNTING_BACKFILL_KEY = "schema.accounting.backfill.v1";

const inventoryStockEntryArtifacts = [
  "inventory_stock_entries",
  "idx_inventory_stock_entries_item_created",
  "idx_inventory_stock_entries_created_at",
  "trg_inventory_stock_entries_apply_product",
  "trg_inventory_stock_entries_apply_ingredient",
  "trg_inventory_stock_entries_no_update",
  "trg_inventory_stock_entries_no_delete",
] as const;

const inventoryStockEntriesDdl = `
  CREATE TABLE IF NOT EXISTS inventory_stock_entries (
    id TEXT PRIMARY KEY NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    location TEXT NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_added INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    actor_role TEXT NOT NULL,
    operation_token TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    CONSTRAINT inventory_stock_entries_shape_valid CHECK (
      (
        (item_type = 'product' AND location IN ('simple', 'vitrina', 'bodega'))
        OR (item_type = 'ingredient' AND location = 'ingredient')
      )
      AND length(trim(item_id)) BETWEEN 1 AND 100
      AND length(trim(item_name)) BETWEEN 1 AND 120
      AND quantity_before BETWEEN 0 AND 9007199254740991
      AND quantity_added BETWEEN 1 AND 1000000
      AND quantity_after = quantity_before + quantity_added
      AND quantity_after BETWEEN 1 AND 9007199254740991
      AND actor_role = 'admin'
      AND length(operation_token) BETWEEN 1 AND 100
    )
  )
`;

const saleVoidArtifacts = [
  "sale_inventory_snapshots",
  "sale_inventory_consumptions",
  "idx_sale_inventory_consumptions_sale_id",
  "sale_voids",
  "uq_sale_voids_sale_id",
  "idx_sale_voids_created_at",
  "idx_sale_voids_shift_session_id",
  "trg_sale_inventory_snapshots_no_update",
  "trg_sale_inventory_snapshots_no_delete",
  "trg_sale_inventory_consumptions_no_update",
  "trg_sale_inventory_consumptions_no_delete",
  "trg_sale_voids_no_update",
  "trg_sale_voids_no_delete",
] as const;

const saleInventorySnapshotsDdl = `
  CREATE TABLE IF NOT EXISTS sale_inventory_snapshots (
    sale_id TEXT PRIMARY KEY NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    CONSTRAINT sale_inventory_snapshots_version_valid CHECK (version = 1),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT
  )
`;

const saleInventoryConsumptionsDdl = `
  CREATE TABLE IF NOT EXISTS sale_inventory_consumptions (
    sale_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    location TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    PRIMARY KEY (sale_id, item_type, item_id, location),
    CONSTRAINT sale_inventory_consumptions_shape_valid CHECK (
      (
        (item_type = 'product' AND location IN ('simple', 'vitrina'))
        OR (item_type = 'ingredient' AND location = 'ingredient')
      )
      AND length(trim(item_id)) BETWEEN 1 AND 100
      AND length(trim(item_name)) BETWEEN 1 AND 120
      AND quantity BETWEEN 1 AND 1000000
    ),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT
  )
`;

const saleVoidsDdl = `
  CREATE TABLE IF NOT EXISTS sale_voids (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    shift_session_id TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    actor_role TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    expected_activity_revision INTEGER NOT NULL,
    request_fingerprint TEXT NOT NULL,
    original_total_clp INTEGER NOT NULL,
    original_paid_clp INTEGER NOT NULL,
    original_balance_clp INTEGER NOT NULL,
    inventory_source TEXT NOT NULL,
    inventory_restoration_json TEXT NOT NULL,
    payment_snapshot_json TEXT NOT NULL,
    CONSTRAINT sale_voids_shape_valid CHECK (
      actor_role = 'admin'
      AND length(trim(actor_name)) BETWEEN 1 AND 100
      AND length(trim(reason)) BETWEEN 1 AND 500
      AND expected_activity_revision >= 0
      AND length(request_fingerprint) BETWEEN 1 AND 1000
      AND original_total_clp > 0
      AND original_paid_clp >= 0
      AND original_paid_clp <= original_total_clp
      AND original_balance_clp = original_total_clp - original_paid_clp
      AND inventory_source IN ('snapshot', 'derived_legacy')
      AND json_valid(inventory_restoration_json)
      AND json_valid(payment_snapshot_json)
    ),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT,
    FOREIGN KEY (shift_session_id) REFERENCES shift_sessions(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT
  )
`;

const transferValidationsDdl = `
  CREATE TABLE IF NOT EXISTS transfer_validations (
    id TEXT PRIMARY KEY NOT NULL,
    sale_id TEXT NOT NULL,
    shift_session_id TEXT NOT NULL,
    validated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    validator_role TEXT NOT NULL,
    validated_by TEXT NOT NULL,
    email_reference TEXT NOT NULL,
    amount_clp INTEGER NOT NULL,
    CONSTRAINT transfer_validations_shape_valid CHECK (
      validator_role IN ('admin', 'sales')
      AND length(trim(validated_by)) BETWEEN 1 AND 100
      AND length(trim(email_reference)) BETWEEN 1 AND 200
      AND amount_clp > 0
    ),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT,
    FOREIGN KEY (shift_session_id) REFERENCES shift_sessions(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT
  )
`;

async function ensureTransferValidationsSchema(
  database: D1Database,
): Promise<void> {
  await database.batch([
    database.prepare(transferValidationsDdl),
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_transfer_validations_sale_id ON transfer_validations (sale_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_transfer_validations_validated_at ON transfer_validations (validated_at)",
    ),
    database.prepare(immutableTriggerDdl("transfer_validations", "UPDATE")),
    database.prepare(immutableTriggerDdl("transfer_validations", "DELETE")),
  ]);
}

function immutableTriggerDdl(table: string, operation: "UPDATE" | "DELETE") {
  const suffix = operation.toLowerCase();
  return `
    CREATE TRIGGER IF NOT EXISTS trg_${table}_no_${suffix}
    BEFORE ${operation} ON ${table}
    BEGIN
      SELECT RAISE(ABORT, '${table.replaceAll("_", " ")} are immutable');
    END
  `;
}

const inventoryStockEntryApplyProductDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_inventory_stock_entries_apply_product
  AFTER INSERT ON inventory_stock_entries
  WHEN NEW.item_type = 'product'
  BEGIN
    UPDATE products
    SET
      stock = CASE
        WHEN NEW.location = 'simple' THEN NEW.quantity_after
        ELSE stock
      END,
      stock_vitrina = CASE
        WHEN NEW.location = 'vitrina' THEN NEW.quantity_after
        ELSE stock_vitrina
      END,
      stock_bodega = CASE
        WHEN NEW.location = 'bodega' THEN NEW.quantity_after
        ELSE stock_bodega
      END,
      updated_at = CASE
        WHEN updated_at < NEW.created_at THEN NEW.created_at
        ELSE strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          julianday(updated_at) + 1.0 / 86400000.0
        )
      END
    WHERE id = NEW.item_id
      AND NOT EXISTS (
        SELECT 1 FROM product_ingredients AS recipe
        WHERE recipe.product_id = products.id
      )
      AND (
        (
          NEW.location = 'simple'
          AND stock_mode = 'simple'
          AND stock = NEW.quantity_before
        ) OR (
          NEW.location = 'vitrina'
          AND stock_mode = 'split'
          AND stock_vitrina = NEW.quantity_before
        ) OR (
          NEW.location = 'bodega'
          AND stock_mode = 'split'
          AND stock_bodega = NEW.quantity_before
        )
      );
    SELECT CASE WHEN changes() <> 1
      THEN RAISE(ABORT, 'inventory stock entry product conflict')
    END;
  END
`;

const inventoryStockEntryApplyIngredientDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_inventory_stock_entries_apply_ingredient
  AFTER INSERT ON inventory_stock_entries
  WHEN NEW.item_type = 'ingredient'
  BEGIN
    UPDATE ingredients
    SET
      stock = NEW.quantity_after,
      revision = revision + 1,
      updated_at = CASE
        WHEN updated_at < NEW.created_at THEN NEW.created_at
        ELSE strftime(
          '%Y-%m-%dT%H:%M:%fZ',
          julianday(updated_at) + 1.0 / 86400000.0
        )
      END
    WHERE id = NEW.item_id
      AND stock = NEW.quantity_before;
    SELECT CASE WHEN changes() <> 1
      THEN RAISE(ABORT, 'inventory stock entry ingredient conflict')
    END;
  END
`;

const inventoryStockEntryNoUpdateDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_inventory_stock_entries_no_update
  BEFORE UPDATE ON inventory_stock_entries
  BEGIN
    SELECT RAISE(ABORT, 'inventory stock entries are immutable');
  END
`;

const inventoryStockEntryNoDeleteDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_inventory_stock_entries_no_delete
  BEFORE DELETE ON inventory_stock_entries
  BEGIN
    SELECT RAISE(ABORT, 'inventory stock entries are immutable');
  END
`;

export function getDatabaseBinding(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB unavailable");
  return env.DB;
}

export function getDb() {
  return drizzle(getDatabaseBinding(), { schema });
}

async function tableColumns(
  database: D1Database,
  table: TableName,
): Promise<TableColumn[]> {
  const result = await database
    .prepare(`PRAGMA table_info(${table})`)
    .all<TableColumn>();
  return result.results;
}

async function tableDefinition(
  database: D1Database,
  table: TableName,
): Promise<string> {
  const definition = await database
    .prepare(
      "SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = ?",
    )
    .bind(table)
    .first<TableDefinition>();
  return definition?.sql ?? "";
}

function normalizedDefinition(definition: string): string {
  return definition.replaceAll('"', "").replaceAll("`", "").replace(/\s+/g, " ");
}

function productsSchemaComplete(
  columns: TableColumn[],
  definition: string,
): boolean {
  const names = new Set(columns.map(({ name }) => name));
  return (
    ["catalog_managed", "stock_mode", "stock_vitrina", "stock_bodega"].every(
      (name) => names.has(name),
    ) &&
    !normalizedDefinition(definition).includes("'Tienda'")
  );
}

function salesSchemaComplete(
  columns: TableColumn[],
  definition: string,
): boolean {
  const names = new Set(columns.map(({ name }) => name));
  return (
    [
      "business_date",
      "shift",
      "payment_status",
      "checkout_method",
      "debt_note",
      "debtor_collaborator",
      "paid_at",
      "settlement_id",
    ].every((name) => names.has(name)) &&
    columns.find(({ name }) => name === "payment_method")?.notnull === 0 &&
    normalizedDefinition(definition).includes("'colaborador'")
  );
}

async function upgradeProducts(
  database: D1Database,
  columns: TableColumn[],
): Promise<void> {
  const names = new Set(columns.map(({ name }) => name));
  const catalogManaged = names.has("catalog_managed")
    ? "catalog_managed"
    : "0";
  const stockMode = names.has("stock_mode")
    ? "CASE WHEN stock_mode = 'untracked' AND stock IS NOT NULL THEN 'simple' ELSE stock_mode END"
    : "CASE WHEN stock IS NULL THEN 'untracked' ELSE 'simple' END";
  const stockVitrina = names.has("stock_vitrina") ? "stock_vitrina" : "NULL";
  const stockBodega = names.has("stock_bodega") ? "stock_bodega" : "NULL";

  await database.batch([
    database.prepare(`
      CREATE TABLE __next_products (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_clp INTEGER NOT NULL,
        stock_mode TEXT DEFAULT 'untracked' NOT NULL,
        stock INTEGER,
        stock_vitrina INTEGER,
        stock_bodega INTEGER,
        active INTEGER DEFAULT 1 NOT NULL,
        catalog_managed INTEGER DEFAULT 0 NOT NULL,
        needs_price_review INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT products_price_clp_positive CHECK (price_clp > 0),
        CONSTRAINT products_stock_mode_allowed
          CHECK (stock_mode IN ('untracked', 'simple', 'split')),
        CONSTRAINT products_stock_shape_valid CHECK (
          (
            stock_mode = 'untracked'
            AND stock IS NULL
            AND stock_vitrina IS NULL
            AND stock_bodega IS NULL
          ) OR (
            stock_mode = 'simple'
            AND stock IS NOT NULL
            AND stock >= 0
            AND stock_vitrina IS NULL
            AND stock_bodega IS NULL
          ) OR (
            stock_mode = 'split'
            AND stock IS NULL
            AND stock_vitrina IS NOT NULL
            AND stock_vitrina >= 0
            AND stock_bodega IS NOT NULL
            AND stock_bodega >= 0
          )
        )
      )
    `),
    database.prepare(`
      CREATE TABLE __next_product_ingredients (
        product_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (product_id, ingredient_id),
        CONSTRAINT product_ingredients_quantity_positive CHECK (quantity > 0),
        FOREIGN KEY (product_id) REFERENCES __next_products(id)
          ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
          ON UPDATE NO ACTION ON DELETE CASCADE
      )
    `),
    database.prepare(`
      INSERT INTO __next_products (
        id, sku, name, category, price_clp, stock_mode, stock, stock_vitrina,
        stock_bodega, active, catalog_managed, needs_price_review, created_at,
        updated_at
      )
      SELECT
        id, sku, name, category, price_clp, ${stockMode}, stock,
        ${stockVitrina}, ${stockBodega}, active, ${catalogManaged},
        needs_price_review, created_at, updated_at
      FROM products
    `),
    database.prepare(`
      INSERT INTO __next_product_ingredients (
        product_id, ingredient_id, quantity
      )
      SELECT product_id, ingredient_id, quantity
      FROM product_ingredients
    `),
    database.prepare("DROP TABLE product_ingredients"),
    database.prepare("DROP TABLE products"),
    database.prepare("ALTER TABLE __next_products RENAME TO products"),
    database.prepare(
      "ALTER TABLE __next_product_ingredients RENAME TO product_ingredients",
    ),
  ]);
}

async function upgradeSales(
  database: D1Database,
  columns: TableColumn[],
): Promise<void> {
  const names = new Set(columns.map(({ name }) => name));
  const paymentStatus = names.has("payment_status")
    ? "payment_status"
    : "'paid'";
  const normalizedPaymentMethod =
    "CASE WHEN payment_method IN ('debito', 'credito') THEN 'tarjeta' ELSE payment_method END";
  const checkoutMethod = names.has("checkout_method")
    ? "checkout_method"
    : `CASE
        WHEN ${paymentStatus} = 'pending' OR ${names.has("settlement_id") ? "settlement_id IS NOT NULL" : "0"}
          THEN 'pendiente'
        ELSE ${normalizedPaymentMethod}
      END`;
  const businessDate = names.has("business_date") ? "business_date" : "NULL";
  const shift = names.has("shift") ? "shift" : "NULL";
  const shiftSessionId = names.has("shift_session_id")
    ? "shift_session_id"
    : "NULL";
  const debtNote = names.has("debt_note") ? "debt_note" : "NULL";
  const debtorCollaborator = names.has("debtor_collaborator")
    ? "debtor_collaborator"
    : "NULL";
  const paidAt = names.has("paid_at")
    ? `CASE WHEN ${paymentStatus} IN ('pending', 'verification_pending') THEN NULL ELSE COALESCE(paid_at, created_at) END`
    : `CASE WHEN ${paymentStatus} IN ('pending', 'verification_pending') THEN NULL ELSE created_at END`;
  const settlementId = names.has("settlement_id") ? "settlement_id" : "NULL";

  await database.batch([
    database.prepare(`
      CREATE TABLE __next_sales (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        business_date TEXT,
        shift TEXT,
        shift_session_id TEXT REFERENCES shift_sessions(id)
          ON UPDATE NO ACTION ON DELETE RESTRICT,
        payment_status TEXT DEFAULT 'paid' NOT NULL,
        checkout_method TEXT NOT NULL,
        payment_method TEXT,
        debt_note TEXT,
        debtor_collaborator TEXT,
        paid_at TEXT,
        settlement_id TEXT,
        seller TEXT,
        total_clp INTEGER NOT NULL,
        CONSTRAINT sales_payment_status_allowed
          CHECK (payment_status IN ('paid', 'pending', 'verification_pending')),
        CONSTRAINT sales_shift_context_valid CHECK (
          (business_date IS NULL AND shift IS NULL)
          OR (
            business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND shift IN ('am', 'pm')
          )
        ),
        CONSTRAINT sales_checkout_method_allowed CHECK (
          checkout_method IN ('efectivo', 'tarjeta', 'transferencia', 'pendiente', 'colaborador')
        ),
        CONSTRAINT sales_payment_state_valid CHECK (
          (
            payment_status = 'verification_pending'
            AND checkout_method = 'transferencia'
            AND payment_method IS NULL
            AND debt_note IS NULL
            AND debtor_collaborator IS NULL
            AND paid_at IS NULL
            AND settlement_id IS NULL
          ) OR (
            payment_status = 'pending'
            AND payment_method IS NULL
            AND paid_at IS NULL
            AND settlement_id IS NULL
            AND (
              (
                checkout_method = 'pendiente'
                AND debt_note IS NOT NULL
                AND length(trim(debt_note)) BETWEEN 1 AND 500
                AND debtor_collaborator IS NULL
              ) OR (
                checkout_method = 'colaborador'
                AND debtor_collaborator IS NOT NULL
                AND length(trim(debtor_collaborator)) BETWEEN 1 AND 100
                AND (debt_note IS NULL OR length(trim(debt_note)) BETWEEN 1 AND 500)
              )
            )
          ) OR (
            payment_status = 'paid'
            AND payment_method IN ('efectivo', 'tarjeta', 'debito', 'credito', 'transferencia')
            AND paid_at IS NOT NULL
            AND (
              (
                checkout_method IN ('efectivo', 'tarjeta', 'transferencia')
                AND debt_note IS NULL
                AND debtor_collaborator IS NULL
                AND settlement_id IS NULL
              ) OR (
                checkout_method = 'pendiente'
                AND debt_note IS NOT NULL
                AND length(trim(debt_note)) BETWEEN 1 AND 500
                AND debtor_collaborator IS NULL
                AND settlement_id IS NOT NULL
              ) OR (
                checkout_method = 'colaborador'
                AND debtor_collaborator IS NOT NULL
                AND length(trim(debtor_collaborator)) BETWEEN 1 AND 100
                AND (debt_note IS NULL OR length(trim(debt_note)) BETWEEN 1 AND 500)
                AND settlement_id IS NOT NULL
              )
            )
          )
        ),
        CONSTRAINT sales_total_clp_positive CHECK (total_clp > 0)
      )
    `),
    database.prepare(`
      CREATE TABLE __next_sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price_clp INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        line_total_clp INTEGER NOT NULL,
        CONSTRAINT sale_items_unit_price_positive CHECK (unit_price_clp > 0),
        CONSTRAINT sale_items_quantity_allowed CHECK (quantity BETWEEN 1 AND 99),
        CONSTRAINT sale_items_line_total_valid
          CHECK (line_total_clp = unit_price_clp * quantity),
        FOREIGN KEY (sale_id) REFERENCES __next_sales(id)
          ON UPDATE NO ACTION ON DELETE CASCADE
      )
    `),
    database.prepare(`
      INSERT INTO __next_sales (
        id, created_at, business_date, shift, shift_session_id, payment_status, checkout_method,
        payment_method, debt_note, debtor_collaborator, paid_at, settlement_id,
        seller, total_clp
      )
      SELECT
        id, created_at, ${businessDate}, ${shift}, ${shiftSessionId}, ${paymentStatus},
        ${checkoutMethod}, payment_method, ${debtNote},
        ${debtorCollaborator}, ${paidAt}, ${settlementId}, seller, total_clp
      FROM sales
    `),
    database.prepare(`
      INSERT INTO __next_sale_items (
        id, sale_id, product_id, product_name, unit_price_clp, quantity,
        line_total_clp
      )
      SELECT
        id, sale_id, product_id, product_name, unit_price_clp, quantity,
        line_total_clp
      FROM sale_items
    `),
    database.prepare("DROP TABLE sale_items"),
    database.prepare("DROP TABLE sales"),
    database.prepare("ALTER TABLE __next_sales RENAME TO sales"),
    database.prepare("ALTER TABLE __next_sale_items RENAME TO sale_items"),
  ]);
}

async function ensureAccountingTables(database: D1Database): Promise<void> {
  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id TEXT PRIMARY KEY NOT NULL,
        sale_id TEXT NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        business_date TEXT,
        shift TEXT,
        payment_method TEXT NOT NULL,
        amount_clp INTEGER NOT NULL,
        received_by TEXT,
        kind TEXT NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
          ON UPDATE NO ACTION ON DELETE RESTRICT,
        CONSTRAINT sale_payments_context_valid CHECK (
          (
            business_date IS NULL AND shift IS NULL AND received_by IS NULL
          ) OR (
            business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND shift IN ('am', 'pm')
            AND received_by IS NOT NULL
            AND length(trim(received_by)) BETWEEN 1 AND 100
          )
        ),
        CONSTRAINT sale_payments_method_allowed
          CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
        CONSTRAINT sale_payments_amount_positive CHECK (amount_clp > 0),
        CONSTRAINT sale_payments_kind_allowed
          CHECK (kind IN ('direct', 'settlement'))
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS cash_closures (
        id TEXT PRIMARY KEY NOT NULL,
        business_date TEXT NOT NULL,
        shift TEXT NOT NULL,
        responsible TEXT NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        expected_cash_clp INTEGER NOT NULL,
        expected_card_clp INTEGER NOT NULL,
        expected_transfer_clp INTEGER NOT NULL,
        expected_collected_clp INTEGER NOT NULL,
        total_sales_clp INTEGER NOT NULL,
        sales_count INTEGER NOT NULL,
        pending_customer_clp INTEGER NOT NULL,
        collaborator_clp INTEGER NOT NULL,
        counted_cash_clp INTEGER NOT NULL,
        difference_clp INTEGER NOT NULL,
        unassigned_sales_clp INTEGER NOT NULL,
        unassigned_sales_count INTEGER NOT NULL,
        unassigned_payments_clp INTEGER NOT NULL,
        unassigned_payments_count INTEGER NOT NULL,
        notes TEXT,
        CONSTRAINT cash_closures_context_valid CHECK (
          business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          AND shift IN ('am', 'pm')
          AND length(trim(responsible)) BETWEEN 1 AND 100
        ),
        CONSTRAINT cash_closures_nonnegative CHECK (
          expected_cash_clp >= 0 AND expected_card_clp >= 0
          AND expected_transfer_clp >= 0 AND expected_collected_clp >= 0
          AND total_sales_clp >= 0 AND sales_count >= 0
          AND pending_customer_clp >= 0 AND collaborator_clp >= 0
          AND counted_cash_clp >= 0 AND unassigned_sales_clp >= 0
          AND unassigned_sales_count >= 0 AND unassigned_payments_clp >= 0
          AND unassigned_payments_count >= 0
        ),
        CONSTRAINT cash_closures_collected_total_valid CHECK (
          expected_collected_clp = expected_cash_clp + expected_card_clp
            + expected_transfer_clp
        ),
        CONSTRAINT cash_closures_difference_valid
          CHECK (difference_clp = counted_cash_clp - expected_cash_clp)
      )
    `),
  ]);

  const backfillComplete = await database
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind(ACCOUNTING_BACKFILL_KEY)
    .first<{ value: string }>();
  if (backfillComplete?.value === "v1") return;

  const now = new Date().toISOString();
  await database.batch([
    database.prepare(`
      INSERT OR IGNORE INTO sale_payments (
        id, sale_id, created_at, business_date, shift, payment_method,
        amount_clp, received_by, kind
      )
      SELECT
        CASE WHEN settlement_id IS NULL THEN 'direct:' || id
          ELSE 'settlement:' || settlement_id END,
        id, paid_at, NULL, NULL,
        CASE WHEN payment_method IN ('debito', 'credito') THEN 'tarjeta'
          ELSE payment_method END,
        total_clp, NULL,
        CASE WHEN settlement_id IS NULL THEN 'direct' ELSE 'settlement' END
      FROM sales
      WHERE payment_status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM app_meta WHERE key = ?)
    `).bind(ACCOUNTING_BACKFILL_KEY),
    database.prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, 'v1', ?)
      ON CONFLICT(key) DO NOTHING
    `).bind(ACCOUNTING_BACKFILL_KEY, now),
  ]);
}

type FormalSchemaState = {
  marker: number;
  artifacts: number;
  old_context_indexes_removed: number;
  shift_sessions: number;
  sales_session: number;
  payments_session: number;
  closures_session: number;
  closure_inventory: number;
  closure_debts: number;
};

async function formalShiftSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  const state = await database
    .prepare(`
      SELECT
        EXISTS(
          SELECT 1 FROM app_meta
          WHERE key = '${FORMAL_SHIFT_SCHEMA_KEY}' AND value = 'v1'
        ) AS marker,
        (
          SELECT COUNT(*) FROM sqlite_schema
          WHERE name IN (
            'idx_sales_shift_session_id',
            'idx_sale_payments_shift_session_id',
            'uq_shift_sessions_active_slot',
            'idx_shift_sessions_opened_at',
            'uq_cash_closures_session_id',
            'idx_cash_closure_inventory_item',
            'idx_cash_closure_debts_type',
            'trg_shift_sessions_immutable_assignment',
            'trg_shift_sessions_no_reopen'
          )
        ) AS artifacts,
        NOT EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index'
            AND name IN (
              'uq_shift_sessions_business_date_shift',
              'uq_cash_closures_business_date_shift'
            )
        ) AS old_context_indexes_removed,
        MAX(CASE WHEN name = 'shift_sessions' THEN 1 ELSE 0 END)
          AS shift_sessions,
        MAX(CASE WHEN name = 'sales' AND instr(sql, 'shift_session_id') > 0
          THEN 1 ELSE 0 END) AS sales_session,
        MAX(CASE WHEN name = 'sale_payments'
          AND instr(sql, 'shift_session_id') > 0
          THEN 1 ELSE 0 END) AS payments_session,
        MAX(CASE WHEN name = 'cash_closures'
          AND instr(sql, 'request_fingerprint') > 0
          AND instr(sql, 'session_activity_revision') > 0
          THEN 1 ELSE 0 END) AS closures_session,
        MAX(CASE WHEN name = 'cash_closure_inventory' THEN 1 ELSE 0 END)
          AS closure_inventory,
        MAX(CASE WHEN name = 'cash_closure_debts' THEN 1 ELSE 0 END)
          AS closure_debts
      FROM sqlite_schema
      WHERE type = 'table'
    `)
    .first<FormalSchemaState>();
  return Boolean(
    state?.marker &&
      state.artifacts === 9 &&
      state.old_context_indexes_removed &&
      state.shift_sessions &&
      state.sales_session &&
      state.payments_session &&
      state.closures_session &&
      state.closure_inventory &&
      state.closure_debts,
  );
}

const shiftSessionsDdl = `
  CREATE TABLE IF NOT EXISTS shift_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    business_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    responsible TEXT NOT NULL,
    opening_cash_clp INTEGER NOT NULL,
    activity_revision INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL,
    active_slot INTEGER,
    opened_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    closed_at TEXT,
    closure_id TEXT,
    CONSTRAINT shift_sessions_context_valid CHECK (
      business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND shift IN ('am', 'pm')
      AND length(trim(responsible)) BETWEEN 1 AND 100
    ),
    CONSTRAINT shift_sessions_counters_valid CHECK (
      opening_cash_clp >= 0 AND activity_revision >= 0
    ),
    CONSTRAINT shift_sessions_state_valid CHECK (
      (
        status = 'open' AND active_slot = 1 AND closed_at IS NULL
        AND closure_id IS NULL
      ) OR (
        status = 'closed' AND active_slot IS NULL AND closed_at IS NOT NULL
        AND closure_id IS NOT NULL
      )
    )
  )
`;

const formalCashClosuresDdl = `
  CREATE TABLE __formal_cash_closures (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT,
    session_activity_revision INTEGER,
    request_fingerprint TEXT,
    business_date TEXT NOT NULL,
    shift TEXT NOT NULL,
    responsible TEXT NOT NULL,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    expected_cash_clp INTEGER NOT NULL,
    opening_cash_clp INTEGER,
    cash_movements_clp INTEGER,
    expected_card_clp INTEGER NOT NULL,
    expected_transfer_clp INTEGER NOT NULL,
    expected_collected_clp INTEGER NOT NULL,
    total_sales_clp INTEGER NOT NULL,
    sales_count INTEGER NOT NULL,
    pending_customer_clp INTEGER NOT NULL,
    pending_customer_count INTEGER,
    collaborator_clp INTEGER NOT NULL,
    collaborator_count INTEGER,
    counted_cash_clp INTEGER NOT NULL,
    difference_clp INTEGER NOT NULL,
    counted_card_clp INTEGER,
    difference_card_clp INTEGER,
    counted_transfer_clp INTEGER,
    difference_transfer_clp INTEGER,
    counted_collected_clp INTEGER,
    difference_collected_clp INTEGER,
    financial_difference_reason TEXT,
    cash_reconciled INTEGER,
    card_reconciled INTEGER,
    transfer_reconciled INTEGER,
    pending_customer_reviewed INTEGER,
    collaborator_reviewed INTEGER,
    inventory_count_confirmed INTEGER,
    checklist_version INTEGER,
    unassigned_sales_clp INTEGER NOT NULL,
    unassigned_sales_count INTEGER NOT NULL,
    unassigned_payments_clp INTEGER NOT NULL,
    unassigned_payments_count INTEGER NOT NULL,
    notes TEXT,
    FOREIGN KEY (session_id) REFERENCES shift_sessions(id)
      ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT cash_closures_context_valid CHECK (
      business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND shift IN ('am', 'pm')
      AND length(trim(responsible)) BETWEEN 1 AND 100
    ),
    CONSTRAINT cash_closures_nonnegative CHECK (
      expected_cash_clp >= 0 AND expected_card_clp >= 0
      AND expected_transfer_clp >= 0 AND expected_collected_clp >= 0
      AND total_sales_clp >= 0 AND sales_count >= 0
      AND pending_customer_clp >= 0 AND collaborator_clp >= 0
      AND counted_cash_clp >= 0 AND unassigned_sales_clp >= 0
      AND unassigned_sales_count >= 0 AND unassigned_payments_clp >= 0
      AND unassigned_payments_count >= 0
    ),
    CONSTRAINT cash_closures_collected_total_valid CHECK (
      expected_collected_clp = expected_cash_clp + expected_card_clp
        + expected_transfer_clp
    ),
    CONSTRAINT cash_closures_difference_valid CHECK (
      difference_clp = counted_cash_clp - expected_cash_clp
    ),
    CONSTRAINT cash_closures_formal_state_valid CHECK (
      (
        session_id IS NULL AND session_activity_revision IS NULL
        AND request_fingerprint IS NULL AND opening_cash_clp IS NULL
        AND cash_movements_clp IS NULL AND pending_customer_count IS NULL
        AND collaborator_count IS NULL AND counted_card_clp IS NULL
        AND difference_card_clp IS NULL AND counted_transfer_clp IS NULL
        AND difference_transfer_clp IS NULL AND counted_collected_clp IS NULL
        AND difference_collected_clp IS NULL
        AND financial_difference_reason IS NULL AND cash_reconciled IS NULL
        AND card_reconciled IS NULL AND transfer_reconciled IS NULL
        AND pending_customer_reviewed IS NULL AND collaborator_reviewed IS NULL
        AND inventory_count_confirmed IS NULL AND checklist_version IS NULL
      ) OR (
        session_id IS NOT NULL AND session_activity_revision >= 0
        AND length(request_fingerprint) = 64 AND opening_cash_clp >= 0
        AND cash_movements_clp >= 0
        AND expected_cash_clp = opening_cash_clp + cash_movements_clp
        AND pending_customer_count >= 0 AND collaborator_count >= 0
        AND counted_card_clp >= 0
        AND difference_card_clp = counted_card_clp - expected_card_clp
        AND counted_transfer_clp >= 0
        AND difference_transfer_clp = counted_transfer_clp - expected_transfer_clp
        AND counted_collected_clp = counted_cash_clp + counted_card_clp
          + counted_transfer_clp
        AND difference_collected_clp = counted_collected_clp
          - expected_collected_clp
        AND difference_collected_clp = difference_clp + difference_card_clp
          + difference_transfer_clp
        AND cash_reconciled = 1 AND card_reconciled = 1
        AND transfer_reconciled = 1 AND pending_customer_reviewed = 1
        AND collaborator_reviewed = 1 AND inventory_count_confirmed = 1
        AND checklist_version = 1
        AND (
          (
            difference_clp = 0 AND difference_card_clp = 0
            AND difference_transfer_clp = 0
            AND financial_difference_reason IS NULL
          ) OR (
            (difference_clp <> 0 OR difference_card_clp <> 0
              OR difference_transfer_clp <> 0)
            AND financial_difference_reason IS NOT NULL
            AND length(trim(financial_difference_reason)) BETWEEN 1 AND 500
          )
        )
      )
    )
  )
`;

async function ensureFormalShiftSchema(
  database: D1Database,
  knownIncomplete = false,
): Promise<void> {
  if (!knownIncomplete && (await formalShiftSchemaComplete(database))) return;
  const lockOwner = crypto.randomUUID();
  const now = new Date();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(
      FORMAL_SHIFT_SCHEMA_LOCK_KEY,
      lockOwner,
      now.toISOString(),
      new Date(now.getTime() - 5 * 60_000).toISOString(),
    )
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    if (await formalShiftSchemaComplete(database)) return;
    throw new Error("Formal shift schema migration in progress");
  }

  try {
    const schemaColumns = await database
      .prepare(`
        SELECT 'sales' AS table_name, name FROM pragma_table_info('sales')
        UNION ALL
        SELECT 'sale_payments', name FROM pragma_table_info('sale_payments')
        UNION ALL
        SELECT 'cash_closures', name FROM pragma_table_info('cash_closures')
      `)
      .all<{ table_name: string; name: string }>();
    const columnsFor = (tableName: string): TableColumn[] =>
      schemaColumns.results
        .filter(({ table_name }) => table_name === tableName)
        .map(({ name }) => ({ name, notnull: 0 }));
    const salesColumns = columnsFor("sales");
    const paymentColumns = columnsFor("sale_payments");
    const closureColumns = columnsFor("cash_closures");
    const salesNames = new Set(salesColumns.map(({ name }) => name));
    const paymentNames = new Set(paymentColumns.map(({ name }) => name));
    const closureNames = new Set(closureColumns.map(({ name }) => name));
    const migration: D1PreparedStatement[] = [
      database.prepare(shiftSessionsDdl),
    ];
    if (!salesNames.has("shift_session_id")) {
      migration.push(
        database.prepare(`
          ALTER TABLE sales ADD COLUMN shift_session_id TEXT
            REFERENCES shift_sessions(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT
        `),
      );
    }
    if (!paymentNames.has("shift_session_id")) {
      migration.push(
        database.prepare(`
          ALTER TABLE sale_payments ADD COLUMN shift_session_id TEXT
            REFERENCES shift_sessions(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT
        `),
      );
    }
    if (
      !closureNames.has("request_fingerprint") ||
      !closureNames.has("session_activity_revision")
    ) {
      migration.push(
        database.prepare(formalCashClosuresDdl),
        database.prepare(`
          INSERT INTO __formal_cash_closures (
            id, session_id, session_activity_revision, request_fingerprint,
            business_date, shift, responsible, created_at, expected_cash_clp,
            opening_cash_clp, cash_movements_clp, expected_card_clp,
            expected_transfer_clp, expected_collected_clp, total_sales_clp,
            sales_count, pending_customer_clp, pending_customer_count,
            collaborator_clp, collaborator_count, counted_cash_clp,
            difference_clp, counted_card_clp, difference_card_clp,
            counted_transfer_clp, difference_transfer_clp,
            counted_collected_clp, difference_collected_clp,
            financial_difference_reason, cash_reconciled, card_reconciled,
            transfer_reconciled, pending_customer_reviewed,
            collaborator_reviewed, inventory_count_confirmed,
            checklist_version, unassigned_sales_clp, unassigned_sales_count,
            unassigned_payments_clp, unassigned_payments_count, notes
          )
          SELECT id, NULL, NULL, NULL, business_date, shift, responsible,
            created_at, expected_cash_clp, NULL, NULL, expected_card_clp,
            expected_transfer_clp, expected_collected_clp, total_sales_clp,
            sales_count, pending_customer_clp, NULL, collaborator_clp, NULL,
            counted_cash_clp, difference_clp, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
            unassigned_sales_clp, unassigned_sales_count,
            unassigned_payments_clp, unassigned_payments_count, notes
          FROM cash_closures
        `),
        database.prepare("DROP TABLE cash_closures"),
        database.prepare(
          "ALTER TABLE __formal_cash_closures RENAME TO cash_closures",
        ),
      );
    }
    migration.push(
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_inventory (
          closure_id TEXT NOT NULL,
          item_key TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          unit TEXT NOT NULL,
          location TEXT NOT NULL,
          expected_version_token TEXT NOT NULL,
          expected_quantity INTEGER NOT NULL,
          counted_quantity INTEGER NOT NULL,
          difference_quantity INTEGER NOT NULL,
          reason TEXT,
          PRIMARY KEY (closure_id, item_key),
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_inventory_shape_valid CHECK (
            item_type IN ('product', 'ingredient')
            AND location IN ('simple', 'vitrina', 'bodega', 'ingredient')
            AND length(expected_version_token) BETWEEN 1 AND 100
            AND expected_quantity >= 0 AND counted_quantity >= 0
            AND difference_quantity = counted_quantity - expected_quantity
            AND (
              (difference_quantity = 0 AND reason IS NULL) OR (
                difference_quantity <> 0 AND reason IS NOT NULL
                AND length(trim(reason)) BETWEEN 1 AND 500
              )
            )
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_debts (
          closure_id TEXT NOT NULL,
          sale_id TEXT NOT NULL,
          debt_type TEXT NOT NULL,
          created_at TEXT NOT NULL,
          debt_note TEXT,
          debtor_collaborator TEXT,
          amount_clp INTEGER NOT NULL,
          PRIMARY KEY (closure_id, sale_id),
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_debts_shape_valid CHECK (
            debt_type IN ('pendiente', 'colaborador') AND amount_clp > 0
            AND (
              (debt_type = 'pendiente' AND debt_note IS NOT NULL
                AND length(trim(debt_note)) BETWEEN 1 AND 500
                AND debtor_collaborator IS NULL) OR
              (debt_type = 'colaborador' AND debtor_collaborator IS NOT NULL
                AND length(trim(debtor_collaborator)) BETWEEN 1 AND 100
                AND (debt_note IS NULL
                  OR length(trim(debt_note)) BETWEEN 1 AND 500))
            )
          )
        )
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_shift_sessions_immutable_assignment
        BEFORE UPDATE OF business_date, shift, responsible, opening_cash_clp,
          opened_at ON shift_sessions
        WHEN OLD.business_date <> NEW.business_date OR OLD.shift <> NEW.shift
          OR OLD.responsible <> NEW.responsible
          OR OLD.opening_cash_clp <> NEW.opening_cash_clp
          OR OLD.opened_at <> NEW.opened_at
        BEGIN
          SELECT RAISE(ABORT, 'shift session assignment is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_shift_sessions_no_reopen
        BEFORE UPDATE OF status ON shift_sessions
        WHEN OLD.status = 'closed' AND NEW.status <> 'closed'
        BEGIN
          SELECT RAISE(ABORT, 'closed shift session cannot be reopened');
        END
      `),
      database.prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES ('${FORMAL_SHIFT_SCHEMA_KEY}', 'v1',
          strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value,
          updated_at = excluded.updated_at
      `),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_sales_shift_session_id ON sales (shift_session_id)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_sale_payments_shift_session_id ON sale_payments (shift_session_id)",
      ),
      database.prepare(
        "DROP INDEX IF EXISTS uq_shift_sessions_business_date_shift",
      ),
      database.prepare("DROP INDEX IF EXISTS uq_cash_closures_business_date_shift"),
      database.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_sessions_active_slot ON shift_sessions (active_slot)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_shift_sessions_opened_at ON shift_sessions (opened_at)",
      ),
      database.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_closures_session_id ON cash_closures (session_id)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_cash_closure_inventory_item ON cash_closure_inventory (item_type, item_id)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_cash_closure_debts_type ON cash_closure_debts (closure_id, debt_type)",
      ),
    );
    await database.batch(migration);
  } finally {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(FORMAL_SHIFT_SCHEMA_LOCK_KEY, lockOwner)
      .run();
  }
}

const salePaymentsGuardDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_sale_payments_no_overpayment
  BEFORE INSERT ON sale_payments
  WHEN
    NOT EXISTS (SELECT 1 FROM sales WHERE id = NEW.sale_id)
    OR NEW.amount_clp > (
      SELECT sale.total_clp - COALESCE((
        SELECT SUM(payment.amount_clp)
        FROM sale_payments AS payment
        WHERE payment.sale_id = NEW.sale_id
      ), 0)
      FROM sales AS sale
      WHERE sale.id = NEW.sale_id
    )
    OR (
      NEW.kind = 'direct'
      AND NEW.amount_clp <> (
        SELECT total_clp FROM sales WHERE id = NEW.sale_id
      )
    )
  BEGIN
    SELECT RAISE(ABORT, 'payment exceeds sale balance');
  END
`;

async function partialPaymentsSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  const state = await database
    .prepare(`
      SELECT CASE WHEN
        EXISTS (
          SELECT 1 FROM app_meta
          WHERE key = ? AND value = 'v1'
        )
        AND EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index' AND name = 'idx_sale_payments_sale_id'
        )
        AND EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index' AND name = 'idx_sale_payments_created_at'
        )
        AND EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index'
            AND name = 'uq_sale_payments_direct_sale_id'
            AND instr(lower(sql), 'unique index') > 0
            AND instr(lower(sql), 'where') > 0
            AND instr(lower(sql), 'kind') > 0
        )
        AND NOT EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index' AND name = 'uq_sale_payments_sale_id'
        )
        AND EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'trigger'
            AND name = 'trg_sale_payments_no_overpayment'
        )
      THEN 1 ELSE 0 END AS ready
    `)
    .bind(PARTIAL_PAYMENTS_SCHEMA_KEY)
    .first<{ ready: number }>();
  return Boolean(state?.ready);
}

async function ensurePartialPaymentsSchema(
  database: D1Database,
): Promise<void> {
  if (await partialPaymentsSchemaComplete(database)) return;

  const lockOwner = crypto.randomUUID();
  const now = new Date();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(
      PARTIAL_PAYMENTS_SCHEMA_LOCK_KEY,
      lockOwner,
      now.toISOString(),
      new Date(now.getTime() - 5 * 60_000).toISOString(),
    )
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    if (await partialPaymentsSchemaComplete(database)) return;
    throw new Error("Partial payments schema migration in progress");
  }

  try {
    await database.batch([
      database.prepare("DROP INDEX IF EXISTS uq_sale_payments_sale_id"),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments (sale_id)",
      ),
      database.prepare(
        "CREATE INDEX IF NOT EXISTS idx_sale_payments_created_at ON sale_payments (created_at)",
      ),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payments_direct_sale_id
        ON sale_payments (sale_id) WHERE kind = 'direct'
      `),
      database.prepare(salePaymentsGuardDdl),
      database.prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'v1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value,
          updated_at = excluded.updated_at
      `).bind(PARTIAL_PAYMENTS_SCHEMA_KEY),
    ]);
  } finally {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(PARTIAL_PAYMENTS_SCHEMA_LOCK_KEY, lockOwner)
      .run();
  }
}

const cashClosureV2SnapshotGuardDdl = `
  CREATE TRIGGER IF NOT EXISTS trg_cash_closures_v2_snapshot_guard
  BEFORE INSERT ON cash_closures
  WHEN NEW.closure_contract_version = 2 AND (
    NEW.expenses_clp < 0
    OR NEW.expenses_clp > CASE
      WHEN NEW.counted_cash_clp < NEW.expected_cash_clp
        THEN NEW.expected_cash_clp - NEW.counted_cash_clp
      ELSE 0
    END
    OR NEW.adjusted_expected_cash_clp IS NOT
      (NEW.expected_cash_clp - NEW.expenses_clp)
    OR NEW.adjusted_difference_clp IS NOT
      (NEW.counted_cash_clp - NEW.adjusted_expected_cash_clp)
    OR NEW.adjusted_difference_collected_clp IS NOT
      (NEW.counted_collected_clp -
        (NEW.expected_collected_clp - NEW.expenses_clp))
    OR NEW.adjusted_difference_collected_clp IS NOT
      (NEW.adjusted_difference_clp + NEW.difference_card_clp
        + NEW.difference_transfer_clp)
    OR (
      NEW.handoff_comments IS NOT NULL
      AND length(trim(NEW.handoff_comments)) NOT BETWEEN 1 AND 1000
    )
    OR (
      NEW.adjusted_difference_clp = 0
      AND NEW.difference_card_clp = 0
      AND NEW.difference_transfer_clp = 0
      AND NEW.handoff_financial_difference_reason IS NOT NULL
    )
    OR (
      (
        NEW.adjusted_difference_clp <> 0
        OR NEW.difference_card_clp <> 0
        OR NEW.difference_transfer_clp <> 0
      )
      AND (
        NEW.handoff_financial_difference_reason IS NULL
        OR length(trim(NEW.handoff_financial_difference_reason))
          NOT BETWEEN 1 AND 500
      )
    )
  )
  BEGIN
    SELECT RAISE(ABORT, 'invalid cash closure v2 snapshot');
  END
`;

const cashClosureV2Artifacts = [
  "cash_closure_expenses",
  "cash_closure_validations",
  "trg_cash_closures_v2_snapshot_guard",
  "trg_cash_closures_no_update",
  "trg_cash_closures_no_delete",
  "trg_cash_closure_inventory_no_update",
  "trg_cash_closure_inventory_no_delete",
  "trg_cash_closure_inventory_insert_open_only",
  "trg_cash_closure_debts_no_update",
  "trg_cash_closure_debts_no_delete",
  "trg_cash_closure_debts_insert_open_only",
  "trg_cash_closure_expenses_no_update",
  "trg_cash_closure_expenses_no_delete",
  "trg_cash_closure_expenses_insert_open_only",
  "trg_cash_closure_validations_no_update",
  "trg_cash_closure_validations_no_delete",
  "trg_cash_closure_validations_insert_closed_only",
] as const;

async function cashClosureV2SchemaComplete(
  database: D1Database,
): Promise<boolean> {
  const placeholders = cashClosureV2Artifacts.map(() => "?").join(", ");
  const state = await database
    .prepare(`
      SELECT CASE WHEN
        EXISTS (
          SELECT 1 FROM app_meta WHERE key = ? AND value = 'v2'
        )
        AND EXISTS (
          SELECT 1 FROM sqlite_schema
          WHERE type = 'table' AND name = 'cash_closures'
            AND instr(sql, 'closure_contract_version') > 0
            AND instr(sql, 'expenses_clp') > 0
            AND instr(sql, 'adjusted_expected_cash_clp') > 0
            AND instr(sql, 'adjusted_difference_clp') > 0
            AND instr(sql, 'adjusted_difference_collected_clp') > 0
            AND instr(sql, 'handoff_financial_difference_reason') > 0
            AND instr(sql, 'handoff_comments') > 0
        )
        AND (
          SELECT COUNT(*) FROM sqlite_schema
          WHERE name IN (${placeholders})
        ) = ?
      THEN 1 ELSE 0 END AS ready
    `)
    .bind(
      CASH_CLOSURE_V2_SCHEMA_KEY,
      ...cashClosureV2Artifacts,
      cashClosureV2Artifacts.length,
    )
    .first<{ ready: number }>();
  return Boolean(state?.ready);
}

async function ensureCashClosureV2Schema(
  database: D1Database,
): Promise<void> {
  if (await cashClosureV2SchemaComplete(database)) return;

  const lockOwner = crypto.randomUUID();
  const now = new Date();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(
      CASH_CLOSURE_V2_SCHEMA_LOCK_KEY,
      lockOwner,
      now.toISOString(),
      new Date(now.getTime() - 5 * 60_000).toISOString(),
    )
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    if (await cashClosureV2SchemaComplete(database)) return;
    throw new Error("Cash closure v2 schema migration in progress");
  }

  try {
    const columns = await tableColumns(database, "cash_closures");
    const names = new Set(columns.map(({ name }) => name));
    const migration: D1PreparedStatement[] = [];
    const addColumn = (name: string, definition: string) => {
      if (!names.has(name)) {
        migration.push(
          database.prepare(
            `ALTER TABLE cash_closures ADD COLUMN ${name} ${definition}`,
          ),
        );
      }
    };
    addColumn("closure_contract_version", "INTEGER");
    addColumn("expenses_clp", "INTEGER DEFAULT 0 NOT NULL");
    addColumn("adjusted_expected_cash_clp", "INTEGER");
    addColumn("adjusted_difference_clp", "INTEGER");
    addColumn("adjusted_difference_collected_clp", "INTEGER");
    addColumn("handoff_financial_difference_reason", "TEXT");
    addColumn("handoff_comments", "TEXT");
    migration.push(
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_expenses (
          closure_id TEXT NOT NULL,
          id TEXT NOT NULL,
          description TEXT NOT NULL,
          amount_clp INTEGER NOT NULL,
          PRIMARY KEY (closure_id, id),
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_expenses_shape_valid CHECK (
            length(trim(id)) BETWEEN 1 AND 100
            AND length(trim(description)) BETWEEN 1 AND 200
            AND amount_clp > 0
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_validations (
          closure_id TEXT PRIMARY KEY NOT NULL,
          validated_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          comment TEXT,
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_validations_comment_valid CHECK (
            comment IS NULL OR length(trim(comment)) BETWEEN 1 AND 1000
          )
        )
      `),
      database.prepare(cashClosureV2SnapshotGuardDdl),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closures_no_update
        BEFORE UPDATE ON cash_closures BEGIN
          SELECT RAISE(ABORT, 'cash closure is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closures_no_delete
        BEFORE DELETE ON cash_closures BEGIN
          SELECT RAISE(ABORT, 'cash closure is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_inventory_no_update
        BEFORE UPDATE ON cash_closure_inventory BEGIN
          SELECT RAISE(ABORT, 'cash closure inventory is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_inventory_no_delete
        BEFORE DELETE ON cash_closure_inventory BEGIN
          SELECT RAISE(ABORT, 'cash closure inventory is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_inventory_insert_open_only
        BEFORE INSERT ON cash_closure_inventory
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closures AS closure
          INNER JOIN shift_sessions AS session ON session.id = closure.session_id
          WHERE closure.id = NEW.closure_id AND session.status = 'open'
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure inventory snapshot is sealed');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_debts_no_update
        BEFORE UPDATE ON cash_closure_debts BEGIN
          SELECT RAISE(ABORT, 'cash closure debts are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_debts_no_delete
        BEFORE DELETE ON cash_closure_debts BEGIN
          SELECT RAISE(ABORT, 'cash closure debts are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_debts_insert_open_only
        BEFORE INSERT ON cash_closure_debts
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closures AS closure
          INNER JOIN shift_sessions AS session ON session.id = closure.session_id
          WHERE closure.id = NEW.closure_id AND session.status = 'open'
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure debt snapshot is sealed');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_expenses_no_update
        BEFORE UPDATE ON cash_closure_expenses BEGIN
          SELECT RAISE(ABORT, 'cash closure expenses are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_expenses_no_delete
        BEFORE DELETE ON cash_closure_expenses BEGIN
          SELECT RAISE(ABORT, 'cash closure expenses are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_expenses_insert_open_only
        BEFORE INSERT ON cash_closure_expenses
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closures AS closure
          INNER JOIN shift_sessions AS session ON session.id = closure.session_id
          WHERE closure.id = NEW.closure_id AND session.status = 'open'
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure expense snapshot is sealed');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_validations_no_update
        BEFORE UPDATE ON cash_closure_validations BEGIN
          SELECT RAISE(ABORT, 'cash closure validation is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_validations_no_delete
        BEFORE DELETE ON cash_closure_validations BEGIN
          SELECT RAISE(ABORT, 'cash closure validation is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_validations_insert_closed_only
        BEFORE INSERT ON cash_closure_validations
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closures AS closure
          INNER JOIN shift_sessions AS session ON session.id = closure.session_id
          WHERE closure.id = NEW.closure_id
            AND closure.closure_contract_version = 2
            AND session.status = 'closed'
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure is not ready for validation');
        END
      `),
      database.prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'v2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value,
          updated_at = excluded.updated_at
      `).bind(CASH_CLOSURE_V2_SCHEMA_KEY),
      database.prepare("PRAGMA optimize"),
    );
    await database.batch(migration);
  } finally {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(CASH_CLOSURE_V2_SCHEMA_LOCK_KEY, lockOwner)
      .run();
  }
}

const cashClosureRevisionArtifacts = [
  "cash_closure_revisions",
  "cash_closure_revision_sales",
  "cash_closure_revision_inventory",
  "cash_closure_revision_seals",
  "uq_cash_closure_revisions_number",
  "idx_cash_closure_revisions_closure",
  "uq_cash_closure_revision_sales_sale",
  "idx_cash_closure_revision_inventory_item",
  "trg_cash_closure_revisions_insert_guard",
  "trg_cash_closure_revisions_no_update",
  "trg_cash_closure_revisions_no_delete",
  "trg_cash_closure_revision_sales_no_update",
  "trg_cash_closure_revision_sales_no_delete",
  "trg_cash_closure_revision_inventory_no_update",
  "trg_cash_closure_revision_inventory_no_delete",
  "trg_cash_closure_revision_ledger_sales_no_update",
  "trg_cash_closure_revision_ledger_sales_no_delete",
  "trg_cash_closure_revision_ledger_items_no_insert",
  "trg_cash_closure_revision_ledger_items_no_update",
  "trg_cash_closure_revision_ledger_items_no_delete",
  "trg_cash_closure_revision_ledger_payments_no_insert",
  "trg_cash_closure_revision_ledger_payments_no_update",
  "trg_cash_closure_revision_ledger_payments_no_delete",
  "trg_cash_closure_revision_sales_insert_guard",
  "trg_cash_closure_revision_inventory_insert_guard",
  "trg_cash_closure_revision_seals_insert_semantic_v2",
  "trg_cash_closure_revision_seals_no_update",
  "trg_cash_closure_revision_seals_no_delete",
  "trg_cash_closure_validations_insert_latest_revision_v2",
] as const;

async function cashClosureRevisionsSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  const placeholders = cashClosureRevisionArtifacts.map(() => "?").join(", ");
  try {
    const state = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM app_meta WHERE key = ? AND value = 'v2'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_validations'
              AND instr(sql, 'revision_number') > 0
              AND instr(sql, 'request_fingerprint') > 0
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${placeholders})
          ) = ?
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'trigger'
              AND name = 'trg_cash_closure_revision_seals_insert_semantic_v2'
              AND instr(sql, 'sale_payments') > 0
              AND instr(sql, 'live_quantity_after') > 0
              AND instr(sql, 'later_session.closed_at') > 0
              AND instr(sql, 'included_sales_clp') > 0
              AND instr(sql, 'expected_inventory_line_count') > 0
              AND instr(sql, 'opening_cash_clp') > 0
              AND instr(sql, 'expenses_clp') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'trigger'
              AND name = 'trg_cash_closure_validations_insert_latest_revision_v2'
              AND instr(sql, 'request_fingerprint') > 0
              AND instr(sql, 'cash_closure_revision_seals') > 0
              AND instr(sql, 'IS NULL') > 0
              AND instr(sql, 'NOT EXISTS') > 0
          )
        THEN 1 ELSE 0 END AS ready
      `)
      .bind(
        CASH_CLOSURE_REVISIONS_SCHEMA_KEY,
        ...cashClosureRevisionArtifacts,
        cashClosureRevisionArtifacts.length,
      )
      .first<{ ready: number }>();
    return Boolean(state?.ready);
  } catch {
    return false;
  }
}

async function ensureCashClosureRevisionsSchema(
  database: D1Database,
): Promise<void> {
  if (await cashClosureRevisionsSchemaComplete(database)) return;

  const lockOwner = crypto.randomUUID();
  const now = new Date();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(
      CASH_CLOSURE_REVISIONS_SCHEMA_LOCK_KEY,
      lockOwner,
      now.toISOString(),
      new Date(now.getTime() - 5 * 60_000).toISOString(),
    )
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    if (await cashClosureRevisionsSchemaComplete(database)) return;
    throw new Error("Cash closure revisions schema migration in progress");
  }

  try {
    const validationColumns = await tableColumns(
      database,
      "cash_closure_validations",
    );
    const validationColumnNames = new Set(
      validationColumns.map(({ name }) => name),
    );
    const migration: D1PreparedStatement[] = [
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_revisions (
          id TEXT PRIMARY KEY NOT NULL,
          closure_id TEXT NOT NULL,
          revision_number INTEGER NOT NULL,
          expected_revision_number INTEGER NOT NULL,
          expected_added_sales_count INTEGER NOT NULL,
          expected_inventory_line_count INTEGER NOT NULL,
          request_fingerprint TEXT NOT NULL,
          reason TEXT NOT NULL,
          created_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          included_sales_clp INTEGER NOT NULL,
          included_sales_count INTEGER NOT NULL,
          opening_cash_clp INTEGER NOT NULL,
          cash_collected_clp INTEGER NOT NULL,
          card_collected_clp INTEGER NOT NULL,
          transfer_collected_clp INTEGER NOT NULL,
          total_collected_clp INTEGER NOT NULL,
          expected_cash_clp INTEGER NOT NULL,
          expected_collected_clp INTEGER NOT NULL,
          expenses_clp INTEGER NOT NULL,
          adjusted_expected_cash_clp INTEGER NOT NULL,
          counted_cash_clp INTEGER NOT NULL,
          counted_card_clp INTEGER NOT NULL,
          counted_transfer_clp INTEGER NOT NULL,
          counted_collected_clp INTEGER NOT NULL,
          difference_cash_clp INTEGER NOT NULL,
          difference_card_clp INTEGER NOT NULL,
          difference_transfer_clp INTEGER NOT NULL,
          difference_collected_clp INTEGER NOT NULL,
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_revisions_shape_valid CHECK (
            revision_number = expected_revision_number + 1
            AND revision_number BETWEEN 1 AND 50
            AND expected_revision_number >= 0
            AND expected_added_sales_count BETWEEN 0 AND 5
            AND expected_inventory_line_count BETWEEN 0 AND 90
            AND length(request_fingerprint) = 64
            AND length(trim(reason)) BETWEEN 1 AND 1000
            AND included_sales_clp >= 0 AND included_sales_count >= 0
            AND opening_cash_clp >= 0 AND cash_collected_clp >= 0
            AND card_collected_clp >= 0 AND transfer_collected_clp >= 0
            AND total_collected_clp = cash_collected_clp
              + card_collected_clp + transfer_collected_clp
            AND expected_cash_clp = opening_cash_clp + cash_collected_clp
            AND expected_collected_clp = opening_cash_clp
              + total_collected_clp
            AND expenses_clp >= 0
            AND adjusted_expected_cash_clp = expected_cash_clp - expenses_clp
            AND adjusted_expected_cash_clp >= 0
            AND counted_cash_clp >= 0 AND counted_card_clp >= 0
            AND counted_transfer_clp >= 0
            AND counted_collected_clp = counted_cash_clp
              + counted_card_clp + counted_transfer_clp
            AND difference_cash_clp = counted_cash_clp
              - adjusted_expected_cash_clp
            AND difference_card_clp = counted_card_clp - card_collected_clp
            AND difference_transfer_clp = counted_transfer_clp
              - transfer_collected_clp
            AND difference_collected_clp = counted_collected_clp
              - (expected_collected_clp - expenses_clp)
          )
        )
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_closure_revisions_number
        ON cash_closure_revisions (closure_id, revision_number)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_cash_closure_revisions_closure
        ON cash_closure_revisions (closure_id, created_at)
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_revision_sales (
          revision_id TEXT NOT NULL,
          sale_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          total_clp INTEGER NOT NULL,
          PRIMARY KEY (revision_id, sale_id),
          FOREIGN KEY (revision_id) REFERENCES cash_closure_revisions(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          FOREIGN KEY (sale_id) REFERENCES sales(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_revision_sales_shape_valid CHECK (
            payment_method IN ('efectivo', 'tarjeta', 'transferencia')
            AND total_clp > 0
          )
        )
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_closure_revision_sales_sale
        ON cash_closure_revision_sales (sale_id)
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_revision_inventory (
          revision_id TEXT NOT NULL,
          item_key TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          unit TEXT NOT NULL,
          location TEXT NOT NULL,
          previous_expected_quantity INTEGER NOT NULL,
          expected_quantity INTEGER NOT NULL,
          sale_consumption_quantity INTEGER NOT NULL,
          previous_counted_quantity INTEGER NOT NULL,
          counted_quantity INTEGER NOT NULL,
          counted_delta_quantity INTEGER NOT NULL,
          difference_quantity INTEGER NOT NULL,
          live_quantity_before INTEGER,
          live_version_token_before TEXT,
          live_quantity_after INTEGER,
          live_version_token_after TEXT,
          PRIMARY KEY (revision_id, item_key),
          FOREIGN KEY (revision_id) REFERENCES cash_closure_revisions(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_revision_inventory_shape_valid CHECK (
            item_type IN ('product', 'ingredient')
            AND location IN ('simple', 'vitrina', 'ingredient')
            AND previous_expected_quantity >= 0
            AND expected_quantity >= 0
            AND sale_consumption_quantity >= 0
            AND expected_quantity = previous_expected_quantity
              - sale_consumption_quantity
            AND previous_counted_quantity >= 0 AND counted_quantity >= 0
            AND counted_delta_quantity = counted_quantity
              - previous_counted_quantity
            AND difference_quantity = counted_quantity - expected_quantity
            AND (
              (counted_delta_quantity = 0
                AND live_quantity_before IS NULL
                AND live_version_token_before IS NULL
                AND live_quantity_after IS NULL
                AND live_version_token_after IS NULL)
              OR
              (counted_delta_quantity <> 0
                AND live_quantity_before >= 0
                AND length(live_version_token_before) BETWEEN 1 AND 100
                AND live_quantity_after = live_quantity_before
                  + counted_delta_quantity
                AND live_quantity_after >= 0
                AND length(live_version_token_after) BETWEEN 1 AND 100)
            )
          )
        )
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_cash_closure_revision_inventory_item
        ON cash_closure_revision_inventory (item_type, item_id)
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS cash_closure_revision_seals (
          revision_id TEXT PRIMARY KEY NOT NULL,
          sealed_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          request_fingerprint TEXT NOT NULL,
          FOREIGN KEY (revision_id) REFERENCES cash_closure_revisions(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT cash_closure_revision_seals_fingerprint_valid CHECK (
            length(request_fingerprint) = 64
          )
        )
      `),
    ];
    if (!validationColumnNames.has("revision_number")) {
      migration.push(
        database.prepare(`
          ALTER TABLE cash_closure_validations
          ADD COLUMN revision_number INTEGER DEFAULT 0 NOT NULL
        `),
      );
    }
    if (!validationColumnNames.has("request_fingerprint")) {
      migration.push(
        database.prepare(`
          ALTER TABLE cash_closure_validations
          ADD COLUMN request_fingerprint TEXT
        `),
      );
    }
    migration.push(
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_insert_guard
        BEFORE INSERT ON cash_closure_revisions
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closures AS closure
          INNER JOIN shift_sessions AS session ON session.id = closure.session_id
          WHERE closure.id = NEW.closure_id
            AND closure.closure_contract_version = 2
            AND session.status = 'closed'
        )
        OR EXISTS (
          SELECT 1 FROM cash_closure_validations
          WHERE closure_id = NEW.closure_id
        )
        OR NEW.expected_revision_number IS NOT COALESCE((
          SELECT MAX(revision_number) FROM cash_closure_revisions
          WHERE closure_id = NEW.closure_id
        ), 0)
        OR NEW.revision_number IS NOT NEW.expected_revision_number + 1
        OR NEW.revision_number > 50
        OR (
          NEW.expected_revision_number > 0
          AND NOT EXISTS (
            SELECT 1 FROM cash_closure_revisions AS head
            INNER JOIN cash_closure_revision_seals AS seal
              ON seal.revision_id = head.id
            WHERE head.closure_id = NEW.closure_id
              AND head.revision_number = NEW.expected_revision_number
              AND seal.request_fingerprint = head.request_fingerprint
          )
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision conflict');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_no_update
        BEFORE UPDATE ON cash_closure_revisions BEGIN
          SELECT RAISE(ABORT, 'cash closure revision is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_no_delete
        BEFORE DELETE ON cash_closure_revisions BEGIN
          SELECT RAISE(ABORT, 'cash closure revision is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_no_update
        BEFORE UPDATE ON cash_closure_revision_sales BEGIN
          SELECT RAISE(ABORT, 'cash closure revision sale is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_no_delete
        BEFORE DELETE ON cash_closure_revision_sales BEGIN
          SELECT RAISE(ABORT, 'cash closure revision sale is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_no_update
        BEFORE UPDATE ON cash_closure_revision_inventory BEGIN
          SELECT RAISE(ABORT, 'cash closure revision inventory is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_no_delete
        BEFORE DELETE ON cash_closure_revision_inventory BEGIN
          SELECT RAISE(ABORT, 'cash closure revision inventory is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_sales_no_update
        BEFORE UPDATE ON sales
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales
          WHERE sale_id = OLD.id OR sale_id = NEW.id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_sales_no_delete
        BEFORE DELETE ON sales
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_items_no_insert
        BEFORE INSERT ON sale_items
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = NEW.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_items_no_update
        BEFORE UPDATE ON sale_items
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales
          WHERE sale_id = OLD.sale_id OR sale_id = NEW.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_items_no_delete
        BEFORE DELETE ON sale_items
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_payments_no_insert
        BEFORE INSERT ON sale_payments
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = NEW.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_payments_no_update
        BEFORE UPDATE ON sale_payments
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales
          WHERE sale_id = OLD.sale_id OR sale_id = NEW.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_ledger_payments_no_delete
        BEFORE DELETE ON sale_payments
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.sale_id
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_insert_guard
        BEFORE INSERT ON cash_closure_revision_sales
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_seals
          WHERE revision_id = NEW.revision_id
        ) OR (
          SELECT COUNT(*) FROM cash_closure_revision_sales
          WHERE revision_id = NEW.revision_id
        ) >= COALESCE((
          SELECT expected_added_sales_count FROM cash_closure_revisions
          WHERE id = NEW.revision_id
        ), 0)
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision sales are sealed');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_insert_guard
        BEFORE INSERT ON cash_closure_revision_inventory
        WHEN EXISTS (
          SELECT 1 FROM cash_closure_revision_seals
          WHERE revision_id = NEW.revision_id
        ) OR (
          SELECT COUNT(*) FROM cash_closure_revision_inventory
          WHERE revision_id = NEW.revision_id
        ) >= COALESCE((
          SELECT expected_inventory_line_count FROM cash_closure_revisions
          WHERE id = NEW.revision_id
        ), 0)
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision inventory is sealed');
        END
      `),
      database.prepare(
        "DROP TRIGGER IF EXISTS trg_cash_closure_revision_seals_insert_semantic_v2",
      ),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_insert_semantic_v2
        BEFORE INSERT ON cash_closure_revision_seals
        WHEN NOT EXISTS (
          SELECT 1 FROM cash_closure_revisions AS revision
          WHERE revision.id = NEW.revision_id
            AND revision.request_fingerprint = NEW.request_fingerprint
            AND revision.expected_added_sales_count = (
              SELECT COUNT(*) FROM cash_closure_revision_sales
              WHERE revision_id = NEW.revision_id
            )
            AND revision.expected_inventory_line_count = (
              SELECT COUNT(*) FROM cash_closure_revision_inventory
              WHERE revision_id = NEW.revision_id
            )
            AND revision.expected_inventory_line_count = (
              SELECT COUNT(*) FROM cash_closure_inventory AS base
              WHERE base.closure_id = revision.closure_id
                AND base.location <> 'bodega'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM cash_closure_revision_sales AS link
          INNER JOIN cash_closure_revisions AS revision
            ON revision.id = link.revision_id
          INNER JOIN cash_closures AS closure
            ON closure.id = revision.closure_id
          LEFT JOIN sales AS sale ON sale.id = link.sale_id
          WHERE link.revision_id = NEW.revision_id
            AND (
              sale.id IS NULL
              OR sale.shift_session_id IS NOT closure.session_id
              OR sale.business_date IS NOT closure.business_date
              OR sale.shift IS NOT closure.shift
              OR sale.seller IS NOT closure.responsible
              OR sale.payment_status <> 'paid'
              OR sale.checkout_method IS NOT link.payment_method
              OR sale.payment_method IS NOT link.payment_method
              OR sale.total_clp IS NOT link.total_clp
              OR sale.created_at IS NOT link.created_at
              OR sale.debt_note IS NOT NULL
              OR sale.debtor_collaborator IS NOT NULL
              OR sale.settlement_id IS NOT NULL
              OR sale.total_clp IS NOT COALESCE((
                SELECT SUM(item.line_total_clp) FROM sale_items AS item
                WHERE item.sale_id = sale.id
              ), 0)
              OR 1 IS NOT (
                SELECT COUNT(*) FROM sale_payments AS payment
                WHERE payment.sale_id = sale.id AND payment.kind = 'direct'
                  AND payment.shift_session_id IS closure.session_id
                  AND payment.business_date IS closure.business_date
                  AND payment.shift IS closure.shift
                  AND payment.received_by IS closure.responsible
                  AND payment.payment_method IS link.payment_method
                  AND payment.amount_clp IS link.total_clp
                  AND payment.created_at IS link.created_at
              )
              OR 1 IS NOT (
                SELECT COUNT(*) FROM sale_payments AS payment
                WHERE payment.sale_id = sale.id
              )
            )
        )
        OR EXISTS (
          SELECT 1
          FROM cash_closure_revision_inventory AS inventory
          INNER JOIN cash_closure_revisions AS revision
            ON revision.id = inventory.revision_id
          LEFT JOIN cash_closure_inventory AS base
            ON base.closure_id = revision.closure_id
            AND base.item_key = inventory.item_key
          WHERE inventory.revision_id = NEW.revision_id
            AND (
              base.item_key IS NULL OR base.location = 'bodega'
              OR base.item_type IS NOT inventory.item_type
              OR base.item_id IS NOT inventory.item_id
              OR base.item_name IS NOT inventory.item_name
              OR base.unit IS NOT inventory.unit
              OR base.location IS NOT inventory.location
              OR inventory.previous_expected_quantity IS NOT COALESCE((
                SELECT previous.expected_quantity
                FROM cash_closure_revisions AS previous_revision
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous_revision.id
                INNER JOIN cash_closure_revision_inventory AS previous
                  ON previous.revision_id = previous_revision.id
                  AND previous.item_key = inventory.item_key
                WHERE previous_revision.closure_id = revision.closure_id
                  AND previous_revision.revision_number =
                    revision.expected_revision_number
                  AND previous_seal.request_fingerprint =
                    previous_revision.request_fingerprint
              ), base.expected_quantity)
              OR inventory.previous_counted_quantity IS NOT COALESCE((
                SELECT previous.counted_quantity
                FROM cash_closure_revisions AS previous_revision
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous_revision.id
                INNER JOIN cash_closure_revision_inventory AS previous
                  ON previous.revision_id = previous_revision.id
                  AND previous.item_key = inventory.item_key
                WHERE previous_revision.closure_id = revision.closure_id
                  AND previous_revision.revision_number =
                    revision.expected_revision_number
                  AND previous_seal.request_fingerprint =
                    previous_revision.request_fingerprint
              ), base.counted_quantity)
              OR inventory.sale_consumption_quantity IS NOT CASE
                WHEN inventory.item_type = 'product' THEN COALESCE((
                  SELECT SUM(item.quantity)
                  FROM cash_closure_revision_sales AS linked
                  INNER JOIN sale_items AS item ON item.sale_id = linked.sale_id
                  WHERE linked.revision_id = NEW.revision_id
                    AND item.product_id = inventory.item_id
                ), 0)
                ELSE COALESCE((
                  SELECT SUM(item.quantity * recipe.quantity)
                  FROM cash_closure_revision_sales AS linked
                  INNER JOIN sale_items AS item ON item.sale_id = linked.sale_id
                  INNER JOIN product_ingredients AS recipe
                    ON recipe.product_id = item.product_id
                  WHERE linked.revision_id = NEW.revision_id
                    AND recipe.ingredient_id = inventory.item_id
                ), 0)
              END
            )
        )
        OR EXISTS (
          SELECT 1
          FROM cash_closure_revision_inventory AS inventory
          WHERE inventory.revision_id = NEW.revision_id
            AND inventory.counted_delta_quantity <> 0
            AND NOT (
              (
                inventory.location = 'simple'
                AND EXISTS (
                  SELECT 1 FROM products AS product
                  WHERE product.id = inventory.item_id
                    AND product.stock_mode = 'simple'
                    AND product.stock = inventory.live_quantity_after
                    AND product.updated_at = inventory.live_version_token_after
                )
              ) OR (
                inventory.location = 'vitrina'
                AND EXISTS (
                  SELECT 1 FROM products AS product
                  WHERE product.id = inventory.item_id
                    AND product.stock_mode = 'split'
                    AND product.stock_vitrina = inventory.live_quantity_after
                    AND product.updated_at = inventory.live_version_token_after
                )
              ) OR (
                inventory.location = 'ingredient'
                AND EXISTS (
                  SELECT 1 FROM ingredients AS ingredient
                  WHERE ingredient.id = inventory.item_id
                    AND ingredient.stock = inventory.live_quantity_after
                    AND CAST(ingredient.revision AS TEXT) =
                      inventory.live_version_token_after
                )
              )
            )
        )
        OR (
          EXISTS (
            SELECT 1 FROM cash_closure_revision_inventory
            WHERE revision_id = NEW.revision_id
              AND counted_delta_quantity <> 0
          )
          AND EXISTS (
            SELECT 1
            FROM cash_closure_revisions AS revision
            INNER JOIN cash_closures AS base
              ON base.id = revision.closure_id
            INNER JOIN shift_sessions AS base_session
              ON base_session.id = base.session_id
            INNER JOIN cash_closures AS later ON later.id <> base.id
            INNER JOIN shift_sessions AS later_session
              ON later_session.id = later.session_id
            WHERE revision.id = NEW.revision_id
              AND (
                later_session.closed_at > base_session.closed_at
                OR (
                  later_session.closed_at = base_session.closed_at
                  AND later.id > base.id
                )
              )
          )
        )
        OR EXISTS (
          SELECT 1
          FROM cash_closure_revisions AS revision
          INNER JOIN cash_closures AS closure
            ON closure.id = revision.closure_id
          WHERE revision.id = NEW.revision_id
            AND (
              revision.opening_cash_clp IS NOT COALESCE((
                SELECT previous.opening_cash_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.opening_cash_clp)
              OR revision.expenses_clp IS NOT COALESCE((
                SELECT previous.expenses_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.expenses_clp)
              OR revision.included_sales_clp IS NOT COALESCE((
                SELECT previous.included_sales_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.total_sales_clp) + COALESCE((
                SELECT SUM(total_clp) FROM cash_closure_revision_sales
                WHERE revision_id = NEW.revision_id
              ), 0)
              OR revision.included_sales_count IS NOT COALESCE((
                SELECT previous.included_sales_count
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.sales_count) + revision.expected_added_sales_count
              OR revision.cash_collected_clp IS NOT COALESCE((
                SELECT previous.cash_collected_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.cash_movements_clp) + COALESCE((
                SELECT SUM(total_clp) FROM cash_closure_revision_sales
                WHERE revision_id = NEW.revision_id
                  AND payment_method = 'efectivo'
              ), 0)
              OR revision.card_collected_clp IS NOT COALESCE((
                SELECT previous.card_collected_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.expected_card_clp) + COALESCE((
                SELECT SUM(total_clp) FROM cash_closure_revision_sales
                WHERE revision_id = NEW.revision_id
                  AND payment_method = 'tarjeta'
              ), 0)
              OR revision.transfer_collected_clp IS NOT COALESCE((
                SELECT previous.transfer_collected_clp
                FROM cash_closure_revisions AS previous
                INNER JOIN cash_closure_revision_seals AS previous_seal
                  ON previous_seal.revision_id = previous.id
                WHERE previous.closure_id = revision.closure_id
                  AND previous.revision_number = revision.expected_revision_number
                  AND previous_seal.request_fingerprint = previous.request_fingerprint
              ), closure.expected_transfer_clp) + COALESCE((
                SELECT SUM(total_clp) FROM cash_closure_revision_sales
                WHERE revision_id = NEW.revision_id
                  AND payment_method = 'transferencia'
              ), 0)
            )
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure revision snapshot is incomplete');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_no_update
        BEFORE UPDATE ON cash_closure_revision_seals BEGIN
          SELECT RAISE(ABORT, 'cash closure revision seal is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_no_delete
        BEFORE DELETE ON cash_closure_revision_seals BEGIN
          SELECT RAISE(ABORT, 'cash closure revision seal is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_validations_insert_latest_revision_v2
        BEFORE INSERT ON cash_closure_validations
        WHEN NEW.revision_number IS NOT COALESCE((
          SELECT MAX(revision_number) FROM cash_closure_revisions
          WHERE closure_id = NEW.closure_id
        ), 0)
        OR (
          NEW.revision_number = 0 AND NEW.request_fingerprint IS NOT NULL
        )
        OR (
          NEW.revision_number > 0
          AND (
            NEW.request_fingerprint IS NULL
            OR length(NEW.request_fingerprint) <> 64
            OR NOT EXISTS (
              SELECT 1
              FROM cash_closure_revisions AS revision
              INNER JOIN cash_closure_revision_seals AS seal
                ON seal.revision_id = revision.id
              WHERE revision.closure_id = NEW.closure_id
                AND revision.revision_number = NEW.revision_number
                AND seal.request_fingerprint = revision.request_fingerprint
                AND revision.request_fingerprint = NEW.request_fingerprint
            )
          )
        )
        BEGIN
          SELECT RAISE(ABORT, 'cash closure validation revision conflict');
        END
      `),
      database
        .prepare(`
          INSERT INTO app_meta (key, value, updated_at)
          VALUES (?, 'v2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value,
            updated_at = excluded.updated_at
        `)
        .bind(CASH_CLOSURE_REVISIONS_SCHEMA_KEY),
      database.prepare("PRAGMA optimize"),
    );
    await database.batch(migration);
  } finally {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(CASH_CLOSURE_REVISIONS_SCHEMA_LOCK_KEY, lockOwner)
      .run();
  }
}

const closureIncidentArtifacts = [
  "closure_incident_settings",
  "closure_incidents",
  "closure_incident_items",
  "closure_incident_events",
  "closure_notification_deliveries",
  "closure_notification_attempts",
  "closure_notification_attempt_results",
  "closure_notification_webhooks",
  "closure_notification_webhook_links",
  "uq_closure_incidents_closure_id",
  "idx_closure_incidents_created_at",
  "idx_closure_incidents_responsible_created",
  "idx_closure_incidents_level_created",
  "idx_closure_incident_items_product",
  "idx_closure_incident_events_incident_created",
  "uq_closure_notification_idempotency",
  "idx_closure_notification_incident",
  "idx_closure_notification_status",
  "uq_closure_notification_attempt_number",
  "idx_closure_notification_attempt_delivery",
  "uq_closure_notification_attempt_result_event",
  "idx_closure_notification_attempt_result_attempt",
  "idx_closure_notification_webhook_message",
  "idx_closure_notification_webhook_callback",
  "idx_closure_notification_webhook_received",
  "idx_closure_notification_webhook_link_delivery",
  "trg_cash_closure_inventory_incident_details_insert",
  "trg_closure_incidents_no_update",
  "trg_closure_incidents_no_delete",
  "trg_closure_incident_items_no_update",
  "trg_closure_incident_items_no_delete",
  "trg_closure_incident_events_no_update",
  "trg_closure_incident_events_no_delete",
  "trg_cash_closure_revision_seals_incident_event_insert",
  "trg_cash_closure_validations_incident_event_insert",
  "trg_closure_notification_deliveries_active_attempt_insert",
  "trg_closure_notification_deliveries_active_attempt_update",
  "trg_closure_notification_deliveries_no_delete",
  "trg_closure_notification_attempts_no_update",
  "trg_closure_notification_attempts_no_delete",
  "trg_closure_notification_attempt_results_no_update",
  "trg_closure_notification_attempt_results_no_delete",
  "trg_closure_notification_webhooks_no_update",
  "trg_closure_notification_webhooks_no_delete",
  "trg_closure_notification_webhook_links_no_update",
  "trg_closure_notification_webhook_links_no_delete",
] as const;

async function closureIncidentsSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  const placeholders = closureIncidentArtifacts.map(() => "?").join(", ");
  try {
    const state = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM app_meta WHERE key = ? AND value = 'v2'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_inventory'
              AND instr(sql, 'reason_category') > 0
              AND instr(sql, 'incident_comment') > 0
          )
          AND EXISTS (
            SELECT 1 FROM pragma_table_info('closure_notification_deliveries')
            WHERE name = 'active_attempt_id'
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${placeholders})
          ) = ?
        THEN 1 ELSE 0 END AS ready
      `)
      .bind(
        CLOSURE_INCIDENTS_SCHEMA_KEY,
        ...closureIncidentArtifacts,
        closureIncidentArtifacts.length,
      )
      .first<{ ready: number }>();
    return Boolean(state?.ready);
  } catch {
    return false;
  }
}

async function ensureClosureIncidentsSchema(
  database: D1Database,
): Promise<void> {
  if (await closureIncidentsSchemaComplete(database)) return;

  const lockOwner = crypto.randomUUID();
  const now = new Date();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(
      CLOSURE_INCIDENTS_SCHEMA_LOCK_KEY,
      lockOwner,
      now.toISOString(),
      new Date(now.getTime() - 5 * 60_000).toISOString(),
    )
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    if (await closureIncidentsSchemaComplete(database)) return;
    throw new Error("Closure incidents schema migration in progress");
  }

  try {
    const inventoryColumns = await tableColumns(
      database,
      "cash_closure_inventory",
    );
    const notificationColumns = await tableColumns(
      database,
      "closure_notification_deliveries",
    );
    const inventoryNames = new Set(inventoryColumns.map(({ name }) => name));
    const notificationNames = new Set(
      notificationColumns.map(({ name }) => name),
    );
    const migration: D1PreparedStatement[] = [];
    if (!inventoryNames.has("reason_category")) {
      migration.push(
        database.prepare(
          "ALTER TABLE cash_closure_inventory ADD COLUMN reason_category TEXT",
        ),
      );
    }
    if (!inventoryNames.has("incident_comment")) {
      migration.push(
        database.prepare(
          "ALTER TABLE cash_closure_inventory ADD COLUMN incident_comment TEXT",
        ),
      );
    }
    if (
      notificationColumns.length > 0 &&
      !notificationNames.has("active_attempt_id")
    ) {
      migration.push(
        database.prepare(
          "ALTER TABLE closure_notification_deliveries ADD COLUMN active_attempt_id TEXT",
        ),
      );
    }

    migration.push(
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_incident_settings (
          id TEXT PRIMARY KEY NOT NULL,
          money_red_threshold_clp INTEGER DEFAULT 1 NOT NULL,
          multiple_product_red_count INTEGER DEFAULT 2 NOT NULL,
          high_value_product_clp INTEGER DEFAULT 10000 NOT NULL,
          recurrence_window_days INTEGER DEFAULT 30 NOT NULL,
          recurrence_red_count INTEGER DEFAULT 2 NOT NULL,
          reminder_hours INTEGER DEFAULT 24 NOT NULL,
          updated_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          CONSTRAINT closure_incident_settings_shape_valid CHECK (
            id = 'default' AND money_red_threshold_clp >= 1
            AND multiple_product_red_count BETWEEN 1 AND 90
            AND high_value_product_clp >= 1
            AND recurrence_window_days BETWEEN 1 AND 365
            AND recurrence_red_count BETWEEN 2 AND 100
            AND reminder_hours BETWEEN 1 AND 720
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_incidents (
          id TEXT PRIMARY KEY NOT NULL,
          closure_id TEXT NOT NULL,
          created_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          business_date TEXT NOT NULL,
          shift TEXT NOT NULL,
          responsible TEXT NOT NULL,
          level TEXT NOT NULL,
          classification_reason TEXT NOT NULL,
          cash_difference_clp INTEGER NOT NULL,
          card_difference_clp INTEGER NOT NULL,
          transfer_difference_clp INTEGER NOT NULL,
          total_difference_clp INTEGER NOT NULL,
          inventory_difference_count INTEGER NOT NULL,
          estimated_value_clp INTEGER NOT NULL,
          unvalued_item_count INTEGER NOT NULL,
          prior_responsible_incident_count INTEGER NOT NULL,
          highest_prior_product_incident_count INTEGER NOT NULL,
          money_red_threshold_clp INTEGER NOT NULL,
          multiple_product_red_count INTEGER NOT NULL,
          high_value_product_clp INTEGER NOT NULL,
          recurrence_window_days INTEGER NOT NULL,
          recurrence_red_count INTEGER NOT NULL,
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_incidents_shape_valid CHECK (
            business_date GLOB
              '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND shift IN ('am', 'pm')
            AND length(trim(responsible)) BETWEEN 1 AND 100
            AND level IN ('yellow', 'red')
            AND length(trim(classification_reason)) BETWEEN 1 AND 500
            AND total_difference_clp = cash_difference_clp
              + card_difference_clp + transfer_difference_clp
            AND inventory_difference_count >= 0
            AND estimated_value_clp >= 0
            AND unvalued_item_count >= 0
            AND prior_responsible_incident_count >= 0
            AND highest_prior_product_incident_count >= 0
            AND money_red_threshold_clp >= 1
            AND multiple_product_red_count BETWEEN 1 AND 90
            AND high_value_product_clp >= 1
            AND recurrence_window_days BETWEEN 1 AND 365
            AND recurrence_red_count BETWEEN 2 AND 100
            AND (
              cash_difference_clp <> 0 OR card_difference_clp <> 0
              OR transfer_difference_clp <> 0
              OR inventory_difference_count > 0
            )
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_incident_items (
          incident_id TEXT NOT NULL,
          item_key TEXT NOT NULL,
          item_type TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_name TEXT NOT NULL,
          unit TEXT NOT NULL,
          location TEXT NOT NULL,
          expected_quantity INTEGER NOT NULL,
          counted_quantity INTEGER NOT NULL,
          difference_quantity INTEGER NOT NULL,
          reason_category TEXT NOT NULL,
          initial_comment TEXT NOT NULL,
          adjustment_applied INTEGER NOT NULL,
          unit_value_clp INTEGER,
          estimated_value_clp INTEGER,
          high_value INTEGER NOT NULL,
          PRIMARY KEY (incident_id, item_key),
          FOREIGN KEY (incident_id) REFERENCES closure_incidents(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_incident_items_shape_valid CHECK (
            item_type IN ('product', 'ingredient')
            AND location IN ('simple', 'vitrina', 'ingredient')
            AND expected_quantity >= 0 AND counted_quantity >= 0
            AND difference_quantity <> 0
            AND difference_quantity = counted_quantity - expected_quantity
            AND reason_category IN (
              'venta_no_registrada', 'consumo_no_registrado', 'merma',
              'error_conteo', 'reposicion_no_registrada', 'otro'
            )
            AND length(trim(initial_comment)) BETWEEN 1 AND 1000
            AND (unit_value_clp IS NULL OR unit_value_clp > 0)
            AND (estimated_value_clp IS NULL OR estimated_value_clp >= 0)
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_incident_events (
          id TEXT PRIMARY KEY NOT NULL,
          incident_id TEXT NOT NULL,
          created_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          event_type TEXT NOT NULL,
          status TEXT,
          actor_role TEXT NOT NULL,
          actor_name TEXT NOT NULL,
          comment TEXT,
          request_fingerprint TEXT NOT NULL,
          FOREIGN KEY (incident_id) REFERENCES closure_incidents(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_incident_events_shape_valid CHECK (
            event_type IN (
              'created', 'clarification_requested', 'comment_added',
              'clarified', 'validated', 'requires_correction',
              'correction_applied', 'notification_retry'
            )
            AND (status IS NULL OR status IN (
              'pending_clarification', 'clarified', 'validated',
              'requires_correction'
            ))
            AND actor_role IN ('system', 'admin', 'sales')
            AND length(trim(actor_name)) BETWEEN 1 AND 100
            AND (comment IS NULL
              OR length(trim(comment)) BETWEEN 1 AND 1000)
            AND length(request_fingerprint) = 64
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_notification_deliveries (
          id TEXT PRIMARY KEY NOT NULL,
          incident_id TEXT,
          closure_id TEXT NOT NULL,
          business_date TEXT NOT NULL,
          kind TEXT NOT NULL,
          recipient_type TEXT NOT NULL,
          recipient TEXT NOT NULL,
          idempotency_key TEXT NOT NULL,
          template_name TEXT,
          template_payload_json TEXT NOT NULL,
          message_preview TEXT NOT NULL,
          status TEXT NOT NULL,
          attempt_count INTEGER DEFAULT 0 NOT NULL,
          active_attempt_id TEXT,
          last_attempt_at TEXT,
          sent_at TEXT,
          provider_message_id TEXT,
          response_status INTEGER,
          provider_response TEXT,
          error_code TEXT,
          error_message TEXT,
          created_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          updated_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          FOREIGN KEY (incident_id) REFERENCES closure_incidents(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          FOREIGN KEY (closure_id) REFERENCES cash_closures(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_notification_deliveries_shape_valid CHECK (
            business_date GLOB
              '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND kind IN ('immediate_alert', 'reminder', 'daily_summary')
            AND recipient_type IN ('individual', 'group', 'configuration')
            AND length(trim(recipient)) BETWEEN 1 AND 100
            AND length(idempotency_key) BETWEEN 1 AND 300
            AND length(template_payload_json) BETWEEN 2 AND 10000
            AND length(trim(message_preview)) BETWEEN 1 AND 4000
            AND status IN (
              'queued', 'sending', 'accepted', 'sent', 'delivered', 'read',
              'failed', 'superseded',
              'configuration_required'
            )
            AND (
              (status = 'sending' AND active_attempt_id IS NOT NULL)
              OR (status <> 'sending' AND active_attempt_id IS NULL)
            )
            AND attempt_count BETWEEN 0 AND 100
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_notification_attempts (
          id TEXT PRIMARY KEY NOT NULL,
          delivery_id TEXT NOT NULL,
          attempt_number INTEGER NOT NULL,
          initiated_by TEXT NOT NULL,
          request_fingerprint TEXT NOT NULL,
          started_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          FOREIGN KEY (delivery_id)
            REFERENCES closure_notification_deliveries(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_notification_attempts_shape_valid CHECK (
            length(id) BETWEEN 1 AND 160
            AND attempt_number BETWEEN 1 AND 100
            AND initiated_by IN ('automatic', 'manual', 'recovery')
            AND length(request_fingerprint) = 64
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_notification_attempt_results (
          id TEXT PRIMARY KEY NOT NULL,
          attempt_id TEXT NOT NULL,
          event_key TEXT NOT NULL,
          outcome TEXT NOT NULL,
          finished_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          provider_message_id TEXT,
          response_status INTEGER,
          provider_response TEXT,
          error_code TEXT,
          error_message TEXT,
          FOREIGN KEY (attempt_id) REFERENCES closure_notification_attempts(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_notification_attempt_results_shape_valid CHECK (
            length(id) BETWEEN 1 AND 200
            AND length(event_key) BETWEEN 1 AND 50
            AND outcome IN ('accepted', 'failed', 'ambiguous')
            AND (provider_message_id IS NULL
              OR length(provider_message_id) BETWEEN 1 AND 500)
            AND (response_status IS NULL
              OR response_status BETWEEN 100 AND 599)
            AND (provider_response IS NULL
              OR length(provider_response) BETWEEN 1 AND 10000)
            AND (error_code IS NULL
              OR length(error_code) BETWEEN 1 AND 200)
            AND (error_message IS NULL
              OR length(error_message) BETWEEN 1 AND 1000)
            AND (
              (outcome = 'accepted' AND provider_message_id IS NOT NULL
                AND error_code IS NULL AND error_message IS NULL)
              OR (outcome IN ('failed', 'ambiguous')
                AND error_code IS NOT NULL AND error_message IS NOT NULL)
            )
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_notification_webhooks (
          id TEXT PRIMARY KEY NOT NULL,
          provider_message_id TEXT NOT NULL,
          provider_status TEXT NOT NULL,
          provider_timestamp INTEGER,
          callback_data TEXT,
          error_code TEXT,
          error_message TEXT,
          payload_fingerprint TEXT NOT NULL,
          received_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          CONSTRAINT closure_notification_webhooks_shape_valid CHECK (
            length(id) BETWEEN 1 AND 100
            AND length(provider_message_id) BETWEEN 1 AND 500
            AND provider_status IN ('sent', 'delivered', 'read', 'failed')
            AND (provider_timestamp IS NULL OR provider_timestamp >= 0)
            AND (callback_data IS NULL
              OR length(callback_data) BETWEEN 1 AND 100)
            AND (error_code IS NULL
              OR length(error_code) BETWEEN 1 AND 200)
            AND (error_message IS NULL
              OR length(error_message) BETWEEN 1 AND 1000)
            AND length(payload_fingerprint) = 64
          )
        )
      `),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS closure_notification_webhook_links (
          webhook_id TEXT PRIMARY KEY NOT NULL,
          delivery_id TEXT NOT NULL,
          match_source TEXT NOT NULL,
          linked_at TEXT DEFAULT
            (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
          FOREIGN KEY (webhook_id) REFERENCES closure_notification_webhooks(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          FOREIGN KEY (delivery_id)
            REFERENCES closure_notification_deliveries(id)
            ON UPDATE NO ACTION ON DELETE RESTRICT,
          CONSTRAINT closure_notification_webhook_links_shape_valid CHECK (
            match_source IN (
              'provider_message_id', 'callback_data', 'reconciliation'
            )
          )
        )
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_incident_settings (
          id, money_red_threshold_clp, multiple_product_red_count,
          high_value_product_clp, recurrence_window_days,
          recurrence_red_count, reminder_hours
        ) VALUES ('default', 1, 2, 10000, 30, 2, 24)
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_closure_incidents_closure_id
        ON closure_incidents (closure_id)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_incidents_created_at
        ON closure_incidents (created_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_incidents_responsible_created
        ON closure_incidents (responsible, created_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_incidents_level_created
        ON closure_incidents (level, created_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_incident_items_product
        ON closure_incident_items (item_type, item_id, incident_id)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_incident_events_incident_created
        ON closure_incident_events (incident_id, created_at)
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_closure_notification_idempotency
        ON closure_notification_deliveries (idempotency_key)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_incident
        ON closure_notification_deliveries (incident_id, created_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_status
        ON closure_notification_deliveries (status, updated_at)
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
          uq_closure_notification_attempt_number
        ON closure_notification_attempts (delivery_id, attempt_number)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_attempt_delivery
        ON closure_notification_attempts (delivery_id, started_at)
      `),
      database.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS
          uq_closure_notification_attempt_result_event
        ON closure_notification_attempt_results (attempt_id, event_key)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS
          idx_closure_notification_attempt_result_attempt
        ON closure_notification_attempt_results (attempt_id, finished_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_webhook_message
        ON closure_notification_webhooks (
          provider_message_id, provider_timestamp
        )
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_webhook_callback
        ON closure_notification_webhooks (callback_data, received_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS idx_closure_notification_webhook_received
        ON closure_notification_webhooks (received_at)
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS
          idx_closure_notification_webhook_link_delivery
        ON closure_notification_webhook_links (delivery_id, linked_at)
      `),
    );

    await database.batch(migration);

    await database.batch([
      database.prepare(`
        UPDATE closure_notification_deliveries
        SET attempt_count = 1,
          last_attempt_at = COALESCE(last_attempt_at, updated_at, created_at)
        WHERE status = 'sending' AND attempt_count = 0
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_notification_attempts (
          id, delivery_id, attempt_number, initiated_by,
          request_fingerprint, started_at
        )
        SELECT 'notification-recovery:'
            || substr(lower(hex(randomblob(32))), 1, 40),
          delivery.id, delivery.attempt_count, 'recovery',
          lower(hex(randomblob(32))),
          COALESCE(delivery.last_attempt_at, delivery.updated_at,
            delivery.created_at)
        FROM closure_notification_deliveries AS delivery
        WHERE delivery.attempt_count BETWEEN 1 AND 100
          AND NOT EXISTS (
            SELECT 1 FROM closure_notification_attempts AS attempt
            WHERE attempt.delivery_id = delivery.id
              AND attempt.attempt_number = delivery.attempt_count
          )
      `),
      database.prepare(`
        UPDATE closure_notification_deliveries
        SET active_attempt_id = (
          SELECT attempt.id FROM closure_notification_attempts AS attempt
          WHERE attempt.delivery_id = closure_notification_deliveries.id
            AND attempt.attempt_number =
              closure_notification_deliveries.attempt_count
          LIMIT 1
        )
        WHERE status = 'sending' AND active_attempt_id IS NULL
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_notification_attempt_results (
          id, attempt_id, event_key, outcome, finished_at,
          provider_message_id, response_status, provider_response,
          error_code, error_message
        )
        SELECT 'notification-result:'
            || substr(lower(hex(randomblob(32))), 1, 40),
          attempt.id, 'legacy_projection',
          CASE
            WHEN delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              AND delivery.provider_message_id IS NOT NULL
              THEN 'accepted'
            WHEN delivery.error_code = 'ambiguous_delivery'
              OR delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              THEN 'ambiguous'
            ELSE 'failed'
          END,
          COALESCE(delivery.updated_at, delivery.last_attempt_at,
            delivery.created_at),
          CASE WHEN delivery.provider_message_id IS NULL THEN NULL
            ELSE substr(delivery.provider_message_id, 1, 500) END,
          CASE WHEN delivery.response_status BETWEEN 100 AND 599
            THEN delivery.response_status ELSE NULL END,
          CASE WHEN delivery.provider_response IS NULL THEN NULL
            ELSE substr(delivery.provider_response, 1, 10000) END,
          CASE
            WHEN delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              AND delivery.provider_message_id IS NOT NULL THEN NULL
            WHEN delivery.error_code = 'ambiguous_delivery'
              OR delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              THEN 'legacy_ambiguous'
            ELSE substr(COALESCE(NULLIF(trim(delivery.error_code), ''),
              'legacy_failure'), 1, 200)
          END,
          CASE
            WHEN delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              AND delivery.provider_message_id IS NOT NULL THEN NULL
            WHEN delivery.error_code = 'ambiguous_delivery'
              OR delivery.status IN ('accepted', 'sent', 'delivered', 'read')
              THEN 'El estado previo no permite reconstruir la respuesta completa.'
            ELSE substr(COALESCE(NULLIF(trim(delivery.error_message), ''),
              'Fallo histórico sin detalle disponible.'), 1, 1000)
          END
        FROM closure_notification_deliveries AS delivery
        INNER JOIN closure_notification_attempts AS attempt
          ON attempt.delivery_id = delivery.id
          AND attempt.attempt_number = delivery.attempt_count
        WHERE delivery.attempt_count BETWEEN 1 AND 100
          AND delivery.status IN (
            'accepted', 'sent', 'delivered', 'read', 'failed'
          )
      `),
    ]);

    await database.batch([
      database.prepare(`
        INSERT OR IGNORE INTO closure_incidents (
          id, closure_id, created_at, business_date, shift, responsible,
          level, classification_reason, cash_difference_clp,
          card_difference_clp, transfer_difference_clp,
          total_difference_clp, inventory_difference_count,
          estimated_value_clp, unvalued_item_count,
          prior_responsible_incident_count,
          highest_prior_product_incident_count, money_red_threshold_clp,
          multiple_product_red_count, high_value_product_clp,
          recurrence_window_days, recurrence_red_count
        )
        SELECT
          'incident:' || closure.id, closure.id, closure.created_at,
          closure.business_date, closure.shift, closure.responsible,
          CASE WHEN
            abs(COALESCE(closure.adjusted_difference_clp,
              closure.difference_clp))
              + abs(COALESCE(closure.difference_card_clp, 0))
              + abs(COALESCE(closure.difference_transfer_clp, 0)) >= 1
            OR (SELECT COUNT(DISTINCT item_type || ':' || item_id)
              FROM cash_closure_inventory AS inventory
              WHERE inventory.closure_id = closure.id
                AND inventory.location <> 'bodega'
                AND inventory.difference_quantity <> 0) >= 2
            OR EXISTS (SELECT 1
              FROM cash_closure_inventory AS inventory
              INNER JOIN products AS product
                ON product.id = inventory.item_id
              WHERE inventory.closure_id = closure.id
                AND inventory.item_type = 'product'
                AND inventory.location <> 'bodega'
                AND inventory.difference_quantity <> 0
                AND abs(inventory.difference_quantity) * product.price_clp
                  >= 10000)
          THEN 'red' ELSE 'yellow' END,
          'Registro histórico migrado con la política inicial.',
          COALESCE(closure.adjusted_difference_clp,
            closure.difference_clp),
          COALESCE(closure.difference_card_clp, 0),
          COALESCE(closure.difference_transfer_clp, 0),
          COALESCE(closure.adjusted_difference_clp,
            closure.difference_clp)
            + COALESCE(closure.difference_card_clp, 0)
            + COALESCE(closure.difference_transfer_clp, 0),
          (SELECT COUNT(*) FROM cash_closure_inventory AS inventory
            WHERE inventory.closure_id = closure.id
              AND inventory.location <> 'bodega'
              AND inventory.difference_quantity <> 0),
          COALESCE((SELECT SUM(
              abs(inventory.difference_quantity) * product.price_clp
            )
            FROM cash_closure_inventory AS inventory
            INNER JOIN products AS product ON product.id = inventory.item_id
            WHERE inventory.closure_id = closure.id
              AND inventory.item_type = 'product'
              AND inventory.location <> 'bodega'
              AND inventory.difference_quantity <> 0), 0),
          (SELECT COUNT(*) FROM cash_closure_inventory AS inventory
            WHERE inventory.closure_id = closure.id
              AND inventory.item_type = 'ingredient'
              AND inventory.location <> 'bodega'
              AND inventory.difference_quantity <> 0),
          0, 0, 1, 2, 10000, 30, 2
        FROM cash_closures AS closure
        WHERE closure.closure_contract_version = 2
          AND (
            COALESCE(closure.adjusted_difference_clp,
              closure.difference_clp) <> 0
            OR COALESCE(closure.difference_card_clp, 0) <> 0
            OR COALESCE(closure.difference_transfer_clp, 0) <> 0
            OR EXISTS (
              SELECT 1 FROM cash_closure_inventory AS inventory
              WHERE inventory.closure_id = closure.id
                AND inventory.location <> 'bodega'
                AND inventory.difference_quantity <> 0
            )
          )
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_incident_items (
          incident_id, item_key, item_type, item_id, item_name, unit,
          location, expected_quantity, counted_quantity,
          difference_quantity, reason_category, initial_comment,
          adjustment_applied, unit_value_clp, estimated_value_clp,
          high_value
        )
        SELECT incident.id, inventory.item_key, inventory.item_type,
          inventory.item_id, inventory.item_name, inventory.unit,
          inventory.location, inventory.expected_quantity,
          inventory.counted_quantity, inventory.difference_quantity,
          CASE WHEN inventory.reason_category IN (
            'venta_no_registrada', 'consumo_no_registrado', 'merma',
            'error_conteo', 'reposicion_no_registrada', 'otro'
          ) THEN inventory.reason_category ELSE 'otro' END,
          substr(COALESCE(inventory.incident_comment, inventory.reason,
            'Registro histórico sin comentario original.'), 1, 1000),
          inventory.difference_quantity,
          CASE WHEN inventory.item_type = 'product'
            THEN product.price_clp ELSE NULL END,
          CASE WHEN inventory.item_type = 'product'
            THEN abs(inventory.difference_quantity) * product.price_clp
            ELSE NULL END,
          CASE WHEN inventory.item_type = 'product'
            AND abs(inventory.difference_quantity) * product.price_clp
              >= incident.high_value_product_clp
            THEN 1 ELSE 0 END
        FROM cash_closure_inventory AS inventory
        INNER JOIN closure_incidents AS incident
          ON incident.closure_id = inventory.closure_id
        LEFT JOIN products AS product
          ON product.id = inventory.item_id
            AND inventory.item_type = 'product'
        WHERE inventory.location <> 'bodega'
          AND inventory.difference_quantity <> 0
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_incident_events (
          id, incident_id, created_at, event_type, status, actor_role,
          actor_name, comment, request_fingerprint
        )
        SELECT 'created:' || incident.id, incident.id, incident.created_at,
          'created', 'pending_clarification', 'system', 'Sistema',
          'Incidencia histórica creada durante la migración.',
          lower(hex(randomblob(32)))
        FROM closure_incidents AS incident
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_incident_events (
          id, incident_id, created_at, event_type, status, actor_role,
          actor_name, comment, request_fingerprint
        )
        SELECT 'correction:' || revision.id, incident.id, seal.sealed_at,
          'correction_applied', CASE WHEN
            revision.difference_cash_clp = 0
            AND revision.difference_card_clp = 0
            AND revision.difference_transfer_clp = 0
            AND NOT EXISTS (
              SELECT 1 FROM cash_closure_revision_inventory AS inventory
              WHERE inventory.revision_id = revision.id
                AND inventory.difference_quantity <> 0
            )
          THEN 'clarified' ELSE 'requires_correction' END,
          'admin', 'Administrador',
          substr('Revisión ' || revision.revision_number || ': '
            || revision.reason, 1, 1000),
          revision.request_fingerprint
        FROM cash_closure_revisions AS revision
        INNER JOIN cash_closure_revision_seals AS seal
          ON seal.revision_id = revision.id
          AND seal.request_fingerprint = revision.request_fingerprint
        INNER JOIN closure_incidents AS incident
          ON incident.closure_id = revision.closure_id
        ORDER BY revision.closure_id, revision.revision_number
      `),
      database.prepare(`
        INSERT OR IGNORE INTO closure_incident_events (
          id, incident_id, created_at, event_type, status, actor_role,
          actor_name, comment, request_fingerprint
        )
        SELECT 'validated:' || incident.closure_id, incident.id,
          validation.validated_at, 'validated', 'validated', 'admin',
          'Administrador',
          substr(COALESCE(validation.comment,
            'Cierre validado antes de crear el registro de incidencias.'),
            1, 1000),
          COALESCE(validation.request_fingerprint,
            closure.request_fingerprint)
        FROM closure_incidents AS incident
        INNER JOIN cash_closure_validations AS validation
          ON validation.closure_id = incident.closure_id
        INNER JOIN cash_closures AS closure
          ON closure.id = incident.closure_id
      `),
    ]);

    await database.batch([
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_inventory_incident_details_insert
        BEFORE INSERT ON cash_closure_inventory
        WHEN NEW.location <> 'bodega' AND ((
          NEW.difference_quantity = 0 AND (
            NEW.reason_category IS NOT NULL
            OR NEW.incident_comment IS NOT NULL
          )
        ) OR (
          NEW.difference_quantity <> 0 AND (
            NEW.reason_category NOT IN (
              'venta_no_registrada', 'consumo_no_registrado', 'merma',
              'error_conteo', 'reposicion_no_registrada', 'otro'
            )
            OR NEW.reason_category IS NULL
            OR NEW.incident_comment IS NULL
            OR length(trim(NEW.incident_comment)) NOT BETWEEN 1 AND 1000
          )
        ))
        BEGIN
          SELECT RAISE(ABORT,
            'cash closure inventory incident details are invalid');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incidents_no_update
        BEFORE UPDATE ON closure_incidents BEGIN
          SELECT RAISE(ABORT, 'closure incident snapshot is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incidents_no_delete
        BEFORE DELETE ON closure_incidents BEGIN
          SELECT RAISE(ABORT, 'closure incident snapshot is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incident_items_no_update
        BEFORE UPDATE ON closure_incident_items BEGIN
          SELECT RAISE(ABORT, 'closure incident items are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incident_items_no_delete
        BEFORE DELETE ON closure_incident_items BEGIN
          SELECT RAISE(ABORT, 'closure incident items are immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incident_events_no_update
        BEFORE UPDATE ON closure_incident_events BEGIN
          SELECT RAISE(ABORT, 'closure incident history is append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_incident_events_no_delete
        BEFORE DELETE ON closure_incident_events BEGIN
          SELECT RAISE(ABORT, 'closure incident history is append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_revision_seals_incident_event_insert
        AFTER INSERT ON cash_closure_revision_seals
        BEGIN
          INSERT INTO closure_incident_events (
            id, incident_id, created_at, event_type, status, actor_role,
            actor_name, comment, request_fingerprint
          )
          SELECT 'correction:' || revision.id, incident.id, NEW.sealed_at,
            'correction_applied', CASE WHEN
              revision.difference_cash_clp = 0
              AND revision.difference_card_clp = 0
              AND revision.difference_transfer_clp = 0
              AND NOT EXISTS (
                SELECT 1 FROM cash_closure_revision_inventory AS inventory
                WHERE inventory.revision_id = revision.id
                  AND inventory.difference_quantity <> 0
              )
            THEN 'clarified' ELSE 'requires_correction' END,
            'admin', 'Administrador',
            substr('Revisión ' || revision.revision_number || ': '
              || revision.reason, 1, 1000),
            revision.request_fingerprint
          FROM cash_closure_revisions AS revision
          INNER JOIN closure_incidents AS incident
            ON incident.closure_id = revision.closure_id
          WHERE revision.id = NEW.revision_id
          ON CONFLICT(id) DO NOTHING;
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_cash_closure_validations_incident_event_insert
        AFTER INSERT ON cash_closure_validations
        BEGIN
          INSERT INTO closure_incident_events (
            id, incident_id, created_at, event_type, status, actor_role,
            actor_name, comment, request_fingerprint
          )
          SELECT 'validated:' || NEW.closure_id, incident.id,
            NEW.validated_at, 'validated', 'validated', 'admin',
            'Administrador',
            substr(COALESCE(NEW.comment,
              'Validación administrativa sobre la revisión '
                || NEW.revision_number || '.'), 1, 1000),
            COALESCE(NEW.request_fingerprint, closure.request_fingerprint)
          FROM closure_incidents AS incident
          INNER JOIN cash_closures AS closure
            ON closure.id = incident.closure_id
          WHERE incident.closure_id = NEW.closure_id
          ON CONFLICT(id) DO NOTHING;
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_deliveries_active_attempt_insert
        BEFORE INSERT ON closure_notification_deliveries
        WHEN (NEW.status = 'sending' AND NEW.active_attempt_id IS NULL)
          OR (NEW.status <> 'sending' AND NEW.active_attempt_id IS NOT NULL)
        BEGIN
          SELECT RAISE(ABORT,
            'closure notification active attempt is invalid');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_deliveries_active_attempt_update
        BEFORE UPDATE ON closure_notification_deliveries
        WHEN (NEW.status = 'sending' AND NEW.active_attempt_id IS NULL)
          OR (NEW.status <> 'sending' AND NEW.active_attempt_id IS NOT NULL)
        BEGIN
          SELECT RAISE(ABORT,
            'closure notification active attempt is invalid');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_deliveries_no_delete
        BEFORE DELETE ON closure_notification_deliveries BEGIN
          SELECT RAISE(ABORT, 'closure notification audit is immutable');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_notification_attempts_no_update
        BEFORE UPDATE ON closure_notification_attempts BEGIN
          SELECT RAISE(ABORT,
            'closure notification attempts are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_notification_attempts_no_delete
        BEFORE DELETE ON closure_notification_attempts BEGIN
          SELECT RAISE(ABORT,
            'closure notification attempts are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_attempt_results_no_update
        BEFORE UPDATE ON closure_notification_attempt_results BEGIN
          SELECT RAISE(ABORT,
            'closure notification attempt results are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_attempt_results_no_delete
        BEFORE DELETE ON closure_notification_attempt_results BEGIN
          SELECT RAISE(ABORT,
            'closure notification attempt results are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_notification_webhooks_no_update
        BEFORE UPDATE ON closure_notification_webhooks BEGIN
          SELECT RAISE(ABORT,
            'closure notification webhooks are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS trg_closure_notification_webhooks_no_delete
        BEFORE DELETE ON closure_notification_webhooks BEGIN
          SELECT RAISE(ABORT,
            'closure notification webhooks are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_webhook_links_no_update
        BEFORE UPDATE ON closure_notification_webhook_links BEGIN
          SELECT RAISE(ABORT,
            'closure notification webhook links are immutable append-only');
        END
      `),
      database.prepare(`
        CREATE TRIGGER IF NOT EXISTS
          trg_closure_notification_webhook_links_no_delete
        BEFORE DELETE ON closure_notification_webhook_links BEGIN
          SELECT RAISE(ABORT,
            'closure notification webhook links are immutable append-only');
        END
      `),
      database.prepare(`
        INSERT OR IGNORE INTO app_meta (key, value, updated_at)
        VALUES (?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      `).bind(CLOSURE_NOTIFICATIONS_ENABLED_FROM_KEY),
      database.prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'v2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value,
          updated_at = excluded.updated_at
      `).bind(CLOSURE_INCIDENTS_SCHEMA_KEY),
      database.prepare("PRAGMA optimize"),
    ]);
  } finally {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(CLOSURE_INCIDENTS_SCHEMA_LOCK_KEY, lockOwner)
      .run();
  }
}

async function upgradeDatabaseSchema(database: D1Database): Promise<void> {
  let [productColumns, saleColumns, productDefinition, saleDefinition] = await Promise.all([
    tableColumns(database, "products"),
    tableColumns(database, "sales"),
    tableDefinition(database, "products"),
    tableDefinition(database, "sales"),
  ]);
  if (
    productsSchemaComplete(productColumns, productDefinition) &&
    salesSchemaComplete(saleColumns, saleDefinition)
  ) {
    return;
  }

  const lockOwner = crypto.randomUUID();
  const lockTimestamp = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const lock = await database
    .prepare(`
      INSERT INTO app_meta (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
      WHERE app_meta.updated_at < ?
    `)
    .bind(SCHEMA_LOCK_KEY, lockOwner, lockTimestamp, staleBefore)
    .run();
  if (Number(lock.meta.changes ?? 0) === 0) {
    [productColumns, saleColumns, productDefinition, saleDefinition] = await Promise.all([
      tableColumns(database, "products"),
      tableColumns(database, "sales"),
      tableDefinition(database, "products"),
      tableDefinition(database, "sales"),
    ]);
    if (
      productsSchemaComplete(productColumns, productDefinition) &&
      salesSchemaComplete(saleColumns, saleDefinition)
    ) {
      return;
    }
    throw new Error("Database schema migration in progress");
  }

  try {
    if (!productsSchemaComplete(productColumns, productDefinition)) {
      await upgradeProducts(database, productColumns);
    }
    if (!salesSchemaComplete(saleColumns, saleDefinition)) {
      await upgradeSales(database, saleColumns);
    }
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(SCHEMA_LOCK_KEY, lockOwner)
      .run();
  } catch (error) {
    await database
      .prepare("DELETE FROM app_meta WHERE key = ? AND value = ?")
      .bind(SCHEMA_LOCK_KEY, lockOwner)
      .run();
    throw error;
  }
}

async function inventoryStockEntriesSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  try {
    const state = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM app_meta
            WHERE key = ? AND value = 'v1'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'inventory_stock_entries'
              AND instr(sql, 'operation_token') > 0
              AND instr(sql, 'quantity_after') > 0
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${inventoryStockEntryArtifacts.map(() => "?").join(", ")})
          ) = ?
        THEN 1 ELSE 0 END AS complete
      `)
      .bind(
        INVENTORY_STOCK_ENTRIES_SCHEMA_KEY,
        ...inventoryStockEntryArtifacts,
        inventoryStockEntryArtifacts.length,
      )
      .first<{ complete: number }>();
    return Boolean(state?.complete);
  } catch {
    return false;
  }
}

async function ensureInventoryStockEntriesSchema(
  database: D1Database,
): Promise<void> {
  if (await inventoryStockEntriesSchemaComplete(database)) return;
  const updatedAt = new Date().toISOString();
  await database.batch([
    database.prepare(inventoryStockEntriesDdl),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_inventory_stock_entries_item_created ON inventory_stock_entries (item_type, item_id, created_at)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_inventory_stock_entries_created_at ON inventory_stock_entries (created_at)",
    ),
    database.prepare(inventoryStockEntryApplyProductDdl),
    database.prepare(inventoryStockEntryApplyIngredientDdl),
    database.prepare(inventoryStockEntryNoUpdateDdl),
    database.prepare(inventoryStockEntryNoDeleteDdl),
    database
      .prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'v1', ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `)
      .bind(INVENTORY_STOCK_ENTRIES_SCHEMA_KEY, updatedAt),
  ]);
}

async function saleVoidsSchemaComplete(
  database: D1Database,
): Promise<boolean> {
  try {
    const state = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (
            SELECT 1 FROM app_meta WHERE key = ? AND value = 'v1'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sale_voids'
              AND instr(sql, 'request_fingerprint') > 0
              AND instr(sql, 'inventory_restoration_json') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sale_inventory_snapshots'
              AND instr(sql, 'version') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sale_inventory_consumptions'
              AND instr(sql, 'location') > 0
              AND instr(sql, 'quantity') > 0
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${saleVoidArtifacts.map(() => "?").join(", ")})
          ) = ?
        THEN 1 ELSE 0 END AS complete
      `)
      .bind(
        SALE_VOIDS_SCHEMA_KEY,
        ...saleVoidArtifacts,
        saleVoidArtifacts.length,
      )
      .first<{ complete: number }>();
    return Boolean(state?.complete);
  } catch {
    return false;
  }
}

async function ensureSaleVoidsSchema(database: D1Database): Promise<void> {
  if (await saleVoidsSchemaComplete(database)) return;
  const updatedAt = new Date().toISOString();
  await database.batch([
    database.prepare(saleInventorySnapshotsDdl),
    database.prepare(saleInventoryConsumptionsDdl),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_inventory_consumptions_sale_id ON sale_inventory_consumptions (sale_id)",
    ),
    database.prepare(saleVoidsDdl),
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_voids_sale_id ON sale_voids (sale_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_voids_created_at ON sale_voids (created_at)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_voids_shift_session_id ON sale_voids (shift_session_id)",
    ),
    database.prepare(immutableTriggerDdl("sale_inventory_snapshots", "UPDATE")),
    database.prepare(immutableTriggerDdl("sale_inventory_snapshots", "DELETE")),
    database.prepare(immutableTriggerDdl("sale_inventory_consumptions", "UPDATE")),
    database.prepare(immutableTriggerDdl("sale_inventory_consumptions", "DELETE")),
    database.prepare(immutableTriggerDdl("sale_voids", "UPDATE")),
    database.prepare(immutableTriggerDdl("sale_voids", "DELETE")),
    database
      .prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'v1', ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `)
      .bind(SALE_VOIDS_SCHEMA_KEY, updatedAt),
  ]);
}

async function databaseRuntimeReady(database: D1Database): Promise<boolean> {
  try {
    const ready = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v1')
          AND EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v1')
          AND EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v1')
          AND EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v2')
          AND EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v2')
          AND EXISTS (SELECT 1 FROM app_meta
            WHERE key = 'schema.migration.closure-incidents-v2'
              AND value = 'v2')
          AND EXISTS (SELECT 1 FROM app_meta
            WHERE key = 'schema.migration.inventory-stock-entries-v1'
              AND value = 'v1')
          AND EXISTS (SELECT 1 FROM app_meta
            WHERE key = 'schema.migration.sale-voids-v1' AND value = 'v1')
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'shift_sessions'
              AND instr(sql, 'activity_revision') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sales'
              AND instr(sql, 'shift_session_id') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sale_payments'
              AND instr(sql, 'shift_session_id') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closures'
              AND instr(sql, 'request_fingerprint') > 0
              AND instr(sql, 'session_activity_revision') > 0
              AND instr(sql, 'closure_contract_version') > 0
              AND instr(sql, 'adjusted_difference_collected_clp') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_inventory'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_debts'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'index' AND name = 'idx_sale_payments_sale_id'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'index' AND name = 'idx_sale_payments_created_at'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'index'
              AND name = 'uq_sale_payments_direct_sale_id'
              AND instr(lower(sql), 'where') > 0
              AND instr(lower(sql), 'kind') > 0
          )
          AND NOT EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'index' AND name = 'uq_sale_payments_sale_id'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'trigger'
              AND name = 'trg_sale_payments_no_overpayment'
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (
              'idx_sales_shift_session_id',
              'idx_sale_payments_shift_session_id',
              'uq_shift_sessions_active_slot',
              'idx_shift_sessions_opened_at',
              'uq_cash_closures_session_id',
              'idx_cash_closure_inventory_item',
              'idx_cash_closure_debts_type',
              'trg_shift_sessions_immutable_assignment',
              'trg_shift_sessions_no_reopen'
            )
          ) = 9
          AND NOT EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'index'
              AND name IN (
                'uq_shift_sessions_business_date_shift',
                'uq_cash_closures_business_date_shift'
              )
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${cashClosureV2Artifacts.map(() => "?").join(", ")})
          ) = ?
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_validations'
              AND instr(sql, 'revision_number') > 0
              AND instr(sql, 'request_fingerprint') > 0
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${cashClosureRevisionArtifacts.map(() => "?").join(", ")})
          ) = ?
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'trigger'
              AND name = 'trg_cash_closure_revision_seals_insert_semantic_v2'
              AND instr(sql, 'sale_payments') > 0
              AND instr(sql, 'live_quantity_after') > 0
              AND instr(sql, 'later_session.closed_at') > 0
              AND instr(sql, 'included_sales_clp') > 0
              AND instr(sql, 'expected_inventory_line_count') > 0
              AND instr(sql, 'opening_cash_clp') > 0
              AND instr(sql, 'expenses_clp') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'trigger'
              AND name = 'trg_cash_closure_validations_insert_latest_revision_v2'
              AND instr(sql, 'request_fingerprint') > 0
              AND instr(sql, 'cash_closure_revision_seals') > 0
              AND instr(sql, 'IS NULL') > 0
              AND instr(sql, 'NOT EXISTS') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'cash_closure_inventory'
              AND instr(sql, 'reason_category') > 0
              AND instr(sql, 'incident_comment') > 0
          )
          AND EXISTS (
            SELECT 1 FROM pragma_table_info('closure_notification_deliveries')
            WHERE name = 'active_attempt_id'
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (${closureIncidentArtifacts.map(() => "?").join(", ")})
          ) = ?
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'inventory_stock_entries'
              AND instr(sql, 'operation_token') > 0
              AND instr(sql, 'quantity_after') > 0
          )
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (
              'inventory_stock_entries',
              'idx_inventory_stock_entries_item_created',
              'idx_inventory_stock_entries_created_at',
              'trg_inventory_stock_entries_apply_product',
              'trg_inventory_stock_entries_apply_ingredient',
              'trg_inventory_stock_entries_no_update',
              'trg_inventory_stock_entries_no_delete'
            )
          ) = 7
          AND (
            SELECT COUNT(*) FROM sqlite_schema
            WHERE name IN (
              'sale_inventory_snapshots',
              'sale_inventory_consumptions',
              'idx_sale_inventory_consumptions_sale_id',
              'sale_voids',
              'uq_sale_voids_sale_id',
              'idx_sale_voids_created_at',
              'idx_sale_voids_shift_session_id',
              'trg_sale_inventory_snapshots_no_update',
              'trg_sale_inventory_snapshots_no_delete',
              'trg_sale_inventory_consumptions_no_update',
              'trg_sale_inventory_consumptions_no_delete',
              'trg_sale_voids_no_update',
              'trg_sale_voids_no_delete'
            )
          ) = 13
        THEN 1 ELSE 0 END AS ready
      `)
      .bind(
        ACCOUNTING_BACKFILL_KEY,
        FORMAL_SHIFT_SCHEMA_KEY,
        PARTIAL_PAYMENTS_SCHEMA_KEY,
        CASH_CLOSURE_V2_SCHEMA_KEY,
        CASH_CLOSURE_REVISIONS_SCHEMA_KEY,
        ...cashClosureV2Artifacts,
        cashClosureV2Artifacts.length,
        ...cashClosureRevisionArtifacts,
        cashClosureRevisionArtifacts.length,
        ...closureIncidentArtifacts,
        closureIncidentArtifacts.length,
      )
      .first<{ ready: number }>();
    return Boolean(ready?.ready);
  } catch {
    // Bases anteriores a app_meta o con esquema parcial siguen el camino de
    // reparación completo. El marcador nunca se acepta sin verificar tablas.
    return false;
  }
}

async function accountingRuntimeReady(database: D1Database): Promise<boolean> {
  try {
    const ready = await database
      .prepare(`
        SELECT CASE WHEN
          EXISTS (SELECT 1 FROM app_meta WHERE key = ? AND value = 'v1')
          AND EXISTS (
            SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'products'
              AND instr(sql, 'stock_mode') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'sales'
              AND instr(sql, 'checkout_method') > 0
              AND instr(sql, 'business_date') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'sale_items'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'ingredients'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema
            WHERE type = 'table' AND name = 'product_ingredients'
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema WHERE type = 'table'
              AND name = 'sale_payments' AND instr(sql, 'kind') > 0
          )
          AND EXISTS (
            SELECT 1 FROM sqlite_schema WHERE type = 'table'
              AND name = 'cash_closures' AND instr(sql, 'expected_card_clp') > 0
          )
        THEN 1 ELSE 0 END AS ready
      `)
      .bind(ACCOUNTING_BACKFILL_KEY)
      .first<{ ready: number }>();
    return Boolean(ready?.ready);
  } catch {
    return false;
  }
}

async function initializeDatabase(): Promise<D1Database> {
  const database = getDatabaseBinding();

  if (await databaseRuntimeReady(database)) {
    await syncCatalog(database);
    return database;
  }
  if (await accountingRuntimeReady(database)) {
    if (!(await formalShiftSchemaComplete(database))) {
      await ensureFormalShiftSchema(database, true);
      throw new PosError(
        503,
        "La base de datos terminó una actualización. Reintenta la operación.",
      );
    }
    if (!(await partialPaymentsSchemaComplete(database))) {
      await ensurePartialPaymentsSchema(database);
      throw new PosError(
        503,
        "La base de datos terminó una actualización. Reintenta la operación.",
      );
    }
    if (!(await cashClosureV2SchemaComplete(database))) {
      await ensureCashClosureV2Schema(database);
      throw new PosError(
        503,
        "La base de datos terminó una actualización. Reintenta la operación.",
      );
    }
    if (!(await cashClosureRevisionsSchemaComplete(database))) {
      await ensureCashClosureRevisionsSchema(database);
      throw new PosError(
        503,
        "La base de datos terminó una actualización. Reintenta la operación.",
      );
    }
    if (!(await closureIncidentsSchemaComplete(database))) {
      await ensureClosureIncidentsSchema(database);
      await ensureInventoryStockEntriesSchema(database);
      throw new PosError(
        503,
        "La base de datos terminó una actualización. Reintenta la operación.",
      );
    }
    if (!(await inventoryStockEntriesSchemaComplete(database))) {
      await ensureInventoryStockEntriesSchema(database);
    }
    if (!(await saleVoidsSchemaComplete(database))) {
      await ensureSaleVoidsSchema(database);
    }
    await syncCatalog(database);
    return database;
  }

  await database.batch([
    database.prepare(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
      )
    `),
    database.prepare(shiftSessionsDdl),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_clp INTEGER NOT NULL,
        stock_mode TEXT DEFAULT 'untracked' NOT NULL,
        stock INTEGER,
        stock_vitrina INTEGER,
        stock_bodega INTEGER,
        active INTEGER DEFAULT 1 NOT NULL,
        catalog_managed INTEGER DEFAULT 0 NOT NULL,
        needs_price_review INTEGER DEFAULT 1 NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT products_price_clp_positive CHECK (price_clp > 0),
        CONSTRAINT products_stock_mode_allowed
          CHECK (stock_mode IN ('untracked', 'simple', 'split')),
        CONSTRAINT products_stock_shape_valid CHECK (
          (
            stock_mode = 'untracked'
            AND stock IS NULL
            AND stock_vitrina IS NULL
            AND stock_bodega IS NULL
          ) OR (
            stock_mode = 'simple'
            AND stock IS NOT NULL
            AND stock >= 0
            AND stock_vitrina IS NULL
            AND stock_bodega IS NULL
          ) OR (
            stock_mode = 'split'
            AND stock IS NULL
            AND stock_vitrina IS NOT NULL
            AND stock_vitrina >= 0
            AND stock_bodega IS NOT NULL
            AND stock_bodega >= 0
          )
        )
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock INTEGER NOT NULL,
        revision INTEGER DEFAULT 0 NOT NULL,
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        CONSTRAINT ingredients_stock_nonnegative CHECK (stock >= 0),
        CONSTRAINT ingredients_revision_nonnegative CHECK (revision >= 0)
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS product_ingredients (
        product_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (product_id, ingredient_id),
        CONSTRAINT product_ingredients_quantity_positive CHECK (quantity > 0),
        FOREIGN KEY (product_id) REFERENCES products(id)
          ON UPDATE NO ACTION ON DELETE CASCADE,
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
          ON UPDATE NO ACTION ON DELETE CASCADE
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
        business_date TEXT,
        shift TEXT,
        payment_status TEXT DEFAULT 'paid' NOT NULL,
        checkout_method TEXT NOT NULL,
        payment_method TEXT,
        debt_note TEXT,
        debtor_collaborator TEXT,
        paid_at TEXT,
        settlement_id TEXT,
        seller TEXT,
        total_clp INTEGER NOT NULL,
        CONSTRAINT sales_payment_status_allowed
          CHECK (payment_status IN ('paid', 'pending', 'verification_pending')),
        CONSTRAINT sales_shift_context_valid CHECK (
          (business_date IS NULL AND shift IS NULL)
          OR (
            business_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
            AND shift IN ('am', 'pm')
          )
        ),
        CONSTRAINT sales_checkout_method_allowed CHECK (
          checkout_method IN ('efectivo', 'tarjeta', 'transferencia', 'pendiente', 'colaborador')
        ),
        CONSTRAINT sales_payment_state_valid CHECK (
          (
            payment_status = 'verification_pending'
            AND checkout_method = 'transferencia'
            AND payment_method IS NULL
            AND debt_note IS NULL
            AND debtor_collaborator IS NULL
            AND paid_at IS NULL
            AND settlement_id IS NULL
          ) OR (
            payment_status = 'pending'
            AND payment_method IS NULL
            AND paid_at IS NULL
            AND settlement_id IS NULL
            AND (
              (
                checkout_method = 'pendiente'
                AND debt_note IS NOT NULL
                AND length(trim(debt_note)) BETWEEN 1 AND 500
                AND debtor_collaborator IS NULL
              ) OR (
                checkout_method = 'colaborador'
                AND debtor_collaborator IS NOT NULL
                AND length(trim(debtor_collaborator)) BETWEEN 1 AND 100
                AND (debt_note IS NULL OR length(trim(debt_note)) BETWEEN 1 AND 500)
              )
            )
          ) OR (
            payment_status = 'paid'
            AND payment_method IN ('efectivo', 'tarjeta', 'debito', 'credito', 'transferencia')
            AND paid_at IS NOT NULL
            AND (
              (
                checkout_method IN ('efectivo', 'tarjeta', 'transferencia')
                AND debt_note IS NULL
                AND debtor_collaborator IS NULL
                AND settlement_id IS NULL
              ) OR (
                checkout_method = 'pendiente'
                AND debt_note IS NOT NULL
                AND length(trim(debt_note)) BETWEEN 1 AND 500
                AND debtor_collaborator IS NULL
                AND settlement_id IS NOT NULL
              ) OR (
                checkout_method = 'colaborador'
                AND debtor_collaborator IS NOT NULL
                AND length(trim(debtor_collaborator)) BETWEEN 1 AND 100
                AND (debt_note IS NULL OR length(trim(debt_note)) BETWEEN 1 AND 500)
                AND settlement_id IS NOT NULL
              )
            )
          )
        ),
        CONSTRAINT sales_total_clp_positive CHECK (total_clp > 0)
      )
    `),
    database.prepare(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price_clp INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        line_total_clp INTEGER NOT NULL,
        CONSTRAINT sale_items_unit_price_positive CHECK (unit_price_clp > 0),
        CONSTRAINT sale_items_quantity_allowed CHECK (quantity BETWEEN 1 AND 99),
        CONSTRAINT sale_items_line_total_valid
          CHECK (line_total_clp = unit_price_clp * quantity),
        FOREIGN KEY (sale_id) REFERENCES sales(id)
          ON UPDATE NO ACTION ON DELETE CASCADE
      )
    `),
  ]);

  await upgradeDatabaseSchema(database);
  await ensureAccountingTables(database);
  await ensureFormalShiftSchema(database);
  await ensureTransferValidationsSchema(database);
  await ensurePartialPaymentsSchema(database);
  await ensureCashClosureV2Schema(database);
  if (!(await cashClosureRevisionsSchemaComplete(database))) {
    throw new PosError(
      503,
      "La base de datos terminó una actualización. Reintenta la operación.",
    );
  }
  if (!(await closureIncidentsSchemaComplete(database))) {
    await ensureClosureIncidentsSchema(database);
    await ensureInventoryStockEntriesSchema(database);
    throw new PosError(
      503,
      "La base de datos terminó una actualización. Reintenta la operación.",
    );
  }
  if (!(await inventoryStockEntriesSchemaComplete(database))) {
    await ensureInventoryStockEntriesSchema(database);
  }
  if (!(await saleVoidsSchemaComplete(database))) {
    await ensureSaleVoidsSchema(database);
  }
  await database.batch([
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_products_sku ON products (sku)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_products_active_category ON products (active, category, name)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients (name)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient_id ON product_ingredients (ingredient_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales (created_at)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sales_business_date_shift ON sales (business_date, shift)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sales_shift_session_id ON sales (shift_session_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sales_paid_at ON sales (paid_at)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sales_pending_created_at ON sales (created_at) WHERE payment_status = 'pending'",
    ),
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_settlement_id ON sales (settlement_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments (sale_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_payments_created_at ON sale_payments (created_at)",
    ),
    database.prepare(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sale_payments_direct_sale_id
      ON sale_payments (sale_id) WHERE kind = 'direct'
    `),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_payments_business_date_shift ON sale_payments (business_date, shift)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sale_payments_shift_session_id ON sale_payments (shift_session_id)",
    ),
    database.prepare(salePaymentsGuardDdl),
    database.prepare(
      "DROP INDEX IF EXISTS uq_shift_sessions_business_date_shift",
    ),
    database.prepare("DROP INDEX IF EXISTS uq_cash_closures_business_date_shift"),
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_sessions_active_slot ON shift_sessions (active_slot)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_shift_sessions_opened_at ON shift_sessions (opened_at)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_cash_closures_created_at ON cash_closures (created_at)",
    ),
    database.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_closures_session_id ON cash_closures (session_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_cash_closure_inventory_item ON cash_closure_inventory (item_type, item_id)",
    ),
    database.prepare(
      "CREATE INDEX IF NOT EXISTS idx_cash_closure_debts_type ON cash_closure_debts (closure_id, debt_type)",
    ),
    database.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_shift_sessions_immutable_assignment
      BEFORE UPDATE OF business_date, shift, responsible, opening_cash_clp,
        opened_at ON shift_sessions
      WHEN OLD.business_date <> NEW.business_date OR OLD.shift <> NEW.shift
        OR OLD.responsible <> NEW.responsible
        OR OLD.opening_cash_clp <> NEW.opening_cash_clp
        OR OLD.opened_at <> NEW.opened_at
      BEGIN
        SELECT RAISE(ABORT, 'shift session assignment is immutable');
      END
    `),
    database.prepare(`
      CREATE TRIGGER IF NOT EXISTS trg_shift_sessions_no_reopen
      BEFORE UPDATE OF status ON shift_sessions
      WHEN OLD.status = 'closed' AND NEW.status <> 'closed'
      BEGIN
        SELECT RAISE(ABORT, 'closed shift session cannot be reopened');
      END
    `),
  ]);

  await syncCatalog(database);
  return database;
}

export function ensureDatabase(): Promise<D1Database> {
  initialization ??= initializeDatabase().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}
