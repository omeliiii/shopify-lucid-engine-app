import {
  InlineStack,
  Button
} from '@shopify/polaris';
import { useTranslation } from 'react-i18next';
import { PolarisDatePicker } from './PolarisDatePicker';
import { PolarisSelect } from './PolarisSelect';

interface SelectOption {
  label: string;
  value: string;
}

interface CountryDateFiltersProps {
  countryFilter: string;
  onCountryChange: (val: string) => void;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  onReset: () => void;
  /**
   * Optional extra dropdown rendered after the country select (e.g. report kind).
   * Only shown when both the label/options and the handler are provided. The
   * sentinel "ALL" value is treated as "no filter" for the reset affordance.
   */
  extraSelect?: {
    label: string;
    options: SelectOption[];
    value: string;
    onChange: (val: string) => void;
  };
}

export function CountryDateFilters({
  countryFilter,
  onCountryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
  extraSelect
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
      {extraSelect && (
        <PolarisSelect
          label={extraSelect.label}
          options={extraSelect.options}
          value={extraSelect.value}
          onChange={extraSelect.onChange}
        />
      )}
      <PolarisDatePicker label={t('filters.start_date')} value={startDate} onChange={onStartDateChange} />
      <PolarisDatePicker label={t('filters.end_date')} value={endDate} onChange={onEndDateChange} />

      {(countryFilter !== 'ALL' || startDate !== '' || endDate !== '' || (extraSelect && extraSelect.value !== 'ALL')) && (
        <Button onClick={onReset}>{t('actions.reset_filters')}</Button>
      )}
    </InlineStack>
  );
}
