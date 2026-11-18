CREATE TABLE `cash_closure_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`closure_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`expected_revision_number` integer NOT NULL,
	`expected_added_sales_count` integer NOT NULL,
	`expected_inventory_line_count` integer NOT NULL,
	`request_fingerprint` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`included_sales_clp` integer NOT NULL,
	`included_sales_count` integer NOT NULL,
	`opening_cash_clp` integer NOT NULL,
	`cash_collected_clp` integer NOT NULL,
	`card_collected_clp` integer NOT NULL,
	`transfer_collected_clp` integer NOT NULL,
	`total_collected_clp` integer NOT NULL,
	`expected_cash_clp` integer NOT NULL,
	`expected_collected_clp` integer NOT NULL,
	`expenses_clp` integer NOT NULL,
	`adjusted_expected_cash_clp` integer NOT NULL,
	`counted_cash_clp` integer NOT NULL,
	`counted_card_clp` integer NOT NULL,
	`counted_transfer_clp` integer NOT NULL,
	`counted_collected_clp` integer NOT NULL,
	`difference_cash_clp` integer NOT NULL,
	`difference_card_clp` integer NOT NULL,
	`difference_transfer_clp` integer NOT NULL,
	`difference_collected_clp` integer NOT NULL,
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_revisions_shape_valid" CHECK("cash_closure_revisions"."revision_number" = "cash_closure_revisions"."expected_revision_number" + 1
	        AND "cash_closure_revisions"."expected_revision_number" >= 0
	        AND "cash_closure_revisions"."revision_number" BETWEEN 1 AND 50
        AND "cash_closure_revisions"."expected_added_sales_count" BETWEEN 0 AND 5
        AND "cash_closure_revisions"."expected_inventory_line_count" BETWEEN 0 AND 90
        AND length("cash_closure_revisions"."request_fingerprint") = 64
        AND length(trim("cash_closure_revisions"."reason")) BETWEEN 1 AND 1000
        AND "cash_closure_revisions"."included_sales_clp" >= 0
        AND "cash_closure_revisions"."included_sales_count" >= 0
        AND "cash_closure_revisions"."opening_cash_clp" >= 0
        AND "cash_closure_revisions"."cash_collected_clp" >= 0
        AND "cash_closure_revisions"."card_collected_clp" >= 0
        AND "cash_closure_revisions"."transfer_collected_clp" >= 0
        AND "cash_closure_revisions"."total_collected_clp" = "cash_closure_revisions"."cash_collected_clp" + "cash_closure_revisions"."card_collected_clp" + "cash_closure_revisions"."transfer_collected_clp"
        AND "cash_closure_revisions"."expected_cash_clp" = "cash_closure_revisions"."opening_cash_clp" + "cash_closure_revisions"."cash_collected_clp"
        AND "cash_closure_revisions"."expected_collected_clp" = "cash_closure_revisions"."opening_cash_clp" + "cash_closure_revisions"."total_collected_clp"
        AND "cash_closure_revisions"."expenses_clp" >= 0
        AND "cash_closure_revisions"."adjusted_expected_cash_clp" = "cash_closure_revisions"."expected_cash_clp" - "cash_closure_revisions"."expenses_clp"
        AND "cash_closure_revisions"."adjusted_expected_cash_clp" >= 0
        AND "cash_closure_revisions"."counted_cash_clp" >= 0
        AND "cash_closure_revisions"."counted_card_clp" >= 0
        AND "cash_closure_revisions"."counted_transfer_clp" >= 0
        AND "cash_closure_revisions"."counted_collected_clp" = "cash_closure_revisions"."counted_cash_clp" + "cash_closure_revisions"."counted_card_clp" + "cash_closure_revisions"."counted_transfer_clp"
        AND "cash_closure_revisions"."difference_cash_clp" = "cash_closure_revisions"."counted_cash_clp" - "cash_closure_revisions"."adjusted_expected_cash_clp"
        AND "cash_closure_revisions"."difference_card_clp" = "cash_closure_revisions"."counted_card_clp" - "cash_closure_revisions"."card_collected_clp"
        AND "cash_closure_revisions"."difference_transfer_clp" = "cash_closure_revisions"."counted_transfer_clp" - "cash_closure_revisions"."transfer_collected_clp"
        AND "cash_closure_revisions"."difference_collected_clp" = "cash_closure_revisions"."counted_collected_clp" - ("cash_closure_revisions"."expected_collected_clp" - "cash_closure_revisions"."expenses_clp"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_closure_revisions_number` ON `cash_closure_revisions` (`closure_id`,`revision_number`);--> statement-breakpoint
CREATE INDEX `idx_cash_closure_revisions_closure` ON `cash_closure_revisions` (`closure_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cash_closure_revision_inventory` (
	`revision_id` text NOT NULL,
	`item_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`unit` text NOT NULL,
	`location` text NOT NULL,
	`previous_expected_quantity` integer NOT NULL,
	`expected_quantity` integer NOT NULL,
	`sale_consumption_quantity` integer NOT NULL,
	`previous_counted_quantity` integer NOT NULL,
	`counted_quantity` integer NOT NULL,
	`counted_delta_quantity` integer NOT NULL,
	`difference_quantity` integer NOT NULL,
	`live_quantity_before` integer,
	`live_version_token_before` text,
	`live_quantity_after` integer,
	`live_version_token_after` text,
	PRIMARY KEY(`revision_id`, `item_key`),
	FOREIGN KEY (`revision_id`) REFERENCES `cash_closure_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_revision_inventory_shape_valid" CHECK("cash_closure_revision_inventory"."item_type" IN ('product', 'ingredient')
        AND "cash_closure_revision_inventory"."location" IN ('simple', 'vitrina', 'ingredient')
        AND "cash_closure_revision_inventory"."previous_expected_quantity" >= 0
        AND "cash_closure_revision_inventory"."expected_quantity" >= 0
        AND "cash_closure_revision_inventory"."sale_consumption_quantity" >= 0
        AND "cash_closure_revision_inventory"."expected_quantity" = "cash_closure_revision_inventory"."previous_expected_quantity" - "cash_closure_revision_inventory"."sale_consumption_quantity"
        AND "cash_closure_revision_inventory"."previous_counted_quantity" >= 0
        AND "cash_closure_revision_inventory"."counted_quantity" >= 0
        AND "cash_closure_revision_inventory"."counted_delta_quantity" = "cash_closure_revision_inventory"."counted_quantity" - "cash_closure_revision_inventory"."previous_counted_quantity"
        AND "cash_closure_revision_inventory"."difference_quantity" = "cash_closure_revision_inventory"."counted_quantity" - "cash_closure_revision_inventory"."expected_quantity"
        AND (
          ("cash_closure_revision_inventory"."counted_delta_quantity" = 0
            AND "cash_closure_revision_inventory"."live_quantity_before" IS NULL
            AND "cash_closure_revision_inventory"."live_version_token_before" IS NULL
            AND "cash_closure_revision_inventory"."live_quantity_after" IS NULL
            AND "cash_closure_revision_inventory"."live_version_token_after" IS NULL)
          OR
          ("cash_closure_revision_inventory"."counted_delta_quantity" <> 0
            AND "cash_closure_revision_inventory"."live_quantity_before" >= 0
            AND length("cash_closure_revision_inventory"."live_version_token_before") BETWEEN 1 AND 100
            AND "cash_closure_revision_inventory"."live_quantity_after" = "cash_closure_revision_inventory"."live_quantity_before" + "cash_closure_revision_inventory"."counted_delta_quantity"
            AND "cash_closure_revision_inventory"."live_quantity_after" >= 0
            AND length("cash_closure_revision_inventory"."live_version_token_after") BETWEEN 1 AND 100)
        ))
);
--> statement-breakpoint
CREATE INDEX `idx_cash_closure_revision_inventory_item` ON `cash_closure_revision_inventory` (`item_type`,`item_id`);--> statement-breakpoint
CREATE TABLE `cash_closure_revision_sales` (
	`revision_id` text NOT NULL,
	`sale_id` text NOT NULL,
	`created_at` text NOT NULL,
	`payment_method` text NOT NULL,
	`total_clp` integer NOT NULL,
	PRIMARY KEY(`revision_id`, `sale_id`),
	FOREIGN KEY (`revision_id`) REFERENCES `cash_closure_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_revision_sales_shape_valid" CHECK("cash_closure_revision_sales"."payment_method" IN ('efectivo', 'tarjeta', 'transferencia')
        AND "cash_closure_revision_sales"."total_clp" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cash_closure_revision_sales_sale` ON `cash_closure_revision_sales` (`sale_id`);--> statement-breakpoint
CREATE TABLE `cash_closure_revision_seals` (
	`revision_id` text PRIMARY KEY NOT NULL,
	`sealed_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`request_fingerprint` text NOT NULL,
	FOREIGN KEY (`revision_id`) REFERENCES `cash_closure_revisions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "cash_closure_revision_seals_fingerprint_valid" CHECK(length("cash_closure_revision_seals"."request_fingerprint") = 64)
);
--> statement-breakpoint
ALTER TABLE `cash_closure_validations` ADD COLUMN `revision_number` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `cash_closure_validations` ADD COLUMN `request_fingerprint` text;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_insert_guard
BEFORE INSERT ON cash_closure_revisions
WHEN NOT EXISTS (
  SELECT 1 FROM cash_closures AS closure
  INNER JOIN shift_sessions AS session ON session.id = closure.session_id
  WHERE closure.id = NEW.closure_id
    AND closure.closure_contract_version = 2
    AND session.status = 'closed'
)
OR EXISTS (
  SELECT 1 FROM cash_closure_validations
  WHERE closure_id = NEW.closure_id
)
OR NEW.expected_revision_number IS NOT COALESCE((
  SELECT MAX(revision_number) FROM cash_closure_revisions
  WHERE closure_id = NEW.closure_id
), 0)
OR NEW.revision_number IS NOT NEW.expected_revision_number + 1
OR NEW.revision_number > 50
OR (
  NEW.expected_revision_number > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_closure_revisions AS head
    INNER JOIN cash_closure_revision_seals AS seal
      ON seal.revision_id = head.id
    WHERE head.closure_id = NEW.closure_id
      AND head.revision_number = NEW.expected_revision_number
      AND seal.request_fingerprint = head.request_fingerprint
  )
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision conflict');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_no_update
BEFORE UPDATE ON cash_closure_revisions BEGIN
  SELECT RAISE(ABORT, 'cash closure revision is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revisions_no_delete
BEFORE DELETE ON cash_closure_revisions BEGIN
  SELECT RAISE(ABORT, 'cash closure revision is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_no_update
BEFORE UPDATE ON cash_closure_revision_sales BEGIN
  SELECT RAISE(ABORT, 'cash closure revision sale is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_no_delete
BEFORE DELETE ON cash_closure_revision_sales BEGIN
  SELECT RAISE(ABORT, 'cash closure revision sale is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_no_update
BEFORE UPDATE ON cash_closure_revision_inventory BEGIN
  SELECT RAISE(ABORT, 'cash closure revision inventory is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_no_delete
BEFORE DELETE ON cash_closure_revision_inventory BEGIN
  SELECT RAISE(ABORT, 'cash closure revision inventory is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_sales_no_update
BEFORE UPDATE ON sales
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales
  WHERE sale_id = OLD.id OR sale_id = NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_sales_no_delete
BEFORE DELETE ON sales
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_items_no_insert
BEFORE INSERT ON sale_items
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = NEW.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_items_no_update
BEFORE UPDATE ON sale_items
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales
  WHERE sale_id = OLD.sale_id OR sale_id = NEW.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_items_no_delete
BEFORE DELETE ON sale_items
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_payments_no_insert
BEFORE INSERT ON sale_payments
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = NEW.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_payments_no_update
BEFORE UPDATE ON sale_payments
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales
  WHERE sale_id = OLD.sale_id OR sale_id = NEW.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_ledger_payments_no_delete
BEFORE DELETE ON sale_payments
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_sales WHERE sale_id = OLD.sale_id
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision ledger is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_sales_insert_guard
BEFORE INSERT ON cash_closure_revision_sales
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_seals
  WHERE revision_id = NEW.revision_id
) OR (
  SELECT COUNT(*) FROM cash_closure_revision_sales
  WHERE revision_id = NEW.revision_id
) >= COALESCE((
  SELECT expected_added_sales_count FROM cash_closure_revisions
  WHERE id = NEW.revision_id
), 0)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision sales are sealed');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_inventory_insert_guard
BEFORE INSERT ON cash_closure_revision_inventory
WHEN EXISTS (
  SELECT 1 FROM cash_closure_revision_seals
  WHERE revision_id = NEW.revision_id
) OR (
  SELECT COUNT(*) FROM cash_closure_revision_inventory
  WHERE revision_id = NEW.revision_id
) >= COALESCE((
  SELECT expected_inventory_line_count FROM cash_closure_revisions
  WHERE id = NEW.revision_id
), 0)
BEGIN
  SELECT RAISE(ABORT, 'cash closure revision inventory is sealed');
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_cash_closure_revision_seals_insert_semantic_v2;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_insert_semantic_v2
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
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_no_update
BEFORE UPDATE ON cash_closure_revision_seals BEGIN
  SELECT RAISE(ABORT, 'cash closure revision seal is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_cash_closure_revision_seals_no_delete
BEFORE DELETE ON cash_closure_revision_seals BEGIN
  SELECT RAISE(ABORT, 'cash closure revision seal is immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS
  trg_cash_closure_validations_insert_latest_revision_v2
BEFORE INSERT ON cash_closure_validations
WHEN NEW.revision_number IS NOT COALESCE((
  SELECT MAX(revision_number) FROM cash_closure_revisions
  WHERE closure_id = NEW.closure_id
), 0)
OR (
  NEW.revision_number = 0 AND NEW.request_fingerprint IS NOT NULL
)
OR (
  NEW.revision_number > 0
  AND (
    NEW.request_fingerprint IS NULL
    OR length(NEW.request_fingerprint) <> 64
    OR NOT EXISTS (
      SELECT 1
      FROM cash_closure_revisions AS revision
      INNER JOIN cash_closure_revision_seals AS seal
        ON seal.revision_id = revision.id
      WHERE revision.closure_id = NEW.closure_id
        AND revision.revision_number = NEW.revision_number
        AND seal.request_fingerprint = revision.request_fingerprint
        AND revision.request_fingerprint = NEW.request_fingerprint
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'cash closure validation revision conflict');
END;
--> statement-breakpoint
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES (
  'schema.migration.cash-closure-revisions-v2', 'v2',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(`key`) DO UPDATE SET
  `value` = excluded.`value`, `updated_at` = excluded.`updated_at`;
--> statement-breakpoint
PRAGMA optimize;
