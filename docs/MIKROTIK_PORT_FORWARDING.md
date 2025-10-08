# Configuración MikroTik para Nginx Proxy Manager

## Problema Identificado
- **DNS Público**: `*.microsyst.com.ar` → `168.197.248.68` ✅
- **Nginx Proxy Manager**: `10.3.0.237:80/443` ✅  
- **Port Forwarding**: ❌ **FALTA CONFIGURAR**

## Solución: Configurar Port Forwarding en MikroTik

### 1. Acceder al MikroTik
```bash
# Via Winbox, WebFig o SSH
ssh admin@10.3.0.1
```

### 2. Configurar NAT Rules
```bash
# HTTP (Puerto 80)
/ip firewall nat add chain=dstnat action=dst-nat \
  to-addresses=10.3.0.237 to-ports=80 \
  protocol=tcp dst-port=80 \
  comment="NPM HTTP"

# HTTPS (Puerto 443)  
/ip firewall nat add chain=dstnat action=dst-nat \
  to-addresses=10.3.0.237 to-ports=443 \
  protocol=tcp dst-port=443 \
  comment="NPM HTTPS"
```

### 3. Verificar Rules
```bash
/ip firewall nat print
```

### 4. Verificar desde Exterior
```bash
curl -I https://doc.microsyst.com.ar/health/ready
curl -I https://buck.microsyst.com.ar/
```

## Topología de Red

```
Internet (168.197.248.68)
    ↓
[MikroTik Router] 10.3.0.1
    ↓ Port Forward 80/443
[NPM] 10.3.0.237:80/443
    ↓ Proxy Pass
[Services] 10.3.0.244:xxxx
```

## Configuración Alternativa (Si NPM en el mismo servidor)

Si quieres que NPM esté en el mismo servidor (`10.3.0.244`):

```bash
# Configurar NAT hacia el servidor principal
/ip firewall nat add chain=dstnat action=dst-nat \
  to-addresses=10.3.0.244 to-ports=80 \
  protocol=tcp dst-port=80

/ip firewall nat add chain=dstnat action=dst-nat \
  to-addresses=10.3.0.244 to-ports=443 \
  protocol=tcp dst-port=443
```

## Verificación

### Desde Interno (Funciona ✅)
```bash
curl -I -H "Host: doc.microsyst.com.ar" http://10.3.0.237/health/ready
# HTTP/1.1 200 OK
```

### Desde Externo (Debe funcionar después de configurar)
```bash
curl -I https://doc.microsyst.com.ar/health/ready
# HTTP/1.1 200 OK
```

## Troubleshooting

### 1. Verificar NAT Rules
```bash
/ip firewall nat print where chain=dstnat
```

### 2. Verificar Logs
```bash
/log print where topics~"firewall"
```

### 3. Test de Conectividad
```bash
# Desde otro servidor externo
telnet 168.197.248.68 80
telnet 168.197.248.68 443
```
