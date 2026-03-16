import React from "react";
import HomeCobradoraScreen from "../../app/cobradora/home";
import { render, waitFor } from "../setup/render";
import { createBinding } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    buscarSocios: jest.fn(),
  },
}));

jest.mock("../../lib/storage", () => ({
  getBinding: jest.fn(),
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    buscarSocios: jest.Mock;
  };
};

const { getBinding } = jest.requireMock("../../lib/storage") as {
  getBinding: jest.Mock;
};

describe("offline flow", () => {
  it("shows an error message when loading socios fails", async () => {
    mobileApi.buscarSocios.mockRejectedValue(new Error("Sin conexión"));
    getBinding.mockResolvedValue(createBinding());

    const { findByText } = render(<HomeCobradoraScreen />);
    const alert = await findByText("Sin conexión");

    await waitFor(() => {
      expect(alert).toHaveTextContent("Sin conexión");
      expect(mobileApi.buscarSocios).toHaveBeenCalledWith("");
    });
  });
});
