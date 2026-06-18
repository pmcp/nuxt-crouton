/**
 * @crouton-package crouton-sales
 * @description Thin re-export shim — the receipt formatter moved to @fyit/crouton-printing.
 *
 * The ESC/POS engine now lives in `@fyit/crouton-printing` (epic #325, issue
 * #327). This shim keeps the old import path compiling so sales endpoints don't
 * change. It is slated for removal in the sales-migration issue (#325/5); new
 * code should import from `@fyit/crouton-printing/server/utils/receipt-formatter`.
 */

export {
  formatReceipt,
  renderTicketHtml,
  formatTestReceipt,
  DEFAULT_RECEIPT_SETTINGS,
  type ReceiptData,
  type ReceiptItem,
  type ReceiptSettings,
  type ReceiptLocale,
  type FormattedReceipt
} from '@fyit/crouton-printing/server/utils/receipt-formatter'
