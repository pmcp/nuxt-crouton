---
title: Content Components
description: Components for displaying rich text content, articles, and prose pages
icon: i-heroicons-document-text
---

Content components provide beautiful layouts for displaying rich text content from any source - the Crouton editor, Nuxt Content, external CMSs, or plain HTML strings.

## CroutonContentPreview

A compact preview component for displaying truncated content in table cells or cards. Automatically strips HTML tags and shows a tooltip with the full content on hover.

### Props

```typescript
interface ContentPreviewProps {
  content?: string    // HTML content to preview
  limit?: number      // Character limit (default: 100)
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | `''` | HTML content to preview |
| `limit` | `number` | `100` | Maximum characters before truncation |

### Basic Usage

```vue
<template>
  <!-- In a table cell -->
  <CroutonContentPreview :content="row.body" />

  <!-- With custom limit -->
  <CroutonContentPreview :content="post.excerpt" :limit="150" />
</template>
```

### In Collection Tables

Perfect for displaying content fields in your collection list views:

```vue
<template>
  <CroutonCollection
    collection="posts"
    :columns="columns"
    :rows="posts"
  >
    <template #body-cell="{ row }">
      <CroutonContentPreview :content="row.original.body" :limit="80" />
    </template>
  </CroutonCollection>
</template>
```

---

## CroutonContentPage

A generic content page wrapper with Tailwind Typography (prose) styling, optional table of contents, and flexible slot-based layout.

### Props

```typescript
interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

interface ContentPageProps {
  content?: string                    // HTML content
  title?: string                      // Page title
  description?: string                // Page description/subtitle
  toc?: boolean | TocLink[]           // Enable TOC or provide custom links
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full'
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | `''` | HTML content to render |
| `title` | `string` | `undefined` | Page title |
| `description` | `string` | `undefined` | Page subtitle/description |
| `toc` | `boolean \| TocLink[]` | `false` | Auto-generate TOC or provide custom links |
| `maxWidth` | `string` | `'3xl'` | Maximum content width |

### Slots

| Slot | Description |
|------|-------------|
| `header` | Custom header content (replaces title/description) |
| `default` | Custom content (replaces `content` prop rendering) |
| `sidebar` | Sidebar content (replaces auto-generated TOC) |
| `footer` | Footer content below the main content |

### Basic Usage

```vue
<template>
  <CroutonContentPage
    title="About Us"
    description="Learn more about our company"
    :content="page.body"
  />
</template>

<script setup lang="ts">
const { data: page } = await useFetch('/api/pages/about')
</script>
```

### With Table of Contents

Enable automatic TOC generation from headings in your content:

```vue
<template>
  <CroutonContentPage
    title="Documentation"
    :content="docs.body"
    toc
  />
</template>
```

::callout{type="info"}
Auto-generated TOC requires headings in your content to have `id` attributes. For example: `<h2 id="getting-started">Getting Started</h2>`
::

### With Custom Sidebar

```vue
<template>
  <CroutonContentPage :content="page.body">
    <template #sidebar>
      <nav class="space-y-2">
        <h3 class="font-semibold">Related Pages</h3>
        <NuxtLink v-for="link in relatedPages" :to="link.to">
          {{ link.title }}
        </NuxtLink>
      </nav>
    </template>

    <template #footer>
      <div class="flex justify-between">
        <NuxtLink :to="prevPage">Previous</NuxtLink>
        <NuxtLink :to="nextPage">Next</NuxtLink>
      </div>
    </template>
  </CroutonContentPage>
</template>
```

### With Custom Content

Use the default slot to render content yourself:

```vue
<template>
  <CroutonContentPage title="My Page">
    <div class="prose dark:prose-invert">
      <p>Custom rendered content here...</p>
      <MyCustomComponent />
    </div>
  </CroutonContentPage>
</template>
```

---

## CroutonContentArticle

A full-featured article/blog post layout with title, author, date, featured image, tags, and reading time support.

### Props

```typescript
interface Author {
  name: string
  avatar?: string
  description?: string
}

interface ContentArticleProps {
  title: string                       // Article title (required)
  description?: string                // Excerpt/subtitle
  author?: Author                     // Author information
  date?: Date | string                // Publication date
  image?: string                      // Featured image URL
  imageAlt?: string                   // Featured image alt text
  content?: string                    // HTML content
  tags?: string[]                     // Article tags
  readingTime?: string                // Reading time (e.g., "5 min read")
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | *required* | Article title |
| `description` | `string` | `undefined` | Excerpt or subtitle |
| `author` | `Author` | `undefined` | Author name, avatar, and description |
| `date` | `Date \| string` | `undefined` | Publication date |
| `image` | `string` | `undefined` | Featured image URL |
| `imageAlt` | `string` | `title` | Featured image alt text |
| `content` | `string` | `undefined` | HTML content |
| `tags` | `string[]` | `undefined` | Article tags |
| `readingTime` | `string` | `undefined` | Reading time display |
| `maxWidth` | `string` | `'3xl'` | Maximum content width |

### Slots

| Slot | Description |
|------|-------------|
| `header` | Custom header (replaces title, author, date, tags) |
| `default` | Custom content (replaces `content` prop rendering) |
| `sidebar` | Sticky sidebar content |
| `footer` | Footer content (e.g., related posts, share buttons) |

### Basic Usage

```vue
<template>
  <CroutonContentArticle
    :title="post.title"
    :description="post.excerpt"
    :content="post.body"
    :date="post.publishedAt"
  />
</template>

<script setup lang="ts">
const { data: post } = await useFetch('/api/posts/my-post')
</script>
```

### Full Blog Post

```vue
<template>
  <CroutonContentArticle
    :title="post.title"
    :description="post.excerpt"
    :author="{
      name: post.author.name,
      avatar: post.author.avatar,
      description: post.author.role
    }"
    :date="post.publishedAt"
    :image="post.featuredImage"
    :content="post.body"
    :tags="post.tags"
    reading-time="5 min read"
  >
    <template #sidebar>
      <TableOfContents :links="tocLinks" />
    </template>

    <template #footer>
      <ShareButtons :url="post.url" :title="post.title" />
      <RelatedPosts :posts="relatedPosts" />
    </template>
  </CroutonContentArticle>
