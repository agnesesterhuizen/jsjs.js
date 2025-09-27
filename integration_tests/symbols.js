console.log("symbols start");

const localA = Symbol("local");
const localB = Symbol("local");
console.log(typeof localA);
console.log(localA === localB);

const globalA = Symbol.for("shared");
const globalB = Symbol.for("shared");
console.log(globalA === globalB);
console.log(Symbol.keyFor(globalA));

const notRegistered = Symbol("anon");
console.log(Symbol.keyFor(notRegistered));

const box = {};
box[localA] = "localValue";
box[localB] = "localValueB";
box[globalA] = "globalValue";
console.log(box[localA]);
console.log(box[localB]);
console.log(box[Symbol.for("shared")]);
console.log(Object.keys(box).length);
