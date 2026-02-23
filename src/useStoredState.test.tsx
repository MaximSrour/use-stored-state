import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { Fragment, StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type UseStoredStateOptions } from "./types";
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

  describe("option validation", () => {
    it("throws when no key is provided", () => {
      const invalidOptions = {
        defaultValue: "default",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow(
        "useStoredState requires at least one of queryKey, sessionStorageKey, or localStorageKey"
      );
    });

    it("throws when both sessionStorageKey and localStorageKey are provided", () => {
      const invalidOptions = {
        defaultValue: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow(
        "useStoredState options must include only one of sessionStorageKey or localStorageKey"
      );
    });

    it("throws when queryKey is not a string", () => {
      const invalidOptions = {
        defaultValue: "default",
        queryKey: 123,
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("queryKey must be a string");
    });

    it("throws when sessionStorageKey is not a string", () => {
      const invalidOptions = {
        defaultValue: "default",
        queryKey: "state",
        sessionStorageKey: 123,
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("sessionStorageKey must be a string");
    });

    it("throws when localStorageKey is not a string", () => {
      const invalidOptions = {
        defaultValue: "default",
        localStorageKey: 123,
        queryKey: "state",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("localStorageKey must be a string");
    });

    it("throws when validValues and validate are both provided", () => {
      const invalidOptions = {
        defaultValue: "default",
        queryKey: "state",
        validValues: ["default"],
        validate: (value: string) => {
          return value.length > 0;
        },
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("Provide only one of validValues or validate");
    });

    it("throws when parse and serialize are not provided together", () => {
      const invalidOptions = {
        defaultValue: "default",
        parse: (rawValue: string) => {
          return rawValue;
        },
        queryKey: "state",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("parse and serialize must be provided together");
    });

    it("throws when parse is not a function", () => {
      const invalidOptions = {
        defaultValue: "default",
        parse: true,
        queryKey: "state",
        serialize: (value: string) => {
          return value;
        },
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("parse must be a function");
    });

    it("throws when serialize is not a function", () => {
      const invalidOptions = {
        defaultValue: "default",
        parse: (rawValue: string) => {
          return rawValue;
        },
        queryKey: "state",
        serialize: true,
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("serialize must be a function");
    });

    it("throws when validValues is not an array", () => {
      const invalidOptions = {
        defaultValue: "default",
        queryKey: "state",
        validValues: "default",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("validValues must be an array");
    });

    it("throws when validate is not a function", () => {
      const invalidOptions = {
        defaultValue: "default",
        queryKey: "state",
        validate: "yes",
      } as unknown as UseStoredStateOptions<string>;

      expect(() => {
        renderHook(() => {
          return useStoredState(invalidOptions);
        });
      }).toThrow("validate must be a function");
    });
  });

  describe("initial hydration precedence", () => {
    it("loads value from query first and syncs to configured stores", () => {
      window.history.replaceState(null, "", "/?state=from-query");
      window.sessionStorage.setItem("state", "from-session");
      window.localStorage.setItem("state", "from-local");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          queryKey: "state",
          sessionStorageKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toBe("from-query");
      expect(window.location.search).toBe("?state=from-query");
      expect(window.sessionStorage.getItem("state")).toBe("from-query");
    });

    it("falls back to session storage and syncs to configured stores", () => {
      window.history.replaceState(null, "", "/?other=value");
      window.sessionStorage.setItem("state", "from-session");
      window.localStorage.setItem("state", "from-local");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          queryKey: "state",
          sessionStorageKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toBe("from-session");
      expect(window.location.search).toBe("?other=value&state=from-session");
      expect(window.sessionStorage.getItem("state")).toBe("from-session");
    });

    it("falls back to local storage and syncs to configured stores", () => {
      window.history.replaceState(null, "", "/?other=value");
      window.localStorage.setItem("state", "from-local");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          localStorageKey: "state",
          queryKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toBe("from-local");
      expect(window.location.search).toBe("?other=value&state=from-local");
      expect(window.localStorage.getItem("state")).toBe("from-local");
    });

    it("falls back to default value and syncs to configured stores", () => {
      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          queryKey: "state",
          sessionStorageKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toBe("default");
      expect(window.location.search).toBe("?state=default");
      expect(window.sessionStorage.getItem("state")).toBe("default");
    });

    it("supports storage-only usage without query key", () => {
      window.sessionStorage.setItem("state", "from-session");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          sessionStorageKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toBe("from-session");
      expect(window.location.search).toBe("");
    });
  });

  describe("validation of hydrated values", () => {
    it("falls back to default when query value fails validValues", () => {
      window.history.replaceState(null, "", "/?mode=invalid");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          queryKey: "mode",
          sessionStorageKey: "mode",
          validValues: ["default", "allowed"] as const,
        });
      });

      const [state] = result.current;
      expect(state).toBe("default");
      expect(window.location.search).toBe("?mode=default");
      expect(window.sessionStorage.getItem("mode")).toBe("default");
    });

    it("falls back to default when session storage value fails validValues", () => {
      window.sessionStorage.setItem("mode", "invalid");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          sessionStorageKey: "mode",
          validValues: ["default", "allowed"] as const,
        });
      });

      const [state] = result.current;
      expect(state).toBe("default");
      expect(window.location.search).toBe("");
      expect(window.sessionStorage.getItem("mode")).toBe("default");
    });

    it("falls back to default when local storage value fails validValues", () => {
      window.localStorage.setItem("mode", "invalid");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          localStorageKey: "mode",
          validValues: ["default", "allowed"] as const,
        });
      });

      const [state] = result.current;
      expect(state).toBe("default");
      expect(window.location.search).toBe("");
      expect(window.localStorage.getItem("mode")).toBe("default");
    });

    it("ignores invalid persisted values from validValues and falls back to default", () => {
      window.history.replaceState(null, "", "/?mode=invalid");
      window.sessionStorage.setItem("mode", "also-invalid");
      window.localStorage.setItem("mode", "from-local");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          localStorageKey: "mode",
          queryKey: "mode",
          validValues: ["default", "from-local", "from-query"] as const,
        });
      });

      const [state] = result.current;
      expect(state).toBe("from-local");
      expect(window.location.search).toBe("?mode=from-local");
      expect(window.localStorage.getItem("mode")).toBe("from-local");
    });

    it("uses custom validate function for hydrated values", () => {
      window.history.replaceState(null, "", "/?count=7");
      window.sessionStorage.setItem("count", "8");
      window.localStorage.setItem("count", "4");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: 2,
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
    });

    it("does not call validate with null when query value is missing", () => {
      const validate = vi.fn((value: string) => {
        if ((value as unknown) === null) {
          throw new Error("validate called with null");
        }

        return value === "allowed";
      });

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          queryKey: "mode",
          validate,
        });
      });

      expect(result.current[0]).toBe("allowed");
      expect(
        validate.mock.calls.some(([value]) => (value as unknown) === null)
      ).toBe(false);
    });

    it("does not call validate with null when session value is missing", () => {
      const validate = vi.fn((value: string) => {
        if ((value as unknown) === null) {
          throw new Error("validate called with null");
        }

        return value === "allowed";
      });

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          sessionStorageKey: "mode",
          validate,
        });
      });

      expect(result.current[0]).toBe("allowed");
      expect(
        validate.mock.calls.some(([value]) => (value as unknown) === null)
      ).toBe(false);
    });

    it("does not call validate with null when local value is missing", () => {
      const validate = vi.fn((value: string) => {
        if ((value as unknown) === null) {
          throw new Error("validate called with null");
        }

        return value === "allowed";
      });

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          localStorageKey: "mode",
          validate,
        });
      });

      expect(result.current[0]).toBe("allowed");
      expect(
        validate.mock.calls.some(([value]) => (value as unknown) === null)
      ).toBe(false);
    });

    it("throws when defaultValue does not satisfy validation", () => {
      expect(() => {
        renderHook(() => {
          return useStoredState({
            defaultValue: "default",
            queryKey: "state",
            validValues: ["allowed"] as const,
          });
        });
      }).toThrow("defaultValue must satisfy useStoredState validation");
    });

    it("ignores query hydrated value when validate rejects it", () => {
      window.history.replaceState(null, "", "/?mode=rejected");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          queryKey: "mode",
          validate: (value: string) => {
            return value === "allowed";
          },
        });
      });

      const [state] = result.current;
      expect(state).toBe("allowed");
      expect(window.location.search).toBe("?mode=allowed");
    });

    it("ignores session hydrated value when validate rejects it", () => {
      window.sessionStorage.setItem("mode", "rejected");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          sessionStorageKey: "mode",
          validate: (value: string) => {
            return value === "allowed";
          },
        });
      });

      const [state] = result.current;
      expect(state).toBe("allowed");
      expect(window.sessionStorage.getItem("mode")).toBe("allowed");
    });

    it("ignores local hydrated value when validate rejects it", () => {
      window.localStorage.setItem("mode", "rejected");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "allowed",
          localStorageKey: "mode",
          validate: (value: string) => {
            return value === "allowed";
          },
        });
      });

      const [state] = result.current;
      expect(state).toBe("allowed");
      expect(window.localStorage.getItem("mode")).toBe("allowed");
    });
  });

  describe("parsing and serialization behavior", () => {
    it("uses custom parse and serialize for hydrated query values", () => {
      window.history.replaceState(null, "", "/?count=v-7");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: 0,
          parse: (rawValue: string) => {
            return Number(rawValue.replace("v-", ""));
          },
          queryKey: "count",
          serialize: (value: number) => {
            return `v-${value}`;
          },
          sessionStorageKey: "count",
        });
      });

      const [state, setState] = result.current;
      expect(state).toBe(7);
      expect(window.location.search).toBe("?count=v-7");
      expect(window.sessionStorage.getItem("count")).toBe("v-7");

      act(() => {
        setState(9);
      });

      expect(window.location.search).toBe("?count=v-9");
      expect(window.sessionStorage.getItem("count")).toBe("v-9");
    });

    it("uses custom serialize when syncing default values", () => {
      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: 3,
          parse: (rawValue: string) => {
            return Number(rawValue.replace("v-", ""));
          },
          queryKey: "count",
          serialize: (value: number) => {
            return `v-${value}`;
          },
          sessionStorageKey: "count",
        });
      });

      const [state] = result.current;
      expect(state).toBe(3);
      expect(window.location.search).toBe("?count=v-3");
      expect(window.sessionStorage.getItem("count")).toBe("v-3");
    });

    it("parses and syncs boolean values", () => {
      window.history.replaceState(null, "", "/?enabled=true");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: false,
          queryKey: "enabled",
          sessionStorageKey: "enabled",
        });
      });

      const [state, setState] = result.current;
      expect(state).toBe(true);
      expect(window.sessionStorage.getItem("enabled")).toBe("true");

      act(() => {
        setState(false);
      });

      expect(window.location.search).toBe("?enabled=false");
      expect(window.sessionStorage.getItem("enabled")).toBe("false");
    });

    it("parses false boolean values", () => {
      window.history.replaceState(null, "", "/?enabled=false");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: true,
          queryKey: "enabled",
          sessionStorageKey: "enabled",
        });
      });

      const [state] = result.current;
      expect(state).toBe(false);
      expect(window.sessionStorage.getItem("enabled")).toBe("false");
    });

    it("falls back to default for invalid boolean query values", () => {
      window.history.replaceState(null, "", "/?enabled=not-boolean");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: true,
          queryKey: "enabled",
          sessionStorageKey: "enabled",
        });
      });

      const [state] = result.current;
      expect(state).toBe(true);
      expect(window.location.search).toBe("?enabled=true");
      expect(window.sessionStorage.getItem("enabled")).toBe("true");
    });

    it("falls back to default for invalid number query values", () => {
      window.history.replaceState(null, "", "/?count=not-a-number");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: 10,
          queryKey: "count",
          sessionStorageKey: "count",
        });
      });

      const [state] = result.current;
      expect(state).toBe(10);
      expect(window.location.search).toBe("?count=10");
      expect(window.sessionStorage.getItem("count")).toBe("10");
    });

    it("falls back to default for unsupported primitive parsing without custom parse", () => {
      window.history.replaceState(null, "", "/?state=%7B%22a%22%3A2%7D");

      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: { a: 1 },
          queryKey: "state",
          sessionStorageKey: "state",
        });
      });

      const [state] = result.current;
      expect(state).toEqual({ a: 1 });
      expect(window.location.search).toBe("?state=%5Bobject+Object%5D");
      expect(window.sessionStorage.getItem("state")).toBe("[object Object]");
    });
  });

  describe("state updates and synchronization", () => {
    it("syncs configured stores when setState is called", () => {
      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
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
    });

    it("does not persist invalid updates from validate function", () => {
      const { result } = renderHook(() => {
        return useStoredState({
          defaultValue: 10,
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
    });

    it("reacts to updated validValues on rerender", () => {
      const { result, rerender } = renderHook(
        ({ validValues }: { validValues: readonly string[] }) => {
          return useStoredState({
            defaultValue: "a",
            queryKey: "state",
            validValues,
          });
        },
        {
          initialProps: { validValues: ["a"] as readonly string[] },
        }
      );

      act(() => {
        const [, setState] = result.current;
        setState("b");
      });
      expect(result.current[0]).toBe("a");

      rerender({ validValues: ["a", "b"] as readonly string[] });

      act(() => {
        const [, setState] = result.current;
        setState("b");
      });
      expect(result.current[0]).toBe("b");
      expect(window.location.search).toBe("?state=b");
    });

    it("syncs to updated keys after rerender", () => {
      const { result, rerender } = renderHook(
        ({
          queryKey,
          sessionStorageKey,
        }: {
          queryKey: string;
          sessionStorageKey: string;
        }) => {
          return useStoredState({
            defaultValue: "one",
            queryKey,
            sessionStorageKey,
          });
        },
        {
          initialProps: { queryKey: "first", sessionStorageKey: "first" },
        }
      );

      act(() => {
        const [, setState] = result.current;
        setState("two");
      });
      expect(window.location.search).toBe("?first=two");
      expect(window.sessionStorage.getItem("first")).toBe("two");

      rerender({ queryKey: "second", sessionStorageKey: "second" });

      act(() => {
        const [, setState] = result.current;
        setState("three");
      });
      expect(window.location.search).toBe("?second=three");
      expect(
        new URLSearchParams(window.location.search).get("first")
      ).toBeNull();
      expect(window.sessionStorage.getItem("first")).toBe("two");
      expect(window.sessionStorage.getItem("second")).toBe("three");
    });
  });

  describe("query lifecycle and unmount behavior", () => {
    it("fills query param on initial mount in StrictMode", () => {
      // eslint-disable-next-line jsdoc/require-jsdoc
      function Wrapper() {
        useStoredState({
          defaultValue: "overview",
          queryKey: "tab",
        });

        return null;
      }

      render(createElement(StrictMode, null, createElement(Wrapper)));

      expect(window.location.search).toBe("?tab=overview");
    });

    it("removes query param on unmount", () => {
      window.history.replaceState(null, "", "/?other=value");

      const { unmount } = renderHook(() => {
        return useStoredState({
          defaultValue: "default",
          queryKey: "state",
          sessionStorageKey: "state",
        });
      });

      expect(window.location.search).toBe("?other=value&state=default");

      unmount();

      expect(window.location.search).toBe("?other=value");
      expect(window.sessionStorage.getItem("state")).toBe("default");
    });

    it("removes nested query param when parent tab change unmounts nested hook", () => {
      // eslint-disable-next-line jsdoc/require-jsdoc
      function NestedTab() {
        useStoredState({
          defaultValue: "details",
          queryKey: "nestedTab",
        });

        return null;
      }

      // eslint-disable-next-line jsdoc/require-jsdoc
      function PageTabs() {
        const [pageTab, setPageTab] = useStoredState({
          defaultValue: "overview",
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
          defaultValue: "overview",
          queryKey: "tab",
        });

        return null;
      }

      // eslint-disable-next-line jsdoc/require-jsdoc
      function SharedTabs({ showNested }: { showNested: boolean }) {
        useStoredState({
          defaultValue: "overview",
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
  });

  describe("type-level constraints", () => {
    it("enforces mutually exclusive storage keys at the type level", () => {
      // @ts-expect-error sessionStorageKey and localStorageKey are mutually exclusive.
      const _invalidOptions: UseStoredStateOptions<string> = {
        defaultValue: "default",
        localStorageKey: "state",
        queryKey: "state",
        sessionStorageKey: "state",
      };

      expect(true).toBe(true);
    });
  });
});
