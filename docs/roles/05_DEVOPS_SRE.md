# Guía del DevOps/Back (SSR)

> **Rol según Manual Operativo Microsyst**: Mantiene CI/CD (GitHub Actions), despliegues y secretos. Administra Docker, docker-compose, Nginx Proxy Manager, Portainer. Configura Sentry, Uptime Kuma, backups y prueba restore mensual. Cuida seguridad básica (SSH por llave, ufw, fail2ban) y acceso a servidores.

## 1. Características del Rol

### Perfil
- **Responsabilidad**: Infraestructura, CI/CD, monitoreo, disponibilidad, rendimiento, seguridad básica y backups
- **Nivel**: Semi-Senior a Senior
- **Autoridad**: Acceso root a servidores, control de deploys, gestión de secretos y backups
- **Alcance**: Todos los ambientes (DEV, STAGING, PRODUCCIÓN)

### Competencias Clave
- ✅ Administración de servidores Linux (Ubuntu/Debian)
- ✅ Docker y Docker Swarm / Docker Compose
- ✅ CI/CD (GitHub Actions)
- ✅ Scripting (Bash, Python)
- ✅ Networking (DNS, reverse proxy con Nginx Proxy Manager)
- ✅ Bases de datos (PostgreSQL, Redis)
- ✅ Seguridad básica (SSH keys, ufw, fail2ban, SSL/TLS)
- ✅ Monitoreo (Sentry, Uptime Kuma, logs)
- ✅ Backups y restore

### Responsabilidades Core (Manual Operativo)
1. **CI/CD**: Mantiene GitHub Actions workflows (ci.yml, deploy-dev.yml, deploy-staging.yml, deploy-prod.yml)
2. **Despliegues**: Ejecuta deploys a Staging (miércoles 11:00) y Producción (jueves 11:00 con aprobación de Lead)
3. **Infraestructura**: Administra Docker, docker-compose, Nginx Proxy Manager, Portainer (opcional)
4. **Monitoreo**: Configura Sentry (errores) y Uptime Kuma (health checks)
5. **Backups**: Backups diarios automáticos + prueba de restore mensual documentada
6. **Seguridad**: SSH por llave, ufw activo, fail2ban, secretos en GitHub Secrets
7. **Secretos**: Gestión segura (GitHub Secrets + gestor 1Password/Bitwarden)

### Cadencia de Deploys
- **Miércoles 11:00**: Deploy a Staging (manual workflow)
- **Jueves 11:00**: Deploy a Producción (si Staging estable + aprobación Lead)
- **Validación Post-Deploy**: 30 min monitoreo Sentry sin errores nuevos

---

## 2. Responsabilidades Principales

### 2.1 Gestión de Infraestructura

#### Arquitectura Actual

```
Internet
   │
   ├─→ Nginx Proxy Manager (192.168.15.60:81)
   │     │
   │     ├─→ frontend.monorepo-bca.com → VM 192.168.15.136:8550
   │     ├─→ api.monorepo-bca.com → VM 192.168.15.136:4800
   │     └─→ docs.monorepo-bca.com → VM 192.168.15.136:4900
   │
   └─→ VM Producción (192.168.15.136)
         │
         ├─→ Docker Swarm Stack
         │     ├─ backend (4800)
         │     ├─ frontend (8550)
         │     ├─ documentos (4900)
         │     ├─ postgres (5432)
         │     ├─ redis (6379)
         │     ├─ minio (9000, 9001)
         │     └─ flowise (3000)
         │
         └─→ Volumes Persistentes
               ├─ postgres_data
               ├─ redis_data
               ├─ minio_data
               └─ flowise_data
```

#### Paso 1: Acceso a Servidores

**Credenciales**: Ver documento `/docs/Accesos a plataforma`

