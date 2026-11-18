PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `cash_closure_debts` (
	`closure_id` text NOT NULL,
	`sale_id` text NOT NULL,
	`debt_type` text NOT NULL,
	`created_at` text NOT NULL,
	`debt_note` text,
	`debtor_collaborator` text,
	`amount_clp` integer NOT NULL,
	PRIMARY KEY(`closure_id`, `sale_id`),
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_debts_shape_valid" CHECK("cash_closure_debts"."debt_type" IN ('pendiente', 'colaborador')
        AND "cash_closure_debts"."amount_clp" > 0
        AND (
          (
            "cash_closure_debts"."debt_type" = 'pendiente'
            AND "cash_closure_debts"."debt_note" IS NOT NULL
            AND length(trim("cash_closure_debts"."debt_note")) BETWEEN 1 AND 500
            AND "cash_closure_debts"."debtor_collaborator" IS NULL
          ) OR (
            "cash_closure_debts"."debt_type" = 'colaborador'
            AND "cash_closure_debts"."debtor_collaborator" IS NOT NULL
            AND length(trim("cash_closure_debts"."debtor_collaborator")) BETWEEN 1 AND 100
            AND (
              "cash_closure_debts"."debt_note" IS NULL
              OR length(trim("cash_closure_debts"."debt_note")) BETWEEN 1 AND 500
            )
          )
        ))
);
--> statement-breakpoint
CREATE INDEX `idx_cash_closure_debts_type` ON `cash_closure_debts` (`closure_id`,`debt_type`);--> statement-breakpoint
CREATE TABLE `cash_closure_inventory` (
	`closure_id` text NOT NULL,
	`item_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`unit` text NOT NULL,
	`location` text NOT NULL,
	`expected_version_token` text NOT NULL,
	`expected_quantity` integer NOT NULL,
	`counted_quantity` integer NOT NULL,
	`difference_quantity` integer NOT NULL,
	`reason` text,
	PRIMARY KEY(`closure_id`, `item_key`),
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_inventory_shape_valid" CHECK("cash_closure_inventory"."item_type" IN ('product', 'ingredient')
        AND "cash_closure_inventory"."location" IN ('simple', 'vitrina', 'bodega', 'ingredient')
        AND length("cash_closure_inventory"."expected_version_token") BETWEEN 1 AND 100
        AND "cash_closure_inventory"."expected_quantity" >= 0
        AND "cash_closure_inventory"."counted_quantity" >= 0
        AND "cash_closure_inventory"."difference_quantity" = "cash_closure_inventory"."counted_quantity" - "cash_closure_inventory"."expected_quantity"
        AND (
          ("cash_closure_inventory"."difference_quantity" = 0 AND "cash_closure_inventory"."reason" IS NULL)
          OR (
            "cash_closure_inventory"."difference_quantity" <> 0
            AND "cash_closure_inventory"."reason" IS NOT NULL
            AND length(trim("cash_closure_inventory"."reason")) BETWEEN 1 AND 500
          )
        ))
);
--> statement-breakpoint
CREATE INDEX `idx_cash_closure_inventory_item` ON `cash_closure_inventory` (`item_type`,`item_id`);--> statement-breakpoint
CREATE TABLE `shift_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`business_date` text NOT NULL,
	`shift` text NOT NULL,
	`responsible` text NOT NULL,
	`opening_cash_clp` integer NOT NULL,
	`activity_revision` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`active_slot` integer,
	`opened_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`closed_at` text,
	`closure_id` text,
	CONSTRAINT "shift_sessions_context_valid" CHECK("shift_sessions"."business_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND "shift_sessions"."shift" IN ('am', 'pm')
        AND length(trim("shift_sessions"."responsible")) BETWEEN 1 AND 100),
	CONSTRAINT "shift_sessions_counters_valid" CHECK("shift_sessions"."opening_cash_clp" >= 0 AND "shift_sessions"."activity_revision" >= 0),
	CONSTRAINT "shift_sessions_state_valid" CHECK((
        "shift_sessions"."status" = 'open'
        AND "shift_sessions"."active_slot" = 1
        AND "shift_sessions"."closed_at" IS NULL
        AND "shift_sessions"."closure_id" IS NULL
      ) OR (
        "shift_sessions"."status" = 'closed'
        AND "shift_sessions"."active_slot" IS NULL
        AND "shift_sessions"."closed_at" IS NOT NULL
        AND "shift_sessions"."closure_id" IS NOT NULL
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_shift_sessions_business_date_shift` ON `shift_sessions` (`business_date`,`shift`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_shift_sessions_active_slot` ON `shift_sessions` (`active_slot`);--> statement-breakpoint
CREATE INDEX `idx_shift_sessions_opened_at` ON `shift_sessions` (`opened_at`);--> statement-breakpoint
CREATE TABLE `__new_cash_closures` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`session_activity_revision` integer,
	`request_fingerprint` text,
	`business_date` text NOT NULL,
	`shift` text NOT NULL,
	`responsible` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`expected_cash_clp` integer NOT NULL,
	`opening_cash_clp` integer,
	`cash_movements_clp` integer,
	`expected_card_clp` integer NOT NULL,
	`expected_transfer_clp` integer NOT NULL,
	`expected_collected_clp` integer NOT NULL,
	`total_sales_clp` integer NOT NULL,
	`sales_count` integer NOT NULL,
	`pending_customer_clp` integer NOT NULL,
	`pending_customer_count` integer,
	`collaborator_clp` integer NOT NULL,
	`collaborator_count` integer,
	`counted_cash_clp` integer NOT NULL,
	`difference_clp` integer NOT NULL,
	`counted_card_clp` integer,
	`difference_card_clp` integer,
	`counted_transfer_clp` integer,
	`difference_transfer_clp` integer,
	`counted_collected_clp` integer,
	`difference_collected_clp` integer,
	`financial_difference_reason` text,
	`cash_reconciled` integer,
	`card_reconciled` integer,
	`transfer_reconciled` integer,
	`pending_customer_reviewed` integer,
	`collaborator_reviewed` integer,
	`inventory_count_confirmed` integer,
	`checklist_version` integer,
	`unassigned_sales_clp` integer NOT NULL,
	`unassigned_sales_count` integer NOT NULL,
	`unassigned_payments_clp` integer NOT NULL,
	`unassigned_payments_count` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`session_id`) REFERENCES `shift_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closures_context_valid" CHECK("__new_cash_closures"."business_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND "__new_cash_closures"."shift" IN ('am', 'pm')
        AND length(trim("__new_cash_closures"."responsible")) BETWEEN 1 AND 100),
	CONSTRAINT "cash_closures_nonnegative" CHECK("__new_cash_closures"."expected_cash_clp" >= 0
        AND "__new_cash_closures"."expected_card_clp" >= 0
        AND "__new_cash_closures"."expected_transfer_clp" >= 0
        AND "__new_cash_closures"."expected_collected_clp" >= 0
        AND "__new_cash_closures"."total_sales_clp" >= 0
        AND "__new_cash_closures"."sales_count" >= 0
        AND "__new_cash_closures"."pending_customer_clp" >= 0
        AND "__new_cash_closures"."collaborator_clp" >= 0
        AND "__new_cash_closures"."counted_cash_clp" >= 0
        AND "__new_cash_closures"."unassigned_sales_clp" >= 0
        AND "__new_cash_closures"."unassigned_sales_count" >= 0
        AND "__new_cash_closures"."unassigned_payments_clp" >= 0
        AND "__new_cash_closures"."unassigned_payments_count" >= 0),
	CONSTRAINT "cash_closures_collected_total_valid" CHECK("__new_cash_closures"."expected_collected_clp" = "__new_cash_closures"."expected_cash_clp" + "__new_cash_closures"."expected_card_clp" + "__new_cash_closures"."expected_transfer_clp"),
	CONSTRAINT "cash_closures_difference_valid" CHECK("__new_cash_closures"."difference_clp" = "__new_cash_closures"."counted_cash_clp" - "__new_cash_closures"."expected_cash_clp"),
	CONSTRAINT "cash_closures_formal_state_valid" CHECK((
        "__new_cash_closures"."session_id" IS NULL
        AND "__new_cash_closures"."session_activity_revision" IS NULL
        AND "__new_cash_closures"."request_fingerprint" IS NULL
        AND "__new_cash_closures"."opening_cash_clp" IS NULL
        AND "__new_cash_closures"."cash_movements_clp" IS NULL
        AND "__new_cash_closures"."pending_customer_count" IS NULL
        AND "__new_cash_closures"."collaborator_count" IS NULL
        AND "__new_cash_closures"."counted_card_clp" IS NULL
        AND "__new_cash_closures"."difference_card_clp" IS NULL
        AND "__new_cash_closures"."counted_transfer_clp" IS NULL
        AND "__new_cash_closures"."difference_transfer_clp" IS NULL
        AND "__new_cash_closures"."counted_collected_clp" IS NULL
        AND "__new_cash_closures"."difference_collected_clp" IS NULL
        AND "__new_cash_closures"."financial_difference_reason" IS NULL
        AND "__new_cash_closures"."cash_reconciled" IS NULL
        AND "__new_cash_closures"."card_reconciled" IS NULL
        AND "__new_cash_closures"."transfer_reconciled" IS NULL
        AND "__new_cash_closures"."pending_customer_reviewed" IS NULL
        AND "__new_cash_closures"."collaborator_reviewed" IS NULL
        AND "__new_cash_closures"."inventory_count_confirmed" IS NULL
        AND "__new_cash_closures"."checklist_version" IS NULL
      ) OR (
        "__new_cash_closures"."session_id" IS NOT NULL
        AND "__new_cash_closures"."session_activity_revision" >= 0
        AND length("__new_cash_closures"."request_fingerprint") = 64
        AND "__new_cash_closures"."opening_cash_clp" >= 0
        AND "__new_cash_closures"."cash_movements_clp" >= 0
        AND "__new_cash_closures"."expected_cash_clp" = "__new_cash_closures"."opening_cash_clp" + "__new_cash_closures"."cash_movements_clp"
        AND "__new_cash_closures"."pending_customer_count" >= 0
        AND "__new_cash_closures"."collaborator_count" >= 0
        AND "__new_cash_closures"."counted_card_clp" >= 0
        AND "__new_cash_closures"."difference_card_clp" = "__new_cash_closures"."counted_card_clp" - "__new_cash_closures"."expected_card_clp"
        AND "__new_cash_closures"."counted_transfer_clp" >= 0
        AND "__new_cash_closures"."difference_transfer_clp" = "__new_cash_closures"."counted_transfer_clp" - "__new_cash_closures"."expected_transfer_clp"
        AND "__new_cash_closures"."counted_collected_clp" = "__new_cash_closures"."counted_cash_clp" + "__new_cash_closures"."counted_card_clp" + "__new_cash_closures"."counted_transfer_clp"
        AND "__new_cash_closures"."difference_collected_clp" = "__new_cash_closures"."counted_collected_clp" - "__new_cash_closures"."expected_collected_clp"
        AND "__new_cash_closures"."difference_collected_clp" = "__new_cash_closures"."difference_clp" + "__new_cash_closures"."difference_card_clp" + "__new_cash_closures"."difference_transfer_clp"
        AND "__new_cash_closures"."cash_reconciled" = 1
        AND "__new_cash_closures"."card_reconciled" = 1
        AND "__new_cash_closures"."transfer_reconciled" = 1
        AND "__new_cash_closures"."pending_customer_reviewed" = 1
        AND "__new_cash_closures"."collaborator_reviewed" = 1
        AND "__new_cash_closures"."inventory_count_confirmed" = 1
        AND "__new_cash_closures"."checklist_version" = 1
        AND (
          (
            "__new_cash_closures"."difference_clp" = 0
            AND "__new_cash_closures"."difference_card_clp" = 0
            AND "__new_cash_closures"."difference_transfer_clp" = 0
            AND "__new_cash_closures"."financial_difference_reason" IS NULL
          ) OR (
            (
              "__new_cash_closures"."difference_clp" <> 0
              OR "__new_cash_closures"."difference_card_clp" <> 0
              OR "__new_cash_closures"."difference_transfer_clp" <> 0
            )
            AND "__new_cash_closures"."financial_difference_reason" IS NOT NULL
            AND length(trim("__new_cash_closures"."financial_difference_reason")) BETWEEN 1 AND 500
          )
        )
      ))
);
--> statement-breakpoint
INSERT INTO `__new_cash_closures` (
	`id`, `session_id`, `session_activity_revision`, `request_fingerprint`,
	`business_date`, `shift`, `responsible`, `created_at`, `expected_cash_clp`,
	`opening_cash_clp`, `cash_movements_clp`, `expected_card_clp`,
	`expected_transfer_clp`, `expected_collected_clp`, `total_sales_clp`,
	`sales_count`, `pending_customer_clp`, `pending_customer_count`,
	`collaborator_clp`, `collaborator_count`, `counted_cash_clp`,
	`difference_clp`, `counted_card_clp`, `difference_card_clp`,
	`counted_transfer_clp`, `difference_transfer_clp`,
	`counted_collected_clp`, `difference_collected_clp`,
	`financial_difference_reason`, `cash_reconciled`, `card_reconciled`,
	`transfer_reconciled`, `pending_customer_reviewed`,
	`collaborator_reviewed`, `inventory_count_confirmed`, `checklist_version`,
	`unassigned_sales_clp`, `unassigned_sales_count`,
	`unassigned_payments_clp`, `unassigned_payments_count`, `notes`
)
SELECT
	`id`, NULL, NULL, NULL, `business_date`, `shift`, `responsible`, `created_at`,
	`expected_cash_clp`, NULL, NULL, `expected_card_clp`,
	`expected_transfer_clp`, `expected_collected_clp`, `total_sales_clp`,
	`sales_count`, `pending_customer_clp`, NULL, `collaborator_clp`, NULL,
	`counted_cash_clp`, `difference_clp`, NULL, NULL, NULL, NULL, NULL, NULL,
	NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
	`unassigned_sales_clp`, `unassigned_sales_count`,
	`unassigned_payments_clp`, `unassigned_payments_count`, `notes`
