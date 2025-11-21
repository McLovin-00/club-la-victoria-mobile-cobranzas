# 👨‍💻 Portal Admin Interno - Guía de Uso

## 🎯 Descripción

El rol **ADMIN_INTERNO** está diseñado para personal interno de Quebracho Blanco / Microsyst que necesita acceso completo para gestionar equipos y documentación de todos los dadores.

---

## 🔑 Crear Usuario ADMIN_INTERNO

### Método 1: Script Automático (Recomendado)

```bash
cd /home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243
./seed-admin-interno.sh
```

Este script:
- ✅ Crea el usuario automáticamente
- ✅ Lo asocia a la empresa correcta
- ✅ Configura todos los permisos
- ✅ Muestra las credenciales de acceso

### Método 2: Desde el proyecto principal

```bash
cd /home/administrador/monorepo-bca
npx ts-node -r tsconfig-paths/register scripts/seed-admin-interno.ts
```

### Método 3: Seed manual en Prisma Studio

```bash
cd /home/administrador/monorepo-bca/apps/backend
npx prisma studio
```

Luego crear un usuario con:
- **email**: `admin.interno@bca.com`
- **password**: (encriptado con bcrypt, rounds 12)
- **role**: `ADMIN_INTERNO`
- **empresaId**: ID de la empresa (obtener de tabla `empresas`)

---

## 🌐 Acceso al Portal

### Credenciales por defecto:
```
URL:      http://10.3.0.243:3000/login
Email:    admin.interno@bca.com
Password: Admin2024!
```

### Portal directo:
```
http://10.3.0.243:3000/portal/admin-interno
```

---

## 📋 Permisos del Rol ADMIN_INTERNO

### ✅ Permisos Completos

1. **Gestión de Equipos**
   - Crear equipos para cualquier dador
   - Modificar equipos existentes
   - Eliminar equipos
   - Ver historial completo
   - Alta completa de equipos

2. **Gestión de Documentos**
   - Subir documentos para cualquier dador
   - Ver documentos de todos los dadores
   - Descargar documentos
   - Carga masiva con IA
   - Eliminar documentos

3. **Aprobación de Documentos**
   - Ver cola de aprobación (todos los dadores)
   - Aprobar documentos de cualquier dador
   - Rechazar documentos
   - Aprobación en lote
   - Ver estadísticas de aprobación

4. **Gestión de Dadores**
   - Listar todos los dadores
   - Crear nuevos dadores
   - Modificar dadores existentes
   - Eliminar dadores
   - Configurar notificaciones por dador

5. **Gestión de Maestros**
   - Ver maestros de todos los dadores:
     - Empresas transportistas
     - Choferes
     - Camiones
     - Acoplados
   - Crear/modificar/eliminar maestros
   - Búsqueda avanzada

6. **Auditoría**
   - Ver logs completos del sistema
   - Filtrar por usuario, acción, fecha
   - Exportar logs
   - Ver estadísticas

7. **Configuración**
   - Ver templates de documentos
   - Ver configuración de notificaciones (no modificar global)

### ❌ Restricciones

- **NO puede** modificar configuración global del sistema
- **NO puede** cambiar configuración de seguridad
- **NO puede** gestionar usuarios de plataforma (eso es para ADMIN/SUPERADMIN)

---

## 🎨 Características del Portal

### Dashboard Principal

El portal `admin-interno` incluye:

1. **Selector de Dador**
   - Filtrar vista por dador específico
   - Ver todos los dadores simultáneamente

2. **Tarjetas de Estadísticas**
   - Total de equipos
   - Documentos pendientes de aprobación
   - Dadores activos
   - Acciones rápidas

3. **Acciones Principales** (acceso rápido)
   - Alta de Equipo
   - Carga de Documentos
   - Gestión de Dadores
   - Aprobar Documentos
   - Consultar Maestros
   - Auditoría

4. **Navegación Completa**
   - Acceso a todas las páginas de documentos
   - Panel completo de documentos
   - Equipos, maestros, clientes, etc.

### Funcionalidades Destacadas

#### 📦 Alta de Equipos
- Formulario completo con todos los datos
- Validación en tiempo real
- Carga de 19 documentos obligatorios
- Asignación a múltiples clientes

#### 📄 Aprobación de Documentos
- Cola de pendientes con filtros
- Vista previa lado a lado
- Aprobación individual o en lote
- Motivos de rechazo configurables

#### 🔍 Búsqueda Avanzada
- Por patentes (hasta 50)
- Por DNI de chofer
- Por CUIT de empresa
- Filtros combinados

#### 📥 Descarga Masiva
- ZIP estructurado por equipo
- Filtros temporales
- Resumen Excel incluido
- Formato condicional por estado

---

## 🚀 Flujo de Trabajo Típico

### Ejemplo 1: Cargar Equipo Nuevo

```
1. Login → admin.interno@bca.com
2. Portal Admin Interno
3. Click "Alta de Equipo"
4. Seleccionar Dador: Leandro Castro
5. Completar datos del equipo:
   - Empresa transportista
   - Chofer (DNI)
   - Camión (patente)
   - Acoplado (patente)
   - Clientes asignados
6. Subir 19 documentos obligatorios
7. Guardar
8. ✅ Equipo creado y listo para operar
```

