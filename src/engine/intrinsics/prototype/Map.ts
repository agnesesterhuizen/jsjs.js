import { todo } from "../../interpreter.ts";
import { JSMap, JSObject, JSString } from "../../objects.ts";
import { Runtime } from "../../runtime.ts";

export const createMapPrototype = (runtime: Runtime): JSObject => {
  const MapPrototype = new JSObject();

  const objectPrototype = runtime.intrinsics["ObjectPrototype"] as
    | JSObject
    | undefined;
  if (objectPrototype) {
    MapPrototype.prototype = objectPrototype;
  }

  const deleteStringEntry = (map: JSMap, key: JSString) => {
    const keyVal = key.value;

    for (const k of map.entries.keys()) {
      if (k.type !== "string") continue;

      if ((k as JSString).value === keyVal) {
        map.entries.delete(k);
        return true;
      }
    }

    return false;
  };

  const findStringEntry = (map: JSMap, key: JSString): JSObject => {
    const keyVal = key.value;

    let result = runtime.newUndefined();

    for (const [k, v] of map.entries) {
      if (k.type !== "string") continue;

      if ((k as JSString).value === keyVal) {
        result = v;
        break;
      }
    }

    return result;
  };

  const setStringEntry = (map: JSMap, keyObject: JSString, value: JSObject) => {
    const keyVal = keyObject.value;

    let wasFound = false;

    // try update entry if it exists
    for (const k of map.entries.keys()) {
      if (k.type !== "string") continue;

      if ((k as JSString).value === keyVal) {
        map.entries.set(k, value);
        wasFound = true;
        break;
      }
    }

    // else add new entry
    if (!wasFound) {
      map.entries.set(keyObject, value);
    }
  };

  MapPrototype.properties["get"] = runtime.newBuiltinFunction(
    (thisArg: JSMap, key: JSObject) => {
      if (key.type !== "string") {
        throw todo("non string map keys", null);
      }

      return findStringEntry(thisArg, key as JSString);
    }
  );

  MapPrototype.properties["set"] = runtime.newBuiltinFunction(
    (thisArg: JSMap, key: JSObject, value: JSObject) => {
      if (key.type !== "string") {
        throw todo("non string map keys", null);
      }

      setStringEntry(thisArg, key as JSString, value);

      return thisArg;
    }
  );

  MapPrototype.properties["has"] = runtime.newBuiltinFunction(
    (thisArg: JSMap, key: JSObject) => {
      if (key.type !== "string") {
        throw todo("non string map keys", null);
      }

      const entry = findStringEntry(thisArg, key as JSString);

      return runtime.newBoolean(entry.type !== "undefined");
    }
  );

  MapPrototype.properties["delete"] = runtime.newBuiltinFunction(
    (thisArg: JSMap, key: JSObject) => {
      if (key.type !== "string") {
        throw todo("non string map keys", null);
      }

      return runtime.newBoolean(deleteStringEntry(thisArg, key as JSString));
    }
  );

  MapPrototype.properties["clear"] = runtime.newBuiltinFunction(
    (thisArg: JSMap) => {
      thisArg.entries.clear();
      return runtime.newUndefined();
    }
  );

  return MapPrototype;
};
