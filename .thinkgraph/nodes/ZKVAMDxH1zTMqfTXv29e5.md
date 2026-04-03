# Stealing from other projects

**Type:** research
**Status:** done
**Node ID:** ZKVAMDxH1zTMqfTXv29e5

## Output

ThinkGraph Convergence Implementation Brief — a 3-phase build plan validated against the actual codebase.

**Phase 1 (1-2 weeks, no new deps):**
- 1A. MDC Output Rendering — replace plain text with `@nuxtjs/mdc` rendered components
- 1B. Graph Validation — `validateGraph()` utility, MCP tool, visual indicators
- 1C. Wiki-Link Cross-References — `[[node title]]` syntax with bidirectional edges

**Phase 2 (next month, new infra):**
- 2A. Repo Watchlist + Daily Digest — GitHub API → AI relevance → digest nodes
- 2B. Semantic Search — Workers AI + Cloudflare Vectorize (~$0.31/month)
- 2C. Pipeline Formalization — schema-driven steps with validation

**Phase 3 (future):** Spec-driven generation, cross-collection validation, local models

**Rejected:** spec-kit (Python), nuxt-local-model (native addon), lat.md (less structured than ThinkGraph)

**Key insight:** All four analyzed projects solve the same problem — making knowledge navigable for AI. ThinkGraph has the strongest foundation but needs validation, rich rendering, semantic search, and external signals.

## Artifacts

- `docs/briefings/crouton-thinkgraph-convergence-brief.md` — full implementation brief
