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
];

export default eslintConfig;
