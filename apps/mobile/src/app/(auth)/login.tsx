import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthDivider, GoogleButton, googleSignInSupported } from '@/components/ui/google-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { AuthTextField } from '@/features/auth/auth-text-field';
import { TextLink } from '@/components/ui/text-link';
import { AuthShell } from '@/features/auth/auth-shell';
import { AuthError, signIn } from '@/features/auth/service';
import { signInWithGoogle } from '@/features/auth/google';
import { loginSchema } from '@kse/validation';

export default function LoginScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      // Session lands in the auth store via onAuthStateChange; the root
      // gate redirects to (tabs) — no manual navigation needed.
      await signIn(values);
    } catch (error) {
      if (error instanceof AuthError) {
        setError('root', { message: error.message });
      }
    }
  });

  const onGooglePress = async () => {
    setGoogleLoading(true);
    try {
      // Cancellation resolves quietly; success redirects via the root gate.
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
    <AuthShell title="Welcome back!" subtitle="Sign in to keep growing with KSE.">
      {formState.errors.root?.message && (
        <Text style={styles.formError}>{formState.errors.root.message}</Text>
      )}

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
        label="Password"
        secureTextEntry
        showToggle
        textContentType="password"
      />

      <PrimaryButton
        label="Sign in"
        loading={formState.isSubmitting}
        onPress={onSubmit}
        style={styles.brandButton}
      />

      <View style={styles.center}>
        <TextLink href="/(auth)/forgot-password" style={styles.link}>
          Forgot password?
        </TextLink>
      </View>

      {googleSignInSupported && (
        <>
          <AuthDivider glass />
          <GoogleButton glass loading={googleLoading} onPress={onGooglePress} />
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to KSE? </Text>
        <TextLink href="/(auth)/register" style={styles.link}>
          Create an account
        </TextLink>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  // Fixed brand fill (not the theme's mode-tinted primary) so the CTA looks
  // identical over the photo in light and dark mode.
  brandButton: {
    backgroundColor: '#4F46E5',
  },
  formError: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#FCA5A5',
  },
  link: {
    color: '#ffffff',
  },
  footerText: {
    color: 'rgba(255,255,255,0.85)',
  },
  center: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
});
