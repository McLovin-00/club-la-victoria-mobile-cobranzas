import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import removeConsole from 'vite-plugin-remove-console'

// https://vite.dev/config/

// Extraer host y puerto del backend desde la variable de entorno VITE_API_URL
const apiUrl = process.env.VITE_API_URL || 'http://localhost:4800'
const { origin: apiOrigin, pathname: apiBasePath } = new URL(apiUrl)

// Resolver endpoint del microservicio Helpdesk para enrutar su API en desarrollo
const helpdeskUrl = process.env.VITE_HELPDESK_API_URL || `http://localhost:${process.env.HELPDESK_PORT || '4803'}`
const { origin: helpdeskOrigin } = new URL(helpdeskUrl)

// Configuración de puertos desde variables de entorno
const serverPort = parseInt(process.env.FRONTEND_PORT || '8550', 10)
const clientPort = parseInt(process.env.FRONTEND_PORT || '8550', 10)

// Extraer host y protocolo del frontend desde FRONTEND_URL
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8550'
const { hostname: frontendHost, protocol: frontendProtocol } = new URL(frontendUrl)

// Extraer todos los hosts permitidos desde FRONTEND_URLS
const frontendUrls = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:8550'
const allowedHosts = frontendUrls.split(',').map(url => {
  try {
    return new URL(url.trim()).hostname
  } catch {
    return url.trim()
  }
}).filter(Boolean)

// Agregar hosts específicos conocidos para desarrollo y producción
const additionalHosts = [
  'bca.microsyst.com.ar',
  'doc.microsyst.com.ar',
  '10.3.0.244',
  'localhost',
  '127.0.0.1'
]

const allAllowedHosts = [...new Set([...allowedHosts, ...additionalHosts])]

// Ruta al node_modules de la raíz del monorepo
const root = path.resolve(__dirname, '../../');

export default defineConfig({
  plugins: [
    react()
    // removeConsole plugin disabled temporarily due to build issues
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Forzar única instancia de React desde node_modules raíz
      react: path.join(root, 'node_modules/react'),
      'react-dom': path.join(root, 'node_modules/react-dom')
    },
    dedupe: ['react', 'react-dom'] // Evitar duplicados de React
  },
  server: {
    host: '0.0.0.0', // Exponer en todas las interfaces de red
    port: serverPort,
    // Permitir hosts explícitos para Vite Dev Server
    allowedHosts: allAllowedHosts,
    proxy: {
      '/api/helpdesk': {
        target: helpdeskOrigin,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Helpdesk proxy error:', err);
          });
        }
      },
      '/api': {
        target: apiOrigin, // Dinámico según .env
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: false, // Preservar cookies
        rewrite: (path) => path, // No reescribir, mantener /api
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
        }
      },
    },
    hmr: {
      // Cuando estamos detrás de HTTPS, el cliente debe conectarse al puerto 443
      clientPort: frontendProtocol === 'https:' ? 443 : clientPort,
      host: frontendHost, // Host dinámico extraído de FRONTEND_URL
      protocol: frontendProtocol === 'https:' ? 'wss' : 'ws',
      timeout: 5000
    },
  },
  optimizeDeps: {
    force: true
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 600, // Aumentar límite a 600KB
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separar node_modules en chunks más pequeños
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Redux
            if (id.includes('redux') || id.includes('@reduxjs')) {
              return 'vendor-redux';
            }
            // UI Components (Radix, Headless, etc)
            if (id.includes('@radix-ui') || id.includes('@headlessui') || id.includes('lucide')) {
              return 'vendor-ui';
            }
            // Utilidades grandes
            if (id.includes('date-fns') || id.includes('zod') || id.includes('axios')) {
              return 'vendor-utils';
            }
            // Heroicons
            if (id.includes('@heroicons')) {
              return 'vendor-icons';
            }
            // JSZip (ya está separado pero asegurar)
            if (id.includes('jszip')) {
              return 'vendor-jszip';
            }
            // Socket.io
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
          }
          // Features de documentos
          if (id.includes('/features/documentos/')) {
            return 'feature-documentos';
          }
          // Features de remitos
          if (id.includes('/features/remitos/')) {
            return 'feature-remitos';
          }
        },
      },
    },
  },
})
