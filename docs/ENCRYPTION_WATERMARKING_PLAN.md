# PLAN DE IMPLEMENTACIÓN: CIFRADO Y MARCA DE AGUA

> **Proyecto**: Protección Avanzada de Datos y Documentos BCA  
> **Fecha**: Enero 2026  
> **Estado**: En evaluación  
> **Owner**: DevOps/Backend Lead + Security Team  

---

## 📋 RESUMEN EJECUTIVO

### Objetivo

Implementar múltiples capas de protección para datos sensibles y documentos de la organización BCA:

1. **Cifrado de Datos en Reposo** (PostgreSQL)
2. **Cifrado de Archivos** (MinIO)
3. **Marca de Agua en Documentos** (rastreabilidad)
4. **Gestión Centralizada de Claves** (HashiCorp Vault)

### Beneficios

| Beneficio | Descripción | Impacto |
|-----------|-------------|---------|
| **Seguridad** | Protección ante robo de datos | Crítico |
| **Cumplimiento** | Regulaciones de protección de datos (GDPR, etc.) | Alto |
| **Rastreabilidad** | Identificar fuente de filtración | Alto |
| **Confianza** | Clientes confían más en sistema seguro | Medio |
| **Auditoría** | Logs de acceso a datos sensibles | Alto |

### Timeline Estimado

**Total**: 4-5 meses

**Priorización**:
- **Fase 1 (Alta)**: LUKS + MinIO SSE-S3 + Marca agua visible - 1 mes
- **Fase 2 (Media)**: Cifrado columnas BD + Metadata - 1.5 meses
- **Fase 3 (Media)**: HashiCorp Vault + Cifrado cliente - 1.5 meses
- **Fase 4 (Baja)**: Steganografía - 1 mes (opcional)

---

## 🎯 ALCANCE DEL PROYECTO

### En Alcance

#### Cifrado de PostgreSQL
- ✅ LUKS (Full Disk Encryption) en todos los ambientes
- ✅ Cifrado de columnas sensibles (DNI, CUIL, datos financieros)
- ✅ Claves gestionadas centralmente

#### Cifrado de MinIO
- ✅ SSE-S3 (Server-Side Encryption) baseline
- ✅ Cifrado del lado del cliente para archivos críticos
- ✅ Rotación automática de claves

#### Marca de Agua
- ✅ Marca visible en documentos (imágenes, PDFs)
- ✅ Metadata embedding (EXIF/XMP)
- ✅ Marca invisible (steganografía) - OPCIONAL

#### Gestión de Claves
- ✅ HashiCorp Vault para secretos
- ✅ Rotación automática
- ✅ Auditoría de accesos

### Fuera de Alcance

- ❌ Cifrado de datos en tránsito (ya implementado con HTTPS)
- ❌ DRM (Digital Rights Management) avanzado
- ❌ Blockchain para auditoría inmutable (futuro)

---

## 🏗️ ARQUITECTURA DE CIFRADO

### Capas de Seguridad

```
CAPA 5: APLICACIÓN
═══════════════════
• Validación input (Zod)
• Sanitización de datos
• Rate limiting

         │
         ▼

CAPA 4: DATOS EN TRÁNSITO
══════════════════════════
• HTTPS (TLS 1.3)
• AES-256-GCM
• Perfect Forward Secrecy

         │
         ▼

CAPA 3: APLICACIÓN - CIFRADO
═════════════════════════════
• Cifrado de columnas (pgcrypto)
• Cifrado cliente MinIO (AES-256)
• Marca de agua en archivos

         │
         ▼

CAPA 2: BASE DE DATOS / STORAGE
════════════════════════════════
• PostgreSQL (schemas)
• MinIO SSE-S3 (AES-256)
• Claves en HashiCorp Vault

         │
         ▼

CAPA 1: DISCO (FÍSICO)
══════════════════════
• LUKS/dm-crypt (AES-256-XTS)
• Full Disk Encryption
• Protección ante robo físico
```

---

## 🔐 FASE 1: CIFRADO BASELINE (1 MES)

### 1.1 LUKS - Full Disk Encryption

**Objetivo**: Proteger todos los discos con cifrado a nivel de hardware

**Tecnología**: LUKS (Linux Unified Key Setup) con dm-crypt

