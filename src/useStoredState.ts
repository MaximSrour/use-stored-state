import { useCallback, useEffect, useRef, useState } from "react";

import { type UseStoredStateOptions, type UseStoredStateResult } from "./types";
import { useKeyStore } from "./useKeyStore";

/**
 * Thin wrapper around React's `useState`.
 *
 * @param {UseStoredStateOptions<State>} options - An object containing options for the hook.
 * @param {string} options.queryKey - The key to use for syncing state with the URL query parameters.
 * @param {string} options.sessionStorageKey - The key to use for syncing state with session storage.
 * @param {string} options.localStorageKey - The key to use for syncing state with local storage.
 * @param {State} options.defaultState - State value.
 * @returns {UseStoredStateResult<State>} The same tuple as `useState`.
 */
export function useStoredState<State>({
  queryKey,
  sessionStorageKey,
  localStorageKey,
  defaultState,
}: UseStoredStateOptions<State>): UseStoredStateResult<State> {
  const [queryState, setQueryState] = useKeyStore<State>({
    key: queryKey ?? null,
    source: "query",
  });

  const [sessionStorageState, setSessionStorageState] = useKeyStore<State>({
    key: sessionStorageKey ?? null,
    source: "sessionStorage",
  });

  const [localStorageState, setLocalStorageState] = useKeyStore<State>({
    key: localStorageKey ?? null,
    source: "localStorage",
  });

  const initialState =
    queryState ?? sessionStorageState ?? localStorageState ?? defaultState;
  const [state, setBaseState] = useState<State>(initialState);
  const didSyncInitialState = useRef(false);

  const syncAllStores = useCallback(
    (value: State) => {
      setQueryState(value);
      setSessionStorageState(value);
      setLocalStorageState(value);
    },

    [setLocalStorageState, setQueryState, setSessionStorageState]
  );

  useEffect(() => {
    if (didSyncInitialState.current) {
      return;
    }

    didSyncInitialState.current = true;
    syncAllStores(state);
  }, [state, syncAllStores]);

  const setState = (newState: State): void => {
    setBaseState(newState);
    syncAllStores(newState);
  };

  return [state, setState] as const;
}
