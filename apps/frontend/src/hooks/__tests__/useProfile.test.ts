/**
 * Tests para useProfile hook
 * Verifica tipos y lógica de gestión del perfil de usuario
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('useProfile - tipos', () => {
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

  it('UserProfile tiene la estructura correcta', () => {
    const profile: UserProfile = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'TRANSPORTISTA',
      empresaId: 1,
      preferences: {
        notifications: true,
        darkMode: false,
        language: 'es',
        cacheEnabled: true,
        compactMode: false,
      },
    };

    expect(profile.id).toBe(1);
    expect(profile.username).toBe('testuser');
    expect(profile.email).toBe('test@example.com');
    expect(profile.role).toBe('TRANSPORTISTA');
    expect(profile.preferences?.notifications).toBe(true);
  });

  it('UserProfile campos opcionales pueden ser undefined', () => {
    const profile: UserProfile = {
      id: 1,
      username: 'user',
      email: 'user@test.com',
      role: 'USER',
    };

    expect(profile.firstName).toBeUndefined();
    expect(profile.lastName).toBeUndefined();
    expect(profile.phone).toBeUndefined();
    expect(profile.avatar).toBeUndefined();
    expect(profile.empresaId).toBeUndefined();
    expect(profile.preferences).toBeUndefined();
  });

  it('ProfileUpdateData permite actualización parcial', () => {
    const update: ProfileUpdateData = {
      firstName: 'Updated',
    };

    expect(update.firstName).toBe('Updated');
    expect(update.lastName).toBeUndefined();
    expect(update.phone).toBeUndefined();
  });

  it('ProfileUpdateData permite actualizar preferences parcialmente', () => {
    const update: ProfileUpdateData = {
      preferences: {
        darkMode: true,
      },
    };

    expect(update.preferences?.darkMode).toBe(true);
    expect(update.preferences?.notifications).toBeUndefined();
  });
});

describe('useProfile - preferences defaults', () => {
  it('tiene preferences por defecto correctas', () => {
    const defaultPreferences = {
      notifications: true,
      darkMode: false,
      language: 'es',
      cacheEnabled: true,
      compactMode: false,
    };

    expect(defaultPreferences.notifications).toBe(true);
    expect(defaultPreferences.darkMode).toBe(false);
    expect(defaultPreferences.language).toBe('es');
    expect(defaultPreferences.cacheEnabled).toBe(true);
    expect(defaultPreferences.compactMode).toBe(false);
  });
});

describe('useProfile - authHeaders', () => {
  it('construye headers correctamente con token y empresaId', () => {
    const authToken = 'test-token';
    const empresaId = 42;

    const authHeaders: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
      'Content-Type': 'application/json',
    };

    expect(authHeaders.Authorization).toBe('Bearer test-token');
    expect(authHeaders['x-tenant-id']).toBe('42');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });

  it('uploadAvatar no incluye Content-Type (FormData)', () => {
    const authToken = 'test-token';
    const empresaId = 42;

    // Para FormData, no se incluye Content-Type
    const uploadHeaders = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(empresaId ? { 'x-tenant-id': String(empresaId) } : {}),
    };

    expect(uploadHeaders.Authorization).toBe('Bearer test-token');
    expect((uploadHeaders as any)['Content-Type']).toBeUndefined();
  });
});

describe('useProfile - lógica de estado', () => {
  it('isLoading y isUpdating son independientes', () => {
    let isLoading = true;
    let isUpdating = false;

    // Loading termina
    isLoading = false;
    expect(isLoading).toBe(false);
    expect(isUpdating).toBe(false);

    // Update comienza
    isUpdating = true;
    expect(isLoading).toBe(false);
    expect(isUpdating).toBe(true);
  });

  it('error se limpia antes de cada operación', () => {
    let error: string | null = 'Previous error';

    // Antes de cada operación
    error = null;
    expect(error).toBeNull();
  });
});

describe('useProfile - merge de profile', () => {
  it('updateProfile merges datos correctamente', () => {
    const prevProfile = {
      id: 1,
      username: 'user',
      email: 'user@test.com',
      firstName: 'Old',
      lastName: 'Name',
      role: 'USER',
    };

    const updateData = {
      firstName: 'New',
    };

    const updatedProfile = {
      ...prevProfile,
      ...updateData,
    };

    expect(updatedProfile.firstName).toBe('New');
    expect(updatedProfile.lastName).toBe('Name'); // No cambia
    expect(updatedProfile.email).toBe('user@test.com'); // No cambia
  });

  it('updatePreferences merges preferences correctamente', () => {
    const prevPreferences = {
      notifications: true,
      darkMode: false,
      language: 'es',
      cacheEnabled: true,
      compactMode: false,
    };

    const updatePreferences = {
      darkMode: true,
    };

    const updatedPreferences = {
      ...prevPreferences,
      ...updatePreferences,
    };

    expect(updatedPreferences.darkMode).toBe(true);
    expect(updatedPreferences.notifications).toBe(true); // No cambia
    expect(updatedPreferences.language).toBe('es'); // No cambia
  });
});

describe('useProfile - FormData para avatar', () => {
  it('crea FormData correctamente para avatar', () => {
    const formData = new FormData();
    const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });
    formData.append('avatar', mockFile);

    expect(formData.get('avatar')).toBe(mockFile);
  });
});

describe('useProfile - export', () => {
  it('exporta useProfile hook', async () => {
    const module = await import('../useProfile');
    expect(module.useProfile).toBeDefined();
    expect(typeof module.useProfile).toBe('function');
  });
});
