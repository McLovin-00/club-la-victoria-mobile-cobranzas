import React from "react";
import GrupoFamiliarDetalleScreen from "../../app/cobradora/grupo-familiar/[id]";
import { render, fireEvent, waitFor } from "../setup/render";

jest.mock("../../components/grupo-familiar", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MiembroGrupoItem: any = ({
    miembro,
    onPress,
    selected,
    onSelect,
    selectable,
  }: {
    miembro: any;
    onPress: any;
    selected: any;
    onSelect: any;
    selectable: any;
  }) =>
    React.createElement(
      View,
      null,
      selectable
        ? React.createElement(Pressable, {
            accessibilityRole: "checkbox",
            accessibilityLabel: `Seleccionar a ${miembro.nombre} ${miembro.apellido}`,
            accessibilityState: { checked: selected },
            onPress: onSelect,
          })
        : null,
      React.createElement(
        Pressable,
        {
          accessibilityRole: "button",
          accessibilityLabel: `${miembro.apellido}, ${miembro.nombre}`,
          onPress,
        },
        React.createElement(Text, null, `${miembro.apellido}, ${miembro.nombre}`),
      ),
    );

  return { MiembroGrupoItem };
});

jest.mock("../../lib/api", () => ({
  mobileApi: {
    getGrupoFamiliar: jest.fn(),
  },
}));

const { mobileApi } = jest.requireMock("../../lib/api") as {
  mobileApi: {
    getGrupoFamiliar: jest.Mock;
  };
};

describe("GrupoFamiliarDetalleScreen", () => {
  it("selects debt members and navigates to group payment", async () => {
    const expoRouter = jest.requireMock("expo-router") as {
      __mockRouter: { push: jest.Mock };
      __setLocalSearchParams: (params: Record<string, string>) => void;
    };

    expoRouter.__setLocalSearchParams({ id: "10" });
    mobileApi.getGrupoFamiliar.mockResolvedValue({
      id: 10,
      nombre: "Familia Perez",
      descripcion: "Grupo principal",
      orden: 1,
      cantidadMiembros: 2,
      miembrosConDeuda: 1,
      totalPendiente: 12000,
      miembros: [
        {
          id: 1,
          nombre: "Juan",
          apellido: "Perez",
          dni: "30111222",
          cantidadCuotasPendientes: 2,
          totalPendiente: 12000,
          cuotasPendientes: [],
        },
        {
          id: 2,
          nombre: "Ana",
          apellido: "Perez",
          dni: "30999888",
          cantidadCuotasPendientes: 0,
          totalPendiente: 0,
          cuotasPendientes: [],
        },
      ],
    });

    const { findByText, findByRole, getByRole } = render(<GrupoFamiliarDetalleScreen />);

    await findByText("Familia Perez");
    fireEvent.press(await findByRole("button", { name: "Seleccionar todos con deuda" }));
    fireEvent.press(getByRole("button", { name: "Cobrar seleccionados" }));

    await waitFor(() => {
      expect(expoRouter.__mockRouter.push).toHaveBeenCalledWith(
        "/cobradora/pago-grupo?grupoId=10&socioIds=1",
      );
    });
  });
});
