# Guía de Implementación
## Estrategia de Control de Versiones - Monorepo BCA

**Propósito:** Migrar del modelo actual al modelo de 3 ramas propuesto.

---

## Índice

1. [Estado Actual vs. Estado Deseado](#1-estado-actual-vs-estado-deseado)
2. [Plan de Migración](#2-plan-de-migración)
3. [Paso 1: Crear Ramas](#3-paso-1-crear-ramas)
4. [Paso 2: Configurar GitHub](#4-paso-2-configurar-github)
5. [Paso 3: Actualizar Workflows](#5-paso-3-actualizar-workflows)
6. [Paso 4: Configurar Secrets](#6-paso-4-configurar-secrets)
7. [Paso 5: Configurar Servidores](#7-paso-5-configurar-servidores)
8. [Paso 6: Comunicar al Equipo](#8-paso-6-comunicar-al-equipo)
9. [Verificación](#9-verificación)
10. [Rollback del Cambio](#10-rollback-del-cambio)

---

## 1. Estado Actual vs. Estado Deseado

### 1.1 Estado Actual

```
Ramas:
- main (principal, default)
- dev (desarrollo, no integrado)
- feature branches varios

Workflows actuales:
- deploy-dev.yml: Push a main → Deploy a Testing y Staging (confuso)
- deploy-staging.yml: Push a main → Deploy a Staging
- deploy-prod.yml: Manual con tag → Producción

Problemas:
- main despliega a Testing Y Staging simultáneamente
- No hay rama staging dedicada
- Flujo confuso
```

### 1.2 Estado Deseado

```
Ramas:
- develop → Testing (10.3.0.246)
- staging → Staging (10.3.0.243)
- main → Producción (10.8.10.20)

Flujo:
feature/* → develop → staging → main
              ↓          ↓        ↓
           Testing   Staging  Producción

Workflows nuevos:
- ci.yml: Validación en PRs
- deploy-testing.yml: Push a develop → Testing (automático)
- deploy-staging.yml: Manual → Staging (workflow_dispatch)
- deploy-production.yml: Tag v* → Producción (manual + aprobación)
```

---

## 2. Plan de Migración

### 2.1 Checklist de Migración

| Paso | Tarea | Riesgo | Reversible |
|------|-------|--------|------------|
| 1 | Crear rama `staging` desde `main` | Bajo | Sí |
| 2 | Crear rama `develop` desde `staging` | Bajo | Sí |
| 3 | Configurar protecciones de ramas | Bajo | Sí |
| 4 | Reemplazar workflows | Medio | Sí |
| 5 | Configurar secrets | Bajo | N/A |
| 6 | Configurar servidores | Medio | Sí |
| 7 | Cambiar default branch a `develop` | Bajo | Sí |
| 8 | Comunicar al equipo | Bajo | N/A |

### 2.2 Tiempo Estimado

- Configuración técnica: 1-2 horas
- Pruebas: 1-2 horas
- Comunicación: 30 minutos
- **Total: 3-5 horas**

### 2.3 Ventana de Mantenimiento

Recomendado: Realizar durante horario de baja actividad para evitar conflictos con PRs en curso.

---

## 3. Paso 1: Crear Ramas

### 3.1 Desde la máquina local

```bash
# 1. Actualizar repositorio
cd /home/administrador/monorepo-bca
git fetch --all
git checkout main
git pull origin main

# 2. Crear rama staging desde main
git checkout -b staging
git push -u origin staging
echo "✅ Rama staging creada"

# 3. Crear rama develop desde staging
git checkout -b develop
git push -u origin develop
echo "✅ Rama develop creada"

# 4. Volver a main
git checkout main
```

### 3.2 Verificar

```bash
git branch -a | grep -E "develop|staging|main"
# Debe mostrar:
#   develop
#   staging
# * main
#   remotes/origin/develop
#   remotes/origin/staging
#   remotes/origin/main
```

---

## 4. Paso 2: Configurar GitHub

### 4.1 Cambiar Default Branch

1. Ir a GitHub → **Settings** → **Branches**
2. En "Default branch", click en el ícono de switch
3. Seleccionar `develop`
4. Confirmar el cambio

### 4.2 Proteger Rama `develop`

1. Ir a **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern:** `develop`
3. Marcar:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
     - Agregar: `lint`, `test`, `build` (cuando existan los workflows)
   - [x] Require branches to be up to date before merging
   - [x] Do not allow bypassing the above settings
4. Click **Create**

### 4.3 Proteger Rama `staging`

1. **Branch name pattern:** `staging`
2. Marcar:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
   - [x] Require approvals: **1**
   - [x] Dismiss stale pull request approvals when new commits are pushed
   - [x] Do not allow bypassing the above settings
3. Click **Create**

### 4.4 Proteger Rama `main`

1. **Branch name pattern:** `main`
2. Marcar:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
   - [x] Require approvals: **1**
   - [x] Dismiss stale pull request approvals when new commits are pushed
   - [x] Require conversation resolution before merging
   - [x] Do not allow bypassing the above settings
   - [x] Do not allow force pushes
   - [x] Do not allow deletions
3. Click **Create**

### 4.5 Proteger Tags

1. Ir a **Settings** → **Tags**
2. Click **New rule**
3. **Tag name pattern:** `v*`
4. Seleccionar quiénes pueden crear tags (Maintainers)
5. Click **Add rule**

### 4.6 Configurar Environments

1. Ir a **Settings** → **Environments**
2. Crear environment `testing`:
   - Sin protecciones adicionales
3. Crear environment `staging`:
   - Sin protecciones adicionales
4. Crear environment `production`:
   - [x] Required reviewers
   - Agregar usuarios aprobadores
   - Wait timer: 0 minutos (opcional: agregar delay)

---

## 5. Paso 3: Actualizar Workflows

### 5.1 Eliminar Workflows Antiguos

```bash
cd /home/administrador/monorepo-bca

# Mover workflows actuales a backup
mkdir -p .github/workflows-backup
mv .github/workflows/deploy-dev.yml .github/workflows-backup/
mv .github/workflows/deploy-staging.yml .github/workflows-backup/
mv .github/workflows/deploy-prod.yml .github/workflows-backup/
mv .github/workflows/monorepo-ci.yml .github/workflows-backup/

# Mantener los que no cambian
# - labeler.yml
# - dependabot.yml
# - etc.
```

### 5.2 Instalar Nuevos Workflows

```bash
# Copiar workflows nuevos
cp docs/github-workflows/ci.yml .github/workflows/
cp docs/github-workflows/deploy-testing.yml .github/workflows/
cp docs/github-workflows/deploy-staging.yml .github/workflows/
cp docs/github-workflows/deploy-production.yml .github/workflows/

# Verificar
ls -la .github/workflows/
```

### 5.3 Commit de Workflows

```bash
git checkout develop
git add .github/workflows/
git add .github/workflows-backup/
git commit -m "ci: reemplazar workflows por estrategia de 3 ramas

- ci.yml: Validación en PRs a develop/staging/main
- deploy-testing.yml: Auto-deploy a 10.3.0.246 en push a develop
- deploy-staging.yml: Auto-deploy a 10.3.0.243 en push a staging
- deploy-production.yml: Deploy manual a 10.8.10.20 con tag v*

Workflows anteriores movidos a .github/workflows-backup/"
git push origin develop
```

---

## 6. Paso 4: Configurar Secrets

### 6.1 Secrets Necesarios

Ir a **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Valor | Notas |
|--------|-------|-------|
| `TESTING_SSH_HOST` | `10.3.0.246` | IP servidor Testing |
| `TESTING_SSH_USER` | `administrador` | Usuario SSH |
| `TESTING_SSH_KEY` | (contenido de id_rsa_bca_243) | Clave privada SSH |
| `STAGING_SSH_HOST` | `10.3.0.243` | IP servidor Staging |
| `STAGING_SSH_USER` | `administrador` | Usuario SSH |
| `STAGING_SSH_KEY` | (contenido de id_rsa_bca_243) | Clave privada SSH |
| `PROD_SSH_HOST` | `10.8.10.20` | IP servidor Producción |
| `PROD_SSH_USER` | `administrador` | Usuario SSH |
| `PROD_SSH_KEY` | (contenido de bca_10_8_10_20) | Clave privada SSH |
| `SONAR_TOKEN` | (token existente) | Ya configurado |
| `SONAR_HOST_URL` | (URL existente) | Ya configurado |

### 6.2 Obtener Claves SSH

```bash
# Para Testing/Staging
cat ~/.ssh/id_rsa_bca_243

# Para Producción
cat ~/.ssh/bca_10_8_10_20
```

Copiar el contenido completo (incluyendo `-----BEGIN/END-----`).

---

## 7. Paso 5: Configurar Servidores

### 7.1 Servidor Testing (10.3.0.246)

```bash
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.246

# Cambiar a rama develop
cd /home/administrador/monorepo-bca
git fetch origin
git checkout develop
git pull origin develop

# Verificar
git branch
# * develop
```

### 7.2 Servidor Staging (10.3.0.243)

```bash
ssh -i ~/.ssh/id_rsa_bca_243 administrador@10.3.0.243

# Cambiar a rama staging
cd /home/administrador/monorepo-bca
git fetch origin
git checkout staging
git pull origin staging

# Verificar
git branch
# * staging
```

### 7.3 Servidor Producción (10.8.10.20)

```bash
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20

# Mantener en main (o el último tag)
cd /home/administrador/monorepo
git fetch --all --tags
git checkout main
git pull origin main

# Verificar
git branch
# * main
```

### 7.4 Crear Directorio de Backups (Producción)

```bash
ssh -i ~/.ssh/bca_10_8_10_20 administrador@10.8.10.20

mkdir -p /home/administrador/backups
chmod 700 /home/administrador/backups
```

---

## 8. Paso 6: Comunicar al Equipo

### 8.1 Template de Comunicación

```markdown
# 📢 Cambio en Estrategia de Git

## Resumen
Hemos implementado una nueva estrategia de branches para mejorar el control de versiones.

## Cambios principales

### Nuevo flujo
```
feature/* → develop → staging → main
              ↓          ↓        ↓
           Testing   Staging  Producción
```

### Qué cambia para vos

1. **Crear features desde `develop`** (no desde main):
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/mi-feature
   ```

2. **PRs van a `develop`** (no a main)

3. **El código avanza automáticamente**:
   - Merge a `develop` → Deploy a Testing
   - PR de `develop` a `staging` → Deploy a Staging
   - PR de `staging` a `main` + tag → Deploy a Producción

### Documentación
Ver `docs/GIT-BRANCHING-STRATEGY.md` para detalles completos.

### Preguntas
Contactar a [responsable].
```

---

## 9. Verificación

### 9.1 Checklist de Verificación

- [ ] Ramas `develop`, `staging`, `main` existen en GitHub
- [ ] Default branch es `develop`
- [ ] Protecciones de ramas configuradas
- [ ] Secrets configurados
- [ ] Workflows nuevos en `.github/workflows/`
- [ ] Servidor Testing apunta a `develop`
- [ ] Servidor Staging apunta a `staging`
- [ ] Servidor Producción apunta a `main`

### 9.2 Test del Pipeline

1. **Crear PR de prueba:**
   ```bash
   git checkout develop
   git checkout -b test/verify-pipeline
   echo "# Test" >> TEST.md
   git add TEST.md
   git commit -m "test: verificar pipeline"
   git push -u origin test/verify-pipeline
   # Crear PR a develop en GitHub
   ```

2. **Verificar que CI corre** en el PR

3. **Merge el PR** y verificar deploy a Testing

4. **Crear PR develop → staging** y verificar deploy a Staging

5. **Cleanup:**
   ```bash
   git checkout develop
   git pull
   rm TEST.md
   git add TEST.md
   git commit -m "chore: cleanup test file"
   git push
   ```

---

## 10. Rollback del Cambio

Si algo sale mal, estos son los pasos para volver al estado anterior:

### 10.1 Restaurar Workflows

```bash
cd /home/administrador/monorepo-bca

# Restaurar workflows anteriores
mv .github/workflows/ci.yml .github/workflows-new-backup/
mv .github/workflows/deploy-testing.yml .github/workflows-new-backup/
mv .github/workflows/deploy-staging.yml .github/workflows-new-backup/
mv .github/workflows/deploy-production.yml .github/workflows-new-backup/

mv .github/workflows-backup/* .github/workflows/

git add .github/
git commit -m "revert: restaurar workflows anteriores"
git push origin develop
```

### 10.2 Restaurar Default Branch

1. GitHub → Settings → Branches
2. Cambiar default branch a `main`

### 10.3 Restaurar Servidores

```bash
# Testing
ssh administrador@10.3.0.246
cd /home/administrador/monorepo-bca
git checkout main
git pull origin main

# Staging
ssh administrador@10.3.0.243
cd /home/administrador/monorepo-bca
git checkout main
git pull origin main
```

---

## Apéndice: Comandos de Referencia Post-Migración

### Flujo diario (desarrollador)

```bash
# Iniciar feature
git checkout develop
git pull origin develop
git checkout -b feat/mi-feature

# Trabajar...
git add .
git commit -m "feat(modulo): descripcion"
git push -u origin feat/mi-feature

# Crear PR a develop en GitHub
```

### Promoción (tech lead)

```bash
# Promover a staging:
# 1. Crear PR en GitHub: develop → staging
# 2. Merge el PR
# 3. Ejecutar deploy MANUAL:
#    - GitHub → Actions → "Deploy Staging"
#    - Run workflow → Branch: staging → Confirm: deploy
# 4. Notificar a QA

# Promover a producción:
# 1. Crear PR en GitHub: staging → main
# 2. Merge el PR
# 3. Crear tag:
git checkout main
git pull
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin v1.5.0
# 4. Aprobar el deploy cuando se solicite
```

---

*Documento de implementación - Monorepo BCA*
