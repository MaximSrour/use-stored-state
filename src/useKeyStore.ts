import { useState } from "react";

import { type UseKeyStoreOptions, type UseKeyStoreResult } from "./types";

/**
 * Stores state by source/key pair.
 *
 * @param {UseKeyStoreOptions} options - Hook options.
 * @returns {UseKeyStoreResult<State>} The same tuple shape as `useState`.
 */
export function useKeyStore<State>({
  key,
  source,
}: UseKeyStoreOptions): UseKeyStoreResult<State> {
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

        return queryValue as State;
      }

      case "localStorage": {
        const storageValue = window.localStorage.getItem(key);
        return storageValue as State;
      }

      case "sessionStorage": {
        const storageValue = window.sessionStorage.getItem(key);
        return storageValue as State;
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

  const [state, setBaseState] = useState<State | null>(getStorageValue);

  const setState = (newState: State): void => {
    setBaseState(newState);
    setStorageValue(newState);
  };

  return [state, setState] as const;
}
