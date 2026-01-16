# Resultados: Portal Chofer

> **Fecha de ejecución**: 2025-12-30 13:08
> **Ambiente**: Staging (10.3.0.243:8550) - 1 Worker

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tests | 271 |
| ✅ Passed | 197 |
| ❌ Failed | 4 |
| ⏭️ Skipped | 70 |
| Pass Rate | **72.6%** |
| Duración | 3.4 minutos |

---

## ❌ Tests Fallidos (4)

### 1. Portal Chofer - 2. DASHBOARD PRINCIPAL › 2.1 Interfaz Visual › debe tener fondo con gradiente apropiado
- **Suite**: s02-dashboard
- **Posible Causa**: Cambio en estilos CSS o diseño visual en staging difiere de lo esperado por el test.
- **Evidencia**: [Trace](../test-results/chofer/chofer-2025-12-30-1308/chofer-s02-dashboard-Porta-47473-ndo-con-gradiente-apropiado-chofer/trace.zip)

### 2. Portal Chofer - 3. CONSULTA DE EQUIPOS › 3.2 Filtros - Visibilidad para Chofer › NO deben aparecer botones de tipo de filtro
- **Suite**: s03-consulta
- **Posible Causa**: Los botones de filtro (Dador, Transportista) podrían estar filtrándose visiblemente pero existiendo en el DOM, o el test falló al detectar su ausencia.
- **Evidencia**: [Trace](../test-results/chofer/chofer-2025-12-30-1308/chofer-s03-consulta-Portal-d0d0b-r-botones-de-tipo-de-filtro-chofer/trace.zip)

### 3. Portal Chofer - 15. RENDIMIENTO Y UX › 15.1 Estados de Carga › cálculo de compliance visible
- **Suite**: s15-rendimiento-ux
- **Posible Causa**: Elemento de UI de compliance no visible o tardó demasiado en cargar.
- **Evidencia**: [Trace](../test-results/chofer/chofer-2025-12-30-1308/chofer-s15-rendimiento-ux--ec687-lculo-de-compliance-visible-chofer/trace.zip)

### 4. Portal Chofer - 16. SEGURIDAD › 16.3 Acciones Protegidas › token requerido para todas las operaciones
- **Suite**: s16-seguridad
- **Posible Causa**: Fallo en la verificación de token o selector de botón incorrecto (error persistente de ejecución anterior).
- **Evidencia**: [Trace](../test-results/chofer/chofer-2025-12-30-1308/chofer-s16-seguridad-Porta-06c8e--para-todas-las-operaciones-chofer/trace.zip)

---

## ⏭️ Tests Skipped (70)

Gran cantidad de tests saltados ("skipped"), principalmente en:
- **s09-ver-estado**: Funcionalidad de estado de documento en desarrollo.
- **s13-documentos-pendientes**: Flujo de pendientes aún no implementado completamente en frontend.
- **s16-seguridad**: Varios tests de seguridad omitidos para evitar bloqueos de cuenta o requerimientos de setup complejo.

---

## Conclusiones del Portal Chofer

El portal funciona correctamente en su mayoría (**72.6%** pass rate), pero tiene áreas pendientes de desarrollo (tests skipped) y algunos ajustes visuales/seguridad necesarios (4 fallos).
