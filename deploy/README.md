# Configuraciones de Deploy por Ambiente

Este directorio contiene las configuraciones específicas de Docker para cada ambiente.

## Estructura

```
deploy/
├── stack-ip-10.3.0.243/       # Desarrollo/Staging
│   ├── Dockerfile.frontend    # goStatic (ultra-liviano)
│   ├── Dockerfile.backend
│   ├── Dockerfile.documentos
│   ├── docker-compose.yml
│   └── keys/                  # JWT keys
│
├── stack-ip-10.8.10.20/       # Producción
│   ├── Dockerfile.frontend    # Nginx (proxy reverso)
│   ├── Dockerfile.backend
│   ├── Dockerfile.documentos
│   └── nginx.conf             # Configuración de Nginx
│
└── stack-ip-192.168.15.136/   # Legacy (deprecado)
```

## Diferencias entre Ambientes

### Frontend

| Aspecto | 10.3.0.243 (Dev) | 10.8.10.20 (Prod) |
|---------|------------------|-------------------|
| **Servidor Web** | goStatic (~8MB) | Nginx (~25MB) |
| **Proxy Reverso** | ❌ No | ✅ Sí |
| **Rutas API** | Directas (IP:puerto) | Via Nginx (`/api/*`) |
| **HTTPS** | ❌ No | ✅ Via Nginx Proxy Manager |
| **Tamaño Imagen** | ~8 MB | ~25 MB |

### Variables de Build (Vite)

**Desarrollo (10.3.0.243):**
```yaml
VITE_API_URL: http://10.3.0.243:4800
VITE_DOCUMENTOS_API_URL: http://10.3.0.243:4802
```

**Producción (10.8.10.20):**
```yaml
VITE_API_URL: ""  # Usa rutas relativas via Nginx
VITE_DOCUMENTOS_API_URL: ""  # Via /api/docs/
```

## Comandos de Deploy

### Desarrollo (10.3.0.243)

```bash
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.243
cd /home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243
docker compose build --no-cache
docker compose up -d
```

### Producción (10.8.10.20)

```bash
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20
# Los contenedores se manejan individualmente (sin docker-compose)
docker build -t bca/frontend:latest -f deploy/stack-ip-10.8.10.20/Dockerfile.frontend .
docker build -t bca/backend:latest -f deploy/stack-ip-10.8.10.20/Dockerfile.backend .
```

## Notas Importantes

1. **JWT Keys**: Las claves JWT deben estar en `./keys/` para cada ambiente
2. **Healthchecks**: Todos los Dockerfiles incluyen HEALTHCHECK
3. **Restart Policy**: Usar `--restart unless-stopped` al crear contenedores
4. **IPv6**: El frontend de producción escucha en IPv4 e IPv6 (`listen [::]:8550;`)

## Ver Documentación Completa

- `docs/DEPLOYMENT-10.3.0.243.md` - Guía completa de desarrollo
- `docs/DEPLOYMENT-10.8.10.20.md` - Guía completa de producción

