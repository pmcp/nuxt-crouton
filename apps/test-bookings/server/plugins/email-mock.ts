/**
 * Mock Email Provider for Testing
 *
 * This plugin registers a mock email provider that logs emails to the console
 * instead of actually sending them. Perfect for development and testing.
 */
import { registerEmailProvider } from '@fyit/crouton-bookings/server/utils/email-service'

export default defineNitroPlugin(() => {
  registerEmailProvider({
    async send({ to, subject, html, from }) {
      console.log('\n' + '='.repeat(60))
      console.log('📧 MOCK EMAIL SENT')
      console.log('='.repeat(60))
      console.log(`From: ${from || 'noreply@test.local'}`)
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      console.log('-'.repeat(60))
      console.log('Body (HTML):')
      console.log(html.substring(0, 500) + (html.length > 500 ? '...' : ''))
      console.log('='.repeat(60) + '\n')

      // Simulate successful send
      return {
        success: true,
        id: `mock-${Date.now()}`
      }
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log('🍞 crouton:email ✓ Mock provider active')
  }
})
