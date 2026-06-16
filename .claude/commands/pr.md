---
name: pr
model: sonnet
description: 현재 브랜치 변경 사항을 commit·push 후 gh CLI로 PR 생성. feature/refactor → develop, fix/hotfix → staging 자동 결정. 빌드 통과 후에만 push. Triggers: "PR 올려줘", "PR 만들어줘", "pr 생성해줘", "RP-1234 PR 올려줘".
---

# PR Skill

현재 브랜치 변경 사항을 PR로 올리는 것까지만 담당. CodeRabbit 폴링·리뷰 대응은 이 스킬의 범위가 아님.

---

## Phase 흐름

**Phase 1 → 2 → 3 → 4 → 5** 순서로 진행. Phase 2는 자동 결정(통보만)이며, 사용자 확인 게이트는 없다 — 단, 브랜치명이 매칭 규칙에 어긋날 때만 사용자에 묻는 폴백이 발동한다.

---

## Phase 1: 변경 사항 점검

### Step 1.1: 현재 상태 확인

```bash
git status
git diff --stat
git branch --show-current
```

- 현재 브랜치 이름 기록 (PR 제목 작성용)
- 변경 파일 목록 요약하여 사용자에게 보여줌
- 변경 사항이 없으면 작업 중단하고 사용자에게 알림

### Step 1.2: 티켓 키 추출

브랜치 이름에서 티켓 키 추출 (예: `feature/RP-5348` → `RP-5348`). 추출 실패 시 사용자에게 직접 묻기:

```
티켓 키를 추출할 수 없습니다. 커밋 메시지/PR 본문에 사용할 티켓 키를 알려주세요. (예: RP-5348)
```

---

## Phase 2: 대상 브랜치 자동 결정

**현재 브랜치명을 기반으로 자동 결정한다. 사용자에게 묻지 않는다.**

### 결정 규칙

브랜치명을 소문자로 비교해 다음 우선순위로 매칭:

| 조건 | 대상 브랜치 |
| --- | --- |
| 브랜치명에 `hotfix` 포함 | **staging** |
| 브랜치명에 `fix` 포함 (hotfix 매칭이 아닌 경우 포함) | **staging** |
| 브랜치명에 `feature` 포함 | **develop** |
| 브랜치명에 `refactor` 포함 | **develop** |
| 위 어느 것에도 매칭되지 않음 | **폴백: 사용자에게 질의** |

> 비표준 브랜치명(예: `feature/fix-something`)은 우선순위상 staging. 의도와 다르면 폴백으로 덮어쓰기 가능.

### 결과 통보

```
## ✓ 대상 브랜치 자동 결정

브랜치: {current-branch-name}
매칭 규칙: {hotfix | fix | feature}
대상 브랜치: **{develop | staging}**

→ Phase 3 (Commit)으로 진행합니다.
```

### 매칭 실패 폴백

브랜치명에 `feature`, `refactor`, `fix`, `hotfix` 어느 것도 포함되지 않으면 (예: `release/v2.0`, `chore/cleanup`) **사용자에게 질의**:

```
브랜치명({current-branch-name})이 자동 결정 규칙에 매칭되지 않습니다.
대상 브랜치를 입력해주세요. (예: develop, staging, main)
```

응답값을 그대로 대상 브랜치로 사용 (공백·따옴표 제거).

---

## Phase 3: Commit

### Step 3.1: Stage 및 커밋 메시지 작성

```bash
git add -A
git status
```

- **커밋 메시지 포맷:** `{prefix} ({TICKET_KEY}): <summary>`
- prefix는 브랜치 prefix를 따른다: `feature/` → `feat`, `fix/` → `fix`, `hotfix/` → `hotfix`
- 예시: `feat (RP-5348): Add user login`

이미 커밋이 되어 있고 변경이 없는 경우 Step 3.2는 건너뛰고 바로 Phase 4로.

### Step 3.2: 커밋 생성

```bash
git commit -m "{prefix} ({TICKET_KEY}): <summary>"
```

