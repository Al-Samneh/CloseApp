jest.mock('react-native-encrypted-storage');
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ navigate: jest.fn(), reset: jest.fn() }) };
});
jest.mock('react-native-device-info', () => ({ getUniqueId: async () => 'test-device-id' }));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  const EventEmitter = require('events');
  return EventEmitter;
});
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  return {
    ...rn,
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
  };
});

