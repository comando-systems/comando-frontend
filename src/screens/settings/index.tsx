import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { SettingsResponse, UpdateSettingsRequest } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { permissions } from '@/utils/permissions';

const MAX_BASIS_POINTS = 10_000;

const switchTrackColor = { false: colors.border, true: colors.primary };

const styles = StyleSheet.create({
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fieldSpacing: {
    marginTop: spacing.lg,
  },
  blockSpacing: {
    marginTop: spacing.md,
  },
  savedText: {
    ...typography.label,
    color: colors.success,
  },
});

interface SettingsFormValues {
  readonly enabled: boolean;
  readonly basisPoints: string;
}

function parseBasisPoints(input: string): number | null {
  const normalized = input.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

function validateSettingsForm(values: SettingsFormValues): string | null {
  const basisPoints = parseBasisPoints(values.basisPoints);

  if (basisPoints === null || basisPoints > MAX_BASIS_POINTS) {
    return 'Informe um número inteiro de 0 a 10000.';
  }

  return null;
}

function formFromSettings(settings: SettingsResponse): SettingsFormValues {
  return {
    enabled: settings.serviceFeeEnabled,
    basisPoints: String(settings.serviceFeeBasisPoints),
  };
}

export default function Settings() {
  const { user } = useSession();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [form, setForm] = useState<SettingsFormValues>({ enabled: false, basisPoints: '0' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canManage = permissions.canManage(user);

  const loadSettings = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.settings.get();
      setSettings(result);
      setForm(formFromSettings(result));
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useFocusEffect(
    useCallback(() => {
      void loadSettings();
    }, [loadSettings]),
  );

  const applySettings = useCallback((result: SettingsResponse) => {
    setSettings(result);
    setForm(formFromSettings(result));
    setSaved(true);
  }, []);

  const saveSettings = useCallback(async () => {
    const nextError = validateSettingsForm(form);

    if (nextError !== null) {
      setValidationError(nextError);
      setSaved(false);
      return;
    }

    const basisPoints = parseBasisPoints(form.basisPoints);

    if (basisPoints === null) {
      return;
    }

    const body: UpdateSettingsRequest = {
      serviceFeeEnabled: form.enabled,
      serviceFeeBasisPoints: basisPoints,
    };

    setSaving(true);
    setValidationError(null);
    setError(null);
    setSaved(false);

    try {
      const result = await api.settings.update(body);
      applySettings(result);
    } catch (saveError) {
      setError(toErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }, [applySettings, form]);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  if (loading && settings === null) {
    return (
      <Screen title="Configurações" subtitle="Configuração da taxa de serviço">
        <LoadingState message="Carregando configurações..." testID="settings-loading" />
      </Screen>
    );
  }

  const displayedError = validationError ?? error;

  return (
    <Screen scroll title="Configurações" subtitle="Configuração da taxa de serviço">
      <Form
        testID="settings-form"
        submit="Salvar configurações"
        onSubmit={() => void saveSettings()}
        submitButtonProps={{ loading: saving, icon: 'check', size: 'lg', testID: 'settings-save' }}
      >
        <View style={styles.feeRow}>
          <View style={styles.feeInfo}>
            <Text style={styles.subtitle}>Taxa de serviço</Text>
            <Text style={styles.caption}>
              Adicione a taxa configurada aos novos pedidos. Pedidos existentes mantêm seu próprio valor.
            </Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={(enabled) => {
              setForm((current) => ({ ...current, enabled }));
              setSaved(false);
            }}
            disabled={saving}
            accessibilityLabel="Taxa de serviço ativada"
            testID="settings-enabled"
            trackColor={switchTrackColor}
            thumbColor={colors.white}
          />
        </View>
        <View style={styles.fieldSpacing}>
          <Field
            label="Taxa de serviço (pontos-base)"
            value={form.basisPoints}
            onChangeText={(basisPoints) => {
              setForm((current) => ({ ...current, basisPoints }));
              setValidationError(null);
              setSaved(false);
            }}
            helper="1000 = 10%. Intervalo permitido: 0 a 10000."
            keyboardType="number-pad"
            autoCorrect={false}
            editable={!saving}
            testID="settings-basis-points"
          />
        </View>
        {displayedError === null ? null : (
          <View style={styles.blockSpacing}>
            <ErrorBanner
              message={displayedError}
              onRetry={validationError === null ? () => void loadSettings() : undefined}
              testID="settings-error"
            />
          </View>
        )}
        {saved ? (
          <View style={styles.blockSpacing}>
            <Text style={styles.savedText} testID="settings-saved">
              Configurações salvas.
            </Text>
          </View>
        ) : null}
      </Form>
    </Screen>
  );
}
