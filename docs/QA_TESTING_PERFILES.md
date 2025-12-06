# Plan de Pruebas QA - Perfiles y Permisos del Sistema BCA

## Información General

| Campo | Valor |
|-------|-------|
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Sistema** | BCA - Gestión Documental de Equipos de Transporte |
| **Ambiente de Pruebas** | http://10.3.0.243:8550 |

---

## 1. Perfiles del Sistema

### Jerarquía de Perfiles (de mayor a menor)

```
SUPERADMIN / ADMIN
       │
       ▼
  ADMIN_INTERNO
       │
       ▼
  DADOR_DE_CARGA
       │
       ▼
  EMPRESA_TRANSPORTISTA (TRANSPORTISTA)
       │
       ▼
     CHOFER
       │
       ▼
    CLIENTE (solo lectura)
```

### Usuarios de Prueba Sugeridos

| Perfil | Email Sugerido | Descripción |
|--------|----------------|-------------|
| ADMIN_INTERNO | admin@empresa.com | Administrador interno con acceso completo |
| DADOR_DE_CARGA | dador@empresa.com | Dador de carga que gestiona transportistas |
| TRANSPORTISTA | transportista@empresa.com | Empresa transportista con equipos |
| CHOFER | chofer@empresa.com | Chofer asociado a una transportista |
| CLIENTE | cliente@empresa.com | Cliente con acceso de solo lectura |

---

## 2. Pruebas por Perfil

### 2.1 ADMIN_INTERNO

#### 2.1.1 Acceso y Navegación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AI-001 | Login como Admin Interno | 1. Ir a /login<br>2. Ingresar credenciales<br>3. Click en Ingresar | Redirección a /portal/admin-interno |
| AI-002 | Acceso al menú lateral | 1. Click en menú hamburguesa | Ver opciones: Alta Equipo, Consulta, Aprobaciones, Usuarios, Auditoría |
| AI-003 | Navegación a Alta Completa | 1. Click en "Alta Completa de Equipo" | Acceso al formulario de alta |
| AI-004 | Navegación a Consulta | 1. Click en "Consulta de Equipos" | Acceso a búsqueda de equipos |
| AI-005 | Navegación a Aprobaciones | 1. Click en "Aprobaciones Pendientes" | Ver cola de documentos pendientes |

#### 2.1.2 Gestión de Usuarios
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AI-010 | Crear usuario Dador de Carga | 1. Ir a Usuarios<br>2. Click "Nuevo Usuario"<br>3. Seleccionar rol DADOR_DE_CARGA<br>4. Completar datos<br>5. Guardar | Usuario creado correctamente |
| AI-011 | Crear usuario Transportista | 1. Ir a Usuarios<br>2. Click "Nuevo Usuario"<br>3. Seleccionar rol TRANSPORTISTA<br>4. Seleccionar Dador de Carga<br>5. Seleccionar Empresa Transportista<br>6. Guardar | Usuario creado con asociaciones |
| AI-012 | Crear usuario Chofer | 1. Ir a Usuarios<br>2. Click "Nuevo Usuario"<br>3. Seleccionar rol CHOFER<br>4. Seleccionar cascada: Dador → Transportista → Chofer<br>5. Guardar | Usuario creado con asociaciones |
| AI-013 | Editar usuario existente | 1. Ir a Usuarios<br>2. Click en editar usuario<br>3. Modificar datos<br>4. Guardar | Datos actualizados |
| AI-014 | Verificar pre-selección en edición | 1. Editar usuario TRANSPORTISTA existente | Dador y Empresa Transportista pre-seleccionados |

#### 2.1.3 Gestión de Equipos y Documentos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| AI-020 | Crear equipo completo | 1. Alta Completa de Equipo<br>2. Crear/seleccionar empresa<br>3. Crear/seleccionar chofer<br>4. Crear/seleccionar camión<br>5. Crear/seleccionar acoplado<br>6. Subir documentos | Equipo creado con todas las entidades |
| AI-021 | Aprobar documento | 1. Ir a Aprobaciones<br>2. Seleccionar documento<br>3. Verificar datos<br>4. Click "Aprobar" | Documento estado APROBADO |
| AI-022 | Rechazar documento | 1. Ir a Aprobaciones<br>2. Seleccionar documento<br>3. Click "Rechazar"<br>4. Ingresar motivo | Documento estado RECHAZADO |
| AI-023 | Ver auditoría | 1. Ir a Auditoría<br>2. Filtrar por fecha/tipo | Ver logs de acciones |

