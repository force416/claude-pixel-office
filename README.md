# pixel-agents

A Claude Code mod that shows the agents of your session as pixel characters
working in a small office, in a pane beside the chat.

<img src="docs/office.png" alt="The pixel office: Claude's mascot at the main desk, twelve creatures at their desks below, each screen showing what its agent is doing" width="384">

*A static render of the office with every creature. The pane also draws
name tags, animates the characters and keeps an activity log below.*

- The main agent is Claude's orange mascot, at its own desk on a rug.
- Each subagent gets one of twelve original pocket creatures and a desk of
  its own, picked by its id.
- What a character does follows its tool calls: code on screen while it
  edits, a document while it reads, a terminal while it runs a command, a
  browser on the web, an org chart while it delegates. It hops while it
  works, jumps with a red `!` while it waits for your permission, and turns
  grey when it is done.
- Below the office, an activity log keeps the last 200 tool calls, 20 to a
  page. A Bash row opens to show its command, with common secret shapes
  (bearer tokens, `--password`, `sk-…`/`ghp_…` keys, `user:pass@` in URLs)
  masked first. The masking is best effort.

The office is drawn as SVG on the desktop app, the VS Code extension and the
mobile app; the terminal shows a text list instead.

## Install

At the prompt of a terminal session:

```
/plugin install pixel-agents --marketplace force416/claude-pixel-office
```

Answer `y` to add the marketplace, then pick a scope (user is first).

From a shell:

```
claude plugin install pixel-agents --marketplace force416/claude-pixel-office
```

In the desktop app, where `/plugin` does not run: click + next to the prompt
box, then Plugins, Add marketplace with `force416/claude-pixel-office`, then
Add plugin.

The pane opens when a session starts. If you close it, run `/pixel-agents`.

## Notes

- Claude's mascot belongs to Anthropic; the twelve creatures are original.
- The mod reads only this session's own events. It sends nothing anywhere.
