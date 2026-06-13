import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'

// ---------------------------------------------------------------------------
// 3D Model block — embeds a glTF/.glb model in a CMS page.
// Strings use the `three.*` i18n key namespace (resolved by the pages editor's
// useBlockI18n + the locale files shipped in i18n/locales). The `three-model`
// field type renders the custom CroutonThreeBlocksModelSourcePicker, which uses
// the crouton-assets media picker when present and falls back to a URL field.
// ---------------------------------------------------------------------------

const modelBlockDefinition: CroutonBlockDefinition = {
  type: 'modelBlock',
  name: 'three.blocks.model.name',
  description: 'three.blocks.model.description',
  icon: 'i-lucide-box',
  category: 'content',
  // WebGL — must only render on the client.
  clientOnly: true,
  defaultAttrs: {
    src: '',
    title: undefined,
    background: 'transparent',
    autoRotate: true,
    height: 400
  },
  components: {
    editorView: 'CroutonThreeBlocksModelBlockView',
    renderer: 'CroutonThreeBlocksModelBlockRender'
  },
  propertyComponents: {
    'three-model': 'CroutonThreeBlocksModelSourcePicker'
  },
  schema: [
    {
      name: 'src',
      type: 'three-model',
      label: 'three.blocks.model.fields.src.label',
      description: 'three.blocks.model.fields.src.description',
      required: true
    },
    {
      name: 'title',
      type: 'text',
      label: 'three.blocks.model.fields.title.label',
      description: 'three.blocks.model.fields.title.description'
    },
    {
      name: 'background',
      type: 'select',
      label: 'three.blocks.model.fields.background.label',
      options: [
        { label: 'three.blocks.model.fields.background.options.transparent', value: 'transparent' },
        { label: 'three.blocks.model.fields.background.options.dark', value: 'dark' },
        { label: 'three.blocks.model.fields.background.options.light', value: 'light' }
      ],
      defaultValue: 'transparent'
    },
    {
      name: 'autoRotate',
      type: 'switch',
      label: 'three.blocks.model.fields.autoRotate.label',
      description: 'three.blocks.model.fields.autoRotate.description'
    },
    {
      name: 'height',
      type: 'select',
      label: 'three.blocks.model.fields.height.label',
      options: [
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' },
        { label: '600px', value: '600' }
      ],
      defaultValue: '400'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="model-block"]',
    attributes: {
      src: { default: '' },
      title: { default: undefined },
      background: { default: 'transparent' },
      autoRotate: { default: true, htmlAttr: 'data-auto-rotate', parseType: 'boolean' },
      height: { default: 400, htmlAttr: 'data-height', parseType: 'int' }
    }
  }
}

export default defineAppConfig({
  // App auto-discovery registration for crouton-three
  croutonApps: {
    three: {
      id: 'three',
      name: 'three.name',
      icon: 'i-lucide-box',
      apiRoutes: [],
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  },
  // Block definitions for the page editor
  croutonBlocks: {
    modelBlock: modelBlockDefinition
  }
})
