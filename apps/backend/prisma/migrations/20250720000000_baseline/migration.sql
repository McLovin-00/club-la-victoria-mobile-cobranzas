-- CreateEnum
CREATE TYPE "PeriodoReseteo" AS ENUM ('NUNCA', 'DIARIO', 'SEMANAL', 'MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "FuenteIdentificador" AS ENUM ('BODY', 'HEADER', 'QUERY');

-- CreateEnum
CREATE TYPE "PaymentTipo" AS ENUM ('CREDIT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FlowChatEstado" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'AGENT_REQUIRED');

-- CreateEnum
CREATE TYPE "EntidadTipo" AS ENUM ('DRIVER', 'TRUCK', 'TRAILER');

-- CreateEnum
CREATE TYPE "DocumentEstado" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVISION');

-- CreateEnum
CREATE TYPE "ScheduleTipo" AS ENUM ('VIAJE', 'MANTENIMIENTO', 'INSPECCION');

-- CreateEnum
CREATE TYPE "ServiceEstado" AS ENUM ('activo', 'inactivo', 'mantenimiento');

-- CreateEnum
CREATE TYPE "InstanceEstado" AS ENUM ('activa', 'inactiva', 'error');

-- CreateEnum
CREATE TYPE "GatewayWhitelistScope" AS ENUM ('CLIENTE', 'EMPRESA', 'INSTANCIA');

-- CreateEnum
CREATE TYPE "GatewayPermissionTipo" AS ENUM ('suscripcion', 'pago_evento', 'cupon');

-- CreateEnum
CREATE TYPE "EndUserRole" AS ENUM ('CLIENT', 'CONTACT');

-- CreateEnum
CREATE TYPE "IdentifierType" AS ENUM ('email', 'whatsapp', 'telegram', 'facebook');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user', 'superadmin');

-- CreateEnum
CREATE TYPE "PlatformUserRole" AS ENUM ('superadmin', 'admin', 'operator');

-- CreateTable
CREATE TABLE "empresas_textos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_textos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT,
    "version" VARCHAR(50),
    "estado" "ServiceEstado" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instances" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "service_id" INTEGER NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "estado" "InstanceEstado" NOT NULL DEFAULT 'activa',
    "requiere_permisos" BOOLEAN NOT NULL DEFAULT true,
    "configuracion" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canales_de_paso" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Canal sin nombre',
    "instancia_id" INTEGER NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "puerto_entrada" INTEGER NOT NULL,
    "url_destino" TEXT NOT NULL,
    "puerto_destino" INTEGER NOT NULL,
    "fuente_identificador" "FuenteIdentificador" NOT NULL DEFAULT 'BODY',
    "campo_identificador" TEXT NOT NULL,

    CONSTRAINT "canales_de_paso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" SERIAL NOT NULL,
    "platform_user_id" INTEGER,
    "end_user_id" INTEGER,
    "instancia_id" INTEGER NOT NULL,
    "es_whitelist" BOOLEAN NOT NULL DEFAULT false,
    "limite_total" INTEGER NOT NULL DEFAULT 0,
    "consumido" INTEGER NOT NULL DEFAULT 0,
    "periodo_reseteo" "PeriodoReseteo" NOT NULL DEFAULT 'NUNCA',

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos_temporales" (
    "id" SERIAL NOT NULL,
    "permiso_id" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permisos_temporales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instancia_id" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "detalles" JSONB,
    "platform_admin_id" INTEGER,
    "end_user_id" INTEGER,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "mpPreferenceId" TEXT NOT NULL,
    "tipo" "PaymentTipo" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "qtyLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gatewayClientId" INTEGER,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_chats" (
    "id" SERIAL NOT NULL,
    "flowiseId" TEXT NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "contenido" JSONB NOT NULL,
    "estado" "FlowChatEstado" NOT NULL,
    "agentId" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flow_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_processing_logs" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "respuestaLLM" JSONB NOT NULL,
    "estadoNuevo" "FlowChatEstado" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefonoWhatsapp" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_round_robin" (
    "empresaId" INTEGER NOT NULL,
    "ultimoAgentId" INTEGER,

    CONSTRAINT "agent_round_robin_pkey" PRIMARY KEY ("empresaId")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trucks" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "patente" TEXT NOT NULL,
    "documento" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailers" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "patente" TEXT NOT NULL,
    "documento" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipoEntidad" "EntidadTipo" NOT NULL,
    "entidadId" INTEGER NOT NULL,
    "documento" JSONB NOT NULL,
    "estado" "DocumentEstado" NOT NULL,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "solicitadoPorId" INTEGER NOT NULL,

    CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "tipo" "ScheduleTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "participante" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_clients" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "rate_limit" INTEGER DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_whitelists" (
    "id" SERIAL NOT NULL,
    "scope" "GatewayWhitelistScope" NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "valor" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "clientId" INTEGER,
    "empresaId" INTEGER,
    "instanceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_whitelists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_permissions" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "instanceId" INTEGER NOT NULL,
    "tipo" "GatewayPermissionTipo" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "limite" INTEGER,
    "consumido" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "role" "EndUserRole" NOT NULL DEFAULT 'CLIENT',
    "empresa_id" INTEGER,
    "identifier_type" "IdentifierType" NOT NULL DEFAULT 'email',
    "identifier_value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_access" TIMESTAMP(3),
    "metadata" JSONB,
    "nombre" TEXT,
    "apellido" TEXT,
    "direccion" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "pais" TEXT,
    "contacto" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "end_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "PlatformUserRole" NOT NULL DEFAULT 'operator',
    "empresa_id" INTEGER,
    "nombre" TEXT,
    "apellido" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_textos_nombre_key" ON "empresas_textos"("nombre");

-- CreateIndex
CREATE INDEX "idx_empresas_textos_nombre" ON "empresas_textos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "services_nombre_key" ON "services"("nombre");

-- CreateIndex
CREATE INDEX "idx_services_nombre" ON "services"("nombre");

-- CreateIndex
CREATE INDEX "idx_services_created_at" ON "services"("created_at");

-- CreateIndex
CREATE INDEX "idx_services_estado" ON "services"("estado");

-- CreateIndex
CREATE INDEX "idx_instances_service_id" ON "instances"("service_id");

-- CreateIndex
CREATE INDEX "idx_instances_empresa_id" ON "instances"("empresa_id");

-- CreateIndex
CREATE INDEX "idx_instances_created_at" ON "instances"("created_at");

-- CreateIndex
CREATE INDEX "idx_instances_estado" ON "instances"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "unique_instance_nombre_empresa" ON "instances"("nombre", "empresa_id");

-- CreateIndex
CREATE INDEX "idx_canales_instancia_id" ON "canales_de_paso"("instancia_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_canal_instancia_puerto" ON "canales_de_paso"("instancia_id", "puerto_entrada");

-- CreateIndex
CREATE INDEX "idx_permisos_platform_user_id" ON "permisos"("platform_user_id");

-- CreateIndex
CREATE INDEX "idx_permisos_end_user_id" ON "permisos"("end_user_id");

-- CreateIndex
CREATE INDEX "idx_permisos_instancia_id" ON "permisos"("instancia_id");

-- CreateIndex
CREATE INDEX "idx_permisos_temporales_permiso_id" ON "permisos_temporales"("permiso_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_instancia_id" ON "audit_logs"("instancia_id");

-- CreateIndex
CREATE UNIQUE INDEX "flow_chats_flowiseId_key" ON "flow_chats"("flowiseId");

-- CreateIndex
CREATE INDEX "flow_chats_empresaId_idx" ON "flow_chats"("empresaId");

-- CreateIndex
CREATE INDEX "chat_processing_logs_chatId_idx" ON "chat_processing_logs"("chatId");

-- CreateIndex
CREATE INDEX "agents_empresaId_idx" ON "agents"("empresaId");

-- CreateIndex
CREATE INDEX "document_requests_empresaId_idx" ON "document_requests"("empresaId");

-- CreateIndex
CREATE INDEX "document_requests_entidadId_tipoEntidad_idx" ON "document_requests"("entidadId", "tipoEntidad");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_clients_apiKeyHash_key" ON "gateway_clients"("apiKeyHash");

-- CreateIndex
CREATE INDEX "gateway_clients_empresaId_idx" ON "gateway_clients"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_permissions_clientId_instanceId_key" ON "gateway_permissions"("clientId", "instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "end_users_email_key" ON "end_users"("email");

-- CreateIndex
CREATE INDEX "idx_end_users_empresa_id" ON "end_users"("empresa_id");

-- CreateIndex
CREATE INDEX "idx_end_users_created_at" ON "end_users"("created_at");

-- CreateIndex
CREATE INDEX "idx_end_users_email" ON "end_users"("email");

-- CreateIndex
CREATE INDEX "idx_end_users_identifier_type" ON "end_users"("identifier_type");

-- CreateIndex
CREATE UNIQUE INDEX "identifier_type_identifier_value" ON "end_users"("identifier_type", "identifier_value");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "idx_platform_users_created_at" ON "platform_users"("created_at");

-- CreateIndex
CREATE INDEX "idx_platform_users_email" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "idx_platform_users_empresa_id" ON "platform_users"("empresa_id");

-- CreateIndex
CREATE INDEX "idx_platform_users_role" ON "platform_users"("role");

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instances" ADD CONSTRAINT "instances_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canales_de_paso" ADD CONSTRAINT "canales_de_paso_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_temporales" ADD CONSTRAINT "permisos_temporales_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_end_user_id_fkey" FOREIGN KEY ("end_user_id") REFERENCES "end_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_gatewayClientId_fkey" FOREIGN KEY ("gatewayClientId") REFERENCES "gateway_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_chats" ADD CONSTRAINT "flow_chats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_chats" ADD CONSTRAINT "flow_chats_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_processing_logs" ADD CONSTRAINT "chat_processing_logs_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "flow_chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_round_robin" ADD CONSTRAINT "agent_round_robin_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trucks" ADD CONSTRAINT "trucks_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_clients" ADD CONSTRAINT "gateway_clients_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_whitelists" ADD CONSTRAINT "gateway_whitelists_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "gateway_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_whitelists" ADD CONSTRAINT "gateway_whitelists_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_textos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_whitelists" ADD CONSTRAINT "gateway_whitelists_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_permissions" ADD CONSTRAINT "gateway_permissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "gateway_clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_permissions" ADD CONSTRAINT "gateway_permissions_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_textos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_users" ADD CONSTRAINT "platform_users_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas_textos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