```bash
# Servidor de Producción
ssh administrador@192.168.15.136

# Servidor de DEV (si existe separado)
ssh administrador@dev.monorepo-bca.com

# Copiar archivo a servidor
scp archivo.tar.gz administrador@192.168.15.136:/home/administrador/

# Copiar archivo desde servidor
scp administrador@192.168.15.136:/var/log/app.log ./
```

**Configurar SSH keys (primera vez)**:
```bash
# En tu máquina local
ssh-keygen -t ed25519 -C "devops@monorepo-bca.com"

# Copiar key al servidor
ssh-copy-id administrador@192.168.15.136

# Verificar que funciona sin password
ssh administrador@192.168.15.136
```

#### Paso 2: Gestión de Docker Swarm

**Comandos esenciales**:

```bash
# Ver estado del swarm
docker node ls

# Ver servicios activos
docker service ls

# Ver detalles de un servicio
docker service ps monorepo-bca_backend

# Ver logs de un servicio
docker service logs monorepo-bca_backend --tail 100 --follow

# Ver logs de un contenedor específico
docker logs <container_id> --tail 100 --follow

# Escalar servicio
docker service scale monorepo-bca_backend=3

# Actualizar servicio (force restart)
docker service update --force monorepo-bca_backend

# Inspeccionar servicio (ver configuración)
docker service inspect monorepo-bca_backend --pretty
```

**Gestión de stacks**:

```bash
# Ubicación del stack
cd /home/administrador/monorepo-bca/deploy/stack-ip-192.168.15.136

# Desplegar/actualizar stack
docker stack deploy -c docker-compose.yml monorepo-bca

# Ver estado del stack
docker stack ps monorepo-bca

# Ver servicios del stack
docker stack services monorepo-bca

# Eliminar stack (⚠️ CUIDADO)
docker stack rm monorepo-bca

# Esperar a que todos los servicios estén UP
watch -n 2 'docker stack ps monorepo-bca'
```

#### Paso 3: Gestión de Volúmenes y Backups

**Backup de PostgreSQL**:

```bash
# Backup manual
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_dump -U postgres monorepo-bca > /backup/monorepo-bca-$(date +%Y%m%d-%H%M%S).sql

# Backup con compresión
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_dump -U postgres monorepo-bca | gzip > /backup/monorepo-bca-$(date +%Y%m%d-%H%M%S).sql.gz

# Restaurar backup
gunzip < /backup/monorepo-bca-20250115-143000.sql.gz | \
  docker exec -i $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres monorepo-bca
```

**Script automatizado de backup** (`/home/administrador/scripts/backup.sh`):

```bash
#!/bin/bash
# Backup automatizado de PostgreSQL y MinIO

set -e

BACKUP_DIR="/backup/monorepo-bca"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de PostgreSQL
echo "[$(date)] Iniciando backup de PostgreSQL..."
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_dump -U postgres monorepo-bca | gzip > "$BACKUP_DIR/postgres-$DATE.sql.gz"

# Backup de MinIO (documentos)
echo "[$(date)] Iniciando backup de MinIO..."
docker run --rm \
  --network monorepo-bca_default \
  -v $BACKUP_DIR:/backup \
  -e MC_HOST_minio=http://minio:minio123@minio:9000 \
  minio/mc mirror minio/documents /backup/minio-$DATE

# Backup de Redis (opcional, datos volátiles)
# echo "[$(date)] Iniciando backup de Redis..."
# docker exec $(docker ps -q -f name=monorepo-bca_redis) \
#   redis-cli BGSAVE

# Limpiar backups antiguos
echo "[$(date)] Limpiando backups > $RETENTION_DAYS días..."
find $BACKUP_DIR -name "postgres-*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "minio-*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "[$(date)] Backup completado exitosamente"

# Enviar notificación (opcional)
# curl -X POST https://slack.com/api/chat.postMessage \
#   -H "Authorization: Bearer $SLACK_TOKEN" \
#   -d '{"channel":"#devops","text":"✅ Backup completado"}'
```

**Configurar cron para backup automático**:

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2:00 AM)
0 2 * * * /home/administrador/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

