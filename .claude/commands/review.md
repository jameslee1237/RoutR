---
name: review
model: sonnet
description: 4 레이어(컨벤션/아키텍처/변경 품질/재사용성) 코드 리뷰 후 PR `## /review Report` 코멘트 PATCH. 코드 수정 안 함. stable rule ID로 /auto 수렴 키 재사용. *.css.ts 제외. Triggers: "review my code", "코드 리뷰해줘", "변경사항 확인해줘".
---

# Local Code Review (4-layer + contextual, PR comment edit mode)

`stop` 입력 시 어디서든 즉시 중단. 게시 전 사용자 확인 게이트 없음.

## Scope

Include: `.tsx` / `.ts` / `.jsx` / `.js`. Exclude: `*.css.ts`.

---

## Workflow

### Step 1: 컨텍스트 수집

**1-1. 변경 범위** — 사용자 지정 우선. 없으면 `git diff` / `git status`. 모호하면 1회만:
> 어떤 파일/폴더를 리뷰할까요? (예: `src/components/order`)

**1-2. 룰 파일 로드 (필수)** — `.cursor/rules/conventions.md` (Layer 1 체크리스트) · `.cursor/rules/architecture.md` (Layer 2 체크리스트) · `CLAUDE.md` (보조) · `.cursor/rules/large-file-reading.md` (Step 2.5 컨텍스트 읽기 전 1500줄+ 파일 전략). 룰북 내용 = Layer 1/2 체크리스트. 하드코딩 룰 사용 X.

### Step 2: 4 레이어 리뷰

각 레이어 독립 실행. 이슈 없는 레이어는 상세 섹션 미출력 (요약 테이블에는 0 으로 표시).

#### Layer 1: 컨벤션

`.cursor/rules/conventions.md` 의 모든 룰을 diff 추가 라인(`+`)에 검증. `rule` ID · severity 는 룰 파일 값 그대로.

**`convention.no-duplicate-style-token` 검증 의무:** 이 룰을 검증할 때 (예: diff 가 `*.css.ts` 의 import 변경을 동반하거나 인접 파일이 새 style 값을 도입한 경우) 룰북 본문의 3단계 grep — (1) 같은 파일 (2) `src/components/common/atoms/style.css.ts` (3) `src/components/{도메인}/common/styles/` — 을 모두 수행하고, 실행한 grep 명령과 매칭 여부를 검증 ID 옆에 짧은 주석으로 남긴다. (3) 단계 누락 빈도가 높아 명시 노출이 의무.

#### Layer 2: 아키텍처

`.cursor/rules/architecture.md` 의 모든 룰을 변경된 구조 / import / 레이어 위치에 검증 (atomic design 계층, feature cross-cut, API 레이어, Server/Client component, Zustand 위치). `rule` ID · severity 는 룰 파일 값 그대로.

#### Layer 3: 변경 품질 (rule-based + contextual)

룰북 미명시 휴리스틱. Step 2.5 에서 수집한 컨텍스트로 CodeRabbit-style 분석 수행.

| rule | 내용 |
|---|---|
| `quality.hooks-rules` | Hooks 규칙 위반 (조건부 호출 / 의존성 부정확 / 잘못된 키) |
| `quality.list-key-missing` | list 렌더에 안정적인 `key` 없음 |
| `quality.unnecessary-rerender` | `memo` / `useCallback` / `useMemo` 누락의 실측 영향 |
| `quality.naming-ambiguous` | 모호한 이름 / 오타 / 일관성 깨짐 (예: `nullBuyerSummary`) |
| `quality.nullable-mismatch` | nullable 이어야 하는데 non-null, 또는 반대 |
| `quality.unused-param` | 사용처 없는 파라미터 / 의미 없는 기본값 |
| `quality.single-responsibility` | 한 함수/컴포넌트가 무관한 책임 다수 보유 |
| `quality.handler-naming` | 이벤트 핸들러가 `handle*` / `on*` 패턴 아님 |
| `quality.bug-null-deref` | null/undefined 가드 누락 (옵셔널 체이닝 / 기본값 / 분기 부재) |
| `quality.bug-missing-await` | async 결과를 await 없이 사용 / Promise 누수 |
| `quality.bug-swapped-args` | 인자 순서 의심 (동일 타입 다수 + 사용처 단서) |
| `quality.bug-error-path-missing` | try 만 있고 catch / 에러 분기 없음, mutation `onError` 누락 |
| `quality.breaking-change-public-api` | 외부 export 시그니처 / prop shape 변경의 downstream 영향 |
| `quality.intent-mismatch` | 커밋 메시지 / 브랜치명 / PR 제목 의도 ↔ 실제 구현 불일치 |
| `quality.test-coverage-missing` | 새 분기 / 엣지케이스에 대응 테스트 부재 |

