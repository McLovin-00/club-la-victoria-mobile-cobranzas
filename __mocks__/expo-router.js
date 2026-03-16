const React = require("react");

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

let localSearchParams = {};

function StackComponent(props) {
  return React.createElement(React.Fragment, null, props.children);
}

function Screen() {
  return null;
}

const Stack = Object.assign(StackComponent, { Screen });

function useRouter() {
  return mockRouter;
}

function useLocalSearchParams() {
  return localSearchParams;
}

function __setLocalSearchParams(params) {
  localSearchParams = params;
}

function __resetRouter() {
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
  mockRouter.back.mockReset();
  localSearchParams = {};
}

module.exports = {
  Stack,
  useRouter,
  useLocalSearchParams,
  __setLocalSearchParams,
  __resetRouter,
  __mockRouter: mockRouter,
};
