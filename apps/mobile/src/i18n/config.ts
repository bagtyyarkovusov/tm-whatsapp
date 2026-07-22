export const SUPPORTED_LOCALES = ["en", "ru", "tk"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Launch locale is Turkmen by product decision; the device OS locale is ignored. */
export const DEFAULT_LOCALE: Locale = "tk";

/** English is the fallback and the source-of-truth catalog. */
export const FALLBACK_LOCALE: Locale = "en";

export const LOCALE_STORAGE_KEY = "@tm/locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(stored: unknown): Locale {
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}
