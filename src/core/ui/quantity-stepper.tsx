import { Pressable, View } from 'react-native';

import { AppText } from './app-text';

interface QuantityStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  testID: string;
}

interface StepButtonProps {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

function StepButton({ label, accessibilityLabel, disabled, onPress, testID }: StepButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`size-11 items-center justify-center rounded-xl border border-border bg-surface active:opacity-80 ${disabled ? 'opacity-40' : ''}`}
    >
      <AppText variant="subtitle">{label}</AppText>
    </Pressable>
  );
}

export function QuantityStepper({ value, min, max, onChange, testID }: QuantityStepperProps) {
  return (
    <View testID={testID} className="flex-row items-center gap-3">
      <StepButton
        testID={`${testID}-decrement`}
        label="−"
        accessibilityLabel="Decrease quantity"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
      />
      <AppText
        testID={`${testID}-value`}
        variant="subtitle"
        className="min-w-8 text-center"
        style={{ fontVariant: ['tabular-nums'] }}
        accessibilityLiveRegion="polite"
      >
        {value}
      </AppText>
      <StepButton
        testID={`${testID}-increment`}
        label="+"
        accessibilityLabel="Increase quantity"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
      />
    </View>
  );
}
