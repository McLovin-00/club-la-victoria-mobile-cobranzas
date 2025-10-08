# Scripts de Automatización DevOps - Monorepo BCA

> Scripts para automatizar tareas operativas y liberar tiempo del equipo DevOps

---

## 📜 Scripts Disponibles

### 1. `health-check-all.sh`
**Propósito**: Verificar estado de salud de todos los servicios en todos los ambientes

**Uso**:
```bash
# Verificar todos los ambientes
./scripts/health-check-all.sh all

# Verificar solo producción
./scripts/health-check-all.sh prod

# Verificar solo staging
./scripts/health-check-all.sh staging

# Verificar solo DEV
./scripts/health-check-all.sh dev
```

**Salida**:
- ✅ HTTP 200 = Servicio saludable
- ❌ Otro código o timeout = Servicio con problemas

**Automatización sugerida**:
```bash
# Agregar a cron: verificar cada 5 minutos
*/5 * * * * /home/administrador/monorepo-bca/scripts/health-check-all.sh prod >> /var/log/health-check.log 2>&1
```

---

### 2. `monitor-resources.sh`
**Propósito**: Monitorear uso de CPU, RAM, Disco y generar alertas

**Uso**:
```bash
# Monitoreo básico
./scripts/monitor-resources.sh

# Con alertas a Slack
./scripts/monitor-resources.sh --slack-webhook https://hooks.slack.com/services/YOUR/WEBHOOK
```

**Umbrales por defecto**:
- CPU: 80%
- RAM: 85%
- Disco: 90%

**Automatización sugerida**:
```bash
# Agregar a cron: monitoreo cada 15 minutos
*/15 * * * * /home/administrador/monorepo-bca/scripts/monitor-resources.sh --slack-webhook $SLACK_WEBHOOK >> /var/log/resource-monitor.log 2>&1
```

---

### 3. `cleanup-docker.sh`
**Propósito**: Limpiar recursos Docker no utilizados

**Uso**:
```bash
# Limpieza estándar (solo dangling images, stopped containers)
./scripts/cleanup-docker.sh

# Ver qué se limpiaría sin ejecutar (dry-run)
./scripts/cleanup-docker.sh --dry-run

# Limpieza agresiva (TODAS las imágenes no usadas)
./scripts/cleanup-docker.sh --aggressive

# Dry-run agresivo
./scripts/cleanup-docker.sh --dry-run --aggressive
```

**Qué limpia**:
- ✅ Contenedores detenidos
- ✅ Imágenes dangling (sin tag)
- ✅ Volúmenes no utilizados ⚠️ **Cuidado: elimina datos**
- ✅ Redes no utilizadas
- ✅ Build cache

**Automatización sugerida**:
```bash
# Agregar a cron: limpieza semanal (domingos a las 3 AM)
0 3 * * 0 /home/administrador/monorepo-bca/scripts/cleanup-docker.sh >> /var/log/docker-cleanup.log 2>&1
```

---

### 4. `daily-report.sh`
**Propósito**: Generar reporte diario del estado del sistema

**Uso**:
```bash
# Reporte básico (solo muestra en consola)
./scripts/daily-report.sh

# Enviar a Slack
./scripts/daily-report.sh --slack-webhook https://hooks.slack.com/services/YOUR/WEBHOOK

# Enviar por email
./scripts/daily-report.sh --email devops@microsyst.com

# Ambos
./scripts/daily-report.sh --slack-webhook $SLACK_WEBHOOK --email devops@microsyst.com
```

**Contenido del reporte**:
- 🖥️ System uptime y load
- 💾 Uso de CPU, RAM, Disco
- 🐳 Estado de servicios Docker
- 🏥 Health checks de aplicaciones
- 🐛 Errores en últimas 24h
- 💾 Status de backups
- 🔒 Actualizaciones de seguridad pendientes
- ⚠️ Alertas activas

**Automatización sugerida**:
```bash
# Agregar a cron: reporte diario a las 9 AM
0 9 * * * /home/administrador/monorepo-bca/scripts/daily-report.sh --slack-webhook $SLACK_WEBHOOK >> /var/log/daily-report.log 2>&1
```

