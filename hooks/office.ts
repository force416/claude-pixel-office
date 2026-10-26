import type { Activity, AgentView } from '../types'
import { CLAWD, CREATURES } from './creatures'
import type { Creature } from './creatures'

// One unit is one art pixel; the SVG scales it by S. The surface fits a
// wider SVG to the pane, so a large S fills the pane's width.
const S = 5
const W = 60
const H = 62
// Characters stand in front of the desk at the art's own scale.
const ZOOM = 1
const COLS = 3
const M = 6
const WALL = 30
const MAX_SUBS = 30

const INK = '#2b2836'

const DOTS: Record<Activity, string> = {
  type: '#3ecf6e',
  read: '#3ecf6e',
  shell: '#3ecf6e',
  web: '#3ecf6e',
  delegate: '#3ecf6e',
  tool: '#3ecf6e',
  think: '#3ecf6e',
  wait: '#f5b82e',
  idle: '#9aa0b5',
  done: '#9aa0b5',
  failed: '#e5534b',
}

// The plant sprite: '.' transparent.
const PLANT = [
  '...kkkkkk...',
  '..kggggGgk..',
  '.kgggGgggggk',
  'kggGgggggGgk',
  'kgggggGggggk',
  'kgGggggggGgk',
  '.kgggGgggggk',
  '..kgggggGgk.',
  '...kkgggkk..',
  '..kkkkkkkk..',
  '..kppppppk..',
  '..kppppPpk..',
  '...kppppk...',
  '...kppppk...',
  '...kkkkkk...',
]

const GLYPHS: Partial<Record<Activity, string[]>> = {
  read: ['.##..', '#..#.', '#..#.', '.##..', '....#'],
  shell: ['#....', '.#...', '#....', '..###', '.....'],
  web: ['.###.', '#.#.#', '#####', '#.#.#', '.###.'],
  delegate: ['.###.', '#####', '#...#', '#.#.#', '#####'],
  tool: ['.#.#.', '##.##', '..#..', '##.##', '.#.#.'],
  wait: ['..#..', '..#..', '..#..', '.....', '..#..'],
  done: ['....#', '...#.', '#.#..', '.#...', '.....'],
  failed: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  idle: ['####.', '..#..', '.#...', '####.', '.....'],
}
const GLYPH_COLORS: Partial<Record<Activity, string>> = {
  read: '#3d8fe0',
  shell: INK,
  web: '#3d6fd6',
  delegate: '#8d5524',
  tool: '#6b7080',
  wait: '#e5534b',
  done: '#2e9d57',
  failed: '#e5534b',
}

const hash = (text: string): number => {
  let n = 0
  for (const ch of text) n = (n * 31 + ch.charCodeAt(0)) >>> 0
  return n
}

const escape = (text: string): string => text.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`)

const rect = (x: number, y: number, w: number, h: number, fill: string, inner = ''): string =>
  inner === ''
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}">${inner}</rect>`

const anim = (attr: string, values: string, dur: string, extra = ''): string =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}" repeatCount="indefinite"${extra}/>`

const move = (values: string, dur: string, extra = ''): string =>
  `<animateTransform attributeName="transform" type="translate" values="${values}" dur="${dur}" repeatCount="indefinite"${extra}/>`

const use = (id: string, x: number, y: number, color?: string): string =>
  `<use href="#${id}" x="${x}" y="${y}"${color ? ` color="${color}"` : ''}/>`

// The cells whose key is in `keys`, as one path of row runs.
function runs(rows: string[], keys: string): string {
  let d = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      if (!keys.includes(row[x]!)) {
        x++
        continue
      }
      let n = 1
      while (x + n < row.length && keys.includes(row[x + n]!)) n++
      d += `M${x} ${y}h${n}v1h-${n}z`
      x += n
    }
  })
  return d
}

function sprite(id: string, rows: string[], palette: Record<string, string>): string {
  const paths = Object.entries(palette)
    .map(([key, fill]) => {
      const d = runs(rows, key)
      return d ? `<path d="${d}" fill="${fill}"/>` : ''
    })
    .join('')
  return `<symbol id="${id}" overflow="visible">${paths}</symbol>`
}

// The sprite's silhouette grown by one pixel all round, as 'g' cells; it is
// one pixel larger on every side, so it is drawn at -1, -1.
function halo(rows: string[]): string[] {
  const h = rows.length
  const w = rows[0]!.length
  const isSolid = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y]![x] !== '.'
  return Array.from({ length: h + 2 }, (_, y) =>
    Array.from({ length: w + 2 }, (_, x) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isSolid(x - 1 + dx, y - 1 + dy)) return 'g'
      return '.'
    }).join(''),
  )
}

