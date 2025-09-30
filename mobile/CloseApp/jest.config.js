module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-get-random-values)/)'
  ],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
