// deno-lint-ignore-file

console.log("for-in start");

const proto = { inherited: true };
const obj = Object.create(proto);
obj.ownA = 1;
obj.ownB = 2;

const sym = Symbol("skipped");
obj[sym] = "hidden";

const seen = [];
for (var key in obj) {
  seen.push(key);
}
console.log(seen.join(","));

const dest = { first: "", second: "", third: "" };
const labels = ["first", "second", "third"];
let index = 0;
for (dest[labels[index++]] in obj) {
}
console.log(dest.first);
console.log(dest.second);
console.log(dest.third);
console.log(index);

const collected = [];
for (iterKey in obj) {
  collected.push(iterKey + "!");
}
console.log(collected.join(","));
