import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacte de documentatie generata (docdash). Nu e codul nostru: nu-l
    // scriem, nu-l citim, si producea doua avertismente la fiecare rulare de
    // lint — zgomot constant care ascunde avertismentele adevarate.
    "doc/**",
  ]),
]);

export default eslintConfig;
