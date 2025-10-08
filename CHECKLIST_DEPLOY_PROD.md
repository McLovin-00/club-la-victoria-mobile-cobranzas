# Checklist Deploy a Producción

> **Responsables**: DevOps/Back (ejecución) + Founder/Lead (aprobación)  
> **Objetivo**: Desplegar a producción de forma segura y controlada  
> **Cadencia**: Jueves 11:00 AM (semanal, tras validación exitosa en Staging)

**⚠️ CRÍTICO**: Este es el ambiente de usuarios reales. Seguir cada paso sin excepciones.

---

## 🛡️ Pre-Deploy (Verificaciones de Seguridad)

### 1. Aprobaciones

- [ ] **Lead/Founder aprobó** explícitamente el deploy
- [ ] PM/Analista confirmó que Staging está estable
- [ ] Staging pasó **TODOS** los checks del `CHECKLIST_STAGING.md`
- [ ] Sin incidentes abiertos de severidad alta

### 2. Preparación

- [ ] Horario confirmado: Jueves 11:00 AM
- [ ] Equipo notificado (al menos Lead + DevOps disponibles)
- [ ] Usuarios finales notificados si hay downtime esperado (opcional)
- [ ] Plan de rollback preparado y revisado

### 3. Backup

- [ ] **Backup de BD Producción ejecutado** (crítico)
  ```bash
  /home/administrador/scripts/backup.sh
  ```
- [ ] Backup verificado (archivo creado y tamaño razonable)
- [ ] Backups anteriores disponibles (retención: 7/14/30 días)

### 4. Verificación de Versión

- [ ] Tag de versión creado (ej: `v1.5.0`)
- [ ] Release notes preparadas y revisadas
- [ ] Changelog actualizado
- [ ] Branch `main` en commit correcto

---

## 🚀 Deploy

### 5. Ejecución (DevOps/Back)

- [ ] Conectado a servidor de producción vía SSH
- [ ] Variables de entorno verificadas (`.env` actualizado si es necesario)
- [ ] Workflow `deploy-prod.yml` ejecutado manualmente **O**
- [ ] Script `scripts/deploy-prod.sh` ejecutado

**Comando manual** (alternativa):
```bash
cd /home/administrador/monorepo-bca
git fetch origin
git checkout v1.5.0  # o el tag correspondiente
npm ci
npx prisma migrate deploy --schema=apps/backend/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/documentos/src/prisma/schema.prisma
docker stack deploy -c docker-compose.prod.yml monorepo-bca
```

### 6. Monitoreo durante Deploy

- [ ] Deploy ejecutándose sin errores
- [ ] Logs en tiempo real monitoreados:
  ```bash
  docker service logs -f monorepo-bca_backend
  docker service logs -f monorepo-bca_frontend
  docker service logs -f monorepo-bca_documentos
  ```
- [ ] Sin errores críticos en logs

### 7. Espera de Estabilización

- [ ] Esperar 30-60 segundos para que servicios se estabilicen
- [ ] Verificar estado de servicios:
  ```bash
  docker service ls
  docker service ps monorepo-bca_backend
  docker service ps monorepo-bca_frontend
  docker service ps monorepo-bca_documentos
  ```
- [ ] Todas las réplicas en estado `Running`

---

## ✅ Post-Deploy - Validaciones Inmediatas

### 8. Health Checks Automáticos

- [ ] Backend: `https://api.bca.microsyst.com.ar/health` → **200 OK**
- [ ] Documentos: `https://doc.bca.microsyst.com.ar/health` → **200 OK**
- [ ] Frontend: `https://bca.microsyst.com.ar/` → Carga correctamente

**Usar curl para verificar**:
```bash
curl -f https://api.bca.microsyst.com.ar/health
curl -f https://doc.bca.microsyst.com.ar/health
curl -I https://bca.microsyst.com.ar/
```

### 9. Smoke Test Crítico (Lead o PM)

**Flujo principal** (5 minutos):

- [ ] **Login**
  - [ ] Usuario real puede autenticarse
  - [ ] Redirección correcta

- [ ] **Dashboard**
  - [ ] Datos reales cargan
  - [ ] Sin errores visibles

- [ ] **Flujo crítico de negocio**
  - [ ] [Acción crítica 1] funciona
  - [ ] [Acción crítica 2] funciona
  - [ ] Datos se persisten correctamente

### 10. Verificaciones de Base de Datos

- [ ] Migraciones ejecutadas correctamente
- [ ] Conexión a BD estable
- [ ] Queries principales responden (< 1s)
- [ ] Sin locks o deadlocks

### 11. Servicios de Infraestructura

- [ ] PostgreSQL: respondiendo
- [ ] Redis: respondiendo
- [ ] MinIO: accesible
- [ ] Nginx: ruteando correctamente

---

## 📊 Monitoreo Post-Deploy (30 minutos)

### 12. Sentry (Errores)

