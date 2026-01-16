const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const DOCS_DIR = path.join(__dirname, 'documentos');
const EXCEL_PATH = path.join(__dirname, 'planilla.xlsx');
const OUTPUT_PATH = path.join(__dirname, 'planilla-con-dni.xlsx');
const TEMP_DIR = '/tmp/dni-extract-batch';

// Crear directorio temporal
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function processPDF(pdfPath, outputPrefix) {
  const baseName = path.join(TEMP_DIR, outputPrefix);
  await execAsync(`pdftoppm -png -r 300 "${pdfPath}" "${baseName}"`);
  
  const files = fs.readdirSync(TEMP_DIR)
    .filter(f => f.startsWith(outputPrefix) && f.endsWith('.png') && !f.includes('-processed'))
    .sort();
  
  return files.map(f => path.join(TEMP_DIR, f));
}

async function preprocessImage(imagePath) {
  const outputPath = imagePath.replace('.png', '-proc.png').replace('.jpg', '-proc.jpg').replace('.jpeg', '-proc.jpeg');
  
  await sharp(imagePath)
    .greyscale()
    .normalize()
    .sharpen()
    .toFile(outputPath);
  
  return outputPath;
}

function extractFromMRZ(text) {
  // Buscar línea MRZ: APELLIDO<<NOMBRE<SEGUNDO_NOMBRE<<<
  const mrzPattern = /([A-Z]+)<<([A-Z]+)<([A-Z]*)<*/;
  const mrzMatch = text.match(mrzPattern);
  
  if (mrzMatch) {
    const apellido = mrzMatch[1];
    const nombre = mrzMatch[2] + (mrzMatch[3] ? ' ' + mrzMatch[3] : '');
    return { apellido, nombre };
  }
  return null;
}

function extractFromText(text) {
  // Buscar patrones del DNI argentino
  let apellido = null;
  let nombre = null;
  
  // Patrón: Apellido / Surname seguido del valor
  const apellidoMatch = text.match(/Apel+ido\s*[\/\s]*\s*Surname\s*[\n\r]+\s*([A-ZÁÉÍÓÚÑ]+)/i);
  if (apellidoMatch) {
    apellido = apellidoMatch[1].trim();
  }
  
  // Patrón: Nombre / Name seguido del valor
  const nombreMatch = text.match(/Nombre\s*[\/\s]*\s*Name\s*[\n\r]+\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s*Sexo|\s*Sex|$)/im);
  if (nombreMatch) {
    nombre = nombreMatch[1].trim();
  }
  
  return { apellido, nombre };
}

function extractDNI(text) {
  // Buscar DNI de 7-8 dígitos, con o sin puntos
  const matches = [];
  
  // Con puntos: 32.192.744
  const withDots = text.match(/\b(\d{2}\.\d{3}\.\d{3})\b/g);
  if (withDots) matches.push(...withDots.map(d => d.replace(/\./g, '')));
  
  // Sin puntos: 32192744
  const withoutDots = text.match(/\b(\d{7,8})\b/g);
  if (withoutDots) matches.push(...withoutDots);
  
  // Filtrar duplicados y valores poco probables
  const unique = [...new Set(matches)].filter(d => {
    const n = parseInt(d);
    return n >= 1000000 && n <= 99999999;
  });
  
  return unique.length > 0 ? unique[0] : null;
}

async function extractDNIData(imagePath) {
  try {
    const processedPath = await preprocessImage(imagePath);
    
    const { data: { text } } = await Tesseract.recognize(processedPath, 'spa', {
      logger: () => {}
    });
    
    // Limpiar archivo procesado
    try { fs.unlinkSync(processedPath); } catch {}
    
    const dni = extractDNI(text);
    const mrzData = extractFromMRZ(text);
    const textData = extractFromText(text);
    
    return {
      dni,
      apellido: mrzData?.apellido || textData?.apellido,
      nombre: mrzData?.nombre || textData?.nombre,
      text
    };
  } catch (err) {
    console.error('Error procesando imagen:', err.message);
    return { dni: null, apellido: null, nombre: null, text: '' };
  }
}

