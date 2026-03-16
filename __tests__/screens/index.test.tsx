import React from "react";
import IndexScreen from "../../app/index";
import { render, fireEvent, waitFor } from "../setup/render";

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
}));

const { getBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
};

describe("IndexScreen", () => {
  it("shows the setup state when there is no binding", async () => {
    getBinding.mockResolvedValue(null);
    const { getByRole, findByText } = render(<IndexScreen />);

    await findByText("Bienvenido");

    expect(getByRole("button", { name: "Cobranzas" })).toBeDisabled();
    expect(getByRole("button", { name: "Configuracion del cobrador" })).toBeEnabled();
  });

  it("navigates to home when the device is already bound", async () => {
    getBinding.mockResolvedValue({
      installationId: "device-1",
      cobradorId: 7,
      cobradorNombre: "Ana Perez",
    });

    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { push: jest.Mock };
    };

    const { getByRole, findByText } = render(<IndexScreen />);
    await findByText("Bienvenido");

    fireEvent.press(getByRole("button", { name: "Cobranzas" }));

    await waitFor(() => {
      expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/home");
    });
  });
});
