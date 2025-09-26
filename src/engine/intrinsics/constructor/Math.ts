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

  return mathConstructor;
};