FROM `cash_closures`;--> statement-breakpoint
DROP TABLE `cash_closures`;--> statement-breakpoint
ALTER TABLE `__new_cash_closures` RENAME TO `cash_closures`;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_closures_business_date_shift` ON `cash_closures` (`business_date`,`shift`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_closures_session_id` ON `cash_closures` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_cash_closures_created_at` ON `cash_closures` (`created_at`);--> statement-breakpoint
ALTER TABLE `sale_payments` ADD `shift_session_id` text REFERENCES shift_sessions(id) ON UPDATE no action ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `idx_sale_payments_shift_session_id` ON `sale_payments` (`shift_session_id`);--> statement-breakpoint
ALTER TABLE `sales` ADD `shift_session_id` text REFERENCES shift_sessions(id) ON UPDATE no action ON DELETE restrict;--> statement-breakpoint
CREATE INDEX `idx_sales_shift_session_id` ON `sales` (`shift_session_id`);
--> statement-breakpoint
CREATE TRIGGER `trg_shift_sessions_immutable_assignment`
BEFORE UPDATE OF `business_date`, `shift`, `responsible`, `opening_cash_clp`, `opened_at`
ON `shift_sessions`
WHEN OLD.`business_date` <> NEW.`business_date`
  OR OLD.`shift` <> NEW.`shift`
  OR OLD.`responsible` <> NEW.`responsible`
  OR OLD.`opening_cash_clp` <> NEW.`opening_cash_clp`
  OR OLD.`opened_at` <> NEW.`opened_at`
BEGIN
  SELECT RAISE(ABORT, 'shift session assignment is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_shift_sessions_no_reopen`
BEFORE UPDATE OF `status` ON `shift_sessions`
WHEN OLD.`status` = 'closed' AND NEW.`status` <> 'closed'
BEGIN
  SELECT RAISE(ABORT, 'closed shift session cannot be reopened');
END;--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES ('schema.migration.formal-shift-v1', 'v1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(`key`) DO UPDATE SET
  `value` = excluded.`value`,
  `updated_at` = excluded.`updated_at`;--> statement-breakpoint
PRAGMA foreign_key_check;
