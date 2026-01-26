# Flujo de Trabajo - Monorepo BCA

> **Fecha:** Enero 2026  
> **Para:** Equipo de desarrollo (Martina, Agustin, Sergio)

---

## Resumen

Tenemos **3 ambientes** con **3 ramas** en Git:

| Ambiente | Servidor | Rama | URL |
|----------|----------|------|-----|
| 🧪 **Testing** | 10.3.0.246 | `develop` | http://10.3.0.246:8560 |
| 🎭 **Staging** | 10.3.0.243 | `staging` | http://10.3.0.243:8550 |
| 🚀 **Producción** | 10.8.10.20 | `main` | https://bca-group.microsyst.com.ar |

---

## Flujo Normal de Desarrollo

```
develop (Testing)  →  staging (Staging)  →  main (Producción)
     ↑                      ↑                      ↑
  Desarrollo           Pruebas QA            Release mensual
  diario               pre-producción        o cuando esté listo
```

### 1. Desarrollo diario

- Trabajar siempre en la rama `develop`
- Cada push a `develop` despliega automáticamente a **Testing**
- Probar cambios en http://10.3.0.246:8560

### 2. Pasar a Staging (para pruebas QA)

Cuando una versión está lista para pruebas:

```bash
git checkout staging
git merge develop
git push origin staging
```

Luego ir a GitHub → Actions → "Deploy Staging" → Run workflow

### 3. Pasar a Producción

Cuando las pruebas en Staging están aprobadas:

```bash
git checkout main
git merge staging
git push origin main

# Crear tag de versión
git tag -a v1.0.0 -m "Release enero 2026"
git push origin --tags
```

El deploy a producción es **manual** siguiendo el documento de deployment.

---

## Comandos Frecuentes

| Acción | Comando |
|--------|---------|
| Ver en qué rama estoy | `git branch` |
| Cambiar a develop | `git checkout develop` |
| Actualizar mi rama | `git pull origin develop` |
| Subir mis cambios | `git push origin develop` |
| Ver historial | `git log --oneline -10` |

---

## Reglas Importantes

1. **Nunca hacer push directo a `main`** - Siempre pasar por staging primero
2. **Nunca hacer push directo a `staging`** - Solo merges desde develop
3. **Todo el desarrollo va a `develop`** - Es la rama por defecto
4. **Probar en Testing antes de promover** - http://10.3.0.246:8560

---

## Hotfix de Emergencia

Si hay un bug crítico en producción que no puede esperar:

```bash
# 1. Crear rama de hotfix desde main
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-del-bug

# 2. Hacer el fix y commit
git add .
git commit -m "Hotfix: descripción del arreglo"

# 3. Merge a main
git checkout main
git merge hotfix/descripcion-del-bug
git push origin main

# 4. Crear tag
git tag -a v1.0.1 -m "Hotfix: descripción"
git push origin --tags

# 5. Propagar a las otras ramas
git checkout staging && git merge hotfix/descripcion-del-bug && git push
git checkout develop && git merge hotfix/descripcion-del-bug && git push

# 6. Eliminar rama de hotfix
git branch -d hotfix/descripcion-del-bug
```

---

## URLs de Acceso

### Testing (10.3.0.246)
- Frontend: http://10.3.0.246:8560
- Backend API: http://10.3.0.246:4810
- Documentos API: http://10.3.0.246:4812

### Staging (10.3.0.243)
- Frontend: http://10.3.0.243:8550
- Backend API: http://10.3.0.243:4800
- Documentos API: http://10.3.0.243:4802

### Producción (10.8.10.20)
- Frontend: https://bca-group.microsyst.com.ar
- Backend API: https://bca-group.microsyst.com.ar/api/
- Documentos API: https://bca-group.microsyst.com.ar/api/docs/

---

## Contacto

Cualquier duda sobre el flujo de trabajo, consultar con Sergio.

---

*Documento generado el 26 de enero de 2026*
