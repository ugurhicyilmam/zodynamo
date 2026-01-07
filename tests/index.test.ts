import { describe, expect, it } from 'vitest'

import { test } from '../src/index'

describe('zodynamo', () => {
  it('should pass basics', () => {
    expect(true).toBe(true)
    expect(test).toBeDefined()
  })
})
