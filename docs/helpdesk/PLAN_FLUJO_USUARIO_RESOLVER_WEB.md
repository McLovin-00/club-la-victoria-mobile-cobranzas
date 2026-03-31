# Plan: flujo web usuario ↔ resolver (por tenant)

Documento de planificación para implementar y probar: **usuarios del sistema crean y ven sus tickets**, **resolvers contestan desde la web**, y **resolvers ven todos los tickets de su tenant** (SUPERADMIN con visión global ya cubierta en backend).

---

## 1. Objetivo de negocio

| Actor | Necesidad | Comportamiento esperado |
|--------|-----------|-------------------------|
| Usuario operativo (cualquier rol con login que deba pedir soporte) | Abrir y dar seguimiento a pedidos | Crear ticket, listar **solo los suyos**, ver detalle, enviar mensajes, cerrar/reabrir según reglas actuales |
| Resolver (staff: `ADMIN_INTERNO`, `ADMIN`, `SUPERADMIN`) | Atender la mesa de ayuda | Ver **todos los tickets del tenant** (o global si SUPERADMIN), abrir detalle, **responder como resolver** (no como el usuario creador), ver estadísticas agregadas |
| Canal Telegram | Ya operativo | Mantener paridad de comportamiento donde aplique (mensajes `RESOLVER` ya existen vía bot) |

---

## 2. Estado actual (baseline técnico)

### 2.1 Backend helpdesk — ya alineado en gran parte

- **Crear ticket**: `POST /api/helpdesk/tickets` — autenticación JWT; **sin** restricción de rol en el controlador.
- **Listar**: `GET /api/helpdesk/tickets` — si el rol ∈ `{ SUPERADMIN, ADMIN, ADMIN_INTERNO }` → listado **staff por tenant** (`getAll` + `resolveStaffTenantScope`); si no → **solo tickets del usuario** (`getByUser`).
- **Detalle / mensajes / cerrar / reabrir**: visibilidad y dueño ya resueltos en servicio + `buildTicketViewerContext`.
- **Estadísticas agregadas**: `GET /api/helpdesk/admin/stats` — solo roles staff (`adminMiddleware`).
- **Listado admin duplicado**: `GET /api/helpdesk/admin/tickets` — mismo alcance tenant que el listado staff en `GET /tickets`; el frontend hoy consume **`/tickets`**, suficiente para staff.

### 2.2 Backend helpdesk — brecha principal

- **Respuesta del resolver por web**: `POST .../messages` en `message.controller` usa `messageService.createUser` → siempre `senderType: 'USER'`. Las respuestas de resolver hoy entran por **Telegram** (`createResolver` → `senderType: 'RESOLVER'`).
- **Consecuencia**: un `ADMIN_INTERNO` que escriba en el detalle del ticket desde la UI actual aparece como **usuario**, no como **resolver**, y puede confundir métricas, notificaciones o reglas futuras.

### 2.3 Frontend — brechas

- **Rutas** (`App.tsx`): `/helpdesk` restringido a `SUPERADMIN`, `ADMIN`, `ADMIN_INTERNO` → usuarios finales **no pueden entrar**.
- **`HelpdeskPage`**: llama `getStats` → `/admin/stats` → **403** para no-staff aunque se abrieran las rutas.
- **Alta de ticket**: existe `useCreateTicketMutation` en RTK pero **no hay UI** (formulario modal/página) acorde a `createTicketSchema` (categoría, subcategoría, asunto, prioridad, mensaje inicial).
- **Navegación**: enlace «Mesa de ayuda» solo en bloque Gestión para staff; faltaría enlace para el resto de roles objetivo (según decisión de producto).
- **Detalle**: apto para conversación usuario; falta **modo resolver** (mismo endpoint con lógica distinta o endpoint dedicado) y posible diferenciación visual USER vs RESOLVER en hilos (si no está ya en `TicketDetailPage`).

### 2.4 Infra / dev

