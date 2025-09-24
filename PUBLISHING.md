# Publishing Guide for Nuxt Crouton

This guide covers how to publish the Nuxt Crouton packages to npm.

## Prerequisites

1. **NPM Account**: Create a free account at [npmjs.com](https://www.npmjs.com/signup)
2. **Login**: Login to npm from your terminal:
   ```bash
   npm login
   npm whoami  # Should show your username
   ```

3. **Organization Access**: Make sure you have access to the `@friendlyinternet` organization on npm

4. **pnpm Installed**: This project uses pnpm for package management
   ```bash
   npm install -g pnpm
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
pnpm publish:all
```

Or publish them individually:

```bash
# Base layer first
cd packages/nuxt-crouton
pnpm publish --access public

# Then translations
cd ../nuxt-crouton-translations
pnpm publish --access public

# Then editor
cd ../nuxt-crouton-editor
pnpm publish --access public
```

### Step 4: Verify Publication

Check that your packages are live:
- https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton
- https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton-translations
- https://www.npmjs.com/package/@friendlyinternet/nuxt-crouton-editor

## Updating Packages

When you make changes and want to publish updates:

### 1. Update Version

```bash
# Patch version (1.0.0 → 1.0.1)
pnpm version:patch

# Minor version (1.0.0 → 1.1.0)
pnpm version:minor

# Major version (1.0.0 → 2.0.0)
pnpm version:major
```

Note: If the version commands don't work, manually update the version in each `package.json`.

### 2. Publish Updates

```bash
pnpm publish:all
```

## Testing Before Publishing

Always test your packages before publishing:

```bash
# Dry run (doesn't actually publish)
pnpm publish:dry
```

## Using Published Packages

Once published, anyone can install your packages:

```bash
# In any Nuxt project (use pnpm for better dependency resolution)
pnpm add @friendlyinternet/nuxt-crouton-translations

# Or if npm hangs, clear cache first:
npm cache clean --force
npm install @friendlyinternet/nuxt-crouton-translations
```

And use in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-translations']
})
```

## Troubleshooting

### "Not logged in"
```bash
npm whoami  # Check if logged in
npm login   # Login if needed
```

### "Permission denied"
- Make sure you're using `--access public` for scoped packages
- Check that you own the npm scope (@friendlyinternet)
- Verify organization access: `npm org ls <your-username>`

### "npm install hanging"
If users report that `npm install` hangs when installing your packages, recommend using `pnpm` instead:
```bash
pnpm add @friendlyinternet/nuxt-crouton
```
This is due to npm's complex dependency resolution with peer dependencies.

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