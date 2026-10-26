DROP INDEX IF EXISTS `uq_sale_payments_sale_id`;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_sale_payments_sale_id` ON `sale_payments` (`sale_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `uq_sale_payments_direct_sale_id` ON `sale_payments` (`sale_id`) WHERE "sale_payments"."kind" = 'direct';--> statement-breakpoint
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
INSERT INTO `app_meta` (`key`, `value`, `updated_at`)
VALUES ('schema.migration.partial-payments-v1', 'v1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(`key`) DO UPDATE SET
  `value` = excluded.`value`,
  `updated_at` = excluded.`updated_at`;--> statement-breakpoint
PRAGMA foreign_key_check;
