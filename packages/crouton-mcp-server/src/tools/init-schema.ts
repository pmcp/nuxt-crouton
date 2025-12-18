import { z } from 'zod'

export const initSchemaInputSchema = {
  template: z.enum(['minimal', 'full', 'ecommerce', 'blog', 'tasks']).describe('Template type to generate')
}

export const initSchemaToolDefinition = {
  name: 'init_schema',
  description: 'Generate a starter schema template. Choose from minimal, full, ecommerce, blog, or tasks templates.'
}

const TEMPLATES: Record<string, { description: string; schema: Record<string, any> }> = {
  minimal: {
    description: 'Minimal schema with just name and description',
    schema: {
      name: {
        type: 'string',
        meta: { required: true, maxLength: 255 }
      },
      description: {
        type: 'text'
      }
    }
  },
  full: {
    description: 'Full schema demonstrating all field types',
    schema: {
      name: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Name', showInTable: true, sortable: true }
      },
      description: {
        type: 'text',
        meta: { label: 'Description' }
      },
      count: {
        type: 'number',
        meta: { default: 0, min: 0 }
      },
      price: {
        type: 'decimal',
        meta: { precision: 10, scale: 2 }
      },
      active: {
        type: 'boolean',
        meta: { default: true }
      },
      publishedAt: {
        type: 'date'
      },
      metadata: {
        type: 'json',
        meta: { default: {} }
      },
      tags: {
        type: 'array'
      }
    }
  },
  ecommerce: {
    description: 'E-commerce product schema',
    schema: {
      name: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Product Name', showInTable: true, sortable: true }
      },
      sku: {
        type: 'string',
        meta: { unique: true, label: 'SKU', showInTable: true }
      },
      description: {
        type: 'text',
        meta: { label: 'Description' }
      },
      price: {
        type: 'decimal',
        meta: { required: true, precision: 10, scale: 2, min: 0, showInTable: true, sortable: true }
      },
      compareAtPrice: {
        type: 'decimal',
        meta: { precision: 10, scale: 2, min: 0 }
      },
      inStock: {
        type: 'boolean',
        meta: { default: true, showInTable: true }
      },
      quantity: {
        type: 'number',
        meta: { default: 0, min: 0 }
      },
      categoryId: {
        type: 'string',
        refTarget: 'categories',
        meta: { label: 'Category', showInTable: true, filterable: true }
      },
      images: {
        type: 'json',
        meta: { default: [] }
      },
      tags: {
        type: 'array'
      }
    }
  },
  blog: {
    description: 'Blog post schema',
    schema: {
      title: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Title', showInTable: true, sortable: true }
      },
      slug: {
        type: 'string',
        meta: { required: true, unique: true, label: 'URL Slug', showInTable: true }
      },
      content: {
        type: 'text',
        meta: { required: true, label: 'Content' }
      },
      excerpt: {
        type: 'text',
        meta: { maxLength: 500, label: 'Excerpt' }
      },
      published: {
        type: 'boolean',
        meta: { default: false, showInTable: true }
      },
      publishedAt: {
        type: 'date',
        meta: { showInTable: true, sortable: true }
      },
      authorId: {
        type: 'string',
        refTarget: 'users',
        meta: { label: 'Author', showInTable: true }
      },
      categoryId: {
        type: 'string',
        refTarget: 'categories',
        meta: { label: 'Category', filterable: true }
      },
      featuredImage: {
        type: 'string',
        meta: { label: 'Featured Image' }
      },
      tags: {
        type: 'array'
      }
    }
  },
  tasks: {
    description: 'Task management schema',
    schema: {
      title: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Task Title', showInTable: true, sortable: true }
      },
      description: {
        type: 'text',
        meta: { label: 'Description' }
      },
      status: {
        type: 'string',
        meta: { required: true, default: 'pending', label: 'Status', showInTable: true, filterable: true }
      },
      priority: {
        type: 'string',
        meta: { default: 'medium', label: 'Priority', showInTable: true, filterable: true }
      },
      dueDate: {
        type: 'date',
        meta: { label: 'Due Date', showInTable: true, sortable: true }
      },
      assigneeId: {
        type: 'string',
        refTarget: 'users',
        meta: { label: 'Assignee', showInTable: true }
      },
      tags: {
        type: 'array'
      },
      checklist: {
        type: 'repeater',
        children: {
          item: { type: 'string', meta: { required: true } },
          completed: { type: 'boolean', meta: { default: false } }
        }
      }
    }
  }
}

export function handleInitSchema(args: { template: string }): {
  template: string
  description: string
  schema: Record<string, any>
  schemaJson: string
  usage: string
} {
  const templateData = TEMPLATES[args.template]

  if (!templateData) {
    return {
      template: args.template,
      description: 'Unknown template',
      schema: {},
      schemaJson: '{}',
      usage: `Unknown template. Available: ${Object.keys(TEMPLATES).join(', ')}`
    }
  }

  const schemaJson = JSON.stringify(templateData.schema, null, 2)

  return {
    template: args.template,
    description: templateData.description,
    schema: templateData.schema,
    schemaJson,
    usage: `Save the schema to a file and run:\ncrouton generate <layer> <collection> --fields-file=<schema-file.json>`
  }
}
