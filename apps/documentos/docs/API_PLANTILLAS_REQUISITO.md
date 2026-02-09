# API de Plantillas de Requisito

## Descripción General

El sistema de **PlantillaRequisito** permite definir múltiples conjuntos de requisitos documentales para cada cliente. Un equipo puede asociarse a múltiples plantillas, consolidando los requisitos de todas ellas.

## Modelos de Datos

### PlantillaRequisito
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int | ID único |
| tenantEmpresaId | Int | ID del tenant |
| clienteId | Int | ID del cliente propietario |
| nombre | String(100) | Nombre de la plantilla |
| descripcion | String? | Descripción opcional |
| activo | Boolean | Si está activa |
| createdAt | DateTime | Fecha de creación |
| updatedAt | DateTime | Última actualización |

### PlantillaRequisitoTemplate
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int | ID único |
| tenantEmpresaId | Int | ID del tenant |
| plantillaRequisitoId | Int | ID de la plantilla |
| templateId | Int | ID del DocumentTemplate |
| entityType | EntityType | DADOR, EMPRESA_TRANSPORTISTA, CHOFER, CAMION, ACOPLADO |
| obligatorio | Boolean | Si es obligatorio |
| diasAnticipacion | Int | Días de anticipación para alertas |
| visibleChofer | Boolean | Si es visible para choferes |

### EquipoPlantillaRequisito
| Campo | Tipo | Descripción |
|-------|------|-------------|
| equipoId | Int | ID del equipo |
| plantillaRequisitoId | Int | ID de la plantilla |
| asignadoDesde | DateTime | Fecha de asignación |
| asignadoHasta | DateTime? | Fecha de fin (null = activa) |

---

## Endpoints

### Plantillas de Requisito

#### Listar todas las plantillas
```
GET /api/docs/plantillas?tenantEmpresaId=1&clienteId=7&activo=true
```
Query params opcionales: `clienteId`, `activo`

#### Listar plantillas de un cliente
```
GET /api/docs/clients/:clienteId/plantillas
```

#### Obtener plantilla por ID
```
GET /api/docs/plantillas/:id
```
Incluye cliente, templates y equipos asociados.

#### Crear plantilla
```
POST /api/docs/clients/:clienteId/plantillas
Content-Type: application/json

{
  "nombre": "Requisitos Combustibles",
  "descripcion": "Requisitos para transporte de combustibles",
  "activo": true
}
```

#### Actualizar plantilla
```
PUT /api/docs/plantillas/:id
Content-Type: application/json

{
  "nombre": "Nuevo nombre",
  "descripcion": "Nueva descripción",
  "activo": false
}
```

#### Eliminar plantilla
```
DELETE /api/docs/plantillas/:id
```
Solo si no tiene equipos asociados.

#### Duplicar plantilla
```
POST /api/docs/plantillas/:id/duplicate
Content-Type: application/json

{
  "nuevoNombre": "Copia de Requisitos"
}
```

---

### Templates de una Plantilla

#### Listar templates
```
GET /api/docs/plantillas/:id/templates
```

#### Agregar template
```
POST /api/docs/plantillas/:id/templates
Content-Type: application/json

{
  "templateId": 38,
  "entityType": "CAMION",
  "obligatorio": true,
  "diasAnticipacion": 30,
  "visibleChofer": true
}
```

#### Actualizar configuración de template
```
PUT /api/docs/plantillas/:id/templates/:templateConfigId
Content-Type: application/json

{
  "obligatorio": false,
  "diasAnticipacion": 15
}
```

#### Eliminar template
```
DELETE /api/docs/plantillas/:id/templates/:templateConfigId
```

---

### Consolidación de Templates

#### Obtener templates consolidados de múltiples plantillas
```
GET /api/docs/plantillas/templates/consolidated?tenantEmpresaId=1&plantillaIds=1,2,3
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "templates": [...],
    "byEntityType": {
      "CAMION": [...],
      "CHOFER": [...],
      ...
    }
  }
}
```

---

### Asociación Equipo-Plantilla

#### Listar plantillas de un equipo
```
GET /api/docs/equipos/:equipoId/plantillas?soloActivas=true
```

#### Asignar plantilla a equipo
```
POST /api/docs/equipos/:equipoId/plantillas
Content-Type: application/json

{
  "plantillaRequisitoId": 4
}
```

#### Desasignar plantilla de equipo
```
DELETE /api/docs/equipos/:equipoId/plantillas/:plantillaId
```

#### Obtener templates consolidados del equipo
```
GET /api/docs/equipos/:equipoId/plantillas/consolidated
```

#### Verificar documentos faltantes antes de asignar
```
GET /api/docs/equipos/:equipoId/plantillas/:plantillaId/check
```

---

## Migración desde sistema anterior

Los endpoints anteriores de `cliente_document_requirement` están **DEPRECATED**:
- `GET /api/docs/clients/:clienteId/requirements`
- `POST /api/docs/clients/:clienteId/requirements`
- `DELETE /api/docs/clients/:clienteId/requirements/:requirementId`

Usar las nuevas rutas de PlantillaRequisito en su lugar.

### Script de migración
El script `migrate_data.sql` crea una plantilla "Requisitos Generales" para cada cliente existente y migra:
1. Los templates de `cliente_document_requirement` a `plantilla_requisito_template`
2. Las asociaciones de `equipo_cliente` a `equipo_plantilla_requisito`

---

## Notas importantes

1. **Consolidación**: Cuando un equipo tiene múltiples plantillas, los templates se consolidan. Si el mismo template aparece en múltiples plantillas, se usa la configuración más restrictiva (obligatorio = true si alguno lo tiene).

2. **Clientes y Plantillas**: Al crear un nuevo cliente, automáticamente se crea una plantilla vacía "Requisitos Generales".

3. **Relación con Clientes**: La relación `Equipo ↔ Cliente` se mantiene para temas de propiedad/permisos. La relación `Equipo ↔ PlantillaRequisito` es específica para requisitos documentales.

4. **Historial**: La tabla `equipo_plantilla_requisito` mantiene historial con `asignadoDesde` y `asignadoHasta`.
