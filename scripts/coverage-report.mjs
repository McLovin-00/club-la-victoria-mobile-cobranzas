/**
 * Propósito: generar reportes de cobertura (lcov) por workspace y mergearlos para SonarQube.
 *
 * Motivo:
 * - Los scripts `.sh` no son portables en Windows/PowerShell.
 * - SonarQube consume `lcov.info` (ver `sonar-project.properties`).
 *
 * Uso (desde `monorepo-bca/`):
 * - `npm run test:coverage`
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Ejecuta un comando con timeout para evitar procesos colgados en CI/local.
 */
function runCommand(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    shell: false,
    stdio: 'inherit',
    timeout: 10 * 60 * 1000, // 10 minutos por workspace
  });

  // `spawnSync` devuelve `null` si el proceso no llega a spawnearse.
  if (!result) {
    throw new Error(`No se pudo ejecutar el comando: ${command}`);
  }

  // Si se corta por timeout, Node setea `signal`.
  if (result.signal) {
    throw new Error(`Comando interrumpido (${result.signal}): ${command} ${args.join(' ')}`);
  }

  return result.status ?? 0;
}

function ensureEmptyDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, { encoding: 'utf-8' });
}

function writeTextFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
}

function normalizeToPosix(p) {
  return p.replace(/\\/g, '/');
}

function isAbsolutePath(p) {
  // Windows: C:\...
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  // Posix: /...
  return p.startsWith('/');
}

/**
 * Reescribe líneas `SF:` del LCOV para que queden relativas al root del monorepo.
 * Sin esto, SonarQube no puede mapear correctamente `src/...` a `apps/<ws>/src/...`.
 */
function rewriteLcovSourcePaths(lcovContent, workspaceDir) {
  const wsPrefix = normalizeToPosix(workspaceDir).replace(/\/+$/, '');

  return lcovContent
    .split(/\r?\n/)
    .map((line) => {
      if (!line.startsWith('SF:')) return line;

      const rawPath = line.slice(3).trim();
      if (!rawPath) return line;

      const normalized = normalizeToPosix(rawPath);

      // Si ya es absoluto o ya viene prefijado con el workspace, no tocamos.
      if (isAbsolutePath(normalized) || normalized.startsWith(`${wsPrefix}/`)) {
        return `SF:${normalized}`;
      }

      // Prefix con el workspace para que sea resoluble desde el root del repo.
      return `SF:${wsPrefix}/${normalized.replace(/^\.?\//, '')}`;
    })
    .join('\n');
}

function main() {
  const scriptFilePath = fileURLToPath(import.meta.url);
  const scriptDirPath = path.dirname(scriptFilePath);
  const repoRoot = path.resolve(scriptDirPath, '..');
  const mergedCoverageDir = path.join(repoRoot, 'coverage');
  const mergedLcovPath = path.join(mergedCoverageDir, 'lcov.info');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // Workspaces que hoy tienen Jest instalado/configurado.
  // Nota: `apps/frontend` se incluye porque genera `apps/frontend/coverage/lcov.info` consumido por Sonar.
  const workspaceDirs = [
    'packages/utils',
    'packages/types',
    'apps/backend',
    'apps/documentos',
    'apps/frontend',
    'apps/remitos',
  ];

  console.log('🧹 Limpiando coverage mergeado...');
  ensureEmptyDir(mergedCoverageDir);

  const lcovFiles = [];

  for (const workspaceDir of workspaceDirs) {
    const workspacePath = path.join(repoRoot, workspaceDir);
    const workspaceLcov = path.join(workspacePath, 'coverage', 'lcov.info');

    console.log('');
    console.log(`📦 Generando coverage: ${workspaceDir}`);

    // Corremos vía `npm test -- --coverage` para respetar la configuración propia del workspace.
    // `--passWithNoTests` evita que coverage falle por falta de tests (si aplica).
    const exitCode = runCommand(
      npmCmd,
      [
        'test',
        '--',
        '--coverage',
        '--coverageReporters=lcov',
        '--coverageReporters=text',
        '--passWithNoTests',
        // Evita inconsistencias por cache de transforms/coverage (especialmente con ts-jest).
        '--no-cache',
      ],
      { cwd: workspacePath },
    );

    if (exitCode !== 0) {
      console.warn(`⚠️ Tests con fallas en ${workspaceDir} (exitCode=${exitCode}). Continúo para no bloquear el merge de lcov.`);
    }

    if (fileExists(workspaceLcov)) {
      console.log(`  📄 LCOV encontrado: ${path.relative(repoRoot, workspaceLcov)}`);
      lcovFiles.push(workspaceLcov);
    } else {
      console.warn(`  ⚠️ No se encontró LCOV en: ${path.relative(repoRoot, workspaceLcov)}`);
    }
  }

  console.log('');
  console.log('📋 Mergeando reportes LCOV...');

  if (lcovFiles.length === 0) {
    console.warn('⚠️ No se encontraron reportes LCOV para mergear.');
    return;
  }

  // Merge por concatenación + reescritura de paths para monorepo.
  const mergedContent = workspaceDirs
    .map((workspaceDir) => {
      const workspacePath = path.join(repoRoot, workspaceDir);
      const workspaceLcov = path.join(workspacePath, 'coverage', 'lcov.info');
      if (!fileExists(workspaceLcov)) return '';
      const raw = readTextFile(workspaceLcov);
      return rewriteLcovSourcePaths(raw, workspaceDir);
    })
    .filter(Boolean)
    .join('\n');

  writeTextFile(mergedLcovPath, mergedContent);

  const totalLines = mergedContent.split(/\r?\n/).length;
  console.log(`✅ Reporte mergeado: ${path.relative(repoRoot, mergedLcovPath)}`);
  console.log(`📊 Líneas totales (aprox): ${totalLines}`);
}

main();
