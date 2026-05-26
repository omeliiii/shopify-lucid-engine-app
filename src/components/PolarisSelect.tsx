import { useState } from 'react';
import { 
  Popover, 
  ActionList, 
  Button, 
  BlockStack,
  Text
} from '@shopify/polaris';

interface Option {
  label: string;
  value: string;
}

interface PolarisSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
}

export function PolarisSelect({ label, options, value, onChange }: PolarisSelectProps) {
  const [popoverActive, setPopoverActive] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <BlockStack gap="100">
      <Text as="p" variant="bodyMd">{label}</Text>
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
              {selectedOption?.label || 'Seleziona...'}
            </Button>
          </div>
        }
      >
        <ActionList
          actionRole="menuitem"
          items={options.map(opt => ({
            content: opt.label,
            onAction: () => {
              onChange(opt.value);
              setPopoverActive(false);
            }
          }))}
        />
      </Popover>
    </BlockStack>
  );
}
