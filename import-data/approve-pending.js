/**
 * Script para aprobar documentos pendientes
 * Usa fechas de vencimiento de la planilla Excel cuando existen
 * Si no hay fecha, usa 30 días desde hoy
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const axios = require('axios');
const { Client } = require('pg');

// Configuración
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

// Mapeo de columnas de vencimiento según template
// Col 10: DNI, Col 12: Licencia, Col 15: Seguro Vida, Col 20: RTO Tractor, Col 27: RTO Semi
const VENCIMIENTO_COLS = {
  'DNI (frente y dorso)': 10,
  'Licencia Nacional de Conducir (frente y dorso)': 12,
  'Póliza de Seguro de Vida Obligatorio': 15,
  'RTO - Revisión Técnica Obligatoria_CAMION': 20,
  'RTO - Revisión Técnica Obligatoria_ACOPLADO': 27,
  // Otros documentos no tienen vencimiento específico en planilla
};

// Convertir número de serie Excel a fecha ISO
function excelToDate(serial) {
  if (!serial || typeof serial !== 'number' || serial < 1) return null;
  const utcDays = Math.floor(serial - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString();
}

// Fecha por defecto: 30 días desde hoy
function defaultExpiration() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

async function authenticate(server) {
  const res = await axios.post(`${server.authUrl}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.data.token;
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     APROBACIÓN DE DOCUMENTOS PENDIENTES                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Leer planilla
  const wb = XLSX.readFile(path.join(__dirname, 'planilla-actualizada.xlsx'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1);
  
  // Crear mapa DNI -> fila de datos
  const dniMap = {};
  for (const row of rows) {
    const dni = String(row[33] || '').trim();
    if (dni && dni !== 'PENDIENTE') {
      dniMap[dni] = row;
    }
  }
  console.log(`📄 Planilla cargada: ${Object.keys(dniMap).length} registros con DNI`);
  
  const serversToRun = process.argv.slice(2);
  if (serversToRun.length === 0) serversToRun.push('staging', 'production');
  
  for (const serverName of serversToRun) {
    const server = SERVERS[serverName];
    if (!server) continue;
    
    console.log(`\n============================================================`);
    console.log(`APROBANDO EN: ${server.name}`);
    console.log(`============================================================\n`);
    
    const db = new Client(server.dbConfig);
    await db.connect();
    console.log('🔗 Conectado a BD');
    
    const token = await authenticate(server);
    console.log('✅ Autenticado\n');
    
    // Obtener documentos pendientes con info del chofer
    const pendingQuery = await db.query(`
      SELECT 
        d.id as doc_id,
        d.entity_type,
        d.entity_id,
        d.template_id,
        t.name as template_name,
        c.dni as chofer_dni
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
    
    console.log(`📋 Documentos pendientes: ${pendingQuery.rows.length}`);
    
    let approved = 0, failed = 0;
    const batchSize = 50;
    
    for (let i = 0; i < pendingQuery.rows.length; i += batchSize) {
      const batch = pendingQuery.rows.slice(i, i + batchSize);
      
      for (const doc of batch) {
        // Buscar fecha de vencimiento en planilla
        let expiration = null;
        
        if (doc.chofer_dni && dniMap[doc.chofer_dni]) {
          const row = dniMap[doc.chofer_dni];
          
          // Buscar columna de vencimiento para este template
          const colIndex = VENCIMIENTO_COLS[doc.template_name];
          if (colIndex && row[colIndex]) {
            expiration = excelToDate(row[colIndex]);
          }
        }
        
        // Si no hay fecha, usar 30 días
        if (!expiration) {
          expiration = defaultExpiration();
        }
        
        try {
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
          approved++;
        } catch (err) {
          failed++;
        }
      }
      
      process.stdout.write(`\r🔄 Progreso: ${Math.min(i + batchSize, pendingQuery.rows.length)}/${pendingQuery.rows.length} (${approved} aprobados, ${failed} fallidos)`);
    }
    
    console.log(`\n\n────────────────────────────────────────────────────────────`);
    console.log(`RESUMEN ${server.name}: ${approved} aprobados, ${failed} fallidos`);
    
    await db.end();
  }
  
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('COMPLETADO');
}

run().catch(console.error);