**Alcance**:
- Todos los servidores (DEV, Staging, Producción)
- Todos los discos con datos (PostgreSQL, MinIO, Docker volumes)

**Implementación**:

```bash
# 1. Backup completo de datos (CRÍTICO)
bash scripts/backup-full.sh

# 2. Preparar partición para cifrado (servidor nuevo)
cryptsetup luksFormat /dev/sdb1
# Ingrese passphrase fuerte (64 caracteres)

# 3. Abrir partición cifrada
cryptsetup luksOpen /dev/sdb1 encrypted_data

# 4. Crear filesystem
mkfs.ext4 /dev/mapper/encrypted_data

# 5. Montar
mkdir -p /mnt/encrypted
mount /dev/mapper/encrypted_data /mnt/encrypted

# 6. Configurar auto-mount en /etc/crypttab
echo "encrypted_data /dev/sdb1 none luks" >> /etc/crypttab

# 7. Configurar en /etc/fstab
echo "/dev/mapper/encrypted_data /mnt/encrypted ext4 defaults 0 2" >> /etc/fstab

# 8. Mover datos de PostgreSQL y MinIO a partición cifrada
mv /var/lib/postgresql /mnt/encrypted/postgresql
ln -s /mnt/encrypted/postgresql /var/lib/postgresql

mv /var/lib/minio /mnt/encrypted/minio
ln -s /mnt/encrypted/minio /var/lib/minio
```

**Gestión de Passphrase**:
- Almacenado en 1Password / Bitwarden (acceso restringido)
- Requiere ingreso manual en boot (o usar key file en USB)
- Para servidores cloud: usar key file encriptado en metadata

**Timeline**: 1 semana por ambiente (3 semanas total)

**Riesgo**: Si se pierde passphrase, datos irrecuperables

### 1.2 MinIO - Server-Side Encryption (SSE-S3)

**Objetivo**: Cifrar todos los archivos en MinIO automáticamente

**Configuración**:

```bash
# 1. Generar master key para MinIO
openssl rand -base64 32

# 2. Configurar en docker-compose o variables de entorno
export MINIO_KMS_SECRET_KEY="my-minio-encryption-key-here"

# 3. Iniciar MinIO con SSE habilitado
docker run -d \
  -e MINIO_KMS_SECRET_KEY="my-minio-encryption-key-here" \
  -v /mnt/encrypted/minio:/data \
  minio/minio server /data --sse

# 4. Verificar cifrado
mc admin kms key status myminio
```

**Configuración en Código (Node.js - MinIO SDK)**:

```typescript
import { Client } from 'minio';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Upload con cifrado automático SSE-S3
await minioClient.fPutObject(
  'documentos-empresa-1',
  'archivo.pdf',
  '/path/to/archivo.pdf',
  {
    'x-amz-server-side-encryption': 'AES256',
  }
);

// MinIO cifra automáticamente con SSE-S3
```

**Rotación de Claves**:
- Manual cada 90 días (Fase 1)
- Automática con Vault (Fase 3)

**Timeline**: 1 semana

### 1.3 Marca de Agua Visible

**Objetivo**: Disuasión visual y rastreabilidad básica

**Tecnologías**:
- **Sharp** (imágenes: JPG, PNG, WebP)
- **PDF-Lib** (documentos PDF)

**Implementación**:

**Servicio de Marca de Agua** (`apps/documentos/src/services/watermark.service.ts`):

