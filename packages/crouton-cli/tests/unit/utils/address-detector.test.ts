import { describe, it, expect } from 'vitest'
import {
  isAddressField,
  isCoordinateField,
  detectAddressFields,
  getCoordinateFieldName,
  buildAddressQuery
} from '../../../lib/utils/address-detector.ts'

describe('isAddressField', () => {
  describe('street variations', () => {
    it('returns true for "street"', () => {
      expect(isAddressField('street')).toBe(true)
    })

    it('returns true for "streetAddress"', () => {
      expect(isAddressField('streetAddress')).toBe(true)
    })

    it('returns true for "street_name"', () => {
      expect(isAddressField('street_name')).toBe(true)
    })
  })

  describe('address variations', () => {
    it('returns true for "address"', () => {
      expect(isAddressField('address')).toBe(true)
    })

    it('returns true for "billingAddress"', () => {
      expect(isAddressField('billingAddress')).toBe(true)
    })

    it('returns true for "shippingAddress"', () => {
      expect(isAddressField('shippingAddress')).toBe(true)
    })
  })

  describe('city variations', () => {
    it('returns true for "city"', () => {
      expect(isAddressField('city')).toBe(true)
    })

    it('returns true for "town"', () => {
      expect(isAddressField('town')).toBe(true)
    })
  })

  describe('postal code variations', () => {
    it('returns true for "zip"', () => {
      expect(isAddressField('zip')).toBe(true)
    })

    it('returns true for "zipcode"', () => {
      expect(isAddressField('zipcode')).toBe(true)
    })

    it('returns true for "zipCode"', () => {
      expect(isAddressField('zipCode')).toBe(true)
    })

    it('returns true for "postal"', () => {
      expect(isAddressField('postal')).toBe(true)
    })

    it('returns true for "postalcode"', () => {
      expect(isAddressField('postalcode')).toBe(true)
    })

    it('returns true for "postalCode"', () => {
      expect(isAddressField('postalCode')).toBe(true)
    })

    it('returns true for "postcode"', () => {
      expect(isAddressField('postcode')).toBe(true)
    })
  })

  describe('country and state variations', () => {
    it('returns true for "country"', () => {
      expect(isAddressField('country')).toBe(true)
    })

    it('returns true for "state"', () => {
      expect(isAddressField('state')).toBe(true)
    })

    it('returns true for "province"', () => {
      expect(isAddressField('province')).toBe(true)
    })

    it('returns true for "region"', () => {
      expect(isAddressField('region')).toBe(true)
    })
  })

  describe('non-address fields', () => {
    it('returns false for "name"', () => {
      expect(isAddressField('name')).toBe(false)
    })

    it('returns false for "email"', () => {
      expect(isAddressField('email')).toBe(false)
    })

    it('returns false for "id"', () => {
      expect(isAddressField('id')).toBe(false)
    })

    it('returns false for "title"', () => {
      expect(isAddressField('title')).toBe(false)
    })

    it('returns false for "description"', () => {
      expect(isAddressField('description')).toBe(false)
    })
  })

  describe('case insensitive matching', () => {
    it('returns true for "STREET"', () => {
      expect(isAddressField('STREET')).toBe(true)
    })

    it('returns true for "City"', () => {
      expect(isAddressField('City')).toBe(true)
    })

    it('returns true for "POSTAL_CODE"', () => {
      expect(isAddressField('POSTAL_CODE')).toBe(true)
    })
  })
})

