import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

// Configuración del pool de conexiones para PostgreSQL
export const db = new Pool({
  host: DB_HOST || 'localhost',
  port: parseInt(DB_PORT || '5432'),
  database: DB_NAME || 'empresas_db',
  user: DB_USER || 'postgres',
  password: DB_PASSWORD || 'postgres',
  // max: 20, // máximo de conexiones en el pool
  // idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva
  // connectionTimeoutMillis: 2000, // tiempo máximo para establecer una conexión
});

// Eventos para monitoreo del pool
db.on('connect', () => {
  console.log('Cliente de base de datos conectado');
});

db.on('error', err => {
  console.error('Error en cliente de base de datos:', err);
});

// Función para verificar la conexión
export const testConnection = async () => {
  try {
    const client = await db.connect();
    console.log('Conexión a la base de datos establecida correctamente');
    client.release();
    return true;
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    return false;
  }
};
