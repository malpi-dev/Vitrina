import { Pressable, ScrollView } from 'react-native';

import { AppText } from '@/core/ui';

import type { Category } from '../../domain/category';

interface CategoryChipsProps {
  categories: Category[];
  selectedId: string | undefined;
  onSelect: (categoryId: string | undefined) => void;
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function Chip({ label, active, onPress, testID }: ChipProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-10 justify-center rounded-full border px-4 active:opacity-80 ${active ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
    >
      <AppText variant="label" tone={active ? 'onPrimary' : 'default'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CategoryChips({ categories, selectedId, onSelect }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-1"
      contentContainerClassName="gap-2 pr-2"
    >
      <Chip
        testID="category-chip-all"
        label="All"
        active={selectedId === undefined}
        onPress={() => onSelect(undefined)}
      />
      {categories.map((category) => (
        <Chip
          key={category.id}
          testID={`category-chip-${category.slug}`}
          label={category.name}
          active={selectedId === category.id}
          onPress={() => onSelect(category.id)}
        />
      ))}
    </ScrollView>
  );
}
