import { useEffect, useRef, useState } from "react";

import { type UseKeyStoreOptions, type UseKeyStoreResult } from "./types";

const activeQueryKeyInstances = new Map<string, Set<symbol>>();

/**
 * Stores state by source/key pair.
 *
 * @param {UseKeyStoreOptions} options - Hook options.
 * @returns {UseKeyStoreResult<State>} The same tuple shape as `useState`.
 */
export function useKeyStore<State>({
  key,
  source,
  parse,
  serialize,
}: UseKeyStoreOptions<State>): UseKeyStoreResult<State> {
  const queryKeyInstanceId = useRef(Symbol("queryKeyInstance"));
  const parseValue =
    parse ??
    ((rawValue: string) => {
      return rawValue as State;
    });
  const serializeValue =
    serialize ??
    ((value: State) => {
      return String(value);
    });

  const getStorageValue = () => {
    if (key === null) {
      return null;
    }

    if (typeof window === "undefined") {
      return null;
    }

    switch (source) {
      case "query": {
        const searchParams = new URLSearchParams(window.location.search);
        const queryValue = searchParams.get(key);

        if (queryValue === null) {
          return null;
        }

        return parseValue(queryValue);
      }

      case "localStorage": {
        const storageValue = window.localStorage.getItem(key);
        if (storageValue === null) {
          return null;
        }

        return parseValue(storageValue);
      }

      case "sessionStorage": {
        const storageValue = window.sessionStorage.getItem(key);
        if (storageValue === null) {
          return null;
        }

        return parseValue(storageValue);
      }
    }
  };

  const setStorageValue = (value: State) => {
    if (key === null) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const stringValue = serializeValue(value);

    switch (source) {
      case "query": {
        const url = new URL(window.location.href);
        url.searchParams.set(key, stringValue);
        window.history.replaceState(window.history.state, "", url);
        return;
      }

      case "localStorage": {
        window.localStorage.setItem(key, stringValue);
        return;
      }

      case "sessionStorage": {
        window.sessionStorage.setItem(key, stringValue);
        return;
      }
    }
  };

  useEffect(() => {
    if (source !== "query" || key === null || typeof window === "undefined") {
      return;
    }

    const instances = activeQueryKeyInstances.get(key) ?? new Set<symbol>();
    instances.add(queryKeyInstanceId.current);
    activeQueryKeyInstances.set(key, instances);

    return () => {
      const activeInstances = activeQueryKeyInstances.get(key);
      if (activeInstances === undefined) {
        return;
      }

      activeInstances.delete(queryKeyInstanceId.current);
      if (activeInstances.size > 0) {
        return;
      }

      activeQueryKeyInstances.delete(key);

      const url = new URL(window.location.href);
      url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
    };
  }, [key, source]);

  const [state, setBaseState] = useState<State | null>(getStorageValue);

  const setState = (newState: State): void => {
    setBaseState(newState);
    setStorageValue(newState);
  };

  return [state, setState] as const;
}
