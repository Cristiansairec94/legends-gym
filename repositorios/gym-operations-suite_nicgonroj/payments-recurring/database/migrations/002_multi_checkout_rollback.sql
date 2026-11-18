-- Rollback seguro de 002_multi_checkout.sql.
--
-- No ejecuta DROP: 001 y el backend anterior ignoran estas columnas aditivas,
-- por lo que basta restaurar el bundle anterior y mantener DGYM_CHECKOUT_ENABLED=false.
-- Retener las columnas y checkout_identity_leases conserva IDs, montos,
-- evidencia y bloqueos anti-duplicado de checkouts todavía cobrables.
-- Una eliminación física debe diseñarse aparte, después de exportar y conciliar
-- todas las filas single/prepaid; no forma parte de un rollback operativo seguro.

SELECT 'Rollback lógico: conservar esquema aditivo y desplegar versión anterior con checkout deshabilitado.' AS action;
