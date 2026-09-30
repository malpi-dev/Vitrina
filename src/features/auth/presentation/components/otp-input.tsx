import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/core/ui';

export const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
  hasError?: boolean;
}

/** One hidden TextInput (keyboard, paste, SMS autofill) rendered as six boxes. */
export function OtpInput({ value, onChange, editable = true, hasError = false }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} className="relative">
      <View className="flex-row justify-between gap-2" pointerEvents="none">
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const border = hasError
            ? 'border-danger'
            : i === activeIndex && editable
              ? 'border-primary'
              : 'border-border';
          return (
            <View
              key={i}
              className={`h-14 flex-1 items-center justify-center rounded-xl border bg-surface ${border}`}
            >
              <AppText variant="title">{value[i] ?? ''}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        testID="otp-input"
        accessibilityLabel="Verification code"
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        editable={editable}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        caretHidden
        className="absolute inset-0 opacity-0"
      />
    </Pressable>
  );
}
