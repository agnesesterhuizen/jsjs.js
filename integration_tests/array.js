// deno-lint-ignore-file

const arr = [1, 2, 3, 4, 5];
console.log("Initial array:", arr);
console.log("Array length:", arr.length);

arr.push(6);
console.log("After push(6):", arr);
console.log("New length:", arr.length);

const popped = arr.pop();
console.log("Popped element:", popped);
console.log("After pop():", arr);

arr.unshift(0);
console.log("After unshift(0):", arr);

const shifted = arr.shift();
console.log("Shifted element:", shifted);
console.log("After shift():", arr);

const arr2 = [6, 7, 8];
const concatenated = arr.concat(arr2);
console.log("Original array:", arr);
console.log("Array to concat:", arr2);
console.log("Concatenated:", concatenated);

const sliced = arr.slice(1, 3);
console.log("slice(1, 3):", sliced);
console.log("Original unchanged:", arr);

console.log("indexOf(3):", arr.indexOf(3));
console.log("indexOf(99):", arr.indexOf(99));

console.log("join(','):", arr.join(","));
console.log("join(' - '):", arr.join(" - "));

const toReverse = [1, 2, 3, 4];
console.log("Before reverse:", toReverse);
toReverse.reverse();
console.log("After reverse:", toReverse);

const testArr = [1, 2, 3];
console.log("includes(2):", testArr.includes(2));
console.log("includes(5):", testArr.includes(5));

console.log("forEach test:");
[10, 20, 30].forEach(function (item, index) {
  console.log("Index", index, ":", item);
});

const empty = [];
console.log("Empty array:", empty);
console.log("Empty length:", empty.length);
empty.push("first");
console.log("After push to empty:", empty);
