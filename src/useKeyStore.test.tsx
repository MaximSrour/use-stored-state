import { act, cleanup, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("read guards", () => {
    it("returns null when query key is missing", () => {
      const { result } = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });

      const [state] = result.current;
      expect(state).toBeNull();
    });

    it("does not read storage when key is null", () => {
      const getItemSpy = vi.spyOn(window.localStorage, "getItem");
      const parse = vi.fn((rawValue: string) => {
        return rawValue.toUpperCase();
      });

      const { result } = renderHook(() => {
        return useKeyStore<string>({
          key: null,
          parse,
          source: "localStorage",
        });
      });

      const [state] = result.current;
      expect(state).toBeNull();
      expect(getItemSpy).not.toHaveBeenCalled();
      expect(parse).not.toHaveBeenCalled();
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

    it("does not parse when local storage key is missing", () => {
      const parse = vi.fn((rawValue: string) => {
        return rawValue.toUpperCase();
      });

      const { result } = renderHook(() => {
        return useKeyStore<string>({
          key: "missing",
          parse,
          source: "localStorage",
        });
      });

      const [state] = result.current;
      expect(state).toBeNull();
      expect(parse).not.toHaveBeenCalled();
    });
  });

  describe("hydration from existing values", () => {
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
  });

  describe("state updates write to the selected source", () => {
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
  });

  describe("query lifecycle cleanup", () => {
    it("uses empty history title when updating query params", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

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

      expect(replaceStateSpy).toHaveBeenCalledWith(
        window.history.state,
        "",
        expect.any(URL)
      );
    });

    it("removes query parameter on unmount for query source", () => {
      window.history.replaceState(null, "", "/?other=value");

      const { result, unmount } = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });

      act(() => {
        const [, setState] = result.current;
        setState("next");
      });

      expect(window.location.search).toBe("?other=value&state=next");

      unmount();

      expect(window.location.search).toBe("?other=value");
    });

    it("keeps query parameter while another hook with same key remains mounted", () => {
      const first = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });
      const second = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });

      act(() => {
        const [, setState] = first.result.current;
        setState("next");
      });

      expect(window.location.search).toBe("?state=next");

      second.unmount();

      expect(window.location.search).toBe("?state=next");

      first.unmount();

      expect(window.location.search).toBe("");
    });

    it("does not clean query params for non-query sources on unmount", () => {
      window.history.replaceState(null, "", "/?other=value&state=from-query");

      const { unmount } = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "localStorage",
        });
      });

      unmount();

      expect(window.location.search).toBe("?other=value&state=from-query");
    });

    it("uses empty history title when removing query params on cleanup", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const { result, unmount } = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });

      act(() => {
        const [, setState] = result.current;
        setState("next");
      });

      replaceStateSpy.mockClear();
      unmount();

      expect(replaceStateSpy).toHaveBeenCalledWith(
        window.history.state,
        "",
        expect.any(URL)
      );
    });

    it("handles missing active query instance set during cleanup", () => {
      const getSpy = vi.spyOn(Map.prototype, "get");

      getSpy.mockImplementation(function (
        this: Map<unknown, unknown>,
        key: unknown
      ): unknown {
        if (key === "state") {
          return undefined;
        }

        return Map.prototype.get.call(this, key);
      });

      const { result, unmount } = renderHook(() => {
        return useKeyStore({
          key: "state",
          source: "query",
        });
      });

      act(() => {
        const [, setState] = result.current;
        setState("next");
      });

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it("does not track cleanup when query key is null", () => {
      window.history.replaceState(null, "", "/?null=from-query&other=value");

      const { unmount } = renderHook(() => {
        return useKeyStore({
          key: null,
          source: "query",
        });
      });

      unmount();

      expect(window.location.search).toBe("?null=from-query&other=value");
    });

    it("re-registers query cleanup behavior when key changes", () => {
      window.history.replaceState(null, "", "/?other=value");

      const { result, rerender, unmount } = renderHook(
        ({ key }: { key: string }) => {
          return useKeyStore({
            key,
            source: "query",
          });
        },
        {
          initialProps: { key: "first" },
        }
      );

      act(() => {
        const [, setState] = result.current;
        setState("value-1");
      });

      expect(window.location.search).toBe("?other=value&first=value-1");

      rerender({ key: "second" });

      expect(window.location.search).toBe("?other=value");

      act(() => {
        const [, setState] = result.current;
        setState("value-2");
      });

      expect(window.location.search).toBe("?other=value&second=value-2");

      unmount();

      expect(window.location.search).toBe("?other=value");
    });
  });

  describe("non-browser guard behavior", () => {
    it("returns null during server render without window", () => {
      const originalWindow = globalThis.window;
      vi.stubGlobal("window", undefined);

      let capturedState: string | null = "unexpected";

      // eslint-disable-next-line jsdoc/require-jsdoc
      function Probe() {
        const [state] = useKeyStore<string>({
          key: "state",
          source: "localStorage",
        });

        capturedState = state;
        return null;
      }

      expect(() => {
        renderToString(createElement(Probe));
      }).not.toThrow();

      expect(capturedState).toBeNull();

      vi.stubGlobal("window", originalWindow);
    });
  });
});
