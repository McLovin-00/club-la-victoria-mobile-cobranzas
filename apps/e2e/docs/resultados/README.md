# Resultados de Tests por Portal

> **Fecha de última actualización**: 2025-12-31 10:45
> **Ambiente**: Staging (10.3.0.243:8550)

---

## Resumen General

| Portal | Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | Pass Rate | Estado |
|--------|-------|-----------|-----------|------------|-----------|--------|
| [cliente](cliente.md) | 187 | 181 | 1 | 5 | **96.8%** | ✅ Estable |
| [chofer](chofer.md) | 271 | 197 | 4 | 70 | **72.6%** | ⚠️ Revisar (falta datos) |
| [transportista](transportista.md) | 380 | 339 | 3 | 38 | **89.2%** | ✅ Estable |
| [dadorDeCarga](dadorDeCarga.md) | 360 | 356 | 4 | 0 | **98.9%** | ✅ Excelente |
| [adminInterno](adminInterno.md) | 401 | 371 | 3 | 27 | **92.5%** | ✅ Estable |

---

## Totales

| Métrica | Valor |
|---------|-------|
| **Total Tests** | 1,599 |
| **Total Passed** | 1,444 |
| **Total Failed** | 15 |
| **Total Skipped** | 140 |
| **Pass Rate Global** | **90.3%** |

---

## Próximos Pasos

1. **Revisar Portal Chofer**: Los 70 tests skipped son por falta de equipos asignados al usuario en staging.
2. **Arreglar tests fallidos**: 
   - Búsqueda masiva (aparece en múltiples portales)
   - Selectores de UI (KPIs, logo)
   - Permisos de backend (auditoría)
3. **Reducir skips en admin**: Los 27 skips podrían implementarse con lógica real.
