# Stack de Herramientas - Microsyst Software Factory

> **Última actualización**: 8 Octubre 2025  
> **Propósito**: Referencia consolidada de todas las herramientas usadas por el equipo

---

## 🎯 Herramientas por Categoría

---

## 💻 Desarrollo

### IDEs y Editores

| Herramienta | Uso | Requerido | Alternativa |
|-------------|-----|-----------|-------------|
| **Cursor AI** | Editor principal con IA integrada | ✅ Sí | VSCode, WebStorm |
| **VSCode** | Alternativa si no se usa Cursor | 🔶 Opcional | - |

**Extensiones Cursor/VSCode obligatorias**:
```bash
# Cursor usa las mismas extensiones que VSCode
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension Prisma.prisma
code --install-extension eamodio.gitlens
```

**Extensiones recomendadas**:
```bash
code --install-extension ms-azuretools.vscode-docker
code --install-extension christian-kohler.npm-intellisense
```

**Nota**: Cursor AI incluye IA integrada, no necesita GitHub Copilot adicional

---

### Control de Versiones

| Herramienta | Uso | URL |
|-------------|-----|-----|
| **Git** | Control de versiones | - |
| **GitHub** | Repositorio remoto, CI/CD, PRs | https://github.com/sergiobleynat1969/monorepo-bca |
| **GitHub Desktop** | Cliente Git visual (opcional) | https://desktop.github.com/ |

**Configuración requerida**:
- SSH keys configuradas
- `.gitconfig` con nombre y email
- GPG signing (opcional pero recomendado)

---

### Runtime y Package Managers

| Herramienta | Versión | Requerido | Notas |
|-------------|---------|-----------|-------|
| **Node.js** | 20+ | ✅ Sí | Usar nvm para gestionar versiones |
| **npm** | 9+ | ✅ Sí | Viene con Node.js |
| **nvm** | Latest | ✅ Sí (recomendado) | Para cambiar versiones de Node |

---

### Bases de Datos

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **PostgreSQL 16** | Base de datos principal | ✅ Sí |
| **Prisma** | ORM | ✅ Sí |
| **HeidiSQL** | Cliente BD visual | ✅ Sí (recomendado) |
| **Adminer** | Cliente BD web (en Docker) | 🔶 Opcional |
| **pgAdmin** | Cliente BD oficial PostgreSQL | 🔶 Opcional |

---

### Cache y Colas

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Redis 7** | Cache, sesiones, colas | ✅ Sí |
| **BullMQ** | Sistema de colas (usa Redis) | ✅ Sí |

---

### Storage

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **MinIO** | Object storage (S3-compatible) | ✅ Sí |

---

### Contenedores

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Docker** | Contenedores | ✅ Sí |
| **Docker Compose** | Orquestación local | ✅ Sí |
| **Docker Swarm** | Orquestación producción | ✅ Sí (en servidor) |
| **Portainer** | UI para Docker | 🔶 Opcional |

---

## 🧪 Testing y Calidad

### Testing

| Herramienta | Uso | Para Rol |
|-------------|-----|----------|
| **Jest** | Tests unitarios | Desarrolladores |
| **Playwright** | Tests E2E | QA, Desarrolladores |
| **Postman** | Testing de APIs manual | QA, Desarrolladores, Backend |
| **k6** | Load testing | DevOps (opcional) |

### Code Quality

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **ESLint** | Linter JavaScript/TypeScript | ✅ Sí |
| **Prettier** | Formateador de código | ✅ Sí |
| **SonarQube** | Análisis de calidad de código | ✅ Sí |
| **TypeScript** | Type checking | ✅ Sí |

---

## 🚀 CI/CD y DevOps

### CI/CD

| Herramienta | Uso | URL |
|-------------|-----|-----|
| **GitHub Actions** | Pipeline CI/CD | https://github.com/features/actions |

### Monitoreo y Observabilidad

| Herramienta | Uso | Requerido | URL |
|-------------|-----|-----------|-----|
| **Sentry** | Error tracking, performance | ✅ Sí | https://sentry.io |
| **Uptime Kuma** | Health checks, uptime monitoring | ✅ Sí | Instalado en servidor |
| **Prometheus** | Métricas (futuro) | ❌ No | - |
| **Grafana** | Dashboards (futuro) | ❌ No | - |

