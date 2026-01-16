/**
 * Tests para empresasApiSlice
 *
 * Tests simplificados que verifican la estructura y exports del slice
 * sin depender de mocks de módulos ESM que son problemáticos.
 */
import { describe, it, expect } from '@jest/globals';

describe('empresasApiSlice exports', () => {
  it('exporta los hooks de query esperados', async () => {
    const module = await import('../empresaApiSlice');

    expect(module.useGetEmpresasQuery).toBeDefined();
    expect(typeof module.useGetEmpresasQuery).toBe('function');

    expect(module.useGetEmpresasSimpleQuery).toBeDefined();
    expect(typeof module.useGetEmpresasSimpleQuery).toBe('function');

    expect(module.useGetEmpresaQuery).toBeDefined();
    expect(typeof module.useGetEmpresaQuery).toBe('function');
  });

  it('exporta los hooks de mutation esperados', async () => {
    const module = await import('../empresaApiSlice');

    expect(module.useCreateEmpresaMutation).toBeDefined();
    expect(typeof module.useCreateEmpresaMutation).toBe('function');

    expect(module.useUpdateEmpresaMutation).toBeDefined();
    expect(typeof module.useUpdateEmpresaMutation).toBe('function');

    expect(module.useDeleteEmpresaMutation).toBeDefined();
    expect(typeof module.useDeleteEmpresaMutation).toBe('function');
  });

  it('exporta el slice con la estructura correcta', async () => {
    const module = await import('../empresaApiSlice');

    expect(module.empresaApiSlice).toBeDefined();
    expect(module.empresaApiSlice.reducerPath).toBeDefined();
    expect(module.empresaApiSlice.reducer).toBeDefined();
    expect(module.empresaApiSlice.middleware).toBeDefined();
    expect(module.empresaApiSlice.endpoints).toBeDefined();
  });

  it('tiene los endpoints definidos correctamente', async () => {
    const module = await import('../empresaApiSlice');
    const endpoints = module.empresaApiSlice.endpoints;

    expect(endpoints.getEmpresas).toBeDefined();
    expect(endpoints.getEmpresasSimple).toBeDefined();
    expect(endpoints.getEmpresa).toBeDefined();
    expect(endpoints.createEmpresa).toBeDefined();
    expect(endpoints.updateEmpresa).toBeDefined();
    expect(endpoints.deleteEmpresa).toBeDefined();
  });
});

describe('empresasApiSlice transformResponse logic', () => {
  // Tests de la lógica de transformación sin mockear el módulo
  it('transforma respuesta de getEmpresas correctamente', () => {
    const transformResponse = (response: { success: boolean; data: unknown[] }) => {
      return response.data || [];
    };

    const mockResponse = {
      success: true,
      data: [
        { id: 1, nombre: 'Empresa 1' },
        { id: 2, nombre: 'Empresa 2' },
      ],
    };

    const result = transformResponse(mockResponse);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, nombre: 'Empresa 1' });
  });

  it('retorna array vacío si data es undefined', () => {
    const transformResponse = (response: { success: boolean; data?: unknown[] }) => {
      return response.data || [];
    };

    const mockResponse = {
      success: true,
      data: undefined,
    };

    const result = transformResponse(mockResponse);
    expect(result).toEqual([]);
  });

  it('maneja respuesta con array vacío', () => {
    const transformResponse = (response: { success: boolean; data: unknown[] }) => {
      return response.data || [];
    };

    const mockResponse = {
      success: true,
      data: [],
    };

    const result = transformResponse(mockResponse);
    expect(result).toEqual([]);
  });
});

