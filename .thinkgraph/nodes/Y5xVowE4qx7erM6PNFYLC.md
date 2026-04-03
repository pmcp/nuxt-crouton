# Uploading files on Nodes or in the Assistant

## Research: File Upload in Assistant & Flow Nodes

### Current State

**crouton-ai** (`packages/crouton-ai`):
- `Chatbox.vue` → `Input.vue` → text-only (`UTextarea` + send button)
- `useChat.ts` wraps `@ai-sdk/vue`'s `useChat` — no attachment/file support wired
- `AIMessage` type is text-only (`content: string`), no `attachments` or `files` field
- AI SDK *does* support `experimental_attachments` on `useChat` — it's just not wired up

**crouton-assets** (`packages/crouton-assets`):
- Full asset management: `Uploader.vue` (file select → optional crop → metadata → upload), `Picker.vue` (modal browser), `Library.vue` (grid), `useAssetUpload()` composable
- Uploads go to NuxtHub blob storage via `/api/upload-image`
- Assets stored in DB with metadata (filename, contentType, size, dimensions, alt text)
- Has AI alt-text generation already

**crouton-core** (`packages/crouton-core`):
- `CroutonImageUpload` — simple file picker (no metadata, no library)
- `CroutonDropZone` — drag-and-drop zone (emits `File[]`)
- `stubs/CroutonAssetsPicker.vue` — stub for when assets package not installed

**crouton-flow** (`packages/crouton-flow`):
- `Node.vue` — displays title/subtitle, edit/delete actions, handles (input/output)
- No file/attachment concept on nodes currently

---

### Options

#### Option A: Assets Package Integration
**Add `CroutonAssetsPicker` to AI Input + Flow Node forms**

- **AI Input**: Add a 📎 button to `AIInput.vue` that opens `CroutonAssetsPicker` in a modal. Selected asset URL gets included in the message via AI SDK's `experimental_attachments` (supports images for vision models, files as context). Extend `AIMessage` type with optional `attachments` field.
- **Flow Nodes**: If a collection schema has an asset field (`refTarget: "assets"`), the node form already supports `CroutonAssetsPicker` via the generated form. For displaying attachments *on* the node card, extend `Node.vue` to show a thumbnail when `data` contains an image asset reference.
- **Pros**: Leverages existing upload infrastructure, metadata, library browsing, blob storage. Assets are reusable across the app.
- **Cons**: Heavier dependency; requires `crouton-assets` to be installed. Need stub fallback for apps without it.
- **Packages touched**: `crouton-ai` (Input.vue, useChat.ts, types), optionally `crouton-flow` (Node.vue)

#### Option B: Lightweight Inline Upload (No Assets Package)
**Add direct file upload to AI Input using `CroutonImageUpload` / `CroutonDropZone` from core**

- **AI Input**: Add file picker button using `CroutonImageUpload` from core. Upload file to `/api/upload-image`, get URL, pass as `experimental_attachments` to AI SDK.
- **Flow Nodes**: Same — use `CroutonImageUpload` in node edit forms.
- **Pros**: No dependency on assets package, simpler, works in any crouton app.
- **Cons**: No library/browsing, no metadata, no reuse — files are fire-and-forget uploads. No crop, no alt text.
- **Packages touched**: `crouton-ai` (Input.vue, useChat.ts, types)

#### Option C: Hybrid (Assets-Aware with Core Fallback) — RECOMMENDED
**Use assets if installed, fall back to core upload**

- **AI Input**: Detect `hasApp('assets')` → show `CroutonAssetsPicker` button if available, else show simple `CroutonImageUpload`. Either way, the uploaded file URL gets sent as an attachment.
- **Pros**: Works everywhere, best experience when assets is installed, graceful degradation.
- **Cons**: More conditional logic, need to maintain two code paths. Follows the existing stub pattern though.
- **Packages touched**: `crouton-ai` (Input.vue, useChat.ts, types)

---

### Technical Notes
- AI SDK's `useChat` supports `experimental_attachments` — array of `{ name, contentType, url }` sent with the message. This is the standard way to send files to vision-capable models.
- The `useChat` composable in crouton-ai would need to expose `handleSubmit({ experimental_attachments })` or add an `attachments` option.
- For Flow nodes, this is mostly a schema/form concern — if the collection has asset fields, upload already works through the generated form. The visual enhancement (showing thumbnails on nodes) is a separate UI task in `Node.vue`.

### Recommendation
**Option C (Hybrid)** is the most aligned with existing architecture patterns (stub system, `hasApp()` detection). The AI input change is contained to `crouton-ai`, and the assets integration follows established conventions. Start with the AI chatbox first, Flow node thumbnails can be a follow-up.

### Implementation Plan (if Option C approved)
1. **Phase 1 — AI Chatbox attachments**: Extend `useChat.ts` to support `experimental_attachments`, add 📎 button to `Input.vue` with assets/core fallback, extend `AIMessage` type
2. **Phase 2 — Flow Node thumbnails**: Extend `Node.vue` to detect and display image asset references as thumbnails on node cards
