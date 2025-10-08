# Guía del Desarrollador (Junior)

> **Rol según Manual Operativo Microsyst**: Implementan tareas, abren PRs chicos y hacen revisión entre pares (1 aprobación). Ejecutan lint/test/build y dejan pasos de prueba en la PR. Actualizan README y .env.example cuando cambia cómo correr o desplegar. Soportan a PM/Analista en preparación de datos de prueba y verificación funcional.

## 1. Características del Rol

### Perfil
- **Responsabilidad**: Implementar funcionalidades, corregir bugs, mantener código de calidad y colaborar en QA
- **Nivel**: Junior (equipo de 3 devs jr trabajando colaborativamente)
- **Herramientas**: Git, GitHub, VSCode/Cursor, Node.js, npm, Docker
- **Conocimientos requeridos**: TypeScript, React, Express, Prisma, Git Flow, testing básico

### Competencias Clave
- ✅ Programación en TypeScript (frontend y backend)
- ✅ Gestión de versiones con Git
- ✅ Escritura de tests unitarios y de integración
- ✅ Comprensión de arquitectura de microservicios
- ✅ Capacidad de trabajar con feedback de revisiones
- ✅ Preparación de datos de prueba
- ✅ Documentación básica (README, .env.example)

### Responsabilidades Core (Manual Operativo)
1. **Implementación**: Desarrolla tareas asignadas en ramas `feat/*`, `fix/*`, `chore/*`
2. **PRs Chicos**: Abre Pull Requests ≤300 líneas con descripción, pasos de prueba y evidencias
3. **Peer Review**: Revisa código de compañeros (1 aprobación requerida antes de merge)
4. **Quality Gates**: Ejecuta `npm ci && npm run lint && npm test && npm run build` antes de PR
5. **Documentación**: Actualiza README y .env.example cuando cambia setup o deploy
6. **Soporte a QA**: Ayuda a PM/Analista con datos de prueba y verificación funcional

### Restricciones Importantes
- ❌ PRs > 300 líneas (dividir en PRs más chicos)
- ❌ Commits sin lint/test (verificar antes de push)
- ❌ Secrets hardcodeados (usar variables de entorno)
- ❌ Cambios fuera del alcance del issue (solo lo asignado)

---

## 2. Flujo de Trabajo Diario

### 2.1 Inicio de una Nueva Tarea

#### Paso 1: Recibir Asignación
1. Ve a GitHub Issues: `https://github.com/sergiobleynat1969/monorepo-bca/issues`
2. Localiza el issue asignado a ti
3. Lee completamente la descripción, criterios de aceptación y comentarios
4. Si tienes dudas, **pregunta en el issue ANTES de comenzar**

#### Paso 2: Preparar Entorno Local
```bash
# 1. Asegúrate de estar en la rama main actualizada
cd /ruta/a/monorepo-bca
git checkout main
git pull origin main

# 2. Verifica que tu entorno funcione
npm install
npm run dev

# 3. Confirma que backend, frontend y documentos arranquen sin errores
# Revisa la consola - debe ver:
# ✓ Backend corriendo en puerto 4800
# ✓ Frontend corriendo en puerto 8550
# ✓ Documentos corriendo en puerto 4900
```

#### Paso 3: Crear Branch de Trabajo
```bash
# Nomenclatura: feature/<issue-number>-<descripcion-corta>
# Ejemplo para issue #42 "Agregar validación de email"
git checkout -b feature/42-validacion-email

# O para un bug:
git checkout -b fix/42-corregir-login
```

**Reglas de nomenclatura:**
- `feature/` → Nueva funcionalidad
- `fix/` → Corrección de bug
- `refactor/` → Mejora de código sin cambio funcional
- `docs/` → Solo cambios en documentación
- `test/` → Solo agregar/mejorar tests

---

### 2.2 Implementación de Código

#### Paso 4: Programar con Calidad

