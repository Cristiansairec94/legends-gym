export type CatalogProduct = Readonly<{
  id: string;
  sku: null;
  name: string;
  category:
    | "Cafés"
    | "Alimentos"
    | "Batidos"
    | "Scoops"
    | "Refrigerador"
    | "Tienda";
  priceClp: number;
  stock: null;
  active: true;
  needsPriceReview: false;
}>;

export const CATALOG_VERSION = "2026-09-14.1";
export const CATALOG_SYNC_KEY = `catalog.migration.${CATALOG_VERSION}`;
export const INVENTORY_VERSION = "2026-08-31.2";
export const INVENTORY_SYNC_KEY = `inventory.initial-stock.${INVENTORY_VERSION}`;
export const MUFFIN_STOCK_VERSION = "2026-09-14.1";
export const MUFFIN_STOCK_SYNC_KEY =
  `inventory.shared-muffin.${MUFFIN_STOCK_VERSION}`;

const SUPERSEDED_CATALOG_MARKERS = Object.freeze([
  {
    key: "catalog.migration.2026-08-28.2",
    value: "2026-08-28.2",
  },
  {
    key: "catalog.migration.2026-08-31.1",
    value: "2026-08-31.1",
  },
  {
    key: "catalog.migration.2026-08-31.2",
    value: "2026-08-31.2",
  },
  {
    key: "catalog.migration.2026-09-01.1",
    value: "2026-09-01.1",
  },
] as const);

export const INITIAL_PRODUCT_INVENTORY = Object.freeze([
  {
    id: "nutri-quemador",
    stockMode: "split",
    stock: null,
    stockVitrina: 6,
    stockBodega: 0,
  },
  {
    id: "sobre-creatina-21g",
    stockMode: "split",
    stock: null,
    stockVitrina: 6,
    stockBodega: 0,
  },
  {
    id: "barra-proteina",
    stockMode: "simple",
    stock: 70,
    stockVitrina: null,
    stockBodega: null,
  },
  {
    id: "scoop-pre-entreno",
    stockMode: "split",
    stock: null,
    stockVitrina: 14,
    stockBodega: 0,
  },
  {
    id: "pre-entreno-low",
    stockMode: "split",
    stock: null,
    stockVitrina: 30,
    stockBodega: 0,
  },
  {
    id: "refrigerador-ice-coffee",
    stockMode: "simple",
    stock: 8,
    stockVitrina: null,
    stockBodega: null,
  },
  {
    id: "refrigerador-protein-shake",
    stockMode: "simple",
    stock: 3,
    stockVitrina: null,
    stockBodega: null,
  },
  {
    id: "refrigerador-isotonica",
    stockMode: "simple",
    stock: 12,
    stockVitrina: null,
    stockBodega: null,
  },
  {
    id: "refrigerador-agua",
    stockMode: "simple",
    stock: 21,
    stockVitrina: null,
    stockBodega: null,
  },
] as const);

export const CANONICAL_INGREDIENTS = Object.freeze([
  {
    id: "insumo-platano-porcion-batido",
    name: "Platano Porción Batido",
    unit: "porciones",
    initialStock: 27,
  },
  {
    id: "insumo-mix-berries-porcion-batido",
    name: "Mix Berries Porción Batido",
    unit: "porciones",
    initialStock: 4,
  },
  {
    id: "insumo-muffin-unidad",
    name: "Muffin",
    unit: "unidades",
    initialStock: 0,
  },
] as const);

export const CANONICAL_RECIPES = Object.freeze([
  {
    productId: "banana-fit",
    ingredientId: "insumo-platano-porcion-batido",
    quantity: 1,
  },
  {
    productId: "banana-fit-53g",
    ingredientId: "insumo-platano-porcion-batido",
    quantity: 1,
  },
  {
    productId: "berry-fit",
    ingredientId: "insumo-mix-berries-porcion-batido",
    quantity: 1,
  },
  {
    productId: "berry-fit-53g",
    ingredientId: "insumo-mix-berries-porcion-batido",
    quantity: 1,
  },
  {
    productId: "muffin",
    ingredientId: "insumo-muffin-unidad",
    quantity: 1,
  },
  {
    productId: "promo-cafe-muffin",
    ingredientId: "insumo-muffin-unidad",
    quantity: 1,
  },
] as const);

