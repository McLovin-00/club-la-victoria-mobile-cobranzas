import React from "react";
import GruposFamiliaresScreen from "../../app/cobradora/grupos-familiares";
import { render, fireEvent, waitFor } from "../setup/render";
import { createGrupo } from "../setup/mocks";

jest.mock("../../lib/api", () => ({
  mobileApi: {
    getGruposFamiliares: jest.fn(),
  },
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    getGruposFamiliares: jest.Mock;
  };
};

describe("GruposFamiliaresScreen", () => {
  it("filters groups and navigates to the selected family", async () => {
    mobileApi.getGruposFamiliares.mockResolvedValue([
      createGrupo(),
      createGrupo({ id: 20, nombre: "Familia Rodriguez", descripcion: "Secundaria" }),
    ]);

    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { push: jest.Mock };
    };

    const { findByLabelText, getByLabelText, queryByText, findByRole } = render(
      <GruposFamiliaresScreen />,
    );

    await findByLabelText("Lista de grupos familiares");

    fireEvent.changeText(getByLabelText("Buscar grupo familiar"), "Rodriguez");

    await waitFor(() => {
      expect(queryByText("Familia Perez")).toBeNull();
    });

    fireEvent.press(await findByRole("button", { name: /Familia Rodriguez/ }));

    expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith("/cobradora/grupo-familiar/20");
  });
});
