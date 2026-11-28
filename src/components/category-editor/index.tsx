import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { colors, radii, spacing, typography } from '@/theme';
import { MAX_ITEM_CATEGORIES, normalizeCategory, validateCategory } from '@/utils/categories';

export interface CategoryEditorProps {
  readonly value: readonly string[];
  readonly onChange: (categories: readonly string[]) => void;
  readonly disabled?: boolean;
  readonly testID?: string;
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    flexDirection: 'row',
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipLabel: {
    color: colors.primaryDark,
    ...typography.caption,
  },
  chipRemove: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  counter: {
    color: colors.textMuted,
    marginTop: spacing.sm,
    ...typography.caption,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
    ...typography.caption,
  },
});

export const CategoryEditor = memo(function CategoryEditor({
  value,
  onChange,
  disabled = false,
  testID = 'category-editor',
}: CategoryEditorProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_ITEM_CATEGORIES;

  function handleAdd() {
    const nextError = validateCategory(draft, value);

    if (nextError !== null) {
      setError(nextError);
      return;
    }

    setError(null);
    setDraft('');
    onChange([...value, normalizeCategory(draft)]);
  }

  function handleRemove(index: number) {
    setError(null);
    onChange(value.filter((_, position) => position !== index));
  }

  return (
    <View testID={testID}>
      <Field
        label="Categorias"
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          setError(null);
        }}
        onSubmitEditing={disabled || full ? undefined : handleAdd}
        placeholder="Ex.: Bebidas"
        maxLength={81}
        autoCorrect={false}
        editable={!disabled && !full}
        helper={`Adicione até ${MAX_ITEM_CATEGORIES} categorias. A primeira é a categoria principal.`}
        testID={`${testID}-input`}
      />
      <View style={styles.chips}>
        {value.map((category, index) => (
          <Pressable
            key={`${category.toLocaleLowerCase('en-US')}-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${category}`}
            disabled={disabled}
            onPress={() => handleRemove(index)}
            style={styles.chip}
            testID={`${testID}-chip-${index}`}
          >
            <Text style={styles.chipLabel}>{category}</Text>
            <View style={styles.chipRemove}>
              <Icon name="remove" size="sm" color={colors.primaryDark} />
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.counter} testID={`${testID}-count`}>
        {`${value.length}/${MAX_ITEM_CATEGORIES} categorias`}
      </Text>
      {error === null ? null : (
        <Text style={styles.error} testID={`${testID}-error`}>
          {error}
        </Text>
      )}
      <View style={{ marginTop: spacing.sm }}>
        <Button
          label="Adicionar categoria"
          onPress={handleAdd}
          variant="secondary"
          disabled={disabled || full}
          icon="add"
          testID={`${testID}-add`}
        />
      </View>
    </View>
  );
});
