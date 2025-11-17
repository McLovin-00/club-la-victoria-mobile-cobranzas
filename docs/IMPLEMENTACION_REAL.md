# Implementación Real - Aprovechando Sistema Existente

## ✅ Sistema Existente (NO modificar, REUTILIZAR)

### Backend (apps/documentos)
- ✅ `DocumentTemplate` model con CRUD completo
- ✅ `TemplatesController` con endpoints `/api/docs/templates`
- ✅ `DocumentsController` con upload de documentos
- ✅ `MinIOService` con `uploadDocument()` 
- ✅ `EquipoService` con `createFromIdentifiers()` y `ensureChofer/Camion/Acoplado`
- ✅ `MaestrosService` para CRUD de choferes, camiones, acoplados
- ✅ `EmpresaTransportista` model y servicio
- ✅ Upload con validación de `planilla` en modo `initial`
- ✅ Sistema de compliance y alertas

### Frontend (apps/frontend)
- ✅ `CargaDocumentosPage` con modo `initial` y `renewal`
- ✅ `documentosApiSlice` con RTK Query
- ✅ `useUploadDocumentMutation` 
- ✅ `useGetTemplatesQuery`

## 🎯 Lo que FALTA implementar

### 1. Seeds de Templates (Backend)
**Estado**: YA EJECUTADO (19 templates creados)
- EMPRESA_TRANSPORTISTA: 4
- CHOFER: 5
- CAMION: 5
- ACOPLADO: 5

### 2. Página "Alta Completa de Equipos" (Frontend)

**Objetivo**: Crear `AltaEquipoCompletaPage.tsx` que:
- Muestre los 19 templates organizados por sección
- Permita subir todos los documentos de una vez
- Valide que TODOS estén subidos antes de crear equipo
- Use el sistema de upload existente
- Reutilice `useUploadDocumentMutation` del slice existente

**Ubicación**: `apps/frontend/src/features/equipos/pages/AltaEquipoCompletaPage.tsx`

**Componentes a crear**:
1. `AltaEquipoCompletaPage.tsx` - Página principal
2. `SeccionDocumentos.tsx` - Sección por entityType
3. `DocumentoField.tsx` - Campo individual de upload

**Ruta**: `/equipos/alta-completa`

## 📋 Plan de Implementación Simplificado

### PASO 1: Verificar Templates en DB ✅
```bash
cd apps/documentos
DOCUMENTOS_DATABASE_URL="postgresql://evo:phoenix@localhost:5432/monorepo-bca?schema=documentos" \
npx tsx src/prisma/seeds/documentTemplates.seed.ts
```

### PASO 2: Frontend - Componente DocumentoField
**Archivo**: `apps/frontend/src/features/equipos/components/DocumentoField.tsx`
- Input file
- Preview
- Upload button
- Estado visual (pendiente/subiendo/completado)
- Campo vencimiento (si aplica)

### PASO 3: Frontend - Sección de Documentos
**Archivo**: `apps/frontend/src/features/equipos/components/SeccionDocumentos.tsx`
- Título de sección
- Lista de templates
- Renderiza DocumentoField por cada template

### PASO 4: Frontend - Página Principal
**Archivo**: `apps/frontend/src/features/equipos/pages/AltaEquipoCompletaPage.tsx`
- Form con React Hook Form + Zod
- Campos básicos (empresa, chofer, patentes)
- 4 secciones de documentos
- Progress bar
- Validación atómica
- Submit que usa `useUploadDocumentMutation` existente

### PASO 5: Registrar Ruta
**Archivo**: `apps/frontend/src/App.tsx`
- Agregar ruta `/equipos/alta-completa`

### PASO 6: Testing
- Probar flujo completo
- Verificar atomicidad
- Confirmar que se crea el equipo solo con todos los documentos

## 🔄 Flujo de Datos (Reutilizando Sistema Existente)

```
Frontend                          Backend Documentos
--------                          ------------------
AltaEquipoCompletaPage
  ↓
useUploadDocumentMutation (YA EXISTE)
  ↓
POST /api/docs/documents/upload   → DocumentsController.uploadDocument
  ↓                                    ↓
body: {                               MinIOService.uploadDocument()
  templateId,                          ↓
  entityType,                         db.document.create()
  entityId,                            ↓
  dadorCargaId,                       (si mode=initial y planilla completa)
  planilla: {                          ↓
    empresaTransportista,             EquipoService.createFromIdentifiers()
    cuitTransportista,                 ↓
    choferNombre,                     ensureChofer/Camion/Acoplado/EmpresaTransportista
    choferApellido,                    ↓
    choferDni,                        equipo.create()
    tractorPatente,
    semiPatente
  }
}
```

