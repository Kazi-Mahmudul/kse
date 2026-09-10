import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  useRegisteredOpportunityIds,
  useToggleRegistration,
} from '@/features/registrations/queries';
import { useTheme } from '@/hooks/use-theme';

type RegisterButtonVariant = 'default' | 'compact';

interface RegisterButtonProps {
  opportunityId: string;
  /** `default` — full-width primary button on the detail screen.
   *  `compact` — smaller pill that fits inside a list card row. */
  variant?: RegisterButtonVariant;
}

/**
 * Event/workshop registration toggle (step 12). Registered state is the
 * shared ids Set, so the dashboard, list cards, and detail screen stay in
 * sync.
 */
export function RegisterButton({ opportunityId, variant = 'default' }: RegisterButtonProps) {
  const colors = useTheme();
  const idsQuery = useRegisteredOpportunityIds();
  const toggle = useToggleRegistration();

  const registered = idsQuery.data?.has(opportunityId) ?? false;
  const compact = variant === 'compact';
  const longLabel = registered ? 'Registered — cancel' : 'Register for this event';
  const compactLabel = registered ? 'Registered' : 'Register';
  const label = compact ? compactLabel : longLabel;

  return (
    <Pressable
      onPress={() => toggle.mutate({ opportunityId, registered: !registered })}
      disabled={toggle.isPending}
      accessibilityRole="button"
      accessibilityLabel={longLabel}
      style={({ pressed }) => [
        compact ? styles.buttonCompact : styles.button,
        registered
          ? {
              borderColor: colors.success,
              backgroundColor: `${colors.success}1A`,
            }
          : compact
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={registered ? 'checkmark-circle' : 'enter-outline'}
        size={compact ? 12 : 18}
        color={registered ? colors.success : colors.onPrimary}
      />
      <Text
        style={[
          compact ? styles.labelCompact : styles.label,
          { color: registered ? colors.success : colors.onPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 14,
    minHeight: 50,
  },
  buttonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    minHeight: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  labelCompact: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.85,
  },
});
