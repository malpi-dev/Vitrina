import { fireEvent, render, screen } from '@testing-library/react-native';

import { DomainError } from '@/core/errors';

import { ErrorState } from '../error-state';

describe('ErrorState', () => {
  it('shows the offline message and a working Retry for network errors', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState error={new DomainError({ code: 'network' })} onRetry={onRetry} />);
    expect(screen.getByText("You're offline")).toBeTruthy();
    await fireEvent.press(screen.getByTestId('retry-button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the payment failure reason', async () => {
    const error = new DomainError({ code: 'paymentFailed', reason: 'Card declined (simulated)' });
    await render(<ErrorState error={error} />);
    expect(screen.getByText('Payment failed')).toBeTruthy();
    expect(screen.getByText('Card declined (simulated)')).toBeTruthy();
    expect(screen.queryByTestId('retry-button')).toBeNull();
  });

  it('falls back to a generic message for raw errors', async () => {
    await render(<ErrorState error={new Error('boom')} onRetry={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });
});
