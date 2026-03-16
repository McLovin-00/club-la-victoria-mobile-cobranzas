import React from "react";
import HomeCobradoraScreen from "../../app/cobradora/home";
import { render, fireEvent, waitFor, act } from "../setup/render";
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

    mobileApi.buscarSocios.mockResolvedValue([createSocio()]);
    getBinding.mockResolvedValue(createBinding());

    const { findByRole, findAllByRole, getByLabelText } = render(<HomeCobradoraScreen />);

    await findByRole("button", { name: /Perez, Juan\./i });

    fireEvent.changeText(getByLabelText("Buscar socio"), "Juan");

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mobileApi.buscarSocios).toHaveBeenCalledWith("Juan");
    });

    fireEvent.press(await findByRole("button", { name: /Perez, Juan\./i }));

    const familyButtons = await findAllByRole("button", {
      name: /Ver grupo familiar Familia Perez/i,
    });
    fireEvent.press(familyButtons[familyButtons.length - 1], {
      stopPropagation: jest.fn(),
    });

    expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/pago?socioId=11");
    expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/grupo-familiar/10");
  });
});
