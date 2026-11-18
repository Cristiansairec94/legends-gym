#!/bin/sh
# Ejecuta todas las pruebas offline del repositorio. No usa red ni credenciales.
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"

echo "== payments-recurring"
cd "$root/payments-recurring"
for t in run reconciliation manual-reconciliation pricing-recovery khipu khipu-transfer; do
  php "tests/$t.php" | tail -1
done
for t in return-status frontend-selection frontend-recovery; do
  node "tests/$t.cjs" | tail -1
done
php tests/catalog-public.php | node tests/frontend-selection.cjs --backend-catalog | tail -2

echo "== nutrition-calculator"
cd "$root/nutrition-calculator"
node --test tests/*.test.cjs 2>&1 | grep -E '^ℹ (tests|pass|fail)'

echo "== qr-onboarding"
"$root/qr-onboarding/build.sh"

echo "== pos-cafeteria"
cd "$root/pos-cafeteria"
if [ -d node_modules ]; then
  npm test 2>&1 | grep -E '^ℹ (tests|pass|fail)'
else
  echo "omitido: ejecuta 'npm install' en pos-cafeteria/ (requiere red)"
fi
