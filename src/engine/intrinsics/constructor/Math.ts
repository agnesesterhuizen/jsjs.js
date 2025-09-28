import { JSFunction, JSNumber, JSObject } from "../../objects.ts";
import { Runtime } from "../../runtime.ts";

export const createMathConstructor = (runtime: Runtime) => {
  const mathConstructor = new JSFunction();

  mathConstructor.properties["random"] = runtime.newBuiltinFunction(() => {
    return runtime.newNumber(Math.random());
  });

  mathConstructor.properties["floor"] = runtime.newBuiltinFunction(
    (_: JSObject, x: JSNumber) => {
      if (x.type !== "number") {
        throw "Math.floor expects a number";
      }
      return runtime.newNumber(Math.floor(x.value));
    }
  );

  mathConstructor.properties["abs"] = runtime.newBuiltinFunction(
    (_: JSObject, x: JSNumber) => {
      if (x.type !== "number") {
        throw "Math.abs expects a number";
      }
      return runtime.newNumber(Math.abs(x.value));
    }
  );

  mathConstructor.properties["round"] = runtime.newBuiltinFunction(
    (_: JSObject, x: JSNumber) => {
      if (x.type !== "number") {
        throw "Math.round expects a number";
      }
      return runtime.newNumber(Math.round(x.value));
    }
  );

  mathConstructor.properties["max"] = runtime.newBuiltinFunction(
    (_: JSObject, ...args: JSObject[]) => {
      if (args.length === 0) return runtime.newNumber(-Infinity);
      let max = -Infinity;
      for (const arg of args) {
        if (arg.type !== "number") {
          throw "Math.max expects only numbers";
        }
        if ((arg as JSNumber).value > max) {
          max = (arg as JSNumber).value;
        }
      }
      return runtime.newNumber(max);
    }
  );

  return mathConstructor;
};
