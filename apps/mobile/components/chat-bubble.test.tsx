import { describe, expect, it } from "vitest";

import { ChatBubble } from "./chat-bubble";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("ChatBubble", () => {
  it("renders an incoming bubble", () => {
    const html = renderWithTheme(<ChatBubble timestamp="10:00">Hello</ChatBubble>);
    expect(html).toContain("Hello");
    expect(html).toContain("bg-incoming");
    expect(html).toContain("10:00");
  });

  it("renders an outgoing bubble with status", () => {
    const html = renderWithTheme(
      <ChatBubble isOutgoing timestamp="10:01" status="read">
        Hi there
      </ChatBubble>,
    );
    expect(html).toContain("Hi there");
    expect(html).toContain("bg-outgoing");
    expect(html).toContain("bg-status");
  });
});