### 2.2 CI/CD Pipeline

#### GitHub Actions Workflows

**Ubicación**: `.github/workflows/`

**Workflows principales**:
1. `monorepo-ci.yml` - Lint, test, build en cada push
2. `deploy-staging.yml` - Deploy automático a staging en merge a `main`
3. `deploy-prod.yml` - Deploy manual a producción (workflow_dispatch)

#### Configuración de Secrets

**En GitHub**: `Settings` → `Secrets and variables` → `Actions`

**Secrets requeridos**:

```yaml
# SSH
SSH_PRIVATE_KEY        # Clave privada para acceder a servidor
SSH_HOST               # 192.168.15.136
SSH_USER               # administrador

# Docker Registry (si usas registry privado)
DOCKER_USERNAME        # Usuario de Docker Hub
DOCKER_PASSWORD        # Token de Docker Hub

# Base de datos
DATABASE_URL           # URL de conexión a PostgreSQL

# JWT
JWT_PRIVATE_KEY        # Clave privada RS256
JWT_PUBLIC_KEY         # Clave pública RS256

# Notificaciones
SLACK_WEBHOOK_URL      # Webhook de Slack para notificaciones
```

**Comandos útiles**:

```bash
# Ver secrets configurados (no muestra valores)
gh secret list

# Setear un secret
gh secret set SSH_PRIVATE_KEY < ~/.ssh/id_ed25519

# Eliminar un secret
gh secret delete SSH_PRIVATE_KEY
```

#### Monitoreo de Pipelines

```bash
# Ver últimas ejecuciones
gh run list

# Ver detalles de una ejecución
gh run view <run_id>

# Ver logs de una ejecución
gh run view <run_id> --log

# Re-ejecutar workflow fallido
gh run rerun <run_id>
```

---

### 2.3 Deployment

#### Procedimiento de Deploy a Staging

**Automático**: Se ejecuta al hacer merge a `main`

**Manual (si falla el automático)**:

```bash
# 1. Conectar al servidor
ssh administrador@192.168.15.136

# 2. Ir al directorio del proyecto
cd /home/administrador/monorepo-bca

# 3. Pull del código
git checkout main
git pull origin main

# 4. Build de imágenes Docker
docker-compose -f deploy/stack-ip-192.168.15.136/docker-compose.yml build

# 5. Deploy del stack
docker stack deploy -c deploy/stack-ip-192.168.15.136/docker-compose.yml monorepo-bca

# 6. Verificar que servicios levanten
watch -n 2 'docker stack ps monorepo-bca | grep -v Shutdown'

# 7. Verificar logs
docker service logs monorepo-bca_backend --tail 50
docker service logs monorepo-bca_frontend --tail 50
docker service logs monorepo-bca_documentos --tail 50

# 8. Health check
curl https://api.monorepo-bca.com/health
```

#### Procedimiento de Deploy a Producción

**Checklist pre-deploy**:

```markdown
## Pre-Deploy Checklist - Producción

### Validaciones
- [ ] Smoke test en STAGING pasó (aprobado por QA)
- [ ] Suite de regresión completa ejecutada (aprobado por QA)
- [ ] Code review completo (2+ aprobaciones)
- [ ] Product Owner aprobó release
- [ ] No hay bugs críticos abiertos
- [ ] Documentación actualizada

### Infraestructura
- [ ] Backup de BD tomado (< 1 hora de antigüedad)
- [ ] Espacio en disco suficiente (> 20% libre)
- [ ] CPU y memoria en niveles normales (< 70%)
- [ ] No hay incidentes activos
- [ ] Logs recientes sin errores críticos

### Comunicación
- [ ] Equipo notificado en #deployments
- [ ] Usuario técnico de guardia identificado
- [ ] Window de deploy confirmado (horario bajo tráfico)
- [ ] Rollback plan revisado

### Migraciones de BD
- [ ] Scripts de migración testeados en staging
- [ ] Migraciones son backward compatible
- [ ] Plan de rollback de BD documentado

### Feature Flags (si aplica)
- [ ] Features nuevas con flags desactivados por default
- [ ] Plan de activación gradual documentado
```

