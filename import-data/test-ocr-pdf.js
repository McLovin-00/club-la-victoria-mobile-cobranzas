const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const testFile = path.join(__dirname, 'documentos', 'ID10 - GUSTAVO MATIAS ARCE', 'DNI (frente y dorso).pdf');

async function processPDF(pdfPath) {
  const outputDir = '/tmp/dni-extract';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  
  // Usar pdftoppm si está disponible, sino pdf-poppler
  try {
    const baseName = path.join(outputDir, 'page');
    await execAsync(`pdftoppm -png -r 300 "${pdfPath}" "${baseName}"`);
    
    // Buscar las imágenes generadas
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('page') && f.endsWith('.png'));
    console.log('Páginas generadas:', files);
    
    return files.map(f => path.join(outputDir, f));
  } catch (err) {
    console.log('pdftoppm no disponible, intentando alternativa...');
    
    // Usar pdf-poppler
    const pdfPoppler = require('pdf-poppler');
    const opts = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: 'page',
      scale: 2048
    };
    await pdfPoppler.convert(pdfPath, opts);
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('page') && f.endsWith('.png'));
    return files.map(f => path.join(outputDir, f));
  }
}

async function extractDNIData(imagePath) {
  console.log('Procesando imagen:', imagePath);
  
  const { data: { text } } = await Tesseract.recognize(imagePath, 'spa', {
    logger: m => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\rProgreso: ${Math.round(m.progress * 100)}%`);
      }
    }
  });
  
  console.log('\n\n=== TEXTO EXTRAÍDO ===\n');
  console.log(text);
  
  // Buscar DNI (7-8 dígitos)
  const dniMatches = text.match(/\b(\d{7,8})\b/g);
  
  // Buscar patrones típicos del DNI argentino
  const apellidoMatch = text.match(/APELLIDO[:\s]*([A-ZÁÉÍÓÚÑ\s]+)/i);
  const nombreMatch = text.match(/NOMBRE[S]?[:\s]*([A-ZÁÉÍÓÚÑ\s]+)/i);
  
  console.log('\n=== DATOS EXTRAÍDOS ===');
  console.log('Posibles DNIs:', dniMatches);
  console.log('Apellido:', apellidoMatch ? apellidoMatch[1].trim() : 'No encontrado');
  console.log('Nombre:', nombreMatch ? nombreMatch[1].trim() : 'No encontrado');
  
  return { text, dniMatches, apellidoMatch, nombreMatch };
}

async function main() {
  console.log('Archivo:', testFile);
  
  const ext = path.extname(testFile).toLowerCase();
  
  if (ext === '.pdf') {
    const images = await processPDF(testFile);
    for (const img of images) {
      await extractDNIData(img);
    }
  } else {
    await extractDNIData(testFile);
  }
}

main().catch(console.error);

