export const MOCKS: Record<string, any> = {
  '/orders/logs': {
    data: [
      {
        id: 'log-1',
        shopifyOrderId: 1045,
        shopifyOrderName: '#1045',
        orderDate: '2026-05-25T10:00:00Z',
        shippingCountryCode: 'DE',
        totalWeightGrams: 450,
        lineItems: [
          {
            shopify_product_id: 991,
            quantity: 2,
            packaging_components: [
              { packaging_name: 'Scatola di cartone', material: 'PAPER', total_weight_grams: 300 },
              { packaging_name: 'Nastro', material: 'PLASTIC', total_weight_grams: 5 }
            ],
            line_total_weight_grams: 305
          }
        ]
      },
      {
        id: 'log-2',
        shopifyOrderId: 1046,
        shopifyOrderName: '#1046',
        orderDate: '2026-05-24T14:30:00Z',
        shippingCountryCode: 'IT',
        totalWeightGrams: 120,
        lineItems: [
          {
            shopify_product_id: 992,
            quantity: 1,
            packaging_components: [
              { packaging_name: 'Busta plastica', material: 'PLASTIC', total_weight_grams: 120 }
            ],
            line_total_weight_grams: 120
          }
        ]
      }
    ],
    meta: { totalItems: 2, page: 1, limit: 10 }
  },

  '/orders/kpis': {
    totalWeightKg: 124.5,
    totalOrders: 1045,
    weightByCountry: [
      { countryCode: 'DE', weightKg: 65.2 },
      { countryCode: 'IT', weightKg: 40.1 },
      { countryCode: 'FR', weightKg: 19.2 }
    ],
    ordersHistory: [
      { date: '2026-05-21', count: 120 },
      { date: '2026-05-22', count: 210 },
      { date: '2026-05-23', count: 180 },
      { date: '2026-05-24', count: 240 },
      { date: '2026-05-25', count: 295 }
    ],
    materialBreakdown: [
      { material: 'PAPER', weightKg: 80.9, percentage: 65 },
      { material: 'PLASTIC', weightKg: 31.1, percentage: 25 },
      { material: 'COMPOSITE', weightKg: 12.5, percentage: 10 }
    ]
  },

  '/packaging/inventory': [
    {
      id: 'inv-1',
      packagingTypeId: 't1',
      name: 'Bustina Calzini Custom',
      lMm: 150, wMm: 100, hMm: 20,
      customGsm: null,
      calculatedUnitWeightGrams: 7.92,
      role: 'PRIMARY',
      isActive: true,
      packagingType: { id: 't1', name: 'Scatola Cartone Singola Onda', agnosticMaterial: 'PAPER', formulaType: 'BOX', defaultGsm: 400 }
    },
    {
      id: 'inv-2',
      packagingTypeId: 't5',
      name: 'Scatola Standard',
      lMm: 300, wMm: 200, hMm: 100,
      customGsm: null,
      calculatedUnitWeightGrams: 150,
      role: 'PRIMARY',
      isActive: true,
      packagingType: { id: 't5', name: 'Tubo Postale Cartone', agnosticMaterial: 'COMPOSITE', formulaType: 'BOX', defaultGsm: 600 }
    }
  ],

  '/packaging/types': [
    { id: 't1', name: 'Scatola Cartone Singola Onda', agnosticMaterial: 'PAPER', defaultGsm: 400, formulaType: 'BOX', defaultOverlapFactor: 1.05 },
    { id: 't2', name: 'Busta Imbottita', agnosticMaterial: 'PAPER', defaultGsm: 150, formulaType: 'ENVELOPE', defaultOverlapFactor: 1.10 },
    { id: 't3', name: 'Busta Polietilene', agnosticMaterial: 'PLASTIC', defaultGsm: 50, formulaType: 'ENVELOPE', defaultOverlapFactor: 1.10 },
    { id: 't4', name: 'Nastro Adesivo', agnosticMaterial: 'PLASTIC', defaultGsm: 30, formulaType: 'STATIC', defaultOverlapFactor: 1.0 },
    { id: 't5', name: 'Tubo Postale Cartone', agnosticMaterial: 'COMPOSITE', defaultGsm: 600, formulaType: 'BOX', defaultOverlapFactor: 1.05 }
  ],

  '/products/mappings': {
    data: [
      {
        shopifyProductId: 991,
        shopifyProductTitle: 'Calzini sportivi in cotone',
        confirmedComponents: [],
        pendingComponents: [
          {
            mappingId: 'map-1',
            packagingId: 'inv-1',
            packagingName: 'Bustina Calzini Custom',
            purpose: 'CONTAINER',
            quantityPerUnit: 1,
            unitWeightGrams: 7.92,
            similarityScore: 0.94,
            reason: 'AI match: Bustina Calzini Custom (PAPER) — 94%'
          }
        ]
      },
      {
        shopifyProductId: 992,
        shopifyProductTitle: 'Scarpe da Corsa PRO',
        confirmedComponents: [
          {
            mappingId: 'map-2',
            packagingId: 'inv-2',
            packagingName: 'Scatola Standard',
            purpose: 'CONTAINER',
            quantityPerUnit: 1,
            unitWeightGrams: 150
          }
        ],
        pendingComponents: []
      },
      {
        shopifyProductId: 993,
        shopifyProductTitle: 'T-Shirt Basic',
        confirmedComponents: [],
        pendingComponents: [
          {
            mappingId: 'map-3',
            packagingId: 'inv-1',
            packagingName: 'Bustina Calzini Custom',
            purpose: 'WRAP',
            quantityPerUnit: 1,
            unitWeightGrams: 7.92,
            similarityScore: 0.78,
            reason: 'AI match: Bustina Calzini Custom (PAPER) — 78%'
          }
        ]
      }
    ],
    meta: { totalItems: 3, page: 1, limit: 50 }
  },

  '/products/merged-view': {
    data: [
      {
        shopifyProductId: 991,
        title: 'Calzini sportivi in cotone',
        imageUrl: 'https://via.placeholder.com/100',
        status: 'pending',
        confirmedComponents: [],
        pendingComponents: [
          {
            mappingId: 'map-1',
            packagingId: 'inv-1',
            packagingName: 'Bustina Calzini Custom',
            packagingMaterial: 'PAPER',
            purpose: 'CONTAINER',
            quantityPerUnit: 1,
            unitWeightGrams: 7.92,
            similarityScore: 0.94,
            reason: 'AI match: Bustina Calzini Custom (PAPER) — 94%'
          }
        ]
      },
      {
        shopifyProductId: 992,
        title: 'Scarpe da Corsa PRO',
        imageUrl: 'https://via.placeholder.com/100',
        status: 'mapped',
        confirmedComponents: [
          {
            mappingId: 'map-2',
            packagingId: 'inv-2',
            packagingName: 'Scatola Standard',
            packagingMaterial: 'COMPOSITE',
            purpose: 'CONTAINER',
            quantityPerUnit: 1,
            unitWeightGrams: 150
          }
        ],
        pendingComponents: []
      },
      {
        shopifyProductId: 993,
        title: 'T-Shirt Basic',
        imageUrl: 'https://via.placeholder.com/100',
        status: 'pending',
        confirmedComponents: [],
        pendingComponents: [
          {
            mappingId: 'map-3',
            packagingId: 'inv-1',
            packagingName: 'Bustina Calzini Custom',
            packagingMaterial: 'PAPER',
            purpose: 'WRAP',
            quantityPerUnit: 1,
            unitWeightGrams: 7.92,
            similarityScore: 0.78,
            reason: 'AI match: Bustina Calzini Custom (PAPER) — 78%'
          }
        ]
      },
      {
        shopifyProductId: 994,
        title: 'Pantaloni Cargo',
        imageUrl: 'https://via.placeholder.com/100',
        status: 'unmapped',
        confirmedComponents: [],
        pendingComponents: []
      }
    ],
    meta: {
      total: 4,
      page: 1,
      limit: 25,
      totalMapped: 1,
      totalPending: 2,
      totalUnmapped: 1
    }
  },

  '/orders/shipping-rules': [
    { id: 'rule-1', name: 'Box Calzini Fino a 5 Articoli', minItems: 1, maxItems: 5, secondaryPackagingId: null, fillerPackagingId: 'inv-1', priority: 3, isActive: true },
    { id: 'rule-2', name: 'Scatola Grande (> 5 Articoli)', minItems: 6, maxItems: 20, secondaryPackagingId: 'inv-1', fillerPackagingId: 'inv-2', priority: 1, isActive: false }
  ],

  '/reports': [
    { id: 'rpt-1', countryCode: 'DE', periodType: 'ANNUAL', periodStart: '2025-01-01', periodEnd: '2025-12-31', generatedAt: '2026-01-10T10:00:00Z' },
    { id: 'rpt-2', countryCode: 'IT', periodType: 'QUARTERLY', periodStart: '2026-01-01', periodEnd: '2026-03-31', generatedAt: '2026-04-05T14:30:00Z' }
  ]
};
