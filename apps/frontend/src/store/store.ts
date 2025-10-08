import { configureStore } from '@reduxjs/toolkit';
import apiSlice from './apiSlice';
import authSlice from '../features/auth/authSlice';
import { documentosApiSlice } from '../features/documentos/api/documentosApiSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    api: apiSlice.reducer,
    auth: authSlice,
    documentosApi: documentosApiSlice.reducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiSlice.middleware, documentosApiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
