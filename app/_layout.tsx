import '../global.css';
import * as React from 'react';
import { Platform } from 'react-native';
import { useColorScheme } from 'nativewind';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/ui/toast';

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  React.useEffect(() => {
    setColorScheme('light');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      document.documentElement.lang = 'es-AR';
    }
  }, [setColorScheme]);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="cobradora/home" />
          <Stack.Screen name="cobradora/pago" />
          <Stack.Screen name="cobradora/mis-cobranzas" />
          <Stack.Screen name="cobradora/grupos-familiares" />
          <Stack.Screen name="cobradora/grupo-familiar/[id]" />
          <Stack.Screen name="cobradora/pago-grupo" />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
