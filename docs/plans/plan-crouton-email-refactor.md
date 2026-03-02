# Crouton Email — Multi-Driver Refactor Plan

## Summary

Refactor `packages/crouton-email` to replace the Resend SDK with nodemailer + multi-driver config. Everything above the transport layer stays the same — templates, components, senders, auth integration. Users pick their email provider via config. Resend stays as a driver option and the default for backwards compatibility.

---

## What Stays

| Layer | Status |
|---|---|
| Vue Email templates (`server/emails/*.vue`) | ✅ No change |
| Client components (`EmailVerificationFlow`, etc.) | ✅ No change |
| Convenience senders (`sendVerificationEmail`, etc.) | ✅ No change |
| Template renderer (`server/utils/template-renderer.ts`) | ✅ No change |
| `@crouton/auth` integration | ✅ No change |
| Types (`types/index.ts`) | ⚠️ Minor additions |

## What Changes

| File | Change |
|---|---|
| `server/utils/email.ts` | Replace Resend SDK with nodemailer + driver resolution |
| `server/utils/drivers.ts` | **New file** — driver config map |
| `nuxt.config.ts` | Update runtime config shape |
| `package.json` | Remove `resend`, add `nodemailer` |
| `types/index.ts` | Add driver types |

> **🔍 OPEN: What does `server/utils/email.ts` currently look like?** Does it import the `resend` package directly, or is there already an abstraction layer? The refactor scope depends on how tightly coupled the Resend SDK is.

> **🔍 OPEN: Do all senders go through `useEmailService().send()`?** Or do some senders in `server/utils/senders.ts` call the Resend SDK directly? If they all go through `useEmailService()`, the refactor is clean — one file changes. If not, we have more touch points.

> **🔍 OPEN: Does `@crouton/auth` import from `#crouton-email/server/utils/senders` directly, or through another interface?** Need to verify the integration boundary won't break.

---

## Driver System

### `server/utils/drivers.ts` (new file)

```ts
import type { TransportOptions } from 'nodemailer'

type DriverConfig = Record<string, any>
type DriverFactory = (config: DriverConfig) => TransportOptions

export const drivers: Record<string, DriverFactory> = {
  mailgun: (c) => ({
    host: 'smtp.eu.mailgun.org',
    port: 587,
    secure: false,
    auth: { user: `postmaster@${c.domain}`, pass: c.apiKey },
  }),

  resend: (c) => ({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: c.apiKey },
  }),

  postmark: (c) => ({
    host: 'smtp.postmarkapp.com',
    port: 587,
    secure: false,
    auth: { user: c.apiKey, pass: c.apiKey },
  }),

  brevo: (c) => ({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user: c.login, pass: c.apiKey },
  }),

  scaleway: (c) => ({
    host: 'smtp.tem.scw.cloud',
    port: 465,
    secure: true,
    auth: { user: c.projectId, pass: c.secretKey },
  }),

  smtp: (c) => ({
    host: c.host,
    port: c.port || 587,
    secure: c.secure ?? false,
    auth: c.auth,
  }),
}
```

### Provider Comparison

| Driver | SMTP Host | Port | EU Data | Deliverability | Notes |
|---|---|---|---|---|---|
| `mailgun` | `smtp.eu.mailgun.org` | 587 | ✅ EU region | ~97% | Swedish-owned (Sinch). Best EU option |
| `resend` | `smtp.resend.com` | 465 | ❌ US | Very good | Current default. Keep for backwards compat |
| `postmark` | `smtp.postmarkapp.com` | 587 | ❌ US | ~99% | Best deliverability overall |
| `brevo` | `smtp-relay.brevo.com` | 587 | ✅ France | ~79% | Free tier (300/day). Fine for staging |
| `scaleway` | `smtp.tem.scw.cloud` | 465 | ✅ France | Unproven | Cheapest EU option (€0.25/1000) |
| `smtp` | User-provided | Any | Varies | Varies | Escape hatch for any provider |

---

## Refactored `server/utils/email.ts`

```ts
import { createTransport, type Transporter } from 'nodemailer'
import { drivers } from './drivers'

let _transport: Transporter | null = null

function getTransport(): Transporter {
  if (_transport) return _transport

  const config = useRuntimeConfig().email
  const driverName = config.driver || 'resend'

  const driverFactory = drivers[driverName]
  if (!driverFactory) {
    throw new Error(`Unknown email driver: "${driverName}". Available: ${Object.keys(drivers).join(', ')}`)
  }

  _transport = createTransport(driverFactory(config))
  return _transport
}

export function useEmailService() {
  return {
    async send(options: {
      to: string | string[]
      subject: string
      html?: string
      text?: string
      from?: string
      replyTo?: string
      cc?: string | string[]
      bcc?: string | string[]
    }) {
      const config = useRuntimeConfig().email
      const transport = getTransport()

      const result = await transport.sendMail({
        from: options.from || `${config.fromName} <${config.from}>`,
        replyTo: options.replyTo || config.replyTo,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      return { id: result.messageId }
    },
  }
}
```

> **🔍 OPEN: Does the current `useEmailService()` return anything beyond `{ id }`?** If the Resend SDK returns additional data (like status, cost, etc.) that senders or auth depend on, we need to preserve that interface.

