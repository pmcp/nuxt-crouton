// Blog test configuration
export default {
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json' }
  ],

  targets: [
    {
      layer: 'blog',
      collections: ['posts']
    }
  ],

  dialect: 'sqlite',

  flags: {
    useMetadata: true,
    force: true
  }
}