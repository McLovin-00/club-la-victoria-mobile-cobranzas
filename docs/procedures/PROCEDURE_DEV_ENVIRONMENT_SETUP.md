# Procedimiento: Configuración de Entorno de Desarrollo desde Cero

> **Versión**: 1.0  
> **Fecha**: 8 Octubre 2025  
> **Tiempo estimado**: 2-3 horas  
> **Roles**: Todos los desarrolladores nuevos

---

## 🎯 Objetivo

Configurar un entorno de desarrollo completo para trabajar en el monorepo BCA, desde la instalación de herramientas base hasta levantar las 3 aplicaciones (Backend, Frontend, Documentos) localmente.

---

## 📋 Prerrequisitos

### Accesos Requeridos
- [ ] Cuenta de GitHub con acceso al repositorio `sergiobleynat1969/monorepo-bca`
- [ ] Cuenta de Slack (workspace de Microsyst)
- [ ] Cuenta de Jira/Linear (gestión de tareas)
- [ ] Acceso a 1Password (credenciales compartidas)
- [ ] Email corporativo configurado (@microsyst.com.ar)

### Hardware Mínimo
- **RAM**: 16 GB (recomendado: 32 GB)
- **CPU**: 4 cores (recomendado: 8 cores)
- **Disco**: 50 GB libres (recomendado: 100 GB)
- **OS**: Linux (Ubuntu 22.04+), macOS (Monterey+), o Windows 11 + WSL2

---

## 📦 Paso 1: Instalación de Herramientas Base (45 min)

### 1.1 Git (5 min)

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install -y git
git --version  # Verificar instalación (debe ser >= 2.30)
```

**macOS**:
```bash
# Si no tienes Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Git
brew install git
git --version
```

**Windows (WSL2)**:
```bash
# Dentro de WSL2 (Ubuntu)
sudo apt update
sudo apt install -y git
```

### 1.2 Node.js 20+ y npm (10 min)

**Opción A: Usando nvm (Recomendado)**
```bash
# Instalar nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Reiniciar terminal o ejecutar
source ~/.bashrc  # o ~/.zshrc si usas zsh

# Instalar Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verificar
node --version  # Debe mostrar v20.x.x
npm --version   # Debe mostrar >= 9.x
```

**Opción B: Instalación directa (Linux)**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

### 1.3 Docker y Docker Compose (15 min)

**Linux (Ubuntu)**:
```bash
# Desinstalar versiones antiguas
sudo apt remove docker docker-engine docker.io containerd runc

# Instalar dependencias
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar repositorio oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Agregar usuario al grupo docker (evita usar sudo)
sudo usermod -aG docker $USER

# Aplicar cambios (cerrar sesión y volver a entrar, o ejecutar)
newgrp docker

# Verificar
docker --version
docker compose version  # Nota: sin guion (es v2)
```

**macOS**:
```bash
# Descargar e instalar Docker Desktop desde:
# https://www.docker.com/products/docker-desktop

# O con Homebrew
brew install --cask docker

# Abrir Docker Desktop y esperar que inicie
# Verificar
docker --version
docker compose version
```

**Windows (WSL2)**:
```bash
# Instalar Docker Desktop for Windows con soporte WSL2
# Descargar desde: https://www.docker.com/products/docker-desktop

# Configurar Docker Desktop para usar WSL2
# En Docker Desktop > Settings > Resources > WSL Integration
# Habilitar integración con tu distribución WSL2

# Verificar desde WSL2
docker --version
docker compose version
```

### 1.4 VSCode (10 min)

**Descargar e instalar**:
```bash
# Linux (snap)
sudo snap install code --classic

# macOS
brew install --cask visual-studio-code

# Windows: Descargar desde https://code.visualstudio.com/
```

**Extensiones obligatorias** (instalar desde VSCode):
```
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension Prisma.prisma
code --install-extension eamodio.gitlens
```

**Extensiones recomendadas**:
```
code --install-extension GitHub.copilot  # Si tienes licencia
code --install-extension ms-azuretools.vscode-docker
code --install-extension christian-kohler.npm-intellisense
```

### 1.5 Herramientas Adicionales (5 min)

**Postman** (testing de APIs):
```bash
# Linux
sudo snap install postman

