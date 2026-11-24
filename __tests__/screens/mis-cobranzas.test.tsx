import React from "react";
import MisCobranzasScreen from "../../app/cobradora/mis-cobranzas";
import { render, fireEvent, waitFor, act } from "../setup/render";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    misCobranzas: jest.fn(),
    rendicion: jest.fn(),
  },
}));

jest.mock("../../lib/compartir-rendicion", () => ({
  compartirRendicion: jest.fn(),
  descargarPdfRendicion: jest.fn(),
  puedeCompartirArchivoEnWeb: jest.fn(() => false),
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
  setBinding: jest.fn(),
  setEditOperacion: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    misCobranzas: jest.Mock;
    rendicion: jest.Mock;
  };
};

const { compartirRendicion } = jest.requireMock("../../lib/compartir-rendicion") as {
  compartirRendicion: jest.Mock;
};

const { getBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
};

describe("MisCobranzasScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-loads current month operations with pagination and opens the detail modal", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-24T13:00:00.000Z"));

    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 10000,
      total: 1,
      totalPeriodo: 1,
      offset: 0,
      limit: 15,
      hasMore: false,
      operaciones: [
        {
          id: 101,
          total: "10000.00" as unknown as number,
          fechaHoraServidor: "2026-11-24T13:00:00.000Z",
          socio: { id: 1, nombre: "Juan", apellido: "Perez", dni: "30111222" },
          metodoPago: { id: 1, nombre: "EFECTIVO" },
          lineas: [
            {
              id: 1,
              tipoLinea: "CUOTA",
              cuotaId: 99,
              cuota: { id: 99, periodo: "2026-11" },
              monto: "10000.00" as unknown as number,
            },
          ],
        },
      ],
    });

    try {
      const { getByRole, findByLabelText, findByRole, getByText } = render(<MisCobranzasScreen />);

      expect(getByText("Noviembre de 2026")).toBeTruthy();

      await findByLabelText("Total cobrado en el período: $10.000");
      expect(mobileApi.misCobranzas).toHaveBeenCalledWith(
        8,
        new Date("2026-11-01T00:00:00.000-03:00").toISOString(),
        new Date("2026-11-30T23:59:59.999-03:00").toISOString(),
        { q: undefined, offset: 0, limit: 15 },
      );

      fireEvent.press(await findByRole("button", { name: /operación número 101/i }));

      await waitFor(() => {
        expect(getByText("Cobro #101")).toBeTruthy();
        expect(getByText("Efectivo")).toBeTruthy();
        expect(getByText("Cuota 2026-11")).toBeTruthy();
        expect(getByRole("button", { name: "Cerrar" })).toBeTruthy();
      });
    } finally {
      jest.useRealTimers();
    }
  }, 15000);

  it("disables PDF export when there are no collections in the selected month", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-15T15:00:00.000Z"));

    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 0,
      total: 0,
      totalPeriodo: 0,
      offset: 0,
      limit: 15,
      hasMore: false,
      operaciones: [],
    });

    try {
      const { getByRole, findByText } = render(<MisCobranzasScreen />);

      await findByText("El PDF se habilita cuando hay cobranzas en el período seleccionado.");

      const pdfButton = getByRole("button", { name: "Compartir PDF" });
      expect(pdfButton.props.accessibilityState?.disabled).toBe(true);

      fireEvent.press(pdfButton);
      expect(mobileApi.rendicion).not.toHaveBeenCalled();
      expect(compartirRendicion).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("filters operations via debounced search and navigates across pages", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-24T13:00:00.000Z"));

    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 45000,
      total: 20,
      totalPeriodo: 20,
      offset: 0,
      limit: 15,
      hasMore: true,
      operaciones: Array.from({ length: 15 }, (_, i) => ({
        id: 200 + i,
        total: 3000,
        fechaHoraServidor: "2026-11-24T13:00:00.000Z",
        socio: { id: i + 1, nombre: "Camila", apellido: "Acosta" },
        metodoPago: { id: 1, nombre: "Efectivo" },
        lineas: [],
      })),
    });

    try {
      const { getByLabelText, findByRole, getByText } = render(<MisCobranzasScreen />);

      const nextButton = await findByRole("button", { name: "Página siguiente" });
      expect(getByText("Página 1 de 2")).toBeTruthy();

      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(mobileApi.misCobranzas).toHaveBeenLastCalledWith(
          8,
          expect.any(String),
          expect.any(String),
          { q: undefined, offset: 15, limit: 15 },
        );
      });

      fireEvent.changeText(getByLabelText("Buscar en mis cobranzas"), "Acosta");
      act(() => {
        jest.advanceTimersByTime(350);
      });

      await waitFor(() => {
        expect(mobileApi.misCobranzas).toHaveBeenLastCalledWith(
          8,
          expect.any(String),
          expect.any(String),
          { q: "Acosta", offset: 0, limit: 15 },
        );
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("reloads operations when changing month and exports the PDF when collections exist", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-15T15:00:00.000Z"));
    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 5000,
      total: 1,
      totalPeriodo: 1,
      offset: 0,
      limit: 15,
      hasMore: false,
      operaciones: [
        {
          id: 77,
          total: 5000,
          fechaHoraServidor: "2026-01-10T15:00:00.000Z",
          socio: { id: 1, nombre: "Ana", apellido: "Gomez" },
          metodoPago: { id: 1, nombre: "Efectivo" },
          lineas: [],
        },
      ],
    });
    mobileApi.rendicion.mockResolvedValue({ cobrador: "Ana", cobros: [] });
    compartirRendicion.mockResolvedValue(undefined);

    try {
      const { getByRole, getByText, findByLabelText } = render(<MisCobranzasScreen />);

      expect(getByText("Febrero de 2026")).toBeTruthy();

      fireEvent.press(getByRole("button", { name: "Mes anterior" }));
      expect(getByText("Enero de 2026")).toBeTruthy();

      await findByLabelText("Total cobrado en el período: $5.000");
      fireEvent.press(getByRole("button", { name: "Compartir PDF" }));

      await waitFor(() => {
        expect(mobileApi.misCobranzas).toHaveBeenLastCalledWith(
          8,
          new Date("2026-01-01T00:00:00.000-03:00").toISOString(),
          new Date("2026-01-31T23:59:59.999-03:00").toISOString(),
          { q: undefined, offset: 0, limit: 15 },
        );
        expect(mobileApi.rendicion).toHaveBeenCalledWith("device-1", { periodo: "2026-01" });
        expect(compartirRendicion).toHaveBeenCalledWith({ cobrador: "Ana", cobros: [] }, 8);
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("supports switching to a custom date range and exporting PDF when collections exist", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-24T15:00:00.000Z"));
    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 5000,
      total: 1,
      totalPeriodo: 1,
      offset: 0,
      limit: 15,
      hasMore: false,
      operaciones: [
        {
          id: 88,
          total: 5000,
          fechaHoraServidor: "2026-11-20T15:00:00.000Z",
          socio: { id: 1, nombre: "Ana", apellido: "Gomez" },
          metodoPago: { id: 1, nombre: "Efectivo" },
          lineas: [],
        },
      ],
    });
    mobileApi.rendicion.mockResolvedValue({ cobrador: "Ana", cobros: [] });
    compartirRendicion.mockResolvedValue(undefined);

    try {
      const { getByRole, findByRole } = render(<MisCobranzasScreen />);

      fireEvent.press(getByRole("tab", { name: "Rango personalizado" }));
      await findByRole("button", { name: /operación número 88/i });
      fireEvent.press(getByRole("button", { name: "Compartir PDF" }));

      await waitFor(() => {
        expect(mobileApi.rendicion).toHaveBeenCalledWith("device-1", {
          desde: "2026-11-01",
          hasta: "2026-11-24",
        });
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
