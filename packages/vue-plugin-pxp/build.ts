Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  splitting: true,
  external: ['vue', 'postcss-value-parser'],
})
