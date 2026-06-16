---
name: auto
model: sonnet
description: augmented-coding → pr → review → 자동 fix 루프 메타 스킬. Plan Health Check → 구현 → PR → 리뷰 → VALID 항목 TDD 자동 fix (최대 2 round). Triggers: "/auto RP-1234", "auto로 RP-1234 진행", "RP-1234 풀로 진행", "전체 흐름으로 RP-1234".
---

# auto — 순차 자동 실행 + Review fix 루프

자연어 입력 → 정규화 → `augmented-coding` → `pr` → `review`(PR 코멘트 게시) → **review 결과 자동 fix 루프**. 단계 사이 게이트 없음.

**Triggers:** "/auto RP-1234", "auto로 RP-1234 진행", "RP-1234 풀로 진행"

---

## 핵심 원칙 (불가침)

1. **auto 는 단계 사이에 게이트를 추가하지 않는다.** Phase 0~E 까지 끊김 없이.
2. **하위 스킬의 안전장치는 보존한다.** 아래 표 외 사용자 응답 지점 없음.

| 단계 | 발동 조건 | 묻는 내용 |
|---|---|---|
| Phase 0 | 입력에서 TICKET_KEY 추출 실패 | "어느 티켓 키인가요? (예: RP-1234)" — 1회 |
| augmented-coding | Phase 5.2 Out-of-scope | "이 위치도 추가할까요?" |
| augmented-coding | Phase 5.3 Spec fidelity | "{값} 이 맞나요?" |
| augmented-coding | bug-fix plan 의 모든 원인 가설 반증 | 새 가설 / plan 보강 요청 |
| pr | 브랜치명이 `feature`/`fix`/`hotfix` 매칭 실패 (worktree 정규화 후에도) | "대상 브랜치를 입력해주세요" |

3. **어디서든 `stop` / `중단` / `여기까지` / `그만` 입력 시 즉시 종료.**
4. **하위 스킬의 룰 약화 금지.** Reality check, build 통과 후 push, plan 외 변경 금지, 환각 금지, **review 자동 코드 수정 금지** (review 가 직접 코드 수정하지 않음, fix 는 Phase D 가 수행).
5. **AskUserQuestion 호출 금지 + 텍스트 확인 질문 금지.** 자동 fix 루프의 모든 분기는 본 스킬이 자체 판단한다. **"계속할까요?", "다음 단계로 진행할까요?", "진행해도 될까요?", "시작하겠습니다 — 확인해주세요" 류의 텍스트 질문도 절대 금지.** 각 Phase 전환 시 1줄 상태 보고 후 즉시 다음 Phase 실행한다. **명령어 복잡도(python3 사용, 멀티라인, heredoc, 파이프 조합 등)는 절대 멈춤 사유가 아니다 — 이해·실행 가능한 명령은 승인 없이 즉시 실행한다.**
6. **fix round 는 최대 2 회.** 그 이후 VALID 가 남으면 Phase E 에서 사용자에게 보고 후 종료.
7. **하위 스킬은 Skill 도구로 invoke 하지 않는다.** `Skill` 도구 호출은 sub-skill 본문 종료 시점에서 turn 이 끊겨 자동 진행이 중단된다. 대신 아래 **Sub-skill 실행 방식** 절차를 따라 main thread 에서 직접 실행한다.

---

## Sub-skill 실행 방식

Phase A/B/C의 `augmented-coding`/`pr`/`review` 는 **`Skill` 도구로 invoke 하지 않는다** (turn 이 끊겨 자동 진행 차단). 각 Phase 진입 시: (1) `Read` 로 `.cursor/skills/{name}/SKILL.md` 읽기 → (2) main thread 에서 직접 실행(`Bash`/`Edit`/`Write` 등) → (3) 완료 보고 후 **같은 turn 안에서** 다음 Phase 진행.

**Agent 호출 예외:** Phase 1.5/D.2/D.4 의 `Agent` 호출은 허용 — 단일 turn 안에서 완료되며 격리된 분석 결과만 반환.

---

## Phase 흐름

`0 정규화 → 1 Pre-flight → 1.5 Plan Health Check → A augmented-coding → B pr → C review → D fix 루프(×N≤2) → F 최종 빌드·린트 → E 종료`

표준 브랜치명 + 안전장치 미발동 + plan 파일 존재 시 **사용자 응답 0회**.

---

## Phase 0 — Refine input

`[A-Z]+-\d+` 패턴으로 TICKET_KEY 추출. 없으면 1회 질문. `--base=<branch>` 등 override 플래그 허용; 그 외 부가 설명은 버린다. 출력: `✓ Refined: /auto {TICKET_KEY}`. 즉시 Phase 1.

---

## Phase 1 — Pre-flight

`.cursor/skills/plans/{TICKET_KEY}-plan.md` 존재 확인. 없으면 `❌ plan 파일이 없습니다 → /prepare {KEY}` 출력 후 즉시 종료.

`BASE_COMMIT=$(git rev-parse HEAD)` 기록 — Phase D 수렴 체크 및 reset 지점. `auto-state.json` 에 저장.

