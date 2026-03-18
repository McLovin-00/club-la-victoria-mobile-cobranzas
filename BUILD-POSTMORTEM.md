# Club La Victoria - Mobile Cobranzas: Postmortem de Build

**Fecha:** 18/3/2026  
**Proyecto:** `club-la-victoria-mobile-cobranzas`  
**SDK:** Expo SDK 55 + React Native 0.83.2

---

## Problema Reportado

> "Me da error al buildear la apk de la app mobile"  
> "La app funciona, se instala pero al abrila se cierra sola"

---

## Problema 1: La app crashea al abrirse

### Síntoma
La APK instalada crashea inmediatamente al abrirse. Sin mensajes de error visibles.

### Diagnóstico

1. **Código muerto:** El archivo `app/_layout.tsx` importaba `UpdateBanner` desde `../components/updates`.
2. **Paquete inexistente:** El paquete `expo-updates` **nunca fue instalado** en `package.json`.
3. **Archivo inexistente:** La carpeta `components/updates/` tampoco existía en el repo original.

Resultado: Metro bundler y EAS fallaban silenciosamente o generaban un bundle corrupto.

### Solución

```diff
// app/_layout.tsx — línea 10
- import { UpdateBanner } from '../components/updates';
```

```diff
// app/_layout.tsx — línea 35
-         <UpdateBanner />
```

```bash
# Eliminar carpeta con código muerto
rm -rf components/updates/
```

---

## Problema 2: EAS Build falla con "Gradle build failed with unknown error"

### Síntoma

**13 builds fallidos consecutivos** con SDK 55 en EAS Build. Todos con error:
```
Gradle build failed with unknown error.
```

Los logs no eran accesibles desde la CLI en builds fallidos.

### Diagnóstico

1. **android/ commiteado:** El folder `android/` estaba en git (agregado en commit `8b5b4d5` el 17/3).
2. **EAS usa el android commiteado:** Al existir `android/` en el repo, EAS lo usa directamente en vez de generarlo.
3. **Configuración incompatible:** El `android/` commiteado tenía Gradle 8.10.2 + expo prebuild con configuración de SDK mezclada. Los builds que funcionaban el 17/3 no tenían `android/` en git — EAS lo generaba automáticamente con la versión correcta.

### Evidencia

- Builds `e0341b1d` y `111ed885` (17/3) → **finished** con SDK 55 — NO tenían `android/` en git
- Builds `9a03ba0c` hasta `1afdc26e` (17-18/3) → **errored** con SDK 55 — SÍ tenían `android/` en git
- Build `d05fb96d` (18/3) → **finished** con SDK 52 (workflow diferente)

### Solución

```bash
# Sacar android/ de git
git rm -r --cached android/

# Agregar al .gitignore
echo "android/" >> .gitignore
```

**Ya NO se commitea `android/`**. EAS lo genera automáticamente durante el build. Este es el workflow estándar de Expo Bare Workflow.

### Lecciones aprendidas

| Lo que hacíamos | Por qué está mal | Lo correcto |
|---|---|---|
| Commits `expo prebuild` y commiteo `android/` | La configuración de native se desincroniza con el entorno de EAS | Dejar que EAS genere `android/` durante el build |

---

## Problema 3: Build local falla por rutas de Windows

### Síntoma

El build local con `./gradlew assembleRelease` falla con:

```
ninja: error: mkdir(.../react-native-safe-area-context): No such file or directory
C++: ninja: error: Filename longer than 260 characters
```

### Diagnóstico

La ruta del proyecto tiene espacios: `C:/Proyectos/Club la Victoria/`. CMake (usado por react-native-reanimated, react-native-screens, etc.) no maneja bien rutas con espacios en Windows.

### Solución

**No afecta a EAS Build** — EAS corre en Linux donde este problema no existe.

Para build local en Windows, usar:
```bash
# Build single architecture para evitar paths largos
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

O mover el proyecto a una ruta sin espacios.

---

## Configuración final del repo

### Archivos críticos para EAS

```
package.json          ← dependencias exactas (SDK 55, sin expo-updates)
app.json              ← config de expo (sin expo-updates plugin)
babel.config.js        ← preset expo + jsxImportSource nativewind
eas.json               ← perfiles de build
.gitignore            ← IGNORA android/
```

### NO van en git

```
android/               ← EAS lo genera durante el build
builds/*.apk          ← APKs locales
node_modules/         ← siempre ignorado
```

### Estructura correcta

```
club-la-victoria-mobile-cobranzas/
├── app/                    ← código fuente
│   ├── _layout.tsx         ← SIN UpdateBanner
│   └── ...
├── components/              ← SIN components/updates/
├── hooks/
│   └── useUpdates.ts        ← stub inofensivo
├── package.json             ← SDK 55, sin expo-updates
├── app.json                 ← sin expo-updates plugin
├── babel.config.js         ← { jsxImportSource: "nativewind" }
├── eas.json                 ← perfiles production/preview
├── .gitignore              ← android/
└── metro.config.cjs
```

---

## Cómo hacer builds en el futuro

### Build de producción (EAS)

```bash
cd club-la-victoria-mobile-cobranzas
npx eas build --platform android --profile production
```

EAS genera `android/` automáticamente. **NO ejecutar `npx expo prebuild` antes de buildear.**

### Si necesitás regenerar android/ localmente

Solo para desarrollo local, **no commitrear**:

```bash
npx expo prebuild --platform android
# Editar android/ localmente para pruebas
# NUNCA git add android/
```

### Si necesitás cambiar la configuración native

Cambiar en `app.json` y dejar que `expo prebuild` lo resuelva en el siguiente build.

---

## Builds exitosos como referencia

| Build ID | Fecha | SDK | Status | APK |
|---|---|---|---|---|
| `b84f55a2` | 18/3/2026 | 55.0.0 | finished | `eas/oL3wD9UprtD6kcmvX7SUjY.apk` |
| `e0341b1d` | 17/3/2026 | 55.0.0 | finished | `eas/tFLovbd4SQ2oUTAZtKwcSG.apk` (preview) |
| `d05fb96d` | 18/3/2026 | 52.0.0 | finished | `eas/rJoKrbcCShSS8gppQ7WZ79.apk` |

---

## Resumen ejecutivo

1. **App crasheaba:** Código referencing `expo-updates` que no existía → **eliminado `UpdateBanner`**
2. **EAS fallaba:** `android/` commiteado → **sacado de git**, EAS lo genera
3. **Build local fallaba:** Rutas Windows con espacios → **no afecta EAS**

**Regla de oro:** En Bare Workflow con EAS, `android/` se ignora. EAS genera la configuración native correcta en sus servidores.
