import { salesEventsConfig } from '../layers/sales/collections/events/app/composables/useSalesEvents'
import { salesProductsConfig } from '../layers/sales/collections/products/app/composables/useSalesProducts'
import { salesCategoriesConfig } from '../layers/sales/collections/categories/app/composables/useSalesCategories'
import { salesOrdersConfig } from '../layers/sales/collections/orders/app/composables/useSalesOrders'
import { salesOrderItemsConfig } from '../layers/sales/collections/orderitems/app/composables/useSalesOrderItems'
import { salesLocationsConfig } from '../layers/sales/collections/locations/app/composables/useSalesLocations'
import { salesClientsConfig } from '../layers/sales/collections/clients/app/composables/useSalesClients'
import { salesEventSettingsConfig } from '../layers/sales/collections/eventsettings/app/composables/useSalesEventSettings'
import { salesPrintersConfig } from '../layers/sales/collections/printers/app/composables/useSalesPrinters'
import { salesPrintQueuesConfig } from '../layers/sales/collections/printqueues/app/composables/useSalesPrintQueues'

export default defineAppConfig({
  croutonCollections: {
    salesPrintQueues: salesPrintQueuesConfig,
    salesPrinters: salesPrintersConfig,
    salesEventSettings: salesEventSettingsConfig,
    salesClients: salesClientsConfig,
    salesLocations: salesLocationsConfig,
    salesOrderItems: salesOrderItemsConfig,
    salesOrders: salesOrdersConfig,
    salesCategories: salesCategoriesConfig,
    salesProducts: salesProductsConfig,
    salesEvents: salesEventsConfig,
  }
})
