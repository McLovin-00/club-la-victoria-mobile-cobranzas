# Procedimiento: Restore Completo de Base de Datos

> **Versión**: 1.0  
> **Fecha**: 8 Octubre 2025  
> **Tiempo estimado**: 30-60 minutos  
> **Severidad**: CRÍTICO  
> **Roles**: DevOps Engineer, Tech Lead

---

## ⚠️ ADVERTENCIA

Este procedimiento **detendrá servicios** y **reemplazará datos** en la base de datos. Solo debe ejecutarse:
- ✅ En caso de pérdida de datos crítica
- ✅ Durante ventana de mantenimiento aprobada
- ✅ Como parte de disaster recovery testing (mensual)
- ✅ En migración a nuevo servidor

**NO ejecutar en producción sin:**
1. Aprobación explícita de Founder/Tech Lead
2. Notificación a usuarios (si aplica)
3. Backup preventivo del estado actual

---

## 🎯 Objetivo

Restaurar la base de datos PostgreSQL desde un archivo de backup (`.sql.gz`), validar integridad de datos, y reiniciar servicios.

---

## 📋 Prerrequisitos

### Accesos
- [ ] Acceso SSH al servidor objetivo (DEV/Staging/Producción)
- [ ] Usuario con permisos `sudo`
- [ ] Clave privada SSH configurada (`~/.ssh/id_rsa` o similar)

### Información Requerida
- [ ] **Archivo de backup**: Path completo (ej: `/backup/monorepo-bca/postgres-20251008-020001.sql.gz`)
- [ ] **Ambiente objetivo**: DEV / Staging / Producción
- [ ] **Ventana de mantenimiento**: Inicio y fin aprobados
- [ ] **Plan de comunicación**: ¿Usuarios deben ser notificados?

