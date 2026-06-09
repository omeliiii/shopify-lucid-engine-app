import { useState, useEffect } from 'react';
import {
  Popover,
  DatePicker,
  Box,
  BlockStack,
  Text,
  Button
} from '@shopify/polaris';
import { CalendarIcon } from '@shopify/polaris-icons';
import { useTranslation } from 'react-i18next';

interface PolarisDatePickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  /** When set, dates before this day are greyed out and unselectable (e.g. to force future-only ranges). */
  disableBefore?: Date;
}

export function PolarisDatePicker({ label, value, onChange, disableBefore }: PolarisDatePickerProps) {
  const [popoverActive, setPopoverActive] = useState(false);
  const { t, i18n } = useTranslation('common');
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

  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : `${i18n.language || 'it'}-${(i18n.language || 'it').toUpperCase()}`;
  const displayValue = value ? new Date(value).toLocaleDateString(dateLocale) : t('filters.date_placeholder');

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
            disableDatesBefore={disableBefore}
          />
        </Box>
      </Popover>
    </BlockStack>
  );
}