**Procedimiento**:

```bash
# 1. Notificar inicio de deploy
# Mensaje en Slack #deployments:
"🚀 **Deploy a Producción - INICIO**
- Sprint: 12
- Fecha: 2025-01-15 22:00 UTC-3
- Responsable: @devops
- ETA: 15 minutos
- Cambios: [link a release notes]"

# 2. Conectar al servidor
ssh administrador@192.168.15.136

# 3. Backup de seguridad
/home/administrador/scripts/backup.sh

# 4. Verificar versión actual (para rollback)
cd /home/administrador/monorepo-bca
git log --oneline -1 > /tmp/version-pre-deploy.txt
docker service ls | grep monorepo-bca >> /tmp/version-pre-deploy.txt

# 5. Pull del código de producción
git fetch origin
git checkout main
git pull origin main

# 6. Verificar que estás en el commit correcto
git log --oneline -5
# Confirmar con Tech Lead si hay dudas

# 7. Build de imágenes (con tag de versión)
export VERSION=$(git rev-parse --short HEAD)
docker-compose -f deploy/stack-ip-192.168.15.136/docker-compose.yml build \
  --build-arg VERSION=$VERSION

# 8. Ejecutar migraciones de BD (si hay)
# Ver sección "Migraciones de BD" más abajo

# 9. Deploy del stack (rolling update)
docker stack deploy -c deploy/stack-ip-192.168.15.136/docker-compose.yml monorepo-bca

# 10. Monitorear rolling update
watch -n 2 'docker stack ps monorepo-bca --filter "desired-state=running"'

# Esperar hasta que todos los servicios estén en "Running" (no "Starting")

# 11. Verificar logs de cada servicio
docker service logs monorepo-bca_backend --tail 100 | grep -i error
docker service logs monorepo-bca_frontend --tail 100 | grep -i error
docker service logs monorepo-bca_documentos --tail 100 | grep -i error

# 12. Health checks
curl https://api.monorepo-bca.com/health
curl https://api.monorepo-bca.com/api/docs/health
curl https://monorepo-bca.com  # Verificar que carga el frontend

# 13. Smoke test manual
# - Login con usuario de prueba
# - Crear una orden (sin confirmar)
# - Ver dashboard
# - Verificar consola sin errores

# 14. Verificar métricas
# - Sentry: sin errores nuevos
# - Logs: sin errores críticos en últimos 5 min

# 15. Notificar éxito
# Mensaje en Slack #deployments:
"✅ **Deploy a Producción - COMPLETADO**
- Duración: 12 minutos
- Versión: abc123f
- Servicios: Todos UP
- Health checks: ✅ PASS
- Smoke test: ✅ PASS

Monitoreo activo por próximas 2 horas.
Cualquier issue reportar a @devops inmediatamente."
```

#### Migraciones de Base de Datos

**Estrategia**: Migraciones "expand-contract" (backward compatible)

```bash
# 1. Generar migración (en local, por desarrollador)
cd apps/backend
npx prisma migrate dev --name add_email_field_to_users

# 2. Revisar migración generada
cat prisma/migrations/20250115_add_email_field/migration.sql

# 3. Testear en DEV
npx prisma migrate deploy

# 4. Testear en STAGING
ssh staging
cd /home/administrador/monorepo-bca/apps/backend
npx prisma migrate deploy

# 5. Ejecutar en PRODUCCIÓN (durante deploy)
ssh produccion
cd /home/administrador/monorepo-bca/apps/backend

# Backup de BD antes de migrar
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_dump -U postgres monorepo-bca > /backup/pre-migration-$(date +%Y%m%d-%H%M%S).sql

# Ejecutar migración
npx prisma migrate deploy

# Verificar que aplicó correctamente
npx prisma migrate status

# Si falla, rollback
# psql -U postgres -d monorepo-bca < /backup/pre-migration-20250115-220000.sql
```

