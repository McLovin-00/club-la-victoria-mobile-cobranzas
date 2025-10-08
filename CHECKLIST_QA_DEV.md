# Checklist QA en DEV

> **Responsable**: PM/Analista de Calidad  
> **Objetivo**: Validar funcionalidad en ambiente DEV antes de promover a Staging

**Cuándo usar**: Después de que una PR fue mergeada a `main` y deployada automáticamente a DEV

---

## 📋 Checklist de Validación DEV

### 1. Pre-validación

- [ ] Deploy a DEV completado exitosamente (verificar en GitHub Actions)
- [ ] Servicios levantados (verificar `/health` endpoints)
- [ ] No hay errores críticos en Sentry (últimos 15 minutos)

**URLs DEV**:
- Frontend: [URL de DEV]
- Backend: [URL de DEV]/health
- Documentos: [URL de DEV]/health

### 2. Criterios de Aceptación

- [ ] Revisé la User Story y sus Criterios de Aceptación (CA)
- [ ] Ejecuté **cada CA** paso a paso
- [ ] Documenté los resultados (✅ pasa / ❌ falla)

**Plantilla de validación de CA**:
```
CA-1: [Descripción]
- Paso 1: [Resultado]
- Paso 2: [Resultado]
- Veredicto: ✅ / ❌

CA-2: [Descripción]
...
```

### 3. Smoke Testing Básico

- [ ] Login funciona correctamente
- [ ] Navegación principal sin errores
- [ ] Formularios validan correctamente
- [ ] Mensajes de error son claros y en español
- [ ] Carga de datos es razonable (sin timeouts)

### 4. Pruebas Funcionales

- [ ] Flujo feliz completo funciona
- [ ] Validaciones de formularios funcionan
- [ ] Mensajes de éxito/error se muestran correctamente
- [ ] Datos se persisten correctamente (refresh de página)
- [ ] Permisos por rol funcionan (si aplica)

### 5. Pruebas de Regresión (Smoke)

- [ ] Funcionalidad relacionada NO se rompió
- [ ] Módulos principales funcionan:
  - [ ] Autenticación
  - [ ] Dashboard principal
  - [ ] [Módulo A]
  - [ ] [Módulo B]

### 6. UI/UX

- [ ] Diseño responsive (desktop, tablet, mobile)
- [ ] Textos en español, sin placeholders en inglés
- [ ] Botones tienen estados (hover, disabled, loading)
- [ ] Spinners/loaders en acciones asíncronas
- [ ] Sin errores de consola en DevTools
- [ ] Accesibilidad básica (navegación por teclado, contraste)

### 7. Casos Edge

- [ ] ¿Qué pasa con campos vacíos?
- [ ] ¿Qué pasa con datos inválidos?
- [ ] ¿Qué pasa si el servidor responde error?
- [ ] ¿Qué pasa con caracteres especiales (ñ, tildes, emojis)?
- [ ] ¿Qué pasa si no tengo permisos?

### 8. Performance Básico

- [ ] Páginas cargan en < 3 segundos
- [ ] No hay requests infinitos en Network tab
- [ ] No hay memory leaks evidentes

### 9. Registro de Hallazgos

**Si encuentro bugs**:

- [ ] Creé issue con plantilla de bug
- [ ] Incluí pasos para reproducir
- [ ] Agregué capturas/video
- [ ] Asigné prioridad (crítico/alto/medio/bajo)
- [ ] Linkeé al PR original

**Plantilla de Bug**:
```markdown
## Descripción
[Qué está mal]

## Pasos para reproducir
1. Ir a...
2. Hacer clic en...
3. Observar...

## Resultado esperado
[Qué debería pasar]

## Resultado actual
[Qué pasa realmente]

## Evidencias
[Screenshots/video]

## Ambiente
- Ambiente: DEV
- Navegador: Chrome 118
- Fecha: YYYY-MM-DD HH:mm
```

### 10. Datos de Prueba

- [ ] Usé los datos de prueba especificados en la historia
- [ ] Si no había datos, los preparé y los documenté
- [ ] Dejé el ambiente limpio para próximas pruebas (si aplica)

---

## ✅ Veredicto Final

### Aprobado (pasa a "Listo p/Staging")

- [ ] Todos los CA cumplen
- [ ] No hay bugs críticos
- [ ] Smoke test pasó
- [ ] Documenté hallazgos menores (si los hay)
- [ ] Actualicé estado en tablero → **"Listo p/Staging"**

### Rechazado (vuelve a "En curso")

- [ ] Documenté bugs encontrados
- [ ] Creé issues para cada bug
- [ ] Notifiqué al developer responsable
- [ ] Actualicé estado en tablero → **"En curso"** con comentario

---

## 📊 Reporte de QA (Opcional)

```markdown
## Reporte QA DEV - [Feature Name]

**Fecha**: YYYY-MM-DD  
**Tester**: [Nombre]  
**PR**: #XXX

### Criterios de Aceptación
- CA-1: ✅
- CA-2: ✅
- CA-3: ❌ (ver issue #YYY)

### Smoke Test: ✅ Aprobado

### Bugs Encontrados
- 🔴 Crítico: [Issue #AAA]
- 🟡 Menor: [Issue #BBB]

### Veredicto
- ✅ Aprobado para Staging
- ❌ Requiere correcciones

### Notas
[Comentarios adicionales]
```

---

**Tiempo estimado**: 15-30 minutos por feature (según complejidad)  
**Frecuencia**: Cada PR mergeada a `main` con funcionalidad nueva  
**Última actualización**: 8 Octubre 2025  
**Alineado con**: Manual Operativo Microsyst

