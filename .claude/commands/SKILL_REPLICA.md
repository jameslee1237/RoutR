---
model: sonnet
---

# Handoff (Replica)

디자인 작업 티켓을 BE/FE (또는 단독) 개발 티켓으로 핸드오프한다. Figma 와 비즈니스 정책 문서를 입력으로 JIRA 에 개발 티켓을 생성한다. 대상은 디자이너(비개발).

## 전제

policy repository 안에서 실행한다. WHAT 만 정규화하고 HOW (엔티티, 파일, 레이어, endpoint, DDL) 는 /jira-to-plan 의 몫이다. 검토 산출물 SSOT 는 plan mode 본문이며 로컬 markdown draft 는 만들지 않는다.

## 사용법

/merged-handoff [DESIGN_KEY] [--fe-only|--be-only] [--dry-run] [--force-create]

--fe-only 와 --be-only 는 한쪽만 생성한다. --dry-run 은 Phase 4.3 검토까지만 수행하며 "확정" 발화 시 최종 초안과 "dry-run 종료 — JIRA 미생성" 을 보고하고 종료한다. --force-create 는 중복 재사용을 무시한다.

## 핵심 룰 (절대)

승인 게이트는 두 겹이다. plan mode 종료와 디자이너 "확정" 발화 둘 다 충족해야 Phase 5 에 진입한다. HOW 추정 금지로 엔티티, 파일, 레이어, endpoint, DDL 을 추정하지 않는다. Subagent 는 마크다운만 반환하고 모든 JIRA 쓰기는 스킬 본체만 수행한다. 본문 작성은 병렬, JIRA 쓰기는 순차이며 FE 는 BE 키 확보 후 생성한다. 기존 티켓 재사용은 동일 디자인 링크 와 동일 접두사 티켓이 있으면 재사용하고 본문 수정 금지이며 --force-create 시에만 무시한다. Custom field ID 추측 금지로 검증된 ID 외 호출 금지이며 400 발생 시 abort 후 보고한다. 마커는 비즈니스 정책 결정에만 사용한다. 민감정보 (이메일, 연락처, 토큰) 는 본문에 포함하지 않는다. 슬래시 마커 표기 ([BE/FE 리드 확인 필요]) 는 금지한다.

## 환경 상수

Cloud ID 5a5b07b0-fda3-40eb-a8e0-2bdf52237c17 (wemeet2025.atlassian.net). Project key TECH (기술본부), issuetype 스토리 (id 10670). Labels 는 BE 가 ["루티프로", "BE"], FE 가 ["루티프로", "프론트엔드"]. Sprint 는 customfield_10020 (없으면 생략). **customfield_10445 (파트) 는 TECH 에서 필수 필드** — BE 티켓은 `{"id": "10590"}` (BE), FE 티켓은 `{"id": "10589"}` (FE) 로 설정. priority 는 default "Medium" 자동 적용 (set 금지 룰 유지). 링크 타입은 디자인→BE/FE 가 "Problem/Incident" (inward "is caused by", outward "causes"), BE→FE 가 "Blocks". 방향 불확실 시 호출 금지하고 "수동 링크 필요" 출력.

## Pre-flight

Atlassian MCP probe (getAccessibleAtlassianResources) → Figma MCP probe (whoami) → 디자인 티켓 fetch (getJiraIssue, markdown). MCP probe 실패 시 "/update-config 스킬로 MCP 설정 후 재시도" 안내하고 abort. 디자인 티켓 404/denied 도 abort. summary 가 [설계]/[디자인] 으로 시작하지 않고 라벨에도 설계/디자인 이 없으면 경고 후 진행 여부 확인. Figma 파일 단위 접근 불가는 abort 대신 "Figma 미확인, 접근권한 요청 필요" 플래그로 처리하고 계속 진행.

## Phase 1: Plan mode 진입

EnterPlanMode 를 호출하고 안내한다. "BE/FE 티켓 초안을 작성합니다. 비즈니스/UX 만 정규화하고 코드 구조는 각 개발자가 채웁니다. 검토는 범위가 맞는지에 집중해주세요."