describe('isCoordinateField', () => {
  describe('latitude variations', () => {
    it('returns true for "latitude"', () => {
      expect(isCoordinateField('latitude')).toBe(true)
    })

    it('returns true for "lat"', () => {
      expect(isCoordinateField('lat')).toBe(true)
    })
  })

  describe('longitude variations', () => {
    it('returns true for "longitude"', () => {
      expect(isCoordinateField('longitude')).toBe(true)
    })

    it('returns true for "lng"', () => {
      expect(isCoordinateField('lng')).toBe(true)
    })

    it('returns true for "lon"', () => {
      expect(isCoordinateField('lon')).toBe(true)
    })
  })

  describe('location variations', () => {
    it('returns true for "location"', () => {
      expect(isCoordinateField('location')).toBe(true)
    })

    it('returns true for "geoLocation"', () => {
      expect(isCoordinateField('geoLocation')).toBe(true)
    })
  })

  describe('coordinates variations', () => {
    it('returns true for "coordinates"', () => {
      expect(isCoordinateField('coordinates')).toBe(true)
    })

    it('returns true for "coords"', () => {
      expect(isCoordinateField('coords')).toBe(true)
    })

    it('returns true for "geocoordinates"', () => {
      expect(isCoordinateField('geocoordinates')).toBe(true)
    })
  })

  describe('combined lat/lng variations', () => {
    it('returns true for "latlng"', () => {
      expect(isCoordinateField('latlng')).toBe(true)
    })

    it('returns true for "lnglat"', () => {
      expect(isCoordinateField('lnglat')).toBe(true)
    })
  })

  describe('non-coordinate fields', () => {
    it('returns false for "name"', () => {
      expect(isCoordinateField('name')).toBe(false)
    })

    it('returns false for "email"', () => {
      expect(isCoordinateField('email')).toBe(false)
    })

    it('returns false for "street"', () => {
      expect(isCoordinateField('street')).toBe(false)
    })

    it('returns false for "city"', () => {
      expect(isCoordinateField('city')).toBe(false)
    })
  })

  describe('case insensitive matching', () => {
    it('returns true for "LATITUDE"', () => {
      expect(isCoordinateField('LATITUDE')).toBe(true)
    })

    it('returns true for "Location"', () => {
      expect(isCoordinateField('Location')).toBe(true)
    })
  })
})

describe('detectAddressFields', () => {
  it('returns correct address and coordinate field arrays', () => {
    const fields = [
      { name: 'id' },
      { name: 'street' },
      { name: 'city' },
      { name: 'latitude' },
      { name: 'longitude' }
    ]

    const result = detectAddressFields(fields)

    expect(result.addressFields).toHaveLength(2)
    expect(result.addressFields[0].name).toBe('street')
    expect(result.addressFields[1].name).toBe('city')
    expect(result.coordinateFields).toHaveLength(2)
    expect(result.coordinateFields[0].name).toBe('latitude')
    expect(result.coordinateFields[1].name).toBe('longitude')
  })

  it('sets hasAddress and hasCoordinates flags correctly', () => {
    const fields = [
      { name: 'street' },
      { name: 'location' }
    ]

    const result = detectAddressFields(fields)

    expect(result.hasAddress).toBe(true)
    expect(result.hasCoordinates).toBe(true)
  })

  it('returns hasAddress false when no address fields', () => {
    const fields = [
      { name: 'id' },
      { name: 'name' },
      { name: 'email' }
    ]

    const result = detectAddressFields(fields)

    expect(result.hasAddress).toBe(false)
    expect(result.addressFields).toHaveLength(0)
  })

  it('returns hasCoordinates false when no coordinate fields', () => {
    const fields = [
      { name: 'street' },
      { name: 'city' }
    ]

    const result = detectAddressFields(fields)

    expect(result.hasCoordinates).toBe(false)
    expect(result.coordinateFields).toHaveLength(0)
  })

  it('handles empty fields array', () => {
    const result = detectAddressFields([])

    expect(result.hasAddress).toBe(false)
    expect(result.hasCoordinates).toBe(false)
    expect(result.addressFields).toHaveLength(0)
    expect(result.coordinateFields).toHaveLength(0)
  })

  it('handles mixed fields correctly', () => {
    const fields = [
      { name: 'id' },
      { name: 'title' },
      { name: 'billingStreet' },
      { name: 'billingCity' },
      { name: 'coords' },
      { name: 'description' },
      { name: 'shippingAddress' }
    ]

    const result = detectAddressFields(fields)

    expect(result.hasAddress).toBe(true)
    expect(result.hasCoordinates).toBe(true)
    expect(result.addressFields).toHaveLength(3)
    expect(result.coordinateFields).toHaveLength(1)
  })
})

