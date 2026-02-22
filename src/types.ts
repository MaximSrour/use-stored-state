type KeyOptions =
  | {
      queryKey: string;
      sessionStorageKey?: string;
      localStorageKey?: string;
    }
  | {
      queryKey?: string;
      sessionStorageKey: string;
      localStorageKey?: string;
    }
  | {
      queryKey?: string;
      sessionStorageKey?: string;
      localStorageKey: string;
    };

type ValidationOptions<State> =
  | {
      validValues: readonly State[];
      validate?: never;
    }
  | {
      validValues?: never;
      validate: (value: State) => boolean;
    }
  | {
      validValues?: undefined;
      validate?: undefined;
    };
type ParseStoredValue<State> = (rawValue: string) => State | null;
type SerializeStoredValue<State> = (value: State) => string;

export type UseStoredStateOptions<State> = {
  defaultValue: State;
  parse?: ParseStoredValue<State>;
  serialize?: SerializeStoredValue<State>;
} & KeyOptions &
  ValidationOptions<State>;

export type UseStoredStateResult<State> = [State, (newState: State) => void];

export interface UseKeyStoreOptions<State> {
  key: string | null;
  source: "query" | "sessionStorage" | "localStorage";
  parse?: ParseStoredValue<State>;
  serialize?: SerializeStoredValue<State>;
}

export type UseKeyStoreResult<State> = [
  State | null,
  (newState: State) => void,
];
