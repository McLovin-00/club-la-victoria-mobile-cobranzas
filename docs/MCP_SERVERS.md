# Servidores MCP Instalados

## Resumen
Este documento describe los servidores MCP (Model Context Protocol) configurados en el proyecto y cómo utilizarlos desde Cursor.

## Servidores Activos

### 1. **PostgreSQL Server** (`postgres-monorepo`)
**Estado**: ✅ Configurado
**Propósito**: Acceso directo a la base de datos del monorepo

**Capacidades**:
- Consultas SQL de lectura (SELECT)
- Análisis de esquema de base de datos
- Inspección de tablas y relaciones

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://evo:phoenix@10.8.10.20:5432/monorepo-bca"]
}
```

**Uso desde Cursor**:
- Hacer preguntas sobre datos en la base de datos
- Analizar estructura de tablas
- Validar queries antes de implementarlas

---

### 2. **SSH Server** (`ssh`)
**Estado**: ✅ Configurado
**Propósito**: Ejecución de comandos en servidores remotos

**Capacidades**:
- Ejecutar comandos SSH en servidores remotos
- Leer archivos remotos por líneas
- Editar bloques de texto en archivos remotos
- Búsqueda de código en servidores remotos
- Escritura de archivos remotos

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "@idletoaster/ssh-mcp-server@latest"],
  "env": {
    "SSH_PRIVATE_KEY": "/home/administrador/.ssh/bca_10_8_10_20"
  }
}
```

**Uso desde Cursor**:
- Debugging en servidores de producción/staging
- Verificar logs remotos
- Editar configuraciones en servidores

---

### 3. **Chrome DevTools Server** (`chrome-devtools`)
**Estado**: ✅ Configurado
**Propósito**: Automatización y testing del frontend

**Capacidades**:
- Navegación web automatizada
- Captura de screenshots
- Análisis de performance
- Inspección de network requests
- Testing de UI/UX

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "chrome-devtools-mcp@latest"]
}
```

**Uso desde Cursor**:
- Testing automatizado de flujos de usuario
- Debugging visual de componentes
- Análisis de métricas Core Web Vitals

---

### 4. **Context7 Server** (`context7`)
**Estado**: ✅ Configurado
**Propósito**: Documentación actualizada de librerías

**Capacidades**:
- Acceso a documentación actualizada de frameworks
- Búsqueda en documentación oficial
- Ejemplos de código de librerías

**Configuración**:
```json
{
  "url": "https://mcp.context7.com/mcp"
}
```

**Uso desde Cursor**:
- Consultar documentación actualizada de Next.js, React, etc.
- Obtener ejemplos de uso de APIs
- Verificar compatibilidad de versiones

---

### 5. **Git Server** (`git`) 🆕
**Estado**: ✅ Recién instalado
**Propósito**: Análisis profundo del repositorio Git

**Capacidades**:
- Búsqueda en historial de commits
- Análisis de diffs
- Inspección de branches
- Identificación de cuándo se introdujeron cambios
- Análisis de contributors y blame

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-git"],
  "env": {
    "GIT_DIR": "/home/administrador/monorepo-bca/.git",
    "GIT_WORK_TREE": "/home/administrador/monorepo-bca"
  }
}
```

**Uso desde Cursor**:
- "¿Cuándo se introdujo este bug?"
- "¿Quién modificó este archivo por última vez?"
- "Muéstrame todos los commits relacionados con autenticación"
- "¿Qué cambió entre estas dos versiones?"

**Ejemplos de comandos**:
- Buscar en commits: "Busca commits con la palabra 'JWT'"
- Ver historial: "Muéstrame los últimos 10 commits de este archivo"
- Análisis de cambios: "¿Qué archivos se modificaron en el último mes?"

---

### 6. **GitHub Server** (`github`) 🆕
**Estado**: ⚠️ Requiere configuración adicional
**Propósito**: Gestión de PRs, Issues y GitHub Actions