**Antes de escribir código:**
1. **Analiza el alcance**: ¿Qué archivos necesitas modificar?
2. **Revisa código existente**: ¿Hay patrones similares en el proyecto?
3. **Planifica tests**: ¿Cómo vas a probar esto?

**Durante la implementación:**

```typescript
// ❌ MAL - Código sin tipado, sin validación
app.post('/api/users', (req, res) => {
  const user = req.body;
  db.create(user);
  res.send(user);
});

// ✅ BIEN - Tipado, validación, manejo de errores
import { z } from 'zod';
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const CreateUserSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(100),
  rol: z.enum(['ADMIN', 'USER'])
});

export const createUser = async (req: Request, res: Response) => {
  try {
    // Validar entrada
    const data = CreateUserSchema.parse(req.body);
    
    // Lógica de negocio
    const user = await prisma.user.create({
      data: {
        email: data.email,
        nombre: data.nombre,
        rol: data.rol
      }
    });
    
    // Respuesta exitosa
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: error.errors
      });
    }
    
    // Log del error (sin exponer en producción)
    console.error('Error creando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
```

**Checklist de calidad:**
- [ ] ¿Usé TypeScript estricto? (`no any`)
- [ ] ¿Validé todas las entradas del usuario?
- [ ] ¿Manejé errores apropiadamente?
- [ ] ¿Agregué logs informativos?
- [ ] ¿Evité hardcodear valores? (usar variables de entorno)
- [ ] ¿El código es legible? (nombres descriptivos, funciones pequeñas)

#### Paso 5: Escribir Tests

**Para cada funcionalidad, escribe al menos:**

1. **Test Unitario** (lógica aislada)
```typescript
// apps/backend/src/__tests__/services/user.service.test.ts
import { createUser } from '../../services/user.service';
import { prisma } from '../../config/database';

jest.mock('../../config/database');

describe('UserService - createUser', () => {
  it('debe crear un usuario válido', async () => {
    const mockUser = {
      email: 'test@example.com',
      nombre: 'Test User',
      rol: 'USER'
    };
    
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 1,
      ...mockUser
    });
    
    const result = await createUser(mockUser);
    
    expect(result).toHaveProperty('id');
    expect(result.email).toBe(mockUser.email);
  });

  it('debe lanzar error con email inválido', async () => {
    await expect(
      createUser({ email: 'invalid', nombre: 'Test', rol: 'USER' })
    ).rejects.toThrow();
  });
});
```

2. **Test de Integración** (flujo completo)
```typescript
// apps/backend/src/__tests__/routes/users.routes.test.ts
import request from 'supertest';
import app from '../../app';

describe('POST /api/users', () => {
  it('debe crear usuario y retornar 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'nuevo@example.com',
        nombre: 'Nuevo Usuario',
        rol: 'USER'
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });

  it('debe rechazar email duplicado con 400', async () => {
    await request(app)
      .post('/api/users')
      .send({
        email: 'duplicado@example.com',
        nombre: 'Usuario 1',
        rol: 'USER'
      });
    
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'duplicado@example.com',
        nombre: 'Usuario 2',
        rol: 'USER'
      })
      .expect(400);
    
    expect(response.body.success).toBe(false);
  });
});
```

**Ejecutar tests:**
```bash
# Todos los tests
npm run test

# Solo un archivo
npm run test -- user.service.test.ts

# Con cobertura
npm run test:coverage

# Objetivo: cobertura ≥ 80%
```

#### Paso 6: Verificar Linting y Build

```bash
# 1. Lint (corregir problemas de estilo)
npm run lint

# Si hay errores, corregirlos automáticamente:
npm run lint:fix

# 2. Build (verificar que compile sin errores)
npm run build

# 3. Verificar que no rompiste nada
npm run dev
# Probar manualmente la funcionalidad en el navegador
```

---

### 2.3 Commits y Pull Request

#### Paso 7: Hacer Commits Atómicos

**Regla de oro**: Un commit = Una unidad lógica de cambio

