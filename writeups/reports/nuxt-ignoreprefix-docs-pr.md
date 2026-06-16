# Draft: Nuxt docs PR — clarify `ignorePrefix` scope

**Target repo:** `nuxt/nuxt` (upstream — NOT this repo; can't be opened from this session's scope)
**Origin:** investigation in this repo (#227 epic; started from #224). The config docs
page is generated from `@nuxt/schema` JSDoc, so the change is to that JSDoc, not a
standalone markdown file.

> ⚠️ Before submitting: (1) verify the wording against current `nuxt/nuxt` `main`
> (drafted against installed `@nuxt/schema@3.20.2`, which Nuxt 4.3.1 pulls in — upstream
> may differ); (2) confirm the file path (almost certainly
> `packages/schema/src/config/common.ts`, where `ignore`/`ignorePrefix`/`ignoreOptions` live).

---

## PR title

```
docs(schema): clarify that ignorePrefix applies to all scanned dirs, not just pages/layouts/middleware/public
```

## PR body

```markdown
## What

The `ignorePrefix` config option's documentation says it only affects
`pages/`, `layouts/`, `middleware/`, and `public/`. In practice it applies to
**every scanned directory**, because the `ignore` resolver adds a global
`**/${ignorePrefix}*.*` pattern. This PR updates the JSDoc (which generates the
config docs page) to reflect the actual behaviour.

## Why

The `ignore` resolver does:

    if (ignorePrefix) {
      ignore.add(`**/${ignorePrefix}*.*`)
    }

That's a repo-wide glob, so a `-`-prefixed file is skipped in `components/`,
`composables/`, `server/`, etc. — not only the four directories the docs name.
This trips people up: a `components/-Draft.vue` silently never registers, and
the docs give no hint why.

## Evidence (reproducible)

In a Nuxt 4 app, add two components and run `nuxt prepare`:

    app/components/_Underscore.vue   -> registered as <Underscore>
    app/components/-Dash.vue         -> NOT registered (skipped)

Only the dash-prefixed one is ignored, and it's in `components/` — outside the
documented set. (Underscore is unaffected; the skip prefix is `-`.)

## Change

Updates the `ignorePrefix` JSDoc in `@nuxt/schema` to state the prefix applies
to all scanned files and to give a non-routable example. No behaviour change.
```

## The JSDoc diff (likely `packages/schema/src/config/common.ts`)

```diff
   /**
-   * Any file in `pages/`, `layouts/`, `middleware/`, and `public/` directories will be ignored during
-   * the build process if its filename starts with the prefix specified by `ignorePrefix`. This is intended to prevent
-   * certain files from being processed or served in the built application.
-   * By default, the `ignorePrefix` is set to '-', ignoring any files starting with '-'.
+   * Any scanned file whose name starts with `ignorePrefix` is ignored during the build.
+   * This adds a `**/${ignorePrefix}*.*` pattern to `ignore`, so it applies across **all**
+   * scanned directories — `pages/`, `layouts/`, `middleware/`, `components/`, `composables/`,
+   * `server/`, `public/`, etc. — not only routable ones. It lets you co-locate helpers,
+   * tests, and work-in-progress files without them being picked up as routes, components, etc.
+   *
+   * By default `ignorePrefix` is `'-'`, so e.g. `-foo.vue`, `components/-Draft.vue`, and
+   * `pages/-bar.vue` are all ignored.
    */
   ignorePrefix: {
     $resolve: (val): string => val && typeof val === 'string' ? val : '-',
   },
```

## Optional companion edit

The `.nuxtignore` guide page (`docs/.../directory-structure/nuxtignore.md`) could get the
same one-line clarification, since it's a page people land on when searching this.

---

## Background facts (verified locally during the spike)

- `@nuxt/schema@3.20.2` current `ignorePrefix` JSDoc names only `pages/`, `layouts/`,
  `middleware/`, `public/`; default value `'-'`.
- The `ignore` resolver adds `**/${ignorePrefix}*.*` to the global ignore set → applies repo-wide.
- Component name derivation (`getNameFromPath` → `splitByCase`) strips a leading `_`, so `_Foo.vue`
  registers as `<Foo>`; the underscore is inert. The `-` prefix is the one Nuxt honours for skipping.
- Confirmed by experiment (`nuxt prepare` + `.nuxt/components.d.ts`): `-`-prefixed component skipped,
  `_`-prefixed component registered.
