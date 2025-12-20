# SonarQube - Guía de Uso para monorepo-bca

## 📋 Información General

SonarQube es una plataforma de análisis de código que detecta bugs, vulnerabilidades, code smells y mide la complejidad cognitiva del código.

### Servidor

| Campo | Valor |
|-------|-------|
| **URL** | http://10.3.0.244:9900 |
| **Puerto** | 9900 |
| **Servidor Host** | VM 10.3.0.244 |
| **Deployment** | Docker Compose |
| **Ubicación Docker Compose** | `/home/administrador/sonarqube/docker-compose.yml` |

### Credenciales

| Campo | Valor |
|-------|-------|
| **Usuario Admin** | `admin` |
| **Password Admin** | `alberdi11` |
| **Token de Análisis** | `squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856` |
| **Project Key** | `monorepo-bca` |

---

## 🚀 Cómo Ejecutar un Análisis

### Método Recomendado: Docker Scanner

Desde el directorio raíz del proyecto (`/home/administrador/monorepo-bca`):

```bash
docker run --rm \
  -e SONAR_HOST_URL="http://10.3.0.244:9900" \
  -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.projectKey=monorepo-bca \
  -Dsonar.sources=. \
  -Dsonar.exclusions="**/node_modules/**,**/*.test.ts,**/*.spec.ts,**/*.d.ts,**/dist/**,**/build/**,**/coverage/**,**/prisma/**,**/__tests__/**" \
  -Dsonar.scm.disabled=true
```

### Método Alternativo: NPX (requiere permisos locales)

```bash
npx sonar-scanner \
  -Dsonar.projectKey=monorepo-bca \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://10.3.0.244:9900 \
  -Dsonar.token=squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856
```

### Script Rápido

Crear alias en `~/.bashrc`:

```bash
alias sonar-analyze='cd /home/administrador/monorepo-bca && docker run --rm -e SONAR_HOST_URL="http://10.3.0.244:9900" -e SONAR_TOKEN="squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856" -v "$(pwd):/usr/src" sonarsource/sonar-scanner-cli -Dsonar.projectKey=monorepo-bca -Dsonar.sources=. -Dsonar.exclusions="**/node_modules/**,**/*.test.ts,**/*.spec.ts,**/*.d.ts,**/dist/**,**/build/**,**/coverage/**,**/prisma/**,**/__tests__/**" -Dsonar.scm.disabled=true'
```

---

## 🎯 Umbrales y Objetivos

### Métricas Objetivo (Quality Gate)

| Métrica | Umbral Mínimo | Umbral Óptimo | Descripción |
|---------|---------------|---------------|-------------|
| **Bugs** | 0 | 0 | Errores que pueden causar comportamiento inesperado |
| **Vulnerabilities** | 0 | 0 | Problemas de seguridad |
| **Security Rating** | A | A | Calificación de seguridad |
| **Reliability Rating** | B o mejor | A | Calificación de confiabilidad |
| **Maintainability Rating** | B o mejor | A | Calificación de mantenibilidad |
| **Duplicación** | <5% | <3% | Porcentaje de código duplicado |
| **Complejidad Cognitiva Máx** | <80 | <50 | Por función individual |

### Complejidad Cognitiva por Función

| Rango | Clasificación | Acción Requerida |
|-------|---------------|------------------|
| <15 | ✅ Excelente | Ninguna |
| 15-25 | ✅ Bueno | Ninguna |
| 25-50 | ⚠️ Aceptable | Monitorear |
| 50-80 | 🔶 Alto | Refactorizar cuando sea posible |
| >80 | 🔴 Crítico | **Refactorizar obligatorio** |

---

## 📊 Consultar Resultados via API

### Ver Métricas Generales

```bash
curl -s -u squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856: \
  "http://10.3.0.244:9900/api/measures/component?component=monorepo-bca&metricKeys=bugs,vulnerabilities,code_smells,cognitive_complexity,duplicated_lines_density,reliability_rating,security_rating,sqale_rating" \
  | jq '.component.measures[] | {metric: .metric, value: .value}'
```

### Ver Bugs Abiertos

```bash
curl -s -u squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856: \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&types=BUG&statuses=OPEN,REOPENED" \
  | jq '.total, (.issues[] | {file: (.component | split(":")[1]), line: .line, message: .message})'
```

### Ver Top 10 Funciones con Mayor Complejidad

```bash
curl -s -u squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856: \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&rules=typescript:S3776&ps=100" \
  | jq '[.issues[] | select(.line != null)] | sort_by(-(.message | capture("from (?<c>[0-9]+)").c | tonumber)) | .[0:10] | .[] | {file: (.component | split(":")[1] | split("/") | .[-1]), line: .line, complexity: (.message | capture("from (?<c>[0-9]+)").c)}'
```

### Ver Resumen de Issues por Tipo

```bash
curl -s -u squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856: \
  "http://10.3.0.244:9900/api/issues/search?projectKeys=monorepo-bca&ps=1&facets=types,severities" \
  | jq '.facets'
```

---

## 🔧 Administración del Servidor SonarQube

