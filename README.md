# Vitrina

E-commerce mobile app (React Native + Expo) with Stripe test-mode checkout and live order status.

> Work in progress. The full README lands in the launch phase.

## Testing

```bash
npm run lint && npm run typecheck && npm run format:check && npm test -- --ci
npm run functions:check   # Edge Functions: deno check + lint + fmt + tests (requires Deno)
```

### E2E with Maestro

Maestro does not run in CI (it needs an emulator); run it locally against an Android emulator.
Install Maestro and Java 17, then build a **release** build that shows the Sign in screen (with demo forced the
_Explore demo_ button does not exist) and does not need a backend:

```bash
EXPO_PUBLIC_FORCE_DEMO=false \
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:59999 \
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_placeholder \
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
sh -c 'npx expo prebuild --platform android --clean && npx expo run:android --variant release --no-bundler'
```

If Gradle reuses an old JS bundle, delete `android/app/build/generated/assets` and rebuild. Then:

```bash
npm run e2e   # .maestro/demo-checkout.yaml: Explore demo -> mug -> cart -> simulated payment -> Paid -> Shipped
```

`.maestro/live-checkout.yaml` is a manual/local flow against local Supabase with real Stripe test keys
(`supabase functions serve`, `stripe listen`, a build pointing to `http://10.0.2.2:54321`). It reads the OTP from the
local Mailpit inbox. The PaymentSheet fields are native Stripe UI; if Maestro cannot type into them reliably, do those
steps by hand (card `4242 4242 4242 4242`, any future date, CVC `123`, ZIP `12345`; `4000 0000 0000 0002` for a decline).
