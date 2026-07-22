import { describe, expect, it } from "vitest";

import { Badge } from "./badge";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("Badge", () => {
  it("renders the count", () => {
    const html = renderWithTheme(<Badge count={3} />);
    expect(html).toContain("3");
    expect(html).toContain("bg-danger");
    expect(html).toContain("rounded-full");
  });

  it("caps the count at 99+", () => {
    const html = renderWithTheme(<Badge count={150} />);
    expect(html).toContain("99+");
  });
});