function product(
  id: string,
  name: string,
  category: CatalogProduct["category"],
  priceClp: number,
): CatalogProduct {
  return Object.freeze({
    id,
    sku: null,
    name,
    category,
    priceClp,
    stock: null,
    active: true,
    needsPriceReview: false,
  });
}

export const CANONICAL_PRODUCTS: readonly CatalogProduct[] = Object.freeze([
  product("cafe-espresso", "Espresso", "Cafés", 1500),
  product("cafe-americano", "Americano", "Cafés", 1900),
  product("cafe-cappuccino", "Capuchino", "Cafés", 2400),
  product("cafe-latte", "Latte macchiato", "Cafés", 2600),
  product("promo-cafe-muffin", "Promo Café + Muffin", "Cafés", 3200),
  product("barra-proteina", "Barra de proteína", "Alimentos", 2200),
  product("muffin", "Muffin", "Alimentos", 1500),
  product(
    "berry-fit",
    "Berry Fit · 32 g de proteína (normal)",
    "Batidos",
    3900,
  ),
  product(
    "berry-fit-53g",
    "Berry Fit · 53 g de proteína",
    "Batidos",
    5400,
  ),
  product(
    "banana-fit",
    "Banana Fit · 32 g de proteína (normal)",
    "Batidos",
    3900,
  ),
  product(
    "banana-fit-53g",
    "Banana Fit · 53 g de proteína",
    "Batidos",
    5400,
  ),
  product("scoop-proteina", "Proteína", "Scoops", 1800),
  product("scoop-creatina", "Creatina", "Scoops", 900),
  product(
    "refrigerador-ice-coffee",
    "Ice Coffee",
    "Refrigerador",
    2400,
  ),
  product(
    "refrigerador-protein-shake",
    "Protein Shake",
    "Refrigerador",
    3100,
  ),
  product("refrigerador-isotonica", "Isotónica", "Refrigerador", 1400),
  product("refrigerador-agua", "Agua", "Refrigerador", 800),
  product(
    "creatina-300g",
    "Creatina monohidrato 300 g",
    "Tienda",
    18990,
  ),
  product(
    "whey-700g",
    "Whey protein 700 g (3 sabores)",
    "Tienda",
    27990,
  ),
  product(
    "sobre-creatina-21g",
    "Creatina 21 g (sobre)",
    "Tienda",
    1690,
  ),
  product(
    "muscle-whey-isolate-5lb",
    "Whey isolate 5 lb (ancla)",
    "Tienda",
    69990,
  ),
  product(
    "nutri-quemador",
    "Termogénico (quemador)",
    "Tienda",
    25990,
  ),
  product("scoop-pre-entreno", "Pre entreno High", "Scoops", 1500),
  product("pre-entreno-low", "Pre entreno Low", "Scoops", 1300),
  product("toalla", "Toalla", "Tienda", 3000),
]);

export const LEGACY_PRODUCT_IDS = Object.freeze([
  "batido-proteico",
  "batido-frutal",
  "bebida-agua-sin-gas",
  "bebida-lata",
  "sport-protein-classic",
  "muestra-amino",
  "muestra-basic",
  "toalla-marca",
] as const);

export type HistoricalSeedFingerprint = Readonly<{
  id: string;
  sku: null;
  name: string;
  category: string;
  priceClp: number;
  needsPriceReview: boolean;
}>;

function historicalSeed(
  id: string,
  name: string,
  category: string,
  priceClp: number,
  needsPriceReview: boolean,
): HistoricalSeedFingerprint {
  return Object.freeze({
    id,
    sku: null,
    name,
    category,
    priceClp,
    needsPriceReview,
  });
}

