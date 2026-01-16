/**
 * Propósito: Datos de usuarios de prueba por rol.
 */

export const users = {
    chofer: {
        email: 'chofer-test@grupobca.com',
        password: 'Test123!',
        dni: '12345678',
        nombre: 'Chofer',
        apellido: 'Test'
    },
    transportista: {
        email: 'transportista-test@grupobca.com',
        password: 'Test123!',
        cuit: '20123456789',
        razonSocial: 'Transportes Test SA'
    },
    dador: {
        email: 'dador-test@grupobca.com',
        password: 'Test123!',
        cuit: '30123456780',
        razonSocial: 'Dador Test SA'
    },
    adminInterno: {
        email: 'admin-interno-test@grupobca.com',
        password: 'Test123!'
    },
    cliente: {
        email: 'cliente-test@grupobca.com',
        password: 'Test123!',
        razonSocial: 'Cliente Test SA'
    }
} as const;

export type UserRole = keyof typeof users;
