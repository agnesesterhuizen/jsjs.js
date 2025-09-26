import { Runtime } from "../../runtime.ts";
import { JSFunction } from "../../objects.ts";

export const createArrayConstructor = (runtime: Runtime): JSFunction => {
  return new JSFunction();
};
