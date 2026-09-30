import { Text, type TextProps } from 'react-native';

export type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';
export type TextTone = 'default' | 'muted' | 'primary' | 'danger' | 'success';

const VARIANT_CLASS: Record<TextVariant, string> = {
  display: 'font-serif text-3xl',
  title: 'font-bold text-2xl',
  subtitle: 'font-semibold text-lg',
  body: 'font-sans text-base',
  caption: 'font-sans text-sm',
  label: 'font-semibold text-sm',
};

const TONE_CLASS: Record<TextTone, string> = {
  default: 'text-text',
  muted: 'text-text-muted',
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
};

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  className = '',
  ...rest
}: AppTextProps) {
  return (
    <Text className={`${VARIANT_CLASS[variant]} ${TONE_CLASS[tone]} ${className}`} {...rest} />
  );
}
