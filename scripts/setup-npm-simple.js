#!/usr/bin/env node

/**
 * Configuración Simple de Nginx Proxy Manager - Node.js
 * Versión simplificada sin dependencias externas
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuración
const NPM_CONFIG = {
    host: process.env.NPM_HOST || '10.3.0.237:81',
    username: process.env.NPM_USER || 'admin@example.com',
    password: process.env.NPM_PASS || 'changeme',
    serverIP: process.env.SERVER_IP || '10.3.0.244'
};

// Configuración de proxy hosts
const PROXY_HOSTS = [
    {
        domain: 'doc.microsyst.com.ar',
        description: 'Documentos Microservice',
        port: 4802,
        ssl: true,
        websockets: true,
        blockExploits: true,
        advancedConfig: `# Headers para microservicio Documentos
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;

# Configuración para uploads grandes
client_max_body_size 50M;
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
proxy_send_timeout 300s;

# Buffer settings
proxy_buffering off;
proxy_request_buffering off;

# Headers de seguridad
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy strict-origin-when-cross-origin;`
    },
    {
        domain: 'buck.microsyst.com.ar',
        description: 'MinIO Storage',
        port: 9000,
        ssl: true,
        websockets: false,
        blockExploits: false,
        advancedConfig: `# Headers específicos para MinIO
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Server $host;

# Configuración para archivos grandes
client_max_body_size 100M;
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
proxy_send_timeout 300s;

# Desactivar buffering para streaming
proxy_buffering off;
proxy_request_buffering off;

# Headers mínimos de seguridad para MinIO
add_header X-Frame-Options SAMEORIGIN;
add_header X-Content-Type-Options nosniff;`
    },
    {
        domain: 'bac-bca.microsyst.com.ar',
        description: 'Calidad Microservice',
        port: 4815,
        ssl: true,
        websockets: true,
        blockExploits: true,
        advancedConfig: `# Headers para microservicio Calidad
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Timeouts estándar para API
proxy_read_timeout 60s;
proxy_connect_timeout 10s;
proxy_send_timeout 60s;

# Headers de seguridad
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";`
    }
];

// Función para hacer requests HTTP simples
function makeHttpRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData,
                        body: body
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: null,
                        body: body
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(data);
        }
        
        req.end();
    });
}

// Login y obtener token
async function login() {
    console.log('🔐 Autenticando en NPM...');
    
    const loginData = JSON.stringify({
        identity: NPM_CONFIG.username,
        secret: NPM_CONFIG.password
    });
    
    const options = {
        hostname: NPM_CONFIG.host.split(':')[0],
        port: NPM_CONFIG.host.split(':')[1] || 80,
        path: '/api/tokens',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };
    
    try {
        const response = await makeHttpRequest(options, loginData);
        
        if (response.statusCode === 200 && response.data.token) {
            console.log('✅ Autenticado correctamente');
            return response.data.token;
        } else {
            console.log(`❌ Error de autenticación. Status: ${response.statusCode}`);
            console.log(`   Response: ${response.body}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error conectando a NPM: ${error.message}`);
        return null;
    }
}

// Obtener hosts existentes
async function getExistingHosts(token) {
    const options = {
        hostname: NPM_CONFIG.host.split(':')[0],
        port: NPM_CONFIG.host.split(':')[1] || 80,
        path: '/api/nginx/proxy-hosts',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };
    
    try {
        const response = await makeHttpRequest(options);
        
        if (response.statusCode === 200 && Array.isArray(response.data)) {
            const domains = [];
            response.data.forEach(host => {
                if (host.domain_names) {
                    domains.push(...host.domain_names);
                }
            });
            return domains;
        }
    } catch (error) {
        console.log(`⚠️  Error obteniendo hosts: ${error.message}`);
    }
    
    return [];
}

// Crear proxy host
async function createProxyHost(token, hostConfig) {
    const domain = hostConfig.domain;
    console.log(`Creating proxy host for ${domain}...`);
    
    const proxyData = JSON.stringify({
        domain_names: [domain],
        forward_scheme: "http",
        forward_host: NPM_CONFIG.serverIP,
        forward_port: hostConfig.port,
        access_list_id: 0,
        certificate_id: 0,
        ssl_forced: hostConfig.ssl,
        caching_enabled: false,
        block_exploits: hostConfig.blockExploits,
        advanced_config: hostConfig.advancedConfig,
        meta: {
            letsencrypt_agree: true,
            dns_challenge: false
        },
        allow_websocket_upgrade: hostConfig.websockets,
        http2_support: hostConfig.ssl,
        hsts_enabled: hostConfig.ssl,
        hsts_subdomains: false
    });
    
    const options = {
        hostname: NPM_CONFIG.host.split(':')[0],
        port: NPM_CONFIG.host.split(':')[1] || 80,
        path: '/api/nginx/proxy-hosts',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(proxyData)
        }
    };
    
    try {
        const response = await makeHttpRequest(options, proxyData);
        
        if (response.statusCode === 201 && response.data.id) {
            console.log(`   ✅ Creado: ${domain} (ID: ${response.data.id})`);
            return true;
        } else {
            console.log(`   ❌ Error creando ${domain} - Status: ${response.statusCode}`);
            console.log(`   Response: ${response.body}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Error creando ${domain}: ${error.message}`);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🔧 Configurando Nginx Proxy Manager automáticamente...');
    console.log(`📍 NPM Host: ${NPM_CONFIG.host}`);
    console.log(`🖥️  Server IP: ${NPM_CONFIG.serverIP}`);
    console.log('');
    
    // Mostrar ayuda
    if (process.argv.includes('-h') || process.argv.includes('--help')) {
        console.log('Uso: node setup-npm-simple.js');
        console.log('\nVariables de entorno opcionales:');
        console.log('  NPM_HOST=10.3.0.237:81');
        console.log('  NPM_USER=admin@example.com');
        console.log('  NPM_PASS=tu_password');
        console.log('  SERVER_IP=10.3.0.244');
        console.log('\nEjemplo:');
        console.log('  NPM_PASS="mi_password" node scripts/setup-npm-simple.js');
        return;
    }
    
    // Login
    const token = await login();
    if (!token) {
        console.log('❌ No se pudo autenticar. Verifica las credenciales.');
        process.exit(1);
    }
    
    // Obtener hosts existentes
    console.log('🔍 Verificando hosts existentes...');
    const existingHosts = await getExistingHosts(token);
    console.log(`   Hosts existentes: ${existingHosts.join(', ') || 'Ninguno'}`);
    
    // Configurar hosts
    console.log('\n🚀 Creando proxy hosts...');
    let successCount = 0;
    
    for (const hostConfig of PROXY_HOSTS) {
        // Verificar si ya existe
        if (existingHosts.includes(hostConfig.domain)) {
            console.log(`   ⚠️  ${hostConfig.domain} ya existe, saltando...`);
            successCount++;
            continue;
        }
        
        // Crear host
        if (await createProxyHost(token, hostConfig)) {
            successCount++;
        }
        
        // Pausa entre creaciones
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`\n📊 Resultado: ${successCount}/${PROXY_HOSTS.length} hosts configurados`);
    
    // Información final
    console.log('\n🎉 Configuración de NPM completada!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar que los certificados SSL se generen correctamente');
    console.log('2. Ejecutar: npm run test-proxy');
    console.log('3. Verificar que las imágenes de buckets se visualicen correctamente');
    console.log('\n🌐 URLs configuradas:');
    
    PROXY_HOSTS.forEach(host => {
        console.log(`   https://${host.domain}`);
    });
    
    console.log('\n✅ ¡Todo listo para usar!');
}

// Ejecutar
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    });
}
