import React from "react";
import RootLayout from "../../app/_layout";
import { render } from "../setup/render";

describe("RootLayout", () => {
  it("renders the navigation stack shell", () => {
    const { UNSAFE_getAllByType } = render(<RootLayout />);

    expect(UNSAFE_getAllByType(require("react-native-safe-area-context").SafeAreaProvider)).toHaveLength(2);
  });
});
