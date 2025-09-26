import { Statement, Parameter } from "../ast.ts";

export class JSObject {
  type = "object";
  properties: Record<string, JSObject> = {};

  prototype: JSObject | null = null;

  toString() {
    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.properties)) {
      out[key] = value.toString();
    }

    return JSON.stringify(out, null, 2);
  }

  isTruthy() {
    return true;
  }
}

export class JSUndefined extends JSObject {
  type = "undefined";

  toString() {
    return "undefined";
  }

  isTruthy() {
    return false;
  }
}

export class JSNull extends JSObject {
  type = "null";

  toString() {
    return "null";
  }

  isTruthy() {
    return false;
  }
}

export class JSNumber extends JSObject {
  type = "number";
  value: number;

  toString() {
    return this.value.toString();
  }

  isTruthy() {
    return this.value !== 0;
  }
}

export class JSString extends JSObject {
  type = "string";
  value: string;

  constructor(value: string) {
    super();
    this.value = value;
  }

  toString() {
    return this.value.toString();
  }

  isTruthy() {
    return this.value !== "";
  }
}

export class JSBoolean extends JSObject {
  type = "boolean";
  value: boolean;

  toString() {
    return this.value.toString();
  }

  isTruthy() {
    return this.value;
  }
}

export class JSArray extends JSObject {
  type = "array";
  elements: JSObject[] = [];

  length() {
    return this.elements.length;
  }

  toString() {
    return `[ ${this.elements.join(", ")} ]`;
  }
}

export type BuiltInFunction = (
  thisArg: JSObject,
  ...args: JSObject[]
) => JSObject;

export class JSFunction extends JSObject {
  type = "function";
  isBuiltIn = false;
  builtInFunction: BuiltInFunction;
  body: Statement;
  parameters: Parameter[] = [];

  toString() {
    return "TODO: function string";
  }
}
