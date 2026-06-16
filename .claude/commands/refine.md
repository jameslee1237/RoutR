---
name: refine
description: Raw NL prompt → structured brief → phased execution (Plan→Dev→Commit→PR Review) with approval gates. Trigger via `/refine`, "refine / frame / shape / tighten / structure", or session mode.
---

# Refine

Raw NL prompt → compact brief → phased execution with approval gates. Net-saves tokens by preventing wrong-target dives, scope creep, and mid-task corrections.

## Flags

| Flag | Values | Effect |
| --- | --- | --- |
| `--refine-session` | `on` / `off` | Toggle session mode (auto-refine subsequent prompts) |
| `--mode` | `plan-only` / `edit-allowed` | Pre-answer code-change-mode |
| `--translate` | `on` / `off` | Render brief in English |
| `--target` | `<path or component>` | Override inferred target when ambiguous |
| `--top` | `<integer>` | Cap research/audit ranked results |
| `--restrict` | `<comma list>` | Add user restrictions (e.g. `no-test-changes,no-deps-bump`) |

Flags appear after the prompt. Quote spaced values. Unknown flag → one-line report and ignore.

**Examples** — `/refine fix dropdown blur bug` · `/refine fix X --mode=edit-allowed --translate=off` · `/refine session-on` (shorthand, no prompt) · `/refine implement vehicle skill --refine-session=on` (refine + enable session)

## Session mode

`/refine session-on` (≡ `--refine-session=on`) auto-refines every subsequent prompt without the prefix. `session-off` disables.

- **Auto-skip trivial.** Apply "When NOT to use" silently — no skip announcement (would defeat savings).
- **Inherit prior choices.** First task's mode/translation apply to subsequent tasks. Re-ask only on ambiguous target.
- **Approval gate stays.** Brief always shown before Phase 1.
- **Per-message override.** `raw:` prefix bypasses for that one message. Per-message flags override inherited defaults.
- **Volatile.** New Claude Code session = OFF. For persistence, use a `settings.json` hook (out of scope).

State change ack in one line ("session mode on/off"). Don't re-emit rules.

## When NOT to use

Single-step lookups · trivial one-line edits · conversation / brainstorm / clarification · already-structured prompts (target/scope/mode explicit).

On trivial input: one-line note "small enough, proceeding" and skip refinement.

## Phase 0 — Parse + clarify + brief

**0.1 Parse (silent)** — language (ko/en/mixed) · task count (distinct goals) · target hints (paths, components, domain words) · action verbs (fix/add/refactor/review/explain) · scope (single vs cross-cutting) · ambiguity.

**0.2 Clarification batch (1 round-trip, ≤3 questions)** — skip any answered by input, flag, or session inherit. Possible:
- **Mode** — plan-only / edit-allowed (skip if `--mode=`)
- **Translation** — keep original / English (skip if `--translate=`)
- **Target** — only if input is ambiguous AND no `--target=`

Defaults apply to anything else (see table). With well-formed flags: 0 questions.

**0.3 Brief** — exact format, bullets not prose:

```
## Refined Brief
**Goal:** <one sentence, imperative>
**Target:** <paths or component names>
**Mode:** plan-only | edit-allowed
**Restrictions:** minimum-change, no-refactor, no-scope-creep [+ user]
**Parallel agents:** none | <only if required>
**Phases:**
1. Plan — <one-line deliverable>
2. Dev (checkpoints) — <sub-tasks, one line each>
3. Commit — <subject draft>
4. PR Review — <CodeRabbit triage / open PR / skip>

[if translated] **Translated brief:** <English, terse>
```

End: "Approve to proceed with Phase 1, or edit any field."

**If brief > input length, retry terser. Treat as failure otherwise.**

## Phase 1 — Plan (always)

Numbered plan: files to touch · files to avoid · risks · verification step. End: "Approve to start Phase 2 (dev), or revise."

> 파일 탐색 중 1500줄+ 소스 파일이 있으면 `.cursor/rules/large-file-reading.md` 를 `Read` 후 전략 적용.

## Phase 2 — Dev (edit-allowed only)

Per sub-task: edit → one-line "done: <change>" → "continue?". Skip prompt on last sub-task → flow into Phase 3. Unrelated issue surfacing → **Follow-ups** block, do not chase.

