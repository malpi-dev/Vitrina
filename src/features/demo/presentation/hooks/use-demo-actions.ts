import { useSessionStore } from '@/core/session';

/** Enter/exit demo mode. Phase 07 also clears the cart here (definition 2 / F2 CA3). */
export function useDemoActions() {
  const enterDemo = useSessionStore((s) => s.enterDemo);
  const exitDemo = useSessionStore((s) => s.exitDemo);
  return { enterDemo, exitDemo };
}
