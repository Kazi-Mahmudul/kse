# `.claude/` — Claude Project Files

Persistent, checked-in context maintained by Claude across sessions. `CLAUDE.md` at the repo root is auto-loaded every session; the files here are read/maintained per the protocol below.

| File | Purpose | When updated |
|---|---|---|
| `MEMORY.md` | Project state: status, decisions, gotchas, environment facts | Every substantive session |
| `AGENT.md` | Operating procedure for agents in this repo (checklists, invariants, commands, git rules) | When workflow/rules change |
| `SKILLS.md` | Repeatable playbooks for common tasks in this repo | When a new workflow repeats |
| `TESTS.md` | Test strategy, commands, coverage status | When tests change |

Note: `apps/mobile/.claude/settings.json` separately enables the Expo Claude plugin — unrelated to these docs.

## Protocol

1. **Start of session:** read `MEMORY.md` (and `TESTS.md`/`SKILLS.md` when relevant to the task).
2. **During/after work:** append new decisions, gotchas, and status changes. Never rewrite history.
3. **Specs live in `CLAUDE.md`** — these files record state and workflows, not architecture. If architecture changes, update `CLAUDE.md` too.
4. **Conflicts:** `CLAUDE.md` wins over anything here.
