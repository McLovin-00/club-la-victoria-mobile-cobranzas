/**
 * Tests para uiSlice
 * Cubre: estado inicial, setSidebarOpen, toggleSidebar
 */
import { describe, it, expect } from '@jest/globals';
import uiReducer, { setSidebarOpen, toggleSidebar } from '../uiSlice';

describe('uiSlice', () => {
  describe('Estado inicial', () => {
    it('tiene sidebarOpen en false por defecto', () => {
      const state = uiReducer(undefined, { type: 'unknown' });
      expect(state.sidebarOpen).toBe(false);
    });
  });

  describe('setSidebarOpen', () => {
    it('establece sidebarOpen a true', () => {
      const state = uiReducer(undefined, setSidebarOpen(true));
      expect(state.sidebarOpen).toBe(true);
    });

    it('establece sidebarOpen a false', () => {
      const previousState = { sidebarOpen: true };
      const state = uiReducer(previousState, setSidebarOpen(false));
      expect(state.sidebarOpen).toBe(false);
    });

    it('mantiene el mismo valor si se setea igual', () => {
      const previousState = { sidebarOpen: true };
      const state = uiReducer(previousState, setSidebarOpen(true));
      expect(state.sidebarOpen).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('cambia de false a true', () => {
      const previousState = { sidebarOpen: false };
      const state = uiReducer(previousState, toggleSidebar());
      expect(state.sidebarOpen).toBe(true);
    });

    it('cambia de true a false', () => {
      const previousState = { sidebarOpen: true };
      const state = uiReducer(previousState, toggleSidebar());
      expect(state.sidebarOpen).toBe(false);
    });

    it('toggle doble vuelve al estado original', () => {
      let state = uiReducer(undefined, toggleSidebar()); // false -> true
      expect(state.sidebarOpen).toBe(true);

      state = uiReducer(state, toggleSidebar()); // true -> false
      expect(state.sidebarOpen).toBe(false);
    });
  });

  describe('Inmutabilidad', () => {
    it('no muta el estado anterior', () => {
      const previousState = { sidebarOpen: false };
      const frozenState = Object.freeze(previousState);

      // Si mutara el estado, esto lanzaría un error
      const newState = uiReducer(frozenState, toggleSidebar());

      expect(newState).not.toBe(previousState);
      expect(newState.sidebarOpen).toBe(true);
      expect(previousState.sidebarOpen).toBe(false);
    });
  });
});