- En **nginx** de compose QA/prod hay `location /api/helpdesk/` → servicio helpdesk.
- El **frontend en dev** proxifica `/api` al backend principal; conviene **confirmar** si en tu entorno local el backend reexpone `/api/helpdesk` al microservicio (si no, las pruebas locales solo vía nginx o puerto helpdesk directo). Anotar en checklist de QA el entorno usado.

---

## 3. Decisiones de producto (definir antes o durante la implementación)

1. **¿Qué roles pueden crear tickets por web?**  
   Recomendación típica: todos los roles que ya usan el layout principal autenticado **salvo** los que explícitamente no deban consumir soporte (si los hay). Lista concreta debe salir del negocio (ej.: incluir `DADOR_DE_CARGA`, `TRANSPORTISTA`, `CHOFER`, `OPERATOR`, portales cliente, etc.).

2. **¿Los resolvers son solo `ADMIN_INTERNO` / `ADMIN` / `SUPERADMIN`?**  
   Hoy el backend usa ese conjunto para listado amplio y admin; mantener coherencia.

3. **¿Paridad Telegram + web?**  
   Definir si al responder por web se dispara la misma lógica que en Telegram (notificaciones al usuario, cambio de estado a `IN_PROGRESS`, etc.). Puede ser **fase 2** si hoy solo importa persistir mensajes `RESOLVER`.

---

## 4. Plan de implementación por fases

### Fase A — Backend: mensaje de resolver vía API

**Objetivo:** Un staff autenticado puede publicar un mensaje con `senderType: 'RESOLVER'`.

- **A.1** Nuevo endpoint (recomendado para claridad y seguridad), por ejemplo:  
  `POST /api/helpdesk/admin/tickets/:ticketId/messages`  
  - Tras `authMiddleware` + `adminMiddleware`.  
  - Cuerpo: texto + opcional adjuntos (reutilizar patrón multer de `message.routes`).  
  - Validar que el ticket existe y cae en el **scope del tenant** del resolver (misma lógica que `getById` / listados).  
  - Llamar a `messageService.createResolver` (extender firma si hace falta: `senderId` opcional = `platformUserId`, `resolverName` desde nombre + apellido o email).

- **A.2** Alternativa mínima: en `message.controller.create`, si el rol ∈ staff y el ticket es visible como staff, bifurcar a `createResolver` en lugar de `createUser`.  
  - Más compacto pero mezcla responsabilidades; valorar Sonar/complejidad.

- **A.3** Tests unitarios/integration en helpdesk: staff de tenant A no puede mensajear ticket de tenant B; usuario no staff sigue usando solo `createUser`.

- **A.4** (Opcional) Unificar transición de estado: al primer mensaje resolver, pasar ticket a `IN_PROGRESS` si está `OPEN`, alineado con lo que haga el flujo Telegram.

### Fase B — Frontend: rutas y navegación

**Objetivo:** Quien deba crear tickets puede entrar a `/helpdesk` y ver el enlace en el menú.

- **B.1** Ampliar `RequireAuth` en rutas `/helpdesk` y `/helpdesk/:id` con la **lista de roles acordada** (Fase 3 decisión 1).

- **B.2** Sidebar (`MainLayout`):  
  - Mostrar «Mesa de ayuda» en una sección **visible para todos los roles con acceso** (no solo bloque Gestión admin), o duplicar ítem solo para no-staff en «Principal» / similar — evitar dos enlaces duplicados para staff.

- **B.3** Hook/helper `useIsHelpdeskStaff()` (roles staff) para bifurcar UI en páginas.

### Fase C — Frontend: página listado (`HelpdeskPage`)

**Objetivo:** Sin errores para usuario final; vista rica para staff.

- **C.1** `useGetStatsQuery` con **`skip: !isStaff`** (o equivalente).  
- **C.2** Título/subtítulo dinámicos: ej. «Mis solicitudes» vs «Mesa de ayuda — [empresa]».  
- **C.3** Botón **«Nuevo ticket»** visible para **todos** (o solo no-staff, según política; normalmente todos pueden crear).

### Fase D — Frontend: crear ticket

**Objetivo:** Formulario válido contra `createTicketSchema`.

