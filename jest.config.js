module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      'react-native' +
      '|@react-native' +
      '|@react-navigation' +
      '|react-native-safe-area-context' +
      '|react-native-size-matters' +
      '|react-native-screens' +
      '|react-native-bootsplash' +
      ')/)',
  ],
};
