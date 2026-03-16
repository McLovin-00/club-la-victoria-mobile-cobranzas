import React from "react";
import MisCobranzasScreen from "../../app/cobradora/mis-cobranzas";
import { render, fireEvent, waitFor } from "../setup/render";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    misCobranzas: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    misCobranzas: jest.Mock;
  };
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
  });
});
