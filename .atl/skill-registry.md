<!-- Este archivo centraliza los skills y convenciones detectados para que los subagentes carguen contexto consistente. -->
# Skill Registry

- Proyecto: `monorepo-bca`
- Generado: `2026-03-18`
- Persistencia SDD: `engram`
- Regla de deduplicacion: `project-level > user-level`; los skills `sdd-*`, `_shared` y `skill-registry` se excluyen por diseno.

## Contexto Del Proyecto

- Stack principal: monorepo Node.js 20+ con `npm` workspaces y `turbo`.
- Frontend: `React 18` + `TypeScript strict` + `Vite` + `Tailwind CSS` + `Redux Toolkit` + `React Router`.
- Backend: `Express` + `TypeScript strict` + `Prisma` + `PostgreSQL` + `zod` + `express-validator`.
- Microservicios: `documentos` (gestion documental + MinIO), `remitos` (OCR + Flowise).
- Testing: `Jest` en backend y paquetes, `Vitest` y Testing Library en frontend, `Playwright` en `apps/e2e`.
- Convenciones clave: seguridad SonarQube, funciones pequenas, validacion con limites, sin secretos hardcodeados, Conventional Commits.
- CI/CD: GitHub Actions con workflows por servicio (backend-ci, frontend-ci, documentos-ci, deploy-*).

## Protocolo De Carga

1. Leer primero los archivos de convenciones del proyecto listados abajo.
2. Elegir luego el skill relevante segun la tarea.
3. Para cambios React, cargar `react-doctor` al finalizar.
4. Para pruebas Go, cargar `go-testing`.
5. Para mejoras de UI/UX, cargar `frontend-design` o `ui-ux-polish`.
6. Para calidad SonarQube, cargar `sonarqube-quality-gate-playbook`.
7. Si no hay skill aplicable, continuar solo con las convenciones del repo.

## Convenciones Del Proyecto

| Tipo | Ruta | Uso |
| --- | --- | --- |
| Convencion | `AGENTS.md` | Comandos Clavix disponibles para mejora de prompts y PRD. |
| Convencion | `CLAUDE.md` | Integracion Clavix y flujo recomendado de planificacion/implementacion/verificacion. |
| Convencion | `.cursorrules` | Estandares SonarQube, seguridad, mantenibilidad, estructura y testing del monorepo. |
| README | `README.md` | Documentacion general del monorepo, stack, scripts y flujo de trabajo. |

## Skills Disponibles

| Skill | Fuente | Trigger resumido |
| --- | --- | --- |
| `feature-shaper` | user-level | Conversaciones de negocio para aterrizar features con `/shape` o `/shape-refine`. |
| `go-testing` | user-level | Patrones de testing Go, table-driven tests y TUI/Bubbletea. |
| `interactive-bug` | user-level | Debugging interactivo cuando hay un bug y falta contexto. |
| `interactive-task` | user-level | Aclarar tareas de desarrollo no-bug antes de ejecutarlas. |
| `react-doctor` | user-level | Revisar cambios React por seguridad, performance y arquitectura. |
| `skill-creator` | user-level | Crear o actualizar skills de agentes. |
| `ui-ux-polish` | user-level | Pulido iterativo de UI/UX estilo Stripe. |
| `find-skills` | user-level | Descubrir skills instalables para tareas especificas. |
| `frontend-design` | user-level | Interfaces frontend de alta calidad. |
| `sonarqube-quality-gate-playbook` | user-level | Playbook para cumplir Quality Gates de SonarQube. |
| `test-coverage-improver` | user-level | Mejorar cobertura de tests. |
| `vercel-react-best-practices` | user-level | Optimizacion de performance React/Next.js. |

## Skills SDD (Solo Para Orquestador)

Estos skills son invocados por el orquestador, NO cargar directamente:
- `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive`.

## Directorios Escaneados

| Directorio | Estado |
| --- | --- |
| `~/.claude/skills` | Encontrado (error de acceso en algunos dirs) |
| `~/.config/opencode/skills` | Encontrado (17 skills) |
| `~/.gemini/skills` | Encontrado (14 skills) |
| `~/.cursor/skills` | Encontrado (16 skills) |
| `~/.copilot/skills` | Sin SKILL.md |
| `./.claude/skills` | No existe |
| `./.gemini/skills` | No existe |
| `./.agent/skills` | No existe |
| `./skills` | No existe |

## Notas

- No se detecto directorio `openspec/`; la inicializacion SDD queda persistida en Engram.
- No se encontraron skills a nivel proyecto que sobrescriban los skills del usuario.
- El proyecto usa SonarQube para calidad de codigo con configuracion en `sonar-project.properties`.
