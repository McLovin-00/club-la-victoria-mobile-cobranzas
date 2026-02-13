#!/bin/bash
# Phase 1 Coverage Test Script
echo "=================================="
echo "Running Phase 1 Coverage Tests"
echo "=================================="
echo ""

cd "$(dirname "$0")/.."

npm run test:coverage -- \
  --testMatch="**/EquiposPage.coverage.test.tsx" \
  --testMatch="**/AltaEquipoCompletaPage.coverage.test.tsx" \
  --testMatch="**/EditarEquipoPage.coverage.test.tsx" \
  --collectCoverageFrom="src/features/documentos/pages/EquiposPage.tsx" \
  --collectCoverageFrom="src/features/equipos/pages/AltaEquipoCompletaPage.tsx" \
  --collectCoverageFrom="src/features/equipos/pages/EditarEquipoPage.tsx"

echo ""
echo "=================================="
echo "Phase 1 Coverage Report Complete"
echo "=================================="
