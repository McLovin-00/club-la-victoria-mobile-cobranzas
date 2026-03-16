import React from "react";
import PagoCobradoraScreen from "../../app/cobradora/pago";
import { render, fireEvent, waitFor, act } from "../setup/render";
import { createBinding } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    cuotasPendientes: jest.fn(),
    registrarOperacionCobro: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    cuotasPendientes: jest.Mock;
    registrarOperacionCobro: jest.Mock;
  };
};

const { getBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
};

describe("payment flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registers a payment and redirects after success", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { replace: jest.Mock };
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 15000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, findByText, getByRole } = render(<PagoCobradoraScreen />);

    await findByText("Cuotas");
    fireEvent.press(await findByRole("checkbox", { name: /2025-01, \$15\.000/i }));
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          cuotaIds: [5],
          metodoPagoId: 1,
          cobradorId: 9,
          installationId: "device-123",
          total: 15000,
        }),
      );
    });

    await findByText("¡Cobro registrado!");

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/cobradora/home");
  });
});
