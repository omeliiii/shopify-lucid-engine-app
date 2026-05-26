import { useState } from 'react';
import { 
  InlineStack, 
  Button
} from '@shopify/polaris';
import { PolarisDatePicker } from './PolarisDatePicker';
import { PolarisSelect } from './PolarisSelect';

interface CountryDateFiltersProps {
  countryFilter: string;
  onCountryChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onReset: () => void;
}

const COUNTRY_OPTIONS = [
  { label: 'Tutti i paesi', value: 'ALL' },
  { label: 'Germania (DE)', value: 'DE' },
  { label: 'Italia (IT)', value: 'IT' },
  { label: 'Francia (FR)', value: 'FR' },
];

export function CountryDateFilters({
  countryFilter,
  onCountryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset
}: CountryDateFiltersProps) {
  return (
    <InlineStack gap="400" blockAlign="end">
      <PolarisSelect
        label="Filtra per Paese"
        options={COUNTRY_OPTIONS}
        value={countryFilter}
        onChange={onCountryChange}
      />
      <PolarisDatePicker label="Data Inizio" value={startDate} onChange={onStartDateChange} />
      <PolarisDatePicker label="Data Fine" value={endDate} onChange={onEndDateChange} />
      
      {(countryFilter !== 'ALL' || startDate !== '' || endDate !== '') && (
        <Button onClick={onReset}>Resetta Filtri</Button>
      )}
    </InlineStack>
  );
}
