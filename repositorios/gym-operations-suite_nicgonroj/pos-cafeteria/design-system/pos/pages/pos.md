# POS page override — Demo Gym Ops · Cafetería & Protein Bar

This page intentionally overrides the generated dark kiosk/landing guidance in
`MASTER.md`. The product is an operational point-of-sale tool, not a marketing
page or passive display.

## Direction

- Light, warm, professional workspace suitable for a café counter.
- Dense enough for fast entry, with clear hierarchy and generous touch targets.
- One primary action at a time: register the current sale.
- No decorative imagery; products are identified through typography, category,
  compact color swatches and explicit labels.

## Tokens

| Role | Value |
|---|---|
| Background | `#F6F3ED` |
| Surface | `#FFFFFF` |
| Strong surface | `#22211F` |
| Text | `#22211F` |
| Muted text | `#6D6962` |
| Border | `#E6E0D7` |
| Primary action | `#B84B2C` |
| Primary hover | `#913820` |
| Success | `#2F6F57` |
| Warning | `#9A6700` |
| Error | `#B42318` |

Use Geist from the starter for interface text. Amounts use tabular numerals.
Spacing follows a 4/8px rhythm. Cards use 14–24px radii and restrained shadows.

## Interaction rules

- All primary controls are at least 44px high; the main checkout action is 56px.
- Product cards are real buttons and work with keyboard and touch.
- Use native labels, inputs and selects. Never rely on placeholder-only labels.
- Disabled, loading, success and error states must be explicit.
- Hover/press transitions last 150–220ms and never shift layout.
- Respect `prefers-reduced-motion`.
- At widths below 820px, the ticket follows the catalog in one column.
- At 560px and below, keep two compact product columns only when each remains at
  least 140px; otherwise fall back to one column.

## Roles and operational context

- The authenticated role is always shown as text: `Perfil Administrador` or
  `Perfil Ventas`; color is only secondary reinforcement.
- `Ventas` sees the catalog, ticket and the operational customer receivables
  panel. Shift reconciliation and delivery live on the dedicated `Cierre de
  caja` page; a quick-opening dialog is also available on `Nueva venta` for
  both roles. Product management, general reports, administrative history and
  manual inventory adjustments remain protected server-side.
- Every new sale requires an explicit AM/PM shift and one collaborator
  responsible for the transaction. Either authenticated role selects this
  context once when opening the shift; it remains read-only until the
  formal handoff is closed. Never use browser-only preferences as authority.
- When no shift is open, keep the catalogue visible but disable product entry
  and prevent checkout from completing. Open a native modal dialog automatically with AM/PM,
  responsible collaborator and initial cash; zero is valid. Escape and the
  secondary `Ahora no` action dismiss it and return focus, allowing navigation
  and consultation without enabling sales. `Abrir turno aquí` and any attempted
  checkout reopen it. The dialog also keeps an explicit `Cambiar perfil` exit.
- A modal opening attempt keeps the same UUID and frozen payload after network
  or 5xx ambiguity, clearing it only after a deterministic 4xx. Never trust the
  POST response as the active shift: refetch `/api/pos`, adopt only its open
  session and keep the gate active if a delayed replay belongs to a shift that
  has already closed.
- With an active shift, show a compact summary above the workspace. Keep
  `Ventas incluidas` separate from `Dinero recibido en este turno`; the latter
  breaks out cash, card, transfer and total. Explain that received money can
  include customer installments and excludes initial cash, expenses and
  collaborator consumption. Discard stale response sequences and provide an
  explicit refresh action if the summary cannot be synchronized.
- `Colaborador` is a deferred checkout method distinct from the responsible
  seller. Reveal the debtor collaborator selector only when that method is
  chosen; the note remains optional.

## Receivables and partial payments

- `Ventas` receives a customer-only receivables ledger and summary; collaborator
  accounts, balances, notices and payment history are entirely absent from that
  profile. `Administrador` receives the full customer and collaborator ledger and
  retains the month-end collaborator collection flow. Registering any permitted
  payment requires an active shift so every cash, card or transfer event belongs
  to the current handoff.
