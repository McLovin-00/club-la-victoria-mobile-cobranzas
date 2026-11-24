import React from "react";
import HomeCobradoraScreen from "../../app/cobradora/home";
import { render, fireEvent } from "../setup/render";
import { createBinding, createSocio } from "../setup/mocks";

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

describe("HomeCobradoraScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("searches socios and navigates to payment and family detail flows", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { push: jest.Mock };
    };

    mobileApi.buscarSocios.mockResolvedValue({
      data: [createSocio()],
      total: 1,
      offset: 0,
      limit: 50,
      hasMore: false,
    });
    getBinding.mockResolvedValue(createBinding());

    const { findByRole, getByLabelText, getByRole, getByText } = render(
      <HomeCobradoraScreen />,
    );

    await findByRole("button", { name: /Perez, Juan\./i });

    fireEvent.changeText(getByLabelText("Buscar socio"), "Juan");
    fireEvent.press(getByRole("button", { name: "Buscar" }));
    expect(mobileApi.buscarSocios).toHaveBeenCalledWith("Juan", 0, 50);

    fireEvent.press(await findByRole("button", { name: /Perez, Juan\./i }));

    fireEvent.press(getByText("Familia Perez", { includeHiddenElements: true }), {
      stopPropagation: jest.fn(),
    });

    expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith(
      "/cobradora/pago?socioId=11&nombre=Juan&apellido=Perez&creditoDisponible=0",
    );
    expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/grupo-familiar/10");
  });
});
