# Runbook de Migracion - IPLAN Production

## Resumen

- **Origen de datos**: Produccion actual (10.8.10.20)
- **Origen de codigo**: Branch `main` en GitHub (misma version que staging 10.3.0.243)
- **Destino**: 3 VMs IPLAN (10.8.10.120, 10.8.10.121, 10.8.10.122)
- **Downtime estimado**: 10-15 minutos (solo en cutover final)

**ATENCION**: Los schemas de produccion y staging son diferentes. El codigo en `main` espera el schema de staging. Al restaurar datos de produccion, se deben aplicar migraciones Prisma.

---

## Copiar JWT keys de produccion

Se usan las mismas claves JWT de produccion actual para que los tokens existentes sigan funcionando tras el cutover.

```bash
# Desde esta maquina (tiene acceso SSH a 10.8.10.20)
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20 \
  'cat ~/monorepo-bca/keys/jwt_private.pem' \
  > deploy/stack-iplan/vm1/keys/jwt_private.pem

ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20 \
  'cat ~/monorepo-bca/keys/jwt_public.pem' \
  > deploy/stack-iplan/vm1/keys/jwt_public.pem

# Verificar
openssl rsa -in deploy/stack-iplan/vm1/keys/jwt_private.pem -check -noout
# Esperado: RSA key ok

# Proteger permisos
chmod 600 deploy/stack-iplan/vm1/keys/jwt_private.pem
chmod 644 deploy/stack-iplan/vm1/keys/jwt_public.pem
```

---

## Exportar e importar Flowise flows

Los flow IDs de Flowise son necesarios para la validacion AI de documentos y remitos. Hay que exportarlos de la instancia actual e importarlos en la nueva.

### Exportar desde produccion (10.8.10.20:3005)

```bash
# Listar chatflows disponibles
curl -s -u admin:change-me http://10.8.10.20:3005/api/v1/chatflows | python3 -m json.tool

# Exportar un flow especifico (reemplazar FLOW_ID)
curl -s -u admin:change-me http://10.8.10.20:3005/api/v1/chatflows/FLOW_ID \
  > /tmp/flowise_flow_docs.json

# Repetir para el flow de remitos
curl -s -u admin:change-me http://10.8.10.20:3005/api/v1/chatflows/FLOW_ID_REMITOS \
  > /tmp/flowise_flow_remitos.json
```

### Importar en IPLAN (despues de levantar Flowise en VM1)

```bash
# Importar flow de documentos
curl -s -X POST \
  -u admin:OgBGdEtT7n8MCClPzh9MUuJ9 \
  -H "Content-Type: application/json" \
  -d @/tmp/flowise_flow_docs.json \
  http://10.8.10.120:3005/api/v1/chatflows

# Importar flow de remitos
curl -s -X POST \
  -u admin:OgBGdEtT7n8MCClPzh9MUuJ9 \
  -H "Content-Type: application/json" \
  -d @/tmp/flowise_flow_remitos.json \
  http://10.8.10.120:3005/api/v1/chatflows
```

Anotar los nuevos flow IDs y actualizar en `vm1/.env`:
- `FLOWISE_DOCS_FLOW_ID=<nuevo-id>`
- `FLOWISE_REMITOS_FLOW_ID=<nuevo-id>`

Reiniciar documentos y remitos para que tomen los nuevos IDs:

```bash
cd ~/bca-deploy
docker compose restart documentos remitos
```

---

## Pre-requisitos

- [ ] 3 VMs Ubuntu 24.04 creadas y accesibles por SSH
- [ ] Docker y Docker Compose v2 instalados (via `setup-vm.sh`)
- [ ] UFW configurado en las 3 VMs
- [ ] Claves SSH copiadas para acceso entre VMs
- [ ] Claves JWT generadas y copiadas a `vm1/keys/`
- [ ] Archivos `.env` creados en cada VM (a partir de `.env.example`)
- [ ] Passwords fuertes generados para todos los servicios
- [ ] Acceso al NPM (10.8.10.49:81)
- [ ] `mc` (MinIO Client) instalado en la maquina de migracion

---

## Fase 1: Provisioning (sin downtime)

### 1.1 Setup de VMs

```bash
# En cada VM (como root)
scp deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.120:/tmp/
ssh administrador@10.8.10.120 'sudo bash /tmp/setup-vm.sh vm1'

scp deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.121:/tmp/
ssh administrador@10.8.10.121 'sudo bash /tmp/setup-vm.sh vm2'

scp deploy/stack-iplan/scripts/setup-vm.sh administrador@10.8.10.122:/tmp/
ssh administrador@10.8.10.122 'sudo bash /tmp/setup-vm.sh vm3'
```

### 1.2 Copiar archivos de deploy

```bash
# Desde la maquina de desarrollo
rsync -avz deploy/stack-iplan/vm1/ administrador@10.8.10.120:~/bca-deploy/
rsync -avz deploy/stack-iplan/vm2/ administrador@10.8.10.121:~/bca-deploy/
rsync -avz deploy/stack-iplan/vm3/ administrador@10.8.10.122:~/bca-deploy/
```