---

## Config Migration

### Before (Resend-only)

```ts
runtimeConfig: {
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: 'noreply@example.com',
    fromName: 'My App',
    replyTo: 'support@example.com',
  },
}
```

### After — still using Resend (minimal change)

```ts
runtimeConfig: {
  email: {
    driver: 'resend',
    apiKey: process.env.RESEND_API_KEY,
    from: 'noreply@example.com',
    fromName: 'My App',
    replyTo: 'support@example.com',
  },
}
```

### After — Mailgun EU

```ts
runtimeConfig: {
  email: {
    driver: 'mailgun',
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    from: 'noreply@example.com',
    fromName: 'My App',
    replyTo: 'support@example.com',
  },
}
```

### After — raw SMTP

```ts
runtimeConfig: {
  email: {
    driver: 'smtp',
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: 'noreply@example.com',
    fromName: 'My App',
  },
}
```

> **🔍 OPEN: How does `nuxt.config.ts` currently expose the runtime config?** Is `resendApiKey` the only provider-specific key, or are there other Resend-specific settings we need to account for?

---

## Updated Types

```ts
export type EmailDriver = 'mailgun' | 'resend' | 'postmark' | 'brevo' | 'scaleway' | 'smtp'

export interface EmailConfig {
  driver: EmailDriver
  apiKey?: string
  domain?: string           // mailgun
  login?: string            // brevo
  projectId?: string        // scaleway
  secretKey?: string        // scaleway
  host?: string             // smtp
  port?: number             // smtp
  secure?: boolean          // smtp
  auth?: {                  // smtp
    user: string
    pass: string
  }
  from: string
  fromName?: string
  replyTo?: string
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
}
```

---

## Package.json Changes

```diff
  "dependencies": {
-   "resend": "^x.x.x",
+   "nodemailer": "^6.x.x",
    "vue-email": "^x.x.x"
  },
+ "devDependencies": {
+   "@types/nodemailer": "^6.x.x"
+ }
```

> **🔍 OPEN: What else is in `package.json`?** Are there other Resend-related dependencies or peer dependencies that need updating?

---

## Testing

> **🔍 OPEN: Are there existing tests for the email package?** If so, do they mock Resend specifically, or the `useEmailService` interface? This determines whether tests need rewriting or just a mock swap.

For new/updated tests:
- Unit test driver config resolution (each driver returns correct SMTP settings)
- Unit test send options validation
- Integration test with Ethereal (nodemailer's fake SMTP for testing)
- Verify all convenience senders still work through the new transport

---

## CLI Integration

Add email commands to the crouton CLI:

```bash
npx crouton email test              # Send a test email with current driver config
npx crouton email verify-dns        # Check SPF/DKIM/DMARC records for your domain
```

> **🔍 OPEN: Where does the CLI package live, and what's it built with?** Need to know the pattern for adding commands (citty? commander? unbuild?) and whether there's an existing command structure to follow.

> **🔍 OPEN: Is there config storage (like `.croutonrc`) for default settings?** The email test command needs to know which driver and API key to use — does it read from `.env` or is there a crouton-specific config file?

---

## Tasks

### Step 1 — Driver system (2 hours)
- [ ] Create `server/utils/drivers.ts` with all 6 drivers
- [ ] Refactor `server/utils/email.ts` to use nodemailer + driver resolution
- [ ] Add lazy transport initialization (create on first send)
- [ ] Update types in `types/index.ts`

### Step 2 — Config migration (1 hour)
- [ ] Update `nuxt.config.ts` runtime config shape
- [ ] Default `driver` to `'resend'` for backwards compatibility
- [ ] Support env var overrides (`EMAIL_DRIVER`, `EMAIL_API_KEY`, etc.)
- [ ] Update `.env.example`

### Step 3 — Dependencies (30 min)
- [ ] Remove `resend` package
- [ ] Add `nodemailer` + `@types/nodemailer`
- [ ] Verify no other files import from `resend`

### Step 4 — Test (1.5 hours)
- [ ] Test with Resend SMTP (backwards compatibility)
- [ ] Test with Mailgun EU
- [ ] Test with raw SMTP via Ethereal
- [ ] Test all convenience senders
- [ ] Test `@crouton/auth` integration

### Step 5 — Docs & CLI (1 hour)
- [ ] Update CLAUDE.md with new config shape
- [ ] Update README with driver options and provider setup
- [ ] Add migration note for existing Resend users
- [ ] Add `crouton email test` CLI command
- [ ] Document provider recommendations

**Total: ~half a day**

---

## Migration Guide (for existing users)

```markdown
## Migrating to multi-driver email

1. Update `@crouton/email` to latest

2. Change your runtime config:
   driver: 'resend',              ← add this
   apiKey: process.env.EMAIL_KEY, ← rename from resendApiKey

3. Rename your env var (optional):
   RESEND_API_KEY → EMAIL_API_KEY

4. Everything else stays the same. All senders, templates,
   components, and auth integration work identically.

To switch providers, just change `driver` and `apiKey`.
```

---

## Future Scope (not now)

- Webhook handling for bounces/complaints
- Email queue with retry (using Nitro tasks)
- DevTools panel showing sent emails in development
- `useEmailService().verify()` to test connection on startup
