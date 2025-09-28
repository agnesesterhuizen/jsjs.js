import { Statement, Parameter } from "../parser/ast.ts";

type ObjectType =
  | "array"
  | "boolean"
  | "function"
  | "null"
  | "number"
  | "object"
  | "regex"
  | "string"
  | "symbol"
  | "map"
  | "undefined";

export class JSObject {
  type: ObjectType = "object";
  properties: Record<string, JSObject> = {};
  symbolProperties: Map<string, { key: JSSymbol; value: JSObject }> = new Map();

  prototype: JSObject | null = null;

  toString() {
    const out: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.properties)) {
      out[key] = value.toString();
    }

    if (this.symbolProperties.size > 0) {
      for (const { key, value } of this.symbolProperties.values()) {
        out[`[${key.toString()}]`] = value.toString();
      }
    }

    return JSON.stringify(out, null, 2);
  }

  isTruthy() {
    return true;
  }

  typeOf() {
    return "object";
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

  typeOf() {
    return "undefined";
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

  typeOf() {
    return "number";
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

  typeOf() {
    return "string";
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

  typeOf() {
    return "boolean";
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

  typeOf() {
    return "function";
  }
}

export class JSRegExp extends JSObject {
  type: ObjectType = "regex";
  pattern: string;
  flags: string;
  value: RegExp;
  lastIndex = 0;

  constructor(pattern: string, flags: string) {
    super();
    this.pattern = pattern;
    this.flags = flags;
    this.value = new RegExp(pattern, flags);
  }

  toString() {
    return `/${this.pattern}/${this.flags}`;
  }

  typeOf() {
    return "object";
  }
}

export class JSSymbol extends JSObject {
  type: ObjectType = "symbol";
  id: string;
  description?: string;
  registryKey?: string;

  constructor(id: string, description?: string) {
    super();
    this.id = id;
    this.description = description;
  }

  toString() {
    return `Symbol(${this.description ? this.description : ""})`;
  }

  typeOf() {
    return "symbol";
  }
}

export class JSMap extends JSObject {
  type: ObjectType = "map";

  entries: Map<JSObject, JSObject> = new Map();

  constructor() {
    super();
  }

  toString() {
    return `Map(${this.entries.size} entries)`;
  }

  typeOf() {
    return "map";
  }
}