## ⚡ Diferencias Clave vs Plan Original

| Concepto | Plan Original | Implementación Real |
|----------|--------------|---------------------|
| **Presigned URLs** | Crear nuevo endpoint | ❌ NO USAR - usar upload directo existente |
| **Endpoint Assemble** | Crear POST `/equipos/assemble` | ❌ NO CREAR - ya existe lógica en `uploadDocument` |
| **MinIOService** | Crear servicio nuevo | ✅ REUTILIZAR existente |
| **Templates Service** | Crear nuevo | ✅ REUTILIZAR `TemplatesController` |
| **Equipos Service** | Crear nuevo | ✅ REUTILIZAR `EquipoService.createFromIdentifiers` |
| **Frontend API Slice** | Crear nuevo equiposApi | ✅ REUTILIZAR `documentosApiSlice` |

## 🎨 UI/UX de la Nueva Página

```
┌─────────────────────────────────────────────────────────────┐
│ Alta Completa de Equipo                             [Volver] │
├─────────────────────────────────────────────────────────────┤
│ Progreso: ██████████░░░░░░░░ 12/19 (63%)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ DATOS BÁSICOS                                                 │
│ ┌───────────────┬───────────────┬──────────────┐            │
│ │ Empresa (*)   │ CUIT (*)      │ Chofer DNI(*)│            │
│ └───────────────┴───────────────┴──────────────┘            │
│ ┌───────────────┬───────────────┬──────────────┐            │
│ │ Chofer Nombre │ Apellido      │ Patente (*)  │            │
│ └───────────────┴───────────────┴──────────────┘            │
│ ┌───────────────┐                                            │
│ │ Semi Patente  │  (opcional)                                │
│ └───────────────┘                                            │
│                                                               │
│ DOCUMENTOS EMPRESA TRANSPORTISTA                              │
│ ├─ [✓] Constancia IIBB           [Archivo subido]           │
│ ├─ [⏳] Formulario 931 AFIP       [Elegir archivo] [Subir]   │
│ ├─ [ ] Recibo de Sueldo          [Elegir archivo] [Subir]   │
│ └─ [ ] Boleta Sindical           [Elegir archivo] [Subir]   │
│                                                               │
│ DOCUMENTOS CHOFER                                             │
│ ├─ [✓] Acta ARCA                 [Archivo subido]           │
│ ├─ [ ] DNI                        [Elegir archivo] [Subir]   │
│ │                                 Vencimiento: [____-__-__]  │
│ ├─ [ ] Licencia                   [Elegir archivo] [Subir]   │
│ │                                 Vencimiento: [____-__-__]  │
│ ├─ [ ] Póliza A.R.T.             [Elegir archivo] [Subir]   │
│ └─ [ ] Seguro Vida                [Elegir archivo] [Subir]   │
│                                                               │
│ DOCUMENTOS TRACTOR                                            │
│ ├─ [ ] Título/Contrato            [Elegir archivo] [Subir]   │
│ ├─ [ ] Cédula                     [Elegir archivo] [Subir]   │
│ ├─ [ ] RTO                        [Elegir archivo] [Subir]   │
│ │                                 Vencimiento: [____-__-__]  │
│ ├─ [ ] Póliza Seguro              [Elegir archivo] [Subir]   │
│ └─ [ ] Certificado Libre Deuda    [Elegir archivo] [Subir]   │
│                                                               │
│ DOCUMENTOS SEMI (opcional)                                    │
│ ├─ [ ] Título/Contrato            [Elegir archivo] [Subir]   │
│ ├─ [ ] Cédula                     [Elegir archivo] [Subir]   │
│ ├─ [ ] RTO                        [Elegir archivo] [Subir]   │
│ │                                 Vencimiento: [____-__-__]  │
│ ├─ [ ] Póliza Seguro              [Elegir archivo] [Subir]   │
│ └─ [ ] Certificado Libre Deuda    [Elegir archivo] [Subir]   │
│                                                               │
│                   [Crear Equipo] (disabled hasta completar)  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Siguiente Paso

Implementar **PASO 2**: Crear `DocumentoField.tsx`