**Ejemplo de migración backward compatible**:

```sql
-- ❌ MAL - Rompe versión anterior del código
ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;

-- ✅ BIEN - Fase 1: Agregar columna nullable
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Deploy nuevo código que usa email (pero no requiere)

-- ✅ BIEN - Fase 2 (próximo deploy): Hacer NOT NULL
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
```

---

### 2.4 Rollback

#### Cuándo hacer Rollback

**Criterios automáticos**:
- ❌ Health check falla después de 5 minutos
- ❌ Error rate > 5% en últimos 10 minutos
- ❌ Latencia promedio > 3x normal
- ❌ Servicio crítico no levanta

**Criterios manuales**:
- ❌ QA reporta bug crítico en validación post-deploy
- ❌ Usuarios reportan funcionalidad principal rota
- ❌ Tech Lead solicita rollback

#### Procedimiento de Rollback

**Opción A: Rollback de código (sin cambios en BD)**

```bash
# 1. Notificar
# Slack #deployments:
"⚠️ **ROLLBACK en progreso**
- Motivo: [descripción breve]
- Responsable: @devops
- ETA: 5 minutos"

# 2. Identificar versión anterior
cd /home/administrador/monorepo-bca
git log --oneline -10

# O usar el backup de pre-deploy
cat /tmp/version-pre-deploy.txt

# 3. Checkout a versión anterior
git checkout <hash_anterior>

# Ejemplo:
git checkout a1b2c3d

# 4. Re-deploy stack con versión anterior
docker stack deploy -c deploy/stack-ip-192.168.15.136/docker-compose.yml monorepo-bca

# 5. Verificar
watch -n 2 'docker stack ps monorepo-bca --filter "desired-state=running"'

# 6. Health checks
curl https://api.monorepo-bca.com/health
curl https://monorepo-bca.com

# 7. Verificar logs
docker service logs monorepo-bca_backend --tail 50

# 8. Notificar éxito
# Slack #deployments:
"✅ **ROLLBACK completado**
- Versión restaurada: a1b2c3d
- Servicios: Todos UP
- Health checks: ✅ PASS

Sistema operativo normalmente.
Postmortem en 2 horas."
```

**Opción B: Rollback con cambios en BD (complejo)**

```bash
# ⚠️ MUY PELIGROSO - Solo si es absolutamente necesario

# 1. Detener aplicaciones que escriben a BD
docker service scale monorepo-bca_backend=0
docker service scale monorepo-bca_documentos=0

# 2. Backup de BD actual (por si el rollback falla)
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_dump -U postgres monorepo-bca > /backup/pre-rollback-$(date +%Y%m%d-%H%M%S).sql

# 3. Restaurar BD a versión anterior
gunzip < /backup/pre-migration-20250115-220000.sql.gz | \
  docker exec -i $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres monorepo-bca

# 4. Rollback de código
git checkout <hash_anterior>
docker stack deploy -c deploy/stack-ip-192.168.15.136/docker-compose.yml monorepo-bca

# 5. Escalar servicios de nuevo
docker service scale monorepo-bca_backend=2
docker service scale monorepo-bca_documentos=1

# 6. Verificar exhaustivamente
# - Health checks
# - Smoke test manual
# - Verificar datos en BD

# 7. Comunicar
# ⚠️ IMPORTANTE: Datos creados entre deploy fallido y rollback se PERDIERON
# Coordinar con equipo para recuperar si es posible
```

---

### 2.5 Monitoreo y Observabilidad

#### Logs

**Ubicaciones**:

