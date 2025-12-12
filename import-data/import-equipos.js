/**
 * Script de Importación Masiva de Equipos y Documentos
 * 
 * Este script:
 * 1. Lee la planilla Excel con los datos de equipos
 * 2. Para cada equipo válido:
 *    - Crea el equipo via API /alta-completa
 *    - Sube los documentos asociados via API /documents/upload
 * 3. Marca los documentos como APROBADO
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const FormData = require('form-data');
const axios = require('axios');

// Configuración de servidores
const SERVERS = {
  staging: {
    name: 'Staging (10.3.0.243)',
    apiUrl: 'http://10.3.0.243:4802/api/docs',
    authUrl: 'http://10.3.0.243:4800/api/platform',
    dadorId: 1,
    clienteIds: [68, 8], // Prosil=68, YPF=8
    templates: {
      // EMPRESA_TRANSPORTISTA
      'Constancia de Inscripción en ARCA': 69,
      'Constancia de Inscripción en Ingresos Brutos': 38,
      'Formulario 931 / Acuse y Constancia de Pago': 39,
      // CHOFER
      'Alta Temprana en ARCA o Constancia de Inscripción en ARCA': 42,
      'DNI (frente y dorso)': 43,
      'Licencia Nacional de Conducir (frente y dorso)': 44,
      'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)': 45,
      'Póliza de Seguro de Vida Obligatorio': 46,
      // CAMION
      'Cédula_CAMION': 47,
      'RTO - Revisión Técnica Obligatoria_CAMION': 48,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION': 49,
      'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION': 50,
      'Título o Contrato de Alquiler Certificado_CAMION': 51,
      // ACOPLADO
      'Cédula_ACOPLADO': 52,
      'RTO - Revisión Técnica Obligatoria_ACOPLADO': 53,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_ACOPLADO': 54,
      'Seguro: Certificado de libre deuda y Comprobante de pago_ACOPLADO': 55,
      'Título o Contrato de Alquiler Certificado_ACOPLADO': 56,
    },
  },
  production: {
    name: 'Producción (10.8.10.20)',
    apiUrl: 'http://10.8.10.20:4802/api/docs',
    authUrl: 'http://10.8.10.20:4800/api/platform',
    dadorId: 1,
    clienteIds: [7, 8], // Prosil=7, YPF=8
    templates: {
      // EMPRESA_TRANSPORTISTA
      'Constancia de Inscripción en ARCA': 57,
      'Constancia de Inscripción en Ingresos Brutos': 38,
      'Formulario 931 / Acuse y Constancia de Pago': 39,
      // CHOFER
      'Alta Temprana en ARCA o Constancia de Inscripción en ARCA': 42,
      'DNI (frente y dorso)': 43,
      'Licencia Nacional de Conducir (frente y dorso)': 44,
      'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)': 45,
      'Póliza de Seguro de Vida Obligatorio': 46,
      // CAMION
      'Cédula_CAMION': 47,
      'RTO - Revisión Técnica Obligatoria_CAMION': 48,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION': 49,
      'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION': 50,
      'Título o Contrato de Alquiler Certificado_CAMION': 51,
      // ACOPLADO
      'Cédula_ACOPLADO': 52,
      'RTO - Revisión Técnica Obligatoria_ACOPLADO': 53,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_ACOPLADO': 54,
      'Seguro: Certificado de libre deuda y Comprobante de pago_ACOPLADO': 55,
      'Título o Contrato de Alquiler Certificado_ACOPLADO': 56,
    },
  }
};

// Credenciales de admin
const ADMIN_EMAIL = 'admin.interno@bca.com';
const ADMIN_PASSWORD = 'Test1234';

// Mapeo de archivos a templates (patterns para matching)
// templateKey incluye sufijo _CAMION/_ACOPLADO para disambiguar templates con mismo nombre
const TEMPLATE_PATTERNS = [
  // Tractor (primero para que _TRACTOR_ matchee antes que patrones genéricos)
  { pattern: /_TRACTOR_CEDULA/i, entityType: 'CAMION', templateKey: 'Cédula_CAMION' },
  { pattern: /_TRACTOR_RTO/i, entityType: 'CAMION', templateKey: 'RTO - Revisión Técnica Obligatoria_CAMION' },
  { pattern: /_TRACTOR_.*POLIZA.*SEGURO/i, entityType: 'CAMION', templateKey: 'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION' },
  { pattern: /_TRACTOR_SEGURO/i, entityType: 'CAMION', templateKey: 'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION' },
  { pattern: /_TRACTOR_TITULO/i, entityType: 'CAMION', templateKey: 'Título o Contrato de Alquiler Certificado_CAMION' },
  
  // Semi/Acoplado
  { pattern: /_SEMI_CEDULA/i, entityType: 'ACOPLADO', templateKey: 'Cédula_ACOPLADO' },
  { pattern: /_SEMI_RTO/i, entityType: 'ACOPLADO', templateKey: 'RTO - Revisión Técnica Obligatoria_ACOPLADO' },
  { pattern: /_SEMI_.*POLIZA.*SEGURO/i, entityType: 'ACOPLADO', templateKey: 'Póliza de Seguro (incluye Cláusula de No Repetición)_ACOPLADO' },
  { pattern: /_SEMI_SEGURO/i, entityType: 'ACOPLADO', templateKey: 'Seguro: Certificado de libre deuda y Comprobante de pago_ACOPLADO' },
  { pattern: /_SEMI_TITULO/i, entityType: 'ACOPLADO', templateKey: 'Título o Contrato de Alquiler Certificado_ACOPLADO' },
  
  // Chofer - Alta Temprana PRIMERO (antes que Constancia ARCA)
  { pattern: /ALTA.*TEMPRANA/i, entityType: 'CHOFER', templateKey: 'Alta Temprana en ARCA o Constancia de Inscripción en ARCA' },
  
  // Empresa Transportista
  { pattern: /CONSTANCIA.*INSCRIPCION.*ARCA/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Constancia de Inscripción en ARCA' },
  { pattern: /CONSTANCIA.*INGRESOS.*BRUTOS/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Constancia de Inscripción en Ingresos Brutos' },
  { pattern: /FORMULARIO.*931/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Formulario 931 / Acuse y Constancia de Pago' },
  
  // Chofer (resto)
  { pattern: /DNI.*frente/i, entityType: 'CHOFER', templateKey: 'DNI (frente y dorso)' },
  { pattern: /LICENCIA.*CONDUCIR/i, entityType: 'CHOFER', templateKey: 'Licencia Nacional de Conducir (frente y dorso)' },
  { pattern: /POLIZA.*A\.?R\.?T/i, entityType: 'CHOFER', templateKey: 'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)' },
  { pattern: /POLIZA.*SEGURO.*VIDA/i, entityType: 'CHOFER', templateKey: 'Póliza de Seguro de Vida Obligatorio' },
];

function matchTemplate(fileName) {
  // Normalizar: quitar acentos
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const template of TEMPLATE_PATTERNS) {
    if (template.pattern.test(normalized)) {
      return { entityType: template.entityType, templateKey: template.templateKey };
    }
  }
  return null;
}

function normalizeCuit(cuit) {
  if (!cuit) return null;
  return String(cuit).replace(/[-\s]/g, '').padStart(11, '0').slice(0, 11);
}

function normalizePatente(patente) {
  if (!patente) return null;
  return String(patente).toUpperCase().replace(/[\s-]/g, '').trim();
}

async function login(server) {
  const response = await fetch(`${server.authUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.token || data.accessToken;
}

async function createEquipo(server, token, equipoData) {
  const response = await fetch(`${server.apiUrl}/equipos/alta-completa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(equipoData)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || result.error || `HTTP ${response.status}`);
  }
  
  return result.data || result;
}

async function uploadDocument(server, token, entityType, entityId, templateKey, filePath, dadorId) {
  // Obtener templateId del mapeo del servidor
  const templateId = server.templates[templateKey];
  if (!templateId) {
    throw new Error(`Template no encontrado: ${templateKey}`);
  }
  
  const form = new FormData();
  form.append('entityType', entityType);
  form.append('entityId', String(entityId));
  form.append('templateId', String(templateId));
  form.append('dadorCargaId', String(dadorId));
  form.append('document', fs.createReadStream(filePath));
  
  const response = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': '1',
      ...form.getHeaders()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  
  const docId = response.data.id;
  
  // Fecha de expiración: 1 año desde hoy
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  // Aprobar el documento usando batch-approve (funciona mejor)
  await axios.post(`${server.apiUrl}/approval/pending/batch-approve`, {
    ids: [docId],
    overrides: {
      confirmedEntityType: entityType,
      confirmedEntityId: entityId,
      confirmedExpiration: expirationDate.toISOString(),
    }
  }, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-Id': '1'
    }
  });
  
  return response.data;
}

async function processRow(server, token, row, docsFolder) {
  const dadorId = server.dadorId;
  const clienteIds = server.clienteIds;
  const id = row[0];
  const empresaNombre = row[2];
  const cuit = normalizeCuit(row[3]);
  const dni = row[33];
  const nombreChofer = row[34];
  const apellidoChofer = row[35];
  const patenteTractor = normalizePatente(row[16]);
  const patenteSemi = normalizePatente(row[23]);
  
  const dniStr = String(dni || '').trim();
  if (!dniStr || dniStr === 'PENDIENTE' || dniStr === 'NO_FOLDER' || !dniStr.match(/^\d+$/)) {
    return { success: false, error: 'DNI inválido o pendiente' };
  }
  
  if (!cuit || cuit.length !== 11) {
    return { success: false, error: 'CUIT inválido' };
  }
  
  if (!patenteTractor) {
    return { success: false, error: 'Patente tractor faltante' };
  }
  
  // 1. Crear equipo
  const equipoData = {
    dadorCargaId: dadorId,
    empresaTransportistaCuit: cuit,
    empresaTransportistaNombre: empresaNombre || 'Empresa sin nombre',
    choferDni: dniStr,
    choferNombre: nombreChofer || '',
    choferApellido: apellidoChofer || '',
    camionPatente: patenteTractor,
    acopladoPatente: patenteSemi || null,
    clienteIds: clienteIds,
  };
  
  let equipo;
  try {
    equipo = await createEquipo(server, token, equipoData);
  } catch (err) {
    return { success: false, error: `Crear equipo: ${err.message}` };
  }
  
  // 2. Subir documentos
  const folderName = fs.readdirSync(docsFolder).find(f => f.startsWith(id + ' '));
  if (!folderName) {
    return { success: true, equipo, docsUploaded: 0, warning: 'Carpeta de documentos no encontrada' };
  }
  
  const folderPath = path.join(docsFolder, folderName);
  const files = fs.readdirSync(folderPath);
  
  let docsUploaded = 0;
  const errors = [];
  
  for (const file of files) {
    const templateConfig = matchTemplate(file);
    if (!templateConfig) continue;
    
    const filePath = path.join(folderPath, file);
    
    // Determinar entityId según el tipo
    let entityId;
    switch (templateConfig.entityType) {
      case 'EMPRESA_TRANSPORTISTA':
        entityId = equipo.empresaTransportistaId;
        break;
      case 'CHOFER':
        entityId = equipo.driverId;
        break;
      case 'CAMION':
        entityId = equipo.truckId;
        break;
      case 'ACOPLADO':
        entityId = equipo.trailerId;
        if (!entityId) continue; // Skip si no hay acoplado
        break;
    }
    
    if (!entityId) continue;
    
    try {
      await uploadDocument(
        server, token,
        templateConfig.entityType,
        entityId,
        templateConfig.templateKey,
        filePath,
        dadorId
      );
      docsUploaded++;
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
    
    // Pequeña pausa para no saturar
    await new Promise(r => setTimeout(r, 100));
  }
  
  return {
    success: true,
    equipo,
    docsUploaded,
    errors: errors.length > 0 ? errors : undefined
  };
}

async function importToServer(serverKey, rows, docsFolder) {
  const server = SERVERS[serverKey];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`IMPORTANDO A: ${server.name}`);
  console.log('='.repeat(60));
  
  // Login
  console.log('\n🔐 Autenticando...');
  let token;
  try {
    token = await login(server);
    console.log('✅ Autenticado correctamente');
  } catch (err) {
    console.error('❌ Error de autenticación:', err.message);
    return { success: 0, failed: rows.length, errors: ['Auth failed'] };
  }
  
  let success = 0, failed = 0;
  const allErrors = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];
    
    process.stdout.write(`\r🔄 ${id} (${i + 1}/${rows.length})...                              `);
    
    const result = await processRow(server, token, row, docsFolder);
    
    if (result.success) {
      success++;
      const docs = result.docsUploaded || 0;
      const warn = result.warning ? ` ⚠️ ${result.warning}` : '';
      console.log(`\r✅ ${id}: Equipo creado, ${docs} docs subidos${warn}                    `);
    } else {
      failed++;
      allErrors.push({ id, error: result.error });
      console.log(`\r❌ ${id}: ${result.error}                    `);
    }
    
    // Pausa entre equipos
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`RESUMEN ${server.name}: ${success} exitosos, ${failed} fallidos`);
  
  return { success, failed, errors: allErrors };
}

async function main() {
  const args = process.argv.slice(2);
  const targetServers = args.length > 0 ? args : ['staging', 'production'];
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     IMPORTACIÓN MASIVA DE EQUIPOS Y DOCUMENTOS            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Leer planilla
  const excelPath = path.join(__dirname, 'planilla-actualizada.xlsx');
  console.log(`\n📄 Leyendo planilla: ${excelPath}`);
  
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Filtrar filas válidas (con DNI)
  const validRows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const dni = row[33];
    if (dni && dni !== 'PENDIENTE' && dni !== 'NO_FOLDER' && dni !== '') {
      validRows.push(row);
    }
  }
  
  console.log(`📊 Filas válidas para importar: ${validRows.length}`);
  
  const docsFolder = path.join(__dirname, 'documentos');
  
  // Importar a cada servidor
  const results = {};
  for (const serverKey of targetServers) {
    if (!SERVERS[serverKey]) {
      console.log(`⚠️ Servidor desconocido: ${serverKey}`);
      continue;
    }
    results[serverKey] = await importToServer(serverKey, validRows, docsFolder);
  }
  
  // Resumen final
  console.log('\n' + '═'.repeat(60));
  console.log('RESUMEN FINAL');
  console.log('═'.repeat(60));
  for (const [key, result] of Object.entries(results)) {
    console.log(`${SERVERS[key].name}: ${result.success} OK, ${result.failed} FAIL`);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});

