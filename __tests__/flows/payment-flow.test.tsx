import React from "react";
import PagoCobradoraScreen from "../../app/cobradora/pago";
import { render, fireEvent, waitFor, act } from "../setup/render";
import { createBinding } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    cuotasPendientes: jest.fn(),
    generarCuotaMobile: jest.fn(),
    obtenerPeriodosCobroMobile: jest.fn(),
    registrarCobroPeriodosMobile: jest.fn(),
    obtenerSocioMobile: jest.fn(),
    vincularDispositivo: jest.fn(),
    registrarOperacionCobro: jest.fn(),
    actualizarOperacionCobro: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
  getEditOperacion: jest.fn(),
  clearEditOperacion: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    cuotasPendientes: jest.Mock;
    generarCuotaMobile: jest.Mock;
    obtenerPeriodosCobroMobile: jest.Mock;
    registrarCobroPeriodosMobile: jest.Mock;
    obtenerSocioMobile: jest.Mock;
    vincularDispositivo: jest.Mock;
    registrarOperacionCobro: jest.Mock;
    actualizarOperacionCobro: jest.Mock;
  };
};

const { getBinding, getEditOperacion, clearEditOperacion } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
  getEditOperacion: jest.Mock;
  clearEditOperacion: jest.Mock;
};

describe("payment flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mobileApi.obtenerPeriodosCobroMobile.mockResolvedValue({ montoMensual: 10000, periodosPagados: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
    mobileApi.obtenerSocioMobile.mockReset();
    mobileApi.generarCuotaMobile.mockReset();
    mobileApi.registrarOperacionCobro.mockReset();
    mobileApi.obtenerPeriodosCobroMobile.mockReset();
    mobileApi.registrarCobroPeriodosMobile.mockReset();
  });

  it("allows selecting existing and new periods in one mobile collection", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    const now = new Date();
    const first = `${now.getFullYear()}-01`;
    const second = `${now.getFullYear()}-02`;
    const previous = `${now.getFullYear() - 1}-01`;
    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "7000" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: previous, monto: 4000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValue({ id: 42, creditoIndividual: 7000 });
    mobileApi.registrarCobroPeriodosMobile.mockResolvedValue({ id: 1 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("checkbox", { name: new RegExp(`${previous}.*4\\.000`) }));
    fireEvent.press(await findByRole("checkbox", { name: new RegExp(`${first}.*10\\.000`) }));
    fireEvent.press(await findByRole("checkbox", { name: new RegExp(`${second}.*10\\.000`) }));
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => expect(mobileApi.registrarCobroPeriodosMobile).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ periodos: [previous, first, second], totalCuotasEsperado: 24000, creditoEsperado: 7000, total: 17000 }),
    ));
    expect(mobileApi.generarCuotaMobile).not.toHaveBeenCalled();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
  }, 15_000);

  it("asks for a new confirmation when credit changes before collecting new periods", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    const year = new Date().getFullYear();
    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "7000" });
    mobileApi.cuotasPendientes.mockResolvedValue([]);
    mobileApi.obtenerSocioMobile
      .mockResolvedValueOnce({ id: 42, creditoIndividual: 7000 })
      .mockResolvedValueOnce({ id: 42, creditoIndividual: 5000 });
    const { findByRole, getByRole, findByText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("checkbox", { name: new RegExp(`${year}-01.*10\\.000`) }));
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarCobroPeriodosMobile).not.toHaveBeenCalled();
    expect(getByRole("button", { name: "Confirmar cobro" })).toBeTruthy();
  });

  it.each(["cuota", "extra"])("reconfirma un cobro cuando cambia el saldo (%s)", async (tipo) => {
    jest.requireMock("expo-router").__setLocalSearchParams({ socioId: "93" });
    mobileApi.cuotasPendientes.mockResolvedValue(
      tipo === "cuota" ? [{ id: 11, periodo: "2025-01", monto: 10000 }] : [],
    );
    mobileApi.obtenerSocioMobile.mockResolvedValueOnce({ id: 93, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 93, creditoIndividual: 3000 });
    mobileApi.registrarOperacionCobro.mockResolvedValue({ id: 17 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    const { findByRole, getByRole, findByText, findByLabelText, getByLabelText } = render(<PagoCobradoraScreen />);
    if (tipo === "cuota") {
      fireEvent.press(await findByRole("checkbox", { name: /2025-01, \$10\.000/ }));
    } else {
      fireEvent.press(await findByLabelText("¿Cobrar algo más?"));
      fireEvent.changeText(getByLabelText("¿Qué estás cobrando?"), "Inscripción");
      fireEvent.changeText(getByLabelText("¿Cuánto?"), "10000");
    }
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
      expect.objectContaining({ montoNetoEsperado: 7000, total: 7000 }),
    ));
  });

  it("actualiza el neto después de un conflicto sin reenviar el cobro", async () => {
    jest.requireMock("expo-router").__setLocalSearchParams({ socioId: "94" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 12, periodo: "2025-01", monto: 10000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValueOnce({ id: 94, creditoIndividual: 2000 })
      .mockResolvedValueOnce({ id: 94, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 94, creditoIndividual: 1000 });
    const message = "El importe del cobro cambió. Revisá el total actualizado y confirmá nuevamente.";
    mobileApi.registrarOperacionCobro.mockRejectedValueOnce(new Error(JSON.stringify({ statusCode: 409, message })))
      .mockResolvedValue({ id: 18 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    const { findByRole, findByText, getByRole, getByLabelText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("checkbox", { name: /2025-01, \$10\.000/ }));
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    expect(await findByText(message)).toBeTruthy();
    expect(getByLabelText("¿Cuánto paga el cliente?").props.value).toBe("9000");
    expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledTimes(1);
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenLastCalledWith(
      expect.objectContaining({ montoNetoEsperado: 9000, total: 9000 }),
    ));
  });

  it("conserva el importe recibido al pedir otra confirmación", async () => {
    jest.requireMock("expo-router").__setLocalSearchParams({ socioId: "95" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 13, periodo: "2025-01", monto: 10000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValueOnce({ id: 95, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 95, creditoIndividual: 3000 });
    mobileApi.registrarOperacionCobro.mockResolvedValue({ id: 19 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    const { findByRole, findByText, getByRole, getByLabelText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("checkbox", { name: /2025-01, \$10\.000/ }));
    fireEvent.changeText(getByLabelText("¿Cuánto paga el cliente?"), "12000");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
    expect(getByLabelText("¿Cuánto paga el cliente?").props.value).toBe("12000");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
      expect.objectContaining({ montoNetoEsperado: 7000, total: 12000 }),
    ));
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

    const { findByText, getByRole } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      const checkbox = getByRole("checkbox", { name: /2025-01, \$15\.000/i });
      fireEvent.press(checkbox);
    });
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          cuotaIds: [5],
          pagos: [{ metodoPagoId: 1, monto: 15000 }],
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

  it("does not offer paid periods for selection", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    const now = new Date();
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([]);
    mobileApi.obtenerPeriodosCobroMobile.mockResolvedValue({ montoMensual: 10000, periodosPagados: [periodo] });
    const { findByRole, queryByRole } = render(<PagoCobradoraScreen />);
    await findByRole("button", { name: "Año siguiente" });
    expect(queryByRole("checkbox", { name: new RegExp(periodo) })).toBeNull();
  });

  it("allows editing only the payment method when the original quota is no longer pending", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", operacionId: "77" });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    getEditOperacion.mockResolvedValue({
      id: 77,
      total: 15000,
      metodoPago: { id: 1, nombre: "Efectivo" },
      lineas: [
        {
          id: 501,
          tipoLinea: "CUOTA",
          cuotaId: 5,
          cuota: { id: 5, periodo: "2026-03" },
          monto: 15000,
        },
      ],
    });
    mobileApi.cuotasPendientes.mockResolvedValue([]);
    mobileApi.vincularDispositivo.mockResolvedValue(undefined);
    mobileApi.actualizarOperacionCobro.mockResolvedValue(undefined);
    clearEditOperacion.mockResolvedValue(undefined);

    const { findByText, getByRole } = render(<PagoCobradoraScreen />);

    await findByText("Editar pago");
    fireEvent.press(getByRole("radio", { name: "Transferencia" }));
    fireEvent.press(getByRole("button", { name: "Confirmar edición" }));

    await waitFor(() => {
      expect(mobileApi.vincularDispositivo).toHaveBeenCalledWith({
        installationId: "device-123",
        cobradorId: 9,
      });
      expect(mobileApi.actualizarOperacionCobro).toHaveBeenCalledWith(
        77,
        expect.objectContaining({
          cuotaIds: [5],
          pagos: [{ metodoPagoId: 2, monto: 15000 }],
          cobradorId: 9,
          installationId: "device-123",
          total: 15000,
        }),
      );
    });
  });

  it("allows charging more than the selected quota to generate credit", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole, getByLabelText } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      const checkbox = getByRole("checkbox", { name: /2025-01, \$10\.000/i });
      fireEvent.press(checkbox);
    });

    fireEvent.changeText(getByLabelText("¿Cuánto paga el cliente?"), "15000");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          pagos: [{ metodoPagoId: 1, monto: 15000 }],
          total: 15000,
        }),
      );
    });
  });

  it("shows the member credit balance even when it is zero", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "0" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByText } = render(<PagoCobradoraScreen />);

    expect(await findByText("Saldo a favor: $0")).toBeTruthy();
  });

  it("applies individual credit and shows net payable in payment split", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "5000" });
    // Quota of 15000 with individual credit of 5000 available -> net payable 10000
    mobileApi.cuotasPendientes.mockResolvedValue([
      { id: 5, periodo: "2025-01", monto: 15000 },
    ]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole, getByLabelText, getByText } = render(<PagoCobradoraScreen />);

    // Select the quota
    await waitFor(async () => {
      const checkbox = getByRole("checkbox", { name: /2025-01, \$15\.000/i });
      fireEvent.press(checkbox);
    });

    expect(getByText("Saldo a favor: $5.000")).toBeTruthy();

    // The "Total a cobrar" shown in the footer should reflect the net payable after credit
    // Expected: 15000 (quota) - 5000 (credit) = 10000 net
    // Bug: currently shows gross 15000
    expect(getByLabelText("Total a cobrar: $10.000")).toBeTruthy();

    // The split UI should be based on the NET amount (10000), not gross (15000)
    // When cobradora enters $4000 in efectivo, transferencia should be $6000, not $11000
    // Bug: currently uses gross for split calculation
  });

  it("allows confirming a selected quota fully covered by credit with zero cash payment", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "20000" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole, getByLabelText } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      const checkbox = getByRole("checkbox", { name: /2025-01, \$10\.000/i });
      fireEvent.press(checkbox);
    });

    expect(getByLabelText("¿Cuánto paga el cliente?").props.value).toBe("0");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          cuotaIds: [5],
          pagos: [{ metodoPagoId: 1, monto: 0 }],
          cobradorId: 9,
          total: 0,
        }),
      );
    });
  });

  it("submits net payable when individual credit exists", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "5000" });
    // Quota of 15000, available credit of 5000, net is 10000
    mobileApi.cuotasPendientes.mockResolvedValue([
      { id: 5, periodo: "2025-01", monto: 15000 },
    ]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      const checkbox = getByRole("checkbox", { name: /2025-01, \$15\.000/i });
      fireEvent.press(checkbox);
    });

    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      // Submit net amount (10000), not gross (15000)
      // Bug: currently submits total: 15000 (gross)
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          total: 10000, // Net payable after credit
        }),
      );
    });
  });

  it("sends actual cash only, not including credit in payment submission", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 15000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByText, getByRole } = render(<PagoCobradoraScreen />);

    await findByText("Cuotas");
    fireEvent.press(await getByRole("checkbox", { name: /2025-01, \$15\.000/i }));
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      // Verify the total submitted is exactly the selected quota amount (actual cash)
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.not.objectContaining({
          creditoAplicado: expect.anything(),
        }),
      );
    });
  });

  it("revalidates stale individual credit before submitting", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "5000" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 15000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValue({ id: 42, creditoIndividual: 8000 });
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      fireEvent.press(getByRole("checkbox", { name: /2025-01, \$15\.000/i }));
    });

    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.obtenerSocioMobile).toHaveBeenCalledWith(42);
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          pagos: [{ metodoPagoId: 1, monto: 7000 }],
          total: 7000,
        }),
      );
    });
  });

  it("reuses the same idempotency key when retrying the same payment after a network error", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    const dateNowSpy = jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(111)
      .mockReturnValueOnce(222);

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    mobileApi.registrarOperacionCobro
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole, findByText } = render(<PagoCobradoraScreen />);

    await waitFor(async () => {
      fireEvent.press(getByRole("checkbox", { name: /2025-01, \$10\.000/i }));
    });

    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));
    await findByText("Network request failed");
    fireEvent.press(getByRole("button", { name: "Confirmar cobro" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledTimes(2);
    });

    const [firstPayload, secondPayload] = mobileApi.registrarOperacionCobro.mock.calls.map(
      (call) => call[0],
    );
    expect(secondPayload.idempotencyKey).toBe(firstPayload.idempotencyKey);

    dateNowSpy.mockRestore();
  });
});
