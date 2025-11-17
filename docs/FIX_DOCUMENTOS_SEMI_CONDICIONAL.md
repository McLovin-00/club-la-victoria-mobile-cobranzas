# Fix: Sección de Documentos del Semi (Condicional)

**Fecha:** 2025-11-16  
**Issue:** La sección de documentos del Semi/Acoplado no aparecía correctamente

---

## 🐛 Problema Reportado

El usuario notó que la sección **"DOCUMENTOS SEMI (Acoplado)"** no aparecía en el formulario de Alta Completa de Equipo, aunque la sección de datos del Semi sí estaba visible.

---

## 🔍 Causa Raíz

La sección de documentos del Semi **SÍ estaba implementada**, pero tenía una condición muy estricta que impedía su visualización:

```typescript
// ❌ Condición original (muy restrictiva)
{semiPatente && semiPatente.length >= 5 && (
  <SeccionDocumentos
    titulo='🚚 DOCUMENTOS SEMI (Acoplado)'
    ...
  />
)}
```

**Problema:** Requería que la patente tuviera **al menos 5 caracteres**, lo cual podía no cumplirse durante el llenado del formulario o con patentes cortas.

---

## ✅ Solución Implementada

Se ajustó la condición para que la sección aparezca **tan pronto como se ingrese cualquier texto** en el campo de patente del Semi:

```typescript
// ✅ Condición mejorada (más flexible)
{semiPatente && semiPatente.trim().length > 0 && (
  <SeccionDocumentos
    titulo='🚚 DOCUMENTOS SEMI (Acoplado)'
    ...
  />
)}
```

### Comportamiento Actual

1. **Si NO se ingresa patente de Semi:**
   - No aparece la sección de documentos
   - El equipo se crea solo con: Empresa + Chofer + Tractor (14 documentos obligatorios)

2. **Si SE ingresa patente de Semi (cualquier texto):**
   - ✅ Aparece mensaje informativo en la sección de datos del Semi
   - ✅ Una vez completados los datos básicos, aparece la sección de documentos del Semi
   - El equipo requiere: Empresa + Chofer + Tractor + Semi (19 documentos obligatorios)

---

## 🎯 Cambios en Código

**Archivo:** `/apps/frontend/src/features/equipos/pages/AltaEquipoCompletaPage.tsx`

### Cambio 1: Condición de visualización de documentos

```typescript
// Línea ~494
{semiPatente && semiPatente.trim().length > 0 && (
  <SeccionDocumentos
    titulo='🚚 DOCUMENTOS SEMI (Acoplado)'
    templates={templatesPorTipo.ACOPLADO}
    entityType='ACOPLADO'
    entityId={semiId}
    dadorCargaId={empresaId || 0}
    onUploadSuccess={handleUploadSuccess}
    uploadMutation={uploadDocument}
    disabled={!datosBasicosCompletos}
    uploadedTemplateIds={uploadedTemplateIds}
  />
)}
```

### Cambio 2: Mensaje informativo más claro

```typescript
// Línea ~436
{semiPatente && semiPatente.trim().length > 0 && (
  <div className='mt-3 bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-800'>
    ℹ️ Al completar los datos básicos, aparecerá la sección de documentos del semi (5 documentos obligatorios)
  </div>
)}
```

---

## 📊 Distribución de Documentos

### Sin Semi (14 documentos)
- 🏢 Empresa Transportista: 4 docs
- 👤 Chofer: 5 docs
- 🚛 Tractor: 5 docs

### Con Semi (19 documentos)
- 🏢 Empresa Transportista: 4 docs
- 👤 Chofer: 5 docs
- 🚛 Tractor: 5 docs
- 🚚 Semi: 5 docs

---

## 🚀 Despliegue

```bash
# Servidor: 10.3.0.243
# Fecha: 2025-11-16

# 1. Copiar archivo actualizado
scp AltaEquipoCompletaPage.tsx administrador@10.3.0.243:~/monorepo-bca/...

# 2. Reconstruir imagen
docker build --no-cache -f Dockerfile.frontend \
  --build-arg VITE_API_URL=http://10.3.0.243:4800 \
  ... \
  -t bca/frontend:latest ~/monorepo-bca

# 3. Reiniciar container
docker compose up -d frontend
```

---

## ✅ Estado

- ✅ Condición ajustada de 5 caracteres a "cualquier texto"
- ✅ Mensaje informativo mejorado
- ✅ Build exitoso
- ✅ Desplegado en 10.3.0.243
- ✅ Comportamiento validado

---

## 🧪 Cómo Probar

1. Ir a: `http://10.3.0.243:8550/documentos/equipos/alta-completa`
2. Completar datos básicos obligatorios
3. **Dejar el campo "Patente Semi" vacío**
   - ✅ Confirmar que NO aparece sección de documentos del Semi
4. **Ingresar cualquier texto en "Patente Semi"** (ej: "DEF456")
   - ✅ Debe aparecer mensaje informativo morado
   - ✅ Al hacer scroll, debe aparecer sección "🚚 DOCUMENTOS SEMI (Acoplado)"

---

## 📝 Notas Técnicas

- La lógica de validación de documentos obligatorios ya maneja correctamente la inclusión/exclusión del Semi
- El backend ya soporta equipos con o sin Semi
- No se requieren cambios en backend o base de datos
- Es un cambio puramente de UI/UX en el frontend

