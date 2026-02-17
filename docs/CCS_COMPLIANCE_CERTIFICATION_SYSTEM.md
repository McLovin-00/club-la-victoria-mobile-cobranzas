# Compliance Certification System (CCS)

## Sistema de Certificación de Compliance para Equipos de Transporte

**Versión**: 2.0  
**Fecha**: 2026-02-17  
**Autor**: Equipo de Arquitectura BCA  
**Estado**: Diseño aprobado, pendiente implementación  
**Changelog**:
- v2.0 - Rediseño mayor: acceso exclusivamente autenticado (eliminación de verificación pública), marcas de agua en documentos, cifrado en reposo, AI propietaria on-premise, integración completa de prevención de fraude (sección 19), modelo de PDF autoverificable para terceros externos
- v1.2 - Agregada sección 19: Prevención de Fraude y Verificación de Autenticidad Documental
- v1.1 - Agregado sistema de snapshots por evento (sección 6.5)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Contexto y Problema](#2-contexto-y-problema)
3. [Requisitos](#3-requisitos)
4. [Arquitectura General](#4-arquitectura-general)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Proceso de Snapshots](#6-proceso-de-snapshots)
   - 6.1-6.4: Snapshot diario (baseline)
   - 6.5: [Snapshots por evento (intra-día)](#65-snapshots-por-evento-intra-día)
   - 6.6: [Resolución temporal: ¿qué snapshot aplica a una hora dada?](#66-resolución-temporal-qué-snapshot-aplica-a-una-hora-dada)
   - 6.7: [Consolidación nocturna y Merkle tree](#67-consolidación-nocturna-y-merkle-tree)
7. [Cadena de Hashes (Hash Chain)](#7-cadena-de-hashes-hash-chain)
8. [Anclaje en Blockchain](#8-anclaje-en-blockchain)
9. [Copia Congelada de Documentos (Nivel 3)](#9-copia-congelada-de-documentos-nivel-3)
10. [Consulta de Certificados (Acceso Autenticado)](#10-consulta-de-certificados-acceso-autenticado)
11. [Generación de Certificados PDF (autoverificables)](#11-generación-de-certificados-pdf-autoverificables)
12. [API Endpoints](#12-api-endpoints)
13. [Scheduling y Jobs](#13-scheduling-y-jobs)
14. [Estimaciones de Almacenamiento](#14-estimaciones-de-almacenamiento)
15. [Seguridad](#15-seguridad)
16. [Fases de Implementación](#16-fases-de-implementación)
17. [Escenarios Especiales y Casos Borde](#17-escenarios-especiales-y-casos-borde)
18. [Consideraciones Futuras](#18-consideraciones-futuras)
19. [Prevención de Fraude y Verificación de Autenticidad Documental](#19-prevención-de-fraude-y-verificación-de-autenticidad-documental)
20. [Glosario](#20-glosario)

---

## 1. Resumen Ejecutivo

El Compliance Certification System (CCS) permite certificar de forma criptográficamente verificable que un equipo de transporte (chofer + camión + acoplado + empresa transportista) cumplía con todos los requisitos documentales en una fecha determinada.

El sistema genera **snapshots automáticos** (diarios y por evento) del estado de compliance de cada equipo activo, los firma digitalmente con RS256, los encadena mediante hashes (hash chain inmutable) y ancla periódicamente la cadena en una **blockchain pública** como prueba de existencia temporal.

Adicionalmente, se generan **copias congeladas** de los documentos originales vinculadas a cada certificado, se aplican **marcas de agua** dinámicas al servir documentos, se valida la autenticidad contra **fuentes oficiales** (SSN, ARCA, CNRT), y toda la IA de verificación corre **on-premise** para garantizar soberanía de datos.

**Principio de acceso**: Todo acceso a certificados y documentos es **exclusivamente autenticado**. No existen endpoints públicos ni links de verificación sin login. Cada rol (dador, cliente, transportista, chofer) accede únicamente a la información que le corresponde desde su portal. Para terceros externos (reguladores, aseguradoras, jueces), se genera un **PDF autoverificable** que contiene la información criptográfica necesaria para validación offline independiente.

### Propuesta de valor

| Actor | Beneficio | Mecanismo de acceso |
|---|---|---|
| **Dador de carga** | Prueba irrefutable de que mantuvo su flota en compliance | Portal autenticado, generación de PDFs |
| **Cliente** | Garantía verificable de que los equipos asignados cumplían requisitos | Portal autenticado, solo sus equipos asignados |
| **Regulador/Auditor** | Prueba con peso probatorio: firma digital + anclaje blockchain | PDF autoverificable + Polygonscan |
| **Aseguradora** | Evidencia de due diligence documental en caso de siniestro | PDF autoverificable provisto por el dador |
| **Transportista** | Visibilidad de su propio estado documental | Portal autenticado, solo sus equipos |

---

## 2. Contexto y Problema

### Situación actual

La plataforma BCA gestiona la documentación de equipos de transporte (choferes, camiones, acoplados, empresas transportistas) para dadores de carga. El sistema evalúa la compliance en tiempo real: verifica que cada equipo tenga todos los documentos requeridos vigentes, aprobados y no vencidos.

Sin embargo, esta evaluación es **volátil**: refleja el estado actual y no deja registro certificado del estado pasado. Si un documento vence hoy, no hay forma de demostrar que ayer estaba vigente.

### Problema

> "¿Cómo puedo demostrar que el equipo que hizo un viaje el 15 de enero tenía toda la documentación al día?"

Hoy la respuesta depende de reconstruir el estado a partir de logs y timestamps de aprobación/vencimiento, lo cual:
- No es práctico para un tercero que no tiene acceso al sistema
- No tiene garantía de integridad (los datos podrían haber sido alterados retroactivamente)
- No constituye prueba ante un auditor o en una disputa legal

### Solución

Un sistema que genere, cada día, un **certificado inmutable** del estado de compliance de cada equipo, con:
- Firma digital (integridad criptográfica)
- Cadena de hashes (inmutabilidad temporal)
- Anclaje en blockchain (prueba de existencia independiente)
- Copia congelada de los documentos (evidencia verificable)

---

## 3. Requisitos

### 3.1 Funcionales

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Generar snapshot diario automático (baseline) de compliance de cada equipo activo | Alta |
| RF-02 | Generar snapshot por evento cuando un documento cambie de estado o cambie la composición del equipo | Alta |
| RF-03 | Firmar cada snapshot con clave privada RS256 | Alta |
| RF-04 | Encadenar snapshots mediante hash del snapshot anterior (hash chain por equipo) | Alta |
| RF-05 | Generar copia congelada de los documentos asociados al snapshot | Alta |
| RF-06 | Anclar el Merkle root diario en blockchain pública (Polygon) | Alta |
| RF-07 | Consulta de certificados exclusivamente autenticada, filtrada por rol y permisos del usuario | Alta |
| RF-08 | Aplicar marca de agua dinámica (visible + invisible) a todo documento servido, identificando al usuario que lo consulta | Alta |
| RF-09 | Registrar declaración jurada electrónica del cargador al momento de subir cada documento | Alta |
| RF-10 | Generar certificado PDF autoverificable con datos criptográficos completos para validación offline | Alta |
| RF-11 | Permitir al dador generar certificados bajo demanda para fechas/horas pasadas | Media |
| RF-12 | Permitir al cliente consultar compliance de sus equipos asignados desde su portal | Media |
| RF-13 | Soportar certificación de flota completa (múltiples equipos, una fecha) | Media |
| RF-14 | Cifrar documentos en reposo (MinIO SSE + disco LUKS) | Media |
| RF-15 | Ejecutar toda la IA de verificación documental (OCR, clasificación, scoring) on-premise sin enviar datos a servicios externos | Media |
| RF-16 | Verificar documentos contra fuentes oficiales cuando esté disponible (SSN para pólizas, ARCA para constancias fiscales) | Media |
| RF-17 | Calcular y almacenar un nivel de confianza (trustLevel) en cada snapshot basado en las capas de verificación aplicadas | Media |

### 3.2 No funcionales

| ID | Requisito | Métrica |
|---|---|---|
| RNF-01 | Snapshot de 1000 equipos en < 5 minutos | Job nocturno |
| RNF-02 | Consulta autenticada de certificados responde en < 500ms | P95 |
| RNF-03 | Almacenamiento de snapshots escalable a 3 años | ~2M registros |
| RNF-04 | Anclaje blockchain con costo < $1 USD/día | Polygon |
| RNF-05 | Copias congeladas accesibles durante 2 años mínimo | Política MinIO WORM |
| RNF-06 | Aplicación de marca de agua on-the-fly en < 2 segundos por documento | P95 |
| RNF-07 | Ningún dato documental (imagen, PDF) sale de la infraestructura propia | Auditoría de red |
| RNF-08 | Documentos cifrados en reposo con AES-256 (MinIO SSE) | Verificable via config |

### 3.3 Volumen estimado

| Métrica | Inicio (mes 1) | 90 días | 1 año |
|---|---|---|---|
| Equipos activos | 500 | 1,000 | 2,000 |
| Snapshots/día | 500 | 1,000 | 2,000 |
| Snapshots acumulados | 15,000 | 90,000 | 730,000 |
| Anclajes blockchain/día | 1 | 1 | 1 |

---

## 4. Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────┐
│                       CAPA DE PRESENTACIÓN                            │
│                   (todo acceso requiere autenticación)                 │
│                                                                       │
│  Portal Dador/Admin     Portal Cliente       Portal Transportista     │
│  ┌────────────────┐    ┌────────────────┐   ┌────────────────┐       │
│  │ Generar certs   │    │ Ver compliance  │   │ Ver estado      │       │
│  │ bajo demanda    │    │ de SUS equipos  │   │ de SUS equipos  │       │
│  │ Descargar PDF   │    │ Descargar docs  │   │ Ver faltantes   │       │
│  │ Ver toda la     │    │ (con watermark) │   │                 │       │
│  │ flota + audit   │    │ Ver blockchain  │   │                 │       │
│  └───────┬────────┘    └───────┬────────┘   └───────┬────────┘       │
└──────────┼─────────────────────┼─────────────────────┼────────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       CAPA DE SERVICIOS                               │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │              ComplianceCertificationService                  │      │
│  │                                                              │      │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │      │
│  │  │  Snapshot     │ │  Hash Chain   │ │  Blockchain       │   │      │
│  │  │  Generator    │ │  Manager      │ │  Anchor           │   │      │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘   │      │
│  │         │                │                │                │      │
│  │  ┌──────┴───────┐ ┌─────┴────────┐ ┌─────┴────────────┐  │      │
│  │  │  Document    │ │  Certificate  │ │  Watermark         │  │      │
│  │  │  Freezer     │ │  PDF Builder  │ │  Service           │  │      │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘  │      │
│  └────────────────────────────────────────────────────────────┘      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐      │
│  │                Capa de Verificación de Fraude                │      │
│  │                                                              │      │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │      │
│  │  │  AI on-prem   │ │  External     │ │  Trust            │   │      │
│  │  │  OCR + Class.  │ │  Verification │ │  Scoring          │   │      │
│  │  │  + Scoring     │ │  (SSN, ARCA)  │ │  Engine           │   │      │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │      │
│  └────────────────────────────────────────────────────────────┘      │
│                                                                       │
│  Servicios existentes reutilizados:                                   │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │ ComplianceService │ │  MinIOService     │ │ EquipoService    │     │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
           │                     │                     │
           ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       CAPA DE PERSISTENCIA                            │
│                    (todo cifrado en reposo)                            │
│                                                                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐     │
│  │  PostgreSQL       │ │  MinIO (SSE)      │ │  Blockchain       │     │
│  │  (disco LUKS)     │ │  (Object Lock)    │ │  (Polygon)        │     │
│  │                   │ │                   │ │                   │     │
│  │ - Snapshots       │ │ - Docs congelados │ │ - Merkle root     │     │
│  │ - Merkle anchors  │ │   (cifrados AES)  │ │   diario          │     │
│  │ - Audit logs      │ │ - PDFs cert.      │ │                   │     │
│  │ - Declaraciones   │ │   (WORM)          │ │                   │     │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Modelo de Datos

### 5.1 Nuevas tablas Prisma

```prisma
// =============================================
// COMPLIANCE CERTIFICATION SYSTEM (CCS)
// =============================================

/// Snapshot del estado de compliance de un equipo.
/// Puede ser un baseline nocturno o un snapshot disparado por evento.
/// Cada registro es inmutable una vez creado y está firmado digitalmente.
model ComplianceSnapshot {
  id                String   @id @default(uuid()) @db.Uuid
  tenantEmpresaId   Int      @map("tenant_empresa_id")
  equipoId          Int      @map("equipo_id")
  dadorCargaId      Int      @map("dador_carga_id")

  // Fecha del snapshot (solo fecha, sin hora - para indexación por día)
  fecha             DateTime @db.Date

  // Timestamp exacto del snapshot (fecha + hora precisa)
  // Para baselines nocturnos: hora del job (ej: 03:00:00)
  // Para snapshots por evento: hora exacta del cambio
  timestamp         DateTime @default(now())

  // Tipo de snapshot
  snapshotType      CCSSnapshotType @default(BASELINE) @map("snapshot_type")

  // Evento que disparó el snapshot (null para BASELINE)
  // Ej: "DOCUMENT_APPROVED", "DOCUMENT_EXPIRED", "DOCUMENT_REJECTED"
  triggerEvent      String?  @map("trigger_event") @db.VarChar(50)

  // ID del documento que disparó el evento (null para BASELINE)
  triggerDocumentId Int?     @map("trigger_document_id")

  // Número de secuencia dentro del día para este equipo (0 = baseline, 1+ = eventos)
  daySequence       Int      @default(0) @map("day_sequence")

  // Estado global del equipo al momento del snapshot
  estadoGlobal      CCSEstadoGlobal @map("estado_global")

  // Datos capturados del equipo (JSON inmutable)
  // Estructura: { chofer, camion, acoplado?, empresaTransportista?, dador }
  equipoData        Json     @map("equipo_data")

  // Documentos evaluados (JSON inmutable)
  // Estructura: Array<{ templateId, templateName, entityType, entityId,
  //   status, documentId?, expiresAt?, approvedAt?, approvedBy?, fileHash? }>
  documentosData    Json     @map("documentos_data")

  // Clientes asignados al momento del snapshot
  clientesData      Json     @map("clientes_data")

  // Requisitos evaluados por cliente
  // Estructura: Array<{ clienteId, razonSocial, requirements: RequirementResultDetailed[] }>
  complianceData    Json     @map("compliance_data")

  // --- INTEGRIDAD CRIPTOGRÁFICA ---

  // SHA-256 del contenido canónico (equipoData + documentosData + clientesData + complianceData)
  contentHash       String   @map("content_hash") @db.VarChar(64)

  // Hash del snapshot anterior de este equipo (cadena)
  // null para el primer snapshot del equipo
  previousHash      String?  @map("previous_hash") @db.VarChar(64)

  // Firma RS256 del contentHash usando la clave privada del sistema
  signature         String   @map("signature") @db.Text

  // --- CONFIANZA Y VERIFICACIÓN ---

  // Nivel de confianza en la autenticidad de los documentos (calculado por las capas de fraude)
  trustLevel        CCSTrustLevel @default(UNVERIFIED) @map("trust_level")

  // Desglose del cálculo de confianza (JSON)
  // Estructura: { documentsVerifiedExternally, documentsWithDeclaration,
  //   documentsWithHighScore, documentsWithAlerts, transportistaReputationScore }
  trustBreakdown    Json?    @map("trust_breakdown")

  // Referencia interna del certificado (UUID corto para URLs internas del portal)
  certificateRef    String   @unique @default(uuid()) @map("certificate_ref") @db.Uuid

  // --- DOCUMENTOS CONGELADOS ---

  // Ruta base en MinIO de las copias congeladas
  // Formato: compliance-snapshots-t{tenantId}/{fecha}/{equipoId}/
  frozenDocsPath    String?  @map("frozen_docs_path") @db.VarChar(500)

  // Hash SHA-256 de cada documento congelado (JSON)
  // Estructura: { [filePath]: sha256Hash }
  frozenDocsHashes  Json?    @map("frozen_docs_hashes")

  // --- BLOCKCHAIN ---

  // Referencia al DailyMerkleAnchor que incluye este snapshot
  dailyAnchorId     String?  @map("daily_anchor_id") @db.Uuid

  // Posición en el Merkle tree del día (para proof-of-inclusion)
  merkleIndex       Int?     @map("merkle_index")

  // Merkle proof (hashes necesarios para recalcular el root)
  merkleProof       Json?    @map("merkle_proof")

  createdAt         DateTime @default(now()) @map("created_at")

  dailyAnchor       DailyMerkleAnchor? @relation(fields: [dailyAnchorId], references: [id])

  @@unique([equipoId, fecha, daySequence])
  @@index([tenantEmpresaId, fecha])
  @@index([equipoId, fecha, timestamp])
  @@index([equipoId, timestamp])
  @@index([dadorCargaId, fecha])
  @@index([certificateRef])
  @@index([contentHash])
  @@index([snapshotType, fecha])
  @@map("compliance_snapshots")
}

/// Anclaje diario del Merkle root en blockchain.
/// Un registro por día, contiene el root de todos los snapshots del día.
model DailyMerkleAnchor {
  id                String   @id @default(uuid()) @db.Uuid
  tenantEmpresaId   Int      @map("tenant_empresa_id")

  // Fecha del anclaje
  fecha             DateTime @db.Date

  // Merkle root (SHA-256) de todos los snapshots del día
  merkleRoot        String   @map("merkle_root") @db.VarChar(64)

  // Cantidad de snapshots incluidos
  snapshotCount     Int      @map("snapshot_count")

  // --- BLOCKCHAIN ---

  // Red blockchain utilizada (polygon, bitcoin, ethereum)
  blockchainNetwork String?  @map("blockchain_network") @db.VarChar(32)

  // ID de la transacción en blockchain
  transactionHash   String?  @map("transaction_hash") @db.VarChar(128)

  // Número de bloque donde se incluyó
  blockNumber       Int?     @map("block_number")

  // URL del explorador blockchain (Polygonscan) para verificación independiente
  explorerUrl       String?  @map("explorer_url") @db.VarChar(500)

  // Estado del anclaje
  anchorStatus      CCSAnchorStatus @default(PENDING) @map("anchor_status")

  // Costo de la transacción (en la moneda nativa de la red)
  transactionCost   String?  @map("transaction_cost") @db.VarChar(50)

  createdAt         DateTime @default(now()) @map("created_at")
  anchoredAt        DateTime? @map("anchored_at")

  snapshots         ComplianceSnapshot[]

  @@unique([tenantEmpresaId, fecha])
  @@index([fecha])
  @@index([merkleRoot])
  @@map("daily_merkle_anchors")
}

/// Registro de auditoría de acceso a certificados y documentos congelados.
/// Cada vez que un usuario autenticado consulta un certificado o descarga un
/// documento, se crea un registro inmutable.
model CertificateAccessAudit {
  id                String   @id @default(uuid()) @db.Uuid
  tenantEmpresaId   Int      @map("tenant_empresa_id")

  // Quién accedió
  userId            Int      @map("user_id")
  userEmail         String   @map("user_email") @db.VarChar(255)
  userRole          String   @map("user_role") @db.VarChar(50)

  // Qué accedió
  snapshotId        String?  @map("snapshot_id") @db.Uuid
  equipoId          Int?     @map("equipo_id")
  accessType        CCSAccessType @map("access_type")

  // Detalles
  // Para DOCUMENT_VIEW/DOWNLOAD: índice del documento, templateId, nombre
  // Para CERTIFICATE_VIEW: datos del certificado consultado
  // Para PDF_DOWNLOAD: referencia al PDF generado
  details           Json?    @map("details")

  // Marca de agua aplicada (referencia del tracking code)
  watermarkCode     String?  @map("watermark_code") @db.VarChar(32)

  // Contexto de la request
  ipAddress         String   @map("ip_address") @db.VarChar(45)
  userAgent         String?  @map("user_agent") @db.VarChar(500)

  createdAt         DateTime @default(now()) @map("created_at")

  @@index([tenantEmpresaId, userId])
  @@index([snapshotId])
  @@index([equipoId, createdAt])
  @@index([watermarkCode])
  @@map("certificate_access_audit")
}

/// Declaración jurada electrónica asociada a la carga de un documento.
/// Se crea al momento en que el usuario confirma la declaración al subir un archivo.
/// Inmutable: una vez creada, no se modifica ni se elimina.
model DocumentUploadDeclaration {
  id                String   @id @default(uuid()) @db.Uuid
  tenantEmpresaId   Int      @map("tenant_empresa_id")

  // Documento al que se asocia la declaración
  documentId        Int      @map("document_id")

  // Quién declaró
  userId            Int      @map("user_id")
  userEmail         String   @map("user_email") @db.VarChar(255)
  userRole          String   @map("user_role") @db.VarChar(50)

  // Hash SHA-256 del archivo al momento de la declaración
  // Permite vincular la declaración al archivo exacto subido
  fileHashAtDeclaration String @map("file_hash_at_declaration") @db.VarChar(64)

  // Versión del texto legal de la declaración (para auditabilidad si cambia)
  declarationVersion    String @default("1.0") @map("declaration_version") @db.VarChar(10)

  // Contexto del dispositivo (hash de IP por privacidad, no IP cruda)
  ipHash            String   @map("ip_hash") @db.VarChar(64)
  userAgent         String?  @map("user_agent") @db.VarChar(500)

  createdAt         DateTime @default(now()) @map("created_at")

  @@index([documentId])
  @@index([tenantEmpresaId, userId])
  @@map("document_upload_declarations")
}

// --- ENUMS ---

enum CCSSnapshotType {
  BASELINE              // Snapshot nocturno programado (1 por equipo por día)
  EVENT                 // Disparado por cambio de documento
  ON_DEMAND             // Generado manualmente por un usuario
}

enum CCSEstadoGlobal {
  COMPLETO              // Todos los documentos vigentes y aprobados
  INCOMPLETO            // Faltan documentos o hay rechazados
  VENCIDO               // Al menos un documento vencido
  PARCIAL               // Algunos requisitos cumplidos, otros no
}

enum CCSAnchorStatus {
  PENDING               // Pendiente de enviar a blockchain
  SUBMITTED             // Transacción enviada, esperando confirmación
  CONFIRMED             // Confirmada en blockchain
  FAILED                // Falló el envío (se reintenta)
}

enum CCSTrustLevel {
  HIGH                  // >80% docs verificados externamente o score promedio >0.85 sin alertas
  MEDIUM                // Docs con declaración jurada, sin verificación externa completa
  LOW                   // Al menos un doc con alerta activa o score <0.60
  UNVERIFIED            // Sin verificación externa ni scoring
}

enum CCSAccessType {
  CERTIFICATE_VIEW      // Consultó un certificado
  CERTIFICATE_PDF       // Descargó el PDF de un certificado
  DOCUMENT_VIEW         // Visualizó un documento congelado (con watermark)
  DOCUMENT_DOWNLOAD     // Descargó un documento congelado (con watermark)
  HASH_VERIFICATION     // Solicitó verificación de hash de un documento
  CHAIN_VERIFICATION    // Verificó la integridad de la cadena
  TIMELINE_VIEW         // Consultó la timeline de compliance
}
```

### 5.2 Estructura del JSON `equipoData`

```jsonc
{
  "chofer": {
    "id": 42,
    "dni": "24644385",
    "nombre": "NELSON LEONEL",
    "apellido": "PALMA"
  },
  "camion": {
    "id": 18,
    "patente": "AB123CD",
    "marca": "SCANIA",
    "modelo": "R500"
  },
  "acoplado": {                     // null si no tiene
    "id": 7,
    "patente": "XY789ZW",
    "tipo": "SEMI"
  },
  "empresaTransportista": {          // null si no tiene
    "id": 3,
    "cuit": "20-12345678-9",
    "razonSocial": "TRANSPORTES DEL SUR S.A."
  },
  "dador": {
    "id": 1,
    "cuit": "30-98765432-1",
    "razonSocial": "BCA LOGÍSTICA S.A."
  }
}
```

### 5.3 Estructura del JSON `documentosData`

```jsonc
[
  {
    "templateId": 5,
    "templateName": "Licencia Nacional de Conducir",
    "entityType": "CHOFER",
    "entityId": 42,
    "status": "VIGENTE",
    "documentId": 312,
    "expiresAt": "2026-06-30T00:00:00.000Z",
    "approvedAt": "2026-01-10T14:23:00.000Z",
    "approvedBy": "admin@bca.com.ar",
    "fileHash": "a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
  },
  {
    "templateId": 8,
    "templateName": "Póliza de Seguro del Vehículo",
    "entityType": "CAMION",
    "entityId": 18,
    "status": "VIGENTE",
    "documentId": 287,
    "expiresAt": "2026-03-15T00:00:00.000Z",
    "approvedAt": "2026-01-05T09:15:00.000Z",
    "approvedBy": "admin@bca.com.ar",
    "fileHash": "b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3"
  },
  {
    "templateId": 12,
    "templateName": "ART",
    "entityType": "EMPRESA_TRANSPORTISTA",
    "entityId": 3,
    "status": "FALTANTE",
    "documentId": null,
    "expiresAt": null,
    "approvedAt": null,
    "approvedBy": null,
    "fileHash": null
  }
]
```

### 5.4 Estructura del JSON `complianceData`

```jsonc
[
  {
    "clienteId": 10,
    "razonSocial": "ARCOR S.A.",
    "cuit": "30-50234151-5",
    "requirements": [
      {
        "templateId": 5,
        "templateName": "Licencia Nacional de Conducir",
        "entityType": "CHOFER",
        "obligatorio": true,
        "diasAnticipacion": 30,
        "state": "VIGENTE",
        "documentId": 312,
        "expiresAt": "2026-06-30T00:00:00.000Z"
      },
      {
        "templateId": 12,
        "templateName": "ART",
        "entityType": "EMPRESA_TRANSPORTISTA",
        "obligatorio": true,
        "diasAnticipacion": 15,
        "state": "FALTANTE",
        "documentId": null,
        "expiresAt": null
      }
    ]
  }
]
```

---

## 6. Proceso de Snapshot Diario

### 6.1 Flujo del job nocturno

```
┌──────────────────────────────────────────────────────────────┐
│                  JOB NOCTURNO (02:00 AM)                      │
│                                                                │
│  1. Obtener todos los equipos activos                          │
│     SELECT * FROM equipo WHERE activo = true                   │
│     AND estado = 'activa'                                      │
│                                                                │
│  2. Para cada equipo (en batches de 50):                       │
│     ┌────────────────────────────────────────────────────┐    │
│     │ a. Cargar datos del equipo (chofer, camion, etc.)  │    │
│     │ b. Evaluar compliance contra todos los clientes    │    │
│     │    (ComplianceService.evaluateBatchEquiposCliente)  │    │
│     │ c. Obtener documentos vigentes/aprobados           │    │
│     │ d. Calcular fileHash (SHA-256) de cada documento   │    │
│     │ e. Construir JSON canónico                         │    │
│     │ f. Calcular contentHash = SHA-256(JSON canónico)   │    │
│     │ g. Obtener previousHash del snapshot anterior      │    │
│     │ h. Firmar contentHash con RS256                    │    │
│     │ i. Generar certificateRef (UUID)                    │    │
│     │ j. Copiar documentos a bucket de compliance        │    │
│     │ k. Insertar ComplianceSnapshot en DB               │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                │
│  3. Construir Merkle tree del día                              │
│     - Hojas = contentHash de cada snapshot del día             │
│     - Calcular merkle root                                     │
│     - Guardar merkle proof para cada snapshot                  │
│     - Insertar DailyMerkleAnchor                               │
│                                                                │
│  4. Enviar merkle root a blockchain                            │
│     - Crear transacción con merkle root como dato              │
│     - Actualizar DailyMerkleAnchor con tx hash                 │
│                                                                │
│  5. Log de resultado                                           │
│     - Equipos procesados, errores, tiempo total                │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Canonicalización del JSON

Para garantizar que el hash sea reproducible, el JSON se serializa de forma canónica:

```typescript
function canonicalize(data: object): string {
  // JSON con keys ordenadas alfabéticamente, sin espacios
  return JSON.stringify(data, Object.keys(data).sort(), 0);
}

function computeContentHash(snapshot: SnapshotContent): string {
  const canonical = canonicalize({
    clientesData: snapshot.clientesData,
    complianceData: snapshot.complianceData,
    documentosData: snapshot.documentosData,
    equipoData: snapshot.equipoData,
    equipoId: snapshot.equipoId,
    fecha: snapshot.fecha,
    tenantEmpresaId: snapshot.tenantEmpresaId,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}
```

### 6.3 Firma RS256

Se reutiliza la misma clave privada RS256 usada para JWT (variable de entorno `JWT_PRIVATE_KEY`):

```typescript
function signContentHash(contentHash: string, privateKey: string): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(contentHash);
  return sign.sign(privateKey, 'base64');
}

function verifySignature(
  contentHash: string,
  signature: string,
  publicKey: string
): boolean {
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(contentHash);
  return verify.verify(publicKey, signature, 'base64');
}
```

### 6.4 Optimización: snapshots incrementales

Para evitar procesar equipos cuyo estado no cambió:

1. Comparar `contentHash` del día anterior con el calculado hoy
2. Si son iguales, crear un snapshot "heredado" que referencia al anterior:
   - Se almacena igualmente (para la cadena de hashes)
   - Se marca con un flag `inherited: true` para no duplicar las copias congeladas
   - Las copias congeladas apuntan al mismo path del snapshot original

Esto reduce drásticamente el I/O de MinIO: solo se copian documentos cuando algo cambió.

### 6.5 Snapshots por evento (intra-día)

#### Problema

El snapshot baseline se genera a las 03:00 AM. Pero los documentos cambian durante el día:

```
03:00  Baseline → Equipo 47: INCOMPLETO (falta ART)
10:15  Se aprueba ART → Equipo 47 ahora está COMPLETO
14:30  Se vence Seguro → Equipo 47 ahora está VENCIDO
```

Si alguien pregunta "¿el equipo 47 estaba compliant a las 12:00?", el baseline de las 03:00 dice "INCOMPLETO", pero la realidad a las 12:00 era "COMPLETO". Sin snapshots por evento, la certificación miente.

#### Solución: event-driven snapshots

Cada vez que un documento cambia de estado en el sistema (aprobación, rechazo, vencimiento, nueva versión), se genera automáticamente un snapshot del equipo afectado. Este snapshot:

- Tiene `snapshotType: EVENT`
- Registra el `triggerEvent` (ej: `DOCUMENT_APPROVED`) y el `triggerDocumentId`
- Lleva un `daySequence` incremental (0 = baseline, 1 = primer evento del día, 2 = segundo, etc.)
- Se firma y encadena igual que un baseline
- **No** genera copia congelada de documentos (solo el baseline lo hace, para controlar almacenamiento)

#### Eventos que disparan snapshot

| Evento | triggerEvent | Impacto en compliance |
|---|---|---|
| Documento aprobado | `DOCUMENT_APPROVED` | Puede pasar de INCOMPLETO a COMPLETO |
| Documento rechazado | `DOCUMENT_REJECTED` | Puede pasar de COMPLETO a INCOMPLETO |
| Documento vencido | `DOCUMENT_EXPIRED` | Puede pasar de COMPLETO a VENCIDO |
| Documento deprecado (nueva versión) | `DOCUMENT_DEPRECATED` | Puede pasar a INCOMPLETO si la nueva versión no está aprobada |
| Nuevo documento subido y aprobado | `DOCUMENT_UPLOADED_APPROVED` | Puede pasar de INCOMPLETO a COMPLETO |

#### Integración con el flujo existente

El sistema ya tiene event handlers que se disparan cuando un documento cambia (ver `DocumentEventHandlers.onDocumentApproved()`). Se agrega un hook al final de cada handler:

```typescript
// En el event handler existente de aprobación de documentos
async function onDocumentApproved(document: Document): Promise<void> {
  // ... lógica existente (notificaciones, re-evaluación de equipos) ...

  // Nuevo: generar snapshot de compliance para equipos afectados
  const affectedEquipos = await getEquiposForEntity(
    document.entityType,
    document.entityId,
    document.dadorCargaId
  );

  for (const equipo of affectedEquipos) {
    await ComplianceCertificationService.generateEventSnapshot(
      equipo.id,
      'DOCUMENT_APPROVED',
      document.id
    );
  }
}
```

#### Throttling

Para evitar snapshots excesivos (ej: carga masiva de 50 documentos en 10 minutos), se aplica un debounce:

- **Ventana de debounce**: 5 minutos por equipo
- Si llegan múltiples eventos para el mismo equipo dentro de la ventana, se genera **un solo** snapshot al cierre de la ventana, con el estado consolidado
- El `triggerEvent` registra `BATCH_UPDATE` y `triggerDocumentId` queda null
- Implementación: cola en Redis con TTL de 5 minutos por equipo

```typescript
async function scheduleEventSnapshot(
  equipoId: number,
  event: string,
  documentId: number
): Promise<void> {
  const key = `ccs:pending:${equipoId}`;
  const existing = await redis.get(key);

  if (existing) {
    // Ya hay un snapshot pendiente para este equipo, 
    // actualizar metadata pero no duplicar
    const meta = JSON.parse(existing);
    meta.events.push({ event, documentId, at: new Date() });
    await redis.set(key, JSON.stringify(meta), 'EX', 300);
    return;
  }

  // Primer evento: programar snapshot en 5 minutos
  await redis.set(key, JSON.stringify({
    equipoId,
    events: [{ event, documentId, at: new Date() }],
    scheduledAt: new Date()
  }), 'EX', 300);

  // Programar ejecución
  setTimeout(() => processEventSnapshot(equipoId), 5 * 60 * 1000);
}
```

#### Volumen estimado de snapshots por evento

| Escenario | Eventos/día/equipo | Con 1000 equipos | Impacto DB |
|---|---|---|---|
| Operación normal | 0-2 | ~500 snapshots extra/día | Bajo |
| Carga masiva de docs | 1 (debounced) | ~200 snapshots extra/día | Bajo |
| Renovación trimestral | 3-5 | ~2000 snapshots extra/día | Moderado (pico) |
| **Promedio estimado** | **~1** | **~1000 extra/día** | **~2 KB x 1000 = 2 MB/día** |

### 6.6 Resolución temporal: ¿qué snapshot aplica a una hora dada?

Cuando se pregunta "¿estaba compliant el equipo X a las HH:MM del día DD/MM/YYYY?", el sistema busca el **snapshot más reciente que no sea posterior** a ese momento:

```typescript
async function getSnapshotAtTime(
  equipoId: number,
  targetDateTime: Date
): Promise<ComplianceSnapshot | null> {
  return prisma.complianceSnapshot.findFirst({
    where: {
      equipoId,
      timestamp: { lte: targetDateTime },
    },
    orderBy: { timestamp: 'desc' },
  });
}
```

#### Ejemplo de resolución temporal

```
Equipo 47, 15 de enero de 2026:

 03:00  [BASELINE seq=0]  → INCOMPLETO (falta ART)
 10:15  [EVENT    seq=1]  → COMPLETO   (ART aprobada)
 14:30  [EVENT    seq=2]  → VENCIDO    (Seguro venció)

Consultas:
 "¿Compliance a las 02:00?"  → Snapshot del día anterior (último disponible antes de las 02:00)
 "¿Compliance a las 05:00?"  → BASELINE seq=0 → INCOMPLETO
 "¿Compliance a las 10:15?"  → EVENT seq=1 → COMPLETO
 "¿Compliance a las 12:00?"  → EVENT seq=1 → COMPLETO (último antes de las 12:00)
 "¿Compliance a las 15:00?"  → EVENT seq=2 → VENCIDO
 "¿Compliance a las 23:59?"  → EVENT seq=2 → VENCIDO
```

#### Precisión y garantía

- **Granularidad mínima**: 5 minutos (por el debounce)
- **Garantía**: entre dos snapshots consecutivos, el estado de compliance no cambió (porque cualquier cambio genera un nuevo snapshot)
- **Zona horaria**: todos los timestamps en UTC; la conversión a zona local (America/Argentina/Buenos_Aires) se hace en la capa de presentación

### 6.7 Consolidación nocturna y Merkle tree

El job nocturno ahora tiene una función adicional: consolidar **todos** los snapshots del día (baseline + eventos) en el Merkle tree diario.

```
Job nocturno (03:00 AM del día D+1):

1. Generar BASELINE para el día D+1 (como antes)

2. Recopilar TODOS los snapshots del día D (baseline + eventos)
   SELECT * FROM compliance_snapshots
   WHERE fecha = D
   ORDER BY equipo_id, day_sequence

3. Construir Merkle tree con TODOS los snapshots del día D
   - Hojas = contentHash de cada snapshot (baseline y eventos)
   - 1000 equipos × ~2 snapshots promedio = ~2000 hojas

4. Guardar merkle proof en cada snapshot del día D

5. Crear DailyMerkleAnchor para día D

6. Anclar en blockchain
```

De esta manera, **cada snapshot por evento también queda anclado en blockchain**, no solo los baselines.

#### Diagrama temporal completo

```
Día 15/01:
  03:00  Job genera BASELINEs del día 15 + Merkle del día 14 + anclaje blockchain día 14
  10:15  Evento → snapshot EVENT para equipo 47
  14:30  Evento → snapshot EVENT para equipo 47
  18:00  Evento → snapshot EVENT para equipo 12

Día 16/01:
  03:00  Job genera BASELINEs del día 16 + Merkle del día 15 (incluye 4 snapshots extra) + anclaje
```

---

## 7. Cadena de Hashes (Hash Chain)

### 7.1 Concepto

Cada snapshot de un equipo incluye el `contentHash` del snapshot anterior de ese **mismo equipo** (sin importar el tipo). Esto crea una cadena continua por equipo que incluye baselines y eventos:

```
Equipo 47, Día 1 03:00 BASELINE:  contentHash_1  ←  previousHash: null
Equipo 47, Día 1 10:15 EVENT:     contentHash_2  ←  previousHash: contentHash_1
Equipo 47, Día 1 14:30 EVENT:     contentHash_3  ←  previousHash: contentHash_2
Equipo 47, Día 2 03:00 BASELINE:  contentHash_4  ←  previousHash: contentHash_3
```

Alterar cualquier snapshot invalida toda la cadena posterior: cambiar el contenido del Día 2 cambia `contentHash_2`, lo que significa que `previousHash` del Día 3 ya no coincide.

### 7.2 Verificación de la cadena

```typescript
async function verifyChain(equipoId: number): Promise<{
  valid: boolean;
  brokenAt?: string; // fecha donde se rompió
}> {
  const snapshots = await prisma.complianceSnapshot.findMany({
    where: { equipoId },
    orderBy: { fecha: 'asc' },
  });

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];

    // Verificar que el contentHash coincide con el contenido
    const recalculated = computeContentHash({
      equipoId: snap.equipoId,
      tenantEmpresaId: snap.tenantEmpresaId,
      fecha: snap.fecha,
      equipoData: snap.equipoData,
      documentosData: snap.documentosData,
      clientesData: snap.clientesData,
      complianceData: snap.complianceData,
    });
    if (recalculated !== snap.contentHash) {
      return { valid: false, brokenAt: snap.fecha.toISOString() };
    }

    // Verificar encadenamiento
    if (i === 0 && snap.previousHash !== null) {
      return { valid: false, brokenAt: snap.fecha.toISOString() };
    }
    if (i > 0 && snap.previousHash !== snapshots[i - 1].contentHash) {
      return { valid: false, brokenAt: snap.fecha.toISOString() };
    }

    // Verificar firma
    const signatureValid = verifySignature(
      snap.contentHash,
      snap.signature,
      publicKey
    );
    if (!signatureValid) {
      return { valid: false, brokenAt: snap.fecha.toISOString() };
    }
  }

  return { valid: true };
}
```

---

## 8. Anclaje en Blockchain

### 8.1 Merkle Tree diario

Todos los snapshots de un día se combinan en un Merkle tree:

```
                    Merkle Root
                   /            \
              H(1,2)            H(3,4)
             /      \          /      \
        Hash_1    Hash_2   Hash_3    Hash_4
        (Eq.1)    (Eq.2)  (Eq.3)   (Eq.4)
```

El Merkle root es un único hash de 32 bytes que representa todos los snapshots del día.

### 8.2 Merkle Proof (proof-of-inclusion)

Para demostrar que un snapshot específico está incluido en el Merkle root, se necesitan solo `log2(N)` hashes adicionales. Con 1000 equipos, son solo 10 hashes.

```typescript
interface MerkleProof {
  leaf: string;          // contentHash del snapshot
  index: number;         // posición en el tree
  siblings: string[];    // hashes hermanos necesarios para recalcular root
  root: string;          // Merkle root esperado
}

function verifyMerkleProof(proof: MerkleProof): boolean {
  let hash = proof.leaf;
  let idx = proof.index;
  for (const sibling of proof.siblings) {
    if (idx % 2 === 0) {
      hash = sha256(hash + sibling);
    } else {
      hash = sha256(sibling + hash);
    }
    idx = Math.floor(idx / 2);
  }
  return hash === proof.root;
}
```

### 8.3 Publicación en blockchain

**Red recomendada**: Polygon (PoS)

| Criterio | Polygon | Bitcoin | Ethereum |
|---|---|---|---|
| Costo por transacción | ~$0.01 | ~$0.50-$2.00 | ~$1.00-$10.00 |
| Tiempo de confirmación | ~2 segundos | ~10 minutos | ~12 segundos |
| Permanencia | Alta | Máxima | Alta |
| Facilidad de integración | Alta (EVM) | Media (OP_RETURN) | Alta (EVM) |

**Implementación con Polygon**:

```typescript
// Contrato minimalista para anclar hashes
// Solidity
contract ComplianceAnchor {
    event Anchored(bytes32 merkleRoot, uint256 date, uint256 snapshotCount);

    function anchor(
        bytes32 merkleRoot,
        uint256 date,
        uint256 snapshotCount
    ) external {
        emit Anchored(merkleRoot, date, snapshotCount);
    }
}
```

El evento `Anchored` queda registrado permanentemente en el bloque. Cualquiera puede verificarlo consultando el contrato en un explorador público (Polygonscan).

**Alternativa sin contrato**: Enviar el Merkle root como `data` en una transacción común de Polygon a una dirección conocida (ej: la propia). El dato queda en el bloque permanentemente.

### 8.4 Flujo de anclaje

```
02:00 - Job nocturno genera snapshots
02:05 - Se construye Merkle tree, se calcula root
02:06 - Se envía transacción a Polygon con el Merkle root
02:08 - Transacción confirmada (2-3 bloques)
02:08 - Se actualiza DailyMerkleAnchor con txHash, blockNumber, explorerUrl
```

### 8.5 Variables de entorno requeridas

```env
# Blockchain Anchor
CCS_BLOCKCHAIN_NETWORK=polygon
CCS_BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
CCS_ANCHOR_WALLET_PRIVATE_KEY=0x...   # Wallet con MATIC para gas
CCS_ANCHOR_CONTRACT_ADDRESS=0x...     # Dirección del contrato (o wallet destino)
CCS_ANCHOR_ENABLED=true               # Permite desactivar en dev/staging
```

---

## 9. Copia Congelada de Documentos (Nivel 3)

### 9.0 Relación entre copias congeladas y tipos de snapshot

| Tipo de snapshot | ¿Congela documentos? | Motivo |
|---|---|---|
| **BASELINE** | Sí | Es el snapshot de referencia del día; contiene la evidencia completa |
| **EVENT** | Solo el documento que cambió | Congela el documento nuevo/modificado que disparó el evento, vinculándolo al snapshot por evento. El resto de documentos se referencian desde el último baseline |
| **ON_DEMAND** | Sí (completo) | Es un certificado explícito solicitado por un usuario |

Los snapshots EVENT almacenan en `frozenDocsHashes` los hashes de **todos** los documentos (para verificación), pero solo copian físicamente el documento que cambió. Los demás hashes apuntan a las copias del baseline más reciente.

### 9.1 Estructura en MinIO

```
compliance-snapshots-t{tenantId}/
  └── {YYYY-MM-DD}/
      └── equipo-{equipoId}/
          ├── certificado.json            # Snapshot completo firmado
          ├── certificado.json.sig        # Firma detached
          └── documentos/
              ├── CHOFER_24644385_licencia_nacional.pdf
              ├── CAMION_AB123CD_seguro_vehiculo.pdf
              ├── CAMION_AB123CD_vtv.pdf
              ├── ACOPLADO_XY789ZW_vtv.pdf
              └── EMPRESA_20123456789_art.pdf
```

### 9.2 Nomenclatura de archivos congelados

```
{ENTITY_TYPE}_{IDENTIFIER}_{TEMPLATE_NAME_NORMALIZADO}.pdf
```

Ejemplos:
- `CHOFER_24644385_licencia_nacional_de_conducir.pdf`
- `CAMION_AB123CD_poliza_de_seguro.pdf`
- `EMPRESA_20123456789_art.pdf`

### 9.3 Hash de archivos

Cada archivo congelado se hashea con SHA-256. El hash se almacena en `frozenDocsHashes` del snapshot:

```jsonc
{
  "CHOFER_24644385_licencia_nacional.pdf": "a3f2b8c1...",
  "CAMION_AB123CD_seguro_vehiculo.pdf": "b4c3d2e1...",
  "CAMION_AB123CD_vtv.pdf": "c5d4e3f2..."
}
```

Esto permite verificar que el archivo descargado coincide exactamente con el que existía al momento de la certificación.

### 9.4 Optimización: deduplicación

Si el documento no cambió respecto al snapshot anterior (mismo `fileHash`):
- No se copia físicamente el archivo
- Se almacena un symlink o referencia al snapshot anterior
- El `frozenDocsHashes` incluye el hash y una referencia: `{ hash: "...", ref: "2026-01-14/equipo-47/documentos/..." }`

Esto reduce el almacenamiento en ~80% (la mayoría de los documentos no cambian día a día).

### 9.5 Política de retención

- **Mínimo**: 2 años (requisito regulatorio transporte de cargas)
- **Recomendado**: 5 años
- Configurable por tenant via `SystemConfig`
- MinIO lifecycle policy para limpieza automática de snapshots antiguos

---

## 10. Consulta de Certificados (Acceso Autenticado)

> **Principio fundamental**: No existe ningún endpoint público de consulta de certificados. Todo acceso requiere autenticación JWT y se filtra por rol y permisos. La trazabilidad es completa: cada consulta queda registrada con la identidad del usuario.

### 10.1 Modelo de acceso por rol

| Rol | Qué puede ver | Qué puede descargar | Restricción |
|---|---|---|---|
| **SUPERADMIN** | Todos los certificados de todos los tenants | Todos los documentos, PDFs | Sin restricción |
| **ADMIN / ADMIN_INTERNO** | Todos los certificados de su tenant | Todos los documentos, PDFs | Solo su `tenantEmpresaId` |
| **DADOR_DE_CARGA** | Certificados de equipos de su dador | Documentos, PDFs | Solo sus equipos (`dadorCargaId`) |
| **CLIENTE** | Certificados de equipos que tiene asignados | Documentos con marca de agua | Solo equipos donde `equipoCliente.clienteId` = su clienteId |
| **TRANSPORTISTA** | Estado documental de sus propios equipos | Sus propios documentos | No accede a certificados formales del CCS |
| **CHOFER** | Estado de sus propios documentos | Sus propios documentos | No accede a certificados del CCS |

### 10.2 Flujo de consulta del cliente

```
┌────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Cliente        │       │  Portal           │       │  Backend          │
│  (autenticado)  │       │  (React)          │       │  (Express + CCS)  │
│                 │       │                   │       │                   │
│  1. Login       │──────▶│                   │──────▶│ JWT + role check  │
│                 │◀──────│                   │◀──────│ → token válido    │
│                 │       │                   │       │                   │
│  2. "Mis        │──────▶│ GET /equipos      │──────▶│ Filtra por        │
│     Equipos"    │◀──────│  ?clienteId=X     │◀──────│ equipoCliente     │
│                 │       │                   │       │ → solo SUS equipos│
│                 │       │                   │       │                   │
│  3. Equipo 19   │──────▶│ GET /compliance/  │──────▶│ Verifica permiso  │
│     → Certs     │◀──────│  equipos/19/certs │◀──────│ → lista de certs  │
│                 │       │                   │       │                   │
│  4. Ver cert    │──────▶│ GET /compliance/  │──────▶│ Verifica firma    │
│     detalle     │◀──────│  snapshots/:id    │◀──────│ + cadena + merkle │
│                 │       │                   │       │ + blockchain      │
│                 │       │                   │       │ → cert verificado │
│                 │       │                   │       │                   │
│  5. Ver doc     │──────▶│ GET /compliance/  │──────▶│ 1. Verifica perm. │
│     (Póliza)    │◀──────│  snapshots/:id/   │◀──────│ 2. Obtiene copia  │
│                 │       │  docs/:idx        │       │    congelada      │
│     (con marca  │       │                   │       │ 3. Aplica marca   │
│      de agua)   │       │                   │       │    de agua        │
│                 │       │                   │       │ 4. Registra audit │
│                 │       │                   │       │ 5. Retorna doc    │
└────────────────┘       └──────────────────┘       └──────────────────┘
```

### 10.3 Qué ve el cliente al consultar un certificado

**Vista de lista (pestaña "Certificados de Compliance" en la página del equipo):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Certificados de Compliance - Equipo 19 - Prosil S.A.            │
│                                                                   │
│  Fecha/Hora          Tipo       Estado       Confianza  Blockchain│
│  ─────────────────────────────────────────────────────────────────│
│  16/02/26 03:00     BASELINE   ● COMPLETO   🟢 HIGH    ✅ Anclado│
│  15/02/26 14:30     EVENTO     ● VENCIDO    🟢 HIGH    ✅ Anclado│
│  15/02/26 10:15     EVENTO     ● COMPLETO   🟢 HIGH    ✅ Anclado│
│  15/02/26 03:00     BASELINE   ● INCOMPLETO 🟡 MEDIUM  ✅ Anclado│
│  14/02/26 03:00     BASELINE   ● COMPLETO   🟢 HIGH    ✅ Anclado│
│                                                                   │
│  [◀ Anterior]  Página 1 de 12  [Siguiente ▶]                    │
└──────────────────────────────────────────────────────────────────┘
```

**Vista de detalle (al hacer click en un certificado):**

Sección 1 — **Verificación criptográfica** (prominente, lo primero):
- Firma RS256: Válida / Inválida
- Cadena de integridad: Íntegra / Rota (con posición en la cadena)
- Anclaje blockchain: Confirmado en Polygon, bloque #45,231,789 (link a Polygonscan)
- Merkle proof: Válido (incluido en el root anclado)
- Trust Level: HIGH / MEDIUM / LOW / UNVERIFIED (con tooltip explicando los criterios)

Sección 2 — **Datos del equipo** (congelados al momento del certificado):
- Chofer, Camión, Acoplado, Empresa Transportista (con identificadores)

Sección 3 — **Tabla de documentos por entidad**:
- Cada documento con: nombre, estado, vencimiento, verificación externa (si aplica), botón "Ver documento"
- Columna adicional: "Declaración jurada" (checkmark si el cargador firmó la declaración)

Sección 4 — **Timeline del día** (si es un equipo con múltiples eventos):
- Muestra la evolución intra-día de la compliance con cada transición

Sección 5 — **Acciones**:
- "Descargar PDF" (genera PDF autoverificable, registra en audit)
- "Descargar Excel" (resumen tabular)
- "Verificar integridad de cadena" (ejecuta verificación on-demand)

### 10.4 Servicio de documentos con marca de agua

Cada vez que un documento congelado se sirve a un usuario, se aplica una marca de agua dinámica en tiempo real. **El archivo original en MinIO nunca se modifica.**

#### Marca de agua visible

Se superpone en diagonal sobre todas las páginas del documento:

```
Línea 1: "CONSULTADO POR: YPF S.A. (juan.perez@ypf.com)"
Línea 2: "FECHA: 16/02/2026 15:30:42 UTC"
Línea 3: "TRACKING: WM-A7K92M"
```

- Opacidad: 15-20% (legible sin impedir lectura del contenido)
- Color: gris oscuro sobre fondo claro, o gris claro sobre fondo oscuro
- Rotación: -30° en diagonal
- Repetición: cada ~200px para cubrir toda la superficie

#### Marca de agua invisible (esteganográfica)

Adicionalmente, se embeben datos invisibles:
- Bits de información codificados en los valores menos significativos de los píxeles (LSB)
- Payload: userId + timestamp + snapshotId (suficiente para identificar la fuente de una fuga)
- Resistente a: recompresión JPEG moderada, redimensionamiento, impresión y re-escaneo parcial
- El código de tracking `WM-A7K92M` se registra en `CertificateAccessAudit.watermarkCode`

#### Excepción para verificación de hash

Un endpoint especial sirve el documento **sin marca de agua** exclusivamente para que el usuario pueda verificar que el SHA-256 coincide con el registrado en el certificado. Este endpoint:
- Requiere autenticación
- No permite descarga directa (muestra solo el hash calculado del archivo en tiempo real)
- Registra el acceso como `HASH_VERIFICATION` en el audit

### 10.5 Acceso para terceros externos (sin cuenta en el sistema)

Cuando el dador necesita presentar un certificado ante un regulador, aseguradora, juez u otro tercero que no tiene cuenta en BCA:

**Mecanismo: PDF autoverificable offline** (ver sección 11 para detalle del PDF)

1. El dador genera y descarga el PDF desde su portal autenticado
2. El PDF contiene todos los datos del certificado + datos criptográficos completos
3. El dador envía el PDF al tercero por el canal que prefiera (email, impreso, etc.)
4. El tercero puede verificar **sin acceder al sistema BCA**:
   - Toma los datos criptográficos del PDF
   - Verifica la firma RS256 con la clave pública de BCA (publicada en el sitio web corporativo)
   - Verifica el Merkle proof recalculando el root
   - Verifica el root en Polygonscan (blockchain pública, accesible sin credenciales)
5. Si el tercero necesita ver los documentos originales, el dador los adjunta al envío (con su marca de agua de "Descargado por [dador]")

**El PDF tiene un QR** que apunta a la URL del certificado en el portal: `https://bca.dominio.com/documentos/certificados/{certificateRef}`. Si alguien escanea el QR:
- Sin login: ve la pantalla de login
- Con login y con permiso: ve el certificado completo
- Con login pero sin permiso: ve "Acceso denegado"

**Este diseño garantiza** que la información confidencial nunca se expone sin autenticación, pero que la verificación criptográfica (hashes, firma, blockchain) es siempre posible de forma independiente porque se basa en criptografía de clave pública y blockchain, ambas verificables sin confiar en el sistema BCA.

---

## 11. Generación de Certificados PDF (autoverificables)

El PDF es el **único artefacto que sale del perímetro autenticado**. Por eso, debe ser autosuficiente para verificación: contiene toda la información criptográfica necesaria para que un tercero sin acceso al sistema pueda validar su autenticidad de forma independiente.

### 11.1 Contenido del PDF

```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│  ╔════════════════════════════════════════════════════╗   │
│  ║  CERTIFICADO DE COMPLIANCE DOCUMENTAL              ║   │
│  ║  Sistema BCA - Gestión de Transporte               ║   │
│  ╚════════════════════════════════════════════════════╝   │
│                                                            │
│  Fecha de certificación: 15 de enero de 2026              │
│  Hora exacta: 10:15:00 UTC (07:15:00 Argentina)          │
│  Certificado N°: CCS-2026-0115-00047                      │
│  Tipo: EVENTO (ART aprobada)                              │
│  Nivel de confianza: ALTO                                 │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ EQUIPO                                            │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ Chofer:      NELSON LEONEL PALMA                  │    │
│  │              DNI 24.644.385                       │    │
│  │ Camión:      Patente AB 123 CD                    │    │
│  │              SCANIA R500                           │    │
│  │ Acoplado:    Patente XY 789 ZW                    │    │
│  │              SEMI                                  │    │
│  │ Transportista: TRANSPORTES DEL SUR S.A.           │    │
│  │              CUIT 20-12345678-9                    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ ESTADO DE DOCUMENTACIÓN              ● COMPLETO   │    │
│  ├───────────────────────┬────────┬──────┬──────────┤    │
│  │ Documento             │ Estado │Vence │Verif.ext.│    │
│  ├───────────────────────┼────────┼──────┼──────────┤    │
│  │ Licencia de Conducir  │ ✅ OK  │30/06 │ -        │    │
│  │ Seguro del Vehículo   │ ✅ OK  │15/03 │SSN ✅    │    │
│  │ VTV Camión            │ ✅ OK  │20/08 │ -        │    │
│  │ VTV Acoplado          │ ✅ OK  │12/09 │ -        │    │
│  │ ART                   │ ✅ OK  │01/04 │ -        │    │
│  │ Constancia ARCA       │ ✅ OK  │ -    │ARCA ✅   │    │
│  └───────────────────────┴────────┴──────┴──────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ VERIFICACIÓN CRIPTOGRÁFICA                        │    │
│  ├──────────────────────────────────────────────────┤    │
│  │ Content Hash: a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5  │    │
│  │               d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1  │    │
│  │ Previous Hash: b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9 │    │
│  │               f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3  │    │
│  │ Firma RS256: [base64, primera línea visible,      │    │
│  │               completa en Anexo A]                │    │
│  │                                                    │    │
│  │ Merkle Root:  c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0  │    │
│  │               a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4  │    │
│  │ Merkle Index: 47 de 1523 snapshots                │    │
│  │                                                    │    │
│  │ Blockchain:   Polygon (Mainnet)                    │    │
│  │ TX Hash:      0x1234567890abcdef...               │    │
│  │ Bloque:       #45,231,789                          │    │
│  │ Explorer:     polygonscan.com/tx/0x1234...         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ CÓMO VERIFICAR ESTE CERTIFICADO SIN ACCESO AL    │    │
│  │ SISTEMA BCA (verificación independiente):         │    │
│  │                                                    │    │
│  │ 1. Obtenga la clave pública RS256 de BCA desde:   │    │
│  │    https://bca.dominio.com/.well-known/ccs-key    │    │
│  │                                                    │    │
│  │ 2. Recalcule el Content Hash:                      │    │
│  │    SHA-256 de los datos canónicos (ver Anexo B)    │    │
│  │                                                    │    │
│  │ 3. Verifique la firma RS256 del Content Hash       │    │
│  │    con la clave pública                            │    │
│  │                                                    │    │
│  │ 4. Verifique el Merkle proof (Anexo C) para        │    │
│  │    confirmar inclusión en el Merkle Root            │    │
│  │                                                    │    │
│  │ 5. Busque la transacción en Polygonscan y          │    │
│  │    confirme que el Merkle Root coincide             │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────┐  Acceso al certificado en el portal:            │
│  │ [QR] │  https://bca.dominio.com/documentos/            │
│  │      │  certificados/550e8400-e29b-41d4-a716           │
│  └──────┘  (requiere credenciales de acceso)              │
│                                                            │
│  ANEXO A: Firma RS256 completa (base64)                   │
│  ANEXO B: Datos canónicos (JSON serializado)              │
│  ANEXO C: Merkle proof (lista de hashes hermanos)         │
│                                                            │
│  Generado por: admin@bca.com (ADMIN_INTERNO)              │
│  Fecha de generación del PDF: 16/02/2026 15:30 UTC       │
│  Marca de agua: WM-B8J43N                                 │
│                                                            │
│  Este certificado fue generado por el sistema BCA y       │
│  firmado digitalmente. Los datos están anclados en la     │
│  blockchain de Polygon. La alteración de cualquier dato   │
│  invalida la firma RS256 y el Merkle proof.               │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

### 11.2 Anexos del PDF

El PDF incluye 3 anexos técnicos que permiten verificación offline completa:

**Anexo A** — Firma RS256 completa en base64 (puede ser de varios cientos de caracteres). Un auditor técnico la copia y la verifica con `openssl dgst -sha256 -verify pubkey.pem -signature sig.bin data.bin`.

**Anexo B** — JSON canónico completo del snapshot (los mismos datos que se hashearon para producir el Content Hash). Esto permite a un tercero recalcular el hash y verificar que coincide. El JSON está formateado con indentación para legibilidad pero se incluye también la versión canónica (una línea, keys ordenadas) como texto monoespaciado.

**Anexo C** — Merkle proof: lista ordenada de hashes hermanos con indicación de posición (izquierda/derecha). Siguiendo el algoritmo estándar, se puede recalcular el Merkle root a partir del Content Hash y estos hashes.

### 11.3 Marca de agua en el PDF

El PDF de certificado se genera con marca de agua visible que identifica a quien lo generó:
- "Generado por: [nombre del usuario] ([email]) - [fecha/hora]"
- Código de tracking registrado en `CertificateAccessAudit`
- Si el PDF se filtra, se puede rastrear hasta el usuario que lo generó

### 11.4 Librería de generación

Se utilizará `pdfkit` (ya presente en el proyecto) para generar los certificados PDF. Los PDFs se almacenan en el bucket de compliance junto a las copias congeladas. Cada generación de PDF queda registrada en `CertificateAccessAudit` con `accessType: CERTIFICATE_PDF`.

---

## 12. API Endpoints

> **Todos los endpoints requieren autenticación JWT** (`Authorization: Bearer <token>`). Los datos se filtran según el rol del usuario autenticado y sus permisos (tenant, dador, cliente).

### 12.1 Endpoints de certificados (Dador / Admin)

```
# Generar certificado bajo demanda para un equipo y fecha/hora
POST /api/docs/compliance/certificates
Body: { equipoId: number, fecha: string, hora?: string }
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA
# Si hora es null, se usa el último snapshot del día (23:59:59)
# Si hora es "10:30", se busca el snapshot vigente a las 10:30
Response: { certificateId, certificateRef, pdfUrl, snapshotTimestamp }

# Generar certificado de flota (múltiples equipos, una fecha)
POST /api/docs/compliance/certificates/fleet
Body: { equipoIds: number[], fecha: string, clienteId?: number }
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA
Response: { certificates: Array<{ equipoId, certificateId, certificateRef }> }

# Listar certificados / snapshots
GET /api/docs/compliance/certificates?equipoId=&fechaDesde=&fechaHasta=&page=&limit=
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# Para CLIENTE: filtro automático por sus equipos asignados
Response: { certificates: [...], total, page, totalPages }
```

### 12.2 Endpoints de consulta (todos los roles autenticados)

```
# Ver historial de compliance de un equipo (incluyendo eventos intra-día)
GET /api/docs/compliance/history/:equipoId?fechaDesde=&fechaHasta=&includeEvents=true
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# CLIENTE: solo si equipoCliente.clienteId coincide
# Con includeEvents=false (default), solo devuelve baselines
# Con includeEvents=true, devuelve baselines + eventos (timeline completa)
Response: { snapshots: Array<{ fecha, timestamp, snapshotType, triggerEvent?, estadoGlobal, trustLevel, contentHash }> }

# Ver detalle de un snapshot / certificado (incluye verificación criptográfica en vivo)
GET /api/docs/compliance/snapshots/:id
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# Ejecuta verificación: firma RS256, hash chain, merkle proof, blockchain
Response: { snapshot: { ... }, verification: { firmaValida, cadenaIntegra, merkleProofValido, blockchainAnclado, blockchainTx, explorerUrl } }

# Verificar integridad de la cadena de un equipo
GET /api/docs/compliance/chain/:equipoId/verify
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO
Response: { valid: boolean, chainLength: number, brokenAt?: string }

# Estado del anclaje blockchain del día
GET /api/docs/compliance/anchor/:fecha
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO
Response: { merkleRoot, anchorStatus, transactionHash, explorerUrl, snapshotCount }
```

### 12.3 Endpoints de documentos congelados (con marca de agua)

```
# Ver/descargar documento congelado de un snapshot (con marca de agua visible + invisible)
GET /api/docs/compliance/snapshots/:snapshotId/docs/:index
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# CLIENTE: solo si tiene permiso sobre el equipo
# Aplica marca de agua dinámica con identidad del usuario
# Registra acceso en CertificateAccessAudit
Response: application/pdf (con marca de agua)

# Verificar hash de un documento (sin descargar, sin marca de agua)
POST /api/docs/compliance/snapshots/:snapshotId/docs/:index/verify-hash
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# Calcula SHA-256 del archivo original en MinIO y lo compara con el registrado
Response: { matches: boolean, expectedHash: string, calculatedHash: string }

# Descargar PDF del certificado (con marca de agua del descargador)
GET /api/docs/compliance/snapshots/:snapshotId/pdf
Roles: SUPERADMIN, ADMIN, ADMIN_INTERNO, DADOR_DE_CARGA, CLIENTE
# Genera PDF autoverificable con anexos criptográficos
# Aplica marca de agua identificando al descargador
# Registra acceso en CertificateAccessAudit
Response: application/pdf
```

### 12.4 Endpoint de clave pública (único endpoint sin autenticación)

```
# Obtener la clave pública RS256 del CCS para verificación offline de firmas
GET /api/docs/compliance/.well-known/ccs-key
# Sin autenticación - la clave pública es información pública por definición
# Devuelve la clave en formato PEM y JWK
Response: { pem: string, jwk: object, kid: string, algorithm: "RS256" }
```

Este es el **único endpoint que no requiere autenticación**, y solo expone la clave pública (que por definición es pública y no compromete la seguridad). Es necesario para que terceros externos puedan verificar firmas de los PDFs autoverificables.

---

## 13. Scheduling y Jobs

### 13.1 Job de snapshot diario

```typescript
// Ejecutar a las 02:00 AM (cron)
// Configurable via COMPLIANCE_SNAPSHOT_CRON=0 2 * * *

async function dailyComplianceSnapshotJob(): Promise<void> {
  const today = startOfDay(new Date());

  // 1. Obtener equipos activos
  const equipos = await getActiveEquipos();

  // 2. Procesar en batches de 50
  for (const batch of chunk(equipos, 50)) {
    await processBatch(batch, today);
  }

  // 3. Construir Merkle tree del día
  const { root, proofs } = await buildDailyMerkleTree(today);

  // 4. Guardar proofs en cada snapshot
  await saveMerkleProofs(today, proofs);

  // 5. Crear DailyMerkleAnchor
  const anchor = await createDailyAnchor(today, root, equipos.length);

  // 6. Anclar en blockchain (async, puede reintentar)
  await anchorToBlockchain(anchor);
}
```

### 13.2 Job de reintento de anclaje

```
// Cada hora, verificar anclajes pendientes o fallidos
// COMPLIANCE_ANCHOR_RETRY_CRON=0 * * * *

async function retryPendingAnchors(): Promise<void> {
  const pending = await prisma.dailyMerkleAnchor.findMany({
    where: { anchorStatus: { in: ['PENDING', 'FAILED'] } },
    orderBy: { fecha: 'asc' },
  });

  for (const anchor of pending) {
    await anchorToBlockchain(anchor);
  }
}
```

### 13.3 Job de verificación de integridad

```
// Semanal: verificar integridad de las cadenas
// COMPLIANCE_INTEGRITY_CHECK_CRON=0 4 * * 0

async function weeklyIntegrityCheck(): Promise<void> {
  // Verificar una muestra aleatoria del 10% de los equipos
  // Reportar cualquier inconsistencia via notificación
}
```

---

## 14. Estimaciones de Almacenamiento

### 14.1 PostgreSQL (snapshots)

| Componente | Tamaño por registro | Registros/día (1000 eq) | Anual |
|---|---|---|---|
| ComplianceSnapshot (baselines) | ~2 KB | 1,000 | 365,000 |
| ComplianceSnapshot (eventos) | ~2 KB | ~1,000 (promedio) | ~365,000 |
| DailyMerkleAnchor | ~0.5 KB | 1 | 365 |
| CertificateAccessAudit | ~0.5 KB | ~200 | ~73,000 |
| DocumentUploadDeclaration | ~0.3 KB | ~50 | ~18,250 |
| **Total DB anual** | | | **~1.8 GB** |

> Nota: con snapshots por evento, el volumen de DB se duplica aproximadamente respecto a solo baselines. Sigue siendo trivial para PostgreSQL.

### 14.2 MinIO (documentos congelados)

| Escenario | Cálculo | Almacenamiento/día | Anual |
|---|---|---|---|
| Sin deduplicación | 1000 eq × 5 docs × 500KB | 2.5 GB | 912 GB |
| Con deduplicación (~5% cambia/día) | 50 eq × 5 docs × 500KB | 125 MB | 45 GB |
| **Realista** (dedup + incrementales) | | **~125 MB/día** | **~45 GB/año** |

### 14.3 Blockchain

| Red | Costo/transacción | Costo anual (1 tx/día) |
|---|---|---|
| Polygon | ~$0.01 | ~$3.65 |
| Bitcoin (OP_RETURN) | ~$1.00 | ~$365 |
| Ethereum | ~$5.00 | ~$1,825 |

**Recomendación**: Polygon por relación costo/confiabilidad.

---

## 15. Seguridad

### 15.1 Clave de firma RS256

- Se reutiliza el par de claves RS256 existente (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`) para la primera fase
- La clave privada **nunca** se expone en endpoints — solo la clave pública se publica en `/.well-known/ccs-key`
- Consideración para fases posteriores: rotar a un par de claves **dedicado** para CCS (`CCS_PRIVATE_KEY` / `CCS_PUBLIC_KEY`), separado de JWT de sesión
- Key ID (`kid`) almacenado en cada snapshot para soportar rotación futura (ver sección 18.5)
- Cada snapshot incluye el `kid` de la clave usada para su firma, permitiendo verificar snapshots antiguos con claves anteriores

### 15.2 Control de acceso basado en roles

- **Todo acceso a certificados y documentos requiere JWT válido** — no existen endpoints públicos de consulta
- El sistema de permisos filtra por: `tenantEmpresaId`, `dadorCargaId`, `clienteId`, `transportistaId`, `choferId`
- Un cliente solo puede ver certificados de equipos que tiene asignados en `equipo_cliente`
- Un dador solo puede ver certificados de equipos de sus flotas
- Cada consulta registra una entrada inmutable en `CertificateAccessAudit`
- Rate-limiting por usuario: 60 requests/minuto para consultas, 10/minuto para generación de PDFs
- Logs de acceso retenidos por 5 años (no eliminables por usuario, solo por política de retención automática)

### 15.3 Acceso a documentos congelados

- Los documentos nunca se sirven directamente desde MinIO al usuario (no hay presigned URLs directas)
- El backend hace proxy del documento desde MinIO, le aplica marca de agua, y lo sirve al usuario
- Esto garantiza que:
  - **Siempre** se aplica marca de agua (no hay forma de obtener el documento sin ella)
  - **Siempre** se registra el acceso en el audit trail
  - Las credenciales de MinIO **nunca** se exponen al cliente
- El único caso donde el documento se sirve sin marca de agua es para verificación de hash (endpoint `/verify-hash`), y en ese caso el backend solo devuelve el hash calculado, nunca el archivo

### 15.4 Inmutabilidad

- Los snapshots son **write-once**: no existen endpoints de actualización ni eliminación
- La cadena de hashes detecta cualquier alteración retroactiva (el hash anterior está incluido en el contenido firmado)
- El anclaje blockchain es verificable **independientemente** del sistema BCA (cualquiera con el Merkle root puede verificar en Polygonscan)
- Las copias congeladas en MinIO se configuran con **Object Lock (WORM)**: una vez escritas, ni el admin puede borrarlas antes de la fecha de retención
- Los registros de `CertificateAccessAudit` y `DocumentUploadDeclaration` son append-only (no hay endpoints UPDATE/DELETE)

### 15.5 Wallet blockchain

- La clave privada del wallet se almacena en variable de entorno (`CCS_ANCHOR_WALLET_PRIVATE_KEY`)
- **Nunca** se expone en logs ni respuestas de API
- El wallet solo necesita un balance mínimo de MATIC para gas (~$1 cubre meses de operación en Polygon)
- Monitorear balance y alertar cuando baje del umbral configurado
- Wallet separado del wallet operativo de la empresa (si existe)

### 15.6 Cifrado en reposo

| Capa | Mecanismo | Protege contra |
|---|---|---|
| **Disco del servidor** | LUKS (Linux Unified Key Setup) con AES-256-XTS | Robo físico del servidor o disco |
| **MinIO** | Server-Side Encryption (SSE-S3) con clave maestra en HashiCorp Vault o env var | Acceso no autorizado al bucket de MinIO |
| **PostgreSQL** | Disco LUKS + TDE si se usa PostgreSQL Enterprise (opcional) | Acceso directo a los archivos de datos de PG |
| **Backups** | GPG simétrico (AES-256) antes de transferir a almacenamiento externo | Interceptación de backups |

**Supuestos importantes:**
- La clave de cifrado de disco (LUKS) se desbloquea al boot con una clave en un volumen separado o por operador
- La clave de MinIO SSE es diferente a la clave LUKS
- Las claves nunca se almacenan en el mismo volumen que los datos cifrados
- Rotación anual de claves SSE (MinIO soporta rekeying transparente)

### 15.7 Soberanía de datos y AI propietaria

**Requisito absoluto: ningún documento sale de la infraestructura propia.**

| Componente | Modelo | Ejecución | Justificación |
|---|---|---|---|
| OCR | Tesseract 5 o PaddleOCR | On-premise (Docker) | Extracción de texto sin enviar a APIs externas |
| Clasificación de documentos | Modelo fine-tuned (BERT/DistilBERT) | On-premise (Docker) | Detecta tipo de doc y campos clave |
| Scoring de autenticidad | LLM local (Mistral 7B o Llama 3) via Ollama/Flowise | On-premise (Docker) | Análisis de coherencia, detección de anomalías |
| ELA (Error Level Analysis) | Sharp + librería propia | On-premise (Node.js) | Detección de manipulación de imágenes |
| Verificación externa | API de SSN, ARCA (scraping controlado) | On-premise (request directo) | Validación contra fuentes oficiales |

**Controles de soberanía:**
- Firewall del servidor de AI: solo permite tráfico entrante desde los servidores de la aplicación BCA
- No se permite salida a internet desde el contenedor de AI (excepto actualizaciones de modelos controladas)
- Los modelos se descargan y actualizan manualmente por el equipo de operaciones
- Auditoría trimestral de tráfico de red para verificar que no hay fugas de datos

### 15.8 Marcas de agua (watermarking)

Las marcas de agua son un control de **trazabilidad ante fugas** y un **disuasorio** para compartir documentos indebidamente.

**Marca de agua visible:**
- Se aplica en el backend al momento de servir el documento (nunca se almacena el doc con marca de agua)
- Contenido: identidad del usuario + fecha/hora + código de tracking
- Posición: diagonal, repetida, 15-20% opacidad
- Resistente a: recorte parcial (se repite en toda la superficie)

**Marca de agua invisible (esteganográfica):**
- Se embeben bits de información en los valores LSB (Least Significant Bit) de los píxeles
- Payload: `userId + timestamp + snapshotId`
- Sobrevive: recompresión JPEG moderada (~85%), redimensionamiento hasta 50%, impresión y re-escaneo
- No sobrevive: recompresión agresiva (<50%), OCR + reconstrucción de texto, rotación extrema
- Cada marca de agua tiene un código de tracking (`WM-XXXXXX`) registrado en `CertificateAccessAudit`
- En caso de fuga, se puede identificar al usuario que obtuvo el documento

**Implementación:**
- Para PDFs: se usa `pdfkit` para superponer la marca visible, `pdf-lib` para inspección
- Para imágenes (fotos de documentos): se usa `sharp` para marca visible + `steg-write` para marca invisible
- El servicio `WatermarkService` es stateless y se invoca on-the-fly (no se almacenan versiones watermarked)

### 15.9 Protección de documentos en tránsito

- Todo el tráfico entre servicios usa HTTPS (TLS 1.2+)
- Dentro de la red Docker interna, el tráfico entre contenedores es aislado por red virtual
- Las conexiones a MinIO dentro de Docker usan HTTP (aceptable en red interna aislada) pero se puede habilitar TLS si se expone MinIO externamente
- La conexión a PostgreSQL usa SSL si está configurado (`sslmode=require`)
- Las conexiones al frontend se hacen via Nginx con HTTPS obligatorio y HSTS

---

## 16. Fases de Implementación

### Fase 1: Snapshots + Cadena de Hashes + Declaración Jurada (2 semanas)

**Entregables**:
- Migración Prisma: tablas `ComplianceSnapshot`, `DailyMerkleAnchor`, `CertificateAccessAudit`, `DocumentUploadDeclaration`
- Servicio `ComplianceCertificationService`:
  - `generateSnapshot(equipoId, fecha)` (para baselines)
  - `generateEventSnapshot(equipoId, event, documentId)` (para eventos)
  - `generateDailySnapshots()` (batch nocturno con reintentos automáticos)
  - `getSnapshotAtTime(equipoId, targetDateTime)` (resolución temporal)
  - `computeContentHash(data)`
  - `signSnapshot(contentHash)`
  - `buildMerkleTree(snapshots)`
- Job nocturno con cron configurable + reintentos automáticos en caso de fallo
- Integración con event handlers existentes (onDocumentApproved, onDocumentRejected, etc.)
- Debounce de eventos via Redis (ventana de 5 minutos por equipo)
- **Declaración jurada electrónica**: modal en el frontend al subir documentos, registro en `DocumentUploadDeclaration`
- **Cifrado en reposo**: configurar MinIO SSE-S3 + LUKS en discos de datos
- Endpoint de consulta autenticado: `GET /api/docs/compliance/snapshots/:id`
- Middleware de auditoría: toda consulta crea `CertificateAccessAudit`

**Criterio de aceptación**:
- Snapshot baseline diario funcionando para todos los equipos activos
- Snapshots por evento generados al aprobar/rechazar/vencer un documento
- Declaración jurada registrada para toda carga de documento nueva
- Consulta por hora devuelve el snapshot correcto
- Toda consulta queda registrada en audit trail
- Datos cifrados en reposo (verificable en config de MinIO y LUKS)

### Fase 2: Copias Congeladas + Marcas de Agua (2 semanas)

**Entregables**:
- Servicio `DocumentFreezerService`:
  - `freezeDocuments(snapshot)` (completo para baselines)
  - `freezeSingleDocument(snapshot, documentId)` (solo el doc cambiado para eventos)
  - `verifyDocumentHash(snapshot, docIndex)`
- Deduplicación de archivos congelados (referencia a baseline para eventos)
- MinIO Object Lock (WORM) habilitado en bucket de compliance
- Servicio `WatermarkService`:
  - `applyVisibleWatermark(document, userInfo)` (marca visible dinámica)
  - `applyInvisibleWatermark(image, trackingPayload)` (esteganografía LSB)
  - `extractWatermark(image)` (para investigación de fugas)
- Endpoint de documentos con marca de agua: `GET /api/docs/compliance/snapshots/:id/docs/:idx`
- Endpoint de verificación de hash (sin descargar): `POST /api/docs/compliance/snapshots/:id/docs/:idx/verify-hash`
- Endpoint autenticado para generar certificados bajo demanda (con hora opcional)

**Criterio de aceptación**:
- Documentos congelados accesibles solo via endpoints autenticados, con marca de agua
- Verificación de hash funcional sin exponer el documento original
- WORM activo: intentar borrar un doc congelado falla con error

### Fase 3: Blockchain + PDF Autoverificable (1-2 semanas)

**Entregables**:
- Integración con Polygon:
  - Contrato `ComplianceAnchor` deployado en Polygon Mainnet
  - Servicio de envío de transacciones con reintentos
  - Job de reintento de anclajes fallidos (hasta 3 intentos con backoff exponencial)
  - Monitoreo de balance de wallet con alertas
- Generación de PDF autoverificable con `pdfkit`:
  - Datos del certificado + verificación criptográfica
  - Anexos A (firma), B (datos canónicos), C (Merkle proof)
  - Marca de agua identificando al generador del PDF
  - QR apuntando al portal autenticado
  - Instrucciones de verificación independiente
- Merkle proof almacenado en cada snapshot
- Publicación de clave pública en `/.well-known/ccs-key`

**Criterio de aceptación**:
- Merkle root anclado diariamente en Polygon, verificable en Polygonscan
- PDF descargable que permite verificación offline completa a un tercero
- QR del PDF lleva a login del portal (no a endpoint público)

### Fase 4: Portales Autenticados de Consulta (2 semanas)

**Entregables**:
- Frontend — Portal Dador/Admin:
  - Pestaña "Certificados CCS" en la página de equipo
  - Vista de detalle de certificado con verificación en vivo
  - Botón "Generar Certificado" bajo demanda (con hora opcional)
  - Botón "Descargar PDF" y "Verificar Cadena"
  - Dashboard de certificados de flota completa
- Frontend — Portal Cliente:
  - Vista de compliance certificada de equipos asignados
  - Listado de certificados con filtros (fecha, estado, confianza)
  - Descarga de documentos (con marca de agua visible)
  - Indicador visual de verificación blockchain
- Frontend — Portal Transportista:
  - Vista de estado documental de sus equipos (simplificado)
- Auditoría:
  - Dashboard de accesos para SUPERADMIN (quién vio qué, cuándo)
  - Exportación de logs de acceso

**Criterio de aceptación**:
- Un cliente autenticado ve los certificados de sus equipos asignados y puede descargar documentos con marca de agua
- Un dador genera PDFs y los descarga para enviar a terceros
- Toda acción queda registrada en el audit trail
- Un SUPERADMIN puede ver el dashboard de accesos

### Fase 5: Verificación contra Fuentes Oficiales (3-4 semanas)

**Entregables**:
- Integraciones con fuentes oficiales (prioridad según disponibilidad):
  - SSN (Superintendencia de Seguros): verificación de vigencia de pólizas
  - ARCA (ex AFIP): verificación de constancia de inscripción / situación fiscal
  - CNRT (consulta de habilitaciones de transporte) — cuando esté disponible
  - DNRPA (verificación de titularidad vehicular) — investigación
- Servicio `ExternalVerificationService`:
  - `verifyDocument(document, templateType)` → resultado + confianza
  - Cache de resultados (24h para evitar requests excesivos)
  - Retry con backoff para fuentes inestables
- Campo `externalVerifications` agregado al snapshot (JSON con resultados por documento)
- Columna "Verificación externa" en la tabla de documentos del certificado

**Criterio de aceptación**:
- Pólizas de seguro se verifican contra SSN (al menos vigencia + N° de póliza)
- Constancias fiscales se verifican contra ARCA
- El certificado muestra el resultado de la verificación externa

### Fase 6: AI de Scoring + Trust Level (3-4 semanas)

**Entregables**:
- Stack de AI on-premise:
  - Contenedor Docker con Ollama + Mistral 7B (o Llama 3 8B)
  - Contenedor Docker con PaddleOCR para extracción de texto
  - Contenedor Docker con Sharp para ELA (Error Level Analysis)
- Servicio `DocumentScoringService`:
  - `scoreDocument(document)` → `{ score: 0-1, alerts: [], details: {} }`
  - Score basado en: metadata (30%), ELA (20%), OCR coherencia (30%), LLM (20%)
  - Alertas automáticas para score < 0.60
- Servicio `TrustScoringEngine`:
  - Calcula `trustLevel` del snapshot basado en:
    - % de docs verificados externamente
    - Score promedio de AI
    - Existencia de declaraciones juradas
    - Alertas activas
    - Reputación del transportista (historial de fraude)
  - Almacena `trustLevel` y `trustBreakdown` en el snapshot
- Dashboard de alertas de fraude para ADMIN
- Inspección de metadata automática al subir documentos

**Criterio de aceptación**:
- Cada documento subido recibe un score de autenticidad
- Los snapshots reflejan el `trustLevel` calculado
- Alertas de fraude aparecen en el dashboard de admin
- Toda la AI corre on-premise sin salida de datos a internet

---

## 17. Escenarios Especiales y Casos Borde

### 17.1 ~~CRÍTICO~~: El problema de la medianoche y la zona horaria — RESUELTO ✅

> **Resuelto en commit `f6cccb1` (2026-02-11). Desplegado en testing y staging.**

**Problema original**: Un documento que "vence el 15 de enero" se almacenaba como `2026-01-15T00:00:00.000Z` (medianoche UTC = 21:00 del 14/01 en Argentina). El sistema marcaba como vencido 3 horas antes.

**Solución implementada**:

1. **Función centralizada** `normalizeExpirationToEndOfDayAR()` en `apps/documentos/src/utils/expiration.utils.ts`:
   - Convierte cualquier fecha de vencimiento a 23:59:59.999 hora Argentina (02:59:59.999 UTC del día siguiente)
   - Idempotente: si ya está normalizada, no la modifica
   - Incluye `isDocumentExpired()` como helper de comparación

2. **Aplicada en los 5 puntos de entrada**:
   - `documents.controller.ts` → `extractExpirationDate()` (upload)
   - `documents.controller.ts` → `renewDocument()` (renovación)
   - `approval.service.ts` → `approveDocument()` (aprobación manual)
   - `document-validation.worker.ts` → `parseSafeExpirationDate()` (auto-aprobación IA)

3. **Migración de datos existentes**:
   - SQL ejecutado en testing (294 documentos corregidos) y staging (271 documentos corregidos)
   - Todos los `expiresAt` ahora almacenados como `02:59:59.999 UTC`

```typescript
// Implementación final (expiration.utils.ts)
export function normalizeExpirationToEndOfDayAR(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  if (isNaN(d.getTime())) return null;
  // Idempotence: already normalized?
  if (d.getUTCHours() >= 12 && d.getUTCMinutes() === 59) return d;
  // Normalize: 23:59:59.999 AR = day+1 02:59:59.999 UTC
  const dayInAR = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  dayInAR.setUTCDate(dayInAR.getUTCDate() + 1);
  dayInAR.setUTCHours(2, 59, 59, 999);
  return dayInAR;
}
```

---

### 17.2 ~~CRÍTICO~~: El cron de expiración no dispara event handlers — RESUELTO ✅

> **Resuelto en commit `f6cccb1` (2026-02-11). Desplegado en testing y staging.**

**Problema original**: `checkExpiredDocuments()` usaba `updateMany` en bulk sin invocar `DocumentEventHandlers.onDocumentExpired()` para cada documento. No se generaban notificaciones, no se re-evaluaban equipos.

**Solución implementada** en `document.service.ts`:

1. **findMany** → obtiene documentos a vencer con sus IDs
2. **updateMany** → marca todos como VENCIDO
3. **Loop individual** → `DocumentEventHandlers.onDocumentExpired(doc.id)` para cada uno
4. **Batches de 20** con pausa de 1 segundo entre batches para no saturar y permitir debounce

```typescript
// Implementación final (extracto de checkExpiredDocuments)
const BATCH_SIZE = 20;
for (let i = 0; i < expiring.length; i += BATCH_SIZE) {
  const batch = expiring.slice(i, i + BATCH_SIZE);
  for (const doc of batch) {
    try {
      await DocumentEventHandlers.onDocumentExpired(doc.id);
    } catch (err) { /* log warning */ }
  }
  if (i + BATCH_SIZE < expiring.length) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

---

### 17.3 La brecha entre medianoche y el baseline (00:00 - 03:00) — RESUELTO ✅

> **Resuelto en commit `f6cccb1` (2026-02-11). Desplegado en testing y staging.**

**Escenario**: Un documento vence a las 00:00 Argentina. El baseline CCS se generaría a las 03:00. ¿Qué pasa en la brecha?

**Solución implementada**: Cron adicional `'5 3 * * *'` (03:05 UTC = 00:05 Argentina) en `scheduler.service.ts`. Combinado con el fix de 17.2 (event handlers), el flujo ahora es:

```
00:00  Documento vence (expiresAt = 02:59:59.999 UTC del día anterior, efectivo)
00:05  Cron específico detecta → marca VENCIDO → trigger onDocumentExpired()
00:10  (futuro CCS) Snapshot EVENT: equipo pasa de COMPLETO a VENCIDO (tras debounce)
01:00  Cron horario regular: no encuentra nuevos vencimientos
03:00  (futuro CCS) Snapshot BASELINE: confirma estado VENCIDO
```

La brecha queda cubierta con menos de 5 minutos de latencia.

---

### 17.4 Vencimientos masivos simultáneos — RESUELTO ✅

> **Resuelto en commit `f6cccb1` (2026-02-11). Desplegado en testing y staging.**

**Escenario**: Muchos seguros se renuevan anualmente el 1 de enero. Podrían vencer 200 pólizas de una vez.

**Solución implementada**: El refactoreo de `checkExpiredDocuments()` (fix 17.2) ya incluye procesamiento en batches:

- Batches de 20 documentos con pausa de 1 segundo entre batches
- Cada documento dispara `onDocumentExpired()` individualmente
- El debounce de CCS (5 minutos por equipo, futuro) consolidará los snapshots EVENT
- Si un equipo tiene 3 documentos que vencen en la misma hora, se genera 1 solo snapshot consolidado

---

### 17.5 Falla del job nocturno

**Escenario**: El job de las 03:00 falla (error de DB, servidor reiniciándose, falta de memoria). No se generan baselines para ese día.

**Impacto**:
- No hay baselines para el día → no hay copias congeladas de documentos
- El Merkle tree del día anterior no se ancla en blockchain (el anclaje se hace en el job del día siguiente)
- La cadena de hashes tiene un hueco (los eventos del día no tienen baseline padre)

**Mitigación**:

1. **Reintentos automáticos**: Si el job falla, reintentar a los 30 minutos (máximo 3 intentos)
2. **Baseline de recuperación**: Si a las 06:00 no hay baseline para hoy, generar uno de emergencia
3. **Alerta**: Notificar al administrador si el baseline no se generó antes de las 07:00
4. **Continuidad de la cadena**: Los snapshots EVENT del día se encadenan entre sí; el baseline, cuando se genere (aunque tarde), se inserta en la secuencia con `daySequence: 0`

```typescript
// Job de verificación de salud del CCS (08:00)
cron.schedule('0 11 * * *', async () => { // 08:00 Argentina = 11:00 UTC
  const today = startOfDay(new Date());
  const baselineExists = await prisma.complianceSnapshot.findFirst({
    where: { fecha: today, snapshotType: 'BASELINE' },
  });

  if (!baselineExists) {
    AppLogger.error('🚨 CCS: No hay baseline para hoy. Ejecutando generación de emergencia.');
    await generateDailySnapshots(); // Re-ejecutar
    // Notificar al admin
  }
});
```

---

### 17.6 Documento reemplazado con brecha temporal

**Escenario**: El seguro del camión AB123CD venció. El transportista sube la nueva póliza a las 10:00. El documento queda en estado PENDIENTE (esperando clasificación/aprobación). El admin lo aprueba a las 14:00.

**Timeline de compliance**:

```
09:00  Seguro VENCIDO → equipo VENCIDO
10:00  Nueva póliza subida → documento PENDIENTE → equipo sigue VENCIDO
       (PENDIENTE no cuenta como VIGENTE)
10:05  Snapshot EVENT: VENCIDO (el nuevo doc está en PENDIENTE)
14:00  Admin aprueba → nuevo seguro APROBADO → equipo COMPLETO
14:05  Snapshot EVENT: COMPLETO
```

**Punto clave**: Entre las 10:00 y las 14:00, el equipo estuvo técnicamente VENCIDO aunque el transportista ya había subido el documento. Esto es **correcto desde el punto de vista de compliance**: un documento pendiente de aprobación no garantiza que sea válido.

**El CCS captura esto fielmente**: los snapshots reflejan cada transición. Si alguien pregunta "¿compliance a las 11:00?", la respuesta es VENCIDO, con el detalle de que hay un documento PENDIENTE para ese requisito.

---

### 17.7 Aprobación retroactiva o con fecha ajustada

**Escenario**: Un documento fue subido el 10/01 pero el admin lo aprueba el 15/01 y establece expiresAt = 30/06/2026.

**Para CCS**: El snapshot se genera al momento de la **acción de aprobación** (15/01 a la hora que sea), no al momento de la subida. Esto es correcto: el sistema certifica cuándo la compliance fue **verificada y confirmada**, no cuándo el documento fue emitido originalmente.

**El certificado del 12/01** seguirá mostrando el documento como PENDIENTE (porque efectivamente lo era ese día). No se retroaltera.

---

### 17.8 Equipo compartido entre múltiples dadores

**Escenario**: El Chofer DNI 24644385 está en el Equipo 47 del Dador A y en el Equipo 89 del Dador B. Su licencia se aprueba.

**Para CCS**: Ambos equipos reciben un snapshot EVENT. Cada uno tiene su propia cadena de hashes, sus propias copias congeladas, y potencialmente requisitos diferentes (los clientes de cada dador pueden tener distintos `ClienteDocumentRequirement`).

**El mismo documento** (licencia del chofer) puede tener estado diferente según el contexto de compliance de cada equipo/cliente.

---

### 17.9 Viaje multi-día: compliance continua

**Escenario**: Un camión sale el lunes y llega el jueves. El seguro vence el miércoles. ¿El equipo estuvo compliant durante todo el viaje?

**Con CCS**: Se consultan los snapshots del lunes al jueves. La timeline mostraría:

```
Lunes    BASELINE: COMPLETO
Martes   BASELINE: COMPLETO (inherited, sin cambios)
Miércoles 03:00 BASELINE: VENCIDO (seguro venció)
Jueves   BASELINE: VENCIDO
```

**El certificado de "viaje completo"** debería mostrar claramente que la compliance se perdió el miércoles. Esto es un dato **valioso** para el dador: puede demostrar que hizo due diligence hasta el miércoles, y que la pérdida fue por vencimiento natural, no por negligencia.

**Endpoint sugerido** para este caso de uso:

```
GET /api/docs/compliance/continuous/:equipoId?desde=2026-01-20&hasta=2026-01-23
Response: {
  continuousCompliance: false,
  compliantUntil: "2026-01-22T02:59:59Z",  // Último momento compliant
  breakdowns: [
    { fecha: "2026-01-22", timestamp: "03:00", event: "Seguro venció", estado: "VENCIDO" }
  ]
}
```

---

### 17.10 Cambio de composición del equipo durante el día

**Escenario**: A las 11:00, se cambia el chofer del Equipo 47 (de Palma a Rodríguez). Rodríguez tiene todos los documentos al día.

**Impacto en CCS**: Este cambio se registra en `EquipoHistory` y `EquipoAuditLog`. El snapshot EVENT debería:

1. Capturar el nuevo `equipoData` con los datos de Rodríguez
2. Evaluar compliance con los documentos de Rodríguez
3. El snapshot anterior (con Palma) queda como registro histórico

**Trigger adicional necesario**: Además de cambios de documentos, los snapshots EVENT deben dispararse cuando cambia la composición del equipo:

| Evento | triggerEvent |
|---|---|
| Cambio de chofer | `EQUIPO_DRIVER_CHANGED` |
| Cambio de camión | `EQUIPO_TRUCK_CHANGED` |
| Cambio de acoplado | `EQUIPO_TRAILER_CHANGED` |
| Cambio de empresa transportista | `EQUIPO_EMPRESA_CHANGED` |
| Asignación de nuevo cliente | `EQUIPO_CLIENTE_ADDED` |
| Remoción de cliente | `EQUIPO_CLIENTE_REMOVED` |

---

### 17.11 Documento con expiresAt = null (sin vencimiento)

**Escenario**: Algunos documentos no tienen fecha de vencimiento (ej: títulos de propiedad, habilitaciones permanentes). El campo `expiresAt` es null.

**Para CCS**: En `computeDocumentState()`, si `expiresAt` es null y el status es APROBADO, el documento se considera VIGENTE indefinidamente. Esto es correcto.

**En el certificado**: El campo "Vencimiento" muestra "Sin vencimiento" o "Permanente". El hash del documento se calcula igualmente, y la copia congelada se genera normalmente.

---

### 17.12 Reloj del servidor desincronizado — VERIFICADO ✅

> **Verificado el 2026-02-11.**

**Escenario**: El servidor tiene un desfasaje de reloj de 5 minutos respecto al tiempo real.

**Estado actual**: Verificado en ambos servidores con `timedatectl`:
- **Staging (10.3.0.243)**: `NTP service: active`, `System clock synchronized: yes`, timezone UTC
- **Testing (10.3.0.246)**: `NTP service: active`, `System clock synchronized: yes`, timezone America/Argentina/Buenos_Aires (GMT-3)

**Mitigación adicional** (para CCS):
- Incluir el timestamp del servidor y un hash del timestamp en el snapshot
- El anclaje blockchain provee un timestamp independiente (el bloque tiene su propia hora)
- Recomendación para producción: verificar NTP periódicamente via healthcheck

---

### 17.13 Estado de resolución de prerequisitos

> Última revisión: 2026-02-11

| # | Prerequisito | Impacto | Prioridad | Estado | Detalle |
|---|---|---|---|---|---|
| 1 | Normalizar `expiresAt` a fin de día Argentina (UTC-3) | Los vencimientos se adelantan 3 horas | **BLOQUEANTE** | **RESUELTO** | `expiration.utils.ts` creado y aplicado en 5 puntos de entrada (upload, renewal, approval, AI auto-approval, safe parser). Commit `f6cccb1`. |
| 2 | Modificar `checkExpiredDocuments()` para disparar event handlers | Sin esto, los vencimientos no generan notificaciones ni re-evaluación de equipos | **BLOQUEANTE** | **RESUELTO** | `document.service.ts` refactorizado: findMany + updateMany + `onDocumentExpired()` individual. Batches de 20 con 1s de pausa. Commit `f6cccb1`. |
| 3 | Agregar cron de expiración a las 00:05 Argentina | Capturar vencimientos de medianoche rápidamente | Alta | **RESUELTO** | Cron `'5 3 * * *'` (03:05 UTC = 00:05 AR) agregado en `scheduler.service.ts`. Commit `f6cccb1`. |
| 4 | Agregar triggers de snapshot para cambios de composición de equipo | Cambios de chofer/camión/acoplado no quedarían certificados | Alta | **PENDIENTE** | Resolver antes de Fase 1 de CCS. Ver sección 17.14. |
| 5 | Configurar NTP en servidores de producción | Timestamps incorrectos invalidan certificaciones | Alta | **RESUELTO** | Verificado: ambos servidores (243 y 246) tienen `NTP service: active` y `System clock synchronized: yes`. |
| 6 | Migración de datos: ajustar `expiresAt` existentes | Datos históricos incorrectos | Alta | **RESUELTO** | Migración SQL ejecutada. Testing: 294 docs normalizados. Staging: 271 docs normalizados. 0 pendientes en ambos. |

**Resumen**: 5 de 6 prerequisitos resueltos. El #4 se resuelve antes de implementar Fase 1 de CCS.

---

### 17.14 Estado de todos los escenarios - Diagnóstico y cursos de acción

#### Escenarios RESUELTOS (desplegados en testing y staging)

**17.1 - Timezone de expiresAt**: RESUELTO.
- Función `normalizeExpirationToEndOfDayAR()` en `apps/documentos/src/utils/expiration.utils.ts`
- Aplicada en: `documents.controller.ts` (extractExpirationDate, renewDocument), `approval.service.ts` (approveDocument), `document-validation.worker.ts` (parseSafeExpirationDate)
- Migración SQL ejecutada en ambos servidores
- Todo nuevo `expiresAt` se almacena como 02:59:59.999 UTC (= 23:59:59.999 Argentina)

**17.2 - Cron no dispara events**: RESUELTO.
- `checkExpiredDocuments()` en `document.service.ts` ahora hace findMany + updateMany + loop de `onDocumentExpired()` individual
- Procesamiento en batches de 20 con 1 segundo de pausa entre batches
- Cada documento vencido genera: notificaciones, re-evaluación de equipos afectados, y (futuro) snapshots CCS

**17.3 - Brecha medianoche-baseline**: RESUELTO.
- Cron adicional `'5 3 * * *'` (00:05 Argentina) en `scheduler.service.ts`
- Con el fix de 17.2, este cron dispara event handlers, cerrando la brecha

**17.4 - Vencimientos masivos**: RESUELTO.
- Batches de 20 documentos con pausa de 1 segundo en `checkExpiredDocuments()`
- El debounce de CCS (5 minutos por equipo, futuro) complementará para snapshots

#### Escenarios CORRECTOS POR DISEÑO (no requieren cambios)

**17.6 - Documento reemplazado con brecha temporal**: OK.
- Un documento PENDIENTE de aprobación no es compliance
- Los snapshots reflejan correctamente la brecha entre subida y aprobación
- Ejemplo: seguro vence → se sube nueva póliza (PENDIENTE) → admin aprueba → COMPLETO
- La brecha VENCIDO→PENDIENTE→COMPLETO queda certificada fielmente

**17.7 - Aprobación retroactiva**: OK.
- El snapshot certifica el momento de la acción del sistema, no la fecha de emisión del documento
- Un certificado del 12/01 muestra PENDIENTE si el doc fue aprobado el 15/01
- No se retroalteran snapshots pasados

**17.8 - Equipo en múltiples dadores**: OK.
- Cada equipo tiene su propia cadena de hashes independiente
- `ComplianceService.evaluateBatchEquiposCliente()` evalúa por equipo con sus propios requisitos de clientes
- El mismo documento puede tener estado diferente según el contexto compliance de cada equipo

**17.11 - expiresAt = null (sin vencimiento)**: OK.
- `computeDocumentState()` trata expiresAt null + status APROBADO como VIGENTE indefinido
- En certificados se muestra como "Sin vencimiento" o "Permanente"
- Hash y copia congelada se generan normalmente

**17.12 - Reloj desincronizado**: OK.
- Verificado en ambos servidores: `NTP service: active`, `System clock synchronized: yes`
- Staging (243): zona UTC, NTP activo
- Testing (246): zona GMT+3 (-03), NTP activo
- El anclaje blockchain provee timestamp independiente como respaldo

#### Escenarios PENDIENTES - Con curso de acción definido

**17.5 - Falla del job nocturno**: PENDIENTE (resolver en Fase 1 de CCS).
- **Cuándo**: Al implementar el job de snapshot diario
- **Qué hacer**:
  1. Reintentos automáticos: si falla, reintentar a los 30 min (máx 3 intentos)
  2. Job de verificación a las 08:00 AR (11:00 UTC): si no hay baseline, generar de emergencia
  3. Alerta al administrador via notificación interna si el baseline no existe a las 08:00
  4. Los snapshots EVENT del día se encadenan entre sí aunque no haya baseline
- **Esfuerzo**: ~4 horas, incluido en Fase 1

**17.9 - Viaje multi-día (compliance continua)**: PENDIENTE (resolver en Fase 4 de CCS).
- **Cuándo**: Al implementar el portal de verificación
- **Qué hacer**:
  1. Endpoint `GET /api/docs/compliance/continuous/:equipoId?desde=&hasta=`
  2. Consulta secuencial de snapshots en el rango de fechas
  3. Detecta el momento exacto donde se pierde compliance (`compliantUntil`)
  4. Útil para viajes largos: demuestra due diligence hasta el vencimiento
- **Esfuerzo**: ~1 día, es un endpoint de consulta sobre datos existentes

**17.10 - Cambio de composición del equipo**: PENDIENTE (resolver ANTES de Fase 1 de CCS).
- **Problema actual**: Cuando se edita un equipo (cambio de chofer, camión, acoplado, empresa), la re-evaluación de compliance se hace via `queueService.addMissingCheckForEquipo()` dentro de bloques `try/catch` vacíos (best-effort). Si falla silenciosamente, la compliance no se re-evalúa y, para CCS, no se generaría snapshot EVENT.
- **Archivos afectados**: `equipo.service.ts`
  - `collectEntityChanges()` (línea ~686): edición de componentes
  - `detachEntities()` (línea ~1187): desasociación de acoplado
  - `forceMove()` (línea ~1084): movimiento forzado de entidades
  - `transferEquipo()` (línea ~1979): transferencia entre dadores
- **Qué hacer**:
  1. Extraer la re-evaluación post-edición del try/catch vacío a un flujo confiable
  2. Agregar llamada a `EquipoEvaluationService.evaluarEquipos([equipoId])` directamente (no solo encolar)
  3. Agregar trigger events para CCS: `EQUIPO_DRIVER_CHANGED`, `EQUIPO_TRUCK_CHANGED`, `EQUIPO_TRAILER_CHANGED`, `EQUIPO_EMPRESA_CHANGED`, `EQUIPO_CLIENTE_ADDED`, `EQUIPO_CLIENTE_REMOVED`
  4. Cuando CCS esté implementado, estos triggers generarán snapshots EVENT automáticamente
- **Esfuerzo**: ~2-3 horas
- **Prioridad**: **Alta** - resolver antes de Fase 1 porque afecta la integridad de la evaluación de compliance actual (independientemente de CCS)

---

### 17.15 Roadmap de resolución

```
RESUELTO  ✅ 17.1  Timezone expiresAt (commit f6cccb1, desplegado)
RESUELTO  ✅ 17.2  Event handlers en expiración (commit f6cccb1, desplegado)
RESUELTO  ✅ 17.3  Cron midnight Argentina (commit f6cccb1, desplegado)
RESUELTO  ✅ 17.4  Vencimientos masivos - batches (commit f6cccb1, desplegado)
OK        ✅ 17.6  Brecha doc reemplazado (correcto por diseño)
OK        ✅ 17.7  Aprobación retroactiva (correcto por diseño)
OK        ✅ 17.8  Equipo multi-dador (correcto por diseño)
OK        ✅ 17.11 expiresAt null (correcto por diseño)
OK        ✅ 17.12 NTP sincronizado (verificado en ambos servidores)

PENDIENTE ⏳ 17.10 Triggers cambio equipo → resolver ANTES de CCS Fase 1
PENDIENTE ⏳ 17.5  Reintentos job nocturno → resolver EN CCS Fase 1
PENDIENTE ⏳ 17.9  Compliance continua → resolver EN CCS Fase 4
```

---

## 18. Consideraciones Futuras

### 18.1 Certificación con validez legal reforzada (para sede judicial / organismos públicos)

Si se requiere presentar certificaciones ante la CNRT, aseguradoras o en sede judicial, el modelo actual (PDF autoverificable + blockchain) puede reforzarse con:

- **Sello de tiempo RFC 3161 (TSA)**: contratar un servicio de TSA certificado (por ejemplo, el de la ONTI argentina) para que cada snapshot reciba un sello de tiempo con validez legal. Esto complementa la prueba de blockchain con un sello emitido por una autoridad reconocida.
- **Firma digital con certificado X.509**: usar un certificado de firma digital emitido por una autoridad certificante argentina (AC-RAIZ / AC-ONTI) para firmar los PDFs con firma digital calificada (bajo Ley 25.506 de Firma Digital). Esto otorga al PDF la misma validez legal que un documento firmado ante escribano.
- **Pericia forense**: los anclajes en blockchain constituyen prueba de existencia temporal. La cadena hash + WORM + audit trail conforman un ecosistema de evidencia digital que cumple con la Ley 26.388 (delitos informáticos) y estándares de cadena de custodia digital.

**Mecanismo de entrega a terceros sin cuenta:**
El dador genera el PDF autoverificable desde su portal, lo descarga (con marca de agua identificándolo), y lo presenta al organismo. El organismo verifica el PDF de forma independiente (clave pública + blockchain). Si necesita documentos originales, el dador los adjunta con su marca de agua. **Nunca se otorga acceso al sistema a un tercero externo.**

### 18.2 Multi-tenant

El diseño ya soporta multi-tenant: cada snapshot incluye `tenantEmpresaId`. Los buckets de MinIO están separados por tenant. Los Merkle trees se mantienen unificados (un solo root por día = mayor eficiencia de anclaje, un solo costo de blockchain). El `tenantEmpresaId` se incluye en el contenido hasheado, así que cada tenant puede verificar sus propios snapshots independientemente.

### 18.3 API para integraciones externas (autenticada con API Keys)

Exponer una API REST documentada (OpenAPI) para que sistemas de terceros (ERPs, TMSs) puedan:
- Solicitar certificados programáticamente
- Verificar compliance antes de asignar cargas
- Integrar el estado de compliance en sus propios dashboards

**Mecanismo de autenticación**: API Keys con scopes (no JWT de usuario):
- Cada integración recibe un par de claves (client_id + client_secret)
- Los scopes definen qué equipos/clientes puede consultar
- Rate-limiting estricto por API key
- Las API Keys se gestionan desde el portal Admin
- Toda consulta via API Key queda registrada en el audit trail

### 18.4 Notificaciones proactivas

- Notificar al dador cuando un equipo pasa de COMPLETO a INCOMPLETO (email + in-app)
- Alertar al cliente cuando un equipo asignado pierde compliance (email + in-app)
- Resumen semanal de compliance de flota (email programado)
- Alerta de fraude: notificación inmediata al admin cuando un score de AI cae por debajo del umbral

### 18.5 Rotación de claves

Implementar un mecanismo de rotación de claves RS256:
- Almacenar Key ID (`kid`) en cada snapshot
- El endpoint `/.well-known/ccs-key` devuelve todas las claves públicas activas (actual + históricas)
- Mantener claves públicas históricas para verificar snapshots antiguos (mínimo 5 años después de rotación)
- Rotar anualmente o ante compromiso
- Los PDFs generados incluyen el `kid` para que el verificador sepa qué clave usar

### 18.6 Auditoría de marcas de agua

Si se detecta una fuga de documentos, implementar un flujo de investigación:
1. El admin sube la imagen/PDF filtrado al sistema
2. El sistema extrae la marca de agua invisible (esteganografía)
3. Identifica: usuario, fecha/hora, snapshot consultado
4. Se cruza con el registro de `CertificateAccessAudit`
5. Se genera un reporte de incidente

---

## 19. Prevención de Fraude y Verificación de Autenticidad Documental

### 19.1 El problema

El CCS certifica que un equipo de transporte **tenía documentación vigente y aprobada** en una fecha determinada. Sin embargo, la certificación por sí sola no garantiza que los documentos subidos al sistema sean **auténticos**. Un documento falsificado (póliza editada, licencia adulterada, constancia inventada) que sea aprobado por un operador pasaría todas las validaciones del CCS: tendría su hash, su firma, su anclaje en blockchain, pero la información de base sería falsa.

La prevención de fraude documental es un complemento indispensable del CCS. Mientras el CCS responde **"¿tenía los documentos al día?"**, la capa de autenticidad responde **"¿esos documentos son reales?"**.

### 19.2 Tres dimensiones del problema

Es fundamental distinguir tres aspectos que se resuelven con herramientas diferentes:

| Dimensión | Pregunta clave | Herramientas |
|---|---|---|
| **Autenticidad del documento** | ¿Es este el documento original emitido por la entidad? | Verificación contra fuentes oficiales, análisis forense |
| **Integridad post-carga** | ¿Nadie lo alteró después de subirlo? | SHA-256 + firma RS256 + hash chain + blockchain (ya resuelto por CCS) |
| **Responsabilidad del cargador** | ¿Quién lo subió y se responsabiliza de su veracidad? | Declaración jurada electrónica, audit trail, firma electrónica |

La dimensión 2 ya está resuelta por el CCS (secciones 6-8). Las dimensiones 1 y 3 se abordan en esta sección.

### 19.3 Estrategia de defensa en profundidad

La solución no es una sola técnica sino múltiples capas complementarias, cada una con distinto costo, impacto y nivel de certeza:

```
┌─────────────────────────────────────────────────────────────────┐
│                   CAPAS DE DEFENSA CONTRA FRAUDE                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ CAPA 5: Auditoría Humana y Proceso                      │     │
│  │ Auditorías aleatorias, blacklists, penalización          │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ CAPA 4: Detección de Anomalías (ML/AI)                  │     │
│  │ Scoring de confianza, detección de patrones sospechosos  │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ CAPA 3: Análisis de Consistencia y Metadatos            │     │
│  │ Inspección de PDF, OCR + cross-reference, ELA            │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ CAPA 2: Declaración Jurada Electrónica                  │     │
│  │ No repudio, responsabilidad legal, audit trail           │     │
│  ├─────────────────────────────────────────────────────────┤     │
│  │ CAPA 1: Verificación contra Fuentes Oficiales           │     │
│  │ SSN, ARCA, DNRPA, SRT, CNRT (la más fuerte)             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ CCS (ya implementado): Integridad post-carga             │     │
│  │ SHA-256, RS256, hash chain, blockchain, copias congeladas│     │
│  └─────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

### 19.4 Capa 1: Verificación contra fuentes oficiales (Argentina)

Esta es la capa más efectiva: si se puede confirmar que los datos del documento son reales consultando al organismo emisor, la falsificación se vuelve prácticamente imposible. No importa si el PDF fue editado si los datos que contiene coinciden con la fuente oficial.

#### 19.4.1 Fuentes verificables

| Documento | Organismo | Mecanismo | Datos verificables | Viabilidad |
|---|---|---|---|---|
| **Póliza de seguro** | SSN (Superintendencia de Seguros de la Nación) | Consulta pública web + API | Nro. póliza, asegurado, vigencia, aseguradora, vehículo cubierto | **Alta** - consulta pública disponible |
| **Constancia ARCA (ex-AFIP)** | ARCA | API REST pública por CUIT | CUIT, razón social, condición fiscal, monotributo/responsable inscripto, actividad | **Alta** - API estable y documentada |
| **Licencia de conducir** | CENALEC / SICVT | Consulta por DNI + Categoría | Nro. licencia, categoría (A, B, D, etc.), vigencia, jurisdicción emisora | **Media** - requiere convenio o scraping de consulta pública |
| **RTO / VTV** | Registros de Inspección Técnica (jurisdiccional) | Varía por provincia/municipio | Dominio, fecha de aprobación, vigencia, planta de inspección | **Media** - fragmentado por jurisdicción |
| **Cédula del vehículo** | DNRPA (Dirección Nacional de Registros de Propiedad del Automotor) | Consulta por dominio | Dominio, titular, DNI/CUIT titular, marca, modelo, año | **Media** - consulta básica es pública |
| **ART con nómina** | SRT (Superintendencia de Riesgos del Trabajo) | Consulta por CUIT empleador | ART activa, CUIT empleador, nómina de empleados cubiertos | **Media** - requiere convenio institucional |
| **Habilitación de transporte** | CNRT (Comisión Nacional de Regulación del Transporte) | RUTA/RUTE - consulta pública | Habilitación vigente, tipo de servicio, vehículos habilitados | **Alta** - consulta pública web disponible |

#### 19.4.2 Modelo de integración propuesto

```
┌──────────────────────────────────────────────────────────────┐
│              FLUJO DE VERIFICACIÓN EXTERNA                     │
│                                                                │
│  1. Documento subido al sistema                                │
│  2. OCR extrae datos clave:                                    │
│     - Nro. de póliza / CUIT / DNI / Dominio / Nro. licencia   │
│     - Fecha de vigencia declarada                              │
│     - Entidad emisora                                          │
│                                                                │
│  3. Si el tipo de documento tiene fuente oficial:              │
│     ┌────────────────────────────────────────────────────┐    │
│     │  consultar API/web del organismo                    │    │
│     │  ┌──────────────────────────────────────────┐      │    │
│     │  │ ¿Datos del OCR coinciden con fuente?     │      │    │
│     │  │                                          │      │    │
│     │  │  SÍ → Verificación = CONFIRMADA          │      │    │
│     │  │       (badge verde en el documento)       │      │    │
│     │  │                                          │      │    │
│     │  │  NO → Verificación = DISCREPANCIA         │      │    │
│     │  │       (alerta al aprobador + bloqueo)     │      │    │
│     │  │                                          │      │    │
│     │  │  ERROR/NO DISPONIBLE → PENDIENTE          │      │    │
│     │  │       (no bloquea, pero flaggea)          │      │    │
│     │  └──────────────────────────────────────────┘      │    │
│     └────────────────────────────────────────────────────┘    │
│                                                                │
│  4. Resultado se almacena en el documento:                     │
│     verificationSource, verificationStatus, verificationDate   │
│                                                                │
│  5. El CCS registra el resultado de verificación en el snapshot│
└──────────────────────────────────────────────────────────────┘
```

#### 19.4.3 Datos adicionales para el snapshot CCS

Al integrar la verificación externa, cada documento en `documentosData` del snapshot incluiría campos adicionales:

```jsonc
{
  "templateId": 8,
  "templateName": "Póliza de Seguro del Vehículo",
  "entityType": "CAMION",
  "entityId": 18,
  "status": "VIGENTE",
  "documentId": 287,
  "expiresAt": "2026-03-15T00:00:00.000Z",
  "fileHash": "b4c3d2e1f0a9b8c7...",
  // --- Nuevos campos de verificación ---
  "verification": {
    "source": "SSN",                    // Fuente consultada
    "status": "CONFIRMED",              // CONFIRMED | DISCREPANCY | PENDING | NOT_AVAILABLE
    "verifiedAt": "2026-01-05T10:30:00Z",
    "policyNumber": "****4567",          // Dato verificado (parcialmente enmascarado)
    "expiresAtConfirmed": "2026-03-15",  // Fecha de vigencia confirmada por fuente oficial
    "confidenceScore": 0.98             // Score de confianza (1.0 = máximo)
  }
}
```

Esto fortalece enormemente el peso probatorio del certificado CCS: no solo se certifica que "el documento existía y estaba aprobado", sino que "los datos del documento fueron confirmados contra la fuente oficial".

#### 19.4.4 Prioridad de integración

| # | Fuente | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| 1 | **SSN** (Pólizas de seguro) | Muy alto - seguros es donde más fraude hay y más riesgo legal existe | Medio (scraping de consulta pública o API) | **P1** |
| 2 | **ARCA** (Constancias fiscales) | Alto - valida existencia legal de la empresa/persona | Bajo (API REST pública y documentada) | **P1** |
| 3 | **CNRT** (Habilitaciones de transporte) | Alto - valida que el vehículo está habilitado | Medio (consulta pública web) | **P2** |
| 4 | **DNRPA** (Cédula del vehículo) | Medio - valida titularidad y datos del vehículo | Medio (consulta web) | **P2** |
| 5 | **CENALEC** (Licencia de conducir) | Alto - pero acceso es más restringido | Alto (requiere convenio) | **P3** |
| 6 | **SRT** (ART y cobertura) | Medio | Alto (requiere convenio institucional) | **P3** |

---

### 19.5 Capa 2: Declaración jurada electrónica y no repudio

#### 19.5.1 Marco legal

Argentina tiene marco legal sólido para la firma electrónica:

- **Ley 25.506 de Firma Digital**: Distingue entre **firma digital** (con certificado emitido por AC habilitada, equivalente a firma ológrafa) y **firma electrónica** (cualquier dato electrónico que identifique al firmante, con valor probatorio menor pero válido).
- **Artículos 292-296 del Código Penal**: Tipifican los delitos de falsificación de documento público y privado, uso de documento falso, y certificaciones falsas.

#### 19.5.2 Implementación: Declaración jurada al momento de carga

En lugar de exigir firma digital PKI (que requeriría que cada transportista tenga un certificado digital, generando una barrera de adopción altísima), se implementa una **declaración jurada electrónica** al momento de subir cada documento:

**Texto de la declaración:**

> *"Declaro bajo juramento que el documento adjunto es copia fiel del original y que los datos contenidos son verídicos. Comprendo que la presentación de documentación adulterada, falsificada o apócrifa constituye delito penal conforme a los artículos 292 a 296 del Código Penal de la Nación Argentina, y que esta declaración tiene carácter de declaración jurada en los términos del artículo 109 del Código Penal."*

**Datos capturados y almacenados en el audit log:**

| Dato | Finalidad |
|---|---|
| `userId` | Identidad del cargador (usuario autenticado) |
| `timestamp` (UTC) | Momento exacto de la declaración |
| `ipAddress` | Dirección IP del dispositivo |
| `userAgent` | Navegador/dispositivo utilizado |
| `documentHash` (SHA-256) | Hash del archivo subido (vincula la declaración al archivo exacto) |
| `declarationVersion` | Versión del texto de declaración (para auditabilidad si cambia) |
| `accepted` | Boolean: el usuario aceptó explícitamente (requiere checkbox o botón confirmatorio) |

**Efecto legal:**
- No previene el fraude per se, pero genera una **disuasión legal fuerte** (el cargador sabe que hay registro inalterable de su responsabilidad)
- Crea **evidencia procesal** admisible en caso de disputa (quién subió qué, cuándo y desde dónde)
- Combinada con el hash chain del CCS, la declaración es **inalterable retroactivamente**

#### 19.5.3 Integración con CCS

El snapshot CCS incluiría en `documentosData` un campo `uploaderDeclaration`:

```jsonc
{
  "templateId": 8,
  "templateName": "Póliza de Seguro",
  // ... campos existentes ...
  "uploaderDeclaration": {
    "userId": 142,
    "userEmail": "transportista@empresa.com",
    "userRole": "TRANSPORTISTA",
    "declaredAt": "2026-01-05T09:00:00Z",
    "ipHash": "a1b2c3d4...",           // Hash de la IP (no la IP en sí, por privacidad)
    "declarationVersion": "1.0",
    "documentHashAtDeclaration": "b4c3d2e1..."  // Coincide con fileHash
  }
}
```

Esto permite verificar que **la misma persona que declaró la autenticidad es quien subió exactamente ese archivo, y que el archivo no fue modificado entre la declaración y la certificación.**

#### 19.5.4 Sobre la firma digital PKI (nivel superior, opcional)

Si en el futuro se requiere un nivel de certeza aún mayor (ej: exigencia regulatoria de la CNRT o requerimiento judicial), se podría habilitar **opcionalmente** la firma digital con certificado X.509:

- El cargador firma el documento con su certificado digital personal
- La firma se valida contra la cadena de certificación de la AC Raíz de la República Argentina
- Esto eleva la declaración al nivel de firma ológrafa (Ley 25.506, art. 3)

**Recomendación**: No implementar como requisito obligatorio (barrera de adopción). Habilitarlo como opción premium o para documentos de alto valor (pólizas de seguro de gran monto, habilitaciones especiales).

---

### 19.6 Capa 3: Análisis de consistencia y metadatos

#### 19.6.1 Inspección de metadatos del archivo

Cada archivo subido (PDF o imagen) contiene metadatos que revelan información sobre su origen y posible manipulación:

**Para archivos PDF:**

| Metadato | Qué revela | Indicador de fraude |
|---|---|---|
| `Producer` / `Creator` | Software que generó el PDF | Un certificado de seguro generado con "Adobe Photoshop" o "GIMP" es sospechoso |
| `CreationDate` | Fecha de creación del archivo | Si el PDF dice "Emitido el 15/01" pero fue creado el 20/01, es sospechoso |
| `ModDate` | Última fecha de modificación | Si `ModDate` difiere significativamente de `CreationDate`, fue editado |
| Fuentes embebidas | Tipografías utilizadas | Inconsistencia de fuentes sugiere edición |
| Versión PDF | Versión del formato | Cambios de versión tras edición |

**Para imágenes (JPEG, PNG):**

| Metadato | Qué revela | Indicador de fraude |
|---|---|---|
| EXIF `Make` / `Model` | Cámara/escáner utilizado | Puede verificarse consistencia entre cargas del mismo usuario |
| EXIF `DateTime` | Fecha de captura | Inconsistencias con la fecha declarada |
| DPI / Resolución | Resolución de la imagen | Zonas con DPI diferente al resto indican edición |
| Compresión JPEG | Nivel de compresión | Regiones con diferente nivel de compresión (detectable via ELA) |

#### 19.6.2 Error Level Analysis (ELA)

El ELA es una técnica de análisis forense de imágenes que detecta manipulación:

1. Se re-comprime la imagen a un nivel de calidad conocido (ej: JPEG 95%)
2. Se compara pixel a pixel con la imagen original
3. Las regiones que fueron editadas (pegadas, retocadas) presentan **niveles de error diferentes** al resto de la imagen
4. La diferencia se visualiza como un mapa de calor: las zonas "calientes" son sospechosas

**Aplicabilidad**: Útil para licencias de conducir, DNIs y certificados escaneados donde alguien podría haber pegado una foto o alterado una fecha.

**Limitación**: No es infalible. Un falsificador sofisticado puede contrarrestar ELA. Es una señal más dentro del scoring, no un veredicto definitivo.

#### 19.6.3 OCR + Cross-reference de datos

Ya existente parcialmente en el flujo de IA (Flowise), esta capa se fortalece:

1. **Extracción OCR** de datos clave del documento: números de póliza, CUIT, DNI, patentes, fechas de vigencia, nombre del titular
2. **Comparación automática** contra datos del sistema:
   - ¿El CUIT del documento coincide con el CUIT del transportista en el sistema?
   - ¿La patente del certificado de seguro coincide con la patente del camión?
   - ¿El DNI de la licencia coincide con el DNI del chofer?
   - ¿Las fechas de vigencia son coherentes (no están en el pasado)?
3. **Alertas automáticas** cuando hay discrepancias

Ejemplo de discrepancias detectables:

| Tipo | Dato en el documento (OCR) | Dato en el sistema | Resultado |
|---|---|---|---|
| Patente incorrecta | Seguro cubre "AB 123 CD" | Camión tiene patente "AB 456 EF" | Alerta: documento para otro vehículo |
| DNI no coincide | Licencia a nombre de DNI 30.000.000 | Chofer tiene DNI 25.000.000 | Alerta: licencia de otra persona |
| Fecha incoherente | Vigencia hasta "15/01/2025" | Fecha actual: febrero 2026 | Alerta: documento ya vencido al momento de carga |
| CUIT inexistente | Constancia ARCA de CUIT 20-99999999-9 | Consulta ARCA: CUIT no existe | Alerta: documento apócrifo |

---

### 19.7 Capa 4: Detección de anomalías con ML/AI

#### 19.7.1 Enfoque a corto plazo: scoring con LLM existente

Aprovechando la integración actual con Flowise/LLM, se puede implementar un **score de confianza** al momento de la carga:

El modelo analiza el documento y asigna un score de 0.0 a 1.0 basado en:

- **Consistencia visual**: ¿El formato es consistente con documentos del mismo emisor ya aprobados?
- **Coherencia de datos**: ¿Los datos extraídos por OCR son internamente coherentes?
- **Patrón de emisor**: ¿Los metadatos del PDF coinciden con el patrón esperado para ese emisor? (ej: las pólizas de La Caja suelen venir generadas con software X, DPI Y)
- **Historial del cargador**: ¿Este usuario ha tenido documentos rechazados antes? ¿Con qué frecuencia?

**Reglas de routing basadas en score:**

| Score | Acción | Nivel de revisión |
|---|---|---|
| 0.85 - 1.00 | Aprobación acelerada (revisión rápida) | El aprobador ve badge verde "Alta confianza" |
| 0.60 - 0.84 | Revisión normal | Sin badge, flujo estándar |
| 0.30 - 0.59 | Revisión detallada obligatoria | Badge amarillo "Verificación adicional recomendada" |
| 0.00 - 0.29 | Bloqueo + escalamiento | Badge rojo "Sospechoso", requiere verificación manual con fuente externa |

**Punto clave**: El score nunca reemplaza la aprobación humana. Solo prioriza y guía la atención del aprobador.

#### 19.7.2 Enfoque a largo plazo: detección de anomalías no supervisada

Con volumen suficiente de documentos verificados (>1000 por tipo de plantilla):

1. **Modelo de normalidad**: Entrenar un modelo (autoencoder, isolation forest, o similar) sobre documentos aprobados y verificados para aprender "cómo se ve un documento normal" por tipo
2. **Detección de outliers**: Los documentos que se desvían significativamente del patrón se flaggean
3. **Feedback loop**: Los documentos rechazados por fraude confirmado alimentan el modelo como ejemplos negativos
4. **Evolución**: Con el tiempo, el modelo mejora su capacidad de discriminación

**Requisitos de datos mínimos**: ~500 documentos aprobados por tipo de plantilla para un modelo útil. Con 86 requisitos actuales y múltiples equipos, esto se alcanza en los primeros meses de operación.

#### 19.7.3 Indicadores de fraude basados en comportamiento

Sin ML, hay patrones detectables con reglas simples:

| Patrón | Indicador | Acción |
|---|---|---|
| Mismo hash para documentos de diferentes entidades | Un mismo PDF se subió como "seguro" para 3 camiones diferentes | Alerta automática |
| Todos los documentos vencen el mismo día | Un transportista sube 15 documentos que todos vencen el 31/12 | Verificación aleatoria |
| Carga masiva a fin de mes | Se suben 40 documentos el último día antes de un plazo | Revisión detallada muestreada |
| Tamaño/resolución anómalos | PDF de 30KB cuando los normales son ~200KB | Flag por documento inusualmente liviano |
| Metadatos borrados | PDF sin metadatos (deliberadamente stripped) | Flag: posible intento de ocultar origen |

---

### 19.8 Capa 5: Auditoría humana y proceso

Ningún sistema técnico reemplaza los controles de proceso organizacionales:

#### 19.8.1 Auditorías aleatorias periódicas

- **Frecuencia**: Mensual
- **Muestra**: 5-10% de documentos aprobados en el período
- **Método**: Selección aleatoria estratificada por tipo de documento y transportista
- **Verificación**: Contactar al emisor original (aseguradora, ART, organismo) para confirmar autenticidad
- **Registro**: Resultado de la auditoría se almacena en el sistema y alimenta el scoring de confianza

#### 19.8.2 Blacklist y penalización

- **Primera infracción detectada**: Advertencia formal + re-verificación obligatoria de todos los documentos del transportista
- **Segunda infracción**: Suspensión temporal de la cuenta (30 días)
- **Tercera infracción o fraude grave**: Bloqueo permanente + denuncia penal (con la evidencia del audit trail + declaración jurada)

#### 19.8.3 Verificación cruzada entre emisores conocidos

Con el volumen creciente de documentos, la plataforma puede construir una base de referencia:

- Si 50 pólizas de "Seguros La Caja" siempre tienen cierto formato y metadatos, la póliza #51 que difiera significativamente es sospechosa
- Los certificados de ART de una empresa específica deberían incluir siempre a los mismos empleados (consistencia de nómina)
- Las RTOs de una planta de inspección deberían tener formato consistente

---

### 19.9 Integración con el CCS: el campo `trustLevel`

El CCS ya registra `estadoGlobal` (COMPLETO, INCOMPLETO, VENCIDO, PARCIAL). Con las capas de prevención de fraude, se agrega un campo complementario **`trustLevel`** que indica el nivel de confianza en la autenticidad:

```jsonc
{
  "estadoGlobal": "COMPLETO",
  "trustLevel": "HIGH",         // HIGH | MEDIUM | LOW | UNVERIFIED
  "trustBreakdown": {
    "documentsVerifiedExternally": 8,    // Confirmados contra fuente oficial
    "documentsWithDeclaration": 15,      // Con declaración jurada
    "documentsWithHighScore": 12,        // Score > 0.85
    "documentsWithAlerts": 0,            // Con alertas activas
    "lastAuditDate": "2026-01-15",       // Última auditoría del transportista
    "transportistaReputationScore": 0.95 // Score acumulado del transportista
  }
}
```

**Niveles de confianza:**

| Trust Level | Criterio | Indicador visual |
|---|---|---|
| **HIGH** | >80% de documentos verificados externamente O score promedio >0.85 sin alertas | Verde |
| **MEDIUM** | Documentos con declaración jurada, sin verificación externa completa, sin alertas | Amarillo |
| **LOW** | Al menos un documento con alerta activa o score <0.60 | Naranja |
| **UNVERIFIED** | Sin verificación externa ni scoring | Gris |

El `trustLevel` se incluye en el certificado PDF y en la respuesta autenticada de consulta de certificados, dando al verificador una idea clara no solo de si la documentación estaba "al día" sino de cuánta confianza hay en su autenticidad.

---

### 19.10 Sello de tiempo certificado (TSA RFC 3161)

Como complemento al anclaje blockchain, se puede utilizar un servicio de **Timestamping Authority (TSA)** conforme a RFC 3161:

- El hash del snapshot se envía a una TSA certificada (ej: TSA de la AC Raíz de Argentina)
- La TSA devuelve un token firmado que prueba que el hash existía en ese momento exacto
- Esto tiene **validez legal directa** en Argentina (Ley 25.506), a diferencia del blockchain que tiene validez probatoria pero no está explícitamente regulado

**Cuándo usar TSA vs Blockchain:**

| Criterio | TSA (RFC 3161) | Blockchain (Polygon) |
|---|---|---|
| **Validez legal explícita** | Sí (Ley 25.506) | Indirecta (prueba pericial) |
| **Costo** | Variable (por sello) | ~$0.01/día |
| **Independencia** | Depende de la TSA | Descentralizado |
| **Verificación** | Requiere la cadena de certificación de la TSA | Cualquiera puede verificar |
| **Recomendación** | Para documentos de alto valor legal | Para operación diaria masiva |

**Propuesta**: Usar blockchain (Polygon) para el anclaje diario masivo (barato, descentralizado). Agregar TSA opcionalmente para certificados individuales que requieran máximo peso legal (ej: antes de una auditoría CNRT o tras un siniestro).

---

### 19.11 Matriz de prioridades de implementación

| # | Capa | Acción | Esfuerzo | Impacto | Prioridad |
|---|---|---|---|---|---|
| 1 | Capa 2 | Declaración jurada electrónica al cargar documentos | Bajo (1-2 días) | Alto (disuasión + legal) | **P1 - Inmediata** |
| 2 | Capa 3 | Inspección de metadatos del PDF/imagen al subir | Bajo-Medio (2-3 días) | Medio (detecta ediciones burdas) | **P1 - Inmediata** |
| 3 | Capa 1 | Integración SSN para verificar pólizas de seguro | Medio (1-2 semanas) | Muy alto (seguros = mayor riesgo) | **P1 - Sprint siguiente** |
| 4 | Capa 3 | OCR + cross-reference contra datos del sistema | Medio (1 semana) | Alto (detecta inconsistencias básicas) | **P2** |
| 5 | Capa 1 | Integración ARCA para constancias fiscales | Medio (1 semana) | Alto (valida existencia legal) | **P2** |
| 6 | Capa 4 | Scoring de confianza con LLM (Flowise) | Medio (1-2 semanas) | Medio-Alto (prioriza revisión) | **P2** |
| 7 | Capa 5 | Proceso de auditorías aleatorias (organizacional, no tech) | Bajo (procedimiento) | Alto (disuasión + detección) | **P2** |
| 8 | Capa 4 | Reglas de detección de patrones sospechosos | Medio (1 semana) | Medio (heurísticas simples) | **P3** |
| 9 | Capa 3 | Error Level Analysis (ELA) para imágenes | Alto (2 semanas) | Medio (análisis forense) | **P3** |
| 10 | Capa 4 | ML de detección de anomalías (no supervisado) | Alto (1-2 meses) | Alto (a largo plazo) | **P4** |
| 11 | Capa 1 | Integración CNRT, DNRPA, CENALEC, SRT | Alto (1-2 meses) | Alto (verificación completa) | **P4** |
| 12 | Capa 2 | Firma digital PKI opcional (certificado X.509) | Alto (requiere integración con AC) | Alto (máximo peso legal) | **P5 - Futuro** |

---

### 19.12 Integración con las fases CCS principales

Las capas de prevención de fraude se integran directamente en las fases CCS definidas en la sección 16:

| Fase CCS | Capas de fraude incluidas |
|---|---|
| **Fase 1** (Snapshots + Hash Chain) | Declaración jurada electrónica, inspección básica de metadatos, registro de `trustLevel` en snapshots, cifrado en reposo |
| **Fase 2** (Copias Congeladas + Watermark) | Marcas de agua visibles + invisibles, WORM en MinIO |
| **Fase 4** (Portales Autenticados) | Dashboard de alertas, auditoría de accesos, verificación de cadena desde portal |
| **Fase 5** (Verificación Fuentes Oficiales) | SSN, ARCA, OCR + cross-reference |
| **Fase 6** (AI Scoring + Trust Level) | LLM scoring on-premise, detección de anomalías, ELA, reglas de patrones |

Las auditorías aleatorias (Capa 5) y la firma PKI/TSA (Capa 1 reforzada) quedan como consideraciones futuras (sección 18.1).

---

## 20. Glosario

| Término | Definición |
|---|---|
| **AC** | Autoridad Certificante: entidad que emite certificados digitales (ej: AC-ONTI en Argentina) |
| **Acceso autenticado** | Todo acceso a certificados y documentos del CCS requiere JWT válido; no existen endpoints públicos de consulta |
| **Anclaje** | Publicación del Merkle root en una blockchain pública como prueba inmutable de existencia |
| **ARCA** | Agencia de Recaudación y Control Aduanero (ex-AFIP): administración tributaria argentina |
| **Audit trail** | Registro inmutable en `CertificateAccessAudit` de toda consulta a certificados y documentos |
| **Baseline** | Snapshot diario automático generado por el job nocturno, refleja el estado completo del equipo |
| **CENALEC** | Centro Nacional de Licencias de Conducir |
| **Certificate Ref** | UUID único del snapshot, usado como referencia interna en URLs del portal autenticado |
| **Cifrado en reposo** | Protección de datos almacenados: LUKS para discos, SSE-S3 para MinIO, GPG para backups |
| **CNRT** | Comisión Nacional de Regulación del Transporte |
| **Content Hash** | SHA-256 del contenido canónico (JSON serializado con keys ordenadas) del snapshot |
| **Copia congelada** | Copia inmutable del documento almacenada en MinIO con Object Lock (WORM) al momento de la certificación |
| **Declaración jurada electrónica** | Compromiso legal del cargador sobre la autenticidad del documento, registrado en `DocumentUploadDeclaration` con hash del archivo, IP y timestamp |
| **DNRPA** | Dirección Nacional de Registros de la Propiedad del Automotor |
| **ELA** | Error Level Analysis: técnica forense que detecta regiones manipuladas en imágenes analizando diferencias de compresión JPEG |
| **Esteganografía** | Técnica de ocultar información (marca de agua invisible) en los bits menos significativos de los píxeles de una imagen |
| **Event snapshot** | Snapshot generado por un evento específico (aprobación, rechazo, vencimiento de documento) en tiempo real |
| **Hash Chain** | Cadena donde cada snapshot incluye el hash del anterior, formando una secuencia verificable de integridad |
| **LUKS** | Linux Unified Key Setup: estándar de cifrado de disco completo para Linux |
| **Marca de agua visible** | Texto superpuesto en diagonal sobre documentos servidos, identificando al usuario consultante |
| **Marca de agua invisible** | Datos binarios embebidos en píxeles (LSB) que sobreviven recompresión e identifican la fuente de una fuga |
| **Merkle Proof** | Conjunto mínimo de hashes hermanos necesarios para demostrar que un snapshot está incluido en un Merkle root |
| **Merkle Root** | Hash raíz del Merkle tree, representa la totalidad de los snapshots de un día |
| **Merkle Tree** | Estructura de árbol binario de hashes que permite verificar inclusión eficientemente en O(log n) |
| **Object Lock (WORM)** | Write Once Read Many: política de MinIO que impide borrar o modificar objetos antes de su fecha de retención |
| **PDF autoverificable** | PDF de certificado que incluye firma, Merkle proof y datos suficientes para verificación offline sin acceso al sistema |
| **PKI** | Public Key Infrastructure: infraestructura de certificados digitales para firma electrónica |
| **Polygon** | Blockchain pública compatible con Ethereum, usada por su bajo costo de transacción (~$0.01/tx) |
| **RS256** | Algoritmo de firma digital RSA con SHA-256, usado para firmar snapshots del CCS |
| **Score de confianza** | Valor numérico (0.0-1.0) calculado por la AI on-premise que indica la probabilidad de autenticidad de un documento |
| **Soberanía de datos** | Principio de que ningún documento ni dato documental sale de la infraestructura propia; toda AI corre on-premise |
| **SSE-S3** | Server-Side Encryption de MinIO: cifrado automático de objetos con clave maestra gestionada por el servidor |
| **SSN** | Superintendencia de Seguros de la Nación: organismo regulador de seguros en Argentina |
| **SRT** | Superintendencia de Riesgos del Trabajo: regula las ART en Argentina |
| **Snapshot** | Captura inmutable del estado de compliance de un equipo en un momento dado (baseline o evento) |
| **TSA** | Timestamping Authority: servicio de sellado de tiempo conforme RFC 3161, con validez legal directa |
| **Trust Level** | Clasificación de confianza del snapshot (HIGH, MEDIUM, LOW, UNVERIFIED) basada en verificaciones externas, scoring y declaraciones |
| **Watermark code** | Código de tracking (`WM-XXXXXX`) que vincula una marca de agua con el registro de auditoría del acceso |
