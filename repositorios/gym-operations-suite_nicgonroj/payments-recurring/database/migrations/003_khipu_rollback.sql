-- Rollback seguro de 003_khipu.sql.
--
-- No ejecuta DROP: el backend anterior ignora estas columnas y la tabla khipu_charges.
-- Basta desplegar la versión anterior con DGYM_KHIPU_ENABLED=false. Conservar las filas
-- mantiene la evidencia de mandatos y cuotas que podrían seguir cobrándose en Khipu;
-- antes de eliminarlas, dar de baja cada mandato y conciliar todas las cuotas.

SELECT 'Rollback lógico: conservar esquema aditivo y desplegar versión anterior con Khipu deshabilitado.' AS action;
