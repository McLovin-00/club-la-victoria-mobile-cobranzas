/**
 * Script para subir documentos - versión SQL
 * Busca equipos directamente en la BD y sube documentos
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const FormData = require('form-data');
const axios = require('axios');
const { Client } = require('pg');

// Configuración
const SERVERS = {
  staging: {
    name: 'Staging (10.3.0.243)',
    apiUrl: 'http://10.3.0.243:4802/api/docs',
    authUrl: 'http://10.3.0.243:4800/api/platform',
    dbConfig: {
      host: '10.3.0.243', port: 5432,
      database: 'monorepo-bca', user: 'evo', password: 'phoenix'
    },
    dadorId: 1,
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
    dbConfig: {
      host: '10.8.10.20', port: 5432,
      database: 'monorepo-bca', user: 'evo', password: 'phoenix'
    },
    dadorId: 1,
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
  for (const t of TEMPLATE_PATTERNS) {
    if (t.pattern.test(normalized)) return { entityType: t.entityType, templateKey: t.templateKey };
  }
  return null;
}

async function authenticate(server) {
  const res = await axios.post(`${server.authUrl}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.data.token;
}

async function uploadAndApprove(server, token, entityType, entityId, templateKey, filePath, dadorId) {
  const templateId = server.templates[templateKey];
  if (!templateId) throw new Error(`Template no encontrado: ${templateKey}`);
  
  const form = new FormData();
  form.append('entityType', entityType);
  form.append('entityId', String(entityId));
  form.append('templateId', String(templateId));
  form.append('dadorCargaId', String(dadorId));
  form.append('document', fs.createReadStream(filePath));
  
  const uploadRes = await axios.post(`${server.apiUrl}/documents/upload`, form, {
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-Id': '1', ...form.getHeaders() },
    maxContentLength: Infinity, maxBodyLength: Infinity
  });
  
  const docId = uploadRes.data.id;
  const exp = new Date();
  exp.setFullYear(exp.getFullYear() + 1);
  
  await axios.post(`${server.apiUrl}/approval/pending/batch-approve`, {
    ids: [docId],
    overrides: { confirmedEntityType: entityType, confirmedEntityId: entityId, confirmedExpiration: exp.toISOString() }
  }, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Tenant-Id': '1' }
  });
  
  return uploadRes.data;
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SUBIDA DE DOCUMENTOS (v2 - SQL directo)                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const workbook = XLSX.readFile(path.join(__dirname, 'planilla-actualizada.xlsx'));
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 }).slice(1);
  const docsFolder = path.join(__dirname, 'documentos');
  
  const validRows = rows.filter(r => {
    const dni = String(r[33] || '').trim();
    return dni && dni !== 'PENDIENTE' && dni.match(/^\d+$/);
  });
  
  console.log(`📄 Filas válidas: ${validRows.length}`);
  
  const serversToRun = process.argv.slice(2);
  if (serversToRun.length === 0) serversToRun.push('staging', 'production');
  
  const results = {};
  
  for (const serverName of serversToRun) {
    const server = SERVERS[serverName];
    if (!server) continue;
    
    console.log(`\n============================================================`);
    console.log(`SUBIENDO DOCUMENTOS A: ${server.name}`);
    console.log(`============================================================\n`);
    
    // Conectar a BD
    const db = new Client(server.dbConfig);
    await db.connect();
    console.log('🔗 Conectado a BD');
    
    const token = await authenticate(server);
    console.log('✅ Autenticado\n');
    
    let success = 0, failed = 0, totalDocs = 0;
    
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const id = row[0];
      const dni = String(row[33]).trim();
      
      process.stdout.write(`\r🔄 ${id} (${i + 1}/${validRows.length})...                              `);
      
      // Buscar equipo por DNI en BD
      const equipoQuery = await db.query(`
        SELECT e.id, e.driver_id, e.truck_id, e.trailer_id, e.empresa_transportista_id
        FROM documentos.equipo e
        JOIN documentos.choferes c ON c.id = e.driver_id
        WHERE c.dni = $1
        LIMIT 1
      `, [dni]);
      
      if (equipoQuery.rows.length === 0) {
        failed++;
        process.stdout.write(`❌ ${id}: No encontrado DNI ${dni}\n`);
        continue;
      }
      
      const equipo = equipoQuery.rows[0];
      
      // Buscar carpeta
      const folderName = fs.readdirSync(docsFolder).find(f => f.startsWith(id + ' '));
      if (!folderName) {
        success++;
        process.stdout.write(`⚪ ${id}: Sin carpeta\n`);
        continue;
      }
      
      const folderPath = path.join(docsFolder, folderName);
      const files = fs.readdirSync(folderPath);
      let docsUploaded = 0;
      
      for (const file of files) {
        const tc = matchTemplate(file);
        if (!tc) continue;
        
        let entityId;
        switch (tc.entityType) {
          case 'EMPRESA_TRANSPORTISTA': entityId = equipo.empresa_transportista_id; break;
          case 'CHOFER': entityId = equipo.driver_id; break;
          case 'CAMION': entityId = equipo.truck_id; break;
          case 'ACOPLADO': entityId = equipo.trailer_id; if (!entityId) continue; break;
        }
        if (!entityId) continue;
        
        try {
          await uploadAndApprove(server, token, tc.entityType, entityId, tc.templateKey, path.join(folderPath, file), server.dadorId);
          docsUploaded++;
        } catch (err) {
          const msg = err.response?.data?.message || err.message;
          if (!msg.includes('ya existe')) {
            // Solo log errores no esperados
          }
        }
        await new Promise(r => setTimeout(r, 50));
      }
      
      if (docsUploaded > 0) {
        totalDocs += docsUploaded;
        process.stdout.write(`✅ ${id}: ${docsUploaded} docs\n`);
      } else {
        process.stdout.write(`⚪ ${id}: 0 docs\n`);
      }
      success++;
    }
    
    await db.end();
    results[serverName] = { success, failed, totalDocs };
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`RESUMEN ${server.name}: ${success} OK, ${failed} FAIL, ${totalDocs} docs`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('RESUMEN FINAL');
  for (const [n, r] of Object.entries(results)) {
    console.log(`${SERVERS[n].name}: ${r.success} OK, ${r.failed} FAIL, ${r.totalDocs} docs`);
  }
}

run().catch(console.error);

