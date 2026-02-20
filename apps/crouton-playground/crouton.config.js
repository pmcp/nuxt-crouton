export default {
    // Feature flags - which crouton packages to enable
    features: {
        // Core (enabled by default): auth, admin, i18n
        // Optional features:
        editor: true,
        bookings: true,
        pages: true,
        assets: true,
        collab: true,
        flow: true,
        charts: true,
        maps: true,
        ai: { defaultModel: 'claude-sonnet-4-6' }
    },

    // Collections to generate (used by CLI)
    collections: [
        {
            name: 'products',
            fieldsFile: './schemas/product.json',
            seed: { count: 50 }
        },
        {
            name: 'categories',
            fieldsFile: './schemas/category.json',
            hierarchy: true,
            seed: { count: 50 }
        },
        {
            name: 'orders',
            fieldsFile: './schemas/order.json',
            seed: { count: 50 }
        },
        {
            name: 'articles',
            fieldsFile: './schemas/article.json',
            seed: { count: 50 }
        },
        {
            name: 'testimonials',
            fieldsFile: './schemas/testimonial.json',
            seed: { count: 50 }
        },
        {
            name: 'contacts',
            fieldsFile: './schemas/contact.json',
            seed: { count: 50 }
        },
        {
            name: 'tasks',
            fieldsFile: './schemas/task.json',
            seed: { count: 50 }
        }
    ],

    targets: [
        { layer: 'shop',     collections: ['products', 'categories', 'orders'] },
        { layer: 'content',  collections: ['articles', 'testimonials'] },
        { layer: 'people',   collections: ['contacts'] },
        { layer: 'projects', collections: ['tasks'] }
    ],

    dialect: 'sqlite'
}