describe('getCoordinateFieldName', () => {
  it('returns null for empty array', () => {
    expect(getCoordinateFieldName([])).toBe(null)
  })

  it('returns null for null/undefined', () => {
    expect(getCoordinateFieldName(null as any)).toBe(null)
    expect(getCoordinateFieldName(undefined as any)).toBe(null)
  })

  it('prefers "location" field', () => {
    const fields = [
      { name: 'lat' },
      { name: 'location' },
      { name: 'lng' }
    ]

    expect(getCoordinateFieldName(fields)).toBe('location')
  })

  it('prefers "coordinates" field', () => {
    const fields = [
      { name: 'lat' },
      { name: 'coordinates' },
      { name: 'lng' }
    ]

    expect(getCoordinateFieldName(fields)).toBe('coordinates')
  })

  it('prefers "coords" field', () => {
    const fields = [
      { name: 'lat' },
      { name: 'coords' },
      { name: 'lng' }
    ]

    expect(getCoordinateFieldName(fields)).toBe('coords')
  })

  it('falls back to first coordinate field when no preferred name', () => {
    const fields = [
      { name: 'latitude' },
      { name: 'longitude' }
    ]

    expect(getCoordinateFieldName(fields)).toBe('latitude')
  })

  it('handles single field array', () => {
    const fields = [{ name: 'latlng' }]
    expect(getCoordinateFieldName(fields)).toBe('latlng')
  })
})

describe('buildAddressQuery', () => {
  it('concatenates address parts in correct order', () => {
    const addressValues = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'USA'
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('123 Main St, New York, 10001, NY, USA')
  })

  it('handles missing fields gracefully', () => {
    const addressValues = {
      city: 'Los Angeles',
      country: 'USA'
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('Los Angeles, USA')
  })

  it('handles empty object', () => {
    expect(buildAddressQuery({})).toBe('')
  })

  it('includes extra address fields not in standard order', () => {
    const addressValues = {
      street: '456 Oak Ave',
      city: 'Chicago',
      subRegion: 'Downtown'  // Not in standard order but is address field
    }

    const result = buildAddressQuery(addressValues)

    // subRegion contains 'region' so it should be included
    expect(result).toContain('456 Oak Ave')
    expect(result).toContain('Chicago')
  })

  it('trims whitespace from values', () => {
    const addressValues = {
      street: '  123 Main St  ',
      city: '  Boston  '
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('123 Main St, Boston')
  })

  it('skips empty and whitespace-only values', () => {
    const addressValues = {
      street: '123 Main St',
      city: '',
      state: '   ',
      zip: '12345'
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('123 Main St, 12345')
  })

  it('skips non-string values', () => {
    const addressValues = {
      street: '123 Main St',
      city: 'Denver',
      postalcode: 12345 as any, // number, not string
      country: null as any
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('123 Main St, Denver')
  })

  it('handles full address with all standard fields', () => {
    const addressValues = {
      street: '789 Pine Rd',
      address: 'Suite 100',
      city: 'Seattle',
      town: 'Bellevue',
      zip: '98101',
      zipcode: '98101-1234',
      postal: 'V6B 3N9',
      postalcode: 'K1A 0B1',
      state: 'WA',
      province: 'BC',
      region: 'Pacific Northwest',
      country: 'USA'
    }

    const result = buildAddressQuery(addressValues)

    // Should include all in order
    expect(result).toContain('789 Pine Rd')
    expect(result).toContain('Suite 100')
    expect(result).toContain('Seattle')
    expect(result).toContain('USA')
  })

  it('ignores non-address fields in extra fields processing', () => {
    const addressValues = {
      street: '123 Main St',
      email: 'test@example.com',  // Not an address field
      phone: '555-1234',          // Not an address field
      city: 'Portland'
    }

    const result = buildAddressQuery(addressValues)

    expect(result).toBe('123 Main St, Portland')
    expect(result).not.toContain('test@example.com')
    expect(result).not.toContain('555-1234')
  })
})