---

### 2.2 DADOR_DE_CARGA

#### 2.2.1 Acceso y Navegación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DC-001 | Login como Dador de Carga | 1. Ir a /login<br>2. Ingresar credenciales | Redirección a /dador |
| DC-002 | Verificar menú disponible | 1. Revisar menú lateral | Ver: Alta Equipo, Consulta, Aprobaciones, Usuarios (sin Auditoría) |
| DC-003 | NO ver sección Auditoría | 1. Intentar acceder a /documentos/auditoria | Acceso denegado o no visible |

#### 2.2.2 Gestión de Usuarios (Restricciones)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DC-010 | Crear usuario Transportista | 1. Ir a Usuarios<br>2. Crear usuario TRANSPORTISTA | Permitido - Solo para su órbita |
| DC-011 | Crear usuario Chofer | 1. Ir a Usuarios<br>2. Crear usuario CHOFER | Permitido - Solo para su órbita |
| DC-012 | NO poder crear Admin Interno | 1. Ir a Usuarios<br>2. Verificar roles disponibles | ADMIN_INTERNO no disponible |
| DC-013 | NO poder crear otro Dador | 1. Ir a Usuarios<br>2. Verificar roles disponibles | DADOR_DE_CARGA no disponible |

#### 2.2.3 Visibilidad de Datos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DC-020 | Ver solo sus equipos | 1. Ir a Consulta de Equipos<br>2. Listar todos | Solo equipos asociados a este dador |
| DC-021 | Ver solo sus transportistas | 1. Ir a lista de transportistas | Solo transportistas de este dador |
| DC-022 | Aprobar documentos de su órbita | 1. Ir a Aprobaciones | Solo documentos de su dadorCargaId |

---

### 2.3 EMPRESA_TRANSPORTISTA (TRANSPORTISTA)

#### 2.3.1 Acceso y Navegación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ET-001 | Login como Transportista | 1. Ir a /login<br>2. Ingresar credenciales | Redirección a /transportista |
| ET-002 | Verificar menú disponible | 1. Revisar menú lateral | Ver: Alta Equipo, Consulta, Mis Equipos, Choferes (sin Aprobaciones ni Auditoría) |
| ET-003 | NO ver Aprobaciones | 1. Intentar acceder a /documentos/aprobacion | Acceso denegado o no visible |

#### 2.3.2 Gestión de Usuarios (Restricciones)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ET-010 | Crear usuario Chofer | 1. Ir a Usuarios<br>2. Crear usuario CHOFER | Permitido - Solo choferes de su empresa |
| ET-011 | NO poder crear Transportista | 1. Verificar roles disponibles | TRANSPORTISTA no disponible |
| ET-012 | NO poder crear Dador | 1. Verificar roles disponibles | DADOR_DE_CARGA no disponible |

#### 2.3.3 Visibilidad de Datos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| ET-020 | Ver solo sus equipos | 1. Ir a Mis Equipos | Solo equipos de su empresaTransportistaId |
| ET-021 | Ver solo sus choferes | 1. Ir a Choferes | Solo choferes de su empresa |
| ET-022 | Subir documentos de sus entidades | 1. Editar equipo propio<br>2. Subir documento | Permitido |
| ET-023 | NO ver equipos de otra transportista | 1. Buscar equipo ajeno | No encontrado o sin acceso |

---

### 2.4 CHOFER

#### 2.4.1 Acceso y Navegación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CH-001 | Login como Chofer | 1. Ir a /login<br>2. Ingresar credenciales | Redirección a /chofer |
| CH-002 | Verificar menú limitado | 1. Revisar menú lateral | Ver: Alta Equipo, Consulta, Mis Equipos (sin Usuarios, Aprobaciones, Auditoría) |
| CH-003 | NO ver gestión de Usuarios | 1. Verificar menú | Usuarios no visible |

#### 2.4.2 Gestión de Usuarios (Sin Permisos)
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CH-010 | NO poder crear usuarios | 1. Intentar acceder a /platform-users | Acceso denegado o sin opción de crear |

