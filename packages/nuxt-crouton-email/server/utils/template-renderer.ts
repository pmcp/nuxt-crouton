import { useRender } from 'vue-email'
import type { Component } from 'vue'

/**
 * Render a Vue Email template to HTML string
 */
export async function renderEmailTemplate<T extends Record<string, unknown>>(
  component: Component,
  props: T
): Promise<{ html: string, text?: string }> {
  try {
    const { html, text } = await useRender(component, { props })

    return { html, text }
  } catch (err) {
    console.error('[crouton-email] Failed to render template:', err)
    throw err
  }
}

/**
 * Get brand config from runtime config for templates
 */
export function getEmailBrandConfig(event?: any) {
  // In Nitro context, useRuntimeConfig can be called with event
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const publicConfig = (config.public as any)?.crouton?.email

  return {
    brandName: publicConfig?.brand?.name || 'My App',
    logoUrl: publicConfig?.brand?.logoUrl || '',
    primaryColor: publicConfig?.brand?.primaryColor || '#0F766E',
    appUrl: publicConfig?.brand?.url || ''
  }
}
