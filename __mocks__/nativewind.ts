import type { ComponentType } from "react";

export function styled<T>(component: ComponentType<T>): ComponentType<T> {
  return component;
}

export function useColorScheme() {
  return {
    colorScheme: "light",
    setColorScheme: jest.fn(),
    toggleColorScheme: jest.fn(),
  };
}