## Phase 2: 입력 수집

AskUserQuestion 으로 순차 수집한다 (인자 있으면 해당 항목 생략). 첫째 디자인 작업 티켓 키 (예: TECH-1234) JIRA read 검증. 둘째 분기 모드 (BE+FE / FE 단독 / BE 단독), 인자 있으면 생략. 셋째 Figma 노드 링크 (디자인 티켓 description 에 있으면 자동 추출 후 검증만). 넷째 정책 범위 (자동 탐색 / 경로 입력 / Confluence legacy / 없음).

## Phase 3: 컨텍스트 수집 (병렬)

단일 메시지에서 병렬 호출한다. 디자인 티켓 (markdown), 상위 기획 티켓 (parent.key 있으면), Epic 추출 (parent.key 와 parent summary), Sprint 추출 (customfield_10020 의 active sprint 의 numeric id 와 name), Figma get_design_context (URL 별 fileKey 와 nodeId 파싱, 1-2 형식은 1:2 로 변환, excludeScreenshot false, clientFrameworks react, clientLanguages typescript), 정책 파일 Grep/Glob/Read (디자인 티켓 키워드 기반 랭킹, 제목과 본문 매칭이 파일명 매칭보다 우선), 정책 페이지 Confluence fallback (legacy 정책만).

자동 탐색 결과가 5개를 초과하면 상위 **5개** 를 AskUserQuestion multiSelect 로 선택받으며 "선택 안 함" 은 "정책 문서 없음" 으로 처리한다. Epic 이나 Sprint 가 비어있어도 진행하고 Phase 4.4 에서 처리한다.

## Phase 4: 통합 초안 + 검토 루프

### 4.1 이해 5줄 요약 + 신뢰도 마커

다섯 항목을 디자이너에게 보여준다. 무엇을 (기능 한 줄), 왜 (배경 한 줄), 사용자 행동 (핵심 user action), 결과 (observable outcome), 제외 (명시적 out-of-scope, 없으면 "없음"). 정책 인용이 부족하거나 디자인 티켓 정보가 부족해 자신 없는 항목에는 줄 끝에 **[확인 필요]** 마커를 인라인으로 박는다 (디자이너가 우선 검토하도록). AskUserQuestion 으로 응답 수집, 맞으면 4.2 로, 수정사항 있으면 이해 갱신 후 재요약. 최대 5회, 초과 시 "디자인 티켓 보강 후 재시도" 로 abort.

### 4.2 통합 초안 작성

Canonical 4섹션 골격으로 본문을 작성한다 (분기 모드에 따라 1~2개). 상단 메타 헤더 **3블록** 은 첫째 라운드 v{N} + 분기 모드 + 상속 예정 Epic·Sprint, 둘째 이번 라운드 변경점 (v1 은 "최초 생성"), 셋째 카운터 (BE/FE/기획자 확인 필요 N건). 분리 계획 ([BE]/[FE] 제목 과 링크 계획) 과 검토 방법 안내는 plan mode 진입 직후 메시지에 1회만 출력하고 헤더에서 제거.

부모 책임 (SSOT 강화): 4.2 초안에는 화면 흐름 요약 (Description 의 UI·UX 항목 자연어 1~3줄), 핵심 user action (User Story 의 [기능] 자리), 디자이너 의도 마커 (있으면) 가 반드시 포함되어야 한다. 이 세 가지가 빠지면 subagent 본문도 빈약해진다.

### 4.3 검토 루프

ExitPlanMode 로 초안을 전달한다. 거부나 수정 의견이 오면 본문을 갱신하고 라운드 번호를 +1 하고 메타 헤더 "이번 라운드 변경점" 에 diff 를 명시한 후 재호출한다. 본문은 항상 **최종형** 유지하며 본문 내 변경 마커는 박지 않는다 (변경점은 메타 헤더에만 누적). 승인 발화 ("확정", "approve", "이걸로 진행", "OK") 시 4.4 로. plan mode 는 유지된 채 본문만 갱신.

