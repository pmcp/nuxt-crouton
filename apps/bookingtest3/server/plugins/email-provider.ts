/**
 * Bridge crouton-email → crouton-bookings
 *
 * Registers the crouton-email service as the booking email provider
 * so that booking confirmation/reminder emails are sent via Resend.
 */
export default defineNitroPlugin(() => {
  registerEmailProvider({
    async send(options) {
      const emailService = useEmailService()
      return emailService.send(options)
    }
  })
})
