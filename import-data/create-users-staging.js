const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Configuración de STAGING (10.3.0.243)
const DB_CONFIG = {
  host: '10.3.0.243',
  port: 5432,
  database: 'monorepo-bca',
  user: 'evo',
  password: 'phoenix',
};

const BCRYPT_ROUNDS = 12;

// ============= HELPERS =============

async function userExists(client, email) {
  const res = await client.query('SELECT id FROM platform.platform_users WHERE email = $1', [email]);
  return res.rows.length > 0;
}

function parseRazonSocial(razonSocial) {
  const parts = razonSocial.trim().split(/\s+/);
  return {
    nombre: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0],
    apellido: parts.length > 1 ? parts[parts.length - 1] : ''
  };
}

async function createDadorUser(client, dador, password) {
  const email = 'dador.puech@bca.com';
  
  if (await userExists(client, email)) {
    console.log(`⚠️  Usuario ${email} ya existe`);
    return 0;
  }
  
  await client.query(`
    INSERT INTO platform.platform_users (
      email, password, nombre, apellido, role, dador_carga_id, created_at, updated_at
    ) VALUES ($1, $2, 'Diego', 'Puech', 'DADOR_DE_CARGA', $3, NOW(), NOW())
  `, [email, password, dador.id]);
  console.log(`✅ Creado: ${email} | Contraseña: Dador2024!`);
  return 1;
}

async function createTransportistaUser(client, empresa, dadorId, password) {
  const email = `transportista.${empresa.cuit.replace(/[-\s]/g, '')}@bca.com`;
  
  if (await userExists(client, email)) {
    console.log(`⚠️  ${email} ya existe`);
    return false;
  }
  
  const { nombre, apellido } = parseRazonSocial(empresa.razon_social);
  await client.query(`
    INSERT INTO platform.platform_users (
      email, password, nombre, apellido, role, dador_carga_id, empresa_transportista_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'TRANSPORTISTA', $5, $6, NOW(), NOW())
  `, [email, password, nombre, apellido, dadorId, empresa.id]);
  console.log(`✅ ${email} | ${empresa.razon_social}`);
  return true;
}

async function createChoferUser(client, chofer, password) {
  const email = `chofer.${chofer.dni.replace(/[-\s.]/g, '')}@bca.com`;
  
  if (await userExists(client, email)) {
    console.log(`⚠️  ${email} ya existe`);
    return false;
  }
  
  const nombre = (chofer.nombre || '').trim();
  const apellido = (chofer.apellido || '').trim();
  
  await client.query(`
    INSERT INTO platform.platform_users (
      email, password, nombre, apellido, role, dador_carga_id, empresa_transportista_id, chofer_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'CHOFER', $5, $6, $7, NOW(), NOW())
  `, [email, password, nombre, apellido, chofer.dador_carga_id, chofer.empresa_transportista_id, chofer.chofer_id]);
  console.log(`✅ ${email} | ${nombre} ${apellido} | ${chofer.empresa || 'Sin empresa'}`);
  return true;
}

// ============= MAIN =============

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos de STAGING (10.3.0.243)');
    
    // Hashear contraseñas
    const passwords = {
      transportista: await bcrypt.hash('Transp2024!', BCRYPT_ROUNDS),
      chofer: await bcrypt.hash('Chofer2024!', BCRYPT_ROUNDS),
      dador: await bcrypt.hash('Dador2024!', BCRYPT_ROUNDS)
    };
    
    // 1. DADOR DE CARGA
    console.log('\n========== CREANDO DADOR DE CARGA ==========');
    const dadorRes = await client.query(`
      SELECT id, razon_social, cuit FROM documentos.dadores_carga WHERE activo = true LIMIT 1
    `);
    
    if (dadorRes.rows.length === 0) {
      console.log('❌ No se encontró dador de carga activo');
      return;
    }
    
    const dador = dadorRes.rows[0];
    console.log(`Dador de carga encontrado: ${dador.razon_social} (ID: ${dador.id})`);
    await createDadorUser(client, dador, passwords.dador);
    
    // 2. TRANSPORTISTAS
    console.log('\n========== CREANDO TRANSPORTISTAS ==========');
    const empresasRes = await client.query(`
      SELECT id, razon_social, cuit FROM documentos.empresas_transportistas WHERE activo = true ORDER BY id
    `);
    console.log(`Encontradas ${empresasRes.rows.length} empresas transportistas`);
    
    let transportistasCreados = 0;
    for (const empresa of empresasRes.rows) {
      if (await createTransportistaUser(client, empresa, dador.id, passwords.transportista)) {
        transportistasCreados++;
      }
    }
    
    // 3. CHOFERES
    console.log('\n========== CREANDO CHOFERES ==========');
    const choferesRes = await client.query(`
      SELECT DISTINCT c.id as chofer_id, c.dni, c.nombre, c.apellido,
        COALESCE(e.empresa_transportista_id, c.empresa_transportista_id) as empresa_transportista_id,
        et.razon_social as empresa,
        COALESCE(e.dador_carga_id, c.dador_carga_id) as dador_carga_id
      FROM documentos.choferes c
      LEFT JOIN documentos.equipo e ON e.driver_id = c.id
      LEFT JOIN documentos.empresas_transportistas et ON et.id = COALESCE(e.empresa_transportista_id, c.empresa_transportista_id)
      WHERE c.activo = true ORDER BY c.id
    `);
    console.log(`Encontrados ${choferesRes.rows.length} choferes`);
    
    let choferesCreados = 0;
    for (const chofer of choferesRes.rows) {
      if (await createChoferUser(client, chofer, passwords.chofer)) {
        choferesCreados++;
      }
    }
    
    // RESUMEN
    console.log('\n========== RESUMEN STAGING ==========');
    console.log(`Dador de Carga: 1 (dador.puech@bca.com / Dador2024!)`);
    console.log(`Transportistas creados: ${transportistasCreados} (transportista.CUIT@bca.com / Transp2024!)`);
    console.log(`Choferes creados: ${choferesCreados} (chofer.DNI@bca.com / Chofer2024!)`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