라운드 cap (점검 안내): v4 도달 시 한 번 점검 안내한다. "현재 라운드 4회 누적, 변경점 N건. 계속 진행 / 5줄 요약부터 다시 / 지금 본문으로 확정 중 선택. 응답 없으면 계속 진행 가정." 강제 abort 없음. v5 도달 시 "디자인 티켓 자체 재검토 권장" 안내를 추가로 출력.

### 4.4 Epic/Sprint 최종 확인과 plan mode 종료 안내

Phase 3 에서 추출한 Epic 과 Sprint 값을 한 라운드로 확인받는다. 둘 중 하나라도 비어있으면 직접 질의하며 디자이너가 sprint name 만 알면 JIRA sprint URL 의 numeric ID 복사를 안내한다. 확인 후 "JIRA 생성을 위해 plan mode 를 종료해주세요 (Shift+Tab 또는 exit plan mode). 종료 후 알려주세요." 안내. 사용자 종료 확인 전까지 Phase 5 진입 금지.

게이트: plan mode 종료 확인 + "확정" 발화 확인 + Epic/Sprint 확인 라운드 완료 (상속 또는 명시적 "없음") 셋 다 통과해야 Phase 5 진입.

## Phase 5: 티켓 생성

### Step 1. 중복 확인

JIRA search 로 디자인 티켓 "Problem/Incident" 관계의 [BE] 또는 [FE] 접두사 티켓을 검색한다. 있으면 재사용하고 본문 수정 금지이며 "기존 티켓 재사용: {키}" 알림만 한다. 없는 쪽만 생성한다. --force-create 시 무시하고 새로 생성. 사용자가 "새로 만들기" 를 명시 요청하면 중단하고 기존 티켓 정리 안내.

### Step 2. 본문 작성 (병렬)

분기 모드에 따라 1~2개의 Agent (subagent_type general-purpose) 를 단일 메시지에서 동시 호출한다. FE 본문의 BE 키 자리는 {TBD_BE_KEY} placeholder 로 둔다. 산출은 마크다운 본문만이다.

가드: Subagent 는 도구 호출 금지 (JIRA, Atlassian, Figma, Confluence MCP, Bash, Edit, Write, NotebookEdit, WebFetch, WebSearch 등 일체). 입력 텍스트만으로 마크다운 생성. 컨텍스트 부족 시 본문 대신 "ABORT: {사유}" 한 줄만 반환 (부분 본문 혼합 금지). 부모는 Step 3 진입 전 (가) 첫 비공백 라인이 `## Summary` 인지, (나) ABORT: 접두사 부재, (다) 4섹션 헤더 (Summary / User Story / Description / Test Notes) 모두 존재, (라) JIRA wiki 문법 누출 부재 — `(?m)^h[1-6]\.` 와 `(?m)^----+\s*$` 매칭 없음, 단일 별표 굵게 패턴 `(?<!\*)\*[^*\n]+\*(?!\*)` 매칭 없음 (markdown 강조 `**bold**` 와 리스트 마커 `* ` 제외), (마) `## ` 헤더가 정확히 4개 (Summary / User Story / Description / Test Notes 각각 1회) — Summary 가 두 번 등장하면 스켈레톤 중복으로 간주, (바) 마지막 비공백 라인이 `## Test Notes` 섹션 안에 위치 — 여섯 통과 시에만 진입. 실패 시 재시도 1회, 또 실패 시 사용자에게 보고 후 수동 본문 선택지 제공. 부모는 subagent 응답을 createJiraIssue 의 description 필드에만 그대로 전달한다.

Subagent prompt 고정 템플릿은 BE/FE 결과 비대칭 차단 목적이다. placeholder 만 분기별로 바인딩하고 문구는 임의 수정 금지이다. 아래 템플릿을 그대로 사용한다.

