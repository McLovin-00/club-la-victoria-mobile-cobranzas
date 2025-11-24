import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '../api/authApiSlice';
import { setCredentials } from '../authSlice';
import { Credentials } from '../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Logger } from '../../../lib/utils';

export const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Credentials>();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';
  const [login, { isLoading }] = useLoginMutation();

  const onSubmit = async (credentials: Credentials) => {
    try {
      const response = await login(credentials).unwrap();
      dispatch(setCredentials(response));

      // Si el usuario tiene un rol válido y está autorizado, redirigir según el rol
      if (response.data?.role) {
        // Determinar la ruta de destino según el rol del usuario
        let destination = from;
        
        // Si viene de login (from === '/'), redirigir al portal según el rol
        if (from === '/') {
          switch (response.data.role) {
            case 'ADMIN_INTERNO':
              destination = '/portal/admin-interno';
              break;
            case 'DADOR_DE_CARGA':
              destination = '/portal/dadores';
              break;
            case 'TRANSPORTISTA':
            case 'CHOFER':
              destination = '/portal/transportistas';
              break;
            case 'CLIENTE':
              destination = '/portal/cliente';
              break;
            default:
              destination = '/';
              break;
          }
        }
        
        Logger.debug('Login exitoso, redirigiendo a:', destination);
        navigate(destination, { replace: true });
      } else {
        Logger.error('Usuario sin rol asignado');
        setError('root', {
          type: 'manual',
          message: 'Usuario no autorizado',
        });
      }
    } catch (err: unknown) {
      Logger.error('Error en login:', err);
      let errorMessage = 'Error al iniciar sesión';

      if (err && typeof err === 'object' && 'status' in err) {
        const error = err as { status: number };
        if (error.status === 401) {
          errorMessage = 'Credenciales inválidas';
        } else if (error.status === 403) {
          errorMessage = 'Usuario no autorizado';
        }
      }

      setError('root', {
        type: 'manual',
        message: errorMessage,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4 w-full max-w-sm'>
      <div className='space-y-2'>
        <Input
          type='email'
          placeholder='Email'
          autoComplete='username'
          {...register('email', {
            required: 'El email es requerido',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Email inválido',
            },
          })}
        />
        {errors.email && <p className='text-sm text-red-500'>{errors.email.message}</p>}
      </div>

      <div className='space-y-2'>
        <Input
          type='password'
          placeholder='Contraseña'
          autoComplete='current-password'
          {...register('password', {
            required: 'La contraseña es requerida',
            minLength: {
              value: 6,
              message: 'La contraseña debe tener al menos 6 caracteres',
            },
          })}
        />
        {errors.password && <p className='text-sm text-red-500'>{errors.password.message}</p>}
      </div>

      {errors.root && <p className='text-sm text-red-500'>{errors.root.message}</p>}

      <Button type='submit' className='w-full' disabled={isLoading}>
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>
    </form>
  );
};
