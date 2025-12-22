# Print Server API Examples

The print server endpoints are used by external print services (like a Python print daemon)
to poll for pending print jobs and update their status.

These endpoints require database access to your generated `salesPrintqueues` table,
so they must be implemented in your project (not the package).

## Setup

1. Create a print server API key in your environment:

```env
PRINT_SERVER_API_KEY=your-secure-api-key
```

2. Copy these endpoint templates to your project's `server/api/` directory.

3. Adapt the imports to use your generated sales layer schema.

## Endpoint Templates

### GET /api/sales/print-server/events/[eventId]/jobs

Poll for pending print jobs for an event.

```typescript
// server/api/sales/print-server/events/[eventId]/jobs.get.ts
import { eq, and } from 'drizzle-orm'
import { PRINT_STATUS } from '@friendlyinternet/crouton-sales/server/utils/print-queue-service'
// Import from your generated layer
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

export default defineEventHandler(async (event) => {
  // Validate API key
  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey !== process.env.PRINT_SERVER_API_KEY) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid API key' })
  }

  const eventId = getRouterParam(event, 'eventId')
  if (!eventId) {
    throw createError({ statusCode: 400, statusMessage: 'Event ID required' })
  }

  const db = useDB()

  const jobs = await db
    .select({
      id: salesPrintqueues.id,
      orderId: salesPrintqueues.orderId,
      printerId: salesPrintqueues.printerId,
      locationId: salesPrintqueues.locationId,
      printData: salesPrintqueues.printData,
      printMode: salesPrintqueues.printMode,
      retryCount: salesPrintqueues.retryCount,
      createdAt: salesPrintqueues.createdAt,
      printerIp: salesPrinters.ipAddress,
      printerPort: salesPrinters.port,
      printerTitle: salesPrinters.title
    })
    .from(salesPrintqueues)
    .leftJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(
      and(
        eq(salesPrintqueues.eventId, eventId),
        eq(salesPrintqueues.status, PRINT_STATUS.PENDING)
      )
    )

  return { jobs }
})
```

### POST /api/sales/print-server/jobs/[jobId]/complete

Mark a print job as completed.

```typescript
// server/api/sales/print-server/jobs/[jobId]/complete.post.ts
import { eq } from 'drizzle-orm'
import { PRINT_STATUS } from '@friendlyinternet/crouton-sales/server/utils/print-queue-service'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey !== process.env.PRINT_SERVER_API_KEY) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid API key' })
  }

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'Job ID required' })
  }

  const db = useDB()

  const [job] = await db
    .update(salesPrintqueues)
    .set({
      status: PRINT_STATUS.COMPLETED,
      completedAt: new Date()
    })
    .where(eq(salesPrintqueues.id, jobId))
    .returning()

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  return { success: true, job }
})
```

### POST /api/sales/print-server/jobs/[jobId]/fail

Mark a print job as failed.

```typescript
// server/api/sales/print-server/jobs/[jobId]/fail.post.ts
import { eq } from 'drizzle-orm'
import { PRINT_STATUS } from '@friendlyinternet/crouton-sales/server/utils/print-queue-service'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'

export default defineEventHandler(async (event) => {
  const apiKey = getHeader(event, 'x-api-key')
  if (apiKey !== process.env.PRINT_SERVER_API_KEY) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid API key' })
  }

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ statusCode: 400, statusMessage: 'Job ID required' })
  }

  const body = await readBody(event)

  const db = useDB()

  const [job] = await db
    .update(salesPrintqueues)
    .set({
      status: PRINT_STATUS.FAILED,
      errorMessage: body?.errorMessage || 'Unknown error'
    })
    .where(eq(salesPrintqueues.id, jobId))
    .returning()

  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }

  return { success: true, job }
})
```

## Print Service Integration

The print server polls for jobs, sends them to thermal printers, and updates status:

```python
# Example Python print service
import requests
import time

API_BASE = "https://your-app.com/api/sales/print-server"
API_KEY = "your-api-key"
EVENT_ID = "event-123"

headers = {"X-API-Key": API_KEY}

while True:
    # Poll for pending jobs
    response = requests.get(
        f"{API_BASE}/events/{EVENT_ID}/jobs",
        headers=headers
    )
    jobs = response.json()["jobs"]

    for job in jobs:
        try:
            # Send to printer (decode base64 printData)
            print_to_thermal(job["printerIp"], job["printerPort"], job["printData"])

            # Mark complete
            requests.post(
                f"{API_BASE}/jobs/{job['id']}/complete",
                headers=headers
            )
        except Exception as e:
            # Mark failed
            requests.post(
                f"{API_BASE}/jobs/{job['id']}/fail",
                headers=headers,
                json={"errorMessage": str(e)}
            )

    time.sleep(2)  # Poll every 2 seconds
```
