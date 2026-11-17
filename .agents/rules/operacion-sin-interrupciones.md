---
trigger: always_on
---

# Regla General LEGENDS: Operación Sin Interrupciones y Actualización por F5 / Reinicio

Aplica obligatoriamente en todas las conversaciones sobre este repositorio (ver también `../GEMINI.md`):

1. **No interferir con actividades ni datos en curso**:
   - No cerrar, reiniciar ni matar procesos activos (`SISTEMA_ERP.exe`, `CONTROL_DE_ACCESO.exe`, `FitnessLegends.exe`, `ControlDeAccesoLegends.exe`) ni tumbar el puerto `3001` activo.
   - No escribir datos de prueba en `legends_database.json` real ni en `%APPDATA%\FitnessLegends*` ni contra el puerto `3001` cuando esté ocupado por la app real; usar `userData` y directorios temporales aislados en cualquier prueba.
2. **Lista para actualizar al instante con `F5` o al cerrar y abrir**:
   - Tras cada cambio, ejecutar `tsc -b --noEmit` y `agy-node scripts/package-app.cjs` en `LEGENDS/` para actualizar `dist/`, HTML autocontenidos y `release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/` de forma atómica y sin sobrescribir la base de datos activa (`legends_database.json`).
   - Preservar `performHardReload()` (`F5` / `Ctrl+R`) en `electron/main.cjs` y la continuidad de sesión tras recarga en `storage.ts` / `GymContext.tsx`.
   - Indicar al usuario en cada entrega si basta presionar **`F5`** (cambios en `src/`) o si requiere **cerrar y abrir nuevamente** el programa (cambios en `electron/` o `server/`).
3. **Validación estricta de fechas de calendario**:
   - Todo campo de fecha (`dd/mm/aaaa` o `date`) debe impedir en tiempo real días fuera del mes real (`01..31`, febrero `28/29`, 30 en abr/jun/sep/nov), meses mayores a `12` (`01..12`), años inválidos o futuros (`1900..año actual`, prohibido `0009`), reutilizando `sanitizeBirthDateInput` y `parseBirthDateParts` en `LEGENDS/src/utils/membershipUtils.ts`.
