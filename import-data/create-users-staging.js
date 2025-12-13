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

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos de STAGING (10.3.0.243)');
    
    // Hashear contraseñas
    const transportistaPassword = await bcrypt.hash('Transp2024!', BCRYPT_ROUNDS);
    const choferPassword = await bcrypt.hash('Chofer2024!', BCRYPT_ROUNDS);
    const dadorPassword = await bcrypt.hash('Dador2024!', BCRYPT_ROUNDS);
    
    // ========== 1. CREAR CUENTA DE DADOR DE CARGA ==========
    console.log('\n========== CREANDO DADOR DE CARGA ==========');
    
    // Obtener el dador de carga Diego Puech
    const dadorRes = await client.query(`
      SELECT id, razon_social, cuit FROM documentos.dadores_carga WHERE activo = true LIMIT 1
    `);
    
    if (dadorRes.rows.length === 0) {
      console.log('❌ No se encontró dador de carga activo');
      return;
    }
    
    const dador = dadorRes.rows[0];
    console.log(`Dador de carga encontrado: ${dador.razon_social} (ID: ${dador.id})`);
    
    // Crear cuenta de dador
    const dadorEmail = 'dador.puech@bca.com';
    const existsDador = await client.query('SELECT id FROM platform.platform_users WHERE email = $1', [dadorEmail]);
    
    if (existsDador.rows.length > 0) {
      console.log(`⚠️  Usuario ${dadorEmail} ya existe`);
    } else {
      await client.query(`
        INSERT INTO platform.platform_users (
          email, password, nombre, apellido, role, dador_carga_id, created_at, updated_at
        ) VALUES ($1, $2, 'Diego', 'Puech', 'DADOR_DE_CARGA', $3, NOW(), NOW())
      `, [dadorEmail, dadorPassword, dador.id]);
      console.log(`✅ Creado: ${dadorEmail} | Contraseña: Dador2024!`);
    }
    
    // ========== 2. CREAR CUENTAS DE TRANSPORTISTAS ==========
    console.log('\n========== CREANDO TRANSPORTISTAS ==========');
    
    const empresasRes = await client.query(`
      SELECT id, razon_social, cuit FROM documentos.empresas_transportistas WHERE activo = true ORDER BY id
    `);
    
    console.log(`Encontradas ${empresasRes.rows.length} empresas transportistas`);
    
    let transportistasCreados = 0;
    for (const empresa of empresasRes.rows) {
      const cuitClean = empresa.cuit.replace(/[-\s]/g, '');
      const email = `transportista.${cuitClean}@bca.com`;
      
      const razonParts = empresa.razon_social.trim().split(/\s+/);
      const nombre = razonParts.length > 1 ? razonParts.slice(0, -1).join(' ') : razonParts[0];
      const apellido = razonParts.length > 1 ? razonParts[razonParts.length - 1] : '';
      
      const exists = await client.query('SELECT id FROM platform.platform_users WHERE email = $1', [email]);
      
      if (exists.rows.length > 0) {
        console.log(`⚠️  ${email} ya existe`);
        continue;
      }
      
      await client.query(`
        INSERT INTO platform.platform_users (
          email, password, nombre, apellido, role, dador_carga_id, empresa_transportista_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'TRANSPORTISTA', $5, $6, NOW(), NOW())
      `, [email, transportistaPassword, nombre, apellido, dador.id, empresa.id]);
      
      console.log(`✅ ${email} | ${empresa.razon_social}`);
      transportistasCreados++;
    }
    
    // ========== 3. CREAR CUENTAS DE CHOFERES ==========
    console.log('\n========== CREANDO CHOFERES ==========');
    
    const choferesRes = await client.query(`
      SELECT DISTINCT 
        c.id as chofer_id,
        c.dni,
        c.nombre,
        c.apellido,
        COALESCE(e.empresa_transportista_id, c.empresa_transportista_id) as empresa_transportista_id,
        et.razon_social as empresa,
        COALESCE(e.dador_carga_id, c.dador_carga_id) as dador_carga_id
      FROM documentos.choferes c
      LEFT JOIN documentos.equipo e ON e.driver_id = c.id
      LEFT JOIN documentos.empresas_transportistas et ON et.id = COALESCE(e.empresa_transportista_id, c.empresa_transportista_id)
      WHERE c.activo = true
      ORDER BY c.id
    `);
    
    console.log(`Encontrados ${choferesRes.rows.length} choferes`);
    
    let choferesCreados = 0;
    for (const chofer of choferesRes.rows) {
      const dniClean = chofer.dni.replace(/[-\s.]/g, '');
      const email = `chofer.${dniClean}@bca.com`;
      
      const nombre = (chofer.nombre || '').trim();
      const apellido = (chofer.apellido || '').trim();
      
      const exists = await client.query('SELECT id FROM platform.platform_users WHERE email = $1', [email]);
      
      if (exists.rows.length > 0) {
        console.log(`⚠️  ${email} ya existe`);
        continue;
      }
      
      await client.query(`
        INSERT INTO platform.platform_users (
          email, password, nombre, apellido, role, dador_carga_id, empresa_transportista_id, chofer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'CHOFER', $5, $6, $7, NOW(), NOW())
      `, [email, choferPassword, nombre, apellido, chofer.dador_carga_id, chofer.empresa_transportista_id, chofer.chofer_id]);
      
      console.log(`✅ ${email} | ${nombre} ${apellido} | ${chofer.empresa || 'Sin empresa'}`);
      choferesCreados++;
    }
    
    // ========== RESUMEN ==========
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

