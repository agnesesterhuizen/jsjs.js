// deno-lint-ignore-file

const obj = { x: "value1", y: 30, z: "data" };
console.log("Initial object:", obj);
console.log("Object keys:", Object.keys(obj));
console.log("Object values:", Object.values(obj));

console.log("obj.x:", obj.x);
console.log("obj['y']:", obj["y"]);

obj.w = "new";
obj["v"] = 75000;
console.log("After adding properties:", obj);

delete obj.z;
console.log("After delete obj.z:", obj);

const target = { a: 1, b: 2 };
const source = { b: 3, c: 4 };
const merged = Object.assign(target, source);
console.log("Original target:", target);
console.log("Source object:", source);
console.log("Merged result:", merged);

const objA = { a: "valueA", b: "valueB", c: 25 };
console.log("Object.entries:", Object.entries(objA));

const nested = {
  level1: {
    level2: {
      prop: "deep",
      settings: {
        mode: "test",
        lang: "js",
      },
    },
  },
};

console.log("Nested access:", nested.level1.level2.prop);
console.log("Deep nested:", nested.level1.level2.settings.mode);

const data = {
  items: [1, 2, 3],
  count: 3,
};
data.items.push(4);
console.log("Object with array:", data);
console.log("Array in object length:", data.items.length);

const empty = {};
console.log("Empty object:", empty);
console.log("Empty object keys:", Object.keys(empty));
empty.a = "value";
console.log("After adding to empty:", empty);

const x = "test";
const y = 42;
const shorthand = { x, y };
console.log("Property shorthand:", shorthand);
