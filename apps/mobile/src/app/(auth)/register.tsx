import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { TextLink } from '@/components/ui/text-link';
import { AuthError, signUp } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { registerSchema } from '@kse/validation';

export default function RegisterScreen() {
  const colors = useTheme();
  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // The handle_new_user trigger creates the profile + student role.
      const signedInImmediately = await signUp(values);
      if (!signedInImmediately) {
        setError('root', {
          message: 'Account created! Check your email to confirm, then sign in.',
        });
      }
      // If signed in immediately, onAuthStateChange + the root gate redirect.
    } catch (error) {
      if (error instanceof AuthError) {
        setError('root', { message: error.message });
      }
    }
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create your account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join thousands of Khulna students finding opportunities.
          </Text>
        </View>

        {formState.errors.root?.message && (
          <Text style={[styles.formError, { color: colors.danger }]}>
            {formState.errors.root.message}
          </Text>
        )}

        <TextField
          control={control}
          name="full_name"
          label="Full name"
          autoCapitalize="words"
          textContentType="name"
        />
        <TextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextField
          control={control}
          name="password"
          label="Password (8+ characters)"
          secureTextEntry
          textContentType="newPassword"
        />

        <PrimaryButton
          label="Create account"
          loading={formState.isSubmitting}
          onPress={onSubmit}
        />

        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>Already have an account? </Text>
          <TextLink href="/(auth)/login">Sign in</TextLink>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
  },
  formError: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
});
