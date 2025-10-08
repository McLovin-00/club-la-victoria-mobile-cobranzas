# Guía del Founder/Lead

> **Rol según Manual Operativo Microsyst**: Define prioridades del sprint y aprueba publicación a Producción. Alinea objetivos de negocio y comunica hitos. Destraba bloqueos y aprueba excepciones (incidentes, hotfixes).

## 1. Características del Rol

### Perfil
- **Responsabilidad**: Garantizar calidad técnica, arquitectura, mentoría del equipo y alineación con objetivos de negocio
- **Nivel**: Senior/Principal (5+ años de experiencia)
- **Autoridad**: Aprobar/rechazar Pull Requests, definir estándares técnicos, aprobar deploys a Producción, priorizar sprint
- **Alcance**: Supervisión técnica de 3 devs jr, 1 DevOps/Back ssr, 1 PM/Analista jr-ssr

### Competencias Clave
- ✅ Dominio avanzado de TypeScript, React, Node.js, arquitectura de microservicios
- ✅ Experiencia en revisión de código y mejores prácticas
- ✅ Capacidad de mentoría y enseñanza
- ✅ Visión de arquitectura y escalabilidad
- ✅ Comunicación efectiva (técnica y no técnica)
- ✅ Gestión de deuda técnica
- ✅ Visión de negocio y alineación estratégica
- ✅ Gestión de incidentes y toma de decisiones bajo presión

### Responsabilidades Core (Manual Operativo)
1. **Priorización de Sprint**: Define qué entra en cada sprint (top 10 tareas de 5-15 propuestas por PM)
2. **Aprobación de Producción**: Autoriza publicación a Producción (jueves 11:00)
3. **Alineación de Objetivos**: Comunica hitos y mantiene equipo alineado con negocio
4. **Resolución de Bloqueos**: Destraba impedimentos técnicos y organizacionales
5. **Gestión de Excepciones**: Aprueba hotfixes e incidentes críticos

---

## 2. Responsabilidades Principales

### 2.1 Revisión de Pull Requests (Code Review)

**Objetivo**: Asegurar que el código que llega a `main` sea:
- ✅ Funcional y libre de bugs
- ✅ Mantenible y legible
- ✅ Bien testeado (≥ 80% cobertura)
- ✅ Alineado con arquitectura del proyecto
- ✅ Siguiendo mejores prácticas

#### Paso 1: Recibir Notificación de PR

**Cuando te asignen como revisor:**
1. Recibirás notificación por email o GitHub
2. Ve a: `https://github.com/sergiobleynat1969/monorepo-bca/pulls`
3. Abre el PR asignado
4. **SLA**: Comenzar revisión en < 4 horas, completar en < 24 horas

#### Paso 2: Evaluación Inicial (5 minutos)

**Checklist rápido:**
```markdown
[ ] ¿El título del PR es descriptivo?
[ ] ¿La descripción explica QUÉ y POR QUÉ?
[ ] ¿Está vinculado a un Issue?
[ ] ¿El template del PR está completo?
[ ] ¿Los checks de CI pasaron (✅ verde)?
[ ] ¿El tamaño del PR es razonable (< 500 líneas)?
```

**Si alguno falla:**
```markdown
❌ Comentario ejemplo:
"@desarrollador, por favor completa la sección 'Cómo se probó' del template 
antes de que pueda revisar. Esto ayuda a entender el contexto de testing."
```

**Si el PR es muy grande (> 500 líneas):**
```markdown
❌ Comentario:
"@desarrollador, este PR es muy grande para revisar efectivamente. 
Por favor, divídelo en PRs más pequeños enfocados en una funcionalidad a la vez.

Sugerencia:
- PR 1: Backend (endpoints + tests)
- PR 2: Frontend (componentes + tests)
- PR 3: Integración + docs"
```

#### Paso 3: Revisión de Arquitectura (10 minutos)

**Preguntas clave:**

1. **¿El cambio está en el lugar correcto?**
```typescript
// ❌ MAL - Lógica de negocio en el controller
app.post('/api/users', async (req, res) => {
  const user = await prisma.user.create({
    data: {
      email: req.body.email.toLowerCase(),
      hashedPassword: await bcrypt.hash(req.body.password, 12),
      role: 'USER'
    }
  });
  // Enviar email...
  // Crear log de auditoría...
  res.json(user);
});

// ✅ BIEN - Lógica en service, controller solo coordina
// controller:
app.post('/api/users', userController.createUser);

// controller:
export const createUser = async (req: Request, res: Response) => {
  const data = CreateUserSchema.parse(req.body);
  const user = await userService.createUser(data);
  res.status(201).json({ success: true, data: user });
};

// service:
export const createUser = async (data: CreateUserInput) => {
  const hashedPassword = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: { ...data, hashedPassword }
  });
  await emailService.sendWelcome(user.email);
  await auditService.logUserCreation(user.id);
  return user;
};
```

**Comentario a dejar:**
```markdown
💡 Sugerencia de arquitectura:
La lógica de hashing y envío de email debería estar en `UserService` 
en lugar del controller. Esto permite reutilizarla y testearla de forma aislada.

Ver ejemplo en: `apps/backend/src/services/auth.service.ts` líneas 45-67
```

