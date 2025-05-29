import { endsWith, startsWith } from 'lodash-es'

export type StringFilter = {
  eq?: string[]
  includes?: string[]
  startsWith?: string[]
  endsWith?: string[]
}

export type StringFilterConfig = {
  [field: string]: StringFilter
}

const conditionFunc: {
  [K in keyof StringFilter]: (value: string, pattern: string) => boolean
} = {
  eq: (value, pattern) => Object.is(value, pattern),
  includes: (value, pattern) => value.includes(pattern),
  startsWith: (value, pattern) => value.startsWith(pattern),
  endsWith: (value, pattern) => value.endsWith(pattern),
}

export function matchString(value: string, condition: StringFilter): boolean {
  for (const [key, patterns] of Object.entries(condition)) {
    const check = conditionFunc[key as keyof StringFilter]
    if (check && patterns?.every(pattern => !check(value, pattern))) {
      return false
    }
  }

  return true
}

export function matchObject(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  obj: Record<string, any>,
  config: StringFilterConfig,
): boolean {
  return Object.entries(config).every(([field, condition]) =>
    matchString(String(obj[field]), condition),
  )
}
