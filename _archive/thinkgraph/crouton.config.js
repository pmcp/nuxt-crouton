export default {
  features: {},

  collections: [
    { name: 'decisions', fieldsFile: './schemas/decisions.json' }
  ],

  targets: [
    { layer: 'thinkgraph', collections: ['decisions'] }
  ],

  dialect: 'sqlite'
}
