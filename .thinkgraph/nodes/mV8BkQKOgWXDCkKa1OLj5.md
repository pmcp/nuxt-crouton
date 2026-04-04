# Graph Validation System (thinkgraph check)

**Status**: done
**Type**: idea
**Stage**: builder

## What was built

Graph validation system that detects integrity issues across ThinkGraph projects (Phase 1B of convergence brief).

### New files
- `server/utils/validate-graph.ts` — Core `validateGraph(teamId, projectId)` utility with 5 validation checks
- `server/api/teams/[id]/thinkgraph-nodes/validate.get.ts` — API endpoint
- `server/mcp/tools/check-graph.ts` — MCP tool (10th tool)

### Modified files
- `app/components/ThinkgraphNodesNode.vue` — Visual warning badge + outline for nodes with issues

## Validation checks
1. Broken `contextNodeIds` → error severity
2. Broken `dependsOn` refs → error severity
3. Orphaned nodes (no parent, depth > 0) → warning
4. Stale active status (no sessionId heuristic) → warning
5. Duplicate titles at same depth → warning
