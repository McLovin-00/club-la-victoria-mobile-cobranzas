# Prompt de Clasificación de Documentos (Flowise)

Objetivo: Dado un documento (archivo, PDF o imagen), clasificar y extraer 4 campos mínimos para su enrutamiento y posterior aprobación humana en el microservicio Documentos.

Variables del flujo (si existen en tu Flow):
- fileUrl: URL accesible del archivo a analizar (por ejemplo, URL firmada de MinIO)
- templateName: hint opcional del tipo de documento esperado (por ejemplo, "AUTO")

Restricciones críticas para el prompt:
- Salida estrictamente en 4 líneas (sin JSON, sin encabezados, sin comentarios)
- Evitar llaves literales sin escapar en el cuerpo del prompt; no incluir bloques JSON

Salida requerida (texto plano, 4 líneas):
- Entidad: EMPRESA_TRANSPORTISTA | DADOR | CHOFER | CAMION | ACOPLADO | Desconocido
- Id_Entidad: <CUIT|DNI|PATENTE|Desconocido>
- Comprobante: <tipo de documento o Desconocido>
- Vencimiento: DD/MM/AAAA | Desconocido

## Instrucciones
1) Determinar Entidad:
   - EMPRESA_TRANSPORTISTA: docs corporativos del transportista (F931, AFIP, ARCA, pólizas, etc.)
   - DADOR: docs del dador de carga (inscripciones fiscales, etc.)
   - CHOFER: docs del chofer (licencia, psicofísico, antecedentes)
   - CAMION: docs del tractor (seguro RC/RT, VTV/RTO, cédula, título)
   - ACOPLADO: docs del semirremolque/acoplado (VTV, seguro, cédula)
   - Si dudas, usar Desconocido.

2) Extraer Id_Entidad:
   - EMPRESA_TRANSPORTISTA o DADOR → CUIT 11 dígitos (solo números)
   - CHOFER → DNI (solo números)
   - CAMION/ACOPLADO → PATENTE argentina en mayúsculas sin guiones (AAA123 o AA123BB)
   - Si no es confiable, usar Desconocido.

3) Comprobante: nombre breve en español ("F931", "Inscripción AFIP", "ARCA", "Licencia de Conducir", "Seguro RC", "Seguro RT", "VTV", "Cédula Verde", "Psicofísico"). Si no es claro, Desconocido.

4) Vencimiento: si existe, en formato DD/MM/AAAA; si no aplica o no se halla, Desconocido.

5) Formato ESTRICTO:
   - Solo 4 líneas; etiquetas exactas: Entidad, Id_Entidad, Comprobante, Vencimiento.
   - Sin encabezados, sin JSON, sin comentarios.

## Ejemplos
Entidad: EMPRESA_TRANSPORTISTA
Id_Entidad: 30711234567
Comprobante: F931
Vencimiento: 15/09/2025

Entidad: CHOFER
Id_Entidad: 20333444
Comprobante: Licencia de Conducir
Vencimiento: 31/12/2026

Entidad: CAMION
Id_Entidad: AB123CD
Comprobante: Seguro RC
Vencimiento: 01/03/2026

Entidad: DADOR
Id_Entidad: 30700666123
Comprobante: Inscripción AFIP
Vencimiento: Desconocido

Entidad: ACOPLADO
Id_Entidad: AA123BB
Comprobante: VTV
Vencimiento: 20/11/2025

## Casos dudosos
- Múltiples identidades: elige la rotulada como titular/asegurado/empresa; si persiste ambigüedad, Desconocido.
- Múltiples fechas: prioriza la marcada como vencimiento o la asociada al comprobante.
- OCR pobre: usa Desconocido en los campos no determinables.

Nota: No incluir bloques JSON en el prompt (pueden romper el parser de plantillas del LLM). La plataforma se encargará de interpretar las 4 líneas etiquetadas.

## Normalización
- CUIT: 11 dígitos
- DNI: numérico
- Patente: `AAA123` o `AA123BB`
- Fecha: `DD/MM/AAAA`

## Catálogo de comprobantes esperados (para mejorar consistencia)
Usa estos nombres tal cual cuando apliquen:

- EMPRESA_TRANSPORTISTA
  - "Constancia de ARCA Empresa"
  - "Constancia IIBB de Empresa"
  - "Presentación mensual de la declaración jurada F.931, acuse y constancia de pago"

- CHOFER
  - "DNI"
  - "Licencia"
  - "Alta Temprana"
  - "ART"
  - "Seguro de Vida Obligatorio"

- CAMION (Tractor)
  - "Titulo Tractor"
  - "Cedula Tractor"
  - "Seguro Tractor"
  - "RTO Tractor"

- ACOPLADO (Semirremolque)
  - "Titulo Semirremolque"
  - "Cedula Semirremolque"
  - "Seguro Acoplado"
  - "RTO Semirremolque"

## Ejemplos por comprobante (formato de 4 líneas)

Entidad: EMPRESA_TRANSPORTISTA
Id_Entidad: 30711234567
Comprobante: Constancia de ARCA Empresa
Vencimiento: Desconocido

Entidad: EMPRESA_TRANSPORTISTA
Id_Entidad: 30711234567
Comprobante: Constancia IIBB de Empresa
Vencimiento: Desconocido

Entidad: EMPRESA_TRANSPORTISTA
Id_Entidad: 30711234567
Comprobante: Presentación mensual de la declaración jurada F.931, acuse y constancia de pago
Vencimiento: 30/06/2025

Entidad: CHOFER
Id_Entidad: 20999888
Comprobante: DNI
Vencimiento: Desconocido

Entidad: CHOFER
Id_Entidad: 20999888
Comprobante: Licencia
Vencimiento: 31/12/2026

Entidad: CHOFER
Id_Entidad: 20999888
Comprobante: Alta Temprana
Vencimiento: Desconocido

Entidad: CHOFER
Id_Entidad: 20999888
Comprobante: ART
Vencimiento: 15/03/2026

Entidad: CHOFER
Id_Entidad: 20999888
Comprobante: Seguro de Vida Obligatorio
Vencimiento: Desconocido

Entidad: CAMION
Id_Entidad: AB123CD
Comprobante: Titulo Tractor
Vencimiento: Desconocido

Entidad: CAMION
Id_Entidad: AB123CD
Comprobante: Cedula Tractor
Vencimiento: Desconocido

Entidad: CAMION
Id_Entidad: AB123CD
Comprobante: Seguro Tractor
Vencimiento: 01/03/2026

Entidad: CAMION
Id_Entidad: AB123CD
Comprobante: RTO Tractor
Vencimiento: 20/11/2025

Entidad: ACOPLADO
Id_Entidad: AA123BB
Comprobante: Titulo Semirremolque
Vencimiento: Desconocido

Entidad: ACOPLADO
Id_Entidad: AA123BB
Comprobante: Cedula Semirremolque
Vencimiento: Desconocido

Entidad: ACOPLADO
Id_Entidad: AA123BB
Comprobante: Seguro Acoplado
Vencimiento: 01/03/2026

Entidad: ACOPLADO
Id_Entidad: AA123BB
Comprobante: RTO Semirremolque
Vencimiento: 20/11/2025
