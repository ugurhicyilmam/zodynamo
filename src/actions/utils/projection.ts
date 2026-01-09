/**
 * Generates a DynamoDB ProjectionExpression and its corresponding
 * ExpressionAttributeNames map from an array of field paths.
 *
 * Handles nested dot notation (e.g., 'metadata.version'), array indices
 * (e.g., 'history[0].action'), and bracket notation for record keys (e.g., "meta['key.with.dots']").
 *
 * @param paths - Array of field paths to project
 * @returns Object containing the ProjectionExpression string and ExpressionAttributeNames map
 */
export function buildProjectionExpression(paths: readonly string[]): {
  ProjectionExpression: string
  ExpressionAttributeNames: Record<string, string>
} {
  const ExpressionAttributeNames: Record<string, string> = {}
  const nameMap = new Map<string, string>()
  let attrCount = 0

  const aliasName = (name: string) => {
    if (/^\d+$/.test(name)) return name // Don't alias numeric array indices
    let alias = nameMap.get(name)
    if (!alias) {
      attrCount++
      alias = `#attr${attrCount}`
      nameMap.set(name, alias)
      ExpressionAttributeNames[alias] = name
    }
    return alias
  }

  const projection = paths
    .map(path => {
      let result = ''
      let current = ''
      let i = 0
      while (i < path.length) {
        const char = path[i]
        // Handle path separators and bracket notation
        if (char === '.' || char === '[' || char === ']' || char === "'") {
          if (current) {
            result += aliasName(current)
            current = ''
          }
          if (char === "'") {
            // Handle quoted record keys: ['my.quoted.key']
            let j = i + 1
            while (j < path.length && path[j] !== "'") j++
            const quoted = path.substring(i + 1, j)
            result += '.' + aliasName(quoted)
            i = j
            // Skip the closing bracket if present (e.g., after the closing quote)
            if (path[i + 1] === ']') i++
          } else if (char === '[') {
            // Only add opening bracket if it's not starting a quoted key
            if (path[i + 1] !== "'") {
              result += char
            }
          } else if (char === ']' || char === '.') {
            result += char
          }
        } else {
          current += char
        }
        i++
      }
      if (current) result += aliasName(current)
      return result
    })
    .join(', ')

  return {
    ProjectionExpression: projection,
    ExpressionAttributeNames
  }
}
