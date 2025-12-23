#!/bin/bash
# Script to generate and merge coverage reports for SonarQube

set -e

echo "🧪 Generating coverage reports..."

# Create coverage directory
mkdir -p coverage

# Run tests with coverage for each package
echo "📦 Testing packages/utils..."
cd packages/utils
npm test -- --coverage --coverageReporters=lcov --passWithNoTests 2>/dev/null || true
cd ../..

echo "📦 Testing apps/backend..."
cd apps/backend
npm test -- --coverage --coverageReporters=lcov --passWithNoTests 2>/dev/null || true
cd ../..

echo "📦 Testing apps/documentos..."
cd apps/documentos
npm test -- --coverage --coverageReporters=lcov --passWithNoTests 2>/dev/null || true
cd ../..

echo "📦 Testing apps/remitos..."
cd apps/remitos
npm test -- --coverage --coverageReporters=lcov --passWithNoTests 2>/dev/null || true
cd ../..

echo "📋 Merging coverage reports..."

# Install lcov-result-merger if not present
npm list -g lcov-result-merger >/dev/null 2>&1 || npm install -g lcov-result-merger

# Merge all lcov.info files
find . -name "lcov.info" -path "*/coverage/*" ! -path "./coverage/*" | xargs cat > coverage/lcov.info 2>/dev/null || echo "No coverage files found"

echo "✅ Coverage reports merged to coverage/lcov.info"

# Show line count
if [ -f coverage/lcov.info ]; then
  echo "📊 Total lines in merged report: $(wc -l < coverage/lcov.info)"
fi



