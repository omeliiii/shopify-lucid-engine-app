import 'i18next';

import type common from './it/common.json';
import type dashboard from './it/dashboard.json';
import type packaging_inventory from './it/packaging_inventory.json';
import type product_mapping from './it/product_mapping.json';
import type shipping_rules from './it/shipping_rules.json';
import type reports from './it/reports.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      dashboard: typeof dashboard;
      packaging_inventory: typeof packaging_inventory;
      product_mapping: typeof product_mapping;
      shipping_rules: typeof shipping_rules;
      reports: typeof reports;
    };
  }
}