#### 2.4.3 Visibilidad de Datos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CH-020 | Ver solo sus equipos | 1. Ir a Mis Equipos | Solo equipos donde es el chofer |
| CH-021 | Subir sus documentos | 1. Editar equipo<br>2. Subir documento de chofer | Permitido |
| CH-022 | NO ver equipos de otro chofer | 1. Buscar equipo ajeno | No encontrado o sin acceso |

---

### 2.5 CLIENTE

#### 2.5.1 Acceso y Navegación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CL-001 | Login como Cliente | 1. Ir a /login<br>2. Ingresar credenciales | Redirección a /cliente |
| CL-002 | Ver portal de solo lectura | 1. Verificar interfaz | Mensaje "solo lectura" visible |
| CL-003 | Ver resumen de equipos | 1. En dashboard | Ver tarjetas: Total, Vigentes, Próx. vencer, Vencidos, Incompletos |

#### 2.5.2 Búsqueda y Paginación
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CL-010 | Buscar por patente | 1. Ingresar patente en búsqueda<br>2. Click Buscar o Enter | Mostrar equipo si existe |
| CL-011 | Buscar por DNI | 1. Ingresar DNI en búsqueda<br>2. Click Buscar | Mostrar equipo si existe |
| CL-012 | Listar todos | 1. Click "Listar Todos" | Mostrar equipos paginados |
| CL-013 | Navegar páginas | 1. Click Siguiente/Anterior | Cambiar página correctamente |
| CL-014 | Filtrar por estado | 1. Seleccionar estado en dropdown | Filtrar resultados |

#### 2.5.3 Detalle de Equipo y Documentos
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CL-020 | Ver detalle de equipo | 1. Click en equipo | Ver info: camión, acoplado, chofer, empresa |
| CL-021 | Ver documentos vigentes | 1. En detalle de equipo | Documentos vigentes con botón descarga activo |
| CL-022 | Ver documentos vencidos | 1. En detalle de equipo | Documentos vencidos visibles pero sin descarga |
| CL-023 | Descargar documento vigente | 1. Click en botón descarga | Archivo descargado |
| CL-024 | NO descargar documento vencido | 1. Verificar botón en doc vencido | Botón deshabilitado |
| CL-025 | Descargar ZIP completo | 1. Click "Descargar todo (ZIP)" | ZIP con estructura de carpetas |

#### 2.5.4 Estructura del ZIP
| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CL-030 | Verificar estructura ZIP | 1. Descargar ZIP<br>2. Extraer y verificar | Carpeta principal: PATENTE_CAMION |
| CL-031 | Carpeta de empresa | 1. Verificar subcarpetas | Carpeta con CUIT de empresa |
| CL-032 | Carpeta de chofer | 1. Verificar subcarpetas | Carpeta con DNI del chofer |
| CL-033 | Carpeta de camión | 1. Verificar subcarpetas | Carpeta con patente del camión |
| CL-034 | Carpeta de acoplado | 1. Verificar subcarpetas | Carpeta con patente del acoplado |
| CL-035 | Solo docs vigentes en ZIP | 1. Verificar contenido | NO incluye documentos vencidos |

---

## 3. Pruebas Cruzadas de Órbita y Ascendencia

### 3.1 Creación de Equipos - Visibilidad Jerárquica

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CR-001 | Admin crea equipo → Dador lo ve | 1. Admin crea equipo para Dador X<br>2. Login como Dador X<br>3. Buscar equipo | Dador ve el equipo |
| CR-002 | Admin crea equipo → Transportista lo ve | 1. Admin crea equipo para Transportista Y<br>2. Login como Transportista Y | Transportista ve el equipo |
| CR-003 | Dador crea equipo → Transportista lo ve | 1. Dador crea equipo con Transportista Z<br>2. Login como Transportista Z | Transportista ve el equipo |
| CR-004 | Dador crea equipo → Chofer lo ve | 1. Dador crea equipo con Chofer W<br>2. Login como Chofer W | Chofer ve el equipo |
| CR-005 | Transportista crea equipo → Chofer lo ve | 1. Transportista crea equipo con Chofer<br>2. Login como Chofer | Chofer ve el equipo |

