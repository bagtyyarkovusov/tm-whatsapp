import { describe, expect, it } from "vitest";

import { Composer } from "./composer";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("Composer", () => {
  it("renders input and send button", () => {
    const html = renderWithTheme(
      <Composer value="Hello" onChangeText={() => {}} onSend={() => {}} placeholder="Message" />,
    );
    expect(html).toContain('value="Hello"');
    expect(html).toContain('placeholder="Message"');
    expect(html).toContain("Send");
    expect(html).toContain("bg-surface");
  });
});
