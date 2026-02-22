type Prettify<T> = {
  [K in keyof T]: T[K];
} & NonNullable<unknown>;

type RequireOneOrMore<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

type RequireOneOrNone<T, Keys extends keyof T = keyof T> =
  | Partial<Record<Keys, never>>
  | RequireOneOrMore<T, Keys>;

type RequireAllOrNone<T, Keys extends keyof T = keyof T> =
  | Required<Pick<T, Keys>>
  | Partial<Record<Keys, never>>;

type KeyOptionsBase = {
  queryKey: string;
  sessionStorageKey: string;
  localStorageKey: string;
};
type KeyOptions = Prettify<RequireOneOrMore<KeyOptionsBase>>;

type ValidationOptionsBase<State> = {
  validValues: readonly State[];
  validate: (value: State) => boolean;
};
type ValidationOptions<State> = Prettify<
  RequireOneOrNone<ValidationOptionsBase<State>>
>;

type ParseStoredValue<State> = (rawValue: string) => State | null;
type SerializeStoredValue<State> = (value: State) => string;

type ParseSerializeOptionsBase<State> = {
  parse: ParseStoredValue<State>;
  serialize: SerializeStoredValue<State>;
};
type ParseSerializeOptions<State> = Prettify<
  RequireAllOrNone<ParseSerializeOptionsBase<State>>
>;

export type UseStoredStateOptions<State> = {
  defaultValue: State;
} & KeyOptions &
  ParseSerializeOptions<State> &
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
