import type { EditorVariable } from '#crouton-editor/types/editor'

/**
 * Demo data for email template previews
 *
 * This provides realistic sample data to show what emails will look like
 */
export const demoBookingData = {
  // Demo customer
  customer: {
    name: 'Emma van der Berg',
    email: 'emma.vanderberg@gmail.com',
    phone: '+31 6 12345678'
  },

  // Demo booking
  booking: {
    date: 'Friday, January 24, 2025',
    dateShort: '24 Jan 2025',
    slot: '14:00 - 15:00',
    slots: '14:00 - 15:00, 15:00 - 16:00',
    duration: '1 hour',
    reference: 'BK-2025-0124',
    notes: 'Please bring your own equipment'
  },

  // Demo location
  location: {
    name: 'Court A',
    title: 'Tennis Court A - Indoor',
    street: 'Sportlaan 42',
    city: 'Amsterdam',
    postalCode: '1081 KL',
    address: 'Sportlaan 42, 1081 KL Amsterdam',
    phone: '+31 20 123 4567',
    content: 'Indoor court with professional lighting and climate control. Showers and changing rooms available.'
  },

  // Demo team/business
  team: {
    name: 'Amsterdam Tennis Club',
    email: 'info@amsterdamtennis.nl',
    phone: '+31 20 987 6543',
    website: 'www.amsterdamtennis.nl'
  }
}

/**
 * Booking-specific email template variables
 *
 * These variables can be used in email templates and will be
 * replaced with actual booking data when sending emails.
 */
export function useBookingEmailVariables() {
  /**
   * All available booking email variables
   */
  const variables: EditorVariable[] = [
    // Customer variables
    {
      name: 'customer_name',
      label: 'Customer Name',
      description: 'The name of the person who made the booking',
      category: 'customer',
      icon: 'i-lucide-user',
      sample: demoBookingData.customer.name
    },
    {
      name: 'customer_email',
      label: 'Customer Email',
      description: 'The email address of the customer',
      category: 'customer',
      icon: 'i-lucide-mail',
      sample: demoBookingData.customer.email
    },

    // Booking variables
    {
      name: 'booking_date',
      label: 'Booking Date',
      description: 'The date of the booking (formatted)',
      category: 'booking',
      icon: 'i-lucide-calendar',
      sample: demoBookingData.booking.date
    },
    {
      name: 'booking_slot',
      label: 'Time Slot',
      description: 'The time slot(s) of the booking',
      category: 'booking',
      icon: 'i-lucide-clock',
      sample: demoBookingData.booking.slot
    },
    {
      name: 'booking_reference',
      label: 'Booking Reference',
      description: 'Unique booking reference number',
      category: 'booking',
      icon: 'i-lucide-hash',
      sample: demoBookingData.booking.reference
    },

    // Location variables
    {
      name: 'location_name',
      label: 'Location Name',
      description: 'The name of the booking location',
      category: 'location',
      icon: 'i-lucide-map-pin',
      sample: demoBookingData.location.name
    },
    {
      name: 'location_title',
      label: 'Location Title',
      description: 'The title of the booking location',
      category: 'location',
      icon: 'i-lucide-building',
      sample: demoBookingData.location.title
    },
    {
      name: 'location_street',
      label: 'Street Address',
      description: 'The street address of the location',
      category: 'location',
      icon: 'i-lucide-home',
      sample: demoBookingData.location.street
    },
    {
      name: 'location_city',
      label: 'City',
      description: 'The city of the location',
      category: 'location',
      icon: 'i-lucide-building-2',
      sample: demoBookingData.location.city
    },
    {
      name: 'location_address',
      label: 'Full Address',
      description: 'The complete address of the location',
      category: 'location',
      icon: 'i-lucide-map',
      sample: demoBookingData.location.address
    },
    {
      name: 'location_content',
      label: 'Location Content',
      description: 'The content/description of the location',
      category: 'location',
      icon: 'i-lucide-file-text',
      sample: demoBookingData.location.content
    },

    // Team variables
    {
      name: 'team_name',
      label: 'Team Name',
      description: 'The name of the team/business',
      category: 'team',
      icon: 'i-lucide-users',
      sample: demoBookingData.team.name
    },
    {
      name: 'team_email',
      label: 'Team Email',
      description: 'Contact email of the team/business',
      category: 'team',
      icon: 'i-lucide-mail',
      sample: demoBookingData.team.email
    },
    {
      name: 'team_phone',
      label: 'Team Phone',
      description: 'Contact phone of the team/business',
      category: 'team',
      icon: 'i-lucide-phone',
      sample: demoBookingData.team.phone
    }
  ]

  /**
   * Get demo preview values, derived from the sample value on each variable
   * definition above. Adding a new variable to `variables` automatically
   * surfaces it here — no second list to keep in sync.
   */
  function getPreviewValues(): Record<string, string> {
    return variables.reduce<Record<string, string>>((acc, v) => {
      acc[v.name] = v.sample ?? ''
      return acc
    }, {})
  }

  return {
    variables,
    demoData: demoBookingData,
    getPreviewValues,
  }
}