</template>
```

### With Editor Content

Display content created with `CroutonEditorSimple`:

```vue
<template>
  <CroutonContentArticle
    :title="article.title"
    :content="article.content"
    :date="article.createdAt"
  />
</template>

<script setup lang="ts">
// Content from CroutonEditorSimple is stored as HTML
const { data: article } = await useCollectionQuery('articles', {
  query: { id: route.params.id }
})
</script>
```

### With Nuxt Content

Works seamlessly with `@nuxt/content`:

```vue
<template>
  <CroutonContentArticle
    :title="page.title"
    :description="page.description"
    :date="page.date"
    :tags="page.tags"
  >
    <ContentRenderer :value="page" />
  </CroutonContentArticle>
</template>

<script setup lang="ts">
const { data: page } = await useAsyncData('post', () =>
  queryContent('/blog/my-post').findOne()
)
</script>
```

---

## Styling

All content components use Tailwind Typography (`prose`) classes for beautiful default styling. The prose styles are automatically applied with dark mode support.

### Customizing Prose Styles

Override prose styles using Tailwind classes:

```vue
<template>
  <CroutonContentPage :content="content">
    <template #default>
      <div class="prose prose-lg prose-blue dark:prose-invert max-w-none">
        <div v-html="content" />
      </div>
    </template>
  </CroutonContentPage>
</template>
```

### Available Prose Modifiers

- `prose-sm` / `prose-lg` / `prose-xl` - Size variants
- `prose-blue` / `prose-green` / etc. - Color variants for links
- `prose-invert` - Dark mode (applied automatically)
- `max-w-none` - Remove max-width constraint

---

## Content Sources

These components are source-agnostic. Use them with any content:

| Source | Example |
|--------|---------|
| Crouton Editor | `<CroutonEditorSimple v-model="content" />` |
| Nuxt Content | `queryContent('/blog').findOne()` |
| External CMS | Strapi, Sanity, Contentful API |
| Database | Direct HTML from your DB |
| Markdown | Rendered to HTML |

---

## Related

- [Rich Text Editor](/features/rich-text) - CroutonEditorSimple for creating content
- [Layout Components](/api-reference/components/layout-components) - Other layout components
- [Nuxt Content](https://content.nuxt.com) - File-based content management
