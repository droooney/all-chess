/// <reference path="../../typings/generator.d.ts"/>

const proto = Object.getPrototypeOf(Object.getPrototypeOf((function* () {})()));

Object.defineProperties(proto, {
  all: {
    value<T>(this: Generator<T>, callback: (value: T) => any): boolean {
      for (const value of this) {
        if (!callback(value)) {
          return false;
        }
      }

      return true;
    }
  },

  any: {
    value<T>(this: Generator<T>, callback: (value: T) => any): boolean {
      for (const value of this) {
        if (callback(value)) {
          return true;
        }
      }

      return false;
    }
  },

  entries: {
    *value<T>(this: Generator<T>): Generator<[number, T]> {
      let i = 0;

      for (const value of this) {
        yield [i++, value];
      }
    }
  },

  filter: {
    *value<T>(this: Generator<T>, callback: (value: T) => any): Generator<T> {
      for (const value of this) {
        if (callback(value)) {
          yield value;
        }
      }
    }
  },

  find: {
    value<T>(this: Generator<T>, callback: (value: T) => any): T | null {
      for (const value of this) {
        if (callback(value)) {
          return value;
        }
      }

      return null;
    }
  },

  map: {
    *value<T, U>(this: Generator<T>, callback: (value: T) => U): Generator<U> {
      for (const value of this) {
        yield callback(value);
      }
    }
  },

  reduce: {
    value<T, U>(this: Generator<T>, callback: (v: U, value: T) => U, initialValue: U): U {
      let val = initialValue;

      for (const value of this) {
        val = callback(val, value);
      }

      return val;
    }
  },

  take: {
    value<T>(this: Generator<T>, index: number): T | null {
      for (const [i, value] of this.entries()) {
        if (i === index) {
          return value;
        }
      }

      return null;
    }
  },

  toArray: {
    value<T>(this: Generator<T>): T[] {
      return [...this];
    }
  }
});
