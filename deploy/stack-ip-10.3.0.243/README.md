# Despliegue BCA (sin Nginx) - IP fija 10.3.0.243

Este stack despliega:
- Backend core (4800)
- Microservicio Documentos (4802, HTTP/WS)
- Frontend estático (8550)
- MinIO (9000)
- Postgres (5432, accesible desde cualquier IP)
- Redis (interno)
- Flowise (3005)

Recursos asignados (3 vCPU, 32 GB RAM, 800 GB disco): ver `docker-compose.yml` (deploy.resources). MinIO: 10–12 GB RAM; Documentos: 4 GB; Postgres: 12 GB; Flowise: 3 GB.

## Prerrequisitos
- Ubuntu 22.04+ con Docker y Docker Compose plugin
- UFW configurado para permitir acceso desde cualquier IP

```bash
# Docker
sudo apt-get update -y && sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# UFW (permitir desde cualquier IP)
sudo ufw allow 22/tcp
sudo ufw allow 4800/tcp
sudo ufw allow 4802/tcp
sudo ufw allow 8550/tcp
sudo ufw allow 9000/tcp
sudo ufw allow 3005/tcp
sudo ufw allow 5432/tcp
sudo ufw enable
```

## Estructura
```
./docker-compose.yml
./Dockerfile.backend
./Dockerfile.frontend
./Dockerfile.documentos
./postgres/init/01-pg_hba.sh
./keys/ (claves JWT: jwt_public.pem y jwt_private.pem)
```

## Variables de entorno (aplicadas en el compose)
- Frontend/CORS: `FRONTEND_URLS=http://10.3.0.243:8550`, `CORS_ORIGIN=http://10.3.0.243:8550`
- Backends (en frontend build args): `VITE_API_URL=http://10.3.0.243:4800`, `VITE_DOCUMENTOS_API_URL=http://10.3.0.243:4802`, `VITE_DOCUMENTOS_WS_URL=http://10.3.0.243:4802`
- MinIO: `MINIO_PUBLIC_BASE_URL=http://10.3.0.243:9000`, `MINIO_INTERNAL_BASE_URL=http://10.3.0.243:9000`, `MINIO_ENDPOINT=10.3.0.243:9000`
- Flowise: `FLOWISE_ENDPOINT=http://10.3.0.243:3005/api/v1/extract`

## Despliegue
```bash
cd deploy/stack-ip-10.3.0.243

# Las claves JWT ya están en keys/ (copiadas de stack-ip-192.168.15.136)

# Construir imágenes locales
docker compose build

# Levantar servicios
docker compose up -d
```

## Post-instalación
### Migraciones Prisma
Ejecutar migraciones para backend y documentos (una vez que Postgres esté arriba):
```bash
# Dentro del repo en el host
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/prisma/schema.prisma
```

### Verificación de salud
- Backend: `curl http://10.3.0.243:4800/health`
- Documentos: `curl http://10.3.0.243:4802/health`
- MinIO: `curl http://10.3.0.243:9000/minio/health/ready`
- Flowise: `curl http://10.3.0.243:3005/`

### Accesos
- Frontend: `http://10.3.0.243:8550`
- API Core: `http://10.3.0.243:4800`
- Documentos: `http://10.3.0.243:4802`
- MinIO (web/API): `http://10.3.0.243:9000`
- Flowise: `http://10.3.0.243:3005`
- Postgres externo: `postgresql://evo:phoenix@10.3.0.243:5432/monorepo-bca`

## Dimensionamiento y notas
- MinIO volumen: ~650 GB; Postgres: ~120 GB; resto: sistema/logs.
- Documentos usa stream inline para previews; evita CORS/firma presignada en iframes.
- `DOCS_MAX_DEPRECATED_VERSIONS=5` alinea retención de copias.
- Ajustá `PDF_RASTERIZE_MAX_CONCURRENCY` según carga; valor inicial 8.

## Mantenimiento
- Logs: `docker compose logs -f <servicio>`
- Health: ver sección verificación
- Escalado (CPU/mem): editar `deploy.resources` en `docker-compose.yml` y recrear el servicio.

## Diferencias con 10.8.10.20
- IP actualizada de `10.8.10.20` a `10.3.0.243` en todas las configuraciones
- CORS en documentos simplificado (solo localhost y nueva IP)
- Mismas claves JWT, credenciales y configuraciones de recursos

## Comandos útiles para despliegue remoto
```bash
# Desde máquina local, copiar todo el stack al servidor
scp -r deploy/stack-ip-10.3.0.243 administrador@10.3.0.243:~/

# Conectarse al servidor
ssh administrador@10.3.0.243

# En el servidor, ejecutar despliegue
cd ~/stack-ip-10.3.0.243
docker compose build
docker compose up -d

# Verificar estado
docker compose ps
docker compose logs -f
```

