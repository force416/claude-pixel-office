export type Activity =
  | 'type'
  | 'read'
  | 'shell'
  | 'web'
  | 'delegate'
  | 'tool'
  | 'think'
  | 'wait'
  | 'idle'
  | 'done'
  | 'failed'

export type AgentView = {
  id: string
  label: string
  type: string
  activity: Activity
  tool?: string
}

// `details` is the call's arguments with secrets masked: a Bash command as
// shell, anything else as JSON; absent for a call with none.
export type LogEntry = {
  at: string
  who: string
  tool: string
  detail?: string
  isMain?: boolean
  id?: string
  details?: { text: string; language: 'bash' | 'json' }
}

// One value, so one event is one write and one redraw. `open` is the id of
// the log entry whose command is shown, `page` the log page shown (0 the
// newest), `calls` every call logged this session, kept or not.
export type Office = { agents: AgentView[]; log: LogEntry[]; open?: string; page?: number; calls?: number }

declare module 'claude-code' {
  interface PluginState {
    'pixel-office': { office: Office }
  }
}
