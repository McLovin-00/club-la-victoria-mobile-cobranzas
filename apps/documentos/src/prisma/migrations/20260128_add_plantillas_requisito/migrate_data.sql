-- Script de migración de datos: ClienteDocumentRequirement → PlantillaRequisito
-- Este script debe ejecutarse DESPUÉS de la migración de estructura
-- 
-- Estrategia:
-- 1. Crear una PlantillaRequisito "Requisitos Generales" para cada cliente que tenga requisitos
-- 2. Copiar los requisitos de cliente_document_requirement a plantilla_requisito_template
-- 3. Crear asociaciones equipo_plantilla_requisito basadas en equipo_cliente existentes

-- =============================================
-- PASO 1: Crear plantilla "Requisitos Generales" para cada cliente con requisitos
-- =============================================
INSERT INTO documentos.plantillas_requisito (tenant_empresa_id, cliente_id, nombre, descripcion, activo, created_at, updated_at)
SELECT DISTINCT 
    cdr.tenant_empresa_id,
    cdr.cliente_id,
    'Requisitos Generales',
    'Plantilla migrada automáticamente desde requisitos anteriores. Contiene todos los requisitos que tenía el cliente.',
    true,
    NOW(),
    NOW()
FROM documentos.cliente_document_requirement cdr
WHERE NOT EXISTS (
    -- Evitar duplicados si se ejecuta múltiples veces
    SELECT 1 FROM documentos.plantillas_requisito pr 
    WHERE pr.cliente_id = cdr.cliente_id 
    AND pr.tenant_empresa_id = cdr.tenant_empresa_id
    AND pr.nombre = 'Requisitos Generales'
);

-- =============================================
-- PASO 2: Migrar requisitos a plantilla_requisito_template
-- =============================================
INSERT INTO documentos.plantilla_requisito_template (
    tenant_empresa_id, 
    plantilla_requisito_id, 
    template_id, 
    entity_type, 
    obligatorio, 
    dias_anticipacion, 
    visible_chofer, 
    created_at, 
    updated_at
)
SELECT 
    cdr.tenant_empresa_id,
    pr.id AS plantilla_requisito_id,
    cdr.template_id,
    cdr.entity_type,
    cdr.obligatorio,
    cdr.dias_anticipacion,
    cdr.visible_chofer,
    NOW(),
    NOW()
FROM documentos.cliente_document_requirement cdr
JOIN documentos.plantillas_requisito pr 
    ON pr.cliente_id = cdr.cliente_id 
    AND pr.tenant_empresa_id = cdr.tenant_empresa_id
    AND pr.nombre = 'Requisitos Generales'
WHERE NOT EXISTS (
    -- Evitar duplicados
    SELECT 1 FROM documentos.plantilla_requisito_template prt
    WHERE prt.plantilla_requisito_id = pr.id
    AND prt.template_id = cdr.template_id
    AND prt.entity_type = cdr.entity_type
);

-- =============================================
-- PASO 3: Crear asociaciones equipo → plantilla basadas en equipo_cliente
-- =============================================
INSERT INTO documentos.equipo_plantilla_requisito (
    equipo_id, 
    plantilla_requisito_id, 
    asignado_desde, 
    asignado_hasta
)
SELECT DISTINCT
    ec.equipo_id,
    pr.id AS plantilla_requisito_id,
    ec.asignado_desde,
    ec.asignado_hasta
FROM documentos.equipo_cliente ec
JOIN documentos.plantillas_requisito pr 
    ON pr.cliente_id = ec.cliente_id
    AND pr.nombre = 'Requisitos Generales'
WHERE NOT EXISTS (
    -- Evitar duplicados
    SELECT 1 FROM documentos.equipo_plantilla_requisito epr
    WHERE epr.equipo_id = ec.equipo_id
    AND epr.plantilla_requisito_id = pr.id
    AND epr.asignado_desde = ec.asignado_desde
);

-- =============================================
-- VERIFICACIÓN: Mostrar resumen de migración
-- =============================================
DO $$
DECLARE
    v_plantillas_creadas INTEGER;
    v_templates_migrados INTEGER;
    v_asociaciones_equipo INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_plantillas_creadas FROM documentos.plantillas_requisito;
    SELECT COUNT(*) INTO v_templates_migrados FROM documentos.plantilla_requisito_template;
    SELECT COUNT(*) INTO v_asociaciones_equipo FROM documentos.equipo_plantilla_requisito;
    
    RAISE NOTICE '=== MIGRACIÓN COMPLETADA ===';
    RAISE NOTICE 'Plantillas de requisito creadas: %', v_plantillas_creadas;
    RAISE NOTICE 'Templates asociados a plantillas: %', v_templates_migrados;
    RAISE NOTICE 'Asociaciones equipo-plantilla: %', v_asociaciones_equipo;
END $$;
