import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useMemo, type ReactNode } from 'react';

import { env } from '@/core/config/env';
import { useThemeColors } from '@/core/theme';

import type { PaymentOutcome } from '../../domain/payment-outcome';

import { mapStripeError } from './map-stripe-error';
import { PaymentPresenterContext, type PaymentPresenter } from './payment-presenter-context';

/** Live mode: presents the Stripe PaymentSheet. Only this folder may import @stripe/*. */
function StripePresenterProvider({ children }: { children: ReactNode }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const colors = useThemeColors();

  const presenter = useMemo<PaymentPresenter>(
    () => ({
      async present(session): Promise<PaymentOutcome> {
        if (!session.clientSecret) return { status: 'failed', reason: 'Missing payment details' };

        const init = await initPaymentSheet({
          merchantDisplayName: env.merchantDisplayName,
          paymentIntentClientSecret: session.clientSecret,
          returnURL: 'vitrina://stripe-redirect',
          style: 'automatic', // follows the light/dark theme
          appearance: { colors: { primary: colors.primary } },
        });
        if (init.error) return { status: 'failed', reason: mapStripeError(init.error) };

        const { error } = await presentPaymentSheet();
        if (!error) return { status: 'succeeded' };
        // "Canceled" also happens when the user closes the sheet after a declined card.
        if (error.code === 'Canceled') return { status: 'canceled' };
        return { status: 'failed', reason: mapStripeError(error) };
      },
    }),
    [initPaymentSheet, presentPaymentSheet, colors.primary],
  );

  return (
    <PaymentPresenterContext.Provider value={presenter}>
      {children}
    </PaymentPresenterContext.Provider>
  );
}

export function StripePaymentProvider({ children }: { children: ReactNode }) {
  // Without a publishable key the app is demo-only (isBackendConfigured), so live never gets here.
  return (
    <StripeProvider
      publishableKey={env.stripePublishableKey ?? ''}
      urlScheme="vitrina"
      merchantIdentifier="merchant.com.malpidev.vitrina"
    >
      <StripePresenterProvider>{children}</StripePresenterProvider>
    </StripeProvider>
  );
}
