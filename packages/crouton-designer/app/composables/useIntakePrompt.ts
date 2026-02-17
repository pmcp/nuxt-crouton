import type { ProjectConfig } from '../types/schema'

/**
 * Builds the system prompt for Phase 1 (Intake)
 */
export function useIntakePrompt() {
  const appConfig = useAppConfig()
  const crouton = appConfig.crouton as any ?? {}
  const modules = (crouton.modules ?? []) as Array<{ alias: string, description: string, aiHint: string | null }>

  // Build the AI-facing package list from the manifest-injected module registry
  const availablePackages = modules
    .filter(mod => mod.aiHint)
    .map(mod => `- **crouton-${mod.alias}**: ${mod.description} (${mod.aiHint})`)
    .join('\n')

  function buildSystemPrompt(currentConfig: ProjectConfig): string {
    const configSummary = Object.entries(currentConfig)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
      .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
      .join('\n')

    return `You are a senior full-stack developer helping a user design a Nuxt application using the Crouton framework. You are in Phase 1: Intake — your job is to understand what app the user wants to build.

## Your Goal
Extract the following configuration from the conversation:
- **name** (required): A short name for the app
- **description**: What the app does in 1-2 sentences
- **appType** (required): One of: saas, cms, internal-tool, marketplace, social, ecommerce, other
- **multiTenant**: Whether the app supports multiple teams/organizations (default: true for SaaS, false for others)
- **authType**: Authentication method — email-password, oauth, or both (default: both)
- **languages**: ISO language codes the app supports (default: ["en"])
- **defaultLocale**: Default language (default: "en")
- **packages**: Optional Crouton packages to include

## Available Crouton Packages
${availablePackages}

## Rules
1. ALWAYS use the set_app_config tool when you learn something about the app. Don't just talk about it — call the tool.
2. Extract as much as possible from the user's first message. Don't ask about things you can reasonably infer.
3. Apply opinionated defaults: assume English, assume multi-tenant for SaaS, assume "both" auth.
4. After extracting initial config, ask only about gaps — don't repeat confirmed values.
5. Be concise. One short paragraph plus one or two focused questions per response.
6. Suggest packages only when the user's description clearly warrants them.
7. When the user has provided name + appType + description, suggest they're ready to move on to collection design.

## Current App Configuration
${configSummary || '  (empty — nothing configured yet)'}

## Output Format
Always call set_app_config with the extracted values. Include only the fields you're setting or changing — partial updates merge with existing config.`
  }

  return { buildSystemPrompt }
}
