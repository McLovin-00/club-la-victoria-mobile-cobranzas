import React from "react";
import { GrupoFamiliarCard } from "../../../components/grupo-familiar/grupo-familiar-card";
import { render, fireEvent } from "../../setup/render";
import { createGrupo } from "../../setup/mocks";

describe("GrupoFamiliarCard", () => {
  it("renders debt information and accessibility copy", () => {
    const onPress = jest.fn();
    const grupo = createGrupo();
    const { getByRole } = render(
      <GrupoFamiliarCard grupo={grupo} onPress={onPress} />,
    );

    const card = getByRole("button", { name: /Familia Perez/ });
    fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(card.props.accessibilityLabel).toBe(
      "Familia Perez. Grupo principal. 4 miembros. 2 con deuda, total $23.000",
    );
  });

  it("shows the paid state when the family has no debt", () => {
    const grupo = createGrupo({ miembrosConDeuda: 0, totalPendiente: 0 });
    const { getByRole } = render(<GrupoFamiliarCard grupo={grupo} onPress={jest.fn()} />);

    expect(getByRole("button", { name: /Al día/i })).toBeTruthy();
  });
});
