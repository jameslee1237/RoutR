---
name: augmented-coding
model: sonnet
description: plan.md 기반 TDD 구현 스킬. discovery → 실패 테스트 → 구현 → 검증. Out-of-scope·Spec fidelity 발견 시 사용자 확인 필수. Triggers: "RP-1234 구현해줘", "plan 기반으로 개발해줘", "TDD로 RP-1234 진행해줘", "plan 보고 테스트부터 만들어줘".
---

# JIRA Plan & Implement (TDD)

plans 폴더의 plan 파일을 읽고, **discovery → 실패하는 테스트 작성 → 구현 → Refactor → 검증**까지 담당. PR 생성·CodeRabbit 대응은 별도 흐름.

**Project context:** Next.js 15.5+, React 19, TypeScript, Vanilla Extract, Zustand, TanStack Query, atomic design. See `CLAUDE.md` (프로젝트 컨벤션 + 아키텍처 레이아웃 단일 출처), `references/known-pitfalls.md`.

---

## 자동화 정책 (중요)

plan 파일이 명확하다는 전제로 **Phase 2 / 3.2 / 3.4 / 4.4 / 6.0의 사용자 승인 게이트는 자동 통과**한다. 각 단계의 결정 사항은 사용자에게 **짧은 통보(자동 결정 보고)** 로만 알리고 다음 단계로 진행한다.

**예외 — 다음 두 게이트는 자동화하지 않는다 (안전장치 유지):**
- **Phase 5.2 Out-of-scope guard:** plan/인벤토리에 없는 영향 위치를 새로 발견했을 때 → 반드시 사용자 확인
- **Phase 5.3 Spec fidelity:** UI 카피·API 필드명·prop 이름·스타일 토큰에 확신이 없을 때 → 반드시 사용자 확인

이 두 게이트는 plan이 미흡하다는 신호이므로 자동 통과하면 환각·무단 확장 마찰이 재발한다.

**중단 가능:** 사용자가 `stop` / `중단` / `여기까지`라고 하면 어느 시점이든 즉시 종료.

---

## Phase 흐름

User says: "RP-1234 구현해줘", "plan 기반으로 개발해줘", "{TICKET}-plan 개발 진행해줘"

**Phase 1 → 2 → 3 → 4 → 5 → 6** 순서로 진행. 자동 통과되는 게이트는 통보만 출력, 발동 시 사용자 확인이 필요한 게이트는 Phase 5.2·5.3 뿐이다.

---

## Phase 1: Read plan file

### Step 1.1: Get plan file path

- From user input (e.g. "RP-1234 구현해줘" → `RP-1234-plan.md`)
- Or ask: "어떤 plan 파일을 구현할까요? (티켓 번호 입력, 예: RP-1234)"

**Path:** `.cursor/skills/plans/{TICKET_KEY}-plan.md`

### Step 1.2: Read plan content

- Read the plan file. If it does not exist, tell the user: "해당 plan 파일이 없습니다. `prepare` 스킬로 plan을 먼저 만들어주세요."
- Extract: 개요, 아키텍처 결정, 구현 태스크, 파일 변경 목록

---

## Phase 2: Present plan (자동 채택)

**자동화:** 사용자 승인을 받지 않고 plan을 자동 채택. plan 요약을 **통보 형식**으로 보여주고 곧바로 Phase 3으로 진행한다.

출력 포맷: `references/report-templates.md` §Phase-2

> 자동 채택 후에도 사용자가 `stop` / `중단`을 입력하면 즉시 종료.

---

## Phase 3: Pre-implementation discovery

**Goal:** 코드를 건드리기 전에 (1) 버그 수정 plan이면 근본 원인 가설을 분석하고, (2) 변경 영향을 받는 모든 위치를 인벤토리화해 first-pass에서 variant·사용처를 놓치는 마찰을 차단한다.

### Step 3.1: Classify plan type

Plan 내용으로 유형 분기:

| Plan type | 단서 | Step 3.2 (가설 분석) | Step 3.3 (인벤토리) |
| --- | --- | --- | --- |
| **bug-fix** | plan에 "버그", "수정", "fix", "회귀" 등 명시 또는 jira 이슈 타입이 Bug | **필수** | 필수 |
| **feature** | 신규 기능 추가, 신규 컴포넌트 | skip | 필수 |
| **refactor** | 기존 동작 보존하면서 구조 개선 | skip | **필수 (강화)** |

### Step 3.2: Root cause hypotheses (bug-fix only, 자동 진행)

