// Runs before each test file's own imports. `src/config/env.ts` reads
// `Constants.expoConfig.extra` at *import* time and throws in dev mode if the
// required Supabase values are missing — real in the app (catches a missing
// .env early), but every test file transitively imports it (via logger,
// supabase client, analytics, ...), so give it harmless test values here.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-anon-key',
        environment: 'test',
      },
    },
  },
}));
