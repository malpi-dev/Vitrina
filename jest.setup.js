jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated 4 needs native worklets, which do not exist under Jest. Minimal mock: animations become no-ops.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const animation = { duration: () => animation, delay: () => animation };
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withRepeat: (value) => value,
    withTiming: (value) => value,
    FadeIn: animation,
    FadeOut: animation,
    FadeInDown: animation,
    FadeOutDown: animation,
    LinearTransition: animation,
  };
});

// FlashList 2.0.x ships a broken jestSetup: render every row with a plain View instead.
jest.mock('@shopify/flash-list', () => require('./src/test/flash-list-mock'));

// expo-image is a native view: stand in with a plain View that keeps the props tests may inspect.
jest.mock('expo-image', () => require('./src/test/expo-image-mock'));

// Stripe is a native module: stand in with a provider that renders its children and a resolving sheet.
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }) => children,
  useStripe: () => ({
    initPaymentSheet: jest.fn(async () => ({})),
    presentPaymentSheet: jest.fn(async () => ({})),
  }),
}));
