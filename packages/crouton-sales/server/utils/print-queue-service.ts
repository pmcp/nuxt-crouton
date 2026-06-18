/**
 * @crouton-package crouton-sales
 * @description Thin re-export shim — the print-queue service moved to @fyit/crouton-printing.
 *
 * `encodeTicket`, `PRINT_STATUS`, the driver-registry routing and the print-job
 * types now live in `@fyit/crouton-printing` (epic #325, issue #327). This shim
 * keeps the old import path compiling so sales endpoints don't change. It is
 * slated for removal in the sales-migration issue (#325/5); new code should
 * import from `@fyit/crouton-printing/server/utils/print-queue-service`.
 */

export {
  encodeTicket,
  PRINT_STATUS,
  type PrintStatusCode,
  receiptCurrencySymbol,
  groupItemsByLocation,
  generateKitchenTicketData,
  generateReceiptData,
  generatePrintJobsForOrder,
  type OrderItemForPrint,
  type PrintQueueGeneratorOptions,
  type PrinterConfig,
  type PrintJobData
} from '@fyit/crouton-printing/server/utils/print-queue-service'
