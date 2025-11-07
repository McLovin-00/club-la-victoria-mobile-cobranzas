# Análisis: Portal de Cliente con Búsqueda por Patentes

## 📋 Resumen del Requerimiento

El cliente necesita una funcionalidad que le permita:

1. **Consultar** cualquier empresa transportista, chofer, camión, acoplado o equipo
2. **Insertar un listado de patentes** (copiando y pegando) para visualizar el estado de documentación de todos los equipos asociados
3. **Ver el estado de la documentación** de todos los equipos relacionados con esas patentes
4. **Descargar toda la documentación** en un archivo ZIP con estructura específica:
   - **Carpeta raíz**: Patente del camión
   - **Subcarpetas dentro**:
     - `CUIT_[empresa]` → Documentos de empresa transportista
     - `DNI_[chofer]` → Documentos del chofer
     - `CAMION_[patente]` → Documentos del camión
     - `ACOPLADO_[patente]` → Documentos del acoplado (si existe)
5. **Visualizar documentos sin descargar** (preview) desde el listado

---

## ✅ Funcionalidades Existentes

### Backend (Microservicio Documentos)

#### **Modelos de Datos**
- ✅ `EmpresaTransportista` - Empresas con CUIT
- ✅ `Chofer` - Choferes con DNI normalizado
- ✅ `Camion` - Camiones con patente normalizada
- ✅ `Acoplado` - Acoplados con patente normalizada
- ✅ `Equipo` - Agrupa chofer + camión + acoplado (opcional)
- ✅ `Cliente` - Clientes que pueden tener requisitos documentales
- ✅ `Document` - Documentos subidos con estado y expiración
- ✅ `DocumentTemplate` - Plantillas de documentos por tipo de entidad

#### **Endpoints Disponibles**

| Endpoint | Método | Funcionalidad | Estado |
|----------|--------|---------------|--------|
| `/api/docs/search` | GET | Buscar equipos por DNI, patente camión/acoplado | ✅ Existe |
| `/api/docs/clients/:clienteId/equipos` | GET | Listar equipos de un cliente | ✅ Existe |
| `/api/docs/clients/equipos/:equipoId/documentos` | GET | Listar documentos de un equipo | ✅ Existe |
| `/api/docs/clients/equipos/:equipoId/zip` | GET | Descargar ZIP de documentos de un equipo | ✅ Existe (estructura simple) |
| `/api/docs/documents/:id/preview` | GET | Obtener URL de preview de documento | ✅ Existe |
| `/api/docs/documents/:id/download` | GET | Descargar documento individual | ✅ Existe |
| `/api/docs/compliance/equipos/:id` | GET | Estado de cumplimiento documental del equipo | ✅ Existe |
| `/api/docs/maestros/empresas` | GET | Listar empresas transportistas | ✅ Existe |
| `/api/docs/maestros/choferes` | GET | Listar choferes | ✅ Existe |
| `/api/docs/maestros/camiones` | GET | Listar camiones | ✅ Existe |
| `/api/docs/maestros/acoplados` | GET | Listar acoplados | ✅ Existe |

#### **Servicios Disponibles**
- ✅ `ComplianceService` - Evalúa estado de cumplimiento documental
- ✅ `EquipoService` - Gestión de equipos
- ✅ `MinioService` - Almacenamiento y descarga de archivos

### Frontend

#### **Páginas Existentes**
- ✅ `ClientePortalPage` - Portal del cliente con visualización de equipos
  - Selector de cliente
  - Filtrado por estado (VIGENTE, PRÓXIMO, VENCIDO, FALTANTE)
  - Visualización de equipos con estado de documentación
  - Descarga de ZIP por equipo
  - Exportación a CSV

#### **Componentes y Funcionalidades**
- ✅ Visualización de estado de documentos con badges de colores
- ✅ Expansión de tarjetas de equipo para ver detalles
- ✅ Descarga de documentos individuales
- ✅ Indicadores visuales de estado (iconos y colores)

