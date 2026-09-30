import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
  testID?: string;
}

const BASE = 'rounded-2xl border border-border bg-surface p-4';

export function Card({ children, onPress, className = '', testID }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        className={`${BASE} active:opacity-80 ${className}`}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} className={`${BASE} ${className}`}>
      {children}
    </View>
  );
}
