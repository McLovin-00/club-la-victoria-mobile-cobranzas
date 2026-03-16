import React from "react";
import { Modal } from "../../../components/ui/modal";
import { render, fireEvent } from "../../setup/render";

describe("Modal", () => {
  it("renders content and closes from the header button", () => {
    const onClose = jest.fn();
    const { getByText, getByRole } = render(
      <Modal visible onClose={onClose} title="Detalle">
        <>{"Contenido"}</>
      </Modal>,
    );

    expect(getByText("Detalle")).toBeTruthy();
    fireEvent.press(getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
