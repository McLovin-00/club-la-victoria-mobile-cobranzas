import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getBinding,
  getOrCreateInstallationId,
  setBinding,
} from "../../lib/storage";

describe("storage", () => {
  it("returns an existing installation id without creating a new one", async () => {
    await AsyncStorage.setItem("mobile-cobranzas-installation-id", "device-existing");

    await expect(getOrCreateInstallationId()).resolves.toBe("device-existing");
  });

  it("creates and persists a new installation id when missing", async () => {
    const installationId = await getOrCreateInstallationId();

    expect(installationId).toMatch(/^device-/);
    await expect(AsyncStorage.getItem("mobile-cobranzas-installation-id")).resolves.toBe(
      installationId,
    );
  });

  it("stores and returns the selected binding", async () => {
    await setBinding({
      installationId: "device-1",
      cobradorId: 25,
      cobradorNombre: "Lucia Gomez",
    });

    await expect(getBinding()).resolves.toEqual({
      installationId: "device-1",
      cobradorId: 25,
      cobradorNombre: "Lucia Gomez",
    });
  });

  it("returns null when binding payload is invalid JSON", async () => {
    const mockStorage = (AsyncStorage as typeof AsyncStorage & {
      __storage: Map<string, string>;
    }).__storage;

    mockStorage.set("mobile-cobranzas-binding", "{invalid-json");

    await expect(getBinding()).resolves.toBeNull();
  });
});
