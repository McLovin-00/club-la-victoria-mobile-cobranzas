# Puesta en producción - Mesa de Ayuda

Resumen de cómo dejar el helpdesk listo en producción **sin pasos manuales en la base de datos**.

---

## 1. Configuración mínima por entorno

En el despliegue (Docker, Kubernetes, etc.) configurá:

- `TELEGRAM_BOT_TOKEN`: token del bot (BotFather).
- `HELPDESK_DATABASE_URL`: conexión a PostgreSQL (schema `helpdesk`).
- `JWT_PUBLIC_KEY_PATH` (o equivalente) para validar usuarios.
- Redis, MinIO y resto según la guía del monorepo.

---

## 2. Grupos de resolvers (Telegram)

Para que los tickets creen tópicos en Telegram:

1. **Crear el grupo** en Telegram (o usar uno existente).
2. **Convertir en supergrupo** y **activar Topics** (Temas) en la configuración del grupo.
3. **Agregar el bot** al grupo (con permiso para crear temas si aplica).
4. **Obtener el ID del grupo:** en el grupo escribí **`/groupid`**. El bot responde con el ID (ej. `-1003526450193`).
5. **Configurar por env** en el servicio helpdesk:

   ```env
   HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID=-1003526450193
   HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID=-1003526450193
   ```

   (Mismo ID si usás un solo grupo para ambas categorías; distintos si tenés un grupo por categoría.)

Al **arrancar**, el helpdesk sincroniza `helpdesk.resolver_configs` con estos valores. No hace falta insertar ni actualizar la tabla a mano.

Detalle completo: [GRUPOS_RESOLVERS_TELEGRAM.md](./GRUPOS_RESOLVERS_TELEGRAM.md).

---

## 3. Usuarios y vinculación Telegram

- Los usuarios que crean tickets por el bot deben tener **Telegram vinculado** en la plataforma (`telegram_user_id` / `telegram_username` según el modelo).
- Los que actúan como resolvers en los tópicos deben estar en la plataforma y ser considerados “resolvers” (según la lógica de roles/permisos del helpdesk).

Eso se gestiona desde la app o la base, no desde el bot.

---

## 4. Checklist rápido

| Paso | Acción |
|------|--------|
| 1 | Variables de entorno del helpdesk (token, DB, Redis, MinIO, JWT). |
| 2 | Grupo(s) en Telegram: supergrupo + Topics + bot agregado. |
| 3 | En el grupo: `/groupid` → copiar ID. |
| 4 | Setear `HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID` (y opcionalmente `OPERATIONAL_ID`). |
| 5 | Desplegar/reiniciar helpdesk. |
| 6 | Probar: crear un ticket por el bot y verificar que se cree el tópico en el grupo. |

No es necesario ejecutar SQL ni tocar `resolver_configs` a mano si se usan las variables de entorno anteriores.