2. **¿Se respeta la separación de responsabilidades?**
   - Controllers → Validación y orquestación
   - Services → Lógica de negocio
   - Repositories → Acceso a datos
   - Utils → Funciones puras reutilizables

3. **¿Se siguen los patrones del proyecto?**
   - ¿Usa Prisma correctamente?
   - ¿Maneja errores con try/catch?
   - ¿Retorna DTOs en lugar de modelos de BD?

#### Paso 4: Revisión de Código Línea por Línea (20-40 minutos)

**Checklist detallado:**

##### 4.1 Tipado y Tipos
```typescript
// ❌ MAL
function calculateTotal(items: any[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ BIEN
interface CartItem {
  id: string;
  price: number;
  quantity: number;
}

function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}
```

**Comentario:**
```markdown
🔴 Problema: Uso de `any`
Por favor, define una interfaz `CartItem` con las propiedades esperadas.
Esto previene errores en tiempo de ejecución y mejora el autocomplete.
```

##### 4.2 Validación de Entradas
```typescript
// ❌ MAL
app.post('/api/orders', async (req, res) => {
  const order = await prisma.order.create({
    data: req.body  // Sin validación
  });
});

// ✅ BIEN
import { z } from 'zod';

const CreateOrderSchema = z.object({
  clienteId: z.string().uuid(),
  items: z.array(z.object({
    productoId: z.string().uuid(),
    cantidad: z.number().int().positive()
  })).min(1),
  direccionEntrega: z.string().min(10).max(500)
});

app.post('/api/orders', async (req, res) => {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const order = await orderService.createOrder(data);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: error.errors
      });
    }
    throw error;
  }
});
```

**Comentario:**
```markdown
🔴 Seguridad crítica:
Falta validación de entrada. Un usuario malicioso podría enviar datos arbitrarios.
Por favor, agrega un schema de Zod como se hace en otros endpoints del proyecto.
```

##### 4.3 Manejo de Errores
```typescript
// ❌ MAL
try {
  const user = await prisma.user.findUnique({ where: { id } });
  res.json(user);  // Si no existe, retorna null
} catch (error) {
  res.status(500).send('Error');  // No informativo
}

// ✅ BIEN
try {
  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Usuario no encontrado'
    });
  }
  
  res.json({ success: true, data: user });
} catch (error) {
  logger.error('Error obteniendo usuario:', { id, error });
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
}
```

**Comentario:**
```markdown
⚠️ Manejo de errores incompleto:
1. Si el usuario no existe, debería retornar 404, no 200 con `null`
2. El mensaje de error no es informativo
3. Falta logging del error para debugging

Ver `apps/backend/src/controllers/empresa.controller.ts` líneas 89-110 como referencia.
```

##### 4.4 Seguridad
```typescript
// ❌ MAL - SQL Injection posible
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ❌ MAL - Exponer datos sensibles
res.json({
  user: {
    id: user.id,
    email: user.email,
    password: user.password,  // ¡NUNCA!
    hashedPassword: user.hashedPassword  // Tampoco
  }
});

// ❌ MAL - Sin rate limiting en endpoint sensible
app.post('/api/login', loginController);

// ✅ BIEN
// Usar Prisma (previene SQL injection)
const user = await prisma.user.findUnique({
  where: { email }
});

// DTO que excluye campos sensibles
const userDTO = {
  id: user.id,
  email: user.email,
  nombre: user.nombre,
  rol: user.rol
};

// Rate limiting
import rateLimit from 'express-rate-limit';
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de login'
});
app.post('/api/login', loginLimiter, loginController);
```

**Comentarios:**
```markdown
🔴 CRÍTICO - Exposición de contraseña:
La respuesta incluye `hashedPassword`. NUNCA retornar passwords, ni hasheados.
Usa un DTO que excluya campos sensibles.

---

🟡 Seguridad - Rate limiting:
El endpoint `/api/login` debería tener rate limiting para prevenir ataques de fuerza bruta.
Ver `apps/backend/src/middlewares/rateLimiter.ts`
```

##### 4.5 Performance y Optimización
```typescript
// ❌ MAL - N+1 queries
const orders = await prisma.order.findMany();
for (const order of orders) {
  order.client = await prisma.client.findUnique({
    where: { id: order.clientId }
  });  // ¡Query dentro de loop!
}

// ✅ BIEN - Single query con includes
const orders = await prisma.order.findMany({
  include: {
    client: true,
    items: {
      include: {
        product: true
      }
    }
  }
});
```

**Comentario:**
```markdown
⚠️ Performance - Problema N+1:
Este código hace 1 query inicial + N queries en el loop (N+1).
Para 100 órdenes = 101 queries a la BD.

Solución: Usa `include` de Prisma para hacer join en una sola query.
Esto reducirá el tiempo de respuesta de ~500ms a ~50ms.
```

##### 4.6 Código Limpio
```typescript
// ❌ MAL
function p(d: any) {
  const r = d.filter((x: any) => x.s === 'a' && x.p > 100 && x.q > 0).map((x: any) => ({
    i: x.i, n: x.n, p: x.p, q: x.q, t: x.p * x.q
  }));
  return r;
}

// ✅ BIEN
interface Product {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  price: number;
  quantity: number;
}

interface ProductSummary {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

function filterAvailableProducts(products: Product[]): ProductSummary[] {
  return products
    .filter(product => 
      product.status === 'active' && 
      product.price > 100 && 
      product.quantity > 0
    )
    .map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      total: product.price * product.quantity
    }));
}
```

