DROP TRIGGER IF EXISTS `trg_sale_payments_no_overpayment`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `trg_cash_closure_revision_ledger_payments_no_insert`;--> statement-breakpoint
DROP TRIGGER IF EXISTS `trg_cash_closure_revision_seals_insert_semantic_v2`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sales` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`business_date` text,
	`shift` text,
	`shift_session_id` text,
	`payment_status` text DEFAULT 'paid' NOT NULL,
	`checkout_method` text NOT NULL,
	`payment_method` text,
	`debt_note` text,
	`debtor_collaborator` text,
	`paid_at` text,
	`settlement_id` text,
	`seller` text,
	`total_clp` integer NOT NULL,
	FOREIGN KEY (`shift_session_id`) REFERENCES `shift_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "sales_payment_status_allowed" CHECK("__new_sales"."payment_status" IN ('paid', 'pending', 'verification_pending')),
	CONSTRAINT "sales_shift_context_valid" CHECK((
        "__new_sales"."business_date" IS NULL AND "__new_sales"."shift" IS NULL
      ) OR (
        "__new_sales"."business_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND "__new_sales"."shift" IN ('am', 'pm')
      )),
	CONSTRAINT "sales_checkout_method_allowed" CHECK("__new_sales"."checkout_method" IN ('efectivo', 'tarjeta', 'transferencia', 'pendiente', 'colaborador')),
	CONSTRAINT "sales_payment_state_valid" CHECK((
        "__new_sales"."payment_status" = 'verification_pending'
        AND "__new_sales"."checkout_method" = 'transferencia'
        AND "__new_sales"."payment_method" IS NULL
        AND "__new_sales"."debt_note" IS NULL
        AND "__new_sales"."debtor_collaborator" IS NULL
        AND "__new_sales"."paid_at" IS NULL
        AND "__new_sales"."settlement_id" IS NULL
      ) OR (
        "__new_sales"."payment_status" = 'pending'
        AND "__new_sales"."payment_method" IS NULL
        AND "__new_sales"."paid_at" IS NULL
        AND "__new_sales"."settlement_id" IS NULL
        AND (
          (
            "__new_sales"."checkout_method" = 'pendiente'
            AND "__new_sales"."debt_note" IS NOT NULL
            AND length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
            AND "__new_sales"."debtor_collaborator" IS NULL
          ) OR (
            "__new_sales"."checkout_method" = 'colaborador'
            AND "__new_sales"."debtor_collaborator" IS NOT NULL
            AND length(trim("__new_sales"."debtor_collaborator")) BETWEEN 1 AND 100
            AND (
              "__new_sales"."debt_note" IS NULL
              OR length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
            )
          )
        )
      ) OR (
        "__new_sales"."payment_status" = 'paid'
        AND "__new_sales"."payment_method" IS NOT NULL
        AND "__new_sales"."payment_method" IN ('efectivo', 'tarjeta', 'debito', 'credito', 'transferencia')
        AND "__new_sales"."paid_at" IS NOT NULL
        AND (
          (
            "__new_sales"."checkout_method" IN ('efectivo', 'tarjeta', 'transferencia')
            AND "__new_sales"."debt_note" IS NULL
            AND "__new_sales"."debtor_collaborator" IS NULL
            AND "__new_sales"."settlement_id" IS NULL
          )
          OR (
            "__new_sales"."checkout_method" = 'pendiente'
            AND "__new_sales"."debt_note" IS NOT NULL
            AND length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
            AND "__new_sales"."debtor_collaborator" IS NULL
            AND "__new_sales"."settlement_id" IS NOT NULL
          )
          OR (
            "__new_sales"."checkout_method" = 'colaborador'
            AND "__new_sales"."debtor_collaborator" IS NOT NULL
            AND length(trim("__new_sales"."debtor_collaborator")) BETWEEN 1 AND 100
            AND (
              "__new_sales"."debt_note" IS NULL
              OR length(trim("__new_sales"."debt_note")) BETWEEN 1 AND 500
            )
            AND "__new_sales"."settlement_id" IS NOT NULL
          )
        )
      )),
	CONSTRAINT "sales_total_clp_positive" CHECK("__new_sales"."total_clp" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_sales`("id", "created_at", "business_date", "shift", "shift_session_id", "payment_status", "checkout_method", "payment_method", "debt_note", "debtor_collaborator", "paid_at", "settlement_id", "seller", "total_clp") SELECT "id", "created_at", "business_date", "shift", "shift_session_id", "payment_status", "checkout_method", "payment_method", "debt_note", "debtor_collaborator", "paid_at", "settlement_id", "seller", "total_clp" FROM `sales`;--> statement-breakpoint
DROP TABLE `sales`;--> statement-breakpoint
ALTER TABLE `__new_sales` RENAME TO `sales`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_sales_created_at` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_business_date_shift` ON `sales` (`business_date`,`shift`);--> statement-breakpoint
CREATE INDEX `idx_sales_shift_session_id` ON `sales` (`shift_session_id`);--> statement-breakpoint
CREATE INDEX `idx_sales_paid_at` ON `sales` (`paid_at`);--> statement-breakpoint
CREATE INDEX `idx_sales_pending_created_at` ON `sales` (`created_at`) WHERE "sales"."payment_status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_sales_settlement_id` ON `sales` (`settlement_id`);--> statement-breakpoint
CREATE TABLE `transfer_validations` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` text NOT NULL,
	`shift_session_id` text NOT NULL,
	`validated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`validator_role` text NOT NULL,
	`validated_by` text NOT NULL,
	`email_reference` text NOT NULL,
	`amount_clp` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`shift_session_id`) REFERENCES `shift_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "transfer_validations_shape_valid" CHECK("transfer_validations"."validator_role" IN ('admin', 'sales')
        AND length(trim("transfer_validations"."validated_by")) BETWEEN 1 AND 100
        AND length(trim("transfer_validations"."email_reference")) BETWEEN 1 AND 200
        AND "transfer_validations"."amount_clp" > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_transfer_validations_sale_id` ON `transfer_validations` (`sale_id`);--> statement-breakpoint
