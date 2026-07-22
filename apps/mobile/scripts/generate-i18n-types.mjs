// Generates src/i18n/resources.d.ts from the English catalog (the source of
// truth) using i18next-resources-for-ts. The CLI treats each JSON filename as
// a namespace, so en.json is staged as `translation.json` in a temp directory.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(here, "..");
const enCatalog = join(mobileRoot, "src/i18n/locales/en.json");
const output = join(mobileRoot, "src/i18n/resources.d.ts");

const checkOnly = process.argv.includes("--check");

const require = createRequire(join(mobileRoot, "package.json"));
const cliBin = join(
  dirname(require.resolve("i18next-resources-for-ts/package.json")),
  "bin/i18next-resources-for-ts.js",
);

// The committed file must stay prettier-clean (CI runs format:check), so the
// generator normalizes the CLI output through the repo's prettier.
const rootRequire = createRequire(join(mobileRoot, "../../package.json"));
const prettierBin = join(dirname(rootRequire.resolve("prettier/package.json")), "bin/prettier.cjs");

function formatPrettier(source) {
  return execFileSync(process.execPath, [prettierBin, "--stdin-filepath", output], {
    input: source,
    encoding: "utf8",
  });
}

const staging = mkdtempSync(join(tmpdir(), "tm-i18n-types-"));
const outDir = join(staging, "out");
try {
  copyFileSync(enCatalog, join(staging, "translation.json"));
  mkdirSync(outDir);
  execFileSync(process.execPath, [cliBin, "interface", "-i", staging, "-o", outDir], {
    stdio: "pipe",
  });
  const generated = formatPrettier(readFileSync(join(outDir, "resources.d.ts"), "utf8"));

  if (checkOnly) {
    const current = readFileSync(output, "utf8");
    if (current !== generated) {
      console.error(
        "i18n type check failed: src/i18n/resources.d.ts is stale. Run `pnpm --filter @tm/mobile i18n:generate`.",
      );
      process.exit(1);
    }
    console.log("i18n types are up to date.");
  } else {
    writeFileSync(output, generated);
    console.log(`Generated ${output}`);
  }
} finally {
  rmSync(staging, { recursive: true, force: true });
}
