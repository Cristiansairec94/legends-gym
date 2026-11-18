PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`unit` text NOT NULL,
	`stock` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "ingredients_stock_nonnegative" CHECK("ingredients"."stock" >= 0),
	CONSTRAINT "ingredients_revision_nonnegative" CHECK("ingredients"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_ingredients_name` ON `ingredients` (`name`);--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price_clp` integer NOT NULL,
	`stock_mode` text DEFAULT 'untracked' NOT NULL,
	`stock` integer,
	`stock_vitrina` integer,
	`stock_bodega` integer,
	`active` integer DEFAULT true NOT NULL,
	`catalog_managed` integer DEFAULT false NOT NULL,
	`needs_price_review` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "products_price_clp_positive" CHECK("__new_products"."price_clp" > 0),
	CONSTRAINT "products_stock_mode_allowed" CHECK("__new_products"."stock_mode" IN ('untracked', 'simple', 'split')),
	CONSTRAINT "products_stock_shape_valid" CHECK((
        "__new_products"."stock_mode" = 'untracked'
        AND "__new_products"."stock" IS NULL
        AND "__new_products"."stock_vitrina" IS NULL
        AND "__new_products"."stock_bodega" IS NULL
      ) OR (
        "__new_products"."stock_mode" = 'simple'
        AND "__new_products"."stock" IS NOT NULL
        AND "__new_products"."stock" >= 0
        AND "__new_products"."stock_vitrina" IS NULL
        AND "__new_products"."stock_bodega" IS NULL
      ) OR (
        "__new_products"."stock_mode" = 'split'
        AND "__new_products"."stock" IS NULL
        AND "__new_products"."stock_vitrina" IS NOT NULL
        AND "__new_products"."stock_vitrina" >= 0
        AND "__new_products"."stock_bodega" IS NOT NULL
        AND "__new_products"."stock_bodega" >= 0
        AND "__new_products"."category" = 'Tienda'
      ))
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "sku", "name", "category", "price_clp", "stock_mode", "stock", "stock_vitrina", "stock_bodega", "active", "catalog_managed", "needs_price_review", "created_at", "updated_at") SELECT "id", "sku", "name", "category", "price_clp", CASE WHEN "stock" IS NULL THEN 'untracked' ELSE 'simple' END, "stock", NULL, NULL, "active", "catalog_managed", "needs_price_review", "created_at", "updated_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_products_sku` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_products_active_category` ON `products` (`active`,`category`,`name`);--> statement-breakpoint
CREATE TABLE `product_ingredients` (
	`product_id` text NOT NULL,
	`ingredient_id` text NOT NULL,
	`quantity` integer NOT NULL,
	PRIMARY KEY(`product_id`, `ingredient_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "product_ingredients_quantity_positive" CHECK("product_ingredients"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_product_ingredients_ingredient_id` ON `product_ingredients` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`payment_method` text,
	`debt_note` text,
	`paid_at` text,
	`settlement_id` text,
	`seller` text,
	`total_clp` integer NOT NULL,
	CONSTRAINT "sales_payment_status_allowed" CHECK("__new_sales"."payment_status" IN ('paid', 'pending')),
	CONSTRAINT "sales_payment_state_valid" CHECK((
        "__new_sales"."payment_status" = 'pending'
        AND "__new_sales"."payment_method" IS NULL
        AND "__new_sales"."debt_note" IS NOT NULL
        AND length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
        AND "__new_sales"."paid_at" IS NULL
        AND "__new_sales"."settlement_id" IS NULL
      ) OR (
        "__new_sales"."payment_status" = 'paid'
        AND "__new_sales"."payment_method" IS NOT NULL
        AND "__new_sales"."payment_method" IN ('efectivo', 'debito', 'credito', 'transferencia')
        AND "__new_sales"."paid_at" IS NOT NULL
        AND (
          ("__new_sales"."debt_note" IS NULL AND "__new_sales"."settlement_id" IS NULL)
          OR (
            "__new_sales"."debt_note" IS NOT NULL
            AND length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
            AND "__new_sales"."settlement_id" IS NOT NULL
          )
        )
      )),
	CONSTRAINT "sales_total_clp_positive" CHECK("__new_sales"."total_clp" > 0)
);
--> statement-breakpoint
CREATE TABLE `__new_sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_clp` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_clp` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `__new_sales`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sale_items_unit_price_positive" CHECK("__new_sale_items"."unit_price_clp" > 0),
	CONSTRAINT "sale_items_quantity_allowed" CHECK("__new_sale_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "sale_items_line_total_valid" CHECK("__new_sale_items"."line_total_clp" = "__new_sale_items"."unit_price_clp" * "__new_sale_items"."quantity")
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "created_at", "payment_status", "payment_method", "debt_note", "paid_at", "settlement_id", "seller", "total_clp") SELECT "id", "created_at", 'paid', "payment_method", NULL, "created_at", NULL, "seller", "total_clp" FROM `sales`;--> statement-breakpoint
INSERT INTO `__new_sale_items`("id", "sale_id", "product_id", "product_name", "unit_price_clp", "quantity", "line_total_clp") SELECT "id", "sale_id", "product_id", "product_name", "unit_price_clp", "quantity", "line_total_clp" FROM `sale_items`;--> statement-breakpoint
DROP TABLE `sale_items`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;--> statement-breakpoint
ALTER TABLE `__new_sale_items` RENAME TO `sale_items`;--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale_id` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_paid_at` ON `sales` (`paid_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_pending_created_at` ON `sales` (`created_at`) WHERE "sales"."payment_status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sales_settlement_id` ON `sales` (`settlement_id`);--> statement-breakpoint
PRAGMA foreign_key_check;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