---

## Phase 1.5 — Plan Health Check (Agent)

**Read `${CLAUDE_SKILL_DIR}/phase-1-5.md` for the agent prompt before calling Agent.**

- `PLAN_OK` → Phase A
- JSON 라인 → issues 목록 출력 후 즉시 종료

---

## Phase A — augmented-coding

`.cursor/skills/augmented-coding/SKILL.md` 의 Phase 1~6 흐름 그대로:

- Phase 2 / 3.2 / 3.4 / 4.4: 자동 통과 (통보만)
- Phase 5.2 Out-of-scope, 5.3 Spec fidelity, 가설 모두 반증: **조건부 게이트**

### 빠른 검증 (per-task)

augmented-coding 의 Phase 6 검증 외에, plan 에 append 된 fix 태스크 처리 시 다음을 우선 사용:

- 빠른 정적 검증: `pnpm lint`
- 변경 파일에 관련된 테스트만: `pnpm test -- --findRelatedTests <changed files>`

Phase 6 전체 빌드(`pnpm build`)는 모든 fix 태스크 완료 후 1회만 실행 (벽시간 절약).

Phase 6.4 완료 보고 즉시 Phase B 로.

---

## Phase B — pr

**Worktree 브랜치 정규화 (Phase B 진입 직후 자동 수행, 사용자 확인 없음):**

현재 브랜치가 `worktree-` 로 시작하면 plan 파일의 `Plan type:` 을 읽어 prefix 결정 후 자동 rename:

| Plan type | 브랜치 prefix | 결과 |
|---|---|---|
| `bug-fix` | `fix` | `fix/{TICKET_KEY}` → staging |
| `refactor` | `refactor` | `refactor/{TICKET_KEY}` → develop |
| `feature` / 기타 | `feature` | `feature/{TICKET_KEY}` → develop |

```bash
CURRENT=$(git branch --show-current)
if [[ "$CURRENT" == worktree-* ]]; then
  PLAN_TYPE=$(grep -m1 'Plan type:' ".cursor/skills/plans/{TICKET_KEY}-plan.md" | awk '{print $NF}')
  if [[ "$PLAN_TYPE" == "bug-fix" ]]; then
    git branch -m "fix/{TICKET_KEY}"
  elif [[ "$PLAN_TYPE" == "refactor" ]]; then
    git branch -m "refactor/{TICKET_KEY}"
  else
    git branch -m "feature/{TICKET_KEY}"
  fi
fi
```

rename 완료 후 pr 스킬 Phase 1 정상 진입 (prefix 매칭으로 대상 브랜치 자동 결정, 사용자 확인 불필요).

`.cursor/skills/pr/SKILL.md` 의 Phase 1~5 그대로.

- 대상 브랜치 자동 결정: `feature` / `refactor` → develop, `fix`/`hotfix` → staging. 매칭 실패 시에만 사용자 확인.
- 빌드 통과 전 push 금지.
- `GITHUB_TOKEN=""` 프리픽스. gh 실패 시 compare URL 폴백.

**ROUND ≥ 2 (fix 루프 재진입):** PR 이 이미 존재하므로 push 만 수행하고 PR 본문은 변경하지 않는다 (코멘트는 Phase C 에서 갱신).

Phase 5 완료 후 PR URL 메모, 즉시 Phase C 로.

---

## Phase C — review

`.cursor/skills/review/SKILL.md` 의 Step 1~6 그대로. 리뷰 범위는 augmented-coding 변경 파일.

- `## /review Report` 코멘트가 PR 에 있으면 **PATCH** 로 수정 (누적 방지)
- 없으면 새로 생성
- review 자체는 **자동 코드 수정 안 함** (이 원칙은 절대 약화시키지 않음)

review 결과 JSON 라인(`{layer, severity, file, line, rule, title, fix}`)을 `$CLAUDE_JOB_DIR/review-issues-round{ROUND}.json` (없으면 `/tmp/auto-{TICKET_KEY}/`)에 보존. 별도 게이트 없음. Phase D 로.

---

## Phase D — Review fix 루프

상태 파일: `.cursor/skills/plans/{TICKET_KEY}.auto-state.json`

**Read `${CLAUDE_SKILL_DIR}/phase-d.md` before entering Phase D.** D.1–D.5 전체 절차, Triage·Fix Planning Agent 프롬프트 포함.

D.1 집계 → D.2 Triage → D.3 수렴 체크 → D.4 Fix Planning → D.5 Plan append + Phase A 재진입. `ROUND > 2` → Phase E ⚠️.

---

## Phase F — 최종 빌드·린트 검증

Phase D 완료(VALID 0 또는 ROUND > 2) 직후 실행. **게이트 없음.**

1. `pnpm build && pnpm lint` 실행
2. **통과** → Phase E ✅ 즉시 진행
3. **실패** → 에러 분석 후 자동 수정 (1회 한도, 게이트 없음):
   - TypeScript 오류: 타입 불일치·missing import 수정
   - ESLint 오류: 컨벤션 위반 수정
   - 수정 완료 → commit (`fix: build/lint errors after review fixes`) → push (ROUND ≥ 2 패턴)
