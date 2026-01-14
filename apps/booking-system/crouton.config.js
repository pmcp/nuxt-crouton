export default {
  dialect: 'sqlite',
  collections: [
    {
        "name": "booking",
        "fieldsFile": "./schemas/booking.json"
    },
    {
        "name": "location",
        "fieldsFile": "./schemas/location.json"
    },
    {
        "name": "settings",
        "fieldsFile": "./schemas/settings.json"
    },
    {
        "name": "emailtemplate",
        "fieldsFile": "./schemas/emailtemplate.json"
    },
    {
        "name": "emaillog",
        "fieldsFile": "./schemas/emaillog.json"
    }
  ],
  targets: [
    {
      layer: 'bookings',
      collections: ["booking","location","settings","emailtemplate","emaillog"]
    }
  ]
}
