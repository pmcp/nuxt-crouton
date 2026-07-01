import { readFileSync, existsSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { execSync } from 'node:child_process'
import { defineNuxtModule, createResolver, addImports, addPlugin, addServerHandler } from '@nuxt/kit'
import { createSourceStampTransform } from './runtime/transform/sourceStamp'
import { normalizeChangelog, type ChangelogEntry } from './runtime/tools/changelog-data'

/**
 * @fyit/crouton-feedback — in-page feedback toolkit for any Nuxt UI app.
 *
 * Wired: the glasses launcher + tool registry + Console (eruda) tool (#962), the
 * Annotate tool + source-stamp transform + the `/api/_feedback` dispatcher (#963),
 * the four sinks (#964), and the sink-selection config surface below (#965).
 *
 * The module deliberately depends only on Nuxt + Nuxt UI 4 — NOT on
 * @fyit/crouton-core — so any Nuxt UI app can install it.
 */
export interface FeedbackModuleOptions {
  /**
   * Force the toolkit on regardless of the dev/env gate. Set by a host module
   * that installs this one (e.g. @fyit/crouton-devtools) so the launcher appears
   * under the host's own gate. When unset, the gate is `dev ||
   * NUXT_PUBLIC_CROUTON_FEEDBACK=true`.
   */
  enabled?: boolean
  /**
   * Where a sent annotation lands. Server-side only — credentials/URLs never
   * reach the client bundle. Every field is overridable at runtime by its
   * `NUXT_CROUTON_FEEDBACK_*` env var (preferred for secrets).
   */
  feedback?: {
    /** Built-in destination. Default `'webhook'`. (`NUXT_CROUTON_FEEDBACK_SINK`) */
    sink?: 'webhook' | 'slack' | 'discord' | 'github'
    /** `webhook` sink: generic JSON POST target. (`…_WEBHOOK_URL`) */
    webhookUrl?: string
    /** `slack` sink: Slack incoming-webhook URL. (`…_SLACK_URL`) */
    slackUrl?: string
    /** `discord` sink: Discord webhook URL. (`…_DISCORD_URL`) */
    discordUrl?: string
    /** `github` sink: comment as a GitHub App (preferred) or PAT fallback. */
    github?: {
      /** App id. (`…_GITHUB_APP_ID`) */
      appId?: string
      /** App private key PEM — prefer the env var, don't commit it. (`…_GITHUB_APP_PRIVATE_KEY`) */
      privateKey?: string
      /** Installation id. (`…_GITHUB_APP_INSTALLATION_ID`) */
      installationId?: string
      /** Interim PAT, honoured only when App creds are absent. (`…_GITHUB_TOKEN`) */
      token?: string
      /** "owner/repo". (`…_GITHUB_REPOSITORY`) */
      repository?: string
      /** Issue or PR number to comment on. (`…_GITHUB_PR`) */
      pr?: string | number
    }
  }
  /**
   * The **Changelog** tool — a `vNN`-badged launcher row that opens a version
   * timeline. JSON-first: entries come from a committed `changelog.json`; an
   * optional build-time git stamp fills the current deployed commit. Omit the
   * whole block and the tool simply hides itself (no entries).
   */
  changelog?: {
    /** Inline entries, bypassing file lookup. */
    entries?: ChangelogEntry[]
    /**
     * Path (relative to the app root) to a changelog JSON file. When unset, the
     * module auto-detects `<srcDir>/changelog.json`, `app/changelog.json`, then
     * `changelog.json`.
     */
    path?: string
    /** Commit-link URL template; `{commit}` is replaced with the hash. */
    commitUrlTemplate?: string
    /** Stamp the current git short SHA at build (default true). */
    stampGitCommit?: boolean
  }
}

/** Read + normalize changelog entries from inline options or a JSON file. */
function readChangelogEntries(
  opts: NonNullable<FeedbackModuleOptions['changelog']>,
  rootDir: string,
  srcDir: string
): ChangelogEntry[] {
  if (Array.isArray(opts.entries)) return normalizeChangelog(opts.entries)
  const candidates = opts.path
    ? [resolvePath(rootDir, opts.path)]
    : [
        resolvePath(srcDir, 'changelog.json'),
        resolvePath(rootDir, 'app/changelog.json'),
        resolvePath(rootDir, 'changelog.json')
      ]
  for (const file of candidates) {
    try {
      if (existsSync(file)) return normalizeChangelog(JSON.parse(readFileSync(file, 'utf8')))
    } catch {
      // ignore a malformed/unreadable candidate and try the next
    }
  }
  return []
}

/** Current short SHA at build; empty string when git is unavailable (e.g. CI). */
function readGitCommit(rootDir: string): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

export default defineNuxtModule<FeedbackModuleOptions>({
  meta: {
    name: '@fyit/crouton-feedback',
    configKey: 'croutonFeedback',
    compatibility: {
      nuxt: '^4.0.0'
    }
  },
  defaults: {},
  setup(options, nuxt) {
    // Enabled when a host module forces it (`options.enabled`), in local dev, or
    // when a build opts in via NUXT_PUBLIC_CROUTON_FEEDBACK=true. The plugins
    // double-check the flag at runtime, so a production build that doesn't set it
    // ships nothing.
    const enabled = options.enabled === true
      || nuxt.options.dev
      || process.env.NUXT_PUBLIC_CROUTON_FEEDBACK === 'true'
    if (!enabled) return

    const resolver = createResolver(import.meta.url)

    // Expose the gate to the client (→ runtimeConfig.public.croutonFeedback),
    // which the plugins re-check before mounting/registering anything.
    nuxt.options.runtimeConfig.public ||= {}
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).croutonFeedback = true

    // The registry composable, auto-imported so a tool can register itself.
    addImports({
      name: 'useFeedbackTools',
      from: resolver.resolve('./runtime/composables/useFeedbackTools')
    })

    // Mount the glasses launcher into the host app's <body> context.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/feedback.client'),
      mode: 'client'
    })

    // First registered tool: Console (eruda), lazy-imported on first toggle.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/tools/console.client'),
      mode: 'client'
    })

    // Second tool: Annotate — pin a comment on an element → POST /api/_feedback.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/tools/annotate.client'),
      mode: 'client'
    })

    // Third tool: Changelog — a vNN-badged version timeline. JSON-first data
    // (a committed changelog.json) + an optional build-time git stamp for the
    // current deployed commit, exposed to the client via runtimeConfig.public.
    const cl = options.changelog ?? {}
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).croutonChangelog = {
      entries: readChangelogEntries(cl, nuxt.options.rootDir, nuxt.options.srcDir),
      commitUrlTemplate: cl.commitUrlTemplate || '',
      buildCommit: cl.stampGitCommit === false ? '' : readGitCommit(nuxt.options.rootDir)
    }
    addPlugin({
      src: resolver.resolve('./runtime/plugins/tools/changelog.client'),
      mode: 'client'
    })

    // Build-time source stamping: inject `data-feedback-src="<relative .vue>"`
    // on each component's root element so a click resolves to the owning file.
    // Runs in the Vue compiler, so it survives `nuxt build` (present in the
    // deployed DOM), unlike Vue DevTools' dev-only inspector attribute.
    nuxt.options.vite ||= {}
    const vite = nuxt.options.vite as Record<string, any>
    vite.vue ||= {}
    vite.vue.template ||= {}
    vite.vue.template.compilerOptions ||= {}
    const compilerOptions = vite.vue.template.compilerOptions
    compilerOptions.nodeTransforms = [
      ...(compilerOptions.nodeTransforms || []),
      createSourceStampTransform(nuxt.options.rootDir)
    ]

    // Server dispatcher config, built from module options. Every field is
    // overridable at runtime by its NUXT_CROUTON_FEEDBACK_* env var — Nuxt only
    // maps env onto keys that already exist here, so the empty-string defaults are
    // load-bearing (they make slack/discord/github reachable from env). These live
    // in SERVER runtimeConfig only — never runtimeConfig.public — so no credential
    // or URL ships in the client bundle.
    const fb = options.feedback ?? {}
    const gh = fb.github ?? {}
    ;(nuxt.options.runtimeConfig as Record<string, any>).croutonFeedback = {
      sink: fb.sink || 'webhook',
      webhookUrl: fb.webhookUrl ?? '',
      slackUrl: fb.slackUrl ?? '',
      discordUrl: fb.discordUrl ?? '',
      githubAppId: gh.appId ?? '',
      githubAppPrivateKey: gh.privateKey ?? '',
      githubAppInstallationId: gh.installationId ?? '',
      githubToken: gh.token ?? '',
      githubRepository: gh.repository ?? '',
      githubPr: gh.pr != null ? String(gh.pr) : ''
    }
    addServerHandler({
      route: '/api/_feedback',
      handler: resolver.resolve('./runtime/server/api/feedback.post'),
      method: 'post'
    })
  }
})
