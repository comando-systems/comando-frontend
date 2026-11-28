import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { ApiError, getErrorMessage } from '@/services/api';
import { colors, radii, spacing, typography } from '@/theme';

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...typography.display,
    color: colors.primaryDark,
    marginTop: spacing.lg,
  },
  intro: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emailField: {
    marginBottom: spacing.lg,
  },
  errorContainer: {
    marginTop: spacing.md,
  },
});

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
    <KeyboardAvoidingView style={styles.keyboardContainer} behavior="padding">
      <Screen scroll topInset bottomInset>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Icon name="food" size="lg" color={colors.white} />
          </View>
          <Text style={styles.brand}>
            Comando
          </Text>
          <Text style={styles.intro}>
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
            containerStyle={styles.emailField}
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
            <View style={styles.errorContainer}>
              <ErrorBanner message={error} testID="login-error" />
            </View>
          )}
        </Form>
      </Screen>
    </KeyboardAvoidingView>
  );
}