## Phase 3 — Commit

Staged diff summary + drafted commit message → on approval, commit. Honor CLAUDE.md conventions and git safety (no `--no-verify`, no main force-push).

## Phase 4 — PR Review

User picks: **1) push + open PR · 2) CodeRabbit triage · 3) skip**.

**1) Open PR**
- Target branch: ask if unspecified, default `develop` (never `main`). `gh pr create --base <branch>`.
- **PR Title:** 브랜치 이름을 그대로 대문자로. `feature/TECH-613` → `FEATURE/TECH-613`. 커밋 메시지 형식 사용 금지.
- Body Korean by default (code identifiers stay English). Prefer `## 요약` / `## 테스트` over English headers.
- `gh` 401 typically = stale `GITHUB_TOKEN` env var. Prepend `GITHUB_TOKEN= ` (trailing space, clears for one invocation) instead of `gh auth login`. Don't reconfigure user auth.

**2) CodeRabbit triage**
- Filter out before triaging: `Outside diff range comments` (opinions on unchanged code) and `🟢 Nitpick` / `Nitpick comments` (don't block merge).
- Triage only **actionable, in-diff** comments: `🔴 Critical` / `🟠 Major` / `🟡 Minor` tagged `⚠️ Potential issue` or `🛠️ Refactor suggestion`.
- Verify each finding against current code. Skip stale with a brief reason; never blindly apply.
- Parallel agents: **one agent = one comment = one file** (collision-free).

## Multi-task input

≥2 distinct goals → numbered list + "Run as a chain (each full Plan→PR) or pick one?". Never interleave tasks across phases.

## Ticket description compact format

For completed/merged tickets: see [`ticket-admin-view.md`](ticket-admin-view.md).

## Defaults (silent fallback)

| Field | Default |
| --- | --- |
| Mode | ask once |
| Translation | ask once |
| Restrictions | minimum-change, no-refactor, no-scope-creep |
| Parallel agents | none |
| Phases | plan → dev → commit → PR |
| Diff budget | pause if > 10 files OR > 300 lines |
| Follow-ups | `Follow-ups` block in final summary |
| PR target branch | ask once at Phase 4; default `develop` |
| PR language | Korean (code identifiers English) |
| Description rewrite | only on 완료/merge OR explicit user request |

## Anti-patterns

- One-liner → 4-phase plan (overhead > savings — skip refinement)
- Spawning parallel agents when the brief didn't require them
- Skipping approval gate and jumping into edits
- Brief longer than input
- Starting Phase 2 before Phase 1 approval
- Editing files outside **Target** (→ log to Follow-ups)
- Re-asking the same clarification per checkpoint
- > 3 clarification questions in one batch

## Quality bar (self-check before showing brief)

- Brief ≤ input length
- Target = actual paths/components (not generic words like "the drawer")
- Phases ordered, each with a one-line deliverable
- Default restrictions present unless overridden
- No parallel-agent line unless explicitly required
- ≤ 3 questions, single round-trip

## Exit

- **plan-only:** brief delivered → exit
- **edit-allowed:** approved phases complete → exit
- **interrupted:** state preserved; resume with "continue phase N"

## Examples

**KR-mixed, single task, ambiguous target**
input: "In vehicle drawer, when error message is shown the 주소 text goes to center, but I want it aligned at top"

```
## Refined Brief
**Goal:** Top-align 주소 label when address input shows an error
**Target:** src/components/vehicle/molecules/depotAddressSection/index.tsx (+ styles.css.ts)
**Mode:** edit-allowed
**Restrictions:** minimum-change, no-refactor, no-scope-creep
**Parallel agents:** none
**Phases:**
1. Plan — diagnose row alignment, propose 1-line flex change
2. Dev — apply, verify error and no-error states
3. Commit — `fix: top-align depot address label when error visible`
4. PR Review — skip (small fix)
```

**EN, two tasks** — input: "Add disabled visual to sort icon when nearbyBaseOrderId set; also revert if too invasive."
→ "Two distinct tasks (add visual / decide revert). Chain or split? Default: split — implement first, decide revert after diff. Confirm?"