### 3.2 Aislamiento de Órbitas

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CR-010 | Dador A NO ve equipos de Dador B | 1. Login como Dador A<br>2. Buscar equipo de Dador B | No encontrado |
| CR-011 | Transportista A NO ve equipos de Transportista B | 1. Login como Transportista A<br>2. Buscar equipo de Transportista B | No encontrado |
| CR-012 | Chofer A NO ve equipos de Chofer B | 1. Login como Chofer A<br>2. Buscar equipo de Chofer B | No encontrado |
| CR-013 | Cliente A NO ve equipos no asignados | 1. Login como Cliente A<br>2. Buscar equipo no asignado a él | No encontrado |

### 3.3 Ascendencia en Documentos

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CR-020 | Transportista sube doc → Dador lo aprueba | 1. Transportista sube documento<br>2. Login como Dador<br>3. Ir a Aprobaciones | Documento visible para aprobar |
| CR-021 | Transportista sube doc → Admin lo aprueba | 1. Transportista sube documento<br>2. Login como Admin<br>3. Ir a Aprobaciones | Documento visible para aprobar |
| CR-022 | Chofer sube doc → Transportista NO lo aprueba | 1. Chofer sube documento<br>2. Login como Transportista | Transportista NO tiene acceso a aprobaciones |
| CR-023 | Chofer sube doc → Dador lo aprueba | 1. Chofer sube documento<br>2. Login como Dador<br>3. Ir a Aprobaciones | Documento visible si está en su órbita |

### 3.4 Actualización de Documentos

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| CR-030 | Actualizar doc vigente | 1. Editar equipo<br>2. Subir nuevo documento sobre existente<br>3. Confirmar | Nuevo doc en estado PENDIENTE_APROBACION |
| CR-031 | Actualizar doc vencido | 1. Editar equipo con doc vencido<br>2. Subir nuevo documento | Nuevo doc en estado PENDIENTE_APROBACION |
| CR-032 | Verificar fecha obligatoria | 1. Intentar subir doc sin fecha vencimiento | Error: fecha requerida |
| CR-033 | Confirmación antes de subir | 1. Subir documento | Modal de confirmación aparece |
| CR-034 | Estado se actualiza automáticamente | 1. Subir y aprobar documento<br>2. Volver a ver equipo | Estado actualizado sin refresh manual |

---

## 4. Pruebas de Documentos y Estados

### 4.1 Estados de Documentos

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DOC-001 | Doc nuevo → PENDIENTE | 1. Subir documento | Estado: PENDIENTE_APROBACION |
| DOC-002 | Doc aprobado → VIGENTE | 1. Aprobar documento | Estado: APROBADO, mostrar VIGENTE |
| DOC-003 | Doc rechazado | 1. Rechazar documento con motivo | Estado: RECHAZADO |
| DOC-004 | Doc próximo a vencer | 1. Verificar doc con venc. < 30 días | Mostrar: PROXIMO_VENCER (amarillo) |
| DOC-005 | Doc vencido | 1. Verificar doc con fecha pasada | Mostrar: VENCIDO (rojo) |

### 4.2 Cálculo de Días de Anticipación

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| DOC-010 | Verificar diasAnticipacion del template | 1. Ver doc con template que tiene diasAnticipacion=45<br>2. Verificar estado | PROXIMO_VENCER si faltan ≤45 días |
| DOC-011 | Consistencia en todas las vistas | 1. Ver estado en lista de equipos<br>2. Ver estado en detalle | Mismo estado en ambas vistas |

---

## 5. Pruebas de Botón Volver

| ID | Caso de Prueba | Pasos | Resultado Esperado |
|----|----------------|-------|-------------------|
| NAV-001 | Volver desde detalle equipo (Admin) | 1. Login Admin<br>2. Ver detalle equipo<br>3. Click Volver | Volver a /portal/admin-interno |
| NAV-002 | Volver desde detalle equipo (Dador) | 1. Login Dador<br>2. Ver detalle equipo<br>3. Click Volver | Volver a /dador |
| NAV-003 | Volver desde detalle equipo (Transportista) | 1. Login Transportista<br>2. Ver detalle equipo<br>3. Click Volver | Volver a /transportista |
| NAV-004 | Volver desde detalle equipo (Chofer) | 1. Login Chofer<br>2. Ver detalle equipo<br>3. Click Volver | Volver a /chofer |
| NAV-005 | Volver desde detalle equipo (Cliente) | 1. Login Cliente<br>2. Ver detalle equipo<br>3. Click Volver | Volver a /cliente |
| NAV-006 | Volver desde aprobación | 1. Ir a detalle de aprobación<br>2. Click Volver | Volver a cola de aprobaciones |

