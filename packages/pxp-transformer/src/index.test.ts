import { describe, expect, it } from 'bun:test'
import { transformPxP } from './index'

describe('transformPxP', () => {
  it('should transform pxp to calc', () => {
    expect(transformPxP('100pxp', '--viewport-width', '1920')).toBe('calc(100px * var(--viewport-width) / 1920)')
  })

  it('should transform pxp in complex css value', () => {
    expect(transformPxP('red 2pxp solid', '--viewport-width', '1920')).toBe('red calc(2px * var(--viewport-width) / 1920) solid')
  })
})
