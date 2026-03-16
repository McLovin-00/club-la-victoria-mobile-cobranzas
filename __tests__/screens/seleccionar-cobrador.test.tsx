import React from "react";
import SeleccionarCobradorScreen from "../../app/cobradora/seleccionar-cobrador";
import { render, fireEvent, waitFor } from "../setup/render";
import { createCobrador } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    getCobradoresActivos: jest.fn(),
    vincularDispositivo: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getOrCreateInstallationId: jest.fn(),
  setBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    getCobradoresActivos: jest.Mock;
    vincularDispositivo: jest.Mock;
  };
};

const storage = jest.requireMock("../../lib/storage") as {
  getOrCreateInstallationId: jest.Mock;
  setBinding: jest.Mock;
};

describe("SeleccionarCobradorScreen", () => {
  it("binds the device and redirects to home after selecting a cobrador", async () => {
    mobileApi.getCobradoresActivos.mockResolvedValue([createCobrador()]);
    mobileApi.vincularDispositivo.mockResolvedValue(undefined);
    storage.getOrCreateInstallationId.mockResolvedValue("device-123");
    storage.setBinding.mockResolvedValue(undefined);

    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { replace: jest.Mock };
    };

    const { findByRole } = render(<SeleccionarCobradorScreen />);
    const option = await findByRole("button", {
      name: /Ana Perez\. Activo\. Toca para vincular esta cuenta/i,
    });

    fireEvent.press(option);

    await waitFor(() => {
      expect(mobileApi.vincularDispositivo).toHaveBeenCalledWith({
        installationId: "device-123",
        cobradorId: 1,
      });
      expect(storage.setBinding).toHaveBeenCalledWith({
        installationId: "device-123",
        cobradorId: 1,
        cobradorNombre: "Ana Perez",
      });
      expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/cobradora/home");
    });
  });
});
