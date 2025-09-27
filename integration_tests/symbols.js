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
