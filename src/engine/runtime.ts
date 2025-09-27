import { Parameter, Program, Statement } from "../ast.ts";
import { Logger } from "./engine.ts";
import { Interpreter } from "./interpreter.ts";
import { createArrayConstructor } from "./intrinsics/constructor/Array.ts";
import { createMathConstructor } from "./intrinsics/constructor/Math.ts";
import { createObjectConstructor } from "./intrinsics/constructor/Object.ts";
import { createArrayPrototype } from "./intrinsics/prototype/Array.ts";
import { createFunctionPrototype } from "./intrinsics/prototype/Function.ts";
import { createObjectPrototype } from "./intrinsics/prototype/Object.ts";
import { createStringPrototype } from "./intrinsics/prototype/String.ts";
import { createRegExpPrototype } from "./intrinsics/prototype/RegExp.ts";
import {
  JSObject,
  JSUndefined,
  JSNumber,
  JSString,
  JSBoolean,
  JSFunction,
  BuiltInFunction,
  JSArray,
  JSNull,
  JSRegExp,
} from "./objects.ts";

type Binding = {
  initialized: boolean;
  value: JSObject;
};

export class Runtime {
  intrinsics: Record<string, JSObject> = {};
  interpreter: Interpreter;

  scope = 0;
  scopes: Record<string, Binding>[] = [];

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

    // string
    const stringPrototype = createStringPrototype(this);
    this.intrinsics["StringPrototype"] = stringPrototype;

    // regexp
    const regExpPrototype = createRegExpPrototype(this);
    this.intrinsics["RegExpPrototype"] = regExpPrototype;

    // other
    const mathConstructor = createMathConstructor(this);

    const global: Record<string, Binding> = {
      Object: { initialized: true, value: objectConstructor },
      Array: { initialized: true, value: arrayConstructor },
      Function: { initialized: true, value: functionConstructor },
      Math: { initialized: true, value: mathConstructor },
      console: {
        initialized: true,
        value: this.newObject({
          log: this.newBuiltinFunction((_, ...args: JSObject[]) => {
            this.logger(...args.map((a) => a.toString()));
            return this.newUndefined();
          }),
        }),
      },
    };

    this.scopes.push(global);

    this.declareVariable("Infinity", this.newNumber(Infinity));
    this.declareVariable("NaN", this.newNumber(NaN));
    this.declareVariable("undefined", this.newUndefined());
  }

  //#region type factories

  newUndefined(): JSUndefined {
    return new JSUndefined();
  }

  newNull(): JSNull {
    return new JSNull();
  }

  newNumber(value: number): JSNumber {
    const object = new JSNumber();
    object.value = value;
    return object;
  }

  newString(value: string): JSString {
    const object = new JSString(value);
    const proto = this.intrinsics["StringPrototype"];
    if (proto && proto.type === "object") {
      object.prototype = proto as JSObject;
    }
    return object;
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

    const functionPrototype = this.newObject();
    functionPrototype.properties["constructor"] = object;
    object.properties["prototype"] = functionPrototype;

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

    const functionPrototype = this.newObject();
    functionPrototype.properties["constructor"] = object;
    object.properties["prototype"] = functionPrototype;

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

  newRegExp(pattern: string, flags: string): JSRegExp {
    const regexp = new JSRegExp(pattern, flags);
    const regexPrototype = this.intrinsics["RegExpPrototype"] as
      | JSObject
      | undefined;

    if (regexPrototype) {
      regexp.prototype = regexPrototype;
    } else {
      const objectPrototype = this.intrinsics["ObjectPrototype"] as JSObject;
      regexp.prototype = objectPrototype;
    }

    this.setProperty(regexp, "lastIndex", this.newNumber(regexp.lastIndex));

    const setBooleanProperty = (name: string, value: boolean) => {
      this.setProperty(regexp, name, this.newBoolean(value));
    };

    this.setProperty(regexp, "source", this.newString(pattern));
    this.setProperty(regexp, "flags", this.newString(flags));
    setBooleanProperty("global", regexp.value.global);
    setBooleanProperty("ignoreCase", regexp.value.ignoreCase);
    setBooleanProperty("multiline", regexp.value.multiline);
    setBooleanProperty(
      "dotAll",
      (regexp.value as RegExp & { dotAll?: boolean }).dotAll ?? false
    );
    setBooleanProperty("unicode", regexp.value.unicode);
    setBooleanProperty("sticky", regexp.value.sticky);

    return regexp;
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

  declareVariable(
    name: string,
    value: JSObject,
    kind: "var" | "let" | "const" = "var"
  ) {
    const scope = this.scopes[this.scope];

    if (kind === "var") {
      // vars can be redeclared
      if (name in scope) {
        const binding = scope[name];
        binding.value = value;
        binding.initialized = true;
      } else {
        scope[name] = { initialized: true, value };
      }
    } else if (kind === "let" || kind === "const") {
      // let and const can't be redeclared
      if (name in scope) {
        throw new SyntaxError(`Identifier '${name}' has already been declared`);
      }
      scope[name] = { initialized: false, value: this.newUndefined() };
    }
  }

  setVariable(name: string, value: JSObject) {
    let index = this.scope;
    while (index >= 0) {
      const scope = this.scopes[index];
      if (name in scope) {
        const binding = scope[name];
        if (!binding.initialized) {
          throw new ReferenceError(
            `Cannot access '${name}' before initialization`
          );
        }
        binding.value = value;
        return;
      }
      index--;
    }

    // not found, assign to global scope
    const global = this.scopes[0];
    if (!(name in global)) {
      global[name] = { initialized: true, value };
    } else {
      const binding = global[name];
      if (!binding.initialized) {
        throw new ReferenceError(
          `Cannot access '${name}' before initialization`
        );
      }
      binding.value = value;
    }
  }

  lookupBinding(name: string): Binding {
    let index = this.scope;
    while (index >= 0) {
      const scope = this.scopes[index];
      if (name in scope) {
        return scope[name];
      }
      index--;
    }

    return null;
  }

  lookupVariable(name: string): JSObject {
    let index = this.scope;
    while (index >= 0) {
      const scope = this.scopes[index];
      if (name in scope) {
        const binding = scope[name];
        if (!binding.initialized) {
          throw new ReferenceError(
            `Cannot access '${name}' before initialization`
          );
        }
        return binding.value;
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

    if (object.type === "string") {
      const str = object as unknown as JSString;

      if (property === "length") {
        return this.newNumber(str.value.length);
      }

      // check if string index
      const n = parseInt(property, 10);
      if (!isNaN(n)) {
        return this.newString(str.value[n]);
      }
    }

    let current: JSObject | null = object as JSObject;

    while (current) {
      if (Object.prototype.hasOwnProperty.call(current.properties, property)) {
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

    if (object.type === "regex" && property === "lastIndex") {
      const regex = object as JSRegExp;
      if (value.type === "number") {
        const num = value as JSNumber;
        regex.lastIndex = num.value;
        regex.value.lastIndex = num.value;
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
