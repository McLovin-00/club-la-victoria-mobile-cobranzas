/**
 * Script para ejecutar tests de Playwright con organización por portal y timestamp.
 * 
 * Estructura resultante:
 * test-results/
 * ├── cliente/
 * │   ├── cliente-2025-12-30-0913/
 * │   └── cliente-2025-12-30-1400/
 * ├── chofer/
 * │   └── chofer-2025-12-30-0917/
 * └── ...
 * 
 * Uso:
 *   node scripts/run-portal-tests.js cliente
 *   node scripts/run-portal-tests.js chofer
 *   node scripts/run-portal-tests.js all
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORTALS = ['cliente', 'chofer', 'transportista', 'dadorDeCarga', 'adminInterno'];

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}${minutes}`;
}

function runTestsForPortal(portal) {
    const timestamp = getTimestamp();
    const outputDir = path.join('test-results', portal, `${portal}-${timestamp}`);

    // Crear directorio si no existe
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Ejecutando tests del portal: ${portal}`);
    console.log(`📁 Output: ${outputDir}`);
    console.log(`${'='.repeat(60)}\n`);

    const command = `npx playwright test --project=${portal} --output="${outputDir}" --workers=1`;

    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`\n✅ Portal ${portal} completado exitosamente`);
        return { portal, success: true, outputDir };
    } catch (error) {
        console.log(`\n⚠️ Portal ${portal} completado con errores`);
        return { portal, success: false, outputDir };
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Uso: node scripts/run-portal-tests.js <portal|all>');
        console.log('Portales disponibles:', PORTALS.join(', '));
        process.exit(1);
    }

    const target = args[0].toLowerCase();

    if (target === 'all') {
        console.log('🔄 Ejecutando tests de TODOS los portales...\n');
        const results = [];

        for (const portal of PORTALS) {
            const result = runTestsForPortal(portal);
            results.push(result);
        }

        // Resumen final
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 RESUMEN FINAL');
        console.log(`${'='.repeat(60)}`);

        for (const r of results) {
            const icon = r.success ? '✅' : '⚠️';
            console.log(`${icon} ${r.portal}: ${r.outputDir}`);
        }
    } else if (PORTALS.includes(target) || PORTALS.map(p => p.toLowerCase()).includes(target)) {
        // Buscar el portal con el case correcto
        const portal = PORTALS.find(p => p.toLowerCase() === target.toLowerCase()) || target;
        runTestsForPortal(portal);
    } else {
        console.error(`❌ Portal desconocido: ${target}`);
        console.log('Portales disponibles:', PORTALS.join(', '));
        process.exit(1);
    }
}

main();
