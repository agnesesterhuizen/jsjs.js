import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import { JSFunction, JSNumber, JSObject } from "../../objects.ts";

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

  return arrayConstructor as JSFunction;
};
