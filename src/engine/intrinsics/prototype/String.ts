import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import { JSNumber, JSObject, JSString } from "../../objects.ts";

export const createStringPrototype = (runtime: Runtime): JSObject => {
  const stringProto = new JSObject();

  const objectPrototype = runtime.intrinsics["ObjectPrototype"] as
    | JSObject
    | undefined;
  if (objectPrototype) {
    stringProto.prototype = objectPrototype;
  }

  stringProto.properties["charCodeAt"] = runtime.newBuiltinFunction(
    (thisArg: JSObject, position?: JSObject) => {
      if (thisArg.type !== "string") {
        throw typeError(
          "String.prototype.charCodeAt called on incompatible receiver",
          null
        );
      }

      const str = thisArg as JSString;

      let index = 0;
      if (position && position.type === "number") {
        index = Math.floor((position as JSNumber).value);
      }

      if (index < 0 || index >= str.value.length) {
        return runtime.newNumber(NaN);
      }

      const code = str.value.charCodeAt(index);
      return runtime.newNumber(code);
    }
  );

  const iteratorSymbol = runtime.getWellKnownSymbol("iterator");
  runtime.setProperty(
    stringProto,
    iteratorSymbol,
    runtime.newBuiltinFunction((thisArg: JSObject) => {
      if (thisArg.type !== "string") {
        throw typeError(
          "String iterator called on incompatible receiver",
          null
        );
      }

      const str = thisArg as JSString;
      let index = 0;

      const iterator = runtime.newObject();
      const next = runtime.newBuiltinFunction((_nextThis: JSObject) => {
        if (index < str.value.length) {
          const value = runtime.newString(str.value[index] ?? "");
          index += 1;
          return runtime.newObject({
            value,
            done: runtime.newBoolean(false),
          });
        }

        return runtime.newObject({
          value: runtime.newUndefined(),
          done: runtime.newBoolean(true),
        });
      });

      iterator.properties["next"] = next;

      return iterator;
    })
  );

  return stringProto;
};
