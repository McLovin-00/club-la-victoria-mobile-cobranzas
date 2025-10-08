# Procedimientos Técnicos - Monorepo BCA

> Procedimientos paso a paso para operaciones técnicas complejas o infrecuentes

---

## 🎯 Cuándo Usar Estos Procedimientos

Usa estos procedimientos cuando:
- ✅ La operación tiene > 20 pasos
- ✅ Se ejecuta infrecuentemente (< 1 vez/mes)
- ✅ Un error podría causar pérdida de datos o downtime
- ✅ Requiere coordinación entre múltiples sistemas

---

## 📂 Procedimientos Disponibles

### 1. [Setup de Entorno de Desarrollo](./PROCEDURE_DEV_ENVIRONMENT_SETUP.md)
**Duración**: 2-3 horas  
**Cuándo usar**: Nuevo desarrollador configura su laptop desde cero  
**Incluye**:
- Instalación de herramientas (Git, Node, Docker, Cursor AI, HeidiSQL)
- Configuración de Git y SSH
- Clonar repositorio e instalar dependencias
- Levantar infraestructura local (PostgreSQL, Redis, MinIO)
- Configurar BD y ejecutar migrations
- Levantar aplicaciones (Backend, Frontend, Documentos)
- Troubleshooting común

---

### 2. [Restore de Base de Datos](./PROCEDURE_DATABASE_RESTORE.md)
**Duración**: 30-60 minutos  
**Severidad**: CRÍTICO  
**Cuándo usar**:
- Pérdida de datos crítica
- Disaster recovery testing (mensual)
- Migración a nuevo servidor

**Incluye**:
- Backup preventivo (OBLIGATORIO)
- Detención de servicios
- Validación de archivo de backup
- Drop y recreación de BD
- Restore paso a paso
- Validación exhaustiva
- Reinicio de servicios
- Health checks
- Rollback (si algo falla)

---

## 📋 Template para Nuevo Procedimiento

Si necesitas crear un nuevo procedimiento:

```markdown
# Procedimiento: [Nombre del Procedimiento]

> **Versión**: 1.0
> **Fecha**: [Fecha]
> **Tiempo estimado**: [X minutos/horas]
> **Severidad**: [Bajo/Medio/Alto/CRÍTICO]
> **Roles**: [Quién puede ejecutarlo]

## ⚠️ ADVERTENCIA (si aplica)
[Explicar riesgos y cuándo NO ejecutar]

## 🎯 Objetivo
[Qué logra este procedimiento]

## 📋 Prerrequisitos
- [ ] Acceso X
- [ ] Herramienta Y
- [ ] Información Z

## 📝 Procedimiento

### Paso 1: [Nombre del Paso] (X min)
[Descripción detallada]
```bash
# Comandos
```

### Paso 2: [Siguiente Paso] (X min)
...

## 🚨 Rollback (si algo falla)
[Cómo deshacer los cambios]

## 🐛 Troubleshooting
[Problemas comunes y soluciones]

## ✅ Checklist Final
- [ ] Item 1
- [ ] Item 2

---

**Última actualización**: [Fecha]
**Mantenido por**: [Rol]
```

---

## 🔗 Documentos Relacionados

### Runbooks
- **[/docs/runbooks/](../runbooks/)** - Guías de respuesta a incidentes específicos

### Onboarding
- **[/docs/onboarding/](../onboarding/)** - Checklists de integración por rol

### Roles
- **[/docs/roles/](../roles/)** - Guías operativas por rol

### Checklists
- **CHECKLIST_DESARROLLO.md** - Checklist de desarrollo
- **CHECKLIST_DEPLOY_PROD.md** - Checklist de deploy a producción
- **CHECKLIST_INCIDENTE.md** - Checklist de manejo de incidentes

---

## 💡 Mejores Prácticas

### Al Escribir Procedimientos

1. **Sé específico**: Comandos exactos, no "ejecuta algo"
2. **Incluye tiempos**: Cada paso debe tener duración estimada
3. **Agrega screenshots**: Si hay UI involucrada
4. **Prueba el procedimiento**: Ejecútalo tú mismo antes de publicar
5. **Incluye rollback**: Siempre un plan B si algo falla
6. **Actualiza regularmente**: Si el proceso cambia, actualiza el doc

### Al Ejecutar Procedimientos

1. **Lee TODO primero**: No ejecutes sin leer completo
2. **Verifica prerrequisitos**: Asegúrate de tener todo
3. **Sigue el orden**: No saltes pasos
4. **Documenta desvíos**: Si algo no funciona como dice el doc, anótalo
5. **Feedback**: Si encuentras errores, repórtalos o abre PR

---

## 📊 Estadísticas de Uso

| Procedimiento | Ejecutado (último mes) | Tiempo promedio | Errores reportados |
|---------------|------------------------|-----------------|-------------------|
| Dev Setup | 2 veces | 2.5h | 0 |
| DB Restore | 1 vez (testing) | 45 min | 0 |

**Actualizado**: 8 Octubre 2025

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: Tech Lead + DevOps Engineer

