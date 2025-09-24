# Publishing Nuxt Crouton to NPM

This guide will help you publish the Nuxt Crouton packages to NPM for the first time.

## Prerequisites

1. **NPM Account**: Create a free account at [npmjs.com](https://www.npmjs.com/signup)
2. **Login**: Login to npm from your terminal:
   ```bash
   npm login
   ```

## First-Time Publishing

### Step 1: Navigate to the Project

```bash
cd /Users/pmcp/Projects/nuxt-crouton
```

### Step 2: Install Dependencies (Optional)

```bash
pnpm install
```

### Step 3: Publish Packages

You can publish all packages at once:

```bash
npm run publish:all
```

Or publish them individually:

```bash
# Base layer first
cd packages/nuxt-crouton
npm publish --access public

# Then translations
cd ../nuxt-crouton-translations
npm publish --access public

# Then editor
cd ../nuxt-crouton-editor
npm publish --access public
```

### Step 4: Verify Publication

Check that your packages are live:
- https://www.npmjs.com/package/@fyit/nuxt-crouton
- https://www.npmjs.com/package/@fyit/nuxt-crouton-translations
- https://www.npmjs.com/package/@fyit/nuxt-crouton-editor

## Updating Packages

When you make changes and want to publish updates:

### 1. Update Version

```bash
# Patch version (1.0.0 → 1.0.1)
npm run version:patch

# Minor version (1.0.0 → 1.1.0)
npm run version:minor

# Major version (1.0.0 → 2.0.0)
npm run version:major
```

### 2. Publish Updates

```bash
npm run publish:all
```

## Testing Before Publishing

Always test your packages before publishing:

```bash
# Dry run (doesn't actually publish)
npm run publish:dry
```

## Using Published Packages

Once published, anyone can install your packages:

```bash
# In any Nuxt project
npm install @fyit/nuxt-crouton-translations
```

And use in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: ['@fyit/nuxt-crouton-translations']
})
```

## Troubleshooting

### "Package name already exists"
- The names `@fyit/nuxt-crouton*` might be taken
- You can change the scope to your npm username: `@yourname/nuxt-crouton`
- Update all package.json files with the new scope

### "Not logged in"
```bash
npm whoami  # Check if logged in
npm login   # Login if needed
```

### "Permission denied"
- Make sure you're using `--access public` for scoped packages
- Check that you own the npm scope (@fyit or @yourname)

## Version Management

Follow semantic versioning:
- **Patch** (1.0.x): Bug fixes, minor changes
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

## Git Integration

After publishing, tag your release:

```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

## Success! 🎉

Your packages are now available on NPM for anyone to use!