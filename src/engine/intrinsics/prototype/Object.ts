import { Runtime } from "../../runtime.ts";
import { JSObject } from "../../objects.ts";

export const createObjectPrototype = (_runtime: Runtime): JSObject => {
  const objProto = new JSObject();

  return objProto;
};
