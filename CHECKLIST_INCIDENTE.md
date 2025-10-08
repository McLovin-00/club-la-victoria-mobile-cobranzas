# Checklist de Gestión de Incidentes

> **Responsable**: DevOps/Back + Founder/Lead  
> **Objetivo**: Responder rápido, documentar y aprender de cada incidente

**Definición de Incidente**: Cualquier evento que degrada o interrumpe el servicio en Producción

---

## 🚨 Durante el Incidente (RESPUESTA)

### 1. Detección y Comunicación Inicial (0-5 minutos)

- [ ] **Hora de inicio**: __________ (registrar inmediatamente)
- [ ] **Severidad identificada**:
  - [ ] 🔴 Crítico (servicio caído, pérdida de datos)
  - [ ] 🟡 Alto (funcionalidad principal afectada)
  - [ ] 🟢 Medio (funcionalidad secundaria afectada)
  - [ ] 🔵 Bajo (cosmético, sin impacto en usuarios)

- [ ] **Canal de comunicación abierto**:
  - [ ] Slack/WhatsApp → canal #incidentes
  - [ ] Mensaje inicial: "🚨 INCIDENTE: [descripción breve] - Investigando..."

- [ ] **Stakeholders notificados**:
  - [ ] Founder/Lead
  - [ ] PM/Analista
  - [ ] Equipo dev (si es necesario)
  - [ ] Clientes (si aplica según severidad)

**Template mensaje inicial**:
```
🚨 INCIDENTE DETECTADO
Servicio: [Backend/Frontend/Documentos]
Síntomas: [Descripción breve]
Impacto: [Usuarios afectados / Funcionalidad]
Estado: Investigando
Responsable: [Nombre]
ETA: Evaluando
```

### 2. Evaluación Rápida (5-15 minutos)

- [ ] **Síntomas documentados**:
  - ¿Qué no está funcionando?
  - ¿Desde cuándo?
  - ¿Afecta a todos los usuarios o solo algunos?
  - ¿Qué cambió recientemente?

- [ ] **Logs revisados**:
  ```bash
  # Revisar logs recientes
  docker service logs monorepo-prod_backend --tail 200 --since 30m
  docker service logs monorepo-prod_frontend --tail 200 --since 30m
  docker service logs monorepo-prod_documentos --tail 200 --since 30m
  ```

- [ ] **Sentry/Monitoring revisado**:
  - Errores nuevos
  - Picos de tráfico
  - Performance degradado

- [ ] **Health checks verificados**:
  - [ ] `/api/health` - Backend
  - [ ] `/docs/health` - Documentos
  - [ ] PostgreSQL, Redis, MinIO

### 3. Decisión de Acción (15-20 minutos)

**Opción A: Rollback Inmediato** (preferido si causa es deploy reciente)

- [ ] **Criterio para rollback**:
  - Deploy en últimas 2 horas
  - Causa clara relacionada con código nuevo
  - Impacto crítico en usuarios

- [ ] **Ejecutar rollback**:
  ```bash
  # Verificar versión anterior
  git log --oneline -5
  
  # Rollback de Docker Swarm
  docker stack deploy -c docker-compose.prod.yml monorepo-prod
  # (usando imagen/tag anterior)
  ```

- [ ] **Validar rollback**:
  - Health checks OK
  - Funcionalidad restaurada
  - Sentry sin errores

**Opción B: Hotfix Urgente**

- [ ] **Criterio para hotfix**:
  - Causa identificada y fix rápido (< 30 min)
  - Rollback no es opción (causa no es código)
  - Fix es seguro y probado

- [ ] **Rama hotfix creada**:
  ```bash
  git checkout main
  git pull
  git checkout -b hotfix/descripcion-breve
  ```

- [ ] **Fix implementado y probado localmente**
- [ ] **PR creado** (fast-track, sin esperar reviews extensas)
- [ ] **Deploy directo a Producción** (tras aprobación Lead)

**Opción C: Mitigación Temporal**

- [ ] **Criterio para mitigación**:
  - Causa no clara aún
  - Necesito tiempo para investigar
  - Puedo reducir impacto temporalmente

- [ ] **Acciones de mitigación**:
  - [ ] Deshabilitar feature problemática (feature flag)
  - [ ] Escalar recursos (más replicas)
  - [ ] Ajustar rate limits
  - [ ] Redirigir tráfico
  - [ ] Otra: __________

### 4. Implementación de Solución

- [ ] **Solución aplicada**: [Rollback/Hotfix/Mitigación]
- [ ] **Hora de implementación**: __________
- [ ] **Validación post-fix**:
  - [ ] Funcionalidad restaurada
  - [ ] Health checks OK
  - [ ] Sentry sin nuevos errores (15 min)
  - [ ] Usuario de prueba puede operar

### 5. Comunicación de Resolución

