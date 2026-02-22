# use-stored-state

`use-stored-state` is a React hook that keeps state synchronized with:

- URL query params (optional)
- Session storage or local storage (optional, mutually exclusive)

It gives you a `useState`-like API with persistence, hydration priority, and
validation built in.

## Install

```sh
npm install use-stored-state
```

Peer dependency:

- `react >= 18`

## Quick Start

```ts
import { useStoredState } from "use-stored-state";

function Example() {
  const [pageSize, setPageSize] = useStoredState({
    defaultValue: 25,
    queryKey: "pageSize",
    sessionStorageKey: "usersPageSize",
    validValues: [10, 25, 50, 100] as const,
  });

  return (
    <>
      <label htmlFor="page-size">Users per page</label>
      <select
        id="page-size"
        value={pageSize}
        onChange={(event) => setPageSize(Number(event.target.value))}
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </>
  );
}
```

## API

### `useStoredState(options)`

```ts
type UseStoredStateOptions<State> = {
  defaultValue: State;

  // Provide at least one key:
  queryKey?: string;
  sessionStorageKey?: string;
  localStorageKey?: string;

  // Validation (choose one or neither):
  validValues?: readonly State[];
  validate?: (value: State) => boolean;

  // Parsing/serialization (provide both or neither):
  parse?: (rawValue: string) => State | null;
  serialize?: (value: State) => string;
};
```

Rules:

- At least one of `queryKey`, `sessionStorageKey`, `localStorageKey` is required.
- `sessionStorageKey` and `localStorageKey` cannot be used together.
- Use `validValues` or `validate` (not both).
- If you pass `parse`, you must also pass `serialize` (and vice versa).
- Invalid option combinations throw at runtime (including JavaScript-only usage).

Returns:

```ts
[state, setState];
```

Where `setState` only applies valid values.

## Behavior

### Hydration order

Initial state is resolved in this order:

1. Query param (`queryKey`)
2. Session storage (`sessionStorageKey`) or local storage (`localStorageKey`)
3. `defaultValue`

Invalid hydrated values are ignored when `validValues` or `validate` is used.

### Synchronization

- On mount and on each valid state update, the hook syncs current state to all
  configured stores (query + at most one storage source).
- At least one key is required.
- `sessionStorageKey` and `localStorageKey` are mutually exclusive.
- Any omitted store key is not read or written.

### Query param lifecycle

- If `queryKey` is set, the query param is populated on mount.
- On unmount, that query param is removed.
- If multiple mounted hooks share the same `queryKey`, the param is only removed
  after the last one unmounts.

### Validation

- `validValues`: allow-list validation
- `validate`: custom predicate validation
- `defaultValue` must pass validation, otherwise the hook throws

### Parsing and serialization

By default, primitive values are handled as:

- `boolean`: `"true"` / `"false"`
- `number`: `Number(rawValue)` (rejects `NaN`)
- `string`: unchanged

For custom state shapes, provide `parse` and `serialize`.

## `useKeyStore`

`useKeyStore` is the low-level hook used by `useStoredState`.

```ts
import { useKeyStore } from "use-stored-state";
```

It syncs a single source (`query`, `sessionStorage`, or `localStorage`) and
returns `[state, setState]`.

## Development

Useful commands:

- `npm run test`
- `npm run lint`
- `npm run prettier`
- `npm run mutate`
- `npm run type-check`
- `npm run knip`
- `npm run markdownlint`
- `npm run check`
