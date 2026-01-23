import { jest } from '@jest/globals';

// Datos de templates de documentos para testing
export const mockTemplates = [
    { id: 1, nombre: 'DNI Frente y Dorso', name: 'DNI Frente y Dorso', entityType: 'CHOFER' },
    { id: 2, nombre: 'Licencia de Conducir', name: 'Licencia de Conducir', entityType: 'CHOFER' },
    { id: 3, nombre: 'CUIT Empresa', name: 'CUIT Empresa', entityType: 'EMPRESA_TRANSPORTISTA' },
    { id: 4, nombre: 'Habilitación Municipal', name: 'Habilitación Municipal', entityType: 'EMPRESA_TRANSPORTISTA' },
    { id: 5, nombre: 'Cédula Verde', name: 'Cédula Verde', entityType: 'CAMION' },
    { id: 6, nombre: 'VTV', name: 'VTV', entityType: 'CAMION' },
    { id: 7, nombre: 'Seguro Camión', name: 'Seguro Camión', entityType: 'CAMION' },
    { id: 8, nombre: 'Cédula Acoplado', name: 'Cédula Acoplado', entityType: 'ACOPLADO' },
    { id: 9, nombre: 'VTV Acoplado', name: 'VTV Acoplado', entityType: 'ACOPLADO' },
];

export const mockDadores = {
    data: [
        { id: 1, razonSocial: 'Dador Test 1', cuit: '30123456781' },
        { id: 2, razonSocial: 'Dador Test 2', cuit: '30123456782' },
    ],
};

export const mockClientes = {
    list: [
        { id: 1, razonSocial: 'Cliente Test 1', cuit: '30111111111', activo: true },
        { id: 2, razonSocial: 'Cliente Test 2', cuit: '30222222222', activo: true },
        { id: 3, razonSocial: 'Cliente Test 3', cuit: '30333333333', activo: true },
    ],
};

export const mockConsolidatedTemplates = {
    byEntityType: {
        EMPRESA_TRANSPORTISTA: [
            { templateId: 3, templateName: 'CUIT Empresa', entityType: 'EMPRESA_TRANSPORTISTA', clienteNames: ['Cliente Test 1'] },
            { templateId: 4, templateName: 'Habilitación Municipal', entityType: 'EMPRESA_TRANSPORTISTA', clienteNames: ['Cliente Test 1'] },
        ],
        CHOFER: [
            { templateId: 1, templateName: 'DNI Frente y Dorso', entityType: 'CHOFER', clienteNames: ['Cliente Test 1'] },
            { templateId: 2, templateName: 'Licencia de Conducir', entityType: 'CHOFER', clienteNames: ['Cliente Test 1', 'Cliente Test 2'] },
        ],
        CAMION: [
            { templateId: 5, templateName: 'Cédula Verde', entityType: 'CAMION', clienteNames: ['Cliente Test 1'] },
            { templateId: 6, templateName: 'VTV', entityType: 'CAMION', clienteNames: ['Cliente Test 1'] },
            { templateId: 7, templateName: 'Seguro Camión', entityType: 'CAMION', clienteNames: ['Cliente Test 2'] },
        ],
        ACOPLADO: [
            { templateId: 8, templateName: 'Cédula Acoplado', entityType: 'ACOPLADO', clienteNames: ['Cliente Test 1'] },
            { templateId: 9, templateName: 'VTV Acoplado', entityType: 'ACOPLADO', clienteNames: ['Cliente Test 1'] },
        ],
    },
    templates: [
        { templateId: 1, templateName: 'DNI Frente y Dorso', entityType: 'CHOFER' },
        { templateId: 2, templateName: 'Licencia de Conducir', entityType: 'CHOFER' },
        { templateId: 3, templateName: 'CUIT Empresa', entityType: 'EMPRESA_TRANSPORTISTA' },
        { templateId: 5, templateName: 'Cédula Verde', entityType: 'CAMION' },
        { templateId: 6, templateName: 'VTV', entityType: 'CAMION' },
        { templateId: 7, templateName: 'Seguro Camión', entityType: 'CAMION' },
    ],
};

export const mockEquipo = {
    id: 1,
    dadorCargaId: 1,
    driverId: 10,
    truckId: 20,
    trailerId: 30,
    empresaTransportistaId: 5,
    driverDniNorm: '12345678',
    truckPlateNorm: 'ABC123',
    trailerPlateNorm: 'DEF456',
    chofer: {
        id: 10,
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
        activo: true,
    },
    camion: {
        id: 20,
        patente: 'ABC123',
        marca: 'Mercedes-Benz',
        modelo: 'Actros',
    },
    acoplado: {
        id: 30,
        patente: 'DEF456',
        tipo: 'Caja seca',
    },
    empresaTransportista: {
        id: 5,
        razonSocial: 'Transportes del Norte S.A.',
        cuit: '30123456789',
    },
    clientes: [
        { clienteId: 1, cliente: { razonSocial: 'Cliente Test 1' } },
        { clienteId: 2, cliente: { razonSocial: 'Cliente Test 2' } },
    ],
};

export const mockChoferes = {
    data: [
        { id: 10, dni: '12345678', nombre: 'Juan', apellido: 'Pérez' },
        { id: 11, dni: '87654321', nombre: 'María', apellido: 'González' },
    ],
};

export const mockCamiones = {
    data: [
        { id: 20, patente: 'ABC123', marca: 'Mercedes-Benz' },
        { id: 21, patente: 'XYZ789', marca: 'Scania' },
    ],
};

export const mockAcoplados = {
    data: [
        { id: 30, patente: 'DEF456', tipo: 'Caja seca' },
        { id: 31, patente: 'GHI789', tipo: 'Cisterna' },
    ],
};

export const mockEmpresas = [
    { id: 5, razonSocial: 'Transportes del Norte S.A.', cuit: '30123456789' },
    { id: 6, razonSocial: 'Logística del Sur', cuit: '30987654321' },
];

export const mockRequisitos = [
    {
        templateId: 1,
        templateName: 'DNI Frente y Dorso',
        entityType: 'CHOFER',
        entityId: 10,
        estado: 'VIGENTE',
        obligatorio: true,
        requeridoPor: [{ clienteName: 'Cliente Test 1' }],
        documentoActual: null,
    },
    {
        templateId: 2,
        templateName: 'Licencia de Conducir',
        entityType: 'CHOFER',
        entityId: 10,
        estado: 'PROXIMO_VENCER',
        obligatorio: true,
        requeridoPor: [{ clienteName: 'Cliente Test 1' }],
        documentoActual: null,
    },
    {
        templateId: 5,
        templateName: 'Cédula Verde',
        entityType: 'CAMION',
        entityId: 20,
        estado: 'FALTANTE',
        obligatorio: true,
        requeridoPor: [{ clienteName: 'Cliente Test 1' }],
        documentoActual: null,
    },
];
