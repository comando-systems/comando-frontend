import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { useSession } from '@/providers/session-provider';
import { ApiError, getErrorMessage } from '@/services/api';
import { colors, radii, spacing, typography } from '@/theme';

const inputStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: radii.md,
  borderWidth: 1,
  color: colors.text,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  ...typography.body,
};

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
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: spacing.xl,
          backgroundColor: colors.background,
        }}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={{ ...typography.display, color: colors.primary, marginTop: spacing.lg }}>
            Comando
          </Text>
          <Text style={{ ...typography.body, color: colors.textMuted, marginTop: spacing.xs }}>
            Sign in to manage your orders.
          </Text>
        </View>

        <Text style={{ ...typography.label, color: colors.text, marginBottom: spacing.xs }}>Email</Text>
        <TextInput
          accessibilityLabel="Email"
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          editable={!isSubmitting}
          style={[inputStyle, { marginBottom: spacing.lg }]}
        />

        <Text style={{ ...typography.label, color: colors.text, marginBottom: spacing.xs }}>
          Password
        </Text>
        <TextInput
          accessibilityLabel="Password"
          testID="password-input"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor={colors.textMuted}
          editable={!isSubmitting}
          style={inputStyle}
        />

        {error === null ? null : (
          <Text testID="login-error" style={{ ...typography.caption, color: colors.danger, marginTop: spacing.md }}>
            {error}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          testID="sign-in-button"
          disabled={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
          style={{
            marginTop: spacing.xl,
            borderRadius: radii.md,
            backgroundColor: isSubmitting ? colors.textMuted : colors.primary,
            paddingVertical: spacing.md,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={{ ...typography.label, color: colors.white }}>Sign in</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
