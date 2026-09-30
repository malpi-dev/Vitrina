import { render, screen } from '@testing-library/react-native';

import type { Order } from '../../domain/order';
import { OrderTimeline } from '../components/order-timeline';

const at = (iso: string) => new Date(iso);
const base: Pick<
  Order,
  'status' | 'createdAt' | 'paidAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'
> = {
  status: 'pending_payment',
  createdAt: at('2026-10-06T10:00:00'),
  paidAt: null,
  shippedAt: null,
  deliveredAt: null,
  canceledAt: null,
};

const step = (key: string) => screen.getByTestId(`timeline-step-${key}`);

describe('OrderTimeline', () => {
  it('marks the placed step as current while payment is pending', async () => {
    await render(<OrderTimeline order={base} />);
    expect(step('placed').props.accessibilityState).toMatchObject({
      selected: true,
      checked: false,
    });
    expect(step('paid').props.accessibilityLabel).toBe('Paid, upcoming');
  });

  it('marks earlier steps done and the status step current', async () => {
    await render(
      <OrderTimeline
        order={{
          ...base,
          status: 'shipped',
          paidAt: at('2026-10-06T10:42:00'),
          shippedAt: at('2026-10-07T09:00:00'),
        }}
      />,
    );
    expect(step('placed').props.accessibilityState).toMatchObject({ checked: true });
    expect(step('paid').props.accessibilityState).toMatchObject({ checked: true });
    expect(step('paid').props.accessibilityLabel).toBe('Paid, completed, Oct 6, 10:42 AM');
    expect(step('shipped').props.accessibilityState).toMatchObject({ selected: true });
    expect(step('delivered').props.accessibilityLabel).toBe('Delivered, upcoming');
  });

  it('shows every step done/current for a delivered order', async () => {
    await render(
      <OrderTimeline
        order={{
          ...base,
          status: 'delivered',
          paidAt: at('2026-10-06T10:42:00'),
          shippedAt: at('2026-10-07T09:00:00'),
          deliveredAt: at('2026-10-09T15:30:00'),
        }}
      />,
    );
    expect(step('delivered').props.accessibilityState).toMatchObject({ selected: true });
    expect(step('delivered').props.accessibilityLabel).toBe('Delivered, current, Oct 9, 3:30 PM');
  });

  it('shows a separate canceled row and no later step reached', async () => {
    await render(
      <OrderTimeline
        order={{ ...base, status: 'canceled', canceledAt: at('2026-10-06T10:30:00') }}
      />,
    );
    expect(screen.getByTestId('timeline-canceled')).toHaveTextContent(/Canceled · Oct 6, 10:30 AM/);
    expect(step('paid').props.accessibilityLabel).toBe('Paid, upcoming');
    expect(step('placed').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('has no canceled row otherwise', async () => {
    await render(<OrderTimeline order={base} />);
    expect(screen.queryByTestId('timeline-canceled')).not.toBeOnTheScreen();
  });
});