**Comentario:**
```markdown
💡 Legibilidad:
Esta función es difícil de entender:
- Nombres de variables crípticos (p, d, r, x)
- Lógica compleja en una sola línea
- Sin tipos explícitos

Sugerencias:
1. Renombrar: `p` → `filterAvailableProducts`
2. Extraer filtros a variables con nombres descriptivos
3. Agregar comentarios si la lógica es compleja
4. Separar en funciones más pequeñas si hace más de una cosa

Principio: "El código se lee 10 veces más de lo que se escribe"
```

#### Paso 5: Revisión de Tests (15 minutos)

**Checklist de tests:**

```markdown
[ ] ¿Existe al menos un test para cada función pública?
[ ] ¿Los tests cubren casos edge (null, undefined, arrays vacíos)?
[ ] ¿Hay tests de error (qué pasa si falla)?
[ ] ¿La cobertura es ≥ 80%?
[ ] ¿Los tests son determinísticos (no dependen de orden)?
[ ] ¿Los mocks están bien implementados?
[ ] ¿Los nombres de tests son descriptivos?
```

**Ejemplos:**

```typescript
// ❌ MAL
it('works', async () => {
  const result = await createUser({ email: 'test@test.com' });
  expect(result).toBeTruthy();
});

// ✅ BIEN
describe('UserService.createUser', () => {
  describe('cuando los datos son válidos', () => {
    it('debe crear el usuario y retornar el objeto con id', async () => {
      const input = {
        email: 'nuevo@example.com',
        nombre: 'Juan Pérez',
        rol: 'USER'
      };
      
      const result = await createUser(input);
      
      expect(result).toMatchObject({
        id: expect.any(String),
        email: input.email,
        nombre: input.nombre,
        rol: input.rol
      });
      expect(result.hashedPassword).toBeUndefined();
    });

    it('debe enviar email de bienvenida', async () => {
      const input = { email: 'nuevo@example.com', nombre: 'Juan', rol: 'USER' };
      
      await createUser(input);
      
      expect(emailService.sendWelcome).toHaveBeenCalledWith(input.email);
    });
  });

  describe('cuando el email está duplicado', () => {
    it('debe lanzar error DuplicateEmailError', async () => {
      await createUser({ email: 'duplicado@test.com', nombre: 'User1', rol: 'USER' });
      
      await expect(
        createUser({ email: 'duplicado@test.com', nombre: 'User2', rol: 'USER' })
      ).rejects.toThrow(DuplicateEmailError);
    });
  });

  describe('cuando los datos son inválidos', () => {
    it('debe rechazar email con formato inválido', async () => {
      await expect(
        createUser({ email: 'invalid', nombre: 'Test', rol: 'USER' })
      ).rejects.toThrow(ValidationError);
    });

    it('debe rechazar nombre vacío', async () => {
      await expect(
        createUser({ email: 'test@test.com', nombre: '', rol: 'USER' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

**Comentario si faltan tests:**
```markdown
🔴 Cobertura de tests insuficiente:
Faltan tests para:
- ✅ Caso feliz (lo tienes)
- ❌ Email duplicado
- ❌ Email con formato inválido
- ❌ Manejo de errores de BD

Cobertura actual: 45% (objetivo: ≥ 80%)

Por favor, agrega tests para estos escenarios antes de que pueda aprobar.
```

#### Paso 6: Revisión de Frontend (si aplica) (15 minutos)

**Checklist específico de React:**

```typescript
// ❌ MAL
function UserList() {
  const [users, setUsers] = useState([]);
  
  // Se ejecuta en cada render
  fetch('/api/users').then(res => setUsers(res.data));
  
  return (
    <div>
      {users.map(user => (
        <div onClick={() => deleteUser(user.id)}>  {/* Sin key */}
          {user.name}
        </div>
      ))}
    </div>
  );
}

// ✅ BIEN
function UserList() {
  const { data: users, isLoading, error } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="space-y-2">
      {users?.map(user => (
        <UserCard 
          key={user.id} 
          user={user} 
          onDelete={deleteUser}
        />
      ))}
    </div>
  );
}
```

**Comentarios típicos:**
```markdown
⚠️ React - Problemas detectados:

1. **Fetch en render**: La llamada a `fetch` se ejecuta en cada render, causando loop infinito.
   Solución: Moverlo a `useEffect` o mejor aún, usar RTK Query.

2. **Falta key**: Los elementos en `.map()` necesitan `key` única.
   Usar `user.id`, no el índice del array.

3. **No hay estados de loading/error**: El usuario no sabe si está cargando o falló.
   Mostrar spinners y mensajes de error apropiados.

Ver componente de referencia: `apps/frontend/src/features/empresas/EmpresaList.tsx`
```

#### Paso 7: Decisión y Feedback (5 minutos)

**Opciones:**

##### A) Aprobar ✅
**Cuándo**: Todo está perfecto o solo hay sugerencias menores (no bloqueantes)

```markdown
✅ **Aprobado**

