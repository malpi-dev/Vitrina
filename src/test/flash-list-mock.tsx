import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

interface MockFlashListProps<T> {
  data?: readonly T[] | null;
  renderItem: (info: { item: T; index: number }) => ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
  testID?: string;
  /** Exposed so tests can read them from the rendered element's props. */
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

/**
 * FlashList measures its layout natively (its bundled jestSetup is broken in 2.0.x): render every row instead.
 * `onEndReached` and `onRefresh` are passed through as props on the root view so tests can call them.
 */
export function FlashList<T>({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  testID,
  onEndReached,
  onRefresh,
  refreshing,
}: MockFlashListProps<T>) {
  const callbacks = { onEndReached, onRefresh, refreshing } as object;
  return (
    <View testID={testID} {...callbacks}>
      {ListHeaderComponent}
      {data?.length
        ? data.map((item, index) => (
            <View key={keyExtractor ? keyExtractor(item, index) : index}>
              {renderItem({ item, index })}
            </View>
          ))
        : ListEmptyComponent}
      {ListFooterComponent}
    </View>
  );
}
