import parseValue from 'postcss-value-parser'

export function transformPxP(value: string, variableName: string, defaultValue: string) {
  const declarationAST = parseValue(value)
  declarationAST.walk((node) => {
    if (node.type !== 'word')
      return
    if (!node.value.endsWith('pxp'))
      return

    const value = node.value.slice(0, -3)
    Object.assign(node, {
      type: 'function',
      value: 'calc',
      nodes: [
        {
          type: 'word',
          value: `${value}px`,
        },
        {
          type: 'space',
          value: ' ',
        },
        {
          type: 'space',
          value: '*',
        },
        {
          type: 'space',
          value: ' ',
        },
        {
          type: 'function',
          value: 'var',
          nodes: [
            {
              type: 'word',
              value: variableName,
            },
          ],
        },
        {
          type: 'space',
          value: ' ',
        },
        {
          type: 'word',
          value: '/',
        },
        {
          type: 'space',
          value: ' ',
        },
        {
          type: 'word',
          value: defaultValue,
        },
      ],
    })
  })

  return declarationAST.toString()
}
