# Cierre de caja page override

- This is an operational handoff page, available to both authenticated roles.
- Keep the four-part sequence visible: payment reconciliation, open customer
  balances, countable inventory and a read-only delivery summary. Never add a
  confirmation checklist.
- The active shift and responsible collaborator are read-only. Sales can inspect,
  close and retain the immutable receipt for the active shift. Admin additionally
  gets a separate validation queue and immutable reviewed history.
- Display gross expected cash first. When counted cash is lower, progressively
  reveal the petty-cash expense editor. Expenses are optional because only real
  spending may be entered; each real expense needs a description and positive
  integer amount, and their total cannot exceed the gross shortfall. Show adjusted
  expected cash and the residual difference together.
- A residual difference in any payment method requires one general financial
  reason. Every inventory discrepancy requires a reason on its own line.
- Count only `vitrina`, simple stock and ingredients in a new delivery. Warehouse
  (`bodega`) is explicitly out of scope and must never be sent for adjustment.
  Historical records may disclose warehouse lines if the older contract captured
  them; label that fact instead of rewriting history.
- Collaborator consumption belongs to the administrator's month-end ledger. It is
  absent from the Sales receivables view and from every new operational closure:
  do not show its count, balance or individual accounts, and never include it in
  cash or other expected payment totals. Previously saved collaborator snapshots
  remain visible only inside the administrator's historical detail, under the
  explicit label `Referencia histórica · fuera de caja`.
- The delivery summary is live but read-only: shift, responsible, sales included
  in this closure, gross and adjusted money, real expenses, customer balances,
  payment differences and stock differences. Customer balances are labelled as
  follow-up outside cash. The only editable element in that section is an optional
  handoff comment.
- Closing is irreversible, uses explicit confirmation and produces a complete
  immutable receipt. Loading, success and failure must be announced.
- Admin validation is visually and behaviorally separate from operational closing.
  Text must state that pending validation never blocks a new shift. Cards use
  textual statuses: `Pendiente de validar`, `Validada`, or
  `Histórico · sin validación requerida`; color is supplementary only.
- Before validation, Admin can create an append-only correction of a pending v2
  delivery. Never overwrite the original act and never show correction controls
  for a validated or legacy delivery. Validation is disabled until the revision
  state loads and submits the authoritative `expectedRevisionNumber`.
- A correction requires a reason and a material change. It may add at most five
  omitted paid sales (cash, card or transfer), with up to ten distinct products
  per sale and fifty input lines total; active and inactive products remain
  selectable, and `Precio cobrado` is editable to preserve the historical
  amount. It may also correct the three verified payment totals and counted
  inventory. Preview all proposed financial results before creating revision
  N+1.
- For each changed inventory line show `stock vigente ± delta de conteo = stock
  final`. Omitted historical sales affect the revised expected snapshot but do
  not decrement current stock a second time. Warn when another shift is active.
  If a later physical closure prevents stock correction, preserve the rest of
  the draft and let Admin remove only the inventory changes.
- A line retained by the delivery but missing from current inventory stays
  visible as `Ya no existe en inventario vigente / no ajustable`. Its count is
  disabled, it contributes no inventory delta, and it never blocks a financial
  or omitted-sales correction. If the location disappears during submit, reload
  the inventory context while preserving the rest of the draft.
- Pending deliveries load revision state only after Admin opens `Revisar,
  corregir y validar`; validation waits for that context. This avoids one
  request per pending card. Reviewed history also loads effective state and
  revisions lazily on disclosure. Each
  revision remains inspectable:
  reason/time, omitted sale method/products/amount, inventory previous/new/live
  values and the effective financial snapshot.
- The pending queue loads 30 deliveries at a time. `Cargar más entregas
  pendientes` appends and deduplicates the opaque-cursor page without replacing
  the reviewed history; expose loading, failure and retry states beside the CTA.
- Retain the exact correction UUID and payload after network or 5xx ambiguity so
  retry is idempotent. On stale conflicts, reload the latest revision before a
  new attempt. Opening a shift follows the same retry discipline and confirms
  authority with `/api/pos`; a delayed replay of an already-closed shift must not
  be announced as open.
- Error messages sit beside their fields and submit moves focus to the first
  invalid control. Preserve native labels, keyboard order, visible focus,
  44px minimum targets and no horizontal overflow at 375px or phone landscape.
