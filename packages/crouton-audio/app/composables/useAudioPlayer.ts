import type { Ref } from 'vue'
import type { AudioPlayerOptions, AudioRegion } from '#crouton-audio/types/player'

const formatTime = (seconds: number): string =>
  [seconds / 60, seconds % 60].map(v => `0${Math.floor(v)}`.slice(-2)).join(':')

/**
 * Composable for managing a WaveSurfer audio player instance.
 *
 * @param id - Unique identifier for this player instance (supports multiple players)
 * @param options - WaveSurfer configuration options
 */
export function useAudioPlayer(id: string = 'default', options: AudioPlayerOptions = {}) {
  // State — scoped per player ID using useState
  const instance = useState<any>(`audio-player-${id}-instance`, () => null)
  const regions = useState<any>(`audio-player-${id}-regions`, () => null)
  const isReady = useState(`audio-player-${id}-ready`, () => false)
  const isPlaying = useState(`audio-player-${id}-playing`, () => false)
  const currentTime = useState(`audio-player-${id}-time`, () => 0)
  const duration = useState(`audio-player-${id}-duration`, () => 0)
  const loadingProgress = useState(`audio-player-${id}-loading`, () => 0)
  const zoom = useState(`audio-player-${id}-zoom`, () => 0)

  // Derived state
  const currentTimeFormatted = computed(() => formatTime(currentTime.value))
  const durationFormatted = computed(() => formatTime(duration.value))

  // Zoom config
  const zoomStep = options.minPxPerSec ?? 20
  const maxZoom = 300
  const minZoom = 0

  /**
   * Initialize the WaveSurfer player on a container element.
   */
  async function init(container: Ref<HTMLElement | null> | HTMLElement, src: string) {
    if (instance.value) return

    const el = isRef(container) ? container.value : container
    if (!el) {
      console.error('[crouton-audio] Container element is required')
      return
    }

    // Dynamic imports — WaveSurfer is client-only
    const WaveSurfer = (await import('wavesurfer.js')).default
    const plugins: any[] = []

    if (options.enableRegions !== false) {
      const RegionsPlugin = (await import('wavesurfer.js/dist/plugins/regions.js')).default
      regions.value = RegionsPlugin.create()
      plugins.push(regions.value)
    }

    if (options.enableZoom !== false) {
      const ZoomPlugin = (await import('wavesurfer.js/dist/plugins/zoom.esm.js')).default
      plugins.push(ZoomPlugin.create({
        scale: 0.1,
        maxZoom: 100,
      }))
    }

    instance.value = WaveSurfer.create({
      container: el,
      url: src,
      height: options.height ?? 'auto',
      waveColor: options.waveColor ?? 'rgb(var(--ui-color-neutral-400))',
      progressColor: options.progressColor ?? 'rgb(var(--ui-color-primary-500))',
      cursorColor: options.cursorColor ?? 'rgb(var(--ui-color-primary-600))',
      barGap: options.barGap ?? 0.3,
      barWidth: options.barWidth ?? 1,
      barRadius: options.barRadius ?? 2,
      minPxPerSec: options.minPxPerSec ?? 100,
      fillParent: true,
      autoScroll: options.autoScroll ?? true,
      autoCenter: options.autoCenter ?? true,
      hideScrollbar: options.hideScrollbar ?? true,
      dragToSeek: options.dragToSeek ?? true,
      normalize: options.normalize ?? true,
      plugins,
    })

    // Event handlers
    instance.value.on('ready', () => {
      duration.value = instance.value.getDuration()
      isReady.value = true
    })

    instance.value.on('play', () => {
      isPlaying.value = true
    })

    instance.value.on('pause', () => {
      isPlaying.value = false
    })

    instance.value.on('seeking', () => {
      currentTime.value = instance.value.getCurrentTime()
    })

    instance.value.on('audioprocess', () => {
      currentTime.value = instance.value.getCurrentTime()
    })

    instance.value.on('loading', (percent: number) => {
      loadingProgress.value = percent
    })
  }

  /** Destroy the WaveSurfer instance and reset state. */
  function destroy() {
    if (!instance.value) return
    instance.value.destroy()
    instance.value = null
    regions.value = null
    isReady.value = false
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    loadingProgress.value = 0
    zoom.value = 0
  }

  /** Toggle play/pause. */
  function playPause() {
    if (!instance.value) return
    instance.value.playPause()
  }

  /** Play from current position. */
  function play() {
    if (!instance.value) return
    instance.value.play()
  }

  /** Pause playback. */
  function pause() {
    if (!instance.value) return
    instance.value.pause()
  }

  /** Seek to a specific time in seconds. */
  function seekTo(time: number) {
    if (!instance.value) return
    const progress = Math.max(0, Math.min(1, time / duration.value))
    instance.value.seekTo(progress)
  }

  /** Zoom in or out. */
  function setZoom(direction: '+' | '-') {
    if (!instance.value || !isReady.value) return
    if (direction === '+') {
      zoom.value = Math.min(maxZoom, zoom.value + zoomStep)
    }
    else {
      zoom.value = Math.max(minZoom, zoom.value - zoomStep)
    }
    instance.value.zoom(zoom.value)
  }

  /** Add a region to the waveform. Requires enableRegions. */
  function addRegion(region: AudioRegion) {
    if (!regions.value) return
    regions.value.addRegion({
      id: region.id,
      start: region.start,
      end: region.end,
      color: region.color ?? 'rgba(var(--ui-color-primary-500), 0.2)',
      drag: region.drag ?? true,
      resize: region.resize ?? true,
      content: region.content,
    })
  }

  /** Remove a region by ID. */
  function removeRegion(id: string) {
    if (!regions.value) return
    const allRegions = regions.value.getRegions()
    const region = allRegions.find((r: any) => r.id === id)
    if (region) region.remove()
  }

  /** Clear all regions. */
  function clearRegions() {
    if (!regions.value) return
    regions.value.clearRegions()
  }

  return {
    // State
    instance: readonly(instance),
    regions: readonly(regions),
    isReady: readonly(isReady),
    isPlaying: readonly(isPlaying),
    currentTime: readonly(currentTime),
    duration: readonly(duration),
    loadingProgress: readonly(loadingProgress),
    zoom: readonly(zoom),

    // Formatted
    currentTimeFormatted,
    durationFormatted,

    // Lifecycle
    init,
    destroy,

    // Playback
    playPause,
    play,
    pause,
    seekTo,

    // Zoom
    setZoom,

    // Regions
    addRegion,
    removeRegion,
    clearRegions,
  }
}
