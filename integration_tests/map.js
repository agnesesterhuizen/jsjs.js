// deno-lint-ignore-file

const map = new Map();

console.log("get a 1", map.get("a")); // undefined
console.log("has a 1", map.has("a")); // false

map.set("b", 123);
console.log("get b 1", map.get("b")); // 123
console.log("has b 1", map.has("b")); // true

map.set("b", 456);
console.log("get b 2", map.get("b")); // 456

map.delete("b");
console.log("get b 3", map.get("b")); // undefined
console.log("has b 3", map.has("b")); // false

map.set("c", 789);
console.log("get c 1", map.get("c")); // 789
console.log("has c 1", map.has("c")); // true

map.clear();
console.log("get c 2", map.get("c")); // undefined
console.log("has c 2", map.has("c")); // false

console.log("size 1", map.size); // 0

map.set("d", 101112);
console.log("size 2", map.size); // 1

map.set("e", 131415);
console.log("size 3", map.size); // 2

map.delete("d");
console.log("size 4", map.size); // 1

map.clear();
console.log("size 5", map.size); // 0

const map2 = new Map([
  ["x", 1],
  ["y", 2],
  ["z", 3],
]);

console.log("size 6", map2.size); // 3
