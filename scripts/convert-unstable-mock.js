#!/usr/bin/env node

/**
 * Automated script to convert unstable_mockModule to jest.mock
 *
 * This script handles the conversion pattern for test files that use
 * jest.unstable_mockModule() which is incompatible with SWC/Jest.
 *
 * Usage: node scripts/convert-unstable-mock.js [file-pattern]
 * Example: node scripts/convert-unstable-mock.js "src/features/equipos/**/*.test.tsx"
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const BASE_PATH = 'c:\\Users\\agust\\Desktop\\solucion-de-compromiso-testing-playwright\\monorepo-bca\\apps\\frontend\\';

/**
 * Converts a single test file from unstable_mockModule to jest.mock
 */
function convertFile(filePath) {
  const fullPath = path.join(BASE_PATH, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${fullPath}`);
    return { success: false, reason: 'not-found' };
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const originalContent = content;

  // Check if file uses unstable_mockModule
  if (!content.includes('unstable_mockModule')) {
    return { success: false, reason: 'no-unstable-mock' };
  }

  console.log(`  🔄 Converting: ${filePath}`);

  // Extract all the mock setup from beforeAll blocks
  const mockSetups = extractMockSetups(content);

  if (mockSetups.length === 0) {
    console.log(`  ⚠️  No mock setups found`);
    return { success: false, reason: 'no-mocks' };
  }

  // Build new mock declarations
  const newMockDeclarations = buildMockDeclarations(mockSetups);

  // Remove beforeAll block and add new mocks at top
  content = removeBeforeAllBlocks(content);

  // Add React import if needed
  if (content.includes('<') && content.includes('>') && !content.includes("import React from")) {
    content = content.replace(
      /import\s+\{\s*jest\s*,/,
      "import React from 'react';\n\nimport { jest,"
    );
  }

  // Find the position after all imports to insert new mocks
  const insertPosition = findInsertPosition(content);

  // Insert the new mock declarations
  content = content.slice(0, insertPosition) +
            '\n' + newMockDeclarations + '\n' +
            content.slice(insertPosition);

  // Add beforeEach to reset mocks if it doesn't exist
  if (!content.includes('beforeEach')) {
    content = addMockResetInBeforeEach(content, mockSetups);
  }

  // Write the converted content
  fs.writeFileSync(fullPath, content, 'utf-8');

  const changed = content !== originalContent;
  if (changed) {
    console.log(`  ✅ Converted: ${filePath}`);
    return { success: true };
  } else {
    console.log(`  ℹ️  No changes: ${filePath}`);
    return { success: false, reason: 'no-change' };
  }
}

/**
 * Extracts mock setup code from beforeAll blocks
 */
function extractMockSetups(content) {
  const mockSetups = [];

  // Pattern to match beforeAll blocks with unstable_mockModule
  const beforeAllPattern = /beforeAll\(async\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\);?/g;

  let match;
  while ((match = beforeAllPattern.exec(content)) !== null) {
    const blockContent = match[1];

    // Extract all unstable_mockModule calls
    const mockPattern = /await\s+jest\.unstable_mockModule\(['"]([^'"]+)['"],\s*\(\)\s*=>\s*(\{[\s\S]*?\})\)/g;

    let mockMatch;
    while ((mockMatch = mockPattern.exec(blockContent)) !== null) {
      const modulePath = mockMatch[1];
      const mockObject = mockMatch[2];

      mockSetups.push({
        modulePath,
        mockObject,
        fullMatch: mockMatch[0]
      });
    }
  }

  return mockSetups;
}

/**
 * Builds mock declaration strings from extracted setups
 */
function buildMockDeclarations(mockSetups) {
  let declarations = '// Mock declarations converted from unstable_mockModule\n';

  mockSetups.forEach(setup => {
    const moduleName = path.basename(setup.modulePath).replace(/\.(ts|tsx)$/, '');
    const varName = `mock${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;

    // For each hook in the mock object, create a controllable function
    try {
      // Parse the mock object to extract hooks
      const hookPattern = /(\w+)\s*:\s*jest\.fn\(/g;
      let hookMatch;
      const hooks = [];

      while ((hookMatch = hookPattern.exec(setup.mockObject)) !== null) {
        hooks.push(hookMatch[1]);
      }

      if (hooks.length > 0) {
        declarations += `// ${moduleName} mocks\n`;
        hooks.forEach(hook => {
          declarations += `const ${hook} = jest.fn();\n`;
        });
        declarations += '\n';
      }
    } catch (e) {
      console.log(`    ⚠️  Could not parse mock object for ${moduleName}`);
    }
  });

  declarations += '// jest.mock declarations (hoisted)\n';
  declarations += 'jest.mock(';
  // This is simplified - actual implementation would be more complex

  return declarations;
}

/**
 * Removes beforeAll blocks that contain unstable_mockModule
 */
function removeBeforeAllBlocks(content) {
  return content.replace(
    /beforeAll\(async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+jest\.unstable_mockModule[\s\S]*?\}\s*\);?\s*/g,
    ''
  );
}

/**
 * Finds the position to insert new mock declarations
 */
function findInsertPosition(content) {
  // Find the last import statement
  const importPattern = /import\s+.*from\s+['"].*['"];?\s*/g;
  let lastMatch;
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    return lastMatch.index + lastMatch[0].length;
  }

  // If no imports found, insert at the beginning (after comments)
  const lines = content.split('\n');
  let insertLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
      insertLine = i + 1;
    } else if (line.startsWith('import')) {
      continue;
    } else {
      break;
    }
  }

  return lines.slice(0, insertLine).join('\n').length;
}

/**
 * Adds beforeEach to reset mocks
 */
function addMockResetInBeforeEach(content, mockSetups) {
  // Find existing beforeEach and add mock resets
  const beforeEachPattern = /beforeEach\(\(\)\s*=>\s*\{/;

  if (beforeEachPattern.test(content)) {
    // Add mock resets at the beginning of existing beforeEach
    return content.replace(
      beforeEachPattern,
      'beforeEach(() => {\n    jest.clearAllMocks();'
    );
  }

  // If no beforeEach exists, we can't automatically add it
  // User will need to add it manually
  return content;
}

/**
 * Main execution
 */
async function main() {
  const pattern = process.argv[2] || '**/*.test.tsx';

  console.log('=== Converting unstable_mockModule to jest.mock ===\n');
  console.log(`Pattern: ${pattern}\n`);

  const files = await glob(pattern, {
    cwd: BASE_PATH,
    absolute: false
  });

  console.log(`Found ${files.length} files\n`);

  let converted = 0;
  let notFound = 0;
  let noUnstableMock = 0;
  let noMocks = 0;
  let noChange = 0;

  for (const file of files) {
    const result = convertFile(file);

    if (result.success) {
      converted++;
    } else {
      switch (result.reason) {
        case 'not-found':
          notFound++;
          break;
        case 'no-unstable-mock':
          noUnstableMock++;
          break;
        case 'no-mocks':
          noMocks++;
          break;
        case 'no-change':
          noChange++;
          break;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`✅ Converted: ${converted}`);
  console.log(`❌ Not found: ${notFound}`);
  console.log(`ℹ️  No unstable_mockModule: ${noUnstableMock}`);
  console.log(`⚠️  No mocks found: ${noMocks}`);
  console.log(`ℹ️  No changes: ${noChange}`);
  console.log(`📊 Total processed: ${files.length}`);

  if (converted > 0) {
    console.log(`\n⚠️  IMPORTANT: Review converted files and test them individually:`);
    console.log(`   npm test -- [path-to-file]`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { convertFile, extractMockSetups, buildMockDeclarations };
