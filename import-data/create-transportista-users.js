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

const DADOR_CARGA_ID = 1; // Diego Puech
const DEFAULT_PASSWORD = 'Transp2024!';
const BCRYPT_ROUNDS = 12;

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos');
    
    // Obtener todas las empresas transportistas activas
    const empresasRes = await client.query(`
      SELECT id, razon_social, cuit 
      FROM documentos.empresas_transportistas 
      WHERE activo = true 
      ORDER BY id
    `);
    
    console.log(`Encontradas ${empresasRes.rows.length} empresas transportistas`);
    
    // Hashear la contraseña una sola vez
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    console.log(`Password hasheada: ${hashedPassword.substring(0, 20)}...`);
    
    const createdUsers = [];
    const errors = [];
    
    for (const empresa of empresasRes.rows) {
      // Generar email basado en el CUIT (sin guiones)
      const cuitClean = empresa.cuit.replace(/[-\s]/g, '');
      const email = `transportista.${cuitClean}@bca.com`;
      
      // Extraer nombre de la razón social (primeras palabras)
      const razonParts = empresa.razon_social.trim().split(/\s+/);
      const nombre = razonParts.length > 1 ? razonParts.slice(0, -1).join(' ') : razonParts[0];
      const apellido = razonParts.length > 1 ? razonParts[razonParts.length - 1] : '';
      
      try {
        // Verificar si ya existe
        const existsRes = await client.query(
          'SELECT id FROM platform.platform_users WHERE email = $1',
          [email]
        );
        
        if (existsRes.rows.length > 0) {
          console.log(`⚠️  Usuario ${email} ya existe, omitiendo...`);
          continue;
        }
        
        // Insertar el nuevo usuario
        const insertRes = await client.query(`
          INSERT INTO platform.platform_users (
            email, password, nombre, apellido, role, 
            dador_carga_id, empresa_transportista_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'TRANSPORTISTA', $5, $6, NOW(), NOW())
          RETURNING id, email
        `, [email, hashedPassword, nombre, apellido, DADOR_CARGA_ID, empresa.id]);
        
        createdUsers.push({
          id: insertRes.rows[0].id,
          email,
          empresa: empresa.razon_social,
          cuit: empresa.cuit
        });
        
        console.log(`✅ Creado: ${email} (Empresa ID: ${empresa.id} - ${empresa.razon_social})`);
        
      } catch (err) {
        errors.push({ email, error: err.message });
        console.error(`❌ Error creando ${email}: ${err.message}`);
      }
    }
    
    console.log('\n========== RESUMEN ==========');
    console.log(`Usuarios creados: ${createdUsers.length}`);
    console.log(`Errores: ${errors.length}`);
    console.log(`Password por defecto: ${DEFAULT_PASSWORD}`);
    
    if (createdUsers.length > 0) {
      console.log('\n--- Usuarios Creados ---');
      for (const u of createdUsers) {
        console.log(`${u.email} | ${u.empresa} | CUIT: ${u.cuit}`);
      }
    }
    
    if (errors.length > 0) {
      console.log('\n--- Errores ---');
      for (const e of errors) {
        console.log(`${e.email}: ${e.error}`);
      }
    }
    
  } catch (err) {
    console.error('Error general:', err);
  } finally {
    await client.end();
  }
}

main();

