import type { NodeTransform } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'

export function createPxpCompilerPlugin(variableName: string, defaultValue: string) {
  return ((node) => {
    if (node.type !== NodeTypes.ELEMENT) {
      return
    }

    if (node.props.length === 0) {
      return
    }

    node.props
      .filter(it => it.type === NodeTypes.DIRECTIVE)
      .filter(it => it.rawName === ':style')
      .forEach((it) => {
        const exp = it.exp
        if (!exp) {
          return
        }

        // I'm not sure if this is the best way to do this,
        // and it maybe not robust, but it works for now.
        // @ts-expect-error `content` is not typed in `Expression`
        if (typeof exp.content === 'string') {
          // @ts-expect-error `content` is not typed in `Expression`
          exp.content = exp.content.replace(
            /(\$\{[^}]+\})pxp/g,
            `calc($1px * var(${variableName}) / ${defaultValue})`,
          )
        }
      })
  }) satisfies NodeTransform
}