const creatureOf = (a: AgentView): Creature =>
  a.id === 'main' ? CLAWD : CREATURES[hash(a.id) % CREATURES.length]!

const DESK =
  `<symbol id="pa-desk" overflow="visible">` +
  rect(1, 28, 48, 2, '#b4b8c6') +
  rect(0, 8, 50, 21, INK) +
  rect(1, 9, 48, 13, '#4a4e63') +
  rect(1, 9, 48, 1, '#62677f') +
  rect(1, 22, 48, 6, '#363a4c') +
  rect(4, 24, 10, 1, '#2b2e3d') +
  rect(36, 24, 10, 1, '#2b2e3d') +
  rect(6, 0, 18, 12, INK) +
  rect(13, 12, 4, 3, INK) +
  rect(11, 14, 8, 2, '#3b3e4f') +
  rect(26, 0, 18, 12, INK) +
  rect(33, 12, 4, 3, INK) +
  rect(31, 14, 8, 2, '#3b3e4f') +
  rect(16, 17, 18, 4, INK) +
  rect(17, 18, 16, 2, '#8a8fa6') +
  rect(43, 12, 5, 5, INK) +
  rect(44, 13, 3, 3, '#e9e4d8') +
  rect(0, 8, 8, 6, INK) +
  rect(1, 9, 6, 4, '#4caf50') +
  rect(2, 9, 2, 1, '#7bd17f') +
  rect(1, 13, 6, 5, INK) +
  rect(2, 14, 4, 3, '#c0703f') +
  `</symbol>`

// Only the characters in the office get a symbol.
const defs = (cast: Creature[]): string =>
  `<defs>` +
  `<pattern id="pa-floor" width="16" height="16" patternUnits="userSpaceOnUse">` +
  rect(0, 0, 16, 16, '#d3d6df') +
  rect(15, 0, 1, 16, '#c7cad5') +
  rect(0, 15, 16, 1, '#c7cad5') +
  rect(5, 6, 1, 1, '#c9ccd6') +
  rect(11, 10, 1, 1, '#c9ccd6') +
  `</pattern>` +
  `<filter id="pa-grey"><feColorMatrix type="saturate" values="0"/></filter>` +
  sprite('pa-plant', PLANT, { k: INK, g: '#4caf50', G: '#2e7d32', p: '#c0703f', P: '#9a5530' }) +
  cast.map(c => sprite(`pa-${c.id}`, c.rows, c.palette)).join('') +
  sprite('pa-halo', halo(CLAWD.rows), { g: '#fff1d6' }) +
  DESK +
  `</defs>`

const glyph = (rows: string[], x: number, y: number, color: string): string =>
  rows
    .flatMap((row, dy) => [...row].map((ch, dx) => (ch === '#' ? rect(x + dx, y + dy, 1, 1, color) : '')))
    .join('')

const bubble = (x: number, y: number, inner: string, extra = ''): string =>
  `<g>${rect(x - 1, y, 11, 9, INK)}${rect(x, y - 1, 9, 11, INK)}` +
  `${rect(x, y, 9, 9, '#ffffff')}${rect(x + 1, y + 9, 2, 2, INK)}${inner}${extra}</g>`

