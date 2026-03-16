import React from "react";
import { Input } from "../../../components/ui/input";
import { render, fireEvent } from "../../setup/render";

describe("Input", () => {
  it("renders helper text and keeps accessibility metadata in sync", () => {
    const { getByLabelText, getByText } = render(
      <Input label="Monto" helperText="Ingresa el total" placeholder="0" />,
    );

    const input = getByLabelText("Monto");

    fireEvent(input, "focus");
    fireEvent.changeText(input, "2500");
    fireEvent(input, "blur");

    expect(getByText("Ingresa el total")).toBeTruthy();
  });

  it("announces the error state through the accessibility label", () => {
    const { getByLabelText, getByRole } = render(
      <Input label="Importe" error="Monto inválido" placeholder="0" />,
    );

    expect(getByLabelText("Importe. Error: Monto inválido")).toBeTruthy();
    expect(getByRole("alert")).toHaveTextContent("Monto inválido");
  });
});