export const HISTORICAL_SEED_FINGERPRINTS: readonly HistoricalSeedFingerprint[] =
  Object.freeze([
    historicalSeed("cafe-espresso", "Espresso", "Cafés", 1500, true),
    historicalSeed("cafe-americano", "Americano", "Cafés", 1900, true),
    historicalSeed(
      "cafe-cappuccino",
      "Cappuccino",
      "Cafés",
      2600,
      true,
    ),
    historicalSeed("cafe-latte", "Latte", "Cafés", 2600, true),
    historicalSeed(
      "batido-proteico",
      "Batido proteico",
      "Batidos",
      3700,
      true,
    ),
    historicalSeed(
      "batido-frutal",
      "Batido frutal",
      "Batidos",
      3300,
      true,
    ),
    historicalSeed(
      "bebida-agua-sin-gas",
      "Agua sin gas",
      "Bebidas",
      1000,
      true,
    ),
    historicalSeed(
      "bebida-lata",
      "Bebida en lata",
      "Bebidas",
      1500,
      true,
    ),
    historicalSeed(
      "sport-protein-classic",
      "Barra proteica clásica",
      "Suplementos",
      1890,
      false,
    ),
    historicalSeed(
      "creatina-300g",
      "Creatina monohidrato 300g",
      "Suplementos",
      18990,
      false,
    ),
    historicalSeed(
      "whey-700g",
      "Whey protein 700g",
      "Suplementos",
      27990,
      false,
    ),
    historicalSeed(
      "sobre-creatina-21g",
      "Sobre Creatina 21g",
      "Suplementos",
      1890,
      false,
    ),
    historicalSeed(
      "muestra-amino",
      "Muestra aminoácidos",
      "Suplementos",
      1300,
      false,
    ),
    historicalSeed(
      "muestra-basic",
      "Muestra Basic",
      "Suplementos",
      1300,
      false,
    ),
    historicalSeed(
      "toalla-marca",
      "Toalla de marca",
      "Accesorios",
      4490,
      false,
    ),
  ]);

type ReservedProductRow = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  price_clp: number;
  needs_price_review: number;
  catalog_managed: number;
};

const HISTORICAL_SEED_BY_ID = new Map(
  HISTORICAL_SEED_FINGERPRINTS.map((fingerprint) => [
    fingerprint.id,
    fingerprint,
  ]),
);

function matchesHistoricalSeed(row: ReservedProductRow): boolean {
  const fingerprint = HISTORICAL_SEED_BY_ID.get(row.id);
  return (
    fingerprint !== undefined &&
    row.sku === fingerprint.sku &&
    row.name === fingerprint.name &&
    row.category === fingerprint.category &&
    Number(row.price_clp) === fingerprint.priceClp &&
    Boolean(row.needs_price_review) === fingerprint.needsPriceReview
  );
}

export type CatalogSyncResult = {
  applied: boolean;
  version: string;
  canonicalProducts: number;
  legacyProducts: number;
};