```bash
# ❌ MAL - Commit gigante con todo mezclado
git add .
git commit -m "cambios"

# ✅ BIEN - Commits pequeños y descriptivos
git add apps/backend/src/services/user.service.ts
git commit -m "feat(backend): agregar validación de email en UserService"

git add apps/backend/src/__tests__/services/user.service.test.ts
git commit -m "test(backend): agregar tests para validación de email"

git add apps/frontend/src/features/users/UserForm.tsx
git commit -m "feat(frontend): agregar campo de email en formulario de usuario"
```

**Formato de commits (Conventional Commits):**
```
<tipo>(<scope>): <descripción corta>

[cuerpo opcional - explicar el POR QUÉ]

[footer opcional - referencias a issues]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Cambio de código sin afectar funcionalidad
- `test`: Agregar o modificar tests
- `docs`: Solo documentación
- `style`: Formato, punto y coma, etc (no afecta código)
- `chore`: Tareas de mantenimiento (deps, config, etc)

**Ejemplos reales:**
```bash
git commit -m "feat(backend): agregar endpoint GET /api/users/:id"

git commit -m "fix(frontend): corregir error de validación en LoginForm

El formulario no validaba emails con caracteres especiales.
Se actualizó el regex para soportar RFC 5322.

Closes #42"

git commit -m "test(documentos): aumentar cobertura de TemplateService a 85%"

git commit -m "refactor(backend): extraer lógica de autenticación a middleware"
```

#### Paso 8: Subir Branch a GitHub

```bash
# Primera vez - crear branch remoto
git push -u origin feature/42-validacion-email

# Siguientes veces
git push
```

#### Paso 9: Crear Pull Request

1. **Ve a GitHub**: `https://github.com/sergiobleynat1969/monorepo-bca/pulls`
2. **Click en "New Pull Request"**
3. **Base**: `main` ← **Compare**: `feature/42-validacion-email`
4. **Completa el template del PR:**

```markdown
## Descripción
Implementa validación de email en el formulario de registro de usuarios.
Ahora se valida formato RFC 5322 y se verifica que no esté duplicado en BD.

## Tipo de cambio
- [x] Nueva funcionalidad (feature)
- [ ] Corrección de bug (fix)
- [ ] Cambio que rompe compatibilidad (breaking change)

## ¿Cómo se probó?
- [x] Tests unitarios (user.service.test.ts)
- [x] Tests de integración (users.routes.test.ts)
- [x] Prueba manual en DEV (creé 5 usuarios, intenté duplicar email)

## Checklist
- [x] Mi código sigue las convenciones del proyecto
- [x] He revisado mi propio código
- [x] He comentado código complejo donde fue necesario
- [x] He actualizado la documentación relevante
- [x] Mis cambios no generan warnings
- [x] He agregado tests que prueban mi funcionalidad
- [x] Tests nuevos y existentes pasan localmente
- [x] Cobertura de tests ≥ 80%

## Issues relacionados
Closes #42

## Capturas de pantalla (si aplica)
[Adjuntar screenshot del formulario funcionando]

## Notas adicionales
- Se agregó dependencia `validator` para validación de email
- Se actualizó schema de Zod en UserController
```

5. **Asignar revisores:**
   - Selecciona al menos 1 Tech Lead / Senior
   - Selecciona 1 desarrollador del equipo
6. **Click en "Create Pull Request"**

---

### 2.4 Proceso de Revisión

#### Paso 10: Responder a Comentarios

**Cuando recibas comentarios de revisión:**

1. **Lee todos los comentarios antes de responder**
2. **Para cada comentario:**
   - Si estás de acuerdo → Implementa el cambio
   - Si tienes dudas → Pregunta educadamente
   - Si no estás de acuerdo → Argumenta con fundamentos técnicos

**Ejemplo de buena respuesta:**
```markdown
> Revisor: "Esta función es muy larga, considera dividirla"

✅ Respuesta: "Tienes razón. La dividí en 3 funciones más pequeñas:
- `validateUserData()`
- `createUserInDatabase()`
- `sendWelcomeEmail()`

Commit: abc123"
```

