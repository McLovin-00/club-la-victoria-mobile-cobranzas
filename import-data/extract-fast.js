const Tesseract = require('tesseract.js');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const DOCS_DIR = path.join(__dirname, 'documentos');
const EXCEL_PATH = path.join(__dirname, 'planilla.xlsx');
const OUTPUT_PATH = path.join(__dirname, 'planilla-con-dni.xlsx');

// Crear worker pool
let scheduler = null;

async function initOCR() {
  scheduler = Tesseract.createScheduler();
  // Crear 4 workers para procesar en paralelo
  for (let i = 0; i < 4; i++) {
    const worker = await Tesseract.createWorker('spa');
    scheduler.addWorker(worker);
  }
  console.log('OCR inicializado con 4 workers');
}

async function terminateOCR() {
  if (scheduler) await scheduler.terminate();
}

function extractFromText(text) {
  let dni = null;
  let apellido = null;
  let nombre = null;
  
  // Buscar DNI con puntos: 32.192.744
  const dniWithDots = text.match(/\b(\d{2}\.\d{3}\.\d{3})\b/);
  if (dniWithDots) dni = dniWithDots[1].replace(/\./g, '');
  
  // Buscar DNI sin puntos
  if (!dni) {
    const dniMatches = text.match(/\b(\d{7,8})\b/g);
    if (dniMatches) {
      const valid = dniMatches.filter(d => parseInt(d) >= 1000000 && parseInt(d) <= 99999999);
      if (valid.length) dni = valid[0];
    }
  }
  
  // Buscar en MRZ: APELLIDO<<NOMBRE<<<
  const mrzMatch = text.match(/([A-Z]{2,})<<([A-Z]+)<([A-Z]*)/);
  if (mrzMatch) {
    apellido = mrzMatch[1];
    nombre = mrzMatch[2] + (mrzMatch[3] ? ' ' + mrzMatch[3] : '');
  }
  
  // Buscar patrón Apellido/Surname
  if (!apellido) {
    const apellidoMatch = text.match(/Apel+ido[\s\/]*Surname[\s\n\r]+([A-ZÁÉÍÓÚÑ]+)/i);
    if (apellidoMatch) apellido = apellidoMatch[1];
  }
  
  // Buscar patrón Nombre/Name
  if (!nombre) {
    const nombreMatch = text.match(/Nombre[\s\/]*Name[\s\n\r]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s*Sexo|$)/im);
    if (nombreMatch) nombre = nombreMatch[1].trim();
  }
  
  return { dni, apellido, nombre };
}

function parseNombreCarpeta(folderName) {
  // "ID1 - Marina Carmona" -> { nombre: "Marina", apellido: "Carmona" }
  const match = folderName.match(/^ID\d+\s*-\s*(.+)$/);
  if (!match) return { nombre: null, apellido: null };
  
  const fullName = match[1].trim();
  const parts = fullName.split(/\s+/);
  
  // Heurística: si está en MAYÚSCULAS, probablemente es APELLIDO NOMBRE
  // Si no, probablemente es Nombre Apellido
  const isUpperCase = fullName === fullName.toUpperCase();
  
  if (isUpperCase && parts.length >= 2) {
    // APELLIDO NOMBRE1 NOMBRE2
    return { apellido: parts[0], nombre: parts.slice(1).join(' ') };
  } else if (parts.length >= 2) {
    // Nombre Apellido o Nombre1 Nombre2 Apellido
    // Asumimos último es apellido
    return { nombre: parts.slice(0, -1).join(' '), apellido: parts[parts.length - 1] };
  } else {
    return { nombre: fullName, apellido: '' };
  }
}

async function processFolder(folderName) {
  const folderPath = path.join(DOCS_DIR, folderName);
  const files = fs.readdirSync(folderPath);
  const dniFile = files.find(f => f.toLowerCase().includes('dni'));
  
  // Datos del nombre de carpeta como fallback
  const carpetaData = parseNombreCarpeta(folderName);
  
  if (!dniFile) {
    return { dni: null, ...carpetaData, source: 'carpeta' };
  }
  
  const dniPath = path.join(folderPath, dniFile);
  const ext = path.extname(dniFile).toLowerCase();
  
  try {
    let imagePath = dniPath;
    
    // Convertir PDF a imagen si es necesario
    if (ext === '.pdf') {
      const id = folderName.match(/^(ID\d+)/)?.[1] || 'tmp';
      const tmpPath = `/tmp/dni-${id}.png`;
      await execAsync(`pdftoppm -png -r 150 -singlefile "${dniPath}" "${tmpPath.replace('.png', '')}"`);
      imagePath = tmpPath;
    }
    
    // OCR
    const { data: { text } } = await scheduler.addJob('recognize', imagePath);
    
    // Limpiar archivo temporal
    if (ext === '.pdf') {
      try { fs.unlinkSync(imagePath); } catch {}
    }
    
    const ocrData = extractFromText(text);
    
    return {
      dni: ocrData.dni,
      apellido: ocrData.apellido || carpetaData.apellido,
      nombre: ocrData.nombre || carpetaData.nombre,
      source: ocrData.dni ? 'ocr' : 'carpeta'
    };
  } catch (err) {
    return { dni: null, ...carpetaData, source: 'carpeta', error: err.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXTRACCIÓN RÁPIDA DE DATOS DNI');
  console.log('='.repeat(60));
  
  await initOCR();
  
  // Leer planilla
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Agregar columnas nuevas
  data[0].push('DNI_CHOFER', 'NOMBRE_CHOFER', 'APELLIDO_CHOFER');
  
  // Obtener carpetas
  const folders = fs.readdirSync(DOCS_DIR)
    .filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory() && f.startsWith('ID'));
  
  console.log(`\nCarpetas: ${folders.length}, Filas: ${data.length - 1}`);
  
  let success = 0, failed = 0, total = 0;
  
  // Procesar filas
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) {
      row.push('', '', '');
      continue;
    }
    
    const id = row[0].toString();
    const folder = folders.find(f => f.startsWith(id + ' '));
    
    if (!folder) {
      row.push('', '', '');
      failed++;
      continue;
    }
    
    total++;
    process.stdout.write(`\r🔄 Procesando ${id} (${total}/${folders.length})...`);
    
    const result = await processFolder(folder);
    
    row.push(result.dni || '', result.nombre || '', result.apellido || '');
    
    if (result.dni) {
      success++;
      console.log(`\r✅ ${id}: ${result.dni} - ${result.apellido}, ${result.nombre}              `);
    } else {
      failed++;
      console.log(`\r⚠️ ${id}: Sin DNI - ${result.apellido}, ${result.nombre} (${result.source})   `);
    }
  }
  
  await terminateOCR();
  
  console.log('\n' + '='.repeat(60));
  console.log(`RESUMEN: ${success} con DNI, ${failed} sin DNI, ${total} total`);
  
  // Guardar
  const newSheet = XLSX.utils.aoa_to_sheet(data);
  wb.Sheets[wb.SheetNames[0]] = newSheet;
  XLSX.writeFile(wb, OUTPUT_PATH);
  
  console.log(`\n✅ Guardado: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Error:', err);
  terminateOCR();
  process.exit(1);
});

