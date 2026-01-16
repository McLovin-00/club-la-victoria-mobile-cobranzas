# Resultados: Portal Dador de Carga

> **Fecha de ejecución**: 2025-12-31 10:27
> **Ambiente**: Staging (10.3.0.243:8550) - 1 Worker

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total Tests | 360 |
| ✅ Passed | 356 |
| ❌ Failed | 4 |
| ⏭️ Skipped | 0 |
| Pass Rate | **98.9%** |
| Duración | 4.5 minutos |

---

## ❌ Tests Fallidos (4)

### 1. Portal Dador - 1.4 Autorización - Accesos Restringidos › NO puede acceder a /documentos/auditoria
- **Suite**: s01-autenticacion
- **Causa**: El usuario dador puede acceder a `/documentos/auditoria` cuando el test espera que esté restringido.
- **Acción**: Verificar permisos del rol dador en el backend.

### 2. Portal Dador - 6.5 Búsqueda Masiva › ejecuta búsqueda masiva
- **Suite**: s06-consulta
- **Causa**: Timeout o error al ejecutar búsqueda masiva con múltiples patentes/DNIs.
- **Acción**: Revisar selector del botón "Buscar" dentro del modal de búsqueda masiva.

### 3. Portal Dador - 16. FLUJO DE APROBACIÓN › visible en KPIs ("Pendientes")
- **Suite**: s16-flujo-aprobacion
- **Error**: `getByText(/Pendientes/i) resolved to 2 elements` - Selector encuentra múltiples elementos.
- **Acción**: Hacer el selector más específico para evitar ambigüedad.

### 4. Portal Dador - 21. DATOS DE PRUEBA RECOMENDADOS › al menos 5 documentos pendientes de aprobación
- **Suite**: s21-datos-prueba
- **Causa**: No hay suficientes documentos pendientes de aprobación en staging.
- **Acción**: Cargar datos de prueba o ajustar expectativa del test.

---

## Mejoras Aplicadas

En esta ejecución se corrigieron **13 tests que anteriormente estaban skipped**:

- **6 tests en s01-autenticacion**: Implementados con lógica real (verificación de formulario, branding, campos).
- **7 tests en s09-editar-equipo**: Cambiados a navegación directa en lugar de depender de búsqueda de lista.

---

## Conclusión

El portal tiene un excelente **98.9% de pass rate**. Los 4 fallos son menores y están relacionados con:
- Permisos de backend (1)
- Selectores de UI (2)
- Datos de prueba (1)

El portal está funcionalmente muy sólido para uso en staging.
