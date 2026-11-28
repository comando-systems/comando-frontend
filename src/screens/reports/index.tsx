import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ErrorBanner } from '@/components/error-banner';
import { Field } from '@/components/field';
import { Form } from '@/components/form';
import { LoadingState } from '@/components/loading-state';
import { MoneyText } from '@/components/money-text';
import { Screen } from '@/components/screen';
import { useSession } from '@/providers/session-provider';
import { api } from '@/services/api';
import { colors, spacing, typography } from '@/theme';
import type { SalesSummaryResponse } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { paymentMethodLabels } from '@/utils/payments';
import {
  type ReportDateRange,
  type ReportRange,
  dateRangeFromInputs,
  maskDateInput,
  reportRangeQuery,
  todayDateRange,
  todayUtcRange,
  validateReportDateRange,
} from '@/utils/report-range';
import { permissions } from '@/utils/permissions';

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
  const [range, setRange] = useState<ReportDateRange>(() => todayDateRange());
  const [appliedRange, setAppliedRange] = useState<ReportRange>(() => todayUtcRange());
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
    const nextError = validateReportDateRange(range.fromDate, range.toDate);

    if (nextError !== null) {
      setValidationError(nextError);
      return;
    }

    const converted = dateRangeFromInputs(range.fromDate, range.toDate);

    if (converted === null) {
      setValidationError('Informe as duas datas no formato AAAA-MM-DD.');
      return;
    }

    setValidationError(null);
    setAppliedRange(converted);
  }, [range]);

  const useToday = useCallback(() => {
    const today = todayUtcRange();
    setRange({ fromDate: today.from.slice(0, 10), toDate: today.to.slice(0, 10) });
    setAppliedRange(today);
    setValidationError(null);
    setError(null);
  }, []);

  if (!canManage) {
    return <Redirect href="/" />;
  }

  if (loading && summary === null) {
    return (
      <Screen title="Relatórios" subtitle="Resumo de vendas">
        <LoadingState message="Carregando resumo de vendas..." testID="reports-loading" />
      </Screen>
    );
  }

  const displayedError = validationError ?? error;

  return (
    <Screen title="Relatórios" subtitle="Resumo de vendas">
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <Form
          testID="reports-range"
          submit="Aplicar"
          onSubmit={applyRange}
          cancel="Hoje (UTC)"
          onCancel={useToday}
          submitButtonProps={{ disabled: loading, testID: 'reports-apply' }}
          cancelButtonProps={{ disabled: loading, testID: 'reports-today' }}
        >
          <Text style={[typography.subtitle, { color: colors.text }]}>Período (UTC)</Text>
          <View style={{ marginTop: spacing.md }}>
            <Field
              label="Data inicial (AAAA-MM-DD)"
              value={range.fromDate}
              onChangeText={(fromDate) => {
                setRange((current) => ({ ...current, fromDate: maskDateInput(fromDate) }));
                setValidationError(null);
              }}
              placeholder="AAAA-MM-DD"
              maxLength={10}
              keyboardType="numeric"
              autoCorrect={false}
              editable={!loading}
              testID="reports-from"
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Field
              label="Data final (exclusiva, AAAA-MM-DD)"
              value={range.toDate}
              onChangeText={(toDate) => {
                setRange((current) => ({ ...current, toDate: maskDateInput(toDate) }));
                setValidationError(null);
              }}
              placeholder="AAAA-MM-DD"
              maxLength={10}
              keyboardType="numeric"
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
        </Form>

        {summary === null ? null : (
          <View style={{ marginTop: spacing.lg }}>
            <Card testID="reports-summary">
              <Text style={[typography.caption, { color: colors.textMuted }]}>Período</Text>
              <Text style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}>
                {`${displayInstant(summary.from)} a ${displayInstant(summary.to)}`}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
                <SummaryMetric label="Faturamento" testID="reports-revenue">
                  <MoneyText
                    cents={summary.revenueCents}
                    size="md"
                    testID="reports-revenue-value"
                  />
                </SummaryMetric>
                <SummaryMetric label="Ticket médio" testID="reports-average">
                  <MoneyText
                    cents={summary.averageTicketCents}
                    size="md"
                    testID="reports-average-value"
                  />
                </SummaryMetric>
              </View>
              <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
                <SummaryMetric label="Pedidos fechados" testID="reports-closed">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.closedOrders)}
                  </Text>
                </SummaryMetric>
                <SummaryMetric label="Pedidos cancelados" testID="reports-canceled">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.canceledOrders)}
                  </Text>
                </SummaryMetric>
                <SummaryMetric label="Pedidos abertos" testID="reports-open">
                  <Text style={[typography.subtitle, { color: colors.text }]}>
                    {String(summary.openOrders)}
                  </Text>
                </SummaryMetric>
              </View>
            </Card>

            <Card testID="reports-payments" style={{ marginTop: spacing.lg }}>
              <Text style={[typography.subtitle, { color: colors.text }]}>Pagamentos por forma de pagamento</Text>
              {summary.byMethod.length === 0 ? (
                <Text
                  style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}
                  testID="reports-no-payments"
                >
                  Nenhum pagamento neste período.
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
