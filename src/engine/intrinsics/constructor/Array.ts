import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import { JSArray, JSFunction, JSNumber, JSObject } from "../../objects.ts";

export const createArrayConstructor = (runtime: Runtime): JSFunction => {
  const arrayConstructor = runtime.newBuiltinFunction(
    (_thisArg: JSObject, ...args: JSObject[]) => {
      const array = runtime.newArray([]);

      if (args.length === 0) {
        return array;
      }

      const firstArg = args[0];

      if (args.length === 1 && firstArg.type === "number") {
        const length = (firstArg as JSNumber).value;

        if (!Number.isFinite(length) || length < 0 || Math.floor(length) !== length) {
          throw typeError("Invalid array length", null);
        }

        for (let i = 0; i < length; i++) {
          array.elements.push(runtime.newUndefined());
        }

        return array;
      }

      array.elements = args;
      return array;
    }
  );

  arrayConstructor.properties["from"] = runtime.newBuiltinFunction(
    (
      _thisArg: JSObject,
      arrayLike: JSObject,
      mapFn?: JSFunction,
      thisArg?: JSObject
    ) => {
      if (arrayLike.type !== "array") {
        throw new TypeError("Array.from expects an array");
      }

      const sourceArray = arrayLike as JSArray;
      const resultElements: JSObject[] = [];

      const hasMapFn = mapFn && mapFn.type === "function";

      for (let index = 0; index < sourceArray.elements.length; index++) {
        let value = sourceArray.elements[index] ?? runtime.newUndefined();

        if (hasMapFn) {
          value = runtime.interpreter.call(
            thisArg ?? runtime.newUndefined(),
            mapFn as JSFunction,
            [value, runtime.newNumber(index)]
          );
        }

        resultElements.push(value);
      }

      return runtime.newArray(resultElements);
    }
  );

  return arrayConstructor as JSFunction;
};
