# Contexto
Necesitamos automatizar ~1500+ casos E2E (en un PDF) para **5 portales** contra un ambiente remoto (via VPN).
Además, queremos poder **marcar avance** por portal con checkboxes y evitar que el suite se vuelva inmantenible.

# Decisión
- Mantener un repositorio dedicado de testing con Playwright.
- Organizar el trabajo en:
  - `docs/checklists/`: un archivo por portal con checkboxes (fuente: `pruebas-del-sistema.txt`).
  - `tests/`: specs por portal/sección.
  - `pages/`: Page Objects por portal/sección.
  - `setup/`: setup por rol usando `storageState` (para no loguear en cada test).
- Configurar Playwright con proyectos por rol.
- Evitar tests que fuerzan múltiples logins fallidos debido al bloqueo de 15 minutos.

# Consecuencias
- Más orden y trazabilidad: el avance se refleja en `docs/checklists/` sin depender del estado de CI.
- Reutilización: Page Objects y helpers compartidos reducen duplicación entre portales.
- Limitación: sin datos de prueba preexistentes, muchas suites deberán crearse como esqueletos hasta que existan equipos/documentos en estados requeridos.