// Both screens of a desk; x, y is the left screen's corner, 16 x 10 each.
function screens(activity: Activity, x: number, y: number): string {
  const off = (sx: number) => rect(sx, y, 16, 10, '#14161f')
  const chat = rect(x + 20, y, 16, 10, '#1e2233') + rect(x + 22, y + 2, 9, 2, '#3d6fd6') + rect(x + 25, y + 6, 9, 2, '#4a4e63')
  const dark = rect(x, y, 16, 10, '#1e2233')
  switch (activity) {
    case 'type':
    case 'tool':
      return (
        dark +
        rect(x + 2, y + 2, 6, 1, '#c678dd') +
        rect(x + 9, y + 2, 4, 1, '#61afef') +
        rect(x + 4, y + 4, 8, 1, '#98c379') +
        rect(x + 4, y + 6, 5, 1, '#e5c07b') +
        rect(x + 2, y + 8, 2, 1, '#98c379', anim('width', '1;10;1', '1.4s')) +
        chat
      )
    case 'read':
      return (
        rect(x, y, 16, 10, '#f1f3f7') +
        rect(x + 2, y + 2, 12, 1, '#9aa0b5') +
        rect(x + 2, y + 4, 10, 1, '#9aa0b5') +
        rect(x + 2, y + 6, 12, 1, '#ffd54f') +
        rect(x + 2, y + 8, 8, 1, '#9aa0b5') +
        chat
      )
    case 'shell':
      return (
        rect(x, y, 16, 10, '#0b0d12') +
        rect(x + 2, y + 2, 1, 1, '#3ecf6e') +
        rect(x + 4, y + 2, 8, 1, '#cfd3dc') +
        rect(x + 2, y + 4, 10, 1, '#6b7080') +
        rect(x + 2, y + 6, 1, 1, '#3ecf6e') +
        rect(x + 4, y + 6, 2, 1, '#3ecf6e', anim('opacity', '1;0', '0.8s', ' calcMode="discrete"')) +
        chat
      )
    case 'web':
      return (
        rect(x, y, 16, 10, '#ffffff') +
        rect(x, y, 16, 2, '#dfe3ea') +
        rect(x + 2, y + 3, 12, 3, '#8fc9ea') +
        rect(x + 2, y + 7, 5, 2, '#3d6fd6') +
        rect(x + 9, y + 7, 5, 2, '#c7cad5') +
        chat
      )
    case 'delegate':
      return (
        dark +
        rect(x + 6, y + 1, 4, 3, '#f5b82e') +
        rect(x + 7, y + 4, 2, 1, '#9aa0b5') +
        rect(x + 3, y + 5, 10, 1, '#9aa0b5') +
        rect(x + 2, y + 6, 4, 3, '#3d8fe0') +
        rect(x + 10, y + 6, 4, 3, '#3d8fe0') +
        chat
      )
    case 'wait':
      return dark + rect(x + 3, y + 2, 10, 6, '#f5b82e') + rect(x + 7, y + 3, 2, 2, INK) + rect(x + 7, y + 6, 2, 1, INK) + chat
    case 'idle':
      return rect(x, y, 16, 10, '#16213a') + rect(x + 7, y + 4, 2, 2, '#8fc9ea', anim('opacity', '0.2;1;0.2', '3s')) + off(x + 20)
    case 'done':
    case 'failed':
      return off(x) + off(x + 20)
    default:
      return dark + rect(x + 2, y + 2, 10, 1, '#4a4e63') + rect(x + 2, y + 4, 7, 1, '#4a4e63') + rect(x + 2, y + 6, 11, 1, '#4a4e63') + chat
  }
}

// How the character moves: a quick hop while it works, a jump while it
// waits for you, a slow breath while idle.
function motion(activity: Activity): string {
  switch (activity) {
    case 'wait':
      return move('0 0;0 -3;0 0', '0.5s')
    case 'idle':
      return move('0 0;0 1;0 0', '2.4s')
    case 'think':
    case 'done':
    case 'failed':
      return ''
    default:
      return move('0 0;0 -1;0 0', '0.4s')
  }
}

function icon(a: AgentView, ox: number, oy: number): string {
  if (a.activity === 'think') {
    return (
      rect(ox + 40, oy + 16, 11, 6, INK) +
      rect(ox + 41, oy + 17, 9, 4, '#ffffff') +
      rect(ox + 39, oy + 21, 2, 2, INK) +
      [0, 1, 2].map(i => rect(ox + 42 + i * 3, oy + 18, 1, 2, INK, anim('opacity', '0;1;1;0', '1.5s', ` begin="${i * 0.3}s"`))).join('')
    )
  }
  const rows = GLYPHS[a.activity]
  if (!rows) return ''
  if (a.activity === 'idle') {
    return `<g>${glyph(rows, ox + 41, oy + 12, '#5c6178')}${move('0 3;0 -2', '2.5s')}${anim('opacity', '0;1;0', '2.5s')}</g>`
  }
  const bounce = a.activity === 'wait' ? move('0 0;0 -2;0 0', '0.6s') : ''
  return bubble(ox + 41, oy + 12, glyph(rows, ox + 43, oy + 14, GLYPH_COLORS[a.activity] ?? INK), bounce)
}

// A Gather-style name tag: a dark pill with a status dot.
function tag(cx: number, y: number, label: string, dot: string): string {
  const units = [...label].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e7f ? 5.4 : 3.1), 0)
  const w = Math.ceil(units + 11)
  const x = cx - w / 2
  return (
    `<g shape-rendering="geometricPrecision">` +
    `<rect x="${x}" y="${y}" width="${w}" height="8" rx="4" fill="#1f2130" fill-opacity="0.82"/>` +
    `<circle cx="${x + 4.5}" cy="${y + 4}" r="1.7" fill="${dot}"/>` +
    `<text x="${x + 7.5}" y="${y + 5.9}" font-family="Inter,Helvetica,Arial,sans-serif" font-size="5.2" font-weight="600" fill="#ffffff">${escape(label)}</text>` +
    `</g>`
  )
}

