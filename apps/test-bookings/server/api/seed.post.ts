// Seed endpoint for development/testing only
// Run: curl -X POST http://localhost:3000/api/seed
import { nanoid } from 'nanoid'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsSettings } from '~~/layers/bookings/collections/settings/server/database/schema'

export default defineEventHandler(async (_event) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const db = useDB()

  // Use the existing team and user from the database
  const teamId = '4bf2f0dd-7c55-4965-970f-a7882836628b'
  const userId = '9b2ee09a-6350-492f-94b9-23107bdaf2b9'
  const memberId = 'c814cc06-5677-4b15-8f52-a55cf770e053'

  console.log('[seed] Clearing existing data...')

  // Clear existing data
  await db.delete(bookingsBookings)
  await db.delete(bookingsLocations)
  await db.delete(bookingsSettings)

  console.log('[seed] Creating locations...')

  // Create 3 locations with different slot configs
  const locations = [
    {
      id: nanoid(),
      teamId,
      owner: memberId,
      order: 0,
      color: '#3B82F6', // Blue
      title: 'Court A',
      street: '123 Sports Ave',
      city: 'Sportsville',
      zip: '12345',
      slots: JSON.stringify([
        { id: 'slot-1', label: '09:00 - 10:00' },
        { id: 'slot-2', label: '10:00 - 11:00' },
        { id: 'slot-3', label: '11:00 - 12:00' },
      ]),
      inventoryMode: false,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      teamId,
      owner: memberId,
      order: 1,
      color: '#10B981', // Green
      title: 'Court B',
      street: '456 Game Lane',
      city: 'Sportsville',
      zip: '12345',
      slots: JSON.stringify([
        { id: 'slot-1', label: '08:00 - 09:30' },
        { id: 'slot-2', label: '09:30 - 11:00' },
        { id: 'slot-3', label: '11:00 - 12:30' },
        { id: 'slot-4', label: '14:00 - 15:30' },
      ]),
      inventoryMode: false,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      teamId,
      owner: memberId,
      order: 2,
      color: '#F59E0B', // Amber
      title: 'Training Room',
      street: '789 Fitness Blvd',
      city: 'Sportsville',
      zip: '12346',
      slots: JSON.stringify([
        { id: 'slot-morning', label: 'Morning (8-12)' },
        { id: 'slot-afternoon', label: 'Afternoon (12-17)' },
        { id: 'slot-evening', label: 'Evening (17-21)' },
      ]),
      inventoryMode: false,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  await db.insert(bookingsLocations).values(locations)
  console.log(`[seed] Created ${locations.length} locations`)

  console.log('[seed] Creating settings...')

  // Create settings with statuses and groups
  const settings = {
    id: nanoid(),
    teamId,
    owner: memberId,
    order: 0,
    statuses: JSON.stringify([
      { id: 'confirmed', value: 'confirmed', label: 'Confirmed', color: '#22c55e' },
      { id: 'cancelled', value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
    ]),
    groups: JSON.stringify([
      { id: 'adult', value: 'adult', label: 'Adults' },
      { id: 'junior', value: 'junior', label: 'Juniors' },
      { id: 'senior', value: 'senior', label: 'Seniors' },
    ]),
    createdBy: userId,
    updatedBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.insert(bookingsSettings).values(settings)
  console.log('[seed] Created settings')

  console.log('[seed] Creating bookings...')

  // Create 25 bookings across a date range (mix of past and future)
  const statuses = ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', 'cancelled'] // ~87% confirmed, ~13% cancelled
  const groups = ['adult', 'junior', 'senior', null]
  const bookings = []

  // Generate dates: 10 days ago to 20 days in the future
  const today = new Date()
  today.setHours(12, 0, 0, 0)

  for (let i = 0; i < 25; i++) {
    // Random date: -10 to +20 days from today
    const dayOffset = Math.floor(Math.random() * 31) - 10
    const bookingDate = new Date(today)
    bookingDate.setDate(bookingDate.getDate() + dayOffset)

    // Pick a random location
    const location = locations[Math.floor(Math.random() * locations.length)]
    const locationSlots = JSON.parse(location.slots as string)

    // Pick a random slot from that location
    const randomSlot = locationSlots[Math.floor(Math.random() * locationSlots.length)]

    bookings.push({
      id: nanoid(),
      teamId,
      owner: memberId,
      order: i,
      location: location.id,
      date: bookingDate,
      slot: JSON.stringify([randomSlot.id]),
      group: groups[Math.floor(Math.random() * groups.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  await db.insert(bookingsBookings).values(bookings)
  console.log(`[seed] Created ${bookings.length} bookings`)

  // Count by status
  const statusCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by location
  const locationCounts = bookings.reduce((acc, b) => {
    const loc = locations.find(l => l.id === b.location)
    const name = loc?.title || 'Unknown'
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  console.log('[seed] Done!')

  return {
    success: true,
    summary: {
      locations: locations.length,
      bookings: bookings.length,
      settings: 1,
      statusBreakdown: statusCounts,
      locationBreakdown: locationCounts,
    },
  }
})
