CREATE TABLE `inventory_stock_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`location` text NOT NULL,
	`quantity_before` integer NOT NULL,
	`quantity_added` integer NOT NULL,
	`quantity_after` integer NOT NULL,
	`actor_role` text NOT NULL,
	`operation_token` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "inventory_stock_entries_shape_valid" CHECK((
          ("inventory_stock_entries"."item_type" = 'product'
            AND "inventory_stock_entries"."location" IN ('simple', 'vitrina', 'bodega'))
          OR ("inventory_stock_entries"."item_type" = 'ingredient'
            AND "inventory_stock_entries"."location" = 'ingredient')
        )
        AND length(trim("inventory_stock_entries"."item_id")) BETWEEN 1 AND 100
        AND length(trim("inventory_stock_entries"."item_name")) BETWEEN 1 AND 120
        AND "inventory_stock_entries"."quantity_before" BETWEEN 0 AND 9007199254740991
        AND "inventory_stock_entries"."quantity_added" BETWEEN 1 AND 1000000
        AND "inventory_stock_entries"."quantity_after" = "inventory_stock_entries"."quantity_before" + "inventory_stock_entries"."quantity_added"
        AND "inventory_stock_entries"."quantity_after" BETWEEN 1 AND 9007199254740991
        AND "inventory_stock_entries"."actor_role" = 'admin'
        AND length("inventory_stock_entries"."operation_token") BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE INDEX `idx_inventory_stock_entries_item_created` ON `inventory_stock_entries` (`item_type`,`item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_inventory_stock_entries_created_at` ON `inventory_stock_entries` (`created_at`);--> statement-breakpoint
CREATE TRIGGER `trg_inventory_stock_entries_apply_product`
AFTER INSERT ON `inventory_stock_entries`
WHEN NEW.`item_type` = 'product'
BEGIN
	UPDATE `products`
	SET
		`stock` = CASE
			WHEN NEW.`location` = 'simple' THEN NEW.`quantity_after`
			ELSE `stock`
		END,
		`stock_vitrina` = CASE
			WHEN NEW.`location` = 'vitrina' THEN NEW.`quantity_after`
			ELSE `stock_vitrina`
		END,
		`stock_bodega` = CASE
			WHEN NEW.`location` = 'bodega' THEN NEW.`quantity_after`
			ELSE `stock_bodega`
		END,
		`updated_at` = CASE
			WHEN `updated_at` < NEW.`created_at` THEN NEW.`created_at`
			ELSE strftime(
				'%Y-%m-%dT%H:%M:%fZ',
				julianday(`updated_at`) + 1.0 / 86400000.0
			)
		END
	WHERE `id` = NEW.`item_id`
		AND NOT EXISTS (
			SELECT 1 FROM `product_ingredients` AS `recipe`
			WHERE `recipe`.`product_id` = `products`.`id`
		)
		AND (
			(
				NEW.`location` = 'simple'
				AND `stock_mode` = 'simple'
				AND `stock` = NEW.`quantity_before`
			) OR (
				NEW.`location` = 'vitrina'
				AND `stock_mode` = 'split'
				AND `stock_vitrina` = NEW.`quantity_before`
			) OR (
				NEW.`location` = 'bodega'
				AND `stock_mode` = 'split'
				AND `stock_bodega` = NEW.`quantity_before`
			)
		);
	SELECT CASE WHEN changes() <> 1
		THEN RAISE(ABORT, 'inventory stock entry product conflict')
	END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_inventory_stock_entries_apply_ingredient`
AFTER INSERT ON `inventory_stock_entries`
WHEN NEW.`item_type` = 'ingredient'
BEGIN
	UPDATE `ingredients`
	SET
		`stock` = NEW.`quantity_after`,
		`revision` = `revision` + 1,
		`updated_at` = CASE
			WHEN `updated_at` < NEW.`created_at` THEN NEW.`created_at`
			ELSE strftime(
				'%Y-%m-%dT%H:%M:%fZ',
				julianday(`updated_at`) + 1.0 / 86400000.0
			)
		END
	WHERE `id` = NEW.`item_id`
		AND `stock` = NEW.`quantity_before`;
	SELECT CASE WHEN changes() <> 1
		THEN RAISE(ABORT, 'inventory stock entry ingredient conflict')
	END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_inventory_stock_entries_no_update`
BEFORE UPDATE ON `inventory_stock_entries`
BEGIN
	SELECT RAISE(ABORT, 'inventory stock entries are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_inventory_stock_entries_no_delete`
BEFORE DELETE ON `inventory_stock_entries`
BEGIN
	SELECT RAISE(ABORT, 'inventory stock entries are immutable');
END;--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES (
	'schema.migration.inventory-stock-entries-v1',
	'v1',
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(`key`) DO UPDATE SET
	`value` = excluded.`value`,
	`updated_at` = excluded.`updated_at`;
