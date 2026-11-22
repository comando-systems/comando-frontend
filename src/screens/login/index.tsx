import { useState } from 'react';
import { KeyboardAvoidingView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { ApiError, getErrorMessage } from '@/services/api';
import { colors, radii, spacing, typography } from '@/theme';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length === 0) {
      setError('Enter your password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await signIn({ email: normalizedEmail, password });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(getErrorMessage('INTERNAL_ERROR'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen scroll topInset bottomInset>
        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="food" size="lg" color={colors.white} />
          </View>
          <Text style={[typography.display, { color: colors.primary, marginTop: spacing.lg }]}>
            Comando
          </Text>
          <Text
            style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}
          >
            Sign in to manage your orders.
          </Text>
        </View>

        <Field
          label="Email"
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          editable={!isSubmitting}
          containerStyle={{ marginBottom: spacing.lg }}
        />

        <Field
          label="Password"
          testID="password-input"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          placeholder="Enter your password"
          editable={!isSubmitting}
        />

        {error === null ? null : (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner message={error} testID="login-error" />
          </View>
        )}

        <View style={{ marginTop: spacing.xl }}>
          <Button
            label="Sign in"
            onPress={() => {
              void handleSubmit();
            }}
            loading={isSubmitting}
            fullWidth
            size="lg"
            testID="sign-in-button"
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
