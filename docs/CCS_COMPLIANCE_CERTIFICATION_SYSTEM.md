# Compliance Certification System (CCS)

## Sistema de Certificación de Compliance para Equipos de Transporte

**Versión**: 1.1  
**Fecha**: 2026-02-11  
**Autor**: Equipo de Arquitectura BCA  
**Estado**: Diseño aprobado, pendiente implementación  
**Changelog**: v1.1 - Agregado sistema de snapshots por evento (sección 6.5)

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
10. [Sistema de Verificación Pública](#10-sistema-de-verificación-pública)
11. [Generación de Certificados PDF](#11-generación-de-certificados-pdf)
12. [API Endpoints](#12-api-endpoints)
13. [Scheduling y Jobs](#13-scheduling-y-jobs)
14. [Estimaciones de Almacenamiento](#14-estimaciones-de-almacenamiento)
15. [Seguridad](#15-seguridad)
16. [Fases de Implementación](#16-fases-de-implementación)
17. [Escenarios Especiales y Casos Borde](#17-escenarios-especiales-y-casos-borde)
18. [Consideraciones Futuras](#18-consideraciones-futuras)

---

## 1. Resumen Ejecutivo

El Compliance Certification System (CCS) permite certificar de forma criptográficamente verificable que un equipo de transporte (chofer + camión + acoplado + empresa transportista) cumplía con todos los requisitos documentales en una fecha determinada.

El sistema genera **snapshots diarios automáticos** del estado de compliance de cada equipo activo, los firma digitalmente con RS256, los encadena mediante hashes (hash chain inmutable) y ancla periódicamente la cadena en una **blockchain pública** como prueba de existencia temporal.

Adicionalmente, se generan **copias congeladas** de los documentos originales (PDFs) vinculadas a cada certificado, permitiendo que un tercero no solo verifique el estado declarado sino que acceda a la evidencia documental real.

### Propuesta de valor

| Actor | Beneficio |
|---|---|
| **Dador de carga** | Prueba irrefutable de que mantuvo su flota en compliance |
| **Cliente** | Garantía verificable de que los equipos asignados cumplían requisitos |
| **Regulador/Auditor** | Prueba con peso probatorio: firma digital + anclaje blockchain |
| **Aseguradora** | Evidencia de due diligence documental en caso de siniestro |

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
| RF-01 | Generar snapshot diario automático de compliance de cada equipo activo | Alta |
| RF-02 | Firmar cada snapshot con clave privada RS256 | Alta |
| RF-03 | Encadenar snapshots mediante hash del snapshot anterior | Alta |
| RF-04 | Generar copia congelada de los documentos asociados al snapshot | Alta |
| RF-05 | Anclar el Merkle root diario en blockchain pública | Alta |
| RF-06 | Permitir verificación pública sin autenticación (por token/QR) | Alta |
| RF-07 | Generar certificado PDF descargable con QR de verificación | Media |
| RF-08 | Permitir al dador generar certificados bajo demanda para fechas pasadas | Media |
| RF-09 | Permitir al cliente verificar compliance de equipos asignados | Media |
| RF-10 | Soportar certificación de flota completa (múltiples equipos, una fecha) | Media |

### 3.2 No funcionales

| ID | Requisito | Métrica |
|---|---|---|
| RNF-01 | Snapshot de 1000 equipos en < 5 minutos | Job nocturno |
| RNF-02 | Verificación pública responde en < 500ms | P95 |
| RNF-03 | Almacenamiento de snapshots escalable a 3 años | ~2M registros |
| RNF-04 | Anclaje blockchain con costo < $1 USD/día | Polygon/Bitcoin |
| RNF-05 | Copias congeladas accesibles durante 2 años mínimo | Política MinIO |

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
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                       │
│                                                               │
│  Portal Dador          Portal Cliente         Portal Público  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐  │
│  │ Generar       │     │ Ver compliance│     │ Verificar     │  │
│  │ certificado   │     │ de equipos    │     │ certificado   │  │
│  │ bajo demanda  │     │ asignados     │     │ por token/QR  │  │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘  │
└─────────┼───────────────────┼───────────────────┼───────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE SERVICIOS                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐     │
│  │            ComplianceCertificationService              │     │
│  │                                                       │     │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │     │
│  │  │  Snapshot    │ │  Hash Chain   │ │  Blockchain   │  │     │
│  │  │  Generator   │ │  Manager      │ │  Anchor       │  │     │
│  │  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘  │     │
│  │         │               │                │           │     │
│  │  ┌──────┴──────┐ ┌──────┴───────┐ ┌──────┴───────┐  │     │
│  │  │  Document   │ │  Certificate  │ │  Verification │  │     │
│  │  │  Freezer    │ │  PDF Builder  │ │  Service      │  │     │
│  │  └─────────────┘ └──────────────┘ └──────────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
│  Servicios existentes reutilizados:                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐   │
│  │ ComplianceService│ │  MinIOService    │ │EquipoService │   │
│  └─────────────────┘ └─────────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL   │  │  MinIO        │  │  Blockchain       │   │
│  │              │  │              │  │  (Polygon/Bitcoin) │   │
│  │ - Snapshots  │  │ - Docs       │  │                    │   │
│  │ - Merkle     │  │   congelados │  │ - Merkle root      │   │
│  │ - Tokens     │  │ - PDFs cert. │  │   diario           │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
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

  // --- VERIFICACIÓN ---

  // Token corto para verificación pública (8 caracteres alfanuméricos)
  verificationToken String   @unique @map("verification_token") @db.VarChar(16)

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
  @@index([verificationToken])
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

  // URL del explorador para verificación pública
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

/// Tokens de acceso para verificación pública y compartir certificados.
/// Permite acceso sin autenticación a snapshots específicos.
model CertificateAccessToken {
  id                String   @id @default(uuid()) @db.Uuid
  tenantEmpresaId   Int      @map("tenant_empresa_id")

  // Quién generó el token
  createdByUserId   Int      @map("created_by_user_id")

  // Tipo de token
  tokenType         CCSTokenType @map("token_type")

  // Token público (12 caracteres alfanuméricos, URL-safe)
  publicToken       String   @unique @map("public_token") @db.VarChar(24)

  // Alcance del token
  // Para SINGLE: un equipoId + una fecha
  // Para RANGE: un equipoId + fecha desde/hasta
  // Para FLEET: lista de equipoIds + una fecha
  equipoIds         Int[]    @map("equipo_ids")
  fechaDesde        DateTime @map("fecha_desde") @db.Date
  fechaHasta        DateTime @map("fecha_hasta") @db.Date

  // Permisos
  allowDocumentDownload Boolean @default(true) @map("allow_document_download")

  // Vigencia del token
  expiresAt         DateTime? @map("expires_at")
  active            Boolean   @default(true)

  // Auditoría de uso
  accessCount       Int       @default(0) @map("access_count")
  lastAccessedAt    DateTime? @map("last_accessed_at")
  lastAccessedIp    String?   @map("last_accessed_ip") @db.VarChar(45)

  createdAt         DateTime  @default(now()) @map("created_at")

  @@index([publicToken])
  @@index([tenantEmpresaId, createdByUserId])
  @@index([expiresAt])
  @@map("certificate_access_tokens")
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

enum CCSTokenType {
  SINGLE                // Un equipo, una fecha
  RANGE                 // Un equipo, rango de fechas
  FLEET                 // Múltiples equipos, una fecha
  RECURRING             // Actualización diaria automática
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
│     │ i. Generar verificationToken (8 chars aleatorios)  │    │
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

## 10. Sistema de Verificación Pública

### 10.1 Flujo de verificación por token

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Cliente  │ ──(1)──▶│  GET /verify  │ ──(2)──▶│  Buscar       │
│  (browser)│         │  /:token      │         │  snapshot por  │
│           │         │  (sin auth)   │         │  token         │
│           │◀──(5)── │              │◀──(3)── │              │
│           │         │              │ ──(4)──▶│  Verificar     │
│  Ver      │         │  Renderizar  │         │  firma +       │
│  resultado│         │  resultado   │         │  cadena +      │
│  + docs   │         │              │         │  merkle proof  │
└──────────┘         └──────────────┘         └──────────────┘
```

### 10.2 Respuesta de verificación

```jsonc
{
  "verified": true,
  "certificate": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fecha": "2026-01-15",
    "timestamp": "2026-01-15T10:15:00.000Z",
    "snapshotType": "EVENT",
    "daySequence": 1,
    "triggerEvent": "DOCUMENT_APPROVED",
    "estadoGlobal": "COMPLETO",
    "equipo": {
      "chofer": { "dni": "24644385", "nombre": "NELSON LEONEL PALMA" },
      "camion": { "patente": "AB123CD", "marca": "SCANIA R500" },
      "acoplado": { "patente": "XY789ZW", "tipo": "SEMI" },
      "empresaTransportista": { "cuit": "20-12345678-9", "razonSocial": "TRANSPORTES DEL SUR S.A." }
    },
    "documentos": [
      {
        "nombre": "Licencia Nacional de Conducir",
        "entidad": "Chofer - 24644385",
        "estado": "VIGENTE",
        "vencimiento": "2026-06-30",
        "downloadUrl": "/api/docs/compliance/verify/ABC12345/doc/0"
      }
      // ... más documentos
    ],
    "clientes": ["ARCOR S.A."],
    "timeline": [
      { "timestamp": "2026-01-15T03:00:00Z", "type": "BASELINE", "estado": "INCOMPLETO" },
      { "timestamp": "2026-01-15T10:15:00Z", "type": "EVENT", "estado": "COMPLETO", "event": "ART aprobada" },
      { "timestamp": "2026-01-15T14:30:00Z", "type": "EVENT", "estado": "VENCIDO", "event": "Seguro venció" }
    ],
    "verificacion": {
      "firmaValida": true,
      "cadenaIntegra": true,
      "blockchainAnclado": true,
      "blockchainTx": "0x1234...abcd",
      "blockchainExplorer": "https://polygonscan.com/tx/0x1234...abcd",
      "merkleProofValido": true
    }
  }
}
```

> Nota: el campo `timeline` muestra todos los snapshots del día para ese equipo, permitiendo al verificador ver la evolución intra-día de la compliance. El snapshot devuelto es el que corresponde al momento consultado (ver sección 6.6).

### 10.3 Acceso a documentos congelados

Cuando el token tiene `allowDocumentDownload: true`, cada documento incluye una URL temporal para descarga:

```
GET /api/docs/compliance/verify/{token}/doc/{index}
```

Este endpoint:
1. Valida el token y su vigencia
2. Obtiene la ruta del documento congelado en MinIO
3. Genera una presigned URL (15 minutos)
4. Redirige al cliente a la presigned URL
5. Registra el acceso en `accessCount` / `lastAccessedAt`

---

## 11. Generación de Certificados PDF

### 11.1 Contenido del PDF

```
┌────────────────────────────────────────────────────┐
│                                                      │
│  ╔══════════════════════════════════════════════╗    │
│  ║  CERTIFICADO DE COMPLIANCE DOCUMENTAL        ║    │
│  ║  Sistema BCA - Gestión de Transporte         ║    │
│  ╚══════════════════════════════════════════════╝    │
│                                                      │
│  Fecha de certificación: 15 de enero de 2026        │
│  Certificado N°: CCS-2026-0115-00047                │
│  Token de verificación: ABC12345                     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ EQUIPO                                      │     │
│  ├────────────────────────────────────────────┤     │
│  │ Chofer:      NELSON LEONEL PALMA           │     │
│  │              DNI 24.644.385                │     │
│  │ Camión:      Patente AB 123 CD             │     │
│  │              SCANIA R500                    │     │
│  │ Acoplado:    Patente XY 789 ZW             │     │
│  │              SEMI                           │     │
│  │ Transportista: TRANSPORTES DEL SUR S.A.    │     │
│  │              CUIT 20-12345678-9             │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ ESTADO DE DOCUMENTACIÓN          ● COMPLETO│     │
│  ├──────────────────────┬─────────┬───────────┤     │
│  │ Documento            │ Estado  │ Vence     │     │
│  ├──────────────────────┼─────────┼───────────┤     │
│  │ Licencia de Conducir │ ✅ OK   │ 30/06/26  │     │
│  │ Seguro del Vehículo  │ ✅ OK   │ 15/03/26  │     │
│  │ VTV Camión           │ ✅ OK   │ 20/08/26  │     │
│  │ VTV Acoplado         │ ✅ OK   │ 12/09/26  │     │
│  │ ART                  │ ✅ OK   │ 01/04/26  │     │
│  │ RUTA / Habilitación  │ ✅ OK   │ 30/12/26  │     │
│  └──────────────────────┴─────────┴───────────┘     │
│                                                      │
│  ┌────────────────────────────────────────────┐     │
│  │ VERIFICACIÓN CRIPTOGRÁFICA                  │     │
│  ├────────────────────────────────────────────┤     │
│  │ Content Hash:  a3f2b8c1d4e5...             │     │
│  │ Firma RS256:   Válida ✅                    │     │
│  │ Cadena:        Íntegra ✅ (registro #47)   │     │
│  │ Blockchain:    Polygon tx 0x1234...abcd    │     │
│  │ Bloque:        #45,231,789                  │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  ┌──────┐  Verificar este certificado:              │
│  │ [QR] │  https://bca.dominio.com/verificar/       │
│  │      │  ABC12345                                  │
│  └──────┘                                            │
│                                                      │
│  Este certificado fue generado automáticamente por   │
│  el sistema BCA y firmado digitalmente. Los datos    │
│  están anclados en la blockchain de Polygon.         │
│  La alteración de cualquier dato invalida la firma.  │
│                                                      │
└────────────────────────────────────────────────────┘
```

### 11.2 Librería de generación

Se utilizará `pdfkit` (ya presente en el proyecto para otras funcionalidades) para generar los certificados PDF. Los PDFs se almacenan en el bucket de compliance junto a las copias congeladas.

---

## 12. API Endpoints

### 12.1 Endpoints autenticados (Portal Dador / Admin)

```
# Generar certificado bajo demanda para un equipo y fecha/hora
POST /api/docs/compliance/certificates
Body: { equipoId: number, fecha: string, hora?: string }
# Si hora es null, se usa el último snapshot del día (23:59:59)
# Si hora es "10:30", se busca el snapshot vigente a las 10:30
Response: { certificateId, verificationToken, pdfUrl, snapshotTimestamp }

# Generar certificado de flota (múltiples equipos, una fecha)
POST /api/docs/compliance/certificates/fleet
Body: { equipoIds: number[], fecha: string, clienteId?: number }
Response: { certificates: Array<{ equipoId, certificateId, verificationToken }>, fleetToken }

# Listar certificados generados
GET /api/docs/compliance/certificates?equipoId=&fechaDesde=&fechaHasta=&page=&limit=
Response: { certificates: [...], total, page, totalPages }

# Generar token de acceso para compartir
POST /api/docs/compliance/certificates/share
Body: { certificateIds: string[], tokenType, expiresInDays?: number, allowDocumentDownload: boolean }
Response: { publicToken, verificationUrl, expiresAt }

# Ver historial de compliance de un equipo (incluyendo eventos intra-día)
GET /api/docs/compliance/history/:equipoId?fechaDesde=&fechaHasta=&includeEvents=true
Response: { snapshots: Array<{ fecha, timestamp, snapshotType, triggerEvent?, estadoGlobal, contentHash }> }
# Con includeEvents=false (default), solo devuelve baselines
# Con includeEvents=true, devuelve baselines + eventos (timeline completa)

# Verificar integridad de la cadena de un equipo
GET /api/docs/compliance/chain/:equipoId/verify
Response: { valid: boolean, chainLength: number, brokenAt?: string }

# Estado del anclaje blockchain del día
GET /api/docs/compliance/anchor/:fecha
Response: { merkleRoot, anchorStatus, transactionHash, explorerUrl }
```

### 12.2 Endpoints públicos (sin autenticación)

```
# Verificar certificado por token (opcionalmente especificar hora)
GET /api/docs/compliance/verify/:token?hora=10:30
# Sin hora: devuelve el snapshot al que apunta el token
# Con hora: busca el snapshot del equipo vigente a esa hora dentro del rango del token
Response: { verified, certificate: { ..., timeline: [...] }, verificacion: { ... } }

# Descargar documento congelado (si el token lo permite)
GET /api/docs/compliance/verify/:token/doc/:index
Response: Redirect a presigned URL de MinIO

# Descargar PDF del certificado
GET /api/docs/compliance/verify/:token/pdf
Response: application/pdf

# Verificar hash de un documento contra el certificado
POST /api/docs/compliance/verify/:token/check-hash
Body: { documentIndex: number, fileHash: string }
Response: { matches: boolean, expectedHash: string }
```

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
| CertificateAccessToken | ~0.3 KB | ~20 | ~7,300 |
| **Total DB anual** | | | **~1.5 GB** |

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

### 15.1 Clave de firma

- Se reutiliza el par de claves RS256 existente (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`)
- La clave privada **nunca** se expone en endpoints públicos
- Los endpoints de verificación usan la clave **pública** para validar firmas
- Consideración futura: rotar a un par de claves dedicado para CCS, separado de JWT

### 15.2 Tokens de verificación

- Generados con `crypto.randomBytes(6).toString('base64url')` (8 caracteres)
- Entropía: 48 bits = ~281 billones de combinaciones (suficiente para el volumen esperado)
- Rate-limiting en el endpoint de verificación: 30 requests/minuto por IP
- El token no revela información sobre el equipo ni el dador

### 15.3 Acceso a documentos congelados

- Las presigned URLs de MinIO expiran en 15 minutos
- Solo se generan si el `CertificateAccessToken` tiene `allowDocumentDownload: true`
- Se registra cada acceso (IP, timestamp, contador)
- El dador puede revocar tokens en cualquier momento (`active: false`)

### 15.4 Inmutabilidad

- Los snapshots son write-once: no existen endpoints de actualización ni eliminación
- La cadena de hashes detecta cualquier alteración retroactiva
- El anclaje blockchain es verificable independientemente del sistema BCA
- Las copias congeladas en MinIO pueden configurarse con Object Lock (WORM) si se requiere

### 15.5 Wallet blockchain

- La clave privada del wallet se almacena en variable de entorno (`CCS_ANCHOR_WALLET_PRIVATE_KEY`)
- El wallet solo necesita un balance mínimo de MATIC para gas (~$1 cubre meses de operación)
- Monitorear balance y alertar cuando baje de un umbral

---

## 16. Fases de Implementación

### Fase 1: Snapshots diarios + Cadena de Hashes (1 semana)

**Entregables**:
- Migración Prisma: tablas `ComplianceSnapshot`, `DailyMerkleAnchor`, `CertificateAccessToken`
- Servicio `ComplianceCertificationService`:
  - `generateSnapshot(equipoId, fecha)` (para baselines)
  - `generateEventSnapshot(equipoId, event, documentId)` (para eventos)
  - `generateDailySnapshots()` (batch nocturno)
  - `getSnapshotAtTime(equipoId, targetDateTime)` (resolución temporal)
  - `computeContentHash(data)`
  - `signSnapshot(contentHash)`
  - `buildMerkleTree(snapshots)`
- Job nocturno con cron configurable
- Integración con event handlers existentes (onDocumentApproved, onDocumentRejected, etc.)
- Debounce de eventos via Redis (ventana de 5 minutos por equipo)
- Endpoint de verificación básico: `GET /api/docs/compliance/verify/:token`

**Criterio de aceptación**: 
- Snapshot baseline diario funcionando para todos los equipos activos
- Snapshots por evento generados al aprobar/rechazar/vencer un documento
- Consulta por hora devuelve el snapshot correcto
- Verificable por token

### Fase 2: Copias Congeladas + Verificación Completa (1 semana)

**Entregables**:
- Servicio `DocumentFreezerService`:
  - `freezeDocuments(snapshot)` (completo para baselines)
  - `freezeSingleDocument(snapshot, documentId)` (solo el doc cambiado para eventos)
  - `getPresignedUrl(snapshot, docIndex)`
  - `verifyDocumentHash(snapshot, docIndex, hash)`
- Deduplicación de archivos congelados (referencia a baseline para eventos)
- Endpoint de descarga de documentos congelados
- Endpoint de verificación de hash de documentos
- Endpoint autenticado para generar certificados bajo demanda (con hora opcional)

**Criterio de aceptación**: Documentos congelados accesibles desde el endpoint de verificación pública, incluyendo documentos de snapshots por evento.

### Fase 3: Blockchain + PDF (1 semana)

**Entregables**:
- Integración con Polygon:
  - Contrato `ComplianceAnchor` deployado
  - Servicio de envío de transacciones
  - Job de reintento de anclajes fallidos
- Generación de PDF con QR
- Merkle proof almacenado en cada snapshot
- Endpoint de verificación completa (firma + cadena + merkle + blockchain)

**Criterio de aceptación**: Merkle root anclado diariamente en Polygon, verificable en Polygonscan.

### Fase 4: Portal de Verificación + Tokens Compartidos (3-5 días)

**Entregables**:
- Página web de verificación pública (componente React)
- Endpoints de generación y gestión de tokens de acceso
- Integración en portal dador: botón "Generar certificado"
- Integración en portal cliente: vista de compliance certificada
- Dashboard de tokens emitidos y su uso

**Criterio de aceptación**: Un cliente puede recibir un link, ver el certificado, descargar documentos y verificar la autenticidad en blockchain.

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

### 18.1 Certificación para organismos públicos

Si se requiere presentar certificaciones ante la CNRT, aseguradoras o en sede judicial:
- Agregar sello de tiempo RFC 3161 (TSA) como complemento al blockchain
- Evaluar firma digital con certificado X.509 emitido por autoridad certificante argentina
- Los anclajes en blockchain constituyen prueba de existencia temporal bajo legislación argentina (Ley 27.275 de acceso a información pública, principio de transparencia)

### 18.2 Multi-tenant

El diseño ya soporta multi-tenant: cada snapshot incluye `tenantEmpresaId`. Los buckets de MinIO están separados por tenant. Los Merkle trees podrían separarse por tenant o mantenerse unificados (un solo root = mayor eficiencia de anclaje).

### 18.3 API para integraciones externas

Exponer una API REST documentada (OpenAPI) para que sistemas de terceros (ERPs, TMSs) puedan:
- Solicitar certificados programáticamente
- Verificar compliance antes de asignar cargas
- Integrar el estado de compliance en sus propios dashboards

### 18.4 Notificaciones proactivas

- Notificar al dador cuando un equipo pasa de COMPLETO a INCOMPLETO
- Alertar al cliente cuando un equipo asignado pierde compliance
- Resumen semanal de compliance de flota

### 18.5 Rotación de claves

Implementar un mecanismo de rotación de claves RS256:
- Almacenar Key ID (`kid`) en cada snapshot
- Mantener claves públicas históricas para verificar snapshots antiguos
- Rotar anualmente o ante compromiso

---

## Glosario

| Término | Definición |
|---|---|
| **Snapshot** | Captura inmutable del estado de compliance de un equipo en una fecha |
| **Content Hash** | SHA-256 del contenido canónico del snapshot |
| **Hash Chain** | Cadena de hashes donde cada snapshot incluye el hash del anterior |
| **Merkle Tree** | Estructura de árbol binario de hashes que permite verificar inclusión eficientemente |
| **Merkle Root** | Hash raíz del Merkle tree, representa todos los snapshots de un día |
| **Merkle Proof** | Conjunto mínimo de hashes necesarios para demostrar que un leaf está en el tree |
| **Anclaje** | Publicación del Merkle root en una blockchain pública |
| **Copia congelada** | Copia del documento PDF almacenada de forma inmutable en el momento de la certificación |
| **Token de verificación** | Identificador corto que permite acceso público a un certificado |
| **Presigned URL** | URL temporal de MinIO que permite descarga sin autenticación |
| **RS256** | Algoritmo de firma digital RSA con SHA-256 |
| **Polygon** | Blockchain pública compatible con Ethereum, de bajo costo |
| **WORM** | Write Once Read Many: política de almacenamiento inmutable |
