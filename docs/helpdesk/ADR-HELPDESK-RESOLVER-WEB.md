# ADR: mensajes de resolver desde la plataforma web

## Contexto

El helpdesk ya registraba mensajes `RESOLVER` vía Telegram. Los usuarios de la web solo podían enviar mensajes `USER` y las rutas `/helpdesk` estaban limitadas a roles staff, sin formulario de alta de ticket ni estadísticas condicionales.

## Decisión

1. **Nuevo endpoint** `POST /api/helpdesk/admin/tickets/:ticketId/messages` (tras `authMiddleware` + `adminMiddleware`): persiste mensajes con `senderType: RESOLVER` y `senderId` opcional del usuario plataforma, reutilizando subida de adjuntos vía utilidad compartida `message-attachments.ts`.
2. Si el staff es el **creador** del ticket, debe usar el endpoint de usuario existente; el endpoint admin rechaza ese caso para no duplicar semántica.
3. **Frontend**: cualquier usuario autenticado accede a `/helpdesk`; staff obtiene stats con `skip` en RTK para el resto; modal de creación; en detalle, staff que no es dueño envía con la mutación al endpoint admin.

## Consecuencias

- Paridad Telegram / web en el modelo de mensajes.
- Duplicación de lógica de adjuntos centralizada en util (menos riesgo que dos implementaciones divergentes).
- Mantenimiento: cambios en límites multer/validación deben revisarse en usuario y admin.
