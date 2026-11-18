CREATE TABLE `closure_incident_events` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`event_type` text NOT NULL,
	`status` text,
	`actor_role` text NOT NULL,
	`actor_name` text NOT NULL,
	`comment` text,
	`request_fingerprint` text NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `closure_incidents`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_incident_events_shape_valid" CHECK("closure_incident_events"."event_type" IN (
          'created', 'clarification_requested', 'comment_added', 'clarified',
          'validated', 'requires_correction', 'correction_applied',
          'notification_retry'
        )
        AND (
          "closure_incident_events"."status" IS NULL OR "closure_incident_events"."status" IN (
            'pending_clarification', 'clarified', 'validated',
            'requires_correction'
          )
        )
        AND "closure_incident_events"."actor_role" IN ('system', 'admin', 'sales')
        AND length(trim("closure_incident_events"."actor_name")) BETWEEN 1 AND 100
        AND ("closure_incident_events"."comment" IS NULL OR length(trim("closure_incident_events"."comment")) BETWEEN 1 AND 1000)
        AND length("closure_incident_events"."request_fingerprint") = 64)
);
--> statement-breakpoint
CREATE INDEX `idx_closure_incident_events_incident_created` ON `closure_incident_events` (`incident_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `closure_incident_items` (
	`incident_id` text NOT NULL,
	`item_key` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`unit` text NOT NULL,
	`location` text NOT NULL,
	`expected_quantity` integer NOT NULL,
	`counted_quantity` integer NOT NULL,
	`difference_quantity` integer NOT NULL,
	`reason_category` text NOT NULL,
	`initial_comment` text NOT NULL,
	`adjustment_applied` integer NOT NULL,
	`unit_value_clp` integer,
	`estimated_value_clp` integer,
	`high_value` integer NOT NULL,
	PRIMARY KEY(`incident_id`, `item_key`),
	FOREIGN KEY (`incident_id`) REFERENCES `closure_incidents`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_incident_items_shape_valid" CHECK("closure_incident_items"."item_type" IN ('product', 'ingredient')
        AND "closure_incident_items"."location" IN ('simple', 'vitrina', 'ingredient')
        AND "closure_incident_items"."expected_quantity" >= 0
        AND "closure_incident_items"."counted_quantity" >= 0
        AND "closure_incident_items"."difference_quantity" <> 0
        AND "closure_incident_items"."difference_quantity" = "closure_incident_items"."counted_quantity" - "closure_incident_items"."expected_quantity"
        AND "closure_incident_items"."reason_category" IN (
          'venta_no_registrada', 'consumo_no_registrado', 'merma',
          'error_conteo', 'reposicion_no_registrada', 'otro'
        )
        AND length(trim("closure_incident_items"."initial_comment")) BETWEEN 1 AND 1000
        AND ("closure_incident_items"."unit_value_clp" IS NULL OR "closure_incident_items"."unit_value_clp" > 0)
        AND ("closure_incident_items"."estimated_value_clp" IS NULL OR "closure_incident_items"."estimated_value_clp" >= 0))
);
--> statement-breakpoint
CREATE INDEX `idx_closure_incident_items_product` ON `closure_incident_items` (`item_type`,`item_id`,`incident_id`);--> statement-breakpoint
CREATE TABLE `closure_incident_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`money_red_threshold_clp` integer DEFAULT 1 NOT NULL,
	`multiple_product_red_count` integer DEFAULT 2 NOT NULL,
	`high_value_product_clp` integer DEFAULT 10000 NOT NULL,
	`recurrence_window_days` integer DEFAULT 30 NOT NULL,
	`recurrence_red_count` integer DEFAULT 2 NOT NULL,
	`reminder_hours` integer DEFAULT 24 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "closure_incident_settings_shape_valid" CHECK("closure_incident_settings"."id" = 'default'
        AND "closure_incident_settings"."money_red_threshold_clp" >= 1
        AND "closure_incident_settings"."multiple_product_red_count" BETWEEN 1 AND 90
        AND "closure_incident_settings"."high_value_product_clp" >= 1
        AND "closure_incident_settings"."recurrence_window_days" BETWEEN 1 AND 365
        AND "closure_incident_settings"."recurrence_red_count" BETWEEN 2 AND 100
        AND "closure_incident_settings"."reminder_hours" BETWEEN 1 AND 720)
);
--> statement-breakpoint
CREATE TABLE `closure_incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`closure_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`business_date` text NOT NULL,
	`shift` text NOT NULL,
	`responsible` text NOT NULL,
	`level` text NOT NULL,
	`classification_reason` text NOT NULL,
	`cash_difference_clp` integer NOT NULL,
	`card_difference_clp` integer NOT NULL,
	`transfer_difference_clp` integer NOT NULL,
	`total_difference_clp` integer NOT NULL,
	`inventory_difference_count` integer NOT NULL,
	`estimated_value_clp` integer NOT NULL,
	`unvalued_item_count` integer NOT NULL,
	`prior_responsible_incident_count` integer NOT NULL,
	`highest_prior_product_incident_count` integer NOT NULL,
	`money_red_threshold_clp` integer NOT NULL,
	`multiple_product_red_count` integer NOT NULL,
	`high_value_product_clp` integer NOT NULL,
	`recurrence_window_days` integer NOT NULL,
	`recurrence_red_count` integer NOT NULL,
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_incidents_shape_valid" CHECK("closure_incidents"."business_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND "closure_incidents"."shift" IN ('am', 'pm')
        AND length(trim("closure_incidents"."responsible")) BETWEEN 1 AND 100
        AND "closure_incidents"."level" IN ('yellow', 'red')
        AND length(trim("closure_incidents"."classification_reason")) BETWEEN 1 AND 500
        AND "closure_incidents"."total_difference_clp" = "closure_incidents"."cash_difference_clp"
          + "closure_incidents"."card_difference_clp" + "closure_incidents"."transfer_difference_clp"
        AND "closure_incidents"."inventory_difference_count" >= 0
        AND "closure_incidents"."estimated_value_clp" >= 0
        AND "closure_incidents"."unvalued_item_count" >= 0
        AND "closure_incidents"."prior_responsible_incident_count" >= 0
        AND "closure_incidents"."highest_prior_product_incident_count" >= 0
        AND "closure_incidents"."money_red_threshold_clp" >= 1
        AND "closure_incidents"."multiple_product_red_count" BETWEEN 1 AND 90
        AND "closure_incidents"."high_value_product_clp" >= 1
        AND "closure_incidents"."recurrence_window_days" BETWEEN 1 AND 365
        AND "closure_incidents"."recurrence_red_count" BETWEEN 2 AND 100
        AND (
          "closure_incidents"."cash_difference_clp" <> 0
          OR "closure_incidents"."card_difference_clp" <> 0
          OR "closure_incidents"."transfer_difference_clp" <> 0
          OR "closure_incidents"."inventory_difference_count" > 0
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_closure_incidents_closure_id` ON `closure_incidents` (`closure_id`);--> statement-breakpoint
CREATE INDEX `idx_closure_incidents_created_at` ON `closure_incidents` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_closure_incidents_responsible_created` ON `closure_incidents` (`responsible`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_closure_incidents_level_created` ON `closure_incidents` (`level`,`created_at`);--> statement-breakpoint
CREATE TABLE `closure_notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text,
	`closure_id` text NOT NULL,
	`business_date` text NOT NULL,
	`kind` text NOT NULL,
	`recipient_type` text NOT NULL,
	`recipient` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`template_name` text,
	`template_payload_json` text NOT NULL,
	`message_preview` text NOT NULL,
	`status` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`active_attempt_id` text,
	`last_attempt_at` text,
	`sent_at` text,
	`provider_message_id` text,
	`response_status` integer,
	`provider_response` text,
	`error_code` text,
	`error_message` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `closure_incidents`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`closure_id`) REFERENCES `cash_closures`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_notification_deliveries_shape_valid" CHECK("closure_notification_deliveries"."business_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        AND "closure_notification_deliveries"."kind" IN ('immediate_alert', 'reminder', 'daily_summary')
        AND "closure_notification_deliveries"."recipient_type" IN ('individual', 'group', 'configuration')
        AND length(trim("closure_notification_deliveries"."recipient")) BETWEEN 1 AND 100
        AND length("closure_notification_deliveries"."idempotency_key") BETWEEN 1 AND 300
        AND length("closure_notification_deliveries"."template_payload_json") BETWEEN 2 AND 10000
        AND length(trim("closure_notification_deliveries"."message_preview")) BETWEEN 1 AND 4000
        AND "closure_notification_deliveries"."status" IN (
          'queued', 'sending', 'accepted', 'sent', 'delivered', 'read',
          'failed', 'superseded', 'configuration_required'
        )
        AND (
          ("closure_notification_deliveries"."status" = 'sending'
            AND "closure_notification_deliveries"."active_attempt_id" IS NOT NULL)
          OR ("closure_notification_deliveries"."status" <> 'sending'
            AND "closure_notification_deliveries"."active_attempt_id" IS NULL)
        )
        AND "closure_notification_deliveries"."attempt_count" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_closure_notification_idempotency` ON `closure_notification_deliveries` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_incident` ON `closure_notification_deliveries` (`incident_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_status` ON `closure_notification_deliveries` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `closure_notification_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`attempt_number` integer NOT NULL,
	`initiated_by` text NOT NULL,
	`request_fingerprint` text NOT NULL,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `closure_notification_deliveries`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_notification_attempts_shape_valid" CHECK(length("closure_notification_attempts"."id") BETWEEN 1 AND 160
        AND "closure_notification_attempts"."attempt_number" BETWEEN 1 AND 100
        AND "closure_notification_attempts"."initiated_by" IN ('automatic', 'manual', 'recovery')
        AND length("closure_notification_attempts"."request_fingerprint") = 64)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_closure_notification_attempt_number` ON `closure_notification_attempts` (`delivery_id`,`attempt_number`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_attempt_delivery` ON `closure_notification_attempts` (`delivery_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `closure_notification_attempt_results` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`event_key` text NOT NULL,
	`outcome` text NOT NULL,
	`finished_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`provider_message_id` text,
	`response_status` integer,
	`provider_response` text,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`attempt_id`) REFERENCES `closure_notification_attempts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_notification_attempt_results_shape_valid" CHECK(length("closure_notification_attempt_results"."id") BETWEEN 1 AND 200
        AND length("closure_notification_attempt_results"."event_key") BETWEEN 1 AND 50
        AND "closure_notification_attempt_results"."outcome" IN ('accepted', 'failed', 'ambiguous')
        AND ("closure_notification_attempt_results"."provider_message_id" IS NULL
          OR length("closure_notification_attempt_results"."provider_message_id") BETWEEN 1 AND 500)
        AND ("closure_notification_attempt_results"."response_status" IS NULL
          OR "closure_notification_attempt_results"."response_status" BETWEEN 100 AND 599)
        AND ("closure_notification_attempt_results"."provider_response" IS NULL
          OR length("closure_notification_attempt_results"."provider_response") BETWEEN 1 AND 10000)
        AND ("closure_notification_attempt_results"."error_code" IS NULL
          OR length("closure_notification_attempt_results"."error_code") BETWEEN 1 AND 200)
        AND ("closure_notification_attempt_results"."error_message" IS NULL
          OR length("closure_notification_attempt_results"."error_message") BETWEEN 1 AND 1000)
        AND (
          ("closure_notification_attempt_results"."outcome" = 'accepted'
            AND "closure_notification_attempt_results"."provider_message_id" IS NOT NULL
            AND "closure_notification_attempt_results"."error_code" IS NULL
            AND "closure_notification_attempt_results"."error_message" IS NULL)
          OR ("closure_notification_attempt_results"."outcome" IN ('failed', 'ambiguous')
            AND "closure_notification_attempt_results"."error_code" IS NOT NULL
            AND "closure_notification_attempt_results"."error_message" IS NOT NULL)
        ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_closure_notification_attempt_result_event` ON `closure_notification_attempt_results` (`attempt_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_attempt_result_attempt` ON `closure_notification_attempt_results` (`attempt_id`,`finished_at`);--> statement-breakpoint
CREATE TABLE `closure_notification_webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_message_id` text NOT NULL,
	`provider_status` text NOT NULL,
	`provider_timestamp` integer,
	`callback_data` text,
	`error_code` text,
	`error_message` text,
	`payload_fingerprint` text NOT NULL,
	`received_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "closure_notification_webhooks_shape_valid" CHECK(length("closure_notification_webhooks"."id") BETWEEN 1 AND 100
        AND length("closure_notification_webhooks"."provider_message_id") BETWEEN 1 AND 500
        AND "closure_notification_webhooks"."provider_status" IN ('sent', 'delivered', 'read', 'failed')
        AND ("closure_notification_webhooks"."provider_timestamp" IS NULL OR "closure_notification_webhooks"."provider_timestamp" >= 0)
        AND ("closure_notification_webhooks"."callback_data" IS NULL
          OR length("closure_notification_webhooks"."callback_data") BETWEEN 1 AND 100)
        AND ("closure_notification_webhooks"."error_code" IS NULL
          OR length("closure_notification_webhooks"."error_code") BETWEEN 1 AND 200)
        AND ("closure_notification_webhooks"."error_message" IS NULL
          OR length("closure_notification_webhooks"."error_message") BETWEEN 1 AND 1000)
        AND length("closure_notification_webhooks"."payload_fingerprint") = 64)
);
--> statement-breakpoint
CREATE INDEX `idx_closure_notification_webhook_message` ON `closure_notification_webhooks` (`provider_message_id`,`provider_timestamp`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_webhook_callback` ON `closure_notification_webhooks` (`callback_data`,`received_at`);--> statement-breakpoint
CREATE INDEX `idx_closure_notification_webhook_received` ON `closure_notification_webhooks` (`received_at`);--> statement-breakpoint
CREATE TABLE `closure_notification_webhook_links` (
	`webhook_id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`match_source` text NOT NULL,
	`linked_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `closure_notification_webhooks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`delivery_id`) REFERENCES `closure_notification_deliveries`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "closure_notification_webhook_links_shape_valid" CHECK("closure_notification_webhook_links"."match_source" IN (
          'provider_message_id', 'callback_data', 'reconciliation'
        ))
);
--> statement-breakpoint
CREATE INDEX `idx_closure_notification_webhook_link_delivery` ON `closure_notification_webhook_links` (`delivery_id`,`linked_at`);--> statement-breakpoint
ALTER TABLE `cash_closure_inventory` ADD `reason_category` text;--> statement-breakpoint
ALTER TABLE `cash_closure_inventory` ADD `incident_comment` text;--> statement-breakpoint
INSERT OR IGNORE INTO closure_incident_settings (
  id, money_red_threshold_clp, multiple_product_red_count,
  high_value_product_clp, recurrence_window_days,
  recurrence_red_count, reminder_hours
) VALUES ('default', 1, 2, 10000, 30, 2, 24);--> statement-breakpoint
INSERT OR IGNORE INTO app_meta (key, value, updated_at)
VALUES ('notifications.closure-incidents.enabled-from',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));--> statement-breakpoint
INSERT OR IGNORE INTO closure_incidents (
  id, closure_id, created_at, business_date, shift, responsible,
  level, classification_reason, cash_difference_clp,
  card_difference_clp, transfer_difference_clp,
  total_difference_clp, inventory_difference_count,
  estimated_value_clp, unvalued_item_count,
  prior_responsible_incident_count,
  highest_prior_product_incident_count, money_red_threshold_clp,
  multiple_product_red_count, high_value_product_clp,
  recurrence_window_days, recurrence_red_count
)
SELECT
  'incident:' || closure.id, closure.id, closure.created_at,
  closure.business_date, closure.shift, closure.responsible,
  CASE WHEN
    abs(COALESCE(closure.adjusted_difference_clp, closure.difference_clp))
      + abs(COALESCE(closure.difference_card_clp, 0))
      + abs(COALESCE(closure.difference_transfer_clp, 0)) >= 1
    OR (SELECT COUNT(DISTINCT item_type || ':' || item_id)
      FROM cash_closure_inventory AS inventory
      WHERE inventory.closure_id = closure.id
        AND inventory.location <> 'bodega'
        AND inventory.difference_quantity <> 0) >= 2
    OR EXISTS (SELECT 1
      FROM cash_closure_inventory AS inventory
      INNER JOIN products AS product ON product.id = inventory.item_id
      WHERE inventory.closure_id = closure.id
        AND inventory.item_type = 'product'
        AND inventory.location <> 'bodega'
        AND inventory.difference_quantity <> 0
        AND abs(inventory.difference_quantity) * product.price_clp >= 10000)
  THEN 'red' ELSE 'yellow' END,
  'Registro histórico migrado con la política inicial.',
  COALESCE(closure.adjusted_difference_clp, closure.difference_clp),
  COALESCE(closure.difference_card_clp, 0),
  COALESCE(closure.difference_transfer_clp, 0),
  COALESCE(closure.adjusted_difference_clp, closure.difference_clp)
    + COALESCE(closure.difference_card_clp, 0)
    + COALESCE(closure.difference_transfer_clp, 0),
  (SELECT COUNT(*) FROM cash_closure_inventory AS inventory
    WHERE inventory.closure_id = closure.id
      AND inventory.location <> 'bodega'
      AND inventory.difference_quantity <> 0),
  COALESCE((SELECT SUM(
      abs(inventory.difference_quantity) * product.price_clp)
    FROM cash_closure_inventory AS inventory
    INNER JOIN products AS product ON product.id = inventory.item_id
    WHERE inventory.closure_id = closure.id
      AND inventory.item_type = 'product'
      AND inventory.location <> 'bodega'
      AND inventory.difference_quantity <> 0), 0),
  (SELECT COUNT(*) FROM cash_closure_inventory AS inventory
    WHERE inventory.closure_id = closure.id
      AND inventory.item_type = 'ingredient'
      AND inventory.location <> 'bodega'
      AND inventory.difference_quantity <> 0),
  0, 0, 1, 2, 10000, 30, 2
FROM cash_closures AS closure
WHERE closure.closure_contract_version = 2
  AND (
    COALESCE(closure.adjusted_difference_clp, closure.difference_clp) <> 0
    OR COALESCE(closure.difference_card_clp, 0) <> 0
    OR COALESCE(closure.difference_transfer_clp, 0) <> 0
    OR EXISTS (
      SELECT 1 FROM cash_closure_inventory AS inventory
      WHERE inventory.closure_id = closure.id
        AND inventory.location <> 'bodega'
        AND inventory.difference_quantity <> 0
    )
  );--> statement-breakpoint
INSERT OR IGNORE INTO closure_incident_items (
  incident_id, item_key, item_type, item_id, item_name, unit,
  location, expected_quantity, counted_quantity,
  difference_quantity, reason_category, initial_comment,
  adjustment_applied, unit_value_clp, estimated_value_clp, high_value
)
SELECT incident.id, inventory.item_key, inventory.item_type,
  inventory.item_id, inventory.item_name, inventory.unit,
  inventory.location, inventory.expected_quantity,
  inventory.counted_quantity, inventory.difference_quantity,
  CASE WHEN inventory.reason_category IN (
    'venta_no_registrada', 'consumo_no_registrado', 'merma',
    'error_conteo', 'reposicion_no_registrada', 'otro'
  ) THEN inventory.reason_category ELSE 'otro' END,
  substr(COALESCE(inventory.incident_comment, inventory.reason,
    'Registro histórico sin comentario original.'), 1, 1000),
  inventory.difference_quantity,
  CASE WHEN inventory.item_type = 'product'
    THEN product.price_clp ELSE NULL END,
  CASE WHEN inventory.item_type = 'product'
    THEN abs(inventory.difference_quantity) * product.price_clp ELSE NULL END,
  CASE WHEN inventory.item_type = 'product'
    AND abs(inventory.difference_quantity) * product.price_clp
      >= incident.high_value_product_clp
    THEN 1 ELSE 0 END
FROM cash_closure_inventory AS inventory
INNER JOIN closure_incidents AS incident
  ON incident.closure_id = inventory.closure_id
LEFT JOIN products AS product
  ON product.id = inventory.item_id AND inventory.item_type = 'product'
WHERE inventory.location <> 'bodega'
  AND inventory.difference_quantity <> 0;--> statement-breakpoint
INSERT OR IGNORE INTO closure_incident_events (
  id, incident_id, created_at, event_type, status, actor_role,
  actor_name, comment, request_fingerprint
)
SELECT 'created:' || incident.id, incident.id, incident.created_at,
  'created', 'pending_clarification', 'system', 'Sistema',
  'Incidencia histórica creada durante la migración.',
  lower(hex(randomblob(32)))
FROM closure_incidents AS incident;--> statement-breakpoint
INSERT OR IGNORE INTO closure_incident_events (
  id, incident_id, created_at, event_type, status, actor_role,
  actor_name, comment, request_fingerprint
)
SELECT 'correction:' || revision.id, incident.id, seal.sealed_at,
  'correction_applied', CASE WHEN
    revision.difference_cash_clp = 0
    AND revision.difference_card_clp = 0
    AND revision.difference_transfer_clp = 0
    AND NOT EXISTS (
      SELECT 1 FROM cash_closure_revision_inventory AS inventory
      WHERE inventory.revision_id = revision.id
        AND inventory.difference_quantity <> 0
    )
  THEN 'clarified' ELSE 'requires_correction' END,
  'admin', 'Administrador',
  substr('Revisión ' || revision.revision_number || ': '
    || revision.reason, 1, 1000),
  revision.request_fingerprint
FROM cash_closure_revisions AS revision
INNER JOIN cash_closure_revision_seals AS seal
  ON seal.revision_id = revision.id
  AND seal.request_fingerprint = revision.request_fingerprint
INNER JOIN closure_incidents AS incident
  ON incident.closure_id = revision.closure_id
ORDER BY revision.closure_id, revision.revision_number;--> statement-breakpoint
INSERT OR IGNORE INTO closure_incident_events (
  id, incident_id, created_at, event_type, status, actor_role,
  actor_name, comment, request_fingerprint
)
SELECT 'validated:' || incident.closure_id, incident.id,
  validation.validated_at, 'validated', 'validated', 'admin',
  'Administrador',
  substr(COALESCE(validation.comment,
    'Cierre validado antes de crear el registro de incidencias.'), 1, 1000),
  COALESCE(validation.request_fingerprint, closure.request_fingerprint)
FROM closure_incidents AS incident
INNER JOIN cash_closure_validations AS validation
  ON validation.closure_id = incident.closure_id
INNER JOIN cash_closures AS closure
  ON closure.id = incident.closure_id;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_inventory_incident_details_insert`
BEFORE INSERT ON `cash_closure_inventory`
WHEN NEW.location <> 'bodega' AND ((
  NEW.difference_quantity = 0 AND (
    NEW.reason_category IS NOT NULL OR NEW.incident_comment IS NOT NULL
  )
) OR (
  NEW.difference_quantity <> 0 AND (
    NEW.reason_category NOT IN (
      'venta_no_registrada', 'consumo_no_registrado', 'merma',
      'error_conteo', 'reposicion_no_registrada', 'otro'
    )
    OR NEW.reason_category IS NULL OR NEW.incident_comment IS NULL
    OR length(trim(NEW.incident_comment)) NOT BETWEEN 1 AND 1000
  )
))
BEGIN
  SELECT RAISE(ABORT, 'cash closure inventory incident details are invalid');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incidents_no_update`
BEFORE UPDATE ON `closure_incidents` BEGIN
  SELECT RAISE(ABORT, 'closure incident snapshot is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incidents_no_delete`
BEFORE DELETE ON `closure_incidents` BEGIN
  SELECT RAISE(ABORT, 'closure incident snapshot is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incident_items_no_update`
BEFORE UPDATE ON `closure_incident_items` BEGIN
  SELECT RAISE(ABORT, 'closure incident items are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incident_items_no_delete`
BEFORE DELETE ON `closure_incident_items` BEGIN
  SELECT RAISE(ABORT, 'closure incident items are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incident_events_no_update`
BEFORE UPDATE ON `closure_incident_events` BEGIN
  SELECT RAISE(ABORT, 'closure incident history is append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_incident_events_no_delete`
BEFORE DELETE ON `closure_incident_events` BEGIN
  SELECT RAISE(ABORT, 'closure incident history is append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_revision_seals_incident_event_insert`
AFTER INSERT ON `cash_closure_revision_seals`
BEGIN
  INSERT INTO closure_incident_events (
    id, incident_id, created_at, event_type, status, actor_role,
    actor_name, comment, request_fingerprint
  )
  SELECT 'correction:' || revision.id, incident.id, NEW.sealed_at,
    'correction_applied', CASE WHEN
      revision.difference_cash_clp = 0
      AND revision.difference_card_clp = 0
      AND revision.difference_transfer_clp = 0
      AND NOT EXISTS (
        SELECT 1 FROM cash_closure_revision_inventory AS inventory
        WHERE inventory.revision_id = revision.id
          AND inventory.difference_quantity <> 0
      )
    THEN 'clarified' ELSE 'requires_correction' END,
    'admin', 'Administrador',
    substr('Revisión ' || revision.revision_number || ': '
      || revision.reason, 1, 1000),
    revision.request_fingerprint
  FROM cash_closure_revisions AS revision
  INNER JOIN closure_incidents AS incident
    ON incident.closure_id = revision.closure_id
  WHERE revision.id = NEW.revision_id
  ON CONFLICT(id) DO NOTHING;
END;--> statement-breakpoint
CREATE TRIGGER `trg_cash_closure_validations_incident_event_insert`
AFTER INSERT ON `cash_closure_validations`
BEGIN
  INSERT INTO closure_incident_events (
    id, incident_id, created_at, event_type, status, actor_role,
    actor_name, comment, request_fingerprint
  )
  SELECT 'validated:' || NEW.closure_id, incident.id, NEW.validated_at,
    'validated', 'validated', 'admin', 'Administrador',
    substr(COALESCE(NEW.comment,
      'Validación administrativa sobre la revisión '
        || NEW.revision_number || '.'), 1, 1000),
    COALESCE(NEW.request_fingerprint, closure.request_fingerprint)
  FROM closure_incidents AS incident
  INNER JOIN cash_closures AS closure ON closure.id = incident.closure_id
  WHERE incident.closure_id = NEW.closure_id
  ON CONFLICT(id) DO NOTHING;
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_deliveries_active_attempt_insert`
BEFORE INSERT ON `closure_notification_deliveries`
WHEN (NEW.status = 'sending' AND NEW.active_attempt_id IS NULL)
  OR (NEW.status <> 'sending' AND NEW.active_attempt_id IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'closure notification active attempt is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_deliveries_active_attempt_update`
BEFORE UPDATE ON `closure_notification_deliveries`
WHEN (NEW.status = 'sending' AND NEW.active_attempt_id IS NULL)
  OR (NEW.status <> 'sending' AND NEW.active_attempt_id IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'closure notification active attempt is invalid');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_deliveries_no_delete`
BEFORE DELETE ON `closure_notification_deliveries` BEGIN
  SELECT RAISE(ABORT, 'closure notification audit is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_attempts_no_update`
BEFORE UPDATE ON `closure_notification_attempts` BEGIN
  SELECT RAISE(ABORT, 'closure notification attempts are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_attempts_no_delete`
BEFORE DELETE ON `closure_notification_attempts` BEGIN
  SELECT RAISE(ABORT, 'closure notification attempts are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_attempt_results_no_update`
BEFORE UPDATE ON `closure_notification_attempt_results` BEGIN
  SELECT RAISE(ABORT, 'closure notification attempt results are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_attempt_results_no_delete`
BEFORE DELETE ON `closure_notification_attempt_results` BEGIN
  SELECT RAISE(ABORT, 'closure notification attempt results are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_webhooks_no_update`
BEFORE UPDATE ON `closure_notification_webhooks` BEGIN
  SELECT RAISE(ABORT, 'closure notification webhooks are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_webhooks_no_delete`
BEFORE DELETE ON `closure_notification_webhooks` BEGIN
  SELECT RAISE(ABORT, 'closure notification webhooks are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_webhook_links_no_update`
BEFORE UPDATE ON `closure_notification_webhook_links` BEGIN
  SELECT RAISE(ABORT, 'closure notification webhook links are immutable append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_closure_notification_webhook_links_no_delete`
BEFORE DELETE ON `closure_notification_webhook_links` BEGIN
  SELECT RAISE(ABORT, 'closure notification webhook links are immutable append-only');
END;--> statement-breakpoint
INSERT INTO app_meta (key, value, updated_at)
VALUES ('schema.migration.closure-incidents-v1', 'v1',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value,
  updated_at = excluded.updated_at;--> statement-breakpoint
INSERT INTO app_meta (key, value, updated_at)
VALUES ('schema.migration.closure-incidents-v2', 'v2',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
ON CONFLICT(key) DO UPDATE SET value = excluded.value,
  updated_at = excluded.updated_at;
