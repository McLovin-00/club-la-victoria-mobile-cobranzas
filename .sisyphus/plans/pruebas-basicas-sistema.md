# Plan de Pruebas Básicas del Sistema BCA

> **Quick Summary**: Plan paso a paso para pruebas manuales de funcionalidades básicas del sistema (creación de usuarios por rol, login, creación de equipos, carga de documentos, validación de accesibilidad cross-role)
>
> **Deliverables**:
> - Checklist detallado para ejecutar pruebas manualmente
> - Plantilla de reporte de resultados
> - Matriz de permisos esperados por rol
> - Instrucciones para crear documentos dummy de prueba
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (manual testing por rol)
> **Critical Path**: Setup → Creación de Usuarios SUPERADMIN → Creación de otros usuarios → Pruebas por rol → Validación Cross-Role → Reporte Final

---

## Context

### Original Request
Usuario quiere un plan paso a paso para probar cosas muy básicas del sistema:
- Creación de choferes
- Creación de dadores de carga
- Creación de transportistas
- Carga de documentos
- Validar que en toda la cadena de usuarios sea accesible (ej: un chofer da de alta el equipo y los otros roles asociados pueden verlo)

### Interview Summary

**Key Discussions**:
- **Tipo de Pruebas**: Manual (humano interactuando con el frontend, no automatización)
- **Ambiente**: Testing (10.3.0.246:8560 - frontend; backend y documentos en 10.3.0.246)
- **Alcance**: Ciclo Completo E2E (crear usuarios → login → crear equipos → subir documentos → validar accesibilidad cross-role)
- **Roles a Probar**: Todos los 7 roles activos (SUPERADMIN, ADMIN, OPERATOR, ADMIN_INTERNO, DADOR_DE_CARGA, TRANSPORTISTA, CHOFER, CLIENTE)
- **Cantidad de Usuarios**: 2-3 usuarios por rol (~14-21 usuarios totales)
- **Documentos de Prueba**: Documentos Dummy (PDFs con datos ficticios, NO documentos reales)
- **Validación Cross-Role**: Todos los escenarios (aislamiento por rol, permisos denegados, jerarquía de permisos, compartición entre roles)
- **Método de Creación de Usuarios**: Usuario crea manualmente dentro de la aplicación (no scripts)
- **Resultado Esperado**: Checklist de pasos + Plantilla de reporte de resultados

**Research Findings**:
- Sistema tiene 3 servicios: Backend (Express + Prisma + PostgreSQL), Frontend (React), Documentos (microservicio)
- Autenticación: JWT RS256 con control de acceso basado en roles
- Endpoints de creación de usuarios vía wizard: `/wizard/register-client`, `/wizard/register-dador`, `/wizard/register-transportista`, `/wizard/register-chofer`
- Endpoints de creación de equipos: POST `/equipos`, `/equipos/minimal`, `/equipos/alta-completa`
- Endpoint de carga de documentos: POST `/api/docs/documents/upload`
- Sistema de permisos RBAC ya implementado con middlewares de autorización por rol

### Metis Review

**Identified Gaps** (addressed in plan):
- **Estado de la base de datos**: ¿Está limpia o tiene datos existentes? → Resolución: Incluir paso de verificación inicial del estado de BD
- **Quién crea los usuarios**: ¿Ya existe SUPERADMIN o se necesita crear primero? → Resolución: Incluir instrucciones para verificar/crear SUPERADMIN inicial
- **Definición de "DONE"**: ¿Cuándo se consideran completas las pruebas? → Resolución: Definir criterios de completitud explicitos

**Other considerations noted** (optional, not blocking):
- Pruebas de casos negativos (inputs inválidos) - Opcional si tiempo lo permite
- Compatibilidad cross-browser - Asumir Chrome (o navegador especificado)
- Pruebas de responsive mobile - Opcional
- Validación de límites de archivos - Incluir en instrucciones de carga de documentos
- Manejo de sesiones concurrentes - Opcional si tiempo lo permite

---

## Work Objectives

### Core Objective
Validar mediante pruebas manuales que el sistema BCA permite correctamente:
1. Crear usuarios de los 7 roles activos
2. Autenticarse con cada rol
3. Crear equipos desde diferentes roles
4. Cargar documentos de prueba para equipos
5. Verificar la accesibilidad cruzada entre roles (quién puede ver/editar qué)

### Concrete Deliverables
- Checklist de pasos detallado para cada rol (7 checklists)
- Matriz de permisos esperados por rol (para validar durante pruebas)
- Instrucciones para crear documentos dummy de prueba (DNI, licencia, RTO, seguro, etc.)
- Plantilla de reporte de resultados (con secciones para cada rol)
- Lista de roles y usuarios creados (para trazabilidad)

### Definition of Done
- [ ] Todos los 7 roles probados (mínimo 2 usuarios por rol)
- [ ] Cada usuario ha podido hacer login exitosamente
- [ ] Cada rol ha creado al menos 1 equipo (según sus permisos)
- [ ] Cada rol ha subido al menos 1 documento de prueba
- [ ] Se han validado los 4 escenarios de accesibilidad cross-role
- [ ] Se ha completado el reporte de resultados (marcando cada prueba como PASÓ/FALLÓ)
- [ ] Se han documentado todos los bugs encontrados (con pasos para reproducir)