**버그 수정 plan일 때만.** 코드 수정 전에 다음을 자동으로 수행:

1. Read & Grep으로 관련 코드 경로와 의존성을 철저히 읽기
2. **패턴 분석** — 코드베이스에서 같은 도메인의 정상 동작 케이스를 grep. 버그 케이스와 구조적 차이(prop 전달, state 초기화 시점, 이벤트 핸들러 연결 방식) 식별. 발견한 차이점이 가설 목록에 반영되어야 한다.
3. 가능성 순으로 **3-5개의 서로 다른 근본 원인 가설** 나열 — 각 가설마다 **코드에서 나온 구체적 증거** 첨부
4. 각 가설에 대해 **반증 실험**(디버그 로그, 런타임 체크, 트레이스) 자동 수행
5. `references/known-pitfalls.md`의 알려진 함정과 매칭되는지 점검

**자동 선택 규칙:**
- plan에 **근본 원인이 명시되어 있으면** 그것을 가설 1로 두고 우선 검증
- 가장 가능성 높은 가설부터 자동으로 반증 실험 → 증거 확보
- 가설 1이 틀리면 가설 2, 3 순으로 자동 진행
- 모든 가설이 반증되어 새로운 가설이 필요해진 경우에만 사용자에 보고 (이때 멈추고 의견 요청)

사용자에게는 **통보 형식**으로 결과 보고 후 다음 단계로 진행. 출력 포맷: `references/report-templates.md` §Step-3.2

**증거로 가설이 확인되기 전에는 코드를 수정하지 않는다.** 모든 가설이 반증되면 사용자에 보고 후 멈춤. "이론적으로 맞다"로 끝내지 않는다.

### Step 3.3: Impact inventory (모든 plan 유형 필수)

Plan에 명시된 변경 대상마다 다음을 grep으로 인벤토리화:

1. **컴포넌트 variant** — `XxxWithStatus`, `XxxWith*`, `NewXxx*`, `LegacyXxx*` 같은 형제 이름 패턴
2. **사용처(usages)** — import 하는 파일, 렌더링하는 페이지/모달/드로어
3. **재사용 위치** — recipe 파일, 드로어 요약, Storybook 스토리, 테스트
4. **크로스 레포 영향** — assembo 라이브러리가 이 변경에 영향받는지 (관련 있을 때만)
5. **알려진 함정 매칭** — `references/known-pitfalls.md`에서 해당 도메인(키보드 a11y, 포커스, 드로어 등)의 함정을 미리 점검

### Step 3.4: Present discovery results (자동 진행)

**자동화:** 결과를 통보 형식으로 보여주고 곧바로 Phase 4로 진행. 출력 포맷: `references/report-templates.md` §Step-3.4

**자동 진행 후 안전장치:** 구현 중(Phase 5.2)에 이 인벤토리에 없는 새 영향 위치를 발견하면 **반드시 사용자에 확인**한다. 자동화는 인벤토리가 plan을 기반으로 정확하다는 전제 위에 동작하므로, 누락 발견 시 Out-of-scope guard가 그 갭을 메운다.

---

## Phase 4: Generate failing tests from plan

**Goal:** Plan + Phase 3 인벤토리를 바탕으로 실패하는 Jest 테스트 작성. 구현 전에 테스트로 기대 동작을 잠근다.

**Read `${CLAUDE_SKILL_DIR}/phase-4-tests.md` at Phase 4 entry** — Steps 4.1–4.6 전체 절차 포함.

Phase 4 완료 후 → Phase 5로.

---

## Phase 5: Implement (green phase)

**Only proceed if Phase 4 tests are written and reviewed.**

### Step 5.1: Follow the plan

Phase 3 인벤토리에 명시된 **모든** 위치를 plan 순서대로 수정:

- Plan에 명시된 대로 파일 생성/수정
- 프로젝트 컨벤션 준수 (`CLAUDE.md` 참조)
- 작성한 테스트가 통과하도록 구현
- **기존 유사 hook/컴포넌트 패턴을 차용 시, 차용 직전에 그 패턴의 design intent 를 1초 검증.** context 기반 값 (modal, drawer 등) 은 props 보다 hook 내부 호출이 자연스러운지 우선 검토 → 자세한 절차는 Step 5.3 "안티패턴 모방 금지 (자기완결성 우선)" 참조
- **Vanilla Extract `*.css.ts` 신규 생성 시:** 자체 정의 토큰 0개로 줄일 수 있는지 먼저 검토 — 모든 토큰이 외부 import (예: `common/atoms/style.css`, `{domain}/common/styles/`) 로 대체 가능하면 `*.css.ts` 파일 자체가 불필요하다. 자체 토큰을 정의해야 한다고 판단되면 Step 6.4 의 3단계 grep 으로 한 번 더 검증.