Excelente trabajo @desarrollador. El código está limpio, bien testeado y sigue
las convenciones del proyecto.

Sugerencias menores (no bloqueantes):
- Considera extraer la función `validateAddress` a utils para reutilizarla
- El nombre `processData` podría ser más específico (`processOrderData`)

Estos son detalles que pueden mejorarse en un PR futuro.
```

##### B) Solicitar Cambios 🔴
**Cuándo**: Hay problemas que DEBEN corregirse antes de merge

```markdown
🔴 **Cambios solicitados**

He revisado el código y hay algunos puntos críticos que necesitan corrección
antes de que pueda aprobar:

**Bloqueantes:**
1. 🔴 Línea 45: Exposición de password en respuesta (seguridad)
2. 🔴 Línea 78: Falta validación de entrada (permite SQL injection)
3. 🔴 Tests: Cobertura 45% (objetivo: ≥ 80%)

**Sugerencias importantes:**
4. 🟡 Línea 102: Problema N+1 de performance
5. 🟡 Línea 156: Función muy larga (considerar dividir)

Por favor, corrige los bloqueantes (1-3) y avísame cuando esté listo para
re-revisar. Si tienes dudas sobre cómo implementar algo, pregúntame.
```

##### C) Comentar (sin decisión) 💬
**Cuándo**: Necesitas clarificación antes de decidir

```markdown
💬 **Preguntas antes de aprobar**

@desarrollador, antes de completar la revisión necesito entender:

1. ¿Por qué se cambió de `findUnique` a `findFirst`? ¿Hay casos de registros duplicados?
2. La función `processPayment` parece compleja. ¿Consideraste usar la librería
   de pagos existente en `shared/payment`?
3. ¿Los cambios en el schema de BD están coordinados con DevOps para el deploy?

Una vez que aclares estos puntos podré completar la revisión.
```

#### Paso 8: Seguimiento

**Después de solicitar cambios:**
1. **Monitorear**: El desarrollador tiene 48h para implementar cambios
2. **Re-revisar**: Cuando te notifiquen, revisar solo los cambios nuevos
3. **Aprobar o iterar**: Hasta que todo esté correcto

**Métricas a trackear:**
- Tiempo promedio de primera revisión: < 24h
- Número de rondas de revisión: 1-2 (ideal)
- PRs aprobados vs rechazados: ~80% aprobados en 2da ronda

---

### 2.2 Definición de Estándares Técnicos

**Tu rol es establecer y mantener:**

#### Estándares de Código

**Documento**: `/docs/CODING_STANDARDS.md` (crear si no existe)

```markdown
# Estándares de Código - Monorepo BCA

## TypeScript
- Modo estricto habilitado (`strict: true`)
- Prohibido `any` (usar `unknown` y type guards)
- Interfaces para objetos, Types para unions
- Naming: PascalCase para types/interfaces, camelCase para variables

## Estructura de Archivos
```
apps/backend/src/
├── controllers/    # Orquestación, validación de entrada
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos (si es complejo)
├── middlewares/    # Express middlewares
├── utils/          # Funciones puras reutilizables
├── types/          # Type definitions
└── __tests__/      # Tests (espejo de estructura)
```

## Comentarios
```typescript
// ✅ BIEN - Explicar POR QUÉ, no QUÉ
// Usamos un delay de 100ms porque la API de Evolution tiene rate limiting
await sleep(100);

// ❌ MAL - Obvio, no aporta valor
// Incrementar contador
counter++;
```

## Error Handling
- Siempre usar try/catch en funciones async
- Crear clases de error custom para casos de negocio
- Loggear errores con contexto (nunca solo `console.log`)
```

#### Arquitectura y Patterns

**Documento**: `/docs/ARCHITECTURE_PATTERNS.md`

```markdown
# Patrones de Arquitectura

## Controller → Service → Repository

### Controller (apps/backend/src/controllers/)
- Validar request (Zod schemas)
- Llamar a service
- Formatear response
- Manejo de errores HTTP

### Service (apps/backend/src/services/)
- Lógica de negocio
- Transacciones
- Llamadas a múltiples repositorios
- Eventos de dominio

### Repository (si es necesario)
- Queries complejas a BD
- Abstracción de Prisma
- Caché

## Ejemplo Completo

```typescript
// controller
export const createOrder = async (req: Request, res: Response) => {
  try {
    const data = CreateOrderSchema.parse(req.body);
    const order = await orderService.createOrder(data, req.user.id);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    handleControllerError(error, res);
  }
};

// service
export const createOrder = async (data: CreateOrderInput, userId: string) => {
  // Validaciones de negocio
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) throw new ClientNotFoundError();
  
  // Transacción
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data });
    await tx.inventory.updateMany({
      where: { id: { in: data.items.map(i => i.productId) } },
      data: { quantity: { decrement: 1 } }
    });
    await auditService.logOrderCreation(order.id, userId);
    return order;
  });
};
```
```

---

### 2.3 Mentoría y Enseñanza

#### Estrategias de Mentoría

##### A) Code Reviews como Oportunidad de Enseñanza

```markdown
// En lugar de solo rechazar:
❌ "Este código está mal"