# macOS
brew install --cask postman

# Windows: Descargar desde https://www.postman.com/downloads/
```

**DBeaver** (cliente de PostgreSQL, opcional):
```bash
# Linux
sudo snap install dbeaver-ce

# macOS
brew install --cask dbeaver-community

# Windows: Descargar desde https://dbeaver.io/download/
```

---

## 🔧 Paso 2: Configuración de Git (10 min)

### 2.1 Configurar Identidad

```bash
git config --global user.name "Tu Nombre Completo"
git config --global user.email "tu.email@microsyst.com.ar"

# Verificar
git config --global --list
```

### 2.2 Configurar SSH para GitHub

**Generar clave SSH**:
```bash
ssh-keygen -t ed25519 -C "tu.email@microsyst.com.ar"
# Presionar Enter para ubicación por defecto (~/.ssh/id_ed25519)
# Ingresar passphrase (opcional pero recomendado)

# Iniciar ssh-agent
eval "$(ssh-agent -s)"

# Agregar clave al agent
ssh-add ~/.ssh/id_ed25519
```

**Agregar clave pública a GitHub**:
```bash
# Copiar clave pública
cat ~/.ssh/id_ed25519.pub
# (Seleccionar todo el output y copiar)

# Ir a GitHub:
# 1. Ir a https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Título: "Laptop [Tu Nombre]"
# 4. Pegar la clave pública
# 5. Click "Add SSH key"

# Verificar conexión
ssh -T git@github.com
# Debe responder: "Hi [usuario]! You've successfully authenticated..."
```

### 2.3 Configuraciones Útiles

```bash
# Editor por defecto (VSCode)
git config --global core.editor "code --wait"

# Colores en terminal
git config --global color.ui auto

# Rebase automático en pull
git config --global pull.rebase true

# Alias útiles
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
git config --global alias.lg "log --oneline --graph --all --decorate"
```

---

## 📥 Paso 3: Clonar Repositorio (5 min)

```bash
# Crear directorio de proyectos (si no existe)
mkdir -p ~/projects
cd ~/projects

# Clonar repositorio (usar SSH)
git clone git@github.com:sergiobleynat1969/monorepo-bca.git
cd monorepo-bca

# Verificar estructura
ls -la
# Deberías ver: apps/, docs/, scripts/, package.json, etc.

# Ver ramas
git branch -a
```

---

## 📦 Paso 4: Instalación de Dependencias (15 min)

```bash
# Asegurarte de estar en la raíz del monorepo
cd ~/projects/monorepo-bca

# Instalar todas las dependencias (esto puede tardar 10-15 min)
npm install

# Verificar que se instalaron correctamente
npm list --depth=0

# Build de todos los workspaces (para verificar que no hay errores)
npm run build

# Si todo está OK, deberías ver:
# ✓ apps/backend built
# ✓ apps/frontend built
# ✓ apps/documentos built
```

---

## 🐳 Paso 5: Levantar Infraestructura Local (15 min)

### 5.1 Configurar Variables de Entorno

```bash
# Copiar .env.example a .env
cp .env.example .env

# Editar .env con tus valores locales
code .env  # o nano .env

# Variables críticas a verificar:
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=postgres  # Cambiar en producción
# DB_NAME=monorepo-bca
# REDIS_HOST=localhost
# REDIS_PORT=6379
# MINIO_ENDPOINT=localhost
# MINIO_PORT=9000
```

### 5.2 Levantar Servicios de Infraestructura con Docker

**Opción A: Solo servicios básicos (PostgreSQL, Redis, MinIO)**
```bash
# Levantar infraestructura básica
npm run compose:dev:infra:up

# Verificar que están corriendo
docker ps

