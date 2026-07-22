// Pseudolocale gate: builds an in-memory pseudolocale from the English catalog
// and scans app/ and src/ for hardcoded user-facing strings that would bypass
// localization (JSX text literals and string-valued text props such as
// accessibilityLabel). Any finding fails CI, since in a pseudolocale build
// those strings would remain untransformed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");

const en = JSON.parse(readFileSync(join(mobileRoot, "src/i18n/locales/en.json"), "utf8"));

// --- Pseudolocale transform (accented, wrapped, ~30% longer) ----------------
const ACCENTS = {
  a: "àáâãäå",
  c: "ç",
  e: "èéêë",
  i: "ìíîï",
  n: "ñ",
  o: "òóôõö",
  s: "š",
  u: "ùúûü",
  y: "ýÿ",
  z: "ž",
};
function pseudolocalize(value) {
  let out = "";
  for (const ch of value) {
    const lower = ch.toLowerCase();
    const accented = ACCENTS[lower];
    if (accented) {
      const pick = accented[value.length % accented.length];
      out += ch === lower ? pick : pick.toUpperCase();
      if (value.length % 3 === 0) out += pick; // vowel doubling lengthens text
    } else {
      out += ch;
    }
  }
  return `[!! ${out} !!]`;
}

const pseudo = Object.fromEntries(
  Object.entries(en).map(([key, value]) => [key, pseudolocalize(value)]),
);
const pseudoValues = new Set(Object.values(pseudo));

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx$/.test(entry)) yield full;
  }
}

// Identifier-like fragments containing a dot (e.g. import-path artifacts) are
// not user-facing copy.
const NON_COPY = /^[\w-]+\.[\w.-]+$/;

let failures = 0;
const fail = (file, line, kind, text) => {
  failures += 1;
  console.error(`i18n:pseudo: ${file}:${line} hardcoded ${kind}: ${JSON.stringify(text)}`);
};

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const JSX_TEXT = />([^<{}]+)</g;
const TEXT_PROP =
  /\b(accessibilityLabel|accessibilityHint|placeholder|title|label)\s*=\s*"([^"]+)"/g;

for (const root of [join(mobileRoot, "app"), join(mobileRoot, "src")]) {
  for (const file of walk(root)) {
    const rel = relative(mobileRoot, file);
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(JSX_TEXT)) {
      const text = match[1].trim();
      if (!/[A-Za-z]/.test(text)) continue;
      if (NON_COPY.test(text)) continue; // e.g. closing-tag artifacts
      if (pseudoValues.has(text)) continue;
      fail(rel, lineOf(source, match.index), "JSX text", text);
    }

    for (const match of source.matchAll(TEXT_PROP)) {
      const text = match[2].trim();
      if (!/[A-Za-z]/.test(text)) continue;
      fail(rel, lineOf(source, match.index), `${match[1]} prop`, text);
    }
  }
}

console.log(
  `i18n:pseudo: built pseudolocale for ${Object.keys(pseudo).length} keys (sample: ${pseudo["app.tagline"]})`,
);

if (failures > 0) {
  console.error(
    `i18n:pseudo failed: ${failures} hardcoded user-facing string(s) would bypass the pseudolocale build.`,
  );
  process.exit(1);
}
console.log("i18n:pseudo passed: no hardcoded user-facing strings found.");
