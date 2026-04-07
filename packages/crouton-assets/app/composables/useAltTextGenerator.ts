/**
 * AI-powered alt text generation for images.
 *
 * Wraps the `/api/assets/generate-alt-text` endpoint with a shared loading state
 * and unified error handling. Callers convert their image source (File or URL)
 * to base64 themselves and apply the returned alt text to their own state.
 */
export function useAltTextGenerator() {
  const generating = ref(false)

  async function generate(options: {
    image: string
    mimeType: string
  }): Promise<string | null> {
    generating.value = true
    try {
      const { alt } = await $fetch<{ alt: string }>('/api/assets/generate-alt-text', {
        method: 'POST',
        body: options
      })
      return alt
    }
    catch (error) {
      console.error('Failed to generate alt text:', error)
      return null
    }
    finally {
      generating.value = false
    }
  }

  return { generating, generate }
}
