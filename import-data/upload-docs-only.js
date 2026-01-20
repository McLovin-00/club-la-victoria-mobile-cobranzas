/**
 * Script para subir documentos a equipos YA EXISTENTES
 * 
 * Busca equipos por DNI del chofer y sube los documentos faltantes
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
    clienteIds: [68, 8],
    templates: {
      'Constancia de Inscripción en ARCA': 69,
      'Constancia de Inscripción en Ingresos Brutos': 38,
      'Formulario 931 / Acuse y Constancia de Pago': 39,
      'Alta Temprana en ARCA o Constancia de Inscripción en ARCA': 42,
      'DNI (frente y dorso)': 43,
      'Licencia Nacional de Conducir (frente y dorso)': 44,
      'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)': 45,
      'Póliza de Seguro de Vida Obligatorio': 46,
      'Cédula_CAMION': 47,
      'RTO - Revisión Técnica Obligatoria_CAMION': 48,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION': 49,
      'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION': 50,
      'Título o Contrato de Alquiler Certificado_CAMION': 51,
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
    clienteIds: [7, 8],
    templates: {
      'Constancia de Inscripción en ARCA': 57,
      'Constancia de Inscripción en Ingresos Brutos': 38,
      'Formulario 931 / Acuse y Constancia de Pago': 39,
      'Alta Temprana en ARCA o Constancia de Inscripción en ARCA': 42,
      'DNI (frente y dorso)': 43,
      'Licencia Nacional de Conducir (frente y dorso)': 44,
      'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)': 45,
      'Póliza de Seguro de Vida Obligatorio': 46,
      'Cédula_CAMION': 47,
      'RTO - Revisión Técnica Obligatoria_CAMION': 48,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION': 49,
      'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION': 50,
      'Título o Contrato de Alquiler Certificado_CAMION': 51,
      'Cédula_ACOPLADO': 52,
      'RTO - Revisión Técnica Obligatoria_ACOPLADO': 53,
      'Póliza de Seguro (incluye Cláusula de No Repetición)_ACOPLADO': 54,
      'Seguro: Certificado de libre deuda y Comprobante de pago_ACOPLADO': 55,
      'Título o Contrato de Alquiler Certificado_ACOPLADO': 56,
    },
  }
};

const ADMIN_EMAIL = 'admin.interno@bca.com';
const ADMIN_PASSWORD = 'Test1234';

// Mapeo de archivos a templates
const TEMPLATE_PATTERNS = [
  { pattern: /_TRACTOR_CEDULA/i, entityType: 'CAMION', templateKey: 'Cédula_CAMION' },
  { pattern: /_TRACTOR_RTO/i, entityType: 'CAMION', templateKey: 'RTO - Revisión Técnica Obligatoria_CAMION' },
  { pattern: /_TRACTOR_.*POLIZA.*SEGURO/i, entityType: 'CAMION', templateKey: 'Póliza de Seguro (incluye Cláusula de No Repetición)_CAMION' },
  { pattern: /_TRACTOR_SEGURO/i, entityType: 'CAMION', templateKey: 'Seguro: Certificado de libre deuda y Comprobante de pago_CAMION' },
  { pattern: /_TRACTOR_TITULO/i, entityType: 'CAMION', templateKey: 'Título o Contrato de Alquiler Certificado_CAMION' },
  { pattern: /_SEMI_CEDULA/i, entityType: 'ACOPLADO', templateKey: 'Cédula_ACOPLADO' },
  { pattern: /_SEMI_RTO/i, entityType: 'ACOPLADO', templateKey: 'RTO - Revisión Técnica Obligatoria_ACOPLADO' },
  { pattern: /_SEMI_.*POLIZA.*SEGURO/i, entityType: 'ACOPLADO', templateKey: 'Póliza de Seguro (incluye Cláusula de No Repetición)_ACOPLADO' },
  { pattern: /_SEMI_SEGURO/i, entityType: 'ACOPLADO', templateKey: 'Seguro: Certificado de libre deuda y Comprobante de pago_ACOPLADO' },
  { pattern: /_SEMI_TITULO/i, entityType: 'ACOPLADO', templateKey: 'Título o Contrato de Alquiler Certificado_ACOPLADO' },
  { pattern: /ALTA.*TEMPRANA/i, entityType: 'CHOFER', templateKey: 'Alta Temprana en ARCA o Constancia de Inscripción en ARCA' },
  { pattern: /CONSTANCIA.*INSCRIPCION.*ARCA/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Constancia de Inscripción en ARCA' },
  { pattern: /CONSTANCIA.*INGRESOS.*BRUTOS/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Constancia de Inscripción en Ingresos Brutos' },
  { pattern: /FORMULARIO.*931/i, entityType: 'EMPRESA_TRANSPORTISTA', templateKey: 'Formulario 931 / Acuse y Constancia de Pago' },
  { pattern: /DNI.*frente/i, entityType: 'CHOFER', templateKey: 'DNI (frente y dorso)' },
  { pattern: /LICENCIA.*CONDUCIR/i, entityType: 'CHOFER', templateKey: 'Licencia Nacional de Conducir (frente y dorso)' },
  { pattern: /POLIZA.*A\.?R\.?T/i, entityType: 'CHOFER', templateKey: 'Póliza de A.R.T. con nómina (incluye Cláusula de No Repetición)' },
  { pattern: /POLIZA.*SEGURO.*VIDA/i, entityType: 'CHOFER', templateKey: 'Póliza de Seguro de Vida Obligatorio' },
];

function matchTemplate(fileName) {
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const template of TEMPLATE_PATTERNS) {
    if (template.pattern.test(normalized)) {
      return { entityType: template.entityType, templateKey: template.templateKey };
    }
  }
  return null;
}

async function authenticate(server) {
  const response = await axios.post(`${server.authUrl}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  return response.data.token;
}

async function findEquipoByDni(server, token, dni) {
  try {
    const response = await axios.get(`${server.apiUrl}/equipos/search`, {
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Id': '1' },
      params: { dni, limit: 1 }
    });
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function uploadAndApprove(server, token, entityType, entityId, templateKey, filePath, dadorId) {
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
  
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': '1',
      ...form.getHeaders()
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  
  const docId = uploadRes.data.id;
  
  // Aprobar
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
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
  
  return uploadRes.data;
}

function isValidDni(dniStr) {
  return dniStr && dniStr !== 'PENDIENTE' && dniStr.match(/^\d+$/);
}

function buildEntityIdMap(equipo) {
  return {
    'EMPRESA_TRANSPORTISTA': equipo.empresaTransportista?.id,
    'CHOFER': equipo.chofer?.id,
    'CAMION': equipo.camion?.id,
    'ACOPLADO': equipo.acoplado?.id
  };
}

async function uploadFilesToEquipo(server, token, folderPath, equipo, dadorId) {
  const files = fs.readdirSync(folderPath);
  const entityIdMap = buildEntityIdMap(equipo);
  let docsUploaded = 0;
  const errors = [];
  
  for (const file of files) {
    const templateConfig = matchTemplate(file);
    if (!templateConfig) continue;
    
    const entityId = entityIdMap[templateConfig.entityType];
    if (!entityId) continue;
    
    try {
      await uploadAndApprove(server, token, templateConfig.entityType, entityId, templateConfig.templateKey, path.join(folderPath, file), dadorId);
      docsUploaded++;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      if (!errMsg.includes('ya existe')) errors.push(`${file}: ${errMsg}`);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  return { docsUploaded, errors };
}

async function processRow(server, token, row, docsFolder) {
  const id = row[0];
  const dniStr = String(row[33] || '').trim();
  
  if (!isValidDni(dniStr)) {
    return { success: false, error: 'DNI inválido' };
  }
  
  const equipo = await findEquipoByDni(server, token, dniStr);
  if (!equipo) {
    return { success: false, error: 'Equipo no encontrado para DNI ' + dniStr };
  }
  
  const folderName = fs.readdirSync(docsFolder).find(f => f.startsWith(id + ' '));
  if (!folderName) {
    return { success: true, equipo, docsUploaded: 0, warning: 'Sin carpeta' };
  }
  
  const { docsUploaded, errors } = await uploadFilesToEquipo(
    server, token, path.join(docsFolder, folderName), equipo, server.dadorId
  );
  
  return { success: true, equipo, docsUploaded, errors };
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SUBIDA DE DOCUMENTOS A EQUIPOS EXISTENTES              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const workbook = XLSX.readFile(path.join(__dirname, 'planilla-actualizada.xlsx'));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }).slice(1);
  const docsFolder = path.join(__dirname, 'documentos');
  
  const validRows = rows.filter(r => {
    const dni = String(r[33] || '').trim();
    return dni && dni !== 'PENDIENTE' && dni.match(/^\d+$/);
  });
  
  console.log(`📄 Filas válidas: ${validRows.length}`);
  
  const serversToRun = process.argv.slice(2);
  if (serversToRun.length === 0) {
    serversToRun.push('staging', 'production');
  }
  
  const results = {};
  
  for (const serverName of serversToRun) {
    const server = SERVERS[serverName];
    if (!server) continue;
    
    console.log(`\n============================================================`);
    console.log(`SUBIENDO DOCUMENTOS A: ${server.name}`);
    console.log(`============================================================\n`);
    
    console.log('🔐 Autenticando...');
    const token = await authenticate(server);
    console.log('✅ Autenticado\n');
    
    let success = 0, failed = 0, totalDocs = 0;
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const id = row[0];
      
      process.stdout.write(`\r🔄 ${id} (${i + 1}/${validRows.length})...                              `);
      
      const result = await processRow(server, token, row, docsFolder);
      
      if (result.success && result.docsUploaded > 0) {
        success++;
        totalDocs += result.docsUploaded;
        process.stdout.write(`✅ ${id}: ${result.docsUploaded} docs subidos                    \n`);
      } else if (result.success) {
        success++;
        process.stdout.write(`⚪ ${id}: sin docs nuevos                    \n`);
      } else {
        failed++;
        process.stdout.write(`❌ ${id}: ${result.error}                    \n`);
      }
    }
    
    results[serverName] = { success, failed, totalDocs };
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`RESUMEN ${server.name}: ${success} OK, ${failed} FAIL, ${totalDocs} docs subidos`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('RESUMEN FINAL');
  console.log('════════════════════════════════════════════════════════════');
  for (const [name, r] of Object.entries(results)) {
    console.log(`${SERVERS[name].name}: ${r.success} OK, ${r.failed} FAIL, ${r.totalDocs} docs`);
  }
}

run().catch(console.error);