```bash
# Logs de servicios Docker
docker service logs monorepo-bca_backend --tail 100 --follow

# Logs de Nginx
docker exec $(docker ps -q -f name=nginx-proxy-manager) \
  tail -f /var/log/nginx/access.log

# Logs del sistema
sudo tail -f /var/log/syslog

# Logs de cron (backups)
tail -f /var/log/backup.log
```

**Agregación de logs** (si usas ELK/Loki):

```yaml
# Ejemplo: docker-compose con logging a Loki
services:
  backend:
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
```

#### Métricas

**Health endpoints**:

```bash
# Backend
curl https://api.monorepo-bca.com/health
# Esperado: {"status":"ok","timestamp":"2025-01-15T22:00:00Z"}

# Documentos
curl https://api.monorepo-bca.com/api/docs/health
# Esperado: {"status":"ok",...}

# Base de datos
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  pg_isready -U postgres
# Esperado: /var/run/postgresql:5432 - accepting connections
```

**Monitoreo de recursos**:

```bash
# CPU y memoria por servicio
docker stats

# Disco
df -h

# Inodes (a veces se agotan antes que el espacio)
df -i

# Verificar conexiones activas a BD
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Alertas

**Setup básico con healthcheck + cron**:

```bash
# Script: /home/administrador/scripts/healthcheck.sh
#!/bin/bash

HEALTH_URL="https://api.monorepo-bca.com/health"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Verificar endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $HTTP_CODE -ne 200 ]; then
  # Enviar alerta a Slack
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"🔴 ALERT: Health check failed. HTTP $HTTP_CODE\"}"
  
  # Log
  echo "[$(date)] Health check failed: HTTP $HTTP_CODE" >> /var/log/healthcheck.log
fi
```

```bash
# Cron: Cada 5 minutos
*/5 * * * * /home/administrador/scripts/healthcheck.sh
```

**Setup avanzado**: Usar herramientas como:
- **Prometheus + Grafana**: Métricas y dashboards
- **Sentry**: Error tracking
- **UptimeRobot**: Monitoreo externo
- **PagerDuty**: Alertas con escalación

---

### 2.6 Seguridad

#### SSL/TLS

**Configuración en Nginx Proxy Manager**:

1. Acceder a https://192.168.15.60:81
2. `Proxy Hosts` → Editar host
3. `SSL` tab → `Request a new SSL Certificate`
4. Seleccionar `Force SSL` y `HTTP/2 Support`
5. Let's Encrypt se renueva automáticamente

**Verificar certificado**:

```bash
# Verificar fecha de expiración
echo | openssl s_client -connect monorepo-bca.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Verificar cadena de certificados
openssl s_client -connect monorepo-bca.com:443 -showcerts
```

#### Secrets Management

**Variables de entorno sensibles**:

```bash
# NUNCA hardcodear en docker-compose.yml:
# ❌ MAL
environment:
  JWT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nMIIE..."

# ✅ BIEN - Usar Docker secrets
secrets:
  jwt_private_key:
    file: ./secrets/jwt_private_key.txt

services:
  backend:
    secrets:
      - jwt_private_key
    environment:
      JWT_PRIVATE_KEY_FILE: /run/secrets/jwt_private_key
```

**Rotación de secretos**:

```bash
# 1. Generar nuevo par de keys JWT
openssl genrsa -out jwt_private_new.pem 4096
openssl rsa -in jwt_private_new.pem -pubout -out jwt_public_new.pem

# 2. Actualizar en servidor (durante ventana de mantenimiento)
# Ambos keys válidos temporalmente (período de gracia)

# 3. Deploy con ambos keys
# Aplicación valida tokens con key nueva y vieja

# 4. Después de 7 días, remover key vieja
# (Todos los tokens viejos ya expiraron)
```

#### Firewall

```bash
# Verificar reglas actuales
sudo ufw status

# Reglas típicas:
# - SSH (22): Solo desde IPs de oficina/VPN
# - HTTP/HTTPS (80, 443): Desde cualquier IP
# - PostgreSQL (5432): Solo localhost
# - Redis (6379): Solo localhost