// Explica el por qué y cómo mejorarlo:
✅ "Este código funciona, pero tiene un problema de escalabilidad.
Cuando tengamos 10,000 órdenes, este loop tomará ~30 segundos.

Te muestro dos alternativas:

1. **Solución rápida**: Paginación
```typescript
const orders = await prisma.order.findMany({
  take: 100,
  skip: page * 100
});
```

2. **Solución óptima**: Query optimizado
```typescript
const stats = await prisma.order.groupBy({
  by: ['status'],
  _count: true
});
```

La opción 2 es 100x más rápida. ¿Te parece implementarla? Si necesitas ayuda,
podemos hacer pair programming 15 min."
```

##### B) Sesiones de Pair Programming

**Cuándo**:
- Desarrollador bloqueado > 4 horas
- Feature compleja que requiere mentoría
- Introducir nuevo patrón o tecnología

**Cómo**:
```markdown
1. **Agendar**: 30-60 min en calendario
2. **Compartir pantalla**: Desarrollador conduce, tú guías
3. **Hacer preguntas**: "¿Qué pasaría si el usuario hace X?"
4. **No tomar el teclado**: Deja que escriba, tú diriges
5. **Documentar decisiones**: En comments del código o ADR
```

##### C) Tech Talks Internos (mensual)

**Temas sugeridos**:
- "Cómo debuggear problemas de performance"
- "Patrones de error handling en TypeScript"
- "Testing: del unit test al E2E"
- "Seguridad en APIs: Top 10 de OWASP"

**Formato**:
- 30 min presentación + 15 min Q&A
- Grabar para referencia futura
- Compartir slides y código de ejemplo

---

### 2.4 Gestión de Deuda Técnica

#### Identificar Deuda Técnica

**Durante code reviews, etiqueta:**

```markdown
// TODO(tech-debt): Este N+1 query debe optimizarse cuando tengamos > 1000 órdenes
// Issue: #234
const orders = await prisma.order.findMany();
for (const order of orders) {
  order.client = await getClient(order.clientId);
}
```

**Crear issues etiquetados**:
- Label: `tech-debt`
- Prioridad: baja/media/alta/crítica
- Estimación: horas de esfuerzo
- Impact: performance/seguridad/mantenibilidad

#### Priorizar Deuda Técnica

**Matriz de priorización:**

| Impacto / Esfuerzo | Bajo (< 4h) | Medio (4-16h) | Alto (> 16h) |
|-------------------|-------------|---------------|--------------|
| **Crítico**       | 🔴 Ahora    | 🔴 Ahora      | 🟠 Sprint próximo |
| **Alto**          | 🟡 Sprint próximo | 🟡 Sprint próximo | 🟢 Roadmap |
| **Medio**         | 🟢 Cuando haya tiempo | 🟢 Roadmap | 🔵 Backlog |
| **Bajo**          | 🔵 Backlog | 🔵 Backlog | ⚪ Maybe never |

**Negociar con Product Owner:**
```markdown
"Tenemos 3 issues de deuda técnica crítica que impactan performance:
- #234: N+1 queries en dashboard (ahora toma 5s, debería < 500ms)
- #245: Falta de índices en tabla orders (queries lentas)
- #267: Memory leak en worker de documentos

Propongo dedicar el 20% del próximo sprint a resolverlas.
Esto mejorará la experiencia de usuario y prevendrá incidentes en producción."
```

---

### 2.5 Arquitectura y Decisiones Técnicas

#### Architecture Decision Records (ADRs)

**Cuándo crear un ADR**:
- Cambio de framework o librería principal
- Nuevo patrón arquitectónico
- Decisión que impacta múltiples equipos
- Cambio costoso de revertir

**Template**: `/docs/ADR_TEMPLATE.md`

```markdown
# ADR 003: Migrar de REST a GraphQL para API de Documentos

## Estado
Propuesto | En revisión | **Aceptado** | Rechazado | Obsoleto

## Contexto
La API de documentos tiene 50+ endpoints REST. Los clientes frontend necesitan
hacer 3-5 requests para renderizar una vista. Esto causa:
- Latencia alta (3-5 segundos en 3G)
- Overfetching (traer datos no usados)
- Complejidad en sincronización de estado

## Decisión
Migraremos la API de documentos de REST a GraphQL usando Apollo Server.

## Consecuencias

### Positivas
- ✅ Clientes pueden pedir exactamente los datos necesarios
- ✅ Reducción de requests (5 → 1)
- ✅ Mejor experiencia de desarrollo (typings automáticos)
- ✅ Subscriptions nativas para real-time

### Negativas
- ❌ Curva de aprendizaje para el equipo (~2 semanas)
- ❌ Complejidad en caché del servidor
- ❌ Herramientas de debugging diferentes

### Neutras
- Coexistencia con API REST existente (migración gradual)
- Requiere actualizar documentación

## Alternativas Consideradas

### 1. Mantener REST + BFF (Backend for Frontend)
- Pro: Menos cambios
- Contra: Más código a mantener

### 2. REST + JSON:API estándar
- Pro: Estandarizado
- Contra: No resuelve overfetching

## Referencias
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- Spike técnico: PR #345
- Discusión: Issue #289

