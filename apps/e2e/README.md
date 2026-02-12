# Tests E2E con Playwright

Tests end-to-end del monorepo BCA, ejecutados contra el ambiente de staging.

## Requisitos Previos

- Node.js >= 20
- npm >= 10
- Acceso a la red interna (VPN si corresponde)
- Navegadores instalados (Chrome/Chromium)

## Instalación

```bash
# Instalar dependencias del monorepo (incluye E2E)
npm install

# Instalar Playwright browsers
npm run e2e:install
```

## Configuración

El archivo `.env.example` contiene la plantilla de variables necesarias. Copiar y completar con las credenciales reales de staging:

```bash
cp .env.example .env
# Editar .env con credenciales de staging
```

**URL de Staging:** `http://10.3.0.243:8550`

## Ejecución de Tests

### Desde el root del monorepo (recomendado)

```bash
# Ejecutar todos los tests
npm run e2e:all

# Ejecutar tests de un portal específico
npm run e2e:cliente
npm run e2e:chofer
npm run e2e:transportista
npm run e2e:dador
npm run e2e:admin

# Modo UI (interactivo)
npm run e2e:ui

# Ver reporte HTML
npm run e2e:report

# Code generator para nuevos tests
npm run e2e:codegen
```

### Desde apps/e2e directamente

```bash
cd apps/e2e

# Ejecutar todos
npm run pw:test

# Ejecutar por portal
npm run test:cliente
npm run test:chofer
# etc.
```

## Setup de Autenticación

Los tests usan `storageState` para evitar logearse en cada test. Para generar los archivos de autenticación:

```bash
# Desde el root - genera todos los storageState files
npm run e2e:setup

# O individualmente
cd apps/e2e
npm run pw:setup:cliente
npm run pw:setup:chofer
npm run pw:setup:transportista
npm run pw:setup:dador
npm run pw:setup:admin
```

Esto genera los archivos en `.auth/*.json` que NO deben commitearse.

## Tests Unitarios (Page Objects)

```bash
# Ejecutar tests unitarios de Page Objects con coverage
npm run e2e:unit
```

## Ambiente de Staging

- **URL**: `http://10.3.0.243:8550`
- Los tests ejecutan contra este ambiente por defecto
- **NO** se mockea backend ni frontend - son tests E2E reales

## Estructura

```
apps/e2e/
├── tests/               # Tests E2E organizados por portal
│   ├── auth/           # Smoke tests de autenticación
│   ├── setup/          # Scripts para generar storageState
│   ├── cliente/        # Tests del portal cliente
│   ├── chofer/         # Tests del portal chofer
│   ├── transportista/  # Tests del portal transportista
│   ├── dador/          # Tests del portal dador de carga
│   └── admin-interno/  # Tests del portal admin interno
├── pages/              # Page Objects Pattern
├── fixtures/           # Fixtures de datos de prueba
├── utils/              # Utilidades (env.ts, authState.ts)
├── scripts/            # Scripts auxiliares
├── .auth/              # StorageState files (no commiteado)
├── .env                # Variables de entorno (no commiteado)
├── .env.example        # Plantilla de variables
├── playwright.config.ts # Configuración de Playwright
├── jest.config.js      # Configuración de Jest
└── package.json        # Dependencias y scripts
```

## Nuevas Funcionalidades Testeadas

### Remitos con IA
- ✅ Carga y análisis automático de remitos con IA
- ✅ Edición de datos extraídos
- ✅ Rechazo de remitos con motivos
- ✅ Listado con filtros y paginación
- ✅ Exportación a Excel

### Documentos Rechazados
- ✅ Vista por rol (Dador, Chofer, Transportista)
- ✅ Vista previa de documentos
- ✅ Motivos de rechazo visibles
- ✅ Filtros por entidad

### Múltiples Plantillas
- ✅ Selección múltiple de plantillas por cliente
- ✅ Plantillas específicas (propietario-chofer vs empresa)
- ✅ Suma automática de documentos
- ✅ Configuración por Admin

### Reutilización y Validación
- ✅ Reutilización de empresas por CUIT
- ✅ Validación de duplicados (chofer, camión, acoplado)
- ✅ Reutilización de entidades huérfanas

### Sistema de Transferencias
- ✅ Solicitud de transferencia de entidades
- ✅ Aprobación/Rechazo por Admin
- ✅ Notificaciones de estado

### Sistema de Alertas
- ✅ Campanita de notificaciones
- ✅ Alertas de documentos rechazados
- ✅ Alertas de vencimientos próximos
- ✅ Alertas de transferencias

### Auditoría y Extracción IA
- ✅ Auditoría previa de documentación
- ✅ Extracción automática de datos
- ✅ Almacenamiento flexible de datos extraídos

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run e2e` | Ejecutar todos los tests E2E |
| `npm run e2e:install` | Instalar navegadores de Playwright |
| `npm run e2e:ui` | Modo interactivo de Playwright |
| `npm run e2e:report` | Abrir reporte HTML |
| `npm run e2e:setup` | Generar todos los storageState |
| `npm run e2e:cliente` | Tests del portal cliente |
| `npm run e2e:chofer` | Tests del portal chofer |
| `npm run e2e:transportista` | Tests del portal transportista |
| `npm run e2e:dador` | Tests del portal dador |
| `npm run e2e:admin` | Tests del portal admin |
| `npm run e2e:all` | Ejecutar todos los tests |
| `npm run e2e:unit` | Tests unitarios de Page Objects |
| `npm run e2e:sonar` | Análisis de SonarQube |

### Scripts para Nuevas Funcionalidades

```bash
# Tests específicos de remitos
npm run e2e -- --grep="remitos"

# Tests de documentos rechazados
npm run e2e -- --grep="rechazados"

# Tests de transferencias
npm run e2e -- --grep="transferencias"

# Tests de alertas
npm run e2e -- --grep="alertas"

# Tests de plantillas múltiples
npm run e2e -- --grep="plantillas"
```

## Notas Importantes

1. **Sin mocks**: Los tests son E2E reales contra el sistema deployado
2. **StorageState**: La autenticación persiste para evitar múltiples logins
3. **Timeouts**: Configurados para ambiente lento (2min por test)
4. **Paralelismo**: Limitado a 4 workers local, 2 en CI
