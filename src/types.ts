export class Option<T> {
  _value: T = null;

  static some<T>(value: T) {
    const option = new Option<T>();
    option._value = value;
    return option;
  }

  static none<T>() {
    return new Option<T>();
  }

  hasValue = () => this._value !== null;

  setValue(value: T) {
    this._value = value;
  }

  unwrap(): T {
    if (this._value === null) {
      throw new Error("attempted to unwrap Option with value None");
    }

    return this._value;
  }
}

export class Result<T, E> {
  private _ok = true;
  private _value: T;
  private _error: E;

  isOk = () => this._ok;
  isErr = () => !this._ok;

  unwrap(): T {
    if (!this._ok) {
      const errorString = JSON.stringify(this._error, null, 2);
      const message = `attempt to unwrap result with error: ${errorString}`;
      throw new Error(message);
    }

    return this._value;
  }

  error = (): E => this._error;

  mapErr<T>(): Result<T, E> {
    return Result.err(this._error);
  }

  static ok<T, E>(value: T) {
    const result = new Result<T, E>();
    result._ok = true;
    result._value = value;
    return result;
  }

  static err<T, E>(error: E) {
    const result = new Result<T, E>();
    result._ok = false;
    result._error = error;
    return result;
  }

  toJSON(...args) {
    console.log("toJSON");
    if (this._ok) {
      return JSON.stringify({ ok: true, value: this._value }, ...args.slice(1));
    }

    return JSON.stringify({ ok: false, error: this._error }, ...args.slice(1));
  }

  toString() {
    return this.toJSON([]);
  }
}

export const assertNotReached = (_: never) => {
  // type checking only
};
