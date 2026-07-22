import { describe, expect, it } from "vitest";

import { AppBar } from "./app-bar";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("AppBar", () => {
  it("renders the title", () => {
    const html = renderWithTheme(<AppBar title="Chats" />);
    expect(html).toContain("Chats");
    expect(html).toContain("bg-surface");
    expect(html).toContain("border-border");
  });

  it("renders left and right actions", () => {
    const html = renderWithTheme(
      <AppBar title="Chats" left={<span>Back</span>} right={<span>Menu</span>} />,
    );
    expect(html).toContain("Back");
    expect(html).toContain("Menu");
  });
});