```typescript
import sharp from 'sharp';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';

export class WatermarkService {
  /**
   * Agregar marca de agua a imagen
   */
  static async addWatermarkToImage(
    inputPath: string,
    outputPath: string,
    watermarkText: string,
    options: {
      opacity?: number;
      angle?: number;
      fontSize?: number;
    } = {}
  ): Promise<void> {
    const { opacity = 0.3, angle = -45, fontSize = 48 } = options;

    // Obtener dimensiones de imagen original
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    // Generar SVG de marca de agua
    const svgWatermark = `
      <svg width="${width}" height="${height}">
        <defs>
          <style>
            .watermark {
              font-size: ${fontSize}px;
              font-family: Arial, sans-serif;
              font-weight: bold;
              fill: rgba(255,255,255,${opacity});
              text-anchor: middle;
            }
          </style>
        </defs>
        <text 
          x="${width / 2}" 
          y="${height / 2}" 
          class="watermark"
          transform="rotate(${angle}, ${width / 2}, ${height / 2})"
        >
          ${watermarkText}
        </text>
      </svg>
    `;

    // Aplicar marca de agua
    await sharp(inputPath)
      .composite([
        {
          input: Buffer.from(svgWatermark),
          gravity: 'center',
        },
      ])
      .toFile(outputPath);
  }

  /**
   * Agregar marca de agua a PDF
   */
  static async addWatermarkToPDF(
    inputPath: string,
    outputPath: string,
    watermarkText: string
  ): Promise<void> {
    // Leer PDF
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const pages = pdfDoc.getPages();

    // Agregar marca de agua a cada página
    for (const page of pages) {
      const { width, height } = page.getSize();

      page.drawText(watermarkText, {
        x: width / 2 - 150,
        y: height / 2,
        size: 48,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.3,
        rotate: { angle: -45 },
      });
    }

    // Guardar PDF modificado
    const modifiedPdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, modifiedPdfBytes);
  }

  /**
   * Generar texto de marca de agua
   */
  static generateWatermarkText(
    userId: number,
    userEmail: string,
    empresaId: number
  ): string {
    const date = new Date().toISOString().split('T')[0];
    return `CONFIDENCIAL BCA\n${userEmail}\nEmpresa: ${empresaId}\n${date}`;
  }
}
```

**Integración en Upload de Documentos**:

```typescript
// apps/documentos/src/controllers/document.controller.ts
import { WatermarkService } from '../services/watermark.service';

export async function uploadDocument(req, res) {
  const { file, user } = req;
  
  // 1. Subir archivo temporal
  const tempPath = `/tmp/${file.filename}`;
  const watermarkedPath = `/tmp/${file.filename}_watermarked`;

  try {
    // 2. Aplicar marca de agua según tipo de archivo
    const watermarkText = WatermarkService.generateWatermarkText(
      user.id,
      user.email,
      user.empresaId
    );

    if (file.mimetype.startsWith('image/')) {
      await WatermarkService.addWatermarkToImage(
        tempPath,
        watermarkedPath,
        watermarkText
      );
    } else if (file.mimetype === 'application/pdf') {
      await WatermarkService.addWatermarkToPDF(
        tempPath,
        watermarkedPath,
        watermarkText
      );
    } else {
      // Tipo no soportado, subir sin marca
      watermarkedPath = tempPath;
    }

    // 3. Subir a MinIO (con cifrado SSE-S3)
    const objectName = `documents/${Date.now()}_${file.originalname}`;
    await minioClient.fPutObject(
      'documentos-empresa-1',
      objectName,
      watermarkedPath,
      {
        'Content-Type': file.mimetype,
        'x-amz-server-side-encryption': 'AES256',
        'x-amz-meta-user-id': user.id.toString(),
        'x-amz-meta-user-email': user.email,
        'x-amz-meta-empresa-id': user.empresaId.toString(),
        'x-amz-meta-upload-date': new Date().toISOString(),
      }
    );

    // 4. Guardar en BD
    const document = await prisma.document.create({
      data: {
        fileName: file.originalname,
        filePath: objectName,
        fileSize: file.size,
        mimeType: file.mimetype,
        watermarkApplied: true,
        watermarkUserId: user.id,
        watermarkTimestamp: new Date(),
        // ... otros campos
      },
    });

    // 5. Limpiar archivos temporales
    await fs.unlink(tempPath);
    if (watermarkedPath !== tempPath) {
      await fs.unlink(watermarkedPath);
    }

    res.json({ success: true, document });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ success: false, error: error.message });
  }
}
```

**Timeline**: 2 semanas

**Entregables Fase 1**:
- ✅ LUKS en todos los servidores
- ✅ MinIO SSE-S3 habilitado
- ✅ Marca de agua visible en documentos
- ✅ Documentación de configuración

---

## 🔐 FASE 2: CIFRADO AVANZADO (1.5 MESES)

### 2.1 Cifrado de Columnas en PostgreSQL

**Objetivo**: Cifrar datos ultra-sensibles (DNI, CUIL, tarjetas de crédito)

**Tecnología**: pgcrypto (extensión PostgreSQL)

**Implementación**:

**1. Habilitar extensión pgcrypto**:

