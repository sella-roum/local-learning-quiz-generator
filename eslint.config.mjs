import nextConfig from "eslint-config-next";

const ignores = [
  ".next/**",
  "node_modules/**",
  "dist/**",
  "out/**",
  "coverage/**"
];

const eslintConfig = [
  ...nextConfig,
  {
    ignores,
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
