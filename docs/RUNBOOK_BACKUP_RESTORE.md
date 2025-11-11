## Runbook: Backup y Restore (PostgreSQL + MinIO)

Este runbook describe los pasos operativos para realizar backups y restauraciones del sistema de gestión de equipos.

### Componentes cubiertos
- PostgreSQL (todas las bases de datos del proyecto; por defecto `monorepo-bca`)
- MinIO (objetos de documentos)
- Archivos de configuración relevantes (opcional)

### Ubicación de scripts
- `scripts/backup.sh`: backup completo (PostgreSQL, MinIO, configs)
- `scripts/restore.sh`: restauración de PostgreSQL y MinIO desde el último backup disponible

### Variables de entorno
- `BACKUP_DIR`: directorio base para almacenar/restaurar (por defecto: `/backup/monorepo-bca`)
- `POSTGRES_CONTAINER_NAME`: nombre del contenedor de PostgreSQL (por defecto: coincide con filtro `name=postgres`)
- `MINIO_CONTAINER_NAME`: nombre del contenedor de MinIO (por defecto: coincide con filtro `name=minio`)

### Ejecutar backup manual
```bash
bash scripts/backup.sh
```
- Resultado esperado: archivos en:
  - `${BACKUP_DIR}/postgres/postgres-YYYYMMDD-HHMMSS.sql.gz`
  - `${BACKUP_DIR}/minio/minio-YYYYMMDD-HHMMSS.tar.gz`
  - `${BACKUP_DIR}/config/config-YYYYMMDD-HHMMSS.tar.gz`

### Programar backup diario (cron)
```bash
crontab -e
# 02:00 AM diario
0 2 * * * /home/administrador/monorepo-bca/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restauración (escenario completo)
Advertencia: La restauración sobrescribe datos existentes.

```bash
bash scripts/restore.sh
```
- Restaura la última versión de:
  - PostgreSQL: aplica `pg_restore`/`psql` desde el último dump `.sql.gz`
  - MinIO: extrae y copia el último tarball de `/data`

### Verificaciones post-restore
1) Aplicación levanta y `/health` responde OK
2) `/metrics` expone contadores y no hay errores de conexión a DB/S3
3) Descarga de documentos existentes responde con objetos válidos

### Versionado de objetos en MinIO
- El sistema crea buckets si faltan; el versionado puede habilitarse desde el MinIO Client (`mc`) si la infraestructura lo soporta.
- Ejemplo (opcional):
```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc version enable local/documentos-empresa-t1
```

### Recuperación granular
- Para restaurar solo PostgreSQL:
```bash
bash scripts/restore.sh --postgres-only
```
- Para restaurar solo MinIO:
```bash
bash scripts/restore.sh --minio-only
```

### Riesgos y límites
- Asegurar espacio suficiente en `${BACKUP_DIR}`
- No ejecutar restore en producción sin ventana aprobada
- Validar compatibilidad de versiones PostgreSQL entre dump y servidor destino

### Contactos y escalamiento
- Equipo Dev/DevOps
- Logs de backup: `${BACKUP_DIR}/logs/backup-YYYYMMDD.log`


