import type WaveSurfer from 'wavesurfer.js'
import type RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js'

export interface AudioPlayerOptions {
  /** Waveform bar color */
  waveColor?: string
  /** Progress (played) color */
  progressColor?: string
  /** Cursor color */
  cursorColor?: string
  /** Waveform height in px or 'auto' */
  height?: number | 'auto'
  /** Bar width in px */
  barWidth?: number
  /** Bar gap in px */
  barGap?: number
  /** Bar radius in px */
  barRadius?: number
  /** Minimum pixels per second of audio */
  minPxPerSec?: number
  /** Normalize waveform */
  normalize?: boolean
  /** Allow drag to seek */
  dragToSeek?: boolean
  /** Auto-scroll to cursor */
  autoScroll?: boolean
  /** Auto-center on cursor */
  autoCenter?: boolean
  /** Hide scrollbar */
  hideScrollbar?: boolean
  /** Enable zoom plugin */
  enableZoom?: boolean
  /** Enable regions plugin */
  enableRegions?: boolean
}

export interface AudioPlayerState {
  /** WaveSurfer instance */
  instance: WaveSurfer | null
  /** Regions plugin instance (if enabled) */
  regions: RegionsPlugin | null
  /** Whether the player is ready */
  isReady: boolean
  /** Whether audio is playing */
  isPlaying: boolean
  /** Current playback time in seconds */
  currentTime: number
  /** Total duration in seconds */
  duration: number
  /** Loading progress (0-100) */
  loadingProgress: number
  /** Current zoom level */
  zoom: number
}

export interface AudioRegion {
  id: string
  start: number
  end?: number
  color?: string
  drag?: boolean
  resize?: boolean
  content?: string
}
