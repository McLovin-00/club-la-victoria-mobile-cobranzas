import React from "react";
import PagoCobradoraScreen from "../../app/cobradora/pago";
import { render, fireEvent, waitFor } from "../setup/render";
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
    jest.setSystemTime(new Date(2026, 11, 15));
    const previous = "2026-11";
    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "7000" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: previous, monto: 4000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValue({ id: 42, creditoIndividual: 7000 });
    mobileApi.registrarCobroPeriodosMobile.mockResolvedValue({ id: 1 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole, getByText, queryByLabelText, getAllByRole } = render(<PagoCobradoraScreen />);
    expect((await findByRole("checkbox", { name: /Noviembre 2026.*4\.000/ })).props.accessibilityState.checked).toBe(true);
    expect(getAllByRole("checkbox")).toHaveLength(1);
    expect(queryByLabelText("Cantidad de meses")).toBeNull();
    fireEvent.press(getByRole("button", { name: "Adelantar cuotas" }));
    expect(getByText("2026")).toBeTruthy();
    expect(getAllByRole("checkbox")).toHaveLength(13);
    expect(queryByLabelText("Cantidad de meses")).toBeNull();
    const pendiente = getByRole("checkbox", { name: "Noviembre 2026, pendiente" });
    expect(pendiente.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(pendiente);
    fireEvent.press(getByRole("checkbox", { name: "Diciembre 2026" }));
    fireEvent.press(getByRole("button", { name: "Año siguiente" }));
    expect(getByText("2027")).toBeTruthy();
    fireEvent.press(getByRole("checkbox", { name: "Enero 2027" }));
    fireEvent.press(getByRole("button", { name: "Año anterior" }));
    expect(getByRole("checkbox", { name: "Diciembre 2026" }).props.accessibilityState.checked).toBe(true);
    fireEvent.press(getByRole("button", { name: "Ocultar meses" }));
    expect(getAllByRole("checkbox")).toHaveLength(1);
    expect(getByText("2 meses: Diciembre 2026 a Enero 2027")).toBeTruthy();
    expect(mobileApi.registrarCobroPeriodosMobile).not.toHaveBeenCalled();
    fireEvent.press(getByRole("button", { name: "Cobrar $17.000" }));

    await waitFor(() => expect(mobileApi.registrarCobroPeriodosMobile).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ periodos: [previous, "2026-12", "2027-01"], totalCuotasEsperado: 24000, creditoEsperado: 7000, total: 17000 }),
    ));
    expect(mobileApi.generarCuotaMobile).not.toHaveBeenCalled();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
  }, 15_000);

  it("asks for a new confirmation when credit changes before collecting new periods", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    jest.setSystemTime(new Date(2026, 10, 15));
    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "7000" });
    mobileApi.cuotasPendientes.mockResolvedValue([]);
    mobileApi.obtenerSocioMobile
      .mockResolvedValueOnce({ id: 42, creditoIndividual: 7000 })
      .mockResolvedValueOnce({ id: 42, creditoIndividual: 5000 });
    const { findByRole, getByRole, findByText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("button", { name: "Adelantar cuotas" }));
    fireEvent.press(getByRole("checkbox", { name: "Noviembre 2026" }));
    fireEvent.press(getByRole("button", { name: "Cobrar $3.000" }));
    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarCobroPeriodosMobile).not.toHaveBeenCalled();
    expect(getByRole("button", { name: "Cobrar $5.000" })).toBeTruthy();
  });

  it.each(["cuota", "extra"])("asks for a new confirmation when credit changes for a %s", async (tipo) => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue(
      tipo === "cuota" ? [{ id: 5, periodo: "2025-01", monto: 10000 }] : [],
    );
    mobileApi.obtenerSocioMobile
      .mockResolvedValueOnce({ id: 42, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 42, creditoIndividual: 3000 });
    mobileApi.registrarOperacionCobro.mockResolvedValue({ id: 1 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole, findByText, getByLabelText, getByPlaceholderText } = render(<PagoCobradoraScreen />);
    if (tipo === "extra") {
      fireEvent.press(await findByRole("button", { name: "¿Cobrar algo más?" }));
      fireEvent.changeText(getByLabelText("¿Qué estás cobrando?"), "Inscripción");
      fireEvent.changeText(getByPlaceholderText("0"), "10000");
    }
    fireEvent.press(await findByRole("button", { name: "Cobrar $8.000" }));

    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
    expect(mobileApi.registrarCobroPeriodosMobile).not.toHaveBeenCalled();
    fireEvent.press(getByRole("button", { name: "Cobrar $7.000" }));

    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledTimes(1));
    expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(expect.objectContaining({
      cuotaIds: tipo === "cuota" ? [5] : [],
      conceptos: tipo === "extra" ? [{ concepto: "Inscripción", monto: 10000 }] : [],
      pagos: [{ metodoPagoId: 1, monto: 7000 }],
      montoNetoEsperado: 7000,
      total: 7000,
    }));
    expect(await findByText("¡Cobro registrado!")).toBeTruthy();
  });

  it("ODD S4 refresca tras un 409 sin enviar un segundo POST", async () => {
    jest.requireMock("expo-router").__setLocalSearchParams({ socioId: "94" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 12, periodo: "2025-01", monto: 10000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValueOnce({ id: 94, creditoIndividual: 2000 })
      .mockResolvedValueOnce({ id: 94, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 94, creditoIndividual: 1000 });
    const message = "El importe del cobro cambió. Revisá el total actualizado y confirmá nuevamente.";
    mobileApi.registrarOperacionCobro.mockRejectedValueOnce(new Error(JSON.stringify({ statusCode: 409, message })))
      .mockResolvedValue({ id: 18 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    const { findByRole, findByText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("button", { name: "Cobrar $8.000" }));
    expect(await findByText(new RegExp(message))).toBeTruthy();
    expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledTimes(1);
    fireEvent.press(await findByRole("button", { name: "Cobrar $9.000" }));
    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenLastCalledWith(
      expect.objectContaining({ montoNetoEsperado: 9000, total: 9000 }),
    ));
  });

  it("ODD S1/S4 conserva el importe recibido al pedir otra confirmación", async () => {
    jest.requireMock("expo-router").__setLocalSearchParams({ socioId: "95" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 13, periodo: "2025-01", monto: 10000 }]);
    mobileApi.obtenerSocioMobile.mockResolvedValueOnce({ id: 95, creditoIndividual: 2000 })
      .mockResolvedValue({ id: 95, creditoIndividual: 3000 });
    mobileApi.registrarOperacionCobro.mockResolvedValue({ id: 19 });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    const { findByRole, findByText, getByRole, getByLabelText } = render(<PagoCobradoraScreen />);
    await findByRole("button", { name: "Cobrar $8.000" });
    fireEvent.press(getByRole("button", { name: "Dejar saldo a favor" }));
    fireEvent.changeText(getByLabelText("Importe que entrega el socio"), "12000");
    fireEvent.press(getByRole("button", { name: "Cobrar $12.000" }));
    expect(await findByText(/El saldo a favor cambió/)).toBeTruthy();
    expect(mobileApi.registrarOperacionCobro).not.toHaveBeenCalled();
    expect(getByLabelText("Importe que entrega el socio").props.value).toBe("12000");
    fireEvent.press(getByRole("button", { name: "Cobrar $12.000" }));
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

    const { findByText, findByRole, getByRole } = render(<PagoCobradoraScreen />);

    await findByRole("checkbox", { name: /Enero 2025, \$15\.000/i });
    fireEvent.press(getByRole("button", { name: "Cobrar $15.000" }));

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
    expect(getByRole("button", { name: "Listo" })).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Listo" }));

    expect(expoRouter.__mockRouter.replace).toHaveBeenCalledWith("/cobradora/home");
  });

  it("does not offer paid periods for selection", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };
    jest.setSystemTime(new Date(2026, 10, 15));
    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([]);
    mobileApi.obtenerPeriodosCobroMobile.mockResolvedValue({ montoMensual: 10000, periodosPagados: ["2026-11", "2027-01"] });
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));
    mobileApi.registrarCobroPeriodosMobile.mockResolvedValue({ id: 1 });
    const { findByRole, getByRole, getByText } = render(<PagoCobradoraScreen />);
    fireEvent.press(await findByRole("button", { name: "Adelantar cuotas" }));
    expect(getByText("Está al día")).toBeTruthy();
    const pagado = getByRole("checkbox", { name: "Noviembre 2026, pagado" });
    expect(pagado.props.accessibilityState).toEqual(expect.objectContaining({ checked: false, disabled: true }));
    fireEvent.press(pagado);
    fireEvent.press(getByRole("checkbox", { name: "Mayo 2026" }));
    fireEvent.press(getByRole("checkbox", { name: "Diciembre 2026" }));
    fireEvent.press(getByRole("checkbox", { name: "Mayo 2026" }));
    fireEvent.press(getByRole("button", { name: "Año siguiente" }));
    const enero = getByRole("checkbox", { name: "Enero 2027, pagado" });
    expect(enero.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(enero);
    fireEvent.press(getByRole("checkbox", { name: "Marzo 2027" }));
    expect(getByText("2 meses: Diciembre 2026, Marzo 2027")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Cobrar $20.000" }));
    await waitFor(() => expect(mobileApi.registrarCobroPeriodosMobile).toHaveBeenCalledWith(
      42, expect.objectContaining({ periodos: ["2026-12", "2027-03"], totalCuotasEsperado: 20000, total: 20000 }),
    ));
    expect(mobileApi.registrarCobroPeriodosMobile).toHaveBeenCalledTimes(1);
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

  it("lets the collector clear the saldo a favor amount without snapping back to the exact total", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole, getByLabelText, queryByText } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$10\.000/i });
    fireEvent.press(getByRole("button", { name: "Dejar saldo a favor" }));

    const input = () => getByLabelText("Importe que entrega el socio");
    expect(input().props.value).toBe("");

    fireEvent.changeText(input(), "10000");
    expect(input().props.value).toBe("10000");

    fireEvent.changeText(input(), "");
    expect(input().props.value).toBe("");
    expect(queryByText(/Nuevo saldo a favor por este cobro/)).toBeNull();
  });

  it("allows charging more than the selected quota to generate credit", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole, getByLabelText, queryByLabelText, getByText } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$10\.000/i });
    expect(queryByLabelText("Importe que entrega el socio")).toBeNull();
    fireEvent.press(getByRole("button", { name: "Dejar saldo a favor" }));
    fireEvent.changeText(getByLabelText("Importe que entrega el socio"), "15000");
    expect(getByText("Nuevo saldo a favor por este cobro: $5.000")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Cobrar $15.000" }));

    await waitFor(() => {
      expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
        expect.objectContaining({
          socioId: 42,
          pagos: [{ metodoPagoId: 1, monto: 15000 }],
          total: 15000,
        }),
      );
    });
    expect(mobileApi.registrarCobroPeriodosMobile).not.toHaveBeenCalled();
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
    mobileApi.cuotasPendientes.mockResolvedValue([
      { id: 5, periodo: "2025-01", monto: 15000 },
      { id: 6, periodo: "2025-02", monto: 9000 },
    ]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { findByRole, getByRole, getByLabelText, getByText } = render(<PagoCobradoraScreen />);
    const enero = await findByRole("checkbox", { name: /Enero 2025, \$15\.000/i });
    expect(enero.props.accessibilityState.checked).toBe(false);
    fireEvent.press(enero);
    expect(getByText("Saldo a favor: $5.000")).toBeTruthy();
    expect(getByLabelText("Total a cobrar: $10.000")).toBeTruthy();
    fireEvent.press(getByRole("radio", { name: "Combinar efectivo y transferencia" }));
    fireEvent.changeText(getByLabelText("¿Cuánto en efectivo?"), "4000");
    expect(getByLabelText(/Monto en transferencia: \$6\.000/)).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Cobrar $10.000" }));
    await waitFor(() => expect(mobileApi.registrarOperacionCobro).toHaveBeenCalledWith(
      expect.objectContaining({
        cuotaIds: [5], pagos: [{ metodoPagoId: 1, monto: 4000 }, { metodoPagoId: 2, monto: 6000 }],
        total: 10000,
      }),
    ));
  });

  it("allows confirming a selected quota fully covered by credit with zero cash payment", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ socioId: "42", creditoDisponible: "20000" });
    mobileApi.cuotasPendientes.mockResolvedValue([{ id: 5, periodo: "2025-01", monto: 10000 }]);
    mobileApi.registrarOperacionCobro.mockResolvedValue(undefined);
    getBinding.mockResolvedValue(createBinding({ cobradorId: 9 }));

    const { getByRole, findByRole, getByLabelText } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$10\.000/i });
    expect(getByLabelText("Total a cobrar: $0")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Registrar con saldo a favor" }));

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

    const { getByRole, findByRole } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$15\.000/i });
    fireEvent.press(getByRole("button", { name: "Cobrar $10.000" }));

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

    const { findByRole, getByRole } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$15\.000/i });
    fireEvent.press(getByRole("button", { name: "Cobrar $15.000" }));

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

    const { getByRole, findByRole } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$15\.000/i });
    fireEvent.press(getByRole("button", { name: "Cobrar $7.000" }));

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

    const { getByRole, findByRole, findByText } = render(<PagoCobradoraScreen />);
    await findByRole("checkbox", { name: /Enero 2025, \$10\.000/i });
    fireEvent.press(getByRole("button", { name: "Cobrar $10.000" }));
    await findByText("Network request failed");
    fireEvent.press(getByRole("button", { name: "Cobrar $10.000" }));

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
