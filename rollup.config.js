import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default [
  // UMD Development
  {
    input: "src/index.ts",
    output: {
      file: "dist/webext-redux.js",
      format: "umd",
      name: "WebextRedux",
      indent: false,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
      babel({
        exclude: "node_modules/**",
        babelHelpers: "bundled"
      }),
    ],
  },

  // UMD Production
  {
    input: "src/index.ts",
    output: {
      file: "dist/webext-redux.min.js",
      format: "umd",
      name: "WebextRedux",
      indent: false,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(),
      babel({
        exclude: "node_modules/**",
        babelHelpers: "bundled"
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false,
        },
      }),
    ],
  },
];