### Logging

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Winston** | Logging en Node.js | ✅ Sí |
| **Docker Logs** | Logs de contenedores | ✅ Sí |

### Proxy y Networking

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Nginx Proxy Manager** | Reverse proxy, SSL | ✅ Sí (producción) |
| **Nginx** | Reverse proxy clásico | 🔶 Alternativa |

---

## 📋 Gestión de Proyectos

### Tareas y Sprints

| Herramienta | Uso | Requerido | Para Rol |
|-------------|-----|-----------|----------|
| **Jira** | Gestión de tareas, sprints | ✅ Sí | Todos |
| **Linear** | Alternativa moderna a Jira | 🔶 Alternativa | Todos |
| **Trello** | Kanban simple | ❌ No (legacy) | - |

### Documentación

| Herramienta | Uso | Requerido | Para Rol |
|-------------|-----|-----------|----------|
| **Notion** | Wiki, documentación, ADRs | ✅ Sí (recomendado) | Todos |
| **Confluence** | Wiki alternativa | 🔶 Alternativa | Todos |
| **Google Docs** | Documentos colaborativos | ✅ Sí | Todos |
| **Markdown** | Documentación en repo | ✅ Sí | Todos |

---

## 💬 Comunicación

### Chat y Videoconferencias

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Slack** | Chat del equipo | ✅ Sí |
| **Google Meet** | Videoconferencias | ✅ Sí |
| **Zoom** | Alternativa para videollamadas | 🔶 Opcional |
| **Loom** | Grabar videos cortos (demos, bugs) | ✅ Sí (recomendado) |

### Email

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Gmail / Outlook** | Email corporativo @microsyst.com.ar | ✅ Sí |

---

## 🎨 Diseño y UX

### Diseño de Interfaces

| Herramienta | Uso | Para Rol |
|-------------|-----|----------|
| **Figma** | Diseño UI/UX, wireframes | PM, Diseñador, Desarrolladores |
| **Balsamiq** | Wireframes rápidos | PM (opcional) |
| **Whimsical** | Diagramas, flowcharts | PM, Tech Lead |

### Assets y Media

| Herramienta | Uso | Para Rol |
|-------------|-----|----------|
| **Unsplash** | Imágenes stock | Frontend, Diseñador |
| **Lucide Icons** | Iconos (usado en Shadcn/UI) | Frontend |

---

## 📊 Analytics y Métricas

### Product Analytics

| Herramienta | Uso | Para Rol | URL |
|-------------|-----|----------|-----|
| **Google Analytics** | Web analytics | PM | https://analytics.google.com |
| **Mixpanel** | Product analytics (eventos) | PM (futuro) | https://mixpanel.com |
| **Amplitude** | Alternativa a Mixpanel | PM (futuro) | https://amplitude.com |
| **Hotjar** | Heatmaps, session recordings | PM (futuro) | https://www.hotjar.com |

### Encuestas

| Herramienta | Uso | Para Rol |
|-------------|-----|----------|
| **Typeform** | Encuestas a usuarios | PM |
| **Google Forms** | Alternativa simple | PM |

---

## 🔒 Seguridad y Secrets

### Gestión de Secretos

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **1Password** | Gestión de passwords del equipo | ✅ Sí |
| **Bitwarden** | Alternativa open source | 🔶 Alternativa |
| **GitHub Secrets** | Secrets para CI/CD | ✅ Sí |
| **.env files** | Secrets locales (NO commitear) | ✅ Sí |

### SSL/TLS

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Let's Encrypt** | Certificados SSL gratis | ✅ Sí |
| **Certbot** | Renovación automática de certs | ✅ Sí (en servidor) |

---

## 🤖 IA y Automatización

### AI Coding Assistants

| Herramienta | Uso | Requerido | Costo |
|-------------|-----|-----------|-------|
| **Cursor AI** | Editor con IA integrada (usado por el equipo) | ✅ Sí | $20/mes |
| **ChatGPT** | Consultas generales, debugging | 🔶 Opcional | Gratis/Plus |
| **GitHub Copilot** | Alternativa si se usa VSCode | 🔶 Opcional | $10/mes |

### Document Processing

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **Flowise AI** | Clasificación automática de documentos | 🔶 Opcional |
| **LangChain** | Framework para LLM (si usas Flowise) | 🔶 Opcional |

---

## 📦 Backup y Disaster Recovery

### Backups

