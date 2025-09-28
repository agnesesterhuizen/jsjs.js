// deno-lint-ignore-file

// Basic array spread
const arr1 = [1, 2, 3];
const arr2 = [4, 5, 6];
const combined = [...arr1, ...arr2];
console.log("Combined arrays:", combined);

// Array spread with literals
const mixedArray = [0, ...arr1, 3.5, ...arr2, 7];
console.log("Mixed with literals:", mixedArray);

// Empty array spread
const empty = [];
const withEmpty = [...empty, 1, 2, 3];
console.log("With empty array:", withEmpty);

// String spread in array
const str = "hello";
const charArray = [...str];
console.log("String spread:", charArray);

// Nested array spread
const nested1 = [1, 2];
const nested2 = [3, 4];
const doublyNested = [[...nested1], [...nested2]];
console.log("Nested spread:", doublyNested);

// Function call with spread
function sum(a, b, c, d) {
  return a + b + c + d;
}

const numbers = [10, 20, 30, 40];
const result = sum(...numbers);
console.log("Function call spread:", result);

// Math.max with spread
const values = [5, 10, 2, 8, 3];
const maximum = Math.max(...values);
console.log("Math.max with spread:", maximum);

// Multiple spreads in function call
const first = [1, 2];
const second = [3, 4];
const addAll = (a, b, c, d) => a + b + c + d;
const total = addAll(...first, ...second);
console.log("Multiple spreads in call:", total);

// Mixed arguments with spread
function logMessage(prefix, ...messages) {
  console.log(prefix, ...messages);
}

const words = ["world", "from", "spread"];
logMessage("Hello", ...words, "syntax");

// Array spread in assignment
let destination = [];
destination = [...arr1];
console.log("Assignment spread:", destination);

// Complex nested spread
const complex = [...[1, 2], ...[...[3, 4], 5], 6, ...[7, 8, 9]];
console.log("Complex nested:", complex);