### Step 5.2: Out-of-scope guard (MANDATORY)

**plan과 Phase 3 인벤토리에 명시되지 않은 변경은 절대 하지 않는다.**

- 구현 중 "이것도 같이 고치면 좋겠다"는 충동이 들면, **수정을 멈추고 사용자에게 묻는다**.
- 새로운 영향 위치를 발견하면 사용자에게 보고 후 plan/인벤토리에 추가하고 진행. 무단 확장 금지.
- 기존 코드 스타일·구조에 대한 의견 차이로 인한 리팩토링 금지 — plan에 명시된 게 아니면 그대로 둔다.

### Step 5.3: Spec fidelity (no hallucination)

**다음은 절대 만들어내지 않는다 (환각 금지):**

- **UI 카피·문자열** — 화면에 보이는 텍스트는 plan/디자인에 명시된 것을 그대로 사용. 명시되지 않았다면 기존 코드에서 인용하거나 사용자에게 묻는다. (예: `'필수 정보 입력 후 조회됩니다'` 같은 문구를 임의로 작성 금지)
- **API 응답 필드명·타입** — 추정 금지. 실제 API 정의/타입을 확인.
- **컴포넌트 prop 이름** — 추정 금지. 실제 컴포넌트의 props 타입을 읽고 사용.
- **스타일 토큰·variant 키** — vanilla-extract recipe/variants는 실제 정의를 확인. focus-visible vs focus-within 같은 헷갈리는 의미는 plan/디자인 의도에 맞게.

확신이 없으면 추측하지 말고 사용자에게 확인.

#### 안티패턴 모방 금지 (자기완결성 우선)

**기존 코드 패턴을 차용할 때는 그 패턴이 정답이라고 가정하지 않는다.** 룰북 위반이 아니더라도 **부채성 패턴** (prop 폭증 / context 우회 chain / 같은 인스턴스 외부 전달 chain 등) 일 수 있다. 차용 직전에 다음을 검증:

1. **의도된 설계인가?** — root cause: API 제약, context 격리, 테스트 가능성 등 명시적 이유가 있는가?
2. **누적된 부채인가?** — prop 폭증, 외부에서 context 기반 값을 들고 와서 넘겨주는 chain 등, 더 자연스러운 호출 위치가 있는데 답습된 결과인가?
3. **새 hook/컴포넌트는 자기완결성을 우선** — 외부 의존 (특히 React context 기반 값을 props 로 받기) 을 줄일 수 있으면 줄인다.

**검증 1초 룰:** "props 로 받는 게 의도된 격리인가, 아니면 그냥 외부에서 들고 와야 한다고 생각해서 그런가?" 답이 후자면 hook 내부 호출 검토. (예: `useModal` 처럼 `OverlayProvider` context 기반 값은 hook 내부에서 직접 호출해도 동일 context 공유 → props 불필요)

### Step 5.4: Iterate until tests pass

```bash
pnpm test 2>&1
```

실패하는 테스트를 보고 구현 보완. **테스트를 통과시키기 위해 테스트 자체를 약화시키지 않는다.** 기대 동작이 잘못된 경우에만 사용자에게 알리고 테스트를 수정.

**3-Fix Limit:** 같은 테스트가 3회 연속 실패하면 → 루트 코즈 가설을 재수립해 Phase 3.2로 자동 되돌아가 재검증. 재검증 후 재구현에도 실패하면 그때만 사용자에 보고.
**아키텍처 레드플래그:** 수정마다 다른 위치에서 새 오류가 드러나면 → 현재 가설 폐기 후 더 상위 원인 탐색, Phase 3.2 재실행.

### Step 5.5: Refactor (자동 진행)

모든 테스트가 그린인 상태에서 구현 코드 정리. 중복 제거·명명 개선·불필요한 임시 변수 제거. **테스트 코드는 건드리지 않는다.** 리팩토링 중 테스트가 깨지면 즉시 되돌리고 원인 분석.

### Phase 5 완료 상태 통보 (자동 진행)