---

## ❌ Funcionalidades Faltantes

### 1. **Input de Múltiples Patentes** ❌
**Requerimiento**: Permitir al cliente copiar y pegar un listado de patentes de camiones.

**Estado**: No existe

**Necesidad**:
- Campo de texto multi-línea para pegar patentes (una por línea)
- Validación y normalización de patentes
- Botón de búsqueda masiva

---

### 2. **Búsqueda Masiva por Patentes** ❌
**Requerimiento**: Buscar todos los equipos asociados a un listado de patentes.

**Estado**: Existe búsqueda individual (`/api/docs/search`), pero no búsqueda masiva.

**Necesidad**:
- **Nuevo endpoint**: `POST /api/docs/clients/bulk-search`
  - Recibe array de patentes
  - Retorna todos los equipos relacionados con esas patentes
  - Incluye información de empresa transportista, chofer, documentos

```typescript
// Ejemplo de request
POST /api/docs/clients/bulk-search
{
  "patentes": ["AA123BB", "CC456DD", "EE789FF"],
  "clienteId": 1 // opcional, para filtrar por cliente
}

// Ejemplo de response
{
  "success": true,
  "data": {
    "equipos": [
      {
        "id": 1,
        "camionPatente": "AA123BB",
        "choferDni": "12345678",
        "acopladoPatente": "ZZ999XX",
        "empresaTransportista": { "id": 1, "cuit": "20123456789", "razonSocial": "..." },
        "documentacion": {
          "empresa": [...],
          "chofer": [...],
          "camion": [...],
          "acoplado": [...]
        }
      }
    ],
    "notFound": ["XX999YY"] // patentes no encontradas
  }
}
```

---

### 3. **ZIP con Estructura Específica** ❌
**Requerimiento**: Generar ZIP organizado por patente de camión con subcarpetas por tipo de entidad.

**Estado**: Existe `GET /api/docs/clients/equipos/:equipoId/zip` pero con estructura simple (carpetas por tipo: chofer/camion/acoplado).

**Necesidad**:
- **Nuevo endpoint**: `POST /api/docs/clients/bulk-zip`
  - Recibe array de IDs de equipo o array de patentes
  - Genera ZIP con estructura solicitada:
```
ZIP Root/
├── AA123BB/                          # Patente del camión
│   ├── EMPRESA_20123456789/          # CUIT de empresa transportista
│   │   ├── habilitacion_arca.pdf
│   │   └── inscripcion_afip.pdf
│   ├── CHOFER_12345678/              # DNI del chofer
│   │   ├── dni_frente.pdf
│   │   ├── dni_dorso.pdf
│   │   └── licencia_conducir.pdf
│   ├── CAMION_AA123BB/               # Patente del camión
│   │   ├── tarjeta_verde.pdf
│   │   ├── vtv.pdf
│   │   └── seguro.pdf
│   └── ACOPLADO_ZZ999XX/             # Patente del acoplado (si existe)
│       ├── tarjeta_verde.pdf
│       └── vtv.pdf
├── CC456DD/
│   └── ...
```

**Implementación sugerida**:
```typescript
// apps/documentos/src/routes/clients.routes.ts
router.post('/bulk-zip', 
  authenticate, 
  validate(bulkZipSchema), 
  ClientsController.generateBulkZip
);

// apps/documentos/src/controllers/clients.controller.ts
static async generateBulkZip(req: AuthRequest, res: Response) {
  const { equipoIds, patentes } = req.body;
  // 1. Si se reciben patentes, buscar equipos
  // 2. Para cada equipo, obtener documentos de todas las entidades
  // 3. Construir ZIP con estructura de carpetas
  // 4. Stream del ZIP al cliente
}
```

---

### 4. **Visualización de Documentos (Preview)** ⚠️ 
**Requerimiento**: Poder ver documentos sin descargarlos.

**Estado**: 
- ✅ Backend tiene endpoint `/api/docs/documents/:id/preview`
- ❌ Frontend no implementa preview modal/viewer

