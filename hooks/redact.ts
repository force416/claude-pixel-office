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

export function redact(command: string): string {
  const masked = RULES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), command)
  return masked.length > MAX ? `${masked.slice(0, MAX)}…` : masked
}
