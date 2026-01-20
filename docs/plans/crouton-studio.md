# Plan: Crouton Studio - AI App Builder

## Vision

An embeddable AI assistant for building Nuxt apps through conversation. Add `@fyit/crouton-studio` to any crouton app and get a `/studio` route with chat + artifacts interface. Works with your existing collections, components, and pages.

**Tech Stack**: Nuxt 4 Layer + @fyit/crouton-ai

## Why a Package (Not Standalone App)?

| Standalone App | Embedded Package |
|----------------|------------------|
| Run separate `pnpm dev` | Already running in your app |
| Separate database | Uses app's existing database |
| Can't see app's collections | Direct access to app's collections |
| Context switching | Integrated experience |
| Create new projects | Works in current project |

**Key insight**: Developers are already running their app. Studio should live *inside* it.

## Usage

```typescript
// apps/my-app/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-ai',
    '@fyit/crouton-studio'  // Adds /_studio routes
  ]
})
```

```bash
# Start your app as normal
pnpm dev

# Visit Studio
open http://localhost:3000/_studio
```

## User Flow

```
Developer runs `pnpm dev` in their app
              ↓
Opens localhost:3000/_studio
              ↓
Studio scans app → shows existing collections, components, pages
              ↓
Developer chats: "Add a tasks collection with title, status, assignee"
              ↓
AI creates schema → runs CLI → files appear in layers/
              ↓
Developer: "Make the task card show a colored badge for status"
              ↓
AI adapts component → writes to app/components/
              ↓
Developer sees changes via hot reload (already running!)
```

## Interface Layout

```
┌──────────────────────────┬─────────────────────────────────┐
│  💬 CHAT (50%)           │  📋 ARTIFACTS (50%)             │
│                          │                                 │
│  Conversation with AI    │  Scrollable stack of:          │
│  - Describe collections  │  - Existing collection cards   │
│  - Request component     │  - New collection cards        │
│    changes               │  - Component cards             │
│  - Ask for new pages     │  - Page cards                  │
│                          │                                 │
│                          │  Each card shows:              │
│                          │  - Status (existing/new/modified)│
│                          │  - View code/schema            │
│                          │  - Edit inline                 │
│                          │                                 │
├──────────────────────────┴─────────────────────────────────┤
│  [📁 layers/bookings]  [🔄 Scan App]  [⚙️ Settings]         │
└────────────────────────────────────────────────────────────┘
```

## Studio's Data Model

Studio stores its state in the **host app's database** (not a separate one):

```
📁 Host app's database (SQLite via NuxtHub)

studioSessions/
├── schema: id, name, createdAt, updatedAt
├── Used for: Group related chat messages
└── One session = one "conversation" about the app

studioMessages/
├── schema: id, sessionId, role, content, artifactIds[], createdAt
├── role: 'user' | 'assistant' | 'system'
├── artifactIds: References to artifacts created/modified
└── Used for: Chat history, AI context

studioArtifacts/
├── schema: id, sessionId, type, name, path, content, status, createdAt
├── Types: 'collection' | 'component' | 'page' | 'composable'
├── status: 'pending' | 'written' | 'error'
├── path: File path relative to app root (e.g., 'layers/bookings/collections/tasks')
└── Used for: Track what Studio has created/modified
```

**Why in host database?**
- No separate app to manage
- Persists across dev server restarts
- Can reference the actual collections being built

## App Scanning

Studio scans the host app on load to understand its current state:

```typescript
// What Studio discovers
interface AppContext {
  // From nuxt.config.ts
  layers: string[]              // ['./layers/bookings']
  extends: string[]             // ['@fyit/crouton', '@fyit/crouton-auth']

  // From scanning layers/*/collections/
  collections: CollectionInfo[] // [{ name: 'teams', fields: [...] }]

  // From scanning app/components/
  components: ComponentInfo[]   // [{ name: 'TeamsCard', path: '...' }]

  // From scanning app/pages/ or pages collection
  pages: PageInfo[]             // [{ title: 'Dashboard', path: '/' }]
}
```

This context is included in the AI system prompt so it knows what already exists.

## Phase 1: Foundation

### 1.1 Package Scaffold
- Create `packages/crouton-studio/` as Nuxt layer
- Add `/_studio` route prefix (underscore = internal)
- Extend `@fyit/crouton-ai` for chat capabilities
- Basic two-panel layout

