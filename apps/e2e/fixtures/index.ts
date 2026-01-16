/**
 * Propósito: Exporta todos los fixtures desde un punto central.
 */

// Datos de usuarios
export { users, type UserRole } from './users';

// Datos de entidades
export { entities, equipoCompleto } from './entities';

// Helpers para archivos
export { createPngPlaceholder, createFrontBackPlaceholders } from './testFiles';

// Fixture de autenticación
export {
    test,
    expect,
    testAs,
    testAsChofer,
    testAsTransportista,
    testAsDador,
    testAsAdminInterno,
    testAsCliente
} from './auth.fixture';
