import AsyncStorage from "@react-native-async-storage/async-storage";

const INSTALLATION_KEY = "mobile-cobranzas-installation-id";
const BINDING_KEY = "mobile-cobranzas-binding";

export interface StoredBinding {
  installationId: string;
  cobradorId: number;
  cobradorNombre?: string;
}

type StoredBindingPayload = Partial<StoredBinding>;

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
    const parsed = JSON.parse(raw) as StoredBindingPayload;
    if (typeof parsed.cobradorId !== "number") {
      return null;
    }

    const installationId =
      typeof parsed.installationId === "string" && parsed.installationId.trim().length > 0
        ? parsed.installationId
        : await getOrCreateInstallationId();
    const repaired: StoredBinding = {
      installationId,
      cobradorId: parsed.cobradorId,
      cobradorNombre: parsed.cobradorNombre,
    };

    if (repaired.installationId !== parsed.installationId) {
      await setBinding(repaired);
    }

    return repaired;
  } catch {
    return null;
  }
}

export async function setBinding(binding: StoredBinding): Promise<void> {
  await AsyncStorage.setItem(BINDING_KEY, JSON.stringify(binding));
}

const EDIT_OPERACION_KEY = "mobile-cobranzas-edit-operacion";

export async function setEditOperacion(operacion: unknown): Promise<void> {
  await AsyncStorage.setItem(EDIT_OPERACION_KEY, JSON.stringify(operacion));
}

export async function getEditOperacion<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(EDIT_OPERACION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearEditOperacion(): Promise<void> {
  await AsyncStorage.removeItem(EDIT_OPERACION_KEY);
}