### Herramientas
- [ ] Acceso a Slack (#tech, #incidentes)
- [ ] Acceso a Sentry (para monitoreo post-restore)
- [ ] Acceso a Uptime Kuma (para validar health checks)

---

## 🛡️ Paso 0: Backup Preventivo (OBLIGATORIO) (5 min)

**Antes de hacer restore, SIEMPRE hacer backup del estado actual**

```bash
# Conectar al servidor
ssh usuario@servidor

# Crear backup preventivo manual
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="/backup/monorepo-bca/postgres-preventive-${TIMESTAMP}.sql.gz"

docker exec postgres pg_dump -U postgres monorepo-bca | gzip > $BACKUP_FILE

# Verificar que se creó correctamente
ls -lh $BACKUP_FILE
# Debe mostrar archivo con tamaño > 0

# Anotar path del backup preventivo (por si necesitas rollback)
echo "Backup preventivo guardado en: $BACKUP_FILE"
```

---

## 🔴 Paso 1: Notificación de Inicio (2 min)

### 1.1 Notificar en Slack

```
#tech y #incidentes:

🔴 MANTENIMIENTO: Restore de Base de Datos
Ambiente: [DEV/Staging/Producción]
Inicio: [HH:MM]
Duración estimada: 30-60 minutos
Responsable: [Tu Nombre]
Motivo: [Pérdida de datos / Testing / Migración]

Servicios afectados:
- Backend (API): OFFLINE
- Frontend: OFFLINE (sin datos)
- Documentos: OFFLINE

Backup preventivo realizado: ✅
Backup a restaurar: [nombre-archivo.sql.gz]
```

### 1.2 Cambiar Status en Uptime Kuma

```bash
# Marcar servicios como "En Mantenimiento" en Uptime Kuma
# (Esto evita alertas falsas)
# Acceder a: https://uptime.microsyst.com.ar
# O pausar monitors temporalmente
```

---

## 🛑 Paso 2: Detener Servicios (3 min)

### 2.1 Verificar Servicios Activos

```bash
# Ver qué servicios están corriendo
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 2.2 Detener Servicios que Usan la BD

**DEV (docker-compose)**:
```bash
cd /home/administrador/monorepo-bca

# Detener solo servicios de aplicación (deja infra corriendo)
docker compose -f docker-compose.dev.yml stop backend frontend documentos
```

**Staging / Producción (Docker Swarm)**:
```bash
# Scaling a 0 réplicas (más seguro que eliminar)
docker service scale monorepo-[env]_backend=0
docker service scale monorepo-[env]_frontend=0
docker service scale monorepo-[env]_documentos=0

# Esperar a que se detengan (puede tardar 30s)
docker service ls

# Verificar que réplicas = 0/0
```

### 2.3 Verificar que No Hay Conexiones Activas

```bash
# Ver conexiones activas a PostgreSQL
docker exec postgres psql -U postgres -c \
  "SELECT COUNT(*) FROM pg_stat_activity WHERE datname='monorepo-bca';"

# Si hay conexiones activas, forzar desconexión
docker exec postgres psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='monorepo-bca' AND pid <> pg_backend_pid();"
```

---

## 📥 Paso 3: Validar Archivo de Backup (5 min)

### 3.1 Verificar Integridad del Archivo

```bash
# Verificar que el archivo existe
BACKUP_FILE="/backup/monorepo-bca/postgres-20251008-020001.sql.gz"
ls -lh $BACKUP_FILE

# Verificar que no está corrupto (debe terminar sin errores)
gunzip -t $BACKUP_FILE && echo "✅ Archivo válido" || echo "❌ Archivo corrupto"

# Ver tamaño descomprimido estimado
gunzip -c $BACKUP_FILE | wc -c | awk '{print $1/1024/1024 "MB"}'
```

### 3.2 Inspeccionar Contenido del Backup (Opcional)

```bash
# Ver primeras 50 líneas del backup
gunzip -c $BACKUP_FILE | head -50

# Buscar versión de PostgreSQL
gunzip -c $BACKUP_FILE | grep "Dumped from database version" | head -1

# Buscar schemas incluidos
gunzip -c $BACKUP_FILE | grep "CREATE SCHEMA" | head -10
```

---

## 🗑️ Paso 4: Drop y Recreación de Base de Datos (5 min)

### 4.1 Drop Base de Datos (DESTRUCTIVO)

```bash
# Conectar a PostgreSQL
docker exec -it postgres psql -U postgres

# Dentro de psql:
-- Verificar base actual
\l

-- Drop database (esto elimina TODO)
DROP DATABASE IF EXISTS "monorepo-bca";

-- Verificar que se eliminó
\l

-- Salir de psql
\q
```

### 4.2 Recrear Base de Datos Vacía

```bash
docker exec -it postgres psql -U postgres -c "CREATE DATABASE \"monorepo-bca\" OWNER postgres;"

# Verificar que se creó
docker exec -it postgres psql -U postgres -l | grep monorepo-bca
```

---

## 📦 Paso 5: Restore de Backup (15-30 min)

### 5.1 Ejecutar Restore

**Método 1: Restore directo (más rápido)**
```bash
# Descomprimir y restaurar en un solo paso
gunzip -c $BACKUP_FILE | docker exec -i postgres psql -U postgres -d monorepo-bca

# Esto puede tardar 15-30 min dependiendo del tamaño
# NO interrumpir el proceso
```

**Método 2: Restore con log de progreso (recomendado para backups grandes)**
```bash
# Descomprimir a archivo temporal
TEMP_SQL="/tmp/restore-$(date +%Y%m%d-%H%M%S).sql"
gunzip -c $BACKUP_FILE > $TEMP_SQL

# Ver tamaño del archivo SQL
ls -lh $TEMP_SQL

# Restore con pv (progress viewer) si está instalado
cat $TEMP_SQL | pv | docker exec -i postgres psql -U postgres -d monorepo-bca

# O sin pv
cat $TEMP_SQL | docker exec -i postgres psql -U postgres -d monorepo-bca

# Limpiar archivo temporal
rm $TEMP_SQL
```

### 5.2 Monitorear Progreso (En otro terminal)

```bash
# Ver conexiones activas
watch -n 5 "docker exec postgres psql -U postgres -c \"SELECT COUNT(*) FROM pg_stat_activity WHERE datname='monorepo-bca';\""

# Ver tamaño de la BD creciendo
watch -n 10 "docker exec postgres psql -U postgres -c \"SELECT pg_size_pretty(pg_database_size('monorepo-bca'));\""
```

---

## ✅ Paso 6: Validación de Restore (10 min)

### 6.1 Verificar Schemas y Tablas

```bash
# Conectar a PostgreSQL
docker exec -it postgres psql -U postgres -d monorepo-bca

# Listar schemas
\dn

# Debe mostrar:
# - platform
# - documentos
# - public
# (+ flowise si aplica)

# Listar tablas de platform
\dt platform.*

# Debe mostrar:
# - platform.User
# - platform.Profile
# - platform.Permission
# - etc.

# Listar tablas de documentos
\dt documentos.*

# Debe mostrar:
# - documentos.Document
# - documentos.Driver
# - documentos.Task
# - etc.

# Salir
\q
```

### 6.2 Verificar Cantidad de Registros

```bash
# Contar usuarios
docker exec postgres psql -U postgres -d monorepo-bca -c \
  "SELECT COUNT(*) as total_users FROM platform.\"User\";"

# Contar documentos
docker exec postgres psql -U postgres -d monorepo-bca -c \
  "SELECT COUNT(*) as total_docs FROM documentos.\"Document\";"

# Comparar con valores esperados (si los conoces)
# Ejemplo: Si tenías 150 usuarios antes, ahora deberías tener ~150
```

### 6.3 Verificar Datos Críticos (Spot Check)

```bash
# Ver últimos 5 usuarios creados
docker exec postgres psql -U postgres -d monorepo-bca -c \
  "SELECT id, username, email, \"createdAt\" FROM platform.\"User\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Ver últimos 5 documentos
docker exec postgres psql -U postgres -d monorepo-bca -c \
  "SELECT id, filename, status, \"uploadedAt\" FROM documentos.\"Document\" ORDER BY \"uploadedAt\" DESC LIMIT 5;"

# Verificar que datos tienen sentido (fechas recientes, IDs válidos)
```

### 6.4 Verificar Integridad Referencial

```bash
# Buscar foreign keys rotas (no debería haber ninguna)
docker exec postgres psql -U postgres -d monorepo-bca -c \
  "SELECT conname, conrelid::regclass, confrelid::regclass 
   FROM pg_constraint 
   WHERE contype = 'f' 
   LIMIT 10;"

# Si todo OK, no debería haber errores
```

---

## 🔄 Paso 7: Regenerar Cliente Prisma (5 min)

```bash
# Si estás en el servidor (no local), necesitas regenerar cliente Prisma
cd /home/administrador/monorepo-bca

# Generar clientes para ambos schemas
npm run prisma:generate --workspace=apps/backend
npm run prisma:generate --workspace=apps/documentos

# Esto asegura que el ORM esté sincronizado con el schema de BD
```

---

## 🟢 Paso 8: Reiniciar Servicios (5 min)

### 8.1 Levantar Servicios

**DEV (docker-compose)**:
```bash
cd /home/administrador/monorepo-bca

# Reiniciar servicios
docker compose -f docker-compose.dev.yml start backend frontend documentos

# Verificar que iniciaron
docker ps
```

**Staging / Producción (Docker Swarm)**:
```bash
# Escalar de vuelta a 1 réplica (o el número que tenías)
docker service scale monorepo-[env]_backend=1
docker service scale monorepo-[env]_frontend=1
docker service scale monorepo-[env]_documentos=1

# Monitorear que se levanten correctamente (puede tardar 2-3 min)
watch -n 2 "docker service ls | grep monorepo-[env]"

# Esperar a que todos muestren "1/1" en réplicas
```

### 8.2 Verificar Logs

```bash
# Ver logs de backend (buscar errores)
docker logs monorepo-[env]_backend --tail 100 -f

# Presionar Ctrl+C después de verificar que no hay errores críticos

# Ver logs de documentos
docker logs monorepo-[env]_documentos --tail 100 -f
```

---

## 🏥 Paso 9: Health Checks (5 min)

### 9.1 Verificar Endpoints de Health

```bash
# Backend
curl http://localhost:4800/api/health
# Debe responder: {"status":"ok"}

# Frontend (verificar que carga)
curl http://localhost:8550 -I
# Debe responder: HTTP/1.1 200 OK

# Documentos
curl http://localhost:4802/health/ready
# Debe responder: {"status":"ready"}
```

### 9.2 Verificar en Uptime Kuma

```bash
# Acceder a Uptime Kuma
# https://uptime.microsyst.com.ar

# Verificar que todos los monitors estén en verde:
# - Backend API
# - Frontend
# - Documentos API
```

---

## 🧪 Paso 10: Testing Funcional (10 min)

### 10.1 Test de Login

```bash
# Probar login con usuario conocido
# Opción A: Desde Postman
# POST http://localhost:4800/api/auth/login
# Body: {"username": "admin", "password": "tu-password"}

# Opción B: Desde navegador
# Ir a http://localhost:8550
# Intentar hacer login con usuario conocido
```

### 10.2 Test de Feature Crítica

```bash
# Probar una operación crítica, por ejemplo:
# - Crear un documento nuevo
# - Asignar una tarea
# - Ver lista de usuarios

# Si funciona → BD restaurada correctamente
# Si no funciona → Investigar logs
```

---

## 📊 Paso 11: Validación Final (5 min)

### Checklist de Validación

- [ ] **BD restaurada**: Schemas y tablas presentes
- [ ] **Conteo de registros**: Similar a lo esperado
- [ ] **Datos críticos**: Spot check OK (últimos usuarios, documentos)
- [ ] **Servicios levantados**: Backend, Frontend, Documentos running
- [ ] **Health checks**: Todos en verde
- [ ] **Login funciona**: Usuario puede autenticarse
- [ ] **Feature crítica funciona**: (crear doc, asignar tarea, etc)
- [ ] **No hay errores en Sentry**: (primeros 15 min post-restore)
- [ ] **Logs limpios**: No hay errores críticos en Docker logs

---

## 🟢 Paso 12: Notificación de Finalización (2 min)

### 12.1 Notificar en Slack

```
#tech y #incidentes:

✅ MANTENIMIENTO COMPLETADO: Restore de Base de Datos
Ambiente: [DEV/Staging/Producción]
Finalizado: [HH:MM]
Duración real: [XX minutos]
Responsable: [Tu Nombre]

Resultados:
- BD restaurada exitosamente ✅
- Servicios funcionando ✅
- Login validado ✅
- Health checks: OK ✅

Backup utilizado: [nombre-archivo.sql.gz]
Backup preventivo: [nombre-archivo-preventivo.sql.gz]

Sistema disponible para uso normal.
```

### 12.2 Actualizar Uptime Kuma

```bash
# Reactivar monitors pausados
# O cambiar status de "Mantenimiento" a "Operacional"
```

---

## 🔄 Paso 13: Documentación Post-Restore (5 min)

### 13.1 Registrar en Log de Incidentes

```bash
# Editar docs/INCIDENTES.md
# Agregar entrada con:
# - Fecha y hora
# - Motivo del restore
# - Backup utilizado
# - Duración
# - Resultados
# - Lecciones aprendidas (si aplica)
```

### 13.2 Archivar Backup Preventivo

```bash
# NO eliminar el backup preventivo todavía
# Mantenerlo por al menos 7 días

# Verificar que backup regular (cron) sigue funcionando
ls -lt /backup/monorepo-bca/ | head -5
```

---

## 🚨 Rollback (Si Algo Salió Mal)

Si el restore falló o los datos no son correctos:

### Paso R1: Detener Servicios (Nuevamente)

```bash
# DEV
docker compose -f docker-compose.dev.yml stop backend frontend documentos

# Staging/Prod
docker service scale monorepo-[env]_backend=0
docker service scale monorepo-[env]_frontend=0
docker service scale monorepo-[env]_documentos=0
```

### Paso R2: Restaurar Backup Preventivo

```bash
# Usar el backup preventivo que creaste en Paso 0
PREVENTIVE_BACKUP="/backup/monorepo-bca/postgres-preventive-20251008-100000.sql.gz"

# Drop y recrear BD
docker exec -it postgres psql -U postgres -c "DROP DATABASE IF EXISTS \"monorepo-bca\";"
docker exec -it postgres psql -U postgres -c "CREATE DATABASE \"monorepo-bca\" OWNER postgres;"

# Restore desde backup preventivo
gunzip -c $PREVENTIVE_BACKUP | docker exec -i postgres psql -U postgres -d monorepo-bca
```

### Paso R3: Reiniciar Servicios

```bash
# Seguir pasos 8 y 9 de este documento (Reiniciar servicios y Health checks)
```

### Paso R4: Notificar

```
#tech y #incidentes:

⚠️ ROLLBACK EJECUTADO
Se restauró el backup preventivo debido a: [motivo]
Sistema vuelto al estado anterior al restore.
Investigando causa raíz...
```

---

## 🐛 Troubleshooting

### Error: "database is being accessed by other users"

```bash
# Forzar desconexión de todos los usuarios
docker exec postgres psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='monorepo-bca' AND pid <> pg_backend_pid();"

# Intentar drop nuevamente
```

### Error: "out of memory" durante restore

```bash
# Aumentar memoria de Docker (si es local)
# O restaurar en lotes (split SQL)

# Verificar memoria disponible
free -h

# Cerrar servicios no esenciales temporalmente
docker stop [otros-contenedores-no-criticos]
```

### Error: "role does not exist" durante restore

```bash
# Crear roles faltantes
docker exec postgres psql -U postgres -c "CREATE ROLE [rolename];"

# O restaurar sin ownership
gunzip -c $BACKUP_FILE | docker exec -i postgres psql -U postgres -d monorepo-bca --no-owner
```

### Error: Restore tarda demasiado (> 1 hora)

```bash
# Verificar que no hay operaciones bloqueantes
docker exec postgres psql -U postgres -c \
  "SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;"

# Considerar restore con pg_restore (más rápido para dumps grandes)
# Esto requiere backup en formato custom (-Fc)
```

---

## 📚 Referencias

- [Documentación oficial de pg_dump/pg_restore](https://www.postgresql.org/docs/16/app-pgdump.html)
- [Guía de Backup](./PROCEDURE_DATABASE_BACKUP.md) (si existe)
- [Runbook de Incidentes de BD](../runbooks/RUNBOOK_DATABASE_ISSUES.md) (si existe)
- [Manual Operativo Microsyst](../MANUAL_OPERATIVO_MICROSYST.md)

---

## ✅ Checklist Final

Antes de cerrar el procedimiento, confirmar:

- [ ] Base de datos restaurada y validada
- [ ] Servicios funcionando correctamente
- [ ] Health checks en verde
- [ ] Testing funcional OK (login, feature crítica)
- [ ] Backup preventivo archivado (no eliminado)
- [ ] Documentación actualizada (INCIDENTES.md)
- [ ] Equipo notificado en Slack
- [ ] Uptime Kuma actualizado
- [ ] No hay errores en Sentry (primeras 2 horas)
- [ ] Cron de backup regular verificado

**Si todo está OK** → Procedimiento completado exitosamente ✅

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: DevOps Engineer + Tech Lead  
**Feedback**: Si encuentras errores o mejoras, reportar en Slack #tech

