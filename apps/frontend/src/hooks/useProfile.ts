import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  role: string;
  empresaId?: number;
  preferences?: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
    cacheEnabled: boolean;
    compactMode: boolean;
  };
}

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  preferences?: Partial<UserProfile['preferences']>;
}

export const useProfile = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const authToken = useSelector((state: RootState) => (state as any)?.auth?.token);
  const empresaId = useSelector((state: RootState) => (state as any)?.auth?.user?.empresaId);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En Vite `import.meta.env` existe. En tests/Node puede no estar definido: fallback seguro.
  const baseUrl = `${(import.meta as any)?.env?.VITE_DOCUMENTOS_API_URL || (process as any)?.env?.VITE_DOCUMENTOS_API_URL || ''}/api/docs`;

  const authHeaders: HeadersInit = useMemo(() => ({
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    'Content-Type': 'application/json',
  }), [authToken, empresaId]);

  // Inicializar profile desde user de auth
  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        empresaId: user.empresaId,
        preferences: user.preferences || {
          notifications: true,
          darkMode: false,
          language: 'es',
          cacheEnabled: true,
          compactMode: false,
        },
      });
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    if (!profile) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/transportistas/profile`, {
        method: 'PATCH',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedProfile = await response.json();
      
      setProfile(prevProfile => ({
        ...prevProfile!,
        ...updatedProfile.data,
      }));

      return updatedProfile.data;
    } catch (error: any) {
      setError(error.message || 'Error updating profile');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, baseUrl, authHeaders]);

  const updatePreferences = useCallback(async (preferences: Partial<UserProfile['preferences']>) => {
    if (!profile) return;

    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/transportistas/preferences`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedPreferences = await response.json();
      
      setProfile(prevProfile => ({
        ...prevProfile!,
        preferences: {
          ...prevProfile!.preferences!,
          ...updatedPreferences.data,
        },
      }));

      return updatedPreferences.data;
    } catch (error: any) {
      setError(error.message || 'Error updating preferences');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, baseUrl, authHeaders]);

  const uploadAvatar = useCallback(async (file: File) => {
    if (!profile) return;

    setIsUpdating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${baseUrl}/transportistas/avatar`, {
        method: 'POST',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
        },
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setProfile(prevProfile => ({
        ...prevProfile!,
        avatar: result.data.avatar,
      }));

      return result.data.avatar;
    } catch (error: any) {
      setError(error.message || 'Error uploading avatar');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [profile, baseUrl, authToken, empresaId]);

  const refreshProfile = useCallback(async () => {
    if (!authToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/transportistas/profile`, {
        method: 'GET',
        headers: authHeaders,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const profileData = await response.json();
      setProfile(profileData.data);
    } catch (error: any) {
      setError(error.message || 'Error fetching profile');
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, authHeaders, authToken]);

  return {
    profile,
    isLoading,
    isUpdating,
    error,
    updateProfile,
    updatePreferences,
    uploadAvatar,
    refreshProfile,
  };
};