---

## 6. Matriz de Permisos Resumida

### Funcionalidades por Perfil

| Funcionalidad | Admin | Dador | Transportista | Chofer | Cliente |
|---------------|:-----:|:-----:|:-------------:|:------:|:-------:|
| Alta de equipos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Consulta de equipos | ✅ | ✅ | ✅ | ✅ | ✅ (solo lectura) |
| Aprobación de documentos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Auditoría | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear usuario Admin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear usuario Dador | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear usuario Transportista | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear usuario Chofer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Subir documentos | ✅ | ✅ | ✅ | ✅ | ❌ |
| Descargar docs vigentes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Descargar docs vencidos | ✅ | ✅ | ✅ | ✅ | ❌ |

### Visibilidad de Datos

| Datos | Admin | Dador | Transportista | Chofer | Cliente |
|-------|:-----:|:-----:|:-------------:|:------:|:-------:|
| Todos los equipos | ✅ | ❌ | ❌ | ❌ | ❌ |
| Equipos de su dador | ✅ | ✅ | ❌ | ❌ | ❌ |
| Equipos de su transportista | ✅ | ✅ | ✅ | ❌ | ❌ |
| Equipos donde es chofer | ✅ | ✅ | ✅ | ✅ | ❌ |
| Equipos asignados | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 7. Checklist de Regresión

Antes de cada release, verificar:

- [ ] Login funciona para todos los perfiles
- [ ] Redirección correcta después del login
- [ ] Menú lateral muestra opciones correctas por perfil
- [ ] Alta de equipo completa funciona
- [ ] Búsqueda de equipos funciona
- [ ] Paginación del lado del servidor funciona (portal cliente)
- [ ] Aprobación de documentos funciona
- [ ] Rechazo de documentos funciona
- [ ] Fecha de vencimiento se guarda correctamente
- [ ] Estados de documentos se calculan correctamente
- [ ] Botones de volver funcionan correctamente
- [ ] Descarga individual de documentos funciona
- [ ] Descarga ZIP funciona con estructura correcta
- [ ] Documentos vencidos NO se pueden descargar en portal cliente
- [ ] Aislamiento de órbitas funciona (datos no se cruzan entre perfiles)

---

## 8. Reporte de Bugs

Usar el siguiente template para reportar bugs encontrados:

```
### Bug ID: BUG-XXX

**Perfil afectado:** [Admin/Dador/Transportista/Chofer/Cliente]
**Severidad:** [Crítico/Alto/Medio/Bajo]
**Caso de prueba relacionado:** [ID del caso]

**Descripción:**
[Descripción clara del bug]

**Pasos para reproducir:**
1. 
2. 
3. 

**Resultado esperado:**
[Qué debería pasar]

**Resultado actual:**
[Qué pasa realmente]

**Evidencia:**
[Screenshots, logs, etc.]

**Ambiente:**
- Navegador: 
- Fecha/Hora: 
- Usuario de prueba: 
```

---

## 9. Notas Adicionales

1. **Tokens JWT**: Después de modificar asociaciones de usuario en la BD, el usuario debe hacer logout y login nuevamente para obtener un JWT actualizado.

2. **Cache del navegador**: Si los datos no se actualizan, probar con Ctrl+Shift+R o en modo incógnito.

3. **Consistencia de estados**: El estado "Próximo a vencer" usa `diasAnticipacion` del template del documento, no un valor fijo.

4. **Estructura del ZIP del cliente**:
   ```
   PATENTE_CAMION/
   ├── CUIT_EMPRESA/
   │   └── [documentos de la empresa]
   ├── DNI_CHOFER/
   │   └── [documentos del chofer]
   ├── PATENTE_CAMION/
   │   └── [documentos del camión]
   └── PATENTE_ACOPLADO/
       └── [documentos del acoplado]
   ```

5. **Documentos vencidos en portal cliente**: Se muestran para referencia pero con botón de descarga deshabilitado y NO se incluyen en el ZIP.

