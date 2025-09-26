import { JSFunction, JSObject } from "../../objects.ts";
import { Runtime } from "../../runtime.ts";

export const createFunctionPrototype = (runtime: Runtime) => {
  const functionPrototype = new JSObject();

  const callFunction = runtime.newBuiltinFunction((thisArg, ...args) => {
    const fn = thisArg as JSFunction;
    const thisVal = args[0] ?? runtime.newUndefined();
    const callArgs = args.slice(1);
    return runtime.interpreter.call(thisVal, fn, callArgs);
  });

  callFunction.prototype = functionPrototype;
  functionPrototype.properties["call"] = callFunction;

  return functionPrototype;
};
