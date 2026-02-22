import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { Fragment, StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

  afterEach(() => {
    cleanup();
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

  it("fills query param on initial mount in StrictMode", () => {
    // eslint-disable-next-line jsdoc/require-jsdoc
    function Wrapper() {
      useStoredState({
        defaultState: "overview",
        queryKey: "tab",
      });

      return null;
    }

    render(createElement(StrictMode, null, createElement(Wrapper)));

    expect(window.location.search).toBe("?tab=overview");
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

  it("removes query param on unmount", () => {
    window.history.replaceState(null, "", "/?other=value");

    const { unmount } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      });
    });

    expect(window.location.search).toBe("?other=value&state=default");

    unmount();

    expect(window.location.search).toBe("?other=value");
    expect(window.sessionStorage.getItem("state")).toBe("default");
    expect(window.localStorage.getItem("state")).toBe("default");
  });

  it("removes nested query param when parent tab change unmounts nested hook", () => {
    // eslint-disable-next-line jsdoc/require-jsdoc
    function NestedTab() {
      useStoredState({
        defaultState: "details",
        queryKey: "nestedTab",
      });

      return null;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    function PageTabs() {
      const [pageTab, setPageTab] = useStoredState({
        defaultState: "overview",
        queryKey: "pageTab",
      });

      return createElement(
        Fragment,
        null,
        createElement(
          "button",
          {
            onClick: () => {
              setPageTab("analytics");
            },
            type: "button",
          },
          "switch-page"
        ),
        pageTab === "overview" ? createElement(NestedTab) : null
      );
    }

    render(createElement(PageTabs));

    const initialSearchParams = new URLSearchParams(window.location.search);
    expect(initialSearchParams.get("pageTab")).toBe("overview");
    expect(initialSearchParams.get("nestedTab")).toBe("details");

    fireEvent.click(screen.getByRole("button", { name: "switch-page" }));

    expect(window.location.search).toBe("?pageTab=analytics");
  });

  it("keeps shared query param while another hook with the same key remains mounted", () => {
    // eslint-disable-next-line jsdoc/require-jsdoc
    function NestedSharedTab() {
      useStoredState({
        defaultState: "overview",
        queryKey: "tab",
      });

      return null;
    }

    // eslint-disable-next-line jsdoc/require-jsdoc
    function SharedTabs({ showNested }: { showNested: boolean }) {
      useStoredState({
        defaultState: "overview",
        queryKey: "tab",
      });

      return showNested ? createElement(NestedSharedTab) : null;
    }

    const { rerender, unmount } = render(
      createElement(SharedTabs, { showNested: true })
    );

    expect(window.location.search).toBe("?tab=overview");

    rerender(createElement(SharedTabs, { showNested: false }));

    expect(window.location.search).toBe("?tab=overview");

    unmount();

    expect(window.location.search).toBe("");
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

  it("ignores invalid persisted values from validValues and falls back to default", () => {
    window.history.replaceState(null, "", "/?mode=invalid");
    window.sessionStorage.setItem("mode", "also-invalid");
    window.localStorage.setItem("mode", "from-local");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: "default",
        localStorageKey: "mode",
        queryKey: "mode",
        sessionStorageKey: "mode",
        validValues: ["default", "from-local", "from-query"] as const,
      });
    });

    const [state] = result.current;
    expect(state).toBe("from-local");
    expect(window.location.search).toBe("?mode=from-local");
    expect(window.sessionStorage.getItem("mode")).toBe("from-local");
    expect(window.localStorage.getItem("mode")).toBe("from-local");
  });

  it("uses custom validate function for hydrated values", () => {
    window.history.replaceState(null, "", "/?count=7");
    window.sessionStorage.setItem("count", "8");
    window.localStorage.setItem("count", "4");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: 2,
        localStorageKey: "count",
        queryKey: "count",
        sessionStorageKey: "count",
        validate: (value) => {
          return value % 2 === 0;
        },
      });
    });

    const [state] = result.current;
    expect(state).toBe(8);
    expect(window.location.search).toBe("?count=8");
    expect(window.sessionStorage.getItem("count")).toBe("8");
    expect(window.localStorage.getItem("count")).toBe("8");
  });

  it("parses and syncs boolean values", () => {
    window.history.replaceState(null, "", "/?enabled=true");

    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: false,
        localStorageKey: "enabled",
        queryKey: "enabled",
        sessionStorageKey: "enabled",
      });
    });

    const [state, setState] = result.current;
    expect(state).toBe(true);
    expect(window.sessionStorage.getItem("enabled")).toBe("true");
    expect(window.localStorage.getItem("enabled")).toBe("true");

    act(() => {
      setState(false);
    });

    expect(window.location.search).toBe("?enabled=false");
    expect(window.sessionStorage.getItem("enabled")).toBe("false");
    expect(window.localStorage.getItem("enabled")).toBe("false");
  });

  it("does not persist invalid updates from validate function", () => {
    const { result } = renderHook(() => {
      return useStoredState({
        defaultState: 10,
        localStorageKey: "count",
        queryKey: "count",
        sessionStorageKey: "count",
        validate: (value) => {
          return value >= 0 && value <= 100;
        },
      });
    });

    act(() => {
      const [, setState] = result.current;
      setState(120);
    });

    const [state] = result.current;
    expect(state).toBe(10);
    expect(window.location.search).toBe("?count=10");
    expect(window.sessionStorage.getItem("count")).toBe("10");
    expect(window.localStorage.getItem("count")).toBe("10");
  });
});
