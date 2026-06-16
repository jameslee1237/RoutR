---
name: prepare
description: JIRA 티켓 → TDD-ready plan.md. Atlassian fetch → blocker/Figma fetch (필수) → AC/INV 도출 → Impact Inventory grep → plan 파일 생성. Triggers: "/prepare RP-1234", "prepare RP-1234", "RP-1234 준비해줘", "plan 만들어줘".
---

# Prepare

Planning layer: JIRA 티켓 → plan.md. **코드는 쓰지 않는다** (augmented-coding 영역).

```
designer → frontend ticket → [prepare] → plan.md → augmented-coding → diff → pr → review
```

<HARD-GATE>
1. `src/**` 절대 touch 금지 — plan 파일만.
2. AC/INV/수치/quoted strings/file paths paraphrase 금지 — verbatim 또는 keep.
3. Write 후 즉시 exit — augmented-coding auto-chain 금지.
</HARD-GATE>

## Anti-Pattern: Fetch 생략 → 티켓 제목으로 추측

요약만 있는 티켓 → AC를 제목에서 유추하고 싶은 충동. **항상 fetch 먼저.** 2줄 설명에도 제목 추측이 놓치는 invariant 가 있다. Fetch 비용: ~1k 토큰. 추측 후 수정 비용: ~10k+.

흔한 변형: (1) Impact Inventory 생략 ("단순 기능") → Phase 4 항상 수행. (2) 5개 기준 미충족에 §11 multi-agent emit → threshold 재확인.

## Method

`/prepare <KEY> [flags]`

| Flag | Effect |
| --- | --- |
| `--specs-path=<path>` | Spec 위치. Default `documents/specs/`. `=skip` 으로 비활성. |
| `--areas=<list>` | FEATURE_INDEX target 영역 override |
| `--skip-root-cause` | bug 티켓도 §4.1 skip |
| `--force` | 기존 plan overwrite |
| `--force-large-plan` | > 12 파일 / > 300 LoC 캡 override |
| `--dry-run` | 파일 미작성, conversation 표시 |
| `--no-plan-mode-warning` | self-elevate skip, Path B 직접 |

**Invocation modes:** (1) self-elevate via `scripts/auto.sh p` (default), (2) `./scripts/auto.sh p <KEY>` 직접, (3) `--no-plan-mode-warning` Path B. Detail: `references/plan-mode.md`.

**Announce:** `"prepare 스킬 실행 중 — {KEY} JIRA 티켓 fetch → plan.md 생성."`

## Pre-flight

| Step | Check |
| --- | --- |
| 0 | Plan mode detect → self-elevate. Detail: `references/plan-mode.md` |
| 1 | `FEATURE_INDEX.md` exists + ≤30일. Stale → prompt `index-codebase` (no 시 진행 + accuracy degrade 경고) |
| 2 | `mcp__atlassian__getJiraIssue` callable (아니면 abort) |
| 3 | Plan path writable; 이미 존재 + `--force` 없으면 `이미 존재합니다. overwrite? (yes/no/diff)` prompt |

## Remember

- `issuelinks` 명시 fetch + shape gate — 빈 `[]` 정상, 키 부재 시 재호출
- AC/INV/수치/paths/quoted strings — verbatim 또는 keep; paraphrase = 위반
- 모든 derived item → `[INFERRED]`; STRUCTURED_INGEST = `[INFERRED]` 없음
- Write 후 exit — augmented-coding auto-chain 금지

## Pipeline

### Phase 1 — Fetch + refine

**1.1 `getJiraIssue`** — `fields: [summary, description, issuetype, status, parent, labels, fixVersions, assignee, issuelinks, attachment]` **MANDATORY**. Response-shape gate: `issuelinks` 키 부재 시 즉시 재호출. 빈 `[]` 은 정상. Attachment-only 티켓은 plan 에 `> ⚠️ Manual review needed` 추가. **Trigger gate:** `inward == 'is blocked by'` 키 수집 → ≥1건 → 1.1b 의무.