## Implementación
- Fase 1 (Sprint 10): Setup Apollo Server
- Fase 2 (Sprint 11): Migrar queries de documentos
- Fase 3 (Sprint 12): Migrar mutations
- Fase 4 (Sprint 13): Deprecar endpoints REST equivalentes
```

#### Revisar y Aprobar ADRs

Como Tech Lead, tu proceso:

1. **Recibir propuesta de ADR** (PR o documento)
2. **Evaluar**:
   - ¿El problema está bien definido?
   - ¿Se consideraron alternativas?
   - ¿Los trade-offs son razonables?
   - ¿Es reversible si falla?
3. **Feedback**:
   - Hacer preguntas difíciles
   - Sugerir alternativas
   - Pedir pruebas de concepto si es riesgoso
4. **Decisión**:
   - Aprobar, rechazar o pedir más información
   - Comunicar decisión al equipo
5. **Seguimiento**:
   - Validar implementación
   - Documentar learnings post-implementación

---

## 3. Procedimientos Específicos

### 3.1 Procedimiento: Evaluar Pull Request Grande (> 500 líneas)

```markdown
## Situación
Un desarrollador abrió un PR de 1,200 líneas que implementa un módulo completo.

## Procedimiento

### Paso 1: Evaluación Inicial
1. Ver estadísticas del PR (archivos cambiados, líneas)
2. Si > 500 líneas, considerar solicitar división

### Paso 2: Análisis de Divisibilidad
¿El PR puede dividirse en partes independientes?
- ✅ SÍ → Solicitar división
- ❌ NO → Continuar con revisión exhaustiva

### Paso 3: Comunicación
Comentar en el PR:

"@desarrollador, este PR es muy grande (1,200 líneas) para revisar efectivamente.
La experiencia muestra que PRs grandes tienen 3x más bugs que pasan desapercibidos.

Propuesta de división:
1. PR 1: Modelos de datos + migraciones (files: schema.prisma, migration.sql)
2. PR 2: Services + repositories (files: service.ts, repository.ts, tests)
3. PR 3: Controllers + routes (files: controller.ts, routes.ts, tests)
4. PR 4: Frontend components (files: components/, hooks/)

Esto permitirá:
- Revisiones más rápidas y profundas
- Merges incrementales (menor riesgo)
- Rollback más fácil si algo falla

¿Te parece bien? Puedo ayudarte con la estrategia de división si lo necesitas."

### Paso 4: Si No Se Puede Dividir
Si realmente es una unidad atómica:

1. Agendar sesión de revisión en vivo (60-90 min)
2. Pedir a otro Senior que co-revise
3. Hacer checklist exhaustivo
4. Solicitar demo en vivo de la funcionalidad
5. Revisar en múltiples sesiones (no todo de una vez)
```

### 3.2 Procedimiento: Desarrollador Bloqueado

```markdown
## Situación
Un desarrollador reporta que está bloqueado > 2 horas en un problema.

## Procedimiento

### Paso 1: Respuesta Inmediata (< 30 min)
Responder en Slack/Teams:
"Vi tu mensaje. ¿Puedes compartir:
1. ¿Qué estás tratando de lograr?
2. ¿Qué has intentado hasta ahora?
3. ¿Cuál es el error exacto que ves?

Mientras tanto, reviso el código en tu branch."

### Paso 2: Diagnóstico Remoto (15-30 min)
```bash
# Revisar branch del desarrollador
git fetch origin
git checkout feature/su-branch
npm install
npm run dev

# Reproducir el problema
# Revisar logs, errores, código
```

### Paso 3: Determinar Causa
- ¿Es un problema de entorno? → Documentar solución
- ¿Es falta de conocimiento? → Pair programming
- ¿Es problema complejo? → Dividir en sub-tareas
- ¿Es bug del framework? → Buscar workaround

### Paso 4: Desbloquear
Opciones en orden de preferencia:

1. **Guiar (mejor para aprendizaje)**:
   "El error es porque X. Te sugiero probar Y. Aquí un ejemplo: [link]"

2. **Pair programming**:
   "Hagamos 30 min de pair programming ahora mismo. ¿Puedes en 10 min?"

3. **Commit de ayuda**:
   "Hice un commit en tu branch con la estructura base. Revisa y completa el resto."

4. **Tomar la tarea** (último recurso):
   "Este problema es más complejo de lo estimado. Yo lo termino y luego te explico.
   Mientras, ¿puedes avanzar con la tarea #123?"

### Paso 5: Documentar
Agregar a docs/TROUBLESHOOTING.md:
```markdown
## Error: "Cannot find module '@prisma/client'"

**Síntoma**: TypeScript no encuentra tipos de Prisma

**Causa**: Prisma client no generado después de cambios en schema

**Solución**:
```bash
npm run prisma:generate
# O específicamente para backend:
npm run prisma:generate -w apps/backend
```

**Prevención**: Agregar este comando a `postinstall` en package.json
```

### 3.3 Procedimiento: Incidente en Producción

