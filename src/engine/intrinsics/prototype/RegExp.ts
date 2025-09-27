import { Runtime } from "../../runtime.ts";
import { JSObject, JSRegExp } from "../../objects.ts";

export const createRegExpPrototype = (runtime: Runtime): JSObject => {
  const regexpPrototype = new JSObject();

  const objectPrototype = runtime.intrinsics["ObjectPrototype"] as
    | JSObject
    | undefined;
  if (objectPrototype) {
    regexpPrototype.prototype = objectPrototype;
  }

  const ensureRegex = (thisArg: JSObject): JSRegExp | null => {
    if (thisArg.type !== "regex") {
      return null;
    }
    return thisArg as JSRegExp;
  };

  regexpPrototype.properties["test"] = runtime.newBuiltinFunction(
    (thisArg, ...args: JSObject[]) => {
      const regex = ensureRegex(thisArg);
      if (!regex) {
        return runtime.newUndefined();
      }

      const text = args[0] ? args[0].toString() : "";

      regex.value.lastIndex = regex.lastIndex;
      const result = regex.value.test(text);
      regex.lastIndex = regex.value.lastIndex;
      runtime.setProperty(
        regex,
        "lastIndex",
        runtime.newNumber(regex.lastIndex)
      );

      return runtime.newBoolean(result);
    }
  );

  regexpPrototype.properties["exec"] = runtime.newBuiltinFunction(
    (thisArg, ...args: JSObject[]) => {
      const regex = ensureRegex(thisArg);
      if (!regex) {
        return runtime.newUndefined();
      }

      const text = args[0] ? args[0].toString() : "";

      regex.value.lastIndex = regex.lastIndex;
      const match = regex.value.exec(text);
      regex.lastIndex = regex.value.lastIndex;
      runtime.setProperty(
        regex,
        "lastIndex",
        runtime.newNumber(regex.lastIndex)
      );

      if (!match) {
        return runtime.newNull();
      }

      const elements = match.map((m) =>
        runtime.newString(m !== undefined ? m : "")
      );
      const resultArray = runtime.newArray(elements);
      runtime.setProperty(resultArray, "index", runtime.newNumber(match.index));
      runtime.setProperty(resultArray, "input", runtime.newString(match.input));

      if (match.groups) {
        const groups: Record<string, JSObject> = {};
        for (const [key, value] of Object.entries(match.groups)) {
          groups[key] =
            value === undefined
              ? runtime.newUndefined()
              : runtime.newString(value);
        }
        runtime.setProperty(resultArray, "groups", runtime.newObject(groups));
      }

      return resultArray;
    }
  );

  regexpPrototype.properties["toString"] = runtime.newBuiltinFunction(
    (thisArg) => {
      const regex = ensureRegex(thisArg);
      if (!regex) {
        return runtime.newString("[object Object]");
      }
      return runtime.newString(regex.toString());
    }
  );

  return regexpPrototype;
};
