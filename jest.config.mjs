export default {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      rootDir: 'src',
      testRegex: '.*\\.spec\\.ts$',
      transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
      },
    },
    {
      displayName: 'e2e',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      rootDir: '.',
      testRegex: 'test/.*\\.e2e-spec\\.ts$',
      transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
      },
    },
  ],
  coverageDirectory: 'coverage',
};
