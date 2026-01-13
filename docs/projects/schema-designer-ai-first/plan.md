# Schema Designer AI-First Flow — Build Plan

## One-liner

Transform the schema designer into an AI-first experience where users describe their app and AI creates packages + collections automatically.

---

## The Problem

1. **AI is buried in Step 3** — Currently users must manually set up project name, choose packages, then finally get to AI in "Configure" step.

2. **Backwards UX** — The natural flow is "describe what I want" → "AI builds it" → "I review/tweak". Current flow forces manual setup first.

3. **AI doesn't know about packages** — The current AI only generates custom collections. It can't suggest or add packages like `crouton-bookings`.

4. **Lost magic** — The original schema designer let you describe a collection and AI created it. That magic is now hidden behind 2 manual steps.

5. **No intelligent package suggestions** — When user says "booking system", AI should know to add `crouton-bookings` automatically.

---

## The Solution

**AI-first wizard flow:**
- Step 1: "What do you want to build?" (AI chat)
- AI analyzes intent → suggests packages + generates custom collections
- Step 2: Review what AI created
- Step 3: Fine-tune if needed
- Step 4: Export

**Package-aware AI:**
- AI knows about available packages and their purposes
- AI can recommend packages based on user description
- AI creates custom collections for anything packages don't cover

---

## Current vs New Flow

### Current Flow (Wrong)

```
Step 1: Project Setup
├── Enter project name
├── Enter base layer name
└── [Continue]

Step 2: Building Blocks
├── Browse packages (manual)
├── Add custom collections (manual)
└── [Continue]

Step 3: Configure
├── AI Chat Panel (finally!)
├── Field Catalog
├── Schema Builder
└── [Continue]

Step 4: Export
└── Review & download
```

### New Flow (AI-First)

```
Step 1: Describe Your App (AI-FIRST)
├── Large chat interface
├── "What do you want to build?"
├── AI suggests packages + creates collections
├── Real-time preview of what's being created
└── [Continue when ready]

Step 2: Review & Configure
├── See packages AI added (with toggle to remove)
├── See collections AI created
├── Edit fields if needed
├── Add more packages/collections manually
└── [Continue]

Step 3: Project Details
├── Project name (auto-suggested by AI)
├── Base layer name (auto-suggested by AI)
└── [Continue]

Step 4: Export
└── Review & download
```

---

## AI System Prompt Updates

### Current Prompt Limitations

The current AI prompt only knows about:
- Field types
- Meta properties
- Collection structure

It does NOT know about:
- Available packages
- Package capabilities
- When to suggest packages

### New Prompt Additions

```typescript
// Add to system prompt
const packageContext = `
## Available Crouton Packages

You can recommend these packages when appropriate:

| Package | Use When | Collections Included |
|---------|----------|---------------------|
| crouton-bookings | User mentions: bookings, appointments, reservations, scheduling, calendar, slots, availability | bookings, locations, settings, emailTemplates, emailLogs |
| crouton-sales | User mentions: sales, POS, point of sale, transactions, invoices, receipts, payments | transactions, lineItems, invoices, payments, receipts, customers, products, categories, discounts, taxes |

## When to Suggest Packages

1. **Analyze user intent** - Look for keywords that match package purposes
2. **Suggest package first** - If a package covers the use case, recommend it
3. **Create custom collections** - For anything packages don't cover
4. **Combine both** - Often users need packages + custom collections

## Output Format with Packages

When suggesting packages AND custom collections:

\`\`\`json
{
  "projectName": "Tennis Club Manager",
  "baseLayerName": "tennisClub",
  "packages": [
    {
      "packageId": "crouton-bookings",
      "reason": "For court reservations and scheduling"
    }
  ],
  "collections": [
    {
      "collectionName": "staff",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "name", "type": "string", "meta": { "required": true } },
        { "name": "role", "type": "string", "meta": { "required": true } },
        { "name": "email", "type": "string", "meta": { "required": true } }
      ]
    },
    {
      "collectionName": "members",
      "fields": [...]
    }
  ]
}
\`\`\`

## Example Conversations

User: "I want to build a tennis club booking app"
Assistant: I'll help you build a tennis club booking app! Based on your needs, I recommend:

**Package: crouton-bookings**
- Handles court reservations with time slots
- Built-in availability checking
- Email notifications for bookings

**Custom Collections:**
- \`members\` - Club membership management
- \`courts\` - Court information (or use bookings locations)

[Generates JSON with packages + collections]

User: "Create an e-commerce store"
Assistant: For an e-commerce store, I recommend:

**Package: crouton-sales**
- Product catalog, categories
- Shopping cart, checkout
- Invoice and receipt generation

**Custom Collections:**
- \`reviews\` - Product reviews
- \`wishlist\` - Customer wishlists

[Generates JSON with packages + collections]
`
```

---

## UI Components

### New Components

| Component | Purpose |
|-----------|---------|
| `AIWelcomeChat.vue` | Full-screen AI chat for Step 1 |
| `AIPackageSuggestion.vue` | Card showing AI-suggested package |
| `AICollectionPreview.vue` | Real-time preview of collections being created |
| `AICreationSummary.vue` | Summary of what AI created |

### Modified Components

| Component | Changes |
|-----------|---------|
| `new.vue` | Complete wizard restructure |
| `useSchemaAI.ts` | Add package awareness, new output format |
| `AIChatPanel.vue` | Larger, full-featured version for Step 1 |

---

## Composable Updates

### useSchemaAI.ts Changes

```typescript
// New types
interface AIProjectSuggestion {
  projectName?: string
  baseLayerName?: string
  packages: AIPackageSuggestion[]
  collections: CollectionSchema[]
}

