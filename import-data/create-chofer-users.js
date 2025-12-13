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

const DEFAULT_PASSWORD = 'Chofer2024!';
const BCRYPT_ROUNDS = 12;

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos');
    
    // Obtener choferes con sus vinculaciones desde equipos
    const choferesRes = await client.query(`
      SELECT DISTINCT 
        c.id as chofer_id,
        c.dni,
        c.nombre,
        c.apellido,
        COALESCE(e.empresa_transportista_id, c.empresa_transportista_id) as empresa_transportista_id,
        et.razon_social as empresa,
        et.cuit as empresa_cuit,
        COALESCE(e.dador_carga_id, c.dador_carga_id) as dador_carga_id
      FROM documentos.choferes c
      LEFT JOIN documentos.equipo e ON e.driver_id = c.id
      LEFT JOIN documentos.empresas_transportistas et ON et.id = COALESCE(e.empresa_transportista_id, c.empresa_transportista_id)
      WHERE c.activo = true
      ORDER BY c.id
    `);
    
    console.log(`Encontrados ${choferesRes.rows.length} choferes`);
    
    // Hashear la contraseña una sola vez
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    console.log(`Password hasheada: ${hashedPassword.substring(0, 20)}...`);
    
    const createdUsers = [];
    const errors = [];
    
    for (const chofer of choferesRes.rows) {
      // Generar email basado en el DNI
      const dniClean = chofer.dni.replace(/[-\s.]/g, '');
      const email = `chofer.${dniClean}@bca.com`;
      
      const nombre = (chofer.nombre || '').trim();
      const apellido = (chofer.apellido || '').trim();
      
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
            dador_carga_id, empresa_transportista_id, chofer_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'CHOFER', $5, $6, $7, NOW(), NOW())
          RETURNING id, email
        `, [
          email, 
          hashedPassword, 
          nombre, 
          apellido, 
          chofer.dador_carga_id,
          chofer.empresa_transportista_id,
          chofer.chofer_id
        ]);
        
        createdUsers.push({
          id: insertRes.rows[0].id,
          email,
          dni: chofer.dni,
          nombre: `${nombre} ${apellido}`.trim(),
          empresa: chofer.empresa,
          empresaCuit: chofer.empresa_cuit
        });
        
        console.log(`✅ Creado: ${email} (${nombre} ${apellido} - ${chofer.empresa})`);
        
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
        console.log(`${u.email} | ${u.nombre} | DNI: ${u.dni} | Empresa: ${u.empresa}`);
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

