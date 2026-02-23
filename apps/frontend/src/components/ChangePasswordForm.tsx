import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser, setCurrentUser } from '../features/auth/authSlice';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { showToast } from './ui/Toast.utils';

interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ChangePasswordForm = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser) as any;
  const [formData, setFormData] = useState<ChangePasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.currentPassword) {
      showToast('La contraseña actual es requerida', 'error');
      return false;
    }

    if (!formData.newPassword) {
      showToast('La nueva contraseña es requerida', 'error');
      return false;
    }

    if (formData.newPassword.length < 8) {
      showToast('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return false;
    }

    // Validar que tenga mayúscula, minúscula y número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(formData.newPassword)) {
      showToast('La contraseña debe contener al menos una mayúscula, una minúscula y un número', 'error');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      showToast('La nueva contraseña debe ser diferente a la actual', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/platform/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setResult({ type: 'success', text: 'Contraseña cambiada exitosamente' });
        showToast('Contraseña cambiada exitosamente', 'success');
        if (currentUser) {
          dispatch(setCurrentUser({ ...currentUser, mustChangePassword: false }));
        }
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const error = await response.json();
        const msg = error.message || 'Error al cambiar la contraseña';
        setResult({ type: 'error', text: msg });
        showToast(msg, 'error');
      }
    } catch {
      setResult({ type: 'error', text: 'Error de conexión al cambiar la contraseña' });
      showToast('Error de conexión al cambiar la contraseña', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isMustChange = currentUser?.mustChangePassword === true;

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      {isMustChange && (
        <div className='p-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-800'>
          <p className='font-semibold mb-1'>Cambio de contraseña obligatorio</p>
          <p className='text-sm'>
            Tu cuenta fue creada con una contraseña temporal proporcionada por el administrador.
            Ingresá esa contraseña temporal en el campo <strong>&quot;Contraseña Actual&quot;</strong> y elegí una nueva contraseña personal.
          </p>
        </div>
      )}
      {/* Campo de username oculto para accesibilidad */}
      <input
        type='text'
        name='username'
        autoComplete='username'
        value=''
        onChange={() => {}}
        style={{ display: 'none' }}
        tabIndex={-1}
      />
      <div>
        <label htmlFor='currentPassword' className='block text-sm font-medium text-foreground mb-1'>
          {isMustChange ? 'Contraseña Temporal (proporcionada por el administrador)' : 'Contraseña Actual'}
        </label>
        <div className='relative'>
          <input
            type={showPasswords.current ? 'text' : 'password'}
            id='currentPassword'
            name='currentPassword'
            value={formData.currentPassword}
            onChange={handleChange}
            required
            autoComplete='current-password'
            className='w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground'
            placeholder={isMustChange ? 'Ingrese la contraseña temporal' : 'Ingrese su contraseña actual'}
          />
          <button
            type='button'
            className='absolute inset-y-0 right-0 pr-3 flex items-center'
            onClick={() => togglePasswordVisibility('current')}
          >
            {showPasswords.current ? (
              <EyeSlashIcon className='h-4 w-4 text-muted-foreground' />
            ) : (
              <EyeIcon className='h-4 w-4 text-muted-foreground' />
            )}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor='newPassword' className='block text-sm font-medium text-foreground mb-1'>
          Nueva Contraseña
        </label>
        <div className='relative'>
          <input
            type={showPasswords.new ? 'text' : 'password'}
            id='newPassword'
            name='newPassword'
            value={formData.newPassword}
            onChange={handleChange}
            required
            minLength={8}
            autoComplete='new-password'
            className='w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground'
            placeholder='Ingrese su nueva contraseña'
          />
          <button
            type='button'
            className='absolute inset-y-0 right-0 pr-3 flex items-center'
            onClick={() => togglePasswordVisibility('new')}
          >
            {showPasswords.new ? (
              <EyeSlashIcon className='h-4 w-4 text-muted-foreground' />
            ) : (
              <EyeIcon className='h-4 w-4 text-muted-foreground' />
            )}
          </button>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>Mínimo 8 caracteres, con mayúscula, minúscula y número</p>
      </div>

      <div>
        <label htmlFor='confirmPassword' className='block text-sm font-medium text-foreground mb-1'>
          Confirmar Nueva Contraseña
        </label>
        <div className='relative'>
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            id='confirmPassword'
            name='confirmPassword'
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete='new-password'
            className='w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground'
            placeholder='Confirme su nueva contraseña'
          />
          <button
            type='button'
            className='absolute inset-y-0 right-0 pr-3 flex items-center'
            onClick={() => togglePasswordVisibility('confirm')}
          >
            {showPasswords.confirm ? (
              <EyeSlashIcon className='h-4 w-4 text-muted-foreground' />
            ) : (
              <EyeIcon className='h-4 w-4 text-muted-foreground' />
            )}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            result.type === 'success'
              ? 'bg-green-50 border border-green-300 text-green-800'
              : 'bg-red-50 border border-red-300 text-red-800'
          }`}
        >
          <span className='text-lg flex-shrink-0'>{result.type === 'success' ? '✅' : '❌'}</span>
          <div>
            <p className='font-semibold'>{result.type === 'success' ? 'Contraseña actualizada' : 'Error'}</p>
            <p className='text-sm'>{result.text}</p>
          </div>
        </div>
      )}

      <div className='pt-4'>
        <button
          type='submit'
          disabled={isLoading}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isLoading ? (
            <>
              <svg
                className='animate-spin -ml-1 mr-3 h-4 w-4 text-primary-foreground'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
              Cambiando...
            </>
          ) : (
            'Cambiar Contraseña'
          )}
        </button>
      </div>
    </form>
  );
};
