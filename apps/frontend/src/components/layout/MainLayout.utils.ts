/**
 * Utilidades de navegación y menú para MainLayout
 * Extraídas para mejorar la testabilidad
 */

/**
 * Obtiene la etiqueta de rol según el tipo de usuario
 * @param role - Rol del usuario
 * @returns Etiqueta legible del rol
 */
export const getRoleLabel = (role?: string): string => {
  if (!role) return 'Usuario';

  switch (role) {
    case 'SUPERADMIN':
      return 'Superadministrador';
    case 'ADMIN':
      return 'Administrador';
    case 'OPERATOR':
      return 'Usuario de empresa';
    default:
      return 'Usuario';
  }
};

/**
 * Función de preloading de componentes al hacer hover
 * @param to - Ruta de navegación
 */
export const handleNavItemMouseEnter = (to: string): void => {
  // Preload específico basado en la ruta
  if (to === '/empresas') {
    // Preload del componente EmpresasPage y sus datos
    import('../../features/empresas/pages/EmpresasPage.lazy').then(() => {
      import('../../features/empresas/pages/EmpresasPage');
    });

    // Prefetch de datos de empresas
    import('../../features/empresas/api/empresasApiSlice').then(({ empresasApiSlice }) => {
      empresasApiSlice.util.prefetch('getEmpresas', undefined, { force: false });
    });
  }
};
