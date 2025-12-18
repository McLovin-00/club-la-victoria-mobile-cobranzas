import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import apiSlice from './apiSlice';
import authSlice from '../features/auth/authSlice';
import { documentosApiSlice } from '../features/documentos/api/documentosApiSlice';
import { remitosApiSlice } from '../features/remitos/api/remitosApiSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    api: apiSlice.reducer,
    auth: authSlice,
    documentosApi: documentosApiSlice.reducer,
    remitosApi: remitosApiSlice.reducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware, documentosApiSlice.middleware, remitosApiSlice.middleware),
});

// Habilitar refetchOnFocus y refetchOnReconnect para RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
