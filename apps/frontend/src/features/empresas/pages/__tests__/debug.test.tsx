import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../../api/empresasApiSlice', () => ({
    useGetEmpresasQuery: jest.fn(),
    useCreateEmpresaMutation: jest.fn(),
    useUpdateEmpresaMutation: jest.fn(),
    useDeleteEmpresaMutation: jest.fn(),
}));

import { CompaniesPage } from '../EmpresasPage'; // Oh wait, export name?
import * as api from '../../api/empresasApiSlice';

describe('Debug', () => {
    it('imports', () => {
        expect(api.useGetEmpresasQuery).toBeDefined();
    });
});
