import React from "react";
import IndexScreen from "../../app/index";
import { render, fireEvent, waitFor } from "../setup/render";

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
  getOrCreateInstallationId: jest.fn(),
  setBinding: jest.fn(),
}));

jest.mock("../../lib/api", () => ({
  mobileApi: { getCobradoresActivos: jest.fn(), vincularDispositivo: jest.fn() },
}));

const { getBinding, getOrCreateInstallationId, setBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
  getOrCreateInstallationId: jest.Mock;
  setBinding: jest.Mock;
};
const { mobileApi } = jest.requireMock("../../lib/api");

describe("IndexScreen", () => {
  it("prepara automáticamente la app con la única cobradora activa", async () => {
    getBinding.mockResolvedValue(null);
    getOrCreateInstallationId.mockResolvedValue("device-1");
    mobileApi.getCobradoresActivos.mockResolvedValue([{ id: 7, nombre: "Ana Perez", activo: true }]);
    mobileApi.vincularDispositivo.mockResolvedValue(undefined);
    const { getByRole, findByText, queryByRole } = render(<IndexScreen />);

    await findByText("Ana Perez");
    expect(mobileApi.vincularDispositivo).toHaveBeenCalledWith({ installationId: "device-1", cobradorId: 7 });
    expect(setBinding).toHaveBeenCalledWith({ installationId: "device-1", cobradorId: 7, cobradorNombre: "Ana Perez" });
    expect(getByRole("button", { name: "Cobranzas" })).toBeEnabled();
    expect(getByRole("button", { name: "Mis Cobranzas" })).toBeEnabled();
    expect(queryByRole("button", { name: /configuración del cobrador|cambiar cobrador/i })).toBeNull();
  });

  it.each([
    { activos: [], mensaje: "No hay una cobradora activa. Consultá con el club." },
    {
      activos: [{ id: 7, nombre: "Ana Perez", activo: true }, { id: 8, nombre: "Otra", activo: true }],
      mensaje: "Hay más de una cobradora activa. Consultá con el club.",
    },
  ])("no atribuye cobros cuando no hay exactamente una cuenta activa", async ({ activos, mensaje }) => {
    getBinding.mockResolvedValue(null);
    mobileApi.getCobradoresActivos.mockResolvedValue(activos);
    const { findByText, queryByRole } = render(<IndexScreen />);
    await findByText(mensaje);
    expect(mobileApi.vincularDispositivo).not.toHaveBeenCalled();
    expect(setBinding).not.toHaveBeenCalled();
    expect(queryByRole("button", { name: "Cobranzas" })).toBeNull();
  });

  it("conserva la vinculación existente al actualizar y permite entrar a cobranzas", async () => {
    getBinding.mockResolvedValue({
      installationId: "device-1",
      cobradorId: 7,
      cobradorNombre: "Ana Perez",
    });

    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { push: jest.Mock };
    };

    const { getByRole, findByText, queryByRole } = render(<IndexScreen />);
    await findByText("Ana Perez");

    fireEvent.press(getByRole("button", { name: "Cobranzas" }));

    await waitFor(() => {
      expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/home");
    });

    expect(mobileApi.getCobradoresActivos).not.toHaveBeenCalled();
    expect(mobileApi.vincularDispositivo).not.toHaveBeenCalled();
    expect(setBinding).not.toHaveBeenCalled();
    expect(queryByRole("button", { name: /configuración del cobrador|cambiar cobrador/i })).toBeNull();
  });
});
