---
description: Add an MCP improvement idea to the backlog
---

Add the following MCP improvement idea to `.claude/mcp-ideas.md`:

**Idea from user input:**
$ARGUMENTS

## Instructions

1. Read the current `.claude/mcp-ideas.md` file
2. Add a new entry to the "Ideas Backlog" section with today's date
3. Fill in the template:
   - **Type**: Determine if it's a Tool, Resource, or Prompt
   - **Target**: CLI MCP, Docs MCP, or Both
   - **Priority**: Assess priority based on impact and frequency of use
   - **Context**: Describe when/where this would be useful
   - **Description**: Expand on the idea
   - **Suggested Implementation**: Add implementation notes if obvious

4. Save the file
5. Confirm the idea was added

## Example

User input: "A tool to check if generated code is out of sync with the schema"

Would become:

```markdown
### 2024-12-18: Schema Sync Checker Tool
- **Type**: Tool
- **Target**: CLI MCP
- **Priority**: High
- **Context**: After modifying schemas, need to know if regeneration is needed
- **Description**: Compare current schema to generated code and report differences
- **Suggested Implementation**: Hash schema, compare to stored hash in generated files
```
