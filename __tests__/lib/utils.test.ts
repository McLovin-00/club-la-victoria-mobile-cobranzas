import { cn } from "../../lib/utils";

describe("cn", () => {
  it("merges tailwind classes keeping the latest value", () => {
    expect(cn("px-2", "text-sm", "px-4")).toBe("text-sm px-4");
  });

  it("ignores falsy conditional values", () => {
    expect(cn("rounded", false && "hidden", null, undefined, "bg-primary")).toBe(
      "rounded bg-primary",
    );
  });
});
