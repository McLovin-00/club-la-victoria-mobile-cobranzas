/**
 * Tests comprehensivos para contexts.mocks.ts
 * 
 * Verifica todas las funciones factory para crear mocks de contexts.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createConfirmContextMock,
  mockConfirmContext,
  createToastContextMock,
  mockToastContext,
} from '../mocks/contexts.mocks';

describe('contexts.mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfirmContextMock', () => {
    it('crea ConfirmContext con valor por defecto', () => {
      const mock = createConfirmContextMock();
      
      expect(mock.ConfirmContext).toBeDefined();
    });

    it('crea useConfirm hook', () => {
      const mock = createConfirmContextMock();
      const hook = mock.useConfirm();
      
      expect(typeof hook.confirm).toBe('function');
    });

    it('confirm resuelve true por defecto', async () => {
      const mock = createConfirmContextMock();
      const hook = mock.useConfirm();
      
      const result = await hook.confirm();
      
      expect(result).toBe(true);
    });

    it('permite especificar resultado de confirm', async () => {
      const mock = createConfirmContextMock({ confirmResult: false });
      const hook = mock.useConfirm();
      
      const result = await hook.confirm();
      
      expect(result).toBe(false);
    });

    it('exporta __confirmFn para assertions', () => {
      const mock = createConfirmContextMock();
      
      expect(mock.__confirmFn).toBeDefined();
      expect(jest.isMockFunction(mock.__confirmFn)).toBe(true);
    });

    it('confirm es rastreable', async () => {
      const mock = createConfirmContextMock();
      const hook = mock.useConfirm();
      
      await hook.confirm({ title: 'Test', message: 'Are you sure?' });
      
      expect(mock.__confirmFn).toHaveBeenCalledWith({ title: 'Test', message: 'Are you sure?' });
    });

    it('múltiples llamadas a confirm son rastreables', async () => {
      const mock = createConfirmContextMock();
      const hook = mock.useConfirm();
      
      await hook.confirm({ id: 1 });
      await hook.confirm({ id: 2 });
      await hook.confirm({ id: 3 });
      
      expect(mock.__confirmFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('mockConfirmContext', () => {
    it('es una instancia pre-creada', () => {
      expect(mockConfirmContext.ConfirmContext).toBeDefined();
      expect(mockConfirmContext.useConfirm).toBeDefined();
      expect(mockConfirmContext.__confirmFn).toBeDefined();
    });

    it('confirm resuelve true', async () => {
      const hook = mockConfirmContext.useConfirm();
      const result = await hook.confirm();
      
      expect(result).toBe(true);
    });
  });

  describe('createToastContextMock', () => {
    it('crea ToastContext con valor por defecto', () => {
      const mock = createToastContextMock();
      
      expect(mock.ToastContext).toBeDefined();
    });

    it('crea useToastContext hook', () => {
      const mock = createToastContextMock();
      const hook = mock.useToastContext();
      
      expect(typeof hook.show).toBe('function');
    });

    it('exporta __showFn para assertions', () => {
      const mock = createToastContextMock();
      
      expect(mock.__showFn).toBeDefined();
      expect(jest.isMockFunction(mock.__showFn)).toBe(true);
    });

    it('show es rastreable', () => {
      const mock = createToastContextMock();
      const hook = mock.useToastContext();
      
      hook.show({ type: 'success', message: 'Done!' });
      
      expect(mock.__showFn).toHaveBeenCalledWith({ type: 'success', message: 'Done!' });
    });

    it('múltiples llamadas a show son rastreables', () => {
      const mock = createToastContextMock();
      const hook = mock.useToastContext();
      
      hook.show({ id: 1 });
      hook.show({ id: 2 });
      
      expect(mock.__showFn).toHaveBeenCalledTimes(2);
    });

    it('show puede ser llamado sin argumentos', () => {
      const mock = createToastContextMock();
      const hook = mock.useToastContext();
      
      hook.show();
      
      expect(mock.__showFn).toHaveBeenCalled();
    });
  });

  describe('mockToastContext', () => {
    it('es una instancia pre-creada', () => {
      expect(mockToastContext.ToastContext).toBeDefined();
      expect(mockToastContext.useToastContext).toBeDefined();
      expect(mockToastContext.__showFn).toBeDefined();
    });

    it('show funciona correctamente', () => {
      const hook = mockToastContext.useToastContext();
      
      hook.show({ message: 'test' });
      
      expect(mockToastContext.__showFn).toHaveBeenCalled();
    });
  });
});

