# Reportes page override

- This page is exclusively administrative and must not mount report data for the
  Sales role. Server-side report APIs remain the authorization boundary.
- Keep `Resumen por día` and `Detalle de ventas` within the existing accessible
  tab pattern. Excel export always follows applied filters.
- Provide a persistent primary navigation state and a predictable link back to
  `Nueva venta`; do not duplicate POS ticket or closure controls.
- Preserve responsive card layouts, textual chart values, explicit loading and
  empty states, 44px controls and no horizontal scrolling at 375px.