interface AIPackageSuggestion {
  packageId: string
  reason: string
  configuration?: Record<string, unknown>
}

// New parsing function
function parseProjectSuggestion(content: string): AIProjectSuggestion | null {
  // Parse JSON from AI response
  // Extract packages array
  // Extract collections array
  // Extract project metadata
}

// New sync function
function syncFromAIProjectSuggestion(suggestion: AIProjectSuggestion) {
  // Set project name
  // Set base layer name
  // Add suggested packages via useProjectComposer
  // Create collections via useSchemaDesigner
}
```

### useProjectComposer.ts Changes

```typescript
// New method to add package by ID with reason
async function addPackageFromAI(packageId: string, reason?: string): Promise<void> {
  // Add package
  // Store the AI's reason for suggesting it (for display)
}

// Track AI suggestions
const aiSuggestedPackages = ref<Map<string, string>>() // packageId -> reason
```

---

## New Wizard Steps

### Step 1: AI-First Chat

```vue
<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="p-4 border-b">
      <h1>What do you want to build?</h1>
      <p class="text-muted">Describe your app and I'll set everything up</p>
    </header>

    <!-- Main Chat Area -->
    <div class="flex-1 flex">
      <!-- Left: Chat -->
      <div class="flex-1 flex flex-col">
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Messages -->
          <AIWelcomeChat />
        </div>

        <!-- Input -->
        <div class="p-4 border-t">
          <textarea placeholder="I want to build a..." />
          <button>Send</button>
        </div>
      </div>

      <!-- Right: Live Preview -->
      <aside class="w-96 border-l p-4">
        <h3>Creating...</h3>

        <!-- Packages being added -->
        <div v-for="pkg in aiSuggestedPackages">
          <AIPackageSuggestion :package="pkg" />
        </div>

        <!-- Collections being created -->
        <div v-for="col in collections">
          <AICollectionPreview :collection="col" />
        </div>
      </aside>
    </div>

    <!-- Footer -->
    <footer class="p-4 border-t flex justify-between">
      <span>{{ packages.length }} packages, {{ collections.length }} collections</span>
      <button :disabled="!hasContent" @click="nextStep">
        Continue to Review
      </button>
    </footer>
  </div>
