import js from "@eslint/js";
import globals from "globals";
import { configs as tsConfigs, parser as tsParser, plugin as tsPlugin } from "typescript-eslint";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
  { ignores: ["dist/**", "node_modules/**", "coverage/**", ".prisma/**"] },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
      parser: tsParser,
      parserOptions: { project: ["./tsconfig.eslint.json"], tsconfigRootDir: __dirname },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsConfigs.strictTypeChecked[1].rules,
      'no-unused-vars': 'off',
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "all", caughtErrorsIgnorePattern: "^_" }],
      "no-empty": ["error", { "allowEmptyCatch": true }],
    },
  }
];


