# Recursos de Hardware y Límites por Ambiente

> **Última actualización**: 8 Octubre 2025  
> **Documento**: Especificación de recursos de hardware para cada ambiente

Este documento define los recursos de hardware disponibles en cada ambiente y los límites configurados para cada servicio en Docker.

---

## 📊 Recursos de Máquinas Virtuales

| Ambiente | RAM Total | CPU | Disco | Observaciones |
|----------|-----------|-----|-------|---------------|
| **Development** | 16 GB | 4-8 cores | 100+ GB | VM compartida o local |
| **Staging** | 16 GB | 4-8 cores | 200+ GB | VM dedicada |
| **Producción** | 32 GB | 8-16 cores | 500+ GB | VM dedicada con redundancia |

---

## 🎯 Distribución de Recursos por Ambiente

### Development (Local - 16GB)

**Nota**: En desarrollo, los servicios corren opcionalmente en Docker. Las aplicaciones (Frontend, Backend, Documentos) corren con `npm run dev` localmente.

| Servicio | Límite RAM | Reserva RAM | Límite CPU | Observaciones |
|----------|------------|-------------|------------|---------------|
| **PostgreSQL** | 256M | 128M | 0.5 | Opcional, puede usar DB externa |
| **Redis** | 512M | 256M | 0.5 | Cache con LRU |
| **MinIO** | 512M | 256M | 0.5 | S3-compatible storage |
| **Flowise** | 2G | 1G | 1.0 | Opcional (profile ai) |
| **SonarQube** | 2G | 1G | 2.0 | Solo local, no en ambientes |
| **SonarQube DB** | 1G | 512M | 1.0 | PostgreSQL para SonarQube |
| **Total Infra** | ~6.25 GB | ~3.12 GB | - | Sin SonarQube: ~3.25 GB |

**Comandos**:
```bash
# Solo infraestructura básica (3.25 GB)
docker compose -f docker-compose.dev.yml up postgres redis minio -d

# Con Flowise (5.25 GB)
docker compose -f docker-compose.dev.yml --profile ai up -d

# SonarQube separado (3 GB)
docker compose -f docker-compose.sonarqube.yml up -d
```

---

### Staging (Docker Swarm - 16GB)

| Servicio | Límite RAM | Reserva RAM | Límite CPU | Réplicas |
|----------|------------|-------------|------------|----------|
| **Nginx** | 256M | 128M | 0.5 | 1 |
| **Frontend** | 512M | 256M | 0.5 | 1 |
| **Backend** | 1G | 512M | 1.0 | 1 |
| **Documentos** | 1G | 512M | 1.0 | 1 |
| **MinIO** | 1G | 512M | 0.5 | 1 |
| **PostgreSQL** | 1G | 512M | 1.0 | 1 |
| **Redis** | 256M | 128M | 0.5 | 1 |
| **Flowise** (opt) | 2G | 1G | 1.0 | 1 |
| **Total Base** | **5.98 GB** | **3 GB** | - | - |
| **Total con Flowise** | **7.98 GB** | **4 GB** | - | - |

**Margen disponible**:
- Sin Flowise: ~10 GB libres (62% disponible)
- Con Flowise: ~8 GB libres (50% disponible)

**Comandos**:
```bash
# Deploy sin Flowise (recomendado inicialmente)
docker stack deploy -c docker-compose.staging.yml monorepo-staging

# Deploy con Flowise (si se necesita IA)
docker stack deploy --profile ai -c docker-compose.staging.yml monorepo-staging
```

**Recomendaciones**:
- ✅ Habilitar Flowise solo si se necesita procesamiento de IA en staging
- ✅ Monitorear uso de RAM con `docker stats`
- ⚠️ NO escalar servicios sin verificar disponibilidad de RAM

---

### Producción (Docker Swarm - 32GB)

| Servicio | Límite RAM | Reserva RAM | Límite CPU | Réplicas Inicial | Escalable a |
|----------|------------|-------------|------------|-----------------|-------------|
| **Nginx** | 256M | 128M | 0.5 | 1 | 2 |
| **Frontend** | 512M | 256M | 0.5 | 1 | 3 |
| **Backend** | 1G | 512M | 1.0 | 1 | 3 |
| **Documentos** | 1G | 512M | 1.0 | 1 | 3 |
| **MinIO** | 1G | 512M | 1.0 | 1 | 2 |
| **PostgreSQL** | 2G | 1G | 2.0 | 1 | 1 (no escalar) |
| **Redis** | 512M | 256M | 0.5 | 1 | 1 (no escalar) |
| **Flowise** (opt) | 4G | 2G | 2.0 | 1 | 2 |
| **Total Base** | **6.25 GB** | **3.12 GB** | - | - | **~14 GB escalado** |
| **Total con Flowise** | **10.25 GB** | **5.12 GB** | - | - | **~18 GB escalado** |

**Margen disponible**:
- Sin Flowise (base): ~26 GB libres (81% disponible)
- Con Flowise (base): ~22 GB libres (68% disponible)
- Escalado máximo: ~14-18 GB libres (43-56% disponible)

**Comandos**:
```bash
# Deploy inicial sin Flowise
docker stack deploy -c docker-compose.prod.yml monorepo-prod

# Deploy con Flowise
docker stack deploy --profile ai -c docker-compose.prod.yml monorepo-prod

# Escalar servicios bajo demanda
docker service scale monorepo-prod_frontend=2
docker service scale monorepo-prod_backend=2
docker service scale monorepo-prod_documentos=2
```