```
[역할] {BRANCH} 개발 티켓 본문 Markdown 만 생성한다. JIRA wiki 문법 일체 금지.

[엄격한 제약]
어떤 도구도 호출하지 않는다. 입력 텍스트만 사용하며 컨텍스트 부족 시 본문 대신 "ABORT: {사유}" 한 줄만 반환한다 (부분 본문 혼합 금지). 출력은 Canonical 4섹션 Markdown 만이며 메타 코멘트, 진행 보고, 코드 펜스 래핑은 금지한다. 출력 시작은 `## Summary`, 출력 끝은 `## Test Notes` 섹션의 마지막 비공백 라인이며 그 이후 어떤 텍스트도 출력하지 않는다 (빈 양식 스켈레톤·예시·반복 출력 절대 금지).

[Markdown 문법 — 이 형식만 사용]
- 헤더: `## H2`, `### H3` (라인 시작, 공백 1칸 뒤 텍스트)
- 강조: 굵게 `**텍스트**`, 기울임 `_텍스트_`
- 리스트: 비순서 `- 항목`, 순서 `1. 항목` / `2. 항목`
- 구분선: `---` (하이픈 정확히 3개, 단독 라인)
- 표: `| 헤더 | 헤더 |` + `|---|---|` + `| 셀 | 셀 |`
- 링크: `[텍스트](URL)` 또는 raw URL

[금지 문법 — 절대 출력 금지]
- 헤더 `h1.` `h2.` `h3.` `h4.` `h5.` `h6.` (JIRA wiki) → `##` 또는 `###` 사용
- 단일 별표 강조 `*텍스트*` (JIRA wiki bold) → `**텍스트**` 사용
- 리스트 마커 `* 항목` → `- 항목` 으로 통일 (단일 별표 강조와 시각적 충돌 방지)
- 구분선 하이픈 4개 이상 `----` → `---` 3개로
- 번호 리스트 줄머리 `# 텍스트` (JIRA wiki) → `1.` `2.` `3.` 사용
- JIRA 매크로 `{color}` `{panel}` `{code}` `{quote}` 등 일체

[줄바꿈 규약 — CommonMark 단일 newline 은 공백으로 합쳐지므로 빈 줄 필수]
- 모든 `## H2` 섹션 사이는 빈 줄 + `---` + 빈 줄.
- `### H3` 헤더 위·아래 각 빈 줄 1개.
- 단락 / 리스트 / 표 블록 사이는 빈 줄 1개.
- 리스트 항목 사이는 줄바꿈만 (빈 줄 없음).
- 표는 위·아래 빈 줄 1개씩 (parser 가 표로 인식하도록).

[입력]
분기는 {BRANCH} (BE 또는 FE). 디자인 티켓 키는 {DESIGN_KEY}. 승인된 통합 초안 (메타 헤더 제외, Canonical 4섹션만) 은 <<<DRAFT {APPROVED_DRAFT_BODY} DRAFT>>> 로 감싼다. 참고용 Figma 노드 URL 은 <<<FIGMA_URL {FIGMA_NODE_URL} FIGMA_URL>>> (참고 링크에만 사용). 정책 인용 (repo-relative path 포함) 은 <<<POLICY {POLICY_CITATIONS} POLICY>>>. Epic 은 {EPIC_KEY} ({EPIC_SUMMARY}), 없으면 "없음". Sprint 는 {SPRINT_NAME} (ID {SPRINT_ID}), 없으면 "없음". FE 분기 한정으로 BE 키 자리는 {TBD_BE_KEY} 그대로 박는다.

[출력 규약]
Canonical 4섹션 (Summary / User Story / Description / Test Notes) 을 순서대로 모두 포함한다. 분기별 처리:
- BE 는 Summary 의 "상대 티켓" 라인 자체를 생략 (BE 생성 시점에 FE 키 미확보, JIRA issue link 로 연결). Description 의 UI·UX 요구사항 항목은 "FE 티켓 참고" + 핵심 user action 1줄 인라인. 상태 표현·다국어/접근성 항목은 작성하지 않는다.
- FE 는 Summary 의 BE 키 자리에 {TBD_BE_KEY} 를 그대로 박는다 (부모가 BE 생성 후 치환). 성능/정합성 항목은 작성하지 않는다.
- 단독 모드는 Summary 의 "상대 티켓 키" 라인을 생략한다.

