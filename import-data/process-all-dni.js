const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const ENDPOINT = 'http://10.3.0.246:2500/api/v1/prediction/30c3519f-175e-4638-b6f6-4a9c8010aa04';
const DOCS_DIR = path.join(__dirname, 'documentos');
const EXCEL_PATH = path.join(__dirname, 'planilla.xlsx');
const OUTPUT_PATH = path.join(__dirname, 'planilla-con-dni.xlsx');
const SMALL_DIR = path.join(__dirname, 'dni-small');

// Asegurar directorio de imágenes pequeñas
if (!fs.existsSync(SMALL_DIR)) fs.mkdirSync(SMALL_DIR, { recursive: true });

async function prepareImage(folderPath, folderId) {
  const files = fs.readdirSync(folderPath);
  const dniFile = files.find(f => f.toLowerCase().includes('dni'));
  
  if (!dniFile) return null;
  
  const dniPath = path.join(folderPath, dniFile);
  const ext = path.extname(dniFile).toLowerCase();
  const outputPath = path.join(SMALL_DIR, `${folderId}_dni.jpg`);
  
  // Si ya existe la imagen pequeña, usarla
  if (fs.existsSync(outputPath)) return outputPath;
  
  try {
    if (ext === '.pdf') {
      // Convertir PDF a imagen
      const tmpPng = `/tmp/${folderId}_dni.png`;
      await execAsync(`pdftoppm -png -r 150 -singlefile "${dniPath}" "${tmpPng.replace('.png', '')}"`);
      await execAsync(`convert "${tmpPng}" -resize 800x1200 -quality 85 "${outputPath}"`);
      try { fs.unlinkSync(tmpPng); } catch {}
    } else {
      // Redimensionar imagen
      await execAsync(`convert "${dniPath}" -resize 800x1200 -quality 85 "${outputPath}"`);
    }
    return outputPath;
  } catch (err) {
    console.error(`   Error preparando imagen: ${err.message}`);
    return null;
  }
}

async function extractDNI(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  const payload = {
    question: "Analiza esta imagen de DNI argentino y extrae: número de DNI (solo números sin puntos), apellido y nombre. Responde SOLO con JSON: {\"dni\": \"...\", \"apellido\": \"...\", \"nombre\": \"...\"}",
    uploads: [{
      data: `data:image/jpeg;base64,${base64}`,
      type: "file",
      name: "dni.jpg",
      mime: "image/jpeg"
    }]
  };
  
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    // Extraer JSON de la respuesta
    const text = result.text || '';
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function processFolder(folderName) {
  const idMatch = folderName.match(/^(ID\d+)/);
  if (!idMatch) return null;
  
  const folderId = idMatch[1];
  const folderPath = path.join(DOCS_DIR, folderName);
  
  // Preparar imagen
  const imagePath = await prepareImage(folderPath, folderId);
  if (!imagePath) {
    return { dni: null, apellido: null, nombre: null, error: 'No DNI file' };
  }
  
  // Extraer datos
  const data = await extractDNI(imagePath);
  return data || { dni: null, apellido: null, nombre: null, error: 'API error' };
}

function parseNameFromFolder(folderName) {
  const namePart = folderName.replace(/^ID\d+\s*-\s*/, '');
  const parts = namePart.split(' ');
  const isUpper = namePart === namePart.toUpperCase();
  return {
    apellido: isUpper ? parts[0] : parts[parts.length - 1],
    nombre: isUpper ? parts.slice(1).join(' ') : parts.slice(0, -1).join(' ')
  };
}

function getSortedFolders() {
  return fs.readdirSync(DOCS_DIR)
    .filter(f => fs.statSync(path.join(DOCS_DIR, f)).isDirectory() && f.startsWith('ID'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/ID(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/ID(\d+)/)?.[1] || '0');
      return numA - numB;
    });
}

function handleExtractedResult(row, id, result, results) {
  row.push(result.dni, result.nombre || '', result.apellido || '');
  results.push({ id, ...result, status: 'OK' });
  console.log(`\r✅ ${id}: ${result.dni} - ${result.apellido}, ${result.nombre}                    `);
  return true;
}

function handleFallbackResult(row, id, folder, results) {
  const { nombre, apellido } = parseNameFromFolder(folder);
  row.push('PENDIENTE', nombre, apellido);
  results.push({ id, dni: null, nombre, apellido, status: 'FALLBACK' });
  console.log(`\r⚠️ ${id}: Usando carpeta - ${apellido}, ${nombre}                    `);
  return false;
}

async function main() {
  console.log('='.repeat(60));
  console.log('EXTRACCIÓN DE DNI CON FLOWISE AI');
  console.log('='.repeat(60));
  
  const wb = XLSX.readFile(EXCEL_PATH);
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  data[0].push('DNI_CHOFER', 'NOMBRE_CHOFER', 'APELLIDO_CHOFER');
  
  const folders = getSortedFolders();
  console.log(`\nCarpetas: ${folders.length}`);
  console.log(`Filas en planilla: ${data.length - 1}\n`);
  
  let success = 0, failed = 0;
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) { row.push('', '', ''); continue; }
    
    const id = row[0].toString();
    const folder = folders.find(f => f.startsWith(id + ' '));
    
    if (!folder) { row.push('NO_FOLDER', '', ''); failed++; continue; }
    
    process.stdout.write(`\r🔄 ${id} (${i}/${data.length - 1})...                    `);
    
    const result = await processFolder(folder);
    
    if (result && result.dni) {
      if (handleExtractedResult(row, id, result, results)) success++;
    } else {
      handleFallbackResult(row, id, folder, results);
      failed++;
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`RESUMEN: ${success} exitosos, ${failed} pendientes`);
  
  // Guardar planilla
  const newSheet = XLSX.utils.aoa_to_sheet(data);
  wb.Sheets[wb.SheetNames[0]] = newSheet;
  XLSX.writeFile(wb, OUTPUT_PATH);
  
  console.log(`\n✅ Planilla guardada: ${OUTPUT_PATH}`);
  
  // Guardar log de resultados
  fs.writeFileSync(
    path.join(__dirname, 'extraction-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`📋 Log guardado: extraction-results.json`);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});