#### Layer 4: 재사용성

진짜 패턴 추출 권고만 (Layer 1 룰 위반과 분리).

| rule | 내용 |
|---|---|
| `reuse.duplicated-jsx` | 같거나 유사한 JSX 가 2 곳 이상 — 컴포넌트 추출 |
| `reuse.duplicated-logic` | 같은 로직이 여러 컴포넌트에 — custom hook 추출 |
| `reuse.duplicated-pattern` | 유사 조건문 / 매핑 / 구조 — util 또는 공통 컴포넌트 추출 |
| `reuse.wrong-abstraction-layer` | atoms 에 있어야 할 로직이 organisms 에 있거나 반대 |

> Layer 1 룰 (`convention.no-inline-style` / `convention.no-magic-number` / `convention.util-not-in-component`) 과 의미 동일한 위반은 Layer 1 에서만 보고. (Deprecated alias: `reuse.inline-style` / `reuse.magic-value-inline` / `reuse.util-in-component` — 보고 X.)

### Step 2.5: Contextual reading (Layer 3 입력 강화)

Layer 3 실행 직전에 **≤3개 파일, 총 ≤200 라인** 예산으로 추가 컨텍스트를 읽는다 (출력 안 함; Layer 3 분석의 입력 강화 용도).

1. **호출처 1–2개** — 변경된 export 의 import 처를 grep → 한 파일만 읽기 (downstream / breaking change 판정)
2. **타입 정의** — 변경 코드에서 참조하는 타입이 같은 도메인 `types.ts` 에 있으면 1회 읽기 (nullable mismatch / prop shape 판정)
3. **인접 테스트** — 변경 파일과 같은 디렉토리 또는 `__tests__` 에 테스트가 있으면 읽기 (`quality.test-coverage-missing` 판정)
4. **의도 단서** — `git log -1 --format=%s` + 현재 브랜치명 → `quality.intent-mismatch` 기준

예산 초과 시 1·2 우선. 못 읽은 항목 기반 rule 은 보고하지 않는다 (추측 X).

### Step 3: Severity 부여

| Severity | 아이콘 | 의미 |
|---|---|---|
| ERROR | :x: | 명시 룰 위반. 반드시 수정. `/auto` 자동 fix 대상 |
| WARN | :warning: | 권장 패턴 위반. `/auto` 자동 fix 대상 |
| INFO | :information_source: | 참고/개선 권고. 자동 fix 비대상 |

Layer 1/2 — 룰 파일 severity 그대로. Layer 3/4 — 동작 깨짐 가능성 명백 → ERROR / 유지보수·잠재 버그 → WARN / nit → INFO.

### Step 4: Confidence 게이트

confidence ≥ 80 만 리포트. 룰북 미명시 style 취향은 출력 X.

### Step 5: 출력 (콘솔 + PR 코멘트 동일 본문)

#### 5-1. 포맷