**1.1b Blocker fetch** (1-hop, MANDATORY when ≥1) — `references/blocker-fetch.md`.

**1.1c Figma fetch** (MANDATORY when `figma.com/(design|file|proto)/...` URLs present in primary or blocker bodies) — `references/figma-fetch.md`.

**1.1c-nav Navigation instance fetch (MANDATORY when 진입 경로·entry point 미확정):** 티켓 description 또는 협의사항에 "진입 경로 미확정", "LNB 메뉴 구조 내 위치 확인 필요", "어디서 접근하는지 TBD" 등이 명시된 경우, Figma section/frame 안에서 name 에 `menu`, `nav`, `LNB`, `GNB`, `popup`, `drawer` 가 포함된 인스턴스를 식별하고 `get_design_context` 를 추가 호출한다. 진입 경로 미확정은 "나중에 확인"이 아니라 "Figma에 답이 있다"는 신호이다. 누락 시 plan §0 `Confirmed target` 에 잘못된 진입점이 기록되어 augmented-coding 이 wrong component 를 수정하는 마찰이 발생한다.

**1.2 Refine (lossless).** Front-matter shortcut for `documents/specs/*.md` (YAML `---` block) — verbatim 복사, no `[INFERRED]`:

| Field | → plan § |
| --- | --- |
| `acceptance_criteria` | §2 |
| `invariants` | §3 |
| `thresholds` | §2/§3/§9 numeric ref |
| `api` | §6 (skip 4.7 grep) |
| `errors` | §2 negative AC |
| `out_of_scope` | §13 |
| `master_refs` | §0 명세 출처 |
| `code_anchors` | §4 primary targets (FEATURE_INDEX override) |

빈 필드는 legacy fallback (spec §수용 기준 verbatim → §유저플로우 G/W/T derive → ticket desc). Schema: `documents/specs/SCHEMA.md`.

**Lossless rule (hard invariant):** AC G/W/T + 불변 조건 + 수치 임계값 + quoted strings + file paths + code identifiers + error msgs + cross-ref ticket keys **keep verbatim**. 인사말 / 중복 / 과도 강조 / Atlassian markup / 정보없는 image caption / Slack/Confluence quote chain / status timestamp **strip**. 의심되면 keep. Refined body 는 plan 본문 미첨부 — §0 source URL 한 클릭 거리.

**1.3 Plan type classify:**

| Type | Heuristic |
| --- | --- |
| bug-fix | issuetype ∈ {Bug, Hotfix}; OR "버그/수정/fix/회귀/regression/broken/doesn't work" |
| refactor | "리팩토링/refactor/정리/단순화/통합" (no behavior change); OR `[리팩토]` prefix |
| feature | default |

다중 매칭 → bug-fix 우선. §0 `Plan type:` 기록.

**1.4 STRUCTURED_INGEST detect** (merged-handoff): S1 (`[BE]`/`[FE]` prefix) + (S2 Canonical OR S3 RP-5873) → true. S4 (`불변 조건` + ≥3 G/W/T) = 보조 신호 (필수 아님). `references/structured-ingest.md`.

### Phase 2 — Root cause (bug only)

Skip if `--skip-root-cause` OR issuetype ∈ {Story, Feature}. 단계: extract symptom → trace data flow (parallel grep, cap 50/query) → 1-3 candidates with file:line evidence → verify+lock → §4.1 row. 미확정 시 `미확정 — augmented-coding이 첫 Phase에서 검증 필요` + Step 7.2 신뢰도 `medium-confidence`.

### Phase 3 — Derive AC + Invariants

**AC:** front-matter `acceptance_criteria` (verbatim, no `[INFERRED]`) → spec §수용 기준 verbatim → §유저플로우 G/W/T derive (`Given`=flow start precondition, `When`=trigger, `Then`=end state) `[INFERRED]` → ticket description + Jira 수용기준 field → summary + parent context, 전부 `[INFERRED]`.

