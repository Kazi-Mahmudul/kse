import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
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
import { AuthError, signIn } from '@/features/auth/service';
import { useTheme } from '@/hooks/use-theme';
import { loginSchema } from '@kse/validation';

export default function LoginScreen() {
  const colors = useTheme();
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to keep growing with KSE.
          </Text>
        </View>

        {formState.errors.root?.message && (
          <Text style={[styles.formError, { color: colors.danger }]}>
            {formState.errors.root.message}
          </Text>
        )}

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
          label="Password"
          secureTextEntry
          textContentType="password"
        />

        <PrimaryButton
          label="Sign in"
          loading={formState.isSubmitting}
          onPress={onSubmit}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Text style={[styles.link, { color: colors.primary }]}>Forgot password?</Text>
        </Link>

        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>New to KSE? </Text>
          <Link href="/(auth)/register" asChild>
            <Text style={[styles.link, { color: colors.primary }]}>Create an account</Text>
          </Link>
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
  link: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
});
