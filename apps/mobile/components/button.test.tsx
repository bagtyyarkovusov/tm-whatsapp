import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("Button", () => {
  it("renders a primary button", () => {
    const html = renderWithTheme(<Button title="Save" onPress={() => {}} />);
    expect(html).toContain("Save");
    expect(html).toContain("bg-primary");
    expect(html).toContain("text-white");
  });

  it("renders a ghost button", () => {
    const html = renderWithTheme(<Button title="Cancel" onPress={() => {}} variant="ghost" />);
    expect(html).toContain("Cancel");
    expect(html).toContain("text-primary");
  });

  it("applies disabled styling", () => {
    const html = renderWithTheme(<Button title="Disabled" onPress={() => {}} disabled />);
    expect(html).toContain("opacity-50");
  });
});