### 1.3 Levantar VM2 (Data Layer)

```bash
ssh administrador@10.8.10.121
cd ~/bca-deploy
cp .env.example .env
# Editar .env con passwords reales

docker compose up -d
docker compose ps  # Verificar que postgres, redis, minio estan healthy
```

---

## Fase 2: Migracion de datos (sin downtime en produccion)

### 2.1 Auditoria de schemas (CRITICO)

Antes de migrar datos, comparar los schemas entre produccion y staging:

```bash
# Desde una maquina con acceso a ambas bases

# Listar tablas en produccion
psql -h 10.8.10.20 -U evo -d monorepo-bca -c "
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname IN ('platform', 'documentos', 'remitos')
  ORDER BY schemaname, tablename;"

# Listar tablas en staging
psql -h 10.3.0.243 -U evo -d monorepo-bca -c "
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname IN ('platform', 'documentos', 'remitos')
  ORDER BY schemaname, tablename;"

# Comparar columnas de cada tabla
# Ejemplo para una tabla especifica:
psql -h 10.8.10.20 -U evo -d monorepo-bca -c "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'platform' AND table_name = 'User'
  ORDER BY ordinal_position;"
```

Registrar las diferencias encontradas. Verificar:
- [ ] Columnas que existen en staging pero no en produccion (seran creadas por migrate)
- [ ] Columnas que existen en produccion pero no en staging (podrian perderse)
- [ ] Cambios de tipo de dato
- [ ] Tablas nuevas en staging
- [ ] Tablas eliminadas en staging

### 2.2 Listar migraciones pendientes

```bash
# Clonar el repo en una maquina temporal o usar staging
cd /home/administrador/monorepo-bca

# Backend (schema platform)
DATABASE_URL="postgresql://evo:phoenix@10.8.10.20:5432/monorepo-bca?schema=platform" \
  npx prisma migrate status --schema=apps/backend/prisma/schema.prisma

# Documentos (schema documentos)
DOCUMENTOS_DATABASE_URL="postgresql://evo:phoenix@10.8.10.20:5432/monorepo-bca?schema=documentos" \
  npx prisma migrate status --schema=apps/documentos/src/prisma/schema.prisma

# Remitos (schema remitos) - puede no existir en produccion
REMITOS_DATABASE_URL="postgresql://evo:phoenix@10.8.10.20:5432/monorepo-bca?schema=remitos" \
  npx prisma migrate status --schema=apps/remitos/src/prisma/schema.prisma
```

### 2.3 Dump de produccion

```bash
# Dump completo desde produccion actual
ssh administrador@10.8.10.20 \
  'docker exec bca_postgres pg_dump -U evo -d monorepo-bca --format=custom --compress=9' \
  > /tmp/prod_dump_$(date +%Y%m%d).dump

# Verificar el dump
pg_restore --list /tmp/prod_dump_$(date +%Y%m%d).dump | head -50
```

### 2.4 Restore en VM2

```bash
# Copiar dump a VM2
scp /tmp/prod_dump_*.dump administrador@10.8.10.121:/tmp/

# Restore
ssh administrador@10.8.10.121
docker exec -i bca_postgres pg_restore \
  -U evo \
  -d monorepo-bca \
  --clean --if-exists \
  --no-owner \
  < /tmp/prod_dump_*.dump
```

### 2.5 Aplicar migraciones Prisma

```bash
# En VM1 o desde cualquier maquina con acceso a VM2
cd /home/administrador/monorepo-bca

# Backend (schema platform)
DATABASE_URL="postgresql://bca_app:<password>@10.8.10.121:5432/monorepo-bca?schema=platform" \
  npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma

# Documentos (schema documentos)
DOCUMENTOS_DATABASE_URL="postgresql://bca_app:<password>@10.8.10.121:5432/monorepo-bca?schema=documentos" \
  npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma

# Remitos (schema remitos)
REMITOS_DATABASE_URL="postgresql://bca_app:<password>@10.8.10.121:5432/monorepo-bca?schema=remitos" \
  npx prisma migrate deploy --schema=apps/remitos/src/prisma/schema.prisma
```

### 2.6 Validacion post-migrate

```bash
psql -h 10.8.10.121 -U evo -d monorepo-bca << 'SQL'
-- Conteo de registros en tablas principales
SELECT 'platform.User' AS tabla, COUNT(*) FROM platform."User"
UNION ALL
SELECT 'platform.Empresa', COUNT(*) FROM platform."Empresa"
UNION ALL
SELECT 'platform.Equipo', COUNT(*) FROM platform."Equipo"
UNION ALL
SELECT 'platform.Chofer', COUNT(*) FROM platform."Chofer"
UNION ALL
SELECT 'documentos.Document', COUNT(*) FROM documentos."Document"
UNION ALL
SELECT 'documentos.DocumentVersion', COUNT(*) FROM documentos."DocumentVersion";

-- Verificar que las migraciones se aplicaron
SELECT * FROM platform."_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
SELECT * FROM documentos."_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
SQL
```

