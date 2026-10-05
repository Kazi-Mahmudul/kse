import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthDivider, GoogleButton, googleSignInSupported } from '@/components/ui/google-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AuthTextField } from '@/features/auth/auth-text-field';
import { TextLink } from '@/components/ui/text-link';
import { AuthShell } from '@/features/auth/auth-shell';
import { signInWithGoogle } from '@/features/auth/google';
import { AuthError, signUp } from '@/features/auth/service';
import { registerSchema } from '@kse/validation';

export default function RegisterScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const onGooglePress = async () => {
    setGoogleLoading(true);
    try {
      // First Google sign-in creates the account (same handle_new_user
      // trigger, with Google's name as full_name); cancellation is silent.
      await signInWithGoogle();
    } catch (error) {
      if (error instanceof AuthError) {
        setError('root', { message: error.message });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join thousands of Khulna students finding opportunities."
    >
        {formState.errors.root?.message && (
          <Text style={styles.formError}>{formState.errors.root.message}</Text>
        )}

        <AuthTextField
          control={control}
          name="full_name"
          label="Full name"
          autoCapitalize="words"
          textContentType="name"
        />
        <AuthTextField
          control={control}
          name="email"
          label="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <AuthTextField
          control={control}
          name="password"
          label="Password (8+ characters)"
          secureTextEntry
          showToggle
          textContentType="newPassword"
        />

        <PrimaryButton
          label="Create account"
          loading={formState.isSubmitting}
          onPress={onSubmit}
          style={styles.brandButton}
        />

        {googleSignInSupported && (
          <>
            <AuthDivider glass />
            <GoogleButton glass loading={googleLoading} onPress={onGooglePress} />
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TextLink href="/(auth)/login" style={styles.link}>
            Sign in
          </TextLink>
        </View>
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
    // Errors can also be success notices ("check your email") — a soft,
    // readable-on-photo tone covers both without a themed surface.
    color: '#FCA5A5',
  },
  link: {
    color: '#ffffff',
  },
  footerText: {
    color: 'rgba(255,255,255,0.85)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
});
