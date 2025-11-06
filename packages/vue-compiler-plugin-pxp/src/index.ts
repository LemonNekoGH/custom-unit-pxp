import type { CompoundExpressionNode, NodeTransform, SimpleExpressionNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'

function transformPxpInString(str: string, variableName: string, defaultValue: string): string {
  // Match patterns like: ${...}pxp or }pxp
  // For complete patterns like ${10}pxp, replace with calc(${10}px * var(...) / ...)
  // For partial patterns like }pxp, replace with }px * var(...) / ...)
  return str.replace(
    /(\$\{[^}]*\})pxp/g,
    `calc($1px * var(${variableName}) / ${defaultValue})`,
  ).replace(
    /(\})pxp/g,
    `$1px * var(${variableName}) / ${defaultValue})`,
  )
}

function transformExpressionNode(
  exp: SimpleExpressionNode | CompoundExpressionNode,
  variableName: string,
  defaultValue: string,
): void {
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    // SimpleExpressionNode has content property
    const original = exp.content
    const transformed = transformPxpInString(original, variableName, defaultValue)
    if (transformed !== original) {
      exp.content = transformed
    }
  }
  else if (exp.type === NodeTypes.COMPOUND_EXPRESSION) {
    // CompoundExpressionNode has children array
    // We need to transform string children, but also check for patterns across tokens
    const children = exp.children
    const transformedChildren: (typeof children[number])[] = []

    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const prevChild = i > 0 ? children[i - 1] : null

      if (typeof child === 'string') {
        // Check if this string contains }pxp
        let transformed = child
        if (child.includes('}pxp')) {
          // Check if we're in a template literal context
          // Look backwards to find if there's a ${ pattern
          let foundTemplateStart = false
          let templateStartIndex = -1

          // Check previous children for template start
          for (let j = transformedChildren.length - 1; j >= 0; j--) {
            const prev = transformedChildren[j]
            if (typeof prev === 'string') {
              if (prev.endsWith('`${') || prev.includes('${')) {
                foundTemplateStart = true
                templateStartIndex = j
                break
              }
            }
            // Stop if we hit a non-string that's not part of the template
            if (typeof prev !== 'string' && typeof prev !== 'object') {
              break
            }
          }

          // Also check if prevChild is an expression (which means we're in a template)
          if (!foundTemplateStart && typeof prevChild === 'object' && prevChild !== null && 'type' in prevChild) {
            foundTemplateStart = true
          }

          if (foundTemplateStart) {
            // Replace }pxp with }px * var(...) / ...)
            transformed = transformPxpInString(child, variableName, defaultValue)
            // Add calc( before the ${ if we found a template start
            if (templateStartIndex >= 0 && typeof transformedChildren[templateStartIndex] === 'string') {
              const prevStr = transformedChildren[templateStartIndex] as string
              if (prevStr.endsWith('`${') || prevStr.includes('`${')) {
                transformedChildren[templateStartIndex] = prevStr.replace(/`\$\{$/, '`calc(${').replace(/\$\{$/g, 'calc(${')
              }
            }
            // Also check if the current string itself starts with ${ (for cases like `${10}pxp`)
            else if (child.match(/^\$\{/)) {
              // The string itself starts with ${, so we need to add calc( at the beginning
              // But we need to check if there's a backtick before it
              // Actually, if child starts with ${, it means the template start is in a previous token
              // Let's look for it in the original children array
              for (let k = i - 1; k >= 0; k--) {
                const origChild = children[k]
                if (typeof origChild === 'string' && (origChild.endsWith('`') || origChild.includes('`'))) {
                  // Found the template start, but we can't modify original array
                  // Instead, we'll add calc( to the current string
                  transformed = transformed.replace(/^\$\{/, 'calc(${')
                  break
                }
              }
            }
          }
        }
        transformedChildren.push(transformed)
      }
      else if (typeof child === 'object' && child !== null && 'type' in child) {
        if (child.type === NodeTypes.SIMPLE_EXPRESSION) {
          // Transform SimpleExpressionNode content
          const original = child.content
          const transformed = transformPxpInString(original, variableName, defaultValue)
          if (transformed !== original) {
            child.content = transformed
          }
          transformedChildren.push(child)
        }
        else if (child.type === NodeTypes.COMPOUND_EXPRESSION) {
          // Recursively transform nested CompoundExpressionNode
          transformExpressionNode(child, variableName, defaultValue)
          transformedChildren.push(child)
        }
        else {
          transformedChildren.push(child)
        }
      }
      else if (child !== undefined) {
        transformedChildren.push(child)
      }
    }

    exp.children = transformedChildren
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