```sql
-- En PostgreSQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**2. Modificar schema de Prisma**:

```prisma
// apps/documentos/src/prisma/schema.prisma
model Driver {
  id              Int      @id @default(autoincrement())
  nombre          String
  apellido        String
  
  // Campos cifrados (almacenar como Bytes en Prisma)
  dni_encrypted   Bytes?   @map("dni_encrypted")
  cuil_encrypted  Bytes?   @map("cuil_encrypted")
  
  // ... otros campos
}
```

**3. Funciones helper para cifrado**:

```typescript
// apps/documentos/src/utils/encryption.ts
import { prisma } from '../config/database';

/**
 * Cifrar dato sensible
 */
export async function encryptData(plaintext: string): Promise<Buffer> {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');

  const result = await prisma.$queryRaw<{ encrypted: Buffer }[]>`
    SELECT pgp_sym_encrypt(${plaintext}, ${key}) as encrypted
  `;

  return result[0].encrypted;
}

/**
 * Descifrar dato sensible
 */
export async function decryptData(encrypted: Buffer): Promise<string> {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');

  const result = await prisma.$queryRaw<{ decrypted: string }[]>`
    SELECT pgp_sym_decrypt(${encrypted}, ${key}) as decrypted
  `;

  return result[0].decrypted;
}
```

**4. Uso en aplicación**:

```typescript
// Guardar driver con DNI cifrado
const dniEncrypted = await encryptData(driver.dni);

const newDriver = await prisma.driver.create({
  data: {
    nombre: driver.nombre,
    apellido: driver.apellido,
    dni_encrypted: dniEncrypted,
    // ... otros campos
  },
});

// Leer driver y descifrar DNI
const driverFromDB = await prisma.driver.findUnique({
  where: { id: driverId },
});

const dniDecrypted = await decryptData(driverFromDB.dni_encrypted);
console.log('DNI:', dniDecrypted);
```

**Columnas a Cifrar** (por prioridad):

| Tabla | Columna | Prioridad |
|-------|---------|-----------|
| `drivers` | `dni` | Alta |
| `drivers` | `cuil` | Alta |
| `payments` | `card_number` | Alta |
| `payments` | `cvv` | Alta |
| `users` | `ssn` (si aplica) | Alta |
| `companies` | `tax_id` | Media |

**Consideraciones**:
- ⚠️ No se puede hacer búsqueda/indexación de campos cifrados
- ⚠️ Performance hit en queries (descifrado on-the-fly)
- ✅ Usar solo para datos ultra-sensibles

**Timeline**: 3 semanas

### 2.2 Metadata Embedding en Archivos

**Objetivo**: Información oculta pero extraíble para auditoría

**Tecnología**: 
- **EXIF** (imágenes)
- **XMP** (PDFs, imágenes)
- **Sharp** (manipulación de metadata)

**Implementación**:

```typescript
// apps/documentos/src/services/metadata.service.ts
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

export class MetadataService {
  /**
   * Agregar metadata a imagen
   */
  static async addMetadataToImage(
    inputPath: string,
    outputPath: string,
    metadata: {
      author: string;
      company: string;
      userId: number;
      uploadDate: string;
      ipAddress: string;
      documentHash: string;
    }
  ): Promise<void> {
    await sharp(inputPath)
      .withMetadata({
        exif: {
          IFD0: {
            Copyright: `© ${metadata.company} ${new Date().getFullYear()}`,
            Artist: metadata.author,
            Software: 'BCA Document Management System',
          },
          IFD1: {
            // Custom metadata
            ImageDescription: JSON.stringify({
              userId: metadata.userId,
              uploadDate: metadata.uploadDate,
              ipAddress: metadata.ipAddress,
              documentHash: metadata.documentHash,
            }),
          },
        },
      })
      .toFile(outputPath);
  }