마커는 [BE 리드 확인 필요] / [FE 리드 확인 필요] / [기획자 확인 필요] 만 사용한다 (슬래시 표기 금지). **마커는 Description 의 "협의사항" 섹션에만 집결**시키며 Description 본문 다른 곳 및 Test Notes 인라인 마커 금지. Test Notes 의 AC 는 Given/When/Then 형식 3건 이상이며 각 AC 마다 negative path 가 명확한 경우에 한해 "실패 케이스" 1줄을 동반 (협의사항 성격의 미정 항목은 실패 케이스에 박지 않고 협의사항으로 옮긴다). Description 의 제약 조건·불변 조건은 비즈니스 정책 레벨만 자연 단정문으로 작성 ("절대~/항상~" 강제 어조 폐지, 정책 명시 분량만, 채우기 강제 없음). 빈 항목은 H3 헤더 유지 + 본문 "해당 없음" 1줄. 참고 링크는 디자인 티켓 키 + Figma 노드 URL ({FIGMA_NODE_URL}) + 정책 파일 repo-relative path. 민감정보 금지. 불확실 부분은 정책 인용 또는 협의사항 마커로 처리.
```

### Step 3. JIRA 순차 쓰기

스킬 본체가 직접 호출한다. 검증된 custom field ID 만 사용하며 400 발생 시 abort 후 보고하고 추측 금지.

createJiraIssue 인자: cloudId 는 환경 상수, contentFormat markdown, fields 안에 project.key TECH, issuetype.name 스토리, summary 는 [BE] 또는 [FE] 접두사 + 기능명, description 은 본문 (메타 헤더 제외 Canonical 4섹션만), labels 는 분기에 따라 ["루티프로", "BE"] 또는 ["루티프로", "프론트엔드"], parent.key EPIC_KEY (없으면 생략), customfield_10020 SPRINT_ID (없으면 생략). **customfield_10445 (파트) 는 TECH 필수 필드 — BE 는 `{"id": "10590"}`, FE 는 `{"id": "10589"}` 로 설정**.

set 금지 필드: priority, duedate, assignee, customfield_10479 (난이도), customfield_10545 (복잡도), 실제업무 시작일/종료일. 담당자가 추후 채운다.

호출 순서: 첫째 BE 모드인 경우 BE 를 먼저 생성하여 BE 키 확보. 둘째 FE 모드인 경우 FE 본문의 {TBD_BE_KEY} 를 BE 키로 치환 후 FE 생성. 셋째 링크 생성 — 디자인→BE 와 디자인→FE 는 type "Problem/Incident" 로 (inwardIssue=디자인키, outwardIssue=BE/FE키), BE→FE 는 type "Blocks" 로 (inwardIssue=BE키, outwardIssue=FE키). 분기 모드에 해당하는 것만 생성. 넷째 링크 방향 불확실 시 호출 금지하고 "수동 링크 필요" 출력.

부분 실패 회복은 단계 실패 시 성공 키와 함께 보고. 재실행하면 Step 1 중복 확인이 성공한 티켓을 재사용으로 이어붙이므로 별도 cleanup 불필요.

게이트 (Phase 5 완료 보고 전): labels 정확, customfield_10445 미포함, 링크 상태 모두 보고 (성공 또는 실패 명시).

## Phase 6: 결과 출력

다음을 한 번에 출력한다. 디자인 작업 티켓 키, 생성된 티켓별 키와 제목과 URL 과 확인 필요 카운트 (BE/FE/기획자별), 링크 상태 ([디자인 → BE Problem/Incident 성공 또는 실패] 형식), 링크 실패 시 "수동 링크 필요" 항목 (출발 → 도착), 다음 단계 안내 (기획자와 BE 리드와 FE 리드가 각자 마커를 해소하고 각자 repo 에서 /jira-to-plan {티켓번호} 실행).

## Canonical Ticket Template (4섹션)

모든 BE/FE 티켓은 아래 4섹션을 동일한 번호와 순서로 모두 포함한다. 섹션 삭제 금지. 섹션 구분은 `## H2` + `---`.

