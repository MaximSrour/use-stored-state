export interface UseStoredStateOptions<State> {
  queryKey?: string;
  sessionStorageKey?: string;
  localStorageKey?: string;
  defaultState: State;
}

export type UseStoredStateResult<State> = [State, (newState: State) => void];

export interface UseKeyStoreOptions {
  key: string | null;
  source: "query" | "sessionStorage" | "localStorage";
}

export type UseKeyStoreResult<State> = [
  State | null,
  (newState: State) => void,
];
