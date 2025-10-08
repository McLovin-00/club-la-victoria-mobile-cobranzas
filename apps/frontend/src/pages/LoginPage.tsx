import { LoginForm } from '../features/auth/components/LoginForm';

// Asegurarse de que se exporta
export const LoginPage = () => {
  return (
    <div className='flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-background'>
      <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
        {/* Podríamos añadir un logo aquí */}
        <h2 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-foreground'>
          Inicia sesión en tu cuenta
        </h2>
      </div>

      <div className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-card text-card-foreground px-6 py-8 shadow-sm rounded-lg border'>
        <LoginForm />
      </div>
    </div>
  );
};
