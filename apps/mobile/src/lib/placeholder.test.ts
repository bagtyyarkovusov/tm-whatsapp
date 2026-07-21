import { describe, expect, it } from "vitest";

import { APP_TAGLINE } from "./placeholder";

describe("mobile placeholder", () => {
  it("exposes a non-empty tagline for the placeholder screen", () => {
    expect(APP_TAGLINE.length).toBeGreaterThan(0);
  });
});
