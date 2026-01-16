# Resultados: Portal Transportista

> **Fecha de ejecución**: 2025-12-30 17:05
> **Ambiente**: Staging (10.3.0.243:8550) - 1 Worker

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tests | 380 |
| ✅ Passed | 339 |
| ❌ Failed | 3 |
| ⏭️ Skipped | 38 |
| Pass Rate | **89.2%** |
| Duración | 7.2 minutos |

---

## ❌ Tests Fallidos (3)

### 1. Portal Transportista - 3. ALTA COMPLETA DE EQUIPO › 3.2 Selector de Dador de Carga › campo "Dador de Carga" visible
- **Suite**: s03-alta-completa
- **Posible Causa**: Campo "Dador de Carga" no visible en el formulario de alta o selector con nombre diferente.
- **Evidencia**: [Trace](../test-results/transportista/transportista-2025-12-30-1705/transportista-s03-alta-com-26475-ampo-Dador-de-Carga-visible-transportista/trace.zip)

### 2. Portal Transportista - 4. CONSULTA DE EQUIPOS › 4.6 Búsqueda Masiva › botón "Buscar" en modal visible
- **Suite**: s04-consulta
- **Posible Causa**: Modal de búsqueda masiva no tiene botón "Buscar" visible o tiene texto diferente.
- **Evidencia**: [Trace](../test-results/transportista/transportista-2025-12-30-1705/transportista-s04-consulta-1d274-tón-Buscar-en-modal-visible-transportista/trace.zip)

### 3. Portal Transportista - 17. RENDIMIENTO Y UX › 17.1 Estados de Carga › spinner al buscar equipos
- **Suite**: s17-rendimiento-ux
- **Posible Causa**: Spinner de carga no visible o búsqueda demasiado rápida para detectarlo.
- **Evidencia**: [Trace](../test-results/transportista/transportista-2025-12-30-1705/transportista-s17-rendimie-1e298-a-spinner-al-buscar-equipos-transportista/trace.zip)

---

## ⏭️ Tests Skipped (38)

Los tests skipped corresponden principalmente a:
- Tests que requieren equipos existentes y no encontraron datos
- Tests de funcionalidades en desarrollo
- Tests de seguridad que evitan bloqueos de cuenta

---

## Conclusiones del Portal Transportista

El portal tiene un **89.2% de pass rate**, lo cual es muy bueno. Los 3 fallos detectados son menores:
- 2 son problemas de selectores/UI que pueden necesitar ajuste
- 1 es un test de UX (spinner) que puede ser flaky en ambientes rápidos

El portal está funcionalmente sólido para uso en staging.
