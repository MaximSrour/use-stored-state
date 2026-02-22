import { useCallback, useEffect, useState } from "react";

import { type UseStoredStateOptions, type UseStoredStateResult } from "./types";
import { useKeyStore } from "./useKeyStore";

/**
 * Parse a primitive value from a string, returning null if the value is invalid or cannot be parsed.
 *
 * @param {string} rawValue - The raw string value to parse.
 * @param {State} defaultValue - A default state value used to determine the type to parse into.
 * @returns {State | null} The parsed value, or null if the value is invalid or cannot be parsed.
 */
function parsePrimitiveState<State>(
  rawValue: string,
  defaultValue: State
): State | null {
  if (typeof defaultValue === "boolean") {
    if (rawValue === "true") {
      return true as State;
    }

    if (rawValue === "false") {
      return false as State;
    }

    return null;
  }

  if (typeof defaultValue === "number") {
    const parsedNumber = Number(rawValue);

    if (Number.isNaN(parsedNumber)) {
      return null;
    }

    return parsedNumber as State;
  }

  if (typeof defaultValue === "string") {
    return rawValue as State;
  }

  return null;
}

/**
 * Provides a stateful value that syncs with the URL query parameters and local storage.
 *
 * @param {UseStoredStateOptions<State>} options - An object containing options for the hook.
 * @param {string} options.queryKey - The key to use for syncing state with the URL query parameters.
 * @param {string} options.sessionStorageKey - The key to use for syncing state with session storage. Mutually exclusive with `localStorageKey`.
 * @param {string} options.localStorageKey - The key to use for syncing state with local storage. Mutually exclusive with `sessionStorageKey`.
 * @param {State} options.defaultValue - The default state value.
 * @param {State[]} options.validValues - An array of valid state values. If provided, the hook will only update state if the new value is included in this array.
 * @param {(value: State) => boolean} options.validate - A function that takes a state value and returns a boolean indicating whether the value is valid. If provided, the hook will only update state if this function returns true for the new value.
 * @param {ParseStoredValue<State>} options.parse - A function to parse a raw string value into the state type. If not provided, a default parser will be used for primitive types (boolean, number, string).
 * @param {SerializeStoredValue<State>} options.serialize - A function to serialize the state value into a string. If not provided, a default serializer will be used that converts the value to a string.
 * @returns {UseStoredStateResult<State>} The same tuple as `useState`.
 * @throws {Error} Will throw an error if `defaultValue` does not satisfy the validation criteria defined by `validValues` or `validate`.
 */
export function useStoredState<State>({
  queryKey,
  sessionStorageKey,
  localStorageKey,
  defaultValue,
  validValues,
  validate,
  parse,
  serialize,
}: UseStoredStateOptions<State>): UseStoredStateResult<State> {
  const parseValue =
    parse ??
    ((rawValue: string) => {
      return parsePrimitiveState(rawValue, defaultValue);
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

  if (!isValid(defaultValue)) {
    throw new Error("defaultValue must satisfy useStoredState validation");
  }

  const initialState =
    validatedQueryState ??
    validatedSessionStorageState ??
    validatedLocalStorageState ??
    defaultValue;
  const [state, setBaseState] = useState<State>(initialState);

  const syncAllStores = useCallback(
    (value: State) => {
      setQueryState(value);
      setSessionStorageState(value);
      setLocalStorageState(value);
    },
    [setLocalStorageState, setQueryState, setSessionStorageState]
  );

  useEffect(() => {
    syncAllStores(state);
  }, [state, syncAllStores]);

  const setState = (newState: State): void => {
    if (!isValid(newState)) {
      return;
    }

    setBaseState(newState);
  };

  return [state, setState] as const;
}
