import { describe, expect, it } from "vitest";

import { TextField } from "./text-field";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("TextField", () => {
  it("renders label, placeholder and value", () => {
    const html = renderWithTheme(
      <TextField label="Phone" value="+993" onChangeText={() => {}} placeholder="Enter phone" />,
    );
    expect(html).toContain("Phone");
    expect(html).toContain('value="+993"');
    expect(html).toContain('placeholder="Enter phone"');
    expect(html).toContain("bg-surface");
    expect(html).toContain("text-on-surface");
  });

  it("renders an error message", () => {
    const html = renderWithTheme(<TextField value="" onChangeText={() => {}} error="Invalid" />);
    expect(html).toContain("Invalid");
    expect(html).toContain("text-danger");
  });
});
