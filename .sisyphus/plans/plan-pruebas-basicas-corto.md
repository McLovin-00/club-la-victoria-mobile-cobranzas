# Plan de Pruebas: Casos de Uso Básicos

> **Quick Summary**: 3 casos de uso simples con pasos directos (chofer, transportista, dador crea equipos y suben documentos)
> **Deliverables**: Checklist de pasos para cada caso
> **Estimated Effort**: Small
> **Parallel Execution**: NO - sequential (un caso a la vez)
> **Critical Path**: Caso 1 → Caso 2 → Caso 3

---

## Caso 1: Chofer Crea Equipo

### Objetivo
Chofer crea un equipo, sube documentos personal y otros roles pueden verlo.

### Pasos
1. Login como CHOFER
   - Email: `chofer.01@bca.com`
   - Password: `Chofer2024!`
2. Crear equipo
   - Seleccionar chofer (sí mismo)
   - Seleccionar camión existente o crear nuevo
   - Seleccionar acoplado existente o crear nuevo
   - Click en "Guardar"
3. Subir documento personal
   - Navegar al equipo creado
   - Click en "Subir Documento" → Seleccionar DNI o Licencia
   - Cargar archivo PDF de prueba
   - Click en "Subir"
4. Verificar que otros roles ven el equipo
   - Logout
   - Login como TRANSPORTISTA (empresa del chofer)
   - Verificar que aparece el equipo del chofer
   - Verificar que aparece el documento subido

### Resultado Esperado
- [ ] Equipo creado exitosamente
- [ ] Documento subido exitosamente
- [ ] TRANSPORTISTA ve el equipo y documento

---

## Caso 2: Transportista Crea Equipo

### Objetivo
Transportista crea un equipo con su chofer, sube documentos y otros roles pueden verlo.

### Pasos
1. Login como TRANSPORTISTA
   - Email: `transportista.01@bca.com`
   - Password: `Transp2024!`
2. Crear equipo
   - Seleccionar chofer existente de la empresa
   - Seleccionar camión existente o crear nuevo
   - Seleccionar acoplado existente o crear nuevo
   - Asignar cliente (opcional)
   - Click en "Guardar"
3. Subir documento de camión
   - Navegar al equipo creado
   - Click en "Subir Documento" → Seleccionar Cédula Verde o RTO
   - Cargar archivo PDF de prueba
   - Click en "Subir"
4. Verificar que otros roles ven el equipo
   - Logout
   - Login como ADMIN del tenant
   - Verificar que aparece el equipo del transportista
   - Verificar que aparece el documento subido

### Resultado Esperado
- [ ] Equipo creado exitosamente
- [ ] Documento subido exitosamente
- [ ] ADMIN ve el equipo y documento

---

## Caso 3: Dador de Carga Crea Equipo

### Objetivo
Dador de carga crea un equipo para un transportista, sube documentos y todos los roles del tenant pueden verlo.

### Pasos
1. Login como DADOR_DE_CARGA
   - Email: `dador.01@bca.com`
   - Password: `Dador2024!`
2. Crear equipo
   - Seleccionar transportista de la lista
   - Seleccionar chofer del transportista
   - Seleccionar camión del transportista
   - Seleccionar acoplado del transportista (opcional)
   - Click en "Guardar"
3. Subir documento de acoplado
   - Navegar al equipo creado
   - Click en "Subir Documento" → Seleccionar SENASA o Póliza
   - Cargar archivo PDF de prueba
   - Click en "Subir"
4. Verificar que todos los roles ven el equipo
   - Logout
   - Login como ADMIN
   - Verificar que aparece el equipo
   - Verificar que TRANSPORTISTA ve el equipo
   - Verificar que CHOFER ve el equipo

### Resultado Esperado
- [ ] Equipo creado exitosamente
- [ ] Documento subido exitosamente
- [ ] ADMIN ve el equipo y documento
- [ ] TRANSPORTISTA ve el equipo y documento
- [ ] CHOFER ve el equipo y documento

---

## Credenciales de Prueba

| Rol | Email | Password |
|------|--------|----------|
| CHOFER | chofer.01@bca.com | Chofer2024! |
| TRANSPORTISTA | transportista.01@bca.com | Transp2024! |
| DADOR_DE_CARGA | dador.01@bca.com | Dador2024! |
| ADMIN | admin.01@bca.com | Admin2024! |

**Nota**: Si los usuarios no existen, crearlos antes de ejecutar los casos de uso.

---

## Documentos de Prueba

Crear estos archivos PDF simples con cualquier nombre:

1. `dni_prueba.pdf` - Para chofer
2. `licencia_prueba.pdf` - Para chofer
3. `cedula_verde_prueba.pdf` - Para camión
4. `rto_prueba.pdf` - Para camión
5. `senasa_prueba.pdf` - Para acoplado

**Cómo crear**: Usar Word, Google Docs o cualquier editor de PDF. Guardar como PDF.

---

## Resumen

- **3 casos de uso** simples y directos
- **Cada caso con 4 pasos** (login, crear equipo, subir documento, verificar cross-role)
- **Total**: ~10-15 minutos por caso
