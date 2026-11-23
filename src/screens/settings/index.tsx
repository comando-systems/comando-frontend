import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { SettingsResponse, UpdateSettingsRequest } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { permissions } from '@/utils/permissions';

const MAX_BASIS_POINTS = 10_000;

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
    return 'Enter a whole number from 0 to 10000.';
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
      <Screen title="Settings" subtitle="Service fee configuration">
        <LoadingState message="Loading settings..." testID="settings-loading" />
      </Screen>
    );
  }

  const displayedError = validationError ?? error;

  return (
    <Screen scroll title="Settings" subtitle="Service fee configuration">
      <Card testID="settings-form">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={[typography.subtitle, { color: colors.text }]}>Service fee</Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
              Add the configured fee to new orders. Existing orders keep their own snapshot.
            </Text>
          </View>
          <Switch
            value={form.enabled}
            onValueChange={(enabled) => {
              setForm((current) => ({ ...current, enabled }));
              setSaved(false);
            }}
            disabled={saving}
            accessibilityLabel="Service fee enabled"
            testID="settings-enabled"
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <Field
            label="Service fee rate (basis points)"
            value={form.basisPoints}
            onChangeText={(basisPoints) => {
              setForm((current) => ({ ...current, basisPoints }));
              setValidationError(null);
              setSaved(false);
            }}
            helper="1000 = 10%. Allowed range: 0 to 10000."
            keyboardType="number-pad"
            autoCorrect={false}
            editable={!saving}
            testID="settings-basis-points"
          />
        </View>
        {displayedError === null ? null : (
          <View style={{ marginTop: spacing.md }}>
            <ErrorBanner
              message={displayedError}
              onRetry={validationError === null ? () => void loadSettings() : undefined}
              testID="settings-error"
            />
          </View>
        )}
        {saved ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.label, { color: colors.success }]} testID="settings-saved">
              Settings saved.
            </Text>
          </View>
        ) : null}
        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Save settings"
            onPress={() => void saveSettings()}
            loading={saving}
            icon="check"
            fullWidth
            size="lg"
            testID="settings-save"
          />
        </View>
      </Card>
    </Screen>
  );
}
