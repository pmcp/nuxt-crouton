import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-themes',
  name: 'Themes',
  description: 'Swappable UI themes for Nuxt UI — KO, Minimal, KR-11, and Black & White themes with theme switcher',
  icon: 'i-lucide-palette',
  version: '0.1.0',
  category: 'addon',
  dependencies: [],

  // Subpath exports — each theme is a standalone Nuxt layer
  // Usage: extends: ['@fyit/crouton-themes/themes'] (includes all + switcher)
  //   or:  extends: ['@fyit/crouton-themes/ko'] (single theme)
  provides: {
    composables: [
      // Theme switching utilities (from ./themes layer)
      'useThemeSwitcher',
      'useThemeMenuItems',
    ],
    components: [
      // Themes layer — theme switching UI (no prefix, global)
      { name: 'ThemeSwitcher', description: 'Theme selector with dropdown, inline, or cycle mode', props: ['mode', 'size'] },
      { name: 'ThemeCompactPicker', description: 'Compact theme picker for settings panels', props: [] },

      // KO theme — hardware-inspired (Teenage Engineering KO II) — prefix: Ko
      { name: 'KoLed', description: 'LED indicator with glow animations (off, on, blink, fast, alive)', props: ['state', 'color'] },
      { name: 'KoKnob', description: 'Rotary knob control with drag interaction', props: ['modelValue', 'min', 'max'] },
      { name: 'KoPanel', description: 'Hardware-inspired display panel with glass overlay', props: [] },
      { name: 'KoDisplay', description: '7-segment style LED readout', props: ['value'] },
      { name: 'KoButton', description: 'Full tactile button with LED slot', props: ['modelValue', 'color'] },
      { name: 'KoLabel', description: 'Hardware-style engraved label', props: ['text'] },
      { name: 'KoPunchHole', description: 'Decorative punch hole element', props: [] },
      { name: 'KoSpeakerGrill', description: 'Speaker grill pattern element', props: ['slots'] },

      // KR-11 theme — Korg KR-11 rhythm box inspired — prefix: Kr
      { name: 'KrDisplay', description: '7-segment LED tempo display with blink animation', props: ['value', 'blink'] },
      { name: 'KrPad', description: 'Tactile drum pad button (cream, coral, gold, mint)', props: ['color', 'label'] },
      { name: 'KrLed', description: 'Status LED indicator (yellow, green, with blink)', props: ['state', 'color'] },
      { name: 'KrKnob', description: 'Rotary control with drag interaction', props: ['modelValue', 'min', 'max'] },
      { name: 'KrSpeakerGrill', description: 'Horizontal slot speaker grill pattern', props: ['slots'] },

      // Minimal theme — no custom components, CSS-only (black lines, white bg)
      // Blackandwhite theme — no custom components, CSS-only (monochrome dashboard)
    ],
  },

  // Available themes as subpath exports
  themes: [
    { id: 'ko',            name: 'KO',          description: 'Teenage Engineering KO II hardware aesthetic',         subpath: './ko',           variant: 'ko' },
    { id: 'minimal',       name: 'Minimal',     description: 'Super clean, black lines on white background',          subpath: './minimal',      variant: 'minimal' },
    { id: 'kr11',          name: 'KR-11',       description: 'Korg KR-11 rhythm box, tactile pads and LED display',  subpath: './kr11',         variant: 'kr11' },
    { id: 'blackandwhite', name: 'Black & White', description: 'Compact monochrome dashboard theme',                 subpath: './blackandwhite', variant: 'blackandwhite' },
  ],
})
