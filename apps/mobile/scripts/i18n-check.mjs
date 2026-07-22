// i18n CI gate: fails when
//   1. locale catalogs do not have identical key sets,
//   2. any `t("...")` key referenced in app/ or src/ is missing from the
//      English catalog (the source of truth), or
//   3. the generated i18next resource types are stale.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");
const localesDir = join(mobileRoot, "src/i18n/locales");

const LOCALES = ["en", "ru", "tk"];
const catalogs = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(join(localesDir, `${locale}.json`), "utf8")),
  ]),
);

let failures = 0;
const fail = (message) => {
  failures += 1;
  console.error(`i18n:check: ${message}`);
};

// 1. Identical key sets, English is the reference.
const enKeys = Object.keys(catalogs.en).sort();
for (const locale of LOCALES) {
  const keys = Object.keys(catalogs[locale]).sort();
  const missing = enKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !enKeys.includes(key));
  for (const key of missing) fail(`locales/${locale}.json is missing key "${key}"`);
  for (const key of extra) fail(`locales/${locale}.json has extra key "${key}" (not in en.json)`);
  for (const key of keys) {
    const value = catalogs[locale][key];
    if (typeof value !== "string" || value.trim().length === 0) {
      fail(`locales/${locale}.json key "${key}" is empty or not a string`);
    }
  }
}

// 2. Referenced t("...") keys must exist in the English catalog.
function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts")) yield full;
  }
}

const keyPattern = /\bt\(\s*["']([^"']+)["']/g;
for (const root of [join(mobileRoot, "app"), join(mobileRoot, "src")]) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(keyPattern)) {
      if (!(match[1] in catalogs.en)) {
        fail(`${relative(mobileRoot, file)} references unknown key "${match[1]}"`);
      }
    }
  }
}

// 3. Generated types must be fresh.
const result = execFileSync(process.execPath, [join(here, "generate-i18n-types.mjs"), "--check"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
process.stdout.write(result);

if (failures > 0) {
  console.error(`i18n:check failed with ${failures} problem(s).`);
  process.exit(1);
}
console.log(`i18n:check passed (${enKeys.length} keys x ${LOCALES.length} locales).`);
