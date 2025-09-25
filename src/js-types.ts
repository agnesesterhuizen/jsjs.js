// @ts-nocheck: TODO: revisit this file, lots of TS errors

import { Statement, Parameter } from "./ast.ts";
import { Option } from "./types.ts";

export class JSObject {
  type = "object";
  properties: Record<string, JSValue> = {};

  getProperty(property: JSValue): JSValue {
    if (this.type === "array" && property.type === "number") {
      return (this as unknown as JSArray).elements[
        (property as JSNumber).value
      ];
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
    const object = new JSString();
    object.value = value;
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
    object.body = Option.some(body);
    return object;
  }

  static builtinFunction(func: BuiltInFunction) {
    const object = new JSFunction();
    object.isBuiltIn = true;
    object.builtInFunction = Option.some(func);
    return object;
  }

  static object(properties: Record<string, JSValue>) {
    const object = new JSObject();
    object.properties = properties;
    return object;
  }

  static array(elements: JSValue[]) {
    const object = new JSArray();
    object.elements = elements;
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

  toString() {
    return this.elements.toString();
  }
}

type BuiltInFunction = (...args: JSValue[]) => JSValue;

export class JSFunction extends JSObject {
  type = "function";
  isBuiltIn = false;
  builtInFunction: Option<BuiltInFunction> = Option.none();
  body: Option<Statement> = Option.none();
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