export async function syncCatalog(
  database: D1Database,
  now = new Date(),
): Promise<CatalogSyncResult> {
  const current = await database
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .bind(CATALOG_SYNC_KEY)
    .first<{ value: string }>();

  const result = {
    applied: current === null,
    version: CATALOG_VERSION,
    canonicalProducts: CANONICAL_PRODUCTS.length,
    legacyProducts: LEGACY_PRODUCT_IDS.length,
  };
  if (!result.applied) return result;

  const reservedIds = [
    ...new Set([
      ...CANONICAL_PRODUCTS.map(({ id }) => id),
      ...LEGACY_PRODUCT_IDS,
    ]),
  ];
  const placeholders = reservedIds.map(() => "?").join(", ");
  const existing = await database
    .prepare(`
      SELECT
        id, sku, name, category, price_clp,
        needs_price_review, catalog_managed
      FROM products
      WHERE id IN (${placeholders})
    `)
    .bind(...reservedIds)
    .all<ReservedProductRow>();
  const unmanagedCollisions = existing.results.filter(
    (row) => !row.catalog_managed && !matchesHistoricalSeed(row),
  );
  if (unmanagedCollisions.length > 0) {
    throw new Error(
      `No se pudo sincronizar el catálogo: IDs reservados en uso (${unmanagedCollisions
        .map(({ id }) => id)
        .join(", ")}).`,
    );
  }

  const timestamp = now.toISOString();
  const statements: D1PreparedStatement[] = [];

  const fingerprintClauses = HISTORICAL_SEED_FINGERPRINTS.map(
    () => `(
      id = ? AND sku IS NULL AND name = ? AND category = ?
      AND price_clp = ? AND needs_price_review = ?
    )`,
  ).join(" OR ");
  const fingerprintValues = HISTORICAL_SEED_FINGERPRINTS.flatMap(
    (fingerprint) => [
      fingerprint.id,
      fingerprint.name,
      fingerprint.category,
      fingerprint.priceClp,
      fingerprint.needsPriceReview ? 1 : 0,
    ],
  );
  statements.push(
    database
      .prepare(`
        UPDATE products
        SET catalog_managed = 1
        WHERE catalog_managed = 0 AND (${fingerprintClauses})
      `)
      .bind(...fingerprintValues),
  );

  const productChunkSize = 16;
  for (
    let start = 0;
    start < CANONICAL_PRODUCTS.length;
    start += productChunkSize
  ) {
    const productChunk = CANONICAL_PRODUCTS.slice(
      start,
      start + productChunkSize,
    );
    const productValues = productChunk
      .map(() => "(?, NULL, ?, ?, ?, NULL, 1, 1, 0, ?, ?)")
      .join(", ");
    statements.push(
      database
        .prepare(`
          INSERT INTO products (
            id, sku, name, category, price_clp, stock, active,
            catalog_managed, needs_price_review, created_at, updated_at
          ) VALUES ${productValues}
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            price_clp = excluded.price_clp,
            active = 1,
            catalog_managed = 1,
            needs_price_review = 0,
            updated_at = excluded.updated_at
          WHERE products.catalog_managed = 1
        `)
        .bind(
          ...productChunk.flatMap((catalogProduct) => [
            catalogProduct.id,
            catalogProduct.name,
            catalogProduct.category,
            catalogProduct.priceClp,
            timestamp,
            timestamp,
          ]),
        ),
    );
  }

  const legacyPlaceholders = LEGACY_PRODUCT_IDS.map(() => "?").join(", ");
  statements.push(
    database
      .prepare(`
        DELETE FROM products
        WHERE catalog_managed = 1 AND id IN (${legacyPlaceholders})
      `)
      .bind(...LEGACY_PRODUCT_IDS),
  );

  const inventoryIds = INITIAL_PRODUCT_INVENTORY.map(({ id }) => id);
  const inventoryModeCases = INITIAL_PRODUCT_INVENTORY.map(
    () => "WHEN id = ? THEN ?",
  ).join(" ");
  const simpleStockCases = INITIAL_PRODUCT_INVENTORY.map(
    () => "WHEN id = ? THEN ?",
  ).join(" ");
  const showcaseStockCases = INITIAL_PRODUCT_INVENTORY.map(
    () => "WHEN id = ? THEN ?",
  ).join(" ");
  const warehouseStockCases = INITIAL_PRODUCT_INVENTORY.map(
    () => "WHEN id = ? THEN ?",
  ).join(" ");
  const inventoryPlaceholders = inventoryIds.map(() => "?").join(", ");
  statements.push(
    database
      .prepare(`
        UPDATE products
        SET
          stock_mode = CASE ${inventoryModeCases} ELSE stock_mode END,
          stock = CASE ${simpleStockCases} ELSE stock END,
          stock_vitrina = CASE ${showcaseStockCases} ELSE stock_vitrina END,
          stock_bodega = CASE ${warehouseStockCases} ELSE stock_bodega END,
          updated_at = ?
        WHERE catalog_managed = 1
          AND id IN (${inventoryPlaceholders})
          AND stock_mode = 'untracked'
          AND stock IS NULL
          AND stock_vitrina IS NULL
          AND stock_bodega IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM app_meta WHERE key = ?
          )
      `)
      .bind(
        ...INITIAL_PRODUCT_INVENTORY.flatMap(({ id, stockMode }) => [
          id,
          stockMode,
        ]),
        ...INITIAL_PRODUCT_INVENTORY.flatMap(({ id, stock }) => [id, stock]),
        ...INITIAL_PRODUCT_INVENTORY.flatMap(({ id, stockVitrina }) => [
          id,
          stockVitrina,
        ]),
        ...INITIAL_PRODUCT_INVENTORY.flatMap(({ id, stockBodega }) => [
          id,
          stockBodega,
        ]),
        timestamp,
        ...inventoryIds,
        INVENTORY_SYNC_KEY,
      ),
  );

  const ingredientValues = CANONICAL_INGREDIENTS.map(
    () => "(?, ?, ?, ?, 0, ?)",
  ).join(", ");
  statements.push(
    database
      .prepare(`
        INSERT INTO ingredients (
          id, name, unit, stock, revision, updated_at
        ) VALUES ${ingredientValues}
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          unit = excluded.unit
      `)
      .bind(
        ...CANONICAL_INGREDIENTS.flatMap(
          ({ id, name, unit, initialStock }) => [
            id,
            name,
            unit,
            initialStock,
            timestamp,
          ],
        ),
      ),
  );

  statements.push(
    database
      .prepare(`
        UPDATE ingredients
        SET
          stock = CASE
            WHEN EXISTS (
              SELECT 1 FROM products
              WHERE id = 'muffin'
                AND stock_mode IN ('simple', 'split')
            ) THEN (
              SELECT CASE
                WHEN stock_mode = 'simple' THEN COALESCE(stock, 0)
                ELSE COALESCE(stock_vitrina, 0) + COALESCE(stock_bodega, 0)
              END
              FROM products
              WHERE id = 'muffin'
            )
            ELSE stock
          END,
          revision = revision + CASE
            WHEN EXISTS (
              SELECT 1 FROM products
              WHERE id = 'muffin'
                AND stock_mode IN ('simple', 'split')
            ) THEN 1
            ELSE 0
          END,
          updated_at = ?
        WHERE id = 'insumo-muffin-unidad'
          AND NOT EXISTS (
            SELECT 1 FROM app_meta WHERE key = ?
          )
      `)
      .bind(timestamp, MUFFIN_STOCK_SYNC_KEY),
  );

  const recipeProductIds = [
    ...new Set(CANONICAL_RECIPES.map(({ productId }) => productId)),
  ];
  const recipeProductPlaceholders = recipeProductIds.map(() => "?").join(", ");
  statements.push(
    database
      .prepare(`
        UPDATE products
        SET
          stock_mode = 'untracked',
          stock = NULL,
          stock_vitrina = NULL,
          stock_bodega = NULL,
          updated_at = ?
        WHERE catalog_managed = 1
          AND id IN (${recipeProductPlaceholders})
      `)
      .bind(timestamp, ...recipeProductIds),
  );

  const recipeValues = CANONICAL_RECIPES.map(() => "(?, ?, ?)").join(", ");
  statements.push(
    database
      .prepare(`
        INSERT INTO product_ingredients (
          product_id, ingredient_id, quantity
        ) VALUES ${recipeValues}
        ON CONFLICT(product_id, ingredient_id) DO UPDATE SET
          quantity = excluded.quantity
      `)
      .bind(
        ...CANONICAL_RECIPES.flatMap(
          ({ productId, ingredientId, quantity }) => [
            productId,
            ingredientId,
            quantity,
          ],
        ),
      ),
  );

  const migrationMarkers = [
    ...SUPERSEDED_CATALOG_MARKERS,
    { key: INVENTORY_SYNC_KEY, value: INVENTORY_VERSION },
    { key: MUFFIN_STOCK_SYNC_KEY, value: MUFFIN_STOCK_VERSION },
    { key: CATALOG_SYNC_KEY, value: CATALOG_VERSION },
  ];
  const markerValues = migrationMarkers.map(() => "(?, ?, ?)").join(", ");
  statements.push(
    database
      .prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES ${markerValues}
        ON CONFLICT(key) DO NOTHING
      `)
      .bind(
        ...migrationMarkers.flatMap(({ key, value }) => [
          key,
          value,
          timestamp,
        ]),
      ),
  );

  await database.batch(statements);
  return result;
}
