export function useMarkerColor() {
  const markerColor = ref<string>('#22c55e')

  onMounted(() => {
    // Read the resolved --ui-primary color by applying it as backgroundColor
    // on a hidden element. This forces the browser to convert OKLCH/HSL/etc.
    // into an RGB value that we can parse into hex for Mapbox markers.
    const probe = document.createElement('div')
    probe.style.cssText = 'background-color:var(--ui-primary);display:none'
    document.body.appendChild(probe)

    const computed = getComputedStyle(probe).backgroundColor
    probe.remove()

    if (computed?.startsWith('rgb')) {
      const parts = computed.match(/\d+/g)
      if (parts && parts.length >= 3) {
        const [r, g, b] = parts.map(Number)
        markerColor.value = `#${((1 << 24) + (r! << 16) + (g! << 8) + b!).toString(16).slice(1)}`
      }
    }
  })

  return markerColor
}
