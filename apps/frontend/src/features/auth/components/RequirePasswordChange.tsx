import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../../store/hooks';

/**
 * Fuerza a los usuarios con mustChangePassword=true a pasar por /perfil
 * hasta que actualicen su contraseña.
 *
 * Mantiene el cambio simple (sin token especial): el backend limpia la flag
 * en /api/platform/auth/change-password y el frontend actualiza el estado local.
 */
export const RequirePasswordChange: React.FC = () => {
  const location = useLocation();
  const mustChangePassword = useAppSelector((s) => (s as any).auth?.user?.mustChangePassword) as boolean | undefined;

  if (mustChangePassword && location.pathname !== '/perfil') {
    return <Navigate to="/perfil" replace />;
  }

  return <Outlet />;
};