- [ ] **Update a stakeholders**:
```
✅ INCIDENTE RESUELTO
Servicio: [Backend/Frontend/Documentos]
Duración: [HH:mm - HH:mm] (X minutos)
Causa: [Descripción breve]
Solución: [Rollback/Hotfix/Mitigación]
Impacto: [Usuarios/funcionalidad afectada]
Próximos pasos: Post-mortem programado
```

- [ ] **Hora de resolución**: __________
- [ ] **Duración total**: __________ minutos

---

## 📝 Post-Incidente (APRENDIZAJE)

### 6. Registro en INCIDENTES.md (Dentro de 24h)

- [ ] **Entrada creada en `INCIDENTES.md`** con:
  - Fecha y hora (inicio - fin)
  - Servicio afectado
  - Síntomas observados
  - Causa raíz identificada
  - Acción tomada (rollback/hotfix/mitigación)
  - Impacto (usuarios, downtime, pérdida de datos)
  - Responsable de la resolución

### 7. Análisis de Causa Raíz (Dentro de 48h)

- [ ] **5 Whys ejecutado**:
  - ¿Por qué ocurrió? __________
  - ¿Por qué eso pasó? __________
  - ¿Por qué eso pasó? __________
  - ¿Por qué eso pasó? __________
  - ¿Por qué eso pasó? __________

- [ ] **Categoría de causa**:
  - [ ] Error de código (bug)
  - [ ] Error de configuración
  - [ ] Error de infraestructura
  - [ ] Error de proceso (saltamos QA)
  - [ ] Error externo (proveedor, API)
  - [ ] Otro: __________

### 8. Prevención (Plan de Acción)

**Al menos 1 acción concreta**:

- [ ] **Acción 1**: [Descripción específica]
  - Responsable: __________
  - Fecha compromiso: __________
  - Tipo: [ ] Test, [ ] Monitoreo, [ ] Docs, [ ] Proceso, [ ] Código

- [ ] **Acción 2** (si aplica): __________

**Ejemplos de acciones preventivas**:
- Agregar test E2E para caso que falló
- Agregar alerta en Sentry para error específico
- Mejorar validación en frontend/backend
- Actualizar checklist de deploy
- Documentar caso edge en README
- Agregar health check específico

### 9. Actualización de Documentación

- [ ] **Tests actualizados** (para cubrir este caso)
- [ ] **Monitoreo/Alertas configuradas** (si aplica)
- [ ] **Documentación técnica actualizada** (si aplica)
- [ ] **Runbook creado/actualizado** (para incidentes similares)
- [ ] **CHECKLIST_DEPLOY_PROD.md actualizado** (si aplica)

### 10. Post-Mortem Breve (Opcional para incidentes críticos)

- [ ] **Reunión programada** (30 min, dentro de 1 semana)
- [ ] **Participantes**:
  - Lead
  - DevOps/Back
  - Dev autor del código (si aplica)
  - PM/Analista

**Agenda**:
1. Timeline del incidente (5 min)
2. Qué salió bien (5 min)
3. Qué salió mal (10 min)
4. Acciones preventivas (10 min)

---

## 📊 Métricas de Incidente

**Calcular y registrar**:

- **MTTD** (Mean Time To Detect): Tiempo desde que ocurrió hasta que lo detectamos
- **MTTR** (Mean Time To Resolve): Tiempo desde detección hasta resolución
- **Impacto**: Cantidad de usuarios afectados, downtime total

---

## 🎯 Criterios de Éxito

Un incidente está **completamente gestionado** cuando:

- ✅ Servicio restaurado y validado
- ✅ Stakeholders notificados (inicio y resolución)
- ✅ Registrado en `INCIDENTES.md`
- ✅ Causa raíz identificada
- ✅ Al menos 1 acción preventiva definida y asignada
- ✅ Documentación/tests actualizados (si aplica)

---

## 📞 Contactos de Emergencia

| Rol | Nombre | Contacto | Backup |
|-----|--------|----------|--------|
| Founder/Lead | [Nombre] | [Tel/Slack] | - |
| DevOps/Back | [Nombre] | [Tel/Slack] | - |
| PM/Analista | [Nombre] | [Tel/Slack] | - |

**Escalación**:
- Incidentes críticos → Notificar a Lead inmediatamente
- Downtime > 1 hora → Notificar a clientes (si aplica)
- Pérdida de datos → Activar plan de restore desde backup

---

## 📚 Recursos Útiles

**Comandos de emergencia**:
```bash
# Ver servicios
docker service ls

# Ver logs recientes
docker service logs monorepo-prod_backend --tail 100 --since 30m

# Verificar health
curl https://bca.microsyst.com.ar/api/health

# Rollback rápido
docker service update --rollback monorepo-prod_backend

# Ver versión actual
docker service inspect monorepo-prod_backend | grep Image
```

**Links rápidos**:
- Sentry: [URL]
- Uptime Kuma: [URL]
- Logs servidor: `ssh user@server`
- GitHub Actions: [URL]

---

**Última actualización**: 8 Octubre 2025  
**Alineado con**: Manual Operativo Microsyst  
**Revisión**: Trimestral o post cada incidente crítico