---

## Phase 4: Build & Push

### Step 4.1: 빌드 (필수)

**MANDATORY:** `pnpm build`가 성공하지 않으면 push 하지 않는다.

```bash
pnpm build
```

빌드 실패 시:
- 에러 로그를 사용자에게 보고
- 원인을 수정한 뒤 다시 build 실행
- 통과할 때까지 반복. **build 실패 상태로 push 금지.**

### Step 4.2: Push

빌드 통과 직후에만 push:

```bash
git push -u origin <current-branch>
```

---

## Phase 5: Create PR

### Step 5.1: PR 정보 준비

- **PR Title:** 브랜치 이름을 대문자로 변환. 예: `feature/RP-5348` → `FEATURE/RP-5348`
- **PR Description:** JIRA 티켓 URL을 본문에 포함. 포맷: `https://wemeet2025.atlassian.net/browse/{TICKET_KEY}`
- **Base branch:** Phase 2에서 확인한 브랜치

### Step 5.2: gh CLI 사전 점검

**gh CLI 인증 충돌 회피:** `GITHUB_TOKEN` 환경변수가 키체인 인증과 충돌할 수 있어 gh 명령은 항상 `GITHUB_TOKEN=""` 프리픽스로 실행.

```bash
GITHUB_TOKEN="" gh auth status
```

상황별 처리:

| 상태 | 처리 |
| --- | --- |
| gh 미설치 | `brew install gh` 안내 → 사용자에게 "gh CLI 설치 후 진행할까요? 아니면 수동 PR용 compare URL을 출력할까요?" 질문 |
| gh 설치 + 미인증 | `gh auth login` 안내 → 사용자가 완료 후 진행 |
| gh 인증 완료 | 다음 단계로 |

### Step 5.3: PR 생성

```bash
GITHUB_TOKEN="" gh pr create \
  --base <target-branch> \
  --title "<UPPERCASED_BRANCH>" \
  --body "https://wemeet2025.atlassian.net/browse/{TICKET_KEY}"
```

성공 시 생성된 PR URL을 사용자에게 보고하고 종료.

### Step 5.4: gh 실패 시 폴백

네트워크/권한 등으로 gh 실패 시, compare URL과 PR 제목/본문 추천을 출력하여 사용자가 수동 생성할 수 있게 한다:

```
gh CLI로 PR 생성 실패. 아래 정보로 수동 생성해주세요.

Compare URL: https://github.com/{owner}/{repo}/compare/{target}...{branch}
제목: {UPPERCASED_BRANCH}
본문: https://wemeet2025.atlassian.net/browse/{TICKET_KEY}
```

`{owner}/{repo}`는 `git remote get-url origin`에서 추출.

---

## 범위 외 (Out of scope)

다음은 이 스킬에서 처리하지 않는다:

- CodeRabbit 등 자동 리뷰 댓글 폴링
- CodeRabbit 피드백 반영
- PR 머지
- 로컬 코드 리뷰 → `review` 스킬

---

## Quick reference

| Item                | Format                                                    |
| ------------------- | --------------------------------------------------------- |
| 대상 브랜치 자동 결정 | 브랜치명에 `feature`/`refactor` 포함 → develop, `fix`/`hotfix` 포함 → staging. 매칭 실패 시에만 사용자 질의 |
| 커밋 메시지         | `{prefix} ({TICKET_KEY}): <summary>` (prefix는 브랜치 따름) |
| PR Title            | 브랜치 이름을 대문자로 (예: `FEATURE/RP-5348`)            |
| PR Body             | `https://wemeet2025.atlassian.net/browse/{TICKET_KEY}`    |
| gh CLI              | 항상 `GITHUB_TOKEN=""` 프리픽스                           |
| Build 규칙          | **`pnpm build` 성공 직후에만 push**                       |
| gh 실패 시           | compare URL + 추천 제목/본문 출력 (수동 폴백)             |
| Out of scope        | CodeRabbit 폴링/대응, PR 머지, 로컬 코드 리뷰              |