# Deberías ver contenedores:
# - dev-postgres (puerto 5432)
# - dev-redis (puerto 6379)
# - dev-minio (puertos 9000, 9001)
# - dev-adminer (puerto 8080, opcional)
```

**Opción B: Con servicios opcionales (Flowise, SonarQube)**
```bash
# Levantar todo (incluye Flowise AI)
docker compose -f docker-compose.dev.yml --profile ai up -d

# O ejecutar script wrapper
npm run compose:dev:up
```

### 5.3 Verificar Servicios

```bash
# PostgreSQL
docker exec -it dev-postgres psql -U postgres -c "\l"

# Redis
docker exec -it dev-redis redis-cli ping
# Debe responder: PONG

# MinIO (abrir en navegador)
# http://localhost:9001
# Usuario: minioadmin
# Password: minioadmin
```

---

## 🗄️ Paso 6: Configurar Base de Datos (10 min)

### 6.1 Ejecutar Migraciones de Prisma

```bash
# Backend (schema platform)
npm run prisma:migrate --workspace=apps/backend

# Documentos (schema documentos)
npm run prisma:migrate --workspace=apps/documentos

# Verificar que las tablas se crearon
docker exec -it dev-postgres psql -U postgres -d monorepo-bca -c "\dt platform.*"
docker exec -it dev-postgres psql -U postgres -d monorepo-bca -c "\dt documentos.*"
```

### 6.2 Generar Cliente de Prisma

```bash
# Generar clientes Prisma
npm run prisma:generate --workspace=apps/backend
npm run prisma:generate --workspace=apps/documentos
```

### 6.3 Seed de Datos Iniciales (Opcional)

```bash
# Si existe script de seed
npm run prisma:seed --workspace=apps/backend

# Si no existe, puedes crear usuarios de prueba manualmente
# Ver docs/procedures/PROCEDURE_CREATE_TEST_USERS.md (si existe)
```

---

## 🚀 Paso 7: Levantar Aplicaciones (10 min)

### 7.1 Levantar Todo en Modo Desarrollo

**Opción A: Todo junto (un terminal)**
```bash
# Levantar backend, frontend y documentos simultáneamente
npm run dev

# Deberías ver logs de las 3 aplicaciones
# Backend:    http://localhost:4800
# Frontend:   http://localhost:8550
# Documentos: http://localhost:4802
```

**Opción B: En terminales separados (recomendado para debugging)**
```bash
# Terminal 1: Backend
npm run dev --workspace=apps/backend

# Terminal 2: Frontend
npm run dev --workspace=apps/frontend

# Terminal 3: Documentos
npm run dev --workspace=apps/documentos
```

### 7.2 Verificar que Todo Funciona

**Backend**:
```bash
# Health check
curl http://localhost:4800/api/health
# Debe responder: {"status":"ok"}

# O abrir en navegador:
# http://localhost:4800/api/health
```

**Frontend**:
```bash
# Abrir en navegador:
# http://localhost:8550

# Deberías ver la página de login
```

**Documentos**:
```bash
# Health check
curl http://localhost:4802/health/ready
# Debe responder: {"status":"ready"}
```

---

## 🧪 Paso 8: Ejecutar Tests (10 min)

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm test -- --coverage

# Ejecutar solo tests de backend
npm test -- apps/backend

# Ejecutar solo tests de frontend
npm test -- apps/frontend

# Ejecutar E2E (Playwright) - requiere que frontend esté corriendo
cd apps/frontend
npx playwright test --ui
```

---

## ✅ Paso 9: Verificación Final (5 min)

### Checklist de Verificación