구현·리팩토링 완료 후 상태를 한 줄 통보 후 자동 진행:
- **DONE** — 모든 테스트 통과 → Phase 6 자동 진행
- **DONE_WITH_CONCERNS** — 완료, 우려 사항은 Step 6.4 보고에 포함 → Phase 6 자동 진행
- **BLOCKED** — 가설 재수립·재검증 후에도 해결 불가 → 사용자에 보고 (최후 수단)

---

## Phase 6: Verify (build + lint + test + reality check)

### Step 6.0: AC compliance check (자동 진행)

build/lint 전에 구현이 plan §2 AC를 실제로 충족하는지 확인:

1. plan.md §2 AC 목록 읽기
2. 각 AC "Then" 절 → 구현 코드에서 해당 동작 경로를 grep/read로 확인
3. **plan §6 API 표와 mutation call-site 파라미터 대조** — plan 에 §6 API 표가 있는 경우: `mutateAsync`/`mutate` 호출 코드에서 전달하는 파라미터 set 을 §6 표의 모든 파라미터 (모드 제한 포함) 와 비교. 모드별(`ALL`/`SELECTED`) 로 의도적으로 생략되는 파라미터(예: `ALL` 모드에서 `dispatchIds` 미전달)는 정상. 그 외 누락 파라미터 발견 → Phase 5 자동 복귀 후 보완.
4. 누락 AC 발견 → Phase 5로 자동 되돌아가 보완 후 Step 6.0 재실행 (사용자 보고 없음)
5. 모든 AC 충족 + §6 파라미터 완전 일치 → Step 6.1로 자동 진행

### Step 6.1: Static checks

```bash
pnpm build
pnpm lint
pnpm test
```

세 가지 모두 통과 필수. 실패 시 원인 분석 후 수정, 재실행.

### Step 6.2: Reality check (MANDATORY for effect/focus/timing fixes)

**다음 카테고리의 변경은 "테스트 통과"만으로 끝내지 않는다 — 실제로 그 코드 경로가 도달하는지 증명한다.**

- React `useEffect` / `useLayoutEffect` 추가·수정
- 키보드 이벤트 핸들러 추가·수정 (특히 ESC, Tab, focus 관련)
- ref 기반 게이팅 로직 (initializeRef 등)
- TanStack Query 캐시 무효화 / refetch
- 포커스 trap / FloatingPortal / 드로어 이동

**검증 절차:**

1. 핵심 경로에 임시 `console.log` 추가 (예: 핸들러 진입, effect 실행, ref 초기화 시점)
2. 트리거를 재현 (브라우저에서 사용자가 직접 동작 / 테스트 시나리오)
3. 로그가 **실제로** 찍히는지, 기대한 순서·횟수로 찍히는지 확인
4. 변화가 관찰되었음을 확인 후 **임시 로그 제거**
5. 사용자에게 "어떤 시퀀스로 검증했는지" 짧게 보고

`references/known-pitfalls.md`의 dead-code 함정(capture-phase ESC, ref 잘못 리셋 등) 매칭 시 해당 함정 확인 포함.

### Step 6.3: Inventory completion check

Phase 3에서 만든 인벤토리의 **모든 위치**가 실제로 반영되었는지 마지막 grep으로 확인:

```bash
# 예시
grep -rn "{변경 전 패턴}" src/ || echo "남은 곳 없음"
```

남은 위치가 있으면 사용자에게 보고하고 처리.

### Step 6.4: Self-conventions-check & Report

#### 6.4.1: Self-conventions-check (MANDATORY before reporting)

보고 직전에 자주 발생하는 룰북 위반 패턴을 grep 으로 자체 점검. 매칭 발견 시 → 보고 전 Phase 5 로 자동 복귀해 재사용으로 보완 후 6.4.1 재실행.

- **신규 / 변경된 `*.css.ts` 토큰 3단계 grep (MANDATORY)** — 추가하거나 값을 바꾼 모든 style 토큰의 CSS 값마다 다음 3단계 grep 을 **모두** 수행:
  1. `grep -E '<value pattern>' <같은 *.css.ts 파일>` — 같은 파일 내 중복
  2. `grep -rE '<value pattern>' src/components/common/atoms/style.css.ts` — 공통 atoms
  3. `grep -rE '<value pattern>' src/components/{변경 도메인}/common/styles/` — 도메인 공유 스타일

  세 단계 중 **하나라도** 매칭 발견 시 자체 토큰 정의 금지, 매칭 토큰을 import 해서 재사용. (3) 단계 누락 빈도가 높으니 grep 명령 자체를 보고 본문에 노출한다. 관련 룰: `convention.no-duplicate-style-token` (`.cursor/rules/conventions.md`).