  /**
   * Agregar metadata a PDF
   */
  static async addMetadataToPDF(
    inputPath: string,
    outputPath: string,
    metadata: {
      author: string;
      company: string;
      userId: number;
      uploadDate: string;
      ipAddress: string;
      documentHash: string;
    }
  ): Promise<void> {
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    pdfDoc.setTitle('BCA - Documento Confidencial');
    pdfDoc.setAuthor(metadata.author);
    pdfDoc.setSubject(`Usuario ID: ${metadata.userId}`);
    pdfDoc.setKeywords([
      metadata.company,
      metadata.uploadDate,
      metadata.documentHash,
    ]);
    pdfDoc.setProducer('BCA Document Management System');
    pdfDoc.setCreator(`BCA User ${metadata.userId}`);

    // Custom metadata (XMP)
    const customMetadata = `
      <bca:tracking>
        <bca:userId>${metadata.userId}</bca:userId>
        <bca:uploadDate>${metadata.uploadDate}</bca:uploadDate>
        <bca:ipAddress>${metadata.ipAddress}</bca:ipAddress>
        <bca:documentHash>${metadata.documentHash}</bca:documentHash>
      </bca:tracking>
    `;

    // Nota: PDF-Lib no soporta XMP custom directamente
    // Alternativa: usar pdf-lib + xmp-writer

    const modifiedPdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, modifiedPdfBytes);
  }

  /**
   * Extraer metadata de archivo (para auditoría)
   */
  static async extractMetadata(filePath: string): Promise<any> {
    const fileType = path.extname(filePath).toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(fileType)) {
      const metadata = await sharp(filePath).metadata();
      return metadata.exif;
    } else if (fileType === '.pdf') {
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      return {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        keywords: pdfDoc.getKeywords(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
      };
    }

    return null;
  }
}
```

**Timeline**: 1 semana

**Entregables Fase 2**:
- ✅ Cifrado de columnas sensibles en BD
- ✅ Metadata embedding en archivos
- ✅ Herramienta de extracción de metadata
- ✅ Documentación de uso

---

## 🔐 FASE 3: GESTIÓN CENTRALIZADA DE CLAVES (1.5 MESES)

### 3.1 HashiCorp Vault

**Objetivo**: Gestión centralizada y segura de todos los secretos

**Instalación**:

```yaml
# docker-compose.vault.yml
version: '3.9'

services:
  vault:
    image: vault:1.15
    container_name: vault
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_ADDR: 'http://0.0.0.0:8200'
      VAULT_API_ADDR: 'http://0.0.0.0:8200'
    ports:
      - "8200:8200"
    volumes:
      - vault_data:/vault/data
      - ./vault/config:/vault/config:ro
    command: server
    networks:
      - vault-net

  vault-init:
    image: vault:1.15
    depends_on:
      - vault
    environment:
      VAULT_ADDR: 'http://vault:8200'
    entrypoint: /bin/sh
    command: |
      -c "sleep 5 && vault operator init > /vault/keys/init-keys.txt"
    volumes:
      - ./vault/keys:/vault/keys
    networks:
      - vault-net

volumes:
  vault_data:

networks:
  vault-net:
```

**Configuración** (`vault/config/vault.hcl`):

```hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

api_addr = "http://0.0.0.0:8200"
ui = true
```

**Inicialización**:

```bash
# 1. Inicializar Vault (solo una vez)
vault operator init -key-shares=5 -key-threshold=3

# Guarda: Unseal Keys (5) + Root Token
# CRÍTICO: Almacenar keys en lugares seguros separados

# 2. Unseal Vault (requiere 3 de 5 keys)
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# 3. Login con root token
vault login <root-token>

# 4. Habilitar secrets engine
vault secrets enable -path=bca kv-v2

# 5. Crear política de acceso
vault policy write bca-app - <<EOF
path "bca/*" {
  capabilities = ["read"]
}
EOF

# 6. Crear AppRole para aplicaciones
vault auth enable approle
vault write auth/approle/role/bca-backend \
  secret_id_ttl=24h \
  token_ttl=1h \
  token_max_ttl=4h \
  policies="bca-app"
```

**Almacenar Secretos**:

```bash
# Claves de cifrado
vault kv put bca/encryption-keys \
  db-key="<base64-encryption-key>" \
  minio-key="<minio-encryption-key>"

# Credenciales de BD
vault kv put bca/database \
  url="postgresql://user:pass@host:5432/db"

# JWT keys
vault kv put bca/jwt \
  private-key="$(cat jwt-private.pem)" \
  public-key="$(cat jwt-public.pem)"

# API keys externas
vault kv put bca/external-apis \
  sentry-dsn="https://..." \
  flowise-api-key="..."
```

**Integración en Aplicaciones**:

```typescript
// apps/backend/src/config/vault.ts
import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
  token: process.env.VAULT_TOKEN, // AppRole token
});

