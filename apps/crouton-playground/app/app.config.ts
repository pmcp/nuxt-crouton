import { shopProductsConfig } from '../layers/shop/collections/products/app/composables/useShopProducts'

import {shopCategoriesConfig} from '../layers/shop/collections/categories/app/composables/useShopCategories';

import {shopOrdersConfig} from '../layers/shop/collections/orders/app/composables/useShopOrders';

import {contentArticlesConfig} from '../layers/content/collections/articles/app/composables/useContentArticles';

import {contentTestimonialsConfig} from '../layers/content/collections/testimonials/app/composables/useContentTestimonials';

import {peopleContactsConfig} from '../layers/people/collections/contacts/app/composables/usePeopleContacts';

import {projectsTasksConfig} from '../layers/projects/collections/tasks/app/composables/useProjectsTasks';

import {bookingsBookingsConfig} from '../layers/bookings/collections/bookings/app/composables/useBookingsBookings';

import {bookingsLocationsConfig} from '../layers/bookings/collections/locations/app/composables/useBookingsLocations';

import {bookingsSettingsConfig} from '../layers/bookings/collections/settings/app/composables/useBookingsSettings';

import {pagesPagesConfig} from '../layers/pages/collections/pages/app/composables/usePagesPages';

import {translationsUiConfig} from '@fyit/crouton-i18n/app/composables/useTranslationsUi';

export default defineAppConfig({
  croutonCollections: {
    shopProducts: shopProductsConfig,
    shopCategories: shopCategoriesConfig,
    shopOrders: shopOrdersConfig,
    contentArticles: contentArticlesConfig,
    contentTestimonials: contentTestimonialsConfig,
    peopleContacts: peopleContactsConfig,
    projectsTasks: projectsTasksConfig,
    bookingsBookings: bookingsBookingsConfig,
    bookingsLocations: bookingsLocationsConfig,
    bookingsSettings: bookingsSettingsConfig,
    pagesPages: pagesPagesConfig,
    translationsUi: translationsUiConfig
  }
})