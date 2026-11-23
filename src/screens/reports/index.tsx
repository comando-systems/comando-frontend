import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { PaymentMethod, SalesSummaryResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import {
  type ReportRange,
  reportRangeQuery,
  todayUtcRange,
  validateReportRange,
} from '@/utils/report-range';
import { permissions } from '@/utils/permissions';

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  DEBIT_CARD: 'Debit card',
  CREDIT_CARD: 'Credit card',
  PIX: 'PIX',
  OTHER: 'Other',
};

function displayInstant(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
}

function SummaryMetric({
  label,
  children,
  testID,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly testID?: string;
}) {
  return (
    <View style={{ flex: 1, marginRight: spacing.sm }} testID={testID}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function Reports() {
  const { user } = useSession();
  const [range, setRange] = useState<ReportRange>(() => todayUtcRange());
  const [appliedRange, setAppliedRange] = useState<ReportRange>(range);
  const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = permissions.canManage(user);

  const loadSummary = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.reports.summary(reportRangeQuery(appliedRange));
      setSummary(result);
    } catch (loadError) {
      setError(toErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedRange, canManage]);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const applyRange = useCallback(() => {
    const nextError = validateReportRange(range);

    if (nextError !== null) {
      setValidationError(nextError);
      return;
    }

    setValidationError(null);
    setAppliedRange({ from: range.from.trim(), to: range.to.trim() });
  }, [range]);

  const useToday = useCallback(() => {
    const today = todayUtcRange();
    setRange(today);
    setAppliedRange({ ...today });
    setValidationError(null);
    setError(null);
  }, []);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  if (loading && summary === null) {
    return (
      <Screen title="Reports" subtitle="Sales summary">
        <LoadingState message="Loading sales summary..." testID="reports-loading" />
      </Screen>
    );
  }

  const displayedError = validationError ?? error;

  return (
    <Screen title="Reports" subtitle="Sales summary">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Card testID="reports-range">
          <Text style={[typography.subtitle, { color: colors.text }]}>Date range (UTC)</Text>
          <View style={{ marginTop: spacing.md }}>
            <Field
              label="From (ISO 8601)"
              value={range.from}
              onChangeText={(from) => {
                setRange((current) => ({ ...current, from }));
                setValidationError(null);
              }}
              placeholder="2026-11-22T00:00:00.000Z"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              testID="reports-from"
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Field
              label="To (ISO 8601, exclusive)"
              value={range.to}
              onChangeText={(to) => {
                setRange((current) => ({ ...current, to }));
                setValidationError(null);
              }}
              placeholder="2026-11-23T00:00:00.000Z"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              testID="reports-to"
            />
          </View>
          {displayedError === null ? null : (
            <View style={{ marginTop: spacing.md }}>
              <ErrorBanner
                message={displayedError}
                onRetry={validationError === null ? () => void loadSummary() : undefined}
                testID="reports-error"
              />
            </View>
          )}
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Button
                label="Today (UTC)"
                onPress={useToday}
                variant="secondary"
                disabled={loading}
                testID="reports-today"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Apply range"
                onPress={applyRange}
                disabled={loading}
                testID="reports-apply"
              />
            </View>
          </View>
        </Card>

        {summary === null ? null : (
          <View style={{ marginTop: spacing.lg }}>
            <Card testID="reports-summary">
              <Text style={[typography.caption, { color: colors.textMuted }]}>Reporting window</Text>
              <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                {`${displayInstant(summary.from)} to ${displayInstant(summary.to)}`}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
                <SummaryMetric label="Revenue" testID="reports-revenue">
                  <MoneyText
                    cents={summary.revenueCents}
                    size="md"
                    testID="reports-revenue-value"
                  />
                </SummaryMetric>
                <SummaryMetric label="Average ticket" testID="reports-average">
                  <MoneyText
                    cents={summary.averageTicketCents}
                    size="md"
                    testID="reports-average-value"
                  />
                </SummaryMetric>
              </View>
              <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
                <SummaryMetric label="Closed orders" testID="reports-closed">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.closedOrders)}
                  </Text>
                </SummaryMetric>
                <SummaryMetric label="Canceled orders" testID="reports-canceled">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.canceledOrders)}
                  </Text>
                </SummaryMetric>
                <SummaryMetric label="Open orders" testID="reports-open">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.openOrders)}
                  </Text>
                </SummaryMetric>
              </View>
            </Card>

            <Card testID="reports-payments" style={{ marginTop: spacing.lg }}>
              <Text style={[typography.subtitle, { color: colors.text }]}>Payments by method</Text>
              {summary.byMethod.length === 0 ? (
                <Text
                  style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}
                  testID="reports-no-payments"
                >
                  No payments in this range.
                </Text>
              ) : (
                summary.byMethod.map((payment) => (
                  <View
                    key={payment.method}
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginTop: spacing.md,
                    }}
                    testID={`reports-method-${payment.method.toLowerCase()}`}
                  >
                    <Text style={[typography.body, { color: colors.text }]}>
                      {paymentMethodLabels[payment.method]}
                    </Text>
                    <MoneyText
                      cents={payment.amountCents}
                      size="md"
                      testID={`reports-method-value-${payment.method.toLowerCase()}`}
                    />
                  </View>
                ))
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
