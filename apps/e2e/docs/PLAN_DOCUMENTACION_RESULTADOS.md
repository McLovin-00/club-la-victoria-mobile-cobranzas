# Plan: Documentación de Resultados de Tests por Portal

> **Estado**: Pendiente de ejecución (ambiente de testing caído el 30/12/2025)

---

## Objetivo

Generar documentación estructurada de resultados de tests E2E agrupados por portal para tener visibilidad clara del estado de cada módulo.

---

## Portales Identificados

| # | Portal | Proyecto Playwright | Carpeta Tests | Archivos Spec |
|---|--------|---------------------|---------------|---------------|
| 1 | cliente | `cliente` | `tests/cliente/` | 15 |
| 2 | chofer | `chofer` | `tests/chofer/` | 18 |
| 3 | transportista | `transportista` | `tests/transportista/` | 20 |
| 4 | dadorDeCarga | `dadorDeCarga` | `tests/dador/` | 21 |
| 5 | adminInterno | `adminInterno` | `tests/admin-interno/` | 25 |

---

## Estructura de Salida

```
docs/resultados/
├── README.md           # Tabla resumen con links a cada portal
├── cliente.md          
├── chofer.md           
├── transportista.md    
├── dadorDeCarga.md     
└── adminInterno.md     
```

---

## Formato de cada `<portal>.md`

### Sección 1: Resumen

```markdown
# Resultados: Portal [NOMBRE]

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tests | X |
| ✅ Passed | X |
| ❌ Failed | X |
| ⏭️ Skipped | X |
| Pass Rate | X% |
```

### Sección 2: Listado de Tests

Lista alfabética de TODOS los tests (solo nombre/ID, sin detallar los que pasaron).

```markdown
## Listado de Tests

- s01-autenticacion > Test 1
- s01-autenticacion > Test 2
- s02-dashboard > Test 1
...
```

### Sección 3: Detalle de Tests Fallidos

Solo para tests que NO pasaron (FAILED y/o SKIPPED):

```markdown
## Detalle de Tests Fallidos

### ❌ [Suite > Test Name]

- **Archivo**: `path/to/file.spec.ts:línea`
- **Motivo**: descripción breve (1-2 líneas)
- **Error**: mensaje de error exacto
- **Stack trace**: 
  ```
  fragmento mínimo útil
  ```
- **Clasificación**: aserción / timeout / datos / infraestructura / dependencia externa / flaky
- **Acción recomendada**: qué revisar/cambiar
- **Evidencia**: 
  - [screenshot](../test-results/xxx/screenshot.png)
  - [video](../test-results/xxx/video.webm)
  - [trace](../test-results/xxx/trace.zip)
```

---

## Formato del `README.md` (Resumen)

```markdown
# Resultados de Tests por Portal

> Generado el: [FECHA]

## Resumen General

| Portal | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | Pass Rate |
|--------|-------|-----------|-----------|------------|-----------|
| [cliente](cliente.md) | X | X | X | X | X% |
| [chofer](chofer.md) | X | X | X | X | X% |
| [transportista](transportista.md) | X | X | X | X | X% |
| [dadorDeCarga](dadorDeCarga.md) | X | X | X | X | X% |
| [adminInterno](adminInterno.md) | X | X | X | X | X% |
| **TOTAL** | **X** | **X** | **X** | **X** | **X%** |
```

---

## Orden de Ejecución

Ejecutar portal por portal para tener control y poder documentar progresivamente:

### 1. cliente (15 specs)
```powershell
npx playwright test --project=cliente
```

### 2. chofer (18 specs)
```powershell
npx playwright test --project=chofer
```

### 3. transportista (20 specs)
```powershell
npx playwright test --project=transportista
```

### 4. dadorDeCarga (21 specs)
```powershell
npx playwright test --project=dadorDeCarga
```

### 5. adminInterno (25 specs)
```powershell
npx playwright test --project=adminInterno
```

---

## Clasificación de Fallos

Usar estas categorías para clasificar cada fallo:

| Clasificación | Descripción | Ejemplo |
|---------------|-------------|---------|
| **aserción** | El test esperaba un valor/estado diferente | `expect(X).toBe(Y)` falló |
| **timeout** | Elemento no apareció o acción tardó demasiado | `Timeout 30000ms exceeded` |
| **datos** | Datos de prueba faltantes o incorrectos | Usuario no existe, equipo sin datos |
| **infraestructura** | Problema de conexión, VPN, servidor caído | `net::ERR_CONNECTION_REFUSED` |
| **dependencia externa** | API externa falló o devolvió error | Error de servicio externo |
| **flaky** | Test intermitente, pasa a veces falla otras | Sin patrón claro de fallo |

---

## Reglas Importantes

1. **No inventar números**: Solo documentar resultados de ejecuciones reales
2. **Orden alfabético**: Ordenar tests alfabéticamente dentro de cada portal
3. **Evidencia**: Si hay screenshots/videos/traces, linkear con ruta relativa
4. **Detalle mínimo**: Para tests que pasan, solo el nombre. Detalle completo solo para fallos.

---

## Checklist de Ejecución

- [ ] Verificar conexión VPN activa
- [ ] Crear carpeta `docs/resultados/`
- [ ] Ejecutar tests de **cliente** y documentar
- [ ] Ejecutar tests de **chofer** y documentar
- [ ] Ejecutar tests de **transportista** y documentar
- [ ] Ejecutar tests de **dadorDeCarga** y documentar
- [ ] Ejecutar tests de **adminInterno** y documentar
- [ ] Crear `README.md` con tabla resumen
- [ ] Commit de la documentación generada

---

## Prompt para Continuar

Cuando el ambiente esté disponible, usar este prompt:

```
Ejecutar el plan de docs/PLAN_DOCUMENTACION_RESULTADOS.md:
1. Crear la carpeta docs/resultados
2. Ejecutar tests portal por portal en el orden definido
3. Generar los archivos .md con los resultados reales
4. Crear el README.md con el resumen
```
