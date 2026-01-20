const bcrypt = require('bcrypt');
const { Client } = require('pg');

// Configuración de producción (10.8.10.20)
const DB_CONFIG = {
  host: '10.8.10.20',
  port: 5432,
  database: 'monorepo-bca',
  user: 'evo',
  password: 'phoenix',
};

const DADOR_CARGA_ID = 1;
const DEFAULT_PASSWORD = 'Transp2024!';
const BCRYPT_ROUNDS = 12;

// ============= HELPERS =============

function parseRazonSocial(razonSocial) {
  const parts = razonSocial.trim().split(/\s+/);
  return {
    nombre: parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0],
    apellido: parts.length > 1 ? parts[parts.length - 1] : ''
  };
}

function generateEmail(cuit) {
  return `transportista.${cuit.replace(/[-\s]/g, '')}@bca.com`;
}

async function userExists(client, email) {
  const res = await client.query('SELECT id FROM platform.platform_users WHERE email = $1', [email]);
  return res.rows.length > 0;
}

async function createUser(client, empresa, hashedPassword) {
  const email = generateEmail(empresa.cuit);
  const { nombre, apellido } = parseRazonSocial(empresa.razon_social);
  
  const res = await client.query(`
    INSERT INTO platform.platform_users (
      email, password, nombre, apellido, role, 
      dador_carga_id, empresa_transportista_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'TRANSPORTISTA', $5, $6, NOW(), NOW())
    RETURNING id, email
  `, [email, hashedPassword, nombre, apellido, DADOR_CARGA_ID, empresa.id]);
  
  return { id: res.rows[0].id, email, empresa: empresa.razon_social, cuit: empresa.cuit };
}

async function processEmpresa(client, empresa, hashedPassword) {
  const email = generateEmail(empresa.cuit);
  
  if (await userExists(client, email)) {
    console.log(`⚠️  Usuario ${email} ya existe, omitiendo...`);
    return { status: 'skipped', email };
  }
  
  const user = await createUser(client, empresa, hashedPassword);
  console.log(`✅ Creado: ${email} (Empresa ID: ${empresa.id} - ${empresa.razon_social})`);
  return { status: 'created', user };
}

function printSummary(createdUsers, errors) {
  console.log('\n========== RESUMEN ==========');
  console.log(`Usuarios creados: ${createdUsers.length}`);
  console.log(`Errores: ${errors.length}`);
  console.log(`Password por defecto: ${DEFAULT_PASSWORD}`);
  
  if (createdUsers.length > 0) {
    console.log('\n--- Usuarios Creados ---');
    createdUsers.forEach(u => console.log(`${u.email} | ${u.empresa} | CUIT: ${u.cuit}`));
  }
  
  if (errors.length > 0) {
    console.log('\n--- Errores ---');
    errors.forEach(e => console.log(`${e.email}: ${e.error}`));
  }
}

// ============= MAIN =============

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos');
    
    const empresasRes = await client.query(`
      SELECT id, razon_social, cuit FROM documentos.empresas_transportistas 
      WHERE activo = true ORDER BY id
    `);
    console.log(`Encontradas ${empresasRes.rows.length} empresas transportistas`);
    
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    console.log(`Password hasheada: ${hashedPassword.substring(0, 20)}...`);
    
    const createdUsers = [];
    const errors = [];
    
    for (const empresa of empresasRes.rows) {
      try {
        const result = await processEmpresa(client, empresa, hashedPassword);
        if (result.status === 'created') createdUsers.push(result.user);
      } catch (err) {
        errors.push({ email: generateEmail(empresa.cuit), error: err.message });
        console.error(`❌ Error creando usuario: ${err.message}`);
      }
    }
    
    printSummary(createdUsers, errors);
    
  } catch (err) {
    console.error('Error general:', err);
  } finally {
    await client.end();
  }
}

main();
