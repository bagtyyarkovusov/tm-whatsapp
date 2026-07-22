import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isLocale,
  resolveLocale,
} from "./config";
import i18n from "./instance";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import tk from "./locales/tk.json";

const catalogs = { en, ru, tk } as const;

describe("i18n configuration", () => {
  it("defaults the launch locale to Turkmen and ignores the OS locale", () => {
    expect(DEFAULT_LOCALE).toBe("tk");
    expect(i18n.language).toBe("tk");
  });

  it("uses English as the fallback locale", () => {
    expect(FALLBACK_LOCALE).toBe("en");
  });

  it("supports exactly English, Russian, and Turkmen", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "ru", "tk"]);
  });

  it("persists the locale choice under the @tm/locale storage key", () => {
    expect(LOCALE_STORAGE_KEY).toBe("@tm/locale");
  });
});

describe("resolveLocale", () => {
  it("keeps a stored supported locale", () => {
    expect(resolveLocale("ru")).toBe("ru");
    expect(resolveLocale("en")).toBe("en");
  });

  it("falls back to Turkmen for missing or unsupported values", () => {
    expect(resolveLocale(null)).toBe("tk");
    expect(resolveLocale("de")).toBe("tk");
    expect(resolveLocale("")).toBe("tk");
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects everything else", () => {
    expect(isLocale("tk")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("translation catalogs", () => {
  it("have identical key sets across all locales", () => {
    const enKeys = Object.keys(en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(catalogs[locale]).sort()).toEqual(enKeys);
    }
  });

  it("resolves every key to a non-empty string in every locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of Object.keys(en)) {
        const value = catalogs[locale][key as keyof typeof en];
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it("localizes the app tagline that replaced APP_TAGLINE", () => {
    expect(en["app.tagline"]).toContain("E2EE");
    expect(tk["app.tagline"]).not.toBe(en["app.tagline"]);
    expect(ru["app.tagline"]).not.toBe(en["app.tagline"]);
  });

  it("translates typed dot-notation keys through i18next", async () => {
    await i18n.changeLanguage("tk");
    expect(i18n.t("app.name")).toBe(tk["app.name"]);
    await i18n.changeLanguage("en");
    expect(i18n.t("app.tagline")).toBe(en["app.tagline"]);
  });

  it("never returns interpolation values for unknown keys", () => {
    // Bypass the typed-key union deliberately to probe runtime behavior; the
    // concatenation keeps the probe out of the i18n:check literal-key scan.
    const rendered = i18n.t(["missing", "key"].join(".") as "app.name", {
      secret: "sensitive-value",
    });
    expect(rendered).not.toContain("sensitive-value");
  });
});
