import type { CSSProperties, Directive, Plugin } from 'vue'
import { transformPxP } from '@lemonneko/pxp-transformer'

export type StyleInPxpDirective = Directive<HTMLElement, Partial<CSSProperties>>

export function createPxpPlugin(variableName: string, defaultValue: string) {
  return {
    install(app) {
      app.directive<HTMLElement, Partial<CSSProperties>>('style-pxp', (el, binding) => Object.entries(binding.value).forEach(([key, value]) => {
        if (value === undefined)
          return

        if (typeof value !== 'string') {
          el.style.setProperty(key, value.toString())
          return
        }

        if (!value.includes('pxp')) {
          el.style.setProperty(key, value)
          return
        }

        const transformedValue = transformPxP(value, variableName, defaultValue)
        el.style.setProperty(key, transformedValue)
      }))
    },
  } satisfies Plugin
}

declare module 'vue' {
  export interface ComponentCustomProperties {
    vStylePxp: StyleInPxpDirective
  }
}
