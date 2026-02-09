/**
 * Propósito: generar archivos de checklist (uno por portal) en `docs/checklists/`
 * a partir del texto extraído del PDF (`pruebas-del-sistema.txt`).
 *
 * Notas:
 * - No requiere dependencias externas.
 * - Mantiene la estructura de secciones y convierte los bullets del PDF en markdown.
 */

const fs = require('fs');
const path = require('path');

/**
 * Normaliza un nombre de portal para usarlo como nombre de archivo.
 * @param {string} portalName
 * @returns {string}
 */
function toSlug(portalName) {
  return portalName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Convierte una línea del PDF a markdown cuando corresponde.
 * @param {string} line
 * @returns {string | null}
 */
function toMarkdownLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Checkboxes (del PDF): "• [ ] ..."
  if (trimmed.startsWith('• [ ]')) {
    return `- [ ] ${trimmed.slice('• [ ]'.length).trim()}`;
  }

  // Bullets secundarios (sin checkbox)
  if (trimmed.startsWith('• ')) {
    return `- ${trimmed.slice('• '.length).trim()}`;
  }

  // Separadores del extractor
  if (/^--\s+\d+\s+of\s+\d+\s+--$/.test(trimmed)) return null;

  // Títulos de sección: "1. AUTENTICACIÓN Y ACCESO"
  if (/^\d+\.\s+/.test(trimmed)) return `## ${trimmed}`;

  // Sub-secciones: "1.1 Login"
  if (/^\d+\.\d+\s+/.test(trimmed)) return `### ${trimmed}`;

  return trimmed;
}

/**
 * @param {string[]} lines
 * @returns {Array<{ name: string, contentLines: string[] }>}
 */
function splitByPortal(lines) {
  /** @type {Array<{ name: string, contentLines: string[] }>} */
  const portals = [];

  /** @type {{ name: string, contentLines: string[] } | null} */
  let current = null;
  let pendingPortalFromDash = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    const m1 = trimmed.match(/^Lista de Pruebas - Portal\s+(.+)$/i);
    if (m1) {
      current = { name: m1[1].trim(), contentLines: [] };
      portals.push(current);
      pendingPortalFromDash = false;
      continue;
    }

    // Caso especial que aparece partido en dos líneas:
    // "Lista de Pruebas -" y en la siguiente "Portal X"
    if (/^Lista de Pruebas\s*-\s*$/i.test(trimmed)) {
      pendingPortalFromDash = true;
      continue;
    }

    if (pendingPortalFromDash) {
      const m2 = trimmed.match(/^Portal\s+(.+)$/i);
      if (m2) {
        current = { name: m2[1].trim(), contentLines: [] };
        portals.push(current);
        pendingPortalFromDash = false;
        continue;
      }
      // Si no matchea, seguimos esperando a ver si aparece "Portal ..."
    }

    if (!current) continue;
    current.contentLines.push(line);
  }

  return portals;
}

/**
 * Une líneas “cortadas” típicas del extractor del PDF.
 * Regla práctica: si una línea no es heading ni bullet, y la anterior es un bullet,
 * se considera continuación y se concatena.
 * @param {string[]} rawLines
 * @returns {string[]}
 */
function mergeWrappedLines(rawLines) {
  /** @type {string[]} */
  const out = [];

  const isHeading = (t) => /^\d+\.\s+/.test(t) || /^\d+\.\d+\s+/.test(t);
  const isBullet = (t) => t.startsWith('• [ ]') || t.startsWith('• ');
  const isSeparator = (t) => /^--\s+\d+\s+of\s+\d+\s+--$/.test(t);

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed || isSeparator(trimmed)) {
      out.push(line);
      continue;
    }

    const prevIdx = out.length - 1;
    if (prevIdx >= 0) {
      const prevTrimmed = out[prevIdx].trim();
      const shouldMerge =
        !isHeading(trimmed) &&
        !isBullet(trimmed) &&
        !/^Lista de Pruebas/i.test(trimmed) &&
        isBullet(prevTrimmed) &&
        !prevTrimmed.endsWith(':');

      if (shouldMerge) {
        out[prevIdx] = `${out[prevIdx].trimEnd()} ${trimmed}`;
        continue;
      }
    }

    out.push(line);
  }

  return out;
}

function main() {
  const repoRoot = process.cwd();
  const inputPath = path.join(repoRoot, 'pruebas-del-sistema.txt');
  const outDir = path.join(repoRoot, 'docs', 'checklists');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`No existe ${inputPath}. Primero generá pruebas-del-sistema.txt desde el PDF.`);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const portals = splitByPortal(lines);

  if (portals.length === 0) {
    throw new Error('No se detectaron portales. Revisar el formato de pruebas-del-sistema.txt.');
  }

  for (const portal of portals) {
    const slug = toSlug(portal.name);
    const fileName = `${slug}.md`;
    const outPath = path.join(outDir, fileName);

    const mergedLines = mergeWrappedLines(portal.contentLines);

    const mdLines = [];
    mdLines.push(`<!-- Propósito: checklist del Portal ${portal.name} (derivado de pruebas-del-sistema.txt). -->`);
    mdLines.push('');
    mdLines.push(`# Portal ${portal.name} - Checklist`);
    mdLines.push('');
    mdLines.push(`Fuente: \`pruebas-del-sistema.txt\` (extraído del PDF).`);
    mdLines.push('');

    for (const rawLine of mergedLines) {
      const converted = toMarkdownLine(rawLine);
      if (converted == null) continue;
      mdLines.push(converted);
    }

    mdLines.push('');
    fs.writeFileSync(outPath, mdLines.join('\n'), 'utf8');
  }

  // Índice
  const indexPath = path.join(outDir, 'README.md');
  const index = [];
  index.push('<!-- Propósito: índice de checklists por portal. -->');
  index.push('');
  index.push('# Checklists por portal');
  index.push('');
  for (const portal of portals) {
    const slug = toSlug(portal.name);
    index.push(`- [Portal ${portal.name}](./${slug}.md)`);
  }
  index.push('');
  fs.writeFileSync(indexPath, index.join('\n'), 'utf8');

  // eslint-disable-next-line no-console
  console.log(`Generados ${portals.length} checklists en ${path.relative(repoRoot, outDir)}`);
}

main();


