import { describe, expect, it } from "vitest";

import Index from "./index";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("Index placeholder screen", () => {
  it("renders in light theme", () => {
    const html = renderWithTheme(<Index />);
    expect(html).toContain("tm-whatsapp");
    expect(html).toContain("chat-bg");
  });

  it("renders in dark theme", () => {
    const html = renderWithTheme(<Index />, { isDark: true });
    expect(html).toContain("tm-whatsapp");
    expect(html).toContain("dark");
  });
});
