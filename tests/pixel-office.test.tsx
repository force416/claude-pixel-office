import { expect, test } from 'claude-code/testing'

import { drawOffice } from '../hooks/office'
import { redact } from '../hooks/redact'
import type { Activity, AgentView } from '../types'

const PANE = {
  plugin: 'pixel-office',
  component: 'Pane',
  requestId: 'pixel-office',
  props: {
    title: 'Pixel Office',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const ACTIVITIES: Activity[] = ['type', 'read', 'shell', 'web', 'delegate', 'tool', 'think', 'wait', 'idle', 'done', 'failed']

// The kit raises no tool.check under a call the test answers, and its own
// $.tool.check is a query with no tool_use_id, so the tool paths and the log
// rows are checked in a live session; these cover the drawing.

test('the pane draws an office on remote surfaces and text on the terminal', async ($, on) => {
  on('command.register', () => ({ value: { command: 'pixel-office' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const terminal = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await terminal.find({ type: 'Text', text: /^main/ }))?.text).toMatch(/閒置$/)
  await terminal.unmount()

  for (const surface of ['desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('a logged command has the common secret shapes masked', () => {
  const cases: [string, string][] = [
    ['curl -H "Authorization: Bearer abc.def.ghi" https://x.test', 'curl -H "Authorization: Bearer ****" https://x.test'],
    ['psql postgres://app:s3cr3t@db.internal:5432/app', 'psql postgres://app:****@db.internal:5432/app'],
    ['mysql -u root --password=hunter2 app', 'mysql -u root --password=**** app'],
    ['gh auth login --token ghp_abcdefghijklmnopqrstuvwxyz0123', 'gh auth login --token ****'],
    ['API_KEY=sk-abcdefghijklmnopqrstu npm start', 'API_KEY=**** npm start'],
    ['echo $OPENAI sk-abcdefghijklmnopqrstuvwx', 'echo $OPENAI ****'],
  ]
  for (const [command, masked] of cases) expect(redact(command)).toBe(masked)

  expect(redact('git status && ls -la src')).toBe('git status && ls -la src')
  expect(redact('x'.repeat(3000))).toHaveLength(2001)
})

test('a full office of every activity stays under the Svg source limit', () => {
  const subs: AgentView[] = Array.from({ length: 40 }, (_, i) => ({
    id: `a${i}`,
    label: i % 2 ? '找出所有呼叫端 & <tags>' : 'find callers of setActivity',
    type: ['Explore', 'Plan', 'general-purpose', 'custom'][i % 4]!,
    activity: ACTIVITIES[i % ACTIVITIES.length]!,
  }))
  const svg = drawOffice([{ id: 'main', label: 'main', type: 'main', activity: 'delegate' }, ...subs])

  expect(svg.length).toBeLessThan(131072)
  expect(svg).not.toContain('<tags>')
})
