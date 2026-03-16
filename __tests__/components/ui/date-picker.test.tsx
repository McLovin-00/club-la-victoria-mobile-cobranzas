import React from "react";
import { Platform } from "react-native";
import { DatePicker } from "../../../components/ui/date-picker";
import { render, fireEvent } from "../../setup/render";

describe("DatePicker", () => {
  it("shows the formatted date and returns the selected android value", () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });

    const onChange = jest.fn();
    const { getByRole, getByLabelText } = render(
      <DatePicker value="2026-03-16" onChange={onChange} />,
    );

    fireEvent.press(getByRole("button", { name: "Fecha seleccionada: 16-03-2026" }));
    fireEvent(getByLabelText("date-time-picker"), "onChange", { type: "set" }, new Date(2026, 0, 15));

    expect(onChange).toHaveBeenCalledWith("2026-01-15");

    Object.defineProperty(Platform, "OS", { configurable: true, value: originalPlatform });
  });
});
