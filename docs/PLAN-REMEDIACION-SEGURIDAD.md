# Plan de Remediación de Seguridad

> **Proyecto:** BCA Group - bca-group.microsyst.com.ar  
> **Servidor:** 10.8.10.20 (Producción)  
> **Fecha:** 17 de diciembre de 2025  
> **Responsable:** Equipo de Desarrollo

---

## Resumen del Plan

| Métrica | Valor |
|---------|-------|
| **Vulnerabilidades a remediar** | 8 |
| **Esfuerzo total estimado** | 6.5 horas |
| **Ventana de mantenimiento requerida** | 15 minutos |
| **Riesgo de downtime** | Bajo |

---

## Cronograma Propuesto

```
Semana 1 (Urgente)
├── Día 1: Remediaciones críticas (2h)
│   ├── [1] Bloquear source maps
│   ├── [2] Deshabilitar TLS 1.0/1.1
│   └── [3] Agregar headers de seguridad
│
└── Día 2-3: Rate limiting (3h)
    └── [4] Implementar rate limiting en login

Semana 2 (Importante)
├── [5] Content Security Policy (1h)
└── [6] Monitoreo y alertas (30min)
```

---

## Fase 1: Remediaciones Críticas (Día 1)

### Preparación Previa

```bash
# 1. Backup de configuración actual
ssh administrador@10.8.10.20
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d)
sudo cp -r /etc/nginx/conf.d /etc/nginx/conf.d.backup.$(date +%Y%m%d)

# 2. Verificar estado actual
nginx -t
docker ps
```

---

### Tarea 1: Bloquear Source Maps

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🔴 Crítica |
| **Esfuerzo** | 10 minutos |
| **Downtime** | 0 (reload sin corte) |
| **Riesgo** | Muy bajo |

#### Implementación

```bash
# Conectar al servidor
ssh administrador@10.8.10.20

# Editar configuración de Nginx
sudo nano /etc/nginx/conf.d/bca-group.conf
```

Agregar dentro del bloque `server`:

```nginx
# Bloquear acceso a source maps
location ~* \.map$ {
    deny all;
    return 404;
}
```

```bash
# Verificar sintaxis y aplicar
sudo nginx -t
sudo nginx -s reload
```

#### Verificación

```bash
# Debe retornar 404
curl -sI https://bca-group.microsyst.com.ar/assets/index-DXlH7alG.js.map | head -1
# Esperado: HTTP/1.1 404 Not Found
```

---

### Tarea 2: Deshabilitar TLS 1.0 y 1.1

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🟠 Alta |
| **Esfuerzo** | 15 minutos |
| **Downtime** | 0 (reload sin corte) |
| **Riesgo** | Bajo* |

*Nota: Clientes con browsers muy antiguos podrían no poder conectarse.

#### Implementación

```bash
# Editar configuración SSL
sudo nano /etc/nginx/conf.d/bca-group.conf
```

Modificar la línea `ssl_protocols`:

```nginx
# ANTES (inseguro)
ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;

# DESPUÉS (seguro)
ssl_protocols TLSv1.2 TLSv1.3;

# Agregar también ciphers seguros
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
ssl_prefer_server_ciphers off;
```

```bash
# Verificar y aplicar
sudo nginx -t
sudo nginx -s reload
```

#### Verificación

```bash
# TLS 1.0 debe fallar
openssl s_client -connect bca-group.microsyst.com.ar:443 -tls1 2>&1 | grep -i "handshake"
# Esperado: "handshake failure" o error

# TLS 1.2 debe funcionar
openssl s_client -connect bca-group.microsyst.com.ar:443 -tls1_2 2>&1 | grep -i "protocol"
# Esperado: Protocol  : TLSv1.2
```

---

### Tarea 3: Agregar Headers de Seguridad

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🟡 Media |
| **Esfuerzo** | 20 minutos |
| **Downtime** | 0 |
| **Riesgo** | Muy bajo |

#### Implementación

```bash
sudo nano /etc/nginx/conf.d/bca-group.conf
```

Agregar dentro del bloque `server`:

```nginx
# === HEADERS DE SEGURIDAD ===

# HSTS - Forzar HTTPS por 1 año
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Prevenir clickjacking (ya existe, verificar)
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevenir MIME sniffing (ya existe, verificar)
add_header X-Content-Type-Options "nosniff" always;

# Política de referrer
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Deshabilitar APIs del browser no usadas
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;

# Ocultar versión de servidor
server_tokens off;
```

```bash
sudo nginx -t
sudo nginx -s reload
```

#### Verificación

```bash
curl -sI https://bca-group.microsyst.com.ar | grep -iE "strict-transport|referrer-policy|permissions-policy|server:"
# Esperado: Headers presentes, Server sin versión
```

---

## Fase 2: Rate Limiting (Día 2-3)

### Tarea 4: Implementar Rate Limiting en Login

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🟠 Alta |
| **Esfuerzo** | 2.5 horas |
| **Downtime** | ~2 minutos (redeploy backend) |
| **Riesgo** | Medio (requiere testing) |

#### 4.1 Instalar dependencia

```bash
# En máquina de desarrollo
cd /home/administrador/monorepo-bca
npm install express-rate-limit --workspace=apps/backend
```

#### 4.2 Crear middleware de rate limiting

