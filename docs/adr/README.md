# Architecture Decision Records (ADRs)

Este directorio contiene los registros de decisiones arquitectónicas importantes del proyecto.

## ¿Qué es un ADR?

Un ADR (Architecture Decision Record) es un documento que captura una decisión arquitectónica importante junto con su contexto y consecuencias.

## Formato

Cada ADR sigue esta estructura:

1. **Título**: Número secuencial + descripción breve
2. **Metadatos**: Fecha, estado, decisores
3. **Contexto**: Problema que se está resolviendo
4. **Decisión**: Qué se decidió hacer
5. **Consecuencias**: Impacto de la decisión (positivas, negativas, neutras)
6. **Alternativas**: Opciones consideradas y descartadas
7. **Referencias**: Links y documentación relacionada

## Estados Posibles

- 🟢 **Aceptado**: Decisión implementada y en uso
- 🟡 **Propuesto**: En discusión, no implementado
- 🔴 **Rechazado**: Propuesta descartada
- ⚪ **Deprecado**: Ya no aplica, reemplazado por otro ADR
- 🔵 **Superseded**: Reemplazado por ADR más reciente

## Índice de ADRs

| # | Título | Estado | Fecha | Área |
|---|--------|--------|-------|------|
| 002 | [Usar V8 Coverage Provider con SWC en Frontend](./002-jest-coverage-provider-v8-for-swc.md) | ✅ Aceptado | 2026-02-13 | Testing |

## Cómo Crear un Nuevo ADR

1. **Numerar secuencialmente**: Usar el siguiente número disponible (ej: `003-titulo.md`)
2. **Usar template**: Copiar estructura de un ADR existente
3. **Ser conciso**: Máximo 2-3 páginas
4. **Incluir contexto**: Explicar el "por qué" no solo el "qué"
5. **Documentar alternativas**: Mostrar qué más se consideró
6. **Actualizar este índice**: Agregar entrada en la tabla

## Template Básico

```markdown
# ADR XXX: Título de la Decisión

**Fecha**: YYYY-MM-DD  
**Estado**: 🟡 Propuesto | ✅ Aceptado | 🔴 Rechazado  
**Decisores**: Nombre(s)  
**Área**: Frontend | Backend | Infra | Testing | etc.

---

## Contexto y Problema

Descripción del problema o situación que requiere una decisión.

## Decisión

Qué se decidió hacer y por qué.

## Consecuencias

### Positivas ✅
- Beneficio 1
- Beneficio 2

### Negativas ⚠️
- Costo 1
- Limitación 1

### Neutras ℹ️
- Cambio neutral 1

## Alternativas Consideradas

### Alternativa 1
- Por qué se rechazó

### Alternativa 2
- Por qué se rechazó

## Referencias

- Link 1
- Link 2
```

## Principios

1. **Documentar decisiones importantes**: No todo requiere un ADR, solo decisiones arquitectónicas significativas
2. **Inmutabilidad**: Los ADRs no se modifican después de aceptados (excepto correcciones menores)
3. **Trazabilidad**: Cada ADR debe poder rastrearse a commits, PRs o issues relacionados
4. **Accesibilidad**: Lenguaje claro, evitar jerga innecesaria

## Cuándo Crear un ADR

Crear un ADR cuando:
- ✅ La decisión afecta múltiples componentes o equipos
- ✅ Hay trade-offs significativos entre alternativas
- ✅ La decisión será difícil de revertir
- ✅ Necesitas documentar el "por qué" para el futuro
- ✅ Hay debate o desacuerdo en el equipo

NO crear ADR para:
- ❌ Decisiones triviales o reversibles fácilmente
- ❌ Implementaciones estándar sin alternativas
- ❌ Cambios puramente estéticos
- ❌ Bugs fixes o refactors menores

## Referencias

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
