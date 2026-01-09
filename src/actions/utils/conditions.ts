import { Condition } from '../query/types'

export interface ConditionExpressionResult {
  ConditionExpression: string
  ExpressionAttributeNames: Record<string, string>
  ExpressionAttributeValues: Record<string, any>
}

class ConditionBuilder {
  private attrCount = 0
  private valCount = 0
  private names: Record<string, string> = {}
  private values: Record<string, any> = {}

  build(condition: Condition<any>): string {
    if ('and' in condition) {
      return condition.and.map(c => `(${this.build(c)})`).join(' AND ')
    }
    if ('or' in condition) {
      return condition.or.map(c => `(${this.build(c)})`).join(' OR ')
    }
    if ('not' in condition) {
      return `NOT (${this.build(condition.not)})`
    }

    const path = (
      'attr' in condition ? (condition as any).attr : (condition as any).rawAttr
    ) as string
    const attrAlias = this.addName(path)

    if ('exists' in condition) {
      return condition.exists
        ? `attribute_exists(${attrAlias})`
        : `attribute_not_exists(${attrAlias})`
    }

    if ('type' in condition) {
      const valAlias = this.addValue(condition.type)
      return `attribute_type(${attrAlias}, ${valAlias})`
    }

    if ('eq' in condition) {
      const valAlias = this.addValue(condition.eq)
      return `${attrAlias} = ${valAlias}`
    }
    if ('ne' in condition) {
      const valAlias = this.addValue(condition.ne)
      return `${attrAlias} <> ${valAlias}`
    }
    if ('gt' in condition) {
      const valAlias = this.addValue(condition.gt)
      return `${attrAlias} > ${valAlias}`
    }
    if ('gte' in condition) {
      const valAlias = this.addValue(condition.gte)
      return `${attrAlias} >= ${valAlias}`
    }
    if ('lt' in condition) {
      const valAlias = this.addValue((condition as any).lt)
      return `${attrAlias} < ${valAlias}`
    }
    if ('lte' in condition) {
      const valAlias = this.addValue((condition as any).lte)
      return `${attrAlias} <= ${valAlias}`
    }
    if ('between' in condition) {
      const val1 = this.addValue((condition as any).between[0])
      const val2 = this.addValue((condition as any).between[1])
      return `${attrAlias} BETWEEN ${val1} AND ${val2}`
    }
    if ('in' in condition) {
      const aliases = (condition as any).in.map((v: any) => this.addValue(v))
      return `${attrAlias} IN (${aliases.join(', ')})`
    }
    if ('contains' in condition) {
      const valAlias = this.addValue(condition.contains)
      return `contains(${attrAlias}, ${valAlias})`
    }
    if ('beginsWith' in condition) {
      const valAlias = this.addValue(condition.beginsWith)
      return `begins_with(${attrAlias}, ${valAlias})`
    }

    return ''
  }

  private addName(path: string): string {
    // Handle nested paths by splitting and aliasing each part
    const parts = path.split('.')
    const aliases = parts.map(part => {
      // Handle array indices like [0]
      const arrayMatch = part.match(/(.+)\[(\d+)\]/)
      if (arrayMatch) {
        const name = arrayMatch[1]!
        const index = arrayMatch[2]!
        const alias = this.getOrCreateNameAlias(name)
        return `${alias}[${index}]`
      }
      return this.getOrCreateNameAlias(part)
    })
    return aliases.join('.')
  }

  private getOrCreateNameAlias(name: string): string {
    for (const [alias, actualName] of Object.entries(this.names)) {
      if (actualName === name) return alias
    }
    const alias = `#attr${++this.attrCount}`
    this.names[alias] = name
    return alias
  }

  private addValue(value: any): string {
    const alias = `:val${++this.valCount}`
    this.values[alias] = value
    return alias
  }

  getResult(): ConditionExpressionResult {
    return {
      ConditionExpression: '',
      ExpressionAttributeNames: this.names,
      ExpressionAttributeValues: this.values
    }
  }
}

export function buildConditionExpression(condition: Condition<any>): ConditionExpressionResult {
  const builder = new ConditionBuilder()
  const expression = builder.build(condition)
  const result = builder.getResult()
  result.ConditionExpression = expression
  return result
}
