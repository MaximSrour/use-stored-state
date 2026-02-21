import { useState } from "react";

import { type UseStoredStateOptions, type UseStoredStateResult } from "./types";

/**
 * Thin wrapper around React's `useState`.
 *
 * @param {State} initialState - State value.
 * @returns {UseStoredStateResult<State>} The same tuple as `useState`.
 */
export function useStoredState<State>({
  initialState,
}: UseStoredStateOptions<State>): UseStoredStateResult<State> {
  const [state, setBaseState] = useState(initialState);

  const setState = (newState: State): void => {
    setBaseState(newState);
  };

  return [state, setState] as const;
}