### Ejemplo 2: Aprobar Documentos

```
1. Login → admin.interno@bca.com
2. Portal Admin Interno
3. Ver "12 pendientes" en tarjeta
4. Click "Aprobar Documentos"
5. Revisar cada documento:
   - Vista previa del PDF
   - Datos del formulario
6. Aprobar ✅ o Rechazar ❌
7. Si rechaza: motivo + comentario
8. Notificación enviada automáticamente
```

### Ejemplo 3: Ayudar a un Dador

```
1. Login → admin.interno@bca.com
2. Portal Admin Interno
3. Selector de Dador: "Leandro Castro"
4. Ver estadísticas del dador
5. Identificar problema: 5 equipos con docs vencidos
6. Click en cada equipo
7. Solicitar docs faltantes al chofer
8. Aprobar docs cuando los suban
```

---

## 🔧 Soporte Técnico

### Verificar que el usuario existe

```bash
# Conectarse a PostgreSQL
docker exec -it stack-ip-10.3.0.243-postgres-1 psql -U postgres -d monorepo_bca

# Consultar usuario
SELECT id, email, role, "empresaId", nombre, apellido 
FROM platform_users 
WHERE email = 'admin.interno@bca.com';

# Salir
\q
```

### Recrear usuario

```bash
# Eliminar usuario existente
docker exec -it stack-ip-10.3.0.243-postgres-1 psql -U postgres -d monorepo_bca -c "DELETE FROM platform_users WHERE email = 'admin.interno@bca.com';"

# Crear nuevo usuario
cd /home/administrador/monorepo-bca/deploy/stack-ip-10.3.0.243
./seed-admin-interno.sh
```

### Cambiar contraseña

```bash
# En Node.js (dentro del contenedor backend)
docker exec -it stack-ip-10.3.0.243-backend-1 node -e "
const bcrypt = require('bcrypt');
const password = 'NuevaPassword123!';
const hash = bcrypt.hashSync(password, 12);
console.log('Hash:', hash);
"

# Copiar el hash generado

# Actualizar en PostgreSQL
docker exec -it stack-ip-10.3.0.243-postgres-1 psql -U postgres -d monorepo_bca -c "
UPDATE platform_users 
SET password = '$2b$12$...' 
WHERE email = 'admin.interno@bca.com';
"
```

---

## 📊 Diferencias con otros roles

| Característica | ADMIN | ADMIN_INTERNO | OPERATOR | DADOR_CARGA |
|----------------|-------|---------------|----------|-------------|
| Ver todos los dadores | ✅ | ✅ | ✅ | ❌ |
| Crear equipos (cualquier dador) | ✅ | ✅ | ✅ | ❌ |
| Aprobar documentos | ✅ | ✅ | ❌ | 🟢 Si habilitado |
| Eliminar equipos | ✅ | ✅ | ❌ | ❌ |
| Gestionar dadores | ✅ | ✅ | ❌ | ❌ |
| Gestionar clientes | ✅ | ❌ | ❌ | ❌ |
| Config global | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |

### ADMIN_INTERNO vs ADMIN

**ADMIN_INTERNO**:
- Orientado a **operaciones** y **soporte**
- Acceso completo a documentos y equipos
- Puede aprobar/rechazar documentos
- NO gestiona configuración ni usuarios

**ADMIN**:
- Orientado a **administración** completa
- Todo lo que hace ADMIN_INTERNO +
- Gestiona usuarios y permisos
- Configura el sistema
- Gestiona clientes y requisitos

---

## 📝 Notas Importantes

1. **Seguridad**
   - Cambiar la contraseña por defecto en producción
   - Usar contraseñas fuertes (mínimo 12 caracteres)
   - No compartir credenciales

2. **Limitaciones**
   - El usuario debe estar asociado a una empresa (tenant)
   - No tiene acceso cross-tenant (solo SUPERADMIN)
   - Los cambios en permisos requieren re-login

3. **Best Practices**
   - Revisar auditoría regularmente
   - Aprobar documentos el mismo día
   - Mantener comunicación con dadores
   - Solicitar docs faltantes proactivamente

---

## 🆘 Problemas Comunes

### No puedo ver documentos pendientes

**Solución**: Verificar que hay documentos con estado `PENDIENTE_APROBACION` en la base de datos.

```sql
SELECT COUNT(*) FROM documents WHERE "estadoAprobacion" = 'PENDIENTE_APROBACION';
```

### No puedo acceder al portal

**Solución**: Verificar:
1. Que el rol sea `ADMIN_INTERNO`
2. Que la empresa exista y esté activa
3. Que la ruta en App.tsx incluya `ADMIN_INTERNO` en `allowedRoles`

### Error 403 al aprobar documentos

**Solución**: Verificar que las rutas de approval incluyen `ADMIN_INTERNO` en el middleware `authorize`.

---

**Fecha de documento**: 21 de Noviembre, 2025  
**Versión**: 1.0  
**Autor**: Microsyst Development Team

