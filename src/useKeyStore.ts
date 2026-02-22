import { useState } from "react";

import { type UseKeyStoreOptions, type UseKeyStoreResult } from "./types";

/**
 * Stores state by source/key pair.
 *
 * @param {UseKeyStoreOptions<State>} options - Hook options.
 * @returns {UseKeyStoreResult<State>} The same tuple shape as `useState`.
 */
export function useKeyStore<State>({
  defaultValue,
  key,
  source,
}: UseKeyStoreOptions<State>): UseKeyStoreResult<State> {
  const getStorageValue = (): State => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    switch (source) {
      case "query": {
        const searchParams = new URLSearchParams(window.location.search);
        const queryValue = searchParams.get(key);

        return queryValue === null ? defaultValue : (queryValue as State);
      }

      case "localStorage": {
        const storageValue = window.localStorage.getItem(key);
        return storageValue === null ? defaultValue : (storageValue as State);
      }

      case "sessionStorage": {
        const storageValue = window.sessionStorage.getItem(key);
        return storageValue === null ? defaultValue : (storageValue as State);
      }

      default:
        return defaultValue;
    }
  };

  const setStorageValue = (value: State) => {
    if (typeof window === "undefined") {
      return;
    }

    const stringValue = String(value);

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

  const [state, setBaseState] = useState<State>(getStorageValue);

  const setState = (newState: State): void => {
    setBaseState(newState);
    setStorageValue(newState);
  };

  return [state, setState] as const;
}
