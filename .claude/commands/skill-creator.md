# Skill Creator

Create skills for both Claude Code and Cursor IDE simultaneously.

---

## Dual-platform output (IMPORTANT)

Every skill MUST produce artifacts for both platforms:

| Platform    | Location                          | Format                    |
| ----------- | --------------------------------- | ------------------------- |
| Cursor IDE  | `.cursor/skills/<name>/SKILL.md`  | YAML frontmatter + body   |
| Claude Code | `.claude/commands/<name>.md`      | Markdown (no frontmatter) |

The Cursor `SKILL.md` is the **source of truth**. The Claude Code command is a **flattened adaptation**: same instructions, no YAML, no Cursor-only features (subagents, eval-viewer), Cursor paths adjusted. When `references/` or `scripts/` exist, inline critical content or point to `.cursor/skills/<name>/`.

When updating an existing skill, update **both** files.

---

## The loop

1. Decide what the skill does and how
2. Draft → run test prompts → evaluate → improve → repeat
3. Optionally optimize the description for better triggering

Figure out where the user is in this loop and jump in there.

---

## Creating a skill

### Capture intent

1. What should this skill enable Claude to do?
2. When should it trigger?
3. Expected output format?
4. Test cases? (Default yes for verifiable outputs.)

### Interview

Ask about edge cases, I/O formats, example files, success criteria, dependencies.

### Components to include

Default-include When NOT to use, Pre-flight, Exit criteria. Add as fits:

| Component         | When                                          |
| ----------------- | --------------------------------------------- |
| When NOT to use   | Could be confused with another skill          |
| Pre-flight        | Uses MCPs, env vars, external deps            |
| Exit criteria     | Always — prevents premature completion        |
| Quality bar       | Verifiable outputs                            |
| Anti-patterns     | Costly mistakes (security, data loss)         |
| Output format     | Reports, structured data                      |
| Error handling    | External APIs / MCPs / scripts                |
| Examples          | Format or style matters                       |

### Key frontmatter / body fields

- **name**, **description** — description is the trigger. Include both *what* and *when*. Be a bit "pushy" — Claude tends to undertrigger.
- **method** — required (see template).
- **phase tool specification** — required for multi-phase: every phase has a `**Tools:**` line.

### Minimal skill template

```markdown
---
name: example-skill
description: [What it does]. Use when user says [trigger phrases].
---

# Example Skill

## Method

`example-skill [param]` — When user says "example-skill do X", execute with X.

## When NOT to use

- [Adjacent task that needs a different skill]

## Pre-flight

- [Verify prerequisites]

## Instructions

1. Parse the user's message for `[param]`
2. [Steps]
3. [Output format]

## Exit criteria

- [What to return / confirm when done]
```

Save Cursor file to `.cursor/skills/<name>/SKILL.md`.

### Flattening to the Claude Code command

From the Cursor SKILL.md:
1. Remove YAML frontmatter.
2. Remove Cursor-only references (subagents, eval-viewer, `.skill` packaging).
3. Inline critical content from `references/`, or point to `.cursor/skills/<name>/references/`.
4. Keep all instructions, phases, patterns, examples.

Save to `.claude/commands/<name>.md`.

### Directory layout

```
.cursor/skills/<name>/           ← source of truth
├── SKILL.md
├── scripts/        ├── references/
├── evals/          └── assets/

.claude/commands/<name>.md       ← flattened mirror
```

### Writing style

Explain *why* instead of stacking MUSTs. LLMs respond to reasoning. Draft, then revise with fresh eyes.

### Quality checklist

- [ ] Method section (≥1 method line)
- [ ] Phase Tools spec (multi-phase)
- [ ] When NOT to use
- [ ] Pre-flight (if external deps)
- [ ] Exit criteria
- [ ] Error handling (API/MCP/script skills)
- [ ] Examples (non-trivial skills)

### Test cases

2-3 realistic prompts. Share with user, get approval, save to `evals/evals.json`.

---

## Running and evaluating

1. **Run** — with-skill + baseline (no skill, or old version) for each case.
2. **Draft assertions** while runs are in progress.
3. **Grade** — evaluate each assertion against outputs.
4. **Aggregate** into benchmark data (mean ± stddev, delta).
5. **Review with user** — qualitative feedback drives the next iteration.

---

## Improving the skill

1. **Generalize**, don't overfit a few examples.
2. **Keep it lean** — cut what isn't pulling weight; read transcripts, not just outputs.
3. **Explain the why** — reasoning beats rigid MUSTs.
4. **Bundle repeated work** — if every test case wrote the same helper, put it in `scripts/`.

### Iteration loop

Apply → rerun all cases → review → repeat. Stop when user is happy, feedback is empty, or progress stalls.

---

## Updating an existing skill

- **Preserve the original name** — directory + `name` frontmatter unchanged. No `-v2`.
- **Copy to a writeable location before editing** — installed paths (e.g., `~/.claude/plugins/marketplaces/...`) are often read-only. Copy to `/tmp/<skill-name>/`, edit there, write back.
- **If direct writes fail**, stage in `/tmp/` first, then copy out.
- **Always update both files** to keep the dual-platform mirror in sync.

---

## Description optimization

After the skill is solid, tune `description` for triggering:

1. Generate 20 eval queries (8-10 should-trigger + 8-10 should-not-trigger; should-not-trigger should be near-misses, not obvious irrelevant queries).
2. Review with user.
3. Run optimization loop (splits eval 60/40 train/test, iterates ≤5×, returns `best_description`).
4. Update SKILL.md frontmatter with the best description; show before/after.
