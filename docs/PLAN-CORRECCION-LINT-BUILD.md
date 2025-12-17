# Plan de Corrección de Lint y Build

**Fecha:** 17 de diciembre de 2025  
**Ambiente:** Producción  
**Objetivo:** Corregir todos los errores de lint y build sin afectar funcionalidad existente

---

## 📊 Resumen de Errores

| Módulo | Lint Errors | Lint Warnings | Build Errors | Total |
|--------|-------------|---------------|--------------|-------|
| Frontend | 12 | 0 | 0 | 12 |
| Backend | 0 | 0 | 0 | 0 ✅ |
| Documentos | 14 | 6 | 9 | 29 |
| **Total** | **26** | **6** | **9** | **41** |

---

## 🎯 Estrategia de Corrección

### Principios:
1. **No cambiar lógica de negocio** - Solo correcciones sintácticas
2. **Correcciones atómicas** - Un tipo de error a la vez
3. **Verificar después de cada grupo** - Ejecutar lint/build tras cada cambio
4. **Backup mental** - Documentar cada cambio por si hay rollback

---

## 📋 Fase 1: Frontend (Bajo Riesgo)

### 1.1 Variables no usadas (7 errores)
**Archivos afectados:**
- `src/pages/AdminInternoAltaEquipoWizardPage.tsx` (líneas 136-142)
- `src/pages/ClientePortalPage.tsx` (línea 26)

**Acción:** Prefijar con `_` las variables no usadas
```typescript
// ANTES
const { isLoadingWizardDador } = ...
// DESPUÉS
const { isLoadingWizardDador: _isLoadingWizardDador } = ...
```

**Riesgo:** ⚪ Ninguno - cambio puramente cosmético

### 1.2 let → const (1 error)
**Archivo:** `src/features/documentos/components/DocumentosPanel.tsx` (línea 276)

**Acción:** Cambiar `let entityType` a `const entityType`

**Riesgo:** ⚪ Ninguno - la variable no se reasigna

### 1.3 Bloques vacíos (2 errores)
**Archivos:**
- `src/features/documentos/components/DocumentoField.tsx` (línea 141)
- `src/pages/AdminInternoAltaEquipoWizardPage.tsx` (línea 1009)

**Acción:** Agregar comentario explicativo o eliminar bloque
```typescript
// ANTES
} catch (e) {}
// DESPUÉS
} catch (_e) { /* Error silenciado intencionalmente */ }
```

**Riesgo:** ⚪ Ninguno

### 1.4 useEffect con dependencias faltantes (2 errores)
**Archivos:**
- `src/features/documentos/components/DocumentoField.tsx` (línea 161)
- `src/pages/AdminInternoAltaEquipoWizardPage.tsx` (línea 204)

**Acción:** Analizar caso por caso:
- Si agregar la dependencia causa loop infinito → usar `// eslint-disable-next-line`
- Si es seguro → agregar la dependencia

**Riesgo:** 🟡 Bajo - requiere análisis individual

---

## 📋 Fase 2: Documentos Lint (Bajo Riesgo)

### 2.1 let → const (5 errores)
**Archivos:**
- `src/controllers/dashboard.controller.ts` (líneas 21, 210, 297, 394)
- `src/services/equipo.service.ts` (línea 284)

**Acción:** Cambiar `let` a `const`

**Riesgo:** ⚪ Ninguno

### 2.2 Variables no usadas (3 errores)
**Archivos:**
- `src/controllers/compliance.controller.ts` (línea 5)
- `src/controllers/compliance.controller.ts` (línea 825)
- `src/controllers/compliance.controller.ts` (línea 838)

**Acción:** Prefijar con `_` o eliminar si no se necesita

**Riesgo:** ⚪ Ninguno

### 2.3 Declaraciones en case blocks (5 errores)
**Archivos:**
- `src/controllers/dashboard.controller.ts` (líneas 343, 347, 351, 355)
- `src/services/document-validation.service.ts` (línea 85)

**Acción:** Envolver en llaves `{ }`
```typescript
// ANTES
case 'X':
  const value = ...;
// DESPUÉS
case 'X': {
  const value = ...;
  break;
}
```