**Skill-field / form-reset / `isDirty` 4-case AC matrix (MANDATORY shape):**
1. **Value present** — non-null + parent id 존재
2. **Value null + parent id 존재** — sibling 필드 fallback 금지 (preserve boundary)
3. **Value null + no parent id** — empty UI / disabled
4. **Post form reset / drawer re-nav** — 값 보존, no derive-from-sibling on reset

Inapplicable case 는 `해당 없음 — {reason}` row 유지 (4-row shape 가 contract). `Min AC/INV ≥3` 룰을 대체하지 않고 **shape** 요구만 추가.

**INV:** front-matter `invariants` (verbatim, no `[INFERRED]`) → 키워드 스캔: "절대", "어떤 상황에서도", "항상", "보장", "변경되지 않는다", "유지" → candidate; "기존 시그니처 유지", "공개 API 무변경", "호환성 보장" → API contract invariant; 음성 케이스 / negative description → behavior invariant. 3-7개 권장. <3 → 사용자 review flag (`불변 조건이 적습니다 ({N}개)`).

### Phase 4 — Impact Inventory (plan §9)

| Step | What | → § |
| --- | --- | --- |
| 4.0 | Confirmed target lock (단일 path 또는 abort) + Siblings | §0 |
| 4.1 | FEATURE_INDEX + spec `code_anchors` → primary target set | — |
| 4.2 | Component variants | §9.1 |
| 4.3 | Usages (cap 50/query) | §9.2 |
| 4.4 | Recipe / storybook / tests | §9.3 |
| 4.5 | Cross-repo (`@wemeetdev/*`) | §9.4 |
| 4.6 | Known pitfalls (`augmented-coding/references/known-pitfalls.md` 매칭) | §9.5 |
| 4.7 | API contract (spec `api` > grep) | §6 |
| 4.8 | Consolidated write set (+ `src/tests/{mirror}` rows) | §9.6 |

각 매칭 없음 → `해당 없음` + 이유 1줄.

**Step 4.0 abort logic:** ≥2 candidates → 티켓 재읽기 (단서: 상세/모니터/편집/그룹/추천) + FEATURE_INDEX disambig notes. 여전히 ambiguous → §0 `Confirmed target: 미확정` 마킹 + abort with list-and-ask prompt. Siblings list → augmented-coding 의 Out-of-Scope guard (§7 Sibling-file 잠금).

**Step 4.1 nuance:** spec `code_anchors` preferred (override FEATURE_INDEX 매칭). Path 미존재 시 FEATURE_INDEX fallback + "spec ↔ code drift" 를 Step 7.2 신뢰도 degrade. FEATURE_INDEX 는 항상 수행 — component / API (nested 가능) / store / hooks path pull, naming inconsistency 양쪽 read, entry-point briefly read, bug 시 root cause file cross-check.

**Step 4.7 nuance:** spec `api` array → verbatim 복사 + `재사용` / `신규` 태깅 (spot-grep). Fallback: `src/api/{area}/api.ts` grep.

**Step 4.7 reuse-first rule:** `재사용` vs `신규` 판정 시 **재사용을 default** 로 설정한다. `신규` 태깅은 다음 조건 중 하나 이상이 성립할 때만 허용: (a) endpoint 자체가 다름, (b) 기존 함수 시그니처 수정이 downstream breaking change 를 유발, (c) 기존 함수에 없는 완전히 새로운 인증 방식. **같은 endpoint 에 payload 필드 추가·제거·이름 변경 수준이면 재사용 + 호출처에서 보완**이 원칙이다. Figma 가 "기존 플로우와 동일" / "동일한 플로우" 를 명시하면 기존 API 재사용을 더욱 강하게 default 로 설정 — blocker 티켓의 payload description 이 달라 보여도 Figma 플로우 일치 판정이 우선한다.

