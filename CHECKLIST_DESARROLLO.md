# Checklist de Desarrollo

> **Objetivo**: Asegurar que cada PR cumpla con los estándares de calidad antes de revisión

**Uso**: Cada desarrollador debe completar este checklist antes de abrir un Pull Request

---

## ✅ Pre-PR Checklist

### 1. Rama y Código

- [ ] Rama creada desde `main` actualizado (`git fetch origin && git rebase origin/main`)
- [ ] Nombre de rama sigue convención: `feat/*`, `fix/*`, `chore/*`, `refactor/*`
- [ ] Commits atómicos y claros (idealmente siguiendo Conventional Commits)
- [ ] Sin commits de merge innecesarios (usar rebase)

### 2. Quality Gates Locales

- [ ] `npm ci` ejecutado sin errores
- [ ] `npm run lint` pasa sin warnings
- [ ] `npm run type-check` pasa sin errores (si existe)
- [ ] `npm test` pasa completamente
- [ ] `npm run build` completa exitosamente

**Comando rápido**:
```bash
npm ci && npm run lint && npm test && npm run build
```

### 3. Funcionalidad

- [ ] Probé manualmente el flujo completo en local
- [ ] Verifiqué que cumple todos los Criterios de Aceptación del issue
- [ ] Probé casos edge (validaciones, errores, datos vacíos)
- [ ] No rompe funcionalidad existente (smoke test rápido)

### 4. Código Limpio

- [ ] Sin código comentado innecesario
- [ ] Sin `console.log` / `debugger` olvidados
- [ ] Sin secretos hardcodeados
- [ ] Sin TODOs sin issue asociado
- [ ] Nombres de variables/funciones descriptivos

### 5. Tests

- [ ] Tests agregados para nueva funcionalidad
- [ ] Tests actualizados si modifiqué código existente
- [ ] Cobertura no disminuye (verificar en CI)
- [ ] Tests pasan localmente

### 6. Documentación

- [ ] Actualicé `README.md` si cambió cómo correr o configurar
- [ ] Actualicé `.env.example` si agregué nuevas variables
- [ ] Agregué comentarios JSDoc en funciones complejas
- [ ] Actualicé documentación técnica si cambió arquitectura

### 7. Seguridad y Performance

- [ ] Validaciones de entrada con Zod/Joi (frontend y backend)
- [ ] Manejo de errores consistente (try/catch, error boundaries)
- [ ] Sin queries N+1 o bucles costosos
- [ ] Consideré impacto en performance

### 8. Pull Request

- [ ] Título descriptivo siguiendo Conventional Commits
- [ ] Descripción clara usando template de PR
- [ ] Sección "Cómo probar" con pasos detallados
- [ ] Capturas/videos si hay cambios de UI
- [ ] Resultado esperado documentado
- [ ] Issues relacionados linkeados (closes #XXX)
- [ ] PR ≤ 300 líneas (si es más, dividir)

### 9. Revisión Final

- [ ] Revisé todos los archivos cambiados en GitHub
- [ ] No incluí cambios fuera del alcance del issue
- [ ] Eliminé archivos temporales o de prueba
- [ ] Branch protection checks pasan (CI)

---

## 📝 Template de Descripción de PR

```markdown
## Qué hace
[Descripción breve del cambio]

## Cómo probar
1. Paso 1
2. Paso 2
3. Paso 3

## Resultado esperado
[Qué debería pasar]

## Evidencias
[Capturas, videos, logs]

## Riesgos
[Breaking changes, migraciones, feature flags]
```

---

## ⚠️ Antes de Merge

- [ ] Al menos 1 aprobación de otro developer
- [ ] Todos los comentarios resueltos o discutidos
- [ ] CI pasa completamente (verde)
- [ ] Conflictos resueltos (si los hay)

---

**Última actualización**: 8 Octubre 2025  
**Alineado con**: Manual Operativo Microsyst

