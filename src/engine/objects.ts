import { Statement, Parameter } from "../ast.ts";

type ObjectType =
  | "array"
  | "boolean"
  | "function"
  | "null"
  | "number"
  | "object"
  | "string"
  | "undefined";

export class JSObject {
  type: ObjectType = "object";
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
  type: ObjectType = "undefined";

  toString() {
    return "undefined";
  }

  isTruthy() {
    return false;
  }
}

export class JSNull extends JSObject {
  type: ObjectType = "null";

  toString() {
    return "null";
  }

  isTruthy() {
    return false;
  }
}

export class JSNumber extends JSObject {
  type: ObjectType = "number";
  value: number;

  toString() {
    return this.value.toString();
  }

  isTruthy() {
    return this.value !== 0 && !Number.isNaN(this.value);
  }
}

export class JSString extends JSObject {
  type: ObjectType = "string";
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
  type: ObjectType = "boolean";
  value: boolean;

  toString() {
    return this.value.toString();
  }

  isTruthy() {
    return this.value;
  }
}

export class JSArray extends JSObject {
  type: ObjectType = "array";
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
  type: ObjectType = "function";
  isBuiltIn = false;
  builtInFunction: BuiltInFunction;
  body: Statement;
  parameters: Parameter[] = [];

  toString() {
    return "TODO: function string";
  }
}