**Step 4.7 reuse-first mandatory grep (HARD GATE — `신규` 태깅 전 반드시 수행):** `신규` 라고 판정하려는 순간, 다음 grep 을 실행하고 결과를 plan §6 에 증거로 남긴다. grep 없이 `신규` 태깅 = invalid.

```bash
grep -rn 'endpoint/path' src/api/ --include="*.ts"
# 예: grep -rn 'api/v1/users/password' src/api/ --include="*.ts"
```

- 결과 0건 → `신규` 허용
- 결과 ≥1건 → **재사용 재검토 의무**. 기존 함수를 그대로 호출할 수 있는가 (`{ email, password }` 같은 파라미터를 호출처에서 공급)? 가능하면 `재사용`. 불가능하면 (a)/(b)/(c) 중 해당 조건을 §6 비고에 명시하고 `신규` 태깅.
- **⚠️ 흔한 오류:** "인증 방식(Bearer token vs one-time token)이 다르다" → `API` 클라이언트가 Bearer token 을 자동 처리하므로 이것은 함수 레벨 차이가 **아님**. 호출처에서 email 을 store/context 에서 가져올 수 있으면 기존 함수 재사용이 정답.

**Step 4.7c Param source trace (MANDATORY when optional/ALL-mode params ≥1):** §6 표에 모드 제한(`ALL` 전용) 또는 optional 인 파라미터가 ≥1개 존재하면: §9.6 write set 의 타깃 컴포넌트·훅에서 해당 파라미터를 공급하는 필터 스토어·훅·로컬 변수를 grep 역추적 → `파라미터명: 소스_변수명 (from 스토어/훅명)` 매핑 테이블 생성. 이 매핑을 §5 데이터 흐름과 §8 해당 mutation 태스크 본문에 직접 인라인. **`...currentFilter`, `...params` 등 spread 축약 금지** — 파라미터·소스 변수를 명시적으로 전체 열거.

**Step 4.7b UI cross-ref (MANDATORY when Figma extract 존재):** Step 4.7 에서 수집한 API 응답 필드·에러 코드·enum value 각각을 Step 1.1c `{FIGMA_EXTRACTS[]}` 의 visible text / state name 과 매칭한다. 매핑 결과를 §6 표 `UI 매핑` 컬럼에 기록:

| BE 항목 | Figma 매핑 | §6 컬럼 표기 | §2/§5 분기 |
| --- | --- | --- | --- |
| Response field 가 Figma 텍스트로 직접 노출 | YES | "Figma: {extract}" | §2 AC "Then" 절 verbatim |
| Response field 가 UI 상태 트리거 (e.g. `isEmpty` → empty state) | YES (state) | "Figma state: {name}" | §5 / §2 AC |
| Response field 가 어디에도 매핑 없음 (e.g. `failReason` enum) | NO | `UI 미노출 — BE 계약만` | **emit 금지** |
| 에러 코드 — Figma 에 별도 모달/카피 | YES | "Figma: {modal nodeId}" | §2 AC 분기 emit |
| 에러 코드 — Figma 에 동일 fail UI | NO 분기 | `UI 통합 처리 (단일 fail UI)` | **분기 emit 금지** |
| Variant 별 색상·typography·spacing 토큰 차이 (예: 부분 실패 modal vs 전체 실패 modal — 같은 `ic_alert-fill` 인데 `Secondary/Red200` vs `GrayScale/Gray500`) | YES (token diff) | "Figma token diff: {nodeId 별 토큰 키 verbatim}" | §7 카피·토큰 룰에 **노드별 분기** verbatim 매핑 |

Figma fetch `[fetch-failed: *]` 인 경우 모든 BE 항목을 `[NEEDS-FIGMA-VERIFY]` 로 표기 + augmented-coding Phase 5.4 사용자 확인 게이트 트리거 (§7 ticket-특화 룰에 명시).

