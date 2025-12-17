# 🔐 Auditoría de Seguridad - bca-group.microsyst.com.ar

> **Fecha:** 17 de diciembre de 2025  
> **Objetivo:** bca-group.microsyst.com.ar (10.8.10.20)  
> **Tipo:** Análisis de seguridad no intrusivo (reconocimiento y pruebas pasivas)

---

## 📊 Resumen Ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| 🔴 **CRÍTICA** | 1 |
| 🟠 **ALTA** | 2 |
| 🟡 **MEDIA** | 3 |
| 🔵 **BAJA** | 2 |
| ✅ **Bien configurado** | 5 |

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. Source Maps Expuestos Públicamente

**Severidad:** 🔴 CRÍTICA  
**CVSS Score estimado:** 7.5  
**Ubicación:** `/assets/*.js.map`

#### Descripción
Los archivos source map del frontend están accesibles públicamente sin autenticación:

```
https://bca-group.microsyst.com.ar/assets/index-DXlH7alG.js.map
Content-Length: 3,007,133 bytes (3 MB de código fuente)
```

#### Impacto
- **Exposición completa del código fuente** del frontend
- Revela lógica de negocio, estructura de la aplicación
- Facilita la búsqueda de vulnerabilidades por atacantes
- Puede exponer URLs internas, comentarios con información sensible
- Facilita ingeniería reversa de la aplicación

#### Remediación
```nginx
# En nginx.conf - Bloquear acceso a source maps
location ~* \.map$ {
    deny all;
    return 404;
}
```

O mejor aún, **no generar source maps en producción**:
```javascript
// vite.config.js
export default {
  build: {
    sourcemap: false  // Deshabilitar en producción
  }
}
```

---

## 🟠 VULNERABILIDADES ALTAS

### 2. TLS 1.0 y TLS 1.1 Habilitados

**Severidad:** 🟠 ALTA  
**CVSS Score estimado:** 5.9  
**Ubicación:** Configuración SSL del servidor

#### Descripción
El servidor acepta conexiones con protocolos TLS obsoletos e inseguros:

| Protocolo | Estado | Seguridad |
|-----------|--------|-----------|
| SSLv3 | ❌ Deshabilitado | ✅ |
| TLS 1.0 | ⚠️ **HABILITADO** | 🔴 Vulnerable (BEAST, POODLE) |
| TLS 1.1 | ⚠️ **HABILITADO** | 🔴 Obsoleto |
| TLS 1.2 | ✅ Habilitado | ✅ |
| TLS 1.3 | ✅ Habilitado | ✅ |

#### Impacto
- Vulnerable a ataques BEAST, POODLE, CRIME
- No cumple con PCI-DSS (requiere TLS 1.2+)
- Browsers modernos deshabilitarán TLS 1.0/1.1 próximamente

#### Remediación
```nginx
# En nginx.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
```

---

### 3. Sin Rate Limiting en Endpoint de Autenticación

**Severidad:** 🟠 ALTA  
**CVSS Score estimado:** 6.5  
**Ubicación:** `/api/platform/auth/login`

#### Descripción
Se realizaron 10 intentos de login fallidos consecutivos sin ningún bloqueo, delay o CAPTCHA:

```
Intento 1: HTTP 401
Intento 2: HTTP 401
...
Intento 10: HTTP 401  (sin bloqueo)
```

#### Impacto
- Vulnerable a **ataques de fuerza bruta**
- Permite **credential stuffing** masivo
- Un atacante puede probar miles de contraseñas sin restricción

#### Remediación
```javascript
// Implementar con express-rate-limit
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana
  message: { error: 'Demasiados intentos. Intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/platform/auth/login', loginLimiter, loginController);
```

También considerar:
- Bloqueo progresivo (1min, 5min, 15min, 1h)
- CAPTCHA después de 3 intentos fallidos
- Notificación por email de intentos sospechosos

---

## 🟡 VULNERABILIDADES MEDIAS

### 4. Falta Header Strict-Transport-Security (HSTS)

**Severidad:** 🟡 MEDIA  
**CVSS Score estimado:** 4.3  

#### Descripción
El header HSTS no está configurado, lo que permite ataques de downgrade SSL.

#### Headers presentes vs faltantes:

| Header | Estado |
|--------|--------|
| `X-Frame-Options` | ✅ SAMEORIGIN |
| `X-Content-Type-Options` | ✅ nosniff |
| `X-XSS-Protection` | ✅ 1; mode=block |
| `Strict-Transport-Security` | ❌ **FALTANTE** |
| `Content-Security-Policy` | ❌ **FALTANTE** |
| `Referrer-Policy` | ❌ **FALTANTE** |
| `Permissions-Policy` | ❌ **FALTANTE** |

