import { useState } from 'react';
import { KeyboardAvoidingView, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
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
      setError('Informe um e-mail válido.');
      return;
    }

    if (password.length === 0) {
      setError('Informe sua senha.');
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
          <Text
            style={[
              typography.display,
              { color: colors.primaryDark, marginTop: spacing.lg },
            ]}
          >
            Comando
          </Text>
          <Text
            style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}
          >
            Entre para gerenciar seus pedidos.
          </Text>
        </View>

        <Form
          submit="Entrar"
          onSubmit={() => {
            void handleSubmit();
          }}
          submitButtonProps={{
            loading: isSubmitting,
            disabled: isSubmitting,
            size: 'lg',
            testID: 'sign-in-button',
          }}
        >
          <Field
            label="E-mail"
            testID="email-input"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="voce@exemplo.com"
            editable={!isSubmitting}
            containerStyle={{ marginBottom: spacing.lg }}
          />

          <Field
            label="Senha"
            testID="password-input"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            placeholder="Informe sua senha"
            editable={!isSubmitting}
          />

          {error === null ? null : (
            <View style={{ marginTop: spacing.md }}>
              <ErrorBanner message={error} testID="login-error" />
            </View>
          )}
        </Form>
      </Screen>
    </KeyboardAvoidingView>
  );
}