</template>
```

### Step 2: Review & Configure

Show what AI created with ability to:
- Remove packages
- Edit collections
- Add more manually
- Tweak field properties

### Step 3: Project Details

Simple form for:
- Project name (pre-filled by AI)
- Base layer name (pre-filled by AI)
- Any final adjustments

### Step 4: Export

Same as current Step 4.

---

## Build Phases

### Phase 1: Update AI System Prompt (0.5 day)

- [ ] **Task 1.1**: Add package context to system prompt
  - Add package descriptions and capabilities
  - Add "when to suggest" guidelines
  - Add example conversations

- [ ] **Task 1.2**: Update output format
  - Add packages array to JSON schema
  - Add projectName, baseLayerName fields
  - Update parsing to handle new format

- [ ] **Task 1.3**: Test with current UI
  - Verify AI can suggest packages in responses
  - Test parsing of new format

### Phase 2: Update useSchemaAI Composable (1 day)

- [ ] **Task 2.1**: Add new types
  - AIProjectSuggestion interface
  - AIPackageSuggestion interface

- [ ] **Task 2.2**: Implement parseProjectSuggestion
  - Parse packages array from AI response
  - Parse project metadata
  - Handle both old and new formats

- [ ] **Task 2.3**: Implement syncFromAIProjectSuggestion
  - Connect to useProjectComposer for package adding
  - Sync collections as before
  - Set project name/layer name

- [ ] **Task 2.4**: Update streaming parser
  - Handle packages in streamed content
  - Real-time package suggestions

### Phase 3: Update useProjectComposer (0.5 day)

- [ ] **Task 3.1**: Add AI integration methods
  - addPackageFromAI() with reason tracking
  - setProjectNameFromAI()
  - setBaseLayerNameFromAI()

- [ ] **Task 3.2**: Track AI suggestions
  - Store reasons for package suggestions
  - Display in UI

### Phase 4: Create New UI Components (1 day)

- [ ] **Task 4.1**: Create AIWelcomeChat.vue
  - Full-height chat interface
  - Welcome message with examples
  - Suggestion chips for common apps

- [ ] **Task 4.2**: Create AIPackageSuggestion.vue
  - Card showing suggested package
  - Reason from AI
  - Toggle to accept/reject

- [ ] **Task 4.3**: Create AICollectionPreview.vue
  - Compact collection card
  - Field count, name
  - Animation when created

- [ ] **Task 4.4**: Create AICreationSummary.vue
  - Summary of what AI built
  - Packages + collections list

### Phase 5: Restructure Wizard (1.5 days)

- [ ] **Task 5.1**: Redesign new.vue Step 1
  - Replace Project Setup with AI Chat
  - Full-screen chat experience
  - Live preview sidebar

- [ ] **Task 5.2**: Redesign Step 2 as Review
  - Show AI-created packages
  - Show AI-created collections
  - Allow editing/removal

- [ ] **Task 5.3**: Move Project Details to Step 3
  - Pre-fill from AI suggestions
  - Simple confirmation step

- [ ] **Task 5.4**: Update step navigation
  - New validation logic
  - New step order

### Phase 6: Polish & Testing (0.5 day)

- [ ] **Task 6.1**: Test full flow
  - "Create a booking app" → packages + collections
  - "Create a blog" → custom collections only
  - "Create e-commerce with custom loyalty" → both

- [ ] **Task 6.2**: Add loading states
  - While AI is thinking
  - While packages are being fetched

- [ ] **Task 6.3**: Error handling
  - AI unavailable fallback
  - Package not found handling

---

## File Changes Summary

### New Files

```
packages/nuxt-crouton-schema-designer/
└── app/components/SchemaDesigner/
    ├── AIWelcomeChat.vue          # Full-screen AI chat
    ├── AIPackageSuggestion.vue    # Package suggestion card
    ├── AICollectionPreview.vue    # Collection preview card
    └── AICreationSummary.vue      # Summary component
```

### Modified Files

```
packages/nuxt-crouton-schema-designer/
├── app/
│   ├── composables/
│   │   ├── useSchemaAI.ts         # Add package awareness
│   │   └── useProjectComposer.ts  # Add AI methods
│   └── pages/schema-designer/
│       └── new.vue                # Complete restructure
```

---

## Success Criteria

1. **AI-first UX** — User starts by describing, not configuring
2. **Package awareness** — AI suggests appropriate packages
3. **Smart combinations** — AI uses packages + custom collections together
4. **Real-time preview** — See what's being created as AI responds
5. **Seamless editing** — Easy to modify AI suggestions
6. **Backwards compatible** — Manual flow still possible

---

## Example User Journeys

### Journey 1: Tennis Club App

```
User: "I want to build a tennis club management app with court bookings"

AI: Great! I'll set up a tennis club app for you.

**Adding Package: crouton-bookings**
✓ Court reservations with time slots
✓ Availability calendar
✓ Email notifications

**Creating Custom Collections:**
✓ members - Club membership
✓ courts - Court details (integrates with bookings locations)
✓ tournaments - Tournament management

[Project preview shows 1 package, 3 collections]

User clicks "Continue to Review"
```

### Journey 2: Blog Platform

```
User: "Create a simple blog with categories"

AI: I'll create a blog for you with custom collections:

**Creating Collections:**
✓ posts - Blog articles
✓ categories - Post categorization
✓ tags - Post tagging
✓ authors - Author profiles

No packages needed - this is custom content management.

[Project preview shows 0 packages, 4 collections]
```

### Journey 3: E-commerce + Custom

```
User: "Build an online store with a loyalty rewards program"

AI: I'll set up an e-commerce store with loyalty features.

**Adding Package: crouton-sales**
✓ Product catalog
✓ Shopping cart & checkout
✓ Invoices & receipts

**Creating Custom Collections:**
✓ loyaltyProgram - Rewards tiers
✓ loyaltyPoints - Customer points
✓ rewards - Available rewards

[Project preview shows 1 package, 3 collections]
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI suggests wrong package | Show package details, easy to remove |
| AI doesn't understand intent | Fallback to manual flow always available |
| Package not installed | Check availability, show install instructions |
| Large AI response time | Streaming with real-time preview |
| Breaking existing users | Keep manual flow as alternative path |

---

## Future Enhancements

1. **Template library** — Pre-built app templates (e-commerce, blog, etc.)
2. **AI refinement** — "Add user authentication" as follow-up
3. **Package discovery** — AI can search for community packages
4. **Multi-turn planning** — AI asks clarifying questions before building

---

*This plan establishes an AI-first approach to the schema designer where users describe what they want and AI intelligently combines packages with custom collections.*
