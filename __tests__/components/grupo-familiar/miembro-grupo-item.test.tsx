import React from "react";
import { MiembroGrupoItem } from "../../../components/grupo-familiar/miembro-grupo-item";
import { render, fireEvent } from "../../setup/render";

describe("MiembroGrupoItem", () => {
  it("supports individual selection and payment actions", () => {
    const onPress = jest.fn();
    const onSelect = jest.fn();

    const { getByRole } = render(
      <MiembroGrupoItem
        miembro={{
          id: 1,
          nombre: "Juan",
          apellido: "Perez",
          dni: "30111222",
          telefono: "351000000",
          cantidadCuotasPendientes: 2,
          totalPendiente: 12000,
          cuotasPendientes: [],
        }}
        onPress={onPress}
        selectable
        selected
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByRole("checkbox", { name: "Seleccionar a Juan Perez" }));
    fireEvent.press(getByRole("button", { name: /Perez, Juan/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