```markdown
## Situación
Alerta de Sentry/Monitoring indica errores en producción después de un deploy.

## Procedimiento de Emergencia

### Paso 1: Evaluar Severidad (2 minutos)
**Preguntas críticas**:
- ¿Cuántos usuarios afectados? (< 10 | 10-100 | > 100)
- ¿Funcionalidad crítica? (login, pagos, datos sensibles)
- ¿Hay workaround? (pueden usar otra feature)

**Niveles**:
- 🔴 SEV1: > 100 usuarios, funcionalidad crítica, sin workaround → ROLLBACK INMEDIATO
- 🟠 SEV2: 10-100 usuarios, funcionalidad importante → Fix rápido o rollback
- 🟡 SEV3: < 10 usuarios, funcionalidad secundaria, hay workaround → Fix en próximo deploy

### Paso 2: Comunicar (inmediato)
Mensaje en Slack #incidents:

"🔴 **INCIDENT - SEV1**
- **Qué**: Endpoint /api/orders/create retorna 500
- **Impacto**: Usuarios no pueden crear órdenes
- **Afectados**: ~250 usuarios en últimos 15 min
- **Causa inicial**: Deploy de PR #456 a las 14:30
- **Acción**: Iniciando rollback
- **ETA resolución**: 5 minutos
- **Owner**: @tech-lead

Actualizaré cada 10 min."

### Paso 3: Rollback (si es SEV1) (5 minutos)
```bash
# Conectar al servidor de producción
ssh produccion

# Ver último deploy exitoso
docker service ls
docker service ps monorepo-bca_backend --format "{{.Image}}"

# Rollback al hash anterior
cd /home/deploy/monorepo-bca
git log --oneline -5
# Identificar último commit bueno (ej: abc123)

# Desplegar versión anterior
git checkout abc123
./scripts/deploy-prod.sh

# Monitorear
watch -n 2 'curl -s https://api.monorepo-bca.com/health | jq'
```

### Paso 4: Verificar Resolución (2 minutos)
```bash
# Verificar que errors desaparecieron de Sentry
# Verificar logs limpios
docker service logs monorepo-bca_backend --tail 50

# Prueba manual
curl -X POST https://api.monorepo-bca.com/api/orders/create \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"clientId":"123",...}'
```

### Paso 5: Comunicar Resolución
"✅ **RESOLVED - SEV1**
- **Acción tomada**: Rollback a versión abc123 (pre-PR #456)
- **Estado**: Servicio operando normalmente
- **Verificación**: 0 errores en últimos 10 min, 5 órdenes creadas exitosamente
- **Próximos pasos**:
  - Root cause analysis en 2 horas
  - Fix + tests adicionales mañana
  - Re-deploy con fix en 48h

Gracias por la paciencia. Postmortem completo en 24h."

### Paso 6: Root Cause Analysis (2 horas después)
Documento: `/docs/postmortems/2025-01-15-orders-endpoint-500.md`

```markdown
# Postmortem: Orders Endpoint 500 Error

## Incidente
- **Fecha**: 2025-01-15 14:35 - 14:42 (7 minutos)
- **Severidad**: SEV1
- **Impacto**: 250 usuarios no pudieron crear órdenes

## Timeline
14:30 - Deploy de PR #456 a producción
14:35 - Primera alerta de Sentry (error rate > 10%)
14:36 - Equipo notificado
14:37 - Decisión de rollback
14:38 - Rollback iniciado
14:42 - Rollback completo, servicio restaurado

## Root Cause
El PR #456 agregó validación de campo `clientId` pero no consideró que clientes
legacy tienen `clientId: null` en la base de datos.

```typescript
// Código problemático
const CreateOrderSchema = z.object({
  clientId: z.string().uuid()  // ❌ No permite null
});

// Fix
const CreateOrderSchema = z.object({
  clientId: z.string().uuid().nullable()  // ✅ Permite null
});
```

## ¿Por qué pasó desapercibido?
1. ❌ Los tests solo usaban clientes nuevos (con `clientId` válido)
2. ❌ No hay ambiente de staging con datos de producción sanitizados
3. ❌ El code review no identificó el cambio de schema

## Acciones Correctivas
1. ✅ Agregar tests con clientes legacy (null clientId)
2. ✅ Crear script de migración para llenar `clientId` null con valor default
3. ✅ Implementar staging con snapshot de producción (datos anonimizados)
4. ✅ Agregar a checklist de PR: "¿Este cambio es backwards compatible?"
5. ✅ Implementar feature flags para cambios riesgosos

## Learnings
- Siempre testear con datos "reales" (incluir legacy, edge cases)
- Cambios en validación son riesgosos si no son backwards compatible
- El rollback rápido (7 min) minimizó el impacto

## Propietario
@tech-lead

