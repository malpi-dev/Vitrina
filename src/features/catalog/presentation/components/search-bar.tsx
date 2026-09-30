import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useDebouncedValue } from '@/core/hooks/use-debounced-value';
import { useThemeColors } from '@/core/theme';

interface SearchBarProps {
  /** The committed query (from the route params). */
  value: string;
  onSearch: (q: string) => void;
}

export function SearchBar({ value, onSearch }: SearchBarProps) {
  const colors = useThemeColors();
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 300);
  const committed = useRef(value);

  // Commit the debounced text once it differs from what the route already has.
  useEffect(() => {
    const next = debounced.trim();
    if (next !== committed.current) {
      committed.current = next;
      onSearch(next);
    }
  }, [debounced, onSearch]);

  // The route changed from outside (e.g. "Clear filters"): follow it.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setText(value);
    }
  }, [value]);

  return (
    <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
      <Ionicons name="search-outline" size={20} color={colors.textMuted} />
      <TextInput
        testID="search-input"
        accessibilityLabel="Search products"
        value={text}
        onChangeText={setText}
        placeholder="Search products"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 py-2 font-sans text-base text-text"
      />
      {text.length > 0 ? (
        <Pressable
          testID="search-clear"
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => setText('')}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