**Ejemplo de mala respuesta:**
```markdown
> Revisor: "Esta función es muy larga, considera dividirla"

❌ Respuesta: "A mí me parece bien así"
```

3. **Implementar cambios solicitados:**

```bash
# Hacer cambios en tu branch
git add .
git commit -m "refactor: dividir createUser en funciones más pequeñas"

# Subir cambios
git push

# GitHub automáticamente actualizará el PR
```

4. **Marcar conversaciones como resueltas** cuando hayas implementado el cambio

5. **Tiempo de respuesta**: Máximo 24 horas

---

### 2.5 Merge y Deploy

#### Paso 11: Preparar para Merge

**Antes del merge, asegúrate:**

```bash
# 1. Sincronizar con main (puede haber cambios nuevos)
git checkout main
git pull origin main

git checkout feature/42-validacion-email
git merge main

# Si hay conflictos, resuélvelos:
# - Abre archivos con conflictos
# - Busca marcadores <<<<<<< ======= >>>>>>>
# - Decide qué código mantener
# - Elimina los marcadores

git add .
git commit -m "merge: resolver conflictos con main"
git push
```

2. **Verifica que CI pase:**
   - Ve a la pestaña "Checks" en tu PR
   - Debe haber ✅ verde en: Lint, Test, Build

3. **Obtén aprobaciones requeridas:**
   - Mínimo 2 aprobaciones
   - Al menos 1 de un Senior

#### Paso 12: Merge del PR

**Opciones de merge:**

1. **Squash and Merge** (recomendado para features pequeños)
   - Combina todos tus commits en uno solo
   - Mantiene historial limpio
   - Usa cuando tienes muchos commits pequeños

2. **Merge Commit** (para features grandes)
   - Preserva todos los commits
   - Usa cuando la historia de commits es valiosa

3. **Rebase and Merge** (para mantener linealidad)
   - Aplica commits uno a uno sobre main
   - Usa cuando quieres historial lineal sin merge commits

**Proceso:**
1. Click en "Squash and Merge" (o la opción elegida)
2. Edita el mensaje del commit final si es necesario
3. Click en "Confirm merge"
4. **Elimina el branch remoto** (GitHub lo sugiere automáticamente)

```bash
# Limpieza local
git checkout main
git pull origin main
git branch -d feature/42-validacion-email
```

---

## 3. Casos Especiales

### 3.1 Trabajar en Bug Crítico (Hotfix)

```bash
# 1. Crear branch desde main
git checkout main
git pull origin main
git checkout -b hotfix/123-corregir-login-produccion

# 2. Implementar FIX mínimo (sin features adicionales)
# 3. Testear exhaustivamente
# 4. PR con etiqueta "hotfix" y "priority: high"
# 5. Solicitar revisión urgente
# 6. Una vez mergeado, se despliega inmediatamente
```

### 3.2 Actualizar Branch Desactualizado

```bash
# Si tu branch está muy atrás de main
git checkout feature/42-validacion-email
git fetch origin
git rebase origin/main

# Si hay conflictos, resolver uno a uno:
git status  # Ver archivos con conflicto
# Editar archivos
git add .
git rebase --continue

# Forzar push (solo en TU branch, nunca en main)
git push --force-with-lease
```

### 3.3 Revertir Cambios Locales

```bash
# Descartar cambios no commiteados en un archivo
git checkout -- archivo.ts

# Descartar TODOS los cambios no commiteados
git reset --hard HEAD

# Revertir último commit (mantener cambios)
git reset --soft HEAD~1

# Revertir último commit (eliminar cambios)
git reset --hard HEAD~1
```

---

## 4. Checklist de Buenas Prácticas

