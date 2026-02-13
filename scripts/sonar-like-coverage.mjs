/**
 * Propósito: calcular cobertura de líneas "sonar-like" desde un LCOV mergeado,
 * aplicando `sonar.coverage.exclusions` de `sonar-project.properties`.
 *
 * Nota:
 * - Esto NO reemplaza un análisis real de SonarQube; es una aproximación local útil
 *   cuando Sonar no se puede ejecutar (p.ej. Docker caído).
 *
 * Uso (desde `monorepo-bca/`):
 * - `node scripts/sonar-like-coverage.mjs --lcov coverage/lcov.new15.info`
 *
 * Importante:
 * - Evito escribir patrones tipo `** / *` (sin espacios) en comentarios de bloque,
 *   porque la secuencia `* /` (sin espacio) puede cerrar el comentario.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeToPosix(p) {
  return p.replace(/\\/g, '/');
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

/**
 * Convierte un glob estilo Sonar (por ejemplo, `** / *`, `*.ts`, etc.) a RegExp.
 * Implementación simple, evitando regex inválidas con `**`.
 */
function globToRegExp(glob) {
  const g = normalizeToPosix(glob.trim());
  if (!g) return null;

  let re = '^';
  for (let i = 0; i < g.length; i += 1) {
    const ch = g[i];

    // `**` => cualquier cosa (incluyendo `/`)
    if (ch === '*' && g[i + 1] === '*') {
      re += '.*';
      i += 1;
      continue;
    }

    // `*` => cualquier cosa excepto `/`
    if (ch === '*') {
      re += '[^/]*';
      continue;
    }

    // `?` => un char excepto `/`
    if (ch === '?') {
      re += '[^/]';
      continue;
    }

    // Escape de metacaracteres regex
    if ('\\.^$+()[]{}|'.includes(ch)) {
      re += `\\${ch}`;
      continue;
    }

    re += ch;
  }

  re += '$';
  return new RegExp(re);
}

function parseSonarProperties(propsPath) {
  const raw = readTextFile(propsPath);
  const lines = raw.split(/\r?\n/);

  // Soporta continuaciones con `\` al final de línea.
  const mergedLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    if (line.trimStart().startsWith('#')) continue;

    if (mergedLines.length === 0) {
      mergedLines.push(line);
      continue;
    }

    const prev = mergedLines[mergedLines.length - 1];
    if (prev.endsWith('\\')) {
      mergedLines[mergedLines.length - 1] = prev.slice(0, -1) + line;
    } else {
      mergedLines.push(line);
    }
  }

  const map = new Map();
  for (const line of mergedLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    map.set(key, value);
  }
  return map;
}

function parseArgs(argv) {
  const args = { lcov: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--lcov') {
      args.lcov = argv[i + 1] ?? null;
      i += 1;
    }
  }
  return args;
}

function parseLcovLineCoverage(lcovContent, repoRoot, exclusionRes) {
  let currentFile = null;
  let total = 0;
  let hit = 0;

  const lines = lcovContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('SF:')) {
      const sfRaw = line.slice(3).trim();
      const sfPosix = normalizeToPosix(sfRaw);

      // Intentamos normalizar a path relativo al repo.
      const absRepo = normalizeToPosix(path.resolve(repoRoot));
      if (sfPosix.startsWith(absRepo + '/')) {
        currentFile = sfPosix.slice(absRepo.length + 1);
      } else {
        currentFile = sfPosix.replace(/^\.?\//, '');
      }

      continue;
    }

    if (line.startsWith('end_of_record')) {
      currentFile = null;
      continue;
    }

    if (!currentFile) continue;

    // Exclusion por archivo (coverage)
    if (exclusionRes.some((re) => re.test(currentFile))) {
      continue;
    }

    if (line.startsWith('DA:')) {
      const payload = line.slice(3);
      const commaIdx = payload.indexOf(',');
      if (commaIdx === -1) continue;
      const countStr = payload.slice(commaIdx + 1);
      const count = Number(countStr);
      total += 1;
      if (Number.isFinite(count) && count > 0) hit += 1;
    }
  }

  return { total, hit };
}

function main() {
  const scriptFilePath = fileURLToPath(import.meta.url);
  const scriptDirPath = path.dirname(scriptFilePath);
  const repoRoot = path.resolve(scriptDirPath, '..');

  const { lcov } = parseArgs(process.argv.slice(2));
  if (!lcov) {
    console.error('Falta argumento: --lcov <path>');
    process.exitCode = 2;
    return;
  }

  const lcovPath = path.isAbsolute(lcov) ? lcov : path.join(repoRoot, lcov);
  if (!fileExists(lcovPath)) {
    console.error(`No existe LCOV: ${lcovPath}`);
    process.exitCode = 2;
    return;
  }

  const propsPath = path.join(repoRoot, 'sonar-project.properties');
  if (!fileExists(propsPath)) {
    console.error(`No existe sonar-project.properties en: ${propsPath}`);
    process.exitCode = 2;
    return;
  }

  const props = parseSonarProperties(propsPath);
  const exclusionsRaw = props.get('sonar.coverage.exclusions') ?? '';
  const patterns = exclusionsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const exclusionRes = patterns
    .map((p) => globToRegExp(p))
    .filter((re) => re !== null);

  const lcovContent = readTextFile(lcovPath);
  const { total, hit } = parseLcovLineCoverage(lcovContent, repoRoot, exclusionRes);

  const pct = total === 0 ? 0 : (hit / total) * 100;
  console.log(`sonar-like lines: ${(pct).toFixed(2)}% (${hit}/${total})`);
}

main();