> **다중 노드 토큰 diff 의무 (≥2 노드 fetch 시)** — 각 노드의 `get_variable_defs` 결과를 노드별로 분리 보관 → diff. 동일 컴포넌트(같은 `ic_*` / 같은 `Button/Primary`) 라도 variant 별 색상이 다를 수 있다 — 컴포넌트 동일성 ≠ 토큰 동일성. 절차 및 사례: `references/figma-fetch.md` "다중 노드 토큰 diff" 섹션. 발생 사례: TECH-509 (사후 보정 PR #2912).

**Step 4.8 nuance:** 4.1-4.4 결과 aggregate. `src/tests/{mirror}/*.test.ts` `new` rows 포함 ("augmented-coding 작성 영역" 비고). §9.2-9.5 참고 인벤토리에만 등장하는 미수정 파일은 §9.6 제외.

### Phase 5 — Agent strategy

**Default = single-agent.** Multi-agent only ALL: ≥4 독립 파일 (shared types 미수정) + 각 agent scope ≥30% reduction + 공유 Zustand/fixture 미수정 + 총 diff ≥150 LoC + agent count ≤5. Multi-agent → §11 emit; else 섹션 생략.

### Phase 6 — Build plan.md

Use `templates/plan-template.md`. **조건부 섹션** (생략 가능): §1 (§4.2 부족 시), §4.1 (bug only), §5 (비자명 flow), §11 (multi-agent), §13 (잔여 OOS/마커). **삭제 섹션** (DO NOT emit): §10 신뢰성/확장성/유지보수성, 부록 A, 부록 B (augmented-coding 미소비, JIRA URL 로 원본 1-click 접근).

STRUCTURED_INGEST=true → ticket §1-§14 verbatim 복사 per `references/structured-ingest.md` mapping; `[INFERRED]` 미부착. Phase 4.7 grep fills, Phase 4 inventory, synthesized §4.2 entries 는 verbatim 외이므로 `[INFERRED]` 부착.

**`[INFERRED]` 태그**: AC titles (`### AC-3 — ... [INFERRED]`), Invariants, §6 API rows, §9.6 file entries.

**Standard filling order:**
1. §0 (개요, 선행 의존 라인, Figma URL 있으면 §0/§7 인라인)
2. §1 *(선택)* — AS-IS↔TO-BE 가 §4.2 만으로 부족 시 3 bullets 이내
3. (parallel) §2 AC, §3 Invariants
4. §4.1 Root Cause — bug 만
5. §4.2 아키텍처 결정
6. §5 *(선택)* — 비자명 async/state-machine/cross-thread 시만. **pseudo-code 에 `...spread` 축약 금지** — Step 4.7c 매핑 결과를 바탕으로 모든 파라미터와 소스 변수를 명시적으로 열거.
7. (parallel) §6 API, §9.1-9.6 Inventory
8. §7 Restrictions (defaults + ticket-특화 + Figma 카피·토큰 룰)
9. §8 구현 태스크 (TDD flow — test → impl → next. Jest 코드는 augmented-coding 작성). **`mutateAsync`/`mutate` 호출이 포함된 태스크는 "§5 데이터 흐름 그대로" 위임 금지** — §6 파라미터 표 + Step 4.7c 소스 매핑을 태스크 본문에 직접 나열. 예: `SELECTED: { requestType, dispatchIds } / ALL: { requestType, keyword(searchValue), dispatchStatus, ... }`
10. §11 *(선택, multi-agent 시만)*
11. §12 DoD — AC count + INV count + tsc + file-list match. **No pnpm build/lint.**
12. §13 *(선택)* — §0 Siblings / §9.6 / §7 로 표현 불가한 OOS / 마커만

### Phase 7 — Output

**Path:** `.cursor/skills/plans/{KEY}-plan.md`

- IN_PLAN_MODE=true → `ExitPlanMode(plan)` → 승인 → `Write`. Headless (`-p`) 는 harness auto-handle.
- IN_PLAN_MODE=false → 직접 `Write`.
- `--force` 없고 file 존재 시 overwrite-confirmation prompt 먼저.

**Report (Step 7.2):**
```
Plan generated: .cursor/skills/plans/{KEY}-plan.md
- 티켓: {KEY} ({type}) · AC: N개 ({inferred} 추론) · INV: N개 · 변경 파일: N개 · 에이전트: {single|multi (N=K)} · 신뢰도: {high|medium|low}
- 다음 단계: 사용자 plan 검토 + [INFERRED] 확인 → `augmented-coding`
```

**Hard boundary:** plan 작성 후 exit. `augmented-coding` 자동 chain 금지 (auto 스킬 영역). Auto-stage / commit / push 금지.

---

## Hard invariants

- **Lossless refining** — AC/INV/수치/file path/quoted string/error msg paraphrase 금지
- **No code edits** — `src/**` 절대 touch 금지
- **No deps** — `package.json` / lockfile / config modify 금지
- **No build/lint in DoD** — CI/hook 영역
- **Plan path fixed** — 항상 `.cursor/skills/plans/{KEY}-plan.md`. 없는 parent dir mkdir.
- **Plan-mode write gate** — IN_PLAN_MODE=true 시 `ExitPlanMode` → 승인 → `Write` 외 경로 금지
- **Refining never overrides** — refined 결과가 원본과 모순 → abort + report
- **Min AC/INV ≥ 3 each** — 미달 시 abort + 누락 카테고리 명시 (e.g., `성공 AC 1, 실패 AC 0 — 실패·예외 추가 필요`)
- **Plan size cap** — > 12 파일 OR > 300 LoC → split 제안 (override: `--force-large-plan`)
- **Blocker fetch mandatory when present** — `is blocked by` ≥1 인데 §0 선행 의존 비어/없음 = invalid → re-prepare
- **Blocker fetch 1-hop only** — transitive 절대 금지. Link type whitelist = `is blocked by` 단일.
- **Fetch issuelinks explicitly** — `fields` 에 `issuelinks` 명시 + 응답 shape gate
- **Figma fetch mandatory when present** — `figma.com/(design|file|proto)/...` ≥1 → Step 1.1c MUST run. 누락 = invalid. URL 0건 = 정상 skip. `[fetch-failed]` + medium-confidence 강등으로 통과.
- **Figma sublayer probe mandatory on Case B** — top-level fetch 가 sparse metadata 응답 (서버 메시지 "MUST call sublayers" / "Section node" / 코드 없이 metadata 만 ≥1) 이면 `get_metadata` sublayer probe MUST run (`references/figma-fetch.md` 응답 type 분류 표 + Case B). probe 누락 후 `[fetch-failed]` 마킹 통과 = invalid. **sparse metadata 를 token-limit 으로 오분류 금지** — 실제 token-limit (HTTP 응답 자체가 잘림 / 명시적 token-limit 에러) 만 `[fetch-failed: token-limit]` 으로 분류 (응답 type 분류 표 Case C).
- **Figma copy/icon/token verbatim** — 1.1c extract paraphrase 금지. **Token = 색상·typography·spacing variable 모두 포함** (e.g. `Secondary/Red200 #ff4343`, `Body/BodyM14`, `Spacing/SpacingM`). 색상 토큰은 키 + hex 값 모두 verbatim. UI 카피 verbatim 룰과 동일 강도로 적용.
- **Figma 다중 노드 토큰 diff mandatory** — 같은 티켓에서 2개 이상 Figma 노드 fetch 시 (variant modal 들 / state 변형들 / sibling component 들) 각 노드의 `get_variable_defs` 결과를 노드별로 분리 보관 → diff. 차이 ≥1건 → plan §6 또는 §7 노드별 매핑 표 emit + §2 AC 또는 §7 카피·토큰 룰에 노드별 분기. 차이 0건 → 매핑 표에 `모든 노드 토큰 동일` 1줄 명시 (diff 수행 evidence). **컴포넌트 동일성 → 토큰 동일성 추론 금지** — 같은 `ic_*` 인스턴스라도 variant 별 색상 다를 수 있다. 절차: `references/figma-fetch.md` "다중 노드 토큰 diff" 섹션.
- **Figma is UI authority, BE spec is data authority** — Figma extract 에 등장하지 않은 BE 응답 필드·에러 코드·enum value 는 plan §2 AC / §5 데이터 흐름 / §7 카피 룰 / §8 태스크 어디에도 UI 분기로 도입 금지. BE 측 정의는 §6 API 표에만 verbatim 복사하고 `UI 미노출 — BE 계약만` 태깅 (Phase 4.7b cross-ref 결과 반영). Figma fetch `[fetch-failed: *]` 시 모든 BE 항목 `[NEEDS-FIGMA-VERIFY]` 격리.
- **No BE-to-UI bleed** — §6 의 응답 필드·에러 코드 중 Figma 카피·상태에 매핑되지 않는 항목은 §2/§5/§7/§8 등장 금지. cross-ref: §6 의 모든 field/code → Figma extract 매핑 존재 여부 검증. 매핑 0건이면 §6 비고 처리 후 종료, UI 분기 emit ❌.
- **No test code in plan** — `describe(`/`it(`/`expect(` 0건. augmented-coding 영역.
- **No spread-shorthand in §5/§8** — `...currentFilter`, `...params`, `...filters` 등 spread 축약 금지. Step 4.7c 소스 추적 결과를 기반으로 파라미터·소스 변수 전체 열거 필수. 축약이 남으면 mutation call-site 파라미터 누락으로 간주 = invalid.

## Self-Review (run on every plan)

1. §0: `Plan type` / `Confirmed target` (단일 path) / `Siblings NOT to touch` 라인 존재?
2. AC ≥3 (success + failure + edge); skill-bug 시 4-case matrix 완성? INV ≥3?
3. `[INFERRED]` 태그 일관 (STRUCTURED_INGEST verbatim 제외); Jest 코드 (`describe(`/`it(`) 0건?
4. §9.6 write set: 경로 존재 + `src/tests/{mirror}` rows?
5. §5 pseudo-code 에 `...spread` 0건? §8 mutation 태스크에 파라미터 체크리스트(소스 변수 포함) 인라인 존재?
6. Figma 노드 ≥2 fetch 시 §6/§7 노드별 토큰 매핑 표 존재? (차이 0건이라도 `모든 노드 토큰 동일` 1줄 명시) — 색상 토큰 키 verbatim?

→ 6개 모두 통과 → emit. 하나라도 실패 → 아래 Full Quality Bar 참조.

## Full Quality Bar

복잡/실패 티켓 시 `references/quality-bar.md` 참조.

## Token economy

- Plan: ~1.5-3k tokens (compact template, ~50% vs old)
- Blocker fetch: +1-2k/건 during prepare, §0 1줄만 (plan 본문 미포함)
- Figma fetch: +1-3k/URL (`get_design_context` + `get_variable_defs`, `excludeScreenshot: true`)
- Unprepared `augmented-coding`: ~15-25k (discovery 낭비) — prepare 가 break-even
- Front-matter spec: ~1-2k vs ~8k+ legacy markdown (~75% saved per spec)

## References

- **Templates:** `templates/plan-template.md`, `templates/example-RP-5866.md`
- **Conditional phase detail:** `references/{plan-mode, blocker-fetch, figma-fetch, structured-ingest, anti-patterns}.md` (read only when applicable — self-elevate / blockers present / Figma URLs / merged-handoff / review)
- **Spec source:** `documents/specs/` + `documents/specs/SCHEMA.md` + `INDEX.md`
- **Consumed by:** `.cursor/skills/augmented-coding/SKILL.md`
- **Conventions:** `CLAUDE.md` · **Stack:** `package.json`
- **Large file reading:** `.cursor/rules/large-file-reading.md` — Phase 2/4에서 1500줄+ 소스 파일 읽기 전 `Read` 후 전략 적용
