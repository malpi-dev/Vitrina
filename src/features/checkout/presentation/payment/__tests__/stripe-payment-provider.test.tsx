import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { CheckoutSession } from '../../../domain/checkout-session';
import { usePaymentPresenter } from '../payment-presenter-context';
import { StripePaymentProvider } from '../stripe-payment-provider';

const mockInit = jest.fn();
const mockPresent = jest.fn();
const mockStripeProvider = jest.fn();

jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: (props: { children: ReactNode }) => {
    mockStripeProvider(props);
    return props.children;
  },
  useStripe: () => ({ initPaymentSheet: mockInit, presentPaymentSheet: mockPresent }),
}));

const session: CheckoutSession = { orderId: 'o1', clientSecret: 'pi_1_secret_x', totalCents: 2599 };

async function getPresenter() {
  const { result } = await renderHook(() => usePaymentPresenter(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <StripePaymentProvider>{children}</StripePaymentProvider>
    ),
  });
  return result.current;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInit.mockResolvedValue({});
  mockPresent.mockResolvedValue({});
});

describe('StripePaymentProvider', () => {
  it('configures StripeProvider with the scheme and merchant id', async () => {
    await getPresenter();
    expect(mockStripeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        urlScheme: 'vitrina',
        merchantIdentifier: 'merchant.com.malpidev.vitrina',
      }),
    );
  });

  it('succeeds when the sheet completes', async () => {
    const presenter = await getPresenter();
    await expect(presenter.present(session)).resolves.toEqual({ status: 'succeeded' });
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentClientSecret: 'pi_1_secret_x',
        returnURL: 'vitrina://stripe-redirect',
        style: 'automatic',
        merchantDisplayName: 'Vitrina',
        appearance: { colors: { primary: expect.stringMatching(/^#/) } },
      }),
    );
  });

  it('maps Canceled to canceled', async () => {
    mockPresent.mockResolvedValue({
      error: { code: 'Canceled', message: 'The payment flow has been canceled' },
    });
    const presenter = await getPresenter();
    await expect(presenter.present(session)).resolves.toEqual({ status: 'canceled' });
  });

  it('maps an init error to failed with the message', async () => {
    mockInit.mockResolvedValue({ error: { code: 'Failed', message: 'Bad config' } });
    const presenter = await getPresenter();
    await expect(presenter.present(session)).resolves.toEqual({
      status: 'failed',
      reason: 'Bad config',
    });
    expect(mockPresent).not.toHaveBeenCalled();
  });

  it('maps a present error to failed, preferring the localized message', async () => {
    mockPresent.mockResolvedValue({
      error: { code: 'Failed', message: 'declined', localizedMessage: 'Your card was declined.' },
    });
    const presenter = await getPresenter();
    await expect(presenter.present(session)).resolves.toEqual({
      status: 'failed',
      reason: 'Your card was declined.',
    });
  });

  it('fails without a clientSecret and never opens the sheet', async () => {
    const presenter = await getPresenter();
    await expect(presenter.present({ orderId: 'o1', totalCents: 1 })).resolves.toEqual({
      status: 'failed',
      reason: 'Missing payment details',
    });
    expect(mockInit).not.toHaveBeenCalled();
  });
});