**Capacidades**:
- Crear y gestionar Pull Requests
- Crear y asignar Issues
- Revisar código de PRs
- Monitorear GitHub Actions workflows
- Gestionar releases
- Analizar métricas del repositorio

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": ""
  }
}
```

**⚠️ ACCIÓN REQUERIDA**: Necesitas crear un Personal Access Token de GitHub:

1. Ve a GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con estos permisos:
   - `repo` (acceso completo a repositorios)
   - `workflow` (gestión de GitHub Actions)
   - `read:org` (lectura de organización)
3. Copia el token generado
4. Edita `/home/administrador/.cursor/mcp.json`
5. Agrega el token en `GITHUB_PERSONAL_ACCESS_TOKEN`

**Uso desde Cursor**:
- "Crea un PR para esta rama"
- "Muéstrame los PRs abiertos"
- "¿Qué issues están asignados a mí?"
- "¿Cuál es el estado del último workflow de CI/CD?"
- "Crea un issue para este bug"

**Ejemplos de comandos**:
- Gestión de PRs: "Muéstrame los PRs pendientes de revisión"
- Issues: "Crea un issue sobre el problema de autenticación"
- CI/CD: "¿Por qué falló el último build?"

---

### 7. **Docker Server** (`docker`) 🆕
**Estado**: ✅ Recién instalado
**Propósito**: Gestión y debugging de contenedores Docker

**Capacidades**:
- Listar contenedores, imágenes y volúmenes
- Inspeccionar contenedores en ejecución
- Ver logs de contenedores
- Analizar uso de recursos
- Inspeccionar networks
- Ver configuraciones de contenedores

**Configuración**:
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-docker"],
  "env": {
    "DOCKER_HOST": "unix:///var/run/docker.sock"
  }
}
```

**Uso desde Cursor**:
- "¿Qué contenedores están corriendo?"
- "Muéstrame los logs del contenedor backend"
- "¿Cuánta memoria está usando el contenedor de Redis?"
- "¿Qué versión de la imagen estamos usando en producción?"
- "Inspecciona la configuración del contenedor frontend"

**Ejemplos de comandos**:
- Debugging: "Muéstrame los últimos 100 logs del servicio documentos"
- Análisis: "¿Qué contenedores están consumiendo más CPU?"
- Inspección: "¿Qué puertos está exponiendo el contenedor backend?"

---

## Flujos de Trabajo Recomendados

### Debugging de Producción
1. **Docker** → Verificar estado de contenedores
2. **SSH** → Revisar logs en el servidor
3. **PostgreSQL** → Verificar estado de datos
4. **Git** → Identificar cuándo se introdujo el problema

### Desarrollo de Feature
1. **Git** → Revisar historial y crear branch
2. **Context7** → Consultar documentación de librerías
3. **Chrome DevTools** → Probar UI/UX
4. **GitHub** → Crear PR cuando esté listo

### Análisis de Performance
1. **Chrome DevTools** → Medir Core Web Vitals
2. **Docker** → Verificar recursos de contenedores
3. **PostgreSQL** → Analizar queries lentas

### Code Review
1. **GitHub** → Ver PRs pendientes
2. **Git** → Analizar diffs y cambios
3. **Chrome DevTools** → Validar cambios visuales

---

## Reinicio de Cursor

**IMPORTANTE**: Para que los nuevos servidores MCP (Git, GitHub, Docker) estén disponibles, necesitas:

1. **Cerrar completamente Cursor** (no solo la ventana actual)
2. **Reabrir Cursor**
3. Los servidores se inicializarán automáticamente

---

## Verificación de Instalación

Después de reiniciar Cursor, puedes verificar que los servidores estén funcionando preguntando:

- **Git**: "¿Cuántos commits tiene este repositorio?"
- **GitHub**: "Muéstrame los PRs abiertos" (requiere token)
- **Docker**: "¿Qué contenedores Docker están corriendo?"

---

## Troubleshooting

### Git Server no responde
- Verifica que el path del repositorio sea correcto: `/home/administrador/monorepo-bca`
- Asegúrate de que el directorio tenga un repositorio Git inicializado

### GitHub Server falla
- Verifica que hayas configurado el `GITHUB_PERSONAL_ACCESS_TOKEN`
- Confirma que el token tenga los permisos correctos
- Verifica que no haya expirado el token

### Docker Server no se conecta
- Asegúrate de que Docker esté corriendo: `sudo systemctl status docker`
- Verifica permisos del socket de Docker: `/var/run/docker.sock`
- Si es necesario, agrega el usuario al grupo docker: `sudo usermod -aG docker $USER`

---

## Recursos Adicionales

- [MCP Documentation](https://modelcontextprotocol.io/)
- [GitHub MCP Servers](https://github.com/modelcontextprotocol/servers)
- [Cursor MCP Guide](https://docs.cursor.com/mcp)

---

**Última actualización**: 29 de octubre de 2025