- [ ] Dashboard de Sentry abierto
- [ ] **Sin errores nuevos en primeros 30 minutos**
- [ ] Error rate dentro de baseline histórico
- [ ] Capturas de excepciones normales

**Si aparecen errores**:
- Evaluar severidad (crítico/medio/bajo)
- Si es crítico → ejecutar rollback inmediatamente

### 13. Uptime Kuma (Disponibilidad)

- [ ] Todos los servicios reportan UP
- [ ] Tiempos de respuesta normales
- [ ] Sin alertas activas

### 14. Logs en Tiempo Real

Monitorear durante 15-30 minutos:

```bash
# Terminal 1: Backend
docker service logs -f monorepo-bca_backend --tail 50

# Terminal 2: Documentos
docker service logs -f monorepo-bca_documentos --tail 50

# Terminal 3: Frontend (si aplica)
docker service logs -f monorepo-bca_frontend --tail 50
```

- [ ] Sin excepciones no manejadas
- [ ] Sin errores de conexión a BD
- [ ] Sin timeouts

### 15. Métricas de Performance

- [ ] Tiempo de respuesta API < 500ms (promedio)
- [ ] Tiempo de carga Frontend < 3s
- [ ] CPU/Memoria dentro de rangos normales:
  ```bash
  docker stats --no-stream
  ```

---

## 📝 Documentación y Comunicación

### 16. Actualizar Registros

- [ ] Versión en producción actualizada en `docs/CICD_PIPELINE_3_SERVICES.md` (Matriz de Versiones)
- [ ] Tag creado en GitHub
- [ ] Release notes publicadas

### 17. Notificación de Deploy Exitoso

**Mensaje al equipo** (Slack/WhatsApp):

```
✅ Deploy a Producción completado

Versión: v1.5.0
Hora: 2025-10-10 11:15
Estado: ✅ Estable

Cambios principales:
- Feature A: [Descripción breve]
- Feature B: [Descripción breve]  
- Fix: [Descripción breve]

Health checks: ✅ OK
Sentry: ✅ Sin errores
Smoke test: ✅ Aprobado

Ver release notes: [Link]
```

---

## 🚨 Plan de Rollback (si algo falla)

### Si detectamos problemas críticos:

#### Opción A: Rollback Rápido (Docker Swarm)

```bash
# Volver a versión anterior
cd /home/administrador/monorepo-bca
git checkout v1.4.0  # versión anterior estable

# Re-deploy
docker stack deploy -c docker-compose.prod.yml monorepo-bca

# Verificar
docker service ls
curl -f https://api.bca.microsyst.com.ar/health
```

#### Opción B: Rollback de Migraciones (si es necesario)

```bash
# Solo si las migraciones causaron el problema
npx prisma migrate resolve --rolled-back "MIGRATION_NAME" --schema=apps/backend/prisma/schema.prisma

# Restaurar backup de BD
# (procedimiento documentado en scripts/restore.sh)
```

### Checklist de Rollback

- [ ] Rollback ejecutado
- [ ] Servicios estables en versión anterior
- [ ] Health checks OK
- [ ] Smoke test en versión anterior OK
- [ ] Equipo notificado
- [ ] Incidente documentado en `INCIDENTES.md`

---

## 📋 Post-Deploy - Cierre

### 18. Validación Final (1 hora después)

- [ ] Sentry: sin errores nuevos
- [ ] Uptime Kuma: servicios estables
- [ ] Logs: sin anomalías
- [ ] Performance: dentro de rangos normales
- [ ] Usuarios: sin reportes de problemas

### 19. Documentación de Incidentes (si aplicó)

Si hubo algún problema:

- [ ] Registrado en `INCIDENTES.md`
- [ ] Causa raíz identificada
- [ ] Plan de prevención definido
- [ ] Tests/docs actualizados

### 20. Cierre del Sprint

- [ ] Tablero actualizado (tareas → "Publicado")
- [ ] Demo/Cierre programado (viernes)
- [ ] Retrospectiva de deploy (si hubo incidentes)

---

## ✅ Sign-Off Final

**Deploy Completado Exitosamente**:

- [ ] Firmado por DevOps/Back: _____________ Fecha: _______
- [ ] Aprobado por Lead: _____________ Fecha: _______
- [ ] Verificado por PM: _____________ Fecha: _______

**Notas adicionales**:
```
[Espacio para notas, observaciones o mejoras para próximo deploy]
```

---

## 📞 Contactos de Emergencia

**Si algo sale mal**:

- **DevOps/Back**: [Contacto]
- **Founder/Lead**: [Contacto]
- **PM/Analista**: [Contacto]

**Canales**:
- Slack: #incidentes
- WhatsApp: Grupo "Microsyst Core"

---

**Tiempo estimado**: 45-60 minutos (deploy + validaciones)  
**Frecuencia**: Semanal (jueves 11:00, tras Staging exitoso)  
**Última actualización**: 8 Octubre 2025  
**Alineado con**: Manual Operativo Microsyst  

**⚠️ RECUERDA**: En producción, la prudencia es más importante que la velocidad.