## Follow-ups
- [ ] Implementar staging (Issue #567) - ETA: Sprint 12
- [ ] Feature flags (Issue #568) - ETA: Sprint 11
- [ ] Test data generator con casos legacy (Issue #569) - ETA: Sprint 11
```

### Paso 7: Prevención Futura
- Compartir postmortem en reunión de equipo
- Actualizar checklist de code review
- Agregar este tipo de test al template de PR
```

---

## 4. Herramientas y Recursos

### 4.1 Herramientas Esenciales

```bash
# Análisis de código
npm run lint              # ESLint
npm run type-check        # TypeScript
npm run test:coverage     # Cobertura de tests

# Análisis de bundle size (frontend)
npm run build -- --stats
npx webpack-bundle-analyzer dist/stats.json

# Análisis de seguridad
npm audit
npx snyk test

# Performance profiling
node --prof apps/backend/src/index.ts
node --prof-process isolate-*.log > processed.txt
```

### 4.2 Checklist de Code Review (Imprimir)

```markdown
## Code Review Checklist - Tech Lead

### Arquitectura
- [ ] ¿El cambio está en el lugar correcto (controller/service/repo)?
- [ ] ¿Respeta la separación de responsabilidades?
- [ ] ¿Sigue los patrones establecidos del proyecto?
- [ ] ¿Es escalable (performance con 10x usuarios)?

### Código
- [ ] ¿Tipos explícitos? (sin `any`)
- [ ] ¿Validación de entradas? (Zod, joi)
- [ ] ¿Manejo de errores apropiado?
- [ ] ¿Logging adecuado? (sin PII)
- [ ] ¿Sin secrets hardcodeados?
- [ ] ¿Código legible? (nombres descriptivos, funciones pequeñas)

### Seguridad
- [ ] ¿Autenticación/autorización correcta?
- [ ] ¿Rate limiting en endpoints sensibles?
- [ ] ¿No expone datos sensibles en responses?
- [ ] ¿Usa Prisma (no raw SQL)?
- [ ] ¿CORS configurado correctamente?

### Performance
- [ ] ¿Sin N+1 queries?
- [ ] ¿Usa índices de BD cuando corresponde?
- [ ] ¿Paginación en listas grandes?
- [ ] ¿Caché donde tiene sentido?

### Tests
- [ ] ¿Cobertura ≥ 80%?
- [ ] ¿Tests de casos felices y errores?
- [ ] ¿Tests de edge cases (null, empty, invalid)?
- [ ] ¿Mocks apropiados?
- [ ] ¿Tests determinísticos (no flaky)?

### Frontend (si aplica)
- [ ] ¿Usa hooks correctamente (useEffect con deps)?
- [ ] ¿Keys en listas (.map())?
- [ ] ¿Loading y error states?
- [ ] ¿Accesibilidad (alt, aria-labels)?
- [ ] ¿Responsive design?

### Documentación
- [ ] ¿README actualizado si hay cambios de setup?
- [ ] ¿ADR si es decisión arquitectónica significativa?
- [ ] ¿Comentarios en código complejo (el POR QUÉ)?
- [ ] ¿API docs actualizadas (OpenAPI, Postman)?

### CI/CD
- [ ] ¿Pasan todos los checks de CI?
- [ ] ¿Migraciones de BD incluidas y testeadas?
- [ ] ¿Variables de entorno documentadas en .env.example?
- [ ] ¿Backwards compatible o tiene plan de migración?
```

---

## 5. Métricas de Éxito

Como Tech Lead, mide tu impacto en:

### Calidad de Código
- **Bugs en producción**: < 2 por sprint
- **Hotfixes**: < 1 por mes
- **Cobertura de tests**: ≥ 80% mantenida
- **Deuda técnica**: Reducción de 10% trimestral

### Eficiencia del Equipo
- **Tiempo de review**: < 24h promedio
- **Rondas de revisión**: 1-2 promedio
- **Tiempo de desarrollo**: Estimaciones ±20% accuracy
- **Velocity**: Incremental (5-10% por sprint)

### Crecimiento del Equipo
- **Desarrolladores promovidos**: 1-2 por año
- **Conocimiento compartido**: 1 tech talk por mes
- **Autonomía**: Reducción de bloqueos (trackear en Jira)
- **Satisfacción**: Encuestas trimestrales > 4/5

### Entrega
- **Deploy exitoso**: > 95%
- **Rollbacks**: < 5% de deploys
- **Incidentes SEV1**: < 1 por trimestre
- **Time to resolution**: < 1 hora promedio

---

## 6. Anti-Patrones a Evitar

### ❌ El Revisor Perfeccionista
```markdown
"Esta variable debería llamarse `userData` en lugar de `userInfo`.
Y este comentario debería tener punto al final.
Y esta función debería estar 3 líneas más arriba."
```
**Problema**: Desgasta al equipo, enfoca en lo irrelevante
**Solución**: Prioriza seguridad/performance/bugs. Lo cosmético es sugerencia, no bloqueante.

### ❌ El Cuello de Botella
**Síntoma**: Todos esperan tu revisión, PRs se acumulan
**Problema**: Centralizas el conocimiento, equipo no puede avanzar
**Solución**: Delega reviews, entrena a semi-seniors, establece "auto-merge" para cambios triviales

### ❌ El Arquitecto de Marfil
**Síntoma**: Defines arquitectura sin implementar
**Problema**: Desconexión con realidad, arquitectura no práctica
**Solución**: Programa al menos 20% del tiempo, haz POCs de tus propuestas

### ❌ El Apaga Fuegos
**Síntoma**: Todo tu tiempo en emergencias
**Problema**: No hay tiempo para prevención, mejora continua
**Solución**: Dedica 30% tiempo a prevención (tests, docs, deuda técnica)

---

**Recuerda**: Tu rol no es escribir todo el código, es multiplicar la efectividad del equipo. Un Tech Lead exitoso hace que el equipo sea 10x más productivo, no que él solo sea 10x más productivo.

