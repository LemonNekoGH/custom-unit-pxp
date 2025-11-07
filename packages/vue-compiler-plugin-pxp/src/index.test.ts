/* eslint-disable no-template-curly-in-string */
import { describe, expect, it } from 'bun:test'
import vue from '@vitejs/plugin-vue'
import { createServer } from 'vite'
import { createPxpCompilerPlugin } from './index'

const VARIABLE_NAME = '--viewport-width'
const DEFAULT_VALUE = '720'

const VIRTUAL_ENTRY = 'virtual:entry'
const VIRTUAL_VUE = 'virtual:test.vue'
const STUB_VUE_ID = '\0virtual-stub-vue'

async function compileWithVite(template: string): Promise<string> {
  const server = await createServer({
    logLevel: 'error',
    configFile: false,
    optimizeDeps: { entries: [] },
    plugins: [
      {
        name: 'virtual-vue-fixture',
        enforce: 'pre',
        resolveId(id) {
          if (id === 'vue')
            return STUB_VUE_ID
          if (id === VIRTUAL_ENTRY || id === VIRTUAL_VUE)
            return id
          return null
        },
        load(id) {
          if (id === STUB_VUE_ID)
            return 'export const openBlock = () => {}; export const createElementBlock = () => {}; export const normalizeStyle = v => v; export default {}'
          if (id === VIRTUAL_ENTRY)
            return `import Component from "${VIRTUAL_VUE}"; export default Component;`
          if (id === VIRTUAL_VUE)
            return `<template>${template}</template>`
          return null
        },
      },
      vue({
        template: {
          compilerOptions: {
            nodeTransforms: [createPxpCompilerPlugin(VARIABLE_NAME, DEFAULT_VALUE)],
          },
        },
      }),
    ],
  })

  try {
    const result = await server.transformRequest(VIRTUAL_VUE)
    return result?.code ?? ''
  }
  finally {
    await server.close()
  }
}

describe('vite integration', () => {
  it('transforms pxp units inside template literal expressions', async () => {
    const code = await compileWithVite('<div :style="{ width: `${width}pxp` }" />')

    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?width\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).not.toContain('pxp')
  })

  it('transforms multiple pxp occurrences in a single binding', async () => {
    const template = [
      '<div :style="{ transform: `',
      '  translateX(${offsetX}pxp)',
      '  translateY(${positions.y}pxp)',
      '` }" />',
    ].join('\n')

    const code = await compileWithVite(template)

    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?offsetX\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?positions\.y\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code.match(/calc\(/g)?.length).toBeGreaterThanOrEqual(2)
    expect(code).not.toContain('pxp')
  })

  it('handles split tokens that occur in real vue compilation output', async () => {
    const template = '<div :style="{ width: `${width}pxp`, height: `${height}pxp` }" />'

    const code = await compileWithVite(template)

    expect(code).not.toMatch(/calc\(calc\(/)
    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?width\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?height\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).not.toContain('pxp')
  })

  it('does not touch non pxp units', async () => {
    const code = await compileWithVite('<div :style="{ width: `${width}px`, height: `100%` }" />')

    expect(code).toMatch(/width: `\$\{(?:_ctx\.)?width\}px`/)
    expect(code).toMatch(/height: `100%`/)
    expect(code).not.toContain('calc(')
  })

  it('should handle super complex expressions', async () => {
    const template = '<div :style="{ width: `${(placementAreaHeight) * brickHeight + brickGap * (placementAreaHeight - 1) + brickPadding * 2}pxp`, height: `${height}pxp` }" />'

    const code = await compileWithVite(template)

    expect(code).toMatch(/calc\(\$\{(?:\(_ctx.placementAreaHeight\) \* _ctx.brickHeight \+ _ctx.brickGap \* \(_ctx.placementAreaHeight - 1\) \+ _ctx.brickPadding \* 2)?\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?height\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).not.toContain('pxp')
  })

  it('supports zero and negative values', async () => {
    const template = [
      '<div :style="{',
      '  marginLeft: `${-offset}pxp`,',
      '  marginRight: `${values.zero}pxp`',
      '}" />',
    ].join('\n')

    const code = await compileWithVite(template)

    expect(code).toMatch(/calc\(\$\{-(?:_ctx\.)?offset\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).toMatch(/calc\(\$\{(?:_ctx\.)?values\.zero\}px \* var\(--viewport-width\) \/ 720\)/)
    expect(code).not.toContain('pxp')
  })
})
