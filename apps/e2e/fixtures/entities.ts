/**
 * Propósito: Datos de entidades de prueba (empresas, choferes, camiones, etc).
 */

export const entities = {
    empresaTransportista: {
        cuit: '20123456789',
        razonSocial: 'Transportes Test SA'
    },
    chofer: {
        dni: '12345678',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefonos: '1155667788'
    },
    camion: {
        patente: 'AB123CD',
        marca: 'Mercedes-Benz',
        modelo: 'Actros'
    },
    acoplado: {
        patente: 'ZZ999AA',
        tipo: 'Semirremolque'
    },
    dadorCarga: {
        cuit: '30123456780',
        razonSocial: 'Dador Test SA'
    },
    cliente: {
        cuit: '33123456789',
        razonSocial: 'Cliente Test SA'
    }
} as const;

export const equipoCompleto = {
    empresaTransportista: entities.empresaTransportista,
    chofer: entities.chofer,
    camion: entities.camion,
    acoplado: entities.acoplado
} as const;