### Must Have
- Pruebas manuales vía frontend (http://10.3.0.246:8560)
- Creación de usuarios manualmente dentro de la aplicación
- Uso de documentos dummy (PDFs con datos ficticios)
- Validación de aislamiento por rol (ej: CHOFER no debe ver equipos de otros choferes)
- Validación de jerarquía de permisos (ADMIN ve TODO, TRANSPORTISTA solo su empresa)
- Documentación de resultados en reporte estructurado

### Must NOT Have (Guardrails)
- ❌ NO crear scripts automatizados
- ❌ NO ejecutar scripts existentes de `import-data/` directamente
- ❌ NO hacer pruebas de carga/performance
- ❌ NO hacer pruebas de seguridad/vulnerabilidades
- ❌ NO incluir testing de otras funcionalidades no mencionadas (notificaciones, reportes avanzados, etc.)
- ❌ NO usar documentos reales de producción
- ❌ NO hacer pruebas cross-browser (a menos que el usuario lo solicite)
- ❌ NO hacer pruebas responsive mobile (a menos que el usuario lo solicite)
- ❌ NO expandir el scope durante las pruebas ("mientras estamos en esto probemos esto otro")
- ❌ NO crear más de 3 usuarios por rol (salvo justificación explícita)

---

## Verification Strategy (MANDATORY)

> Este es un plan de **PRUEBAS MANUALES**. La verificación se realiza por un humano que sigue el checklist y documenta resultados.
>
> **NO AUTOMATIZACIÓN**: El plan NO incluye scripts para ejecución automática. Toda la verificación es manual.

### Test Decision
- **Infrastructure exists**: YES (ambiente testing: 10.3.0.246:8560)
- **User wants tests**: MANUAL VERIFICATION ONLY (human follows checklist)
- **Framework**: None (pruebas manuales vía navegador)

### Manual Verification Procedure

**Por cada prueba del checklist**:
1. **Leer el paso** del checklist
2. **Ejecutar la acción** en el frontend (http://10.3.0.246:8560)
3. **Observar el resultado**
4. **Marcar como PASÓ o FALLÓ** en el reporte
5. **Si FALLÓ**: Capturar screenshot + descripción del error + pasos para reproducir

**Evidencia a capturar**:
- [ ] Screenshot de pantalla de login exitoso (cada rol)
- [ ] Screenshot de creación de usuario exitoso (cada rol)
- [ ] Screenshot de equipo creado (cada rol que puede crear)
- [ ] Screenshot de documento subido exitosamente
- [ ] Screenshot de validación de permisos (ej: error de acceso denegado)
- [ ] Screenshot de vista de equipos (para demostrar aislamiento/jerarquía)

**Evidence Requirements (Manual)**:
- Capturar screenshots de cada paso crítico en formato PNG/JPG
- Guardar screenshots en carpeta: `.sisyphus/evidence/pruebas-basicas/`
- Documentar en reporte: nombre de archivo + contexto de la captura

---

## Execution Strategy

### Sequential Execution (One Role at a Time)

```
FASE 1: PREPARACIÓN (15-30 min)
├── Paso 1.1: Verificar ambiente testing
├── Paso 1.2: Verificar/clear BD de testing
├── Paso 1.3: Crear documentos dummy de prueba
└── Paso 1.4: Crear SUPERADMIN inicial (si no existe)

FASE 2: CREACIÓN DE USUARIOS (45-90 min)
├── Paso 2.1: Crear usuarios ADMIN (2-3 usuarios)
├── Paso 2.2: Crear usuarios OPERATOR (2-3 usuarios)
├── Paso 2.3: Crear usuarios ADMIN_INTERNO (2-3 usuarios)
├── Paso 2.4: Crear usuarios DADOR_DE_CARGA (2-3 usuarios)
├── Paso 2.5: Crear usuarios TRANSPORTISTA (2-3 usuarios)
├── Paso 2.6: Crear usuarios CHOFER (2-3 usuarios)
└── Paso 2.7: Crear usuarios CLIENTE (2-3 usuarios)

FASE 3: PRUEBAS POR ROL (180-360 min, ~30 min por rol)
├── Paso 3.1: Probar rol SUPERADMIN (login + crear equipo + subir docs)
├── Paso 3.2: Probar rol ADMIN (login + crear equipo + subir docs)
├── Paso 3.3: Probar rol OPERATOR (login + crear equipo + subir docs)
├── Paso 3.4: Probar rol ADMIN_INTERNO (login + crear equipo + subir docs)
├── Paso 3.5: Probar rol DADOR_DE_CARGA (login + crear equipo + subir docs)
├── Paso 3.6: Probar rol TRANSPORTISTA (login + crear equipo + subir docs)
├── Paso 3.7: Probar rol CHOFER (login + ver equipo + subir docs)
└── Paso 3.8: Probar rol CLIENTE (login + ver equipos + descargar docs)

FASE 4: VALIDACIÓN CROSS-ROLE (60-90 min)
├── Paso 4.1: Aislamiento por Rol (CHOFER no ve otros choferes)
├── Paso 4.2: Permisos Denegados (intentar acciones prohibidas)
├── Paso 4.3: Jerarquía de Permisos (ADMIN ve TODO)
└── Paso 4.4: Compartición entre Roles (TRANSPORTISTA ve equipos que CHOFER crea)

FASE 5: REPORTE FINAL (15-30 min)
├── Paso 5.1: Completar plantilla de reporte
├── Paso 5.2: Agregar screenshots en `.sisyphus/evidence/`
├── Paso 5.3: Documentar bugs encontrados
└── Paso 5.4: Definir recomendaciones

Critical Path: Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5
Estimated Total Time: 4-6 horas
```

---

## TODOs

### Preparación del Ambiente

- [ ] **0.1 Verificar acceso al ambiente de testing**
  - **Qué hacer**: Abrir navegador y acceder a http://10.3.0.246:8560
  - **Resultado esperado**: Página de login o frontend cargado correctamente
  - **Evidencia**: Screenshot de la página de login
  - **Tiempo estimado**: 5 min

- [ ] **0.2 Verificar estado de la base de datos**
  - **Qué hacer**: Consultar con el equipo técnico si la BD de testing (10.3.0.246) está limpia o tiene datos previos
  - **Resultado esperado**: Confirmar estado (limpia/con datos)
  - **Evidencia**: Nota en reporte: "BD estado: [limpia/con datos]"
  - **Tiempo estimado**: 10 min
  - **Nota**: Si la BD tiene datos, considerar si los usuarios/roles ya existen

- [ ] **0.3 Preparar documentos dummy de prueba**
  - **Qué hacer**: Crear 3-5 archivos PDF con datos ficticios para simular documentos reales
  - **Archivos necesarios**:
    - `DNI_DUMMY_12345678.pdf` - Simula DNI de chofer
    - `LICENCIA_DUMMY.pdf` - Simula licencia de conducir
    - `CEDULA_VERDE_TRUCK_ABC123.pdf` - Simula cédula de camión
    - `RTO_CAMION_ABC123.pdf` - Simula RTO de camión
    - `POLIZA_SEGURO.pdf` - Simula póliza de seguro
  - **Cómo crear**: Usar cualquier herramienta de PDF (Word → PDF, editor PDF online, etc.)
  - **Resultado esperado**: 5 archivos PDF guardados en carpeta local
  - **Evidencia**: Screenshot de la carpeta con los archivos
  - **Tiempo estimado**: 15 min
  - **Importante**: NO usar documentos reales de personas/empresas

- [ ] **0.4 Verificar/crear SUPERADMIN inicial**
  - **Qué hacer**:
    1. Intentar login con credenciales de SUPERADMIN conocidas
    2. Si no existen, pedir al equipo técnico que cree un usuario SUPERADMIN
  - **Resultado esperado**: Tener credenciales de SUPERADMIN funcionales
  - **Evidencia**: Screenshot de login exitoso como SUPERADMIN (si aplica)
  - **Tiempo estimado**: 10 min
  - **Nota**: SUPERADMIN es necesario para crear los demás usuarios

### Creación de Usuarios (Fase 2)

Para cada sección de usuarios a crear, sigue el mismo patrón.

- [ ] **2.1 Crear usuarios ADMIN (2-3 usuarios)**
  - **Qué hacer**:
    1. Login como SUPERADMIN
    2. Navegar a sección de gestión de usuarios
    3. Click en "Crear Usuario" / "Wizard"
    4. Seleccionar rol: ADMIN
    5. Completar formulario:
       - Email: `admin.0X@bca.com` (donde X = 1, 2, 3)
       - Nombre: `Admin Test X`
       - Apellido: `Lastname X`
       - Empresa: Seleccionar empresa activa en testing
       - Password: `Admin2024!` (o password del sistema)
    6. Click en "Guardar"
    7. Repetir para usuarios 2 y 3
  - **Resultado esperado**: 2-3 usuarios ADMIN creados exitosamente
  - **Evidencia**:
    - Screenshot del formulario de creación
    - Screenshot de confirmación "Usuario creado exitosamente"
    - Lista de usuarios creados (notas en reporte)
  - **Referencias**:
    - Endpoint: POST `/api/platform/auth/register` o `/api/platform/auth/wizard/register-dador`
    - Matriz de roles: MATRIZ_COMPLETA_ROLES_Y_USUARIOS.md
  - **Tiempo estimado**: 15 min

- [ ] **2.2 Crear usuarios OPERATOR (2-3 usuarios)**
  - **Qué hacer**: Igual que paso 2.1, pero con rol OPERATOR
  - **Formulario**:
    - Email: `operator.0X@bca.com`
    - Nombre: `Operator Test X`
    - Apellido: `Lastname X`
    - Empresa: Seleccionar empresa activa
    - Role: OPERATOR
  - **Resultado esperado**: 2-3 usuarios OPERATOR creados exitosamente
  - **Evidencia**: Screenshot de confirmación + lista en reporte
  - **Tiempo estimado**: 15 min

- [ ] **2.3 Crear usuarios ADMIN_INTERNO (2-3 usuarios)**
  - **Qué hacer**: Igual que paso 2.1, pero con rol ADMIN_INTERNO
  - **Formulario**:
    - Email: `admin_interno.0X@bca.com`
    - Nombre: `Admin Interno Test X`
    - Apellido: `Lastname X`
    - Role: ADMIN_INTERNO
  - **Resultado esperado**: 2-3 usuarios ADMIN_INTERNO creados exitosamente
  - **Evidencia**: Screenshot de confirmación + lista en reporte
  - **Tiempo estimado**: 15 min

- [ ] **2.4 Crear usuarios DADOR_DE_CARGA (2-3 usuarios)**
  - **Qué hacer**:
    1. Login como SUPERADMIN o ADMIN
    2. Navegar a sección de dadores de carga
    3. Click en "Crear Dador de Carga" / "Wizard"
    4. Seleccionar rol: DADOR_DE_CARGA
    5. Completar formulario:
       - Email: `dador.0X@bca.com`
       - Nombre: `Dador Test X`
       - Apellido: `Lastname X`
       - Seleccionar dador de carga existente en BD (si aplica)
       - Password: `Dador2024!`
    6. Click en "Guardar"
    7. Repetir para usuarios 2 y 3
  - **Resultado esperado**: 2-3 usuarios DADOR_DE_CARGA creados exitosamente
  - **Evidencia**: Screenshot del formulario + confirmación + lista
  - **Referencias**:
    - Endpoint: POST `/api/platform/auth/wizard/register-dador`
    - Documento: MATRIZ_COMPLETA_ROLES_Y_USUARIOS.md (rol DADOR_DE_CARGA)
  - **Tiempo estimado**: 15 min

- [ ] **2.5 Crear usuarios TRANSPORTISTA (2-3 usuarios)**
  - **Qué hacer**:
    1. Login como SUPERADMIN, ADMIN o DADOR_DE_CARGA
    2. Navegar a sección de transportistas
    3. Click en "Crear Transportista" / "Wizard"
    4. Seleccionar rol: TRANSPORTISTA
    5. Completar formulario:
       - Email: `transportista.0X@bca.com`
       - Nombre: `Transportista Test X`
       - Apellido: `Lastname X`
       - Seleccionar empresa transportista existente en BD (si aplica)
       - Dador de carga: Seleccionar dador correspondiente
       - Password: `Transp2024!`
    6. Click en "Guardar"
    7. Repetir para usuarios 2 y 3
  - **Resultado esperado**: 2-3 usuarios TRANSPORTISTA creados exitosamente
  - **Evidencia**: Screenshot del formulario + confirmación + lista
  - **Referencias**:
    - Endpoint: POST `/api/platform/auth/wizard/register-transportista`
    - Documento: MATRIZ_COMPLETA_ROLES_Y_USUARIOS.md (rol TRANSPORTISTA)
  - **Tiempo estimado**: 15 min

- [ ] **2.6 Crear usuarios CHOFER (2-3 usuarios)**
  - **Qué hacer**:
    1. Login como SUPERADMIN, ADMIN, DADOR_DE_CARGA o TRANSPORTISTA
    2. Navegar a sección de choferes
    3. Click en "Crear Chofer" / "Wizard"
    4. Seleccionar rol: CHOFER
    5. Completar formulario:
       - Email: `chofer.0X@bca.com`
       - Nombre: `Chofer Test X`
       - Apellido: `Lastname X`
       - Seleccionar chofer existente en BD (si aplica)
       - Empresa transportista: Seleccionar correspondiente
       - Password: `Chofer2024!`
    6. Click en "Guardar"
    7. Repetir para usuarios 2 y 3
  - **Resultado esperado**: 2-3 usuarios CHOFER creados exitosamente
  - **Evidencia**: Screenshot del formulario + confirmación + lista
  - **Referencias**:
    - Endpoint: POST `/api/platform/auth/wizard/register-chofer`
    - Documento: MATRIZ_COMPLETA_ROLES_Y_USUARIOS.md (rol CHOFER)
  - **Tiempo estimado**: 15 min

- [ ] **2.7 Crear usuarios CLIENTE (2-3 usuarios)**
  - **Qué hacer**:
    1. Login como SUPERADMIN o ADMIN
    2. Navegar a sección de clientes
    3. Click en "Crear Cliente" / "Wizard"
    4. Seleccionar rol: CLIENTE
    5. Completar formulario:
       - Email: `cliente.0X@bca.com`
       - Nombre: `Cliente Test X`
       - Apellido: `Lastname X`
       - Seleccionar cliente existente en BD (si aplica)
       - Password: `Cliente2024!`
    6. Click en "Guardar"
    7. Repetir para usuarios 2 y 3
  - **Resultado esperado**: 2-3 usuarios CLIENTE creados exitosamente
  - **Evidencia**: Screenshot del formulario + confirmación + lista
  - **Referencias**:
    - Endpoint: POST `/api/platform/auth/wizard/register-client`
    - Documento: MATRIZ_COMPLETA_ROLES_Y_USUARIOS.md (rol CLIENTE)
  - **Tiempo estimado**: 15 min

### Pruebas por Rol (Fase 3)

Para cada rol, sigue el patrón: Login → Crear equipo (si aplica) → Subir documento → Verificar acceso

- [ ] **3.1 Probar rol SUPERADMIN**
  - **Login**:
    - Abrir http://10.3.0.246:8560
    - Ingresar email: `admin@bca.com` (o SUPERADMIN creado en 0.4)
    - Ingresar password
    - Click en "Iniciar Sesión"
  - **Resultado esperado**: Login exitoso, dashboard de SUPERADMIN visible
  - **Evidencia**: Screenshot de dashboard de SUPERADMIN

  - **Crear equipo**:
    - Navegar a sección de equipos
    - Click en "Crear Equipo"
    - Completar formulario con datos dummy:
      - Seleccionar chofer existente o crear nuevo
      - Seleccionar camión existente o crear nuevo
      - Seleccionar acoplado existente o crear nuevo (opcional)
      - Empresa transportista: Seleccionar
      - Dador de carga: Seleccionar
      - Cliente: Seleccionar (opcional)
      - Fecha desde: HOY
    - Click en "Guardar"
  - **Resultado esperado**: Equipo creado exitosamente, visible en lista de equipos
  - **Evidencia**: Screenshot de formulario de equipo + equipo en lista

  - **Subir documento**:
    - Navegar al equipo creado
    - Click en "Subir Documento"
    - Seleccionar plantilla: DNI (o cualquier plantilla disponible)
    - Seleccionar archivo dummy: `DNI_DUMMY_12345678.pdf`
    - Fecha de vencimiento: 1 año desde hoy
    - Click en "Subir"
  - **Resultado esperado**: Documento subido exitosamente, visible en lista de documentos del equipo
  - **Evidencia**: Screenshot de formulario de carga + documento subido

  - **Referencias**:
    - Endpoints equipos: POST `/api/equipos`, `/api/equipos/minimal`, `/api/equipos/alta-completa`
    - Endpoint documentos: POST `/api/docs/documents/upload`
    - Documentos API: API_ENDPOINTS_REFERENCE.md

- [ ] **3.2 Probar rol ADMIN**
  - **Login**:
    - Cerrar sesión de SUPERADMIN (si aplica)
    - Ingresar email: `admin.01@bca.com`
    - Ingresar password
    - Click en "Iniciar Sesión"
  - **Resultado esperado**: Login exitoso, dashboard de ADMIN visible
  - **Evidencia**: Screenshot de dashboard de ADMIN

  - **Crear equipo**: Igual que paso 3.1 SUPERADMIN
  - **Subir documento**: Igual que paso 3.1 SUPERADMIN
  - **Evidencia**: Screenshot de equipo creado + documento subido

- [ ] **3.3 Probar rol OPERATOR**
  - **Login**:
    - Email: `operator.01@bca.com`
    - Password: `Operator2024!`
  - **Resultado esperado**: Login exitoso, dashboard de OPERATOR visible
  - **Evidencia**: Screenshot de dashboard de OPERATOR

  - **Crear equipo**: Igual que SUPERADMIN (OPERATOR puede crear equipos)
  - **Subir documento**: Igual que SUPERADMIN
  - **Evidencia**: Screenshot de equipo creado + documento subido

- [ ] **3.4 Probar rol ADMIN_INTERNO**
  - **Login**:
    - Email: `admin_interno.01@bca.com`
    - Password: `AdminInterno2024!`
  - **Resultado esperado**: Login exitoso, dashboard de ADMIN_INTERNO visible
  - **Evidencia**: Screenshot de dashboard de ADMIN_INTERNO

  - **Crear equipo**: Igual que SUPERADMIN
  - **Subir documento**: Igual que SUPERADMIN
  - **Evidencia**: Screenshot de equipo creado + documento subido

- [ ] **3.5 Probar rol DADOR_DE_CARGA**
  - **Login**:
    - Email: `dador.01@bca.com`
    - Password: `Dador2024!`
  - **Resultado esperado**: Login exitoso, dashboard de DADOR_DE_CARGA visible
  - **Evidencia**: Screenshot de dashboard de DADOR_DE_CARGA

  - **Crear equipo**: Igual que SUPERADMIN (DADOR_DE_CARGA puede crear equipos)
  - **Subir documento**: Igual que SUPERADMIN
  - **Evidencia**: Screenshot de equipo creado + documento subido

- [ ] **3.6 Probar rol TRANSPORTISTA**
  - **Login**:
    - Email: `transportista.01@bca.com`
    - Password: `Transp2024!`
  - **Resultado esperado**: Login exitoso, dashboard de TRANSPORTISTA visible
  - **Evidencia**: Screenshot de dashboard de TRANSPORTISTA

  - **Ver equipos**:
    - Navegar a sección "Mis Equipos" o similar
    - Ver lista de equipos de la empresa transportista
  - **Resultado esperado**: Equipos creados anteriormente (por ADMIN, DADOR) son visibles
  - **Evidencia**: Screenshot de lista de equipos del TRANSPORTISTA

  - **Crear equipo**:
    - Click en "Crear Equipo"
    - Completar formulario solo con choferes, camiones, acoplados de SU empresa
    - Seleccionar dador de carga asociado
    - Click en "Guardar"
  - **Resultado esperado**: Equipo creado exitosamente, visible solo para TRANSPORTISTA y roles superiores
  - **Evidencia**: Screenshot de formulario + equipo creado

  - **Subir documento**:
    - Navegar al equipo creado
    - Click en "Subir Documento"
    - Seleccionar archivo dummy: `LICENCIA_DUMMY.pdf`
    - Click en "Subir"
  - **Resultado esperado**: Documento subido exitosamente
  - **Evidencia**: Screenshot de documento subido

- [ ] **3.7 Probar rol CHOFER**
  - **Login**:
    - Email: `chofer.01@bca.com`
    - Password: `Chofer2024!`
  - **Resultado esperado**: Login exitoso, dashboard de CHOFER visible
  - **Evidencia**: Screenshot de dashboard de CHOFER

  - **Ver equipo asignado**:
    - CHOFER no debe poder crear equipos
    - Solo debe ver el equipo que tiene asignado
    - Navegar a "Mi Equipo" o similar
  - **Resultado esperado**: Solo visible el equipo asignado al chofer
  - **Evidencia**: Screenshot de vista del equipo del CHOFER

  - **Subir documento personal**:
    - Click en "Subir Documento" para el chofer
    - Seleccionar plantilla: DNI o Licencia
    - Seleccionar archivo dummy: `DNI_DUMMY_12345678.pdf`
    - Click en "Subir"
  - **Resultado esperado**: Documento subido exitosamente
  - **Evidencia**: Screenshot de documento subido

- [ ] **3.8 Probar rol CLIENTE**
  - **Login**:
    - Email: `cliente.01@bca.com`
    - Password: `Cliente2024!`
  - **Resultado esperado**: Login exitoso, dashboard de CLIENTE visible
  - **Evidencia**: Screenshot de dashboard de CLIENTE

  - **Ver equipos asignados**:
    - CLIENTE no debe poder crear equipos
    - Solo debe ver equipos que le han sido asignados
    - Navegar a sección de equipos
  - **Resultado esperado**: Solo visibles los equipos asignados al cliente
  - **Evidencia**: Screenshot de lista de equipos del CLIENTE

  - **Descargar documentos**:
    - Click en un equipo asignado
    - Click en "Descargar ZIP de documentos" o similar
    - Verificar que el ZIP se descarga
  - **Resultado esperado**: ZIP descargado con documentos del equipo
  - **Evidencia**: Screenshot de descarga iniciando + confirmación de archivo en downloads

### Validación Cross-Role (Fase 4)

- [ ] **4.1 Aislamiento por Rol**
  - **Objetivo**: Verificar que cada rol SOLO ve sus propios datos

  - **Test CHOFER aislamiento**:
    1. Login como CHOFER (chofer.01@bca.com)
    2. Ver su equipo asignado
    3. Intentar buscar/ver equipos de otros choferes (usando DNI o patente)
    4. **Resultado esperado**: NO debe ver equipos de otros choferes
    5. **Evidencia**: Screenshot de búsqueda vacía o mensaje de error

  - **Test TRANSPORTISTA aislamiento**:
    1. Login como TRANSPORTISTA (transportista.01@bca.com)
    2. Ver sus equipos
    3. Intentar buscar/ver equipos de OTRA empresa transportista
    4. **Resultado esperado**: NO debe ver equipos de otras empresas
    5. **Evidencia**: Screenshot de resultados de búsqueda

  - **Test CLIENTE aislamiento**:
    1. Login como CLIENTE (cliente.01@bca.com)
    2. Ver sus equipos asignados
    3. Intentar buscar/ver equipos NO asignados a él
    4. **Resultado esperado**: NO debe ver otros equipos
    5. **Evidencia**: Screenshot de vista limitada a sus equipos

- [ ] **4.2 Permisos Denegados**
  - **Objetivo**: Verificar que roles sin permiso reciben mensajes de error claros

  - **Test CHOFER - Crear equipo (DENEGADO)**:
    1. Login como CHOFER
    2. Navegar a sección de equipos (si tiene acceso)
    3. Intentar click en "Crear Equipo" (si el botón existe)
    4. **Resultado esperado**: Botón deshabilitado O mensaje de error "No tienes permisos" al intentar
    5. **Evidencia**: Screenshot de error/botón deshabilitado

  - **Test CLIENTE - Crear equipo (DENEGADO)**:
    1. Login como CLIENTE
    2. Intentar buscar/formulario para crear equipo
    3. **Resultado esperado**: NO existe formulario de creación, o mensaje de error si intenta acción
    4. **Evidencia**: Screenshot de ausencia de formulario o error

  - **Test CHOFER - Eliminar equipo (DENEGADO)**:
    1. Login como CHOFER
    2. Navegar a su equipo
    3. Intentar buscar botón "Eliminar Equipo"
    4. **Resultado esperado**: Botón no existe o deshabilitado
    5. **Evidencia**: Screenshot de ausencia de botón

- [ ] **4.3 Jerarquía de Permisos**
  - **Objetivo**: Verificar que roles superiores ven TODO, roles inferiores solo su scope

  - **Test SUPERADMIN vs otros**:
    1. Login como SUPERADMIN
    2. Ver todos los equipos de TODOS los dadores, empresas, choferes
    3. **Resultado esperado**: SUPERADMIN ve TODO sin restricciones
    4. **Evidencia**: Screenshot de lista global de equipos (todos los filtros disponibles)

  - **Test ADMIN vs TRANSPORTISTA**:
    1. Login como ADMIN
    2. Ver equipos de todas las empresas transportistas del tenant
    3. Login como TRANSPORTISTA
    4. Ver solo equipos de SU empresa
    5. **Resultado esperado**: ADMIN ve más equipos que TRANSPORTISTA
    6. **Evidencia**: 2 screenshots (vista ADMIN vs vista TRANSPORTISTA)

  - **Test DADOR_DE_CARGA vs CHOFER**:
    1. Login como DADOR_DE_CARGA
    2. Ver equipos de todos sus transportistas y choferes
    3. Login como CHOFER (de ese dador)
    4. Ver solo SU equipo
    5. **Resultado esperado**: DADOR ve más equipos que CHOFER
    6. **Evidencia**: 2 screenshots (vista DADOR vs vista CHOFER)

- [ ] **4.4 Compartición entre Roles**
  - **Objetivo**: Verificar que TRANSPORTISTA ve equipos creados por CHOFER (si aplica la lógica del sistema)

  - **Test TRANSPORTISTA ve equipo creado por CHOFER**:
    1. Login como CHOFER (chofer.01@bca.com)
    2. Subir documento a su equipo (si es su responsabilidad)
    3. Logout
    4. Login como TRANSPORTISTA (empresa del chofer)
    5. Navegar a "Mis Equipos"
    6. Ver el equipo del chofer
    7. **Resultado esperado**: TRANSPORTISTA ve el equipo del chofer + el documento subido
    8. **Evidencia**: Screenshot de equipo con documento desde vista TRANSPORTISTA

  - **Test DADOR_DE_CARGA ve equipos creados por TRANSPORTISTA**:
    1. Login como TRANSPORTISTA
    2. Crear nuevo equipo
    3. Subir documento
    4. Logout
    5. Login como DADOR_DE_CARGA (dador asociado)
    6. Navegar a equipos del dador
    7. Ver el equipo creado por TRANSPORTISTA
    8. **Resultado esperado**: DADOR_DE_CARGA ve el equipo y documentos creados por TRANSPORTISTA
    9. **Evidencia**: Screenshot de equipo desde vista DADOR_DE_CARGA

---

## Appendix: Matriz de Permisos Esperados

### Matriz de Referencia para Validar Durante Pruebas

Usa esta matriz como referencia para validar que el comportamiento del sistema coincide con las expectativas.

| Operación | SUPERADMIN | ADMIN | OPERATOR | ADMIN_INTERNO | DADOR_CARGA | TRANSPORTISTA | CHOFER | CLIENTE |
|------------|------------|-------|----------|---------------|-------------|---------------|---------|---------|
| **Crear usuarios** | ✅ TODOS excepto SUPERADMIN | ✅ OPERATOR, ADMIN (misma empresa) | ❌ NO | ✅ Similar a ADMIN | ✅ TRANSPORTISTA, CHOFER | ✅ CHOFER | ❌ NO |
| **Ver TODOS los equipos** | ✅ SIN restricciones | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo tenant | ❌ Solo su dador | ❌ Solo su empresa | ❌ Solo asignados |
| **Crear equipos** | ✅ Cualquier dador | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo su dador | ❌ NO | ❌ NO |
| **Modificar equipos** | ✅ TODOS | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo su dador | ✅ Solo su empresa | ❌ SOLO LECTURA |
| **Eliminar equipos** | ✅ TODOS | ✅ Solo tenant | ❌ NO | ✅ Solo tenant | ❌ NO | ❌ NO | ❌ NO |
| **Subir documentos** | ✅ TODOS | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo su dador | ✅ Solo su empresa | ✅ Solo su equipo |
| **Aprobar documentos** | ✅ TODOS | ✅ Solo tenant | ❌ NO | ✅ Solo tenant | 🟢* Configurable | ❌ NO | ❌ NO |
| **Descargar documentos** | ✅ TODOS | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo tenant | ✅ Solo su dador | ✅ Solo su empresa | ✅ Solo asignados |
| **Ver documentos de otros** | ✅ TODOS | ✅ Tenant | ✅ Tenant | ✅ Tenant | ❌ NO | ❌ NO | ❌ NO |

\* DADOR_DE_CARGA puede aprobar documentos según configuración del sistema (verificar durante pruebas)

---

## Appendix: Plantilla de Reporte de Resultados

```markdown
# Reporte de Pruebas Básicas - BCA System

**Fecha**: [FECHA DE EJECUCIÓN]
**Ambiente**: Testing (10.3.0.246:8560)
**Ejecutado por**: [NOMBRE DEL TESTER]
**Duración total**: [X horas Y minutos]

---

## Resumen Ejecutivo

### Roles Probados
- [x] SUPERADMIN
- [x] ADMIN
- [x] OPERATOR
- [x] ADMIN_INTERNO
- [x] DADOR_DE_CARGA
- [x] TRANSPORTISTA
- [x] CHOFER
- [x] CLIENTE

### Usuarios Creados (Total: X)
| Rol | Cantidad | Emails (ejemplos) |
|------|----------|------------------|
| SUPERADMIN | 1 | admin@bca.com |
| ADMIN | 2 | admin.01@bca.com, admin.02@bca.com |
| OPERATOR | 2 | operator.01@bca.com, operator.02@bca.com |
| ADMIN_INTERNO | 2 | admin_interno.01@bca.com, ... |
| DADOR_DE_CARGA | 2 | dador.01@bca.com, ... |
| TRANSPORTISTA | 2 | transportista.01@bca.com, ... |
| CHOFER | 2 | chofer.01@bca.com, ... |
| CLIENTE | 2 | cliente.01@bca.com, ... |

### Estadísticas
- Pruebas totales: X
- Pruebas PASÓ: X (X%)
- Pruebas FALLÓ: X (X%)
- Bugs encontrados: X (X críticos, X medianos, X menores)
- Tiempo total: X horas

---

## Detalle por Rol

### SUPERADMIN
- [x] Login exitoso
- [x] Dashboard visible
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] Ver todos los equipos: PASÓ / FALLÓ
- [x] Crear usuarios: PASÓ / FALLÓ
- **Observaciones**:
  - [Texto libre de observaciones]
- **Bugs encontrados**:
  - [ ] Bug 1: Descripción + pasos para reproducir
  - [ ] Bug 2: Descripción + pasos para reproducir

### ADMIN
- [x] Login exitoso
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] Ver equipos del tenant: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### OPERATOR
- [x] Login exitoso
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] NO puede eliminar equipos: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### ADMIN_INTERNO
- [x] Login exitoso
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] Aprobar documentos: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### DADOR_DE_CARGA
- [x] Login exitoso
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] Ver solo sus equipos: PASÓ / FALLÓ
- [x] No ver equipos de otros dadores: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### TRANSPORTISTA
- [x] Login exitoso
- [x] Ver sus equipos: PASÓ / FALLÓ
- [x] Crear equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] No ver equipos de otras empresas: PASÓ / FALLÓ
- [x] Ver equipos creados por CHOFER: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### CHOFER
- [x] Login exitoso
- [x] Ver solo su equipo: PASÓ / FALLÓ
- [x] Subir documento: PASÓ / FALLÓ
- [x] NO puede crear equipos: PASÓ / FALLÓ
- [x] NO puede ver otros equipos: PASÓ / FALLÓ
- [x] NO puede eliminar equipos: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

### CLIENTE
- [x] Login exitoso
- [x] Ver solo equipos asignados: PASÓ / FALLÓ
- [x] NO puede crear equipos: PASÓ / FALLÓ
- [x] NO puede subir documentos: PASÓ / FALLÓ
- [x] Descargar ZIP de documentos: PASÓ / FALLÓ
- **Observaciones**: ...
- **Bugs encontrados**: ...

---

## Validación Cross-Role

### 4.1 Aislamiento por Rol
- [ ] CHOFER no ve equipos de otros choferes: PASÓ / FALLÓ
- [ ] TRANSPORTISTA no ve equipos de otras empresas: PASÓ / FALLÓ
- [ ] CLIENTE no ve equipos no asignados: PASÓ / FALLÓ
- **Observaciones**: ...

### 4.2 Permisos Denegados
- [ ] CHOFER no puede crear equipos (botón deshabilitado/error): PASÓ / FALLÓ
- [ ] CLIENTE no puede crear equipos (formulario inexistente/error): PASÓ / FALLÓ
- [ ] CHOFER no puede eliminar equipos: PASÓ / FALLÓ
- **Observaciones**: ...

### 4.3 Jerarquía de Permisos
- [ ] SUPERADMIN ve TODO sin restricciones: PASÓ / FALLÓ
- [ ] ADMIN ve más equipos que TRANSPORTISTA: PASÓ / FALLÓ
- [ ] DADOR_DE_CARGA ve más equipos que CHOFER: PASÓ / FALLÓ
- **Observaciones**: ...

### 4.4 Compartición entre Roles
- [ ] TRANSPORTISTA ve equipo creado por CHOFER: PASÓ / FALLÓ
- [ ] DADOR_DE_CARGA ve equipos creados por TRANSPORTISTA: PASÓ / FALLÓ
- **Observaciones**: ...

---

## Bugs Encontrados

| ID | Severidad | Rol | Descripción | Pasos para reproducir | Evidencia (screenshot) |
|-----|------------|------|-------------|----------------------|------------------------|
| BUG-001 | CRÍTICO | ADMIN | No se pueden crear usuarios... | 1. Login como ADMIN<br>2. Navegar a usuarios<br>3. Click en crear<br>4. Error 500 | screenshot_bug_001.png |
| BUG-002 | MEDIO | CHOFER | No se puede subir documento... | ... | ... |

**Clasificación de Severidad**:
- **CRÍTICO**: Bloquea funcionalidad principal, no workaround
- **ALTO**: Funcionalidad afectada pero con workaround
- **MEDIO**: Funcionalidad degradada o issue menor
- **BAJO**: Issue cosmético o UX

---

## Recomendaciones

### Acciones Inmediatas (bugs críticos)
1. [ ] Prioridad 1: Descripción del bug crítico
2. [ ] Prioridad 2: Descripción del bug crítico
3. [ ] ...

### Mejoras Sugeridas
1. [ ] Mejora UX 1: Descripción
2. [ ] Mejora UX 2: Descripción
3. [ ] ...

### Para Pruebas Futuras
1. [ ] Considerar: Pruebas de casos negativos (inputs inválidos)
2. [ ] Considerar: Pruebas de concurrencia (mismo usuario en 2 browsers)
3. [ ] Considerar: Pruebas de límites de archivos (subir 100MB)
4. [ ] ...

---

## Firma y Conclusión

**Estado General de las Pruebas**: ✅ EXITOSO / ⚠️ PARCIALMENTE EXITOSO / ❌ CON PROBLEMAS

**Comentario Final**:
[Texto libre de conclusiones generales]

**Firma**: [Nombre del Tester]
**Fecha**: [FECHA]

---

## Evidencia

**Carpetas de screenshots**:
- `.sisyphus/evidence/pruebas-basicas/superadmin/`
- `.sisyphus/evidence/pruebas-basicas/admin/`
- `.sisyphus/evidence/pruebas-basicas/operator/`
- `.sisyphus/evidence/pruebas-basicas/admin_interno/`
- `.sisyphus/evidence/pruebas-basicas/dador/`
- `.sisyphus/evidence/pruebas-basicas/transportista/`
- `.sisyphus/evidence/pruebas-basicas/chofer/`
- `.sisyphus/evidence/pruebas-basicas/cliente/`
- `.sisyphus/evidence/pruebas-basicas/cross-role/`

**Total de screenshots capturadas**: X archivos

---

**FIN DEL REPORTE**
```

---

## Commit Strategy

Este plan genera documentación (checklist + reporte template). No hay commits de código.
El usuario ejecuta pruebas manualmente y completa el reporte.

---

## Success Criteria

### Verification Commands (Manual)
No hay comandos automatizados. Verificación manual siguiendo el checklist.

### Final Checklist
- [ ] Todos los 7 roles probados
- [ ] 2-3 usuarios creados por rol
- [ ] Cada usuario puede hacer login exitosamente
- [ ] Cada rol puede crear equipo (según permisos)
- [ ] Cada rol puede subir documento (según permisos)
- [ ] Aislamiento por rol validado (CHOFER solo ve su equipo)
- [ ] Permisos denegados validados (CHOFER no puede crear equipo)
- [ ] Jerarquía de permisos validada (ADMIN ve TODO)
- [ ] Compartición entre roles validada (TRANSPORTISTA ve equipo de CHOFER)
- [ ] Reporte de resultados completado con PASÓ/FALLÓ en cada prueba
- [ ] Screenshots guardados en `.sisyphus/evidence/pruebas-basicas/`
- [ ] Bugs encontrados documentados con pasos para reproducir
