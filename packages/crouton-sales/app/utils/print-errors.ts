/**
 * @crouton-package crouton-sales
 * @description Map spooler error messages to i18n keys
 *
 * The print spooler stores its failure reasons in English in
 * `salesPrintqueues.errorMessage` (locale-agnostic DB). The set of messages
 * is finite, so the UI translates them by exact match — unknown strings fall
 * back to the raw message. Keep this map in sync with
 * `print-server/teltonika-simple-spooler-fast.sh` and the print-server
 * endpoints.
 */
const PRINT_ERROR_KEYS: Record<string, string> = {
  'Paper out': 'paperOut',
  'Cover open': 'coverOpen',
  'Printer error': 'printerError',
  'Printer offline': 'printerOffline',
  'Printer not responding - paper out, cover open, or offline?': 'notResponding',
  // pre-rename wording, still present on old job rows
  'No status response from printer (offline, wrong IP, or not an ESC/POS device)': 'notResponding',
  'Unexpected status response - not an ESC/POS printer?': 'notEscpos',
  'Printer stopped responding while printing (paper ran out mid-ticket?)': 'stoppedMidTicket',
  'Spooler could not parse job from poll response': 'parseFailed',
  'Empty base64 decode': 'emptyDecode',
  'Failed to send to printer': 'sendFailed',
  'Print job failed': 'generic'
}

/**
 * Return the i18n key for a known spooler error message, or null for
 * unknown/empty messages (caller should then show the raw text).
 */
export function printErrorKey(message: string | null | undefined): string | null {
  if (!message) return null
  const key = PRINT_ERROR_KEYS[message]
  return key ? `sales.printQueue.errors.${key}` : null
}
