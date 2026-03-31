/**
 * Utilidades de navegación basadas en roles
 * Extraídas para testabilidad
 */

export type UserRole =
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'OPERATOR'
  | 'ADMIN_INTERNO'
  | 'OPERADOR_INTERNO'
  | 'DADOR_DE_CARGA'
  | 'TRANSPORTISTA'
  | 'EMPRESA_TRANSPORTISTA'
  | 'CHOFER'
  | 'CLIENTE'
  | 'CLIENTE_TRANSPORTE'
  | 'RESOLVER';

/**
 * Obtiene la ruta de destino según el rol del usuario
 * @param role - Rol del usuario autenticado
 * @returns Ruta de destino para el rol
 */
export function getDestinationByRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN_INTERNO':
      return '/portal/admin-interno';
    case 'DADOR_DE_CARGA':
      return '/portal/dadores';
    case 'TRANSPORTISTA':
    case 'CHOFER':
      return '/portal/transportistas';
    case 'CLIENTE':
      return '/portal/cliente';
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'OPERATOR':
    case 'OPERADOR_INTERNO':
      return '/dashboard';
    case 'EMPRESA_TRANSPORTISTA':
      return '/portal/transportistas';
    case 'CLIENTE_TRANSPORTE':
      return '/portal/cliente';
    case 'RESOLVER':
      return '/helpdesk';
    default:
      return '/';
  }
}

/**
 * Determina si un usuario tiene rol válido
 * @param role - Rol a validar
 * @returns true si el rol es válido
 */
export function isValidRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const validRoles: UserRole[] = [
    'SUPERADMIN',
    'ADMIN',
    'OPERATOR',
    'ADMIN_INTERNO',
    'OPERADOR_INTERNO',
    'DADOR_DE_CARGA',
    'TRANSPORTISTA',
    'EMPRESA_TRANSPORTISTA',
    'CHOFER',
    'CLIENTE',
    'CLIENTE_TRANSPORTE',
    'RESOLVER',
  ];
  return validRoles.includes(role as UserRole);
}

/**
 * Genera mensaje de error basado en status HTTP
 * @param status - Código de estado HTTP
 * @returns Mensaje de error localizado
 */
export function getLoginErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Credenciales inválidas';
    case 403:
      return 'Usuario no autorizado';
    default:
      return 'Error al iniciar sesión';
  }
}

/**
 * Tipos de error de login
 */
export type LoginErrorType = 'credentials' | 'unauthorized' | 'unknown';

/**
 * Clasifica un error de login basado en su status
 * @param status - Código de estado HTTP o undefined
 * @returns Tipo de error clasificado
 */
export function classifyLoginError(status: number | undefined): LoginErrorType {
  if (status === 401) return 'credentials';
  if (status === 403) return 'unauthorized';
  return 'unknown';
}
