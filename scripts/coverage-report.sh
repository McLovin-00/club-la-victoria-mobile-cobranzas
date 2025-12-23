#!/bin/bash
# Script para generar reportes de coverage y mergearlos para SonarQube
# Uso: ./scripts/coverage-report.sh

set -e

WORKSPACE_ROOT="/home/administrador/monorepo-bca"
COVERAGE_DIR="$WORKSPACE_ROOT/coverage"

echo "🧹 Limpiando reportes anteriores..."
rm -rf "$COVERAGE_DIR"
mkdir -p "$COVERAGE_DIR"

echo ""
echo "📦 Generando coverage para packages/utils..."
cd "$WORKSPACE_ROOT/packages/utils"
npx jest --coverage --coverageReporters=lcov --coverageReporters=text --passWithNoTests --silent 2>/dev/null || echo "⚠️ Algunos tests fallaron en utils"

echo ""
echo "📦 Generando coverage para apps/backend..."
cd "$WORKSPACE_ROOT/apps/backend"
npx jest --coverage --coverageReporters=lcov --coverageReporters=text --passWithNoTests --silent 2>/dev/null || echo "⚠️ Algunos tests fallaron en backend"

echo ""
echo "📦 Generando coverage para apps/documentos..."
cd "$WORKSPACE_ROOT/apps/documentos"
npx jest --coverage --coverageReporters=lcov --coverageReporters=text --passWithNoTests --silent 2>/dev/null || echo "⚠️ Algunos tests fallaron en documentos"

echo ""
echo "📦 Generando coverage para apps/remitos..."
cd "$WORKSPACE_ROOT/apps/remitos"
npx jest --coverage --coverageReporters=lcov --coverageReporters=text --passWithNoTests --silent 2>/dev/null || echo "⚠️ Algunos tests fallaron en remitos"

echo ""
echo "📋 Mergeando reportes LCOV..."
cd "$WORKSPACE_ROOT"

# Merge all lcov.info files into one
LCOV_FILES=""
for lcov in $(find . -path "*/coverage/lcov.info" ! -path "./coverage/*" 2>/dev/null); do
  if [ -f "$lcov" ]; then
    LCOV_FILES="$LCOV_FILES $lcov"
    echo "  📄 Encontrado: $lcov"
  fi
done

if [ -n "$LCOV_FILES" ]; then
  cat $LCOV_FILES > "$COVERAGE_DIR/lcov.info"
  echo ""
  echo "✅ Reporte mergeado en: $COVERAGE_DIR/lcov.info"
  echo "📊 Líneas totales: $(wc -l < "$COVERAGE_DIR/lcov.info")"
else
  echo "⚠️ No se encontraron reportes LCOV"
fi

echo ""
echo "📈 Resumen de coverage por app:"
echo "================================"

for dir in packages/utils apps/backend apps/documentos apps/remitos; do
  if [ -f "$WORKSPACE_ROOT/$dir/coverage/lcov.info" ]; then
    lines=$(wc -l < "$WORKSPACE_ROOT/$dir/coverage/lcov.info")
    echo "  $dir: $lines líneas de lcov"
  fi
done

echo ""
echo "🚀 Listo para ejecutar SonarQube:"
echo "   cd $WORKSPACE_ROOT"
echo "   docker run --rm -v \"\$(pwd):/usr/src\" sonarsource/sonar-scanner-cli \\"
echo "     -Dsonar.host.url=http://10.3.0.244:9900 \\"
echo "     -Dsonar.login=<TOKEN>"



