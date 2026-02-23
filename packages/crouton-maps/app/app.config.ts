import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'

const mapBlockDefinition: CroutonBlockDefinition = {
  type: 'mapBlock',
  name: 'Map',
  description: 'Embed an interactive map with a location pin',
  icon: 'i-lucide-map-pin',
  category: 'content',
  clientOnly: true,
  defaultAttrs: {
    lat: 0,
    lng: 0,
    zoom: 12,
    style: 'streets',
    height: 400
  },
  components: {
    editorView: 'CroutonMapsBlocksMapBlockView',
    renderer: 'CroutonMapsBlocksMapBlockRender'
  },
  schema: [
    {
      name: 'address',
      type: 'text',
      label: 'Place name',
      description: 'Display label for the location (for reference only)'
    },
    {
      name: 'lat',
      type: 'text',
      label: 'Latitude',
      required: true,
      description: 'Center latitude (e.g. 37.7749)'
    },
    {
      name: 'lng',
      type: 'text',
      label: 'Longitude',
      required: true,
      description: 'Center longitude (e.g. -122.4194)'
    },
    {
      name: 'zoom',
      type: 'select',
      label: 'Zoom',
      options: [
        { label: 'Country (8)', value: '8' },
        { label: 'Region (10)', value: '10' },
        { label: 'City (12)', value: '12' },
        { label: 'Neighbourhood (14)', value: '14' },
        { label: 'Street (16)', value: '16' }
      ],
      defaultValue: '12'
    },
    {
      name: 'style',
      type: 'select',
      label: 'Map style',
      options: [
        { label: 'Streets', value: 'streets' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Satellite', value: 'satellite' },
        { label: 'Outdoors', value: 'outdoors' }
      ],
      defaultValue: 'streets'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' },
        { label: '600px', value: '600' }
      ],
      defaultValue: '400'
    },
    {
      name: 'markerLabel',
      type: 'text',
      label: 'Marker popup',
      description: 'Text shown in the popup when the pin is clicked'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="map-block"]',
    attributes: {
      address: { default: undefined },
      lat: { default: 0, htmlAttr: 'data-lat', parseType: 'float' },
      lng: { default: 0, htmlAttr: 'data-lng', parseType: 'float' },
      zoom: { default: 12, htmlAttr: 'data-zoom', parseType: 'int' },
      style: { default: 'streets' },
      height: { default: 400, htmlAttr: 'data-height', parseType: 'int' },
      markerLabel: { default: undefined }
    }
  }
}

const collectionMapBlockDefinition: CroutonBlockDefinition = {
  type: 'collectionMapBlock',
  name: 'Collection Map',
  description: 'Show collection items as markers on an interactive map',
  icon: 'i-lucide-map',
  category: 'content',
  clientOnly: true,
  defaultAttrs: {
    collection: '',
    height: 400,
    zoom: 12,
    style: 'streets'
  },
  components: {
    editorView: 'CroutonMapsBlocksCollectionMapBlockView',
    renderer: 'CroutonMapsBlocksCollectionMapBlockRender'
  },
  schema: [
    {
      name: 'collection',
      type: 'collection',
      label: 'Collection',
      required: true,
      description: 'Select a collection with location data'
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading above the map'
    },
    {
      name: 'coordinateField',
      type: 'text',
      label: 'Coordinate field',
      description: 'Override the auto-detected coordinate field name'
    },
    {
      name: 'labelField',
      type: 'text',
      label: 'Label field',
      description: 'Field to use for marker popup (uses title field if empty)'
    },
    {
      name: 'style',
      type: 'select',
      label: 'Map style',
      options: [
        { label: 'Streets', value: 'streets' },
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'Satellite', value: 'satellite' },
        { label: 'Outdoors', value: 'outdoors' }
      ],
      defaultValue: 'streets'
    },
    {
      name: 'zoom',
      type: 'select',
      label: 'Fallback zoom',
      options: [
        { label: 'Country (8)', value: '8' },
        { label: 'Region (10)', value: '10' },
        { label: 'City (12)', value: '12' },
        { label: 'Neighbourhood (14)', value: '14' },
        { label: 'Street (16)', value: '16' }
      ],
      defaultValue: '12'
    },
    {
      name: 'height',
      type: 'select',
      label: 'Height',
      options: [
        { label: '300px', value: '300' },
        { label: '400px', value: '400' },
        { label: '500px', value: '500' },
        { label: '600px', value: '600' }
      ],
      defaultValue: '400'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="collection-map-block"]',
    attributes: {
      collection: { default: '' },
      title: { default: undefined },
      height: { default: 400, htmlAttr: 'data-height', parseType: 'int' },
      zoom: { default: 12, htmlAttr: 'data-zoom', parseType: 'int' },
      style: { default: 'streets' },
      coordinateField: { default: undefined },
      labelField: { default: undefined }
    }
  }
}

export default defineAppConfig({
  croutonApps: {
    maps: {
      id: 'maps',
      name: 'Maps',
      icon: 'i-lucide-map',
      apiRoutes: [],
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  },
  croutonBlocks: {
    mapBlock: mapBlockDefinition,
    collectionMapBlock: collectionMapBlockDefinition
  }
})
