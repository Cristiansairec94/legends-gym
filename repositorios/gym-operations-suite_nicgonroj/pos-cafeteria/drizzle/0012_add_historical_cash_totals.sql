INSERT OR IGNORE INTO `sales` (
  `id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_status`, `checkout_method`, `payment_method`, `debt_note`,
  `debtor_collaborator`, `paid_at`, `settlement_id`, `seller`, `total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-27', '2026-08-27T16:00:00.000Z', '2026-08-27', 'pm', NULL,
  'paid', 'efectivo', 'efectivo', NULL,
  NULL, '2026-08-27T16:00:00.000Z', NULL, 'Ajuste administrativo', 29800
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_items` (
  `sale_id`, `product_id`, `product_name`, `unit_price_clp`, `quantity`, `line_total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-27', 'ajuste-ventas-historicas', 'Ajuste ventas históricas efectivo', 29800, 1, 29800
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_payments` (
  `id`, `sale_id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_method`, `amount_clp`, `received_by`, `kind`
) VALUES (
  'direct:ajuste-ventas-efectivo-2026-08-27', 'ajuste-ventas-efectivo-2026-08-27', '2026-08-27T16:00:00.000Z', '2026-08-27', 'pm', NULL,
  'efectivo', 29800, 'Ajuste administrativo', 'direct'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `sales` (
  `id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_status`, `checkout_method`, `payment_method`, `debt_note`,
  `debtor_collaborator`, `paid_at`, `settlement_id`, `seller`, `total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-28', '2026-08-28T16:00:00.000Z', '2026-08-28', 'pm', NULL,
  'paid', 'efectivo', 'efectivo', NULL,
  NULL, '2026-08-28T16:00:00.000Z', NULL, 'Ajuste administrativo', 41200
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_items` (
  `sale_id`, `product_id`, `product_name`, `unit_price_clp`, `quantity`, `line_total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-28', 'ajuste-ventas-historicas', 'Ajuste ventas históricas efectivo', 41200, 1, 41200
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_payments` (
  `id`, `sale_id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_method`, `amount_clp`, `received_by`, `kind`
) VALUES (
  'direct:ajuste-ventas-efectivo-2026-08-28', 'ajuste-ventas-efectivo-2026-08-28', '2026-08-28T16:00:00.000Z', '2026-08-28', 'pm', NULL,
  'efectivo', 41200, 'Ajuste administrativo', 'direct'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `sales` (
  `id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_status`, `checkout_method`, `payment_method`, `debt_note`,
  `debtor_collaborator`, `paid_at`, `settlement_id`, `seller`, `total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-29', '2026-08-29T16:00:00.000Z', '2026-08-29', 'pm', NULL,
  'paid', 'efectivo', 'efectivo', NULL,
  NULL, '2026-08-29T16:00:00.000Z', NULL, 'Ajuste administrativo', 47300
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_items` (
  `sale_id`, `product_id`, `product_name`, `unit_price_clp`, `quantity`, `line_total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-29', 'ajuste-ventas-historicas', 'Ajuste ventas históricas efectivo', 47300, 1, 47300
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_payments` (
  `id`, `sale_id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_method`, `amount_clp`, `received_by`, `kind`
) VALUES (
  'direct:ajuste-ventas-efectivo-2026-08-29', 'ajuste-ventas-efectivo-2026-08-29', '2026-08-29T16:00:00.000Z', '2026-08-29', 'pm', NULL,
  'efectivo', 47300, 'Ajuste administrativo', 'direct'
);
--> statement-breakpoint
INSERT OR IGNORE INTO `sales` (
  `id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_status`, `checkout_method`, `payment_method`, `debt_note`,
  `debtor_collaborator`, `paid_at`, `settlement_id`, `seller`, `total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-31', '2026-08-31T16:00:00.000Z', '2026-08-31', 'pm', NULL,
  'paid', 'efectivo', 'efectivo', NULL,
  NULL, '2026-08-31T16:00:00.000Z', NULL, 'Ajuste administrativo', 35600
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_items` (
  `sale_id`, `product_id`, `product_name`, `unit_price_clp`, `quantity`, `line_total_clp`
) VALUES (
  'ajuste-ventas-efectivo-2026-08-31', 'ajuste-ventas-historicas', 'Ajuste ventas históricas efectivo', 35600, 1, 35600
);--> statement-breakpoint
INSERT OR IGNORE INTO `sale_payments` (
  `id`, `sale_id`, `created_at`, `business_date`, `shift`, `shift_session_id`,
  `payment_method`, `amount_clp`, `received_by`, `kind`
) VALUES (
  'direct:ajuste-ventas-efectivo-2026-08-31', 'ajuste-ventas-efectivo-2026-08-31', '2026-08-31T16:00:00.000Z', '2026-08-31', 'pm', NULL,
  'efectivo', 35600, 'Ajuste administrativo', 'direct'
);
