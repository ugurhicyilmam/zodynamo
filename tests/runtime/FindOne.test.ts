import { describe, expect, it } from 'vitest'

import { EntityCompositeAllFeatures } from '../fixtures'

describe('FindOne Runtime', () => {
  it('initializes with key', () => {
    const query = EntityCompositeAllFeatures.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })
    expect(query).toBeDefined()
  })

  it('updates state immutably', () => {
    const q1 = EntityCompositeAllFeatures.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })
    const q2 = q1.options({ consistent: true })
    const q3 = q2.attributes(['email'])
    const q4 = q3.orThrow()

    expect(q1).not.toBe(q2)
    expect(q2).not.toBe(q3)
    expect(q3).not.toBe(q4)
  })

  // Since actual execution is mocked/not connected to DB, we mainly verify it doesn't crash
  it('executes without error', async () => {
    const query = EntityCompositeAllFeatures.findOne({ pk: 'USER#1', sk: 'EMAIL#test' })
    const result = await query.exec()
    expect(result).toBeDefined()
  })
})
