// Masks the common shapes of a secret in a shell command before the log
// keeps it. Best effort: a secret in a shape not listed here stays visible.
const RULES: [pattern: RegExp, replacement: string][] = [
  // user:password@ in a URL
  [/(:\/\/[^:/\s@]+:)[^@\s]+@/g, '$1****@'],
  // Authorization: Bearer <token>, and the like
  [/(authorization:\s*(?:bearer|basic|token)\s+)[^\s'"]+/gi, '$1****'],
  // --password <value>, --token=<value>, ...
  [/(--?(?:password|passwd|token|api-?key|secret|access-?key)(?:=|\s+))("[^"]*"|'[^']*'|\S+)/gi, '$1****'],
  // PASSWORD=<value>, api_key: <value>, ...
  [/(\b[\w-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s'"]+)/gi, '$1****'],
  // Key formats that stand alone
  [/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g, '****'],
]

const MAX = 2000

// Argument names whose value is a secret whatever it looks like.
const SECRET_NAME = /password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|authorization|cookie/i

const cut = (text: string): string => (text.length > MAX ? `${text.slice(0, MAX)}…` : text)

export function redact(command: string): string {
  return cut(RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), command))
}

export type CallDetails = { text: string; language: 'bash' | 'json' }

// A call's arguments, shown when its log row opens: a Bash command as shell,
// anything else as JSON with every string masked, the whole cut to MAX.
export function callDetails(tool: string, input: unknown): CallDetails | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const command = (input as Record<string, unknown>).command
  if (tool === 'Bash' && typeof command === 'string') return { text: redact(command), language: 'bash' }
  const json = JSON.stringify(
    input,
    (name, value: unknown) => (typeof value === 'string' ? (SECRET_NAME.test(name) ? '****' : redact(value)) : value),
    2,
  )
  return json === '{}' ? undefined : { text: cut(json), language: 'json' }
}