| Herramienta | Uso | Requerido |
|-------------|-----|-----------|
| **pg_dump** | Backup de PostgreSQL | ✅ Sí |
| **cron** | Scheduling de backups | ✅ Sí (en servidor) |
| **Scripts personalizados** | `/scripts/backup.sh` | ✅ Sí |

---

## 🛠️ Herramientas por Rol

---

### 👨‍💻 Desarrollador (Todos los niveles)

**Obligatorias**:
- ✅ Git + GitHub
- ✅ Node.js 20+ (via nvm)
- ✅ Cursor AI con extensiones
- ✅ Docker + Docker Compose
- ✅ HeidiSQL (cliente BD)
- ✅ Postman (testing de APIs)
- ✅ Slack
- ✅ Jira/Linear

**Recomendadas**:
- 🔶 Loom (grabar demos)
- 🔶 Adminer (cliente BD web alternativo)

---

### 🎯 Tech Lead

**Obligatorias**:
- ✅ Todo lo de Desarrollador +
- ✅ SonarQube (revisar quality gates)
- ✅ Sentry (monitorear errores)
- ✅ Figma (revisar diseños)
- ✅ Notion (documentar ADRs)

**Recomendadas**:
- 🔶 Miro / Excalidraw (diagramas de arquitectura)
- 🔶 Whimsical (flowcharts)

---

### 📦 Product Manager

**Obligatorias**:
- ✅ Jira/Linear (backlog, sprints)
- ✅ Figma (wireframes, diseño)
- ✅ Google Analytics (métricas)
- ✅ Notion (documentación de producto)
- ✅ Slack
- ✅ Google Meet

**Recomendadas**:
- 🔶 Mixpanel / Amplitude (product analytics)
- 🔶 Hotjar (heatmaps)
- 🔶 Typeform (encuestas)
- 🔶 Loom (demos de features)

---

### 🧪 QA Analyst

**Obligatorias**:
- ✅ Navegadores (Chrome, Firefox, Safari, Edge)
- ✅ DevTools (Chrome/Firefox)
- ✅ Postman (testing de APIs)
- ✅ Playwright (E2E automatizado)
- ✅ Jira/Linear (registro de bugs)
- ✅ Loom (grabar bugs)
- ✅ Slack

**Recomendadas**:
- 🔶 BrowserStack (testing cross-browser)
- 🔶 Snagit / Greenshot (screenshots anotados)

---

### ⚙️ DevOps Engineer

**Obligatorias**:
- ✅ Docker + Docker Compose + Swarm
- ✅ Git + GitHub (workflows)
- ✅ SSH (acceso a servidores)
- ✅ Nginx / Nginx Proxy Manager
- ✅ Sentry (error tracking)
- ✅ Uptime Kuma (health checks)
- ✅ 1Password (secrets)
- ✅ Scripts de automatización (`/scripts/`)
- ✅ Slack

**Recomendadas**:
- 🔶 Portainer (UI de Docker)
- 🔶 k6 (load testing)

---

### 👔 Founder/CEO

**Obligatorias**:
- ✅ Slack (comunicación con equipo)
- ✅ Jira/Linear (ver roadmap)
- ✅ Google Meet (meetings)
- ✅ Notion (ver documentación estratégica)

**Recomendadas**:
- 🔶 Google Analytics (ver métricas de producto)

---

## 💰 Presupuesto Estimado de Herramientas

### Herramientas Gratuitas (Uso Básico)
- ✅ Git, Node.js, VSCode, Docker
- ✅ PostgreSQL, Redis, MinIO
- ✅ GitHub (público, o planes básicos)
- ✅ Slack (plan Free hasta 10K mensajes)
- ✅ Google Meet (con Gmail)
- ✅ Sentry (plan Developer: 5K errores/mes)

**Costo**: $0/mes

---

### Herramientas de Pago (Recomendadas)

| Herramienta | Costo/mes | Para quién |
|-------------|-----------|------------|
| **GitHub Team** | $4/usuario | Todos (repos privados) |
| **Jira/Linear** | $7-10/usuario | Todos |
| **Notion Team** | $8/usuario | Todos |
| **1Password Teams** | $8/usuario | Todos |
| **Sentry Team** | $26/mes | Equipo completo |
| **Uptime Kuma** | Gratis (self-hosted) | - |
| **SonarQube** | Gratis (Community) | - |
| **Cursor AI** | $20/usuario | Desarrolladores |