### Ubicación de Archivos

```
/home/administrador/sonarqube/
├── docker-compose.yml    # Configuración Docker
└── data/                 # Volúmenes persistentes (automático)
```

### docker-compose.yml

```yaml
version: "3"

services:
  sonarqube:
    image: sonarqube:lts-community
    ports:
      - "9900:9000"
    environment:
      - SONARQUBE_JDBC_URL=jdbc:postgresql://sonarqube-db:5432/sonarqube
      - SONARQUBE_JDBC_USERNAME=sonar
      - SONARQUBE_JDBC_PASSWORD=sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    depends_on:
      - sonarqube-db

  sonarqube-db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=sonar
      - POSTGRES_PASSWORD=sonar
      - POSTGRES_DB=sonarqube
    volumes:
      - sonarqube_postgres:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:
  sonarqube_postgres:
```

### Comandos de Administración

```bash
# Iniciar SonarQube
cd /home/administrador/sonarqube && docker compose up -d

# Detener SonarQube
cd /home/administrador/sonarqube && docker compose down

# Ver logs
cd /home/administrador/sonarqube && docker compose logs -f sonarqube

# Reiniciar
cd /home/administrador/sonarqube && docker compose restart

# Ver estado
cd /home/administrador/sonarqube && docker compose ps
```

### Prerequisitos del Sistema

Antes de iniciar SonarQube, ejecutar:

```bash
sudo sysctl -w vm.max_map_count=524288
sudo sysctl -w fs.file-max=131072
```

Para hacerlo permanente, agregar a `/etc/sysctl.conf`:

```
vm.max_map_count=524288
fs.file-max=131072
```

---

## 📈 Interpretación de Ratings

### Security Rating

| Rating | Significado |
|--------|-------------|
| A | 0 vulnerabilities |
| B | Al menos 1 Minor |
| C | Al menos 1 Major |
| D | Al menos 1 Critical |
| E | Al menos 1 Blocker |

### Reliability Rating

| Rating | Significado |
|--------|-------------|
| A | 0 bugs |
| B | Al menos 1 Minor bug |
| C | Al menos 1 Major bug |
| D | Al menos 1 Critical bug |
| E | Al menos 1 Blocker bug |

### Maintainability Rating (Sqale)

| Rating | Significado |
|--------|-------------|
| A | Deuda técnica ≤5% del tiempo de desarrollo |
| B | Deuda técnica 6-10% |
| C | Deuda técnica 11-20% |
| D | Deuda técnica 21-50% |
| E | Deuda técnica >50% |

---

## 🔄 Integración con MCP (Cursor)

El servidor MCP de SonarQube está configurado en `~/.cursor/mcp.json`:

```json
{
  "sonarqube": {
    "command": "npx",
    "args": ["-y", "oe-sonar-mcp"],
    "env": {
      "SONARQUBE_URL": "http://10.3.0.244:9900",
      "SONARQUBE_TOKEN": "squ_b9ee98bef51f226f80cb1c8961a9cf8d33d56856"
    }
  }
}
```

### Uso en Cursor

Puedes consultar issues directamente desde Cursor usando el MCP:

```
@sonarqube buscar bugs en monorepo-bca
@sonarqube mostrar code smells críticos
```

---

## 📋 Checklist Pre-Deploy

Antes de hacer deploy a producción, verificar:

- [ ] **Bugs = 0**
- [ ] **Vulnerabilities = 0**
- [ ] **Security Rating = A**
- [ ] **Reliability Rating ≥ B** (idealmente A)
- [ ] **Ninguna función con complejidad >80**
- [ ] **Duplicación <5%**

---

## 🗓️ Estado Actual (Diciembre 2024)

| Métrica | Valor |
|---------|-------|
| Bugs | 0 |
| Vulnerabilities | 0 |
| Code Smells | 271 |
| Cognitive Complexity Total | 5264 |
| Max Complexity por Función | 49 |
| Duplicación | 2.4% |
| Reliability Rating | A |
| Security Rating | A |
| Maintainability Rating | A |
| Líneas de Código | 34,461 |

---

## 🆘 Troubleshooting

### SonarQube no inicia

1. Verificar kernel params:
   ```bash
   sysctl vm.max_map_count
   # Debe ser >= 524288
   ```

2. Verificar puerto disponible:
   ```bash
   sudo lsof -i :9900
   ```

3. Ver logs:
   ```bash
   cd /home/administrador/sonarqube && docker compose logs sonarqube
   ```

### Análisis falla con timeout

Aumentar timeout en el scanner:
```bash
-Dsonar.ws.timeout=300
```

### Token expirado

1. Ir a http://10.3.0.244:9900
2. Login como admin
3. My Account → Security → Generate Tokens
4. Actualizar token en este documento y en `~/.cursor/mcp.json`

---

## 📚 Referencias

- [Documentación SonarQube](https://docs.sonarqube.org/latest/)
- [Reglas TypeScript](https://rules.sonarsource.com/typescript/)
- [Métricas SonarQube](https://docs.sonarqube.org/latest/user-guide/metric-definitions/)