/**
 * Obtener secreto de Vault
 */
export async function getSecret(path: string): Promise<any> {
  try {
    const result = await vaultClient.read(`bca/${path}`);
    return result.data.data;
  } catch (error) {
    console.error('Error reading from Vault:', error);
    throw error;
  }
}

/**
 * Obtener clave de cifrado de BD
 */
export async function getEncryptionKey(): Promise<string> {
  const secrets = await getSecret('encryption-keys');
  return secrets['db-key'];
}

// Uso en aplicación
const encryptionKey = await getEncryptionKey();
process.env.ENCRYPTION_KEY = encryptionKey;
```

**Rotación Automática de Claves**:

```bash
# Script de rotación (cron cada 90 días)
#!/bin/bash

# 1. Generar nueva clave
NEW_KEY=$(openssl rand -base64 32)

# 2. Almacenar en Vault con versión
vault kv put bca/encryption-keys \
  db-key="$NEW_KEY" \
  db-key-previous="$OLD_KEY"

# 3. Re-cifrar datos con nueva clave (proceso gradual)
# Esto requiere script personalizado por tabla

# 4. Notificar a equipo
echo "Clave rotada exitosamente" | mail -s "Vault Key Rotation" devops@bca.com.ar
```

**Timeline**: 3 semanas (setup + integración)

### 3.2 Cifrado del Lado del Cliente (MinIO)

**Objetivo**: Doble cifrado para archivos ultra-críticos

**Implementación**:

```typescript
// apps/documentos/src/services/client-encryption.service.ts
import crypto from 'crypto';
import fs from 'fs/promises';

export class ClientEncryptionService {
  private algorithm = 'aes-256-gcm';
  
  /**
   * Cifrar archivo del lado del cliente antes de subir a MinIO
   */
  async encryptFile(
    inputPath: string,
    outputPath: string,
    key: Buffer
  ): Promise<{ iv: Buffer; authTag: Buffer }> {
    // Generar IV aleatorio
    const iv = crypto.randomBytes(16);
    
    // Crear cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Leer archivo
    const input = await fs.readFile(inputPath);
    
    // Cifrar
    const encrypted = Buffer.concat([
      cipher.update(input),
      cipher.final(),
    ]);
    
    // Obtener authentication tag
    const authTag = cipher.getAuthTag();
    
    // Guardar archivo cifrado
    await fs.writeFile(outputPath, encrypted);
    
    return { iv, authTag };
  }

  /**
   * Descifrar archivo
   */
  async decryptFile(
    inputPath: string,
    outputPath: string,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer
  ): Promise<void> {
    // Crear decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    // Leer archivo cifrado
    const encrypted = await fs.readFile(inputPath);
    
    // Descifrar
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    // Guardar archivo descifrado
    await fs.writeFile(outputPath, decrypted);
  }

  /**
   * Generar clave de cifrado (derivada de master key)
   */
  deriveKey(masterKey: string, salt: string): Buffer {
    return crypto.pbkdf2Sync(masterKey, salt, 100000, 32, 'sha256');
  }
}
```

**Uso en Upload**:

```typescript
// Para archivos críticos (contratos, datos financieros)
const encryptionService = new ClientEncryptionService();

// 1. Obtener master key de Vault
const masterKey = await getSecret('encryption-keys/master');

// 2. Derivar clave específica para este archivo
const salt = crypto.randomBytes(16).toString('hex');
const fileKey = encryptionService.deriveKey(masterKey, salt);

// 3. Cifrar archivo del lado del cliente
const { iv, authTag } = await encryptionService.encryptFile(
  tempFilePath,
  encryptedFilePath,
  fileKey
);

// 4. Subir a MinIO (con SSE-S3 adicional = doble cifrado)
await minioClient.fPutObject(
  'documentos-criticos',
  objectName,
  encryptedFilePath,
  {
    'x-amz-server-side-encryption': 'AES256',
    'x-amz-meta-salt': salt,
    'x-amz-meta-iv': iv.toString('hex'),
    'x-amz-meta-auth-tag': authTag.toString('hex'),
  }
);

