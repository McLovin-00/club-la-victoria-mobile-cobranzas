#!/usr/bin/env node

/**
 * Configuración Automática de Nginx Proxy Manager - Node.js
 * Configura automáticamente todos los proxy hosts necesarios para el monorepo.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class NPMConfigurator {
    constructor(configFile = 'scripts/npm-config.json') {
        const scriptDir = __dirname;
        const rootDir = path.dirname(scriptDir);
        const configPath = path.join(rootDir, configFile);
        
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            this.config = JSON.parse(configData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`❌ Error: Archivo de configuración no encontrado: ${configPath}`);
            } else {
                console.log(`❌ Error: JSON inválido en configuración: ${error.message}`);
            }
            process.exit(1);
        }
        
        this.npmHost = this.config.nginx_proxy_manager.host;
        this.npmUrl = `http://${this.npmHost}`;
        this.token = null;
    }
    
    // Función helper para hacer requests HTTP
    makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const client = options.protocol === 'https:' ? https : http;
            
            const req = client.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = data ? JSON.parse(data) : {};
                        resolve({
                            statusCode: res.statusCode,
                            data: jsonData,
                            headers: res.headers
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            data: data,
                            headers: res.headers
                        });
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            if (postData) {
                req.write(postData);
            }
            
            req.end();
        });
    }
    
    async login() {
        console.log('🔐 Autenticando en NPM...');
        
        const creds = this.config.nginx_proxy_manager.credentials;
        const loginData = JSON.stringify({
            identity: creds.username,
            secret: creds.password
        });
        
        const options = {
            hostname: this.npmHost.split(':')[0],
            port: this.npmHost.split(':')[1] || 80,
            path: '/api/tokens',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        try {
            const response = await this.makeRequest(options, loginData);
            
            if (response.statusCode === 200 && response.data.token) {
                this.token = response.data.token;
                console.log('✅ Autenticado correctamente');
                return true;
            } else {
                console.log(`❌ Error: No se pudo obtener token. Status: ${response.statusCode}`);
                console.log(`   Respuesta: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ Error conectando a NPM en ${this.npmUrl}: ${error.message}`);
            console.log('   Verifica que NPM esté funcionando y las credenciales sean correctas');
            return false;
        }
    }
    
    async getExistingHosts() {
        const options = {
            hostname: this.npmHost.split(':')[0],
            port: this.npmHost.split(':')[1] || 80,
            path: '/api/nginx/proxy-hosts',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        };
        
        try {
            const response = await this.makeRequest(options);
            
            if (response.statusCode === 200 && Array.isArray(response.data)) {
                const existingDomains = [];
                response.data.forEach(host => {
                    if (host.domain_names) {
                        existingDomains.push(...host.domain_names);
                    }
                });
                return existingDomains;
            } else {
                console.log('⚠️  Error obteniendo hosts existentes');
                return [];
            }
        } catch (error) {
            console.log(`⚠️  Error obteniendo hosts existentes: ${error.message}`);
            return [];
        }
    }
    
    async createProxyHost(hostConfig) {
        const domain = hostConfig.domain;
        console.log(`Creating proxy host for ${domain}...`);
        
        // Convertir configuración avanzada de array a string
        const advancedConfig = hostConfig.advanced_config ? 
            hostConfig.advanced_config.join('\n') : '';
        
        const proxyData = JSON.stringify({
            domain_names: [domain],
            forward_scheme: "http",
            forward_host: hostConfig.forward_host,
            forward_port: hostConfig.forward_port,
            access_list_id: 0,
            certificate_id: 0,
            ssl_forced: hostConfig.ssl_enabled || false,
            caching_enabled: false,
            block_exploits: hostConfig.block_exploits !== false,
            advanced_config: advancedConfig,
            meta: {
                letsencrypt_agree: true,
                dns_challenge: false
            },
            allow_websocket_upgrade: hostConfig.websockets || false,
            http2_support: hostConfig.ssl_enabled || false,
            hsts_enabled: hostConfig.ssl_enabled || false,
            hsts_subdomains: false
        });
        
        const options = {
            hostname: this.npmHost.split(':')[0],
            port: this.npmHost.split(':')[1] || 80,
            path: '/api/nginx/proxy-hosts',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(proxyData)
            }
        };
        
        try {
            const response = await this.makeRequest(options, proxyData);
            
            if (response.statusCode === 201 && response.data.id) {
                console.log(`   ✅ Creado: ${domain} (ID: ${response.data.id})`);
                return true;
            } else {
                console.log(`   ❌ Error creando ${domain}`);
                console.log(`   Status: ${response.statusCode}`);
                console.log(`   Respuesta: ${JSON.stringify(response.data)}`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Error creando ${domain}: ${error.message}`);
            return false;
        }
    }
    
    async setupAllHosts() {
        console.log('🔍 Verificando hosts existentes...');
        const existingHosts = await this.getExistingHosts();
        console.log(`   Hosts existentes: ${existingHosts.join(', ')}`);
        
        console.log('\n🚀 Creando proxy hosts...');
        
        let successCount = 0;
        const totalHosts = this.config.proxy_hosts.length;
        
        for (const hostConfig of this.config.proxy_hosts) {
            const domain = hostConfig.domain;
            
            // Verificar si ya existe
            if (existingHosts.includes(domain)) {
                console.log(`   ⚠️  ${domain} ya existe, saltando...`);
                successCount++;
                continue;
            }
            
            // Crear host
            if (await this.createProxyHost(hostConfig)) {
                successCount++;
            }
            
            // Pausa entre creaciones
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`\n📊 Resultado: ${successCount}/${totalHosts} hosts configurados`);
        return successCount === totalHosts;
    }
    
    async verifyConfiguration() {
        console.log('\n🔍 Verificando configuración...');
        
        const verificationEndpoints = this.config.verification_endpoints || [];
        
        for (const endpoint of verificationEndpoints) {
            const name = endpoint.name;
            const url = endpoint.url;
            const expectedStatus = endpoint.expected_status;
            const note = endpoint.note || '';
            
            console.log(`Testing ${name}...`);
            
            try {
                // Parsear URL
                const urlObj = new URL(url);
                const isHttps = urlObj.protocol === 'https:';
                
                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port || (isHttps ? 443 : 80),
                    path: urlObj.pathname + urlObj.search,
                    method: 'HEAD',
                    timeout: 10000
                };
                
                const response = await this.makeRequest(options);
                const statusCode = response.statusCode;
                
                if (statusCode === expectedStatus) {
                    console.log(`   ✅ ${statusCode} - OK`);
                } else {
                    console.log(`   ❌ ${statusCode} (expected ${expectedStatus})`);
                    if (note) {
                        console.log(`      Nota: ${note}`);
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }
    
    async run() {
        console.log('🔧 Configurando Nginx Proxy Manager automáticamente...');
        console.log(`📍 NPM Host: ${this.npmHost}`);
        console.log(`🖥️  Server IP: ${this.config.server.ip}`);
        console.log('');
        
        // Login
        if (!await this.login()) {
            return false;
        }
        
        // Configurar hosts
        if (!await this.setupAllHosts()) {
            console.log('\n⚠️  Algunos hosts no se pudieron configurar');
        }
        
        // Verificar configuración
        await this.verifyConfiguration();
        
        console.log('\n🎉 Configuración de NPM completada!');
        console.log('\n📋 PRÓXIMOS PASOS:');
        console.log('1. Verificar que los certificados SSL se generen correctamente');
        console.log('2. Ejecutar: ./scripts/test-proxy-routes.sh');
        console.log('3. Verificar que las imágenes de buckets se visualicen correctamente');
        console.log('\n🌐 URLs configuradas:');
        
        this.config.proxy_hosts.forEach(hostConfig => {
            console.log(`   https://${hostConfig.domain}`);
        });
        
        return true;
    }
}

// Función principal
async function main() {
    if (process.argv.includes('-h') || process.argv.includes('--help')) {
        console.log('Uso: node setup-npm-automated.js');
        console.log('\nConfigura automáticamente los proxy hosts en Nginx Proxy Manager');
        console.log('según la configuración definida en scripts/npm-config.json');
        console.log('\nAsegúrate de que:');
        console.log('1. NPM esté funcionando en la IP configurada');
        console.log('2. Las credenciales en npm-config.json sean correctas');
        console.log('3. Los servicios del monorepo estén ejecutándose');
        return;
    }
    
    const configurator = new NPMConfigurator();
    const success = await configurator.run();
    
    process.exit(success ? 0 : 1);
}

// Ejecutar si es el módulo principal
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error fatal:', error.message);
        process.exit(1);
    });
}

module.exports = NPMConfigurator;
