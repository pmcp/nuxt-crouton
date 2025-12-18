import { z } from 'zod'

const EXAMPLES: Record<string, { description: string; schema: Record<string, any> }> = {
  products: {
    description: 'E-commerce product catalog with categories',
    schema: {
      name: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Product Name', showInTable: true, sortable: true }
      },
      description: {
        type: 'text',
        meta: { label: 'Description', placeholder: 'Enter product description...' }
      },
      price: {
        type: 'decimal',
        meta: { required: true, precision: 10, scale: 2, min: 0, showInTable: true, sortable: true }
      },
      inStock: {
        type: 'boolean',
        meta: { default: true, label: 'In Stock', showInTable: true }
      },
      categoryId: {
        type: 'string',
        refTarget: 'categories',
        meta: { required: true, label: 'Category', showInTable: true, filterable: true }
      },
      tags: {
        type: 'array',
        meta: { label: 'Tags' }
      },
      images: {
        type: 'json',
        meta: { label: 'Product Images', default: [] }
      }
    }
  },
  tasks: {
    description: 'Task management with status and assignments',
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
        type: 'array',
        meta: { label: 'Tags' }
      }
    }
  },
  blog: {
    description: 'Blog posts with author and categories',
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
        meta: { default: false, label: 'Published', showInTable: true }
      },
      publishedAt: {
        type: 'date',
        meta: { label: 'Published Date', showInTable: true, sortable: true }
      },
      authorId: {
        type: 'string',
        refTarget: 'users',
        meta: { required: true, label: 'Author', showInTable: true }
      },
      categoryId: {
        type: 'string',
        refTarget: 'categories',
        meta: { label: 'Category', showInTable: true, filterable: true }
      },
      featuredImage: {
        type: 'string',
        meta: { label: 'Featured Image URL' }
      }
    }
  },
  invoices: {
    description: 'Invoices with line items (repeater example)',
    schema: {
      invoiceNumber: {
        type: 'string',
        meta: { required: true, unique: true, label: 'Invoice #', showInTable: true }
      },
      clientId: {
        type: 'string',
        refTarget: 'clients',
        meta: { required: true, label: 'Client', showInTable: true }
      },
      status: {
        type: 'string',
        meta: { required: true, default: 'draft', label: 'Status', showInTable: true, filterable: true }
      },
      issueDate: {
        type: 'date',
        meta: { required: true, label: 'Issue Date', showInTable: true, sortable: true }
      },
      dueDate: {
        type: 'date',
        meta: { label: 'Due Date', showInTable: true }
      },
      items: {
        type: 'repeater',
        children: {
          description: { type: 'string', meta: { required: true } },
          quantity: { type: 'number', meta: { required: true, default: 1, min: 1 } },
          unitPrice: { type: 'decimal', meta: { required: true, precision: 10, scale: 2 } }
        },
        meta: { label: 'Line Items' }
      },
      notes: {
        type: 'text',
        meta: { label: 'Notes' }
      },
      total: {
        type: 'decimal',
        meta: { precision: 10, scale: 2, readonly: true, label: 'Total' }
      }
    }
  },
  events: {
    description: 'Events with location and scheduling',
    schema: {
      title: {
        type: 'string',
        meta: { required: true, maxLength: 255, label: 'Event Title', showInTable: true, sortable: true }
      },
      description: {
        type: 'text',
        meta: { label: 'Description' }
      },
      startDate: {
        type: 'date',
        meta: { required: true, label: 'Start Date', showInTable: true, sortable: true }
      },
      endDate: {
        type: 'date',
        meta: { label: 'End Date', showInTable: true }
      },
      location: {
        type: 'string',
        meta: { label: 'Location', showInTable: true }
      },
      isAllDay: {
        type: 'boolean',
        meta: { default: false, label: 'All Day Event' }
      },
      capacity: {
        type: 'number',
        meta: { min: 0, label: 'Capacity' }
      },
      organizerId: {
        type: 'string',
        refTarget: 'users',
        meta: { label: 'Organizer' }
      },
      metadata: {
        type: 'json',
        meta: { label: 'Additional Data', default: {} }
      }
    }
  }
}

export default defineMcpTool({
  name: 'get_example_schema',
  description: 'Get an example Crouton schema for common use cases. Available examples: products, tasks, blog, invoices, events',
  inputSchema: {
    example: z.string().describe('The example to get: products, tasks, blog, invoices, events, or "list" to see all available')
  },
  async handler({ example }) {
    if (example === 'list') {
      const list = Object.entries(EXAMPLES)
        .map(([name, { description }]) => `- **${name}**: ${description}`)
        .join('\n')

      return {
        content: [{
          type: 'text' as const,
          text: `# Available Example Schemas\n\n${list}\n\nUse \`get_example_schema\` with any of these names to get the full schema.`
        }]
      }
    }

    const exampleData = EXAMPLES[example.toLowerCase()]
    if (!exampleData) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Example "${example}" not found.\n\nAvailable examples: ${Object.keys(EXAMPLES).join(', ')}\n\nUse "list" to see descriptions.`
        }]
      }
    }

    return {
      content: [{
        type: 'text' as const,
        text: `# ${example.charAt(0).toUpperCase() + example.slice(1)} Schema

**Description**: ${exampleData.description}

## Schema JSON

\`\`\`json
${JSON.stringify(exampleData.schema, null, 2)}
\`\`\`

## Usage

Save this to a file (e.g., \`${example}.json\`) and generate:

\`\`\`bash
crouton <layer> ${example} --fields-file=${example}.json
\`\`\`

## Fields Summary

${Object.entries(exampleData.schema).map(([name, def]) => {
  const d = def as Record<string, any>
  const ref = d.refTarget ? ` → ${d.refTarget}` : ''
  const required = d.meta?.required ? ' *(required)*' : ''
  return `- **${name}**: \`${d.type}\`${ref}${required}`
}).join('\n')}`
      }]
    }
  }
})