```markdown
## /review Report

> 리뷰 기준: `.cursor/rules/conventions.md`, `.cursor/rules/architecture.md`
> 범위: {변경 파일 N개}

### 요약

| 레이어 | ERROR | WARN | INFO |
|---|---|---|---|
| 1. 컨벤션 | 0 | 2 | 0 |
| 2. 아키텍처 | 1 | 0 | 0 |
| 3. 변경 품질 | 0 | 1 | 1 |
| 4. 재사용성 | 0 | 2 | 0 |

### Layer 1: 컨벤션

- :warning: `src/components/order/atoms/orderBadge/index.tsx:42` — `convention.no-inline-style` — JSX 인라인 스타일 사용
  → `style.css.ts` 에 named export 로 분리하고 className 으로 적용

### Layer 2: 아키텍처

- :x: `src/components/order/atoms/orderCard/index.tsx:18` — `architecture.business-logic-in-atom` — atoms 에서 `useGetOrderQuery` 호출
  → 호출은 organisms / templates 로, atoms 는 props 수신만

### Layer 3: 변경 품질

- :warning: `src/components/vehicle/templates/vehicleListTemplate/index.tsx:92` — `quality.bug-null-deref` — `summary` 가드 없이 `.totalCount` 접근
  → optional chaining 또는 early return 추가

- :information_source: `src/hooks/order/useGetOrderQuery.ts:34` — `quality.unused-param` — 사용처 없는 `forceRefresh` 파라미터

### Layer 4: 재사용성

- :warning: `src/components/dispatch/.../dispatchCard/index.tsx:55` — `reuse.duplicated-jsx` — 같은 카드 구조가 4 곳에서 반복
  → `components/dispatch/molecules/dispatchCard/` 로 추출

---
*Generated by `/review` skill*
```

#### 5-2. 이슈 없는 경우

`## /review Report` 헤딩 + "모든 레이어 검증을 통과했습니다." + 모두 0 인 요약 테이블 + 푸터. 상세 섹션 출력 X.

#### 5-3. 이슈 없는 레이어

요약 테이블은 모든 레이어 행 유지 (0 으로 표시). 상세 섹션은 이슈가 있는 레이어만 출력.

> 자동 코드 수정은 어떤 경우에도 수행하지 않는다. 적용은 `/auto` Phase 5 또는 수동.

### Step 6: PR 코멘트 게시 (Edit 모드)

**6-1. PR 존재 확인**
```bash
GITHUB_TOKEN="" gh pr view --json number,url,headRepository 2>/dev/null
```
PR 없음 → 안내 후 종료 (콘솔 출력은 이미 완료):
> 현재 브랜치에 연결된 PR 이 없습니다. `/pr` 로 PR 을 먼저 올린 뒤 다시 `/review` 를 호출해주세요.

**6-2. 기존 코멘트 검색**
```bash
GITHUB_TOKEN="" gh api repos/{owner}/{repo}/issues/{pr_number}/comments \
  --jq '.[] | select(.body | startswith("## /review Report")) | .id' \
  | head -1
```

**6-3. 게시 / 수정**
- 기존 있음: `gh api repos/{owner}/{repo}/issues/comments/{comment_id} --method PATCH -f body=@{body_file}`
- 없음: `gh pr comment --body-file {body_file}`

본문이 길거나 셸 이스케이프 우려 시 임시 파일 경유.

**6-4. 보고**
```
✅ PR 코멘트 갱신 완료 (수정 | 신규).
PR URL: {pr_url}
코멘트 URL: {comment_url}
```
실패 시 본문을 콘솔에 남기고 수동 게시 안내.

---

## stable rule ID 규약

`{layer-prefix}.{kebab-case-name}` — `convention.*` · `architecture.*` (룰북에서 정의) · `quality.*` · `reuse.*` (본 스킬 Layer 3/4 표에서 정의). 같은 위반은 PR / round 가 달라도 같은 ID. `/auto` 의 `(file, line, rule)` 수렴 키가 이 안정성에 의존. 새 룰 추가 시 룰북 또는 본 스킬의 Layer 3/4 표에 ID 명시.
