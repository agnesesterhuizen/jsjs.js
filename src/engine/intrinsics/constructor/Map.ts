import { Runtime } from "../../runtime.ts";
import { JSArray, JSFunction, JSMap, JSObject } from "../../objects.ts";
import { todo } from "../../interpreter.ts";

export const createMapConstructor = (runtime: Runtime): JSFunction => {
  const mapConstructor = runtime.newBuiltinFunction(
    (_thisArg: JSObject, ...args: JSObject[]) => {
      const map = runtime.newMap();

      // TODO: the arg can be an iterable of entries

      const entries = args[0];

      if (args.length === 0) {
        return map;
      }

      if (entries.type === "array") {
        const arr = entries as JSArray;
        for (const entry of arr.elements) {
          if (entry.type !== "array") {
            throw todo("Map constructor with non-array entry", null);
          }

          const entryTuple = entry as JSArray;

          if (entryTuple.type === "array" && entryTuple.elements.length === 2) {
            const [key, value] = entryTuple.elements;
            map.entries.set(key, value);
          }
        }
      }

      return map;
    }
  );

  return mapConstructor;
};
