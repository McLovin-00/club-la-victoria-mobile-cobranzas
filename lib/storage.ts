import AsyncStorage from "@react-native-async-storage/async-storage";

const INSTALLATION_KEY = "mobile-cobranzas-installation-id";
const BINDING_KEY = "mobile-cobranzas-binding";

export interface StoredBinding {
  installationId: string;
  cobradorId: number;
  cobradorNombre?: string;
}

export async function getOrCreateInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, generated);
  return generated;
}

export async function getBinding(): Promise<StoredBinding | null> {
  const raw = await AsyncStorage.getItem(BINDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredBinding;
  } catch {
    return null;
  }
}

export async function setBinding(binding: StoredBinding): Promise<void> {
  await AsyncStorage.setItem(BINDING_KEY, JSON.stringify(binding));
}
