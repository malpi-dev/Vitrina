import type { RealtimeChannel } from '@supabase/supabase-js';

import { DomainError } from '@/core/errors';
import { run, type VitrinaSupabaseClient } from '@/core/supabase';

import type { Order } from '../domain/order';
import type { LiveStatus, OrdersRepository, Unsubscribe } from '../domain/orders.repository';

import { toOrder } from './order.mapper';

const SELECT = '*, order_items(*)';

export class SupabaseOrdersRepository implements OrdersRepository {
  constructor(private readonly client: VitrinaSupabaseClient) {}

  async list(): Promise<Order[]> {
    // RLS limits the rows to the current user.
    const rows = await run(
      () => this.client.from('orders').select(SELECT).order('created_at', { ascending: false }),
      'order',
    );
    return rows.map(toOrder);
  }

  async getById(id: string): Promise<Order> {
    const row = await run(
      () => this.client.from('orders').select(SELECT).eq('id', id).maybeSingle(),
      'order',
    );
    if (!row) throw new DomainError({ code: 'notFound', entity: 'order' });
    return toOrder(row);
  }

  subscribe(
    filter: { orderId?: string },
    onChange: (order: Order) => void,
    onStatus?: (status: LiveStatus) => void,
  ): Unsubscribe {
    let closed = false;
    let channel: RealtimeChannel | null = null;

    const start = async (): Promise<void> => {
      const { data } = await this.client.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) {
        onStatus?.('paused');
        return;
      }
      // The socket needs the user's JWT so RLS applies to the change stream.
      await this.client.realtime.setAuth();
      // `unsubscribe` may have run while awaiting: do not create the channel at all.
      if (closed) return;

      const name = filter.orderId ? `vitrina:order:${filter.orderId}` : `vitrina:orders:${uid}`;
      channel = this.client
        .channel(name)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'vitrina',
            table: 'orders',
            filter: filter.orderId ? `id=eq.${filter.orderId}` : `user_id=eq.${uid}`,
          },
          (payload) => {
            const id = (payload.new as { id?: unknown } | undefined)?.id;
            if (typeof id !== 'string') return;
            // Re-read the order so the items come along; failures are fixed by the next event/refresh.
            this.getById(id).then(
              (order) => {
                if (!closed) onChange(order);
              },
              () => undefined,
            );
          },
        )
        .subscribe((status) => {
          if (closed) return;
          onStatus?.(status === 'SUBSCRIBED' ? 'live' : 'paused');
        });
    };

    start().catch(() => {
      if (!closed) onStatus?.('paused');
    });

    return () => {
      closed = true;
      if (channel) void this.client.removeChannel(channel);
    };
  }
}