Crear archivo `apps/backend/src/middleware/rateLimiter.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// Rate limiter para login - 5 intentos por 15 minutos por IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Incluir headers RateLimit-*
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar IP real detrás de proxy
    return req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
  },
  skip: (req) => {
    // No aplicar a healthchecks
    return req.path === '/health';
  }
});

// Rate limiter general para API - 100 requests por minuto
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### 4.3 Aplicar en rutas de autenticación

Modificar `apps/backend/src/routes/auth.routes.ts`:

```typescript
import { loginRateLimiter } from '../middleware/rateLimiter';

// Aplicar rate limiter al login
router.post('/login', loginRateLimiter, authController.login);
router.post('/forgot-password', loginRateLimiter, authController.forgotPassword);
```

#### 4.4 Configurar trust proxy

En `apps/backend/src/server.ts` o archivo principal:

```typescript
// Confiar en proxy para obtener IP real
app.set('trust proxy', 1);
```

#### 4.5 Desplegar

```bash
# En servidor de producción
ssh administrador@10.8.10.20
cd /home/administrador/monorepo-bca

# Sincronizar código (si no hay git pull)
# rsync desde desarrollo

# Rebuild y deploy
cd deploy/stack-ip-10.8.10.20
docker compose build backend
docker compose up -d backend

# Verificar logs
docker logs -f bca_backend --tail 50
```

#### Verificación

```bash
# Ejecutar 6 intentos de login fallido rápidamente
for i in {1..6}; do
  echo "Intento $i:"
  curl -s -X POST https://bca-group.microsyst.com.ar/api/platform/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' | jq -r '.message'
done
# Esperado: Intentos 1-5 = "Credenciales inválidas", Intento 6 = "Demasiados intentos..."
```

---

## Fase 3: Mejoras Adicionales (Semana 2)

### Tarea 5: Content Security Policy

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🟡 Media |
| **Esfuerzo** | 1 hora |
| **Downtime** | 0 |
| **Riesgo** | Medio (puede romper funcionalidad si está mal configurado) |

#### Implementación (modo report-only primero)

```nginx
# Primero en modo report para detectar problemas
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://bca-group.microsyst.com.ar wss://bca-group.microsyst.com.ar; frame-ancestors 'self';" always;
```

Después de verificar que no hay errores en consola del navegador (1 semana), cambiar a enforced:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://bca-group.microsyst.com.ar wss://bca-group.microsyst.com.ar; frame-ancestors 'self';" always;
```

---

### Tarea 6: Monitoreo de Intentos Fallidos

| Campo | Valor |
|-------|-------|
| **Prioridad** | 🔵 Baja |
| **Esfuerzo** | 30 minutos |
| **Downtime** | 0 |

#### Implementación

Agregar logging estructurado de intentos fallidos en el backend:

```typescript
// En authController.login
if (!isValidCredentials) {
  logger.warn('Login fallido', {
    email: req.body.email,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
}
```

Configurar alerta si hay más de 20 intentos fallidos en 5 minutos desde la misma IP.

---

## Resumen de Esfuerzo

| Tarea | Esfuerzo | Complejidad | Downtime |
|-------|----------|-------------|----------|
| 1. Bloquear source maps | 10 min | Baja | 0 |
| 2. Deshabilitar TLS antiguo | 15 min | Baja | 0 |
| 3. Headers de seguridad | 20 min | Baja | 0 |
| 4. Rate limiting | 2.5 h | Media | ~2 min |
| 5. CSP | 1 h | Media | 0 |
| 6. Monitoreo | 30 min | Baja | 0 |
| **TOTAL** | **~5 horas** | - | **~2 min** |

---

## Checklist de Implementación

### Pre-implementación
- [ ] Notificar a stakeholders sobre ventana de mantenimiento
- [ ] Backup de configuración de Nginx
- [ ] Tener acceso SSH verificado
- [ ] Preparar rollback plan

### Día 1 - Configuración Nginx
- [ ] Bloquear source maps
- [ ] Verificar source maps bloqueados
- [ ] Deshabilitar TLS 1.0/1.1
- [ ] Verificar TLS
- [ ] Agregar headers de seguridad
- [ ] Verificar headers

### Día 2-3 - Rate Limiting
- [ ] Implementar código en desarrollo
- [ ] Probar en desarrollo (10.3.0.243)
- [ ] Desplegar en producción
- [ ] Verificar rate limiting funciona

### Semana 2
- [ ] Implementar CSP en modo report-only
- [ ] Monitorear errores por 1 semana
- [ ] Activar CSP enforced
- [ ] Configurar alertas de login fallido

### Post-implementación
- [ ] Ejecutar verificaciones de seguridad
- [ ] Documentar cambios realizados
- [ ] Actualizar DEPLOYMENT-10.8.10.20.md

---

## Rollback Plan

En caso de problemas después de aplicar cambios:

```bash
# Restaurar configuración de Nginx
ssh administrador@10.8.10.20
sudo cp /etc/nginx/nginx.conf.backup.YYYYMMDD /etc/nginx/nginx.conf
sudo cp -r /etc/nginx/conf.d.backup.YYYYMMDD/* /etc/nginx/conf.d/
sudo nginx -t
sudo nginx -s reload

# Restaurar backend (si rate limiting causa problemas)
cd /home/administrador/monorepo-bca/deploy/stack-ip-10.8.10.20
git checkout HEAD~1 -- apps/backend/
docker compose build backend
docker compose up -d backend
```

---

## Contactos de Emergencia

| Rol | Contacto |
|-----|----------|
| DevOps | [Completar] |
| Backend Lead | [Completar] |
| Infraestructura | [Completar] |

---

*Plan generado el 17/12/2025 - Monorepo BCA*

