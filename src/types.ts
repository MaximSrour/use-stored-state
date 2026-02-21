export interface UseStoredStateOptions<State> {
  initialState: State;
}

export type UseStoredStateResult<State> = [State, (newState: State) => void];