function mergeExtractedData(allData, newData) {
  allData.texts.push(newData.text);
  if (newData.dni && !allData.dni) allData.dni = newData.dni;
  if (newData.apellido && !allData.apellido) allData.apellido = newData.apellido;
  if (newData.nombre && !allData.nombre) allData.nombre = newData.nombre;
}

async function processImagesFromPdf(dniPath, prefix) {
  const allData = { dni: null, apellido: null, nombre: null, texts: [] };
  const images = await processPDF(dniPath, prefix);
  
  for (const img of images) {
    const data = await extractDNIData(img);
    mergeExtractedData(allData, data);
    try { fs.unlinkSync(img); } catch { /* ignore cleanup errors */ }
  }
  
  return allData;
}

async function processFolder(folderName) {
  const folderPath = path.join(DOCS_DIR, folderName);
  const files = fs.readdirSync(folderPath);
  const dniFile = files.find(f => f.toLowerCase().includes('dni'));
  
  if (!dniFile) {
    console.log(`  ⚠️ No se encontró archivo DNI en ${folderName}`);
    return { dni: null, apellido: null, nombre: null };
  }
  
  const dniPath = path.join(folderPath, dniFile);
  const ext = path.extname(dniFile).toLowerCase();
  const prefix = folderName.match(/^(ID\d+)/)?.[1] || 'unknown';
  
  try {
    if (ext === '.pdf') {
      return await processImagesFromPdf(dniPath, prefix);
    }
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const data = await extractDNIData(dniPath);
      return { ...data, texts: [data.text] };
    }
  } catch (err) {
    console.error(`  ❌ Error procesando ${dniFile}:`, err.message);
  }
  
  return { dni: null, apellido: null, nombre: null, texts: [] };
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXTRACCIÓN DE DATOS DNI');
  console.log('='.repeat(60));
  
  // Leer planilla
  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Agregar columnas nuevas al encabezado
  const headers = data[0];
  headers.push('DNI_EXTRAIDO', 'NOMBRE_EXTRAIDO', 'APELLIDO_EXTRAIDO');
  
  // Obtener carpetas de documentos
  const folders = fs.readdirSync(DOCS_DIR)
    .filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory())
    .sort((a, b) => {
      const numA = parseInt(a.match(/ID(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/ID(\d+)/)?.[1] || '0');
      return numA - numB;
    });
  
  console.log(`\nCarpetas encontradas: ${folders.length}`);
  console.log(`Filas en planilla: ${data.length - 1}`);
  
  // Procesar cada fila
  let processed = 0;
  let success = 0;
  let failed = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const id = row[0].toString(); // ID1, ID2, etc.
    // row[7] contiene el nombre completo de la planilla (usado para referencia)
    
    // Buscar carpeta correspondiente
    const folder = folders.find(f => f.startsWith(id + ' '));
    
    if (!folder) {
      console.log(`❌ ${id}: No se encontró carpeta`);
      row.push('', '', '');
      failed++;
      continue;
    }
    
    process.stdout.write(`\r📄 Procesando ${id} (${++processed}/${data.length - 1})...`);
    
    const result = await processFolder(folder);
    
    if (result.dni) {
      row.push(result.dni, result.nombre || '', result.apellido || '');
      success++;
      console.log(`\r✅ ${id}: DNI=${result.dni}, ${result.apellido || '?'}, ${result.nombre || '?'}          `);
    } else {
      // Intentar extraer nombre/apellido del nombre de la carpeta
      const namePart = folder.replace(/^ID\d+\s*-\s*/, '');
      const parts = namePart.split(' ');
      const apellido = parts[0];
      const nombre = parts.slice(1).join(' ');
      
      row.push('NO_DETECTADO', nombre, apellido);
      failed++;
      console.log(`\r⚠️ ${id}: DNI no detectado, usando nombre de carpeta: ${apellido}, ${nombre}          `);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`RESUMEN: ${success} exitosos, ${failed} fallidos de ${processed} procesados`);
  
  // Guardar planilla actualizada
  const newSheet = XLSX.utils.aoa_to_sheet(data);
  wb.Sheets[wb.SheetNames[0]] = newSheet;
  XLSX.writeFile(wb, OUTPUT_PATH);
  
  console.log(`\n✅ Planilla guardada en: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});

