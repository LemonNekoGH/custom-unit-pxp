import type { CompoundExpressionNode, NodeTransform, SimpleExpressionNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'

function transformPxpInString(str: string, variableName: string, defaultValue: string): string {
  return str.replace(
    /(\$\{[^}]+\})pxp/g,
    `calc($1px * var(${variableName}) / ${defaultValue})`,
  )
}

function transformExpressionNode(
  exp: SimpleExpressionNode | CompoundExpressionNode,
  variableName: string,
  defaultValue: string,
): void {
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    // SimpleExpressionNode has content property
    exp.content = transformPxpInString(exp.content, variableName, defaultValue)
  }
  else if (exp.type === NodeTypes.COMPOUND_EXPRESSION) {
    // CompoundExpressionNode has children array
    exp.children = exp.children.map((child) => {
      if (typeof child === 'string') {
        // Convert string nodes directly
        return transformPxpInString(child, variableName, defaultValue)
      }
      else if (typeof child === 'object' && child !== null) {
        // Process child nodes recursively
        if ('type' in child) {
          if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
            child.content = transformPxpInString(child.content, variableName, defaultValue)
          }
          else if (child.type === NodeTypes.COMPOUND_EXPRESSION) {
            transformExpressionNode(child, variableName, defaultValue)
          }
        }
      }
      return child
    })
  }
}

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

        transformExpressionNode(exp, variableName, defaultValue)
      })
  }) satisfies NodeTransform
}
