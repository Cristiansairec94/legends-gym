import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import ts from "typescript";

async function compileModule(relativePath, replacements = []) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  let output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    fileName: relativePath,
  }).outputText;

  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }

  const url = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  return { module: await import(url), url };
}

const business = await compileModule("../lib/business.ts");
const errors = await compileModule("../db/errors.ts");
const incidents = await compileModule("../db/incidents.ts", [
  [/['"]@\/lib\/business['"]/g, JSON.stringify(business.url)],
  [/['"]\.\/errors['"]/g, JSON.stringify(errors.url)],
]);
const pos = await compileModule("../db/pos.ts", [
  [/['"]@\/lib\/business['"]/g, JSON.stringify(business.url)],
  [/['"]\.\/errors['"]/g, JSON.stringify(errors.url)],
  [/['"]\.\/incidents['"]/g, JSON.stringify(incidents.url)],
]);
const notifications = await compileModule("../db/notifications.ts", [
  [/['"]\.\/errors['"]/g, JSON.stringify(errors.url)],
  [/['"]\.\/incidents['"]/g, JSON.stringify(incidents.url)],
]);
const catalog = await compileModule("../db/catalog.ts");
const shared = await compileModule("../app/api/_shared.ts", [
  [/["']@\/db\/pos["']/g, JSON.stringify(pos.url)],
  [/["']@\/lib\/business["']/g, JSON.stringify(business.url)],
]);
const incidentValidation = await compileModule(
  "../app/api/closure-incidents/_validation.ts",
  [
    [/["']@\/db\/errors["']/g, JSON.stringify(errors.url)],
    [/["']@\/db\/incidents["']/g, JSON.stringify(incidents.url)],
    [/["']\.\.\/_shared["']/g, JSON.stringify(shared.url)],
  ],
);
const runtimeEnv = { DB: null };
globalThis.__cafeteriaRuntimeEnv = runtimeEnv;
const asModuleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const runtime = await compileModule("../db/index.ts", [
  [
    /["']cloudflare:workers["']/g,
    JSON.stringify(
      asModuleUrl("export const env = globalThis.__cafeteriaRuntimeEnv;"),
    ),
  ],
  [
    /["']drizzle-orm\/d1["']/g,
    JSON.stringify(asModuleUrl("export const drizzle = () => ({});")),
  ],
  [
    /["']\.\/catalog["']/g,
    JSON.stringify(catalog.url),
  ],
  [/["']\.\/errors["']/g, JSON.stringify(errors.url)],
  [/["']\.\/schema["']/g, JSON.stringify(asModuleUrl("export {};"))],
]);

test("el catálogo canónico contiene los 25 productos reales sin duplicados", () => {
  assert.equal(catalog.module.CATALOG_VERSION, "2026-09-14.1");
  assert.deepEqual(
    catalog.module.CANONICAL_PRODUCTS.map(
      ({ id, name, category, priceClp }) => [id, name, category, priceClp],
    ),
    [
      ["cafe-espresso", "Espresso", "Cafés", 1500],
      ["cafe-americano", "Americano", "Cafés", 1900],
      ["cafe-cappuccino", "Capuchino", "Cafés", 2400],
      ["cafe-latte", "Latte macchiato", "Cafés", 2600],
      ["promo-cafe-muffin", "Promo Café + Muffin", "Cafés", 3200],
      ["barra-proteina", "Barra de proteína", "Alimentos", 2200],
      ["muffin", "Muffin", "Alimentos", 1500],
      [
        "berry-fit",
        "Berry Fit · 32 g de proteína (normal)",
        "Batidos",
        3900,
      ],
      [
        "berry-fit-53g",
        "Berry Fit · 53 g de proteína",
        "Batidos",
        5400,
      ],
      [
        "banana-fit",
        "Banana Fit · 32 g de proteína (normal)",
        "Batidos",
        3900,
      ],
      [
        "banana-fit-53g",
        "Banana Fit · 53 g de proteína",
        "Batidos",
        5400,
      ],
      ["scoop-proteina", "Proteína", "Scoops", 1800],
      ["scoop-creatina", "Creatina", "Scoops", 900],
      ["refrigerador-ice-coffee", "Ice Coffee", "Refrigerador", 2400],
      [
        "refrigerador-protein-shake",
        "Protein Shake",
        "Refrigerador",
        3100,
      ],
      ["refrigerador-isotonica", "Isotónica", "Refrigerador", 1400],
      ["refrigerador-agua", "Agua", "Refrigerador", 800],
      [
        "creatina-300g",
        "Creatina monohidrato 300 g",
        "Tienda",
        18990,
      ],
      [
        "whey-700g",
        "Whey protein 700 g (3 sabores)",
        "Tienda",
        27990,
      ],
      [
        "sobre-creatina-21g",
        "Creatina 21 g (sobre)",
        "Tienda",
        1690,
      ],
      [
        "muscle-whey-isolate-5lb",
        "Whey isolate 5 lb (ancla)",
        "Tienda",
        69990,
      ],
      [
        "nutri-quemador",
        "Termogénico (quemador)",
        "Tienda",
        25990,
      ],
      ["scoop-pre-entreno", "Pre entreno High", "Scoops", 1500],
      ["pre-entreno-low", "Pre entreno Low", "Scoops", 1300],
      ["toalla", "Toalla", "Tienda", 3000],
    ],
  );

  const products = catalog.module.CANONICAL_PRODUCTS;
  assert.equal(products.length, 25);
  assert.equal(new Set(products.map(({ id }) => id)).size, 25);
  assert.equal(products.filter(({ name }) => name === "Pre entreno").length, 0);
  assert.equal(products.filter(({ name }) => name === "Pre entreno High").length, 1);
  assert.equal(products.filter(({ name }) => name === "Pre entreno Low").length, 1);
  assert.equal(
    products.filter(({ name }) => name.toLocaleLowerCase("es").includes("multivitamina"))
      .length,
    0,
  );
  assert.ok(
    products.every(
      ({ sku, stock, active, needsPriceReview }) =>
        sku === null &&
        stock === null &&
        active === true &&
        needsPriceReview === false,
    ),
  );
  assert.deepEqual(
    [...catalog.module.LEGACY_PRODUCT_IDS],
    [
      "batido-proteico",
      "batido-frutal",
      "bebida-agua-sin-gas",
      "bebida-lata",
      "sport-protein-classic",
      "muestra-amino",
      "muestra-basic",
      "toalla-marca",
    ],
  );
  assert.ok(
    catalog.module.LEGACY_PRODUCT_IDS.every(
      (id) => !products.some((product) => product.id === id),
    ),
  );
  assert.deepEqual(
    catalog.module.HISTORICAL_SEED_FINGERPRINTS.map(
      ({ id, sku, name, category, priceClp, needsPriceReview }) => [
        id,
        sku,
        name,
        category,
        priceClp,
        needsPriceReview,
      ],
    ),
    [
      ["cafe-espresso", null, "Espresso", "Cafés", 1500, true],
      ["cafe-americano", null, "Americano", "Cafés", 1900, true],
      ["cafe-cappuccino", null, "Cappuccino", "Cafés", 2600, true],
      ["cafe-latte", null, "Latte", "Cafés", 2600, true],
      [
        "batido-proteico",
        null,
        "Batido proteico",
        "Batidos",
        3700,
        true,
      ],
      [
        "batido-frutal",
        null,
        "Batido frutal",
        "Batidos",
        3300,
        true,
      ],
      [
        "bebida-agua-sin-gas",
        null,
        "Agua sin gas",
        "Bebidas",
        1000,
        true,
      ],
      ["bebida-lata", null, "Bebida en lata", "Bebidas", 1500, true],
      [
        "sport-protein-classic",
        null,
        "Barra proteica clásica",
        "Suplementos",
        1890,
        false,
      ],
      [
        "creatina-300g",
        null,
        "Creatina monohidrato 300g",
        "Suplementos",
        18990,
        false,
      ],
      [
        "whey-700g",
        null,
        "Whey protein 700g",
        "Suplementos",
        27990,
        false,
      ],
      [
        "sobre-creatina-21g",
        null,
        "Sobre Creatina 21g",
        "Suplementos",
        1890,
        false,
      ],
      [
        "muestra-amino",
        null,
        "Muestra aminoácidos",
        "Suplementos",
        1300,
        false,
      ],
      [
        "muestra-basic",
        null,
        "Muestra Basic",
        "Suplementos",
        1300,
        false,
      ],
      [
        "toalla-marca",
        null,
        "Toalla de marca",
        "Accesorios",
        4490,
        false,
      ],
    ],
  );
});

function catalogDatabase(metaValue, existingProducts = []) {
  const prepared = [];
  const batches = [];
  const database = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async first() {
          if (sql.includes("SELECT value") && metaValue !== null) {
            return { value: metaValue };
          }
          return null;
        },
        async all() {
          if (sql.includes("needs_price_review, catalog_managed")) {
            return { results: existingProducts };
          }
          return { results: [] };
        },
      };
      prepared.push(statement);
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return [];
    },
  };
  return { database, prepared, batches };
}

function sqliteD1Adapter(sqlite) {
  let batchCalls = 0;
  let prepareCalls = 0;
  let maxBindValues = 0;
  let maxBatchStatements = 0;
  const database = {
    prepare(sql) {
      prepareCalls += 1;
      const statement = {
        values: [],
        bind(...values) {
          maxBindValues = Math.max(maxBindValues, values.length);
          statement.values = values;
          return statement;
        },
        async first() {
          return sqlite.prepare(sql).get(...statement.values) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...statement.values) };
        },
        async run() {
          const result = sqlite.prepare(sql).run(...statement.values);
          return {
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
        runSync() {
          return sqlite.prepare(sql).run(...statement.values);
        },
      };
      return statement;
    },
    async batch(statements) {
      batchCalls += 1;
      maxBatchStatements = Math.max(maxBatchStatements, statements.length);
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => {
          const result = statement.runSync();
          return {
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return {
    database,
    getBatchCalls: () => batchCalls,
    getPrepareCalls: () => prepareCalls,
    getMaxBindValues: () => maxBindValues,
    getMaxBatchStatements: () => maxBatchStatements,
  };
}

function assertIncidentMigrationBudget(adapter) {
  // Incidencias crea más descriptores locales con prepare(), pero mantiene cada
  // operación D1 real bajo los límites conservadores del batch y sus bindings.
  assert.ok(
    adapter.getPrepareCalls() < 100,
    `migrar incidencias preparó ${adapter.getPrepareCalls()} consultas`,
  );
  assert.ok(
    adapter.getMaxBatchStatements() < 50,
    `migrar incidencias agrupó ${adapter.getMaxBatchStatements()} sentencias`,
  );
  assert.ok(
    adapter.getMaxBindValues() <= 100,
    `migrar incidencias enlazó ${adapter.getMaxBindValues()} valores`,
  );
}

test("la sincronización aplica una versión una sola vez y preserva el stock", async () => {
  const firstRun = catalogDatabase(null);
  const timestamp = new Date("2026-08-27T12:00:00.000Z");
  const result = await catalog.module.syncCatalog(firstRun.database, timestamp);

  assert.deepEqual(result, {
    applied: true,
    version: catalog.module.CATALOG_VERSION,
    canonicalProducts: 25,
    legacyProducts: 8,
  });
  assert.equal(firstRun.batches.length, 1);
  const statements = firstRun.batches[0];
  const upserts = statements.filter(({ sql }) =>
    sql.includes("INSERT INTO products"),
  );
  const deletionStatements = statements.filter(({ sql }) =>
    sql.includes("DELETE FROM products"),
  );
  const ownershipClaims = statements.filter(({ sql }) =>
    sql.includes("SET catalog_managed = 1"),
  );
  const versionWrites = statements.filter(({ sql }) =>
    sql.includes("INSERT INTO app_meta"),
  );
  assert.equal(upserts.length, 2);
  assert.equal(deletionStatements.length, 1);
  assert.equal(ownershipClaims.length, 1);
  assert.equal(versionWrites.length, 1);
  assert.ok(upserts.every(({ sql }) => !sql.includes("stock = excluded")));
  assert.ok(
    upserts.every(({ sql }) =>
      sql.includes("WHERE products.catalog_managed = 1"),
    ),
  );
  assert.deepEqual(
    upserts.flatMap(({ values }) =>
      values.filter((_value, index) => index % 6 === 0),
    ),
    catalog.module.CANONICAL_PRODUCTS.map(({ id }) => id),
  );
  assert.deepEqual(
    deletionStatements[0].values,
    [...catalog.module.LEGACY_PRODUCT_IDS],
  );
  assert.ok(
    deletionStatements[0].sql.includes(
      "WHERE catalog_managed = 1 AND id IN",
    ),
  );
  assert.ok(
    statements.findLastIndex(({ sql }) =>
      sql.includes("SET catalog_managed = 1"),
    ) <
      statements.findIndex(({ sql }) => sql.includes("INSERT INTO products")),
  );
  assert.ok(
    statements.findLastIndex(({ sql }) =>
      sql.includes("INSERT INTO products"),
    ) <
      statements.findIndex(({ sql }) => sql.includes("DELETE FROM products")),
  );
  assert.deepEqual(versionWrites[0].values.slice(-3), [
    catalog.module.CATALOG_SYNC_KEY,
    catalog.module.CATALOG_VERSION,
    timestamp.toISOString(),
  ]);
  assert.equal(
    catalog.module.CATALOG_SYNC_KEY,
    `catalog.migration.${catalog.module.CATALOG_VERSION}`,
  );

  const currentRun = catalogDatabase(catalog.module.CATALOG_VERSION);
  const skipped = await catalog.module.syncCatalog(currentRun.database, timestamp);
  assert.equal(skipped.applied, false);
  assert.equal(currentRun.batches.length, 0);
  assert.equal(currentRun.prepared.length, 1);
});

test("la sincronización no sobrescribe una variante creada por el usuario", async () => {
  const collision = catalogDatabase(null, [
    { id: "berry-fit-53g", catalog_managed: 0 },
  ]);

  await assert.rejects(
    () => catalog.module.syncCatalog(collision.database),
    /IDs reservados en uso \(berry-fit-53g\)/,
  );
  assert.equal(collision.batches.length, 0);
});

test("la sincronización rechaza un legacy alterado y acepta el fingerprint exacto", async () => {
  const alteredLegacy = catalogDatabase(null, [
    {
      id: "batido-proteico",
      sku: null,
      name: "Batido personalizado",
      category: "Batidos",
      price_clp: 3700,
      needs_price_review: 1,
      catalog_managed: 0,
    },
  ]);
  await assert.rejects(
    () => catalog.module.syncCatalog(alteredLegacy.database),
    /IDs reservados en uso \(batido-proteico\)/,
  );
  assert.equal(alteredLegacy.batches.length, 0);

  const exactLegacy = catalogDatabase(null, [
    {
      id: "batido-proteico",
      sku: null,
      name: "Batido proteico",
      category: "Batidos",
      price_clp: 3700,
      needs_price_review: 1,
      catalog_managed: 0,
    },
  ]);
  const result = await catalog.module.syncCatalog(exactLegacy.database);
  assert.equal(result.applied, true);
  assert.equal(exactLegacy.batches.length, 1);
});

test("la sincronización real preserva stock e historial y elimina solo los legacy", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(`
      CREATE TABLE app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE products (
        id TEXT PRIMARY KEY NOT NULL,
        sku TEXT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price_clp INTEGER NOT NULL,
        stock_mode TEXT NOT NULL DEFAULT 'untracked',
        stock INTEGER,
        stock_vitrina INTEGER,
        stock_bodega INTEGER,
        active INTEGER NOT NULL,
        catalog_managed INTEGER NOT NULL,
        needs_price_review INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE ingredients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        stock INTEGER NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE product_ingredients (
        product_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        PRIMARY KEY (product_id, ingredient_id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
      );
      CREATE TABLE sales (
        id TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        seller TEXT,
        total_clp INTEGER NOT NULL
      );
      CREATE TABLE sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price_clp INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        line_total_clp INTEGER NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      );
    `);
    const oldTimestamp = "2026-08-27T10:00:00.000Z";
    const insertSeed = sqlite.prepare(`
      INSERT INTO products (
        id, sku, name, category, price_clp, stock_mode, stock, active,
        catalog_managed, needs_price_review, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
    `);
    for (const fingerprint of catalog.module.HISTORICAL_SEED_FINGERPRINTS) {
      const initialStock = fingerprint.id === "cafe-espresso" ? 7 : null;
      insertSeed.run(
        fingerprint.id,
        fingerprint.name,
        fingerprint.category,
        fingerprint.priceClp,
        initialStock === null ? "untracked" : "simple",
        initialStock,
        fingerprint.needsPriceReview ? 1 : 0,
        oldTimestamp,
        oldTimestamp,
      );
    }
    const insertManagedProduct = sqlite.prepare(`
      INSERT INTO products (
        id, sku, name, category, price_clp, stock_mode, stock, active,
        catalog_managed, needs_price_review, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, 'simple', ?, 1, 1, 0, ?, ?)
    `);
    insertManagedProduct.run(
      "berry-fit",
      "Berry Fit",
      "Batidos",
      3000,
      11,
      oldTimestamp,
      oldTimestamp,
    );
    insertManagedProduct.run(
      "banana-fit",
      "Banana Fit",
      "Batidos",
      3000,
      6,
      oldTimestamp,
      oldTimestamp,
    );
    insertManagedProduct.run(
      "muffin",
      "Muffin",
      "Alimentos",
      2000,
      9,
      oldTimestamp,
      oldTimestamp,
    );
    sqlite
      .prepare(`
        INSERT INTO products (
          id, sku, name, category, price_clp, stock_mode, stock, active,
          catalog_managed, needs_price_review, created_at, updated_at
        ) VALUES (?, NULL, ?, ?, ?, 'untracked', NULL, 1, 1, 0, ?, ?)
      `)
      .run(
        "scoop-pre-entreno",
        "Pre entreno",
        "Scoops",
        2000,
        oldTimestamp,
        oldTimestamp,
      );
    sqlite
      .prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, ?, ?)
      `)
      .run(
        "catalog.migration.2026-08-28.1",
        "2026-08-28.1",
        oldTimestamp,
      );
    for (const [key, value] of [
      ["catalog.migration.2026-08-31.1", "2026-08-31.1"],
      ["catalog.migration.2026-08-31.2", "2026-08-31.2"],
      ["inventory.initial-stock.2026-08-31.1", "2026-08-31.1"],
    ]) {
      sqlite
        .prepare(`
          INSERT INTO app_meta (key, value, updated_at)
          VALUES (?, ?, ?)
        `)
        .run(key, value, oldTimestamp);
    }
    sqlite
      .prepare(`
        INSERT INTO products (
          id, sku, name, category, price_clp, stock_mode, stock, active,
          catalog_managed, needs_price_review, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'simple', ?, ?, 0, ?, ?, ?)
      `)
      .run(
        "usuario-ajeno",
        "USR-01",
        "Producto del usuario",
        "Personalizados",
        7777,
        4,
        1,
        1,
        oldTimestamp,
        oldTimestamp,
      );
    sqlite
      .prepare(`
        INSERT INTO sales (id, created_at, payment_method, seller, total_clp)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run("venta-historica", oldTimestamp, "efectivo", null, 3000);
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity, line_total_clp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        "venta-historica",
        "berry-fit",
        "Berry Fit",
        3000,
        1,
        3000,
      );
    sqlite
      .prepare(`
        INSERT INTO sales (id, created_at, payment_method, seller, total_clp)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run("venta-pre-entreno-historica", oldTimestamp, "efectivo", null, 2000);
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity, line_total_clp
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        "venta-pre-entreno-historica",
        "scoop-pre-entreno",
        "Pre entreno",
        2000,
        1,
        2000,
      );

    const adapter = sqliteD1Adapter(sqlite);
    const applied = await catalog.module.syncCatalog(
      adapter.database,
      new Date("2026-08-28T12:00:00.000Z"),
    );
    assert.equal(applied.applied, true);
    assert.equal(adapter.getBatchCalls(), 1);
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM products").get().count,
      26,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM products WHERE catalog_managed = 1",
        )
        .get().count,
      25,
    );
    const espresso = sqlite
      .prepare(`
        SELECT name, price_clp, stock, active, catalog_managed, needs_price_review
        FROM products WHERE id = 'cafe-espresso'
      `)
      .get();
    assert.deepEqual({ ...espresso }, {
      name: "Espresso",
      price_clp: 1500,
      stock: 7,
      active: 1,
      catalog_managed: 1,
      needs_price_review: 0,
    });
    const berryFit = sqlite
      .prepare(`
        SELECT name, price_clp, stock_mode, stock, active, catalog_managed
        FROM products WHERE id = 'berry-fit'
      `)
      .get();
    assert.deepEqual({ ...berryFit }, {
      name: "Berry Fit · 32 g de proteína (normal)",
      price_clp: 3900,
      stock_mode: "untracked",
      stock: null,
      active: 1,
      catalog_managed: 1,
    });
    const bananaFit = sqlite
      .prepare(`
        SELECT name, price_clp, stock_mode, stock, active, catalog_managed
        FROM products WHERE id = 'banana-fit'
      `)
      .get();
    assert.deepEqual({ ...bananaFit }, {
      name: "Banana Fit · 32 g de proteína (normal)",
      price_clp: 3900,
      stock_mode: "untracked",
      stock: null,
      active: 1,
      catalog_managed: 1,
    });
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, name, price_clp, stock_mode, stock
          FROM products
          WHERE id IN ('muffin', 'promo-cafe-muffin')
          ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "muffin",
          name: "Muffin",
          price_clp: 1500,
          stock_mode: "untracked",
          stock: null,
        },
        {
          id: "promo-cafe-muffin",
          name: "Promo Café + Muffin",
          price_clp: 3200,
          stock_mode: "untracked",
          stock: null,
        },
      ],
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, name, price_clp, stock
          FROM products
          WHERE id IN ('berry-fit-53g', 'banana-fit-53g')
          ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "banana-fit-53g",
          name: "Banana Fit · 53 g de proteína",
          price_clp: 5400,
          stock: null,
        },
        {
          id: "berry-fit-53g",
          name: "Berry Fit · 53 g de proteína",
          price_clp: 5400,
          stock: null,
        },
      ],
    );
    const legacyPlaceholders = catalog.module.LEGACY_PRODUCT_IDS.map(
      () => "?",
    ).join(", ");
    assert.equal(
      sqlite
        .prepare(
          `SELECT COUNT(*) AS count FROM products WHERE id IN (${legacyPlaceholders})`,
        )
        .get(...catalog.module.LEGACY_PRODUCT_IDS).count,
      0,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT sku, name, category, price_clp, stock, active, catalog_managed,
                   needs_price_review, created_at, updated_at
            FROM products WHERE id = 'usuario-ajeno'
          `)
          .get(),
      },
      {
        sku: "USR-01",
        name: "Producto del usuario",
        category: "Personalizados",
        price_clp: 7777,
        stock: 4,
        active: 1,
        catalog_managed: 0,
        needs_price_review: 1,
        created_at: oldTimestamp,
        updated_at: oldTimestamp,
      },
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sales").get().count,
      2,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT product_id, product_name, unit_price_clp, quantity, line_total_clp
            FROM sale_items WHERE sale_id = 'venta-historica'
          `)
          .get(),
      },
      {
        product_id: "berry-fit",
        product_name: "Berry Fit",
        unit_price_clp: 3000,
        quantity: 1,
        line_total_clp: 3000,
      },
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT product_id, product_name, unit_price_clp, quantity, line_total_clp
            FROM sale_items WHERE sale_id = 'venta-pre-entreno-historica'
          `)
          .get(),
      },
      {
        product_id: "scoop-pre-entreno",
        product_name: "Pre entreno",
        unit_price_clp: 2000,
        quantity: 1,
        line_total_clp: 2000,
      },
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT name, category, price_clp
            FROM products WHERE id = 'scoop-pre-entreno'
          `)
          .get(),
      },
      {
        name: "Pre entreno High",
        category: "Scoops",
        price_clp: 1500,
      },
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, stock_mode, stock, stock_vitrina, stock_bodega
          FROM products
          WHERE id IN (
            'nutri-quemador', 'sobre-creatina-21g', 'barra-proteina',
            'scoop-pre-entreno', 'pre-entreno-low',
            'refrigerador-ice-coffee', 'refrigerador-protein-shake',
            'refrigerador-isotonica', 'refrigerador-agua'
          )
          ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "barra-proteina",
          stock_mode: "simple",
          stock: 70,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "nutri-quemador",
          stock_mode: "split",
          stock: null,
          stock_vitrina: 6,
          stock_bodega: 0,
        },
        {
          id: "pre-entreno-low",
          stock_mode: "split",
          stock: null,
          stock_vitrina: 30,
          stock_bodega: 0,
        },
        {
          id: "refrigerador-agua",
          stock_mode: "simple",
          stock: 21,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "refrigerador-ice-coffee",
          stock_mode: "simple",
          stock: 8,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "refrigerador-isotonica",
          stock_mode: "simple",
          stock: 12,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "refrigerador-protein-shake",
          stock_mode: "simple",
          stock: 3,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "scoop-pre-entreno",
          stock_mode: "split",
          stock: null,
          stock_vitrina: 14,
          stock_bodega: 0,
        },
        {
          id: "sobre-creatina-21g",
          stock_mode: "split",
          stock: null,
          stock_vitrina: 6,
          stock_bodega: 0,
        },
      ],
    );
    assert.deepEqual(
      sqlite
        .prepare("SELECT id, stock, revision FROM ingredients ORDER BY id")
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "insumo-mix-berries-porcion-batido",
          stock: 4,
          revision: 0,
        },
        {
          id: "insumo-muffin-unidad",
          stock: 9,
          revision: 1,
        },
        {
          id: "insumo-platano-porcion-batido",
          stock: 27,
          revision: 0,
        },
      ],
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT product_id, ingredient_id, quantity
          FROM product_ingredients
          ORDER BY product_id
        `)
        .all()
        .map((row) => ({ ...row })),
      [...catalog.module.CANONICAL_RECIPES]
        .sort((left, right) => left.productId.localeCompare(right.productId))
        .map(({ productId, ingredientId, quantity }) => ({
          product_id: productId,
          ingredient_id: ingredientId,
          quantity,
        })),
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT key, value FROM app_meta
          WHERE key IN (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ORDER BY key
        `)
        .all(
          "catalog.migration.2026-08-28.1",
          "catalog.migration.2026-08-28.2",
          "catalog.migration.2026-08-31.1",
          "catalog.migration.2026-08-31.2",
          "catalog.migration.2026-09-01.1",
          "inventory.initial-stock.2026-08-31.1",
          catalog.module.INVENTORY_SYNC_KEY,
          catalog.module.MUFFIN_STOCK_SYNC_KEY,
          catalog.module.CATALOG_SYNC_KEY,
        )
        .map((row) => ({ ...row })),
      [
        {
          key: "catalog.migration.2026-08-28.1",
          value: "2026-08-28.1",
        },
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
        {
          key: "inventory.initial-stock.2026-08-31.1",
          value: "2026-08-31.1",
        },
        {
          key: catalog.module.CATALOG_SYNC_KEY,
          value: catalog.module.CATALOG_VERSION,
        },
        {
          key: catalog.module.INVENTORY_SYNC_KEY,
          value: catalog.module.INVENTORY_VERSION,
        },
        {
          key: catalog.module.MUFFIN_STOCK_SYNC_KEY,
          value: catalog.module.MUFFIN_STOCK_VERSION,
        },
      ].sort((left, right) => left.key.localeCompare(right.key)),
    );

    sqlite
      .prepare(
        "UPDATE products SET stock_vitrina = 2 WHERE id = 'nutri-quemador'",
      )
      .run();
    sqlite
      .prepare(
        "UPDATE ingredients SET stock = 1 WHERE id = 'insumo-platano-porcion-batido'",
      )
      .run();
    sqlite
      .prepare(
        "UPDATE ingredients SET stock = 3 WHERE id = 'insumo-muffin-unidad'",
      )
      .run();
    sqlite
      .prepare(
        "UPDATE products SET stock_vitrina = 9 WHERE id = 'scoop-pre-entreno'",
      )
      .run();
    sqlite
      .prepare(
        "UPDATE products SET stock = 5 WHERE id = 'refrigerador-ice-coffee'",
      )
      .run();
    const rerun = await catalog.module.syncCatalog(adapter.database);
    assert.equal(rerun.applied, false);
    assert.equal(adapter.getBatchCalls(), 1);
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock_vitrina FROM products WHERE id = 'nutri-quemador'",
        )
        .get().stock_vitrina,
      2,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock_vitrina FROM products WHERE id = 'scoop-pre-entreno'",
        )
        .get().stock_vitrina,
      9,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM products WHERE id = 'refrigerador-ice-coffee'",
        )
        .get().stock,
      5,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM ingredients WHERE id = 'insumo-muffin-unidad'",
        )
        .get().stock,
      3,
    );

    sqlite
      .prepare(`
        UPDATE products
        SET stock_mode = 'untracked', stock = NULL,
            stock_vitrina = NULL, stock_bodega = NULL
        WHERE id = 'nutri-quemador'
      `)
      .run();
    sqlite
      .prepare("DELETE FROM app_meta WHERE key = ?")
      .run(catalog.module.CATALOG_SYNC_KEY);
    const laterCatalogVersion = await catalog.module.syncCatalog(
      adapter.database,
      new Date("2026-09-01T12:00:00.000Z"),
    );
    assert.equal(laterCatalogVersion.applied, true);
    assert.equal(adapter.getBatchCalls(), 2);
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT stock_mode, stock, stock_vitrina, stock_bodega
            FROM products WHERE id = 'nutri-quemador'
          `)
          .get(),
      },
      {
        stock_mode: "untracked",
        stock: null,
        stock_vitrina: null,
        stock_bodega: null,
      },
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM ingredients WHERE id = 'insumo-platano-porcion-batido'",
        )
        .get().stock,
      1,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM ingredients WHERE id = 'insumo-muffin-unidad'",
        )
        .get().stock,
      3,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock_vitrina FROM products WHERE id = 'scoop-pre-entreno'",
        )
        .get().stock_vitrina,
      9,
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM products WHERE id = 'refrigerador-ice-coffee'",
        )
        .get().stock,
      5,
    );
  } finally {
    sqlite.close();
  }
});

async function applyGeneratedMigrations(sqlite) {
  for (const migration of [
    "../drizzle/0000_chief_silver_samurai.sql",
    "../drizzle/0001_equal_namor.sql",
    "../drizzle/0002_slippery_dragon_lord.sql",
    "../drizzle/0003_keen_johnny_storm.sql",
    "../drizzle/0004_youthful_namorita.sql",
    "../drizzle/0005_thin_sebastian_shaw.sql",
    "../drizzle/0006_sturdy_starfox.sql",
    "../drizzle/0007_careful_dark_beast.sql",
    "../drizzle/0008_charming_loa.sql",
    "../drizzle/0009_regular_dreaming_celestial.sql",
    "../drizzle/0010_narrow_stepford_cuckoos.sql",
    "../drizzle/0011_romantic_moira_mactaggert.sql",
    "../drizzle/0012_add_historical_cash_totals.sql",
    "../drizzle/0013_shocking_vermin.sql",
    "../drizzle/0014_right_sentry.sql",
    "../drizzle/0015_square_sway.sql",
    "../drizzle/0016_nifty_colleen_wing.sql",
  ]) {
    const sql = await readFile(new URL(migration, import.meta.url), "utf8");
    sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }
}

test("el artefacto de despliegue instala triggers complejos mediante el reparador runtime", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../dist/migrations/0000_chief_silver_samurai.sql",
      "../dist/migrations/0001_equal_namor.sql",
      "../dist/migrations/0002_slippery_dragon_lord.sql",
      "../dist/migrations/0003_keen_johnny_storm.sql",
      "../dist/migrations/0004_youthful_namorita.sql",
      "../dist/migrations/0005_thin_sebastian_shaw.sql",
      "../dist/migrations/0006_sturdy_starfox.sql",
      "../dist/migrations/0007_careful_dark_beast.sql",
      "../dist/migrations/0008_charming_loa.sql",
      "../dist/migrations/0009_regular_dreaming_celestial.sql",
      "../dist/migrations/0010_narrow_stepford_cuckoos.sql",
      "../dist/migrations/0011_romantic_moira_mactaggert.sql",
      "../dist/migrations/0012_add_historical_cash_totals.sql",
      "../dist/migrations/0013_shocking_vermin.sql",
      "../dist/migrations/0014_right_sentry.sql",
      "../dist/migrations/0015_square_sway.sql",
      "../dist/migrations/0016_nifty_colleen_wing.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    assert.equal(
      sqlite.prepare(`
        SELECT COUNT(*) AS count FROM sqlite_schema
        WHERE type = 'trigger' AND name LIKE 'trg_closure_incident%'
      `).get().count,
      0,
    );
    assert.equal(
      sqlite.prepare(`
        SELECT COUNT(*) AS count FROM sqlite_schema
        WHERE type = 'trigger' AND name LIKE 'trg_inventory_stock_entries%'
      `).get().count,
      0,
    );
    assert.equal(
      sqlite.prepare(`
        SELECT COUNT(*) AS count FROM sqlite_schema
        WHERE name IN (
          'trg_sale_inventory_snapshots_no_update',
          'trg_sale_inventory_snapshots_no_delete',
          'trg_sale_inventory_consumptions_no_update',
          'trg_sale_inventory_consumptions_no_delete',
          'trg_sale_voids_no_update',
          'trg_sale_voids_no_delete'
        )
      `).get().count,
      0,
    );

    const repairAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = repairAdapter.database;
    const repairRuntime = await import(`${runtime.url}#sites-trigger-repair`);
    await assert.rejects(
      () => repairRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(repairAdapter);

    const readyAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = readyAdapter.database;
    const readyRuntime = await import(`${runtime.url}#sites-trigger-ready`);
    await readyRuntime.ensureDatabase();
    assert.equal(
      sqlite.prepare(`
        SELECT COUNT(*) AS count FROM sqlite_schema
        WHERE name IN (
          'trg_closure_incidents_no_update',
          'trg_cash_closure_inventory_incident_details_insert',
          'trg_inventory_stock_entries_apply_product',
          'trg_inventory_stock_entries_apply_ingredient',
          'trg_inventory_stock_entries_no_update',
          'trg_inventory_stock_entries_no_delete',
          'trg_sale_inventory_snapshots_no_update',
          'trg_sale_inventory_snapshots_no_delete',
          'trg_sale_inventory_consumptions_no_update',
          'trg_sale_inventory_consumptions_no_delete',
          'trg_sale_voids_no_update',
          'trg_sale_voids_no_delete'
        )
      `).get().count,
      12,
    );
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("la migración 0013 conserva y transforma diferencias históricas en incidencias auditables", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
      "../drizzle/0006_sturdy_starfox.sql",
      "../drizzle/0007_careful_dark_beast.sql",
      "../drizzle/0008_charming_loa.sql",
      "../drizzle/0009_regular_dreaming_celestial.sql",
      "../drizzle/0010_narrow_stepford_cuckoos.sql",
      "../drizzle/0011_romantic_moira_mactaggert.sql",
      "../drizzle/0012_add_historical_cash_totals.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    seedPosProduct(sqlite, {
      id: "producto-incidencia-historica",
      name: "Producto histórico con diferencia",
      category: "Alimentos",
      priceClp: 2000,
      stockMode: "simple",
      stock: 7,
    });
    const createdAt = "2026-08-31T14:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO shift_sessions (
          id, business_date, shift, responsible, opening_cash_clp,
          activity_revision, status, active_slot, opened_at, closed_at,
          closure_id
        ) VALUES (
          'sesion-incidencia-historica', '2026-08-31', 'am', 'Bárbara Vega',
          1000, 0, 'open', 1, '2026-08-31T12:00:00.000Z', NULL, NULL
        )
      `)
      .run();
    sqlite
      .prepare(`
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
          cash_reconciled, card_reconciled, transfer_reconciled,
          pending_customer_reviewed, collaborator_reviewed,
          inventory_count_confirmed, checklist_version, unassigned_sales_clp,
          unassigned_sales_count, unassigned_payments_clp,
          unassigned_payments_count, notes
        ) VALUES (
          'cierre-incidencia-historica', 'sesion-incidencia-historica', 0,
          ?, '2026-08-31', 'am', 'Bárbara Vega', ?,
          1000, 1000, 0, 0, 0, 1000, 0, 0, 0, 0, 0, 0,
          1000, 0, 0, 0, 0, 0, 1000, 0, NULL, 2, 0,
          1000, 0, 0, NULL, 'Conteo informado antes de 0013',
          1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, NULL
        )
      `)
      .run("h".repeat(64), createdAt);
    sqlite
      .prepare(`
        INSERT INTO cash_closure_inventory (
          closure_id, item_key, item_type, item_id, item_name, unit,
          location, expected_version_token, expected_quantity,
          counted_quantity, difference_quantity, reason
        ) VALUES (
          'cierre-incidencia-historica',
          'product:producto-incidencia-historica:simple', 'product',
          'producto-incidencia-historica',
          'Producto histórico con diferencia', 'unidades', 'simple',
          'version-historica', 8, 7, -1, 'Merma documentada antes de 0013'
        )
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE shift_sessions SET status = 'closed', active_slot = NULL,
          closed_at = ?, closure_id = 'cierre-incidencia-historica'
        WHERE id = 'sesion-incidencia-historica'
      `)
      .run(createdAt);

    const migration = await readFile(
      new URL("../drizzle/0013_shocking_vermin.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(migration.replaceAll("--> statement-breakpoint", ""));

    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT level, cash_difference_clp, inventory_difference_count,
              estimated_value_clp
            FROM closure_incidents
            WHERE closure_id = 'cierre-incidencia-historica'
          `)
          .get(),
      },
      {
        level: "yellow",
        cash_difference_clp: 0,
        inventory_difference_count: 1,
        estimated_value_clp: 2000,
      },
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT reason_category, initial_comment, adjustment_applied,
              unit_value_clp, estimated_value_clp
            FROM closure_incident_items
            WHERE incident_id = 'incident:cierre-incidencia-historica'
          `)
          .get(),
      },
      {
        reason_category: "otro",
        initial_comment: "Merma documentada antes de 0013",
        adjustment_applied: -1,
        unit_value_clp: 2000,
        estimated_value_clp: 2000,
      },
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT event_type, status FROM closure_incident_events
          WHERE incident_id = 'incident:cierre-incidencia-historica'
          ORDER BY rowid
        `)
        .all()
        .map((row) => ({ ...row })),
      [{ event_type: "created", status: "pending_clarification" }],
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.closure-incidents-v1'
        `)
        .get().value,
      "v1",
    );
    const enabledFrom = sqlite
      .prepare(`
        SELECT value FROM app_meta
        WHERE key = 'notifications.closure-incidents.enabled-from'
      `)
      .get().value;
    assert.ok(Date.parse(enabledFrom) >= Date.parse(createdAt));
    assert.throws(
      () =>
        sqlite
          .prepare(`
            UPDATE closure_incident_items SET initial_comment = 'mutado'
            WHERE incident_id = 'incident:cierre-incidencia-historica'
          `)
          .run(),
      /immutable/i,
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("la migración 0009→0010 preserva validaciones históricas y sus FK", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
      "../drizzle/0006_sturdy_starfox.sql",
      "../drizzle/0007_careful_dark_beast.sql",
      "../drizzle/0008_charming_loa.sql",
      "../drizzle/0009_regular_dreaming_celestial.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const openedAt = "2026-09-01T12:00:00.000Z";
    const closedAt = "2026-09-01T13:00:00.000Z";
    const fingerprint = "a".repeat(64);
    sqlite
      .prepare(`
        INSERT INTO shift_sessions (
          id, business_date, shift, responsible, opening_cash_clp,
          activity_revision, status, active_slot, opened_at, closed_at,
          closure_id
        ) VALUES (
          'sesion-validada-0009', '2026-09-01', 'am', 'Matías Muñoz',
          100, 0, 'open', 1, ?, NULL, NULL
        )
      `)
      .run(openedAt);
    sqlite
      .prepare(`
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
          cash_reconciled, card_reconciled, transfer_reconciled,
          pending_customer_reviewed, collaborator_reviewed,
          inventory_count_confirmed, checklist_version, unassigned_sales_clp,
          unassigned_sales_count, unassigned_payments_clp,
          unassigned_payments_count, notes
        ) VALUES (
          'cierre-validado-0009', 'sesion-validada-0009', 0, ?,
          '2026-09-01', 'am', 'Matías Muñoz', ?, 100,
          100, 0, 0, 0, 100, 0,
          0, 0, 0, 0, 0, 100,
          0, 0, 0, 0, 0,
          100, 0, NULL, 2, 0,
          100, 0, 0, NULL, 'Entrega histórica validada',
          1, 1, 1, 1, 1,
          1, 1, 0, 0, 0,
          0, 'Snapshot 0009'
        )
      `)
      .run(fingerprint, closedAt);
    sqlite
      .prepare(`
        UPDATE shift_sessions
        SET status = 'closed', active_slot = NULL, closed_at = ?,
          closure_id = 'cierre-validado-0009'
        WHERE id = 'sesion-validada-0009'
      `)
      .run(closedAt);
    sqlite
      .prepare(`
        INSERT INTO cash_closure_validations (
          closure_id, validated_at, comment
        ) VALUES (
          'cierre-validado-0009', '2026-09-01T14:00:00.000Z',
          'Validación histórica ñ'
        )
      `)
      .run();
    const before = {
      session: {
        ...sqlite
          .prepare("SELECT * FROM shift_sessions WHERE id = 'sesion-validada-0009'")
          .get(),
      },
      closure: {
        ...sqlite
          .prepare("SELECT * FROM cash_closures WHERE id = 'cierre-validado-0009'")
          .get(),
      },
      validation: {
        ...sqlite
          .prepare(`
            SELECT closure_id, validated_at, comment
            FROM cash_closure_validations
            WHERE closure_id = 'cierre-validado-0009'
          `)
          .get(),
      },
    };
    const migrationSql = await readFile(
      new URL("../drizzle/0010_narrow_stepford_cuckoos.sql", import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(migrationSql, /foreign_keys\s*=\s*off/iu);
    sqlite.exec(migrationSql.replaceAll("--> statement-breakpoint", ""));

    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT * FROM shift_sessions WHERE id = 'sesion-validada-0009'")
          .get(),
      },
      before.session,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT * FROM cash_closures WHERE id = 'cierre-validado-0009'")
          .get(),
      },
      before.closure,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT closure_id, validated_at, comment
            FROM cash_closure_validations
            WHERE closure_id = 'cierre-validado-0009'
          `)
          .get(),
      },
      before.validation,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT revision_number, request_fingerprint
            FROM cash_closure_validations
            WHERE closure_id = 'cierre-validado-0009'
          `)
          .get(),
      },
      { revision_number: 0, request_fingerprint: null },
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.cash-closure-revisions-v2'
        `)
        .get().value,
      "v2",
    );
    const validationTrigger = sqlite
      .prepare(`
        SELECT sql FROM sqlite_schema
        WHERE type = 'trigger'
          AND name = 'trg_cash_closure_validations_insert_latest_revision_v2'
      `)
      .get().sql;
    assert.match(validationTrigger, /request_fingerprint IS NULL/u);
    assert.match(validationTrigger, /cash_closure_revision_seals/u);
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("la migración conserva datos históricos y activa las nuevas invariantes", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const timestamp = "2026-08-30T14:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO products (
          id, name, category, price_clp, stock, active, catalog_managed,
          needs_price_review, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
      `)
      .run("sin-stock", "Sin stock", "Cafés", 1000, null, timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO products (
          id, name, category, price_clp, stock, active, catalog_managed,
          needs_price_review, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
      `)
      .run("stock-simple", "Stock simple", "Alimentos", 2000, 7, timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO sales (id, created_at, payment_method, seller, total_clp)
        VALUES (?, ?, 'efectivo', NULL, 2000)
      `)
      .run("venta-historica", timestamp);
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity, line_total_clp
        ) VALUES ('venta-historica', 'stock-simple', 'Stock simple', 2000, 1, 2000)
      `)
      .run();

    const migration = await readFile(
      new URL("../drizzle/0003_keen_johnny_storm.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(migration.replaceAll("--> statement-breakpoint", ""));

    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, stock_mode, stock, stock_vitrina, stock_bodega
          FROM products ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "sin-stock",
          stock_mode: "untracked",
          stock: null,
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "stock-simple",
          stock_mode: "simple",
          stock: 7,
          stock_vitrina: null,
          stock_bodega: null,
        },
      ],
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT payment_status, payment_method, debt_note, paid_at,
                   settlement_id, total_clp
            FROM sales WHERE id = 'venta-historica'
          `)
          .get(),
      },
      {
        payment_status: "paid",
        payment_method: "efectivo",
        debt_note: null,
        paid_at: timestamp,
        settlement_id: null,
        total_clp: 2000,
      },
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_items").get().count,
      1,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT id, sale_id, product_id, product_name, unit_price_clp,
                   quantity, line_total_clp
            FROM sale_items
          `)
          .get(),
      },
      {
        id: 1,
        sale_id: "venta-historica",
        product_id: "stock-simple",
        product_name: "Stock simple",
        unit_price_clp: 2000,
        quantity: 1,
        line_total_clp: 2000,
      },
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO sales (
              id, created_at, payment_status, payment_method, debt_note,
              paid_at, settlement_id, total_clp
            ) VALUES ('deuda-invalida', ?, 'pending', NULL, NULL, NULL, NULL, 1)
          `)
          .run(timestamp),
      /CHECK constraint failed/,
    );
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO products (
              id, name, category, price_clp, stock_mode, active,
              catalog_managed, needs_price_review, created_at, updated_at
            ) VALUES ('split-invalido', 'Inválido', 'Tienda', 1, 'split',
              1, 0, 0, ?, ?)
          `)
          .run(timestamp, timestamp),
      /CHECK constraint failed/,
    );
  } finally {
    sqlite.close();
  }
});

test("la migración de tarjeta conserva relaciones, historial y stock dividido", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }

    const timestamp = "2026-08-31T14:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO products (
          id, name, category, price_clp, stock_mode, stock, stock_vitrina,
          stock_bodega, active, catalog_managed, needs_price_review,
          created_at, updated_at
        ) VALUES (?, ?, 'Tienda', 2000, 'split', NULL, 14, 0, 1, 1, 0, ?, ?)
      `)
      .run("scoop-pre-entreno", "Pre entreno High", timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO products (
          id, name, category, price_clp, stock_mode, stock, stock_vitrina,
          stock_bodega, active, catalog_managed, needs_price_review,
          created_at, updated_at
        ) VALUES (?, ?, 'Batidos', 3000, 'untracked', NULL, NULL, NULL,
          1, 1, 0, ?, ?)
      `)
      .run("berry-fit", "Berry Fit · 32 g de proteína (normal)", timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
        VALUES ('berries', 'Mix Berries', 'porciones', 4, 0, ?)
      `)
      .run(timestamp);
    sqlite
      .prepare(`
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
        VALUES ('berry-fit', 'berries', 1)
      `)
      .run();

    const insertLegacySale = sqlite.prepare(`
      INSERT INTO sales (
        id, created_at, payment_status, payment_method, debt_note, paid_at,
        settlement_id, seller, total_clp
      ) VALUES (?, ?, 'paid', ?, NULL, ?, NULL, NULL, 2000)
    `);
    const insertLegacyItem = sqlite.prepare(`
      INSERT INTO sale_items (
        sale_id, product_id, product_name, unit_price_clp, quantity,
        line_total_clp
      ) VALUES (?, 'scoop-pre-entreno', 'Pre entreno High', 2000, 1, 2000)
    `);
    for (const [id, paymentMethod] of [
      ["venta-debito-historica", "debito"],
      ["venta-credito-historica", "credito"],
    ]) {
      insertLegacySale.run(id, timestamp, paymentMethod, timestamp);
      insertLegacyItem.run(id);
    }

    const migration = await readFile(
      new URL("../drizzle/0004_youthful_namorita.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(migration.replaceAll("--> statement-breakpoint", ""));

    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, category, stock_mode, stock_vitrina, stock_bodega
          FROM products ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          id: "berry-fit",
          category: "Batidos",
          stock_mode: "untracked",
          stock_vitrina: null,
          stock_bodega: null,
        },
        {
          id: "scoop-pre-entreno",
          category: "Tienda",
          stock_mode: "split",
          stock_vitrina: 14,
          stock_bodega: 0,
        },
      ],
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT product_id, ingredient_id, quantity
            FROM product_ingredients
          `)
          .get(),
      },
      { product_id: "berry-fit", ingredient_id: "berries", quantity: 1 },
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, payment_method FROM sales ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        { id: "venta-credito-historica", payment_method: "credito" },
        { id: "venta-debito-historica", payment_method: "debito" },
      ],
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT sale_id, product_id, product_name, quantity
          FROM sale_items ORDER BY sale_id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          sale_id: "venta-credito-historica",
          product_id: "scoop-pre-entreno",
          product_name: "Pre entreno High",
          quantity: 1,
        },
        {
          sale_id: "venta-debito-historica",
          product_id: "scoop-pre-entreno",
          product_name: "Pre entreno High",
          quantity: 1,
        },
      ],
    );

    sqlite
      .prepare(`
        UPDATE products SET category = 'Scoops'
        WHERE id = 'scoop-pre-entreno'
      `)
      .run();
    assert.equal(
      sqlite
        .prepare("SELECT category FROM products WHERE id = 'scoop-pre-entreno'")
        .get().category,
      "Scoops",
    );
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, payment_status, payment_method, debt_note, paid_at,
          settlement_id, seller, total_clp
        ) VALUES ('venta-tarjeta', ?, 'paid', 'tarjeta', NULL, ?, NULL, NULL, 2000)
      `)
      .run(timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES ('venta-tarjeta', 'scoop-pre-entreno', 'Pre entreno High',
          2000, 1, 2000)
      `)
      .run();
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO sales (
              id, created_at, payment_status, payment_method, debt_note, paid_at,
              settlement_id, seller, total_clp
            ) VALUES ('venta-cheque', ?, 'paid', 'cheque', NULL, ?, NULL, NULL, 1)
          `)
          .run(timestamp, timestamp),
      /CHECK constraint failed/,
    );

    const accountingMigration = await readFile(
      new URL("../drizzle/0005_thin_sebastian_shaw.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(
      accountingMigration.replaceAll("--> statement-breakpoint", ""),
    );
    sqlite
      .prepare(`
        INSERT INTO cash_closures (
          id, business_date, shift, responsible, created_at,
          expected_cash_clp, expected_card_clp, expected_transfer_clp,
          expected_collected_clp, total_sales_clp, sales_count,
          pending_customer_clp, collaborator_clp, counted_cash_clp,
          difference_clp, unassigned_sales_clp, unassigned_sales_count,
          unassigned_payments_clp, unassigned_payments_count, notes
        ) VALUES (
          'legacy-closure', '2026-08-31', 'pm', 'Matías Muñoz', ?,
          1000, 2000, 3000, 6000, 7000, 3, 400, 500, 1100, 100,
          600, 1, 700, 1, 'Snapshot legacy intacto'
        )
      `)
      .run(timestamp);
    const historyBeforeFormal = {
      sales: sqlite.prepare("SELECT * FROM sales ORDER BY id").all().map((row) => ({ ...row })),
      items: sqlite.prepare("SELECT * FROM sale_items ORDER BY id").all().map((row) => ({ ...row })),
      closure: {
        ...sqlite.prepare("SELECT * FROM cash_closures WHERE id = 'legacy-closure'").get(),
      },
    };
    const formalShiftMigration = await readFile(
      new URL("../drizzle/0006_sturdy_starfox.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(
      formalShiftMigration.replaceAll("--> statement-breakpoint", ""),
    );

    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT id, created_at, business_date, shift, payment_status,
            checkout_method, payment_method, debt_note, debtor_collaborator,
            paid_at, settlement_id, seller, total_clp
          FROM sales ORDER BY id
        `)
        .all()
        .map((row) => ({ ...row })),
      historyBeforeFormal.sales,
    );
    assert.deepEqual(
      sqlite.prepare("SELECT * FROM sale_items ORDER BY id").all().map((row) => ({ ...row })),
      historyBeforeFormal.items,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT id, business_date, shift, responsible, created_at,
              expected_cash_clp, expected_card_clp, expected_transfer_clp,
              expected_collected_clp, total_sales_clp, sales_count,
              pending_customer_clp, collaborator_clp, counted_cash_clp,
              difference_clp, unassigned_sales_clp, unassigned_sales_count,
              unassigned_payments_clp, unassigned_payments_count, notes
            FROM cash_closures WHERE id = 'legacy-closure'
          `)
          .get(),
      },
      historyBeforeFormal.closure,
    );

    // Esta prueba detiene deliberadamente el esquema en 0006 y llama la capa
    // de consultas sin pasar por ensureDatabase(). En producción el reparador
    // crea sale_voids antes de servir tráfico; el stub mantiene aislado aquí el
    // objetivo histórico de la migración de tarjetas.
    sqlite.exec(`
      CREATE TABLE sale_voids (
        sale_id TEXT PRIMARY KEY NOT NULL
      );
    `);

    const { database } = sqliteD1Adapter(sqlite);
    const historical = await pos.module.getRecentSales(
      database,
      10,
      new Date("2026-08-31T15:00:00.000Z"),
    );
    assert.deepEqual(
      Object.fromEntries(historical.map(({ id, paymentMethod }) => [id, paymentMethod])),
      {
        "venta-credito-historica": "tarjeta",
        "venta-debito-historica": "tarjeta",
        "venta-tarjeta": "tarjeta",
      },
    );
    assert.deepEqual(
      sqlite
        .prepare("SELECT id, payment_method FROM sales ORDER BY id")
        .all()
        .map((row) => ({ ...row })),
      [
        { id: "venta-credito-historica", payment_method: "credito" },
        { id: "venta-debito-historica", payment_method: "debito" },
        { id: "venta-tarjeta", payment_method: "tarjeta" },
      ],
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT sale_id, payment_method, business_date, shift, received_by
          FROM sale_payments ORDER BY sale_id
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        {
          sale_id: "venta-credito-historica",
          payment_method: "tarjeta",
          business_date: null,
          shift: null,
          received_by: null,
        },
        {
          sale_id: "venta-debito-historica",
          payment_method: "tarjeta",
          business_date: null,
          shift: null,
          received_by: null,
        },
        {
          sale_id: "venta-tarjeta",
          payment_method: "tarjeta",
          business_date: null,
          shift: null,
          received_by: null,
        },
      ],
    );
    for (const table of ["sales", "sale_payments"]) {
      const sessionForeignKey = sqlite
        .prepare(`PRAGMA foreign_key_list(${table})`)
        .all()
        .find((row) => row.from === "shift_session_id");
      assert.ok(sessionForeignKey, `${table} debe referenciar shift_sessions`);
      assert.equal(sessionForeignKey.table, "shift_sessions");
      assert.equal(sessionForeignKey.on_update, "NO ACTION");
      assert.equal(sessionForeignKey.on_delete, "RESTRICT");
    }
    for (const table of ["cash_closure_inventory", "cash_closure_debts"]) {
      const closureForeignKey = sqlite
        .prepare(`PRAGMA foreign_key_list(${table})`)
        .all()
        .find((row) => row.from === "closure_id");
      assert.ok(closureForeignKey, `${table} debe referenciar cash_closures`);
      assert.equal(closureForeignKey.table, "cash_closures");
      assert.equal(closureForeignKey.on_update, "NO ACTION");
      assert.equal(closureForeignKey.on_delete, "RESTRICT");
    }
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("la migración de abonos preserva el ledger y activa índices y defensa de sobrepago", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
      "../drizzle/0006_sturdy_starfox.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-migracion', '2026-09-01T12:00:00.000Z', '2026-09-01', 'am',
          'pending', 'pendiente', NULL, 'Saldo migrado', NULL, NULL, NULL,
          'Matías Muñoz', 1000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        ) VALUES (
          'settlement:migrado-1', 'deuda-migracion',
          '2026-09-01T12:30:00.000Z', '2026-09-01', 'am', NULL,
          'efectivo', 400, 'Matías Muñoz', 'settlement'
        )
      `)
      .run();
    const before = {
      sale: { ...sqlite.prepare("SELECT * FROM sales WHERE id = 'deuda-migracion'").get() },
      payment: {
        ...sqlite
          .prepare("SELECT * FROM sale_payments WHERE id = 'settlement:migrado-1'")
          .get(),
      },
    };

    const sql = await readFile(
      new URL("../drizzle/0007_careful_dark_beast.sql", import.meta.url),
      "utf8",
    );
    sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));

    assert.deepEqual(
      { ...sqlite.prepare("SELECT * FROM sales WHERE id = 'deuda-migracion'").get() },
      before.sale,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT * FROM sale_payments WHERE id = 'settlement:migrado-1'")
          .get(),
      },
      before.payment,
    );
    const indexes = sqlite
      .prepare("PRAGMA index_list('sale_payments')")
      .all()
      .map((row) => ({ ...row }));
    assert.equal(indexes.some(({ name }) => name === "uq_sale_payments_sale_id"), false);
    assert.equal(
      indexes.find(({ name }) => name === "idx_sale_payments_sale_id")?.unique,
      0,
    );
    assert.deepEqual(
      (({ unique, partial }) => ({ unique, partial }))(
        indexes.find(({ name }) => name === "uq_sale_payments_direct_sale_id"),
      ),
      { unique: 1, partial: 1 },
    );
    assert.ok(
      sqlite
        .prepare(`
          SELECT sql FROM sqlite_schema
          WHERE type = 'trigger' AND name = 'trg_sale_payments_no_overpayment'
        `)
        .get()?.sql,
    );
    assert.equal(
      sqlite
        .prepare("SELECT value FROM app_meta WHERE key = 'schema.migration.partial-payments-v1'")
        .get().value,
      "v1",
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);

    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, payment_method,
          amount_clp, received_by, kind
        ) VALUES (
          'settlement:migrado-2', 'deuda-migracion',
          '2026-09-01T13:00:00.000Z', '2026-09-01', 'am', 'tarjeta', 500,
          'Matías Muñoz', 'settlement'
        )
      `)
      .run();
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO sale_payments (
              id, sale_id, payment_method, amount_clp, kind
            ) VALUES (
              'settlement:sobrepago', 'deuda-migracion', 'efectivo', 101,
              'settlement'
            )
          `)
          .run(),
      /payment exceeds sale balance/,
    );
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, payment_status, checkout_method, debt_note, total_clp
        ) VALUES (
          'deuda-directa-invalida', 'pending', 'pendiente',
          'No admite pago directo parcial', 1000
        )
      `)
      .run();
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO sale_payments (
              id, sale_id, payment_method, amount_clp, kind
            ) VALUES (
              'direct:deuda-directa-invalida', 'deuda-directa-invalida',
              'efectivo', 500, 'direct'
            )
          `)
          .run(),
      /payment exceeds sale balance/,
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("el fallback runtime repara un esquema legacy con FK activas sin perder historial", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const timestamp = "2026-08-31T12:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO products (
          id, name, category, price_clp, stock_mode, stock, active,
          catalog_managed, needs_price_review, created_at, updated_at
        ) VALUES ('runtime-product', 'Runtime', 'Tienda', 1000, 'simple', 3,
          1, 0, 0, ?, ?)
      `)
      .run(timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, payment_status, payment_method, debt_note, paid_at,
          settlement_id, seller, total_clp
        ) VALUES ('runtime-sale', ?, 'paid', 'efectivo', NULL, ?, NULL, NULL, 1000)
      `)
      .run(timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES ('runtime-sale', 'runtime-product', 'Runtime', 1000, 1, 1000)
      `)
      .run();
    sqlite
      .prepare(`
        INSERT OR REPLACE INTO app_meta (key, value, updated_at)
        VALUES
          ('catalog.migration.2026-09-14.1', '2026-09-14.1', ?),
          ('inventory.initial-stock.2026-08-31.2', '2026-08-31.2', ?),
          ('schema.migration.formal-shift-v1', 'v1', ?)
      `)
      .run(timestamp, timestamp, timestamp);

    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    await assert.rejects(
      () => runtime.module.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    const revisionsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = revisionsAdapter.database;
    const revisionsRuntime = await import(`${runtime.url}#legacy-revisions`);
    await assert.rejects(
      () => revisionsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(revisionsAdapter.getPrepareCalls() < 50);

    const incidentsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = incidentsAdapter.database;
    const incidentsRuntime = await import(`${runtime.url}#legacy-incidents`);
    await assert.rejects(
      () => incidentsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(incidentsAdapter);

    const readyAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = readyAdapter.database;
    const readyRuntime = await import(`${runtime.url}#legacy-ready`);
    await readyRuntime.ensureDatabase();

    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM shift_sessions").get().count,
      0,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT id, payment_method, checkout_method, shift_session_id
            FROM sales WHERE id = 'runtime-sale'
          `)
          .get(),
      },
      {
        id: "runtime-sale",
        payment_method: "efectivo",
        checkout_method: "efectivo",
        shift_session_id: null,
      },
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sale_items WHERE sale_id = 'runtime-sale'")
        .get().count,
      1,
    );
    assert.ok(
      sqlite
        .prepare(`
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index' AND name = 'idx_sale_payments_created_at'
        `)
        .get(),
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.formal-shift-v1'
        `)
        .get().value,
      "v1",
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el fallback 0006 habilita abonos sin perder filas y queda bajo el presupuesto D1", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
      "../drizzle/0006_sturdy_starfox.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const timestamp = "2026-09-01T12:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, payment_status, checkout_method, debt_note, total_clp
        ) VALUES (
          'runtime-deuda-parcial', ?, 'pending', 'pendiente',
          'Preservar en fallback', 1000
        )
      `)
      .run(timestamp);
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, payment_method, amount_clp, kind
        ) VALUES (
          'settlement:runtime-parcial', 'runtime-deuda-parcial', ?,
          'efectivo', 300, 'settlement'
        )
      `)
      .run(timestamp);
    sqlite
      .prepare(`
        INSERT OR REPLACE INTO app_meta (key, value, updated_at)
        VALUES
          ('catalog.migration.2026-09-14.1', '2026-09-14.1', ?),
          ('inventory.initial-stock.2026-08-31.2', '2026-08-31.2', ?)
      `)
      .run(timestamp, timestamp);
    const before = {
      sale: { ...sqlite.prepare("SELECT * FROM sales WHERE id = 'runtime-deuda-parcial'").get() },
      payment: {
        ...sqlite
          .prepare("SELECT * FROM sale_payments WHERE id = 'settlement:runtime-parcial'")
          .get(),
      },
    };
    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const formalCleanupRuntime = await import(`${runtime.url}#partial-fallback-formal-cleanup`);

    await assert.rejects(
      () => formalCleanupRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(
      adapter.getPrepareCalls() < 50,
      `fallback formal preparó ${adapter.getPrepareCalls()} consultas`,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sqlite_schema
          WHERE type = 'index'
            AND name IN (
              'uq_shift_sessions_business_date_shift',
              'uq_cash_closures_business_date_shift'
            )
        `)
        .get().count,
      0,
    );

    const partialAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = partialAdapter.database;
    const partialRuntime = await import(`${runtime.url}#partial-fallback`);
    await assert.rejects(
      () => partialRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(
      partialAdapter.getPrepareCalls() < 50,
      `fallback parcial preparó ${partialAdapter.getPrepareCalls()} consultas`,
    );
    assert.deepEqual(
      { ...sqlite.prepare("SELECT * FROM sales WHERE id = 'runtime-deuda-parcial'").get() },
      before.sale,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT * FROM sale_payments WHERE id = 'settlement:runtime-parcial'")
          .get(),
      },
      before.payment,
    );
    assert.equal(
      sqlite
        .prepare("SELECT value FROM app_meta WHERE key = 'schema.migration.partial-payments-v1'")
        .get().value,
      "v1",
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE name = 'uq_sale_payments_sale_id'")
        .get().count,
      0,
    );
    assert.ok(
      sqlite
        .prepare("SELECT 1 FROM sqlite_schema WHERE name = 'trg_sale_payments_no_overpayment'")
        .get(),
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);

    const closureV2Adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = closureV2Adapter.database;
    const closureV2Runtime = await import(
      `${runtime.url}#partial-fallback-closure-v2`
    );
    await assert.rejects(
      () => closureV2Runtime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(closureV2Adapter.getPrepareCalls() < 50);
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.cash-closure-v2'
        `)
        .get().value,
      "v2",
    );

    const revisionsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = revisionsAdapter.database;
    const revisionsRuntime = await import(`${runtime.url}#partial-fallback-revisions`);
    await assert.rejects(
      () => revisionsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(revisionsAdapter.getPrepareCalls() < 50);

    const incidentsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = incidentsAdapter.database;
    const incidentsRuntime = await import(
      `${runtime.url}#partial-fallback-incidents`
    );
    await assert.rejects(
      () => incidentsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(incidentsAdapter);

    const retryAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = retryAdapter.database;
    const retryRuntime = await import(`${runtime.url}#partial-fallback-retry`);
    await retryRuntime.ensureDatabase();
    assert.ok(retryAdapter.getPrepareCalls() < 50);
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.sale-voids-v1'
        `)
        .get().value,
      "v1",
    );
    const steadyAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = steadyAdapter.database;
    const steadyRuntime = await import(`${runtime.url}#partial-fallback-steady`);
    await steadyRuntime.ensureDatabase();
    assert.equal(steadyAdapter.getPrepareCalls(), 2);
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el rollout reemplaza un trigger semántico v2 antiguo aunque conserve el marcador", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.cash-closure-revisions-v2'
        `)
        .get().value,
      "v2",
    );
    sqlite.exec(`
      DROP TRIGGER trg_cash_closure_revision_seals_insert_semantic_v2;
      CREATE TRIGGER trg_cash_closure_revision_seals_insert_semantic_v2
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
      )
      BEGIN
        SELECT RAISE(ABORT, 'old count-only revision seal');
      END;
    `);
    const oldSql = sqlite
      .prepare(`
        SELECT sql FROM sqlite_schema
        WHERE name = 'trg_cash_closure_revision_seals_insert_semantic_v2'
      `)
      .get().sql;
    assert.doesNotMatch(oldSql, /opening_cash_clp/u);
    assert.doesNotMatch(oldSql, /expenses_clp/u);

    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const repairRuntime = await import(`${runtime.url}#repair-old-semantic-v2`);
    await assert.rejects(
      () => repairRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(
      adapter.getPrepareCalls() < 50,
      `reparar el trigger preparó ${adapter.getPrepareCalls()} consultas`,
    );
    assert.ok(adapter.getMaxBatchStatements() < 50);
    const repairedSql = sqlite
      .prepare(`
        SELECT sql FROM sqlite_schema
        WHERE name = 'trg_cash_closure_revision_seals_insert_semantic_v2'
      `)
      .get().sql;
    for (const token of [
      "sale_payments",
      "live_quantity_after",
      "later_session.closed_at",
      "included_sales_clp",
      "expected_inventory_line_count",
      "opening_cash_clp",
      "expenses_clp",
    ]) {
      assert.match(repairedSql, new RegExp(token.replace(".", "\\."), "u"));
    }
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el fallback 0008 agrega cierre v2 sin reescribir el historial legacy", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
      "../drizzle/0006_sturdy_starfox.sql",
      "../drizzle/0007_careful_dark_beast.sql",
      "../drizzle/0008_charming_loa.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const timestamp = "2026-08-31T13:00:00.000Z";
    sqlite
      .prepare(`
        INSERT INTO cash_closures (
          id, business_date, shift, responsible, created_at,
          expected_cash_clp, expected_card_clp, expected_transfer_clp,
          expected_collected_clp, total_sales_clp, sales_count,
          pending_customer_clp, collaborator_clp, counted_cash_clp,
          difference_clp, unassigned_sales_clp, unassigned_sales_count,
          unassigned_payments_clp, unassigned_payments_count, notes
        ) VALUES (
          'cierre-legacy-preservado', '2026-08-31', 'am', 'Bárbara Vega', ?,
          1000, 0, 0, 1000, 1500, 2, 500, 700, 900, -100, 0, 0, 0, 0,
          'Entrega histórica · sin cambios'
        )
      `)
      .run(timestamp);
    sqlite
      .prepare(`
        INSERT INTO cash_closure_inventory (
          closure_id, item_key, item_type, item_id, item_name, unit, location,
          expected_version_token, expected_quantity, counted_quantity,
          difference_quantity, reason
        ) VALUES (
          'cierre-legacy-preservado', 'product:legacy:bodega', 'product',
          'legacy', 'Producto histórico', 'unidades', 'bodega', 'token-ñ',
          7, 6, -1, 'Merma histórica'
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO cash_closure_debts (
          closure_id, sale_id, debt_type, created_at, debt_note,
          debtor_collaborator, amount_clp
        ) VALUES (
          'cierre-legacy-preservado', 'deuda-legacy', 'pendiente', ?,
          'Cliente histórico', NULL, 500
        ), (
          'cierre-legacy-preservado', 'colaborador-legacy', 'colaborador', ?,
          'Descuento histórico', 'Eva Soto', 700
        )
      `)
      .run(timestamp, timestamp);
    sqlite
      .prepare(`
        INSERT OR REPLACE INTO app_meta (key, value, updated_at)
        VALUES
          ('catalog.migration.2026-09-14.1', '2026-09-14.1', ?),
          ('inventory.initial-stock.2026-08-31.2', '2026-08-31.2', ?)
      `)
      .run(timestamp, timestamp);

    const oldColumns = sqlite
      .prepare("PRAGMA table_info(cash_closures)")
      .all()
      .map(({ name }) => `"${name}"`)
      .join(", ");
    const before = {
      closure: {
        ...sqlite
          .prepare(`SELECT ${oldColumns} FROM cash_closures WHERE id = ?`)
          .get("cierre-legacy-preservado"),
      },
      inventory: {
        ...sqlite
          .prepare("SELECT * FROM cash_closure_inventory WHERE closure_id = ?")
          .get("cierre-legacy-preservado"),
      },
      debts: sqlite
        .prepare(`
          SELECT * FROM cash_closure_debts
          WHERE closure_id = ? ORDER BY sale_id
        `)
        .all("cierre-legacy-preservado")
        .map((row) => ({ ...row })),
    };
    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const formalCleanupRuntime = await import(`${runtime.url}#fallback-0008-formal-cleanup`);

    await assert.rejects(
      () => formalCleanupRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(
      adapter.getPrepareCalls() < 50,
      `fallback 0008 formal preparó ${adapter.getPrepareCalls()} consultas`,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sqlite_schema
          WHERE type = 'index'
            AND name IN (
              'uq_shift_sessions_business_date_shift',
              'uq_cash_closures_business_date_shift'
            )
        `)
        .get().count,
      0,
    );

    const closureV2Adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = closureV2Adapter.database;
    const closureV2Runtime = await import(`${runtime.url}#fallback-0008-v2`);
    await assert.rejects(
      () => closureV2Runtime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(
      closureV2Adapter.getPrepareCalls() < 50,
      `fallback 0008 preparó ${closureV2Adapter.getPrepareCalls()} consultas`,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`SELECT ${oldColumns} FROM cash_closures WHERE id = ?`)
          .get("cierre-legacy-preservado"),
      },
      before.closure,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT * FROM cash_closure_inventory WHERE closure_id = ?")
          .get("cierre-legacy-preservado"),
      },
      before.inventory,
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT * FROM cash_closure_debts
          WHERE closure_id = ? ORDER BY sale_id
        `)
        .all("cierre-legacy-preservado")
        .map((row) => ({ ...row })),
      before.debts,
    );
    assert.equal(
      sqlite
        .prepare("SELECT value FROM app_meta WHERE key = ?")
        .get("schema.migration.formal-shift-v1").value,
      "v1",
    );
    assert.equal(
      sqlite
        .prepare("SELECT value FROM app_meta WHERE key = ?")
        .get("schema.migration.cash-closure-v2").value,
      "v2",
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);

    const revisionsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = revisionsAdapter.database;
    const revisionsRuntime = await import(`${runtime.url}#fallback-0008-revisions`);
    await assert.rejects(
      () => revisionsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(revisionsAdapter.getPrepareCalls() < 50);

    const incidentsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = incidentsAdapter.database;
    const incidentsRuntime = await import(
      `${runtime.url}#fallback-0008-incidents`
    );
    await assert.rejects(
      () => incidentsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(incidentsAdapter);

    const readyAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = readyAdapter.database;
    const readyRuntime = await import(`${runtime.url}#fallback-0008-ready`);
    await readyRuntime.ensureDatabase();

    const [legacy] = await pos.module.listCashClosures(adapter.database);
    assert.equal(legacy.id, "cierre-legacy-preservado");
    assert.equal(legacy.closureContractVersion, null);
    assert.equal(legacy.validationStatus, "not_required");
    assert.equal(legacy.validation, null);
    assert.equal(legacy.handoffComments, "Entrega histórica · sin cambios");
    assert.equal(legacy.inventory[0].location, "bodega");
    assert.equal(legacy.collaboratorClp, 700);
    assert.equal(legacy.collaboratorCount, 0);
    assert.deepEqual(legacy.pendingCollaborators, [
      {
        id: "colaborador-legacy",
        createdAt: timestamp,
        debtorCollaborator: "Eva Soto",
        debtNote: "Descuento histórico",
        totalClp: 700,
      },
    ]);
    await assert.rejects(
      () =>
        pos.module.validateCashClosure(
          adapter.database,
          legacy.id,
          { comment: null },
        ),
      (error) => error.status === 409 && /histórico/i.test(error.message),
    );
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el cold start vigente usa dos consultas incluyendo catálogo", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const timestamp = "2026-09-01T12:00:00.000Z";
    sqlite
      .prepare(`
        INSERT OR REPLACE INTO app_meta (key, value, updated_at)
        VALUES
          ('catalog.migration.2026-09-14.1', '2026-09-14.1', ?),
          ('inventory.initial-stock.2026-08-31.2', '2026-08-31.2', ?)
      `)
      .run(timestamp, timestamp);
    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const coldRuntime = await import(`${runtime.url}#cold-fast-path`);

    await coldRuntime.ensureDatabase();

    assert.equal(adapter.getPrepareCalls(), 2);
    assert.equal(adapter.getBatchCalls(), 0);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sqlite_schema
          WHERE name IN (
            'trg_sale_inventory_snapshots_no_update',
            'trg_sale_inventory_snapshots_no_delete',
            'trg_sale_inventory_consumptions_no_update',
            'trg_sale_inventory_consumptions_no_delete',
            'trg_sale_voids_no_update',
            'trg_sale_voids_no_delete'
          )
        `)
        .get().count,
      6,
    );

  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el fallback 0005 a turnos formales queda bajo el presupuesto D1", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const timestamp = "2026-09-01T12:00:00.000Z";
    sqlite
      .prepare(`
        INSERT OR REPLACE INTO app_meta (key, value, updated_at)
        VALUES
          ('catalog.migration.2026-09-14.1', '2026-09-14.1', ?),
          ('inventory.initial-stock.2026-08-31.2', '2026-08-31.2', ?)
      `)
      .run(timestamp, timestamp);
    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const fallbackRuntime = await import(`${runtime.url}#formal-fallback`);

    await assert.rejects(
      () => fallbackRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );

    assert.ok(
      adapter.getPrepareCalls() < 50,
      `fallback preparó ${adapter.getPrepareCalls()} consultas`,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.formal-shift-v1'
        `)
        .get().value,
      "v1",
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);

    const partialAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = partialAdapter.database;
    const partialRuntime = await import(`${runtime.url}#formal-fallback-partial`);
    await assert.rejects(
      () => partialRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(partialAdapter.getPrepareCalls() < 50);
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'schema.migration.partial-payments-v1'
        `)
        .get().value,
      "v1",
    );

    const closureV2Adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = closureV2Adapter.database;
    const closureV2Runtime = await import(
      `${runtime.url}#formal-fallback-closure-v2`
    );
    await assert.rejects(
      () => closureV2Runtime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(closureV2Adapter.getPrepareCalls() < 50);

    const revisionsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = revisionsAdapter.database;
    const revisionsRuntime = await import(`${runtime.url}#formal-fallback-revisions`);
    await assert.rejects(
      () => revisionsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(revisionsAdapter.getPrepareCalls() < 50);

    const incidentsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = incidentsAdapter.database;
    const incidentsRuntime = await import(
      `${runtime.url}#formal-fallback-incidents`
    );
    await assert.rejects(
      () => incidentsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(incidentsAdapter);

    const retryAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = retryAdapter.database;
    const retryRuntime = await import(`${runtime.url}#formal-fallback-retry`);
    await retryRuntime.ensureDatabase();
    assert.ok(retryAdapter.getPrepareCalls() < 50);
    const steadyAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = steadyAdapter.database;
    const steadyRuntime = await import(`${runtime.url}#formal-fallback-steady`);
    await steadyRuntime.ensureDatabase();
    assert.equal(steadyAdapter.getPrepareCalls(), 2);
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

test("el fallback fasea también un catálogo pendiente antes de aceptar ventas", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    for (const migration of [
      "../drizzle/0000_chief_silver_samurai.sql",
      "../drizzle/0001_equal_namor.sql",
      "../drizzle/0002_slippery_dragon_lord.sql",
      "../drizzle/0003_keen_johnny_storm.sql",
      "../drizzle/0004_youthful_namorita.sql",
      "../drizzle/0005_thin_sebastian_shaw.sql",
    ]) {
      const sql = await readFile(new URL(migration, import.meta.url), "utf8");
      sqlite.exec(sql.replaceAll("--> statement-breakpoint", ""));
    }
    const adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = adapter.database;
    const maintenanceRuntime = await import(`${runtime.url}#catalog-maintenance`);

    await assert.rejects(
      () => maintenanceRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(adapter.getPrepareCalls() < 50);

    const partialAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = partialAdapter.database;
    const partialRuntime = await import(`${runtime.url}#catalog-maintenance-partial`);
    await assert.rejects(
      () => partialRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(partialAdapter.getPrepareCalls() < 50);

    const closureV2Adapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = closureV2Adapter.database;
    const closureV2Runtime = await import(
      `${runtime.url}#catalog-maintenance-closure-v2`
    );
    await assert.rejects(
      () => closureV2Runtime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(closureV2Adapter.getPrepareCalls() < 50);

    const revisionsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = revisionsAdapter.database;
    const revisionsRuntime = await import(
      `${runtime.url}#catalog-maintenance-revisions`
    );
    await assert.rejects(
      () => revisionsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assert.ok(revisionsAdapter.getPrepareCalls() < 50);

    const incidentsAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = incidentsAdapter.database;
    const incidentsRuntime = await import(
      `${runtime.url}#catalog-maintenance-incidents`
    );
    await assert.rejects(
      () => incidentsRuntime.ensureDatabase(),
      (error) => error.status === 503 && /Reintenta/i.test(error.message),
    );
    assertIncidentMigrationBudget(incidentsAdapter);

    const retryAdapter = sqliteD1Adapter(sqlite);
    runtimeEnv.DB = retryAdapter.database;
    const retryRuntime = await import(`${runtime.url}#catalog-maintenance-retry`);
    await retryRuntime.ensureDatabase();
    assert.ok(retryAdapter.getPrepareCalls() < 50);
    assert.equal(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'catalog.migration.2026-09-14.1'
        `)
        .get().value,
      "2026-09-14.1",
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM products").get().count,
      25,
    );
  } finally {
    runtimeEnv.DB = null;
    sqlite.close();
  }
});

function seedPosProduct(sqlite, {
  id,
  name,
  category,
  priceClp,
  stockMode,
  stock = null,
  stockVitrina = null,
  stockBodega = null,
}) {
  const timestamp = "2026-08-31T12:00:00.000Z";
  sqlite
    .prepare(`
      INSERT INTO products (
        id, name, category, price_clp, stock_mode, stock, stock_vitrina,
        stock_bodega, active, catalog_managed, needs_price_review,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
    `)
    .run(
      id,
      name,
      category,
      priceClp,
      stockMode,
      stock,
      stockVitrina,
      stockBodega,
      timestamp,
      timestamp,
    );
}

async function openTestSession(
  database,
  {
    id = "sesion-am",
    shift = "am",
    responsible = "Matías Muñoz",
    openingCashClp = 0,
    now = new Date("2026-09-01T12:00:00.000Z"),
  } = {},
) {
  return (
    await pos.module.openShiftSession(
      database,
      { id, shift, responsible, openingCashClp },
      now,
    )
  ).session;
}

function exactInventoryCount(inventory) {
  return inventory.map((line) => ({
    key: line.key,
    versionToken: line.versionToken,
    expectedQuantity: line.expectedQuantity,
    countedQuantity: line.expectedQuantity,
    reasonCategory: null,
    comment: null,
  }));
}

function exactClosureInput(session, preview, inventory, overrides = {}) {
  return {
    id: `cierre-${session.id}`,
    sessionId: session.id,
    expectedActivityRevision: preview.activityRevision,
    countedCashClp: preview.expectedCashClp,
    countedCardClp: preview.expectedCardClp,
    countedTransferClp: preview.expectedTransferClp,
    financialDifferenceReason: null,
    expenses: [],
    inventory: exactInventoryCount(inventory),
    handoffComments: null,
    ...overrides,
  };
}

test("el ingreso de mercadería suma stock, conserva ubicaciones y deja un ledger idempotente", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "stock-entry-simple",
      name: "Agua con stock",
      category: "Refrigerador",
      priceClp: 1000,
      stockMode: "simple",
      stock: 5,
    });
    seedPosProduct(sqlite, {
      id: "stock-entry-split",
      name: "Proteína con ubicaciones",
      category: "Tienda",
      priceClp: 20000,
      stockMode: "split",
      stockVitrina: 2,
      stockBodega: 10,
    });
    seedPosProduct(sqlite, {
      id: "stock-entry-untracked",
      name: "Sin control",
      category: "Cafés",
      priceClp: 2000,
      stockMode: "untracked",
    });
    seedPosProduct(sqlite, {
      id: "muffin-stock-entry",
      name: "Muffin",
      category: "Alimentos",
      priceClp: 2000,
      stockMode: "untracked",
    });
    seedPosProduct(sqlite, {
      id: "promo-muffin-stock-entry",
      name: "Promo Café + Muffin",
      category: "Cafés",
      priceClp: 4000,
      stockMode: "untracked",
    });
    sqlite
      .prepare(`
        INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
        VALUES ('insumo-muffin-stock-entry', 'Muffin', 'unidades', 4, 0, ?)
      `)
      .run("2026-09-15T10:00:00.000Z");
    const recipe = sqlite.prepare(`
      INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
      VALUES (?, 'insumo-muffin-stock-entry', 1)
    `);
    recipe.run("muffin-stock-entry");
    recipe.run("promo-muffin-stock-entry");

    const { database } = sqliteD1Adapter(sqlite);
    const simple = await pos.module.addProductStockEntry(
      database,
      "stock-entry-simple",
      { id: "entrada-simple-1", quantity: 7, location: "simple" },
      new Date("2026-09-15T11:00:00.000Z"),
    );
    assert.equal(simple.idempotent, false);
    assert.deepEqual(simple.entry, {
      id: "entrada-simple-1",
      itemType: "product",
      itemId: "stock-entry-simple",
      itemName: "Agua con stock",
      location: "simple",
      quantityBefore: 5,
      quantityAdded: 7,
      quantityAfter: 12,
      createdAt: "2026-09-15T11:00:00.000Z",
    });
    assert.equal(simple.product.stock, 12);

    const simpleRetry = await pos.module.addProductStockEntry(
      database,
      "stock-entry-simple",
      { id: "entrada-simple-1", quantity: 7, location: "simple" },
      new Date("2026-09-15T11:01:00.000Z"),
    );
    assert.equal(simpleRetry.idempotent, true);
    assert.deepEqual(simpleRetry.entry, simple.entry);
    assert.equal(simpleRetry.product.stock, 12);
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM inventory_stock_entries WHERE id = 'entrada-simple-1'")
        .get().count,
      1,
    );

    await assert.rejects(
      () =>
        pos.module.addProductStockEntry(database, "stock-entry-simple", {
          id: "entrada-simple-1",
          quantity: 8,
          location: "simple",
        }),
      (error) => error.status === 409 && /otros datos/i.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'stock-entry-simple'").get().stock,
      12,
    );

    const vitrina = await pos.module.addProductStockEntry(
      database,
      "stock-entry-split",
      { id: "entrada-vitrina-1", quantity: 3, location: "vitrina" },
    );
    assert.deepEqual(
      {
        before: vitrina.entry.quantityBefore,
        added: vitrina.entry.quantityAdded,
        after: vitrina.entry.quantityAfter,
        vitrina: vitrina.product.stockVitrina,
        bodega: vitrina.product.stockBodega,
      },
      { before: 2, added: 3, after: 5, vitrina: 5, bodega: 10 },
    );
    const bodega = await pos.module.addProductStockEntry(
      database,
      "stock-entry-split",
      { id: "entrada-bodega-1", quantity: 4, location: "bodega" },
    );
    assert.deepEqual(
      {
        before: bodega.entry.quantityBefore,
        added: bodega.entry.quantityAdded,
        after: bodega.entry.quantityAfter,
        vitrina: bodega.product.stockVitrina,
        bodega: bodega.product.stockBodega,
      },
      { before: 10, added: 4, after: 14, vitrina: 5, bodega: 14 },
    );

    const beforeShared = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    assert.equal(beforeShared.get("muffin-stock-entry")?.availableStock, 4);
    assert.equal(beforeShared.get("promo-muffin-stock-entry")?.availableStock, 4);

    const ingredient = await pos.module.addIngredientStockEntry(
      database,
      "insumo-muffin-stock-entry",
      { id: "entrada-muffin-1", quantity: 6 },
      new Date("2026-09-15T11:05:00.000Z"),
    );
    assert.equal(ingredient.idempotent, false);
    assert.deepEqual(
      {
        type: ingredient.entry.itemType,
        location: ingredient.entry.location,
        before: ingredient.entry.quantityBefore,
        added: ingredient.entry.quantityAdded,
        after: ingredient.entry.quantityAfter,
        stock: ingredient.ingredient.stock,
        revision: ingredient.ingredient.revision,
      },
      {
        type: "ingredient",
        location: "ingredient",
        before: 4,
        added: 6,
        after: 10,
        stock: 10,
        revision: 1,
      },
    );
    const afterShared = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    assert.equal(afterShared.get("muffin-stock-entry")?.availableStock, 10);
    assert.equal(afterShared.get("promo-muffin-stock-entry")?.availableStock, 10);

    for (const sql of [
      "UPDATE inventory_stock_entries SET quantity_added = 2 WHERE id = 'entrada-simple-1'",
      "DELETE FROM inventory_stock_entries WHERE id = 'entrada-simple-1'",
    ]) {
      assert.throws(
        () => sqlite.prepare(sql).run(),
        /immutable|append-only/i,
        sql,
      );
    }
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM inventory_stock_entries").get().count,
      4,
    );
  } finally {
    sqlite.close();
  }
});

test("el ingreso de stock rechaza cantidades y destinos incompatibles antes de mutar inventario", async () => {
  for (const quantity of [0, -1, 1.5, 1_000_001]) {
    assert.throws(
      () =>
        shared.module.validateProductStockEntryPayload({
          id: "entrada-invalida",
          quantity,
          location: "simple",
        }),
      (error) => error.status === 400 && /entero entre 1/i.test(error.message),
      `producto quantity=${quantity}`,
    );
    assert.throws(
      () =>
        shared.module.validateIngredientStockEntryPayload({
          id: "entrada-invalida",
          quantity,
        }),
      (error) => error.status === 400 && /entero entre 1/i.test(error.message),
      `insumo quantity=${quantity}`,
    );
  }
  assert.throws(
    () =>
      shared.module.validateProductStockEntryPayload({
        id: "entrada-invalida",
        quantity: 1,
        location: "deposito",
      }),
    (error) => error.status === 400 && /ubicación/i.test(error.message),
  );

  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "entrada-simple-destino",
      name: "Simple",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 3,
    });
    seedPosProduct(sqlite, {
      id: "entrada-split-destino",
      name: "Split",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "split",
      stockVitrina: 2,
      stockBodega: 8,
    });
    seedPosProduct(sqlite, {
      id: "entrada-sin-control",
      name: "Sin control",
      category: "Cafés",
      priceClp: 1000,
      stockMode: "untracked",
    });
    seedPosProduct(sqlite, {
      id: "entrada-receta",
      name: "Receta",
      category: "Batidos",
      priceClp: 1000,
      stockMode: "untracked",
    });
    sqlite.exec(`
      INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
      VALUES ('entrada-insumo', 'Insumo', 'unidades', 2, 0, '2026-09-15T10:00:00.000Z');
      INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
      VALUES ('entrada-receta', 'entrada-insumo', 1);
    `);
    const { database } = sqliteD1Adapter(sqlite);

    for (const [productId, input, message] of [
      [
        "entrada-simple-destino",
        { id: "destino-simple-vitrina", quantity: 1, location: "vitrina" },
        /stock simple/i,
      ],
      [
        "entrada-split-destino",
        { id: "destino-split-simple", quantity: 1, location: "simple" },
        /selecciona Vitrina o Bodega/i,
      ],
      [
        "entrada-sin-control",
        { id: "destino-sin-control", quantity: 1, location: "simple" },
        /no tiene control de stock/i,
      ],
      [
        "entrada-receta",
        { id: "destino-receta", quantity: 1, location: "simple" },
        /stock compartido/i,
      ],
    ]) {
      await assert.rejects(
        () => pos.module.addProductStockEntry(database, productId, input),
        (error) => error.status === 400 && message.test(error.message),
      );
    }
    for (const quantity of [0, -1, 1.5, 1_000_001]) {
      await assert.rejects(
        () =>
          pos.module.addIngredientStockEntry(database, "entrada-insumo", {
            id: `cantidad-${String(quantity).replace(".", "-")}`,
            quantity,
          }),
        (error) => error.status === 400 && /entero entre 1/i.test(error.message),
      );
    }
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM inventory_stock_entries").get().count,
      0,
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'entrada-simple-destino'").get().stock,
      3,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare("SELECT stock_vitrina, stock_bodega FROM products WHERE id = 'entrada-split-destino'")
          .get(),
      },
      { stock_vitrina: 2, stock_bodega: 8 },
    );
  } finally {
    sqlite.close();
  }
});

test("las variantes reales de cada batido consumen sus porciones compartidas", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sqlite_schema
          WHERE type = 'index'
            AND name IN (
              'uq_shift_sessions_business_date_shift',
              'uq_cash_closures_business_date_shift'
            )
        `)
        .get().count,
      0,
    );
    const { database } = sqliteD1Adapter(sqlite);
    await catalog.module.syncCatalog(
      database,
      new Date("2026-09-01T12:00:00.000Z"),
    );
    const session = await openTestSession(database);

    const initialProducts = await pos.module.listProducts(database, {
      activeOnly: true,
    });
    const initialById = new Map(initialProducts.map((product) => [product.id, product]));
    for (const id of ["berry-fit", "berry-fit-53g"]) {
      assert.equal(initialById.get(id)?.availableStock, 4);
      assert.equal(
        initialById.get(id)?.stockGroup,
        "ingredient:insumo-mix-berries-porcion-batido",
      );
    }
    for (const id of ["banana-fit", "banana-fit-53g"]) {
      assert.equal(initialById.get(id)?.availableStock, 27);
      assert.equal(
        initialById.get(id)?.stockGroup,
        "ingredient:insumo-platano-porcion-batido",
      );
    }

    const berrySale = await pos.module.createSale(database, {
      id: "venta-berry-compartida",
      sessionId: session.id,
      paymentMethod: "tarjeta",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        { productId: "berry-fit", unitPriceClp: 3900, quantity: 1 },
        { productId: "berry-fit-53g", unitPriceClp: 5400, quantity: 1 },
      ],
    });
    assert.equal(berrySale.sale.paymentMethod, "tarjeta");
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT stock, revision FROM ingredients
            WHERE id = 'insumo-mix-berries-porcion-batido'
          `)
          .get(),
      },
      { stock: 2, revision: 1 },
    );
    const afterBerry = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    assert.equal(afterBerry.get("berry-fit")?.availableStock, 2);
    assert.equal(afterBerry.get("berry-fit-53g")?.availableStock, 2);

    await pos.module.createSale(database, {
      id: "venta-banana-compartida",
      sessionId: session.id,
      paymentMethod: "efectivo",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        { productId: "banana-fit", unitPriceClp: 3900, quantity: 1 },
        { productId: "banana-fit-53g", unitPriceClp: 5400, quantity: 1 },
      ],
    });
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT stock, revision FROM ingredients
            WHERE id = 'insumo-platano-porcion-batido'
          `)
          .get(),
      },
      { stock: 25, revision: 1 },
    );
    const afterBanana = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    assert.equal(afterBanana.get("banana-fit")?.availableStock, 25);
    assert.equal(afterBanana.get("banana-fit-53g")?.availableStock, 25);
  } finally {
    sqlite.close();
  }
});

test("la promo Café + Muffin comparte y descuenta el stock de Muffin", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const { database } = sqliteD1Adapter(sqlite);
    await catalog.module.syncCatalog(
      database,
      new Date("2026-09-14T12:00:00.000Z"),
    );
    sqlite
      .prepare(`
        UPDATE ingredients
        SET stock = 3
        WHERE id = 'insumo-muffin-unidad'
      `)
      .run();
    const session = await openTestSession(database, {
      id: "sesion-promo-cafe-muffin",
    });

    const initialProducts = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    const muffin = initialProducts.get("muffin");
    const promo = initialProducts.get("promo-cafe-muffin");
    assert.equal(promo?.name, "Promo Café + Muffin");
    assert.equal(promo?.priceClp, 3200);
    assert.equal(muffin?.availableStock, 3);
    assert.equal(promo?.availableStock, 3);
    assert.equal(muffin?.stockGroup, "ingredient:insumo-muffin-unidad");
    assert.equal(promo?.stockGroup, muffin?.stockGroup);

    const created = await pos.module.createSale(database, {
      id: "venta-promo-cafe-muffin",
      sessionId: session.id,
      paymentMethod: "efectivo",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        { productId: "muffin", unitPriceClp: 1500, quantity: 1 },
        {
          productId: "promo-cafe-muffin",
          unitPriceClp: 3200,
          quantity: 1,
        },
      ],
    });
    assert.equal(created.sale.totalClp, 4700);
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT stock, revision FROM ingredients
            WHERE id = 'insumo-muffin-unidad'
          `)
          .get(),
      },
      { stock: 1, revision: 1 },
    );

    const afterSale = new Map(
      (await pos.module.listProducts(database, { activeOnly: true })).map(
        (product) => [product.id, product],
      ),
    );
    assert.equal(afterSale.get("muffin")?.availableStock, 1);
    assert.equal(afterSale.get("promo-cafe-muffin")?.availableStock, 1);
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-promo-sin-stock",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: [
            {
              productId: "promo-cafe-muffin",
              unitPriceClp: 3200,
              quantity: 2,
            },
          ],
        }),
      (error) => error.status === 409 && /insumo/.test(error.message),
    );
    assert.equal(
      sqlite
        .prepare(
          "SELECT stock FROM ingredients WHERE id = 'insumo-muffin-unidad'",
        )
        .get().stock,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("venta pendiente, recetas y cierre son atómicos e idempotentes", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "simple",
      name: "Simple",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 2,
    });
    seedPosProduct(sqlite, {
      id: "split",
      name: "Split",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 1,
      stockBodega: 5,
    });
    const futureProductVersion = "2099-01-01T00:00:00.000Z";
    sqlite
      .prepare("UPDATE products SET updated_at = ? WHERE id = 'split'")
      .run(futureProductVersion);
    seedPosProduct(sqlite, {
      id: "batido",
      name: "Batido",
      category: "Batidos",
      priceClp: 3000,
      stockMode: "untracked",
    });
    seedPosProduct(sqlite, {
      id: "batido-grande",
      name: "Batido grande",
      category: "Batidos",
      priceClp: 5000,
      stockMode: "untracked",
    });
    sqlite
      .prepare(`
        INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
        VALUES ('platano', 'Plátano', 'porciones', 2, 0, ?)
      `)
      .run("2026-08-31T12:00:00.000Z");
    sqlite
      .prepare(`
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
        VALUES ('batido', 'platano', 1)
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
        VALUES ('batido-grande', 'platano', 1)
      `)
      .run();

    const { database } = sqliteD1Adapter(sqlite);
    const session = await openTestSession(database, { id: "sesion-recetas" });
    const staleSplit = await pos.module.findProduct(database, "split");
    assert.ok(staleSplit);
    const input = {
      id: "venta-pendiente",
      sessionId: session.id,
      paymentMethod: "pendiente",
      debtNote: "Cliente gimnasio",
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        { productId: "simple", unitPriceClp: 1000, quantity: 1 },
        { productId: "split", unitPriceClp: 2000, quantity: 1 },
        { productId: "batido", unitPriceClp: 3000, quantity: 1 },
        { productId: "batido-grande", unitPriceClp: 5000, quantity: 1 },
      ],
    };
    const created = await pos.module.createSale(database, input);
    assert.equal(created.idempotent, false);
    assert.equal(created.sale.paymentStatus, "pending");
    assert.equal(created.sale.paymentMethod, "pendiente");
    assert.equal(created.sale.totalClp, 11000);
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT
              (SELECT stock FROM products WHERE id = 'simple') AS simple,
              (SELECT stock_vitrina FROM products WHERE id = 'split') AS vitrina,
              (SELECT stock_bodega FROM products WHERE id = 'split') AS bodega,
              (SELECT stock FROM ingredients WHERE id = 'platano') AS ingrediente
          `)
          .get(),
      },
      { simple: 1, vitrina: 0, bodega: 5, ingrediente: 0 },
    );
    await assert.rejects(
      () =>
        pos.module.updateProduct(database, "split", {
          expectedUpdatedAt: staleSplit.updatedAt,
          sku: staleSplit.sku,
          name: staleSplit.name,
          category: staleSplit.category,
          priceClp: staleSplit.priceClp,
          stockMode: staleSplit.stockMode,
          stock: staleSplit.stock,
          stockVitrina: staleSplit.stockVitrina,
          stockBodega: 9,
          active: staleSplit.active,
          needsPriceReview: staleSplit.needsPriceReview,
        }),
      (error) => error.status === 409 && /producto cambió/i.test(error.message),
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(
            "SELECT stock_vitrina, stock_bodega FROM products WHERE id = 'split'",
          )
          .get(),
      },
      { stock_vitrina: 0, stock_bodega: 5 },
    );
    assert.ok(
      Date.parse(
        sqlite
          .prepare("SELECT updated_at FROM products WHERE id = 'split'")
          .get().updated_at,
      ) > Date.parse(futureProductVersion),
      "la venta debe avanzar updated_at incluso si el reloj está detrás",
    );
    await assert.rejects(
      () =>
        pos.module.updateProduct(database, "batido", {
          expectedUpdatedAt: "2026-08-31T12:00:00.000Z",
          sku: null,
          name: "Batido",
          category: "Batidos",
          priceClp: 3000,
          stockMode: "simple",
          stock: 3,
          stockVitrina: null,
          stockBodega: null,
          active: true,
          needsPriceReview: false,
        }),
      (error) => error.status === 400 && /receta.*insumos/i.test(error.message),
    );

    const retry = await pos.module.createSale(database, input);
    assert.equal(retry.idempotent, true);
    assert.equal(
      sqlite.prepare("SELECT stock FROM ingredients WHERE id = 'platano'").get()
        .stock,
      0,
    );
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          ...input,
          items: [{ productId: "simple", unitPriceClp: 1000, quantity: 2 }],
        }),
      (error) => error.status === 409 && /contenido diferente/.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-split-insuficiente",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: [{ productId: "split", unitPriceClp: 2000, quantity: 1 }],
        }),
      (error) => error.status === 409 && /vitrina/.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-insumo-insuficiente",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: [{ productId: "batido", unitPriceClp: 3000, quantity: 1 }],
        }),
      (error) => error.status === 409 && /insumo/.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-precio-antiguo",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: [{ productId: "simple", unitPriceClp: 999, quantity: 1 }],
        }),
      (error) => error.status === 409 && /precio.*cambió/i.test(error.message),
    );
    const adjustedIngredient = await pos.module.updateIngredientStock(
      database,
      "platano",
      { stock: 4, expectedRevision: 1 },
    );
    assert.equal(adjustedIngredient.revision, 2);
    await assert.rejects(
      () =>
        pos.module.updateIngredientStock(database, "platano", {
          stock: 9,
          expectedRevision: 1,
        }),
      (error) => error.status === 409 && /cambió/.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM ingredients WHERE id = 'platano'").get()
        .stock,
      4,
    );

    const open = await pos.module.listPendingDebts(database, { role: "admin" });
    assert.equal(open.summary.count, 1);
    assert.equal(open.summary.totalClp, 11000);
    assert.equal(open.hasMore, false);
    assert.equal(open.nextCursor, null);
    const settled = await pos.module.settleDebt(
      database,
      input.id,
      {
        id: "cierre-001",
        sessionId: session.id,
        paymentMethod: "tarjeta",
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "admin",
    );
    assert.equal(settled.idempotent, false);
    assert.equal(settled.sale.paymentStatus, "paid");
    assert.equal(settled.sale.paymentMethod, "pendiente");
    assert.equal(settled.sale.settledPaymentMethod, "tarjeta");
    assert.equal(settled.sale.debtNote, "Cliente gimnasio");
    assert.ok(settled.sale.paidAt);

    const settlementRetry = await pos.module.settleDebt(
      database,
      input.id,
      {
        id: "cierre-001",
        sessionId: session.id,
        paymentMethod: "tarjeta",
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "admin",
    );
    assert.equal(settlementRetry.idempotent, true);
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          input.id,
          {
            id: "cierre-diferente",
            sessionId: session.id,
            paymentMethod: "tarjeta",
            shift: "am",
            responsible: "Matías Muñoz",
          },
          "admin",
        ),
      (error) => error.status === 409 && /ya fue pagada/.test(error.message),
    );
    assert.equal(
      (await pos.module.listPendingDebts(database, { role: "admin" })).summary
        .count,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test("los abonos parciales mantienen saldo, trazabilidad, cierres e idempotencia", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-abonos",
      name: "Producto abonos",
      category: "Tienda",
      priceClp: 10000,
      stockMode: "simple",
      stock: 5,
    });
    const adapter = sqliteD1Adapter(sqlite);
    const { database } = adapter;
    const amNow = new Date("2026-09-01T13:00:00.000Z");
    const pmNow = new Date("2026-09-01T18:00:00.000Z");
    const amSession = await openTestSession(database, {
      id: "sesion-abonos-am",
      responsible: "Matías Muñoz",
      now: amNow,
    });
    await pos.module.createSale(
      database,
      {
        id: "deuda-abonos",
        sessionId: amSession.id,
        paymentMethod: "pendiente",
        debtNote: "Cliente con abonos",
        debtorCollaborator: null,
        seller: "Matías Muñoz",
        shift: "am",
        items: [
          { productId: "producto-abonos", unitPriceClp: 10000, quantity: 1 },
        ],
      },
      amNow,
    );

    const firstInput = {
      id: "550e8400-e29b-41d4-a716-446655440010",
      sessionId: amSession.id,
      paymentMethod: "efectivo",
      amountClp: 3000,
      shift: null,
      responsible: null,
    };
    const callsBeforeSettlement = adapter.getPrepareCalls();
    const first = await pos.module.settleDebt(
      database,
      "deuda-abonos",
      firstInput,
      "admin",
      amNow,
    );
    assert.ok(
      adapter.getPrepareCalls() - callsBeforeSettlement < 20,
      "un abono debe mantenerse bajo el presupuesto de consultas D1",
    );
    assert.equal(first.idempotent, false);
    assert.deepEqual(
      {
        status: first.sale.paymentStatus,
        paidClp: first.sale.paidClp,
        balanceClp: first.sale.balanceClp,
        paymentCount: first.sale.paymentCount,
        paidAt: first.sale.paidAt,
        settledMethod: first.sale.settledPaymentMethod,
      },
      {
        status: "pending",
        paidClp: 3000,
        balanceClp: 7000,
        paymentCount: 1,
        paidAt: null,
        settledMethod: null,
      },
    );
    assert.deepEqual(first.payment, {
      id: firstInput.id,
      createdAt: amNow.toISOString(),
      businessDate: "2026-09-01",
      shift: "am",
      sessionId: amSession.id,
      paymentMethod: "efectivo",
      amountClp: 3000,
      receivedBy: "Matías Muñoz",
      kind: "settlement",
    });
    assert.equal(
      (await pos.module.settleDebt(
        database,
        "deuda-abonos",
        firstInput,
        "admin",
        amNow,
      ))
        .idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          "deuda-abonos",
          { ...firstInput, amountClp: 2000 },
          "admin",
          amNow,
        ),
      (error) => error.status === 409 && /id del abono/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          "deuda-abonos",
          {
            id: "legacy-sin-monto",
            sessionId: amSession.id,
            paymentMethod: "efectivo",
            shift: "am",
            responsible: "Matías Muñoz",
          },
          "admin",
          amNow,
        ),
      (error) => error.status === 409 && /abonos parciales.*actualiza/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          "deuda-abonos",
          {
            ...firstInput,
            id: "550e8400-e29b-41d4-a716-446655440011",
            amountClp: 7001,
          },
          "admin",
          amNow,
        ),
      (error) => error.status === 409 && /supera el saldo/i.test(error.message),
    );

    const openDebts = await pos.module.listPendingDebts(database, {
      role: "admin",
    });
    assert.deepEqual(openDebts.summary, {
      count: 1,
      totalClp: 7000,
      originalClp: 10000,
      paidClp: 3000,
      balanceClp: 7000,
    });
    assert.deepEqual(
      {
        totalClp: openDebts.debts[0].totalClp,
        paidClp: openDebts.debts[0].paidClp,
        balanceClp: openDebts.debts[0].balanceClp,
        paymentCount: openDebts.debts[0].paymentCount,
      },
      { totalClp: 10000, paidClp: 3000, balanceClp: 7000, paymentCount: 1 },
    );

    const amPreview = await pos.module.getCashClosurePreview(
      database,
      amSession.businessDate,
      amSession.shift,
    );
    assert.equal(amPreview.cashMovementsClp, 3000);
    assert.equal(amPreview.pendingCustomerClp, 7000);
    assert.equal(amPreview.pendingCustomers[0].totalClp, 7000);
    const amInventory = await pos.module.listClosingInventory(database);
    await pos.module.createCashClosure(
      database,
      exactClosureInput(amSession, amPreview, amInventory),
      amNow,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT amount_clp FROM cash_closure_debts
          WHERE closure_id = ? AND sale_id = 'deuda-abonos'
        `)
        .get(`cierre-${amSession.id}`).amount_clp,
      7000,
    );

    const pmSession = await openTestSession(database, {
      id: "sesion-abonos-pm",
      shift: "pm",
      responsible: "Bárbara Vega",
      now: pmNow,
    });
    const final = await pos.module.settleDebt(
      database,
      "deuda-abonos",
      {
        id: "550e8400-e29b-41d4-a716-446655440012",
        sessionId: pmSession.id,
        paymentMethod: "tarjeta",
        amountClp: 7000,
        shift: null,
        responsible: null,
      },
      "admin",
      pmNow,
    );
    assert.deepEqual(
      {
        status: final.sale.paymentStatus,
        paidClp: final.sale.paidClp,
        balanceClp: final.sale.balanceClp,
        paymentCount: final.sale.paymentCount,
        settledMethod: final.sale.settledPaymentMethod,
      },
      {
        status: "paid",
        paidClp: 10000,
        balanceClp: 0,
        paymentCount: 2,
        settledMethod: "tarjeta",
      },
    );
    assert.deepEqual(
      final.sale.payments.map(({ amountClp, paymentMethod, shift, receivedBy }) => ({
        amountClp,
        paymentMethod,
        shift,
        receivedBy,
      })),
      [
        {
          amountClp: 3000,
          paymentMethod: "efectivo",
          shift: "am",
          receivedBy: "Matías Muñoz",
        },
        {
          amountClp: 7000,
          paymentMethod: "tarjeta",
          shift: "pm",
          receivedBy: "Bárbara Vega",
        },
      ],
    );
    assert.equal(
      (await pos.module.listPendingDebts(database, { role: "admin" })).summary
        .count,
      0,
    );
    const daily = await pos.module.getDailySummary(database, pmNow);
    assert.equal(daily.collectedClp, 10000);
    assert.equal(daily.outstandingClp, 0);
    const pmPreview = await pos.module.getCashClosurePreview(
      database,
      pmSession.businessDate,
      pmSession.shift,
    );
    assert.equal(pmPreview.totalSalesClp, 0);
    assert.equal(pmPreview.expectedCardClp, 7000);
    assert.equal(pmPreview.pendingCustomerClp, 0);

    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO sale_payments (
              id, sale_id, payment_method, amount_clp, kind
            ) VALUES (
              'settlement:externo', 'deuda-abonos', 'efectivo', 1,
              'settlement'
            )
          `)
          .run(),
      /payment exceeds sale balance/,
    );

    await pos.module.createSale(
      database,
      {
        id: "deuda-concurrente",
        sessionId: pmSession.id,
        paymentMethod: "pendiente",
        debtNote: "Carrera de abonos",
        debtorCollaborator: null,
        seller: "Bárbara Vega",
        shift: "pm",
        items: [
          { productId: "producto-abonos", unitPriceClp: 10000, quantity: 1 },
        ],
      },
      pmNow,
    );
    const concurrent = await Promise.allSettled([
      pos.module.settleDebt(
        database,
        "deuda-concurrente",
        {
          id: "550e8400-e29b-41d4-a716-446655440013",
          sessionId: pmSession.id,
          paymentMethod: "efectivo",
          amountClp: 8000,
          shift: null,
          responsible: null,
        },
        "admin",
        pmNow,
      ),
      pos.module.settleDebt(
        database,
        "deuda-concurrente",
        {
          id: "550e8400-e29b-41d4-a716-446655440014",
          sessionId: pmSession.id,
          paymentMethod: "transferencia",
          amountClp: 8000,
          shift: null,
          responsible: null,
        },
        "admin",
        pmNow,
      ),
    ]);
    assert.equal(concurrent.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(concurrent.filter(({ status }) => status === "rejected").length, 1);
    const racedDebt = (
      await pos.module.listPendingDebts(database, { role: "admin" })
    ).debts.find(
      ({ id }) => id === "deuda-concurrente",
    );
    assert.ok(racedDebt);
    assert.equal(racedDebt.paidClp, 8000);
    assert.equal(racedDebt.balanceClp, 2000);
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sale_payments WHERE sale_id = 'deuda-concurrente'")
        .get().count,
      1,
    );

    sqlite
      .prepare(`
        INSERT INTO sales (
          id, payment_status, checkout_method, debt_note, total_clp
        ) VALUES (
          'deuda-historial-largo', 'pending', 'pendiente',
          'Historial paginado', 1000
        )
      `)
      .run();
    const insertHistoryPayment = sqlite.prepare(`
      INSERT INTO sale_payments (
        id, sale_id, created_at, payment_method, amount_clp, kind
      ) VALUES (?, 'deuda-historial-largo', ?, 'efectivo', 1, 'settlement')
    `);
    for (let index = 0; index < 21; index += 1) {
      insertHistoryPayment.run(
        `settlement:historial-${index}`,
        `2026-09-01T19:00:${String(index).padStart(2, "0")}.000Z`,
      );
    }
    const boundedHistory = (
      await pos.module.listPendingDebts(database, { role: "admin" })
    ).debts.find(
      ({ id }) => id === "deuda-historial-largo",
    );
    assert.ok(boundedHistory);
    assert.equal(boundedHistory.paidClp, 21);
    assert.equal(boundedHistory.balanceClp, 979);
    assert.equal(boundedHistory.paymentCount, 21);
    assert.equal(boundedHistory.payments.length, 20);
    assert.equal(boundedHistory.paymentsHasMore, true);
  } finally {
    sqlite.close();
  }
});

test("Ventas puede abonar consumos de colaboradores y el cobro conserva trazabilidad e idempotencia", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-deudas-por-rol",
      name: "Producto deudas por rol",
      category: "Alimentos",
      priceClp: 5000,
      stockMode: "simple",
      stock: 10,
    });
    const adapter = sqliteD1Adapter(sqlite);
    const { database } = adapter;
    const now = new Date("2026-09-02T13:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-cobros-por-rol",
      responsible: "Matías Muñoz",
      now,
    });
    const saleBase = {
      sessionId: session.id,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        {
          productId: "producto-deudas-por-rol",
          unitPriceClp: 5000,
          quantity: 1,
        },
      ],
    };
    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "deuda-cliente-ventas",
        paymentMethod: "pendiente",
        debtNote: "Cliente gimnasio",
        debtorCollaborator: null,
      },
      now,
    );
    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "deuda-colaborador-mensual",
        paymentMethod: "colaborador",
        debtNote: "Cobrar a fin de mes",
        debtorCollaborator: "Bárbara Vega",
      },
      now,
    );

    const collaboratorInput = {
      id: "cobro-colaborador-mensual",
      sessionId: session.id,
      paymentMethod: "transferencia",
      amountClp: 2000,
      shift: "am",
      responsible: "Matías Muñoz",
    };
    const collaboratorState = () => ({
      sale: sqlite
        .prepare(`
          SELECT payment_status, payment_method, paid_at, settlement_id
          FROM sales WHERE id = 'deuda-colaborador-mensual'
        `)
        .get(),
      payments: sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sale_payments
          WHERE sale_id = 'deuda-colaborador-mensual'
        `)
        .get().count,
      activityRevision: sqlite
        .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
        .get(session.id).activity_revision,
    });
    const collaboratorPayment = await pos.module.settleDebt(
      database,
      "deuda-colaborador-mensual",
      collaboratorInput,
      "sales",
      now,
    );
    assert.equal(collaboratorPayment.idempotent, false);
    assert.equal(collaboratorPayment.payment.amountClp, 2000);
    assert.equal(collaboratorPayment.payment.paymentMethod, "transferencia");
    assert.equal(collaboratorPayment.payment.receivedBy, "Matías Muñoz");
    assert.equal(collaboratorPayment.sale.paymentStatus, "pending");
    assert.equal(collaboratorPayment.sale.paymentMethod, "colaborador");
    assert.equal(collaboratorPayment.sale.paidClp, 2000);
    assert.equal(collaboratorPayment.sale.balanceClp, 3000);
    assert.equal(
      (
        await pos.module.settleDebt(
          database,
          "deuda-colaborador-mensual",
          collaboratorInput,
          "sales",
          now,
        )
      ).idempotent,
      true,
    );

    const customerPayment = await pos.module.settleDebt(
      database,
      "deuda-cliente-ventas",
      {
        id: "cobro-cliente-ventas",
        sessionId: session.id,
        paymentMethod: "efectivo",
        amountClp: 5000,
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "sales",
      now,
    );
    assert.equal(customerPayment.idempotent, false);
    assert.equal(customerPayment.sale.paymentStatus, "paid");

    const adminPayment = await pos.module.settleDebt(
      database,
      "deuda-colaborador-mensual",
      {
        ...collaboratorInput,
        id: "cobro-colaborador-restante",
        amountClp: 3000,
      },
      "admin",
      now,
    );
    assert.equal(adminPayment.idempotent, false);
    assert.equal(adminPayment.sale.paymentStatus, "paid");
    assert.equal(adminPayment.sale.paymentMethod, "colaborador");
    assert.deepEqual(collaboratorState().payments, 2);

    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "deuda-cambia-durante-cobro",
        paymentMethod: "pendiente",
        debtNote: "Cambiar autorización durante el cobro",
        debtorCollaborator: null,
      },
      now,
    );
    const revisionBeforeRace = sqlite
      .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
      .get(session.id).activity_revision;
    let changedBeforeBatch = false;
    const racingDatabase = {
      ...database,
      async batch(statements) {
        if (!changedBeforeBatch) {
          sqlite
            .prepare(`
              UPDATE sales
              SET checkout_method = 'colaborador',
                debt_note = 'Cobrar a fin de mes',
                debtor_collaborator = 'Bárbara Vega'
              WHERE id = 'deuda-cambia-durante-cobro'
            `)
            .run();
          changedBeforeBatch = true;
        }
        return database.batch(statements);
      },
    };
    const racedPayment = await pos.module.settleDebt(
      racingDatabase,
      "deuda-cambia-durante-cobro",
      {
        id: "cobro-race-autorizacion",
        sessionId: session.id,
        paymentMethod: "efectivo",
        amountClp: 5000,
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "sales",
      now,
    );
    assert.equal(racedPayment.idempotent, false);
    assert.equal(racedPayment.sale.paymentStatus, "paid");
    assert.equal(racedPayment.sale.paymentMethod, "colaborador");
    assert.equal(changedBeforeBatch, true);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sale_payments
          WHERE sale_id = 'deuda-cambia-durante-cobro'
        `)
        .get().count,
      1,
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT payment_status, payment_method, paid_at, settlement_id
            FROM sales WHERE id = 'deuda-cambia-durante-cobro'
          `)
          .get(),
      },
      {
        payment_status: "paid",
        payment_method: "efectivo",
        paid_at: now.toISOString(),
        settlement_id: "cobro-race-autorizacion",
      },
    );
    assert.equal(
      sqlite
        .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
        .get(session.id).activity_revision,
      revisionBeforeRace + 1,
    );
  } finally {
    sqlite.close();
  }
});

test("dos ventas concurrentes no sobregiran stock simple", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "simple-unico",
      name: "Simple único",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 1,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const session = await openTestSession(database, {
      id: "sesion-concurrencia",
    });
    const sale = (id) => ({
      id,
      sessionId: session.id,
      paymentMethod: "efectivo",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [{ productId: "simple-unico", unitPriceClp: 1000, quantity: 1 }],
    });
    const results = await Promise.allSettled([
      pos.module.createSale(database, sale("concurrente-a")),
      pos.module.createSale(database, sale("concurrente-b")),
    ]);
    assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(results.filter(({ status }) => status === "rejected").length, 1);
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'simple-unico'").get()
        .stock,
      0,
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sales WHERE id IN ('concurrente-a', 'concurrente-b')")
        .get().count,
      1,
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sale_items WHERE sale_id IN ('concurrente-a', 'concurrente-b')")
        .get().count,
      1,
    );
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-demasiado-grande",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: Array.from({ length: 11 }, (_value, index) => ({
            productId: `producto-${index}`,
            unitPriceClp: 1000,
            quantity: 1,
          })),
        }),
      (error) => error.status === 400 && /10 productos/.test(error.message),
    );

    for (let index = 0; index < 10; index += 1) {
      const productId = `receta-${index}`;
      const ingredientId = `insumo-${index}`;
      seedPosProduct(sqlite, {
        id: productId,
        name: `Receta ${index}`,
        category: "Batidos",
        priceClp: 1000,
        stockMode: "untracked",
      });
      sqlite
        .prepare(`
          INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
          VALUES (?, ?, 'porciones', 5, 0, '2026-08-31T12:00:00.000Z')
        `)
        .run(ingredientId, `Insumo ${index}`);
      sqlite
        .prepare(`
          INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
          VALUES (?, ?, 1)
        `)
        .run(productId, ingredientId);
    }
    await assert.rejects(
      () =>
        pos.module.createSale(database, {
          id: "venta-demasiadas-operaciones",
          sessionId: session.id,
          paymentMethod: "efectivo",
          debtNote: null,
          debtorCollaborator: null,
          seller: "Matías Muñoz",
          shift: "am",
          items: Array.from({ length: 10 }, (_value, index) => ({
            productId: `receta-${index}`,
            unitPriceClp: 1000,
            quantity: 1,
          })),
        }),
      (error) => error.status === 400 && /demasiadas operaciones/.test(error.message),
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sales WHERE id = ?")
        .get("venta-demasiadas-operaciones").count,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test("las transferencias solo ingresan a caja después de validar el correo de Mercado Pago", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-transferencia-validable",
      name: "Producto transferencia validable",
      category: "Alimentos",
      priceClp: 3200,
      stockMode: "simple",
      stock: 3,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-17T15:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-validar-transferencia",
      now,
    });
    const created = await pos.module.createSale(
      database,
      {
        id: "venta-transferencia-validable",
        sessionId: session.id,
        paymentMethod: "transferencia",
        debtNote: null,
        debtorCollaborator: null,
        seller: "Matías Muñoz",
        shift: "am",
        items: [
          {
            productId: "producto-transferencia-validable",
            unitPriceClp: 3200,
            quantity: 1,
          },
        ],
      },
      now,
    );
    assert.equal(created.sale.paymentStatus, "verification_pending");
    assert.equal(created.sale.paidClp, 0);
    assert.equal(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS count FROM sale_payments WHERE sale_id = 'venta-transferencia-validable'",
        )
        .get().count,
      0,
    );
    assert.equal(
      (await pos.module.listPendingDebts(database, { role: "sales" })).summary.count,
      0,
    );

    const before = await pos.module.listTodaySales(
      database,
      { role: "sales", limit: 20 },
      now,
    );
    assert.deepEqual(before.summary, {
      totalSalesClp: 3200,
      collectedClp: 0,
      settlementClp: 0,
      cashClp: 0,
      cardClp: 0,
      transferClp: 0,
      pendingTransferClp: 3200,
      pendingTransferCount: 1,
    });

    const input = {
      id: "f1111111-1111-4111-8111-111111111111",
      sessionId: session.id,
      emailReference: "Recibiste un pago · operación MP 123456",
    };
    const validated = await pos.module.validateTransferPayment(
      database,
      "venta-transferencia-validable",
      input,
      "sales",
      new Date(now.getTime() + 60_000),
    );
    assert.equal(validated.sale.paymentStatus, "paid");
    assert.equal(validated.sale.paidClp, 3200);
    assert.equal(validated.validatedBy, "Matías Muñoz");
    assert.equal(validated.emailReference, input.emailReference);
    assert.equal(validated.idempotent, false);
    assert.equal(
      (
        await pos.module.validateTransferPayment(
          database,
          "venta-transferencia-validable",
          input,
          "sales",
          new Date(now.getTime() + 120_000),
        )
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.validateTransferPayment(
          database,
          "venta-transferencia-validable",
          { ...input, id: "f2222222-2222-4222-8222-222222222222" },
          "sales",
          new Date(now.getTime() + 120_000),
        ),
      (error) => error.status === 409 && /otro registro de correo/i.test(error.message),
    );

    const after = await pos.module.listTodaySales(
      database,
      { role: "sales", limit: 20 },
      new Date(now.getTime() + 60_000),
    );
    assert.deepEqual(after.summary, {
      totalSalesClp: 3200,
      collectedClp: 3200,
      settlementClp: 0,
      cashClp: 0,
      cardClp: 0,
      transferClp: 3200,
      pendingTransferClp: 0,
      pendingTransferCount: 0,
    });
    assert.equal(after.sales[0].transferEmailReference, input.emailReference);
    assert.throws(
      () =>
        sqlite
          .prepare("UPDATE transfer_validations SET email_reference = 'mutado'")
          .run(),
      /immutable/i,
    );
    assert.throws(
      () => sqlite.prepare("DELETE FROM transfer_validations").run(),
      /immutable/i,
    );
  } finally {
    sqlite.close();
  }
});

test("anular ventas directas conserva auditoría, repone el stock exacto y las excluye de caja", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "void-simple",
      name: "Producto simple anulable",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 5,
    });
    seedPosProduct(sqlite, {
      id: "void-split",
      name: "Producto vitrina anulable",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 4,
      stockBodega: 9,
    });
    seedPosProduct(sqlite, {
      id: "void-recipe",
      name: "Producto receta anulable",
      category: "Batidos",
      priceClp: 3000,
      stockMode: "untracked",
    });
    seedPosProduct(sqlite, {
      id: "void-card",
      name: "Producto tarjeta anulable",
      category: "Alimentos",
      priceClp: 4000,
      stockMode: "simple",
      stock: 3,
    });
    seedPosProduct(sqlite, {
      id: "void-transfer",
      name: "Producto transferencia anulable",
      category: "Alimentos",
      priceClp: 5000,
      stockMode: "simple",
      stock: 2,
    });
    sqlite.exec(`
      INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
      VALUES (
        'void-ingredient', 'Insumo anulable', 'porciones', 10, 0,
        '2026-09-17T12:00:00.000Z'
      );
      INSERT INTO product_ingredients (product_id, ingredient_id, quantity)
      VALUES ('void-recipe', 'void-ingredient', 2);
    `);

    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-17T15:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-anulaciones-directas",
      openingCashClp: 500,
      now,
    });
    const common = {
      sessionId: session.id,
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
    };
    const cashSaleInput = {
      ...common,
      id: "venta-anular-efectivo",
      paymentMethod: "efectivo",
      items: [
        { productId: "void-simple", unitPriceClp: 1000, quantity: 2 },
        { productId: "void-split", unitPriceClp: 2000, quantity: 1 },
        { productId: "void-recipe", unitPriceClp: 3000, quantity: 1 },
      ],
    };
    await pos.module.createSale(database, cashSaleInput, now);
    await pos.module.createSale(
      database,
      {
        ...common,
        id: "venta-anular-tarjeta",
        paymentMethod: "tarjeta",
        items: [{ productId: "void-card", unitPriceClp: 4000, quantity: 1 }],
      },
      new Date(now.getTime() + 1000),
    );
    await pos.module.createSale(
      database,
      {
        ...common,
        id: "venta-anular-transferencia",
        paymentMethod: "transferencia",
        items: [
          { productId: "void-transfer", unitPriceClp: 5000, quantity: 1 },
        ],
      },
      new Date(now.getTime() + 2000),
    );
    await pos.module.validateTransferPayment(
      database,
      "venta-anular-transferencia",
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        sessionId: session.id,
        emailReference: "Recibiste un pago · operación MP 5000",
      },
      "sales",
      new Date(now.getTime() + 2500),
    );

    assert.deepEqual(
      {
        ...sqlite.prepare(`
          SELECT
            (SELECT stock FROM products WHERE id = 'void-simple') AS simple,
            (SELECT stock_vitrina FROM products WHERE id = 'void-split') AS vitrina,
            (SELECT stock_bodega FROM products WHERE id = 'void-split') AS bodega,
            (SELECT stock FROM ingredients WHERE id = 'void-ingredient') AS ingredient,
            (SELECT stock FROM products WHERE id = 'void-card') AS card,
            (SELECT stock FROM products WHERE id = 'void-transfer') AS transfer
        `).get(),
      },
      { simple: 3, vitrina: 3, bodega: 9, ingredient: 8, card: 2, transfer: 1 },
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_inventory_snapshots").get().count,
      3,
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_inventory_consumptions").get().count,
      5,
    );

    const adminBefore = await pos.module.listTodaySales(
      database,
      { role: "admin", limit: 20 },
      now,
    );
    const salesBefore = await pos.module.listTodaySales(
      database,
      { role: "sales", limit: 20 },
      now,
    );
    assert.ok(adminBefore.sales.every(({ canVoid, voidedAt }) => canVoid && voidedAt === null));
    assert.ok(salesBefore.sales.every(({ canVoid }) => !canVoid));
    assert.deepEqual(adminBefore.summary, {
      totalSalesClp: 16000,
      collectedClp: 16000,
      settlementClp: 0,
      cashClp: 7000,
      cardClp: 4000,
      transferClp: 5000,
      pendingTransferClp: 0,
      pendingTransferCount: 0,
    });

    // La receta cambia después de la venta: la reposición debe usar el snapshot
    // original (2 porciones), no reconstruir el consumo con la receta nueva.
    sqlite
      .prepare(`
        UPDATE product_ingredients SET quantity = 4
        WHERE product_id = 'void-recipe' AND ingredient_id = 'void-ingredient'
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE products
        SET name = 'Producto simple renombrado',
          updated_at = '2026-09-17T15:00:02.500Z'
        WHERE id = 'void-simple'
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE ingredients
        SET name = 'Insumo renombrado', revision = revision + 1,
          updated_at = '2026-09-17T15:00:02.500Z'
        WHERE id = 'void-ingredient'
      `)
      .run();

    const currentRevision = () =>
      Number(
        sqlite
          .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
          .get(session.id).activity_revision,
      );
    const firstInput = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      sessionId: session.id,
      expectedActivityRevision: currentRevision(),
      reason: "Venta registrada dos veces",
    };
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-anular-efectivo",
          firstInput,
          "sales",
          new Date(now.getTime() + 3000),
        ),
      (error) => error.status === 403 && /Administración/i.test(error.message),
    );
    const firstVoid = await pos.module.voidSale(
      database,
      "venta-anular-efectivo",
      firstInput,
      "admin",
      new Date(now.getTime() + 3000),
    );
    assert.deepEqual(firstVoid, {
      saleId: "venta-anular-efectivo",
      voidedAt: "2026-09-17T15:00:03.000Z",
      voidReason: "Venta registrada dos veces",
      voidedBy: "Administrador",
      idempotent: false,
    });
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT item_id, item_name FROM inventory_stock_entries
          WHERE operation_token = ? ORDER BY item_id
        `)
        .all(firstInput.id)
        .map((row) => ({ ...row })),
      [
        { item_id: "void-ingredient", item_name: "Insumo anulable" },
        { item_id: "void-simple", item_name: "Producto simple anulable" },
        { item_id: "void-split", item_name: "Producto vitrina anulable" },
      ],
    );
    assert.deepEqual(
      JSON.parse(
        sqlite
          .prepare(`
            SELECT inventory_restoration_json FROM sale_voids
            WHERE sale_id = 'venta-anular-efectivo'
          `)
          .get().inventory_restoration_json,
      )
        .map(({ itemId, itemName }) => ({ itemId, itemName }))
        .sort((left, right) => left.itemId.localeCompare(right.itemId)),
      [
        { itemId: "void-ingredient", itemName: "Insumo anulable" },
        { itemId: "void-simple", itemName: "Producto simple anulable" },
        { itemId: "void-split", itemName: "Producto vitrina anulable" },
      ],
    );
    assert.deepEqual(
      {
        ...sqlite.prepare(`
          SELECT
            (SELECT name FROM products WHERE id = 'void-simple') AS product_name,
            (SELECT name FROM ingredients WHERE id = 'void-ingredient') AS ingredient_name
        `).get(),
      },
      {
        product_name: "Producto simple renombrado",
        ingredient_name: "Insumo renombrado",
      },
    );
    const replayGuardState = () => ({
      simpleStock: sqlite
        .prepare("SELECT stock FROM products WHERE id = 'void-simple'")
        .get().stock,
      ingredientStock: sqlite
        .prepare("SELECT stock FROM ingredients WHERE id = 'void-ingredient'")
        .get().stock,
      activityRevision: sqlite
        .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
        .get(session.id).activity_revision,
      restorationEntries: sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM inventory_stock_entries
          WHERE operation_token = ?
        `)
        .get(firstInput.id).count,
      voidAudit: {
        ...sqlite
          .prepare(`
            SELECT id, sale_id, created_at, reason, request_fingerprint,
              inventory_restoration_json, payment_snapshot_json
            FROM sale_voids WHERE sale_id = 'venta-anular-efectivo'
          `)
          .get(),
      },
    });
    const beforeSaleReplay = replayGuardState();
    await assert.rejects(
      () =>
        pos.module.createSale(
          database,
          cashSaleInput,
          new Date(now.getTime() + 3500),
        ),
      (error) => error.status === 409 && /venta fue anulada/i.test(error.message),
    );
    assert.deepEqual(replayGuardState(), beforeSaleReplay);

    assert.equal(
      (
        await pos.module.voidSale(
          database,
          "venta-anular-efectivo",
          firstInput,
          "admin",
          new Date(now.getTime() + 4000),
        )
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-anular-efectivo",
          { ...firstInput, reason: "Motivo distinto" },
          "admin",
          new Date(now.getTime() + 4000),
        ),
      (error) => error.status === 409 && /id de la anulación/i.test(error.message),
    );

    for (const [saleId, id, reason, offset] of [
      [
        "venta-anular-tarjeta",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        "Cobro ingresado por error",
        5000,
      ],
      [
        "venta-anular-transferencia",
        "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
        "Transferencia duplicada",
        6000,
      ],
    ]) {
      const result = await pos.module.voidSale(
        database,
        saleId,
        {
          id,
          sessionId: session.id,
          expectedActivityRevision: currentRevision(),
          reason,
        },
        "admin",
        new Date(now.getTime() + offset),
      );
      assert.equal(result.idempotent, false);
    }

    assert.deepEqual(
      {
        ...sqlite.prepare(`
          SELECT
            (SELECT stock FROM products WHERE id = 'void-simple') AS simple,
            (SELECT stock_vitrina FROM products WHERE id = 'void-split') AS vitrina,
            (SELECT stock_bodega FROM products WHERE id = 'void-split') AS bodega,
            (SELECT stock FROM ingredients WHERE id = 'void-ingredient') AS ingredient,
            (SELECT stock FROM products WHERE id = 'void-card') AS card,
            (SELECT stock FROM products WHERE id = 'void-transfer') AS transfer
        `).get(),
      },
      { simple: 5, vitrina: 4, bodega: 9, ingredient: 10, card: 3, transfer: 2 },
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sales WHERE id LIKE 'venta-anular-%'").get().count,
      3,
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_items WHERE sale_id LIKE 'venta-anular-%'").get().count,
      5,
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_payments WHERE sale_id LIKE 'venta-anular-%'").get().count,
      3,
    );
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM sale_voids").get().count, 3);
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM inventory_stock_entries WHERE operation_token LIKE '________-____-4___-8___-%'")
        .get().count,
      5,
    );

    const today = await pos.module.listTodaySales(
      database,
      { role: "admin", limit: 20 },
      new Date(now.getTime() + 7000),
    );
    assert.equal(today.totalCount, 3);
    assert.equal(today.sales.length, 3);
    assert.ok(
      today.sales.every(
        ({ voidedAt, voidedBy, voidReason, canVoid }) =>
          voidedAt !== null &&
          voidedBy === "Administrador" &&
          Boolean(voidReason) &&
          canVoid === false,
      ),
    );
    assert.deepEqual(today.summary, {
      totalSalesClp: 0,
      collectedClp: 0,
      settlementClp: 0,
      cashClp: 0,
      cardClp: 0,
      transferClp: 0,
      pendingTransferClp: 0,
      pendingTransferCount: 0,
    });
    assert.deepEqual(await pos.module.getDailySummary(database, now), {
      totalClp: 0,
      salesCount: 0,
      averageClp: 0,
      units: 0,
      collectedClp: 0,
      outstandingClp: 0,
    });
    const report = await pos.module.getDailySalesReport(
      database,
      { dateFrom: session.businessDate, dateTo: session.businessDate },
      now,
    );
    assert.equal(report.period.totalSalesClp, 0);
    assert.equal(report.period.salesCount, 0);
    assert.equal(report.period.collectedClp, 0);
    assert.equal(
      (
        await pos.module.listSalesHistory(database, {
          limit: 20,
          q: "venta-anular-",
        })
      ).totalCount,
      0,
    );
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    assert.equal(preview.totalSalesClp, 0);
    assert.equal(preview.salesCount, 0);
    assert.equal(preview.expectedCashClp, 500);
    assert.equal(preview.expectedCardClp, 0);
    assert.equal(preview.expectedTransferClp, 0);
    for (const sql of [
      "UPDATE sale_voids SET reason = 'mutado' WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'",
      "DELETE FROM sale_voids WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'",
      "UPDATE sale_inventory_consumptions SET quantity = 99 WHERE sale_id = 'venta-anular-efectivo'",
      "DELETE FROM sale_inventory_snapshots WHERE sale_id = 'venta-anular-efectivo'",
    ]) {
      assert.throws(() => sqlite.prepare(sql).run(), /immutable/i, sql);
    }
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("anular pendientes de cliente y colaborador elimina sus saldos sin inventar cobros", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "void-pending-product",
      name: "Producto pendiente anulable",
      category: "Alimentos",
      priceClp: 2500,
      stockMode: "simple",
      stock: 5,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-17T16:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-anulaciones-pendientes",
      now,
    });
    const baselineDebts = await pos.module.listPendingDebts(database, {
      role: "admin",
    });
    const base = {
      sessionId: session.id,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        {
          productId: "void-pending-product",
          unitPriceClp: 2500,
          quantity: 1,
        },
      ],
    };
    await pos.module.createSale(
      database,
      {
        ...base,
        id: "venta-pendiente-anulable",
        paymentMethod: "pendiente",
        debtNote: "Cliente duplicado",
        debtorCollaborator: null,
      },
      now,
    );
    await pos.module.createSale(
      database,
      {
        ...base,
        id: "venta-colaborador-anulable",
        paymentMethod: "colaborador",
        debtNote: "Consumo duplicado",
        debtorCollaborator: "Bárbara Vega",
      },
      new Date(now.getTime() + 1000),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-pending-product'").get().stock,
      3,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sale_payments
          WHERE sale_id IN ('venta-pendiente-anulable', 'venta-colaborador-anulable')
        `)
        .get().count,
      0,
    );
    const pendingBefore = await pos.module.listPendingDebts(database, {
      role: "sales",
    });
    assert.equal(pendingBefore.summary.count, baselineDebts.summary.count + 2);
    assert.equal(pendingBefore.summary.balanceClp, baselineDebts.summary.balanceClp + 5000);
    const todayBefore = await pos.module.listTodaySales(
      database,
      { role: "admin", limit: 20 },
      now,
    );
    assert.deepEqual(todayBefore.sales.map(({ canVoid }) => canVoid), [true, true]);
    assert.equal(todayBefore.summary.totalSalesClp, 5000);
    assert.equal(todayBefore.summary.collectedClp, 0);

    const revision = () =>
      Number(
        sqlite
          .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
          .get(session.id).activity_revision,
      );
    await pos.module.voidSale(
      database,
      "venta-pendiente-anulable",
      {
        id: "dddddddd-dddd-4ddd-8ddd-ddddddddddd4",
        sessionId: session.id,
        expectedActivityRevision: revision(),
        reason: "Deuda duplicada",
      },
      "admin",
      new Date(now.getTime() + 2000),
    );
    await pos.module.voidSale(
      database,
      "venta-colaborador-anulable",
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5",
        sessionId: session.id,
        expectedActivityRevision: revision(),
        reason: "Consumo duplicado",
      },
      "admin",
      new Date(now.getTime() + 3000),
    );

    const pendingAfter = await pos.module.listPendingDebts(database, {
      role: "sales",
    });
    assert.deepEqual(pendingAfter.summary, baselineDebts.summary);
    assert.deepEqual(
      pendingAfter.collaboratorSummaries,
      baselineDebts.collaboratorSummaries,
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-pending-product'").get().stock,
      5,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sale_payments
          WHERE sale_id IN ('venta-pendiente-anulable', 'venta-colaborador-anulable')
        `)
        .get().count,
      0,
    );
    const todayAfter = await pos.module.listTodaySales(
      database,
      { role: "admin", limit: 20 },
      new Date(now.getTime() + 4000),
    );
    assert.equal(todayAfter.totalCount, 2);
    assert.equal(todayAfter.summary.totalSalesClp, 0);
    assert.ok(todayAfter.sales.every(({ voidedAt, canVoid }) => voidedAt && !canVoid));
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          "venta-colaborador-anulable",
          {
            id: "abono-despues-anulacion",
            sessionId: session.id,
            paymentMethod: "efectivo",
            amountClp: 500,
            shift: "am",
            responsible: "Matías Muñoz",
          },
          "sales",
          new Date(now.getTime() + 5000),
        ),
      (error) => error.status === 409 && /anulada/i.test(error.message),
    );
  } finally {
    sqlite.close();
  }
});

test("la anulación bloquea abonos y usa CAS para no reponer stock con un turno desactualizado", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "void-guard-product",
      name: "Producto protegido al anular",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 10,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-17T17:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-guardas-anulacion",
      now,
    });
    const sale = (id, paymentMethod, debtNote = null) => ({
      id,
      sessionId: session.id,
      paymentMethod,
      debtNote,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        {
          productId: "void-guard-product",
          unitPriceClp: 1000,
          quantity: 1,
        },
      ],
    });
    await pos.module.createSale(
      database,
      sale("venta-con-abono-no-anulable", "pendiente", "Cliente con abono"),
      now,
    );
    await pos.module.settleDebt(
      database,
      "venta-con-abono-no-anulable",
      {
        id: "abono-antes-de-anular",
        sessionId: session.id,
        paymentMethod: "efectivo",
        amountClp: 500,
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "admin",
      new Date(now.getTime() + 1000),
    );
    const revision = () =>
      Number(
        sqlite
          .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
          .get(session.id).activity_revision,
      );
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-con-abono-no-anulable",
          {
            id: "11111111-1111-4111-8111-111111111111",
            sessionId: session.id,
            expectedActivityRevision: revision(),
            reason: "Intento con abono",
          },
          "admin",
          new Date(now.getTime() + 2000),
        ),
      (error) => error.status === 409 && /abonos/i.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-guard-product'").get().stock,
      9,
    );

    await pos.module.createSale(
      database,
      sale("venta-cas-anulable", "tarjeta"),
      new Date(now.getTime() + 3000),
    );
    const freshRevision = revision();
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-cas-anulable",
          {
            id: "22222222-2222-4222-8222-222222222222",
            sessionId: session.id,
            expectedActivityRevision: freshRevision - 1,
            reason: "Vista desactualizada",
          },
          "admin",
          new Date(now.getTime() + 4000),
        ),
      (error) => error.status === 409 && /actividad del turno cambió/i.test(error.message),
    );

    let injectedRace = false;
    const racingDatabase = {
      ...database,
      async batch(statements) {
        if (!injectedRace) {
          sqlite
            .prepare(`
              UPDATE shift_sessions SET activity_revision = activity_revision + 1
              WHERE id = ?
            `)
            .run(session.id);
          injectedRace = true;
        }
        return database.batch(statements);
      },
    };
    await assert.rejects(
      () =>
        pos.module.voidSale(
          racingDatabase,
          "venta-cas-anulable",
          {
            id: "33333333-3333-4333-8333-333333333333",
            sessionId: session.id,
            expectedActivityRevision: freshRevision,
            reason: "Carrera de actividad",
          },
          "admin",
          new Date(now.getTime() + 5000),
        ),
      (error) => error.status === 409 && /actividad del turno cambió/i.test(error.message),
    );
    assert.equal(injectedRace, true);
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM sale_voids").get().count,
      0,
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-guard-product'").get().stock,
      8,
    );

    const successful = await pos.module.voidSale(
      database,
      "venta-cas-anulable",
      {
        id: "44444444-4444-4444-8444-444444444444",
        sessionId: session.id,
        expectedActivityRevision: revision(),
        reason: "Venta duplicada confirmada",
      },
      "admin",
      new Date(now.getTime() + 6000),
    );
    assert.equal(successful.idempotent, false);
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-guard-product'").get().stock,
      9,
    );
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-cas-anulable",
          {
            id: "55555555-5555-4555-8555-555555555555",
            sessionId: session.id,
            expectedActivityRevision: revision(),
            reason: "Segundo intento distinto",
          },
          "admin",
          new Date(now.getTime() + 7000),
        ),
      (error) => error.status === 409 && /ya fue anulada/i.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-guard-product'").get().stock,
      9,
    );

    await pos.module.createSale(
      database,
      sale("venta-stock-race-anulable", "transferencia"),
      new Date(now.getTime() + 8000),
    );
    const stockRaceRevision = revision();
    let inventoryRaceInjected = false;
    const stockRacingDatabase = {
      ...database,
      async batch(statements) {
        if (!inventoryRaceInjected) {
          sqlite
            .prepare(`
              UPDATE products SET stock = stock - 1
              WHERE id = 'void-guard-product'
            `)
            .run();
          inventoryRaceInjected = true;
        }
        return database.batch(statements);
      },
    };
    await assert.rejects(
      () =>
        pos.module.voidSale(
          stockRacingDatabase,
          "venta-stock-race-anulable",
          {
            id: "88888888-8888-4888-8888-888888888888",
            sessionId: session.id,
            expectedActivityRevision: stockRaceRevision,
            reason: "Carrera de inventario",
          },
          "admin",
          new Date(now.getTime() + 9000),
        ),
      (error) => error.status === 409 && /inventario cambió/i.test(error.message),
    );
    assert.equal(inventoryRaceInjected, true);
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sale_voids WHERE sale_id = 'venta-stock-race-anulable'")
        .get().count,
      0,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM inventory_stock_entries
          WHERE operation_token = '88888888-8888-4888-8888-888888888888'
        `)
        .get().count,
      0,
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-guard-product'").get().stock,
      7,
    );
    const debts = await pos.module.listPendingDebts(database, {
      role: "admin",
      kind: "customer",
    });
    const partiallyPaid = debts.debts.find(
      ({ id }) => id === "venta-con-abono-no-anulable",
    );
    assert.ok(partiallyPaid);
    assert.equal(partiallyPaid.paidClp, 500);
    assert.equal(partiallyPaid.balanceClp, 500);
  } finally {
    sqlite.close();
  }
});

test("la anulación rechaza ventas antiguas y ventas cuyo turno ya fue cerrado", async () => {
  const oldSqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(oldSqlite);
    seedPosProduct(oldSqlite, {
      id: "void-old-product",
      name: "Producto venta antigua",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 2,
    });
    const { database } = sqliteD1Adapter(oldSqlite);
    const yesterday = new Date("2026-09-16T15:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-venta-antigua",
      now: yesterday,
    });
    await pos.module.createSale(
      database,
      {
        id: "venta-antigua-no-anulable",
        sessionId: session.id,
        paymentMethod: "efectivo",
        debtNote: null,
        debtorCollaborator: null,
        seller: "Matías Muñoz",
        shift: "am",
        items: [
          { productId: "void-old-product", unitPriceClp: 1000, quantity: 1 },
        ],
      },
      yesterday,
    );
    const activityRevision = Number(
      oldSqlite
        .prepare("SELECT activity_revision FROM shift_sessions WHERE id = ?")
        .get(session.id).activity_revision,
    );
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-antigua-no-anulable",
          {
            id: "66666666-6666-4666-8666-666666666666",
            sessionId: session.id,
            expectedActivityRevision: activityRevision,
            reason: "Fuera del día permitido",
          },
          "admin",
          new Date("2026-09-17T15:00:00.000Z"),
        ),
      (error) => error.status === 409 && /día actual/i.test(error.message),
    );
    assert.equal(
      oldSqlite.prepare("SELECT stock FROM products WHERE id = 'void-old-product'").get().stock,
      1,
    );
    assert.equal(oldSqlite.prepare("SELECT COUNT(*) AS count FROM sale_voids").get().count, 0);
  } finally {
    oldSqlite.close();
  }

  const closedSqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(closedSqlite);
    seedPosProduct(closedSqlite, {
      id: "void-closed-product",
      name: "Producto de turno cerrado",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 2,
    });
    const { database } = sqliteD1Adapter(closedSqlite);
    const now = new Date("2026-09-17T18:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-venta-cerrada",
      now,
    });
    await pos.module.createSale(
      database,
      {
        id: "venta-cierre-no-anulable",
        sessionId: session.id,
        paymentMethod: "efectivo",
        debtNote: null,
        debtorCollaborator: null,
        seller: "Matías Muñoz",
        shift: "am",
        items: [
          {
            productId: "void-closed-product",
            unitPriceClp: 1000,
            quantity: 1,
          },
        ],
      },
      now,
    );
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const inventory = await pos.module.listClosingInventory(database);
    await pos.module.createCashClosure(
      database,
      exactClosureInput(session, preview, inventory, {
        id: "cierre-venta-no-anulable",
      }),
      new Date(now.getTime() + 1000),
    );
    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-cierre-no-anulable",
          {
            id: "77777777-7777-4777-8777-777777777777",
            sessionId: session.id,
            expectedActivityRevision: preview.activityRevision,
            reason: "Intento posterior al cierre",
          },
          "admin",
          new Date(now.getTime() + 2000),
        ),
      (error) => error.status === 409 && /ya no está abierto/i.test(error.message),
    );
    assert.equal(
      closedSqlite.prepare("SELECT stock FROM products WHERE id = 'void-closed-product'").get().stock,
      1,
    );
    assert.equal(
      closedSqlite.prepare("SELECT COUNT(*) AS count FROM sale_voids").get().count,
      0,
    );
    assert.equal(
      closedSqlite.prepare("SELECT COUNT(*) AS count FROM cash_closures WHERE id = 'cierre-venta-no-anulable'").get().count,
      1,
    );
  } finally {
    closedSqlite.close();
  }
});

test("una venta legacy sin snapshot no reconstruye ni repone inventario con el catálogo actual", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "void-legacy-product",
      name: "Producto legacy cambiante",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "untracked",
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-17T19:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-venta-legacy-sin-snapshot",
      now,
    });
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        ) VALUES (?, ?, ?, 'am', ?, 'paid', 'efectivo', 'efectivo', NULL,
          NULL, ?, NULL, 'Matías Muñoz', 1000)
      `)
      .run(
        "venta-legacy-sin-snapshot",
        now.toISOString(),
        session.businessDate,
        session.id,
        now.toISOString(),
      );
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES (
          'venta-legacy-sin-snapshot', 'void-legacy-product',
          'Producto legacy cambiante', 1000, 1, 1000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        ) VALUES (
          'direct:venta-legacy-sin-snapshot', 'venta-legacy-sin-snapshot',
          ?, ?, 'am', ?, 'efectivo', 1000, 'Matías Muñoz', 'direct'
        )
      `)
      .run(now.toISOString(), session.businessDate, session.id);
    sqlite
      .prepare(`
        UPDATE shift_sessions SET activity_revision = 1 WHERE id = ?
      `)
      .run(session.id);

    // La configuración vigente ya no representa el inventario que existía
    // cuando se registró esta venta legacy.
    sqlite
      .prepare(`
        UPDATE products
        SET stock_mode = 'simple', stock = 5, stock_vitrina = NULL,
          stock_bodega = NULL, updated_at = '2026-09-17T19:01:00.000Z'
        WHERE id = 'void-legacy-product'
      `)
      .run();
    const today = await pos.module.listTodaySales(
      database,
      { role: "admin", limit: 20 },
      now,
    );
    const legacySale = today.sales.find(
      ({ id }) => id === "venta-legacy-sin-snapshot",
    );
    assert.ok(legacySale);
    assert.equal(legacySale.canVoid, false);

    await assert.rejects(
      () =>
        pos.module.voidSale(
          database,
          "venta-legacy-sin-snapshot",
          {
            id: "99999999-9999-4999-8999-999999999999",
            sessionId: session.id,
            expectedActivityRevision: 1,
            reason: "No usar catálogo nuevo para reponer",
          },
          "admin",
          new Date(now.getTime() + 120_000),
        ),
      (error) =>
        error.status === 409 &&
        /registro exacto de inventario/i.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'void-legacy-product'").get().stock,
      5,
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sale_voids WHERE sale_id = 'venta-legacy-sin-snapshot'")
        .get().count,
      0,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM inventory_stock_entries
          WHERE operation_token = '99999999-9999-4999-8999-999999999999'
        `)
        .get().count,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test("las deudas se paginan con cursor y mantienen resumen global", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const insert = sqlite.prepare(`
      INSERT INTO sales (
        id, created_at, payment_status, checkout_method, payment_method,
        debt_note, debtor_collaborator, paid_at, settlement_id, seller, total_clp
      ) VALUES (?, ?, 'pending', 'pendiente', NULL, ?, NULL, NULL, NULL, NULL, ?)
    `);
    insert.run("deuda-a", "2026-08-31T10:00:00.000Z", "A", 1000);
    insert.run("deuda-b", "2026-08-31T10:00:00.000Z", "B", 2000);
    insert.run("deuda-c", "2026-08-31T11:00:00.000Z", "C", 3000);

    const { database } = sqliteD1Adapter(sqlite);
    const first = await pos.module.listPendingDebts(database, {
      role: "admin",
      limit: 2,
    });
    assert.deepEqual(first.debts.map(({ id }) => id), ["deuda-a", "deuda-b"]);
    assert.deepEqual(first.summary, {
      count: 3,
      totalClp: 6000,
      originalClp: 6000,
      paidClp: 0,
      balanceClp: 6000,
    });
    assert.equal(first.hasMore, true);
    assert.equal(first.nextCursor, "2026-08-31T10:00:00.000Z~deuda-b");

    const [createdAt, id] = first.nextCursor.split("~");
    const second = await pos.module.listPendingDebts(database, {
      role: "admin",
      limit: 2,
      cursor: { createdAt, id },
    });
    assert.deepEqual(second.debts.map((debt) => debt.id), ["deuda-c"]);
    assert.deepEqual(second.summary, {
      count: 3,
      totalClp: 6000,
      originalClp: 6000,
      paidClp: 0,
      balanceClp: 6000,
    });
    assert.equal(second.hasMore, false);
    assert.equal(second.nextCursor, null);
    await assert.rejects(
      () =>
        pos.module.listPendingDebts(database, { role: "admin", limit: 91 }),
      (error) => error.status === 400 && /entre 1 y 90/.test(error.message),
    );
  } finally {
    sqlite.close();
  }
});

test("Ventas recibe el resumen exacto por colaborador y puede desplegar su detalle filtrado", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const insert = sqlite.prepare(`
      INSERT INTO sales (
        id, created_at, payment_status, checkout_method, payment_method,
        debt_note, debtor_collaborator, paid_at, settlement_id, seller, total_clp
      ) VALUES (?, ?, 'pending', ?, NULL, ?, ?, NULL, NULL, NULL, ?)
    `);
    insert.run(
      "cliente-a",
      "2026-08-31T10:00:00.000Z",
      "pendiente",
      "Cliente A",
      null,
      1000,
    );
    insert.run(
      "colaborador-a",
      "2026-08-31T10:30:00.000Z",
      "colaborador",
      "Descuento mensual",
      "Bárbara Vega",
      4000,
    );
    insert.run(
      "cliente-b",
      "2026-08-31T11:00:00.000Z",
      "pendiente",
      "Cliente B",
      null,
      2000,
    );
    insert.run(
      "colaborador-b",
      "2026-08-31T11:30:00.000Z",
      "colaborador",
      "Descuento mensual",
      "Hernán Silva",
      5000,
    );
    insert.run(
      "cliente-c",
      "2026-08-31T12:00:00.000Z",
      "pendiente",
      "Cliente C",
      null,
      3000,
    );
    insert.run(
      "colaborador-c",
      "2026-08-31T11:45:00.000Z",
      "colaborador",
      "Segundo consumo mensual",
      "Bárbara Vega",
      2000,
    );
    const insertPayment = sqlite.prepare(`
      INSERT INTO sale_payments (
        id, sale_id, created_at, business_date, shift, payment_method,
        amount_clp, received_by, kind
      ) VALUES (?, ?, '2026-08-31T13:00:00.000Z', NULL, NULL,
        'efectivo', ?, NULL, 'settlement')
    `);
    insertPayment.run("abono-cliente-b", "cliente-b", 500);
    insertPayment.run("abono-colaborador-a", "colaborador-a", 1000);

    const adapter = sqliteD1Adapter(sqlite);
    const beforeSalesPage = adapter.getPrepareCalls();
    const first = await pos.module.listPendingDebts(adapter.database, {
      role: "sales",
      limit: 2,
      kind: "customer",
    });
    assert.deepEqual(first.debts.map(({ id }) => id), ["cliente-a", "cliente-b"]);
    assert.deepEqual(first.summary, {
      count: 6,
      totalClp: 15500,
      originalClp: 17000,
      paidClp: 1500,
      balanceClp: 15500,
    });
    assert.deepEqual(first.collaboratorSummaries, [
      {
        collaborator: "Bárbara Vega",
        count: 2,
        originalClp: 6000,
        paidClp: 1000,
        balanceClp: 5000,
      },
      {
        collaborator: "Hernán Silva",
        count: 1,
        originalClp: 5000,
        paidClp: 0,
        balanceClp: 5000,
      },
    ]);
    assert.equal(first.hasMore, true);
    assert.equal(first.nextCursor, "2026-08-31T11:00:00.000Z~cliente-b");
    assert.ok(adapter.getPrepareCalls() - beforeSalesPage <= 5);

    const second = await pos.module.listPendingDebts(adapter.database, {
      role: "sales",
      limit: 2,
      kind: "customer",
      cursor: {
        createdAt: "2026-08-31T11:00:00.000Z",
        id: "cliente-b",
      },
    });
    assert.deepEqual(second.debts.map(({ id }) => id), ["cliente-c"]);
    assert.deepEqual(second.summary, first.summary);
    assert.deepEqual(second.collaboratorSummaries, first.collaboratorSummaries);
    assert.equal(second.hasMore, false);
    assert.equal(second.nextCursor, null);

    const collaboratorDetail = await pos.module.listPendingDebts(adapter.database, {
      role: "sales",
      limit: 10,
      kind: "collaborator",
      collaborator: " Bárbara Vega ",
    });
    assert.deepEqual(
      collaboratorDetail.debts.map(({ id, paidClp, balanceClp }) => ({
        id,
        paidClp,
        balanceClp,
      })),
      [
        { id: "colaborador-a", paidClp: 1000, balanceClp: 3000 },
        { id: "colaborador-c", paidClp: 0, balanceClp: 2000 },
      ],
    );
    assert.equal(collaboratorDetail.hasMore, false);
    assert.equal(collaboratorDetail.nextCursor, null);
    assert.deepEqual(collaboratorDetail.summary, first.summary);

    const salesAll = await pos.module.listPendingDebts(adapter.database, {
      role: "sales",
      limit: 10,
    });
    assert.deepEqual(salesAll.debts.map(({ id }) => id), [
      "cliente-a",
      "colaborador-a",
      "cliente-b",
      "colaborador-b",
      "colaborador-c",
      "cliente-c",
    ]);
    assert.deepEqual(salesAll.summary, first.summary);
    assert.deepEqual(salesAll.collaboratorSummaries, first.collaboratorSummaries);

    await assert.rejects(
      () => pos.module.listPendingDebts(adapter.database, {
        role: "sales",
        kind: "customer",
        collaborator: "Bárbara Vega",
      }),
      (error) => error.status === 400 && /filtro de colaborador/i.test(error.message),
    );
    await assert.rejects(
      () => pos.module.listPendingDebts(adapter.database, {
        role: "sales",
        kind: "supplier",
      }),
      (error) => error.status === 400 && /tipo de deuda/i.test(error.message),
    );
  } finally {
    sqlite.close();
  }
});

test("el resumen activo separa ventas de caja e incluye abonos de clientes y colaboradores", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-resumen-turno",
      name: "Producto resumen turno",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "untracked",
    });
    const adapter = sqliteD1Adapter(sqlite);
    const { database } = adapter;
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-anterior-resumen', '2026-08-31T18:00:00.000Z',
          '2026-08-31', 'pm', NULL, 'pending', 'pendiente', NULL,
          'Cliente anterior', NULL, NULL, NULL, 'Bárbara Vega', 1200
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES (
          'deuda-anterior-resumen', 'producto-resumen-turno',
          'Producto resumen turno', 1200, 1, 1200
        )
      `)
      .run();
    const session = await openTestSession(database, {
      id: "sesion-resumen-activo",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    const create = (id, paymentMethod, priceClp = 1000) =>
      pos.module.createSale(
        database,
        {
          id,
          sessionId: session.id,
          paymentMethod,
          debtNote:
            paymentMethod === "pendiente" ? "Cliente del turno" : null,
          debtorCollaborator:
            paymentMethod === "colaborador" ? "Eva Soto" : null,
          seller: "Matías Muñoz",
          shift: "am",
          items: [
            {
              productId: "producto-resumen-turno",
              unitPriceClp: priceClp,
              quantity: 1,
            },
          ],
        },
        new Date("2026-09-01T12:15:00.000Z"),
      );
    await create("resumen-directo-efectivo", "efectivo");
    await create("resumen-directo-tarjeta", "tarjeta");
    await create("resumen-directo-transferencia", "transferencia");
    await pos.module.validateTransferPayment(
      database,
      "resumen-directo-transferencia",
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        sessionId: session.id,
        emailReference: "Recibiste un pago · operación MP resumen",
      },
      "sales",
      new Date("2026-09-01T12:20:00.000Z"),
    );
    await create("resumen-pendiente-cliente", "pendiente");
    await create("resumen-colaborador", "colaborador");
    await pos.module.settleDebt(
      database,
      "deuda-anterior-resumen",
      {
        id: "abono-anterior-resumen",
        sessionId: session.id,
        paymentMethod: "efectivo",
        amountClp: 500,
        shift: null,
        responsible: null,
      },
      "admin",
      new Date("2026-09-01T12:30:00.000Z"),
    );
    await pos.module.settleDebt(
      database,
      "resumen-colaborador",
      {
        id: "cobro-colaborador-resumen",
        sessionId: session.id,
        paymentMethod: "transferencia",
        amountClp: null,
        shift: null,
        responsible: null,
      },
      "admin",
      new Date("2026-09-01T12:35:00.000Z"),
    );
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'venta-rollout-resumen', '2026-09-01T12:40:00.000Z',
          '2026-09-01', 'am', NULL, 'paid', 'tarjeta', 'tarjeta', NULL,
          NULL, '2026-09-01T12:40:00.000Z', NULL, 'Matías Muñoz', 700
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES (
          'venta-rollout-resumen', 'producto-resumen-turno',
          'Producto resumen turno', 700, 1, 700
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        ) VALUES (
          'direct:venta-rollout-resumen', 'venta-rollout-resumen',
          '2026-09-01T12:40:00.000Z', '2026-09-01', 'am', NULL,
          'tarjeta', 700, 'Matías Muñoz', 'direct'
        )
      `)
      .run();

    const summaryAdapter = sqliteD1Adapter(sqlite);
    const state = await pos.module.getActiveShiftState(summaryAdapter.database);
    assert.equal(summaryAdapter.getPrepareCalls(), 1);
    assert.deepEqual(state.session, await pos.module.getActiveShiftSession(database));
    assert.deepEqual(state.summary, {
      sessionId: session.id,
      businessDate: "2026-09-01",
      shift: "am",
      activityRevision: state.session.activityRevision,
      includedSalesClp: 4700,
      includedSalesCount: 5,
      cashCollectedClp: 1500,
      cardCollectedClp: 1700,
      transferCollectedClp: 2000,
      settlementCollectedClp: 1500,
      totalCollectedClp: 5200,
    });
    assert.deepEqual(Object.keys(state.summary), [
      "sessionId",
      "businessDate",
      "shift",
      "activityRevision",
      "includedSalesClp",
      "includedSalesCount",
      "cashCollectedClp",
      "cardCollectedClp",
      "transferCollectedClp",
      "settlementCollectedClp",
      "totalCollectedClp",
    ]);
  } finally {
    sqlite.close();
  }
});

test("colaboradores, cobros por turno y cuadraturas son trazables e inmutables", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-caja",
      name: "Producto caja",
      category: "Alimentos",
      priceClp: 1000,
      stockMode: "simple",
      stock: 20,
    });
    const adapter = sqliteD1Adapter(sqlite);
    const { database } = adapter;
    const amNow = new Date("2026-09-01T13:00:00.000Z");
    const pmNow = new Date("2026-09-01T18:00:00.000Z");
    const amSession = await openTestSession(database, {
      id: "sesion-am-caja",
      responsible: "Andrés Lagos",
      now: amNow,
    });
    const base = {
      sessionId: amSession.id,
      debtNote: null,
      debtorCollaborator: null,
      seller: "Andrés Lagos",
      shift: "am",
      items: [
        { productId: "producto-caja", unitPriceClp: 1000, quantity: 1 },
      ],
    };

    await pos.module.createSale(
      database,
      { ...base, id: "venta-am-efectivo", paymentMethod: "efectivo" },
      amNow,
    );
    await pos.module.createSale(
      database,
      { ...base, id: "venta-am-tarjeta", paymentMethod: "tarjeta" },
      amNow,
    );
    await pos.module.createSale(
      database,
      {
        ...base,
        id: "deuda-cruzada",
        paymentMethod: "pendiente",
        debtNote: "Cliente turno AM",
      },
      amNow,
    );
    await pos.module.createSale(
      database,
      {
        ...base,
        id: "deuda-abierta",
        paymentMethod: "pendiente",
        debtNote: "Cliente pendiente",
      },
      amNow,
    );
    const collaboratorSale = await pos.module.createSale(
      database,
      {
        ...base,
        id: "cargo-colaborador",
        paymentMethod: "colaborador",
        debtNote: "Descontar a fin de mes",
        debtorCollaborator: "Eva Soto",
      },
      amNow,
    );
    assert.equal(collaboratorSale.sale.paymentMethod, "colaborador");
    assert.equal(
      collaboratorSale.sale.debtorCollaborator,
      "Eva Soto",
    );
    assert.equal(collaboratorSale.sale.paymentStatus, "pending");

    await pos.module.createSale(
      database,
      {
        ...base,
        id: "cargo-colaborador-cobrado",
        paymentMethod: "colaborador",
        debtNote: "Cobro administrativo de fin de mes",
        debtorCollaborator: "Bárbara Vega",
      },
      amNow,
    );
    const collaboratorSettlement = await pos.module.settleDebt(
      database,
      "cargo-colaborador-cobrado",
      {
        id: "pago-colaborador-fin-mes",
        sessionId: amSession.id,
        paymentMethod: "transferencia",
        shift: "am",
        responsible: "Andrés Lagos",
      },
      "sales",
      amNow,
    );
    assert.equal(collaboratorSettlement.sale.paymentStatus, "paid");
    assert.equal(collaboratorSettlement.sale.settledPaymentMethod, "transferencia");

    const settled = await pos.module.settleDebt(
      database,
      "deuda-cruzada",
      {
        id: "pago-deuda-cruzada",
        sessionId: amSession.id,
        paymentMethod: "efectivo",
        shift: "am",
        responsible: "Andrés Lagos",
      },
      "admin",
      pmNow,
    );
    assert.equal(settled.sale.paymentMethod, "pendiente");
    assert.equal(settled.sale.settledPaymentMethod, "efectivo");
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT id, business_date, shift, payment_method, received_by, kind
            FROM sale_payments WHERE sale_id = 'deuda-cruzada'
          `)
          .get(),
      },
      {
        id: "settlement:pago-deuda-cruzada",
        business_date: "2026-09-01",
        shift: "am",
        payment_method: "efectivo",
        received_by: "Andrés Lagos",
        kind: "settlement",
      },
    );

    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'legacy-unassigned', '2026-09-01T14:00:00.000Z', NULL, NULL,
          'paid', 'efectivo', 'efectivo', NULL, NULL,
          '2026-09-01T14:00:00.000Z', NULL, NULL, 500
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, payment_method,
          amount_clp, received_by, kind
        ) VALUES (
          'direct:legacy-unassigned', 'legacy-unassigned',
          '2026-09-01T14:00:00.000Z', NULL, NULL, 'efectivo', 500, NULL,
          'direct'
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'colaborador-unassigned', '2026-09-01T14:30:00.000Z', NULL, NULL,
          'pending', 'colaborador', NULL, 'Fuera de cierre', 'Hernán Silva',
          NULL, NULL, 'Hernán Silva', 800
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, payment_method,
          amount_clp, received_by, kind
        ) VALUES (
          'settlement:colaborador-unassigned', 'colaborador-unassigned',
          '2026-09-01T14:45:00.000Z', NULL, NULL, 'efectivo', 300, NULL,
          'settlement'
        )
      `)
      .run();

    const amPreview = await pos.module.getCashClosurePreview(
      database,
      "2026-09-01",
      "am",
    );
    assert.equal(amPreview.activityRevision, 8);
    assert.equal(amPreview.openingCashClp, 0);
    assert.equal(amPreview.cashMovementsClp, 2000);
    assert.equal(amPreview.expectedCashClp, 2000);
    assert.equal(amPreview.expectedCardClp, 1000);
    assert.equal(amPreview.expectedTransferClp, 1000);
    assert.equal(amPreview.collectedPaymentsClp, 4000);
    assert.equal(amPreview.expectedCollectedClp, 4000);
    assert.equal(amPreview.totalSalesClp, 4000);
    assert.equal(amPreview.salesCount, 4);
    assert.equal(amPreview.pendingCustomerClp, 1000);
    assert.equal(amPreview.pendingCustomerCount, 1);
    assert.equal(amPreview.collaboratorClp, 0);
    assert.equal(amPreview.collaboratorCount, 0);
    assert.equal(amPreview.pendingCustomers[0].debtNote, "Cliente pendiente");
    assert.deepEqual(amPreview.pendingCollaborators, []);
    assert.equal(amPreview.unassignedSalesClp, 500);
    assert.equal(amPreview.unassignedSalesCount, 1);
    assert.equal(amPreview.unassignedPaymentsClp, 800);
    assert.equal(amPreview.unassignedPaymentsCount, 2);
    assert.equal(
      sqlite
        .prepare(`
          SELECT amount_clp FROM sale_payments
          WHERE sale_id = 'cargo-colaborador-cobrado'
        `)
        .get().amount_clp,
      1000,
    );

    const amInventory = await pos.module.listClosingInventory(database);
    const closureInput = {
      id: "cuadratura-am-2026-09-01",
      sessionId: amSession.id,
      expectedActivityRevision: amPreview.activityRevision,
      countedCashClp: 2200,
      countedCardClp: 1000,
      countedTransferClp: 1000,
      financialDifferenceReason: "Diferencia de efectivo revisada",
      expenses: [],
      inventory: exactInventoryCount(amInventory),
      handoffComments: "Caja revisada",
    };
    const callsBeforeClosure = adapter.getPrepareCalls();
    const closure = await pos.module.createCashClosure(
      database,
      closureInput,
      pmNow,
    );
    assert.ok(
      adapter.getPrepareCalls() - callsBeforeClosure < 50,
      "el cierre debe respetar el límite de consultas D1",
    );
    assert.equal(closure.idempotent, false);
    assert.equal(closure.closure.expectedCashClp, 2000);
    assert.equal(closure.closure.differenceClp, 200);
    assert.equal(closure.closure.pendingCustomerClp, 1000);
    assert.equal(closure.closure.collaboratorClp, 0);
    assert.equal(closure.closure.collaboratorCount, 0);
    assert.deepEqual(closure.closure.pendingCollaborators, []);
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT sale_id, debt_type FROM cash_closure_debts
          WHERE closure_id = ? ORDER BY sale_id
        `)
        .all(closureInput.id)
        .map((row) => ({ ...row })),
      [{ sale_id: "deuda-abierta", debt_type: "pendiente" }],
    );
    assert.equal(
      (
        await pos.module.createCashClosure(database, closureInput, pmNow)
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          { ...closureInput, id: "otra-cuadratura" },
          pmNow,
        ),
      (error) =>
        error.status === 409 && /cerrada|ya tiene una cuadratura/i.test(error.message),
    );

    const stockBefore = sqlite
      .prepare("SELECT stock FROM products WHERE id = 'producto-caja'")
      .get().stock;
    await assert.rejects(
      () =>
        pos.module.createSale(
          database,
          { ...base, id: "venta-turno-cerrado", paymentMethod: "efectivo" },
          amNow,
        ),
      (error) =>
        error.status === 409 && /sesión.*(cerrada|abierta)/i.test(error.message),
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'producto-caja'").get()
        .stock,
      stockBefore,
    );

    const pmSession = await openTestSession(database, {
      id: "sesion-pm-caja",
      shift: "pm",
      responsible: "Hernán Silva",
      now: pmNow,
    });
    const pmPreview = await pos.module.getCashClosurePreview(
      database,
      "2026-09-01",
      "pm",
    );
    const pmInventory = await pos.module.listClosingInventory(database);
    await pos.module.createCashClosure(
      database,
      {
        id: "cuadratura-pm-2026-09-01",
        sessionId: pmSession.id,
        expectedActivityRevision: pmPreview.activityRevision,
        countedCashClp: 0,
        countedCardClp: 0,
        countedTransferClp: 0,
        financialDifferenceReason: null,
        expenses: [],
        inventory: exactInventoryCount(pmInventory),
        handoffComments: null,
      },
      pmNow,
    );
    await assert.rejects(
      () =>
        pos.module.settleDebt(
          database,
          "cargo-colaborador",
          {
            id: "pago-en-turno-cerrado",
            sessionId: pmSession.id,
            paymentMethod: "transferencia",
            shift: "pm",
            responsible: "Hernán Silva",
          },
          "admin",
          pmNow,
        ),
      (error) =>
        error.status === 409 && /sesión.*(cerrada|abierta)|turno ya está cerrado/i.test(error.message),
    );
    assert.equal((await pos.module.listCashClosures(database)).length, 2);
  } finally {
    sqlite.close();
  }
});

test("las sesiones respetan orden diario, bloqueo, CAS e idempotencia entre medianoche", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const { database } = sqliteD1Adapter(sqlite);
    const beforeMidnight = new Date("2026-09-02T03:59:59.000Z");
    const afterMidnight = new Date("2026-09-02T04:00:01.000Z");
    const openInput = {
      id: "sesion-pm-medianoche",
      shift: "pm",
      responsible: "Bárbara Vega",
      openingCashClp: 750,
    };
    const opened = await pos.module.openShiftSession(
      database,
      openInput,
      beforeMidnight,
    );
    assert.equal(opened.idempotent, false);
    assert.equal(opened.session.businessDate, "2026-09-01");
    const midnightRetry = await pos.module.openShiftSession(
      database,
      openInput,
      afterMidnight,
    );
    assert.equal(midnightRetry.idempotent, true);
    assert.equal(midnightRetry.session.businessDate, "2026-09-01");
    await assert.rejects(
      () =>
        pos.module.openShiftSession(
          database,
          { ...openInput, responsible: "Hernán Silva" },
          afterMidnight,
        ),
      (error) => error.status === 409 && /id.*utilizado/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.openShiftSession(
          database,
          {
            id: "sesion-am-dia-siguiente-bloqueada",
            shift: "am",
            responsible: "Hernán Silva",
            openingCashClp: 0,
          },
          afterMidnight,
        ),
      (error) => error.status === 409 && /sigue abierto/i.test(error.message),
    );

    const preview = await pos.module.getCashClosurePreview(
      database,
      opened.session.businessDate,
      opened.session.shift,
    );
    assert.equal(preview.expectedCashClp, 750);
    assert.equal(preview.salesCount, 0);
    const closureInput = exactClosureInput(opened.session, preview, [], {
      id: "cierre-pm-medianoche",
    });
    const closed = await pos.module.createCashClosure(
      database,
      closureInput,
      beforeMidnight,
    );
    assert.equal(closed.closure.inventoryLineCount, 0);
    assert.equal(closed.closure.inventoryCaptured, true);

    assert.equal(
      (
        await pos.module.createCashClosure(
          database,
          closureInput,
          afterMidnight,
        )
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          { ...closureInput, handoffComments: "payload distinto" },
          afterMidnight,
        ),
      (error) => error.status === 409 && /id.*utilizado/i.test(error.message),
    );
    const repeatedPm = await openTestSession(database, {
      id: "sesion-pm-repetida",
      shift: "pm",
      responsible: "Hernán Silva",
      now: beforeMidnight,
    });
    assert.equal(repeatedPm.businessDate, "2026-09-01");
    assert.equal(repeatedPm.shift, "pm");
    seedPosProduct(sqlite, {
      id: "turno-pm-repetido",
      name: "Producto PM repetido",
      category: "Prueba",
      priceClp: 1200,
      stockMode: "untracked",
    });
    const repeatedPmSale = await pos.module.createSale(database, {
      id: "venta-pm-repetida",
      sessionId: repeatedPm.id,
      paymentMethod: "tarjeta",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Hernán Silva",
      shift: "pm",
      items: [{ productId: "turno-pm-repetido", unitPriceClp: 1200, quantity: 1 }],
    });
    assert.equal(repeatedPmSale.idempotent, false);
    assert.equal(repeatedPmSale.sale.totalClp, 1200);
    await pos.module.createSale(database, {
      id: "deuda-pm-repetida",
      sessionId: repeatedPm.id,
      paymentMethod: "pendiente",
      debtNote: "Cliente turno PM repetido",
      debtorCollaborator: null,
      seller: "Hernán Silva",
      shift: "pm",
      items: [{ productId: "turno-pm-repetido", unitPriceClp: 1200, quantity: 1 }],
    });
    const repeatedPmSettlement = await pos.module.settleDebt(
      database,
      "deuda-pm-repetida",
      {
        id: "pago-pm-repetido",
        sessionId: repeatedPm.id,
        paymentMethod: "efectivo",
        amountClp: 1200,
        shift: "pm",
        responsible: "Hernán Silva",
      },
      "sales",
      beforeMidnight,
    );
    assert.equal(repeatedPmSettlement.idempotent, false);
    assert.equal(repeatedPmSettlement.sale.paymentStatus, "paid");
    assert.equal(repeatedPmSettlement.payment.paymentMethod, "efectivo");
    const repeatedPmPreview = await pos.module.getCashClosurePreview(
      database,
      repeatedPm.businessDate,
      repeatedPm.shift,
    );
    assert.equal(repeatedPmPreview.closed, false);
    assert.equal(repeatedPmPreview.salesCount, 2);
    assert.equal(repeatedPmPreview.expectedCashClp, 1200);
    assert.equal(repeatedPmPreview.expectedCardClp, 1200);
    await pos.module.createCashClosure(
      database,
      exactClosureInput(repeatedPm, repeatedPmPreview, [], {
        id: "cierre-pm-repetida",
      }),
      beforeMidnight,
    );

    const amAfterPm = await openTestSession(database, {
      id: "sesion-am-despues-pm",
      shift: "am",
      responsible: "Hernán Silva",
      now: beforeMidnight,
    });
    assert.equal(amAfterPm.businessDate, "2026-09-01");
    assert.equal(amAfterPm.shift, "am");
    const amAfterPmPreview = await pos.module.getCashClosurePreview(
      database,
      amAfterPm.businessDate,
      amAfterPm.shift,
    );
    assert.equal(amAfterPmPreview.closed, false);
    await pos.module.createCashClosure(
      database,
      exactClosureInput(amAfterPm, amAfterPmPreview, [], {
        id: "cierre-am-despues-pm",
      }),
      beforeMidnight,
    );

    const nextDay = await openTestSession(database, {
      id: "sesion-am-dia-siguiente",
      responsible: "Hernán Silva",
      now: afterMidnight,
    });
    assert.equal(nextDay.businessDate, "2026-09-02");
    assert.throws(
      () =>
        sqlite
          .prepare(
            "UPDATE shift_sessions SET responsible = 'Matías Muñoz' WHERE id = ?",
          )
          .run(nextDay.id),
      /immutable/i,
    );
    const nextPreview = await pos.module.getCashClosurePreview(
      database,
      nextDay.businessDate,
      nextDay.shift,
    );
    await pos.module.createCashClosure(
      database,
      exactClosureInput(nextDay, nextPreview, [], {
        id: "cierre-am-dia-siguiente",
      }),
      afterMidnight,
    );
  } finally {
    sqlite.close();
  }
});

test("un replay anterior a la política de exclusión no reutiliza cálculos antiguos", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const sessionId = "sesion-replay-pre-politica";
    const closureId = "cierre-replay-pre-politica";
    const createdAt = "2026-09-01T13:00:00.000Z";
    const input = {
      id: closureId,
      sessionId,
      expectedActivityRevision: 0,
      countedCashClp: 0,
      countedCardClp: 0,
      countedTransferClp: 0,
      financialDifferenceReason: null,
      expenses: [],
      inventory: [],
      handoffComments: null,
    };
    const legacyCanonical = JSON.stringify({
      sessionId: input.sessionId,
      expectedActivityRevision: input.expectedActivityRevision,
      countedCashClp: input.countedCashClp,
      countedCardClp: input.countedCardClp,
      countedTransferClp: input.countedTransferClp,
      financialDifferenceReason: input.financialDifferenceReason,
      expenses: input.expenses,
      inventory: input.inventory,
      handoffComments: input.handoffComments,
    });
    const legacyDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(legacyCanonical),
    );
    const legacyFingerprint = Array.from(new Uint8Array(legacyDigest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    sqlite
      .prepare(`
        INSERT INTO shift_sessions (
          id, business_date, shift, responsible, opening_cash_clp,
          activity_revision, status, active_slot, opened_at, closed_at,
          closure_id
        ) VALUES (?, '2026-09-01', 'am', 'Matías Muñoz', 0, 0,
          'open', 1, ?, NULL, NULL)
      `)
      .run(sessionId, createdAt);
    sqlite
      .prepare(`
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
          cash_reconciled, card_reconciled, transfer_reconciled,
          pending_customer_reviewed, collaborator_reviewed,
          inventory_count_confirmed, checklist_version, unassigned_sales_clp,
          unassigned_sales_count, unassigned_payments_clp,
          unassigned_payments_count, notes
        ) VALUES (
          ?, ?, 0, ?, '2026-09-01', 'am', 'Matías Muñoz', ?,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9000, 1,
          0, 0, 0, 0, 0, 0, 0, 0, NULL, 2, 0, 0, 0, 0, NULL, NULL,
          1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, NULL
        )
      `)
      .run(closureId, sessionId, legacyFingerprint, createdAt);

    const { database } = sqliteD1Adapter(sqlite);
    await assert.rejects(
      () => pos.module.createCashClosure(database, input, new Date(createdAt)),
      (error) => error.status === 409 && /id.*utilizado/i.test(error.message),
    );
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT collaborator_clp, collaborator_count, request_fingerprint
            FROM cash_closures WHERE id = ?
          `)
          .get(closureId),
      },
      {
        collaborator_clp: 9000,
        collaborator_count: 1,
        request_fingerprint: legacyFingerprint,
      },
    );
  } finally {
    sqlite.close();
  }
});

test("el cierre formal reconcilia rollout, deudas globales e inventario con rollback atómico", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "formal-simple",
      name: "Stock simple formal",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 10,
    });
    seedPosProduct(sqlite, {
      id: "formal-split",
      name: "Stock dividido formal",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "split",
      stockVitrina: 3,
      stockBodega: 4,
    });
    seedPosProduct(sqlite, {
      id: "formal-inactivo",
      name: "Stock inactivo formal",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 2,
    });
    sqlite
      .prepare("UPDATE products SET active = 0 WHERE id = 'formal-inactivo'")
      .run();
    sqlite
      .prepare(`
        INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
        VALUES ('formal-insumo', 'Insumo formal', 'porciones', 5, 0,
          '2026-08-31T12:00:00.000Z')
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'rollout-paid', '2026-09-01T12:30:00.000Z', '2026-09-01', 'am',
          'paid', 'transferencia', 'transferencia', NULL, NULL,
          '2026-09-01T12:30:00.000Z', NULL, 'Matías Muñoz', 700
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, payment_method,
          amount_clp, received_by, kind
        ) VALUES (
          'direct:rollout-paid', 'rollout-paid', '2026-09-01T12:30:00.000Z',
          '2026-09-01', 'am', 'transferencia', 700, 'Matías Muñoz', 'direct'
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-global-colaborador', '2026-08-31T17:00:00.000Z',
          '2026-08-31', 'pm', 'pending', 'colaborador', NULL,
          'Descuento fin de mes', 'Eva Soto', NULL, NULL,
          'Eva Soto', 4000
        )
      `)
      .run();

    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-01T13:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-formal-am",
      responsible: "Matías Muñoz",
      openingCashClp: 500,
      now,
    });
    const saleBase = {
      sessionId: session.id,
      debtNote: null,
      debtorCollaborator: null,
      seller: "Matías Muñoz",
      shift: "am",
      items: [
        { productId: "formal-simple", unitPriceClp: 1000, quantity: 1 },
      ],
    };
    await assert.rejects(
      () =>
        pos.module.createSale(
          database,
          {
            ...saleBase,
            id: "venta-spoof",
            seller: "Hernán Silva",
            paymentMethod: "efectivo",
          },
          now,
        ),
      (error) => error.status === 409 && /asignado.*Matías/i.test(error.message),
    );
    await pos.module.createSale(
      database,
      { ...saleBase, id: "formal-cash", paymentMethod: "efectivo" },
      now,
    );
    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "formal-card",
        paymentMethod: "tarjeta",
        items: [
          { productId: "formal-split", unitPriceClp: 1000, quantity: 1 },
        ],
      },
      now,
    );
    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "formal-debt-settle",
        paymentMethod: "pendiente",
        debtNote: "Se paga en este turno",
      },
      now,
    );
    await pos.module.createSale(
      database,
      {
        ...saleBase,
        id: "formal-debt-stay",
        paymentMethod: "pendiente",
        debtNote: "Se entrega pendiente",
      },
      now,
    );

    const stalePreview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const staleInventory = await pos.module.listClosingInventory(database);
    assert.equal(stalePreview.totalSalesClp, 4700);
    assert.equal(stalePreview.salesCount, 5);
    assert.equal(stalePreview.pendingCustomerCount, 2);
    assert.equal(stalePreview.collaboratorCount, 0);
    assert.equal(stalePreview.collaboratorClp, 0);
    assert.deepEqual(stalePreview.pendingCollaborators, []);
    assert.equal(stalePreview.expectedTransferClp, 700);
    assert.ok(
      staleInventory.some((line) => line.key === "product:formal-inactivo:simple"),
    );
    const splitLines = staleInventory.filter(
      (line) => line.itemId === "formal-split",
    );
    assert.equal(splitLines.length, 1);
    assert.equal(splitLines[0].location, "vitrina");

    await pos.module.settleDebt(
      database,
      "formal-debt-settle",
      {
        id: "formal-settlement",
        sessionId: session.id,
        paymentMethod: "efectivo",
        shift: "am",
        responsible: "Matías Muñoz",
      },
      "admin",
      now,
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, stalePreview, staleInventory, {
            id: "cierre-formal-stale",
          }),
          now,
        ),
      (error) => error.status === 409 && /actividad.*cambió/i.test(error.message),
    );

    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    assert.equal(preview.pendingCustomerCount, 1);
    assert.equal(preview.pendingCustomerClp, 1000);
    assert.equal(preview.collaboratorCount, 0);
    assert.equal(preview.collaboratorClp, 0);
    assert.deepEqual(preview.pendingCollaborators, []);
    assert.equal(preview.cashMovementsClp, 2000);
    assert.equal(preview.expectedCashClp, 2500);
    assert.equal(preview.expectedCardClp, 1000);
    assert.equal(preview.expectedTransferClp, 700);

    sqlite
      .prepare(`
        UPDATE products SET stock = stock + 1,
          updated_at = '2026-09-01T14:00:00.001Z'
        WHERE id = 'formal-simple'
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE products SET stock = stock - 1,
          updated_at = '2026-09-01T14:00:00.002Z'
        WHERE id = 'formal-simple'
      `)
      .run();
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, staleInventory, {
            id: "cierre-formal-token-viejo",
          }),
          now,
        ),
      (error) => error.status === 409 && /inventario cambió/i.test(error.message),
    );

    const inventory = await pos.module.listClosingInventory(database);
    const exactLines = exactInventoryCount(inventory);
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-formal-gasto-invalido",
            expenses: [{ id: "gasto-invalido", description: "", amountClp: 1 }],
          }),
          now,
        ),
      (error) => error.status === 400 && /descripción.*gasto/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-formal-duplicado",
            inventory: [exactLines[0], exactLines[0]],
          }),
          now,
        ),
      (error) => error.status === 400 && /duplicadas/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-formal-faltante",
            inventory: exactLines.slice(1),
          }),
          now,
        ),
      (error) => error.status === 409 && /inventario cambió/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-formal-diferencias-compensadas",
            countedCashClp: preview.expectedCashClp + 100,
            countedCardClp: preview.expectedCardClp - 100,
          }),
          now,
        ),
      (error) => error.status === 400 && /explicar.*diferencias/i.test(error.message),
    );

    const simpleLine = exactLines.find(
      (line) => line.key === "product:formal-simple:simple",
    );
    assert.ok(simpleLine);
    const countedInventory = exactLines.map((line) =>
      line.key === simpleLine.key
        ? {
            ...line,
            countedQuantity: line.expectedQuantity - 1,
            reasonCategory: "merma",
            comment: "Merma física verificada",
          }
        : line,
    );
    const finalInput = exactClosureInput(session, preview, inventory, {
      id: "cierre-formal-am",
      countedCashClp: preview.expectedCashClp + 100,
      countedCardClp: preview.expectedCardClp - 100,
      financialDifferenceReason: "Diferencias por medio revisadas",
      inventory: countedInventory,
    });
    const stockBeforeFailure = sqlite
      .prepare("SELECT stock FROM products WHERE id = 'formal-simple'")
      .get().stock;
    sqlite.exec(`
      CREATE TRIGGER fail_formal_stock
      BEFORE UPDATE OF stock ON products
      WHEN NEW.stock <> OLD.stock
      BEGIN
        SELECT RAISE(ABORT, 'forced stock rollback');
      END
    `);
    await assert.rejects(
      () => pos.module.createCashClosure(database, finalInput, now),
      /forced stock rollback/,
    );
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM cash_closures").get().count,
      0,
    );
    assert.equal(
      sqlite.prepare("SELECT status FROM shift_sessions WHERE id = ?").get(session.id)
        .status,
      "open",
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'formal-simple'").get()
        .stock,
      stockBeforeFailure,
    );
    assert.equal(
      sqlite.prepare("SELECT revision FROM ingredients WHERE id = 'formal-insumo'").get()
        .revision,
      0,
    );
    sqlite.exec("DROP TRIGGER fail_formal_stock");

    const closed = await pos.module.createCashClosure(database, finalInput, now);
    assert.equal(closed.closure.inventoryDifferenceCount, 1);
    assert.equal(closed.closure.inventoryDifferences[0].reason, "Merma física verificada");
    assert.equal(closed.closure.inventoryDifferences[0].reasonCategory, "merma");
    assert.equal(closed.closure.inventoryDifferences[0].comment, "Merma física verificada");
    assert.equal(closed.closure.pendingCustomerCount, 1);
    assert.equal(closed.closure.collaboratorCount, 0);
    assert.equal(closed.closure.collaboratorClp, 0);
    assert.equal(closed.closure.pendingCustomers[0].id, "formal-debt-stay");
    assert.deepEqual(closed.closure.pendingCollaborators, []);
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT sale_id, debt_type FROM cash_closure_debts
          WHERE closure_id = ? ORDER BY sale_id
        `)
        .all(finalInput.id)
        .map((row) => ({ ...row })),
      [{ sale_id: "formal-debt-stay", debt_type: "pendiente" }],
    );
    const reconciledStock = sqlite
      .prepare("SELECT stock FROM products WHERE id = 'formal-simple'")
      .get().stock;
    assert.equal(reconciledStock, simpleLine.expectedQuantity - 1);
    assert.equal(
      sqlite.prepare("SELECT revision FROM ingredients WHERE id = 'formal-insumo'").get()
        .revision,
      1,
    );
    assert.equal(
      (await pos.module.createCashClosure(database, finalInput, now)).idempotent,
      true,
    );
    assert.equal(
      sqlite.prepare("SELECT stock FROM products WHERE id = 'formal-simple'").get()
        .stock,
      reconciledStock,
    );

    const pmSession = await openTestSession(database, {
      id: "sesion-formal-pm",
      shift: "pm",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-01T18:00:00.000Z"),
    });
    await pos.module.settleDebt(
      database,
      "formal-debt-stay",
      {
        id: "formal-settlement-pm",
        sessionId: pmSession.id,
        paymentMethod: "transferencia",
        shift: "pm",
        responsible: "Bárbara Vega",
      },
      "admin",
      new Date("2026-09-01T18:00:00.000Z"),
    );
    const pmPreview = await pos.module.getCashClosurePreview(
      database,
      pmSession.businessDate,
      pmSession.shift,
    );
    assert.equal(pmPreview.pendingCustomerCount, 0);
    assert.equal(pmPreview.collaboratorCount, 0);
    assert.equal(pmPreview.collaboratorClp, 0);
    assert.deepEqual(pmPreview.pendingCollaborators, []);
    const historical = (await pos.module.listCashClosures(database)).find(
      ({ id }) => id === finalInput.id,
    );
    assert.ok(historical);
    assert.equal(historical.pendingCustomerCount, 1);
    assert.equal(historical.pendingCustomers[0].id, "formal-debt-stay");
    assert.equal(historical.inventoryLineCount, inventory.length);
    assert.equal(historical.inventoryDifferenceCount, 1);
  } finally {
    sqlite.close();
  }
});

test("el cierre v2 registra gastos y entrega inmutable sin tocar bodega ni bloquear el turno siguiente", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "cierre-v2-simple",
      name: "Producto de vitrina simple",
      category: "Refrigerador",
      priceClp: 1000,
      stockMode: "simple",
      stock: 5,
    });
    seedPosProduct(sqlite, {
      id: "cierre-v2-split",
      name: "Producto dividido",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 3,
      stockBodega: 7,
    });
    sqlite
      .prepare(`
        INSERT INTO ingredients (id, name, unit, stock, revision, updated_at)
        VALUES (
          'cierre-v2-insumo', 'Porción para batido', 'porciones', 4, 0,
          '2026-09-01T11:00:00.000Z'
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, payment_status,
          checkout_method, payment_method, debt_note, debtor_collaborator,
          paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-en-entrega-v2', '2026-09-01T11:30:00.000Z',
          '2026-09-01', 'am', 'pending', 'pendiente', NULL,
          'Joaquín debe $5.000', NULL, NULL, NULL, 'Matías Muñoz', 5000
        )
      `)
      .run();

    const { database } = sqliteD1Adapter(sqlite);
    const amNow = new Date("2026-09-01T12:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-cierre-v2-am",
      responsible: "Matías Muñoz",
      openingCashClp: 1000,
      now: amNow,
    });
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    assert.equal(preview.expectedCashClp, 1000);
    assert.equal(preview.pendingCustomerClp, 5000);
    const inventory = await pos.module.listClosingInventory(database);
    assert.ok(inventory.some(({ location }) => location === "vitrina"));
    assert.ok(inventory.some(({ location }) => location === "ingredient"));
    assert.equal(inventory.some(({ location }) => location === "bodega"), false);
    assert.equal(
      inventory.some(({ key }) => key === "product:cierre-v2-split:bodega"),
      false,
    );

    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-v2-gasto-sin-faltante",
            expenses: [
              { id: "gasto-sin-faltante", description: "Compra", amountClp: 100 },
            ],
          }),
          amNow,
        ),
      (error) => error.status === 400 && /solo puedes registrar gastos/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-v2-gasto-mayor",
            countedCashClp: 700,
            expenses: [
              { id: "gasto-mayor", description: "Compra", amountClp: 301 },
            ],
            financialDifferenceReason: "Faltante residual",
          }),
          amNow,
        ),
      (error) => error.status === 400 && /no pueden superar el faltante/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosure(
          database,
          exactClosureInput(session, preview, inventory, {
            id: "cierre-v2-residual-sin-motivo",
            countedCashClp: 700,
            expenses: [
              { id: "gasto-parcial", description: "Compra de leche", amountClp: 200 },
            ],
          }),
          amNow,
        ),
      (error) => error.status === 400 && /explicar las diferencias/i.test(error.message),
    );

    const simpleLine = inventory.find(
      ({ key }) => key === "product:cierre-v2-simple:simple",
    );
    assert.ok(simpleLine);
    const countedInventory = exactInventoryCount(inventory).map((line) =>
      line.key === simpleLine.key
        ? {
            ...line,
            countedQuantity: line.expectedQuantity - 1,
            reasonCategory: "merma",
            comment: "Una unidad dañada",
          }
        : line,
    );
    const bodegaBefore = sqlite
      .prepare("SELECT stock_bodega FROM products WHERE id = 'cierre-v2-split'")
      .get().stock_bodega;
    const input = exactClosureInput(session, preview, inventory, {
      id: "cierre-v2-am",
      countedCashClp: 700,
      expenses: [
        {
          id: "gasto-leche-001",
          description: "Compra de leche para cafetería",
          amountClp: 200,
        },
      ],
      financialDifferenceReason: "Faltan $100 no documentados",
      inventory: countedInventory,
      handoffComments: "Se entrega caja con una merma informada.",
    });
    const result = await pos.module.createCashClosure(database, input, amNow);
    assert.equal(result.idempotent, false);
    assert.equal(result.closure.closureContractVersion, 2);
    assert.equal(result.closure.expectedCashClp, 1000);
    assert.equal(result.closure.expensesClp, 200);
    assert.equal(result.closure.adjustedExpectedCashClp, 800);
    assert.equal(result.closure.countedCashClp, 700);
    assert.equal(result.closure.differenceClp, -100);
    assert.equal(result.closure.differenceCollectedClp, -100);
    assert.equal(result.closure.financialDifferenceReason, "Faltan $100 no documentados");
    assert.equal(result.closure.handoffComments, "Se entrega caja con una merma informada.");
    assert.equal(result.closure.checklist, null);
    assert.equal(result.closure.checklistVersion, null);
    assert.deepEqual(result.closure.expenses, [
      {
        id: "gasto-leche-001",
        description: "Compra de leche para cafetería",
        amountClp: 200,
      },
    ]);
    assert.equal(result.closure.pendingCustomers[0].id, "deuda-en-entrega-v2");
    assert.equal(result.closure.inventoryDifferenceCount, 1);
    assert.equal(result.closure.inventoryDifferences[0].reason, "Una unidad dañada");
    assert.equal(result.closure.inventoryDifferences[0].reasonCategory, "merma");
    assert.equal(result.closure.inventoryDifferences[0].comment, "Una unidad dañada");
    assert.equal(result.closure.inventory.some(({ location }) => location === "bodega"), false);
    assert.equal(result.closure.validationStatus, "pending");
    assert.equal(result.closure.validation, null);
    assert.equal(
      sqlite
        .prepare("SELECT stock_bodega FROM products WHERE id = 'cierre-v2-split'")
        .get().stock_bodega,
      bodegaBefore,
    );

    const pmNow = new Date("2026-09-01T18:00:00.000Z");
    const nextSession = await openTestSession(database, {
      id: "sesion-cierre-v2-pm",
      shift: "pm",
      responsible: "Hernán Silva",
      openingCashClp: 500,
      now: pmNow,
    });
    assert.equal(nextSession.status, "open");
    const nextPreview = await pos.module.getCashClosurePreview(
      database,
      nextSession.businessDate,
      nextSession.shift,
    );
    const nextInventory = await pos.module.listClosingInventory(database);
    const undocumented = await pos.module.createCashClosure(
      database,
      exactClosureInput(nextSession, nextPreview, nextInventory, {
        id: "cierre-v2-pm",
        countedCashClp: 400,
        expenses: [],
        financialDifferenceReason: "Faltante sin gasto documentado",
      }),
      pmNow,
    );
    assert.equal(undocumented.closure.expensesClp, 0);
    assert.equal(undocumented.closure.adjustedExpectedCashClp, 500);
    assert.equal(undocumented.closure.differenceClp, -100);

    const validated = await pos.module.validateCashClosure(
      database,
      result.closure.id,
      { comment: "Revisado por administración" },
      new Date("2026-09-02T12:00:00.000Z"),
    );
    assert.equal(validated.idempotent, false);
    assert.equal(validated.closure.validationStatus, "validated");
    assert.deepEqual(validated.closure.validation, {
      validatedAt: "2026-09-02T12:00:00.000Z",
      comment: "Revisado por administración",
      revisionNumber: 0,
    });
    assert.equal(
      (
        await pos.module.validateCashClosure(database, result.closure.id, {
          comment: "Revisado por administración",
        })
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        pos.module.validateCashClosure(database, result.closure.id, {
          comment: "Comentario diferente",
        }),
      (error) => error.status === 409 && /comentario diferente/i.test(error.message),
    );

    for (const sql of [
      "UPDATE cash_closures SET notes = 'mutado' WHERE id = 'cierre-v2-am'",
      "DELETE FROM cash_closures WHERE id = 'cierre-v2-am'",
      "UPDATE cash_closure_inventory SET reason = 'mutado' WHERE closure_id = 'cierre-v2-am'",
      "DELETE FROM cash_closure_debts WHERE closure_id = 'cierre-v2-am'",
      "UPDATE cash_closure_expenses SET description = 'mutado' WHERE closure_id = 'cierre-v2-am'",
      "UPDATE cash_closure_validations SET comment = 'mutado' WHERE closure_id = 'cierre-v2-am'",
      "DELETE FROM cash_closure_validations WHERE closure_id = 'cierre-v2-am'",
    ]) {
      assert.throws(() => sqlite.prepare(sql).run(), /immutable/i, sql);
    }
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO cash_closure_inventory (
              closure_id, item_key, item_type, item_id, item_name, unit,
              location, expected_version_token, expected_quantity,
              counted_quantity, difference_quantity, reason
            ) VALUES (
              'cierre-v2-am', 'product:tardio:simple', 'product', 'tardio',
              'Tardío', 'unidades', 'simple', 'v1', 1, 1, 0, NULL
            )
          `)
          .run(),
      /sealed/i,
    );
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO cash_closure_debts (
              closure_id, sale_id, debt_type, created_at, debt_note,
              debtor_collaborator, amount_clp
            ) VALUES (
              'cierre-v2-am', 'deuda-tardia', 'pendiente',
              '2026-09-02T13:00:00.000Z', 'Tardía', NULL, 100
            )
          `)
          .run(),
      /sealed/i,
    );
    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO cash_closure_expenses (
              closure_id, id, description, amount_clp
            ) VALUES ('cierre-v2-am', 'gasto-tardio', 'Tardío', 100)
          `)
          .run(),
      /sealed/i,
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("las incidencias clasifican cierres verdes, amarillos y rojos sin impedir múltiples turnos AM/PM", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT value FROM app_meta
            WHERE key = 'schema.migration.closure-incidents-v1'
          `)
          .get(),
      },
      { value: "v1" },
    );
    assert.ok(
      sqlite
        .prepare(`
          SELECT value FROM app_meta
          WHERE key = 'notifications.closure-incidents.enabled-from'
        `)
        .get()?.value,
    );

    seedPosProduct(sqlite, {
      id: "producto-incidencias",
      name: "Producto auditado",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "simple",
      stock: 12,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const settings = await incidents.module.getClosureIncidentSettings(database);
    assert.deepEqual(
      {
        moneyRedThresholdClp: settings.moneyRedThresholdClp,
        multipleProductRedCount: settings.multipleProductRedCount,
        highValueProductClp: settings.highValueProductClp,
        recurrenceWindowDays: settings.recurrenceWindowDays,
        recurrenceRedCount: settings.recurrenceRedCount,
        reminderHours: settings.reminderHours,
      },
      {
        moneyRedThresholdClp: 1,
        multipleProductRedCount: 2,
        highValueProductClp: 10000,
        recurrenceWindowDays: 30,
        recurrenceRedCount: 2,
        reminderHours: 24,
      },
    );

    async function closeTurn({
      id,
      shift = "am",
      responsible,
      now,
      inventoryDifference = 0,
      cashDifferenceClp = 0,
    }) {
      const openedAt = new Date(now.getTime() - 60_000);
      const session = await openTestSession(database, {
        id: `sesion-${id}`,
        shift,
        responsible,
        now: openedAt,
      });
      const preview = await pos.module.getCashClosurePreview(
        database,
        session.businessDate,
        session.shift,
      );
      const inventory = await pos.module.listClosingInventory(database);
      const counted = exactInventoryCount(inventory).map((line) =>
        line.key === "product:producto-incidencias:simple" &&
        inventoryDifference !== 0
          ? {
              ...line,
              countedQuantity: line.expectedQuantity + inventoryDifference,
              reasonCategory: "merma",
              comment: `Conteo informado para ${id}`,
            }
          : line,
      );
      const input = exactClosureInput(session, preview, inventory, {
        id: `cierre-${id}`,
        countedCashClp: preview.expectedCashClp + cashDifferenceClp,
        financialDifferenceReason:
          cashDifferenceClp === 0
            ? null
            : `Diferencia financiera informada para ${id}`,
        inventory: counted,
      });
      return {
        input,
        now,
        session,
        result: await pos.module.createCashClosure(database, input, now),
      };
    }

    const green = await closeTurn({
      id: "verde-am-1",
      responsible: "Eva Soto",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    assert.equal(green.result.incidentId, null);
    assert.equal(
      sqlite.prepare("SELECT COUNT(*) AS count FROM closure_incidents").get().count,
      0,
    );

    const yellow = await closeTurn({
      id: "amarillo-am-2",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-01T13:00:00.000Z"),
      inventoryDifference: -1,
    });
    assert.equal(yellow.result.incidentId, "incident:cierre-amarillo-am-2");
    assert.equal(
      (
        await pos.module.createCashClosure(
          database,
          yellow.input,
          yellow.now,
        )
      ).idempotent,
      true,
    );
    const yellowDetail = await incidents.module.getClosureIncident(
      database,
      yellow.result.incidentId,
      new Date("2026-09-01T14:00:00.000Z"),
    );
    assert.ok(yellowDetail);
    assert.equal(yellowDetail.level, "yellow");
    assert.equal(yellowDetail.status, "pending_clarification");
    assert.match(yellowDetail.classificationReason, /inventario aislada/i);
    assert.equal(yellowDetail.estimatedValueClp, 2000);
    assert.deepEqual(yellowDetail.items, [
      {
        key: "product:producto-incidencias:simple",
        itemType: "product",
        itemId: "producto-incidencias",
        name: "Producto auditado",
        unit: "unidades",
        location: "simple",
        expectedQuantity: 12,
        countedQuantity: 11,
        differenceQuantity: -1,
        reasonCategory: "merma",
        reasonLabel: "Merma",
        initialComment: "Conteo informado para amarillo-am-2",
        adjustmentApplied: -1,
        unitValueClp: 2000,
        estimatedValueClp: 2000,
        highValue: false,
      },
    ]);
    assert.equal(
      sqlite
        .prepare("SELECT stock FROM products WHERE id = 'producto-incidencias'")
        .get().stock,
      11,
    );

    const recurrent = await closeTurn({
      id: "reincidente-am-3",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-01T14:00:00.000Z"),
      inventoryDifference: -1,
    });
    const recurrentDetail = await incidents.module.getClosureIncident(
      database,
      recurrent.result.incidentId,
    );
    assert.ok(recurrentDetail);
    assert.equal(recurrentDetail.level, "red");
    assert.equal(recurrentDetail.priorResponsibleIncidentCount, 1);
    assert.equal(recurrentDetail.highestPriorProductIncidentCount, 1);
    assert.match(recurrentDetail.classificationReason, /reincidencia/i);

    const moneyRed = await closeTurn({
      id: "dinero-pm-1",
      shift: "pm",
      responsible: "Hernán Silva",
      now: new Date("2026-09-01T18:00:00.000Z"),
      cashDifferenceClp: 1,
    });
    const moneyDetail = await incidents.module.getClosureIncident(
      database,
      moneyRed.result.incidentId,
    );
    assert.ok(moneyDetail);
    assert.equal(moneyDetail.level, "red");
    assert.equal(moneyDetail.cashDifferenceClp, 1);
    assert.match(moneyDetail.classificationReason, /diferencia de dinero/i);

    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT shift, COUNT(*) AS count
          FROM cash_closures WHERE business_date = '2026-09-01'
          GROUP BY shift ORDER BY shift
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        { shift: "am", count: 3 },
        { shift: "pm", count: 1 },
      ],
    );

    const clarification = await incidents.module.appendClosureIncidentEvent(
      database,
      yellow.result.incidentId,
      {
        id: "evento-aclaracion-amarillo",
        action: "clarification_requested",
        expectedStatus: "pending_clarification",
        comment: "Aclarar el conteo informado.",
      },
      new Date("2026-09-01T15:00:00.000Z"),
    );
    assert.equal(clarification.idempotent, false);
    assert.equal(clarification.incident.status, "pending_clarification");
    assert.equal(
      (
        await incidents.module.appendClosureIncidentEvent(
          database,
          yellow.result.incidentId,
          {
            id: "evento-aclaracion-amarillo",
            action: "clarification_requested",
            expectedStatus: "pending_clarification",
            comment: "Aclarar el conteo informado.",
          },
          new Date("2026-09-01T15:01:00.000Z"),
        )
      ).idempotent,
      true,
    );
    await assert.rejects(
      () =>
        incidents.module.appendClosureIncidentEvent(
          database,
          yellow.result.incidentId,
          {
            id: "evento-aclaracion-amarillo",
            action: "clarification_requested",
            expectedStatus: "pending_clarification",
            comment: "Este contenido no coincide.",
          },
        ),
      (error) => error.status === 409 && /id.*utilizado/i.test(error.message),
    );
    const clarified = await incidents.module.appendClosureIncidentEvent(
      database,
      yellow.result.incidentId,
      {
        id: "evento-respuesta-amarillo",
        action: "clarified",
        expectedStatus: "pending_clarification",
        comment: "La merma fue revisada con el responsable.",
        actorRole: "sales",
        actorName: "Bárbara Vega",
      },
      new Date("2026-09-01T15:30:00.000Z"),
    );
    assert.equal(clarified.incident.status, "clarified");

    const revisionContext = await pos.module.getCashClosureRevisionContext(
      database,
      yellow.result.closure.id,
    );
    const incidentRevisionInput = {
      id: "revision-incidencia-amarilla",
      expectedRevisionNumber: 0,
      reason: "Se revisó el conteo informado sin alterar el registro original.",
      countedCashClp: revisionContext.effective.countedCashClp,
      countedCardClp: revisionContext.effective.countedCardClp + 1,
      countedTransferClp: revisionContext.effective.countedTransferClp,
      addedSales: [],
      inventory: [],
    };
    const incidentRevision = await pos.module.createCashClosureRevision(
      database,
      yellow.result.closure.id,
      incidentRevisionInput,
      new Date("2026-09-01T15:45:00.000Z"),
    );
    assert.equal(incidentRevision.idempotent, false);
    assert.equal(incidentRevision.revision.revisionNumber, 1);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM closure_incident_events
          WHERE incident_id = ? AND event_type = 'correction_applied'
        `)
        .get(yellow.result.incidentId).count,
      1,
    );
    assert.equal(
      (
        await pos.module.createCashClosureRevision(
          database,
          yellow.result.closure.id,
          incidentRevisionInput,
          new Date("2026-09-01T15:50:00.000Z"),
        )
      ).idempotent,
      true,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM closure_incident_events
          WHERE incident_id = ? AND event_type = 'correction_applied'
        `)
        .get(yellow.result.incidentId).count,
      1,
    );
    const validation = await pos.module.validateCashClosure(
      database,
      yellow.result.closure.id,
      {
        comment: "Evidencia revisada por Administración.",
        expectedRevisionNumber: 1,
      },
      new Date("2026-09-01T16:00:00.000Z"),
    );
    assert.equal(validation.closure.validationStatus, "validated");
    assert.equal(
      (
        await incidents.module.getClosureIncident(
          database,
          yellow.result.incidentId,
        )
      ).status,
      "validated",
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM closure_incident_events
          WHERE incident_id = ? AND event_type = 'validated'
        `)
        .get(yellow.result.incidentId).count,
      1,
    );
    assert.equal(
      (
        await pos.module.validateCashClosure(
          database,
          yellow.result.closure.id,
          {
            comment: "Evidencia revisada por Administración.",
            expectedRevisionNumber: 1,
          },
          new Date("2026-09-01T16:05:00.000Z"),
        )
      ).idempotent,
      true,
    );
    assert.equal(
      (
        await pos.module.createCashClosureRevision(
          database,
          yellow.result.closure.id,
          incidentRevisionInput,
          new Date("2026-09-01T16:10:00.000Z"),
        )
      ).idempotent,
      true,
    );
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT event_type, COUNT(*) AS count
          FROM closure_incident_events
          WHERE incident_id = ?
            AND event_type IN ('correction_applied', 'validated')
          GROUP BY event_type ORDER BY event_type
        `)
        .all(yellow.result.incidentId)
        .map((row) => ({ ...row })),
      [
        { event_type: "correction_applied", count: 1 },
        { event_type: "validated", count: 1 },
      ],
    );

    for (const sql of [
      `UPDATE closure_incidents SET level = 'red'
        WHERE id = 'incident:cierre-amarillo-am-2'`,
      `UPDATE closure_incident_items SET initial_comment = 'mutado'
        WHERE incident_id = 'incident:cierre-amarillo-am-2'`,
      `DELETE FROM closure_incident_events
        WHERE incident_id = 'incident:cierre-amarillo-am-2'`,
    ]) {
      assert.throws(() => sqlite.prepare(sql).run(), /immutable|append-only/i, sql);
    }
    const immutableDetail = await incidents.module.getClosureIncident(
      database,
      yellow.result.incidentId,
    );
    assert.equal(immutableDetail.level, "yellow");
    assert.equal(
      immutableDetail.items[0].initialComment,
      "Conteo informado para amarillo-am-2",
    );

    const dashboard = await incidents.module.listClosureIncidents(database, {
      from: "2026-09-01",
      to: "2026-09-01",
    });
    assert.equal(dashboard.total, 3);
    assert.equal(dashboard.pendingCount, 2);
    assert.equal(dashboard.redCount, 2);
    assert.equal(dashboard.responsibleRecurrence[0].responsible, "Bárbara Vega");
    assert.equal(dashboard.responsibleRecurrence[0].incidentCount, 2);
    assert.equal(dashboard.productRecurrence[0].itemId, "producto-incidencias");
    assert.equal(dashboard.productRecurrence[0].incidentCount, 2);
    assert.equal(
      (
        await incidents.module.listClosureIncidents(database, {
          status: "validated",
          responsible: "bárbara",
          product: "auditado",
        })
      ).total,
      1,
    );
    assert.equal(
      (
        await incidents.module.listClosureIncidents(database, {
          level: "red",
        })
      ).total,
      2,
    );

    const updatedSettings = await incidents.module.updateClosureIncidentSettings(
      database,
      {
        moneyRedThresholdClp: 5000,
        multipleProductRedCount: 3,
        highValueProductClp: 15000,
        recurrenceWindowDays: 45,
        recurrenceRedCount: 3,
        reminderHours: 12,
        expectedUpdatedAt: settings.updatedAt,
      },
      new Date("2026-09-01T19:00:00.000Z"),
    );
    assert.equal(updatedSettings.moneyRedThresholdClp, 5000);
    assert.equal(updatedSettings.updatedAt, "2026-09-01T19:00:00.000Z");
    await assert.rejects(
      () =>
        incidents.module.updateClosureIncidentSettings(database, {
          moneyRedThresholdClp: 6000,
          multipleProductRedCount: 3,
          highValueProductClp: 15000,
          recurrenceWindowDays: 45,
          recurrenceRedCount: 3,
          reminderHours: 12,
          expectedUpdatedAt: settings.updatedAt,
        }),
      (error) => error.status === 409 && /configuración cambió/i.test(error.message),
    );
    assert.equal(yellowDetail.thresholds.moneyRedThresholdClp, 1);

    const following = await openTestSession(database, {
      id: "sesion-despues-incidencias",
      shift: "am",
      responsible: "Andrés Lagos",
      now: new Date("2026-09-01T20:00:00.000Z"),
    });
    assert.equal(following.status, "open");
  } finally {
    sqlite.close();
  }
});

test("una revisión de cierre verde crea incidencia solo si introduce una diferencia", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-revision-incidente",
      name: "Producto con conteo revisable",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 5,
    });
    seedPosProduct(sqlite, {
      id: "producto-revision-sin-stock",
      name: "Servicio sin stock",
      category: "Servicios",
      priceClp: 1000,
      stockMode: "untracked",
    });
    const { database } = sqliteD1Adapter(sqlite);

    const balancedSession = await openTestSession(database, {
      id: "sesion-revision-verde-cuadrada",
      responsible: "Eva Soto",
      now: new Date("2026-09-03T12:00:00.000Z"),
    });
    const balancedPreview = await pos.module.getCashClosurePreview(
      database,
      balancedSession.businessDate,
      balancedSession.shift,
    );
    const balancedInventory = await pos.module.listClosingInventory(database);
    const balancedClosure = await pos.module.createCashClosure(
      database,
      exactClosureInput(
        balancedSession,
        balancedPreview,
        balancedInventory,
        { id: "cierre-revision-verde-cuadrada" },
      ),
      new Date("2026-09-03T12:01:00.000Z"),
    );
    assert.equal(balancedClosure.incidentId, null);
    const balancedRevision = await pos.module.createCashClosureRevision(
      database,
      balancedClosure.closure.id,
      {
        id: "revision-verde-sigue-cuadrada",
        expectedRevisionNumber: 0,
        reason: "Se agregó una venta omitida y su efectivo estaba contado.",
        countedCashClp: 1000,
        countedCardClp: 0,
        countedTransferClp: 0,
        addedSales: [
          {
            id: "venta-omitida-revision-cuadrada",
            paymentMethod: "efectivo",
            items: [
              {
                productId: "producto-revision-sin-stock",
                unitPriceClp: 1000,
                quantity: 1,
              },
            ],
          },
        ],
        inventory: [],
      },
      new Date("2026-09-03T12:05:00.000Z"),
    );
    assert.equal(balancedRevision.effective.differenceCollectedClp, 0);
    assert.equal(balancedRevision.effective.inventoryDifferenceCount, 0);
    assert.equal(
      await incidents.module.findClosureIncidentId(
        database,
        balancedClosure.closure.id,
      ),
      null,
    );

    const anomalousSession = await openTestSession(database, {
      id: "sesion-revision-verde-anomala",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-03T13:00:00.000Z"),
    });
    const anomalousPreview = await pos.module.getCashClosurePreview(
      database,
      anomalousSession.businessDate,
      anomalousSession.shift,
    );
    const anomalousInventory = await pos.module.listClosingInventory(database);
    const anomalousClosure = await pos.module.createCashClosure(
      database,
      exactClosureInput(
        anomalousSession,
        anomalousPreview,
        anomalousInventory,
        { id: "cierre-revision-verde-anomala" },
      ),
      new Date("2026-09-03T13:01:00.000Z"),
    );
    assert.equal(anomalousClosure.incidentId, null);
    const anomalousContext = await pos.module.getCashClosureRevisionContext(
      database,
      anomalousClosure.closure.id,
    );
    const countedLine = anomalousContext.effective.inventory.find(
      ({ key }) => key === "product:producto-revision-incidente:simple",
    );
    assert.ok(countedLine);
    const anomalousRevision = await pos.module.createCashClosureRevision(
      database,
      anomalousClosure.closure.id,
      {
        id: "revision-verde-introduce-diferencia",
        expectedRevisionNumber: 0,
        reason: "El administrador confirmó un faltante omitido en la entrega.",
        countedCashClp: anomalousContext.effective.countedCashClp,
        countedCardClp: anomalousContext.effective.countedCardClp,
        countedTransferClp: anomalousContext.effective.countedTransferClp,
        addedSales: [],
        inventory: [
          {
            key: countedLine.key,
            expectedCountedQuantity: countedLine.countedQuantity,
            countedQuantity: countedLine.countedQuantity - 1,
            liveVersionToken: countedLine.currentVersionToken,
            liveQuantity: countedLine.currentQuantity,
          },
        ],
      },
      new Date("2026-09-03T13:05:00.000Z"),
    );
    assert.equal(anomalousRevision.effective.inventoryDifferenceCount, 1);
    const incidentId = await incidents.module.findClosureIncidentId(
      database,
      anomalousClosure.closure.id,
    );
    assert.equal(
      incidentId,
      "incident:cierre-revision-verde-anomala",
    );
    const detail = await incidents.module.getClosureIncident(database, incidentId);
    assert.ok(detail);
    assert.equal(detail.level, "yellow");
    assert.equal(detail.status, "requires_correction");
    assert.equal(detail.financialEvidence.sourceRevisionNumber, 1);
    assert.equal(
      detail.financialEvidence.countedCashClp -
        detail.financialEvidence.expectedCashClp,
      detail.cashDifferenceClp,
    );
    assert.equal(
      detail.financialEvidence.countedCardClp -
        detail.financialEvidence.expectedCardClp,
      detail.cardDifferenceClp,
    );
    assert.equal(
      detail.financialEvidence.countedTransferClp -
        detail.financialEvidence.expectedTransferClp,
      detail.transferDifferenceClp,
    );
    assert.equal(
      detail.financialDifferenceReason,
      "El administrador confirmó un faltante omitido en la entrega.",
    );
    assert.deepEqual(
      detail.events.map(({ eventType, status }) => ({ eventType, status })),
      [
        { eventType: "created", status: "pending_clarification" },
        { eventType: "correction_applied", status: "requires_correction" },
      ],
    );
    assert.deepEqual(
      detail.items.map((item) => ({
        key: item.key,
        expectedQuantity: item.expectedQuantity,
        countedQuantity: item.countedQuantity,
        differenceQuantity: item.differenceQuantity,
        reasonCategory: item.reasonCategory,
        initialComment: item.initialComment,
        adjustmentApplied: item.adjustmentApplied,
        estimatedValueClp: item.estimatedValueClp,
      })),
      [
        {
          key: "product:producto-revision-incidente:simple",
          expectedQuantity: 5,
          countedQuantity: 4,
          differenceQuantity: -1,
          reasonCategory: "otro",
          initialComment:
            "Corrección administrativa 1: El administrador confirmó un faltante omitido en la entrega.",
          adjustmentApplied: -1,
          estimatedValueClp: 1000,
        },
      ],
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT counted_quantity FROM cash_closure_inventory
          WHERE closure_id = ? AND item_key = ?
        `)
        .get(anomalousClosure.closure.id, countedLine.key).counted_quantity,
      5,
    );
    assert.equal(
      sqlite
        .prepare("SELECT stock FROM products WHERE id = ?")
        .get("producto-revision-incidente").stock,
      4,
    );

    const alertConfig = notifications.module.readWhatsAppConfig({
      WHATSAPP_ENABLED: "true",
      WHATSAPP_API_TOKEN: "token-alerta-revision",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_ADMIN_RECIPIENTS: "+56944444444",
      WHATSAPP_ALERT_TEMPLATE_NAME: "alerta_cierre",
    });
    const alertIds =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        incidentId,
        alertConfig,
        new Date("2026-09-03T13:06:00.000Z"),
    );
    assert.equal(alertIds.length, 1);
    const revisionAlert = sqlite
      .prepare(`
        SELECT kind, status, message_preview
        FROM closure_notification_deliveries
        WHERE id = ?
      `)
      .get(alertIds[0]);
    assert.equal(revisionAlert.kind, "immediate_alert");
    assert.equal(revisionAlert.status, "queued");
    assert.match(
      revisionAlert.message_preview,
      /Motivo financiero: El administrador confirmó un faltante omitido en la entrega\./,
    );
  } finally {
    sqlite.close();
  }
});

test("WhatsApp conserva auditoría, evita duplicados y permite reintentar sin bloquear el cierre", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-whatsapp",
      name: "Barra para alerta",
      category: "Alimentos",
      priceClp: 2000,
      stockMode: "simple",
      stock: 6,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-01T12:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-whatsapp",
      responsible: "Andrés Lagos",
      now,
    });
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const inventory = await pos.module.listClosingInventory(database);
    const counted = exactInventoryCount(inventory).map((line) =>
      line.key === "product:producto-whatsapp:simple"
        ? {
            ...line,
            countedQuantity: line.expectedQuantity - 1,
            reasonCategory: "consumo_no_registrado",
            comment: "Consumo detectado durante el conteo.",
          }
        : line,
    );
    const closed = await pos.module.createCashClosure(
      database,
      exactClosureInput(session, preview, inventory, {
        id: "cierre-whatsapp",
        inventory: counted,
      }),
      now,
    );
    assert.ok(closed.incidentId);

    const greenNow = new Date("2026-09-01T18:00:00.000Z");
    const greenSession = await openTestSession(database, {
      id: "sesion-whatsapp-verde",
      shift: "pm",
      responsible: "Eva Soto",
      now: greenNow,
    });
    const greenPreview = await pos.module.getCashClosurePreview(
      database,
      greenSession.businessDate,
      greenSession.shift,
    );
    const greenInventory = await pos.module.listClosingInventory(database);
    const greenClosed = await pos.module.createCashClosure(
      database,
      exactClosureInput(greenSession, greenPreview, greenInventory, {
        id: "cierre-whatsapp-verde",
      }),
      greenNow,
    );
    assert.equal(greenClosed.incidentId, null);

    const incomplete = notifications.module.readWhatsAppConfig({});
    const configurationIds =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        incomplete,
        now,
      );
    assert.equal(configurationIds.length, 1);
    assert.deepEqual(
      {
        ...sqlite
          .prepare(`
            SELECT recipient_type, status, attempt_count
            FROM closure_notification_deliveries WHERE id = ?
          `)
          .get(configurationIds[0]),
      },
      {
        recipient_type: "configuration",
        status: "configuration_required",
        attempt_count: 0,
      },
    );

    const groupWithoutWaba = notifications.module.readWhatsAppConfig({
      WHATSAPP_ENABLED: "true",
      WHATSAPP_API_TOKEN: "token-grupo-prueba",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_APP_SECRET: "secreto-grupo-prueba",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-grupo-prueba",
      WHATSAPP_GROUPS_ENABLED: "true",
      WHATSAPP_GROUP_IDS: "grupo-oficial-prueba",
      WHATSAPP_ALERT_TEMPLATE_NAME: "alerta_cierre",
      WHATSAPP_DAILY_TEMPLATE_NAME: "resumen_cierres",
    });
    const incompleteGroupConfiguration =
      notifications.module.publicWhatsAppConfiguration(groupWithoutWaba);
    assert.equal(incompleteGroupConfiguration.groupRecipientCount, 1);
    assert.equal(incompleteGroupConfiguration.alertReady, false);
    assert.equal(incompleteGroupConfiguration.dailySummaryReady, false);
    assert.match(
      incompleteGroupConfiguration.issues.join(" "),
      /WHATSAPP_WABA_ID/,
    );
    assert.deepEqual(
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        groupWithoutWaba,
        now,
      ),
      configurationIds,
    );

    const config = notifications.module.readWhatsAppConfig({
      WHATSAPP_ENABLED: "true",
      WHATSAPP_GRAPH_API_VERSION: "v23.0",
      WHATSAPP_API_TOKEN: "token-secreto-de-prueba",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_APP_SECRET: "secreto-webhook-de-prueba",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: "token-verificacion-de-prueba",
      WHATSAPP_ADMIN_RECIPIENTS: "+56911111111,+56922222222",
      WHATSAPP_ALERT_TEMPLATE_NAME: "alerta_cierre",
      WHATSAPP_REMINDER_TEMPLATE_NAME: "recordatorio_cierre",
      WHATSAPP_DAILY_TEMPLATE_NAME: "resumen_cierres",
      WHATSAPP_TEMPLATE_LANGUAGE: "es_CL",
      WHATSAPP_MAX_RETRIES: "3",
      APP_PUBLIC_URL: "https://stage.example.test/",
    });
    const publicConfiguration =
      notifications.module.publicWhatsAppConfiguration(config);
    assert.equal(publicConfiguration.ready, true);
    assert.equal(publicConfiguration.individualRecipientCount, 2);
    assert.doesNotMatch(
      JSON.stringify(publicConfiguration),
      /token-secreto|secreto-webhook|56911111111|56922222222/,
    );

    const deliveryIds =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        config,
        now,
      );
    assert.equal(deliveryIds.length, 2);
    assert.equal(
      sqlite
        .prepare(`
          SELECT status FROM closure_notification_deliveries WHERE id = ?
        `)
        .get(configurationIds[0]).status,
      "superseded",
    );

    const calls = [];
    let providerSequence = 0;
    const acceptedFetcher = async (url, init) => {
      providerSequence += 1;
      calls.push({ url, init, body: JSON.parse(init.body) });
      return Response.json(
        { messages: [{ id: `wamid.prueba.${providerSequence}` }] },
        { status: 200 },
      );
    };
    for (const deliveryId of deliveryIds) {
      const delivery = await notifications.module.dispatchWhatsAppDelivery(
        database,
        deliveryId,
        config,
        { fetcher: acceptedFetcher },
        now,
      );
      assert.equal(delivery.status, "accepted");
      assert.equal(delivery.attempt_count, 1);
    }
    assert.equal(calls.length, 2);
    assert.ok(
      calls.every(
        ({ url, init, body }) =>
          url ===
            "https://graph.facebook.com/v23.0/123456789/messages" &&
          init.headers.authorization === "Bearer token-secreto-de-prueba" &&
          body.type === "template" &&
          body.template.name === "alerta_cierre",
      ),
    );

    const groupConfig = notifications.module.readWhatsAppConfig({
      WHATSAPP_ENABLED: "true",
      WHATSAPP_GRAPH_API_VERSION: "v23.0",
      WHATSAPP_API_TOKEN: "token-grupo-prueba",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_WABA_ID: "waba-oficial-prueba",
      WHATSAPP_APP_SECRET: "secreto-grupo-prueba",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-grupo-prueba",
      WHATSAPP_GROUPS_ENABLED: "true",
      WHATSAPP_GROUP_IDS: "grupo-oficial-prueba",
      WHATSAPP_ALERT_TEMPLATE_NAME: "alerta_cierre",
      WHATSAPP_DAILY_TEMPLATE_NAME: "resumen_cierres",
    });
    assert.equal(
      notifications.module.publicWhatsAppConfiguration(groupConfig).alertReady,
      true,
    );
    const [groupDeliveryId] =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        groupConfig,
        new Date("2026-09-01T12:04:00.000Z"),
      );
    await assert.rejects(
      () =>
        notifications.module.dispatchWhatsAppDelivery(
          database,
          groupDeliveryId,
          groupWithoutWaba,
          { fetcher: acceptedFetcher },
        ),
      (error) => error.status === 409 && /WABA_ID/i.test(error.message),
    );
    const groupCalls = [];
    const groupDelivery =
      await notifications.module.dispatchWhatsAppDelivery(
        database,
        groupDeliveryId,
        groupConfig,
        {
          fetcher: async (url, init) => {
            groupCalls.push({ url, init, body: JSON.parse(init.body) });
            return Response.json(
              { messages: [{ id: "wamid.grupo.prueba" }] },
              { status: 200 },
            );
          },
        },
        new Date("2026-09-01T12:04:30.000Z"),
      );
    assert.equal(groupDelivery.status, "accepted");
    assert.deepEqual(
      groupCalls.map(({ url, body }) => ({
        url,
        recipientType: body.recipient_type,
        recipient: body.to,
      })),
      [
        {
          url: "https://graph.facebook.com/v23.0/123456789/messages",
          recipientType: "group",
          recipient: "grupo-oficial-prueba",
        },
      ],
    );

    const replayIds =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        config,
        new Date("2026-09-01T12:05:00.000Z"),
      );
    assert.deepEqual(replayIds, deliveryIds);
    for (const deliveryId of replayIds) {
      assert.equal(
        (
          await notifications.module.dispatchWhatsAppDelivery(
            database,
            deliveryId,
            config,
            { fetcher: acceptedFetcher },
          )
        ).status,
        "accepted",
      );
    }
    assert.equal(calls.length, 2);

    const firstProviderId = sqlite
      .prepare(`
        SELECT provider_message_id FROM closure_notification_deliveries
        WHERE id = ?
      `)
      .get(deliveryIds[0]).provider_message_id;
    const webhookUpdated =
      await notifications.module.applyWhatsAppWebhookStatuses(
        database,
        {
          entry: [
            {
              changes: [
                {
                  value: {
                    statuses: [{ id: firstProviderId, status: "read" }],
                  },
                },
              ],
            },
          ],
        },
        new Date("2026-09-01T12:10:00.000Z"),
      );
    assert.equal(webhookUpdated, 1);
    assert.equal(
      sqlite
        .prepare(`
          SELECT status FROM closure_notification_deliveries WHERE id = ?
        `)
        .get(deliveryIds[0]).status,
      "read",
    );

    const retryConfig = notifications.module.readWhatsAppConfig({
      WHATSAPP_ENABLED: "true",
      WHATSAPP_API_TOKEN: "token-reintento",
      WHATSAPP_PHONE_NUMBER_ID: "123456789",
      WHATSAPP_ADMIN_RECIPIENTS: "+56933333333",
      WHATSAPP_ALERT_TEMPLATE_NAME: "alerta_cierre",
      WHATSAPP_DAILY_TEMPLATE_NAME: "resumen_cierres",
      WHATSAPP_MAX_RETRIES: "3",
    });
    const [retryDeliveryId] =
      await notifications.module.queueImmediateIncidentNotifications(
        database,
        closed.incidentId,
        retryConfig,
        now,
      );
    const failed = await notifications.module.dispatchWhatsAppDelivery(
      database,
      retryDeliveryId,
      retryConfig,
      {
        fetcher: async () => {
          throw new TypeError("fallo de red simulado");
        },
      },
      now,
    );
    assert.equal(failed.status, "failed");
    assert.equal(failed.error_code, "ambiguous_delivery");
    assert.equal(failed.attempt_count, 1);
    await assert.rejects(
      () =>
        notifications.module.dispatchWhatsAppDelivery(
          database,
          retryDeliveryId,
          retryConfig,
          { fetcher: acceptedFetcher },
      ),
      (error) => error.status === 409 && /ambiguo/i.test(error.message),
    );

    const retryReservation =
      await incidents.module.appendClosureIncidentEvent(
        database,
        closed.incidentId,
        {
          id: "reintento-manual-001",
          action: "notification_retry",
          expectedStatus: "pending_clarification",
          comment: "Reintento manual de notificación por WhatsApp solicitado.",
        },
        new Date("2026-09-01T12:12:00.000Z"),
      );
    assert.equal(retryReservation.idempotent, false);

    const policyFetch = globalThis.fetch;
    globalThis.fetch = acceptedFetcher;
    try {
      const policy = await notifications.module.processDueNotificationPolicies(
        database,
        config,
        new Date("2026-09-02T14:00:00.000Z"),
      );
      assert.deepEqual(policy, { queued: 4, attempted: 4 });
    } finally {
      globalThis.fetch = policyFetch;
    }
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT kind, status, COUNT(*) AS count
          FROM closure_notification_deliveries
          WHERE kind IN ('reminder', 'daily_summary')
          GROUP BY kind, status ORDER BY kind
        `)
        .all()
        .map((row) => ({ ...row })),
      [
        { kind: "daily_summary", status: "accepted", count: 2 },
        { kind: "reminder", status: "accepted", count: 2 },
      ],
    );

    const validatedIncident = await pos.module.validateCashClosure(
      database,
      closed.closure.id,
      {
        comment: "Incidencia y evidencia revisadas por Administración.",
        expectedRevisionNumber: 0,
      },
      new Date("2026-09-02T14:05:00.000Z"),
    );
    assert.equal(validatedIncident.closure.validationStatus, "validated");
    const replayedRetryReservation =
      await incidents.module.appendClosureIncidentEvent(
        database,
        closed.incidentId,
        {
          id: "reintento-manual-001",
          action: "notification_retry",
          expectedStatus: "validated",
          comment: "Reintento manual de notificación por WhatsApp solicitado.",
        },
        new Date("2026-09-02T14:06:00.000Z"),
      );
    assert.equal(replayedRetryReservation.idempotent, true);
    assert.equal(replayedRetryReservation.incident.status, "validated");
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM closure_incident_events
          WHERE id = 'reintento-manual-001'
            AND event_type = 'notification_retry'
        `)
        .get().count,
      1,
    );

    const originalFetch = globalThis.fetch;
    globalThis.fetch = acceptedFetcher;
    try {
      const [retried] = await notifications.module.retryWhatsAppDelivery(
        database,
        retryDeliveryId,
        retryConfig,
        new Date("2026-09-02T14:10:00.000Z"),
        closed.incidentId,
        "reintento-manual-001",
      );
      assert.equal(retried.status, "accepted");
      assert.equal(retried.attempt_count, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.deepEqual(
      sqlite
        .prepare(`
          SELECT attempt.attempt_number, attempt.initiated_by, result.outcome,
            result.event_key
          FROM closure_notification_attempts AS attempt
          INNER JOIN closure_notification_attempt_results AS result
            ON result.attempt_id = attempt.id
          WHERE attempt.delivery_id = ?
          ORDER BY attempt.attempt_number
        `)
        .all(retryDeliveryId)
        .map((row) => ({ ...row })),
      [
        {
          attempt_number: 1,
          initiated_by: "automatic",
          outcome: "ambiguous",
          event_key: "transport_error",
        },
        {
          attempt_number: 2,
          initiated_by: "manual",
          outcome: "accepted",
          event_key: "provider_response",
        },
      ],
    );
    for (const sql of [
      `UPDATE closure_notification_attempts SET initiated_by = 'manual'
        WHERE delivery_id = '${retryDeliveryId}' AND attempt_number = 1`,
      `DELETE FROM closure_notification_attempt_results
        WHERE attempt_id IN (
          SELECT id FROM closure_notification_attempts
          WHERE delivery_id = '${retryDeliveryId}'
        )`,
    ]) {
      assert.throws(
        () => sqlite.prepare(sql).run(),
        /immutable|append-only/i,
        sql,
      );
    }

    const incidentAfterNotifications =
      await incidents.module.getClosureIncident(database, closed.incidentId);
    assert.ok(incidentAfterNotifications);
    assert.equal(incidentAfterNotifications.status, "validated");
    assert.equal(incidentAfterNotifications.notifications.length, 7);
    assert.doesNotMatch(
      JSON.stringify(incidentAfterNotifications.notifications),
      /56911111111|56922222222|56933333333|token-secreto|token-reintento/,
    );
    assert.ok(
      incidentAfterNotifications.notifications.some(({ recipient }) =>
        recipient.endsWith("1111"),
      ),
    );
    assert.throws(
      () =>
        sqlite
          .prepare("DELETE FROM closure_notification_deliveries WHERE id = ?")
          .run(deliveryIds[0]),
      /immutable/i,
    );

    const body = new TextEncoder().encode('{"object":"whatsapp_business_account"}');
    const signingKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("secreto-webhook-de-prueba"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = new Uint8Array(
      await crypto.subtle.sign("HMAC", signingKey, body),
    );
    const signature = Array.from(signatureBytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    assert.equal(
      await notifications.module.verifyWhatsAppWebhookSignature(
        body.buffer,
        `sha256=${signature}`,
        "secreto-webhook-de-prueba",
      ),
      true,
    );
    assert.equal(
      await notifications.module.verifyWhatsAppWebhookSignature(
        body.buffer,
        `sha256=${"0".repeat(64)}`,
        "secreto-webhook-de-prueba",
      ),
      false,
    );
  } finally {
    sqlite.close();
  }
});

test("las correcciones de cierre son históricas, append-only y validan solo el head sellado", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "revision-historico",
      name: "Producto histórico",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 5,
    });
    seedPosProduct(sqlite, {
      id: "revision-ajustable",
      name: "Producto ajustable",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "simple",
      stock: 10,
    });
    const adapter = sqliteD1Adapter(sqlite);
    const { database } = adapter;
    const session = await openTestSession(database, {
      id: "sesion-revisable",
      openingCashClp: 100,
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const inventory = await pos.module.listClosingInventory(database);
    const closed = await pos.module.createCashClosure(
      database,
      exactClosureInput(session, preview, inventory, {
        id: "cierre-revisable",
      }),
      new Date("2026-09-01T13:00:00.000Z"),
    );
    assert.equal(closed.closure.validationStatus, "pending");

    sqlite
      .prepare(`
        UPDATE products
        SET stock_mode = 'untracked', stock = NULL, active = 0
        WHERE id = 'revision-historico'
      `)
      .run();
    const baseContext = await pos.module.getCashClosureRevisionContext(
      database,
      closed.closure.id,
    );
    const historicalLine = baseContext.effective.inventory.find(
      ({ key }) => key === "product:revision-historico:simple",
    );
    const adjustableLine = baseContext.effective.inventory.find(
      ({ key }) => key === "product:revision-ajustable:simple",
    );
    assert.ok(historicalLine);
    assert.ok(adjustableLine);
    assert.equal(historicalLine.adjustable, false);
    assert.equal(historicalLine.currentQuantity, null);
    assert.equal(historicalLine.currentVersionToken, null);
    assert.equal(adjustableLine.adjustable, true);

    const revisionOneInput = {
      id: "revision-cierre-1",
      expectedRevisionNumber: 0,
      reason: "Se omitió una venta y el conteo físico correcto era nueve.",
      countedCashClp: 1654,
      countedCardClp: 0,
      countedTransferClp: 0,
      addedSales: [
        {
          id: "venta-historica-omitida",
          paymentMethod: "efectivo",
          items: [
            { productId: "revision-historico", unitPriceClp: 777, quantity: 2 },
          ],
        },
      ],
      inventory: [
        {
          key: adjustableLine.key,
          expectedCountedQuantity: adjustableLine.countedQuantity,
          countedQuantity: 9,
          liveVersionToken: adjustableLine.currentVersionToken,
          liveQuantity: adjustableLine.currentQuantity,
        },
      ],
    };
    const revisionAdapter = sqliteD1Adapter(sqlite);
    const first = await pos.module.createCashClosureRevision(
      revisionAdapter.database,
      closed.closure.id,
      revisionOneInput,
      new Date("2026-09-02T12:00:00.000Z"),
    );
    assert.ok(
      revisionAdapter.getPrepareCalls() < 50,
      `crear una revisión preparó ${revisionAdapter.getPrepareCalls()} consultas`,
    );
    assert.ok(revisionAdapter.getMaxBatchStatements() < 50);
    assert.ok(revisionAdapter.getMaxBindValues() <= 100);
    assert.equal(first.idempotent, false);
    assert.equal(first.revision.revisionNumber, 1);
    assert.equal(first.effective.includedSalesClp, 1554);
    assert.equal(first.effective.includedSalesCount, 1);
    assert.equal(first.effective.cashCollectedClp, 1554);
    assert.equal(first.effective.expectedCashClp, 1654);
    assert.equal(first.effective.countedCashClp, 1654);
    const revisionIncidentId = await incidents.module.findClosureIncidentId(
      database,
      closed.closure.id,
    );
    assert.equal(revisionIncidentId, "incident:cierre-revisable");
    const revisionIncident = await incidents.module.getClosureIncident(
      database,
      revisionIncidentId,
    );
    assert.ok(revisionIncident);
    assert.equal(revisionIncident.status, "requires_correction");
    const historicalIncidentItem = revisionIncident.items.find(
      ({ key }) => key === historicalLine.key,
    );
    assert.ok(historicalIncidentItem);
    assert.deepEqual(
      {
        expectedQuantity: historicalIncidentItem.expectedQuantity,
        countedQuantity: historicalIncidentItem.countedQuantity,
        differenceQuantity: historicalIncidentItem.differenceQuantity,
        adjustmentApplied: historicalIncidentItem.adjustmentApplied,
      },
      {
        expectedQuantity: 3,
        countedQuantity: 5,
        differenceQuantity: 2,
        adjustmentApplied: 0,
      },
    );
    const historicalAfter = first.effective.inventory.find(
      ({ key }) => key === historicalLine.key,
    );
    const adjustableAfter = first.effective.inventory.find(
      ({ key }) => key === adjustableLine.key,
    );
    assert.deepEqual(
      {
        expected: historicalAfter.expectedQuantity,
        counted: historicalAfter.countedQuantity,
        current: historicalAfter.currentQuantity,
        adjustable: historicalAfter.adjustable,
      },
      { expected: 3, counted: 5, current: null, adjustable: false },
    );
    assert.deepEqual(
      {
        expected: adjustableAfter.expectedQuantity,
        counted: adjustableAfter.countedQuantity,
        current: adjustableAfter.currentQuantity,
      },
      { expected: 10, counted: 9, current: 9 },
    );
    assert.deepEqual(
      {
        stockMode: sqlite
          .prepare("SELECT stock_mode FROM products WHERE id = 'revision-historico'")
          .get().stock_mode,
        stock: sqlite
          .prepare("SELECT stock FROM products WHERE id = 'revision-historico'")
          .get().stock,
      },
      { stockMode: "untracked", stock: null },
    );
    assert.equal(
      sqlite
        .prepare("SELECT stock FROM products WHERE id = 'revision-ajustable'")
        .get().stock,
      9,
    );
    const historicalSale = sqlite
      .prepare(`
        SELECT created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, total_clp
        FROM sales WHERE id = 'venta-historica-omitida'
      `)
      .get();
    assert.equal(historicalSale.business_date, closed.closure.businessDate);
    assert.equal(historicalSale.shift, closed.closure.shift);
    assert.equal(historicalSale.shift_session_id, closed.closure.sessionId);
    assert.equal(historicalSale.payment_status, "paid");
    assert.equal(historicalSale.checkout_method, "efectivo");
    assert.equal(historicalSale.total_clp, 1554);
    assert.ok(
      Date.parse(historicalSale.created_at) >= Date.parse(session.openedAt) &&
        Date.parse(historicalSale.created_at) < Date.parse(closed.closure.createdAt),
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM sale_payments
          WHERE sale_id = 'venta-historica-omitida'
            AND kind = 'direct' AND amount_clp = 1554
        `)
        .get().count,
      1,
    );

    await assert.rejects(
      () =>
        pos.module.createCashClosureRevision(database, closed.closure.id, {
          id: "revision-ubicacion-inexistente",
          expectedRevisionNumber: 1,
          reason: "Intento de ajuste sobre una ubicación histórica.",
          countedCashClp: 1654,
          countedCardClp: 0,
          countedTransferClp: 0,
          addedSales: [],
          inventory: [
            {
              key: historicalAfter.key,
              expectedCountedQuantity: historicalAfter.countedQuantity,
              countedQuantity: 4,
              liveVersionToken: "sin-ubicacion",
              liveQuantity: 0,
            },
          ],
        }),
      (error) =>
        error.status === 409 && error.code === "inventory_location_unavailable",
    );

    const revisionTwoInput = {
      id: "revision-cierre-2",
      expectedRevisionNumber: 1,
      reason: "Se corrige el conteo conciliado de tarjeta.",
      countedCashClp: 1654,
      countedCardClp: 100,
      countedTransferClp: 0,
      addedSales: [],
      inventory: [],
    };
    const second = await pos.module.createCashClosureRevision(
      database,
      closed.closure.id,
      revisionTwoInput,
    );
    assert.equal(second.revision.revisionNumber, 2);
    assert.equal(second.effective.countedCardClp, 100);
    const assertFinancialAnchorCannotBeSealed = ({
      id,
      fingerprintCharacter,
      openingDelta,
      expensesDelta,
    }) => {
      sqlite.exec("SAVEPOINT revision_semantic_tamper");
      try {
        const tamperedFingerprint = fingerprintCharacter.repeat(64);
        sqlite
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
          )
          SELECT ?, closure_id, 3, 2, 0,
            expected_inventory_line_count, ?, 'Intento adulterado',
            '2026-09-02T12:30:00.000Z', included_sales_clp,
            included_sales_count, opening_cash_clp + ?, cash_collected_clp,
            card_collected_clp, transfer_collected_clp, total_collected_clp,
            expected_cash_clp + ?, expected_collected_clp + ?,
            expenses_clp + ?, adjusted_expected_cash_clp + ? - ?,
            counted_cash_clp, counted_card_clp,
            counted_transfer_clp, counted_collected_clp,
            difference_cash_clp - ? + ?,
            difference_card_clp, difference_transfer_clp,
            difference_collected_clp - ? + ?
          FROM cash_closure_revisions WHERE id = ?
        `)
          .run(
            id,
            tamperedFingerprint,
            openingDelta,
            openingDelta,
            openingDelta,
            expensesDelta,
            openingDelta,
            expensesDelta,
            openingDelta,
            expensesDelta,
            openingDelta,
            expensesDelta,
            revisionTwoInput.id,
          );
        sqlite
          .prepare(`
          INSERT INTO cash_closure_revision_inventory (
            revision_id, item_key, item_type, item_id, item_name, unit,
            location, previous_expected_quantity, expected_quantity,
            sale_consumption_quantity, previous_counted_quantity,
            counted_quantity, counted_delta_quantity, difference_quantity,
            live_quantity_before, live_version_token_before,
            live_quantity_after, live_version_token_after
          )
          SELECT ?, item_key, item_type, item_id,
            item_name, unit, location, expected_quantity, expected_quantity,
            0, counted_quantity, counted_quantity, 0, difference_quantity,
            NULL, NULL, NULL, NULL
          FROM cash_closure_revision_inventory WHERE revision_id = ?
        `)
          .run(id, revisionTwoInput.id);
        assert.throws(
          () =>
            sqlite
              .prepare(`
              INSERT INTO cash_closure_revision_seals (
                revision_id, sealed_at, request_fingerprint
              ) VALUES (
                ?, '2026-09-02T12:30:00.000Z', ?
              )
            `)
              .run(id, tamperedFingerprint),
          /snapshot is incomplete/,
        );
      } finally {
        sqlite.exec("ROLLBACK TO revision_semantic_tamper");
        sqlite.exec("RELEASE revision_semantic_tamper");
      }
    };
    assertFinancialAnchorCannotBeSealed({
      id: "revision-apertura-adulterada",
      fingerprintCharacter: "e",
      openingDelta: 2,
      expensesDelta: 0,
    });
    assertFinancialAnchorCannotBeSealed({
      id: "revision-gastos-adulterada",
      fingerprintCharacter: "f",
      openingDelta: 0,
      expensesDelta: 1,
    });
    await assert.rejects(
      () =>
        pos.module.createCashClosureRevision(
          database,
          closed.closure.id,
          revisionOneInput,
        ),
      (error) => error.status === 409 && error.code === "revision_conflict",
    );

    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO cash_closure_validations (
              closure_id, validated_at, comment, revision_number,
              request_fingerprint
            ) VALUES (?, ?, NULL, 2, NULL)
          `)
          .run(closed.closure.id, "2026-09-02T13:00:00.000Z"),
      /validation revision conflict/,
    );
    await assert.rejects(
      () =>
        pos.module.validateCashClosure(database, closed.closure.id, {
          comment: "Revisado",
        }),
      (error) => error.status === 409 && error.code === "revision_conflict",
    );
    const validated = await pos.module.validateCashClosure(
      database,
      closed.closure.id,
      { comment: "Revisado", expectedRevisionNumber: 2 },
      new Date("2026-09-02T13:00:00.000Z"),
    );
    assert.equal(validated.closure.validationStatus, "validated");
    assert.equal(validated.closure.validation.revisionNumber, 2);

    assert.throws(
      () =>
        sqlite
          .prepare(`
            INSERT INTO cash_closure_revision_sales (
              revision_id, sale_id, created_at, payment_method, total_clp
            ) SELECT revision_id, sale_id, created_at, payment_method, total_clp
              FROM cash_closure_revision_sales WHERE revision_id = ? LIMIT 1
          `)
          .run(revisionOneInput.id),
      /sealed/,
    );
    const linkedSaleItemId = sqlite
      .prepare(`
        SELECT id FROM sale_items WHERE sale_id = 'venta-historica-omitida'
        LIMIT 1
      `)
      .get().id;
    const linkedPaymentId = sqlite
      .prepare(`
        SELECT id FROM sale_payments
        WHERE sale_id = 'venta-historica-omitida' LIMIT 1
      `)
      .get().id;
    for (const operation of [
      () =>
        sqlite
          .prepare(`
            UPDATE sales SET seller = 'Bárbara Vega'
            WHERE id = 'venta-historica-omitida'
          `)
          .run(),
      () =>
        sqlite
          .prepare("DELETE FROM sales WHERE id = 'venta-historica-omitida'")
          .run(),
      () =>
        sqlite
          .prepare(`
            INSERT INTO sale_items (
              sale_id, product_id, product_name, unit_price_clp, quantity,
              line_total_clp
            ) VALUES (
              'venta-historica-omitida', 'revision-historico',
              'Producto histórico', 1, 1, 1
            )
          `)
          .run(),
      () =>
        sqlite
          .prepare("UPDATE sale_items SET product_name = 'Mutado' WHERE id = ?")
          .run(linkedSaleItemId),
      () => sqlite.prepare("DELETE FROM sale_items WHERE id = ?").run(linkedSaleItemId),
      () =>
        sqlite
          .prepare(`
            INSERT INTO sale_payments (
              id, sale_id, created_at, business_date, shift,
              shift_session_id, payment_method, amount_clp, received_by, kind
            ) VALUES (
              'extra:revision', 'venta-historica-omitida',
              '2026-09-01T12:59:00.000Z', '2026-09-01', 'am',
              'sesion-revisable', 'efectivo', 1, 'Matías Muñoz',
              'settlement'
            )
          `)
          .run(),
      () =>
        sqlite
          .prepare("UPDATE sale_payments SET amount_clp = 1 WHERE id = ?")
          .run(linkedPaymentId),
      () =>
        sqlite.prepare("DELETE FROM sale_payments WHERE id = ?").run(linkedPaymentId),
    ]) {
      assert.throws(operation, /revision ledger is immutable/);
    }
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, payment_status, checkout_method, debt_note, total_clp
        ) VALUES (
          'venta-normal-mutable', 'pending', 'pendiente', 'Control normal', 1000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES (
          'venta-normal-mutable', 'revision-ajustable',
          'Producto ajustable', 1000, 1, 1000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, payment_method, amount_clp, kind
        ) VALUES (
          'abono-normal-mutable', 'venta-normal-mutable', 'efectivo', 100,
          'settlement'
        )
      `)
      .run();
    sqlite
      .prepare("UPDATE sales SET seller = 'Bárbara Vega' WHERE id = 'venta-normal-mutable'")
      .run();
    sqlite
      .prepare(`
        UPDATE sale_items SET product_name = 'Producto normal actualizado'
        WHERE sale_id = 'venta-normal-mutable'
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE sale_payments SET amount_clp = 200
        WHERE id = 'abono-normal-mutable'
      `)
      .run();
    sqlite
      .prepare("DELETE FROM sale_payments WHERE id = 'abono-normal-mutable'")
      .run();
    sqlite
      .prepare("DELETE FROM sale_items WHERE sale_id = 'venta-normal-mutable'")
      .run();
    sqlite.prepare("DELETE FROM sales WHERE id = 'venta-normal-mutable'").run();
    assert.throws(
      () =>
        sqlite
          .prepare("UPDATE cash_closure_revisions SET reason = 'mutado' WHERE id = ?")
          .run(revisionTwoInput.id),
      /immutable/,
    );
    await assert.rejects(
      () =>
        pos.module.createCashClosureRevision(database, closed.closure.id, {
          ...revisionTwoInput,
          id: "revision-despues-validacion",
          expectedRevisionNumber: 2,
          countedCardClp: 200,
        }),
      (error) => error.status === 409 && /validado/i.test(error.message),
    );
    assert.ok(adapter.getMaxBatchStatements() < 50);
    assert.ok(adapter.getMaxBindValues() <= 100);
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("corrección y validación compiten con CAS y solo una puede ganar", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    const { database } = sqliteD1Adapter(sqlite);
    const session = await openTestSession(database, {
      id: "sesion-carrera-validacion",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const closed = await pos.module.createCashClosure(
      database,
      exactClosureInput(session, preview, [], {
        id: "cierre-carrera-validacion",
      }),
      new Date("2026-09-01T13:00:00.000Z"),
    );
    const outcomes = await Promise.allSettled([
      pos.module.createCashClosureRevision(
        database,
        closed.closure.id,
        {
          id: "revision-carrera-validacion",
          expectedRevisionNumber: 0,
          reason: "Corregir conciliación en carrera.",
          countedCashClp: 0,
          countedCardClp: 1,
          countedTransferClp: 0,
          addedSales: [],
          inventory: [],
        },
        new Date("2026-09-01T14:00:00.000Z"),
      ),
      pos.module.validateCashClosure(
        database,
        closed.closure.id,
        { comment: "Validación concurrente", expectedRevisionNumber: 0 },
        new Date("2026-09-01T14:00:00.000Z"),
      ),
    ]);
    assert.equal(outcomes.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(outcomes.filter(({ status }) => status === "rejected").length, 1);
    const revisionCount = sqlite
      .prepare(`
        SELECT COUNT(*) AS count FROM cash_closure_revisions
        WHERE closure_id = 'cierre-carrera-validacion'
      `)
      .get().count;
    const validationCount = sqlite
      .prepare(`
        SELECT COUNT(*) AS count FROM cash_closure_validations
        WHERE closure_id = 'cierre-carrera-validacion'
      `)
      .get().count;
    assert.equal(revisionCount + validationCount, 1);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count
          FROM cash_closure_revisions AS revision
          INNER JOIN cash_closure_revision_seals AS seal
            ON seal.revision_id = revision.id
            AND seal.request_fingerprint = revision.request_fingerprint
          WHERE revision.closure_id = 'cierre-carrera-validacion'
        `)
        .get().count,
      revisionCount,
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("un cierre físico posterior bloquea deltas pero no correcciones financieras", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-carrera-fisica",
      name: "Producto carrera física",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 10,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const am = await openTestSession(database, {
      id: "sesion-carrera-fisica-am",
      shift: "am",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    const amPreview = await pos.module.getCashClosurePreview(
      database,
      am.businessDate,
      am.shift,
    );
    const amInventory = await pos.module.listClosingInventory(database);
    const amClosure = await pos.module.createCashClosure(
      database,
      exactClosureInput(am, amPreview, amInventory, {
        id: "cierre-carrera-fisica-am",
      }),
      new Date("2026-09-01T13:00:00.000Z"),
    );
    const pm = await openTestSession(database, {
      id: "sesion-carrera-fisica-pm",
      shift: "pm",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-01T18:00:00.000Z"),
    });
    const stalePmPreview = await pos.module.getCashClosurePreview(
      database,
      pm.businessDate,
      pm.shift,
    );
    const stalePmInventory = await pos.module.listClosingInventory(database);
    const baseContext = await pos.module.getCashClosureRevisionContext(
      database,
      amClosure.closure.id,
    );
    const baseLine = baseContext.effective.inventory.find(
      ({ key }) => key === "product:producto-carrera-fisica:simple",
    );
    assert.ok(baseLine?.adjustable);
    const physicalRevision = {
      id: "revision-carrera-fisica-1",
      expectedRevisionNumber: 0,
      reason: "Corregir conteo antes de la entrega siguiente.",
      countedCashClp: 0,
      countedCardClp: 0,
      countedTransferClp: 0,
      addedSales: [],
      inventory: [
        {
          key: baseLine.key,
          expectedCountedQuantity: baseLine.countedQuantity,
          countedQuantity: 9,
          liveVersionToken: baseLine.currentVersionToken,
          liveQuantity: baseLine.currentQuantity,
        },
      ],
    };
    const raced = await Promise.allSettled([
      pos.module.createCashClosure(
        database,
        exactClosureInput(pm, stalePmPreview, stalePmInventory, {
          id: "cierre-carrera-fisica-pm",
        }),
        new Date("2026-09-01T19:00:00.000Z"),
      ),
      pos.module.createCashClosureRevision(
        database,
        amClosure.closure.id,
        physicalRevision,
        new Date("2026-09-01T19:00:00.000Z"),
      ),
    ]);
    assert.equal(raced.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(raced.filter(({ status }) => status === "rejected").length, 1);
    let pmClosure = (await pos.module.listCashClosures(database, 90)).find(
      ({ id }) => id === "cierre-carrera-fisica-pm",
    );
    if (!pmClosure) {
      const refreshedSession = await pos.module.getActiveShiftSession(database);
      assert.ok(refreshedSession);
      assert.ok(refreshedSession.activityRevision > stalePmPreview.activityRevision);
      const refreshedPreview = await pos.module.getCashClosurePreview(
        database,
        pm.businessDate,
        pm.shift,
      );
      const refreshedInventory = await pos.module.listClosingInventory(database);
      pmClosure = (
        await pos.module.createCashClosure(
          database,
          exactClosureInput(refreshedSession, refreshedPreview, refreshedInventory, {
            id: "cierre-carrera-fisica-pm",
          }),
          new Date("2026-09-01T19:01:00.000Z"),
        )
      ).closure;
    }
    assert.equal(pmClosure.closed, true);
    const afterRace = await pos.module.getCashClosureRevisionContext(
      database,
      amClosure.closure.id,
    );
    const lineAfterRace = afterRace.effective.inventory.find(
      ({ key }) => key === baseLine.key,
    );
    assert.ok(lineAfterRace?.adjustable);
    await assert.rejects(
      () =>
        pos.module.createCashClosureRevision(database, amClosure.closure.id, {
          id: "revision-carrera-fisica-bloqueada",
          expectedRevisionNumber: afterRace.latestRevisionNumber,
          reason: "Intento tardío de modificar inventario.",
          countedCashClp: afterRace.effective.countedCashClp,
          countedCardClp: afterRace.effective.countedCardClp,
          countedTransferClp: afterRace.effective.countedTransferClp,
          addedSales: [],
          inventory: [
            {
              key: lineAfterRace.key,
              expectedCountedQuantity: lineAfterRace.countedQuantity,
              countedQuantity: lineAfterRace.countedQuantity - 1,
              liveVersionToken: lineAfterRace.currentVersionToken,
              liveQuantity: lineAfterRace.currentQuantity,
            },
          ],
        }),
      (error) =>
        error.status === 409 &&
        error.code === "inventory_locked_by_later_closure",
    );
    const financialOnly = await pos.module.createCashClosureRevision(
      database,
      amClosure.closure.id,
      {
        id: "revision-carrera-fisica-financiera",
        expectedRevisionNumber: afterRace.latestRevisionNumber,
        reason: "Corregir solo el conteo financiero.",
        countedCashClp: afterRace.effective.countedCashClp,
        countedCardClp: afterRace.effective.countedCardClp + 1,
        countedTransferClp: afterRace.effective.countedTransferClp,
        addedSales: [],
        inventory: [],
      },
    );
    assert.equal(
      financialOnly.revision.revisionNumber,
      afterRace.latestRevisionNumber + 1,
    );
    const liveStock = sqlite
      .prepare("SELECT stock FROM products WHERE id = 'producto-carrera-fisica'")
      .get().stock;
    const pmCaptured = pmClosure.inventory.find(
      ({ key }) => key === "product:producto-carrera-fisica:simple",
    );
    assert.equal(pmCaptured.expectedQuantity, liveStock);
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("una venta concurrente convierte el CAS físico en conflicto recuperable", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "producto-cas-revision",
      name: "Producto CAS revisión",
      category: "Tienda",
      priceClp: 1000,
      stockMode: "simple",
      stock: 10,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const am = await openTestSession(database, {
      id: "sesion-cas-revision-am",
      shift: "am",
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    const amPreview = await pos.module.getCashClosurePreview(
      database,
      am.businessDate,
      am.shift,
    );
    const amInventory = await pos.module.listClosingInventory(database);
    const closure = await pos.module.createCashClosure(
      database,
      exactClosureInput(am, amPreview, amInventory, {
        id: "cierre-cas-revision-am",
      }),
      new Date("2026-09-01T13:00:00.000Z"),
    );
    const pm = await openTestSession(database, {
      id: "sesion-cas-revision-pm",
      shift: "pm",
      responsible: "Bárbara Vega",
      now: new Date("2026-09-01T18:00:00.000Z"),
    });
    const context = await pos.module.getCashClosureRevisionContext(
      database,
      closure.closure.id,
    );
    const line = context.effective.inventory.find(
      ({ key }) => key === "product:producto-cas-revision:simple",
    );
    assert.ok(line?.adjustable);
    const revisionInput = {
      id: "revision-cas-concurrente",
      expectedRevisionNumber: 0,
      reason: "Corregir conteo mientras se registra una venta.",
      countedCashClp: 0,
      countedCardClp: 0,
      countedTransferClp: 0,
      addedSales: [],
      inventory: [
        {
          key: line.key,
          expectedCountedQuantity: line.countedQuantity,
          countedQuantity: 9,
          liveVersionToken: line.currentVersionToken,
          liveQuantity: line.currentQuantity,
        },
      ],
    };
    const saleInput = {
      id: "venta-cas-concurrente",
      sessionId: pm.id,
      paymentMethod: "efectivo",
      debtNote: null,
      debtorCollaborator: null,
      seller: "Bárbara Vega",
      shift: "pm",
      items: [
        {
          productId: "producto-cas-revision",
          unitPriceClp: 1000,
          quantity: 1,
        },
      ],
    };
    const raced = await Promise.allSettled([
      pos.module.createCashClosureRevision(
        database,
        closure.closure.id,
        revisionInput,
        new Date("2026-09-01T18:30:00.000Z"),
      ),
      pos.module.createSale(
        database,
        saleInput,
        new Date("2026-09-01T18:30:00.000Z"),
      ),
    ]);
    assert.equal(raced.filter(({ status }) => status === "fulfilled").length, 1);
    assert.equal(raced.filter(({ status }) => status === "rejected").length, 1);
    const loser = raced.find(({ status }) => status === "rejected");
    assert.equal(loser.reason.status, 409);
    const revisionCount = sqlite
      .prepare(`
        SELECT COUNT(*) AS count FROM cash_closure_revisions
        WHERE id = 'revision-cas-concurrente'
      `)
      .get().count;
    const saleCount = sqlite
      .prepare(`
        SELECT COUNT(*) AS count FROM sales WHERE id = 'venta-cas-concurrente'
      `)
      .get().count;
    assert.equal(revisionCount + saleCount, 1);
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM cash_closure_revision_inventory
          WHERE revision_id = 'revision-cas-concurrente'
        `)
        .get().count > 0,
      revisionCount === 1,
    );
    assert.equal(
      sqlite
        .prepare("SELECT stock FROM products WHERE id = 'producto-cas-revision'")
        .get().stock,
      9,
    );

    if (revisionCount === 0) {
      assert.equal(loser.reason.code, "inventory_conflict");
      const refreshed = await pos.module.getCashClosureRevisionContext(
        database,
        closure.closure.id,
      );
      const refreshedLine = refreshed.effective.inventory.find(
        ({ key }) => key === line.key,
      );
      await pos.module.createCashClosureRevision(
        database,
        closure.closure.id,
        {
          ...revisionInput,
          inventory: [
            {
              key: refreshedLine.key,
              expectedCountedQuantity: refreshedLine.countedQuantity,
              countedQuantity: 9,
              liveVersionToken: refreshedLine.currentVersionToken,
              liveQuantity: refreshedLine.currentQuantity,
            },
          ],
        },
        new Date("2026-09-01T18:31:00.000Z"),
      );
    } else {
      await pos.module.createSale(
        database,
        saleInput,
        new Date("2026-09-01T18:31:00.000Z"),
      );
    }
    assert.equal(
      sqlite
        .prepare("SELECT stock FROM products WHERE id = 'producto-cas-revision'")
        .get().stock,
      8,
    );
    assert.equal(
      sqlite
        .prepare(`
          SELECT COUNT(*) AS count FROM cash_closure_revision_seals
          WHERE revision_id = 'revision-cas-concurrente'
        `)
        .get().count,
      1,
    );
    assert.equal(
      sqlite
        .prepare("SELECT COUNT(*) AS count FROM sales WHERE id = 'venta-cas-concurrente'")
        .get().count,
      1,
    );
    assert.equal(sqlite.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    sqlite.close();
  }
});

test("una pestaña v1 aún puede cerrar y su conteo legacy de bodega se descarta", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    seedPosProduct(sqlite, {
      id: "split-pestana-v1",
      name: "Producto dividido legacy",
      category: "Tienda",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 3,
      stockBodega: 7,
    });
    const { database } = sqliteD1Adapter(sqlite);
    const now = new Date("2026-09-01T12:00:00.000Z");
    const session = await openTestSession(database, {
      id: "sesion-pestana-v1",
      openingCashClp: 0,
      now,
    });
    const preview = await pos.module.getCashClosurePreview(
      database,
      session.businessDate,
      session.shift,
    );
    const inventory = await pos.module.listClosingInventory(database);
    const versionToken = sqlite
      .prepare("SELECT updated_at FROM products WHERE id = 'split-pestana-v1'")
      .get().updated_at;
    const input = shared.module.validateCashClosurePayload({
      id: "cierre-pestana-v1",
      sessionId: session.id,
      expectedActivityRevision: preview.activityRevision,
      countedCashClp: 0,
      countedCardClp: 0,
      countedTransferClp: 0,
      financialDifferenceReason: null,
      checklistVersion: 1,
      checklist: {
        cashReconciled: true,
        cardReconciled: true,
        transferReconciled: true,
        pendingCustomerReviewed: true,
        collaboratorReviewed: true,
        inventoryCountConfirmed: true,
      },
      inventory: [
        ...exactInventoryCount(inventory),
        {
          key: "product:split-pestana-v1:bodega",
          versionToken,
          expectedQuantity: 7,
          countedQuantity: 6,
          reason: "Conteo realizado en la pestaña anterior",
        },
      ],
      notes: "Entrega enviada desde UI v1",
    });
    assert.equal(input.inventory.some(({ key }) => key.endsWith(":bodega")), false);
    const closed = await pos.module.createCashClosure(database, input, now);
    assert.equal(closed.closure.closureContractVersion, 2);
    assert.equal(closed.closure.checklist, null);
    assert.equal(closed.closure.checklistVersion, null);
    assert.equal(closed.closure.handoffComments, "Entrega enviada desde UI v1");
    assert.deepEqual(closed.closure.expenses, []);
    assert.equal(closed.closure.inventory.some(({ location }) => location === "bodega"), false);
    assert.equal(
      sqlite
        .prepare("SELECT stock_bodega FROM products WHERE id = 'split-pestana-v1'")
        .get().stock_bodega,
      7,
    );
  } finally {
    sqlite.close();
  }
});

test("el historial prioriza toda validación pendiente aunque sea anterior al límite cronológico", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const insertSession = sqlite.prepare(`
      INSERT INTO shift_sessions (
        id, business_date, shift, responsible, opening_cash_clp,
        activity_revision, status, active_slot, opened_at, closed_at, closure_id
      ) VALUES (?, ?, 'am', 'Matías Muñoz', 0, 0, 'closed', NULL, ?, ?, ?)
    `);
    const insertClosure = sqlite.prepare(`
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
        cash_reconciled, card_reconciled, transfer_reconciled,
        pending_customer_reviewed, collaborator_reviewed,
        inventory_count_confirmed, checklist_version, unassigned_sales_clp,
        unassigned_sales_count, unassigned_payments_clp,
        unassigned_payments_count, notes
      ) VALUES (
        ?, ?, 0, ?, ?, 'am', 'Matías Muñoz', ?,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, NULL, 2, 0, 0, 0, 0, NULL, NULL,
        1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, NULL
      )
    `);
    const insertValidation = sqlite.prepare(`
      INSERT INTO cash_closure_validations (closure_id, validated_at, comment)
      VALUES (?, ?, NULL)
    `);
    for (let index = 0; index <= 30; index += 1) {
      const day = new Date(Date.UTC(2026, 5, 1 + index));
      const businessDate = day.toISOString().slice(0, 10);
      const createdAt = `${businessDate}T12:00:00.000Z`;
      const sessionId = `sesion-orden-${index}`;
      const closureId = `cierre-orden-${index}`;
      insertSession.run(
        sessionId,
        businessDate,
        `${businessDate}T11:00:00.000Z`,
        createdAt,
        closureId,
      );
      insertClosure.run(
        closureId,
        sessionId,
        String(index).padStart(64, "0"),
        businessDate,
        createdAt,
      );
      if (index > 0) {
        insertValidation.run(closureId, `${businessDate}T13:00:00.000Z`);
      }
    }
    const { database } = sqliteD1Adapter(sqlite);
    const closures = await pos.module.listCashClosures(database, 30);
    assert.equal(closures.length, 30);
    assert.equal(closures[0].id, "cierre-orden-0");
    assert.equal(closures[0].validationStatus, "pending");
    assert.equal(closures[1].id, "cierre-orden-30");
    assert.equal(closures[1].validationStatus, "validated");
    assert.equal(closures.some(({ id }) => id === "cierre-orden-1"), false);

    for (let index = 0; index < 31; index += 1) {
      const day = new Date(Date.UTC(2027, 0, 1 + index));
      const businessDate = day.toISOString().slice(0, 10);
      const createdAt = `${businessDate}T12:00:00.000Z`;
      const sessionId = `sesion-pendiente-paginada-${index}`;
      const closureId = `cierre-pendiente-paginada-${index}`;
      insertSession.run(
        sessionId,
        businessDate,
        `${businessDate}T11:00:00.000Z`,
        createdAt,
        closureId,
      );
      insertClosure.run(
        closureId,
        sessionId,
        `b${String(index).padStart(63, "0")}`,
        businessDate,
        createdAt,
      );
    }
    const reachedPending = [];
    let pendingCursor = null;
    let pageNumber = 0;
    do {
      const page = await pos.module.listCashClosurePage(database, {
        pendingLimit: 10,
        pendingCursor,
        historyLimit: 5,
      });
      const pending = page.closures.filter(
        ({ validationStatus }) => validationStatus === "pending",
      );
      if (pageNumber === 0) {
        assert.equal(page.closures.length, 15);
      } else {
        assert.ok(
          page.closures.every(
            ({ validationStatus }) => validationStatus === "pending",
          ),
        );
      }
      reachedPending.push(...pending.map(({ id }) => id));
      assert.equal(page.pendingHasMore, page.pendingNextCursor !== null);
      pendingCursor = page.pendingNextCursor;
      pageNumber += 1;
    } while (pendingCursor !== null);
    assert.equal(pageNumber, 4);
    assert.equal(reachedPending.length, 32);
    assert.equal(new Set(reachedPending).size, 32);
    assert.ok(reachedPending.includes("cierre-orden-0"));
    assert.ok(reachedPending.includes("cierre-pendiente-paginada-0"));
    assert.ok(reachedPending.includes("cierre-pendiente-paginada-30"));
    await assert.rejects(
      () =>
        pos.module.listCashClosurePage(database, {
          pendingCursor: "cursor-no-valido!",
        }),
      (error) => error.status === 400,
    );
  } finally {
    sqlite.close();
  }
});

test("los validadores aceptan solo el contrato de venta permitido", () => {
  const sale = shared.module.validateSalePayload({
    id: "venta-001",
    sessionId: "sesion-validacion",
    paymentMethod: "debito",
    seller: "Matías Muñoz",
    shift: "am",
    items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 2 }],
  });

  assert.deepEqual(sale, {
    id: "venta-001",
    sessionId: "sesion-validacion",
    paymentMethod: "tarjeta",
    debtNote: null,
    debtorCollaborator: null,
    seller: "Matías Muñoz",
    shift: "am",
    items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 2 }],
  });
  for (const [id, paymentMethod] of [
    ["venta-credito", "credito"],
    ["venta-tarjeta", "tarjeta"],
  ]) {
    assert.equal(
      shared.module.validateSalePayload({
        id,
        sessionId: "sesion-validacion",
        paymentMethod,
        seller: "Andrés Lagos",
        shift: "pm",
        items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
      }).paymentMethod,
      "tarjeta",
    );
  }
  assert.throws(
    () =>
      shared.module.validateSalePayload({
        id: "venta-002",
        sessionId: "sesion-validacion",
        paymentMethod: "cheque",
        seller: "Andrés Lagos",
        shift: "am",
        items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
      }),
    /medio de pago/i,
  );
  assert.throws(
    () =>
      shared.module.validateSalePayload({
        id: "venta-003",
        sessionId: "sesion-validacion",
        paymentMethod: "efectivo",
        seller: "Andrés Lagos",
        shift: "am",
        items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 100 }],
      }),
    /entre 1 y 99/i,
  );
  assert.throws(
    () =>
      shared.module.validateSalePayload({
        id: "venta-004",
        sessionId: "sesion-validacion",
        paymentMethod: "efectivo",
        seller: "Andrés Lagos",
        shift: "am",
        items: [
          {
            productId: "cafe-latte",
            unitPriceClp: 3200,
            quantity: 1,
            priceClp: 1,
          },
        ],
      }),
    /no está permitido/i,
  );
  assert.deepEqual(
    shared.module.validateSalePayload({
      id: "venta-pendiente",
      sessionId: "sesion-validacion",
      paymentMethod: "pendiente",
      debtNote: "  Cliente gimnasio  ",
      seller: "Bárbara Vega",
      shift: "pm",
      items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
    }),
    {
      id: "venta-pendiente",
      sessionId: "sesion-validacion",
      paymentMethod: "pendiente",
      debtNote: "Cliente gimnasio",
      debtorCollaborator: null,
      seller: "Bárbara Vega",
      shift: "pm",
      items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
    },
  );
  assert.throws(
    () =>
      shared.module.validateSalePayload({
        id: "venta-sin-nota",
        sessionId: "sesion-validacion",
        paymentMethod: "pendiente",
        seller: "Bárbara Vega",
        shift: "pm",
        items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
      }),
    /nota de la deuda/i,
  );
  assert.deepEqual(
    shared.module.validateSalePayload({
      id: "venta-colaborador",
      sessionId: "sesion-validacion",
      paymentMethod: "colaborador",
      debtorCollaborator: "Eva Soto",
      debtNote: "  Se descuenta a fin de mes  ",
      seller: "Hernán Silva",
      shift: "am",
      items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
    }),
    {
      id: "venta-colaborador",
      sessionId: "sesion-validacion",
      paymentMethod: "colaborador",
      debtNote: "Se descuenta a fin de mes",
      debtorCollaborator: "Eva Soto",
      seller: "Hernán Silva",
      shift: "am",
      items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
    },
  );
  assert.throws(
    () =>
      shared.module.validateSalePayload({
        id: "venta-vendedor-invalido",
        sessionId: "sesion-validacion",
        paymentMethod: "efectivo",
        seller: "Matias Munoz",
        shift: "am",
        items: [{ productId: "cafe-latte", unitPriceClp: 3200, quantity: 1 }],
      }),
    /colaboradores autorizados/i,
  );
  assert.deepEqual(
    shared.module.validateSettlementPayload({
      id: "550e8400-e29b-41d4-a716-446655440001",
      sessionId: "sesion-validacion",
      paymentMethod: "tarjeta",
      amountClp: 1200,
    }),
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      sessionId: "sesion-validacion",
      paymentMethod: "tarjeta",
      amountClp: 1200,
      shift: null,
      responsible: null,
    },
  );
  assert.deepEqual(
    shared.module.validateSettlementPayload({
      id: "cierre-001",
      sessionId: "sesion-validacion",
      paymentMethod: "efectivo",
      shift: "pm",
      responsible: "Bárbara Vega",
    }),
    {
      id: "cierre-001",
      sessionId: "sesion-validacion",
      paymentMethod: "efectivo",
      amountClp: null,
      shift: "pm",
      responsible: "Bárbara Vega",
    },
  );
  assert.equal(
    shared.module.validateSettlementPayload({
      id: "settlement:foo",
      sessionId: "sesion-validacion",
      paymentMethod: "transferencia",
      amountClp: 500,
    }).id,
    "settlement:foo",
  );
  for (const [id, paymentMethod] of [
    ["550e8400-e29b-41d4-a716-446655440002", "debito"],
    ["550e8400-e29b-41d4-a716-446655440003", "credito"],
  ]) {
    assert.deepEqual(
      shared.module.validateSettlementPayload({
        id,
        sessionId: "sesion-validacion",
        paymentMethod,
        shift: "am",
        responsible: "Eva Soto",
      }),
      {
        id,
        sessionId: "sesion-validacion",
        paymentMethod: "tarjeta",
        amountClp: null,
        shift: "am",
        responsible: "Eva Soto",
      },
    );
  }
  assert.throws(
    () =>
      shared.module.validateSettlementPayload({
        id: "550e8400-e29b-41d4-a716-446655440004",
        sessionId: "sesion-validacion",
        paymentMethod: "cheque",
        amountClp: 1000,
      }),
    /medio de pago/i,
  );
  assert.throws(
    () =>
      shared.module.validateSettlementPayload({
        id: "550e8400-e29b-41d4-a716-446655440005",
        sessionId: "sesion-validacion",
        paymentMethod: "efectivo",
        amountClp: null,
      }),
    /monto del abono/i,
  );

  assert.deepEqual(
    shared.module.validateTransferValidationPayload({
      id: "f3333333-3333-4333-8333-333333333333",
      sessionId: "sesion-validacion",
      emailReference: "  Recibiste un pago · operación MP 987654  ",
    }),
    {
      id: "f3333333-3333-4333-8333-333333333333",
      sessionId: "sesion-validacion",
      emailReference: "Recibiste un pago · operación MP 987654",
    },
  );
  assert.throws(
    () =>
      shared.module.validateTransferValidationPayload({
        id: "validacion-no-uuid",
        sessionId: "sesion-validacion",
        emailReference: "Recibiste un pago",
      }),
    /UUID válido/i,
  );
  assert.throws(
    () =>
      shared.module.validateTransferValidationPayload({
        id: "f4444444-4444-4444-8444-444444444444",
        sessionId: "sesion-validacion",
        emailReference: "   ",
      }),
    /referencia del correo/i,
  );

  assert.deepEqual(
    shared.module.validateSaleVoidPayload({
      id: "550e8400-e29b-41d4-a716-446655440010",
      sessionId: "sesion-validacion",
      expectedActivityRevision: 3,
      reason: "  Venta duplicada  ",
    }),
    {
      id: "550e8400-e29b-41d4-a716-446655440010",
      sessionId: "sesion-validacion",
      expectedActivityRevision: 3,
      reason: "Venta duplicada",
    },
  );
  for (const [payload, message] of [
    [
      {
        id: "anulacion-no-uuid",
        sessionId: "sesion-validacion",
        expectedActivityRevision: 3,
        reason: "Venta duplicada",
      },
      /UUID válido/i,
    ],
    [
      {
        id: "550e8400-e29b-41d4-a716-446655440011",
        sessionId: "sesion-validacion",
        expectedActivityRevision: -1,
        reason: "Venta duplicada",
      },
      /entero no negativo/i,
    ],
    [
      {
        id: "550e8400-e29b-41d4-a716-446655440012",
        sessionId: "sesion-validacion",
        expectedActivityRevision: 3,
        reason: "   ",
      },
      /motivo/i,
    ],
    [
      {
        id: "550e8400-e29b-41d4-a716-446655440013",
        sessionId: "sesion-validacion",
        expectedActivityRevision: 3,
        reason: "Venta duplicada",
        role: "admin",
      },
      /no está permitido/i,
    ],
  ]) {
    assert.throws(
      () => shared.module.validateSaleVoidPayload(payload),
      message,
    );
  }
});

test("el contrato público de cierre v2 elimina el checklist y acepta temporalmente pestañas legacy", () => {
  const base = {
    id: "cierre-validacion-v2",
    sessionId: "sesion-validacion-v2",
    expectedActivityRevision: 3,
    countedCashClp: 800,
    countedCardClp: 200,
    countedTransferClp: 100,
    financialDifferenceReason: "  Diferencia explicada  ",
    inventory: [],
  };
  assert.deepEqual(
    shared.module.validateCashClosurePayload({
      ...base,
      expenses: [
        {
          id: "gasto-001",
          description: "  Compra de leche  ",
          amountClp: 200,
        },
      ],
      handoffComments: "  Entrega revisada  ",
    }),
    {
      ...base,
      financialDifferenceReason: "Diferencia explicada",
      expenses: [
        {
          id: "gasto-001",
          description: "Compra de leche",
          amountClp: 200,
        },
      ],
      handoffComments: "Entrega revisada",
    },
  );

  const categorized = shared.module.validateCashClosurePayload({
    ...base,
    id: "cierre-validacion-categorizado",
    expenses: [],
    handoffComments: null,
    inventory: [
      {
        key: "product:barra:simple",
        versionToken: "version-1",
        expectedQuantity: 8,
        countedQuantity: 7,
        reasonCategory: "merma",
        comment: "  Envase abierto durante el turno  ",
      },
    ],
  });
  assert.deepEqual(categorized.inventory, [
    {
      key: "product:barra:simple",
      versionToken: "version-1",
      expectedQuantity: 8,
      countedQuantity: 7,
      reasonCategory: "merma",
      comment: "Envase abierto durante el turno",
    },
  ]);

  const legacyDifference = shared.module.validateCashClosurePayload({
    ...base,
    id: "cierre-validacion-legacy-reason",
    expenses: [],
    handoffComments: null,
    inventory: [
      {
        key: "product:barra:simple",
        versionToken: "version-1",
        expectedQuantity: 8,
        countedQuantity: 7,
        reason: "  Motivo escrito desde una pestaña antigua  ",
      },
    ],
  });
  assert.equal(legacyDifference.inventory[0].reasonCategory, "otro");
  assert.equal(
    legacyDifference.inventory[0].comment,
    "Motivo escrito desde una pestaña antigua",
  );

  for (const inventory of [
    [
      {
        key: "product:barra:simple",
        versionToken: "version-1",
        expectedQuantity: 8,
        countedQuantity: 7,
        reasonCategory: "merma",
        comment: null,
      },
    ],
    [
      {
        key: "product:barra:simple",
        versionToken: "version-1",
        expectedQuantity: 8,
        countedQuantity: 7,
        reasonCategory: "categoria-inventada",
        comment: "No debe aceptarse",
      },
    ],
    [
      {
        key: "product:barra:simple",
        versionToken: "version-1",
        expectedQuantity: 8,
        countedQuantity: 8,
        reasonCategory: "error_conteo",
        comment: "No existe diferencia",
      },
    ],
  ]) {
    assert.throws(
      () =>
        shared.module.validateCashClosurePayload({
          ...base,
          expenses: [],
          handoffComments: null,
          inventory,
        }),
      /categor|comentar|diferencia/i,
    );
  }

  const legacyChecklist = {
    cashReconciled: true,
    cardReconciled: true,
    transferReconciled: true,
    pendingCustomerReviewed: true,
    collaboratorReviewed: true,
    inventoryCountConfirmed: true,
  };
  const legacy = shared.module.validateCashClosurePayload({
    ...base,
    id: "cierre-pestana-antigua",
    checklistVersion: 1,
    checklist: legacyChecklist,
    inventory: [
      {
        key: "product:producto-dividido:bodega",
        versionToken: "version-legacy",
        expectedQuantity: 7,
        countedQuantity: 6,
        reason: "Conteo legacy de bodega",
      },
    ],
    notes: "  Nota de pestaña anterior  ",
  });
  assert.deepEqual(legacy.expenses, []);
  assert.deepEqual(legacy.inventory, []);
  assert.equal(legacy.handoffComments, "Nota de pestaña anterior");
  assert.equal("checklist" in legacy, false);
  assert.equal("checklistVersion" in legacy, false);

  assert.throws(
    () =>
      shared.module.validateCashClosurePayload({
        ...base,
        expenses: [],
        handoffComments: null,
        checklistVersion: 1,
        checklist: legacyChecklist,
      }),
    /mezclar contratos/i,
  );
  assert.throws(
    () =>
      shared.module.validateCashClosurePayload({
        ...base,
        checklistVersion: 1,
        checklist: { ...legacyChecklist, cashReconciled: false },
        notes: null,
      }),
    /confirmar toda la lista/i,
  );
  assert.throws(
    () =>
      shared.module.validateCashClosurePayload({
        ...base,
        handoffComments: null,
      }),
    /gastos de caja chica/i,
  );
  assert.throws(
    () =>
      shared.module.validateCashClosurePayload({
        ...base,
        expenses: [],
        handoffComments: "x".repeat(1001),
      }),
    /comentarios de entrega/i,
  );
  assert.deepEqual(
    shared.module.validateCashClosureValidationPayload({
      comment: "  Todo revisado  ",
    }),
    { comment: "Todo revisado", expectedRevisionNumber: null },
  );
  assert.deepEqual(
    shared.module.validateCashClosureValidationPayload({ comment: null }),
    { comment: null, expectedRevisionNumber: null },
  );
});

test("los contratos administrativos de incidencias validan filtros, CAS y acciones", () => {
  assert.deepEqual(
    incidentValidation.module.validateIncidentFilters(
      new URL(
        "https://example.test/api/closure-incidents?status=pending_clarification&level=red&from=2026-09-01&to=2026-09-11&responsible=%20B%C3%A1rbara%20&product=%20barra%20&limit=25",
      ),
    ),
    {
      status: "pending_clarification",
      level: "red",
      from: "2026-09-01",
      to: "2026-09-11",
      responsible: "Bárbara",
      product: "barra",
      limit: 25,
    },
  );
  for (const query of [
    "status=desconocido",
    "level=green",
    "from=2026-09-11&to=2026-09-01",
    "limit=0",
    "limit=101",
    "limit=uno",
  ]) {
    assert.throws(
      () =>
        incidentValidation.module.validateIncidentFilters(
          new URL(`https://example.test/api/closure-incidents?${query}`),
        ),
      (error) => error.status === 400,
      query,
    );
  }

  assert.deepEqual(
    incidentValidation.module.validateIncidentSettingsPayload({
      moneyRedThresholdClp: 5000,
      multipleProductRedCount: 2,
      highValueProductClp: 10000,
      recurrenceWindowDays: 30,
      recurrenceRedCount: 2,
      reminderHours: 24,
      expectedUpdatedAt: "2026-09-11T12:00:00.000Z",
    }),
    {
      moneyRedThresholdClp: 5000,
      multipleProductRedCount: 2,
      highValueProductClp: 10000,
      recurrenceWindowDays: 30,
      recurrenceRedCount: 2,
      reminderHours: 24,
      expectedUpdatedAt: "2026-09-11T12:00:00.000Z",
    },
  );
  assert.throws(
    () =>
      incidentValidation.module.validateIncidentSettingsPayload({
        moneyRedThresholdClp: 5000,
        multipleProductRedCount: 2,
        highValueProductClp: 10000,
        recurrenceWindowDays: 30,
        recurrenceRedCount: 2,
        reminderHours: 24,
        expectedUpdatedAt: "2026-09-11T12:00:00.000Z",
        accessToken: "no permitido",
      }),
    /no está permitido/i,
  );
  assert.deepEqual(
    incidentValidation.module.validateIncidentEventPayload({
      id: "evento:aclaracion:001",
      action: "clarified",
      expectedStatus: "pending_clarification",
      comment: "  Conteo revisado con el responsable.  ",
    }),
    {
      id: "evento:aclaracion:001",
      action: "clarified",
      expectedStatus: "pending_clarification",
      comment: "Conteo revisado con el responsable.",
    },
  );
  assert.deepEqual(
    incidentValidation.module.validateRetryPayload({
      eventId: "retry:whatsapp:001",
    }),
    { eventId: "retry:whatsapp:001" },
  );
  for (const reservedId of [
    "created:incidencia-ajena",
    "correction:revision-ajena",
    "validated:cierre-ajeno",
    "SYSTEM:operacion-interna",
  ]) {
    assert.throws(
      () =>
        incidentValidation.module.validateIncidentEventPayload({
          id: reservedId,
          action: "comment_added",
          expectedStatus: "pending_clarification",
          comment: "Intento de reservar un id interno.",
        }),
      (error) => error.status === 400 && /prefijo reservado/i.test(error.message),
      reservedId,
    );
    assert.throws(
      () =>
        incidentValidation.module.validateRetryPayload({ eventId: reservedId }),
      (error) => error.status === 400 && /prefijo reservado/i.test(error.message),
      reservedId,
    );
  }
  for (const payload of [
    {
      id: "evento-1",
      action: "validated",
      expectedStatus: "clarified",
      comment: "No puede validarse desde la ruta genérica.",
    },
    {
      id: "evento-2",
      action: "clarified",
      expectedStatus: "desconocido",
      comment: "Estado inválido.",
    },
  ]) {
    assert.throws(
      () => incidentValidation.module.validateIncidentEventPayload(payload),
      (error) => error.status === 400,
    );
  }
});

test("los validadores de producto normalizan campos y rechazan precios inválidos", () => {
  const product = shared.module.validateCreateProduct({
    id: "producto-001",
    sku: "  SKU-01  ",
    name: "  Café filtrado  ",
    category: "  Cafés  ",
    priceClp: 2990,
    stock: null,
    needsPriceReview: false,
  });

  assert.deepEqual(product, {
    id: "producto-001",
    sku: "SKU-01",
    name: "Café filtrado",
    category: "Cafés",
    priceClp: 2990,
    stockMode: "untracked",
    stock: null,
    stockVitrina: null,
    stockBodega: null,
    active: true,
    needsPriceReview: false,
  });
  assert.deepEqual(
    shared.module.validatePatchProduct({
      active: false,
      expectedUpdatedAt: "2026-08-31T12:00:00.000Z",
    }),
    {
      active: false,
      expectedUpdatedAt: "2026-08-31T12:00:00.000Z",
    },
  );
  assert.throws(
    () =>
      shared.module.validateCreateProduct({
        name: "Café",
        category: "Cafés",
        priceClp: 0,
      }),
    /mayor que cero/i,
  );
  assert.throws(
    () =>
      shared.module.validatePatchProduct({
        expectedUpdatedAt: "2026-08-31T12:00:00.000Z",
      }),
    /al menos un cambio/i,
  );
  assert.deepEqual(
    shared.module.validateCreateProduct({
      name: "Pre entreno",
      category: "Scoops",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 2,
      stockBodega: 5,
    }).stockMode,
    "split",
  );
  assert.deepEqual(
    shared.module.validateCreateProduct({
      id: "producto-cafe",
      name: "Café",
      category: "Cafés",
      priceClp: 2000,
      stockMode: "split",
      stockVitrina: 2,
      stockBodega: 5,
    }),
    {
      id: "producto-cafe",
      sku: null,
      name: "Café",
      category: "Cafés",
      priceClp: 2000,
      stockMode: "split",
      stock: null,
      stockVitrina: 2,
      stockBodega: 5,
      active: true,
      needsPriceReview: true,
    },
  );
  assert.deepEqual(
    shared.module.validateIngredientStockPayload({ stock: 8, expectedRevision: 2 }),
    { stock: 8, expectedRevision: 2 },
  );
});

test("el día de Santiago usa límites UTC correctos, incluso con DST", () => {
  assert.deepEqual(
    pos.module.getSantiagoDayBounds(new Date("2026-08-27T15:00:00.000Z")),
    {
      startIso: "2026-08-27T04:00:00.000Z",
      endIso: "2026-08-28T04:00:00.000Z",
    },
  );
  assert.deepEqual(
    pos.module.getSantiagoDayBounds(new Date("2026-04-04T12:00:00.000Z")),
    {
      startIso: "2026-04-04T03:00:00.000Z",
      endIso: "2026-04-05T04:00:00.000Z",
    },
  );
  assert.deepEqual(
    pos.module.getSantiagoDayBounds(new Date("2026-09-05T12:00:00.000Z")),
    {
      startIso: "2026-09-05T04:00:00.000Z",
      endIso: "2026-09-06T04:00:00.000Z",
    },
  );
  assert.deepEqual(
    pos.module.getSantiagoDayBounds(new Date("2026-09-06T12:00:00.000Z")),
    {
      startIso: "2026-09-06T04:00:00.000Z",
      endIso: "2026-09-07T03:00:00.000Z",
    },
  );
});

test("el contrato público usa camelCase y filtra ventas recientes del día", async () => {
  const queries = [];
  const database = {
    prepare(query) {
      queries.push(query);
      const statement = {
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async first() {
          if (query.includes("AS outstanding_clp")) {
            return {
              total_clp: 5000,
              sales_count: 2,
              units: 3,
              collected_clp: 3200,
              outstanding_clp: 1800,
            };
          }
          return null;
        },
        async all() {
          if (query.includes("FROM sale_payments")) {
            return {
              results: [
                {
                  id: "direct:venta-001",
                  sale_id: "venta-001",
                  created_at: "2026-08-27T14:00:00.000Z",
                  business_date: "2026-08-27",
                  shift: "am",
                  shift_session_id: "sesion-001",
                  payment_method: "credito",
                  amount_clp: 3200,
                  received_by: "Matías Muñoz",
                  kind: "direct",
                  payment_count: 1,
                  paid_clp: 3200,
                },
              ],
            };
          }
          if (query.includes("FROM products")) {
            return {
              results: [
                {
                  id: "cafe-latte",
                  sku: null,
                  name: "Latte",
                  category: "Cafés",
                  price_clp: 3200,
                  stock_mode: "untracked",
                  stock: null,
                  stock_vitrina: null,
                  stock_bodega: null,
                  available_stock: null,
                  stock_group: null,
                  active: 1,
                  needs_price_review: 1,
                  updated_at: "2026-08-27T13:00:00.000Z",
                },
              ],
            };
          }
          if (query.includes("FROM sales")) {
            return {
              results: [
                {
                  id: "venta-001",
                  created_at: "2026-08-27T14:00:00.000Z",
                  business_date: "2026-08-27",
                  shift: "am",
                  payment_status: "paid",
                  checkout_method: "efectivo",
                  payment_method: "efectivo",
                  debt_note: null,
                  debtor_collaborator: null,
                  paid_at: "2026-08-27T14:00:00.000Z",
                  settlement_id: null,
                  seller: null,
                  total_clp: 3200,
                },
              ],
            };
          }
          if (query.includes("FROM sale_items")) {
            return {
              results: [
                {
                  sale_id: "venta-001",
                  product_id: "cafe-latte",
                  product_name: "Latte",
                  unit_price_clp: 3200,
                  quantity: 1,
                  line_total_clp: 3200,
                },
              ],
            };
          }
          return { results: [] };
        },
      };
      return statement;
    },
  };

  const [products, summary, sales] = await Promise.all([
    pos.module.listProducts(database, { activeOnly: true }),
    pos.module.getDailySummary(
      database,
      new Date("2026-08-27T15:00:00.000Z"),
    ),
    pos.module.getRecentSales(
      database,
      10,
      new Date("2026-08-27T15:00:00.000Z"),
    ),
  ]);

  assert.deepEqual(Object.keys(products[0]), [
    "id",
    "sku",
    "name",
    "category",
    "priceClp",
    "stockMode",
    "stock",
    "stockVitrina",
    "stockBodega",
    "availableStock",
    "stockGroup",
    "active",
    "needsPriceReview",
    "updatedAt",
  ]);
  assert.deepEqual(summary, {
    totalClp: 5000,
    salesCount: 2,
    averageClp: 2500,
    units: 3,
    collectedClp: 3200,
    outstandingClp: 1800,
  });
  assert.deepEqual(Object.keys(sales[0]), [
    "id",
    "createdAt",
    "businessDate",
    "shift",
    "sessionId",
    "paymentMethod",
    "settledPaymentMethod",
    "paymentStatus",
    "debtNote",
    "debtorCollaborator",
    "paidAt",
    "seller",
    "totalClp",
    "paidClp",
    "balanceClp",
    "paymentCount",
    "paymentsHasMore",
    "payments",
    "items",
  ]);
  assert.deepEqual(Object.keys(sales[0].payments[0]), [
    "id",
    "createdAt",
    "businessDate",
    "shift",
    "sessionId",
    "paymentMethod",
    "amountClp",
    "receivedBy",
    "kind",
  ]);
  assert.equal(sales[0].payments[0].paymentMethod, "tarjeta");
  assert.deepEqual(Object.keys(sales[0].items[0]), [
    "productId",
    "productName",
    "unitPriceClp",
    "quantity",
    "lineTotalClp",
  ]);
  assert.ok(
    queries.some(
      (query) =>
        query.includes("FROM sales") &&
        query.includes("created_at >= ? AND created_at < ?") &&
        query.includes("LIMIT ?"),
    ),
  );
});

async function createSalesHistoryFixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  await applyGeneratedMigrations(sqlite);
  const timestamp = "2026-08-30T12:00:00.000Z";
  sqlite
    .prepare(`
      INSERT INTO products (
        id, sku, name, category, price_clp, stock_mode, stock,
        stock_vitrina, stock_bodega, active, catalog_managed,
        needs_price_review, created_at, updated_at
      ) VALUES (
        'hist-producto', NULL, 'Producto histórico', 'Histórico', 1000,
        'untracked', NULL, NULL, NULL, 1, 0, 0, ?, ?
      )
    `)
    .run(timestamp, timestamp);

  const insertSale = sqlite.prepare(`
    INSERT INTO sales (
      id, created_at, business_date, shift, shift_session_id, payment_status,
      checkout_method, payment_method, debt_note, debtor_collaborator,
      paid_at, settlement_id, seller, total_clp
    ) VALUES (?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `);
  const sales = [
    {
      id: "venta-antes",
      createdAt: "2026-09-01T03:59:59.000Z",
      status: "paid",
      checkoutMethod: "efectivo",
      paymentMethod: "efectivo",
      debtNote: null,
      debtor: null,
      paidAt: "2026-09-01T03:59:59.000Z",
      seller: "Hernán Silva",
      totalClp: 1000,
      productName: "Agua",
    },
    {
      id: "venta-a",
      createdAt: "2026-09-01T04:00:00.000Z",
      status: "paid",
      checkoutMethod: "efectivo",
      paymentMethod: "efectivo",
      debtNote: null,
      debtor: null,
      paidAt: "2026-09-01T04:00:00.000Z",
      seller: "Andrés Lagos",
      totalClp: 2000,
      productName: "Espresso",
    },
    {
      id: "venta-b",
      createdAt: "2026-09-01T04:00:00.000Z",
      status: "pending",
      checkoutMethod: "colaborador",
      paymentMethod: null,
      debtNote: null,
      debtor: "Bárbara Vega",
      paidAt: null,
      seller: "Hernán Silva",
      totalClp: 5000,
      productName: "Berry Fit",
    },
    {
      id: "venta-c",
      createdAt: "2026-09-02T03:59:59.000Z",
      status: "pending",
      checkoutMethod: "pendiente",
      paymentMethod: null,
      debtNote: "Joaquin Mendes debe 5000 · referencia %_promo",
      debtor: null,
      paidAt: null,
      seller: "Eva Soto",
      totalClp: 5000,
      productName: "Barra de proteína",
    },
    {
      id: "venta-d",
      createdAt: "2026-09-02T04:00:00.000Z",
      status: "paid",
      checkoutMethod: "tarjeta",
      paymentMethod: "credito",
      debtNote: null,
      debtor: null,
      paidAt: "2026-09-02T04:00:00.000Z",
      seller: "Matías Muñoz",
      totalClp: 2500,
      productName: "Protein Shake",
    },
  ];
  const insertItem = sqlite.prepare(`
    INSERT INTO sale_items (
      sale_id, product_id, product_name, unit_price_clp, quantity,
      line_total_clp
    ) VALUES (?, 'hist-producto', ?, ?, 1, ?)
  `);
  for (const sale of sales) {
    insertSale.run(
      sale.id,
      sale.createdAt,
      sale.status,
      sale.checkoutMethod,
      sale.paymentMethod,
      sale.debtNote,
      sale.debtor,
      sale.paidAt,
      sale.seller,
      sale.totalClp,
    );
    insertItem.run(
      sale.id,
      sale.productName,
      sale.totalClp,
      sale.totalClp,
    );
  }

  const insertPayment = sqlite.prepare(`
    INSERT INTO sale_payments (
      id, sale_id, created_at, business_date, shift, shift_session_id,
      payment_method, amount_clp, received_by, kind
    ) VALUES (?, ?, ?, NULL, NULL, NULL, ?, ?, NULL, ?)
  `);
  insertPayment.run(
    "direct:venta-antes",
    "venta-antes",
    "2026-09-01T03:59:59.000Z",
    "efectivo",
    1000,
    "direct",
  );
  insertPayment.run(
    "direct:venta-a",
    "venta-a",
    "2026-09-01T04:00:00.000Z",
    "efectivo",
    2000,
    "direct",
  );
  insertPayment.run(
    "settlement:abono-c",
    "venta-c",
    "2026-09-02T03:59:59.500Z",
    "transferencia",
    2000,
    "settlement",
  );
  insertPayment.run(
    "direct:venta-d",
    "venta-d",
    "2026-09-02T04:00:00.000Z",
    "tarjeta",
    2500,
    "direct",
  );
  return { sqlite, adapter: sqliteD1Adapter(sqlite) };
}

function decodeSalesHistoryCursor(cursor) {
  assert.equal(typeof cursor, "string");
  const separator = cursor.indexOf("~");
  assert.ok(separator > 0);
  return {
    createdAt: cursor.slice(0, separator),
    id: cursor.slice(separator + 1),
  };
}

test("ventas de hoy pagina estable y expone solo el nombre del colaborador deudor", async () => {
  const { sqlite, adapter } = await createSalesHistoryFixture();
  try {
    sqlite
      .prepare(`
        UPDATE sales SET business_date = '2026-09-01', shift = 'am'
        WHERE id = 'venta-c'
      `)
      .run();
    sqlite
      .prepare(`
        UPDATE sale_items
        SET unit_price_clp = 3000, line_total_clp = 3000
        WHERE sale_id = 'venta-c'
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES ('venta-c', 'hist-producto', 'Muffin', 1000, 2, 2000)
      `)
      .run();
    const now = new Date("2026-09-01T15:00:00.000Z");
    const first = await pos.module.listTodaySales(
      adapter.database,
      { role: "admin", limit: 2 },
      now,
    );
    assert.equal(first.businessDate, "2026-09-01");
    assert.equal(first.totalCount, 3);
    assert.equal(first.hasMore, true);
    assert.deepEqual(first.summary, {
      totalSalesClp: 12000,
      collectedClp: 4000,
      settlementClp: 2000,
      cashClp: 2000,
      cardClp: 0,
      transferClp: 2000,
      pendingTransferClp: 0,
      pendingTransferCount: 0,
    });
    assert.deepEqual(first.sales.map(({ id }) => id), ["venta-c", "venta-b"]);
    assert.equal(first.sales[1].checkoutMethod, "colaborador");
    assert.equal(first.sales[1].debtorCollaborator, "Bárbara Vega");
    assert.deepEqual(Object.keys(first.sales[0]), [
      "id",
      "createdAt",
      "businessDate",
      "shift",
      "sessionId",
      "responsible",
      "debtorCollaborator",
      "checkoutMethod",
      "paymentStatus",
      "paymentMethod",
      "totalClp",
      "paidClp",
      "balanceClp",
      "transferValidatedAt",
      "transferValidatedBy",
      "transferEmailReference",
      "items",
      "voidedAt",
      "voidReason",
      "voidedBy",
      "canVoid",
    ]);
    assert.deepEqual(
      {
        businessDate: first.sales[0].businessDate,
        shift: first.sales[0].shift,
        responsible: first.sales[0].responsible,
        debtorCollaborator: first.sales[0].debtorCollaborator,
        checkoutMethod: first.sales[0].checkoutMethod,
        paymentStatus: first.sales[0].paymentStatus,
        paymentMethod: first.sales[0].paymentMethod,
        totalClp: first.sales[0].totalClp,
        paidClp: first.sales[0].paidClp,
        balanceClp: first.sales[0].balanceClp,
        voidedAt: first.sales[0].voidedAt,
        voidReason: first.sales[0].voidReason,
        voidedBy: first.sales[0].voidedBy,
        canVoid: first.sales[0].canVoid,
        itemNames: first.sales[0].items.map(({ productName }) => productName),
        itemUnits: first.sales[0].items.map(({ quantity }) => quantity),
      },
      {
        businessDate: "2026-09-01",
        shift: "am",
        responsible: "Eva Soto",
        debtorCollaborator: null,
        checkoutMethod: "pendiente",
        paymentStatus: "pending",
        paymentMethod: null,
        totalClp: 5000,
        paidClp: 2000,
        balanceClp: 3000,
        voidedAt: null,
        voidReason: null,
        voidedBy: null,
        canVoid: false,
        itemNames: ["Barra de proteína", "Muffin"],
        itemUnits: [1, 2],
      },
    );
    for (const sensitive of [
      "debtNote",
      "paidAt",
      "payments",
      "settlementId",
      "notes",
      "handoffComments",
      "validation",
    ]) {
      assert.equal(sensitive in first.sales[0], false, sensitive);
    }
    assert.equal(adapter.getPrepareCalls(), 3);

    const second = await pos.module.listTodaySales(
      adapter.database,
      {
        role: "admin",
        limit: 2,
        cursor: decodeSalesHistoryCursor(first.nextCursor),
      },
      now,
    );
    assert.deepEqual(second.sales.map(({ id }) => id), ["venta-a"]);
    assert.equal(second.totalCount, 3);
    assert.equal(second.hasMore, false);
    assert.equal(second.nextCursor, null);
    assert.deepEqual(second.summary, first.summary);
    assert.deepEqual(
      [...first.sales, ...second.sales].map(({ id }) => id),
      ["venta-c", "venta-b", "venta-a"],
    );
    assert.equal(adapter.getPrepareCalls(), 6);

    const salesFirst = await pos.module.listTodaySales(
      adapter.database,
      { role: "sales", limit: 2 },
      now,
    );
    assert.equal(salesFirst.totalCount, 3);
    assert.deepEqual(salesFirst.summary, first.summary);
    assert.deepEqual(salesFirst.sales.map(({ id }) => id), [
      "venta-c",
      "venta-b",
    ]);
    assert.equal(salesFirst.hasMore, true);
    assert.deepEqual(
      {
        checkoutMethod: salesFirst.sales[1].checkoutMethod,
        debtorCollaborator: salesFirst.sales[1].debtorCollaborator,
        hasDebtNote: "debtNote" in salesFirst.sales[1],
      },
      {
        checkoutMethod: "colaborador",
        debtorCollaborator: "Bárbara Vega",
        hasDebtNote: false,
      },
    );
    const salesSecond = await pos.module.listTodaySales(
      adapter.database,
      {
        role: "sales",
        limit: 2,
        cursor: decodeSalesHistoryCursor(salesFirst.nextCursor),
      },
      now,
    );
    assert.equal(salesSecond.totalCount, 3);
    assert.deepEqual(salesSecond.sales.map(({ id }) => id), ["venta-a"]);
    assert.equal(salesSecond.hasMore, false);
    assert.equal(salesSecond.nextCursor, null);
    assert.deepEqual(
      [...salesFirst.sales, ...salesSecond.sales].map(
        ({ id, debtorCollaborator }) => [id, debtorCollaborator],
      ),
      [
        ["venta-c", null],
        ["venta-b", "Bárbara Vega"],
        ["venta-a", null],
      ],
    );
    await assert.rejects(
      () =>
        pos.module.listTodaySales(
          adapter.database,
          { role: "owner", limit: 20 },
          now,
        ),
      (error) => error.status === 403 && /perfil/i.test(error.message),
    );

    await assert.rejects(
      () =>
        pos.module.listTodaySales(
          adapter.database,
          {
            role: "admin",
            cursor: {
              createdAt: "2026-09-01T03:59:59.000Z",
              id: "venta-antes",
            },
          },
          now,
        ),
      (error) => error.status === 400 && /no corresponde.*hoy/i.test(error.message),
    );
    await assert.rejects(
      () =>
        pos.module.listTodaySales(
          adapter.database,
          { role: "admin", limit: 51 },
          now,
        ),
      (error) => error.status === 400 && /entre 1 y 50/i.test(error.message),
    );
  } finally {
    sqlite.close();
  }
});

test("ventas de hoy respeta el día chileno de 25 horas durante el cambio DST", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const insertSale = sqlite.prepare(`
      INSERT INTO sales (
        id, created_at, business_date, shift, payment_status,
        checkout_method, payment_method, debt_note, debtor_collaborator,
        paid_at, settlement_id, seller, total_clp
      ) VALUES (?, ?, NULL, NULL, 'paid', 'efectivo', 'efectivo', NULL, NULL,
        ?, NULL, 'Matías Muñoz', 100)
    `);
    const insertPayment = sqlite.prepare(`
      INSERT INTO sale_payments (
        id, sale_id, created_at, business_date, shift, shift_session_id,
        payment_method, amount_clp, received_by, kind
      ) VALUES (?, ?, ?, NULL, NULL, NULL, 'efectivo', 100, NULL, 'direct')
    `);
    for (const [id, createdAt] of [
      ["dst-antes", "2026-04-04T02:59:59.000Z"],
      ["dst-inicio", "2026-04-04T03:00:00.000Z"],
      ["dst-fin", "2026-04-05T03:59:59.000Z"],
      ["dst-despues", "2026-04-05T04:00:00.000Z"],
    ]) {
      insertSale.run(id, createdAt, createdAt);
      insertPayment.run(`direct:${id}`, id, createdAt);
    }
    const adapter = sqliteD1Adapter(sqlite);
    const page = await pos.module.listTodaySales(
      adapter.database,
      { role: "admin", limit: 20 },
      new Date("2026-04-04T15:00:00.000Z"),
    );
    assert.equal(page.businessDate, "2026-04-04");
    assert.equal(page.totalCount, 2);
    assert.deepEqual(page.sales.map(({ id }) => id), ["dst-fin", "dst-inicio"]);
    assert.equal(adapter.getPrepareCalls(), 3);
  } finally {
    sqlite.close();
  }
});

test("el historial recorre todas las ventas con keyset estable y saldos completos", async () => {
  const { sqlite, adapter } = await createSalesHistoryFixture();
  try {
    const first = await pos.module.listSalesHistory(adapter.database, {
      limit: 3,
      q: "venta-",
    });
    assert.deepEqual(first.sales.map(({ id }) => id), [
      "venta-d",
      "venta-c",
      "venta-b",
    ]);
    assert.equal(first.totalCount, 5);
    assert.equal(first.hasMore, true);
    assert.deepEqual(first.filters, {
      dateFrom: null,
      dateTo: null,
      paymentStatus: null,
      paymentMethod: null,
      q: "venta-",
    });
    assert.deepEqual(
      {
        totalClp: first.sales[1].totalClp,
        paidClp: first.sales[1].paidClp,
        balanceClp: first.sales[1].balanceClp,
        paymentCount: first.sales[1].paymentCount,
        paymentsHasMore: first.sales[1].paymentsHasMore,
        paymentIds: first.sales[1].payments.map(({ id }) => id),
        itemNames: first.sales[1].items.map(({ productName }) => productName),
      },
      {
        totalClp: 5000,
        paidClp: 2000,
        balanceClp: 3000,
        paymentCount: 1,
        paymentsHasMore: false,
        paymentIds: ["abono-c"],
        itemNames: ["Barra de proteína"],
      },
    );
    assert.equal(adapter.getPrepareCalls(), 4);

    const second = await pos.module.listSalesHistory(adapter.database, {
      limit: 3,
      q: "venta-",
      cursor: decodeSalesHistoryCursor(first.nextCursor),
    });
    assert.deepEqual(second.sales.map(({ id }) => id), [
      "venta-a",
      "venta-antes",
    ]);
    assert.equal(second.totalCount, 5);
    assert.equal(second.hasMore, false);
    assert.equal(second.nextCursor, null);
    assert.deepEqual(
      [...first.sales, ...second.sales].map(({ id }) => id),
      ["venta-d", "venta-c", "venta-b", "venta-a", "venta-antes"],
    );
  } finally {
    sqlite.close();
  }
});

test("el historial combina filtros y trata los caracteres de búsqueda literalmente", async () => {
  const { sqlite, adapter } = await createSalesHistoryFixture();
  try {
    const localDay = await pos.module.listSalesHistory(adapter.database, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
    });
    assert.deepEqual(localDay.sales.map(({ id }) => id), [
      "venta-c",
      "venta-b",
      "venta-a",
    ]);
    assert.equal(localDay.totalCount, 3);

    const combined = await pos.module.listSalesHistory(adapter.database, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
      paymentStatus: "pending",
      paymentMethod: "colaborador",
      q: "  bárbara  ",
    });
    assert.deepEqual(combined.sales.map(({ id }) => id), ["venta-b"]);
    assert.deepEqual(combined.filters, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
      paymentStatus: "pending",
      paymentMethod: "colaborador",
      q: "bárbara",
    });

    const literal = await pos.module.listSalesHistory(adapter.database, {
      q: "%_",
    });
    assert.deepEqual(literal.sales.map(({ id }) => id), ["venta-c"]);
    assert.equal(literal.totalCount, 1);

    const legacyCard = await pos.module.listSalesHistory(adapter.database, {
      paymentMethod: "credito",
    });
    assert.deepEqual(legacyCard.sales.map(({ id }) => id), ["venta-d"]);
    assert.equal(legacyCard.filters.paymentMethod, "tarjeta");
    assert.deepEqual(
      legacyCard.sales[0].payments.map(({ paymentMethod }) => paymentMethod),
      ["tarjeta"],
    );
  } finally {
    sqlite.close();
  }
});

test("el historial aplica el día chileno inclusivo aun en el cambio DST", async () => {
  const prepared = [];
  const database = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async all() {
          return { results: [] };
        },
        async first() {
          return { count: 0 };
        },
      };
      prepared.push(statement);
      return statement;
    },
  };
  const result = await pos.module.listSalesHistory(database, {
    dateFrom: "2026-09-05",
    dateTo: "2026-09-05",
  });
  assert.equal(result.totalCount, 0);
  const rows = prepared.find(({ sql }) => sql.includes("ORDER BY s.created_at"));
  const count = prepared.find(({ sql }) => sql.includes("COUNT(*) AS count"));
  assert.deepEqual(rows.values, [
    "2026-09-05T04:00:00.000Z",
    "2026-09-06T04:00:00.000Z",
    31,
  ]);
  assert.deepEqual(count.values, [
    "2026-09-05T04:00:00.000Z",
    "2026-09-06T04:00:00.000Z",
  ]);
});

test("el historial rechaza filtros, fechas y cursores inválidos", async () => {
  const emptyDatabase = {
    prepare() {
      throw new Error("No debe consultar con filtros inválidos");
    },
  };
  await assert.rejects(
    () => pos.module.listSalesHistory(emptyDatabase, { limit: 0 }),
    /límite del historial/i,
  );
  await assert.rejects(
    () =>
      pos.module.listSalesHistory(emptyDatabase, {
        dateFrom: "2026-09-02",
        dateTo: "2026-09-01",
      }),
    /fecha inicial/i,
  );
  await assert.rejects(
    () => pos.module.listSalesHistory(emptyDatabase, { dateFrom: "2026-02-30" }),
    /fecha de negocio/i,
  );
  await assert.rejects(
    () =>
      pos.module.listSalesHistory(emptyDatabase, {
        cursor: { createdAt: "ayer", id: "venta-a" },
      }),
    /cursor del historial/i,
  );
  await assert.rejects(
    () =>
      pos.module.listSalesHistory(emptyDatabase, {
        paymentStatus: "cancelled",
      }),
    /estado de pago/i,
  );
  await assert.rejects(
    () =>
      pos.module.listSalesHistory(emptyDatabase, {
        paymentMethod: "cheque",
      }),
    /medio de pago/i,
  );
  await assert.rejects(
    () => pos.module.listSalesHistory(emptyDatabase, { q: "x".repeat(81) }),
    /80 caracteres/i,
  );
});

test("el reporte diario separa ventas originadas de cobros recibidos", async () => {
  const { sqlite, adapter } = await createSalesHistoryFixture();
  try {
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-antigua', '2026-09-01T03:00:00.000Z', NULL, NULL, NULL,
          'pending', 'colaborador', NULL, 'Consumo del día anterior',
          'Hernán Silva', NULL, NULL, 'Hernán Silva', 6000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name, unit_price_clp, quantity,
          line_total_clp
        ) VALUES (
          'deuda-antigua', 'hist-producto', 'Producto antiguo', 6000, 1, 6000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        ) VALUES (
          'settlement:deuda-antigua-1', 'deuda-antigua',
          '2026-09-01T05:00:00.000Z', NULL, NULL, NULL,
          'efectivo', 1000, NULL, 'settlement'
        )
      `)
      .run();

    const report = await pos.module.getDailySalesReport(adapter.database, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-02",
    });

    assert.deepEqual(report, {
      period: {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-02",
        totalSalesClp: 14500,
        salesCount: 4,
        units: 4,
        averageClp: 3625,
        outstandingSalesClp: 8000,
        pendingCustomerClp: 3000,
        collaboratorClp: 5000,
        collectedClp: 7500,
        settlementClp: 3000,
        cashClp: 3000,
        cardClp: 2500,
        transferClp: 2000,
      },
      days: [
        {
          date: "2026-09-02",
          totalSalesClp: 2500,
          salesCount: 1,
          units: 1,
          averageClp: 2500,
          outstandingSalesClp: 0,
          pendingCustomerClp: 0,
          collaboratorClp: 0,
          collectedClp: 2500,
          settlementClp: 0,
          cashClp: 0,
          cardClp: 2500,
          transferClp: 0,
        },
        {
          date: "2026-09-01",
          totalSalesClp: 12000,
          salesCount: 3,
          units: 3,
          averageClp: 4000,
          outstandingSalesClp: 8000,
          pendingCustomerClp: 3000,
          collaboratorClp: 5000,
          collectedClp: 5000,
          settlementClp: 3000,
          cashClp: 3000,
          cardClp: 0,
          transferClp: 2000,
        },
      ],
    });
    assert.equal(adapter.getPrepareCalls(), 2);
    assert.ok(
      sqlite
        .prepare(`
          SELECT 1 FROM sqlite_schema
          WHERE type = 'index' AND name = 'idx_sale_payments_created_at'
        `)
        .get(),
    );
  } finally {
    sqlite.close();
  }
});

test("la migración de datos carga los totales históricos en efectivo", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    await applyGeneratedMigrations(sqlite);
    const adapter = sqliteD1Adapter(sqlite);
    const report = await pos.module.getDailySalesReport(adapter.database, {
      dateFrom: "2026-08-27",
      dateTo: "2026-08-31",
    });
    const totalsByDate = new Map(
      report.days.map((day) => [
        day.date,
        {
          totalSalesClp: day.totalSalesClp,
          salesCount: day.salesCount,
          cashClp: day.cashClp,
          cardClp: day.cardClp,
          transferClp: day.transferClp,
        },
      ]),
    );
    assert.deepEqual(totalsByDate.get("2026-08-27"), {
      totalSalesClp: 29800,
      salesCount: 1,
      cashClp: 29800,
      cardClp: 0,
      transferClp: 0,
    });
    assert.deepEqual(totalsByDate.get("2026-08-28"), {
      totalSalesClp: 41200,
      salesCount: 1,
      cashClp: 41200,
      cardClp: 0,
      transferClp: 0,
    });
    assert.deepEqual(totalsByDate.get("2026-08-29"), {
      totalSalesClp: 47300,
      salesCount: 1,
      cashClp: 47300,
      cardClp: 0,
      transferClp: 0,
    });
    assert.deepEqual(totalsByDate.get("2026-08-31"), {
      totalSalesClp: 35600,
      salesCount: 1,
      cashClp: 35600,
      cardClp: 0,
      transferClp: 0,
    });
    assert.equal(report.period.totalSalesClp, 153900);
    assert.equal(report.period.cashClp, 153900);

    const history = await pos.module.listSalesHistory(adapter.database, {
      q: "ajuste-ventas-efectivo",
      limit: 10,
    });
    assert.deepEqual(
      history.sales.map(({ id, totalClp, paymentMethod, settledPaymentMethod }) => [
        id,
        totalClp,
        paymentMethod,
        settledPaymentMethod,
      ]),
      [
        ["ajuste-ventas-efectivo-2026-08-31", 35600, "efectivo", null],
        ["ajuste-ventas-efectivo-2026-08-29", 47300, "efectivo", null],
        ["ajuste-ventas-efectivo-2026-08-28", 41200, "efectivo", null],
        ["ajuste-ventas-efectivo-2026-08-27", 29800, "efectivo", null],
      ],
    );
  } finally {
    sqlite.close();
  }
});

test("el rango diario usa 30 días por defecto y limita consultas excesivas", () => {
  assert.deepEqual(
    pos.module.normalizeSalesReportDateRange(
      {},
      new Date("2026-09-02T15:00:00.000Z"),
    ),
    { dateFrom: "2026-08-04", dateTo: "2026-09-02", dayCount: 30 },
  );
  assert.deepEqual(
    pos.module.normalizeSalesReportDateRange({ dateTo: "2026-09-06" }),
    { dateFrom: "2026-08-08", dateTo: "2026-09-06", dayCount: 30 },
  );
  assert.throws(
    () =>
      pos.module.normalizeSalesReportDateRange({
        dateFrom: "2025-09-01",
        dateTo: "2026-09-02",
      }),
    /366 días/i,
  );
  assert.throws(
    () =>
      pos.module.normalizeSalesReportDateRange({
        dateFrom: "2026-09-02",
        dateTo: "2026-09-01",
      }),
    /fecha inicial/i,
  );
});

test("el reporte diario conserva los límites DST reales de Santiago", async () => {
  const statements = [];
  const database = {
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async all() {
          return { results: [] };
        },
      };
      statements.push(statement);
      return statement;
    },
  };
  await pos.module.getDailySalesReport(database, {
    dateFrom: "2026-09-05",
    dateTo: "2026-09-06",
  });
  assert.equal(statements.length, 2);
  for (const { values } of statements) {
    assert.deepEqual(values, [
      "2026-09-05T04:00:00.000Z",
      "2026-09-07T03:00:00.000Z",
    ]);
  }
  assert.match(
    statements[0].sql,
    /\('2026-09-05', '2026-09-05T04:00:00\.000Z', '2026-09-06T04:00:00\.000Z'\)/,
  );
  assert.match(
    statements[0].sql,
    /\('2026-09-06', '2026-09-06T04:00:00\.000Z', '2026-09-07T03:00:00\.000Z'\)/,
  );
});

test("la exportación aplica exactamente los filtros y conserva tipos contables", async () => {
  const { sqlite, adapter } = await createSalesHistoryFixture();
  try {
    sqlite
      .prepare(`
        INSERT INTO sales (
          id, created_at, business_date, shift, shift_session_id,
          payment_status, checkout_method, payment_method, debt_note,
          debtor_collaborator, paid_at, settlement_id, seller, total_clp
        ) VALUES (
          'deuda-export-antigua', '2026-09-01T03:00:00.000Z', NULL, NULL, NULL,
          'pending', 'colaborador', NULL, 'Consumo anterior al rango',
          'Hernán Silva', NULL, NULL, 'Hernán Silva', 6000
        )
      `)
      .run();
    sqlite
      .prepare(`
        INSERT INTO sale_payments (
          id, sale_id, created_at, business_date, shift, shift_session_id,
          payment_method, amount_clp, received_by, kind
        ) VALUES (
          'settlement:deuda-export-antigua-1', 'deuda-export-antigua',
          '2026-09-01T05:00:00.000Z', NULL, NULL, NULL,
          'efectivo', 1000, NULL, 'settlement'
        )
      `)
      .run();

    const result = await pos.module.listSalesForExport(adapter.database, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
      paymentStatus: "pending",
      paymentMethod: "colaborador",
      q: "  BÁRBARA  ",
    });
    assert.deepEqual(result.filters, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
      paymentStatus: "pending",
      paymentMethod: "colaborador",
      q: "BÁRBARA",
    });
    assert.deepEqual(result.dateRange, {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-01",
      dayCount: 1,
    });
    assert.deepEqual(result.sales, [
      {
        id: "venta-b",
        createdAt: "2026-09-01T04:00:00.000Z",
        businessDate: null,
        shift: null,
        seller: "Hernán Silva",
        checkoutMethod: "colaborador",
        paymentStatus: "pending",
        settledPaymentMethod: null,
        debtNote: null,
        debtorCollaborator: "Bárbara Vega",
        totalClp: 5000,
        paidClp: 0,
        balanceClp: 5000,
        units: 1,
        products: "Berry Fit ×1",
      },
    ],
    );
    assert.deepEqual(
      result.payments.map(({ saleId, createdAt, paymentMethod, amountClp, kind }) => ({
        saleId,
        createdAt,
        paymentMethod,
        amountClp,
        kind,
      })),
      [
        {
          saleId: "venta-a",
          createdAt: "2026-09-01T04:00:00.000Z",
          paymentMethod: "efectivo",
          amountClp: 2000,
          kind: "direct",
        },
        {
          saleId: "deuda-export-antigua",
          createdAt: "2026-09-01T05:00:00.000Z",
          paymentMethod: "efectivo",
          amountClp: 1000,
          kind: "settlement",
        },
        {
          saleId: "venta-c",
          createdAt: "2026-09-02T03:59:59.500Z",
          paymentMethod: "transferencia",
          amountClp: 2000,
          kind: "settlement",
        },
      ],
    );
    assert.equal(adapter.getPrepareCalls(), 2);

    const legacyCard = await pos.module.listSalesForExport(adapter.database, {
      dateFrom: "2026-09-02",
      dateTo: "2026-09-02",
      paymentMethod: "credito",
    });
    assert.equal(legacyCard.filters.paymentMethod, "tarjeta");
    assert.equal(legacyCard.sales[0].checkoutMethod, "tarjeta");
    assert.equal(legacyCard.sales[0].settledPaymentMethod, "tarjeta");
    assert.deepEqual(
      legacyCard.payments.map(({ saleId, paymentMethod, amountClp, kind }) => ({
        saleId,
        paymentMethod,
        amountClp,
        kind,
      })),
      [
        {
          saleId: "venta-d",
          paymentMethod: "tarjeta",
          amountClp: 2500,
          kind: "direct",
        },
      ],
    );
  } finally {
    sqlite.close();
  }
});

test("la exportación rechaza más de 1500 ventas sin truncar", async () => {
  const database = {
    prepare() {
      return {
        bind() {
          return this;
        },
        async all() {
          return { results: Array.from({ length: 1501 }, () => ({})) };
        },
      };
    },
  };
  await assert.rejects(
    () =>
      pos.module.listSalesForExport(database, {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-01",
      }),
    (error) =>
      error?.status === 413 && /Acota el rango o aplica más filtros/i.test(error.message),
  );
});

test("la exportación rechaza más de 10000 pagos sin truncar", async () => {
  const database = {
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async all() {
          return {
            results: sql.includes("payment.received_by,")
              ? Array.from({ length: 10_001 }, () => ({}))
              : [],
          };
        },
      };
    },
  };
  await assert.rejects(
    () =>
      pos.module.listSalesForExport(database, {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-01",
      }),
    (error) =>
      error?.status === 413 &&
      /supera 10000 pagos.*Acota el rango/i.test(error.message),
  );
});
