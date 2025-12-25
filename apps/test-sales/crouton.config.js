export default {
  collections: [
    { name: 'events', fieldsFile: './schemas/events.json' },
    { name: 'products', fieldsFile: './schemas/products.json' },
    { name: 'categories', fieldsFile: './schemas/categories.json' },
    { name: 'orders', fieldsFile: './schemas/orders.json' },
    { name: 'orderItems', fieldsFile: './schemas/orderItems.json' },
    { name: 'locations', fieldsFile: './schemas/locations.json' },
    { name: 'clients', fieldsFile: './schemas/clients.json' },
    { name: 'eventSettings', fieldsFile: './schemas/eventSettings.json' },
    { name: 'printers', fieldsFile: './schemas/printers.json' },
    { name: 'printQueues', fieldsFile: './schemas/printQueues.json' }
  ],
  targets: [
    {
      layer: 'sales',
      collections: [
        'events', 'products', 'categories', 'orders', 'orderItems',
        'locations', 'clients', 'eventSettings', 'printers', 'printQueues'
      ]
    }
  ],
  dialect: 'sqlite',
  flags: {
    useTeamUtility: true,
    useMetadata: true,
    noTranslations: true
  }
}
