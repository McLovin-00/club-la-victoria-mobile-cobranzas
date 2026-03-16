import React from "react";
import ConfiguracionCobradorScreen from "../../app/cobradora/configuracion";
import { render, fireEvent, waitFor } from "../setup/render";
import { createBinding, createCobrador } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    getCobradoresActivos: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
  setBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    getCobradoresActivos: jest.Mock;
  };
};

const storage = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
  setBinding: jest.Mock;
};

describe("ConfiguracionCobradorScreen", () => {
  it("updates the current binding and returns to the landing screen", async () => {
    storage.getBinding.mockResolvedValue(createBinding());
    storage.setBinding.mockResolvedValue(undefined);
    mobileApi.getCobradoresActivos.mockResolvedValue([
      createCobrador(),
      createCobrador({ id: 2, nombre: "Luis Diaz" }),
    ]);

    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { replace: jest.Mock };
    };

    const { findByRole } = render(<ConfiguracionCobradorScreen />);
    const option = await findByRole("button", {
      name: /Luis Diaz\..*Toca para seleccionar/i,
    });

    fireEvent.press(option);

    await waitFor(() => {
      expect(storage.setBinding).toHaveBeenCalledWith({
        installationId: "device-123",
        cobradorId: 2,
        cobradorNombre: "Luis Diaz",
      });
      expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/");
    });
  });
});
