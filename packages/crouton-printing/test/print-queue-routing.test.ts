import { describe, it, expect } from 'vitest'
import {
  generatePrintJobsForOrder,
  type OrderItemForPrint,
  type PrinterConfig,
  type PrintQueueGeneratorOptions
} from '../server/utils/print-queue-service'

const options: PrintQueueGeneratorOptions = {
  orderId: 'o1',
  eventId: 'e1',
  teamId: 't1',
  orderNumber: '42',
  teamName: 'Team',
  eventName: 'Event',
  createdBy: 'u1'
}

const items: OrderItemForPrint[] = [
  { productId: 'p1', productTitle: 'Fries', quantity: 2, unitPrice: 3.5, locationId: 'loc1', locationTitle: 'Bar' }
]

const kitchen: PrinterConfig = { id: 'k1', eventId: 'e1', title: 'Bar', ipAddress: '1.2.3.4', type: 'kitchen', locationId: 'loc1', driver: 'network-escpos' }
const receipt: PrinterConfig = { id: 'r1', eventId: 'e1', title: 'Receipt', ipAddress: '1.2.3.5', type: 'receipt', driver: 'network-escpos' }

describe('generatePrintJobsForOrder', () => {
  it('routes a kitchen ticket to the location printer', () => {
    const jobs = generatePrintJobsForOrder(options, items, [kitchen])
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ printerId: 'k1', printMode: 'kitchen' })
    expect(jobs[0]!.printData.length).toBeGreaterThan(0)
  })

  it('does not queue a customer receipt unless withReceipt is set', () => {
    const without = generatePrintJobsForOrder(options, items, [kitchen, receipt])
    expect(without.map(j => j.printMode)).toEqual(['kitchen'])

    const withReceipt = generatePrintJobsForOrder({ ...options, withReceipt: true }, items, [kitchen, receipt])
    expect(withReceipt.map(j => j.printMode).sort()).toEqual(['kitchen', 'receipt'])
  })

  it('skips printers on an unregistered driver (forward-compatible)', () => {
    const unknown: PrinterConfig = { ...kitchen, id: 'k2', driver: 'serial-not-registered' }
    expect(generatePrintJobsForOrder(options, items, [unknown])).toHaveLength(0)
  })

  it('returns nothing when there are no items or no printers', () => {
    expect(generatePrintJobsForOrder(options, [], [kitchen])).toHaveLength(0)
    expect(generatePrintJobsForOrder(options, items, [])).toHaveLength(0)
  })
})