- **D.1** Modal o ruta `/helpdesk/nuevo` con campos: categoría, subcategoría, asunto, prioridad, mensaje (límites 5–200 / 10–5000).  
- **D.2** `useCreateTicketMutation` + invalidación de lista + navegación al detalle del ticket creado.  
- **D.3** Manejo de errores 400 (validación) y toasts.  
- **D.4** Tests de componente o test RTL mínimo del formulario (campos requeridos).

### Fase E — Frontend: detalle (`TicketDetailPage`)

**Objetivo:** Usuario sigue chateando; staff responde como resolver.

- **E.1** Si `isStaff` y el ticket está en scope: mostrar compositor que llame al **nuevo endpoint admin** (o mutación dedicada `sendResolverMessage` en `helpdeskApi.ts`).  
- **E.2** Si no es staff: mantener `sendMessage` actual (usuario).  
- **E.3** Estilos distintos para burbujas USER vs RESOLVER (ya suele venir del tipo en el modelo).  
- **E.4** Ocultar o deshabilitar acciones de «cerrar» que no correspondan al dueño (revisar reglas actuales del backend).

### Fase F — RTK Query / tipos

- Endpoints nuevos en `helpdeskApi.ts` con tags de invalidación alineados (`Ticket`, `TicketMessage`).  
- Sin `any`; tipos compartidos con `features/helpdesk/types`.

### Fase G — Documentación y operación

- Actualizar `docs/helpdesk/SETUP_QA_PLATAFORMA.md` / matriz QA con casos: usuario crea → staff ve en listado tenant → staff responde web → usuario ve mensaje RESOLVER.  
- `CHANGELOG.md` bajo [Unreleased].  
- ADR corto si se elige endpoint admin vs rama en controller único (`docs/helpdesk/ADR-HELPDESK-RESOLVER-WEB.md`).

---

## 5. Plan de pruebas (orden sugerido)

1. **Unit / integration** (helpdesk): permisos mensaje resolver; tenant isolation.  
2. **Frontend**: tests RTL del formulario crear ticket; test de `HelpdeskPage` con `skip` en stats para usuario no staff.  
3. **Manual / QA** (según `MATRIZ_QA_MESA_DE_AYUDA.md`):  
   - Usuario rol no staff: crear ticket, ver solo el suyo, no ver stats admin.  
   - Usuario staff mismo `empresaId`: ve ticket en listado, abre detalle, envía respuesta web, verifica tipo RESOLVER en DB o UI.  
   - Usuario staff otro tenant: no ve ticket ajeno.  
   - SUPERADMIN: ve cross-tenant si el diseño actual lo permite.  
4. **Regresión Telegram**: un mensaje desde grupo sigue creando RESOLVER y no se rompe.

---

## 6. Orden recomendado de ejecución

```text
A (backend resolver web) → B (rutas + menú) → C (listado sin stats para user)
    → D (crear ticket) → E (detalle dual usuario/staff) → G (docs + QA)
```

La Fase F se entrelaza con D y E según se toquen los endpoints.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Confundir mensaje staff con mensaje usuario | Endpoint o rama explícita + tests |
| Exponer stats globales a usuarios finales | `skip` en `getStats` + no llamar `/admin/*` desde RTK para no-staff |
| Proxy local sin helpdesk | Documentar URL de prueba; alinear backend dev o usar compose QA |
| Complejidad cognitiva en controllers | Extraer helpers (reglas .cursorrules) |

---

## 8. Checklist rápido pre-merge

- [ ] Roles de acceso a rutas helpdesk definidos y reflejados en `App.tsx` + sidebar.  
- [ ] POST resolver web con aislamiento tenant.  
- [ ] UI crear ticket + listado sin 403 en stats para usuario.  
- [ ] Detalle: staff usa API resolver; usuario usa API usuario.  
- [ ] Tests mínimos + pasada manual matriz QA.  
- [ ] CHANGELOG + ADR si aplica.

Cuando quieras pasar a implementación, se puede tomar este documento como lista de tareas y abrir PRs por fase (A+B+C primero para destrabar navegación y API).
