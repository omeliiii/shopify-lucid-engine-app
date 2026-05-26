import { Badge } from '@shopify/polaris';

interface FlagBadgeProps {
  countryCode: string;
}

export function FlagBadge({ countryCode }: FlagBadgeProps) {
  const getFlag = (code: string) => {
    switch (code.toUpperCase()) {
      case 'IT': return '🇮🇹 IT';
      case 'DE': return '🇩🇪 DE';
      case 'FR': return '🇫🇷 FR';
      default: return code;
    }
  };

  return <Badge>{getFlag(countryCode)}</Badge>;
}