Comparar los conteos con produccion actual para detectar perdida de datos.

### 2.7 Mirror de MinIO

```bash
# Configurar mc con produccion como source
mc alias set prod-minio http://10.8.10.20:9000 minioadmin minioadmin
mc alias set iplan-minio http://10.8.10.121:9000 <root-user> <root-password>

# Mirror completo
mc mirror --preserve prod-minio/ iplan-minio/

# Verificar
mc ls iplan-minio/
mc du iplan-minio/
```

---

## Fase 3: Levantar aplicaciones (sin downtime en produccion)

### 3.1 Clonar repositorio en VM1

```bash
ssh administrador@10.8.10.120
git clone https://github.com/<org>/monorepo-bca.git
cd monorepo-bca
git checkout main
```

### 3.2 Levantar VM1

```bash
cd ~/bca-deploy
cp .env.example .env
# Editar .env con passwords reales y flow IDs de Flowise

docker compose build
docker compose up -d
docker compose ps  # Verificar todos healthy
```

### 3.3 Levantar VM3

```bash
ssh administrador@10.8.10.122
cd ~/bca-deploy
cp .env.example .env
# Editar .env

docker compose up -d
docker compose ps
```

### 3.4 Crear proxy host en NPM

Seguir instrucciones de [NPM-PROXY-HOSTS.md](./NPM-PROXY-HOSTS.md) Fase 1.

### 3.5 Verificacion completa

```bash
# Health checks
curl -sf https://grupobca.microsyst.com.ar/health
curl -sf https://grupobca.microsyst.com.ar/api/health
curl -sf https://grupobca.microsyst.com.ar/api/docs-health

# Login de usuario (usar credenciales de produccion)
# Verificar en navegador: https://grupobca.microsyst.com.ar

# Upload de documento (verificar MinIO)
# WebSocket (verificar notificaciones en tiempo real)
# Remitos (upload + procesamiento)
```

---

## Fase 4: Cutover (10-15 min downtime)

### Pre-cutover checklist

- [ ] Testing completo en `grupobca.microsyst.com.ar` exitoso
- [ ] Backup reciente de produccion (< 24h)
- [ ] Equipo notificado de la ventana de mantenimiento
- [ ] Plan de rollback verificado

### Ejecutar cutover

```bash
# 1. Bloquear acceso a produccion vieja (opcional: poner en maintenance)
# Esto evita escrituras durante el delta sync

# 2. Dump delta final de produccion
ssh administrador@10.8.10.20 \
  'docker exec bca_postgres pg_dump -U evo -d monorepo-bca --format=custom --compress=9' \
  > /tmp/prod_dump_final.dump

# 3. Restore delta en VM2
scp /tmp/prod_dump_final.dump administrador@10.8.10.121:/tmp/
ssh administrador@10.8.10.121 \
  'docker exec -i bca_postgres pg_restore -U evo -d monorepo-bca --clean --if-exists --no-owner < /tmp/prod_dump_final.dump'

# 4. Re-aplicar migraciones (por si el delta las sobreescribio)
# Repetir paso 2.5

# 5. Mirror final de MinIO
mc mirror --preserve --overwrite prod-minio/ iplan-minio/

# 6. Cambiar NPM (ver NPM-PROXY-HOSTS.md Fase 2)
# Editar proxy host bca-group.microsyst.com.ar:
#   Forward: 10.8.10.20:8550 -> 10.8.10.120:80
#   Websockets: activar

# 7. Verificar
curl -sf https://bca-group.microsyst.com.ar/health
# Debe responder: {"status":"ok","server":"nginx-iplan"}
```

### Post-cutover checklist

- [ ] `curl -sf https://bca-group.microsyst.com.ar/health` -> 200
- [ ] Login de usuario funcional
- [ ] Upload de documento -> aparece en MinIO
- [ ] Validacion AI procesa correctamente
- [ ] WebSocket notifications llegan al frontend
- [ ] Remitos procesando (upload + analysis)
- [ ] PG replication lag < 5s (verificar en VM3)
- [ ] Grafana muestra metricas de las 3 VMs
- [ ] Backups automatizados configurados (cron en VM3)

### Rollback (si algo falla)

```bash
# Revertir NPM: cambiar bca-group.microsyst.com.ar de vuelta a 10.8.10.20:8550
# Produccion vieja sigue intacta
```

---

## Fase 5: Post-migracion

- [ ] Mantener servidor viejo (10.8.10.20) como fallback por 7 dias
- [ ] Monitorear metricas en Grafana 30 dias
- [ ] Eliminar proxy hosts viejos en NPM (bca-b, documentos, bucket) despues de 7 dias
- [ ] Eliminar proxy host temporal (grupobca) si no se necesita
- [ ] Documentar el nuevo despliegue
- [ ] Actualizar `docs/DESPLIEGUE_10.8.10.20_PRODUCCION.md` o crear nuevo doc
