import { describe, expect, it } from "vitest";

import { Avatar } from "./avatar";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("Avatar", () => {
  it("renders initials when no uri is provided", () => {
    const html = renderWithTheme(<Avatar name="Anna Smith" />);
    expect(html).toContain("AS");
    expect(html).toContain("bg-primary");
    expect(html).toContain("rounded-full");
  });

  it("renders an image when uri is provided", () => {
    const html = renderWithTheme(<Avatar name="Anna Smith" uri="https://example.com/avatar.png" />);
    expect(html).toContain("https://example.com/avatar.png");
  });
});