#### Remediación
```nginx
# Agregar en nginx.conf
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

---

### 5. Exposición de Versión del Servidor

**Severidad:** 🟡 MEDIA  
**CVSS Score estimado:** 3.7  

#### Descripción
El servidor expone información de versión:
- `Server: openresty`
- Error pages exponen: `nginx/1.29.4`

#### Impacto
Facilita a atacantes buscar vulnerabilidades específicas de esa versión.

#### Remediación
```nginx
# En nginx.conf
server_tokens off;
```

---

### 6. CORS Muy Permisivo

**Severidad:** 🟡 MEDIA  
**CVSS Score estimado:** 4.3  

#### Descripción
La configuración CORS permite:
```
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS,PATCH
Access-Control-Allow-Credentials: true
```

Aunque no se observó `Access-Control-Allow-Origin: *`, la configuración permite credenciales con un rango amplio de métodos.

#### Remediación
```javascript
// Configurar CORS restrictivo
app.use(cors({
  origin: ['https://bca-group.microsyst.com.ar'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 🔵 VULNERABILIDADES BAJAS

### 7. Sin robots.txt

**Severidad:** 🔵 BAJA  

#### Descripción
No existe archivo `robots.txt`, lo que permite a buscadores indexar toda la aplicación.

#### Remediación
Crear `/robots.txt`:
```
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
```

---

### 8. Certificado SSL de Corta Duración

**Severidad:** 🔵 BAJA (informativo)  

#### Descripción
```
notBefore: Oct 27 15:02:00 2025 GMT
notAfter: Jan 25 15:01:59 2026 GMT
issuer: Let's Encrypt E7
```

El certificado vence el **25 de enero de 2026** (39 días). Asegurar renovación automática.

#### Remediación
Verificar que certbot esté configurado para renovación automática:
```bash
sudo certbot renew --dry-run
```

---

## ✅ ASPECTOS BIEN CONFIGURADOS

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Redirección HTTP → HTTPS | ✅ | 301 Redirect |
| Puertos internos filtrados | ✅ | Solo 22, 80, 443 expuestos |
| Respuestas de login genéricas | ✅ | "Credenciales inválidas" (no permite enumeración) |
| X-Frame-Options | ✅ | SAMEORIGIN |
| X-Content-Type-Options | ✅ | nosniff |

---

## 📋 Plan de Acción Priorizado

### Inmediato (Esta semana) 🔴

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Bloquear source maps (.map) | 5 min | Alto |
| 2 | Implementar rate limiting en login | 30 min | Alto |
| 3 | Deshabilitar TLS 1.0 y 1.1 | 10 min | Alto |

### Corto plazo (2 semanas) 🟠

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 4 | Agregar header HSTS | 5 min | Medio |
| 5 | Agregar Content-Security-Policy | 2h | Medio |
| 6 | Ocultar versión de Nginx | 5 min | Bajo |

### Medio plazo (1 mes) 🟡

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 7 | Crear robots.txt | 10 min | Bajo |
| 8 | Revisar configuración CORS | 1h | Medio |
| 9 | Configurar monitoreo de intentos de login fallidos | 4h | Medio |

---

## 🛠️ Comandos de Verificación Post-Remediación

```bash
# Verificar TLS
openssl s_client -connect bca-group.microsyst.com.ar:443 -tls1 2>&1 | grep -i "protocol"

# Verificar headers de seguridad
curl -sI https://bca-group.microsyst.com.ar | grep -iE "strict|content-security|x-frame"

# Verificar source maps bloqueados
curl -sI https://bca-group.microsyst.com.ar/assets/index-DXlH7alG.js.map | head -1

# Verificar rate limiting
for i in {1..10}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://bca-group.microsyst.com.ar/api/platform/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'; done
```

---

## 📌 Notas Adicionales

1. **Este análisis fue no intrusivo** - No se intentaron exploits ni ataques activos
2. **Scope limitado** - Solo se analizó el frontend público, no la infraestructura interna
3. **Recomendación:** Realizar un pentest completo con herramientas especializadas (OWASP ZAP, Burp Suite) para una evaluación más profunda
4. **Cumplimiento:** Si manejan datos financieros/personales, considerar auditoría PCI-DSS o ISO 27001

---

*Documento generado - Monorepo BCA Security Audit*

