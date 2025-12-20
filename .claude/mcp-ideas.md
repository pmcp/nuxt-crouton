# MCP Improvement Ideas

This file captures ideas for improving the Crouton MCP servers (both the standalone CLI MCP and the docs website MCP).

**Add ideas here when you encounter something that would benefit from MCP integration.**

## How to Add Ideas

Use the `/mcp-idea` command or add manually:

```markdown
### [Date] Idea Title
- **Type**: Tool / Resource / Prompt
- **Target**: CLI MCP / Docs MCP / Both
- **Priority**: High / Medium / Low
- **Context**: When/where this would be useful
- **Description**: What it should do
- **Suggested Implementation**: How to implement (optional)
```

---

## Ideas Backlog

### 2024-12-18: Schema Diff Tool
- **Type**: Tool
- **Target**: CLI MCP
- **Priority**: Medium
- **Context**: When updating existing collections or comparing schema versions
- **Description**: Compare two schemas and show what fields were added/removed/changed
- **Suggested Implementation**: Accept two schema JSON strings, return diff in readable format

---

### 2024-12-18: Collection Status Tool
- **Type**: Tool
- **Target**: CLI MCP
- **Priority**: Medium
- **Context**: Understanding what's been generated vs what's pending
- **Description**: Check status of a collection - is it generated? What files exist? Any out-of-sync?
- **Suggested Implementation**: Scan layer directory, compare to schema, report status

---

### 2024-12-18: Migration Generator Tool
- **Type**: Tool
- **Target**: CLI MCP
- **Priority**: Low
- **Context**: When schema changes and database needs migration
- **Description**: Generate Drizzle migration from schema changes
- **Suggested Implementation**: Wrap `drizzle-kit generate` with schema context

---

### 2024-12-20: Schema-Level Access Control
- **Type**: Tool enhancement
- **Target**: CLI MCP
- **Priority**: High
- **Context**: When generating collections that need public access or role-based permissions
- **Description**: Add `access` field to collection meta for role-based endpoint generation. Built-in roles: `public` (no auth), `member` (any team member), `owner` (record creator), `admin` (team admin). Generator creates appropriate middleware checks per endpoint.
- **Suggested Implementation**:
  - Schema meta: `{ "access": { "read": "public", "create": "member", "update": "owner", "delete": "admin" } }`
  - Generator creates public endpoints at `/api/public/[collection]` for public read
  - Adds role check middleware to team-scoped endpoints based on access config
  - Default: all operations require `member` (current behavior)

---

## Completed Ideas

<!-- Move ideas here when implemented -->

---

## Notes

- Ideas from this file feed into the CLI MCP (`packages/nuxt-crouton-mcp-server/`) and Docs MCP (`apps/docs/server/mcp/`)
- High priority ideas should be implemented in the next development cycle
- Consider both AI assistant usability and human developer experience
