/**
 * Tests de cobertura para RegisterUserModal
 * Usa Provider + mock store para inyectar estado de Redux
 */
import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { RegisterUserModal } from '../RegisterUserModal';

// ── Mock slices mínimos ─────────────────────────────────────────────────────

function createAuthReducer(user: Record<string, unknown>) {
  return () => ({ user, token: 'mock-token', isAuthenticated: true, initialized: true });
}


// ── Fixtures ────────────────────────────────────────────────────────────────

const superAdmin = { id: 1, email: 'superadmin@test.com', role: 'SUPERADMIN', empresaId: 1, empresa: { nombre: 'Empresa BCA' } };
const adminUser = { id: 2, email: 'admin@test.com', role: 'ADMIN', empresaId: 1, empresa: { nombre: 'Empresa BCA' } };
const dadorUser = { id: 3, email: 'dador@test.com', role: 'DADOR_DE_CARGA', empresaId: 1, dadorCargaId: 10, empresa: { nombre: 'Empresa BCA' } };
const transportistaUser = { id: 4, email: 'trans@test.com', role: 'TRANSPORTISTA', empresaId: 1, empresaTransportistaId: 20, dadorCargaId: 10, empresa: { nombre: 'Empresa BCA' } };

const mockEmpresas = [{ id: 1, nombre: 'Empresa BCA' }, { id: 2, nombre: 'Empresa Secundaria' }];
const mockDadores = [
  { id: 10, razonSocial: 'Dador Carga SA', cuit: '20111111111' },
  { id: 11, razonSocial: 'Dador Carga SRL', cuit: '20222222222' },
];
const mockClientes = [
  { id: 30, razonSocial: 'Cliente SA', cuit: '20333333333' },
  { id: 31, razonSocial: 'Cliente SRL', cuit: '20444444444' },
];
const mockTransportistas = [
  { id: 20, razonSocial: 'Transporte SA', cuit: '20555555555' },
  { id: 21, razonSocial: 'Transporte SRL', cuit: '20666666666' },
];
const mockChoferes = [
  { id: 40, nombre: 'Juan', apellido: 'Pérez', dni: '12345678' },
  { id: 41, nombre: 'Pedro', apellido: 'García', dni: '87654321' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function createStore(user: Record<string, unknown> = superAdmin): EnhancedStore {
  // Lazy import to avoid circular deps
  const { default: apiSlice } = require('../../../../store/apiSlice');
  const { documentosApiSlice } = require('../../../documentos/api/documentosApiSlice');

  return configureStore({
    reducer: {
      auth: createAuthReducer(user),
      [apiSlice.reducerPath]: apiSlice.reducer,
      [documentosApiSlice.reducerPath]: documentosApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware: any) =>
      getDefaultMiddleware({ serializableCheck: false })
        .concat(apiSlice.middleware, documentosApiSlice.middleware),
  });
}

function renderModal(props: { isOpen: boolean; onClose: () => void }, user = superAdmin) {
  const store = createStore(user);
  return render(
    <Provider store={store}>
      <RegisterUserModal {...props} />
    </Provider>
  );
}

function selectRole(role: string) {
  const roleSelect = screen.getAllByRole('combobox')[0];
  fireEvent.change(roleSelect, { target: { value: role } });
}

function fillEmail(email = 'test@test.com') {
  fireEvent.change(screen.getByPlaceholderText('usuario@empresa.com'), { target: { value: email } });
}

function selectEmpresa(id = '1') {
  const empresaSelect = screen.getAllByRole('combobox')[1];
  fireEvent.change(empresaSelect, { target: { value: id } });
}

async function submitForm() {
  await act(async () => {
    fireEvent.click(screen.getByText('Crear Usuario'));
  });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterUserModal - Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería importar el componente', () => {
    expect(RegisterUserModal).toBeDefined();
  });

  it('no debería renderizar nada cuando isOpen=false', () => {
    renderModal({ isOpen: false, onClose: jest.fn() });
    expect(screen.queryByText('Nuevo Usuario')).not.toBeInTheDocument();
  });

  it('debería renderizar el modal cuando isOpen=true', () => {
    renderModal({ isOpen: true, onClose: jest.fn() });
    expect(screen.getByText('Nuevo Usuario')).toBeInTheDocument();
    expect(screen.getByText('Email *')).toBeInTheDocument();
    expect(screen.getByText('Rol *')).toBeInTheDocument();
  });

  it('debería mostrar selector de empresa para SUPERADMIN', () => {
    renderModal({ isOpen: true, onClose: jest.fn() });
    expect(screen.getByText('Empresa (Tenant) *')).toBeInTheDocument();
  });

  it('debería mostrar empresa fija para no-SUPERADMIN', () => {
    renderModal({ isOpen: true, onClose: jest.fn() }, adminUser);
    expect(screen.queryByText('Empresa (Tenant) *')).not.toBeInTheDocument();
    expect(screen.getByText('Empresa')).toBeInTheDocument();
  });

  it('debería cerrar modal al hacer clic en backdrop', () => {
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    const backdrop = document.querySelector('.bg-black\\/40');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('debería cerrar modal al hacer clic en Cancelar', () => {
    const onClose = jest.fn();
    renderModal({ isOpen: true, onClose });
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  describe('Rol OPERATOR (básico)', () => {
    it('debería mostrar campo password para OPERATOR', () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      expect(screen.getByText('Password *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Mín. 8 caracteres')).toBeInTheDocument();
    });

    it('debería mostrar error cuando no se selecciona empresa', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      fillEmail('test@test.com');
      fireEvent.change(screen.getByPlaceholderText('Mín. 8 caracteres'), { target: { value: 'Password123!' } });

      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar una empresa')).toBeInTheDocument();
      });
    });
  });

  describe('Rol CLIENTE', () => {
    it('debería mostrar wizard para CLIENTE', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('CLIENTE');

      await waitFor(() => {
        expect(screen.getByText('Asociar cliente existente')).toBeInTheDocument();
        expect(screen.getByText('Crear cliente nuevo + crear usuario')).toBeInTheDocument();
      });
    });

    it('debería no mostrar wizard CLIENTE para usuario DADOR_DE_CARGA', () => {
      renderModal({ isOpen: true, onClose: jest.fn() }, dadorUser);
      expect(screen.queryByText('Asociar cliente existente')).not.toBeInTheDocument();
    });
  });

  describe('Rol DADOR_DE_CARGA', () => {
    it('debería mostrar wizard para DADOR_DE_CARGA', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText('Asociar dador existente')).toBeInTheDocument();
        expect(screen.getByText('Crear dador nuevo + crear usuario')).toBeInTheDocument();
      });
    });

    it('debería mostrar selector de dador existente', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText('Dador de Carga asociado *')).toBeInTheDocument();
      });
    });

    it('debería mostrar error si no selecciona dador existente', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText('Dador de Carga asociado *')).toBeInTheDocument();
      });

      fillEmail('dador@test.com');
      selectEmpresa();

      await submitForm();

      await waitFor(() => {
        expect(screen.getByText('Debe seleccionar un dador de carga')).toBeInTheDocument();
      });
    });

    it('debería mostrar campos para crear dador nuevo', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText('Crear dador nuevo + crear usuario')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Crear dador nuevo + crear usuario'));

      await waitFor(() => {
        expect(screen.getByText('Razón Social del Dador *')).toBeInTheDocument();
        expect(screen.getByText('CUIT del Dador *')).toBeInTheDocument();
      });
    });
  });

  describe('Rol TRANSPORTISTA', () => {
    it('debería mostrar wizard para TRANSPORTISTA', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('TRANSPORTISTA');

      await waitFor(() => {
        expect(screen.getByText('Asociar transportista existente')).toBeInTheDocument();
        expect(screen.getByText('Crear transportista nuevo + crear usuario')).toBeInTheDocument();
      });
    });
  });

  describe('Rol CHOFER', () => {
    it('debería mostrar wizard para CHOFER', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('CHOFER');

      await waitFor(() => {
        expect(screen.getByText('Asociar chofer existente')).toBeInTheDocument();
        expect(screen.getByText('Crear chofer nuevo + crear usuario')).toBeInTheDocument();
      });
    });
  });

  describe('Usuario DADOR_DE_CARGA creando usuarios', () => {
    it('debería mostrar dador automático al crear TRANSPORTISTA', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() }, dadorUser);
      selectRole('TRANSPORTISTA');

      await waitFor(() => {
        expect(screen.getByText('Su dador de carga')).toBeInTheDocument();
      });
    });

    it('debería mostrar dador automático al crear CHOFER', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() }, dadorUser);
      selectRole('CHOFER');

      await waitFor(() => {
        expect(screen.getByText('Su dador de carga')).toBeInTheDocument();
      });
    });
  });

  describe('Usuario TRANSPORTISTA creando usuarios', () => {
    it('debería mostrar dador y transportista automáticos al crear CHOFER', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() }, transportistaUser);
      selectRole('CHOFER');

      await waitFor(() => {
        expect(screen.getByText('Su dador de carga')).toBeInTheDocument();
        expect(screen.getByText('Su empresa transportista')).toBeInTheDocument();
      });
    });
  });

  describe('Contraseña temporal modal', () => {
    it('debería ocultar campo password para roles wizard (CLIENTE)', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('CLIENTE');

      await waitFor(() => {
        expect(screen.getByText('Asociar cliente existente')).toBeInTheDocument();
      });

      expect(screen.queryByText('Password *')).not.toBeInTheDocument();
      expect(screen.getByText(/la contraseña se genera automáticamente/i)).toBeInTheDocument();
    });

    it('debería ocultar campo password para roles wizard (DADOR_DE_CARGA)', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText('Asociar dador existente')).toBeInTheDocument();
      });

      expect(screen.queryByText('Password *')).not.toBeInTheDocument();
      expect(screen.getByText(/la contraseña se genera automáticamente/i)).toBeInTheDocument();
    });
  });

  describe('Mensaje de asociación', () => {
    it('debería mostrar mensaje de asociación para roles que lo requieren', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      selectRole('DADOR_DE_CARGA');

      await waitFor(() => {
        expect(screen.getByText(/Este rol requiere asociación/)).toBeInTheDocument();
      });
    });
  });

  describe('Validación de formulario', () => {
    it('debería mostrar error de validación para email vacío', async () => {
      renderModal({ isOpen: true, onClose: jest.fn() });

      await submitForm();

      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/requerido/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Nombre y Apellido', () => {
    it('debería renderizar campos de nombre y apellido', () => {
      renderModal({ isOpen: true, onClose: jest.fn() });
      expect(screen.getByText('Nombre')).toBeInTheDocument();
      expect(screen.getByText('Apellido')).toBeInTheDocument();
    });
  });
});
