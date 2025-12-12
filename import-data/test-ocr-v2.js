const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function processPDF(pdfPath) {
  const outputDir = '/tmp/dni-extract';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  const baseName = path.join(outputDir, 'page');
  await execAsync(`pdftoppm -png -r 300 "${pdfPath}" "${baseName}"`);
  
  const files = fs.readdirSync(outputDir).filter(f => f.startsWith('page') && f.endsWith('.png'));
  return files.map(f => path.join(outputDir, f));
}

async function preprocessImage(imagePath) {
  const outputPath = imagePath.replace('.png', '-processed.png');
  
  await sharp(imagePath)
    .greyscale()
    .normalize()
    .sharpen()
    .threshold(128)
    .toFile(outputPath);
  
  return outputPath;
}

async function extractDNIData(imagePath) {
  console.log('\nProcesando:', path.basename(imagePath));
  
  // Preprocesar imagen
  const processedPath = await preprocessImage(imagePath);
  console.log('Imagen preprocesada:', processedPath);
  
  const { data: { text } } = await Tesseract.recognize(processedPath, 'spa', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rOCR: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  console.log('\n\n=== TEXTO ===\n');
  console.log(text.substring(0, 2000));
  
  // Patrones del DNI argentino
  const patterns = {
    // DNI: 7-8 dígitos
    dni: /\b(\d{2}[\.\s]?\d{3}[\.\s]?\d{3})\b|\b(\d{7,8})\b/g,
    // Apellido después de "APELLIDO" o antes de nombre típico
    apellido: /APELLIDO[S]?\s*[:\s\/]*\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s*NOMBRE|\s*$)/im,
    // Nombre después de "NOMBRE" o "NOMBRES"
    nombre: /NOMBRE[S]?\s*[:\s\/]*\s*([A-ZÁÉÍÓÚÑ\s]+?)(?:\s*SEXO|\s*NACIONALIDAD|\s*$)/im,
    // Alternativa: buscar patrón APELLIDO / NOMBRE en una línea
    apellidoNombre: /([A-ZÁÉÍÓÚÑ]+)\s*\/\s*([A-ZÁÉÍÓÚÑ\s]+)/m
  };
  
  const dniMatches = [...text.matchAll(patterns.dni)];
  const apellidoMatch = text.match(patterns.apellido);
  const nombreMatch = text.match(patterns.nombre);
  const apellidoNombreMatch = text.match(patterns.apellidoNombre);
  
  console.log('\n=== EXTRACCIÓN ===');
  console.log('DNIs encontrados:', dniMatches.map(m => m[0]));
  
  if (apellidoNombreMatch) {
    console.log('Patrón APELLIDO/NOMBRE:', apellidoNombreMatch[1], '/', apellidoNombreMatch[2]);
  }
  if (apellidoMatch) console.log('Apellido:', apellidoMatch[1]?.trim());
  if (nombreMatch) console.log('Nombre:', nombreMatch[1]?.trim());
  
  return { text, dniMatches, apellidoMatch, nombreMatch, apellidoNombreMatch };
}

async function main() {
  // Probar con diferentes archivos
  const testFiles = [
    'ID10 - GUSTAVO MATIAS ARCE',
    'ID11 - FERNANDEZ ALEJANDRO AGUSTIN', 
    'ID12 - RODRIGUEZ MARIO ARMANDO'
  ];
  
  for (const folder of testFiles) {
    const dniFiles = fs.readdirSync(path.join(__dirname, 'documentos', folder))
      .filter(f => f.toLowerCase().includes('dni'));
    
    if (dniFiles.length === 0) continue;
    
    const filePath = path.join(__dirname, 'documentos', folder, dniFiles[0]);
    console.log('\n' + '='.repeat(60));
    console.log('CARPETA:', folder);
    console.log('ARCHIVO:', dniFiles[0]);
    
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      const images = await processPDF(filePath);
      for (const img of images) {
        await extractDNIData(img);
      }
    } else {
      await extractDNIData(filePath);
    }
  }
}

main().catch(console.error);

