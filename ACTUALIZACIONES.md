# Guía de Actualizaciones - App Mobile

Este documento explica cómo actualizar la app y distribuirla a los clientes.

---

## ¿Qué tipo de actualización necesitás?

| Tipo de cambio | Acción | El usuario debe reinstalar? |
|----------------|--------|----------------------------|
| Cambios en JS/CSS (UI, lógica, pantallas) | **OTA Update** | ❌ No, se actualiza solo |
| Cambios nativos (nuevas librerías, permisos, config) | **Nuevo build APK** | ✅ Sí, descargar e instalar |

---

## 1. Actualización OTA (Solo JS/CSS)

Usá esto cuando modifiques:
- Componentes React
- Estilos (Tailwind/CSS)
- Lógica de negocio
- Pantallas existentes
- Fixes de bugs

### Pasos:

```bash
# 1. Hacé tus cambios en el código
# ...

# 2. Subí el update a EAS
eas update --branch production --message "Descripción corta del cambio"
```

**Eso es todo.** Cuando el usuario abra la app, verá el modal de actualización.

### Ejemplos:

```bash
eas update --branch production --message "Fix: error al cargar grupos familiares"
eas update --branch production --message "Mejora: nuevos filtros de búsqueda"
eas update --branch production --message "Feature: soporte offline"
```

---

## 2. Nuevo Build APK (Cambios Nativos)

Usá esto cuando:
- Agregaste una nueva dependencia (npm install ...)
- Modificaste `app.json` (permisos, configuración)
- Cambiaste el ícono o splash
- Hay actualización mayor de Expo

### Pasos:

```bash
# 1. Actualizá la versión en app.json
# "version": "1.0.0" → "version": "1.1.0"

# 2. (Opcional) Si es un cambio grande, también actualizá package.json
# "version": "1.0.0" → "version": "1.1.0"

# 3. Generá el nuevo APK
eas build --platform android --profile production
```

### Versionado recomendado:

| Tipo de cambio | Versión anterior | Versión nueva |
|----------------|------------------|---------------|
| Bug fix menor | 1.0.0 | 1.0.1 |
| Nueva feature | 1.0.0 | 1.1.0 |
| Cambio mayor / breaking | 1.0.0 | 2.0.0 |

---

## 3. Flujo de Trabajo Completo

### Escenario A: Solo arreglé un bug / agregué una feature pequeña

```bash
# 1. Código listo, probado localmente
npm start

# 2. Subir update OTA
eas update --branch production --message "Fix: descripción del fix"

# 3. Listo ✅
```

### Escenario B: Instalé una librería nueva

```bash
# 1. Instalar la dependencia
npx expo install nombre-libreria

# 2. Actualizar versión
# Editar app.json: "version": "1.0.0" → "1.1.0"

# 3. Generar nuevo APK
eas build --platform android --profile production

# 4. Descargar el APK y enviarlo al cliente

# 5. (Opcional) Para cambios JS posteriores, usar OTA
eas update --branch production --message "Ajustes post-librería"
```

### Escenario C: Release mayor con muchos cambios

```bash
# 1. Actualizar versión en ambos archivos
# app.json: "version": "1.0.0" → "2.0.0"
# package.json: "version": "1.0.0" → "2.0.0"

# 2. Generar build
eas build --platform android --profile production

# 3. Enviar APK al cliente

# 4. Durante el uso, hacer ajustes con OTA
eas update --branch production --message "Fix menor post-release"
```

---

## 4. Comandos Útiles

```bash
# Ver historial de updates
eas update:list --branch production

# Ver builds disponibles
eas build:list

# Ver estado de un build
eas build:view [BUILD_ID]

# Cancelar un update pendiente
eas update:delete --branch production --id [UPDATE_ID]
```

---

## 5. Checklist Pre-Release

Antes de mandar un update/build:

- [ ] Probé localmente (`npm start`)
- [ ] Probé en dispositivo real con Expo Go (opcional pero recomendado)
- [ ] Actualicé la versión si es cambio nativo
- [ ] El mensaje del update es descriptivo

---

## 6. Troubleshooting

### Error: Cannot find module 'fs-extra'

Este error aparece con `expo-updates` en Expo 55. Es un bug conocido.

**Solución:**
```bash
npm install fs-extra
```

### El usuario no ve el update

1. Verificá que el update se completó: `eas update:list`
2. El check de updates ocurre al **abrir la app** - pedirle que la cierre y abra de nuevo
3. Si sigue sin funcionar, puede ser cache - reiniciar el teléfono ayuda

### Error en el build

1. Revisar el log: `eas build:view [BUILD_ID]`
2. Problemas comunes:
   - Dependencia mal instalada → `npx expo install --fix`
   - Error de sintaxis → revisar el código
   - Problema de credenciales → `eas credentials`

### Quiero volver a una versión anterior

```bash
# Ver updates disponibles
eas update:list --branch production

# Rollback a un update específico
eas update:republish --branch production --id [UPDATE_ID]
```

---

## 7. Contacto / Soporte

Si hay problemas con EAS:
- [Documentación oficial de EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Foros de Expo](https://forums.expo.dev/)

---

**Recordá:** OTA updates son GRATIS hasta 30/mes. Los builds consumen minutos de EAS (tenés 30/min mes gratis en plan free).
