#!/usr/bin/env python3
"""
Configuración Automatizada de Nginx Proxy Manager
Configura automáticamente todos los proxy hosts necesarios para el monorepo.
"""

import json
import requests
import sys
import os
import time
from typing import Dict, Any, List

class NPMConfigurator:
    def __init__(self, config_file: str = "scripts/npm-config.json"):
        """Inicializa el configurador con el archivo de configuración."""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(script_dir)
        config_path = os.path.join(root_dir, config_file)
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        except FileNotFoundError:
            print(f"❌ Error: Archivo de configuración no encontrado: {config_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"❌ Error: JSON inválido en configuración: {e}")
            sys.exit(1)
        
        self.npm_host = self.config['nginx_proxy_manager']['host']
        self.npm_url = f"http://{self.npm_host}"
        self.token = None
        
    def login(self) -> bool:
        """Autentica en NPM y obtiene el token."""
        print("🔐 Autenticando en NPM...")
        
        creds = self.config['nginx_proxy_manager']['credentials']
        login_data = {
            "identity": creds['username'],
            "password": creds['password']
        }
        
        try:
            response = requests.post(
                f"{self.npm_url}/api/tokens",
                json=login_data,
                timeout=10
            )
            response.raise_for_status()
            
            data = response.json()
            self.token = data.get('token')
            
            if not self.token:
                print(f"❌ Error: No se pudo obtener token. Respuesta: {data}")
                return False
                
            print("✅ Autenticado correctamente")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error conectando a NPM en {self.npm_url}: {e}")
            print("   Verifica que NPM esté funcionando y las credenciales sean correctas")
            return False
    
    def get_existing_hosts(self) -> List[str]:
        """Obtiene la lista de hosts proxy existentes."""
        try:
            response = requests.get(
                f"{self.npm_url}/api/nginx/proxy-hosts",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            response.raise_for_status()
            
            hosts = response.json()
            existing_domains = []
            for host in hosts:
                existing_domains.extend(host.get('domain_names', []))
            
            return existing_domains
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️  Error obteniendo hosts existentes: {e}")
            return []
    
    def create_proxy_host(self, host_config: Dict[str, Any]) -> bool:
        """Crea un proxy host con la configuración especificada."""
        domain = host_config['domain']
        print(f"Creating proxy host for {domain}...")
        
        # Convertir configuración avanzada de lista a string
        advanced_config = '\n'.join(host_config.get('advanced_config', []))
        
        proxy_data = {
            "domain_names": [domain],
            "forward_scheme": "http",
            "forward_host": host_config['forward_host'],
            "forward_port": host_config['forward_port'],
            "access_list_id": 0,
            "certificate_id": 0,
            "ssl_forced": host_config.get('ssl_enabled', False),
            "caching_enabled": False,
            "block_exploits": host_config.get('block_exploits', True),
            "advanced_config": advanced_config,
            "meta": {
                "letsencrypt_agree": True,
                "dns_challenge": False
            },
            "allow_websocket_upgrade": host_config.get('websockets', False),
            "http2_support": host_config.get('ssl_enabled', False),
            "hsts_enabled": host_config.get('ssl_enabled', False),
            "hsts_subdomains": False
        }
        
        try:
            response = requests.post(
                f"{self.npm_url}/api/nginx/proxy-hosts",
                json=proxy_data,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            host_id = result.get('id')
            
            if host_id:
                print(f"   ✅ Creado: {domain} (ID: {host_id})")
                return True
            else:
                print(f"   ❌ Error creando {domain}")
                print(f"   Respuesta: {result}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Error creando {domain}: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    print(f"   Detalles: {error_data}")
                except (ValueError, KeyError):
                    print(f"   Respuesta HTTP: {e.response.text}")
            return False
    
    def setup_all_hosts(self) -> bool:
        """Configura todos los proxy hosts definidos en la configuración."""
        print("🔍 Verificando hosts existentes...")
        existing_hosts = self.get_existing_hosts()
        print(f"   Hosts existentes: {', '.join(existing_hosts)}")
        
        print("\n🚀 Creando proxy hosts...")
        
        success_count = 0
        total_hosts = len(self.config['proxy_hosts'])
        
        for host_config in self.config['proxy_hosts']:
            domain = host_config['domain']
            
            # Verificar si ya existe
            if domain in existing_hosts:
                print(f"   ⚠️  {domain} ya existe, saltando...")
                success_count += 1
                continue
            
            # Crear host
            if self.create_proxy_host(host_config):
                success_count += 1
            
            # Pausa entre creaciones
            time.sleep(2)
        
        print(f"\n📊 Resultado: {success_count}/{total_hosts} hosts configurados")
        return success_count == total_hosts
    
    def verify_configuration(self) -> None:
        """Verifica que la configuración esté funcionando correctamente."""
        print("\n🔍 Verificando configuración...")
        
        verification_endpoints = self.config.get('verification_endpoints', [])
        
        for endpoint in verification_endpoints:
            name = endpoint['name']
            url = endpoint['url']
            expected_status = endpoint['expected_status']
            note = endpoint.get('note', '')
            
            print(f"Testing {name}...")
            
            try:
                response = requests.head(url, timeout=10, allow_redirects=True)
                status_code = response.status_code
                
                if status_code == expected_status:
                    print(f"   ✅ {status_code} - OK")
                else:
                    print(f"   ❌ {status_code} (expected {expected_status})")
                    if note:
                        print(f"      Nota: {note}")
                        
            except requests.exceptions.RequestException as e:
                print(f"   ❌ Error: {e}")
    
    def run(self) -> bool:
        """Ejecuta la configuración completa."""
        print("🔧 Configurando Nginx Proxy Manager automáticamente...")
        print(f"📍 NPM Host: {self.npm_host}")
        print(f"🖥️  Server IP: {self.config['server']['ip']}")
        print()
        
        # Login
        if not self.login():
            return False
        
        # Configurar hosts
        if not self.setup_all_hosts():
            print("\n⚠️  Algunos hosts no se pudieron configurar")
        
        # Verificar configuración
        self.verify_configuration()
        
        print("\n🎉 Configuración de NPM completada!")
        print("\n📋 PRÓXIMOS PASOS:")
        print("1. Verificar que los certificados SSL se generen correctamente")
        print("2. Ejecutar: ./scripts/test-proxy-routes.sh")
        print("3. Verificar que las imágenes de buckets se visualicen correctamente")
        print("\n🌐 URLs configuradas:")
        for host_config in self.config['proxy_hosts']:
            print(f"   https://{host_config['domain']}")
        
        return True

def main():
    """Función principal."""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("Uso: python3 setup-npm-automated.py")
        print("\nConfigura automáticamente los proxy hosts en Nginx Proxy Manager")
        print("según la configuración definida en scripts/npm-config.json")
        print("\nAsegúrate de que:")
        print("1. NPM esté funcionando en la IP configurada")
        print("2. Las credenciales en npm-config.json sean correctas")
        print("3. Los servicios del monorepo estén ejecutándose")
        return
    
    configurator = NPMConfigurator()
    success = configurator.run()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
