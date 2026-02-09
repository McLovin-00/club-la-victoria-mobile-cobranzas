-- Migración: Agregar PlantillaRequisito, PlantillaRequisitoTemplate y EquipoPlantillaRequisito
-- Permite que un cliente tenga múltiples conjuntos de requisitos (plantillas)
-- y que los equipos se asocien a plantillas específicas en lugar de clientes directamente

-- =============================================
-- 1. Crear tabla plantillas_requisito
-- =============================================
CREATE TABLE documentos.plantillas_requisito (
    id SERIAL PRIMARY KEY,
    tenant_empresa_id INTEGER NOT NULL,
    cliente_id INTEGER NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_plantilla_cliente 
        FOREIGN KEY (cliente_id) 
        REFERENCES documentos.clientes(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT uq_plantilla_requisito_nombre 
        UNIQUE (tenant_empresa_id, cliente_id, nombre)
);

-- Índices para plantillas_requisito
CREATE INDEX idx_plantillas_requisito_tenant_cliente 
    ON documentos.plantillas_requisito(tenant_empresa_id, cliente_id);
CREATE INDEX idx_plantillas_requisito_activo 
    ON documentos.plantillas_requisito(activo);

-- =============================================
-- 2. Crear tabla plantilla_requisito_template
-- =============================================
CREATE TABLE documentos.plantilla_requisito_template (
    id SERIAL PRIMARY KEY,
    tenant_empresa_id INTEGER NOT NULL,
    plantilla_requisito_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    entity_type documentos."EntityType" NOT NULL,
    obligatorio BOOLEAN NOT NULL DEFAULT true,
    dias_anticipacion INTEGER NOT NULL DEFAULT 0,
    visible_chofer BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_prt_plantilla 
        FOREIGN KEY (plantilla_requisito_id) 
        REFERENCES documentos.plantillas_requisito(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_prt_template 
        FOREIGN KEY (template_id) 
        REFERENCES documentos.document_templates(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT uq_plantilla_template 
        UNIQUE (tenant_empresa_id, plantilla_requisito_id, template_id, entity_type)
);

-- Índices para plantilla_requisito_template
CREATE INDEX idx_prt_tenant_plantilla_entity 
    ON documentos.plantilla_requisito_template(tenant_empresa_id, plantilla_requisito_id, entity_type);

-- =============================================
-- 3. Crear tabla equipo_plantilla_requisito
-- =============================================
CREATE TABLE documentos.equipo_plantilla_requisito (
    equipo_id INTEGER NOT NULL,
    plantilla_requisito_id INTEGER NOT NULL,
    asignado_desde TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asignado_hasta TIMESTAMP(3),
    
    PRIMARY KEY (equipo_id, plantilla_requisito_id, asignado_desde),
    
    CONSTRAINT fk_epr_equipo 
        FOREIGN KEY (equipo_id) 
        REFERENCES documentos.equipo(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_epr_plantilla 
        FOREIGN KEY (plantilla_requisito_id) 
        REFERENCES documentos.plantillas_requisito(id) 
        ON DELETE CASCADE
);

-- Índices para equipo_plantilla_requisito
CREATE INDEX idx_epr_plantilla_equipo 
    ON documentos.equipo_plantilla_requisito(plantilla_requisito_id, equipo_id);

-- =============================================
-- 4. Comentarios de documentación
-- =============================================
COMMENT ON TABLE documentos.plantillas_requisito IS 
    'Plantillas de requisitos por cliente. Permite que un cliente tenga múltiples conjuntos de requisitos documentales.';
COMMENT ON COLUMN documentos.plantillas_requisito.nombre IS 
    'Nombre descriptivo de la plantilla (ej: Requisitos Graneles, Requisitos Combustibles)';
COMMENT ON COLUMN documentos.plantillas_requisito.descripcion IS 
    'Descripción opcional de cuándo aplicar esta plantilla';

COMMENT ON TABLE documentos.plantilla_requisito_template IS 
    'Relación entre plantillas de requisitos y templates de documentos. Define qué documentos requiere cada plantilla.';
COMMENT ON COLUMN documentos.plantilla_requisito_template.obligatorio IS 
    'Si el documento es obligatorio para esta plantilla';
COMMENT ON COLUMN documentos.plantilla_requisito_template.dias_anticipacion IS 
    'Días de anticipación para alertas de vencimiento';
COMMENT ON COLUMN documentos.plantilla_requisito_template.visible_chofer IS 
    'Si el documento es visible para el chofer en su portal';

COMMENT ON TABLE documentos.equipo_plantilla_requisito IS 
    'Asociación entre equipos y plantillas de requisitos. Define qué plantillas aplican a cada equipo.';
COMMENT ON COLUMN documentos.equipo_plantilla_requisito.asignado_desde IS 
    'Fecha desde la cual la plantilla aplica al equipo';
COMMENT ON COLUMN documentos.equipo_plantilla_requisito.asignado_hasta IS 
    'Fecha hasta la cual la plantilla aplicó (null = activo)';
