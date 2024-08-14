import eslint from "@eslint/js";
import parser from "@babel/eslint-parser";

export default [
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2015,
      sourceType: "module",
      parser,
      globals: {
        chrome: "readonly",
        $: "readonly",
      },
    },
    env: {
      browser: true,
      commonjs: true,
    },
    rules: {
      "arrow-spacing": "error",
      "block-spacing": "error",
      curly: "error",
      "default-case": "error",
      indent: [
        "error",
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: { var: 2, let: 2, const: 3 },
        },
      ],
      "newline-after-var": ["error", "always"],
      "no-console": "off",
      "no-debugger": "error",
      "no-else-return": "error",
      "no-extra-bind": "error",
      "no-implicit-coercion": "error",
      "no-multi-spaces": [
        "error",
        {
          exceptions: {
            VariableDeclarator: true,
            AssignmentExpression: true,
          },
        },
      ],
      "no-template-curly-in-string": "error",
      "no-trailing-spaces": "warn",
      "no-undef-init": "error",
      "no-unused-vars": "error",
      "no-var": "warn",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-reflect": "error",
      "require-await": "error",
      semi: "error",
      "space-before-function-paren": [
        "error",
        {
          anonymous: "always",
          named: "never",
          asyncArrow: "ignore",
        },
      ],
      "spaced-comment": "warn",
      strict: "error",
    },
  },
];
