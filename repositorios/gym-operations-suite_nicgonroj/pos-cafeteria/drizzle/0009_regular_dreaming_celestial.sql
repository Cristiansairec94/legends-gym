CREATE TABLE `cash_closure_expenses` (
	`closure_id` text NOT NULL,
	`id` text NOT NULL,
	`description` text NOT NULL,
	`amount_clp` integer NOT NULL,
	PRIMARY KEY(`closure_id`, `id`),
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_expenses_shape_valid" CHECK(length(trim("cash_closure_expenses"."id")) BETWEEN 1 AND 100
        AND length(trim("cash_closure_expenses"."description")) BETWEEN 1 AND 200
        AND "cash_closure_expenses"."amount_clp" > 0)
);
--> statement-breakpoint
CREATE TABLE `cash_closure_validations` (
	`closure_id` text PRIMARY KEY NOT NULL,
	`validated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`comment` text,
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_validations_comment_valid" CHECK("cash_closure_validations"."comment" IS NULL OR length(trim("cash_closure_validations"."comment")) BETWEEN 1 AND 1000)
);
--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `closure_contract_version` integer;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `expenses_clp` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `adjusted_expected_cash_clp` integer;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `adjusted_difference_clp` integer;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `adjusted_difference_collected_clp` integer;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `handoff_financial_difference_reason` text;--> statement-breakpoint
ALTER TABLE `cash_closures` ADD `handoff_comments` text;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closures_v2_snapshot_guard`
BEFORE INSERT ON `cash_closures`
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
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closures_no_update`
BEFORE UPDATE ON `cash_closures` BEGIN
  SELECT RAISE(ABORT, 'cash closure is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closures_no_delete`
BEFORE DELETE ON `cash_closures` BEGIN
  SELECT RAISE(ABORT, 'cash closure is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_inventory_no_update`
BEFORE UPDATE ON `cash_closure_inventory` BEGIN
  SELECT RAISE(ABORT, 'cash closure inventory is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_inventory_no_delete`
BEFORE DELETE ON `cash_closure_inventory` BEGIN
  SELECT RAISE(ABORT, 'cash closure inventory is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_inventory_insert_open_only`
BEFORE INSERT ON `cash_closure_inventory`
WHEN NOT EXISTS (
  SELECT 1 FROM `cash_closures` AS closure
  INNER JOIN `shift_sessions` AS session ON session.id = closure.session_id
  WHERE closure.id = NEW.closure_id AND session.status = 'open'
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure inventory snapshot is sealed');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_debts_no_update`
BEFORE UPDATE ON `cash_closure_debts` BEGIN
  SELECT RAISE(ABORT, 'cash closure debts are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_debts_no_delete`
BEFORE DELETE ON `cash_closure_debts` BEGIN
  SELECT RAISE(ABORT, 'cash closure debts are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_debts_insert_open_only`
BEFORE INSERT ON `cash_closure_debts`
WHEN NOT EXISTS (
  SELECT 1 FROM `cash_closures` AS closure
  INNER JOIN `shift_sessions` AS session ON session.id = closure.session_id
  WHERE closure.id = NEW.closure_id AND session.status = 'open'
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure debt snapshot is sealed');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_expenses_no_update`
BEFORE UPDATE ON `cash_closure_expenses` BEGIN
  SELECT RAISE(ABORT, 'cash closure expenses are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_expenses_no_delete`
BEFORE DELETE ON `cash_closure_expenses` BEGIN
  SELECT RAISE(ABORT, 'cash closure expenses are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_expenses_insert_open_only`
BEFORE INSERT ON `cash_closure_expenses`
WHEN NOT EXISTS (
  SELECT 1 FROM `cash_closures` AS closure
  INNER JOIN `shift_sessions` AS session ON session.id = closure.session_id
  WHERE closure.id = NEW.closure_id AND session.status = 'open'
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure expense snapshot is sealed');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_validations_no_update`
BEFORE UPDATE ON `cash_closure_validations` BEGIN
  SELECT RAISE(ABORT, 'cash closure validation is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_validations_no_delete`
BEFORE DELETE ON `cash_closure_validations` BEGIN
  SELECT RAISE(ABORT, 'cash closure validation is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_validations_insert_closed_only`
BEFORE INSERT ON `cash_closure_validations`
WHEN NOT EXISTS (
  SELECT 1 FROM `cash_closures` AS closure
  INNER JOIN `shift_sessions` AS session ON session.id = closure.session_id
  WHERE closure.id = NEW.closure_id
    AND closure.closure_contract_version = 2
    AND session.status = 'closed'
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure is not ready for validation');
END;--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES (
  'schema.migration.cash-closure-v2', 'v2',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(`key`) DO UPDATE SET
  `value` = excluded.`value`, `updated_at` = excluded.`updated_at`;--> statement-breakpoint
PRAGMA optimize;
