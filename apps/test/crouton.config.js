// Blog test configuration
export default {
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json', seed: { count: 10 } }
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