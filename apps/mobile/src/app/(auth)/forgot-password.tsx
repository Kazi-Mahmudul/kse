import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { AuthTextField } from '@/features/auth/auth-text-field';
import { TextLink } from '@/components/ui/text-link';
import { AuthShell } from '@/features/auth/auth-shell';
import { AuthError, requestPasswordReset } from '@/features/auth/service';
import { forgotPasswordSchema } from '@kse/validation';

export default function ForgotPasswordScreen() {
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
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
    >
        {formState.errors.root?.message ? (
          <Text style={styles.formError}>{formState.errors.root.message}</Text>
        ) : formState.isSubmitSuccessful ? (
          <Text style={styles.formSuccess}>
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </Text>
        ) : null}

        <AuthTextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <PrimaryButton
          label="Send reset link"
          loading={formState.isSubmitting}
          onPress={onSubmit}
          style={styles.brandButton}
        />

        <TextLink href="/(auth)/login" style={[styles.backLink, styles.link]}>
          Back to sign in
        </TextLink>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  brandButton: {
    backgroundColor: '#4F46E5',
  },
  formError: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#FCA5A5',
  },
  formSuccess: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#86EFAC',
  },
  link: {
    color: '#ffffff',
  },
  backLink: {
    textAlign: 'center',
  },
});
