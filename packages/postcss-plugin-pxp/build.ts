import dts from 'bun-plugin-dts'

Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  minify: true,
  splitting: true,
  external: ['postcss', 'postcss-value-parser'],
  plugins: [
    dts()
  ]
})