**Riesgo:** ⚪ Ninguno

### 2.4 eslint-disable innecesarios (6 warnings)
**Acción:** Ejecutar `eslint --fix` para remover automáticamente

**Riesgo:** ⚪ Ninguno

---

## 📋 Fase 3: Documentos Build (Medio Riesgo)

### 3.1 AuditService no encontrado (3 errores)
**Archivo:** `src/controllers/documents.controller.ts` (líneas 318, 786, 929)

**Diagnóstico necesario:**
- ¿Existe AuditService en el codebase?
- ¿Falta el import?
- ¿Es código muerto que debería eliminarse?

**Acción:** Investigar y corregir según hallazgo

**Riesgo:** 🟡 Medio - puede afectar funcionalidad de auditoría

### 3.2 pdfkit no encontrado (1 error)
**Archivo:** `src/controllers/documents.controller.ts` (línea 858)

**Acción:** 
- Verificar si `pdfkit` está en package.json
- Si no está, agregar: `npm install pdfkit @types/pdfkit`

**Riesgo:** 🟡 Medio - dependencia faltante

### 3.3 Tipos incorrectos en dashboard.controller.ts (3 errores)
**Líneas:** 501, 506, 512

**Acción:** Agregar null checks o type assertions apropiadas
```typescript
// ANTES
clienteId: user?.empresaId
// DESPUÉS  
clienteId: user?.empresaId ?? undefined
```

**Riesgo:** 🟡 Medio - afecta queries de Prisma

### 3.4 Método incorrecto en QueueService (1 error)
**Archivo:** `src/controllers/documents.controller.ts` (línea 915)

**Acción:** Cambiar `enqueueDocumentValidation` → `addDocumentValidation`

**Riesgo:** 🟡 Medio - afecta cola de validación

### 3.5 Argumento de tipo incorrecto (1 error)
**Archivo:** `src/controllers/documents.controller.ts` (línea 887)

**Acción:** Convertir número a string donde corresponda

**Riesgo:** ⚪ Bajo

---

## 🚀 Orden de Ejecución

| Paso | Fase | Descripción | Riesgo | Tiempo Est. |
|------|------|-------------|--------|-------------|
| 1 | 1.1 | Frontend: Variables no usadas | ⚪ | 5 min |
| 2 | 1.2 | Frontend: let → const | ⚪ | 2 min |
| 3 | 1.3 | Frontend: Bloques vacíos | ⚪ | 3 min |
| 4 | 1.4 | Frontend: useEffect deps | 🟡 | 10 min |
| 5 | - | **VERIFICAR**: npm run lint (frontend) | - | 2 min |
| 6 | 2.1-2.4 | Documentos: Lint --fix | ⚪ | 5 min |
| 7 | - | **VERIFICAR**: npm run lint (documentos) | - | 2 min |
| 8 | 3.2 | Documentos: Instalar pdfkit | 🟡 | 3 min |
| 9 | 3.1 | Documentos: AuditService | 🟡 | 15 min |
| 10 | 3.3-3.5 | Documentos: Type fixes | 🟡 | 15 min |
| 11 | - | **VERIFICAR**: npm run build (documentos) | - | 2 min |
| 12 | - | Commit y push | - | 2 min |

**Tiempo total estimado:** ~65 minutos

---

## ✅ Criterios de Éxito

1. `npm run -w apps/frontend lint` → 0 errores
2. `npm run -w apps/frontend build` → Exitoso
3. `npm run -w apps/backend lint` → 0 errores (ya cumple)
4. `npm run -w apps/backend build` → Exitoso (ya cumple)
5. `npm run -w apps/documentos lint` → 0 errores
6. `npm run -w apps/documentos build` → Exitoso

---

## 🛑 Criterios de Rollback

Si alguna corrección causa:
- Errores en runtime
- Tests fallidos
- Comportamiento inesperado

**Acción:** `git checkout -- <archivo>` para revertir el cambio específico

---

*Plan elaborado el 17/12/2025 - Ambiente de Producción*

