import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoginForm } from '../features/auth/components/LoginForm';
import { AlertCircle } from 'lucide-react';

// Asegurarse de que se exporta
export const LoginPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showExpiredMessage, setShowExpiredMessage] = useState(false);

  useEffect(() => {
    // Detectar si la sesión expiró
    if (searchParams.get('expired') === 'true') {
      setShowExpiredMessage(true);
      // Limpiar el parámetro de la URL
      searchParams.delete('expired');
      setSearchParams(searchParams, { replace: true });
      
      // Ocultar el mensaje después de 10 segundos
      const timer = setTimeout(() => setShowExpiredMessage(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className='flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-background'>
      <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
        {/* Podríamos añadir un logo aquí */}
        <h2 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-foreground'>
          Inicia sesión en tu cuenta
        </h2>
      </div>

      {/* Mensaje de sesión expirada */}
      {showExpiredMessage && (
        <div className='mt-6 sm:mx-auto sm:w-full sm:max-w-sm'>
          <div className='flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-200'>
            <AlertCircle className='h-5 w-5 flex-shrink-0' />
            <div>
              <p className='font-medium'>Tu sesión ha expirado</p>
              <p className='text-sm opacity-80'>Por favor, vuelve a iniciar sesión para continuar.</p>
            </div>
          </div>
        </div>
      )}

      <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-card text-card-foreground px-6 py-8 shadow-sm rounded-lg border'>
        <LoginForm />
      </div>
    </div>
  );
};