function station(a: AgentView, ox: number, oy: number): string {
  const isGrey = a.activity === 'done' || a.activity === 'failed'
  const creature = creatureOf(a)
  const label = a.label.length > 14 ? `${a.label.slice(0, 13)}…` : a.label
  // Every character stands on the floor in front of the desk, below the
  // screens, centred on the desk.
  const left = ox + 30 - (creature.rows[0]!.length * ZOOM) / 2
  const top = oy + 38 - creature.rows.length * ZOOM

  return (
    `<g${isGrey ? ' opacity="0.6" filter="url(#pa-grey)"' : ''}>` +
    use('pa-desk', ox + 5, oy + 4) +
    screens(a.activity, ox + 12, oy + 5) +
    rect(ox + 21, oy + 37, 18, 2, '#c2c5d0') +
    `<g>${motion(a.activity)}<g transform="translate(${left} ${top}) scale(${ZOOM})">` +
    // The main agent's light rim keeps the orange mascot clear of the dark desk.
    (a.id === 'main' ? use('pa-halo', -1, -1) : '') +
    `${use(`pa-${creature.id}`, 0, 0)}</g></g>` +
    `</g>` +
    icon(a, ox, oy) +
    tag(ox + 30, oy + 50, label, DOTS[a.activity])
  )
}

function wall(w: number, count: number): string {
  const window = (x: number) =>
    rect(x, 5, 32, 18, INK) +
    rect(x + 1, 6, 30, 16, '#5c6178') +
    rect(x + 2, 7, 13, 14, '#8fc9ea') +
    rect(x + 17, 7, 13, 14, '#8fc9ea') +
    rect(x + 4, 8, 2, 6, '#c4e6f7') +
    rect(x + 19, 8, 2, 6, '#c4e6f7')
  const bx = w / 2 - 22
  const clock = bx + 50
  let panels = ''
  for (let x = 0; x < w; x += 24) panels += rect(x, 0, 1, WALL - 3, '#2a2d42')
  return (
    rect(0, 0, w, WALL, '#30334a') +
    panels +
    rect(0, WALL - 3, w, 3, '#1f2133') +
    rect(0, WALL, w, 2, '#b9bcc8') +
    window(8) +
    window(w - 40) +
    rect(bx, 4, 44, 20, INK) +
    rect(bx + 1, 5, 42, 18, '#9aa0b5') +
    rect(bx + 2, 6, 40, 16, '#f4f5f8') +
    rect(bx + 5, 16, 10, 1, '#3d6fd6') +
    rect(bx + 5, 19, 16, 1, '#e5534b') +
    rect(bx + 26, 16, 10, 1, '#3ecf6e') +
    `<text x="${w / 2}" y="12.5" font-family="Inter,Helvetica,Arial,sans-serif" font-size="5.2" font-weight="600" fill="${INK}" text-anchor="middle" shape-rendering="geometricPrecision">${count} agent${count === 1 ? '' : 's'}</text>` +
    rect(clock, 8, 9, 9, INK) +
    rect(clock + 1, 9, 7, 7, '#f4f5f8') +
    rect(clock + 4, 10, 1, 3, INK) +
    rect(clock + 4, 12, 2, 1, INK)
  )
}

export function drawOffice(list: AgentView[]): string {
  const main = list.find(a => a.id === 'main')
  const subs = list.filter(a => a.id !== 'main').slice(-MAX_SUBS)
  const cast = [...new Set([...(main ? [main] : []), ...subs].map(creatureOf))]
  const rows = Math.max(1, Math.ceil(subs.length / COLS))
  const w = M * 2 + COLS * W
  const mainTop = WALL + 6
  const subTop = mainTop + H + 6
  const h = subTop + rows * H + 6
  const rugX = M + W + 2

  const desks = subs.map((a, i) => station(a, M + (i % COLS) * W, subTop + Math.floor(i / COLS) * H)).join('')
  const empty =
    subs.length === 0
      ? `<text x="${w / 2}" y="${subTop + H / 2}" font-family="Inter,Helvetica,Arial,sans-serif" font-size="6" fill="#8a8fa6" text-anchor="middle">no subagents yet</text>`
      : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * S}" height="${h * S}" shape-rendering="crispEdges">` +
    defs(cast) +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#pa-floor)"/>` +
    wall(w, list.length) +
    rect(rugX, mainTop + 2, W - 4, H - 2, '#4f5b8f') +
    rect(rugX + 1, mainTop + 3, W - 6, H - 4, '#6f7fbf') +
    rect(rugX + 3, mainTop + 5, W - 10, H - 8, '#8391cc') +
    rect(rugX + 4, mainTop + 6, W - 12, H - 10, '#6f7fbf') +
    use('pa-plant', M + 10, mainTop + 20) +
    use('pa-plant', w - M - 22, mainTop + 20) +
    (main ? station(main, M + W, mainTop) : '') +
    desks +
    empty +
    `</svg>`
  )
}
