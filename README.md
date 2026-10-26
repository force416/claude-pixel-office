# claude-pixel-office

`pixel-office` is a Claude Code mod that shows the agents of your session as pixel characters
working in a small office, in a pane beside the chat.

<img src="docs/office.png" alt="The pixel office: Claude's mascot at the main desk, twelve creatures at their desks below, each screen showing what its agent is doing" width="384">

*A static render of the office with every creature. The pane also draws
name tags, animates the characters and keeps an activity log below.*

- The main agent is Claude's orange mascot, at its own desk on a rug.
- Two boards stand beside the main desk: CONTEXT shows how full the context
  window is, and USAGE shows the session (five-hour) and weekly rate limits
  with when each resets. They refresh after each of the main agent's model
  responses.
- Each subagent gets one of twelve original pocket creatures and a desk of
  its own, picked by its id.
- What a character does follows its tool calls: code on screen while it
  edits, a document while it reads, a terminal while it runs a command, a
  browser on the web, an org chart while it delegates. It hops while it
  works, jumps with a red `!` while it waits for your permission, and turns
  grey when it is done.
- Below the office, an activity log keeps the last 200 tool calls, 20 to a
  page. Each row opens to show the call's arguments: a Bash command as shell,
  anything else as JSON. Common secret shapes (bearer tokens, `--password`,
  `sk-…`/`ghp_…` keys, `user:pass@` in URLs) and fields named like
  `password`, `token` or `api_key` are masked first. The masking is best
  effort, and only arguments are shown, not results.

The office is drawn as SVG on the desktop app, the VS Code extension and the
mobile app; the terminal shows a text list instead.

## Install

At the prompt of a terminal session:

```
/plugin install pixel-office --marketplace force416/claude-pixel-office
```

Answer `y` to add the marketplace, then pick a scope (user is first).

From a shell:

```
claude plugin install pixel-office --marketplace force416/claude-pixel-office
```

In the desktop app, where `/plugin` does not run: click + next to the prompt
box, then Plugins, Add marketplace with `force416/claude-pixel-office`, then
Add plugin.

The pane opens when a session starts. If you close it, run `/pixel-office`.

The plugin is named `pixel-office` rather than `claude-pixel-office` because
plugin names starting with `claude-` are kept for Anthropic's own plugins.

## Notes

- Claude's mascot belongs to Anthropic; the twelve creatures are original.
- The mod reads only this session's own events. It sends nothing anywhere.
