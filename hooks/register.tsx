import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Activity, AgentView, LogEntry, Office } from '../types'
import { drawOffice } from './office'
import { callDetails } from './redact'

// A tool call the log records: its tool_use_id and its arguments.
type Call = { id: string; input: unknown }

const PANE = 'pixel-office'
// The log keeps the newest KEPT calls and shows them PAGE at a time.
const KEPT = 200
const PAGE = 20
const MAIN: AgentView = { id: 'main', label: 'main', type: 'main', activity: 'idle' }
const INITIAL: Office = { agents: [MAIN], log: [] }
const office = atom({ plugin: 'pixel-office', key: 'office' } as const, INITIAL)

const WORDS: Record<Activity, string> = {
  type: '打字',
  read: '閱讀',
  shell: '終端機',
  web: '上網',
  delegate: '派工',
  tool: '工具',
  think: '思考',
  wait: '等待權限',
  idle: '閒置',
  done: '完成',
  failed: '失敗',
}

function activityOf(tool: string): Activity {
  if (['Edit', 'Write', 'NotebookEdit'].includes(tool)) return 'type'
  if (['Read', 'Grep', 'Glob'].includes(tool)) return 'read'
  if (tool === 'Bash') return 'shell'
  if (tool === 'WebFetch' || tool === 'WebSearch') return 'web'
  if (tool === 'Agent' || tool === 'Task') return 'delegate'
  return 'tool'
}

// Only the file name: patterns, commands and URLs can hold secrets.
function detailOf(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const path = (input as Record<string, unknown>).file_path ?? (input as Record<string, unknown>).notebook_path
  return typeof path === 'string' ? path.split('/').pop() : undefined
}

async function logEntry($: EngineInterface, agent: AgentView, tool: string, call: Call): Promise<LogEntry> {
  const now = new Date(await $.clock.now())
  const at = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
  return {
    at,
    who: agent.label.slice(0, 12),
    tool,
    detail: detailOf(call.input),
    isMain: agent.id === 'main',
    id: call.id,
    details: callDetails(tool, call.input),
  }
}

// Tool names by kind, in theme colors so they follow light and dark themes.
const TOOL_COLORS: Partial<Record<Activity, string>> = {
  type: 'success',
  read: 'suggestion',
  shell: 'warning',
  web: 'ide',
  delegate: 'claude',
  tool: 'subtle',
}

// `mcp__server__tool` reads as the tool, with its server beside it.
function toolName(tool: string): [name: string, server?: string] {
  const match = /^mcp__(.+?)__(.+)$/.exec(tool)
  return match ? [match[2]!, match[1]!] : [tool]
}

