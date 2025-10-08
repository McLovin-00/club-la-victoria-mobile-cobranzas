import { useState, useCallback } from 'react';
import { Logger } from '../../../lib/utils';
import { Service, ServiceEstado } from '../types';

// Hook para validar nombres de servicios
export const useServiceNameValidation = (services: Service[] = [], currentServiceId?: number) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validateName = useCallback(
    (name: string): boolean => {
      setIsValidating(true);
      setValidationError(null);
      setIsValid(false);

      try {
        // Validar longitud
        if (!name || name.trim().length === 0) {
          setValidationError('El nombre es requerido');
          return false;
        }

        if (name.trim().length < 3) {
          setValidationError('El nombre debe tener al menos 3 caracteres');
          return false;
        }

        if (name.trim().length > 150) {
          setValidationError('El nombre no puede exceder 150 caracteres');
          return false;
        }

        // Validar caracteres especiales
        const namePattern = /^[a-zA-Z0-9\s\-_\.]+$/;
        if (!namePattern.test(name.trim())) {
          setValidationError('El nombre solo puede contener letras, números, espacios, guiones y puntos');
          return false;
        }

        // Validar duplicados (excluyendo el servicio actual si está editando)
        const existingService = services.find(
          service => 
            service.nombre.toLowerCase() === name.trim().toLowerCase() && 
            service.id !== currentServiceId
        );

        if (existingService) {
          setValidationError('Ya existe un servicio con este nombre');
          return false;
        }

        setIsValid(true);
        return true;
      } catch (error) {
        Logger.error('Error en validación de nombre:', error);
        setValidationError('Error al validar el nombre');
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [services, currentServiceId]
  );

  return {
    validateName,
    isValidating,
    validationError,
    isValid,
  };
};

// Hook para validar versiones de servicios
export const useServiceVersionValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);

  const validateVersion = useCallback((version: string): boolean => {
    setIsValidating(true);
    setValidationError(null);
    setIsValid(false);

    try {
      // Permitir versión vacía
      if (!version || version.trim().length === 0) {
        setIsValid(true);
        return true;
      }

      // Validar longitud
      if (version.trim().length > 50) {
        setValidationError('La versión no puede exceder 50 caracteres');
        return false;
      }

      // Validar formato básico (letras, números, puntos, guiones)
      const versionPattern = /^[a-zA-Z0-9\.\-_]+$/;
      if (!versionPattern.test(version.trim())) {
        setValidationError('La versión solo puede contener letras, números, puntos y guiones');
        return false;
      }

      setIsValid(true);
      return true;
    } catch (error) {
      Logger.error('Error en validación de versión:', error);
      setValidationError('Error al validar la versión');
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    validateVersion,
    isValidating,
    validationError,
    isValid,
  };
};

// Hook para validar formulario completo de servicio
export const useServiceFormValidation = (services: Service[] = [], currentServiceId?: number) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const nameValidation = useServiceNameValidation(services, currentServiceId);
  const versionValidation = useServiceVersionValidation();

  const validateForm = useCallback(
    (formData: {
      nombre: string;
      descripcion: string;
      version: string;
      estado: ServiceEstado;
    }): boolean => {
      setIsValidating(true);
      const newErrors: Record<string, string> = {};

      // Validar nombre
      if (!nameValidation.validateName(formData.nombre)) {
        newErrors.nombre = nameValidation.validationError || 'Nombre inválido';
      }

      // Validar descripción (opcional)
      if (formData.descripcion && formData.descripcion.trim().length > 500) {
        newErrors.descripcion = 'La descripción no puede exceder 500 caracteres';
      }

      // Validar versión
      if (!versionValidation.validateVersion(formData.version)) {
        newErrors.version = versionValidation.validationError || 'Versión inválida';
      }

      // Validar estado
      if (!formData.estado || !['activo', 'inactivo', 'mantenimiento'].includes(formData.estado)) {
        newErrors.estado = 'Debe seleccionar un estado válido';
      }

      setErrors(newErrors);
      const formIsValid = Object.keys(newErrors).length === 0;
      setIsValid(formIsValid);
      setIsValidating(false);

      return formIsValid;
    },
    [nameValidation, versionValidation]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(false);
  }, []);

  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
    setIsValid(false);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    validateForm,
    errors,
    isValid,
    isValidating,
    clearErrors,
    setFieldError,
    clearFieldError,
  };
};

// Hook para validar permisos de servicio
export const useServicePermissions = (currentUserRole?: string) => {
  const canCreate = useCallback(() => {
    return currentUserRole === 'superadmin';
  }, [currentUserRole]);

  const canEdit = useCallback(() => {
    return currentUserRole === 'superadmin';
  }, [currentUserRole]);

  const canDelete = useCallback((service: Service) => {
    // Solo superadmin puede eliminar servicios
    // Y solo si no tiene instancias asociadas
    return currentUserRole === 'superadmin' && (!service._count || service._count.instances === 0);
  }, [currentUserRole]);

  const canView = useCallback(() => {
    // Todos los usuarios autenticados pueden ver servicios
    return true;
  }, []);

  const canChangeEstado = useCallback(() => {
    return currentUserRole === 'superadmin';
  }, [currentUserRole]);

  return {
    canCreate,
    canEdit,
    canDelete,
    canView,
    canChangeEstado,
  };
};

// Hook para manejar errores de API de servicios
export const useServiceErrorHandler = () => {
  const [lastError, setLastError] = useState<string | null>(null);

  const handleApiError = useCallback((error: any, operation: string) => {
    Logger.error(`Error en ${operation}:`, error);
    
    let errorMessage = 'Error desconocido';
    
    if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    setLastError(errorMessage);
    return errorMessage;
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    handleApiError,
    lastError,
    clearError,
  };
};

// Hook para manejar el estado de servicio
export const useServiceEstadoHandler = () => {
  const getEstadoColor = useCallback((estado: ServiceEstado): string => {
    switch (estado) {
      case 'activo':
        return 'text-green-600 bg-green-100';
      case 'inactivo':
        return 'text-red-600 bg-red-100';
      case 'mantenimiento':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getEstadoLabel = useCallback((estado: ServiceEstado): string => {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'inactivo':
        return 'Inactivo';
      case 'mantenimiento':
        return 'Mantenimiento';
      default:
        return 'Desconocido';
    }
  }, []);

  const canChangeToEstado = useCallback((currentEstado: ServiceEstado, newEstado: ServiceEstado): boolean => {
    // Definir transiciones permitidas
    const allowedTransitions: Record<ServiceEstado, ServiceEstado[]> = {
      'activo': ['inactivo', 'mantenimiento'],
      'inactivo': ['activo', 'mantenimiento'],
      'mantenimiento': ['activo', 'inactivo'],
    };

    return allowedTransitions[currentEstado]?.includes(newEstado) || false;
  }, []);

  return {
    getEstadoColor,
    getEstadoLabel,
    canChangeToEstado,
  };
}; 