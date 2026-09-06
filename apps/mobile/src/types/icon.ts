import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Icon name from the Ionicons set (single source for the design system). */
export type IconName = ComponentProps<typeof Ionicons>['name'];
