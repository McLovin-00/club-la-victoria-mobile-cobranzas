require("@testing-library/jest-native/extend-expect");

jest.mock("expo-router");
jest.mock("nativewind");
jest.mock("@react-native-async-storage/async-storage");

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      hostUri: "192.168.100.8:8081",
    },
  },
}));

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { View } = require("react-native");

  function MockDateTimePicker(props) {
    return React.createElement(View, {
      accessibilityLabel: "date-time-picker",
      ...props,
    });
  }

  return {
    __esModule: true,
    default: MockDateTimePicker,
  };
});

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");

  const createIcon = (name) =>
    function Icon(props) {
      return React.createElement(View, {
        accessibilityLabel: `${name}-icon`,
        ...props,
      });
    };

  return new Proxy(
    {},
    {
      get: (_, prop) => createIcon(String(prop)),
    },
  );
});

const { AccessibilityInfo } = require("react-native");

AccessibilityInfo.isReduceMotionEnabled = jest.fn().mockResolvedValue(false);
AccessibilityInfo.addEventListener = jest.fn(() => ({ remove: jest.fn() }));

beforeEach(() => {
  global.fetch = jest.fn();

  const asyncStorage = require("@react-native-async-storage/async-storage").default;
  asyncStorage.clear();

  const expoRouter = require("expo-router");
  expoRouter.__resetRouter();
});