**Recomendaciones**:
- ✅ Iniciar con configuración base (1 réplica por servicio)
- ✅ Escalar bajo demanda según métricas de uso
- ✅ Habilitar Flowise solo si se necesita clasificación automática de documentos
- ✅ Monitorear con `docker stats` y `docker service ls`
- ⚠️ Mantener al menos 8-10 GB libres para picos de uso

---

## 📈 Estrategia de Escalado

### Cuándo Escalar

**Indicadores para escalar Frontend/Backend/Documentos**:
- CPU > 70% sostenido por 5+ minutos
- Memoria > 80% del límite
- Tiempo de respuesta > 500ms en promedio
- Queue de requests acumulándose

**Comandos de monitoreo**:
```bash
# Ver uso actual
docker stats

# Ver réplicas activas
docker service ls

# Ver distribución de tareas
docker service ps monorepo-prod_backend
```

### Orden de Escalado Recomendado

1. **Backend** (primera prioridad - carga de API)
2. **Documentos** (segunda prioridad - procesamiento pesado)
3. **Frontend** (tercera prioridad - generalmente menos crítico)

**Ejemplo de escalado progresivo**:
```bash
# Paso 1: Escalar backend a 2 réplicas
docker service scale monorepo-prod_backend=2

# Esperar 5 min, verificar métricas

# Paso 2: Si sigue alta carga, escalar documentos
docker service scale monorepo-prod_documentos=2

# Paso 3: Si hay carga en frontend, escalar
docker service scale monorepo-prod_frontend=2
```

---

## 🔍 Monitoreo de Recursos

### Comandos Útiles

```bash
# Ver uso en tiempo real
docker stats

# Ver solo servicios del stack staging
docker stats $(docker ps --filter name=monorepo-staging -q)

# Ver uso de RAM del host
free -h

# Ver procesos consumiendo más RAM
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}" | sort -k 2 -h -r

# Logs de un servicio con límite de tamaño
docker service logs monorepo-prod_backend --tail 100 --since 10m
```

### Alertas Recomendadas

Configurar alertas (Uptime Kuma, Prometheus, etc.) para:
- ⚠️ RAM del host > 85%
- ⚠️ RAM de cualquier servicio > 90% de su límite
- ⚠️ CPU del host > 80% sostenido por 5+ min
- 🔴 Servicio con OOMKilled (Out of Memory)
- 🔴 Servicio en estado "Failed"

---

## 🛡️ Protección contra OOM (Out of Memory)

### Configuración Actual

Todos los servicios tienen:
- **Límites** (limits): Máximo absoluto que puede usar
- **Reservas** (reservations): Mínimo garantizado
- **Restart Policy**: `on-failure` con max 3 reintentos

### Si un servicio es OOMKilled

```bash
# 1. Verificar qué servicio fue killed
docker service ps monorepo-prod_backend | grep -i oom

# 2. Ver logs antes del kill
docker service logs monorepo-prod_backend --tail 200

# 3. Aumentar límite temporalmente (ejemplo: backend de 1G a 1.5G)
# Editar docker-compose.prod.yml
# Luego:
docker stack deploy -c docker-compose.prod.yml monorepo-prod

# 4. Escalar para distribuir carga
docker service scale monorepo-prod_backend=2
```

---

## 📋 Checklist de Despliegue

### Antes de Desplegar a Staging/Prod

- [ ] Verificar RAM disponible del host: `free -h`
- [ ] Calcular RAM total que usarán los servicios (ver tabla arriba)
- [ ] Dejar al menos 30% de RAM libre para el sistema
- [ ] Verificar que no hay procesos ajenos consumiendo RAM
- [ ] Decidir si habilitar Flowise según necesidad
- [ ] Planificar escalado inicial (1 réplica o más)

### Durante el Despliegue

- [ ] Monitorear con `docker stats` en tiempo real
- [ ] Verificar health checks: `docker service ls`
- [ ] Revisar logs de cada servicio
- [ ] Probar funcionalidad básica de cada microservicio

### Post-Despliegue

- [ ] Verificar uso de RAM estabilizado (< 70% del host)
- [ ] Configurar alertas de monitoreo
- [ ] Documentar configuración actual (réplicas, recursos)
- [ ] Establecer plan de escalado para próximas semanas

---

## 🔗 Documentos Relacionados

- **[Ambientes](./ENVIRONMENTS.md)** - Configuración por ambiente
- **[CI/CD Pipeline](./CICD_PIPELINE_3_SERVICES.md)** - Flujo de despliegue
- **[Manual Operativo](./MANUAL_OPERATIVO_MICROSYST.md)** - Manual operativo completo

---

## 💡 Notas Finales

1. **Flowise es opcional**: Solo habilitarlo si se necesita procesamiento de IA. En staging, considerar apuntar a Flowise de producción para ahorrar recursos.

2. **PostgreSQL NO se escala**: Es un servicio con estado (stateful). Para alta disponibilidad, considerar PostgreSQL con replicación (fuera del scope actual).

3. **Redis NO se escala**: Similar a PostgreSQL. Para Redis en cluster, requ iere configuración diferente.

4. **Desarrollo flexible**: En desarrollo, usa DB externa (10.3.0.244) si no quieres consumir RAM local.

5. **Monitoreo es clave**: Sin monitoreo activo, es imposible saber cuándo escalar. Configurar Uptime Kuma + Sentry como mínimo.

6. **Staging = Producción reducida**: Staging debe ser una réplica de producción pero con menos réplicas y recursos. Nunca testear en staging con configuraciones que no se usen en producción.

---

**Última revisión**: 8 Octubre 2025  
**Responsable**: DevOps/Back (SSR)  
**Frecuencia de actualización**: Trimestral o cuando cambie infraestructura

