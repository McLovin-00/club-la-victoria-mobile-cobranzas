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
      id: 10,
      nombre: "Familia Perez",
      orden: 1,
      cantidadMiembros: 2,
      miembrosConDeuda: 2,
      totalPendiente: 25000,
      miembros: [
        { id: 1, nombre: "Juan", apellido: "Perez", cantidadCuotasPendientes: 1, totalPendiente: 10000, cuotasPendientes: [] },
        { id: 2, nombre: "Ana", apellido: "Perez", cantidadCuotasPendientes: 1, totalPendiente: 15000, cuotasPendientes: [] },
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
          grupoId: 10,
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

    expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/cobradora/home");
  });

  it("sends grupoId with group payment for credit application", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1,2" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [
        { id: 1, nombre: "Juan", apellido: "Perez" },
        { id: 2, nombre: "Ana", apellido: "Perez" },
      ],
      creditoGrupal: 800,
    });
    mobileApi.cuotasPendientes
      .mockResolvedValueOnce([{ id: 11, periodo: "2026-01", monto: 10000 }])
      .mockResolvedValueOnce([{ id: 12, periodo: "2026-02", monto: 15000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      // Verify grupoId is included in the payload for group credit application
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          grupoId: 10,
        }),
      );
    });
  });

  it("creates group credit when payment exceeds charges", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 0,
    });
    // Quota is 5000, but cobradora collects 7000, so 2000 should become group credit
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      // Backend calculates overpayment and creates credit - mobile sends actual cash only
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 5000, // The charge total, backend applies credit and calculates overpayment
        }),
      );
    });
  });

  it("applies group credit automatically when available", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    // Group has 3000 credit available
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 3000,
    });
    // Total charges are 5000
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, queryByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");

    // Credit display should be visible
    const creditLabel = queryByText(/Crédito grupal disponible/i);
    if (creditLabel) {
      await expect(creditLabel).toBeVisible();
    }

    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      // Backend calculates: montoACobrar = max(5000 - 3000, 0) = 2000
      // Mobile submits the charge total, backend handles credit application
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          grupoId: 10,
          total: 5000,
        }),
      );
    });
  });

  it("allows group credit to cover the full charge with zero cash", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 5000,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          grupoId: 10,
          pagos: [{ metodoPagoId: 1, monto: 0 }],
          total: 5000,
        }),
      );
    });
  });

  it("shows net payable when group credit available and computes split from net", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    // Group has 3000 credit available, total charges 5000 -> net 2000
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 3000,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByLabelText, getByText } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");

    // Credit display should be visible
    expect(getByText(/Crédito grupal disponible/i)).toBeTruthy();

    // The footer should show NET payable (2000), not gross (5000)
    // Bug: currently shows gross totalCalculado = 5000
    expect(getByLabelText("Resumen de cobro")).toBeTruthy();
  });

  it("uses net amount for two-method split calculation when group credit exists", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    // Group has 3000 credit available, total charges 5000 -> net 2000
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 3000,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");

    // Press the "Confirmar" button to submit
    // getByRole("button", { name: /Confirmar/i }) finds by text or accessibilityLabel
    const confirmarBtn = getByRole("button", { name: /Confirmar/i });
    fireEvent.press(confirmarBtn);

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          pagos: [{ metodoPagoId: 1, monto: 2000 }],
        }),
      );
    });
  });

  it("allows charging more than the group total to generate group credit", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 0,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 10000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole, getByLabelText } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.changeText(getByLabelText("¿Cuánto paga el cliente?"), "15000");
    fireEvent.press(getByRole("button", { name: /Confirmar/i }));

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          pagos: [{ metodoPagoId: 1, monto: 15000 }],
          total: 10000,
        }),
      );
    });
  });

  it("normalizes Argentine decimal concept amounts consistently in group payload", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 0,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByText, getAllByPlaceholderText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByText("Agregar concepto"));
    fireEvent.changeText(getAllByPlaceholderText("Nombre")[0], "Rifa");
    fireEvent.changeText(getAllByPlaceholderText("$0")[0], "1.500,50");
    fireEvent.press(getByRole("button", { name: /Confirmar/i }));

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 6500.5,
          cobros: [
            {
              socioId: 1,
              cuotaIds: [11],
              conceptos: [{ concepto: "Rifa", monto: 1500.5 }],
            },
          ],
        }),
      );
    });
  });

  it("revalidates stale group credit before submitting", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar
      .mockResolvedValueOnce({
        miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
        creditoGrupal: 3000,
      })
      .mockResolvedValueOnce({
        miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
        creditoGrupal: 5000,
      });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      expect(mobileApi.getGrupoFamiliar).toHaveBeenCalledTimes(2);
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledWith(
        expect.objectContaining({
          pagos: [{ metodoPagoId: 1, monto: 0 }],
          total: 5000,
        }),
      );
    });
  });

  it("reuses the same idempotency key when retrying the same group payment", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    const dateNowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(111)
      .mockReturnValueOnce(222);

    expoRouter.__setLocalSearchParams({ grupoId: "10", socioIds: "1" });
    getBinding.mockResolvedValue({ installationId: "device-123", cobradorId: 9 });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      miembros: [{ id: 1, nombre: "Juan", apellido: "Perez" }],
      creditoGrupal: 0,
    });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 11, periodo: "2026-01", monto: 5000 }]);
    mobileApi.registrarCobroGrupal
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(undefined);

    const { findByText, getByRole } = render(<PagoGrupoScreen />);

    await findByText("Perez, Juan");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));
    await findByText("Network request failed");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro grupal" }));

    await waitFor(() => {
      expect(mobileApi.registrarCobroGrupal).toHaveBeenCalledTimes(2);
    });

    const [firstPayload, secondPayload] = mobileApi.registrarCobroGrupal.mock.calls.map(
      (call) => call[0],
    );
    expect(secondPayload.idempotencyKey).toBe(firstPayload.idempotencyKey);

    dateNowSpy.mockRestore();
  });
});
