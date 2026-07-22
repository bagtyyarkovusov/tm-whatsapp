import { describe, expect, it } from "vitest";

import { ChatListItem } from "./chat-list-item";
import { renderWithTheme } from "../src/test/render-with-theme";

describe("ChatListItem", () => {
  it("renders contact details", () => {
    const html = renderWithTheme(
      <ChatListItem name="Maya" message="See you soon" timestamp="09:41" />,
    );
    expect(html).toContain("Maya");
    expect(html).toContain("See you soon");
    expect(html).toContain("09:41");
    expect(html).toContain("bg-surface");
  });

  it("renders an unread badge", () => {
    const html = renderWithTheme(
      <ChatListItem name="Maya" message="Hi" timestamp="09:41" unreadCount={4} />,
    );
    expect(html).toContain("4");
    expect(html).toContain("bg-danger");
  });
});