**Necesidad**:
- Componente modal para visualizar PDFs/imágenes
- Integrar endpoint de preview en el frontend
- Botón de "👁️ Visualizar" en cada documento

**Implementación sugerida**:
```typescript
// Nuevo componente: DocumentPreviewModal.tsx
export const DocumentPreviewModal = ({ documentId, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState<string>();
  
  useEffect(() => {
    fetch(`/api/docs/documents/${documentId}/preview`)
      .then(r => r.json())
      .then(data => setPreviewUrl(data.url));
  }, [documentId]);

  return (
    <Dialog open onClose={onClose}>
      {previewUrl && (
        <iframe src={previewUrl} width="100%" height="600px" />
      )}
    </Dialog>
  );
};
```

---

### 5. **Vista de Consulta de Maestros** ⚠️
**Requerimiento**: Consultar empresas transportistas, choferes, camiones, acoplados.

**Estado**:
- ✅ Backend tiene endpoints de maestros
- ❌ Frontend del portal cliente no tiene acceso a estas consultas

**Necesidad**:
- Agregar tabs o secciones en el portal del cliente para consultar:
  - 📋 Empresas Transportistas
  - 👤 Choferes
  - 🚛 Camiones
  - 🚚 Acoplados
- Filtros por nombre, CUIT/DNI, patente, estado activo

---

## 🎯 Plan de Implementación Mínimo

### **Prioridad 1: Búsqueda por Patentes y ZIP Mejorado** 🔥

#### Backend
1. **Nuevo endpoint de búsqueda masiva**
   - `POST /api/docs/clients/bulk-search`
   - Archivo: `apps/documentos/src/routes/clients.routes.ts`
   - Controlador: `apps/documentos/src/controllers/clients.controller.ts`
   - Servicio: `apps/documentos/src/services/equipo.service.ts`

2. **Nuevo endpoint de ZIP con estructura específica**
   - `POST /api/docs/clients/bulk-zip`
   - Archivo: `apps/documentos/src/routes/clients.routes.ts`
   - Controlador: `apps/documentos/src/controllers/clients.controller.ts`
   - Utilizar servicio existente: `minioService`

#### Frontend
3. **Nuevo componente: BulkPatentesSearch**
   - TextArea para pegar patentes
   - Botón de búsqueda
   - Validación y normalización de patentes
   - Archivo: `apps/frontend/src/features/documentos/components/BulkPatentesSearch.tsx`

4. **Actualizar ClientePortalPage**
   - Integrar componente `BulkPatentesSearch`
   - Mostrar resultados de búsqueda masiva
   - Botón "Descargar Todo" que llame al nuevo endpoint de bulk-zip

---

### **Prioridad 2: Preview de Documentos** 🟡

#### Frontend
5. **Nuevo componente: DocumentPreviewModal**
   - Modal para visualizar PDFs/imágenes
   - Integración con endpoint `/api/docs/documents/:id/preview`
   - Archivo: `apps/frontend/src/features/documentos/components/DocumentPreviewModal.tsx`

6. **Actualizar DocumentoRow en ClientePortalPage**
   - Agregar botón "👁️ Visualizar"
   - Abrir modal de preview

---

### **Prioridad 3: Consulta de Maestros** 🟢

#### Frontend
7. **Nueva sección en ClientePortalPage o nueva página**
   - Tabs para: Empresas Transportistas, Choferes, Camiones, Acoplados
   - Reutilizar endpoints existentes de maestros
   - Tablas con filtros básicos
   - Archivo: `apps/frontend/src/features/documentos/pages/ClienteMaestrosPage.tsx`

---

## 📦 Archivos a Crear/Modificar

### Crear (Backend)
```
apps/documentos/src/
├── controllers/
│   └── clients.controller.ts (MODIFICAR - agregar 2 métodos)
├── services/
│   └── equipo.service.ts (MODIFICAR - agregar búsqueda masiva)
└── schemas/
    └── validation.schemas.ts (MODIFICAR - agregar schemas de validación)
```

