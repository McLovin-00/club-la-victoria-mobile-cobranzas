import React from "react";
import MisCobranzasScreen from "../../app/cobradora/mis-cobranzas";
import { render, fireEvent, waitFor } from "../setup/render";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    misCobranzas: jest.fn(),
    rendicion: jest.fn(),
  },
}));

jest.mock("../../lib/compartir-rendicion", () => ({
  compartirRendicion: jest.fn(),
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
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
  it("loads operations and opens the detail modal", async () => {
    getBinding.mockResolvedValue({ cobradorId: 8 });
    mobileApi.misCobranzas.mockResolvedValue({
      totalCobrado: 12500,
      operaciones: [
        {
          id: 101,
          total: 12500,
          fechaHoraServidor: "2026-03-16T12:00:00.000Z",
          socio: { id: 1, nombre: "Juan", apellido: "Perez" },
          metodoPago: { id: 1, nombre: "Efectivo" },
          lineas: [
            {
              id: 1,
              tipoLinea: "CUOTA",
              cuotaId: 99,
              cuota: { id: 99, periodo: "2026-03" },
              monto: 12500,
            },
          ],
        },
      ],
    });

    const { getByRole, findByLabelText, findByRole } = render(<MisCobranzasScreen />);

    fireEvent.press(getByRole("button", { name: "Consultar cobranzas" }));

    await findByLabelText("Total cobrado en el período: $12.500");
    fireEvent.press(await findByRole("button", { name: /operación número 101/i }));

    await waitFor(() => {
      expect(getByRole("button", { name: "Cerrar" })).toBeTruthy();
      expect(mobileApi.misCobranzas).toHaveBeenCalled();
    });
  }, 15000);

  it("comparte el PDF del mes elegido sin pedir código ni selección", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 15));
    getBinding.mockResolvedValue({ installationId: "device-1", cobradorId: 8 });
    mobileApi.rendicion.mockResolvedValue({ cobrador: "Ana", cobros: [] });
    compartirRendicion.mockResolvedValue(undefined);
    const { getByRole, getByText } = render(<MisCobranzasScreen />);

    expect(getByText("febrero de 2026")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Mes anterior" }));
    fireEvent.press(getByRole("button", { name: "Compartir PDF" }));

    try {
      await waitFor(() => {
        expect(mobileApi.rendicion).toHaveBeenCalledWith("device-1", { periodo: "2026-01" });
        expect(compartirRendicion).toHaveBeenCalledWith({ cobrador: "Ana", cobros: [] });
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
