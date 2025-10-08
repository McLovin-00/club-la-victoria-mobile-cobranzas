/*
 * PM2 ecosystem configuration for DEVELOPMENT
 * - Runs npm run dev for each service
 * - Uses .env file for environment variables
 * - Optimized for development with watch and restart
 */

const path = require('path');
const fs = require('fs');

// Función para cargar variables de entorno
function loadEnvConfig(envFile) {
  const envPath = path.join(__dirname, envFile);
  const envConfig = {};

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        envConfig[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  return envConfig;
}

// Cargar configuración de desarrollo
const envConfig = loadEnvConfig('.env.development');

module.exports = {
  apps: [
    {
      name: 'backend-dev',
      cwd: 'apps/backend',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        ...envConfig,
      },
      watch: false, // npm run dev ya tiene hot reload
      max_memory_restart: '1024M',
      out_file: '../../logs/backend-pm2.out.log',
      error_file: '../../logs/backend-pm2.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'frontend-dev',
      cwd: 'apps/frontend',
      script: 'npx',
      args: 'dotenv-cli -e ../../.env.development -- npm run dev',
      env: {
        NODE_ENV: 'development',
        ...envConfig,
      },
      watch: false, // Vite ya tiene hot reload
      max_memory_restart: '512M',
      out_file: '../../logs/frontend-pm2.out.log',
      error_file: '../../logs/frontend-pm2.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'documentos-dev',
      cwd: 'apps/documentos',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'development',
        ...envConfig,
      },
      watch: false, // ts-node-dev ya tiene hot reload
      max_memory_restart: '1024M',
      out_file: '../../logs/documentos-pm2.out.log',
      error_file: '../../logs/documentos-pm2.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};
