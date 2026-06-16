#!/usr/bin/env bash
# PostToolUse hook: warns when a new api.ts file duplicates an existing endpoint.
# Enforces architecture.api-no-duplicate-endpoint rule.
# Reads Claude Code hook JSON from stdin.

INPUT=$(cat)

# Use python3 to extract fields (jq may not be installed)
FILE=$(python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('tool_input',{}).get('file_path',''))" <<< "$INPUT" 2>/dev/null || true)

# Only check api.ts files under src/api/
if ! echo "$FILE" | grep -qE '/src/api/.+/api\.ts$'; then
  exit 0
fi

CONTENT=$(python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('tool_input',{}).get('content',''))" <<< "$INPUT" 2>/dev/null || true)

# Extract endpoint paths: match 'api/v1/...' or "api/v1/..."
ENDPOINTS=$(printf '%s' "$CONTENT" | grep -oE "(['\"])api/v[0-9]+/[^'\"?]+" | sed "s/^['\"]//g" | sort -u)

if [ -z "$ENDPOINTS" ]; then
  exit 0
fi

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WARNINGS=""

while IFS= read -r ep; do
  MATCHES=$(grep -rn --include="*.ts" \
    "'${ep}'\|\"${ep}\"" \
    "${PROJECT_ROOT}/src/api/" 2>/dev/null \
    | grep -v "^${FILE}:" \
    | head -3 || true)

  if [ -n "$MATCHES" ]; then
    EXISTING_FILE=$(echo "$MATCHES" | head -1 | cut -d: -f1 | sed "s|${PROJECT_ROOT}/||")
    WARNINGS="${WARNINGS}'${ep}' already in ${EXISTING_FILE}; "
  fi
done <<< "$ENDPOINTS"

if [ -n "$WARNINGS" ]; then
  MSG="⚠️ architecture.api-no-duplicate-endpoint: '${FILE##*/}' uses endpoint(s) already in codebase. Reuse-first: same endpoint + no breaking change = call existing function. Duplicates: ${WARNINGS}Justify new function or reuse existing one."
  # JSON-escape the message using python3
  ESCAPED=$(python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" <<< "$MSG" 2>/dev/null || true)
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":%s}}' "$ESCAPED"
fi
