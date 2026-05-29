import {
  InlineStack,
  Button
} from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
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

export function CountryDateFilters({
  countryFilter,
  onCountryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset
}: CountryDateFiltersProps) {
  const { t } = useTranslation('common');

  const COUNTRY_OPTIONS = [
    { label: t('countries.all'), value: 'ALL' },
    { label: t('countries.with_code.DE'), value: 'DE' },
    { label: t('countries.with_code.IT'), value: 'IT' },
    { label: t('countries.with_code.FR'), value: 'FR' },
  ];

  return (
    <InlineStack gap="400" blockAlign="end">
      <PolarisSelect
        label={t('filters.country_label')}
        options={COUNTRY_OPTIONS}
        value={countryFilter}
        onChange={onCountryChange}
      />
      <PolarisDatePicker label={t('filters.start_date')} value={startDate} onChange={onStartDateChange} />
      <PolarisDatePicker label={t('filters.end_date')} value={endDate} onChange={onEndDateChange} />

      {(countryFilter !== 'ALL' || startDate !== '' || endDate !== '') && (
        <Button onClick={onReset}>{t('actions.reset_filters')}</Button>
      )}
    </InlineStack>
  );
}
