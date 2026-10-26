# pos-cafeteria

Punto de venta de la cafetería de Demo Gym: turnos AM/PM, ventas con varios medios de pago, fiado a
clientes y colaboradores, inventario con recetas e insumos compartidos, cierre de caja con conteo de
efectivo e inventario, incidencias de cierre con recordatorios, reportes diarios y exportación a Excel.

Next.js sobre Vinext, React 19, TypeScript, Drizzle y Cloudflare Workers + D1. Catálogo, precios y
colaboradores son ficticios (`db/catalog.ts`, `lib/business.ts`).

## Acceso

Dos perfiles por HTTP Basic Auth: `admin` y `sales` (recepción/ventas). El Worker compara el SHA-256 de
`usuario:contraseña` con `BASIC_AUTH_SHA256` y `BASIC_AUTH_SALES_SHA256`, descarta cabeceras de rol del
cliente y exige Origin confiable en mutaciones. Sin esos valores responde 503 (falla cerrado).

## Correr

```bash
npm install                      # requiere red
cp .env.example .dev.vars        # completar al menos los dos hashes
npm run dev
npm test                         # build + 98 pruebas (node:test + SQLite en memoria)
npm run test:unit                # 90 pruebas sin build
npx tsc --noEmit && npm run lint
```

Para desplegar: `wrangler d1 create demo-gym-pos`, agregar el identificador de la base en tu propia
configuración de Wrangler (no versionada), aplicar `dist/migrations/` y cargar los secretos con
`wrangler secret put`. WhatsApp queda apagado (`WHATSAPP_ENABLED=false`) hasta tener plantillas
aprobadas y destinatarios con opt-in.
