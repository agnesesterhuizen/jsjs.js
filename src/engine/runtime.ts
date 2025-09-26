import { Parameter, Program, Statement } from "../ast.ts";
import { Logger } from "./engine.ts";
import { Interpreter } from "./interpreter.ts";
import { createArrayConstructor } from "./intrinsics/constructor/Array.ts";
import { createMathConstructor } from "./intrinsics/constructor/Math.ts";
import { createObjectConstructor } from "./intrinsics/constructor/Object.ts";
import { createArrayPrototype } from "./intrinsics/prototype/Array.ts";
import { createFunctionPrototype } from "./intrinsics/prototype/Function.ts";
import { createObjectPrototype } from "./intrinsics/prototype/Object.ts";
import {
  JSObject,
  JSUndefined,
  JSNumber,
  JSString,
  JSBoolean,
  JSFunction,
  BuiltInFunction,
  JSArray,
} from "./objects.ts";

export class Runtime {
  intrinsics: Record<string, JSObject> = {};
  interpreter: Interpreter;

  scope = 0;
  scopes: Record<string, JSObject>[] = [];

  logger: Logger = console.log;

  constructor(logger: Logger = console.log) {
    this.logger = logger;
    this.interpreter = new Interpreter(this);

    // object
    const objectPrototype = createObjectPrototype(this);
    const objectConstructor = createObjectConstructor(this);
    objectConstructor.properties["prototype"] = objectPrototype;

    this.intrinsics["ObjectPrototype"] = objectPrototype;
    this.intrinsics["Object"] = objectConstructor;

    // array
    const arrayPrototype = createArrayPrototype(this);
    const arrayConstructor = createArrayConstructor(this);
    arrayConstructor.properties["prototype"] = arrayPrototype;

    this.intrinsics["ArrayPrototype"] = arrayPrototype;
    this.intrinsics["Array"] = arrayConstructor;

    // function
    const functionPrototype = createFunctionPrototype(this);
    functionPrototype.prototype = objectPrototype;
    const functionConstructor = new JSFunction();
    functionConstructor.prototype = functionPrototype;
    functionConstructor.properties["prototype"] = functionPrototype;
    functionPrototype.properties["constructor"] = functionConstructor;

    this.intrinsics["FunctionPrototype"] = functionPrototype;
    this.intrinsics["Function"] = functionConstructor;

    // other
    const mathConstructor = createMathConstructor(this);

    const global = {
      Object: objectConstructor,
      Array: arrayConstructor,
      Function: functionConstructor,
      Math: mathConstructor,

      console: this.newObject({
        log: this.newBuiltinFunction((_, ...args: JSObject[]) => {
          this.logger(...args.map((a) => a.toString()));
          return this.newUndefined();
        }),
      }),
    };

    this.scopes.push(global);
  }

  //#region type factories

  newUndefined(): JSUndefined {
    return new JSUndefined();
  }

  newNumber(value: number): JSNumber {
    const object = new JSNumber();
    object.value = value;
    return object;
  }

  newString(value: string): JSString {
    return new JSString(value);
  }

  newBoolean(value: boolean): JSBoolean {
    const object = new JSBoolean();
    object.value = value;
    return object;
  }

  newFunction(parameters: Parameter[], body: Statement): JSFunction {
    const object = new JSFunction();
    object.parameters = parameters;
    object.body = body;

    const proto = this.intrinsics["FunctionPrototype"];
    if (proto && proto.type === "object") {
      object.prototype = proto as JSObject;
    }

    return object;
  }

  newBuiltinFunction(func: BuiltInFunction): JSFunction {
    const object = new JSFunction();
    object.isBuiltIn = true;
    object.builtInFunction = func;

    const proto = this.intrinsics["FunctionPrototype"];
    if (proto && proto.type === "object") {
      object.prototype = proto as JSObject;
    }

    return object;
  }

  newObject(properties: Record<string, JSObject> = {}): JSObject {
    const object = new JSObject();
    object.properties = properties;
    const proto = this.intrinsics["ObjectPrototype"];
    if (proto && proto.type === "object") {
      object.prototype = proto as JSObject;
    }
    return object;
  }

  newArray(elements: JSObject[]): JSArray {
    const array = new JSArray();
    array.elements = elements;
    array.prototype = this.intrinsics["ArrayPrototype"] as JSObject;
    return array;
  }

  //#endregion type factories

  pushScope() {
    this.scopes.push({});
    this.scope++;
  }

  popScope() {
    this.scopes.pop();
    this.scope--;
  }

  declareVariable(name: string, value: JSObject) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }

  setVariable(name: string, value: JSObject) {
    const scope = this.scopes[this.scope];
    scope[name] = value;
  }

  lookupVariable(name: string) {
    let index = this.scope;

    while (index >= 0) {
      const scope = this.scopes[index];

      if (name in scope) {
        return scope[name];
      }

      index--;
    }

    return this.newUndefined();
  }

  run(program: Program) {
    this.interpreter.run(program);
  }

  getProperty(object: JSObject, property: string): JSObject {
    if (object.type === "array") {
      const arr = object as unknown as JSArray;

      if (property === "length") {
        return this.newNumber(arr.elements.length);
      }

      // check if array index
      const n = parseInt(property, 10);
      if (!isNaN(n)) {
        return arr.elements[n] || this.newUndefined();
      }
    }

    let current: JSObject | null = object as JSObject;

    while (current) {
      if (current.properties[property]) {
        return current.properties[property];
      }
      current = current.prototype;
    }

    return this.newUndefined();
  }

  setProperty(object: JSObject, property: string, value: JSObject) {
    if (object.type === "array") {
      const arr = object as unknown as JSArray;

      // check if array index
      const n = parseInt(property, 10);
      if (!isNaN(n)) {
        arr.elements[n] = value;
        return value;
      }
    }

    object.properties[property] = value;
  }

  construct(constructor: JSFunction, args: JSObject[]): JSObject {
    const obj = new JSObject();
    const proto = constructor.properties["prototype"] as JSObject | undefined;
    obj.prototype = proto || (this.intrinsics["ObjectPrototype"] as JSObject);

    const result = this.interpreter.call(obj, constructor, args);

    if (
      result &&
      (result.type === "object" ||
        result.type === "function" ||
        result.type === "array")
    ) {
      return result as JSObject;
    }
    return obj;
  }
}
