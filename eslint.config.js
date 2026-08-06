import eslint from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["coverage/**", "dist/**", "node_modules/**", "tmp/**"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["error", { "allow": ["info", "error"] }],
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "error"
    }
  },
  {
    files: ["script.js", "classes/**/*.js", "js/**/*.js"],
    rules: {
      "max-lines-per-function": ["error", {
        "max": 14,
        "skipBlankLines": true,
        "skipComments": true
      }]
    }
  },
  {
    files: ["tests/**/*.mjs"],
    rules: {
      "no-console": "off",
      "prefer-const": "off"
    }
  }
];