- magic number / Args suffix / util location / inline style / searchParams concat 등 기존 grep self-check 도 동일하게 수행.

#### 6.4.2: Report

사용자에게 다음을 짧게 보고. 출력 포맷: `references/report-templates.md` §Step-6.4. 6.4.1 의 3단계 grep 결과(실행 명령 + 매칭 여부)를 보고 본문에 포함.

수정 사항을 자동 commit/push 하지 않는다. PR은 `pr` 스킬의 책임.

---

## Quick reference

| Item                     | Format                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Plan path                | `.cursor/skills/plans/{TICKET_KEY}-plan.md`                                             |
| Rule books               | Phase 3.0에서 `.cursor/rules/conventions.md` + `architecture.md` + `CLAUDE.md` + `large-file-reading.md` 적재 (MANDATORY) |
| 자동 통과 (통보만)        | Phase 2 (plan 채택), Phase 3.2 (가설 자동 검증), Phase 3.4 (discovery), Phase 4.4 (테스트 채택) |
| 사용자 확인 필수 (조건부) | Phase 5.2 Out-of-scope, Phase 5.3 Spec fidelity — 발동 시 절대 자동 통과 금지            |
| 강제 중단                | 사용자 `stop` / `중단` 입력 시 즉시 종료                                                |
| Bug fix plans            | Phase 3.2 가설 자동 검증, 증거 없이 코드 수정 금지. 모든 가설 반증 시 사용자에 보고      |
| Impact inventory         | Phase 3.3에서 variant·사용처·재사용·크로스 레포·함정·기존 패턴 모두 grep                |
| 기존 패턴 grep            | Phase 3.3 #6 — API 호출 / 스타일 토큰 / interface 명명 / hook 패턴 정합 확인            |
| 파일 배치 게이트          | Phase 5.1 — `CLAUDE.md` Shared Types/Constants 표 + `convention.util-not-in-component` (컴포넌트 폴더 내 helper 금지) |
| Out-of-scope guard       | plan/인벤토리에 없는 변경은 금지, 새 영향 발견 시 사용자 확인 후 추가                   |
| Spec fidelity            | UI 카피·API 필드·prop·스타일 토큰·interface 명명·API 호출 패턴 환각 금지 |
| 안티패턴 모방 금지        | Phase 5.3 — surrounding 코드가 룰북 위반이어도 새 코드는 룰을 따른다 (정당화 ❌). 부채성 패턴 (prop 폭증, context 우회 chain) 도 의심 대상 — 답습 전 자기완결성 검증 |
| Iron Law                 | 테스트 없이 먼저 작성된 구현 코드는 삭제 후 TDD 재작성 (Phase 4 Rules #0)               |
| Red 이유 검증             | Step 4.6 — 테스트가 기대 동작 미구현 때문에 실패하는지 반드시 확인                      |
| Reality check            | effect/focus/timing 수정은 임시 로그로 실제 코드 경로 도달 증명 후 로그 제거            |
| Inventory completion     | Phase 6.3에서 인벤토리 위치가 모두 반영되었는지 grep으로 마지막 검증                    |
| Self-conventions-check   | Step 6.4.1 — magic number / Args suffix / util location / inline style / searchParams concat grep self-check + **신규 `*.css.ts` 토큰 3단계 grep** ({같은 파일, `common/atoms/style.css.ts`, `{domain}/common/styles/`}) MANDATORY |
| Test & mock patterns     | `references/test-patterns.md` (hook / component / mocking 패턴)                        |
| Report templates         | `references/report-templates.md` (Phase 2, 3.2, 3.4, 4.4, 6.4 출력 포맷)              |
| 3-Fix Limit              | Step 5.4 — 실패 3회 시 Phase 3.2로 자동 복귀, 가설 재수립                              |
| AC compliance            | Step 6.0 — build 전 plan §2 AC 충족 여부 + plan §6 API 표와 mutation call-site 파라미터 일치 여부 확인, 미충족/불일치 시 Phase 5 자동 복귀 |
| Task status              | Phase 5 완료 시 DONE/DONE_WITH_CONCERNS(자동진행)/BLOCKED(최후수단)                     |
| Verification             | `pnpm build` + `pnpm lint` + `pnpm test` + Reality check 모두 통과                      |
| Out of scope             | PR 생성 (→ `/pr`), 로컬 코드 리뷰 (→ `/review`), CodeRabbit 대응 (별도)                  |
