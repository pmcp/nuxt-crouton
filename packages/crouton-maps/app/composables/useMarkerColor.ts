export function useMarkerColor() {
  const markerColor = ref<string>('#22c55e')

  onMounted(() => {
    // Create a temporary element to let the browser compute the primary color
    // Use backgroundColor to convert OKLCH to RGB
    const tempEl = document.createElement('div')
    tempEl.style.backgroundColor = 'var(--ui-primary)'
    tempEl.style.display = 'none'
    document.body.appendChild(tempEl)

    const computedColor = getComputedStyle(tempEl).backgroundColor
    document.body.removeChild(tempEl)

    if (computedColor && computedColor.startsWith('rgb')) {
      // Convert RGB to hex
      const rgbMatch = computedColor.match(/\d+/g)
      if (rgbMatch && rgbMatch.length >= 3) {
        const r = Number(rgbMatch[0])
        const g = Number(rgbMatch[1])
        const b = Number(rgbMatch[2])
        markerColor.value = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
      }
    }
  })

  return markerColor
}