### Crear (Frontend)
```
apps/frontend/src/features/documentos/
├── components/
│   ├── BulkPatentesSearch.tsx (CREAR)
│   └── DocumentPreviewModal.tsx (CREAR)
├── pages/
│   ├── ClientePortalPage.tsx (MODIFICAR)
│   └── ClienteMaestrosPage.tsx (CREAR - opcional)
└── api/
    └── documentosApiSlice.ts (MODIFICAR - agregar nuevos hooks)
```

---

## 🔐 Consideraciones de Seguridad

1. **Autorización**: El cliente solo debe ver equipos y documentos de los clientes que tiene asignados
2. **Rate Limiting**: Aplicar límite de requests para búsqueda masiva y generación de ZIPs
3. **Validación**: Validar y normalizar patentes antes de buscar
4. **Tamaño de ZIP**: Limitar cantidad de equipos en un solo ZIP (recomendado: máximo 50)
5. **Timeout**: Implementar timeout para generación de ZIPs grandes

---

## 📊 Estimación de Esfuerzo

| Tarea | Complejidad | Tiempo Estimado |
|-------|-------------|-----------------|
| Endpoint búsqueda masiva | Media | 2-3 horas |
| Endpoint ZIP estructurado | Alta | 4-5 horas |
| Componente búsqueda patentes | Baja | 1-2 horas |
| Integración en ClientePortalPage | Media | 2-3 horas |
| Componente preview modal | Baja | 1-2 horas |
| Testing e2e | Media | 2-3 horas |
| **TOTAL** | - | **12-18 horas** |

---

## 🚀 Próximos Pasos Sugeridos

### Paso 1: Validar Requerimientos
- Confirmar estructura exacta del ZIP con el cliente
- Confirmar límites de cantidad de patentes/equipos
- Definir qué documentos incluir (¿solo APROBADOS? ¿incluir vencidos?)

### Paso 2: Implementación Incremental
1. Implementar endpoint de búsqueda masiva (backend)
2. Crear componente de búsqueda (frontend)
3. Implementar endpoint de ZIP estructurado (backend)
4. Integrar descarga de ZIP en frontend
5. Agregar preview de documentos
6. Testing y ajustes

### Paso 3: Testing
- Probar con listados de 1, 10, 50 patentes
- Verificar estructura del ZIP generado
- Probar preview con diferentes tipos de documentos (PDF, imágenes)
- Probar con patentes no encontradas

---

## 💡 Recomendaciones Adicionales

### Performance
- **Caché**: Cachear resultados de búsqueda masiva por 5 minutos
- **Streaming**: Generar ZIP en streaming para evitar cargar todo en memoria
- **Paginación**: Si hay muchos equipos, paginar resultados en frontend

### UX
- **Indicadores de progreso**: Mostrar progreso al generar ZIP grande
- **Feedback visual**: Indicar patentes encontradas/no encontradas
- **Validación en tiempo real**: Normalizar y validar patentes mientras se escriben
- **Histórico**: Guardar últimas búsquedas realizadas

### Mantenibilidad
- **Tests unitarios**: Para normalización de patentes y búsqueda
- **Tests de integración**: Para generación de ZIPs
- **Logs**: Loggear búsquedas masivas y generación de ZIPs para auditoría
- **Métricas**: Tracking de uso de la funcionalidad

---

## 📝 Notas Finales

Este análisis está basado en el código existente y sigue las reglas del proyecto:
- ✅ Mínimo indispensable
- ✅ Sin sobre-ingeniería (KISS)
- ✅ Reutilización de código existente
- ✅ Validación con zod
- ✅ Seguridad con JWT RS256
- ✅ Logs con Winston
- ✅ Tests obligatorios

**Conclusión**: La implementación es viable y relativamente directa, aprovechando la infraestructura existente. El mayor esfuerzo está en el endpoint de generación de ZIP con estructura específica.