**1. Summary** — 작업 목적 1–2줄. 소스 디자인 키 명시. 분기별: BE 는 상대 티켓 라인 자체 생략 (FE 키 미확보, JIRA issue link 로 연결). FE 는 BE 키 자리에 {TBD_BE_KEY} 박음 (부모가 BE 생성 후 치환). 단독 모드는 상대 티켓 라인 생략.

**2. User Story** — `As [사용자 유형], I want [원하는 기능], so that [얻는 가치].` 한 줄.

**3. Description** — 다음 하위 항목을 H3 으로 구성한다. 각 항목 본문이 비면 H3 헤더는 유지하고 본문에 "해당 없음" 1줄 (섹션 삭제 금지, 채우기도 금지).
- 기능 상세
- UI·UX 요구사항 (BE 는 "FE 티켓 참고 + user action 1줄 인라인", FE 는 자연어 1~3줄)
- 데이터 흐름
- 제약 조건 (비즈니스 규칙. 자연 단정문, 정책 명시 분량만, 채우기 강제 없음)
- 불변 조건 (비즈니스 정책 레벨만. "절대~/항상~" 강제 어조 폐지, 자연 단정문 허용. 정책 명시 분량만, 건수 강제 없음)
- 상태 표현 (FE 전용, BE 는 항목 자체 생략)
- 성능/정합성 (BE 전용, FE 는 항목 자체 생략. 정책 명시 SLA·정합성 요구만, 트랜잭션 범위 같은 구현 결정 제외)
- 예외 정책 (정책에 명시된 예외만)
- 협의사항 (**마커 단일 집결지** — [BE 리드 확인 필요] / [FE 리드 확인 필요] / [기획자 확인 필요], 슬래시 금지. Description 본문 다른 곳 및 Test Notes 인라인 마커 금지)
- 참고 링크 (디자인 티켓 키 + Figma 노드 URL + 정책 파일 repo-relative path)

**4. Test Notes** — AC 3건 이상을 Given/When/Then 형식으로 작성 (`- **Given** ... / - **When** ... / - **Then** ...`, 리스트 마커는 `-`). 각 AC 마다 negative path 가 명확한 경우에 한해 "실패 케이스" 1줄 동반 (협의사항 성격의 미정 항목은 협의사항으로 옮긴다). 회귀 테스트 포인트는 별도 H3 으로 (없으면 "해당 없음").

마커 선정 기준: [BE 리드 확인 필요] 는 구현 방식에 따라 정책 해석이 달라질 수 있는 항목으로 BE 티켓에만. [FE 리드 확인 필요] 는 표현 방식에 따라 정책 해석이 달라질 수 있는 항목으로 FE 티켓에만. [기획자 확인 필요] 는 비즈니스 의도 결정으로 양쪽 공통.

정책 인용 시 출처 파일 경로 (repo-relative) 명시. 불확실은 정책 인용 또는 마커로 표기.

게이트 (Phase 4.2 초안 시점): 메타 헤더 3블록 존재, BE/FE 제목에 [BE]/[FE] 접두사, Canonical 4섹션 모두 존재 (생략 항목은 분기별 규칙대로, 빈 항목은 "해당 없음" 1줄), AC 3건 이상 Given/When/Then, 마커는 협의사항 섹션 단일 집결 + 슬래시 표기 없음, 참고 링크에 디자인 키와 Figma URL 포함, JIRA wiki 문법 누출 부재 (`h[1-6].` / `----` / 단일 별표 강조 없음).

## 주의

Figma 사전 인증 필요. Pre-flight 의 MCP probe 가 처리한다. 정책 repo 에 도메인-디렉터리 매핑 인덱스 (policies/index.yaml 등) 가 있으면 자동 탐색 정확도가 올라간다. plan mode 본문이 SSOT — Phase 5.2 subagent 에는 Figma 원본을 전달하지 않는다 (URL 만 참고 링크용).