# Agregar regla
sudo ufw allow from 192.168.0.0/16 to any port 22

# Eliminar regla
sudo ufw delete allow 22
```

#### Auditoría

```bash
# Registro de accesos SSH
sudo tail -f /var/log/auth.log

# Comandos ejecutados (si tienes auditd)
sudo ausearch -k docker_commands

# Cambios en archivos críticos
sudo tail -f /var/log/audit/audit.log | grep /etc/
```

---

## 3. Procedimientos de Emergencia

### 3.1 Servidor No Responde

```markdown
## Procedimiento de Recuperación

### Paso 1: Diagnóstico Inicial (2 minutos)
```bash
# ¿Está el servidor online?
ping 192.168.15.136

# ¿SSH funciona?
ssh administrador@192.168.15.136

# Si SSH no responde:
# - Ir físicamente al servidor
# - O reiniciar desde panel de hosting
```

### Paso 2: Verificar Servicios (5 minutos)
```bash
# Una vez dentro:

# ¿Docker está corriendo?
sudo systemctl status docker

# Si no:
sudo systemctl start docker

# ¿Swarm está activo?
docker node ls

# Si no:
docker swarm init

# ¿Stack está desplegado?
docker stack ls

# Si no:
cd /home/administrador/monorepo-bca/deploy/stack-ip-192.168.15.136
docker stack deploy -c docker-compose.yml monorepo-bca
```

### Paso 3: Verificar Recursos (3 minutos)
```bash
# Disco lleno (causa #1 de caídas)
df -h
# Si > 95% lleno, limpiar:
docker system prune -af --volumes
sudo journalctl --vacuum-time=7d

# Memoria
free -h
# Si OOM (Out of Memory), reiniciar servicios

# CPU
top
# Si un proceso consume 100%, investigar/matar
```

### Paso 4: Logs de Diagnóstico
```bash
# Logs del sistema
sudo dmesg | tail -50
sudo tail -f /var/log/syslog

# Logs de Docker
sudo journalctl -u docker --since "1 hour ago"

# Logs de servicios
docker service logs monorepo-bca_backend --tail 200
```

### Paso 5: Escalación
Si no puedes resolver en 15 minutos:
- Notificar a Tech Lead
- Documentar todo lo intentado
- Considerar failover a backup server (si existe)
```

### 3.2 Base de Datos Corrupta

```markdown
## Procedimiento de Recuperación de BD

### Escenario A: PostgreSQL no inicia
```bash
# 1. Ver logs
docker service logs monorepo-bca_postgres --tail 100

# 2. Verificar permisos
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  ls -la /var/lib/postgresql/data

# 3. Intentar reparación
docker exec -it $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -c "REINDEX DATABASE monorepo-bca;"

# 4. Si falla, restaurar desde backup
gunzip < /backup/monorepo-bca-LATEST.sql.gz | \
  docker exec -i $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres monorepo-bca
```

### Escenario B: Queries extremadamente lentas
```bash
# 1. Identificar queries lentas
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -d monorepo-bca -c "
    SELECT pid, now() - query_start AS duration, query 
    FROM pg_stat_activity 
    WHERE state = 'active' AND now() - query_start > interval '5 seconds'
    ORDER BY duration DESC;
  "

# 2. Matar query problemática (si es necesario)
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -c "SELECT pg_terminate_backend(<pid>);"

# 3. Verificar índices faltantes
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -d monorepo-bca -c "
    SELECT schemaname, tablename, indexname 
    FROM pg_indexes 
    WHERE tablename = 'orders';
  "

# 4. Crear índice faltante (coordinar con Tech Lead)
# CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Escenario C: Datos inconsistentes
```bash
# 1. Verificar integridad referencial
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -d monorepo-bca -c "
    SELECT conname, conrelid::regclass, confrelid::regclass 
    FROM pg_constraint 
    WHERE contype = 'f';
  "

