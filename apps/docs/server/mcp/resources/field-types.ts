/**
 * Field Types Reference Resource
 * Synced with: packages/nuxt-crouton-cli/lib/utils/helpers.mjs
 */
export default defineMcpResource({
  uri: 'crouton://field-types',
  name: 'Crouton Field Types Reference',
  description: 'Complete reference of all available field types in Crouton schemas (synced with generator)',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://field-types',
        mimeType: 'text/markdown',
        text: `# Crouton Field Types Reference

> **Source of truth**: \`packages/nuxt-crouton-cli/lib/utils/helpers.mjs\`

## Core Field Types

| Type | Zod Validation | TypeScript | DB (Drizzle) | Default |
|------|----------------|------------|--------------|---------|
| \`string\` | \`z.string()\` | \`string\` | \`text\` | \`''\` |
| \`text\` | \`z.string()\` | \`string\` | \`text\` | \`''\` |
| \`number\` | \`z.number()\` | \`number\` | \`integer\` | \`0\` |
| \`decimal\` | \`z.number()\` | \`number\` | \`decimal\` | \`0\` |
| \`boolean\` | \`z.boolean()\` | \`boolean\` | \`boolean\` | \`false\` |
| \`date\` | \`z.date()\` | \`Date \\| null\` | \`timestamp\` | \`null\` |
| \`json\` | \`z.record(z.any())\` | \`Record<string, any>\` | \`json\` | \`{}\` |
| \`repeater\` | \`z.array(z.any())\` | \`any[]\` | \`json\` | \`[]\` |
| \`array\` | \`z.array(z.string())\` | \`string[]\` | \`text\` | \`[]\` |

## Schema Format

### Basic Field
\`\`\`json
{
  "fieldName": {
    "type": "string",
    "meta": {
      "required": true,
      "maxLength": 255,
      "label": "Field Label",
      "placeholder": "Enter value...",
      "hint": "Help text for the field"
    }
  }
}
\`\`\`

### Field with Reference (Relation)
\`\`\`json
{
  "categoryId": {
    "type": "string",
    "refTarget": "categories",
    "meta": {
      "required": true,
      "label": "Category"
    }
  }
}
\`\`\`

### Decimal Field
\`\`\`json
{
  "price": {
    "type": "decimal",
    "meta": {
      "precision": 10,
      "scale": 2,
      "required": true
    }
  }
}
\`\`\`

### Repeater Field (Nested Items)
\`\`\`json
{
  "items": {
    "type": "repeater",
    "children": {
      "name": { "type": "string", "meta": { "required": true } },
      "quantity": { "type": "number", "meta": { "default": 1 } }
    }
  }
}
\`\`\`

## Meta Options

| Option | Type | Description |
|--------|------|-------------|
| \`required\` | boolean | Field is required |
| \`maxLength\` | number | Max string length |
| \`minLength\` | number | Min string length |
| \`min\` | number | Min numeric value |
| \`max\` | number | Max numeric value |
| \`precision\` | number | Decimal precision |
| \`scale\` | number | Decimal scale |
| \`label\` | string | Display label |
| \`placeholder\` | string | Input placeholder |
| \`hint\` | string | Help text |
| \`default\` | any | Default value |
| \`primaryKey\` | boolean | Mark as primary key |
| \`unique\` | boolean | Enforce uniqueness |
| \`index\` | boolean | Create index |
| \`hidden\` | boolean | Hide from forms |
| \`readonly\` | boolean | Read-only field |
| \`showInTable\` | boolean | Show in list table |
| \`sortable\` | boolean | Enable sorting |
| \`filterable\` | boolean | Enable filtering |

## Auto-Generated Fields

These fields are automatically added to every collection:

| Field | Type | Purpose |
|-------|------|---------|
| \`id\` | string | Primary key (uuid/nanoid) |
| \`teamId\` | string | Team association |
| \`createdAt\` | date | Creation timestamp |
| \`updatedAt\` | date | Last update timestamp |
| \`createdBy\` | string | Creator user ID |
| \`updatedBy\` | string | Last updater user ID |

With \`--hierarchy\` flag:
| Field | Type | Purpose |
|-------|------|---------|
| \`parentId\` | string | Parent item ID |
| \`path\` | string | Materialized path |
| \`depth\` | number | Tree depth |
| \`order\` | number | Sort order |

## Complete Example Schema

\`\`\`json
{
  "name": {
    "type": "string",
    "meta": {
      "required": true,
      "maxLength": 255,
      "label": "Product Name",
      "showInTable": true,
      "sortable": true
    }
  },
  "description": {
    "type": "text",
    "meta": {
      "label": "Description",
      "placeholder": "Enter product description..."
    }
  },
  "price": {
    "type": "decimal",
    "meta": {
      "required": true,
      "precision": 10,
      "scale": 2,
      "min": 0,
      "showInTable": true,
      "sortable": true
    }
  },
  "inStock": {
    "type": "boolean",
    "meta": {
      "default": true,
      "label": "In Stock",
      "showInTable": true
    }
  },
  "categoryId": {
    "type": "string",
    "refTarget": "categories",
    "meta": {
      "required": true,
      "label": "Category",
      "showInTable": true,
      "filterable": true
    }
  },
  "tags": {
    "type": "array",
    "meta": {
      "label": "Tags"
    }
  },
  "metadata": {
    "type": "json",
    "meta": {
      "label": "Additional Data",
      "default": {}
    }
  }
}
\`\`\`
`
      }]
    }
  }
})
