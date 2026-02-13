/**
 * Propósito: mergear reportes LCOV de los workspaces SIN borrar `coverage/`.
 *
 * Motivo:
 * - En Windows a veces `coverage/lcov.info` queda lockeado (EBUSY) y el merge tradicional falla.
 * - Este script genera un archivo nuevo `coverage/lcov.new<N>.info` para evitar tocar el anterior.
 *
 * Uso (desde `monorepo-bca/`):
 * - `node scripts/merge-lcov-safe.mjs`
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  if (/^[a-zA-Z]:[\\/]/.test(p)) return true;
  return p.startsWith('/');
}

/**
 * Reescribe líneas `SF:` del LCOV para que queden relativas al root del monorepo.
 * Sin esto, SonarQube suele no mapear correctamente paths en monorepos.
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

function nextLcovNewPath(coverageDir) {
  const prefix = 'lcov.new';
  const suffix = '.info';

  let maxN = 0;
  if (fileExists(coverageDir)) {
    for (const entry of fs.readdirSync(coverageDir)) {
      if (!entry.startsWith(prefix) || !entry.endsWith(suffix)) continue;
      const nStr = entry.slice(prefix.length, entry.length - suffix.length);
      const n = Number(nStr);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    }
  }

  return path.join(coverageDir, `${prefix}${maxN + 1}${suffix}`);
}

function main() {
  const scriptFilePath = fileURLToPath(import.meta.url);
  const scriptDirPath = path.dirname(scriptFilePath);
  const repoRoot = path.resolve(scriptDirPath, '..');
  const coverageDir = path.join(repoRoot, 'coverage');

  // Workspaces que generan `coverage/lcov.info` hoy.
  const workspaceDirs = [
    'packages/utils',
    'packages/types',
    'apps/backend',
    'apps/documentos',
    'apps/frontend',
    'apps/remitos',
  ];

  fs.mkdirSync(coverageDir, { recursive: true });

  const mergedContent = workspaceDirs
    .map((workspaceDir) => {
      const workspacePath = path.join(repoRoot, workspaceDir);
      const workspaceLcov = path.join(workspacePath, 'coverage', 'lcov.info');

      if (!fileExists(workspaceLcov)) {
        console.warn(`⚠️ LCOV no encontrado: ${path.relative(repoRoot, workspaceLcov)}`);
        return '';
      }

      const raw = readTextFile(workspaceLcov);
      return rewriteLcovSourcePaths(raw, workspaceDir);
    })
    .filter(Boolean)
    .join('\n');

  if (!mergedContent) {
    console.warn('⚠️ No hay contenido LCOV para mergear.');
    process.exitCode = 1;
    return;
  }

  const outPath = nextLcovNewPath(coverageDir);
  writeTextFile(outPath, mergedContent);

  console.log(`✅ LCOV mergeado (sin borrar coverage): ${path.relative(repoRoot, outPath)}`);
}

main();