---

### 5. `backup.sh` (Ya existente)
**Propósito**: Backup automatizado de PostgreSQL y MinIO

**Uso**: Ver documentación existente en el script

**Automatización**: Ya configurado en cron (diario 2 AM)

---

## 🚀 Quick Start

### 1. Hacer todos los scripts ejecutables
```bash
chmod +x /home/administrador/monorepo-bca/scripts/*.sh
```

### 2. Configurar variables de entorno
```bash
# Crear archivo de configuración
cat > ~/.scripts-config << 'EOF'
export SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK"
export ALERT_EMAIL="devops@microsyst.com"
EOF

# Cargar en tu shell
echo "source ~/.scripts-config" >> ~/.bashrc
source ~/.bashrc
```

### 3. Configurar cron jobs recomendados
```bash
# Editar crontab
crontab -e

# Agregar estas líneas:
# Health check cada 5 minutos
*/5 * * * * /home/administrador/monorepo-bca/scripts/health-check-all.sh prod >> /var/log/health-check.log 2>&1

# Monitor de recursos cada 15 minutos
*/15 * * * * /home/administrador/monorepo-bca/scripts/monitor-resources.sh --slack-webhook $SLACK_WEBHOOK >> /var/log/resource-monitor.log 2>&1

# Reporte diario a las 9 AM
0 9 * * * /home/administrador/monorepo-bca/scripts/daily-report.sh --slack-webhook $SLACK_WEBHOOK >> /var/log/daily-report.log 2>&1

# Limpieza Docker semanal (domingos 3 AM)
0 3 * * 0 /home/administrador/monorepo-bca/scripts/cleanup-docker.sh >> /var/log/docker-cleanup.log 2>&1

# Backup diario a las 2 AM (ya existente)
0 2 * * * /home/administrador/monorepo-bca/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 📊 Impacto Esperado

### Tiempo Ahorrado por Semana (DevOps)

| Tarea | Antes (manual) | Después (automatizado) | Ahorro |
|-------|----------------|------------------------|--------|
| Health checks diarios | 30 min | 5 min (revisar alertas) | 25 min |
| Monitoreo de recursos | 45 min | 10 min (revisar alertas) | 35 min |
| Limpieza Docker | 30 min | 5 min (revisar log) | 25 min |
| Generación de reportes | 1h | 10 min (revisar reporte) | 50 min |
| **TOTAL SEMANAL** | **~3h 45min** | **~45min** | **3 horas** |

**Ahorro mensual**: ~12 horas  
**Ahorro anual**: ~144 horas (18 días laborales)

---

## 🔧 Troubleshooting

### Script no ejecuta
```bash
# Verificar permisos
ls -la /home/administrador/monorepo-bca/scripts/*.sh

# Hacer ejecutable
chmod +x /path/to/script.sh
```

### Cron job no funciona
```bash
# Ver logs de cron
grep CRON /var/log/syslog

# Verificar que cron esté corriendo
systemctl status cron

# Testear el comando manualmente
/home/administrador/monorepo-bca/scripts/health-check-all.sh prod
```

### Alertas de Slack no llegan
```bash
# Testear webhook manualmente
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'

# Verificar que la variable está configurada
echo $SLACK_WEBHOOK
```

---

## 📈 Próximas Mejoras (Roadmap)

- [ ] Script de auto-scaling de servicios Docker basado en métricas
- [ ] Integración con Prometheus/Grafana para métricas históricas
- [ ] Script de validación de certificados SSL (alertar antes de expirar)
- [ ] Auto-rollback en caso de health checks fallidos post-deploy
- [ ] Script de análisis de logs (top errors, patrones, etc)

---

## 👥 Contribuir

Si creas un nuevo script útil:

1. Agrégalo a `/scripts/`
2. Documéntalo en este README
3. Hazlo ejecutable (`chmod +x`)
4. Agrega ejemplo de uso y cron job sugerido
5. Abre PR para revisión

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: DevOps Team

