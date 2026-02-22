import { useCallback, useEffect, useRef, useState } from "react";

import { type UseStoredStateOptions, type UseStoredStateResult } from "./types";
import { useKeyStore } from "./useKeyStore";

/**
 * Parse a primitive value from a string, returning null if the value is invalid or cannot be parsed.
 *
 * @param {string} rawValue - The raw string value to parse.
 * @param {State} defaultState - A default state value used to determine the type to parse into.
 * @returns {State | null} The parsed value, or null if the value is invalid or cannot be parsed.
 */
function parsePrimitiveState<State>(
  rawValue: string,
  defaultState: State
): State | null {
  if (typeof defaultState === "boolean") {
    if (rawValue === "true") {
      return true as State;
    }

    if (rawValue === "false") {
      return false as State;
    }

    return null;
  }

  if (typeof defaultState === "number") {
    const parsedNumber = Number(rawValue);

    if (Number.isNaN(parsedNumber)) {
      return null;
    }

    return parsedNumber as State;
  }

  if (typeof defaultState === "string") {
    return rawValue as State;
  }

  return null;
}

/**
 * Thin wrapper around React's `useState`.
 *
 * @param {UseStoredStateOptions<State>} options - An object containing options for the hook.
 * @param {string} options.queryKey - The key to use for syncing state with the URL query parameters.
 * @param {string} options.sessionStorageKey - The key to use for syncing state with session storage.
 * @param {string} options.localStorageKey - The key to use for syncing state with local storage.
 * @param {State} options.defaultState - State value.
 * @returns {UseStoredStateResult<State>} The same tuple as `useState`.
 * @throws {Error} Will throw an error if `defaultState` does not satisfy the validation criteria defined by `validValues` or `validate`.
 */
export function useStoredState<State>({
  queryKey,
  sessionStorageKey,
  localStorageKey,
  defaultState,
  validValues,
  validate,
  parse,
  serialize,
}: UseStoredStateOptions<State>): UseStoredStateResult<State> {
  const parseValue =
    parse ??
    ((rawValue: string) => {
      return parsePrimitiveState(rawValue, defaultState);
    });
  const serializeValue =
    serialize ??
    ((value: State) => {
      return String(value);
    });
  const isValid = useCallback(
    (value: State): boolean => {
      if (validValues !== undefined) {
        return validValues.includes(value);
      }

      if (validate !== undefined) {
        return validate(value);
      }

      return true;
    },
    [validValues, validate]
  );

  const [queryState, setQueryState] = useKeyStore<State>({
    key: queryKey ?? null,
    parse: parseValue,
    serialize: serializeValue,
    source: "query",
  });

  const [sessionStorageState, setSessionStorageState] = useKeyStore<State>({
    key: sessionStorageKey ?? null,
    parse: parseValue,
    serialize: serializeValue,
    source: "sessionStorage",
  });

  const [localStorageState, setLocalStorageState] = useKeyStore<State>({
    key: localStorageKey ?? null,
    parse: parseValue,
    serialize: serializeValue,
    source: "localStorage",
  });

  const validatedQueryState =
    queryState !== null && isValid(queryState) ? queryState : null;
  const validatedSessionStorageState =
    sessionStorageState !== null && isValid(sessionStorageState)
      ? sessionStorageState
      : null;
  const validatedLocalStorageState =
    localStorageState !== null && isValid(localStorageState)
      ? localStorageState
      : null;

  if (!isValid(defaultState)) {
    throw new Error("defaultState must satisfy useStoredState validation");
  }

  const initialState =
    validatedQueryState ??
    validatedSessionStorageState ??
    validatedLocalStorageState ??
    defaultState;
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
    if (!isValid(newState)) {
      return;
    }

    setBaseState(newState);
    syncAllStores(newState);
  };

  return [state, setState] as const;
}