// One write per event, and none when nothing would change: every write
// redraws the pane. A subagent joins the first time one of its events
// arrives; loops that $.agent.list() does not name (compaction, memory
// forks) stay out.
async function setActivity(
  $: EngineInterface,
  agentId: string | undefined,
  activity: Activity,
  tool?: string,
  logged?: Call,
) {
  const id = agentId ?? 'main'
  const current = await read($, office)
  let agent = current.agents.find(a => a.id === id)
  if (!agent) {
    const info = (await $.agent.list()).find(a => a.id === id)
    if (!info) return
    agent = { id, label: info.description || info.type, type: info.type, activity }
  } else if (agent.activity === activity && agent.tool === tool && !logged) {
    return
  }
  const changed: AgentView = { ...agent, activity, tool }
  const entry = logged && tool ? await logEntry($, changed, tool, logged) : undefined
  await update($, office, value => ({
    ...value,
    agents: value.agents.some(a => a.id === id)
      ? value.agents.map(a => (a.id === id ? changed : a))
      : [...value.agents, changed],
    log: entry ? [...value.log, entry].slice(-KEPT) : value.log,
    calls: (value.calls ?? value.log.length) + (entry ? 1 : 0),
  }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pixel-office',
      description: 'Show the agents of this session as pixel characters',
    })
    void $.ui.open({ id: PANE, title: 'Pixel Office' })

    return next(e)
  })

  on('command.run', { command: 'pixel-office' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Pixel Office' })

    return { text: 'Pixel Office pane opened.' }
  })

  on('turn.start', async ($, e, next) => {
    await setActivity($, e.agentId, 'think')

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const ended: Activity = e.agentId === undefined ? 'idle' : e.isAborted ? 'failed' : 'done'
    await setActivity($, e.agentId, ended)

    return next(e)
  })

  // tool.check and turn.step mark a tool's start and end without holding a
  // hook frame open around the tool, so a subagent's own calls still reach
  // them. A check with no tool_use_id is a query, not a call. An ask a person
  // answers is the wait: the classic PermissionRequest and Notification can
  // be passed by a plugin seated above this one.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (e.tool_use_id !== undefined && verdict.decision !== 'deny') {
      const isAsked = verdict.decision === 'ask' && e.approver === 'person'
      await setActivity($, e.agentId, isAsked ? 'wait' : activityOf(e.tool), e.tool, { id: e.tool_use_id, input: e.input })
    }

    return verdict
  })

  // A model request after the first means the step's tools have all ended.
  // The classic PostToolUse can be passed by a plugin seated above this one.
  on('turn.step', async function* ($, e, next) {
    if (e.index > 0) await setActivity($, e.agentId, 'think')

    return yield* next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Code } = $.ui.resolve(e)
    const { agents: list, log: entries, open, page = 0, calls = entries.length } = await read($, office)
    const toggle = (id: string) => update($, office, value => ({ ...value, open: value.open === id ? undefined : id }))
    const pages = Math.max(1, Math.ceil(entries.length / PAGE))
    // The page shown, kept inside the log as the log changes.
    const shown = Math.min(page, pages - 1)
    const turn = (by: number) =>
      update($, office, value => {
        const last = Math.max(0, Math.ceil(value.log.length / PAGE) - 1)
        return { ...value, page: Math.min(last, Math.max(0, Math.min(value.page ?? 0, last) + by)) }
      })
    const alt = list.map(a => `${a.label}: ${WORDS[a.activity]}${a.tool ? ` (${a.tool})` : ''}`).join('; ')
    // The terminal refuses a face of its own (it has one).
    const isTerminal = e.surface === 'terminal'
    const mono = isTerminal ? {} : ({ mono: true } as const)
    const digits = isTerminal ? {} : ({ mono: true, tabular: true } as const)
    // Newest first, the newest in bold; columns line up in the mono face. A
    // row opens to show its call's arguments.
    const rows = [...entries]
      .reverse()
      .slice(shown * PAGE, shown * PAGE + PAGE)
      .map((one, i) => {
        const [name, server] = toolName(one.tool)
        const { id, details } = one
        const isOpen = id !== undefined && id === open
        const row = (
          <Box gap={1}>
            <Text {...digits} dimColor>
              {one.at}
            </Text>
            <Text color={one.isMain ? 'claude' : 'suggestion'}>●</Text>
            <Text {...mono} bold={shown === 0 && i === 0}>
              {one.who.slice(0, 10).padEnd(10)}
            </Text>
            <Text {...mono} bold color={TOOL_COLORS[activityOf(one.tool)]}>
              {name}
            </Text>
            {server && (
              <Text dimColor>
                {server}
              </Text>
            )}
            {one.detail && (
              <Text dimColor wrap="truncate-middle">
                {one.detail}
              </Text>
            )}
            {id && details && (
              <Button key={`args-${id}`} plain dimColor onPress={() => toggle(id)}>
                {isOpen ? '▾' : '▸'}
              </Button>
            )}
          </Box>
        )
        if (!isOpen || !details) return row
        return (
          <Box flexDirection="column">
            {row}
            <Box marginLeft={2}>
              <Code language={details.language} source={details.text} wrap="wrap" />
            </Box>
          </Box>
        )
      })
    const activity = (
      <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} marginTop={1}>
        <Box justifyContent="space-between">
          <Text bold color="subtle">
            ACTIVITY
          </Text>
          <Box gap={1}>
            <Text color="subtle">
              {entries.length === 0
                ? '0 calls'
                : `${shown * PAGE + 1}–${Math.min(entries.length, shown * PAGE + PAGE)} / ${entries.length} · ${calls} calls`}
            </Text>
            {shown > 0 && (
              <Button key="log-newer" plain dimColor onPress={() => turn(-1)}>
                ▲
              </Button>
            )}
            {shown < pages - 1 && (
              <Button key="log-older" plain dimColor onPress={() => turn(1)}>
                ▼
              </Button>
            )}
          </Box>
        </Box>
        {entries.length === 0 ? <Text dimColor>No tool calls yet.</Text> : rows}
      </Box>
    )

    if (e.surface === 'terminal') {
      return (
        <Box flexDirection="column">
          {list.map(a => (
            <Text>
              {a.label.padEnd(12)} {WORDS[a.activity]}
              {a.tool ? ` ${a.tool}` : ''}
            </Text>
          ))}
          {activity}
        </Box>
      )
    }

    const { Svg } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Svg source={drawOffice(list)} alt={alt} />
        {activity}
      </Box>
    )
  })
}
