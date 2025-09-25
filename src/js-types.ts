import { Statement, Parameter } from "./ast.ts";
import { Interpreter, typeError } from "./interpreter.ts";

export class JSObject {
  type = "object";
  properties: Record<string, JSValue> = {};

  getProperty(property: JSValue): JSValue {
    if (this.type === "array") {
      if (property.type === "number") {
        return (this as unknown as JSArray).elements[
          (property as JSNumber).value
        ];
      }

      if (
        property.type === "string" &&
        (property as JSString).value === "length"
      ) {
        const length = (this as unknown as JSArray).length();
        return JSObject.number(length);
      }
    }

    const propertyName = property.toString();

    if (!this.properties[propertyName]) {
      return JSObject.undefined();
    }

    return this.properties[propertyName];
  }

  setProperty(property: JSValue, value: JSValue) {
    if (this.type === "array" && property.type === "number") {
      (this as unknown as JSArray).elements[(property as JSNumber).value] =
        value;
      return;
    }

    const propertyName = property.toString();
    this.properties[propertyName] = value;
  }

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

  //#region type factory methods

  static undefined() {
    return new JSUndefined();
  }

  static number(value: number) {
    const object = new JSNumber();
    object.value = value;
    return object;
  }

  static string(value: string) {
    const object = new JSString(value);
    return object;
  }

  static boolean(value: boolean) {
    const object = new JSBoolean();
    object.value = value;
    return object;
  }

  static func(parameters: Parameter[], body: Statement) {
    const object = new JSFunction();
    object.parameters = parameters;
    object.body = body;
    return object;
  }

  static builtinFunction(func: BuiltInFunction) {
    const object = new JSFunction();
    object.isBuiltIn = true;
    object.builtInFunction = func;
    return object;
  }

  static object(properties: Record<string, JSValue>) {
    const object = new JSObject();
    object.properties = properties;
    return object;
  }

  static array(interpreter: Interpreter, elements: JSValue[]) {
    const object = new JSArray();
    object.elements = elements;
    object.interpreter = interpreter;
    return object;
  }

  //#endregion
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
  elements: JSValue[] = [];

  // horrible, I swear I'll fix this
  interpreter: Interpreter;

  constructor() {
    super();

    this.properties["indexOf"] = JSObject.builtinFunction(
      (searchElement: JSValue, fromIndex?: JSNumber) => {
        const startIndex =
          fromIndex && fromIndex.type === "number" ? fromIndex.value : 0;

        for (let i = startIndex; i < this.elements.length; i++) {
          if (this.elements[i].toString() === searchElement.toString()) {
            return JSObject.number(i);
          }
        }

        return JSObject.number(-1);
      }
    );

    this.properties["push"] = JSObject.builtinFunction((...args: JSValue[]) => {
      this.elements.push(...args);
      return JSObject.number(this.elements.length);
    });

    this.properties["pop"] = JSObject.builtinFunction(() => {
      const value = this.elements.pop();
      return value || JSObject.undefined();
    });

    this.properties["shift"] = JSObject.builtinFunction(() => {
      const value = this.elements.shift();
      return value || JSObject.undefined();
    });

    this.properties["unshift"] = JSObject.builtinFunction(
      (...args: JSValue[]) => {
        this.elements.unshift(...args);
        return JSObject.number(this.elements.length);
      }
    );

    this.properties["splice"] = JSObject.builtinFunction(
      (start: JSNumber, deleteCount: JSNumber, ...items: JSValue[]) => {
        if (start.type !== "number" || deleteCount.type !== "number") {
          throw typeError("Array.prototype.splice expects numbers", null);
        }

        const removed = this.elements.splice(
          start.value,
          deleteCount.value,
          ...items
        );
        return JSObject.array(this.interpreter, removed);
      }
    );

    this.properties["slice"] = JSObject.builtinFunction(
      (begin: JSNumber, end?: JSNumber) => {
        if (begin.type !== "number" || (end && end.type !== "number")) {
          throw typeError("Array.prototype.slice expects numbers", null);
        }

        const sliced = this.elements.slice(
          begin.value,
          end ? end.value : undefined
        );
        return JSObject.array(this.interpreter, sliced);
      }
    );

    this.properties["concat"] = JSObject.builtinFunction(
      (...args: JSValue[]) => {
        const newElements = [...this.elements];

        for (const arg of args) {
          if (arg.type === "array") {
            newElements.push(...(arg as JSArray).elements);
          } else {
            newElements.push(arg);
          }
        }

        return JSObject.array(this.interpreter, newElements);
      }
    );

    this.properties["join"] = JSObject.builtinFunction(
      (separator?: JSString) => {
        const sep =
          separator && separator.type === "string" ? separator.value : ",";
        return JSObject.string(
          this.elements.map((e) => e.toString()).join(sep)
        );
      }
    );

    this.properties["reverse"] = JSObject.builtinFunction(() => {
      this.elements.reverse();
      return this;
    });

    this.properties["includes"] = JSObject.builtinFunction(
      (searchElement: JSValue, fromIndex?: JSNumber) => {
        const startIndex =
          fromIndex && fromIndex.type === "number" ? fromIndex.value : 0;

        for (let i = startIndex; i < this.elements.length; i++) {
          if (this.elements[i].toString() === searchElement.toString()) {
            return JSObject.boolean(true);
          }
        }

        return JSObject.boolean(false);
      }
    );

    this.properties["forEach"] = JSObject.builtinFunction(
      (callback: JSFunction) => {
        if (callback.type !== "function") {
          throw typeError("Array.prototype.forEach expects a function", null);
        }

        for (let i = 0; i < this.elements.length; i++) {
          const element = this.elements[i];

          // element, index, array
          const args = [element, JSObject.number(i), this];

          this.interpreter.call(callback, args);
        }

        return JSObject.undefined();
      }
    );
  }

  length() {
    return this.elements.length;
  }

  toString() {
    return `[ ${this.elements.join(", ")} ]`;
  }
}

type BuiltInFunction = (...args: JSValue[]) => JSValue;

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

export type JSValue =
  | JSObject
  | JSUndefined
  | JSNumber
  | JSString
  | JSBoolean
  | JSFunction;
