import React from "react";
import { Text } from "react-native";
import { Button } from "../../../components/ui/button";
import { render, fireEvent } from "../../setup/render";

describe("Button", () => {
  it("uses the children text as accessibility label by default", () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button onPress={onPress}>Confirmar</Button>);

    fireEvent.press(getByRole("button", { name: "Confirmar" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows a busy disabled state while loading", () => {
    const { getByRole, queryByText } = render(
      <Button loading leftIcon={<Text>Icon</Text>}>
        Guardar
      </Button>,
    );

    expect(getByRole("button", { name: "Guardar" })).toHaveAccessibilityState({
      busy: true,
      disabled: true,
    });
    expect(queryByText("Guardar")).toBeNull();
  });

  it("merges caller accessibilityState without overwriting disabled or busy", () => {
    const { getByRole } = render(
      <Button disabled accessibilityState={{ expanded: true }}>
        Desplegar
      </Button>,
    );

    expect(getByRole("button", { name: "Desplegar" })).toHaveAccessibilityState({
      expanded: true,
      disabled: true,
    });
  });
});