- Each account card shows `Total original`, `Abonado` and `Saldo`; the global
  summary uses outstanding balance, never the original total.
- Default the payment amount to the complete balance, but accept any integer
  CLP amount from 1 through the current balance. Label the primary action
  `Registrar abono` for a partial amount and `Cobrar saldo` for the exact
  remaining balance. Confirm the amount, method and resulting balance before
  sending.
- Show prior payments in a native disclosure below the account, including
  amount, method, timestamp and receiver when available. Clearly disclose when
  only the latest bounded history is shown.
- Payment retries are idempotent across uncertain network and server failures:
  retain and lock the request id, amount, method and shift session, then resend
  that exact payload. Clear it after success or a deterministic 4xx response.
- Render accounts as stacked responsive cards and definition lists; never use
  a horizontally scrolling table. Validation errors remain next to the account
  and focus the invalid amount or payment method.

## Today's operational sales

- Place `Ventas de hoy` directly on the new-sale page for both authenticated
  roles. It is an operational handoff aid, separate from the administrator-only
  reporting module, and must never expose debt notes.
- Both roles see collaborator purchases in this operational list so the seller
  can confirm that the record exists. Such cards show the explicit label
  `Consumo de colaborador`, the debtor collaborator name, products and total as
  operational evidence. They never show paid amount, balance, installment
  history or collection controls.
- Mark every collaborator card with `Fuera de caja · cobro mensual por
  Administración`. Its sale amount is a reference only and must not be framed as
  money to reconcile in the current shift.
- Load the current Santiago business date on mount and refresh after every
  successful sale. A manual `Actualizar` action remains available; loading,
  error/retry, empty, load-more and completed-list states are explicit.
- Keep newest sales first and make every sale from the day reachable with
  cursor pagination. Refresh replaces the current pages; load-more appends and
  deduplicates by sale ID so stale concurrent responses cannot mix lists.
- Each compact card shows Chile time, product quantities, responsible person,
  AM/PM shift, the original checkout method, total and textual payment status.
  Pending customer sales additionally show paid amount and current outstanding
  balance; collaborator purchases use the separate treatment above.
- Use a stacked card list rather than a wide table. At 880px it becomes one
  column; at 430px card metadata stacks without horizontal overflow. Buttons
  remain at least 44px and monetary values use tabular numerals.

## Sales reports and history

- Replace separate recent/history surfaces with one `Reportes de ventas`
  section. Only `Administrador` may mount, query, export or see it; keep the
  complete section absent for `Ventas` and enforce the same rule at each API.
- Use an accessible two-tab pattern with arrow, Home and End keyboard behavior:
  `Resumen por día` is the default and `Detalle de ventas` is lazy-loaded. Both
  referenced tab panels must exist in the DOM even before detail data loads.
- Default report dates to the latest 30 inclusive Santiago business dates and
  cap a request at 366 days. Date filters are explicit and submit-driven;
  reject missing, inverted or excessive ranges inline and focus the relevant
  field. Unapplied edits never change results or Excel exports.
- The daily view distinguishes two accounting scopes in text. `Ventas
  originadas` shows sold amount/count/units/average and current outstanding
  balance of sales created on that date. `Cobros recibidos` shows actual payment
  events received on the date, including installments for older sales, with
  cash/card/transfer breakdown. Never label the latter as sales of the day.
- Show period KPIs and responsive daily cards. When at least four daily points
  exist and one is non-zero, add a compact CSS trend for sales amounts as a
  supplement to the complete textual cards. Zero values have zero-height bars;
  dates and values remain visible without hover.
- `Ver detalle` activates the detail tab and applies that business date to both
  ends of its filter. The detail remains newest-first and every matching sale is
  reachable through `Cargar más`; pagination preserves applied filters and
  deduplicates by ID.
- Detail filters include inclusive dates, status, `Medio de registro` and text.
  The method refers to the checkout method (including `Pendiente` and
  `Colaborador`), not later debt events. Cards keep date/time
  (America/Santiago), products, seller, shift, checkout/latest collection
  method, total, paid amount, balance and textual status visible. Payment events
  may use a native disclosure with an explicit bounded-history notice.
