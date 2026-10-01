import type { ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

/** Edges for screens under a native header: the header already covers the status bar inset. */
export const HEADER_EDGES: Edge[] = ['left', 'right'];

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Ref of the ScrollView when `scroll` is set (e.g. to scroll to a banner). */
  scrollRef?: Ref<ScrollView>;
  /** Horizontal padding. Defaults to true. */
  padded?: boolean;
  edges?: Edge[];
  className?: string;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  scrollRef,
  padded = true,
  edges = ['top', 'left', 'right'],
  className = '',
  testID,
}: ScreenProps) {
  const padding = padded ? 'px-4' : '';
  return (
    <SafeAreaView className="flex-1 bg-background" edges={edges} testID={testID}>
      {scroll ? (
        // Edge-to-edge Android does not resize the window for the keyboard: pad instead.
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName={`${padding} pb-8 ${className}`}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className={`flex-1 ${padding} ${className}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
