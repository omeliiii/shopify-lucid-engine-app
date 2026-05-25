export const MOCKS: Record<string, any> = {
  '/orders/logs': {
    data: [
      { id: '1', shopifyOrderId: '#1045', orderDate: '2026-05-25', countryCode: 'DE', totalWeightGrams: 450, components: 'Scatola di cartone, Nastro' },
      { id: '2', shopifyOrderId: '#1046', orderDate: '2026-05-24', countryCode: 'IT', totalWeightGrams: 120, components: 'Busta plastica' },
      { id: '3', shopifyOrderId: '#1047', orderDate: '2026-05-24', countryCode: 'FR', totalWeightGrams: 890, components: 'Scatola di cartone, Pluriball' },
      { id: '4', shopifyOrderId: '#1048', orderDate: '2026-05-23', countryCode: 'DE', totalWeightGrams: 50, components: 'Busta carta' },
    ]
  },
  '/orders/kpis': {
    totalWeightKg: 124.5,
    weightByCountry: [
      { country: 'DE', weight: 65.2 },
      { country: 'IT', weight: 40.1 },
      { country: 'FR', weight: 19.2 },
    ],
    trackedOrders: 1045,
    ordersHistory: [
      { day: 'Lun', count: 120 },
      { day: 'Mar', count: 210 },
      { day: 'Mer', count: 180 },
      { day: 'Gio', count: 240 },
      { day: 'Ven', count: 295 },
    ],
    materials: [
      { name: 'Carta / Cartone', percentage: 65, color: 'success' },
      { name: 'Plastica', percentage: 25, color: 'highlight' },
      { name: 'Composito', percentage: 10, color: 'critical' },
    ]
  },
  '/packaging/inventory': [
    { id: '1', customName: 'Bustina Calzini Custom', material: 'PAPER', dimensions: '150x100x20 mm', weight: 7.92 },
    { id: '2', customName: 'Scatola Standard', material: 'COMPOSITE', dimensions: '300x200x100 mm', weight: 150 },
  ],
  '/packaging/suggestions': [
    { id: 'sugg-1', customName: 'Scatola Grande Eco', material: 'PAPER', dimensions: '400x300x200 mm', weight: 250, customLengthMm: 400, customWidthMm: 300, customHeightMm: 200 },
    { id: 'sugg-2', customName: 'Busta Plastica Piccola', material: 'PLASTIC', dimensions: '250x350x5 mm', weight: 15, customLengthMm: 250, customWidthMm: 350, customHeightMm: 5 },
    { id: 'sugg-3', customName: 'Tubo Postale', material: 'COMPOSITE', dimensions: '100x100x500 mm', weight: 80, customLengthMm: 100, customWidthMm: 100, customHeightMm: 500 }
  ],
  '/products/mappings': [
    {
      id: '1',
      title: 'Calzini sportivi in cotone',
      currentMapping: null,
      recommendation: {
        packagingName: 'Bustina Calzini Custom',
        confidence: 0.94,
        reason: 'Mappato per similarità semantica con abbigliamento sportivo.'
      }
    },
    {
      id: '2',
      title: 'Scarpe da Corsa PRO',
      currentMapping: 'Scatola Scarpe Standard',
      recommendation: null
    },
    {
      id: '3',
      title: 'T-Shirt Basic',
      currentMapping: null,
      recommendation: {
        packagingName: 'Busta Plastica Media',
        confidence: 0.78,
        reason: 'Categoria t-shirt spesso associata a buste medie.'
      }
    }
  ],
  '/orders/shipping-rules': [
    { id: '1', name: 'Box Calzini Fino a 5 Articoli', maxItems: 5, isActive: true },
    { id: '2', name: 'Scatola Grande (> 5 Articoli)', maxItems: 20, isActive: false },
  ],
  '/reports': [
    { id: 'rpt-1', countryCode: 'DE', periodType: 'ANNUAL', periodStart: '2025-01-01', periodEnd: '2025-12-31', generatedAt: '2026-01-10T10:00:00Z' },
    { id: 'rpt-2', countryCode: 'IT', periodType: 'QUARTERLY', periodStart: '2026-01-01', periodEnd: '2026-03-31', generatedAt: '2026-04-05T14:30:00Z' },
  ]
};
