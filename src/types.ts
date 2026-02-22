export interface UseStoredStateOptions<State> {
  initialState: State;
}

export type UseStoredStateResult<State> = [State, (newState: State) => void];

export interface UseKeyStoreOptions<State> {
  defaultValue: State;
  key: string;
  source: "query" | "sessionStorage" | "localStorage";
}

export type UseKeyStoreResult<State> = [State, (newState: State) => void];