- `Exportar a Excel` downloads from the reporting API, not from the currently
  rendered page. It uses exactly the applied dates and detail filters and shows
  preparing, success and actionable error states; sanitize the server filename
  before assigning it to the download.
- Use stacked cards/definition lists, explicit loading/error/retry/empty/end
  states and compact live announcements. Controls remain at least 44px, body
  copy at least 12px, amounts tabular and the 375px layout never scrolls
  horizontally.

## Cash closures

- Either authenticated role may open, reconcile and close the active shift from
  the dedicated `Cierre de caja` page. Opening requires AM/PM, one collaborator
  and the initial cash fund (zero is valid). Closure history remains
  administrator-only. Show the resulting assignment and initial fund as locked
  operational context until delivery.
- Cash closures are immutable snapshots with one closure per business date and
  AM/PM shift. Treat the final action as a formal handoff: use the explicit
  label `Cerrar y entregar turno` and require confirmation before submission.
- Compare counted cash against actual cash collection events in the selected
  shift. Card and transfer compare only against money actually received.
  Customer balances appear separately as follow-up outside cash.
- The financial methods and the subtotal labelled `Ventas incluidas en el cierre`
  belong to the active shift. That subtotal excludes collaborator purchases. The
  closure shows the global open customer ledger so it can be handed to the next
  shift, regardless of when the debt originated. Collaborator consumption and
  balances are excluded from every new closure and remain in the administrator's
  month-end ledger.
- Do not add a confirmation checklist. Readiness is derived from valid financial
  counts, explanations for residual differences and completed inventory counts.
- Inventory reconciliation is line-based and mobile friendly. Each tracked
  item shows system quantity, physical count and signed difference. A visible
  reason is mandatory for every discrepancy; do not hide the item name or unit
  when the input receives focus.
- Re-send the preview activity revision and every inventory `versionToken` at
  close. A stale conflict resets financial counts, inventory counts and all
  confirmations so the operator must refresh and recount.
- Express the result with text and amount: `Cuadra`, `Faltan …` or `Sobran …`;
  never rely on green/yellow alone.
- After success, replace the editable workflow with a textual `Turno entregado`
  state and its immutable summary. Provide no edit or delete affordance.
- Preserve older collaborator snapshots only in administrator history, inside a
  separate `Referencia histórica · fuera de caja` section which states that the
  values were not money received and did not affect expected cash. Never expose
  that historical reference to `Ventas` or reinterpret it as a current balance.
- Render closure history as responsive cards with definition lists instead of
  a wide table. Legacy movements without a shift must be disclosed as a warning
  and excluded from the snapshot.
- Before validating a pending v2 delivery, Admin may create append-only
  corrections. The original act remains separately inspectable and validation
  always sends the latest revision number. A correction requires a reason and
  may add up to five omitted paid sales, correct the three verified payment
  totals and update counted inventory; validated or legacy deliveries never
  expose edit controls.
- Omitted sales may reference active or inactive products and store the price
  actually charged. Preview the next revision before submit. Inventory changes
  show `live current ± counted delta = live final`; omitted historical sales
  adjust the snapshot expectation but never consume current stock again. Warn
  when a current shift exists. If a later physical closure locks inventory,
  preserve the draft and offer to remove only its stock changes so money and
  omitted sales can still be revised.
- Load pending revision state before enabling validation. Validated-history
  revision queries are lazy, opened on demand, and expose reason/time, omitted
  sale products and methods, inventory before/after/live deltas and the
  effective financial snapshot. Network/5xx retries preserve the correction ID
  and payload; conflicts refresh the authoritative latest revision.

## Product-specific safeguards

- Mark initial café prices as requiring review; do not imply they are approved.
- Preserve the ticket when a save fails.
- Recalculate totals on the server and guard against duplicate submissions.
- Products can be deactivated but are never hard-deleted from sales history.
