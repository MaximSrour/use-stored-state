import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStoredState } from "./useStoredState";

describe("useStoredState", () => {
  it("returns the initial state value", () => {
    const { result } = renderHook(() => {
      return useStoredState({ initialState: "value" });
    });

    const [state] = result.current;
    expect(state).toBe("value");
  });

  it("updates state through the returned setter", () => {
    const { result } = renderHook(() => {
      return useStoredState({ initialState: 1 });
    });

    act(() => {
      const [, setState] = result.current;
      setState(2);
    });

    const [state] = result.current;
    expect(state).toBe(2);
  });

  it("does not reinitialize state when props change", () => {
    const { result, rerender } = renderHook(
      ({ initialState }: { initialState: string }) => {
        return useStoredState({ initialState });
      },
      {
        initialProps: { initialState: "first" },
      }
    );

    rerender({ initialState: "second" });

    const [state] = result.current;
    expect(state).toBe("first");
  });
});
