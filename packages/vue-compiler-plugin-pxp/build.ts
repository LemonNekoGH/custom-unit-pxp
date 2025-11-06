Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  splitting: true,
  external: ['@vue/compiler-core', '@vue/compiler-sfc', 'postcss-value-parser'],
})
