---
name: think-aloud
description: Think through a problem live on the ThinkGraph canvas. Each reasoning step appears as a node in real-time.
allowed-tools: Bash, Read, Grep, Glob, Agent
argument-hint: "<question or task to think through>"
---

# Think Aloud

Push your reasoning process to ThinkGraph in real-time. The user watches nodes appear on the graph canvas as you work through a problem.

## How It Works

You use the ThinkGraph MCP tools via HTTP to create nodes. Each node is a discrete thinking step. The real-time Yjs sync makes them appear instantly in the browser.

## MCP Tool Call Pattern

All mutations go through the MCP endpoint:

```bash
curl -s -X POST http://localhost:3004/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d @/tmp/thinkgraph-node.json
```

Write the JSON payload to `/tmp/thinkgraph-node.json` first (avoids shell escaping issues):

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create-node",
    "arguments": {
      "teamId": "test1",
      "graphId": "<GRAPH_ID>",
      "content": "<node content>",
      "nodeType": "<idea|insight|decision|question>",
      "parentId": "<parent node ID or omit for root>"
    }
  }
}
```

## Workflow

### Step 1: Find or create the graph

Ask the user which graph to use, or create a new one. Get the graphId.

To list graphs, use `get-graph-overview`:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get-graph-overview","arguments":{"teamId":"test1"}}}
```

### Step 2: Create the root node

The user's question or task becomes the root **question** node. Parse the response to get the node ID — you'll use it as `parentId` for branches.

### Step 3: Think in branches

Work through the problem step by step. For each discrete thought, create a node:

| When you're... | Node type | Example |
|----------------|-----------|---------|
| Exploring an approach | `idea` | "Could use WebSocket polling instead of Yjs" |
| Asking yourself something | `question` | "What happens if two clients write at the same time?" |
| Realizing something important | `insight` | "The room key mismatch was slug vs UUID — client uses slug" |
| Committing to an approach | `decision` | "Use server-side signaling via existing Yjs sync rooms" |

### Step 4: Branch and converge

- **Branch**: Create sibling nodes under the same parent when exploring alternatives
- **Go deeper**: Create child nodes when drilling into a specific approach
- **Converge**: Star the winning path with `starred: true`
- **Synthesize**: Create a final `decision` or `insight` node summarizing the conclusion

### Step 5: Summarize

After thinking is complete, give the user a text summary of the conclusion. The graph is the artifact — the summary is the takeaway.

## Rules

1. **One thought per node** — Keep nodes concise (1-3 sentences). The graph should be scannable.
2. **Create nodes as you think** — Don't batch them. The whole point is the user watches the tree grow live.
3. **Use parentId to show reasoning flow** — Child nodes should logically follow from their parent.
4. **Don't narrate between nodes** — Minimize text output between MCP calls. Let the graph speak.
5. **Star key decisions** — Use `starred: true` on the most important nodes.
6. **Read the codebase when needed** — Use Grep/Read/Glob between nodes to ground your thinking in actual code. Reference file paths in node content when relevant.
7. **Depth over breadth** — Go deep on the most promising branch rather than shallowly listing many options.

## Node Content Guidelines

**Good node content:**
- "The PATCH endpoint rejects position updates because thinkgraph_decisions has no position field"
- "useFlowPositionStore already handles this — just need dataMode='ephemeral' on CroutonFlow"
- "What if we add a position column to the schema instead? Simpler but couples layout to data"

**Bad node content:**
- "Let me think about this..." (no substance)
- "I found something interesting" (vague)
- Long paragraphs (not scannable)

## Example Session

User: `/think-aloud Why is the deploy failing on Cloudflare?`

```
(question) Why is the deploy failing on Cloudflare?    ← root
  (idea) Check wrangler.toml for config issues        ← first exploration
    (insight) env block in redirected config causes    ← finding
              Wrangler 4.64+ to reject the build
  (question) Is it the Nitro build or the deploy step? ← branching
    (insight) Build succeeds, wrangler pages deploy    ← narrowing down
              fails with "unknown field env"
  (decision) Strip env blocks from generated           ← conclusion
             wrangler.json in CI build step
```

## Port Configuration

The ThinkGraph dev server runs on port 3004 by default. If the user's setup differs, they'll tell you. The teamId defaults to "test1" unless specified.
