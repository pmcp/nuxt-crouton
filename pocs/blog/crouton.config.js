export default {
  // No optional crouton packages beyond the core bundle (auth + admin + i18n).
  // The `body` field uses the CroutonEditorSimple component, which core ships a
  // working stub for — so we don't need to enable the editor feature/package.
  features: {},

  // Blog POC collections — generated via the crouton CLI (`crouton config`).
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json', kind: 'content' }
  ],

  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],

  dialect: 'sqlite'
}
