import { useState, useEffect } from 'react';
import { 
  InlineStack, 
  Button, 
  Popover, 
  ActionList, 
  DatePicker, 
  Box, 
  BlockStack,
  Text,
  Icon
} from '@shopify/polaris';
import { CalendarIcon } from '@shopify/polaris-icons';

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

  const CustomDatePicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    const [popoverActive, setPopoverActive] = useState(false);
    const [date, setDate] = useState({ 
      month: value ? new Date(value).getMonth() : new Date().getMonth(), 
      year: value ? new Date(value).getFullYear() : new Date().getFullYear() 
    });

    useEffect(() => {
      if (value) {
        setDate({ month: new Date(value).getMonth(), year: new Date(value).getFullYear() });
      }
    }, [value]);

    const handleDateSelection = (range: { start: Date, end: Date }) => {
      const newDate = range.end;
      const str = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
      onChange(str);
      setPopoverActive(false);
    };

    const displayValue = value ? new Date(value).toLocaleDateString('it-IT') : 'Seleziona data';

    return (
      <BlockStack gap="100">
        <Text as="p" variant="bodyMd">{label}</Text>
        <Popover
          active={popoverActive}
          autofocusTarget="none"
          preferredAlignment="left"
          preferInputActivator={false}
          preferredPosition="below"
          onClose={() => setPopoverActive(false)}
          activator={
            <div style={{ minWidth: '160px' }}>
              <Button 
                onClick={() => setPopoverActive(!popoverActive)} 
                icon={CalendarIcon}
                textAlign="left"
                fullWidth
              >
                {displayValue}
              </Button>
            </div>
          }
        >
          <Box padding="400">
            <DatePicker
              month={date.month}
              year={date.year}
              onChange={handleDateSelection}
              onMonthChange={(month, year) => setDate({ month, year })}
              selected={value ? new Date(value) : undefined}
            />
          </Box>
        </Popover>
      </BlockStack>
    );
  };

  const CustomCountrySelect = () => {
    const [popoverActive, setPopoverActive] = useState(false);
    const selectedOption = COUNTRY_OPTIONS.find(o => o.value === countryFilter);

    return (
      <BlockStack gap="100">
        <Text as="p" variant="bodyMd">Filtra per Paese</Text>
        <Popover
          active={popoverActive}
          autofocusTarget="none"
          preferredAlignment="left"
          fullWidth
          preferInputActivator={false}
          preferredPosition="below"
          onClose={() => setPopoverActive(false)}
          activator={
            <div style={{ minWidth: '180px' }}>
              <Button 
                onClick={() => setPopoverActive(!popoverActive)} 
                disclosure
                textAlign="left"
                fullWidth
              >
                {selectedOption?.label || 'Tutti i paesi'}
              </Button>
            </div>
          }
        >
          <ActionList
            actionRole="menuitem"
            items={COUNTRY_OPTIONS.map(opt => ({
              content: opt.label,
              onAction: () => {
                onCountryChange(opt.value);
                setPopoverActive(false);
              }
            }))}
          />
        </Popover>
      </BlockStack>
    );
  };

  return (
    <InlineStack gap="400" blockAlign="end">
      <CustomCountrySelect />
      <CustomDatePicker label="Data Inizio" value={startDate} onChange={onStartDateChange} />
      <CustomDatePicker label="Data Fine" value={endDate} onChange={onEndDateChange} />
      
      {(countryFilter !== 'ALL' || startDate !== '' || endDate !== '') && (
        <Button onClick={onReset}>Resetta Filtri</Button>
      )}
    </InlineStack>
  );
}
