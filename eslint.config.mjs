import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules — relaxed (stylistic; not bug-catching)
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // React rules
    // `react-hooks/exhaustive-deps` is RE-ENABLED — it catches real bugs
    // (missing deps in useEffect/useCallback/useMemo that cause stale closures).
    // The other react-hooks/* rules below are still off because they flag
    // legitimate patterns in this codebase (setState-in-effect for one-shot
    // setup, refs to avoid re-renders during streaming, etc.) — those are
    // real patterns, not bugs.
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "off",
    "react-hooks/immutability": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/refs": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript rules — re-enabled the ones that catch real bugs.
    // These were previously disabled wholesale, which masked real issues.
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "warn",                     // catches `catch (e) {}` typos
    "no-irregular-whitespace": "warn",      // catches zero-width spaces from copy-paste
    "no-case-declarations": "off",
    "no-fallthrough": "error",              // catches missing `break` in switch — real bug
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "error",                // catches accidental duplicate declarations
    "no-undef": "off",
    "no-unreachable": "error",              // catches code after `return` — real bug
    "no-useless-escape": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "scripts/**"],
}];

export default eslintConfig;
