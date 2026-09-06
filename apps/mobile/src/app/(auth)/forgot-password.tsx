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
import { AuthError, requestPasswordReset } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { forgotPasswordSchema } from '@kse/validation';

export default function ForgotPasswordScreen() {
  const colors = useTheme();
  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await requestPasswordReset(values.email);
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
          <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we&apos;ll send you a reset link.
          </Text>
        </View>

        {formState.errors.root?.message ? (
          <Text style={[styles.formError, { color: colors.danger }]}>
            {formState.errors.root.message}
          </Text>
        ) : formState.isSubmitSuccessful ? (
          <Text style={[styles.formError, { color: colors.success }]}>
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </Text>
        ) : null}

        <TextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <PrimaryButton label="Send reset link" loading={formState.isSubmitting} onPress={onSubmit} />

        <TextLink href="/(auth)/login" style={styles.backLink}>
          Back to sign in
        </TextLink>
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
  backLink: {
    textAlign: 'center',
  },
});