// 5. Guardar metadata de cifrado en BD
await prisma.document.update({
  where: { id: documentId },
  data: {
    clientEncrypted: true,
    encryptionSalt: salt,
    encryptionIv: iv.toString('hex'),
    encryptionAuthTag: authTag.toString('hex'),
  },
});
```

**Timeline**: 2 semanas

**Entregables Fase 3**:
- ✅ HashiCorp Vault operativo
- ✅ Todos los secretos migrados a Vault
- ✅ Cifrado del lado del cliente para archivos críticos
- ✅ Rotación automática de claves
- ✅ Documentación de gestión de claves

---

## 🔐 FASE 4: STEGANOGRAFÍA (OPCIONAL - 1 MES)

### 4.1 Marca de Agua Invisible

**Objetivo**: Rastreo forense de filtración de documentos

**Tecnología**: Steganografía en LSB (Least Significant Bit)

**Nota**: Esta fase es opcional y de baja prioridad. Solo implementar si hay casos de uso específicos de filtración.

**Implementación Básica**:

```typescript
// apps/documentos/src/services/steganography.service.ts
import Jimp from 'jimp';

export class SteganographyService {
  /**
   * Ocultar mensaje en imagen (LSB)
   */
  static async hideMessage(
    imagePath: string,
    message: string,
    outputPath: string
  ): Promise<void> {
    const image = await Jimp.read(imagePath);
    const binary = this.textToBinary(message);
    
    let binaryIndex = 0;
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      if (binaryIndex < binary.length) {
        // Modificar LSB del canal red
        this.bitmap.data[idx] = (this.bitmap.data[idx] & 0xFE) | parseInt(binary[binaryIndex]);
        binaryIndex++;
      }
    });
    
    await image.writeAsync(outputPath);
  }

  /**
   * Extraer mensaje oculto de imagen
   */
  static async extractMessage(
    imagePath: string,
    messageLength: number
  ): Promise<string> {
    const image = await Jimp.read(imagePath);
    let binary = '';
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      if (binary.length < messageLength * 8) {
        // Leer LSB del canal red
        binary += (this.bitmap.data[idx] & 1).toString();
      }
    });
    
    return this.binaryToText(binary);
  }

  private static textToBinary(text: string): string {
    return text.split('').map(char => {
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
  }

  private static binaryToText(binary: string): string {
    const bytes = binary.match(/.{8}/g) || [];
    return bytes.map(byte => {
      return String.fromCharCode(parseInt(byte, 2));
    }).join('');
  }
}
```

**Uso**:

```typescript
// Ocultar información de tracking
const trackingInfo = JSON.stringify({
  userId: user.id,
  email: user.email,
  timestamp: Date.now(),
  documentId: document.id,
});

await SteganographyService.hideMessage(
  originalImagePath,
  trackingInfo,
  watermarkedImagePath
);

// Subir a MinIO
// ...

// Para auditoría: Extraer información oculta
const hidden = await SteganographyService.extractMessage(
  suspectedImagePath,
  trackingInfo.length
);

console.log('Tracking info:', JSON.parse(hidden));
// Output: { userId: 123, email: "...", timestamp: ..., documentId: ... }
```

**Limitaciones**:
- Se pierde con conversiones de formato (JPG → PNG)
- Se pierde con compresión agresiva
- Se pierde con redimensionamiento
- Requiere conocer longitud exacta del mensaje

**Alternativa Más Robusta**: Usar librerías especializadas como `stegano` o implementar algoritmos más avanzados (DCT-based watermarking).

**Timeline**: 4 semanas (investigación + implementación + testing)

**Entregables Fase 4**:
- ✅ Servicio de steganografía funcional
- ✅ Testing de robustez ante transformaciones
- ✅ Herramienta de extracción forense
- ✅ Documentación de uso

---

## 📊 RESUMEN DE IMPLEMENTACIÓN

### Timeline Consolidado

| Fase | Duración | Esfuerzo (horas) | Costo Estimado |
|------|----------|------------------|----------------|
| **Fase 1**: Baseline | 1 mes | 160h | $8,000 |
| **Fase 2**: Avanzado | 1.5 meses | 240h | $12,000 |
| **Fase 3**: Vault | 1.5 meses | 240h | $12,000 |
| **Fase 4**: Steganografía | 1 mes (opcional) | 160h | $8,000 |
| **Total** | **4-5 meses** | **640-800h** | **$32,000-40,000** |

### Priorización Recomendada

**Implementar Inmediatamente (Alta Prioridad)**:
1. LUKS (Full Disk Encryption) - Protección baseline
2. MinIO SSE-S3 - Protección de archivos
3. Marca de agua visible - Disuasión visual

**Implementar en 3-6 Meses (Media Prioridad)**:
4. Cifrado de columnas BD - Datos ultra-sensibles
5. Metadata embedding - Auditoría mejorada
6. HashiCorp Vault - Gestión de claves

**Evaluar Necesidad (Baja Prioridad)**:
7. Cifrado del lado del cliente - Casos críticos específicos
8. Steganografía - Solo si hay problemas de filtración

---

## 🔒 SEGURIDAD Y CUMPLIMIENTO

### Cumplimiento de Regulaciones

| Regulación | Requisito | Cumplimiento con Este Plan |
|------------|-----------|----------------------------|
| **GDPR** | Cifrado de datos personales | ✅ Cifrado de columnas + LUKS |
| **PCI-DSS** | Cifrado de datos de tarjetas | ✅ Cifrado de columnas (card_number) |
| **Ley Argentina 25.326** | Protección de datos personales | ✅ Cifrado + auditoría |

### Auditoría

**Logs de Acceso a Datos Cifrados**:
- Quién descifró qué dato y cuándo
- Almacenado en tabla `audit_logs` (no cifrada)
- Retención: 7 años

**Logs de Acceso a Claves (Vault)**:
- Quién accedió a qué secreto
- Vault audit logs automáticos
- Retención: 5 años

---

## 📚 DOCUMENTACIÓN Y TRAINING

### Documentos a Crear

1. **Encryption Policy** - Política de cifrado de la organización
2. **Key Management Procedures** - Procedimientos de gestión de claves
3. **Incident Response Plan** - Plan ante pérdida de claves
4. **Recovery Procedures** - Procedimientos de recuperación
5. **Developer Guide** - Cómo usar servicios de cifrado

### Training

**Administradores** (4 horas):
- Políticas de cifrado
- Uso de Vault
- Rotación de claves
- Troubleshooting

**Desarrolladores** (6 horas):
- Cómo cifrar/descifrar datos
- Uso de APIs de cifrado
- Best practices
- Testing

---

## 🚨 PLAN DE RECUPERACIÓN ANTE DESASTRES

### Escenario 1: Pérdida de Clave de LUKS

**Impacto**: Datos del disco irrecuperables

**Mitigación**:
- Backup de passphrase en 3 lugares físicos separados
- Key file en USB seguro (caja fuerte)
- Backups regulares de datos ANTES de cifrado

**Recuperación**:
- Restaurar desde backup más reciente
- Aplicar transacciones posteriores (si hay logs)

### Escenario 2: Pérdida de Claves de Vault

**Impacto**: No se pueden acceder a secretos

**Mitigación**:
- 5 unseal keys distribuidas entre 5 personas
- Root token almacenado en caja fuerte física
- Backup de Vault data en S3 encriptado

**Recuperación**:
- Unseal con 3 de 5 keys
- Login con root token de emergencia
- Rotar todos los secretos (precaución)

### Escenario 3: Pérdida de Clave de Cifrado de BD

**Impacto**: Columnas cifradas irrecuperables

**Mitigación**:
- Clave actual + clave anterior en Vault
- Backup de clave en 1Password (emergencia)
- Policy: nunca borrar clave anterior hasta que datos estén re-cifrados

**Recuperación**:
- Usar clave de backup
- Re-cifrar datos con nueva clave

---

## ✅ CRITERIOS DE ÉXITO

| Criterio | Target | Medición |
|----------|--------|----------|
| **Disco Cifrado** | 100% servidores | Verificación manual |
| **Archivos Cifrados en MinIO** | 100% uploads | Check de headers SSE |
| **Marca de Agua Aplicada** | > 95% documentos | BD: watermark_applied=true |
| **Downtime por Implementación** | < 1 hora | Monitoreo |
| **Performance Impactnix** | < 10% en queries | Benchmarks antes/después |
| **Claves Rotadas** | 100% cada 90 días | Vault audit logs |

---

**Documento elaborado**: 14 Enero 2026  
**Próxima revisión**: Post-implementación Fase 1  
**Versión**: 1.0  

---

Para consultas sobre este plan, contactar al equipo de DevOps/Security en Slack #security o vía email.
