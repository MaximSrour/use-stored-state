import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useKeyStore } from "./useKeyStore";

describe("useKeyStore", () => {
  const createStorageMock = () => {
    const values = new Map<string, string>();

    return {
      clear: () => {
        values.clear();
      },
      getItem: (lookupKey: string) => {
        return values.get(lookupKey) ?? null;
      },
      removeItem: (lookupKey: string) => {
        values.delete(lookupKey);
      },
      setItem: (lookupKey: string, value: string) => {
        values.set(lookupKey, value);
      },
    };
  };

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorageMock(),
      writable: true,
    });
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createStorageMock(),
      writable: true,
    });
  });

  it("returns default value when query key is missing", () => {
    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "query",
      });
    });

    const [state] = result.current;
    expect(state).toBeNull();
  });

  it("loads value from query source", () => {
    window.history.replaceState(null, "", "/?state=from-query");

    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "query",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-query");
  });

  it("updates query parameter when state changes", () => {
    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "query",
      });
    });

    act(() => {
      const [, setState] = result.current;
      setState("next");
    });

    expect(window.location.search).toBe("?state=next");
  });

  it("loads value from local storage source", () => {
    window.localStorage.setItem("state", "from-local");

    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "localStorage",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-local");
  });

  it("updates local storage when state changes", () => {
    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "localStorage",
      });
    });

    act(() => {
      const [, setState] = result.current;
      setState("next-local");
    });

    expect(window.localStorage.getItem("state")).toBe("next-local");
  });

  it("loads value from session storage source", () => {
    window.sessionStorage.setItem("state", "from-session");

    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "sessionStorage",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-session");
  });

  it("updates session storage when state changes", () => {
    const { result } = renderHook(() => {
      return useKeyStore({
        key: "state",
        source: "sessionStorage",
      });
    });

    act(() => {
      const [, setState] = result.current;
      setState("next-session");
    });

    expect(window.sessionStorage.getItem("state")).toBe("next-session");
  });

  it("returns null and skips storage writes when key is null", () => {
    const { result } = renderHook(() => {
      return useKeyStore({
        key: null,
        source: "localStorage",
      });
    });

    const [state, setState] = result.current;
    expect(state).toBeNull();

    act(() => {
      setState("ignored");
    });

    expect(window.localStorage.getItem("state")).toBeNull();
  });
});
