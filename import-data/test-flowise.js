const fs = require('fs');
const path = require('path');

const ENDPOINT = 'http://10.3.0.246:2500/api/v1/prediction/30c3519f-175e-4638-b6f6-4a9c8010aa04';

async function testDNI(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const ext = path.extname(imagePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  
  console.log(`\n📄 Probando: ${path.basename(imagePath)}`);
  console.log(`   Tamaño: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
  
  const payload = {
    question: "Analiza esta imagen de DNI argentino y extrae: número de DNI (solo números), apellido y nombre. Responde SOLO con JSON: {\"dni\": \"...\", \"apellido\": \"...\", \"nombre\": \"...\"}",
    uploads: [{
      data: `data:${mime};base64,${base64}`,
      type: "file",
      name: "dni" + ext,
      mime: mime
    }]
  };
  
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    console.log('   Respuesta:', JSON.stringify(result, null, 2).substring(0, 500));
    return result;
  } catch (err) {
    console.error('   Error:', err.message);
    return null;
  }
}

async function main() {
  const testFiles = [
    'dni-small/ID2_dni.jpg',
    'dni-small/ID8_dni.jpg', 
    'dni-small/ID9_dni.jpg'
  ];
  
  for (const file of testFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      await testDNI(fullPath);
    } else {
      console.log(`⚠️ No existe: ${file}`);
    }
  }
}

main();

