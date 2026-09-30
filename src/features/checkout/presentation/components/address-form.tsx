import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Path } from 'react-hook-form';
import type { TextInputProps } from 'react-native';
import { View } from 'react-native';
import type { z } from 'zod';

import { Button, TextField } from '@/core/ui';

import { shippingAddressSchema, type ShippingAddress } from '../../domain/shipping-address';

type AddressFormValues = z.input<typeof shippingAddressSchema>;

interface AddressFormProps {
  initialValue?: Partial<ShippingAddress>;
  /** Used when `initialValue` has no name (e.g. the profile name). */
  defaultFullName?: string;
  submitLabel: string;
  submitTestID?: string;
  loading?: boolean;
  onSubmit: (address: ShippingAddress) => void;
}

interface FieldSpec {
  name: Path<AddressFormValues>;
  label: string;
  testID: string;
  props?: TextInputProps;
}

const FIELDS: FieldSpec[] = [
  {
    name: 'fullName',
    label: 'Full name',
    testID: 'address-full-name',
    props: { autoComplete: 'name' },
  },
  {
    name: 'line1',
    label: 'Address line 1',
    testID: 'address-line1',
    props: { autoComplete: 'address-line1' },
  },
  { name: 'line2', label: 'Address line 2 (optional)', testID: 'address-line2' },
  { name: 'city', label: 'City', testID: 'address-city' },
  { name: 'state', label: 'State / region', testID: 'address-state' },
  {
    name: 'postalCode',
    label: 'Postal code',
    testID: 'address-postal-code',
    props: { autoCapitalize: 'characters', autoComplete: 'postal-code' },
  },
  {
    name: 'country',
    label: 'Country (2-letter code)',
    testID: 'address-country',
    props: { autoCapitalize: 'characters', maxLength: 2 },
  },
  {
    name: 'phone',
    label: 'Phone (optional)',
    testID: 'address-phone',
    props: { keyboardType: 'phone-pad', autoComplete: 'tel' },
  },
];

/** Shipping address form shared by Account ("Default address") and the checkout. */
export function AddressForm({
  initialValue,
  defaultFullName = '',
  submitLabel,
  submitTestID = 'save-address-button',
  loading = false,
  onSubmit,
}: AddressFormProps) {
  const { control, handleSubmit } = useForm<AddressFormValues, unknown, ShippingAddress>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      fullName: initialValue?.fullName ?? defaultFullName,
      line1: initialValue?.line1 ?? '',
      line2: initialValue?.line2 ?? '',
      city: initialValue?.city ?? '',
      state: initialValue?.state ?? '',
      postalCode: initialValue?.postalCode ?? '',
      country: initialValue?.country ?? 'US',
      phone: initialValue?.phone ?? '',
    },
  });

  return (
    <View className="gap-4">
      {FIELDS.map(({ name, label, testID, props }) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field, fieldState }) => (
            <TextField
              label={label}
              testID={testID}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              {...props}
            />
          )}
        />
      ))}
      <Button
        title={submitLabel}
        testID={submitTestID}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
    </View>
  );
}