# 2. Buscar registros huérfanos
docker exec $(docker ps -q -f name=monorepo-bca_postgres) \
  psql -U postgres -d monorepo-bca -c "
    SELECT o.id 
    FROM orders o 
    LEFT JOIN clients c ON o.client_id = c.id 
    WHERE c.id IS NULL;
  "

# 3. Coordinar con Tech Lead para limpieza de datos
```
```

### 3.3 Certificado SSL Expirado

```markdown
## Procedimiento

### Síntomas
- Navegador muestra "Tu conexión no es privada"
- API retorna SSL errors
- Let's Encrypt no renovó automáticamente

### Solución
```bash
# 1. Verificar expiración
echo | openssl s_client -connect monorepo-bca.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# 2. Renovar manualmente en Nginx Proxy Manager
# - Acceder a https://192.168.15.60:81
# - Proxy Hosts → Editar → SSL tab
# - "Force Renew" en certificado

# 3. Si falla, verificar DNS
nslookup monorepo-bca.com
# Debe apuntar a IP pública correcta

# 4. Verificar que puerto 80 está abierto (Let's Encrypt lo necesita)
sudo ufw status | grep 80

# 5. Si todo falla, obtener certificado manual
sudo certbot certonly --standalone -d monorepo-bca.com
# Y configurar en Nginx Proxy Manager manualmente
```
```

---

## 4. Mantenimiento Preventivo

### Checklist Semanal

```markdown
- [ ] Revisar logs de errores (última semana)
- [ ] Verificar espacio en disco (> 20% libre)
- [ ] Verificar backups automáticos (último backup < 24h)
- [ ] Revisar uso de CPU/RAM (< 70% promedio)
- [ ] Actualizar paquetes de seguridad del SO
- [ ] Verificar certificados SSL (> 30 días para expirar)
- [ ] Limpiar imágenes Docker viejas (`docker system prune`)
```

### Checklist Mensual

```markdown
- [ ] Actualizar versiones de Docker
- [ ] Revisar y limpiar logs viejos (> 30 días)
- [ ] Testear procedimiento de restauración de backup
- [ ] Revisar y actualizar documentación
- [ ] Rotar secrets/passwords según política
- [ ] Auditar usuarios con acceso SSH
- [ ] Verificar que alertas funcionan (enviar test)
```

### Checklist Trimestral

```markdown
- [ ] Disaster recovery drill (simular caída completa)
- [ ] Revisar y actualizar runbooks
- [ ] Capacitación de equipo en procedimientos
- [ ] Evaluar necesidad de escalar recursos
- [ ] Revisión de seguridad completa (penetration testing)
- [ ] Actualizar inventario de infraestructura
```

---

## 5. Herramientas Esenciales

### Scripts de Utilidad

```bash
# ~/scripts/quick-status.sh
#!/bin/bash
# Resumen rápido del estado del sistema

echo "=== SISTEMA ==="
uptime
df -h / | tail -1
free -h | grep Mem

echo -e "\n=== DOCKER SERVICES ==="
docker service ls

echo -e "\n=== HEALTH CHECKS ==="
curl -s https://api.monorepo-bca.com/health | jq
curl -s https://api.monorepo-bca.com/api/docs/health | jq

echo -e "\n=== ÚLTIMOS ERRORES ==="
docker service logs monorepo-bca_backend --tail 10 | grep -i error
```

### Dashboards Recomendados

**Portainer** (GUI para Docker):
```yaml
# Agregar a docker-compose.yml
portainer:
  image: portainer/portainer-ce:latest
  ports:
    - "9443:9443"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - portainer_data:/data
```

**Grafana + Prometheus** (métricas):
- Ver `/docs/MONITORING_SETUP.md` (crear si no existe)

---

**Recuerda**: Tu responsabilidad es la **disponibilidad**, **performance** y **seguridad** del sistema. Automatiza todo lo que puedas, documenta todo lo que hagas, y nunca hagas cambios en producción sin backup.