### 1.2 App Scanner
- Scan host app's layers, collections, components
- Build AppContext for AI system prompt
- Watch for file changes (update context)

### 1.3 Chat Interface
- Use `useChat()` from crouton-ai
- System prompt includes AppContext
- Message persistence to studioMessages

### 1.4 Artifact Display
- Show existing collections (from scan) as read-only cards
- Show new/modified artifacts as editable cards
- Status indicators: existing, new, modified, pending

## Phase 2: Collection Generation

### 2.1 Schema Design via Chat
- AI designs collection schema based on conversation
- Creates artifact with type: 'collection'
- Shows schema in expandable card

### 2.2 CLI Integration
- Server endpoint runs `crouton generate` in host app directory
- Writes to host app's layer (e.g., `layers/bookings/collections/tasks/`)
- Updates artifact status to 'written'

### 2.3 Hot Reload Integration
- Files written trigger Nuxt hot reload
- Developer sees new collection immediately
- Artifact card updates to show 'existing' status

## Phase 3: Component Adaptation

### 3.1 Component Artifacts
- After CLI generates components, create artifacts for them
- AI can read and suggest improvements
- Show diff between original and adapted

### 3.2 AI Enhancement
- System prompt includes:
  - Generated component code
  - Schema context
  - Nuxt UI 4 patterns
- AI outputs enhanced Vue code
- Write to host app's components folder

## Phase 4: Page Generation

### 4.1 Page Artifacts
- AI creates page configurations
- Integrates with crouton-pages if available
- Or creates Vue page files directly

### 4.2 Navigation
- Auto-update navigation based on new pages
- Integrate with existing app navigation

## Key Files to Create

```
packages/crouton-studio/
├── app/
│   ├── pages/
│   │   └── _studio/
│   │       ├── index.vue          # Main studio interface
│   │       └── settings.vue       # Configuration
│   ├── components/
│   │   └── Studio/
│   │       ├── Layout.vue         # Split chat + artifacts
│   │       ├── ChatPanel.vue      # Uses useChat()
│   │       ├── ArtifactPanel.vue  # Artifact list
│   │       ├── ArtifactCard.vue   # Individual artifact
│   │       └── CodePreview.vue    # Syntax highlighting
│   ├── composables/
│   │   ├── useStudio.ts           # Main studio state
│   │   ├── useAppScanner.ts       # Scan host app
│   │   ├── useStudioAI.ts         # Chat with artifact sync
│   │   └── useStudioFs.ts         # File operations
│   └── types/
│       └── studio.ts
│
├── server/
│   ├── api/
│   │   └── _studio/
│   │       ├── scan.get.ts        # Scan host app
│   │       ├── chat.post.ts       # AI chat endpoint
│   │       ├── fs/
│   │       │   ├── read.post.ts
│   │       │   └── write.post.ts
│   │       └── cli/
│   │           └── generate.post.ts
│   └── utils/
│       ├── scanner.ts             # App scanning logic
│       └── fs.ts                  # Path validation
│
├── schemas/                        # Crouton schemas for Studio's own data
│   ├── studio-sessions.json
│   ├── studio-messages.json
│   └── studio-artifacts.json
│
├── nuxt.config.ts
├── package.json
└── CLAUDE.md
```

## Server API Endpoints

### App Scanner

```typescript
// server/api/_studio/scan.get.ts
export default defineEventHandler(async (event) => {
  const appRoot = process.cwd()

  // Scan layers
  const layers = await scanLayers(appRoot)

  // Scan collections in each layer
  const collections = await scanCollections(appRoot, layers)

  // Scan components
  const components = await scanComponents(appRoot)

  // Scan pages
  const pages = await scanPages(appRoot)

  return { layers, collections, components, pages }
})
```

### CLI Execution

```typescript
// server/api/_studio/cli/generate.post.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  const { schema, layer } = await readBody(event)
  const appRoot = process.cwd()

  // Write schema to temp file
  const schemaPath = join(appRoot, '.studio', 'temp-schema.json')
  await writeFile(schemaPath, JSON.stringify(schema))

  // Run crouton generate
  const { stdout, stderr } = await execAsync(
    `npx crouton generate --schema ${schemaPath} --layer ${layer}`,
    { cwd: appRoot, timeout: 60000 }
  )

  return { success: true, output: stdout }
})
```

