CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price_clp` integer NOT NULL,
	`stock` integer,
	`active` integer DEFAULT true NOT NULL,
	`needs_price_review` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "products_price_clp_positive" CHECK("products"."price_clp" > 0),
	CONSTRAINT "products_stock_nonnegative" CHECK("products"."stock" IS NULL OR "products"."stock" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_products_sku` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `idx_products_active_category` ON `products` (`active`,`category`,`name`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_clp` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_clp` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sale_items_unit_price_positive" CHECK("sale_items"."unit_price_clp" > 0),
	CONSTRAINT "sale_items_quantity_allowed" CHECK("sale_items"."quantity" BETWEEN 1 AND 99),
	CONSTRAINT "sale_items_line_total_valid" CHECK("sale_items"."line_total_clp" = "sale_items"."unit_price_clp" * "sale_items"."quantity")
);
--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale_id` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`payment_method` text NOT NULL,
	`seller` text,
	`total_clp` integer NOT NULL,
	CONSTRAINT "sales_payment_method_allowed" CHECK("sales"."payment_method" IN ('efectivo', 'debito', 'credito', 'transferencia')),
	CONSTRAINT "sales_total_clp_positive" CHECK("sales"."total_clp" > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);