**Costo estimado** (equipo de 6 personas, 4 desarrolladores):
- **Mínimo**: ~$250/mes (GitHub + Jira + Notion + 1Password + Sentry)
- **Óptimo**: ~$330/mes (+ Cursor AI para 4 devs)

---

### Herramientas Futuras (No Urgentes)

| Herramienta | Costo/mes | Cuándo considerar |
|-------------|-----------|-------------------|
| **Mixpanel** | $25+/mes | Cuando necesites analytics avanzado |
| **Hotjar** | $31+/mes | Cuando necesites heatmaps |
| **BrowserStack** | $29+/mes | Si QA necesita testing en múltiples browsers |
| **Prometheus + Grafana** | Gratis (self-hosted) | Cuando necesites métricas avanzadas |

---

## 📥 Instalación Rápida (Para Nuevos Devs)

Ver procedimiento completo en: [PROCEDURE_DEV_ENVIRONMENT_SETUP.md](./procedures/PROCEDURE_DEV_ENVIRONMENT_SETUP.md)

**Resumen**:
```bash
# Herramientas base
brew install git node docker     # macOS
sudo apt install git docker.io   # Linux

# nvm (gestión de Node.js)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 20

# Cursor AI
# Descargar desde: https://cursor.sh/
# macOS: Instalar .dmg
# Linux: Instalar .AppImage o .deb
# Windows: Instalar .exe

# Cursor extensiones (usa comandos de VSCode)
cursor --install-extension dbaeumer.vscode-eslint
cursor --install-extension esbenp.prettier-vscode
cursor --install-extension Prisma.prisma

# HeidiSQL (cliente de BD)
# Windows: Descargar desde https://www.heidisql.com/download.php
# Linux: wine + HeidiSQL o usar Adminer web
# macOS: usar Adminer web o pgAdmin

# Postman
brew install --cask postman  # macOS
sudo snap install postman    # Linux
```

---

## 🔗 Enlaces Útiles

### Documentación Oficial
- **Node.js**: https://nodejs.org/docs
- **React**: https://react.dev/
- **Prisma**: https://www.prisma.io/docs
- **Docker**: https://docs.docker.com/
- **Playwright**: https://playwright.dev/

### Recursos del Proyecto
- **GitHub Repo**: https://github.com/sergiobleynat1969/monorepo-bca
- **Manual Operativo**: `/docs/MANUAL_OPERATIVO_MICROSYST.md`
- **Guías de Roles**: `/docs/roles/`
- **Procedimientos**: `/docs/procedures/`

---

## 📊 Estadísticas de Uso (Actualizar Mensualmente)

| Herramienta | Usuarios Activos | Frecuencia de Uso | Satisfacción |
|-------------|------------------|-------------------|--------------|
| Cursor AI | 6/6 | Diaria | ⭐⭐⭐⭐⭐ |
| GitHub | 6/6 | Diaria | ⭐⭐⭐⭐⭐ |
| Slack | 6/6 | Diaria | ⭐⭐⭐⭐ |
| Jira | 6/6 | Diaria | ⭐⭐⭐ |
| Docker | 6/6 | Diaria | ⭐⭐⭐⭐ |
| HeidiSQL | 4/6 | Semanal | ⭐⭐⭐⭐ |
| Postman | 4/6 | Semanal | ⭐⭐⭐⭐ |

**Última actualización de stats**: 8 Octubre 2025

---

## 🔄 Proceso de Evaluación de Nuevas Herramientas

Si alguien del equipo quiere proponer una nueva herramienta:

### 1. Validar Necesidad
- ¿Qué problema resuelve?
- ¿Hay alternativa con herramientas actuales?
- ¿Cuánto tiempo ahorra?

### 2. Evaluar Costo
- ¿Costo mensual?
- ¿Es gratis para uso básico?
- ¿ROI positivo? (ahorro > costo)

### 3. Prueba Piloto
- 1-2 personas prueban 2-4 semanas
- Recolectar feedback
- Decidir adopción en equipo

### 4. Documentar
- Si se adopta, agregar a este documento
- Actualizar guías de roles si aplica
- Comunicar al equipo en Slack

---

## 📝 Changelog

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2025-10-08 | Documento inicial creado | Tech Lead |

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: Tech Lead  
**Feedback**: Si falta alguna herramienta o hay info desactualizada, reportar en Slack #tech

