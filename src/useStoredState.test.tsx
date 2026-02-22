import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useStoredState } from "./useStoredState";

describe("useStoredState", () => {
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

  it("loads value from query first and syncs to all stores", () => {
    window.history.replaceState(null, "", "/?state=from-query");
    window.sessionStorage.setItem("state", "from-session");
    window.localStorage.setItem("state", "from-local");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-query");
    expect(window.location.search).toBe("?state=from-query");
    expect(window.sessionStorage.getItem("state")).toBe("from-query");
    expect(window.localStorage.getItem("state")).toBe("from-query");
  });

  it("falls back to session storage and syncs to all stores", () => {
    window.history.replaceState(null, "", "/?other=value");
    window.sessionStorage.setItem("state", "from-session");
    window.localStorage.setItem("state", "from-local");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-session");
    expect(window.location.search).toBe("?other=value&state=from-session");
    expect(window.sessionStorage.getItem("state")).toBe("from-session");
    expect(window.localStorage.getItem("state")).toBe("from-session");
  });

  it("falls back to local storage and syncs to all stores", () => {
    window.history.replaceState(null, "", "/?other=value");
    window.localStorage.setItem("state", "from-local");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-local");
    expect(window.location.search).toBe("?other=value&state=from-local");
    expect(window.sessionStorage.getItem("state")).toBe("from-local");
    expect(window.localStorage.getItem("state")).toBe("from-local");
  });

  it("falls back to default value and syncs to all stores", () => {
    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    const [state] = result.current;
    expect(state).toBe("default");
    expect(window.location.search).toBe("?state=default");
    expect(window.sessionStorage.getItem("state")).toBe("default");
    expect(window.localStorage.getItem("state")).toBe("default");
  });

  it("syncs all stores when setState is called", () => {
    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    act(() => {
      const [, setState] = result.current;
      setState("next");
    });

    const [state] = result.current;
    expect(state).toBe("next");
    expect(window.location.search).toBe("?state=next");
    expect(window.sessionStorage.getItem("state")).toBe("next");
    expect(window.localStorage.getItem("state")).toBe("next");
  });

  it("keeps in-memory state when keys are omitted", () => {
    window.history.replaceState(null, "", "/?state=from-query");
    window.sessionStorage.setItem("state", "from-session");
    window.localStorage.setItem("state", "from-local");

    const { result } = renderHook(() => {
      return useStoredState({ defaultState: "default" });
    });

    const [initialState, setState] = result.current;
    expect(initialState).toBe("default");

    act(() => {
      setState("next");
    });

    const [state] = result.current;
    expect(state).toBe("next");
    expect(window.location.search).toBe("?state=from-query");
    expect(window.sessionStorage.getItem("state")).toBe("from-session");
    expect(window.localStorage.getItem("state")).toBe("from-local");
  });
});
