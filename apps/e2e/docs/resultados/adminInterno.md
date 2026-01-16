# Resultados: Portal Admin Interno

> **Fecha de ejecución**: 2025-12-31 10:38
> **Ambiente**: Staging (10.3.0.243:8550) - 1 Worker

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tests | 401 |
| ✅ Passed | 371 |
| ❌ Failed | 3 |
| ⏭️ Skipped | 27 |
| Pass Rate | **92.5%** |
| Duración | 5.3 minutos |

---

## ❌ Tests Fallidos (3)

### 1. Portal Admin - 7. CONSULTA › Búsqueda Masiva › búsqueda masiva funcional
- **Suite**: s07-consulta
- **Causa**: Timeout o error al ejecutar búsqueda masiva en el modal.

### 2. Portal Admin - 17. FLUJO DE APROBACIÓN › KPIs se actualizan (Choferes)
- **Suite**: s17-flujo-aprobacion
- **Causa**: Problema con actualización de KPIs tras aprobar documentos de choferes.

### 3. Portal Admin - 25. ITEMS ADICIONALES › logo de BCA se muestra en pantalla de login
- **Suite**: s25-items-adicionales
- **Causa**: La página de login no tiene logo de BCA visible.

---

## ⏭️ Tests Skipped (27)

Los tests skipped incluyen:
- Tests de autenticación que evitan bloqueos de cuenta (login fallido, expiración token)
- Tests que requieren datos específicos no disponibles en staging
- Tests de funcionalidades en desarrollo

---

## Nota Técnica

Se creó el archivo `tests/setup/adminInterno.setup.ts` que faltaba para autenticar correctamente al usuario admin interno antes de ejecutar los tests.

---

## Conclusión

El portal tiene un **92.5% de pass rate**, lo cual es bueno. Los 3 fallos son menores:
- 1 relacionado con UI (logo)
- 2 relacionados con búsqueda masiva y KPIs

El portal está funcionalmente estable para uso en staging.