4. 수정 후 `pnpm build && pnpm lint` 재실행:
   - 통과 → Phase E ✅
   - 재실패 → Phase E ❌ (에러 전문 포함)

> Phase D 의 fix 가 새로운 build/lint 오류를 유발할 수 있으므로 review 루프 완전 종료 후 반드시 재검증한다.

---

## Phase E — 종료 출력 (표준 포맷)

`auto-state.json.history` 로 round 별 처리 내역 출력. 헤더: `{STATUS_ICON} /auto 완료 / 티켓 / PR URL / 구현 태스크 완료 수`. Round별: Fix 적용 N건, FP M건, Pre-existing K건. 수렴 실패·VALID 잔존 시 명시.

`STATUS_ICON`: ✅ (VALID 0·모두 처리) / ⚠️ (round 한도 초과·VALID 잔존) / ❌ (lint·build·test·commit 실패·모호 plan). 실패 시에도 동일 포맷으로 진행 상황 노출.

---

## 멈춤 조건

다음에서만 멈추고 보고:

- `pnpm lint` 또는 `pnpm test` 실패 (augmented-coding Phase 6 또는 fix round 후)
- Phase F 최종 빌드·린트 자동 수정 1회 후에도 재실패
- 두 번 연속 commit 실패 (hook 충돌)
- plan 태스크 자체가 모호해 진행 불가
- Plan Health Check 실패 (Phase 1.5)

모든 경우 Phase E 의 ❌ 출력. `BASE_COMMIT` 으로 reset 가능함을 안내.

---

## 커밋 실패 처리 (eslint/prettier hook)

포맷팅 수준 변경만 있으면 `git add -u && git commit -m "<original>"` 재시도. 두 번째 시도 실패 시 멈추고 보고. 새 파일 자동 재스테이지 금지.

---

## 중단 처리

`stop` / `중단` / `여기까지` / `그만` 입력 시 즉시 종료. 진행된 단계·이후 개별 호출(`/pr`, `/review`, `/auto {KEY}`) 안내.

---

## 분기 시나리오

| 상황 | 처리 |
|---|---|
| 자연어 입력에 TICKET_KEY 없음 | Phase 0 에서 1 회 질문, 응답 없으면 종료 |
| plan 파일 부재 | Phase 1 에서 즉시 종료, `/prepare {KEY}` 안내 |
| Plan Health Check 실패 | Phase 1.5 에서 issues 보고 후 종료 |
| augmented-coding lint/build/test 장기 실패 | auto 개입 X. 통과까지 augmented-coding 이 사용자와 반복 |
| 모든 원인 가설 반증 (bug-fix) | augmented-coding 멈춤 → 사용자 보강 대기 |
| Phase 5.2 / 5.3 게이트 발동 | 사용자 응답 후 즉시 다음 단계 |
| pr 비표준 브랜치명 | 폴백 질의 |
| gh CLI 미설치 | pr Phase 5.2 분기. review 코멘트도 콘솔 출력 폴백 |
| Review 후보(ERROR+WARN) 0 건 | Phase D 즉시 종료, ✅ |
| Triage 결과 VALID 0 건 | Phase D 즉시 종료 → Phase F → Phase E ✅ (FP/pre-existing 만 보고) |
| Phase F build/lint 통과 | Phase E ✅ |
| Phase F 자동 수정 후 통과 | commit fix → push → Phase E ✅ |
| Phase F 재실패 | Phase E ❌ (에러 전문 포함) |
| 수렴 실패 (직전 round 와 동일 항목) | 그 항목 자동 FP 처리, 나머지 절차 계속 |
| ROUND > 2 + VALID 잔존 | Phase E ⚠️ 출력, 종료 |

---

## Quick reference

| Item | Format |
|---|---|
| Trigger | "/auto RP-1234", "auto 로 RP-1234 진행" (자연어 OK) |
| 순서 | 0 정규화 → 1 plan 확인 → 1.5 Plan Health Check → A augmented-coding → B pr → C review → D fix 루프(×N≤2) → F 최종 빌드·린트 → E 종료 출력 |
| auto 가 추가한 게이트 | Phase 0 ticket key 질의(1회), Phase 1/1.5 의 실패 시 종료 |
| 자동 fix 대상 | severity ∈ {ERROR, WARN}. INFO 는 보고용 |
| Round 한도 | 2 |
| 수렴 키 | `(file, line, rule)` — `rule` 은 review 스킬의 stable ID |
| 상태 파일 | `.cursor/skills/plans/{TICKET_KEY}.auto-state.json` |
| 사용자 응답 지점 | 위 분기 시나리오 외 없음 |
| 중단 | `stop` / `중단` / `여기까지` / `그만` |
| Plan 파일 경로 | `.cursor/skills/plans/{TICKET_KEY}-plan.md` |
| 룰 파일 | `.cursor/rules/conventions.md`, `.cursor/rules/architecture.md`, `.cursor/rules/large-file-reading.md` |
| Out of scope | CodeRabbit 폴링·대응, plan 자동 생성 |
