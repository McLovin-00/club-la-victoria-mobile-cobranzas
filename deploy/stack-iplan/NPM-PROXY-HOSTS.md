# Configuracion NPM (10.8.10.49) para IPLAN

## Acceso al panel NPM

```
URL: http://10.8.10.49:81
```

## Fase 1: Proxy host temporal para testing

Crear un nuevo proxy host en NPM con la siguiente configuracion:

### Details
| Campo | Valor |
|-------|-------|
| Domain Names | `grupobca.microsyst.com.ar` |
| Scheme | `http` |
| Forward Hostname/IP | `10.8.10.120` |
| Forward Port | `80` |
| Block Common Exploits | Si |
| Websockets Support | **Si** (critico para Socket.IO) |

### SSL
| Campo | Valor |
|-------|-------|
| SSL Certificate | Request a new SSL Certificate |
| Force SSL | Si |
| HTTP/2 Support | Si |
| HSTS Enabled | Si |
| Email for Let's Encrypt | (email del administrador) |

### Advanced (Custom Nginx Configuration)

```nginx
# Headers para proxy
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# Timeouts para uploads grandes y procesamiento AI
proxy_read_timeout 120s;
proxy_send_timeout 120s;
proxy_connect_timeout 75s;
client_max_body_size 50M;

# HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### DNS

Verificar que `grupobca.microsyst.com.ar` resuelva a `168.197.248.68` (IP publica del MikroTik).
El wildcard `*.microsyst.com.ar` ya apunta ahi, asi que no deberia requerir cambio.

### Verificacion

```bash
# Desde un equipo externo
curl -I https://grupobca.microsyst.com.ar/health
# Esperado: HTTP/2 200, body: {"status":"ok","server":"nginx-iplan"}

# WebSocket
curl -I https://grupobca.microsyst.com.ar/socket.io/?EIO=4&transport=polling
# Esperado: HTTP/2 200
```

---

## Fase 2: Cutover a produccion

Cuando el testing paralelo este validado:

### Paso 1 - Reapuntar bca-group

Editar el proxy host existente `bca-group.microsyst.com.ar` (proxy host #2 en NPM):

| Campo | Valor anterior | Valor nuevo |
|-------|---------------|-------------|
| Forward Hostname/IP | `10.8.10.20` | `10.8.10.120` |
| Forward Port | `8550` | `80` |
| Websockets Support | No | **Si** |

Agregar la misma Advanced config que el proxy host temporal.

### Paso 2 - Proxy hosts a eliminar

Despues del cutover, estos proxy hosts ya no son necesarios porque VM1 Nginx rutea todo por paths:

| # | Dominio | Destino anterior | Reemplazo |
|---|---------|-----------------|-----------|
| 4 | `bca-b.microsyst.com.ar` | `10.8.10.20:4800` | `/api/platform/` en bca-group |
| 5 | `documentos.microsyst.com.ar` | `10.8.10.20:4802` | `/api/docs/` en bca-group |
| 3 | `bucket.microsyst.com.ar` | `10.8.10.20:9000` | `/storage/` en bca-group |

No eliminar inmediatamente. Mantener 7 dias por si algun cliente referencia esos dominios directamente.

### Paso 3 - Proxy host temporal

Opcionalmente mantener `grupobca.microsyst.com.ar` como alias o eliminarlo.
