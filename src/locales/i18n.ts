import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── IT ─────────────────────────────────────────────────────────────────────────
import itCommon from './it/common.json';
import itDashboard from './it/dashboard.json';
import itPackagingInventory from './it/packaging_inventory.json';
import itProductMapping from './it/product_mapping.json';
import itShippingRules from './it/shipping_rules.json';
import itReports from './it/reports.json';

// ── EN ─────────────────────────────────────────────────────────────────────────
import enCommon from './en/common.json';
import enDashboard from './en/dashboard.json';
import enPackagingInventory from './en/packaging_inventory.json';
import enProductMapping from './en/product_mapping.json';
import enShippingRules from './en/shipping_rules.json';
import enReports from './en/reports.json';

// ── DE ─────────────────────────────────────────────────────────────────────────
import deCommon from './de/common.json';
import deDashboard from './de/dashboard.json';
import dePackagingInventory from './de/packaging_inventory.json';
import deProductMapping from './de/product_mapping.json';
import deShippingRules from './de/shipping_rules.json';
import deReports from './de/reports.json';

// ── FR ─────────────────────────────────────────────────────────────────────────
import frCommon from './fr/common.json';
import frDashboard from './fr/dashboard.json';
import frPackagingInventory from './fr/packaging_inventory.json';
import frProductMapping from './fr/product_mapping.json';
import frShippingRules from './fr/shipping_rules.json';
import frReports from './fr/reports.json';

export const SUPPORTED_LOCALES = ['it', 'en', 'de', 'fr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const NAMESPACES = [
  'common',
  'dashboard',
  'packaging_inventory',
  'product_mapping',
  'shipping_rules',
  'reports',
] as const;

const resources = {
  it: {
    common: itCommon,
    dashboard: itDashboard,
    packaging_inventory: itPackagingInventory,
    product_mapping: itProductMapping,
    shipping_rules: itShippingRules,
    reports: itReports,
  },
  en: {
    common: enCommon,
    dashboard: enDashboard,
    packaging_inventory: enPackagingInventory,
    product_mapping: enProductMapping,
    shipping_rules: enShippingRules,
    reports: enReports,
  },
  de: {
    common: deCommon,
    dashboard: deDashboard,
    packaging_inventory: dePackagingInventory,
    product_mapping: deProductMapping,
    shipping_rules: deShippingRules,
    reports: deReports,
  },
  fr: {
    common: frCommon,
    dashboard: frDashboard,
    packaging_inventory: frPackagingInventory,
    product_mapping: frProductMapping,
    shipping_rules: frShippingRules,
    reports: frReports,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'it',
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    defaultNS: 'common',
    ns: NAMESPACES as unknown as string[],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
