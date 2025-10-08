## PDF → Imagen para IA (Poppler) – Plan mínimo viable y profesional

Inspirado en el enfoque de Steve Jobs: simple, claro, sin extras. Objetivo: rasterizar TODAS las páginas de cada PDF a imágenes de alta legibilidad y alimentar a Flowise con esos frames, consolidando un único resultado para aprobación humana.

### 1) Alcance
- Entrada: documentos PDF subidos por usuarios o por batch.
- Salida: lista ordenada de imágenes (PNG) por página, enviadas a Flowise.
- Consolidación: entidad, id_entidad, tipo de comprobante y vencimiento unificados para el documento completo.

### 2) Decisiones de diseño
- Motor de raster: Poppler (`pdftoppm`/`pdftocairo`).
- Formato de salida: PNG (nitidez sobre texto). Compresión balanceada.
- DPI: 200 por defecto; 300 para documentos pequeños (configurable).
- Paginado: TODAS las páginas. Envío por lotes si el tamaño total excede umbrales.
- Ubicación: worker de validación, antes de invocar Flowise.

### 3) Configuración (feature flags)
- `PDF_RASTERIZE_ENABLED=true`
- `PDF_RASTERIZE_DPI=200` (ó 300)
- `PDF_RASTERIZE_FORMAT=png`
- `PDF_RASTERIZE_BATCH_SIZE=5` (páginas por petición a Flowise)
- `PDF_RASTERIZE_TIMEOUT_MS=20000` (por página)
- `PDF_RASTERIZE_MAX_CONCURRENCY=CPU_CORES-1`

### 4) Flujo de procesamiento
1. Detectar MIME. Si `application/pdf` ⇒ activar raster.
2. Rasterizar TODAS las páginas (1..N) a PNG en orden.
3. Subir cada página a MinIO con nombre determinista: `doc_{id}/p{index}.png`.
4. Invocar Flowise con todas las páginas (usar `uploads` o `fileUrl`), en **lotes** si excede límite de tamaño.
5. Consolidar resultado multi‑página:
   - entidad/id_entidad: primer match consistente; en conflicto ⇒ `lowConfidence`.
   - comprobante: mayoría o prioridad por template.
   - vencimiento: fecha válida con mayor confianza o futura más próxima.
6. Persistir clasificación unificada y snapshot por página (auditoría).
7. Marcar `PENDIENTE_APROBACION` con bandera `source=PDF→IMG` y `pages=N`.

### 5) Creación automática de entidades (ya habilitado)
- Si IA detecta CHOFER/CAMION/ACOPLADO inexistentes ⇒ crear y asignar.
- Si IA detecta DADOR/EMPRESA_TRANSPORTISTA con CUIT ⇒ crear Empresa Transportista bajo el dador actual y asignar.

### 6) Límites y resiliencia
- Timeouts por página y total; reintentos acotados (1x) en páginas fallidas.
- Fallback: si raster falla ⇒ enviar PDF directo a Flowise y marcar `rasterFailed=true`.
- Validación de tamaño: si el lote supera umbral, dividir en tramos de `PDF_RASTERIZE_BATCH_SIZE`.

### 7) Observabilidad
- Métricas Prometheus: `pdf_pages_total`, `pdf_raster_ms`, `pdf_bytes_out`, `pdf_failures_total`.
- Logs por documento/página con códigos de error claros.
- Trazabilidad en DB: `pages[]`, `dpi`, `format`, `rasterDurationMs`, `flowiseChunks`.

### 8) Subtareas implementables
1. Dependencia y flags
   - Añadir Poppler en imagen/entorno y exponer flags en `.env`.
   - Aceptación: comando disponible; flags leídos en runtime.
2. Rasterización
   - Implementar ejecución segura (timeout) y naming determinista.
   - Aceptación: PDF de 10 páginas genera 10 PNG ordenados y metadatos.
3. Almacenamiento
   - Subir frames a MinIO; URLs firmadas o rutas internas.
   - Aceptación: objetos presentes, limpieza de temporales garantizada.
4. Envío a Flowise (lotes)
   - Fragmentar por tamaño; consolidar respuestas.
   - Aceptación: documentos grandes procesados sin timeouts de API.
5. Consolidación del resultado
   - Reglas claras para entidad/tipo/vencimiento; flag `lowConfidence`.
   - Aceptación: persistencia única por documento con snapshot por página.
6. UI de aprobación
   - Mostrar “PDF→IMG (N páginas)” y navegación de páginas.
   - Aceptación: revisor puede ver cualquier página y editar campos.
7. Observabilidad
   - Métricas, logs, y runbook de errores comunes.
   - Aceptación: tableros muestran tiempos y fallas por documento.

### 9) Rendimiento y costes
- Concurrencia proporcional a CPU; raster en disco efímero/streaming a MinIO.
- PNG por defecto; evaluar JPEG si páginas individuales superan umbral pesado.
- Pruebas A/B 200 vs 300 DPI para ajustar calidad/latencia.

### 10) Despliegue y rollback
- Canary por tenant o porcentaje de workers.
- Flag de desactivación inmediata (`PDF_RASTERIZE_ENABLED=false`).
- Validación sobre set de PDFs reales antes de generalizar.

---

> Resultado: un pipeline reproducible y elegante, que convierte cualquier PDF multipágina en frames óptimos para IA, consolida un único resultado y mantiene al humano en control final.