### Antes de Abrir PR
- [ ] Lei y entiendo completamente el issue
- [ ] Mi branch está actualizado con main
- [ ] Todos los tests pasan (`npm run test`)
- [ ] El linting pasa (`npm run lint`)
- [ ] El build es exitoso (`npm run build`)
- [ ] Probé manualmente la funcionalidad
- [ ] Escribí tests con cobertura ≥ 80%
- [ ] Documenté código complejo
- [ ] Actualicé README o docs si es necesario
- [ ] No hay console.logs o código comentado
- [ ] No hay secrets hardcodeados

### Durante Revisión
- [ ] Respondo comentarios en < 24h
- [ ] Implemento cambios solicitados
- [ ] Soy receptivo al feedback
- [ ] Hago preguntas cuando no entiendo
- [ ] Marco conversaciones como resueltas

### Después de Merge
- [ ] Elimino branch local y remoto
- [ ] Sincronizo mi main local
- [ ] Verifico que el deploy automático fue exitoso
- [ ] Pruebo en el ambiente de DEV
- [ ] Cierro el issue correspondiente

---

## 5. Recursos y Ayuda

### Documentación del Proyecto
- **README**: `/README.md`
- **Arquitectura**: `/docs/ARCHITECTURE.md`
- **CI/CD**: `/docs/CICD_PIPELINE_3_SERVICES.md`
- **Ambientes**: `/docs/ENVIRONMENTS.md`

### Comandos Útiles
```bash
# Ver estado de git
git status

# Ver diferencias antes de commit
git diff

# Ver historial de commits
git log --oneline --graph --decorate

# Ver branches locales
git branch

# Ver branches remotos
git branch -r

# Buscar en el código
grep -r "searchTerm" apps/

# Ver puertos ocupados
lsof -i :4800
```

### ¿A quién preguntar?
- **Dudas técnicas**: Tech Lead del proyecto
- **Problemas de entorno**: DevOps/SRE
- **Clarificación de requerimientos**: Product Owner
- **Revisión de código**: Cualquier Senior del equipo

### Canales de Comunicación
- **GitHub Issues**: Para requerimientos y bugs documentados
- **Pull Requests**: Para discusiones de código
- **Slack/Teams** (si aplica): Para preguntas rápidas
- **Daily Standup**: Para reportar progreso y bloqueos

---

## 6. Tiempo de Respuesta Esperado

| Actividad | Tiempo Máximo |
|-----------|---------------|
| Leer y comprender issue asignado | 2 horas |
| Responder a comentarios en PR | 24 horas |
| Implementar cambios solicitados en revisión | 48 horas |
| Resolver conflictos de merge | 4 horas |
| Responder preguntas de revisores | 24 horas |

---

## 7. Ejemplo Completo de Flujo

**Issue #42: "Agregar validación de email en registro de usuarios"**

```bash
# DÍA 1 - Setup
git checkout main
git pull origin main
git checkout -b feature/42-validacion-email

# Leer issue, investigar solución (2 horas)

# DÍA 1-2 - Implementación
# Programar backend (4 horas)
# Programar frontend (3 horas)
# Escribir tests (3 horas)

git add apps/backend/src/services/user.service.ts
git commit -m "feat(backend): agregar validación de email en UserService"

git add apps/backend/src/__tests__/services/user.service.test.ts
git commit -m "test(backend): agregar tests para validación de email"

git add apps/frontend/src/features/users/UserForm.tsx
git commit -m "feat(frontend): agregar validación de email en formulario"

# DÍA 2 - Verificación
npm run lint
npm run test
npm run build

# DÍA 2 - PR
git push -u origin feature/42-validacion-email
# Crear PR en GitHub con descripción completa

# DÍA 3 - Revisión
# Recibir comentarios, implementar cambios
git add .
git commit -m "refactor: aplicar sugerencias de code review"
git push

# DÍA 4 - Merge
# Obtener 2 aprobaciones
# Merge del PR
# Limpiar branch

git checkout main
git pull origin main
git branch -d feature/42-validacion-email
```

---

**Recuerda**: La calidad del código es responsabilidad de todos. Escribe código como si la próxima persona que lo lea fuera un asesino en serie que sabe dónde vives. 😄

