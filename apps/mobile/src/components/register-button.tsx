import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  useRegisteredOpportunityIds,
  useToggleRegistration,
} from '@/features/registrations/queries';
import { useTheme } from '@/hooks/use-theme';

interface RegisterButtonProps {
  opportunityId: string;
}

/**
 * Event/workshop registration toggle (step 12). Registered state is the
 * shared ids Set, so the dashboard and detail screen stay in sync.
 */
export function RegisterButton({ opportunityId }: RegisterButtonProps) {
  const colors = useTheme();
  const idsQuery = useRegisteredOpportunityIds();
  const toggle = useToggleRegistration();

  const registered = idsQuery.data?.has(opportunityId) ?? false;
  const label = registered ? 'Registered — cancel' : 'Register for this event';

  return (
    <Pressable
      onPress={() => toggle.mutate({ opportunityId, registered: !registered })}
      disabled={toggle.isPending}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        registered
          ? {
              borderColor: colors.success,
              backgroundColor: `${colors.success}1A`,
            }
          : { backgroundColor: colors.primary },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name={registered ? 'checkmark-circle' : 'enter-outline'}
        size={18}
        color={registered ? colors.success : colors.onPrimary}
      />
      <Text
        style={[
          styles.label,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