### File Operations

```typescript
// server/api/_studio/fs/write.post.ts
export default defineEventHandler(async (event) => {
  const { path, content } = await readBody(event)
  const appRoot = process.cwd()
  const fullPath = join(appRoot, path)

  // Validate path is within app root
  if (!fullPath.startsWith(appRoot)) {
    throw createError({ statusCode: 403, message: 'Path outside app root' })
  }

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')

  return { success: true }
})
```

## AI System Prompt

```typescript
const systemPrompt = `You are Crouton Studio, an AI assistant for building Nuxt applications.

## Current App Context

The developer is working on a Nuxt app with:

### Existing Layers
${appContext.layers.map(l => `- ${l}`).join('\n')}

### Existing Collections
${appContext.collections.map(c => `- ${c.name}: ${c.fields.map(f => f.name).join(', ')}`).join('\n')}

### Existing Components
${appContext.components.map(c => `- ${c.name}`).join('\n')}

## Your Capabilities

1. **Design collection schemas** - Create JSON schemas for new collections
2. **Generate collections** - Run crouton CLI to scaffold CRUD
3. **Adapt components** - Enhance generated components with better UX
4. **Create pages** - Design page layouts using collection blocks

## Output Format

When creating artifacts, use this format:

\`\`\`artifact:collection:tasks
{
  "name": "tasks",
  "fields": [...]
}
\`\`\`

\`\`\`artifact:component:TasksCard
<script setup lang="ts">
// Vue component code
</script>
\`\`\`

The developer will see these as cards they can review and apply.
`
```

## Configuration

```typescript
// packages/crouton-studio/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@fyit/crouton-ai'],

  // Studio's own collections (for sessions, messages, artifacts)
  crouton: {
    collections: {
      prefix: 'studio'  // Tables: studio_sessions, studio_messages, etc.
    }
  }
})
```

Host app just extends:

```typescript
// apps/my-app/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-studio'
  ],

  hub: {
    db: 'sqlite'
  }
})
```

## Verification

### Test Scenario
1. Add `@fyit/crouton-studio` to test-bookings
2. Run `pnpm dev`
3. Open `localhost:3000/_studio`
4. Verify: Existing collections shown (teams, bookings, etc.)
5. Say "Add a tasks collection with title, description, status, and assignee"
6. Verify: Collection artifact appears
7. Click "Generate" → CLI runs
8. Verify: Files appear in `layers/bookings/collections/tasks/`
9. Verify: Hot reload shows new collection
10. Say "Make the TasksCard show status as a colored badge"
11. Verify: Component artifact with enhanced code
12. Apply → file written → hot reload shows change

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Package type | Nuxt layer in `packages/crouton-studio/` |
| Route prefix | `/_studio` (underscore = internal) |
| Database | Host app's database |
| File operations | Write to host app directory |
| AI integration | Extend `@fyit/crouton-ai` |
| App awareness | Scan on load, include in system prompt |

## Future Considerations (Not MVP)

- **Multi-layer support**: Let user choose which layer to generate into
- **Git integration**: Show uncommitted changes, offer to commit
- **Preview mode**: Render components in iframe
- **Template library**: Pre-built collection templates
- **Diff view**: Show file changes before applying

## Implementation Order

### Sprint 1: Package Scaffold
1. Create `packages/crouton-studio/`
2. Add `/_studio/index.vue` route
3. Basic two-panel layout
4. Extend crouton-ai

### Sprint 2: App Scanner
1. Server endpoint to scan host app
2. Discover layers, collections, components
3. Display existing artifacts as cards
4. Build AppContext for AI

### Sprint 3: Chat + Artifacts
1. Use `useChat()` with custom system prompt
2. Parse AI responses into artifacts
3. Artifact cards with status indicators
4. Message persistence

### Sprint 4: CLI Integration
1. Server endpoint to run crouton generate
2. Write schema, execute CLI
3. Update artifact status
4. Trigger hot reload awareness

### Sprint 5: Component Adaptation
1. AI reads generated components
2. Suggests enhancements
3. Write adapted components
4. Diff view

### Sprint 6: Polish
1. Settings page
2. Error handling
3. Code syntax highlighting
4. Session management