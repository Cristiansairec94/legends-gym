PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__next_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`business_date` text,
	`shift` text,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`checkout_method` text NOT NULL,
	`payment_method` text,
	`debt_note` text,
	`debtor_collaborator` text,
	`paid_at` text,
	`settlement_id` text,
	`seller` text,
	`total_clp` integer NOT NULL,
	CONSTRAINT "sales_payment_status_allowed" CHECK(`payment_status` IN ('paid', 'pending')),
	CONSTRAINT "sales_shift_context_valid" CHECK((
		`business_date` IS NULL AND `shift` IS NULL
	) OR (
		`business_date` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
		AND `shift` IN ('am', 'pm')
	)),
	CONSTRAINT "sales_checkout_method_allowed" CHECK(`checkout_method` IN ('efectivo', 'tarjeta', 'transferencia', 'pendiente', 'colaborador')),
	CONSTRAINT "sales_payment_state_valid" CHECK((
		`payment_status` = 'pending'
		AND `payment_method` IS NULL
		AND `paid_at` IS NULL
		AND `settlement_id` IS NULL
		AND ((
			`checkout_method` = 'pendiente'
			AND `debt_note` IS NOT NULL
			AND length(trim(`debt_note`)) BETWEEN 1 AND 500
			AND `debtor_collaborator` IS NULL
		) OR (
			`checkout_method` = 'colaborador'
			AND `debtor_collaborator` IS NOT NULL
			AND length(trim(`debtor_collaborator`)) BETWEEN 1 AND 100
			AND (`debt_note` IS NULL OR length(trim(`debt_note`)) BETWEEN 1 AND 500)
		))
	) OR (
		`payment_status` = 'paid'
		AND `payment_method` IN ('efectivo', 'tarjeta', 'debito', 'credito', 'transferencia')
		AND `paid_at` IS NOT NULL
		AND ((
			`checkout_method` IN ('efectivo', 'tarjeta', 'transferencia')
			AND `debt_note` IS NULL
			AND `debtor_collaborator` IS NULL
			AND `settlement_id` IS NULL
		) OR (
			`checkout_method` = 'pendiente'
			AND `debt_note` IS NOT NULL
			AND length(trim(`debt_note`)) BETWEEN 1 AND 500
			AND `debtor_collaborator` IS NULL
			AND `settlement_id` IS NOT NULL
		) OR (
			`checkout_method` = 'colaborador'
			AND `debtor_collaborator` IS NOT NULL
			AND length(trim(`debtor_collaborator`)) BETWEEN 1 AND 100
			AND (`debt_note` IS NULL OR length(trim(`debt_note`)) BETWEEN 1 AND 500)
			AND `settlement_id` IS NOT NULL
		))
	)),
	CONSTRAINT "sales_total_clp_positive" CHECK(`total_clp` > 0)
);--> statement-breakpoint
CREATE TABLE `__next_sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`unit_price_clp` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_clp` integer NOT NULL,
	CONSTRAINT "sale_items_unit_price_positive" CHECK(`unit_price_clp` > 0),
	CONSTRAINT "sale_items_quantity_allowed" CHECK(`quantity` BETWEEN 1 AND 99),
	CONSTRAINT "sale_items_line_total_valid" CHECK(`line_total_clp` = `unit_price_clp` * `quantity`),
	FOREIGN KEY (`sale_id`) REFERENCES `__next_sales`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__next_sales` (
	`id`, `created_at`, `business_date`, `shift`, `payment_status`,
	`checkout_method`, `payment_method`, `debt_note`, `debtor_collaborator`,
	`paid_at`, `settlement_id`, `seller`, `total_clp`
)
SELECT
	`id`, `created_at`, NULL, NULL, `payment_status`,
	CASE
		WHEN `payment_status` = 'pending' OR `settlement_id` IS NOT NULL THEN 'pendiente'
		WHEN `payment_method` IN ('debito', 'credito') THEN 'tarjeta'
		ELSE `payment_method`
	END,
	`payment_method`,
	`debt_note`, NULL, `paid_at`, `settlement_id`, `seller`, `total_clp`
FROM `sales`;--> statement-breakpoint
INSERT INTO `__next_sale_items` (
	`id`, `sale_id`, `product_id`, `product_name`, `unit_price_clp`,
	`quantity`, `line_total_clp`
)
SELECT `id`, `sale_id`, `product_id`, `product_name`, `unit_price_clp`,
	`quantity`, `line_total_clp`
FROM `sale_items`;--> statement-breakpoint
DROP TABLE `sale_items`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__next_sales` RENAME TO `sales`;--> statement-breakpoint
ALTER TABLE `__next_sale_items` RENAME TO `sale_items`;--> statement-breakpoint
CREATE TABLE `sale_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`business_date` text,
	`shift` text,
	`payment_method` text NOT NULL,
	`amount_clp` integer NOT NULL,
	`received_by` text,
	`kind` text NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sale_payments_context_valid" CHECK((
		`business_date` IS NULL AND `shift` IS NULL AND `received_by` IS NULL
	) OR (
		`business_date` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
		AND `shift` IN ('am', 'pm')
		AND `received_by` IS NOT NULL
		AND length(trim(`received_by`)) BETWEEN 1 AND 100
	)),
	CONSTRAINT "sale_payments_method_allowed" CHECK(`payment_method` IN ('efectivo', 'tarjeta', 'transferencia')),
	CONSTRAINT "sale_payments_amount_positive" CHECK(`amount_clp` > 0),
	CONSTRAINT "sale_payments_kind_allowed" CHECK(`kind` IN ('direct', 'settlement'))
);--> statement-breakpoint
INSERT INTO `sale_payments` (
	`id`, `sale_id`, `created_at`, `business_date`, `shift`, `payment_method`,
	`amount_clp`, `received_by`, `kind`
)
SELECT
	CASE WHEN `settlement_id` IS NULL THEN 'direct:' || `id` ELSE 'settlement:' || `settlement_id` END,
	`id`, `paid_at`, NULL, NULL,
	CASE WHEN `payment_method` IN ('debito', 'credito') THEN 'tarjeta' ELSE `payment_method` END,
	`total_clp`, NULL,
	CASE WHEN `settlement_id` IS NULL THEN 'direct' ELSE 'settlement' END
FROM `sales`
WHERE `payment_status` = 'paid';--> statement-breakpoint
CREATE TABLE `cash_closures` (
	`id` text PRIMARY KEY NOT NULL,
	`business_date` text NOT NULL,
	`shift` text NOT NULL,
	`responsible` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`expected_cash_clp` integer NOT NULL,
	`expected_card_clp` integer NOT NULL,
	`expected_transfer_clp` integer NOT NULL,
	`expected_collected_clp` integer NOT NULL,
	`total_sales_clp` integer NOT NULL,
	`sales_count` integer NOT NULL,
	`pending_customer_clp` integer NOT NULL,
	`collaborator_clp` integer NOT NULL,
	`counted_cash_clp` integer NOT NULL,
	`difference_clp` integer NOT NULL,
	`unassigned_sales_clp` integer NOT NULL,
	`unassigned_sales_count` integer NOT NULL,
	`unassigned_payments_clp` integer NOT NULL,
	`unassigned_payments_count` integer NOT NULL,
	`notes` text,
	CONSTRAINT "cash_closures_context_valid" CHECK(`business_date` GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND `shift` IN ('am', 'pm') AND length(trim(`responsible`)) BETWEEN 1 AND 100),
	CONSTRAINT "cash_closures_nonnegative" CHECK(`expected_cash_clp` >= 0 AND `expected_card_clp` >= 0 AND `expected_transfer_clp` >= 0 AND `expected_collected_clp` >= 0 AND `total_sales_clp` >= 0 AND `sales_count` >= 0 AND `pending_customer_clp` >= 0 AND `collaborator_clp` >= 0 AND `counted_cash_clp` >= 0 AND `unassigned_sales_clp` >= 0 AND `unassigned_sales_count` >= 0 AND `unassigned_payments_clp` >= 0 AND `unassigned_payments_count` >= 0),
	CONSTRAINT "cash_closures_collected_total_valid" CHECK(`expected_collected_clp` = `expected_cash_clp` + `expected_card_clp` + `expected_transfer_clp`),
	CONSTRAINT "cash_closures_difference_valid" CHECK(`difference_clp` = `counted_cash_clp` - `expected_cash_clp`)
);--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_business_date_shift` ON `sales` (`business_date`,`shift`);--> statement-breakpoint
CREATE INDEX `idx_sales_paid_at` ON `sales` (`paid_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_pending_created_at` ON `sales` (`created_at`) WHERE `payment_status` = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sales_settlement_id` ON `sales` (`settlement_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_items_sale_id` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sale_payments_sale_id` ON `sale_payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_sale_payments_business_date_shift` ON `sale_payments` (`business_date`,`shift`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_closures_business_date_shift` ON `cash_closures` (`business_date`,`shift`);--> statement-breakpoint
CREATE INDEX `idx_cash_closures_created_at` ON `cash_closures` (`created_at`);--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES ('schema.accounting.backfill.v1', 'v1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(`key`) DO NOTHING;--> statement-breakpoint
PRAGMA foreign_key_check;
