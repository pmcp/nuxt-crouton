import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-themes',
  name: 'Themes',
  description: 'Swappable UI themes for Nuxt UI',
  icon: 'i-lucide-palette',
  version: '1.0.0',
  category: 'addon',
  dependencies: [],
  provides: {
    components: [
      { name: 'KoLed', description: 'LED display component (KO theme)', props: ['value'] },
      { name: 'KoKnob', description: 'Rotary knob control (KO theme)', props: ['modelValue'] },
      { name: 'KoPanel', description: 'Hardware-inspired panel (KO theme)', props: [] },
    ],
  },
})