- [ ] **Git configurado** (`git config --list` muestra tu nombre y email)
- [ ] **SSH de GitHub funciona** (`ssh -T git@github.com` responde OK)
- [ ] **Node.js 20+** (`node --version` muestra v20.x)
- [ ] **Docker corriendo** (`docker ps` muestra contenedores)
- [ ] **Dependencias instaladas** (`npm list --depth=0` sin errores)
- [ ] **BD migrada** (Prisma migrations ejecutadas)
- [ ] **Backend corriendo** (http://localhost:4800/api/health responde OK)
- [ ] **Frontend corriendo** (http://localhost:8550 muestra login)
- [ ] **Documentos corriendo** (http://localhost:4802/health/ready responde OK)
- [ ] **Tests pasan** (`npm test` sin errores críticos)
- [ ] **VSCode configurado** (extensiones instaladas)

---

## 🐛 Troubleshooting

### Problema 1: `npm install` falla con errores de permisos

**Solución**:
```bash
# Linux/macOS: Asegurarse de no usar sudo
# Verificar ownership de node_modules
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/projects/monorepo-bca

# Limpiar cache de npm
npm cache clean --force

# Intentar de nuevo
npm install
```

### Problema 2: Docker no inicia contenedores

**Solución**:
```bash
# Verificar que Docker está corriendo
docker info

# Si no está corriendo (Linux)
sudo systemctl start docker

# Si está corriendo pero hay problemas
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d

# Ver logs de un contenedor específico
docker logs dev-postgres
```

### Problema 3: Puerto ya en uso (EADDRINUSE)

**Solución**:
```bash
# Encontrar proceso usando el puerto (ej: 4800)
lsof -i :4800  # Linux/macOS
# o
netstat -ano | findstr :4800  # Windows

# Matar proceso
kill -9 [PID]  # Reemplazar [PID] con el número del proceso
```

### Problema 4: Prisma migrations fallan

**Solución**:
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep postgres

# Verificar conexión a BD
docker exec -it dev-postgres psql -U postgres

# Resetear BD (CUIDADO: borra todo)
npm run prisma:reset --workspace=apps/backend
# Confirmar con 'y'

# Volver a migrar
npm run prisma:migrate --workspace=apps/backend
```

### Problema 5: Frontend no carga o muestra pantalla blanca

**Solución**:
```bash
# Limpiar cache de Vite
cd apps/frontend
rm -rf node_modules/.vite

# Rebuild
npm run build

# Reiniciar dev server
npm run dev
```

---

## 📚 Recursos Adicionales

### Documentación del Proyecto
- **README principal**: `/README.md`
- **Manual operativo**: `/docs/MANUAL_OPERATIVO_MICROSYST.md`
- **Guía de roles**: `/docs/roles/README.md`
- **CI/CD Pipeline**: `/docs/CICD_PIPELINE_3_SERVICES.md`

### Herramientas y Servicios Locales
- **Frontend**: http://localhost:8550
- **Backend**: http://localhost:4800
- **Documentos**: http://localhost:4802
- **MinIO Console**: http://localhost:9001
- **Adminer (DB)**: http://localhost:8080
- **Flowise AI**: http://localhost:3000 (si está levantado)

### Comandos Útiles Rápidos
```bash
# Ver logs de servicios Docker
docker compose -f docker-compose.dev.yml logs -f

# Reiniciar todo (si algo se rompió)
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
npm run dev

# Limpiar todo y empezar de cero
docker compose -f docker-compose.dev.yml down -v  # -v elimina volúmenes
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 🎓 Próximos Pasos

Una vez que tu entorno está funcionando:

1. **Leer documentación**:
   - [ ] `README.md` completo (30 min)
   - [ ] Tu guía de rol en `/docs/roles/` (1h)
   - [ ] `MANUAL_OPERATIVO_MICROSYST.md` (1h)

2. **Familiarizarte con el código**:
   - [ ] Explorar estructura de carpetas (`apps/`, `packages/`)
   - [ ] Leer código de 1-2 features existentes
   - [ ] Revisar PRs recientes en GitHub

3. **Primera tarea**:
   - [ ] Asignación de primera tarea (pequeña) por Tech Lead
   - [ ] Crear branch (`feat/123-mi-primera-tarea`)
   - [ ] Implementar, testear, abrir PR
   - [ ] Code review y merge

4. **Conectar con el equipo**:
   - [ ] Presentarte en Slack
   - [ ] Daily standup (10:00 AM)
   - [ ] 1:1 con Tech Lead (primer viernes)

---

**Última actualización**: 8 Octubre 2025  
**Mantenido por**: Tech Lead  
**Feedback**: Si encuentras errores o pasos faltantes, reportar en Slack #tech

