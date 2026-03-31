# Cómo tener un grupo de resolvers en Telegram

Guía paso a paso para que los tickets creados por el bot lleguen a un grupo de Telegram y se abra un tópico por ticket.

---

## 1. Crear el grupo en Telegram

1. En Telegram, creá un **grupo nuevo** (no canal).
2. Poné un nombre, por ejemplo: **Mesa de Ayuda Técnica**.
3. Agregá al menos un miembro (además de vos).

---

## 2. Convertir en supergrupo y activar Topics

El bot crea **un tópico por ticket**, así que el grupo debe ser tipo “foro” (con Topics):

1. Entrá al grupo → **nombre del grupo** (arriba) → **Editar**.
2. Tocá **Tipo de grupo** y pasalo a **Supergrupo** si todavía no lo es.
3. En la configuración del grupo, buscá **Topics** (Temas) y **activálos**.

Cuando Topics está activo, en el grupo se ven “Temas” y se pueden crear hilos (tópicos). El bot usará eso para cada ticket. Al convertir en supergrupo, el ID del chat puede cambiar; usá `/groupid` de nuevo y actualizá env o DB.

---

## 3. Agregar el bot al grupo

1. Buscá tu bot por su @ (el mismo que usás por DM para crear tickets).
2. Agregalo al grupo como miembro.
3. (Opcional) Dale permisos de administrador si querés que pueda crear tópicos sin depender de otros admins. Como mínimo necesita poder **crear temas**.

---

## 4. Obtener el ID del grupo

El sistema necesita el **ID numérico** del grupo (ej: `-1003526450193`).

### Opción A (recomendada): comando /groupid

1. Con el bot ya en el grupo, escribí **`/groupid`** en el grupo.
2. El bot responde con el ID del grupo. Copiá ese número (incluye el signo negativo).

No hace falta parar el servicio ni usar la API de Telegram.

### Opción B: API getUpdates

1. Pará el contenedor del helpdesk (`docker stop helpdesk`).
2. Enviá un mensaje en el grupo.
3. Ejecutá `Invoke-RestMethod "https://api.telegram.org/bot<TU_TOKEN>/getUpdates"` y buscá `chat.id` en la respuesta.
4. Volvé a levantar el helpdesk.

---

## 5. Guardar la configuración

### En producción (recomendado): variables de entorno

Configurá en el entorno del helpdesk (Docker, K8s, etc.):

```env
HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID=-1003526450193
HELPDESK_TELEGRAM_GROUP_OPERATIONAL_ID=-1003526450193
```

Al arrancar, el helpdesk **sincroniza** `resolver_configs` con estos valores (crea o actualiza las filas). No hace falta tocar la base a mano.

Podés usar el mismo ID para ambas categorías (un solo grupo) o IDs distintos (un grupo Técnica y otro Operativa).

### Manual: base de datos

Si no usás env, el helpdesk lee los grupos desde la tabla `helpdesk.resolver_configs`. Conectate a la base (`HELPDESK_DATABASE_URL`) y ejecutá:

```sql
INSERT INTO helpdesk.resolver_configs (
  category,
  telegram_group_id,
  telegram_group_name,
  resolver_names,
  is_active
)
VALUES
  ('TECHNICAL', '-1001234567890', 'Mesa de Ayuda Técnica', ARRAY['Resolver 1'], true),
  ('OPERATIONAL', '-1001234567891', 'Mesa de Ayuda Operativa', ARRAY['Resolver 1'], true);
```

- Reemplazá `-1001234567890` y `-1001234567891` por los IDs reales de tus grupos (uno para Técnica y otro para Operativa, o el mismo si usás un solo grupo para ambas).
- Si ya tenés filas para `TECHNICAL` u `OPERATIONAL`, usá `UPDATE` en vez de `INSERT`:

```sql
UPDATE helpdesk.resolver_configs
SET telegram_group_id = '-1001234567890',
    telegram_group_name = 'Mesa de Ayuda Técnica',
    updated_at = now()
WHERE category = 'TECHNICAL';
```

---

## 6. Probar

1. Creá un ticket por el bot (por DM), eligiendo **Técnica** o **Operativa** según el grupo que configuraste.
2. Entrá al grupo de Telegram: debería aparecer un **tópico nuevo** con el número del ticket y el asunto.
3. Ese tópico es el “grupo de resolvers de esa categoría” para ese ticket.

---

## Resumen rápido

| Paso | Acción |
|------|--------|
| 1 | Crear grupo en Telegram |
| 2 | Supergrupo + **Topics** activados |
| 3 | Agregar el bot al grupo |
| 4 | En el grupo, escribir **/groupid** y copiar el ID (o usar getUpdates si preferís) |
| 5 | Setear env `HELPDESK_TELEGRAM_GROUP_TECHNICAL_ID` (y opcional `OPERATIONAL_ID`) o insertar/actualizar `resolver_configs` en la DB |
| 6 | Crear un ticket por el bot y revisar que se cree el tópico en el grupo |

Si no configurás ningún grupo (o la categoría no tiene fila activa en `resolver_configs`), el ticket se crea igual en la base y por DM, pero **no** se crea tópico ni se notifica al grupo.
