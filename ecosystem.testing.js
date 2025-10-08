/*
 * PM2 ecosystem configuration for TESTING
 * - Runs services with external configurations
 * - Uses .env.testing for environment variables
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

// Cargar configuración de testing
const envConfig = loadEnvConfig('.env.testing');

module.exports = {
  apps: [
    {
      name: 'backend-testing',
      cwd: 'apps/backend',
      script: 'npx',
      args: 'dotenv-cli -e ../../.env.testing -- npm run dev',
      env: {
        NODE_ENV: 'testing',
        ...envConfig,
      },
      watch: false,
      max_memory_restart: '1024M',
      out_file: '../../logs/backend-testing.out.log',
      error_file: '../../logs/backend-testing.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'frontend-testing',
      cwd: 'apps/frontend',
      script: 'npx',
      args: 'dotenv-cli -e ../../.env.testing -- npm run dev',
      env: {
        NODE_ENV: 'testing',
        ...envConfig,
      },
      watch: false,
      max_memory_restart: '512M',
      out_file: '../../logs/frontend-testing.out.log',
      error_file: '../../logs/frontend-testing.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      name: 'documentos-testing',
      cwd: 'apps/documentos',
      script: 'npx',
      args: 'dotenv-cli -e ../../.env.testing -- npm run dev',
      env: {
        NODE_ENV: 'testing',
        ...envConfig,
      },
      watch: false,
      max_memory_restart: '1024M',
      out_file: '../../logs/documentos-testing.out.log',
      error_file: '../../logs/documentos-testing.err.log',
      time: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
  ],
};

