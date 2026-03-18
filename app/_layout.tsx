import '../global.css';
import * as React from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useColorScheme } from 'nativewind';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/ui/toast';
import { UpdateBanner } from '../components/updates';

export default function RootLayout() {
  const systemColorScheme = useSystemColorScheme();
  const { setColorScheme } = useColorScheme();

  React.useEffect(() => {
    setColorScheme(systemColorScheme === 'dark' ? 'dark' : 'light');
  }, [setColorScheme, systemColorScheme]);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style={systemColorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="cobradora/seleccionar-cobrador" />
          <Stack.Screen name="cobradora/home" />
          <Stack.Screen name="cobradora/pago" />
          <Stack.Screen name="cobradora/mis-cobranzas" />
          <Stack.Screen name="cobradora/configuracion" />
          <Stack.Screen name="cobradora/grupos-familiares" />
          <Stack.Screen name="cobradora/grupo-familiar/[id]" />
          <Stack.Screen name="cobradora/pago-grupo" />
        </Stack>
        <UpdateBanner />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
