# MCP Setup

Guide through setting up MCP (Model Context Protocol) servers. This covers JIRA and Figma integrations.

## Overview

MCP lets tools call external services (JIRA, Figma, etc.). Configuration locations:

- **Project-level**: `.cursor/mcp.json` in the project root
- **Global**: `~/.cursor/mcp.json`

Both are merged; project config overrides global for the same server name. **Restart Cursor** after config changes.

---

## Step 1: Choose and Install the MCP Server

Ask which integration the user needs, then follow the matching setup.

### JIRA MCP

**Option A — Atlassian official (simplest)**
No local install. Uses OAuth in a popup.

- Config: `command: "npx"`, `args: ["-y", "mcp-remote@latest", "https://mcp.atlassian.com/v1/sse"]`
- User authorizes in the popup when first used.

**Option B — webboy/mcp-jira (Python, more control)**
Requires Python 3.10+ and `uv`. Needs JIRA URL, email, API token, and default project.

- JIRA URL: `https://your-domain.atlassian.net`
- Email: Your Atlassian account email
- API Token: Create at https://id.atlassian.com/manage-profile/security/api-tokens
- Default Project: e.g. `PROJ`

### Figma MCP

**Option A — Remote (no desktop app)**

- URL: `https://mcp.figma.com/mcp`
- Requires OAuth when first used.

**Option B — Desktop (local)**

- Requires Figma Desktop app and a design file open with Dev Mode.
- URL: `http://127.0.0.1:3845/mcp`

---

## Step 2: Add to Config

1. Choose config location (project or global)
2. Edit the file. Create it if missing:

**For stdio (local process):**

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"]
    }
  }
}
```

**For URL/SSE (remote or local HTTP):**

```json
{
  "mcpServers": {
    "server-name": {
      "url": "https://example.com/mcp"
    }
  }
}
```

**Security**: Never commit API tokens or secrets.

3. **Restart Cursor** so it picks up the new config.

---

## Step 3: Verify It Works

1. Check tools are visible in the tools list
2. Run a simple call (e.g., JIRA: list projects; Figma: list files)
3. Handle failures:
   - Connection refused/timeout: Server not running or wrong URL
   - Auth errors: Check tokens, OAuth flow, or headers
   - Missing tools: Restart Cursor and confirm config syntax

---

## Quick Reference Config Examples

**JIRA (Atlassian official):**

```json
"atlassian": {
  "command": "npx",
  "args": ["-y", "mcp-remote@latest", "https://mcp.atlassian.com/v1/sse"]
}
```

**Figma remote:**

```json
"figma": {
  "url": "https://mcp.figma.com/mcp"
}
```

**Figma desktop:**

```json
"figma-desktop": {
  "url": "http://127.0.0.1:3845/mcp"
}
```

---

## Troubleshooting

- **Config Not Loading**: Restart Cursor. Validate JSON. Check file location.
- **Tools Not Appearing**: Confirm server name. Check command/args or URL.
- **Connection Refused**: Ensure server process is running.
- **Auth Errors**: Re-run OAuth or verify API tokens.
- **Global vs Project Config**: If global is ignored, use project-level.