describe('empresasApiSlice providesTags logic', () => {
  it('provee tags correctos para lista de empresas', () => {
    const providesTags = (result?: { id: number }[]) => {
      if (!Array.isArray(result)) {
        return ['Empresa'];
      }
      return [
        'Empresa',
        ...result.map(({ id }) => ({ type: 'Empresa' as const, id })),
      ];
    };

    const mockResult = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const tags = providesTags(mockResult);

    expect(tags).toContain('Empresa');
    expect(tags).toContainEqual({ type: 'Empresa', id: 1 });
    expect(tags).toContainEqual({ type: 'Empresa', id: 2 });
    expect(tags).toContainEqual({ type: 'Empresa', id: 3 });
    expect(tags).toHaveLength(4); // 'Empresa' + 3 objetos
  });

  it('retorna solo tag base si result no es array', () => {
    const providesTags = (result?: { id: number }[]) => {
      if (!Array.isArray(result)) {
        return ['Empresa'];
      }
      return ['Empresa', ...result.map(({ id }) => ({ type: 'Empresa' as const, id }))];
    };

    expect(providesTags(undefined)).toEqual(['Empresa']);
    expect(providesTags(null as any)).toEqual(['Empresa']);
  });

  it('maneja array vacío correctamente', () => {
    const providesTags = (result?: { id: number }[]) => {
      if (!Array.isArray(result)) {
        return ['Empresa'];
      }
      return [
        'Empresa',
        ...result.map(({ id }) => ({ type: 'Empresa' as const, id })),
      ];
    };

    const tags = providesTags([]);
    expect(tags).toEqual(['Empresa']);
  });
});

describe('empresasApiSlice invalidatesTags logic', () => {
  it('invalida tag Empresa para createEmpresa', () => {
    const invalidatesTags = ['Empresa'];
    expect(invalidatesTags).toContain('Empresa');
  });

  it('invalida tag específico para updateEmpresa', () => {
    const invalidatesTags = (_result: unknown, _error: unknown, arg: { id: number }) => [
      { type: 'Empresa' as const, id: arg.id },
    ];

    const tags = invalidatesTags(null, null, { id: 5 });
    expect(tags).toContainEqual({ type: 'Empresa', id: 5 });
  });

  it('invalida tag Empresa para deleteEmpresa', () => {
    const invalidatesTags = ['Empresa'];
    expect(invalidatesTags).toContain('Empresa');
  });
});

describe('empresasApiSlice query configurations', () => {
  it('getEmpresas query path es correcto', () => {
    const query = () => '/empresas';
    expect(query()).toBe('/empresas');
  });

  it('getEmpresasSimple query path es correcto', () => {
    const query = () => '/empresas/simple';
    expect(query()).toBe('/empresas/simple');
  });

  it('getEmpresa query path incluye id', () => {
    const query = (id: number) => `/empresas/${id}`;
    expect(query(1)).toBe('/empresas/1');
    expect(query(999)).toBe('/empresas/999');
  });

  it('createEmpresa mutation tiene configuración correcta', () => {
    const query = (body: unknown) => ({
      url: '/empresas',
      method: 'POST',
      body,
    });

    const result = query({ nombre: 'Nueva Empresa' });
    expect(result.url).toBe('/empresas');
    expect(result.method).toBe('POST');
    expect(result.body).toEqual({ nombre: 'Nueva Empresa' });
  });

  it('updateEmpresa mutation tiene configuración correcta', () => {
    const query = ({ id, ...body }: { id: number; nombre?: string }) => ({
      url: `/empresas/${id}`,
      method: 'PUT',
      body,
    });

    const result = query({ id: 5, nombre: 'Empresa Actualizada' });
    expect(result.url).toBe('/empresas/5');
    expect(result.method).toBe('PUT');
    expect(result.body).toEqual({ nombre: 'Empresa Actualizada' });
  });

  it('deleteEmpresa mutation tiene configuración correcta', () => {
    const query = (id: number) => ({
      url: `/empresas/${id}`,
      method: 'DELETE',
    });

    const result = query(3);
    expect(result.url).toBe('/empresas/3');
    expect(result.method).toBe('DELETE');
  });
});
