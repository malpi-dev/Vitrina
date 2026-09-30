import { useSessionStore } from '@/core/session';
import { clearCart } from '@/features/cart/presentation/cart.store';

/** Enter/exit demo mode. Both clear the cart (definition F2 CA3); signing out does not (F1 CA3). */
export function useDemoActions() {
  const enterDemoSession = useSessionStore((s) => s.enterDemo);
  const exitDemoSession = useSessionStore((s) => s.exitDemo);

  const enterDemo = () => {
    clearCart();
    enterDemoSession();
  };
  const exitDemo = () => {
    clearCart();
    exitDemoSession();
  };
  return { enterDemo, exitDemo };
}
