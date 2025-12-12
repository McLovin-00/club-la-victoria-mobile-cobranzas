const Tesseract = require('tesseract.js');
const path = require('path');

const testFile = path.join(__dirname, 'documentos', 'ID1 - Marina Carmona', 'DNI (frente y dorso).jpg');

console.log('Procesando:', testFile);

Tesseract.recognize(testFile, 'spa', {
  logger: m => {
    if (m.status === 'recognizing text') {
      process.stdout.write(`\rProgreso: ${Math.round(m.progress * 100)}%`);
    }
  }
}).then(({ data: { text } }) => {
  console.log('\n\n=== TEXTO EXTRAÍDO ===\n');
  console.log(text);
  
  // Intentar extraer DNI (8 dígitos)
  const dniMatch = text.match(/\b(\d{7,8})\b/g);
  console.log('\n=== POSIBLES DNIs ===');
  console.log(dniMatch);
  
  // Buscar patrones de nombre
  const lines = text.split('\n').filter(l => l.trim());
  console.log('\n=== LÍNEAS ===');
  lines.forEach((l, i) => console.log(i + ':', l));
}).catch(err => {
  console.error('Error:', err);
});

