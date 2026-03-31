# ADR: Multi-tenant en Mesa de Ayuda (empresaId en tickets)

## Contexto

Los usuarios de plataforma pertenecen a una **empresa** (`platform_users.empresa_id`). El helpdesk listaba tickets sin discriminar tenant: las estadísticas admin y el listado efectivo mezclaban datos de todas las organizaciones.

## Decisión

1. Añadir **`empresa_id`** en la tabla `helpdesk.tickets`, rellenado al crear el ticket desde:
   - Plataforma web: `empresaId` del JWT.
   - Telegram: `empresa_id` del usuario en `platform_users`.
2. **Listados y stats** para `SUPERADMIN`: sin filtro de tenant (visión global).
3. Para **`ADMIN`** y **`ADMIN_INTERNO`**: listados y stats filtrados por `empresa_id` del token.
4. **Detalle de ticket**: además del creador, pueden verlo SUPERADMIN y admin de la misma empresa; tickets **sin** `empresa_id` (datos previos) solo creador o SUPERADMIN.
5. Middleware admin del helpdesk incluye **`ADMIN_INTERNO`** para `/api/helpdesk/admin/*`.
6. JWT de plataforma usa **`userId`**; el middleware del helpdesk normaliza a **`req.user.id`**.

## Consecuencias

- Migración obligatoria en bases que ya tengan helpdesk.
- Tickets antiguos sin `empresa_id` requieren backfill manual si se desea consistencia total.
- El listado `GET /api/helpdesk/tickets` para roles staff deja de ser “solo mis tickets” y pasa a ser **catálogo del tenant** (o global para SUPERADMIN).
