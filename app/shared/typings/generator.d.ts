interface Generator<T, TReturn, TNext> {
  all(callback: (value: T) => any): boolean;
  any(callback: (value: T) => any): boolean;
  entries(): Generator<[number, T], TReturn, TNext>;
  filter(callback: (value: T) => any): Generator<T, TReturn, TNext>;
  find(callback: (value: T) => any): T | null;
  forEach<U>(callback: (value: T) => void): void;
  map<U>(callback: (value: T) => U): Generator<U, TReturn, TNext>;
  reduce<U>(callback: (v: U, value: T) => U, initialValue: U): U;
  slice(start?: number, end?: number): Generator<T, TReturn, TNext>;
  take(index: number): T | null;
  toArray(): Array<T>;
}
