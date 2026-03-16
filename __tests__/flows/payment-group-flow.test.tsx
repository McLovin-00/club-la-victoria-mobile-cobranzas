import React from "react";
import PagoGrupoScreen from "../../app/cobradora/pago-grupo";
import { render, fireEvent, waitFor, act } from "../setup/render";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    getGrupoFamiliar: jest.fn(),
    cuotasPendientes: jest.fn(),
    registrarCobroGrupal: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    getGrupoFamiliar: jest.Mock;
    cuotasPendientes: jest.Mock;
    registrarCobroGrupal: jest.Mock;
  };
};

const { getBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
};

describe("group payment flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registers a group payment and redirects back to the family detail", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { replace: jest.Mock };
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1,2" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [
        { id: 1, nombre: "Juan", apellido: "Perez" },
        { id: 2, nombre: "Ana", apellido: "Perez" },
      ],
    });
    mobileApi.cuotasPendientes
      .mockResolvedValueOnce([{ id: 11, periodo: "2026-01", monto: 10000 }])
      .mockResolvedValueOnce([{ id: 12, periodo: "2026-02", monto: 15000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          cobros: [
            { socioId: 1, cuotaIds: [11], conceptos: undefined },
            { socioId: 2, cuotaIds: [12], conceptos: undefined },
          ],
          pagos: [{ metodoPagoId: 1, monto: 25000 }],
          cobradorId: 9,
          installationId: "device-123",
          total: 25000,
        }),
      );
    });

    await findByText("¡Cobro grupal registrado!");

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/cobradora/grupo-familiar/10");
  });
});
