module.exports = {
  preset: 'jest-expo',
  globalSetup: './jest.global-setup.js',
  testMatch: ['**/*.test.[jt]s?(x)'],
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: { '^@/assets/(.*)$': '<rootDir>/assets/$1', '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/supabase/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@shopify/flash-list|@stripe/stripe-react-native|nativewind|react-native-css-interop)',
  ],
};