CREATE INDEX `idx_transfer_validations_validated_at` ON `transfer_validations` (`validated_at`);--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_transfer_validations_no_update
BEFORE UPDATE ON transfer_validations BEGIN
  SELECT RAISE(ABORT, 'transfer validation is immutable');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_transfer_validations_no_delete
BEFORE DELETE ON transfer_validations BEGIN
  SELECT RAISE(ABORT, 'transfer validation is immutable');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS `trg_sale_payments_no_overpayment`
BEFORE INSERT ON `sale_payments`
WHEN
  NOT EXISTS (SELECT 1 FROM `sales` WHERE `id` = NEW.`sale_id`)
  OR NEW.`amount_clp` > (
    SELECT sale.`total_clp` - COALESCE((
      SELECT SUM(payment.`amount_clp`)
      FROM `sale_payments` AS payment
      WHERE payment.`sale_id` = NEW.`sale_id`
    ), 0)
    FROM `sales` AS sale
    WHERE sale.`id` = NEW.`sale_id`
  )
  OR (
    NEW.`kind` = 'direct'
    AND NEW.`amount_clp` <> (
      SELECT `total_clp` FROM `sales` WHERE `id` = NEW.`sale_id`
    )
  )
BEGIN
  SELECT RAISE(ABORT, 'payment exceeds sale balance');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_payments_no_insert
BEFORE INSERT ON sale_payments
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = NEW.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_sales_no_update
BEFORE UPDATE ON sales
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales
  WHERE sale_id = OLD.id OR sale_id = NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_sales_no_delete
BEFORE DELETE ON sales
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;--> statement-breakpoint
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
END;
