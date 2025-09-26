import { typeError } from "../../interpreter.ts";
import { Runtime } from "../../runtime.ts";
import { JSFunction, JSObject } from "../../objects.ts";

export const createObjectConstructor = (runtime: Runtime): JSFunction => {
  const objectConstructor = new JSFunction();

  objectConstructor.properties["keys"] = runtime.newBuiltinFunction(
    (_, obj: JSObject) => {
      const keys = runtime.newArray([]);
      keys.elements = Object.keys(obj.properties).map((prop) =>
        runtime.newString(prop)
      );

      return keys;
    }
  );

  objectConstructor.properties["values"] = runtime.newBuiltinFunction(
    (_, obj: JSObject) => {
      const values = runtime.newArray([]);
      values.elements = Object.values(obj.properties);
      return values;
    }
  );

  objectConstructor.properties["entries"] = runtime.newBuiltinFunction(
    (_, obj: JSObject) => {
      const entries = runtime.newArray([]);
      entries.elements = Object.entries(obj.properties).map(([key, value]) =>
        runtime.newArray([runtime.newString(key), value])
      );
      return entries;
    }
  );

  objectConstructor.properties["create"] = runtime.newBuiltinFunction(
    (_, proto?: JSObject, properties?: JSObject) => {
      let baseProto = proto;

      if (!baseProto || baseProto.type === "undefined") {
        baseProto = runtime.intrinsics["ObjectPrototype"] as JSObject;
      }

      if (baseProto.type !== "object" && baseProto.type !== "function") {
        throw typeError("Object.create prototype must be an object", null);
      }

      const newObj = runtime.newObject();
      newObj.prototype = baseProto as JSObject;

      if (properties && properties.type === "object") {
        for (const [key, value] of Object.entries(properties.properties)) {
          newObj.properties[key] = value;
        }
      }

      return newObj;
    }
  );

  objectConstructor.properties["getPrototypeOf"] = runtime.newBuiltinFunction(
    (_, obj: JSObject) => {
      if (
        obj.type !== "object" &&
        obj.type !== "function" &&
        obj.type !== "array"
      ) {
        throw typeError("Object.getPrototypeOf called on non-object", null);
      }

      const proto = obj.prototype;
      return proto ?? runtime.newUndefined();
    }
  );

  objectConstructor.properties["assign"] = runtime.newBuiltinFunction(
    (_, target: JSObject, ...sources: JSObject[]) => {
      for (const source of sources) {
        for (const [key, value] of Object.entries(source.properties)) {
          target.properties[key] = value;
        }
      }
      return target;
    }
  );

  return objectConstructor;
};
