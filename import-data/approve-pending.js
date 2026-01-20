/**
 * Script para aprobar documentos pendientes
 * Usa fechas de vencimiento de la planilla Excel cuando existen
 * Si no hay fecha, usa 30 días desde hoy
 */

const path = require('path');
const XLSX = require('xlsx');
const axios = require('axios');
const { Client } = require('pg');

// ============= CONFIGURACIÓN =============

const SERVERS = {
  staging: {
    name: 'Staging (10.3.0.243)',
    apiUrl: 'http://10.3.0.243:4802/api/docs',
    authUrl: 'http://10.3.0.243:4800/api/platform',
    dbConfig: { host: '10.3.0.243', port: 5432, database: 'monorepo-bca', user: 'evo', password: 'phoenix' },
  },
  production: {
    name: 'Producción (10.8.10.20)',
    apiUrl: 'http://10.8.10.20:4802/api/docs',
    authUrl: 'http://10.8.10.20:4800/api/platform',
    dbConfig: { host: '10.8.10.20', port: 5432, database: 'monorepo-bca', user: 'evo', password: 'phoenix' },
  }
};

const ADMIN_EMAIL = 'admin.interno@bca.com';
const ADMIN_PASSWORD = 'Test1234';

const VENCIMIENTO_COLS = {
  'DNI (frente y dorso)': 10,
  'Licencia Nacional de Conducir (frente y dorso)': 12,
  'Póliza de Seguro de Vida Obligatorio': 15,
  'RTO - Revisión Técnica Obligatoria_CAMION': 20,
  'RTO - Revisión Técnica Obligatoria_ACOPLADO': 27,
};

// ============= HELPERS =============

function excelToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  const utcDays = Math.floor(serial - 25569);
  return new Date(utcDays * 86400 * 1000).toISOString();
}

function defaultExpiration() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

function loadDniMap(excelPath) {
  const wb = XLSX.readFile(excelPath);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
  
  const dniMap = {};
  for (const row of rows) {
    const dni = String(row[33] || '').trim();
    if (dni && dni !== 'PENDIENTE') {
      dniMap[dni] = row;
    }
  }
  return dniMap;
}

async function authenticate(server) {
  const res = await axios.post(`${server.authUrl}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.data.token;
}

async function fetchPendingDocuments(db) {
  const result = await db.query(`
    SELECT 
      d.id as doc_id, d.entity_type, d.entity_id, d.template_id,
      t.name as template_name, c.dni as chofer_dni
    FROM documentos.documents d
    JOIN documentos.document_templates t ON t.id = d.template_id
    LEFT JOIN documentos.equipo e ON (
      (d.entity_type = 'CHOFER' AND e.driver_id = d.entity_id) OR
      (d.entity_type = 'CAMION' AND e.truck_id = d.entity_id) OR
      (d.entity_type = 'ACOPLADO' AND e.trailer_id = d.entity_id) OR
      (d.entity_type = 'EMPRESA_TRANSPORTISTA' AND e.empresa_transportista_id = d.entity_id)
    )
    LEFT JOIN documentos.choferes c ON c.id = e.driver_id
    WHERE d.status = 'PENDIENTE_APROBACION'
    GROUP BY d.id, d.entity_type, d.entity_id, d.template_id, t.name, c.dni
  `);
  return result.rows;
}

function getExpiration(doc, dniMap) {
  if (!doc.chofer_dni || !dniMap[doc.chofer_dni]) {
    return defaultExpiration();
  }
  
  const row = dniMap[doc.chofer_dni];
  const colIndex = VENCIMIENTO_COLS[doc.template_name];
  
  if (colIndex && row[colIndex]) {
    const expDate = excelToDate(row[colIndex]);
    if (expDate) return expDate;
  }
  
  return defaultExpiration();
}

async function approveDocument(server, token, doc, expiration) {
  await axios.post(`${server.apiUrl}/approval/pending/batch-approve`, {
    ids: [doc.doc_id],
    overrides: {
      confirmedEntityType: doc.entity_type,
      confirmedEntityId: doc.entity_id,
      confirmedExpiration: expiration,
    }
  }, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-Id': '1'
    }
  });
}

async function processServer(serverName, server, dniMap) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`APROBANDO EN: ${server.name}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const db = new Client(server.dbConfig);
  await db.connect();
  console.log('🔗 Conectado a BD');
  
  const token = await authenticate(server);
  console.log('✅ Autenticado\n');
  
  const pendingDocs = await fetchPendingDocuments(db);
  console.log(`📋 Documentos pendientes: ${pendingDocs.length}`);
  
  let approved = 0, failed = 0;
  
  for (let i = 0; i < pendingDocs.length; i++) {
    const doc = pendingDocs[i];
    const expiration = getExpiration(doc, dniMap);
    
    try {
      await approveDocument(server, token, doc, expiration);
      approved++;
    } catch (err) {
      failed++;
    }
    
    if ((i + 1) % 10 === 0 || i === pendingDocs.length - 1) {
      process.stdout.write(`\r🔄 Progreso: ${i + 1}/${pendingDocs.length} (${approved} aprobados, ${failed} fallidos)`);
    }
  }
  
  console.log(`\n\n${'─'.repeat(60)}`);
  console.log(`RESUMEN ${server.name}: ${approved} aprobados, ${failed} fallidos`);
  
  await db.end();
  return { approved, failed };
}

// ============= MAIN =============

async function run() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     APROBACIÓN DE DOCUMENTOS PENDIENTES                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const dniMap = loadDniMap(path.join(__dirname, 'planilla-actualizada.xlsx'));
  console.log(`📄 Planilla cargada: ${Object.keys(dniMap).length} registros con DNI`);
  
  const serversToRun = process.argv.slice(2);
  if (serversToRun.length === 0) serversToRun.push('staging', 'production');
  
  for (const serverName of serversToRun) {
    const server = SERVERS[serverName];
    if (server) {
      await processServer(serverName, server, dniMap);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETADO');
}

run().catch(console.error);
