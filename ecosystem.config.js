/*
 * PM2 ecosystem configuration for HYBRID deployment
 * - Runs frontend (Vite preview), backend (Express), documentos microservice on host with PM2
 * - Infra (Postgres, Redis, MinIO, Nginx) runs via docker-compose.hybrid.yml
 */

module.exports = {
  apps: [
    {
      name: 'frontend',
      cwd: 'apps/frontend',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 8550 --strictPort',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      max_memory_restart: '512M',
      out_file: '../../logs/frontend.out.log',
      error_file: '../../logs/frontend.err.log',
      time: true,
    },
    {
      name: 'backend',
      cwd: 'apps/backend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.BACKEND_PORT || '4800',
      },
      watch: false,
      max_memory_restart: '1024M',
      out_file: '../../logs/backend.out.log',
      error_file: '../../logs/backend.err.log',
      time: true,
    },
    {
      name: 'documentos',
      cwd: 'apps/documentos',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        DOCUMENTOS_PORT: process.env.DOCUMENTOS_PORT || '4802',
      },
      watch: false,
      max_memory_restart: '1024M',
      out_file: '../../logs/documentos.out.log',
      error_file: '../../logs/documentos.err.log',
      time: true,
    },
  ],
};


