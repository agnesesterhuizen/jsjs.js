import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import {
  JSArray,
  JSFunction,
  JSNumber,
  JSObject,
  JSString,
} from "../../objects.ts";

export const createArrayPrototype = (runtime: Runtime): JSObject => {
  // create Array.prototype
  const arrayProto = new JSObject();

  // add methods
  arrayProto.properties["forEach"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, callback: JSFunction) => {
      if (callback.type !== "function") {
        throw typeError("Array.prototype.forEach expects a function", null);
      }

      for (let i = 0; i < thisArg.elements.length; i++) {
        const element = thisArg.elements[i];

        // element, index, array
        const args = [element, runtime.newNumber(i), thisArg];

        runtime.interpreter.call(thisArg, callback, args);
      }

      return runtime.newUndefined();
    }
  );

  arrayProto.properties["indexOf"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, searchElement: JSObject, fromIndex?: JSNumber) => {
      const startIndex =
        fromIndex && fromIndex.type === "number" ? fromIndex.value : 0;

      for (let i = startIndex; i < thisArg.elements.length; i++) {
        if (thisArg.elements[i].toString() === searchElement.toString()) {
          return runtime.newNumber(i);
        }
      }

      return runtime.newNumber(-1);
    }
  );

  arrayProto.properties["map"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, callback: JSFunction, thisArgOverride?: JSObject) => {
      if (callback.type !== "function") {
        throw typeError("Array.prototype.map expects a function", null);
      }

      const resultElements: JSObject[] = [];
      const callbackThis = thisArgOverride ?? thisArg;

      for (let i = 0; i < thisArg.elements.length; i++) {
        const element = thisArg.elements[i] ?? runtime.newUndefined();
        const args = [element, runtime.newNumber(i), thisArg];
        const mapped = runtime.interpreter.call(callbackThis, callback, args);
        resultElements.push(mapped);
      }

      return runtime.newArray(resultElements);
    }
  );

  arrayProto.properties["push"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, ...args: JSObject[]) => {
      thisArg.elements.push(...args);
      return runtime.newNumber(thisArg.elements.length);
    }
  );

  arrayProto.properties["pop"] = runtime.newBuiltinFunction(
    (thisArg: JSArray) => {
      const value = thisArg.elements.pop();
      return value || runtime.newUndefined();
    }
  );

  arrayProto.properties["shift"] = runtime.newBuiltinFunction(
    (thisArg: JSArray) => {
      const value = thisArg.elements.shift();
      return value || runtime.newUndefined();
    }
  );

  arrayProto.properties["unshift"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, ...args: JSObject[]) => {
      thisArg.elements.unshift(...args);
      return runtime.newNumber(thisArg.elements.length);
    }
  );

  arrayProto.properties["splice"] = runtime.newBuiltinFunction(
    (
      thisArg: JSArray,
      start: JSNumber,
      deleteCount: JSNumber,
      ...items: JSObject[]
    ) => {
      if (start.type !== "number" || deleteCount.type !== "number") {
        throw typeError("Array.prototype.splice expects numbers", null);
      }

      const removed = thisArg.elements.splice(
        start.value,
        deleteCount.value,
        ...items
      );
      return runtime.newArray(removed);
    }
  );

  arrayProto.properties["slice"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, begin?: JSObject, end?: JSObject) => {
      const startIndex =
        begin && begin.type === "number" ? (begin as JSNumber).value : 0;

      const endIndex =
        end && end.type === "number" ? (end as JSNumber).value : undefined;

      const sliced = thisArg.elements.slice(startIndex, endIndex);
      return runtime.newArray(sliced);
    }
  );

  arrayProto.properties["concat"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, ...args: JSObject[]) => {
      const newElements = [...thisArg.elements];

      for (const arg of args) {
        if (arg.type === "array") {
          newElements.push(...(arg as JSArray).elements);
        } else {
          newElements.push(arg);
        }
      }

      return runtime.newArray(newElements);
    }
  );

  arrayProto.properties["join"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, separator?: JSString) => {
      const sep =
        separator && separator.type === "string" ? separator.value : ",";
      return runtime.newString(
        thisArg.elements.map((e) => e.toString()).join(sep)
      );
    }
  );

  arrayProto.properties["reverse"] = runtime.newBuiltinFunction(
    (thisArg: JSArray) => {
      thisArg.elements.reverse();
      return thisArg;
    }
  );

  arrayProto.properties["includes"] = runtime.newBuiltinFunction(
    (thisArg: JSArray, searchElement: JSObject, fromIndex?: JSNumber) => {
      const startIndex =
        fromIndex && fromIndex.type === "number" ? fromIndex.value : 0;

      for (let i = startIndex; i < thisArg.elements.length; i++) {
        if (thisArg.elements[i].toString() === searchElement.toString()) {
          return runtime.newBoolean(true);
        }
      }

      return runtime.newBoolean(false);
    }
  );

  return arrayProto;
};
