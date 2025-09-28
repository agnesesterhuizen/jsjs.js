// deno-lint-ignore-file

// Basic array destructuring
const arr = [1, 2, 3, 4, 5];
const [a, b] = arr;
console.log("Basic:", a, b);

// Array destructuring with rest
const [first, ...rest] = arr;
console.log("With rest:", first, rest);

// Array destructuring with defaults
const [x = 10, y = 20, z = 30] = [1, 2];
console.log("With defaults:", x, y, z);

// Array destructuring with holes
const [p, , q] = arr;
console.log("With holes:", p, q);

// Nested array destructuring
const nested = [
  [1, 2],
  [3, 4],
];
const [[na, nb], [nc, nd]] = nested;
console.log("Nested:", na, nb, nc, nd);

// Array destructuring assignment
let assignA, assignB, assignRest;
[assignA, assignB] = [100, 200];
console.log("Assignment:", assignA, assignB);

[assignA, ...assignRest] = [300, 400, 500];
console.log("Assignment with rest:", assignA, assignRest);

// Array destructuring in function parameters
function processPoint([px, py]) {
  return px + py;
}

const point = [5, 10];
const sum = processPoint(point);
console.log("Function param:", sum);

// Array destructuring with for-of
const points = [
  [1, 2],
  [3, 4],
  [5, 6],
];
for (const [fx, fy] of points) {
  console.log("For-of:", fx, fy);
}
