import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly testID?: string;
}

type PageToken = number | 'ellipsis';

const MAX_LISTED_PAGES = 7;
const EDGE_PAGES = 5;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -spacing.xs,
  },
  page: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
    minWidth: 40,
  },
  activePage: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  ellipsis: {
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
    ...typography.label,
  },
  activeLabel: {
    color: colors.white,
  },
  inactiveLabel: {
    color: colors.text,
  },
});

function pageTokens(page: number, totalPages: number): readonly PageToken[] {
  if (totalPages <= MAX_LISTED_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visible = new Set<number>([1, totalPages]);

  if (page <= 4) {
    for (let value = 1; value <= EDGE_PAGES; value += 1) {
      visible.add(value);
    }
  } else if (page >= totalPages - 3) {
    for (let value = totalPages - (EDGE_PAGES - 1); value <= totalPages; value += 1) {
      visible.add(value);
    }
  } else {
    visible.add(page - 1);
    visible.add(page);
    visible.add(page + 1);
  }

  const values = [...visible].sort((left, right) => left - right);
  const tokens: PageToken[] = [];

  values.forEach((value, index) => {
    if (index > 0 && value - values[index - 1] > 1) {
      tokens.push('ellipsis');
    }
    tokens.push(value);
  });

  return tokens;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  testID = 'pagination',
}: PaginationProps) {
  const count = Math.max(1, Math.floor(totalPages));
  const current = Math.min(Math.max(1, Math.floor(page)), count);
  const tokens = pageTokens(current, count);

  return (
    <View testID={testID} style={styles.container}>
      {tokens.map((token, index) => {
        if (token === 'ellipsis') {
          return (
            <Text
              key={`ellipsis-${index}`}
              accessibilityLabel="Mais páginas"
              testID={`${testID}-ellipsis-${index}`}
              style={styles.ellipsis}
            >
              …
            </Text>
          );
        }

        const isCurrent = token === current;
        const pageStyle = ({ pressed }: { pressed: boolean }) => [
          styles.page,
          isCurrent ? styles.activePage : null,
          pressed && !isCurrent ? styles.pressed : null,
        ];

        return (
          <Pressable
            key={token}
            accessibilityRole="button"
            accessibilityLabel={
              isCurrent ? `Página ${token}, página atual` : `Ir para a página ${token}`
            }
            accessibilityState={{ selected: isCurrent }}
            testID={`${testID}-page-${token}`}
            onPress={() => onPageChange(token)}
            style={pageStyle}
          >
            <Text style={[typography.label, isCurrent ? styles.activeLabel : styles.inactiveLabel]}>
              {String(token)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
