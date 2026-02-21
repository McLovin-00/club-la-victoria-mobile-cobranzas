/**
 * Propósito: Script para analizar cobertura entre checklists y tests.
 * Genera un reporte de gaps entre lo documentado y lo implementado.
 * 
 * Uso: npx ts-node scripts/coverage-report.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ChecklistItem {
    section: string;
    subsection: string;
    text: string;
    line: number;
}

interface TestItem {
    file: string;
    describe: string;
    testName: string;
    line: number;
}

interface CoverageReport {
    portal: string;
    checklistItems: number;
    testsCount: number;
    coverage: number;
    unmatchedChecklist: ChecklistItem[];
    unmatchedTests: TestItem[];
}

const PORTALS = ['cliente', 'chofer', 'empresa-transportista', 'dador-de-carga', 'admin-interno'];

function parseChecklistItems(filePath: string): ChecklistItem[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const items: ChecklistItem[] = [];

    let currentSection = '';
    let currentSubsection = '';

    lines.forEach((line, index) => {
        // Detectar sección (## N. TITULO)
        const sectionMatch = line.match(/^## (\d+)\. (.+)/);
        if (sectionMatch) {
            currentSection = `${sectionMatch[1]}. ${sectionMatch[2]}`;
            currentSubsection = '';
            return;
        }

        // Detectar subsección (### N.N Titulo)
        const subsectionMatch = line.match(/^### (\d+\.\d+) (.+)/);
        if (subsectionMatch) {
            currentSubsection = `${subsectionMatch[1]} ${subsectionMatch[2]}`;
            return;
        }

        // Detectar item checklist (- [x] ...)
        const itemMatch = line.match(/^- \[x\] (.+)/);
        if (itemMatch) {
            items.push({
                section: currentSection,
                subsection: currentSubsection,
                text: itemMatch[1].trim(),
                line: index + 1
            });
        }
    });

    return items;
}

function parseTestItems(testDir: string): TestItem[] {
    const items: TestItem[] = [];
    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts'));

    files.forEach(file => {
        const filePath = path.join(testDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        let currentDescribe = '';

        lines.forEach((line, index) => {
            // Detectar describe
            const describeMatch = line.match(/test\.describe\(['"](.+)['"]/);
            if (describeMatch) {
                currentDescribe = describeMatch[1];
            }

            // Detectar test
            const testMatch = line.match(/^\s*test\(['"](.+)['"]/);
            if (testMatch) {
                items.push({
                    file,
                    describe: currentDescribe,
                    testName: testMatch[1],
                    line: index + 1
                });
            }
        });
    });

    return items;
}

function generateReport(): void {
    const reports: CoverageReport[] = [];

    const portalMappings: Record<string, string> = {
        'cliente': 'cliente',
        'chofer': 'chofer',
        'empresa-transportista': 'transportista',
        'dador-de-carga': 'dador',
        'admin-interno': 'admin-interno'
    };

    for (const portal of PORTALS) {
        const checklistPath = path.join(__dirname, '..', 'docs', 'checklists', `${portal}.md`);
        const testDir = path.join(__dirname, '..', 'tests', portalMappings[portal]);

        if (!fs.existsSync(checklistPath)) {
            console.warn(`Checklist no encontrado: ${checklistPath}`);
            continue;
        }

        if (!fs.existsSync(testDir)) {
            console.warn(`Directorio de tests no encontrado: ${testDir}`);
            continue;
        }

        const checklistItems = parseChecklistItems(checklistPath);
        const testItems = parseTestItems(testDir);

        const coverage = testItems.length / checklistItems.length * 100;

        reports.push({
            portal,
            checklistItems: checklistItems.length,
            testsCount: testItems.length,
            coverage: Math.round(coverage),
            unmatchedChecklist: [], // PENDIENTE: implementar matching
            unmatchedTests: []
        });
    }

    // Generar output
    console.log('\n========================================');
    console.log('       REPORTE DE COBERTURA');
    console.log('========================================\n');

    let totalChecklist = 0;
    let totalTests = 0;

    reports.forEach(r => {
        console.log(`📋 ${r.portal.toUpperCase()}`);
        console.log(`   Checklist items: ${r.checklistItems}`);
        console.log(`   Tests: ${r.testsCount}`);
        console.log(`   Cobertura: ${r.coverage}%`);
        console.log('');

        totalChecklist += r.checklistItems;
        totalTests += r.testsCount;
    });

    console.log('----------------------------------------');
    console.log(`TOTAL: ${totalTests} tests / ${totalChecklist} items`);
    console.log(`COBERTURA GLOBAL: ${Math.round(totalTests / totalChecklist * 100)}%`);
    console.log('========================================\n');
}

// Ejecutar
generateReport();
