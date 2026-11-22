import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { colors } from '@/theme';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IoniconsIconName = ComponentProps<typeof Ionicons>['name'];

type IconDescriptor =
  | { readonly set: 'material'; readonly name: MaterialIconName }
  | { readonly set: 'ionicons'; readonly name: IoniconsIconName };

export const iconNames = [
  'table',
  'counter',
  'payment',
  'add',
  'remove',
  'settings',
  'users',
  'logout',
  'back',
  'check',
  'list',
  'receipt',
  'history',
  'close',
  'edit',
  'search',
  'card',
  'wallet',
  'info',
  'warning',
  'refresh',
  'trash',
  'food',
  'reports',
  'save',
  'lock',
  'send',
] as const;

export type IconName = (typeof iconNames)[number];
export type IconSize = 'sm' | 'md' | 'lg';

export interface IconProps {
  readonly name: IconName;
  readonly size?: IconSize;
  readonly color?: string;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
}

const descriptors: Record<IconName, IconDescriptor> = {
  table: { set: 'material', name: 'table' },
  counter: { set: 'material', name: 'storefront' },
  payment: { set: 'material', name: 'cash' },
  add: { set: 'ionicons', name: 'add' },
  remove: { set: 'ionicons', name: 'remove' },
  settings: { set: 'ionicons', name: 'settings-outline' },
  users: { set: 'ionicons', name: 'people-outline' },
  logout: { set: 'ionicons', name: 'log-out-outline' },
  back: { set: 'ionicons', name: 'arrow-back-outline' },
  check: { set: 'ionicons', name: 'checkmark' },
  list: { set: 'ionicons', name: 'list-outline' },
  receipt: { set: 'ionicons', name: 'receipt-outline' },
  history: { set: 'ionicons', name: 'time-outline' },
  close: { set: 'ionicons', name: 'close-outline' },
  edit: { set: 'ionicons', name: 'pencil-outline' },
  search: { set: 'ionicons', name: 'search-outline' },
  card: { set: 'ionicons', name: 'card-outline' },
  wallet: { set: 'ionicons', name: 'wallet-outline' },
  info: { set: 'ionicons', name: 'information-circle-outline' },
  warning: { set: 'ionicons', name: 'warning-outline' },
  refresh: { set: 'ionicons', name: 'refresh-outline' },
  trash: { set: 'ionicons', name: 'trash-outline' },
  food: { set: 'material', name: 'food' },
  reports: { set: 'material', name: 'chart-line' },
  save: { set: 'material', name: 'content-save-outline' },
  lock: { set: 'ionicons', name: 'lock-closed-outline' },
  send: { set: 'ionicons', name: 'send-outline' },
};

const sizeValues: Record<IconSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

interface IconViewProps {
  readonly descriptor: IconDescriptor;
  readonly size: number;
  readonly color: string;
  readonly testID?: string;
  readonly accessibilityLabel?: string;
}

function IconView({ descriptor, size, color, testID, accessibilityLabel }: IconViewProps) {
  if (descriptor.set === 'material') {
    return (
      <MaterialCommunityIcons
        name={descriptor.name}
        size={size}
        color={color}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <Ionicons
      name={descriptor.name}
      size={size}
      color={color}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function Icon({
  name,
  size = 'md',
  color = colors.text,
  testID = 'icon',
  accessibilityLabel,
}: IconProps) {
  return (
    <IconView
      descriptor={descriptors[name]}
      size={sizeValues[size]}
      color={color}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? name}
    />
  );
}
