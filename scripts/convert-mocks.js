/**
 * Script to convert unstable_mockModule to jest.mock
 * Run with: node scripts/convert-mocks.js
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_PROCESS = [
  'src/features/equipos/pages/__tests__/EditarEquipoPage.handlers.test.tsx',
  'src/features/equipos/pages/__tests__/EditarEquipoPage.handlers.simple.test.tsx',
  'src/features/equipos/pages/__tests__/EditarEquipoPage.modals.test.tsx',
  'src/features/equipos/pages/__tests__/EditarEquipoPage.loaded.smoke.test.tsx',
  'src/features/equipos/pages/__tests__/EditarEquipoPage.documents.test.tsx',
  'src/features/equipos/pages/__tests__/EditarEquipoPage.coverage.test.tsx',
  'src/features/equipos/pages/__tests__/AltaEquipoCompletaPage.coverage.test.tsx',
  'src/features/equipos/pages/__tests__/AltaEquipoCompletaPage.creation.test.tsx',
  'src/features/equipos/pages/__tests__/AltaEquipoCompletaPage.render.test.tsx',
  'src/features/platform-users/components/__tests__/RegisterUserModal.permissions.test.tsx',
  'src/features/platform-users/components/__tests__/RegisterUserModal.temp-password.test.tsx',
  'src/features/platform-users/components/__tests__/RegisterUserModal.validation.test.tsx',
  'src/features/platform-users/components/__tests__/EditPlatformUserModal.permissions.test.tsx',
  'src/features/platform-users/components/__tests__/EditPlatformUserModal.validation.test.tsx',
  'src/features/platform-users/components/__tests__/EditPlatformUserModal.submit.test.tsx',
  'src/features/platform-users/pages/__tests__/PlatformUsersPage.test.tsx',
  'src/pages/__tests__/TransportistasPortalPage.edge.test.tsx',
  'src/pages/__tests__/ClientePortalPage.expanded.test.tsx',
  'src/features/documentos/pages/__tests__/FlowiseConfigPage.comprehensive.test.tsx',
  'src/pages/notificaciones/__tests__/NotificationsPage.test.tsx',
  'src/components/layout/__tests__/MainLayout.full.coverage.test.tsx',
  'src/features/documentos/pages/__tests__/DocumentosPage.comprehensive.test.tsx',
  'src/features/documentos/pages/__tests__/EmpresasTransportistasPage.comprehensive.test.tsx',
  'src/features/documentos/pages/__tests__/ConsultaPage.comprehensive.test.tsx',
  'src/features/documentos/pages/__tests__/TemplatesPage.comprehensive.test.tsx',
  'src/features/documentos/pages/__tests__/NotificationsConfigPage.comprehensive.test.tsx',
  'src/features/documentos/__tests__/flows/template-management-flow.test.tsx',
  'src/features/documentos/__tests__/flows/document-approval-flow.test.tsx',
  'src/features/documentos/pages/__tests__/EmpresaTransportistaDetailPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/NotificationsConfigPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/ExtractedDataPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/EvolutionConfigPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/ConsultaPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/ClientRequirementsPage.main.test.tsx',
  'src/features/documentos/pages/__tests__/AuditLogsPage.main.test.tsx',
  'src/features/documentos/pages/__tests__/DashboardDadoresPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/FlowiseConfigPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/AcopladosPage.full.test.tsx',
  'src/features/documentos/components/__tests__/DocumentUploadModal.full.test.tsx',
  'src/features/documentos/pages/__tests__/DocumentosMainPage.full.test.tsx',
  'src/features/documentos/components/__tests__/CameraCapture.error-handling.test.tsx',
  'src/features/documentos/pages/__tests__/EquiposPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/DocumentosPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/TemplatesPage.full.test.tsx',
  'src/features/documentos/pages/__tests__/EquiposPage.extended.test.tsx',
  'src/components/notifications/__tests__/NotificationBell.test.tsx',
];

const BASE_PATH = 'c:\\Users\\agust\\Desktop\\solucion-de-compromiso-testing-playwright\\monorepo-bca\\apps\\frontend\\';

function convertFile(filePath) {
  const fullPath = path.join(BASE_PATH, filePath);
  console.log(`Processing: ${filePath}`);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${fullPath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Pattern 1: Convert unstable_mockModule calls to jest.mock
  // Remove await and change unstable_mockModule to jest.mock
  content = content.replace(/await jest\.unstable_mockModule\(/g, 'jest.mock(');

  // Pattern 2: Remove dynamic import and beforeAll wrapping
  // Find and remove the beforeAll block that contains unstable_mockModule
  content = content.replace(
    /let\s+(\w+)\s*:\s*any\s*;?\s*beforeAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?const\s+module\s*=\s*await\s+import\(['"]([^'"]+)['"]\)[\s\S]*?\1\s*=\s*module\.default\s*;\s*\}\s*\);?\s*)/g,
    (match, componentName, importPath) => {
      // Extract the mock setup from the beforeAll and move it to top-level jest.mock calls
      // Return just the variable declaration without initialization
      return `let ${componentName}: any;`;
    }
  );

  // Pattern 3: Move mock declarations to top of file (before imports)
  // This is complex and may need manual review

  // Pattern 4: Add React import if needed
  if (content.includes('<') && content.includes('>') && !content.includes("import React from")) {
    content = content.replace(
      /import\s+\{\s*jest\s*,/,
      "import React from 'react';\nimport { jest,"
    );
  }

  // Pattern 5: Remove beforeAll when it's only used for dynamic imports
  content = content.replace(
    /beforeAll\(async\s*\(\)\s*=>\s*\{\s*const\s+module\s*=\s*await\s+import\([^)]+\)[^}]*\}\s*\);?\s*/g,
    ''
  );

  // Pattern 6: Convert dynamic imports to regular imports
  // Find patterns like: const Component = await import('./Component')
  content = content.replace(
    /const\s+(\w+)\s*=\s*await\s+import\(['"]([^'"]+)['"]\)[\s\S]*?(\1)\s*=\s*module\.default/g,
    'import $1 from \'$2\''
  );

  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`  ✅ Converted: ${filePath}`);
    return true;
  } else {
    console.log(`  ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

// Process all files
console.log('=== Converting unstable_mockModule to jest.mock ===\n');
let converted = 0;
let notFound = 0;

FILES_TO_PROCESS.forEach(file => {
  const result = convertFile(file);
  if (result === true) converted++;
  if (result === false) notFound++;
});

console.log(`\n=== Summary ===`);
console.log(`Converted: ${converted}`);
console.log(`Not found: ${notFound}`);
console.log(`Total: ${FILES_TO_PROCESS.length}`);
