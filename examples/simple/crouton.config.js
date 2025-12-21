export default {
  collections: [
    { 
      name: 'posts', 
      fieldsFile: './schemas/posts.json',
      sortable: true,
      translatable: true
    }
  ],
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],
  dialect: 'sqlite',
  flags: { 
    useMetadata: true, 
    force: true 
  }
}
