import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import { JSObject, JSSymbol } from "../../objects.ts";

const expectSymbol = (runtime: Runtime, value: JSObject): JSSymbol => {
  if (value.type !== "symbol") {
    throw typeError(
      "Symbol.prototype method called on incompatible receiver",
      null
    );
  }

  return value as JSSymbol;
};

export const createSymbolPrototype = (runtime: Runtime): JSObject => {
  const symbolProto = new JSObject();

  const objectPrototype = runtime.intrinsics["ObjectPrototype"] as
    | JSObject
    | undefined;
  if (objectPrototype) {
    symbolProto.prototype = objectPrototype;
  }

  symbolProto.properties["toString"] = runtime.newBuiltinFunction((thisArg) => {
    const symbol = expectSymbol(runtime, thisArg);
    return runtime.newString(symbol.toString());
  });

  symbolProto.properties["valueOf"] = runtime.newBuiltinFunction((thisArg) => {
    const symbol = expectSymbol(runtime, thisArg);
    return symbol;
  });

  return symbolProto;
};
