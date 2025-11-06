import type { CompoundExpressionNode, ExpressionNode, NodeTransform, SimpleExpressionNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'

const CALC_PREFIX = 'calc('

interface TemplateFrame {
  openerIndex: number
  openerPos: number
  exprIndex?: number
}

type CompoundChild = CompoundExpressionNode['children'][number]

function isSimpleExpression(node: ExpressionNode): node is SimpleExpressionNode {
  return node.type === NodeTypes.SIMPLE_EXPRESSION
}

function isCompoundExpression(node: ExpressionNode): node is CompoundExpressionNode {
  return node.type === NodeTypes.COMPOUND_EXPRESSION
}

function isRelevantExpressionNode(child: CompoundChild): child is SimpleExpressionNode | CompoundExpressionNode {
  return typeof child === 'object'
    && child !== null
    && 'type' in child
    && (child.type === NodeTypes.SIMPLE_EXPRESSION || child.type === NodeTypes.COMPOUND_EXPRESSION)
}

function findFrameWaitingForExpression(stack: TemplateFrame[]): TemplateFrame | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]!.exprIndex === undefined)
      return stack[i]
  }
  return undefined
}

function ensureCalcPrefix(
  frame: TemplateFrame,
  stack: TemplateFrame[],
  children: CompoundExpressionNode['children'],
): number {
  const { openerIndex, openerPos } = frame
  const target = children[openerIndex]
  if (typeof target !== 'string')
    return 0

  const before = target.slice(0, openerPos)
  const after = target.slice(openerPos)

  if (before.endsWith(CALC_PREFIX) || after.startsWith(CALC_PREFIX))
    return 0

  const updated = before + CALC_PREFIX + after
  children[openerIndex] = updated

  const inserted = CALC_PREFIX.length
  for (const other of stack) {
    if (other.openerIndex === openerIndex && other.openerPos >= openerPos)
      other.openerPos += inserted
  }

  return inserted
}

function transformTemplateLiteralString(value: string, variableName: string, defaultValue: string): string {
  let result = value
  let inTemplate = false
  const stack: number[] = []
  let index = 0

  while (index < result.length) {
    const ch = result[index]

    if (ch === '`') {
      inTemplate = !inTemplate
      index++
      continue
    }

    if (!inTemplate) {
      index++
      continue
    }

    if (result.startsWith('${', index)) {
      stack.push(index)
      index += 2
      continue
    }

    if (ch === '}' && stack.length > 0) {
      const start = stack.pop()!

      if (result.startsWith('pxp', index + 1)) {
        const before = result.slice(0, start)
        const after = result.slice(start)

        if (!before.endsWith(CALC_PREFIX) && !after.startsWith(CALC_PREFIX)) {
          result = before + CALC_PREFIX + after
          index += CALC_PREFIX.length
        }

        const replacement = `px * var(${variableName}) / ${defaultValue})`
        result = result.slice(0, index + 1) + replacement + result.slice(index + 4)
        index += replacement.length + 1
        continue
      }
    }

    index++
  }

  return result
}

function transformCompoundExpressionNode(
  exp: CompoundExpressionNode,
  variableName: string,
  defaultValue: string,
) {
  const children = exp.children
  const stack: TemplateFrame[] = []
  let inTemplate = false

  const replacementSuffix = `px * var(${variableName}) / ${defaultValue})`

  for (let idx = 0; idx < children.length; idx++) {
    const child = children[idx]!

    if (typeof child === 'string') {
      let value = child
      let pos = 0

      while (pos < value.length) {
        const ch = value[pos]

        if (ch === '`') {
          inTemplate = !inTemplate
          pos++
          continue
        }

        if (!inTemplate) {
          pos++
          continue
        }

        if (value.startsWith('${', pos)) {
          stack.push({ openerIndex: idx, openerPos: pos })
          pos += 2
          continue
        }

        if (ch === '}' && stack.length > 0) {
          const frame = stack[stack.length - 1]!

          if (value.startsWith('pxp', pos + 1) && frame.exprIndex !== undefined) {
            const inserted = ensureCalcPrefix(frame, stack, children)
            if (inserted > 0 && frame.openerIndex === idx) {
              value = children[idx] as string
              pos += inserted
            }

            value = value.slice(0, pos + 1) + replacementSuffix + value.slice(pos + 4)
            children[idx] = value
            stack.pop()
            pos += 1 + replacementSuffix.length
            continue
          }

          stack.pop()
        }

        pos++
      }

      children[idx] = value
    }
    else if (isRelevantExpressionNode(child)) {
      const frame = findFrameWaitingForExpression(stack)
      if (frame)
        frame.exprIndex = idx

      if (isSimpleExpression(child)) {
        child.content = transformTemplateLiteralString(child.content, variableName, defaultValue)
      }
      else if (isCompoundExpression(child)) {
        transformCompoundExpressionNode(child, variableName, defaultValue)
      }
    }
  }
}

function transformExpressionNode(
  exp: SimpleExpressionNode | CompoundExpressionNode,
  variableName: string,
  defaultValue: string,
): void {
  if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    exp.content = transformTemplateLiteralString(exp.content, variableName, defaultValue)
    return
  }

  transformCompoundExpressionNode(exp, variableName, defaultValue)
}

export function createPxpCompilerPlugin(variableName: string, defaultValue: string) {
  return ((node) => {
    if (node.type !== NodeTypes.ELEMENT)
      return

    if (node.props.length === 0)
      return

    node.props
      .filter(it => it.type === NodeTypes.DIRECTIVE)
      .filter(it => it.rawName === ':style')
      .forEach((it) => {
        const exp = it.exp
        if (!exp)
          return

        transformExpressionNode(exp, variableName, defaultValue)
      })
  }) satisfies NodeTransform
}
