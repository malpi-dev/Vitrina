import { View } from 'react-native';

interface ImageProps {
  testID?: string;
  accessibilityLabel?: string;
  source?: unknown;
}

export function Image({ testID, accessibilityLabel }: ImageProps) {
  return <View testID={testID} accessibilityLabel={accessibilityLabel} />;
}
