CREATE TABLE `sale_inventory_consumptions` (
	`sale_id` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`location` text NOT NULL,
	`quantity` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`sale_id`, `item_type`, `item_id`, `location`),
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sale_inventory_consumptions_shape_valid" CHECK((
          ("sale_inventory_consumptions"."item_type" = 'product'
            AND "sale_inventory_consumptions"."location" IN ('simple', 'vitrina'))
          OR ("sale_inventory_consumptions"."item_type" = 'ingredient'
            AND "sale_inventory_consumptions"."location" = 'ingredient')
        )
        AND length(trim("sale_inventory_consumptions"."item_id")) BETWEEN 1 AND 100
        AND length(trim("sale_inventory_consumptions"."item_name")) BETWEEN 1 AND 120
        AND "sale_inventory_consumptions"."quantity" BETWEEN 1 AND 1000000)
);
--> statement-breakpoint
CREATE INDEX `idx_sale_inventory_consumptions_sale_id` ON `sale_inventory_consumptions` (`sale_id`);--> statement-breakpoint
CREATE TABLE `sale_inventory_snapshots` (
	`sale_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sale_inventory_snapshots_version_valid" CHECK("sale_inventory_snapshots"."version" = 1)
);
--> statement-breakpoint
CREATE TABLE `sale_voids` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`shift_session_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`actor_role` text NOT NULL,
	`actor_name` text NOT NULL,
	`reason` text NOT NULL,
	`expected_activity_revision` integer NOT NULL,
	`request_fingerprint` text NOT NULL,
	`original_total_clp` integer NOT NULL,
	`original_paid_clp` integer NOT NULL,
	`original_balance_clp` integer NOT NULL,
	`inventory_source` text NOT NULL,
	`inventory_restoration_json` text NOT NULL,
	`payment_snapshot_json` text NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`shift_session_id`) REFERENCES `shift_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sale_voids_shape_valid" CHECK("sale_voids"."actor_role" = 'admin'
        AND length(trim("sale_voids"."actor_name")) BETWEEN 1 AND 100
        AND length(trim("sale_voids"."reason")) BETWEEN 1 AND 500
        AND "sale_voids"."expected_activity_revision" >= 0
        AND length("sale_voids"."request_fingerprint") BETWEEN 1 AND 1000
        AND "sale_voids"."original_total_clp" > 0
        AND "sale_voids"."original_paid_clp" >= 0
        AND "sale_voids"."original_paid_clp" <= "sale_voids"."original_total_clp"
        AND "sale_voids"."original_balance_clp" = "sale_voids"."original_total_clp" - "sale_voids"."original_paid_clp"
        AND "sale_voids"."inventory_source" IN ('snapshot', 'derived_legacy')
        AND json_valid("sale_voids"."inventory_restoration_json")
        AND json_valid("sale_voids"."payment_snapshot_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sale_voids_sale_id` ON `sale_voids` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_voids_created_at` ON `sale_voids` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sale_voids_shift_session_id` ON `sale_voids` (`shift_session_id`);
--> statement-breakpoint
CREATE TRIGGER `trg_sale_inventory_snapshots_no_update`
BEFORE UPDATE ON `sale_inventory_snapshots`
BEGIN
	SELECT RAISE(ABORT, 'sale inventory snapshots are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_sale_inventory_snapshots_no_delete`
BEFORE DELETE ON `sale_inventory_snapshots`
BEGIN
	SELECT RAISE(ABORT, 'sale inventory snapshots are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_sale_inventory_consumptions_no_update`
BEFORE UPDATE ON `sale_inventory_consumptions`
BEGIN
	SELECT RAISE(ABORT, 'sale inventory consumptions are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_sale_inventory_consumptions_no_delete`
BEFORE DELETE ON `sale_inventory_consumptions`
BEGIN
	SELECT RAISE(ABORT, 'sale inventory consumptions are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_sale_voids_no_update`
BEFORE UPDATE ON `sale_voids`
BEGIN
	SELECT RAISE(ABORT, 'sale voids are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER `trg_sale_voids_no_delete`
BEFORE DELETE ON `sale_voids`
BEGIN
	SELECT RAISE(ABORT, 'sale voids are immutable');
END;
--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES (
	'schema.migration.sale-voids-v1',
	'v1',
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(`key`) DO UPDATE SET
	`value` = excluded.`value`,
	`updated_at` = excluded.`updated_at`;
