interface Generator<T, TReturn, TNext> {
  all(callback: (value: T) => any): boolean;
  any(callback: (value: T) => any): boolean;
  entries(): Generator<[number, T], TReturn, TNext>;
  filter(callback: (value: T) => any): Generator<T, TReturn, TNext>;
  find(callback: (value: T) => any): T | null;
  map<U>(callback: (value: T) => U): Generator<U, TReturn, TNext>;
  reduce<U>(callback: (v: U, value: T) => U, initialValue: U): U;
  take(index: number): T | null;
  toArray(): Array<T>;
}
